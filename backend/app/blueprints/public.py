import secrets
from datetime import date, timedelta

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import IntegrityError

from app.auth import (
    create_booking_management_token,
    create_verification_token,
    hash_password,
    verify_booking_management_token,
    verify_password,
    verify_verification_token,
)
from app.availability import get_available_slots
from app.billing import is_subscription_active
from app.business_types import BUSINESS_TYPES_BY_ID
from app.email_sender import StubEmailSender, get_email_sender
from app.extensions import db
from app.models import (
    Appointment,
    Business,
    Client,
    Service,
    StaffMember,
    VerificationCode,
    seconds_since,
    utcnow,
)
from app.plans import plan_allows_white_label
from app.rate_limit import (
    check_email_booking_message_rate_limit,
    check_email_rate_limits,
    is_suspicious_email_booking_volume,
)
from app.schemas import (
    AppointmentMoveSchema,
    AvailabilityQuerySchema,
    BookingRequestSchema,
    VerifyCheckSchema,
    VerifyStartSchema,
    parse,
)
from app.turnstile import verify_turnstile
from app.vouchers import (
    consume_voucher,
    find_unconsumed_voucher,
    maybe_grant_loyalty_voucher,
    voucher_email_line,
)

public_bp = Blueprint("public", __name__, url_prefix="/b")

VERIFICATION_CODE_TTL_MINUTES = 10
MAX_CHECK_ATTEMPTS = 5


def _get_business_or_404(slug: str):
    return Business.query.filter_by(slug=slug).first()


def _get_active_business_or_error(slug: str):
    """For the booking-creation surface specifically (browsing services,
    availability, verify, book) -- not staff sign-in, since staff should still
    reach their own existing schedule even if the owner's subscription lapses.
    Returns (business, None) or (None, (body, status))."""
    business = _get_business_or_404(slug)
    if business is None:
        return None, ({"error": "not_found"}, 404)
    if not is_subscription_active(business):
        return None, ({"error": "subscription_required"}, 402)
    return business, None


def _serialize_service(service: Service) -> dict:
    return {
        "id": service.id,
        "name": service.name,
        "duration_minutes": service.duration_minutes,
        "price": float(service.price),
    }


def _serialize_public_business(business: Business) -> dict:
    business_type = BUSINESS_TYPES_BY_ID.get(business.type_id)
    staff = (
        StaffMember.query.filter_by(business_id=business.id, active=True)
        .order_by(StaffMember.sort_order, StaffMember.id)
        .all()
    )
    # Only the solo case gets `services` inline -- once there's more than one
    # staff member, services differ per staff, so the client must pick a staff
    # member first (GET /<slug>/staff) and fetch /<slug>/staff/<id>/services.
    services = []
    if len(staff) == 1:
        services = (
            Service.query.filter_by(business_id=business.id, staff_id=staff[0].id, active=True)
            .order_by(Service.sort_order)
            .all()
        )
    return {
        "name": business.name,
        "slug": business.slug,
        "tagline": business.tagline,
        "logo_url": business.logo_url,
        "cover_url": business.cover_url,
        "accent_key": business.accent_key,
        "vocab_key": business_type["vocab_key"] if business_type else "service",
        "currency": business.currency,
        "require_verification": business.require_verification,
        "verification_channel": business.verification_channel,
        "collect_phone": business.collect_phone,
        "address": business.address,
        "about_text": business.about_text,
        "contact_phone": business.contact_phone,
        "instagram_url": business.instagram_url,
        "facebook_url": business.facebook_url,
        "website_url": business.website_url,
        "gallery_urls": business.gallery_urls or [],
        "white_label": plan_allows_white_label(business.plan_id),
        "staff": [
            {"id": s.id, "name": s.name, "bio": s.bio, "photo_url": s.photo_url} for s in staff
        ],
        "services": [_serialize_service(service) for service in services],
    }


def _determine_booking_status(business: Business, client: Client) -> str:
    if business.booking_mode == "open":
        return "confirmed"
    if business.booking_mode == "approved_clients":
        return "confirmed" if client.is_approved else "pending"
    return "pending"  # approve_every


def _validate_service_and_slot(business: Business, service_id: int, starts_at):
    """Shared abuse-control gate: a code can't be requested, nor a booking made,
    for anything other than a real service + a slot that's actually open. Which
    staff member's hours/bookings to check is derived from the service itself --
    each service belongs to exactly one staff member."""
    service = Service.query.filter_by(id=service_id, business_id=business.id, active=True).first()
    if service is None:
        return None, ({"errors": {"service_id": "Invalid service"}}, 400)

    available_slots = get_available_slots(
        service.staff_id, starts_at.date(), service.duration_minutes
    )
    if starts_at not in available_slots:
        return None, ({"error": "slot_unavailable"}, 409)

    return service, None


@public_bp.get("/<slug>")
def get_business(slug):
    business, error = _get_active_business_or_error(slug)
    if error:
        body, status = error
        return jsonify(body), status
    return jsonify(_serialize_public_business(business))


@public_bp.get("/<slug>/staff")
def list_staff(slug):
    business = _get_business_or_404(slug)
    if business is None:
        return jsonify({"error": "not_found"}), 404

    staff = (
        StaffMember.query.filter_by(business_id=business.id, active=True)
        .order_by(StaffMember.sort_order, StaffMember.id)
        .all()
    )
    return jsonify(
        [{"id": s.id, "name": s.name, "bio": s.bio, "photo_url": s.photo_url} for s in staff]
    )


@public_bp.get("/<slug>/staff/<int:staff_id>/services")
def staff_services(slug, staff_id):
    business, error = _get_active_business_or_error(slug)
    if error:
        body, status = error
        return jsonify(body), status

    staff = StaffMember.query.filter_by(id=staff_id, business_id=business.id, active=True).first()
    if staff is None:
        return jsonify({"error": "not_found"}), 404

    services = (
        Service.query.filter_by(business_id=business.id, staff_id=staff.id, active=True)
        .order_by(Service.sort_order)
        .all()
    )
    return jsonify([_serialize_service(service) for service in services])


@public_bp.get("/<slug>/availability")
def get_availability(slug):
    business, error = _get_active_business_or_error(slug)
    if error:
        body, status = error
        return jsonify(body), status

    payload, errors = parse(AvailabilityQuerySchema, request.args.to_dict())
    if errors:
        return jsonify({"errors": errors}), 400

    if payload.date < date.today() or payload.date > date.today() + timedelta(days=14):
        return jsonify({"errors": {"date": "Date must be within the next 14 days"}}), 400

    service = Service.query.filter_by(
        id=payload.service_id, business_id=business.id, active=True
    ).first()
    if service is None:
        return jsonify({"errors": {"service_id": "Invalid service"}}), 400

    slots = get_available_slots(service.staff_id, payload.date, service.duration_minutes)
    return jsonify({"date": payload.date.isoformat(), "slots": [s.isoformat() for s in slots]})


@public_bp.post("/<slug>/verify/start")
def verify_start(slug):
    business, error = _get_active_business_or_error(slug)
    if error:
        body, status = error
        return jsonify(body), status

    payload, errors = parse(VerifyStartSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    if payload.website:  # honeypot: bots fill hidden fields, real users never see them
        return jsonify({"errors": {"website": "invalid_request"}}), 400

    if not verify_turnstile(payload.turnstile_token, request.remote_addr):
        return jsonify({"error": "captcha_failed"}), 400

    _service, error = _validate_service_and_slot(business, payload.service_id, payload.starts_at)
    if error:
        body, status = error
        return jsonify(body), status

    rate_limit_error = check_email_rate_limits(business, payload.email, request.remote_addr)
    if rate_limit_error:
        return jsonify({"error": rate_limit_error}), 429

    code = f"{secrets.randbelow(1_000_000):06d}"
    record = VerificationCode(
        business_id=business.id,
        email=payload.email,
        code_hash=hash_password(code),
        channel="email",
        ip_address=request.remote_addr,
        expires_at=utcnow() + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES),
    )
    db.session.add(record)
    db.session.commit()

    sender = get_email_sender()
    sender.send(
        payload.email, "Your Bukano verification code", f"Your verification code is {code}."
    )

    response = {"sent": True, "channel": "email"}
    if isinstance(sender, StubEmailSender):
        response["dev_code"] = code  # nothing was really delivered, so hand it back for testing

    return jsonify(response), 201


@public_bp.post("/<slug>/verify/check")
def verify_check(slug):
    business, error = _get_active_business_or_error(slug)
    if error:
        body, status = error
        return jsonify(body), status

    payload, errors = parse(VerifyCheckSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    record = (
        VerificationCode.query.filter_by(
            business_id=business.id, email=payload.email, consumed_at=None
        )
        .order_by(VerificationCode.created_at.desc())
        .first()
    )
    if record is None:
        return jsonify({"error": "no_pending_code"}), 400
    if seconds_since(record.expires_at) > 0:
        return jsonify({"error": "code_expired"}), 400
    if record.attempts >= MAX_CHECK_ATTEMPTS:
        return jsonify({"error": "too_many_attempts"}), 429

    if not verify_password(record.code_hash, payload.code):
        record.attempts += 1
        db.session.commit()
        return jsonify({"error": "invalid_code"}), 400

    record.consumed_at = utcnow()
    db.session.commit()

    token = create_verification_token(business.id, payload.email)
    return jsonify({"verified": True, "verification_token": token})


@public_bp.post("/<slug>/book")
def book(slug):
    business, error = _get_active_business_or_error(slug)
    if error:
        body, status = error
        return jsonify(body), status

    payload, errors = parse(BookingRequestSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    if payload.website:
        return jsonify({"errors": {"website": "invalid_request"}}), 400

    if not verify_turnstile(payload.turnstile_token, request.remote_addr):
        return jsonify({"error": "captcha_failed"}), 400

    service, error = _validate_service_and_slot(business, payload.service_id, payload.starts_at)
    if error:
        body, status = error
        return jsonify(body), status

    used_fallback = business.require_verification and payload.skip_verification
    if business.require_verification and not payload.skip_verification:
        if not payload.verification_token or not verify_verification_token(
            payload.verification_token, business.id, payload.email
        ):
            return jsonify({"error": "verification_required"}), 400

    starts_at = payload.starts_at
    ends_at = starts_at + timedelta(minutes=service.duration_minutes)
    phone = payload.phone if business.collect_phone else None

    client = Client.query.filter_by(business_id=business.id, email=payload.email).first()
    if client is None:
        client = Client(
            business_id=business.id, email=payload.email, phone_e164=phone, name=payload.name
        )
        db.session.add(client)
    else:
        client.name = payload.name
        if phone:
            client.phone_e164 = phone

    db.session.flush()

    voucher = (
        find_unconsumed_voucher(business.id, client.id) if business.marketing_enabled else None
    )

    flagged = is_suspicious_email_booking_volume(business, payload.email, request.remote_addr)
    status = (
        "pending" if (used_fallback or flagged) else _determine_booking_status(business, client)
    )
    appointment = Appointment(
        business_id=business.id,
        staff_id=service.staff_id,
        staff_name=service.staff.name,
        service_id=service.id,
        service_name=service.name,
        service_price=service.price,
        voucher_code=voucher.code if voucher else None,
        client_id=client.id,
        starts_at=starts_at,
        ends_at=ends_at,
        status=status,
        booking_ip=request.remote_addr,
        flagged_for_review=flagged,
    )
    db.session.add(appointment)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "slot_unavailable"}), 409

    if voucher is not None:
        consume_voucher(voucher, appointment.id)
        db.session.commit()
    if business.marketing_enabled:
        loyalty_voucher = maybe_grant_loyalty_voucher(business, client)
        if loyalty_voucher is not None:
            db.session.commit()

    # The verification flow's rate limits don't apply here -- a business that
    # doesn't require verification never creates a VerificationCode row, so
    # this is its own cap to stop the public, unauthenticated /book endpoint
    # from being used to spam a business's clients with junk confirmations.
    if check_email_booking_message_rate_limit(business, payload.email) is None:
        when = appointment.starts_at.strftime("%Y-%m-%d %H:%M")
        if appointment.status == "confirmed":
            message = f"Your booking for {appointment.service_name} on {when} is confirmed."
        else:
            message = (
                f"We received your request for {appointment.service_name} on {when} -- "
                "you'll be contacted once it's approved."
            )
        if voucher is not None:
            message += f" {voucher_email_line(voucher)}"
        manage_token = create_booking_management_token(appointment.id, business.id)
        manage_link = f"{current_app.config['FRONTEND_URL']}/b/{slug}/manage/{manage_token}"
        message += f" Manage your booking: {manage_link}"
        get_email_sender().send(payload.email, f"Your booking at {business.name}", message)

    return (
        jsonify(
            {
                "id": appointment.id,
                "status": appointment.status,
                "starts_at": appointment.starts_at.isoformat(),
                "service_name": appointment.service_name,
            }
        ),
        201,
    )


def _get_appointment_from_token(slug, token):
    """Returns (appointment, business, None) or (None, None, (body, status))."""
    payload = verify_booking_management_token(token)
    if payload is None:
        return None, None, ({"error": "invalid_token"}, 401)

    business = _get_business_or_404(slug)
    if business is None or business.id != payload["business_id"]:
        return None, None, ({"error": "not_found"}, 404)

    appointment = Appointment.query.filter_by(
        id=payload["appointment_id"], business_id=business.id
    ).first()
    if appointment is None:
        return None, None, ({"error": "not_found"}, 404)

    return appointment, business, None


def _serialize_managed_appointment(appointment):
    return {
        "id": appointment.id,
        "service_name": appointment.service_name,
        "staff_name": appointment.staff_name,
        "starts_at": appointment.starts_at.isoformat(),
        "ends_at": appointment.ends_at.isoformat(),
        "status": appointment.status,
    }


@public_bp.get("/<slug>/manage/<token>")
def get_managed_appointment(slug, token):
    appointment, _business, error = _get_appointment_from_token(slug, token)
    if error:
        body, status = error
        return jsonify(body), status
    return jsonify(_serialize_managed_appointment(appointment))


@public_bp.post("/<slug>/manage/<token>/cancel")
def cancel_managed_appointment(slug, token):
    appointment, _business, error = _get_appointment_from_token(slug, token)
    if error:
        body, status = error
        return jsonify(body), status

    if appointment.status == "cancelled":
        return jsonify(_serialize_managed_appointment(appointment))

    appointment.status = "cancelled"
    db.session.commit()
    return jsonify(_serialize_managed_appointment(appointment))


@public_bp.post("/<slug>/manage/<token>/move")
def move_managed_appointment(slug, token):
    appointment, _business, error = _get_appointment_from_token(slug, token)
    if error:
        body, status = error
        return jsonify(body), status
    if appointment.status == "cancelled":
        return jsonify({"error": "appointment_cancelled"}), 400

    payload, errors = parse(AppointmentMoveSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    service = Service.query.filter_by(
        id=appointment.service_id, business_id=appointment.business_id
    ).first()
    duration = (
        service.duration_minutes
        if service
        else int((appointment.ends_at - appointment.starts_at).total_seconds() // 60)
    )
    available_slots = get_available_slots(appointment.staff_id, payload.starts_at.date(), duration)
    if payload.starts_at not in available_slots:
        return jsonify({"error": "slot_unavailable"}), 409

    appointment.starts_at = payload.starts_at
    appointment.ends_at = payload.starts_at + timedelta(minutes=duration)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "slot_unavailable"}), 409

    return jsonify(_serialize_managed_appointment(appointment))
