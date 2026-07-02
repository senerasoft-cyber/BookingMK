from datetime import datetime, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from app.auth import hash_password, jwt_required, verify_password
from app.billing import TrialError, get_billing_provider, start_trial
from app.business_types import BUSINESS_TYPES_BY_ID
from app.email_sender import get_email_sender
from app.extensions import db
from app.models import (
    DEFAULT_WORKING_HOURS,
    Appointment,
    Business,
    Client,
    Service,
    StaffMember,
    StaffTimeOff,
    StaffWorkingHour,
    Voucher,
    seconds_since,
    utcnow,
)
from app.plans import (
    PLANS,
    plan_allows_auto_notify,
    plan_allows_marketing_tools,
    plan_allows_more_staff,
    plan_allows_stats,
)
from app.promo import PromoCodeError, redeem_promo_code
from app.schemas import (
    AppointmentCancelSchema,
    AppointmentCreateSchema,
    AppointmentFilterSchema,
    AppointmentMoveSchema,
    BusinessUpdateSchema,
    ClientCreateSchema,
    PromoRedeemSchema,
    ServiceCreateSchema,
    ServiceUpdateSchema,
    StaffCreateSchema,
    StaffPinLoginSchema,
    StaffPinSetupSchema,
    StaffTimeOffCreateSchema,
    StaffUpdateSchema,
    SubscriptionCheckoutSchema,
    VoucherGrantSchema,
    WorkingHoursUpdateSchema,
    parse,
)
from app.vouchers import client_booking_count, grant_voucher

PIN_MAX_ATTEMPTS = 5
PIN_LOCKOUT_MINUTES = 15

owner_bp = Blueprint("owner", __name__)

# Must match the final entry in frontend/src/onboardingSteps.ts
ONBOARDING_FINAL_STEP = 6


def _resolve_staff(business, staff_id=None):
    """The business's chosen staff member, or its first/default one when staff_id
    is omitted -- lets every staff-scoped endpoint keep working unchanged for
    single-operator businesses (the common case) with zero extra calls.
    """
    query = StaffMember.query.filter_by(business_id=business.id)
    if staff_id is not None:
        return query.filter_by(id=staff_id).first()
    return query.order_by(StaffMember.id).first()


def _serialize_hours(staff_id):
    hours = (
        StaffWorkingHour.query.filter_by(staff_id=staff_id).order_by(StaffWorkingHour.weekday).all()
    )
    return [serialize_working_hour(h) for h in hours]


def _apply_hours_update(staff_id, payload):
    existing_by_weekday = {
        h.weekday: h for h in StaffWorkingHour.query.filter_by(staff_id=staff_id).all()
    }
    for item in payload.hours:
        hour = existing_by_weekday[item.weekday]
        hour.open_minute = item.open_minute
        hour.close_minute = item.close_minute
        hour.slot_minutes = item.slot_minutes
        hour.is_closed = item.is_closed
    db.session.commit()


def _notify_client_of_change(business, appointment, kind):
    """No-ops if the plan doesn't allow it, or the client has no email on
    file (e.g. a phone-only walk-in entered by the owner) -- the move/cancel
    itself always succeeds regardless of `notify_client`, this only gates
    whether a message actually goes out."""
    if not plan_allows_auto_notify(business.plan_id):
        return
    if not appointment.client.email:
        return

    when = appointment.starts_at.strftime("%Y-%m-%d %H:%M")
    if kind == "moved":
        message = f"Your appointment for {appointment.service_name} has been moved to {when}."
    else:
        message = f"Your appointment for {appointment.service_name} on {when} has been cancelled."
    get_email_sender().send(
        appointment.client.email, f"Update on your booking at {business.name}", message
    )


def serialize_business(business):
    business_type = BUSINESS_TYPES_BY_ID.get(business.type_id)
    return {
        "id": business.id,
        "name": business.name,
        "slug": business.slug,
        "type_id": business.type_id,
        "vocab_key": business_type["vocab_key"] if business_type else "service",
        "accent_key": business.accent_key,
        "tagline": business.tagline,
        "logo_url": business.logo_url,
        "cover_url": business.cover_url,
        "locale_default": business.locale_default,
        "currency": business.currency,
        "booking_mode": business.booking_mode,
        "require_verification": business.require_verification,
        "verification_channel": business.verification_channel,
        "collect_phone": business.collect_phone,
        "reminders_enabled": business.reminders_enabled,
        "reminder_lead_minutes": business.reminder_lead_minutes,
        "address": business.address,
        "about_text": business.about_text,
        "contact_phone": business.contact_phone,
        "instagram_url": business.instagram_url,
        "facebook_url": business.facebook_url,
        "website_url": business.website_url,
        "gallery_urls": business.gallery_urls or [],
        "marketing_enabled": business.marketing_enabled,
        "loyalty_enabled": business.loyalty_enabled,
        "loyalty_every_n": business.loyalty_every_n,
        "owner_pin_set": business.owner_pin_hash is not None,
        "plan_id": business.plan_id,
        "subscription_status": business.subscription_status,
        "subscription_provider": business.subscription_provider,
        "current_period_end": (
            business.current_period_end.isoformat() if business.current_period_end else None
        ),
        "trial_started_at": (
            business.trial_started_at.isoformat() if business.trial_started_at else None
        ),
        "billing_interval": business.billing_interval or "monthly",
        "onboarding_step": business.onboarding_step,
        "onboarding_completed_at": (
            business.onboarding_completed_at.isoformat()
            if business.onboarding_completed_at
            else None
        ),
    }


def serialize_service(service):
    return {
        "id": service.id,
        "staff_id": service.staff_id,
        "name": service.name,
        "duration_minutes": service.duration_minutes,
        "price": float(service.price),
        "sort_order": service.sort_order,
        "active": service.active,
    }


def serialize_staff(staff):
    return {
        "id": staff.id,
        "name": staff.name,
        "bio": staff.bio,
        "photo_url": staff.photo_url,
        "active": staff.active,
        "sort_order": staff.sort_order,
        "pin_set": staff.pin_hash is not None,
        "created_at": staff.created_at.isoformat(),
    }


def serialize_time_off(time_off):
    return {
        "id": time_off.id,
        "start_date": time_off.start_date.isoformat(),
        "end_date": time_off.end_date.isoformat(),
        "note": time_off.note,
    }


def serialize_working_hour(hour):
    return {
        "weekday": hour.weekday,
        "open_minute": hour.open_minute,
        "close_minute": hour.close_minute,
        "slot_minutes": hour.slot_minutes,
        "is_closed": hour.is_closed,
    }


def serialize_client(client):
    return {
        "id": client.id,
        "name": client.name,
        "email": client.email,
        "phone_e164": client.phone_e164,
        "is_approved": client.is_approved,
        "booking_count": client_booking_count(client.id),
        "created_at": client.created_at.isoformat(),
    }


def serialize_appointment(appointment):
    return {
        "id": appointment.id,
        "starts_at": appointment.starts_at.isoformat(),
        "ends_at": appointment.ends_at.isoformat(),
        "status": appointment.status,
        "service_name": appointment.service_name,
        "service_price": float(appointment.service_price),
        "voucher_code": appointment.voucher_code,
        "staff_id": appointment.staff_id,
        "staff_name": appointment.staff_name,
        "source": appointment.source,
        "flagged_for_review": appointment.flagged_for_review,
        "client": serialize_client(appointment.client),
    }


@owner_bp.get("/me/business")
@jwt_required
def get_business():
    return jsonify(serialize_business(g.current_business))


@owner_bp.patch("/me/business")
@jwt_required
def update_business():
    payload, errors = parse(BusinessUpdateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    business = g.current_business
    updates = payload.model_dump(exclude_unset=True)

    if "slug" in updates and updates["slug"] != business.slug:
        existing = Business.query.filter_by(slug=updates["slug"]).first()
        if existing is not None and existing.id != business.id:
            return jsonify({"errors": {"slug": "That link is already taken"}}), 409

    type_changed = "type_id" in updates and updates["type_id"] != business.type_id

    for field, value in updates.items():
        setattr(business, field, value)

    if type_changed and updates["type_id"] and not business.services:
        business_type = BUSINESS_TYPES_BY_ID[updates["type_id"]]
        business.accent_key = business_type["accent_key"]
        name_field = "name_mk" if business.locale_default == "mk" else "name_en"
        default_staff = _resolve_staff(business)
        for index, default_service in enumerate(business_type["default_services"]):
            db.session.add(
                Service(
                    business_id=business.id,
                    staff_id=default_staff.id,
                    name=default_service[name_field],
                    duration_minutes=default_service["duration_minutes"],
                    price=default_service["price"],
                    sort_order=index,
                )
            )

    if (
        updates.get("onboarding_step") == ONBOARDING_FINAL_STEP
        and business.onboarding_completed_at is None
    ):
        business.onboarding_completed_at = utcnow()

    db.session.commit()
    return jsonify(serialize_business(business))


@owner_bp.patch("/me/pin")
@jwt_required
def set_owner_pin():
    """Set or change the owner's own PIN -- unlike staff PINs, the owner can
    always overwrite their own (no separate reset flow needed) since they've
    already proven their identity with email+password to get this token.
    """
    payload, errors = parse(StaffPinSetupSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    business = g.current_business
    business.owner_pin_hash = hash_password(payload.pin)
    business.owner_pin_attempts = 0
    business.owner_pin_locked_until = None
    db.session.commit()
    return jsonify(serialize_business(business))


@owner_bp.post("/me/pin/verify")
@jwt_required
def verify_owner_pin():
    """Confirms it's really the owner sitting at this device right now -- a
    UI-level gate shown after email+password on a shared device, not a
    standalone auth boundary (the JWT from login already is one)."""
    business = g.current_business
    if business.owner_pin_hash is None:
        return jsonify({"error": "pin_not_set"}), 400
    if business.owner_pin_locked_until and seconds_since(business.owner_pin_locked_until) < 0:
        return jsonify({"error": "locked"}), 429

    payload, errors = parse(StaffPinLoginSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    if not verify_password(business.owner_pin_hash, payload.pin):
        business.owner_pin_attempts += 1
        if business.owner_pin_attempts >= PIN_MAX_ATTEMPTS:
            business.owner_pin_locked_until = utcnow() + timedelta(minutes=PIN_LOCKOUT_MINUTES)
        db.session.commit()
        return jsonify({"error": "invalid_pin"}), 400

    business.owner_pin_attempts = 0
    business.owner_pin_locked_until = None
    db.session.commit()
    return jsonify({"verified": True})


@owner_bp.get("/plans")
@jwt_required
def list_plans():
    return jsonify(PLANS)


@owner_bp.post("/me/subscription/checkout")
@jwt_required
def create_subscription_checkout():
    payload, errors = parse(SubscriptionCheckoutSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    business = g.current_business
    staff_count = StaffMember.query.filter_by(business_id=business.id).count()
    if not plan_allows_more_staff(payload.plan_id, staff_count - 1):
        # -1: the plan must accommodate the staff already on the account, not
        # one more than it -- this only blocks picking a plan too small for
        # staff you already have, not the staff-creation endpoint itself.
        return jsonify({"error": "plan_too_small_for_existing_staff"}), 400

    checkout = get_billing_provider().create_checkout(business, payload.plan_id, payload.interval)
    db.session.commit()
    return jsonify({"business": serialize_business(business), **checkout})


@owner_bp.post("/me/subscription/cancel")
@jwt_required
def cancel_subscription():
    business = g.current_business
    get_billing_provider().cancel_subscription(business)
    db.session.commit()
    return jsonify(serialize_business(business))


@owner_bp.post("/me/subscription/redeem-promo")
@jwt_required
def redeem_promo():
    payload, errors = parse(PromoRedeemSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        redeem_promo_code(g.current_business, payload.code)
    except PromoCodeError as exc:
        return jsonify({"error": exc.error_code}), 400

    return jsonify(serialize_business(g.current_business))


@owner_bp.post("/me/subscription/start-trial")
@jwt_required
def start_subscription_trial():
    try:
        start_trial(g.current_business)
    except TrialError as exc:
        return jsonify({"error": exc.error_code}), 400

    return jsonify(serialize_business(g.current_business))


def serialize_voucher(voucher):
    return {
        "id": voucher.id,
        "client_id": voucher.client_id,
        "client_name": voucher.client.name if voucher.client else None,
        "code": voucher.code,
        "kind": voucher.kind,
        "percent_off": voucher.percent_off,
        "source": voucher.source,
        "granted_at": voucher.granted_at.isoformat(),
        "consumed_at": voucher.consumed_at.isoformat() if voucher.consumed_at else None,
    }


def _marketing_not_allowed(business):
    if not plan_allows_marketing_tools(business.plan_id):
        return jsonify({"error": "plan_marketing_tools_not_allowed"}), 402
    if not business.marketing_enabled:
        return jsonify({"error": "marketing_not_enabled"}), 402
    return None


@owner_bp.get("/me/vouchers")
@jwt_required
def list_vouchers():
    vouchers = (
        Voucher.query.filter_by(business_id=g.current_business.id)
        .order_by(Voucher.granted_at.desc())
        .all()
    )
    return jsonify([serialize_voucher(v) for v in vouchers])


@owner_bp.post("/me/vouchers")
@jwt_required
def create_voucher():
    business = g.current_business
    gate_error = _marketing_not_allowed(business)
    if gate_error:
        return gate_error

    payload, errors = parse(VoucherGrantSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    client = Client.query.filter_by(id=payload.client_id, business_id=business.id).first()
    if client is None:
        return jsonify({"errors": {"client_id": "Invalid client"}}), 400

    voucher = grant_voucher(
        business.id, client.id, kind=payload.kind, percent_off=payload.percent_off
    )
    db.session.commit()
    return jsonify(serialize_voucher(voucher)), 201


@owner_bp.delete("/me/vouchers/<int:voucher_id>")
@jwt_required
def delete_voucher(voucher_id):
    voucher = Voucher.query.filter_by(id=voucher_id, business_id=g.current_business.id).first()
    if voucher is None:
        return jsonify({"error": "not_found"}), 404
    if voucher.consumed_at is not None:
        return jsonify({"error": "already_consumed"}), 400

    db.session.delete(voucher)
    db.session.commit()
    return "", 204


@owner_bp.get("/services")
@jwt_required
def list_services():
    staff = _resolve_staff(g.current_business, request.args.get("staff_id", type=int))
    if staff is None:
        return jsonify({"error": "not_found"}), 404
    services = (
        Service.query.filter_by(business_id=g.current_business.id, staff_id=staff.id)
        .order_by(Service.sort_order)
        .all()
    )
    return jsonify([serialize_service(s) for s in services])


@owner_bp.post("/services")
@jwt_required
def create_service():
    payload, errors = parse(ServiceCreateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    staff = _resolve_staff(g.current_business, payload.staff_id)
    if staff is None:
        return jsonify({"errors": {"staff_id": "Invalid staff member"}}), 400

    fields = payload.model_dump(exclude={"staff_id"})
    service = Service(business_id=g.current_business.id, staff_id=staff.id, **fields)
    db.session.add(service)
    db.session.commit()
    return jsonify(serialize_service(service)), 201


@owner_bp.patch("/services/<int:service_id>")
@jwt_required
def update_service(service_id):
    service = Service.query.filter_by(id=service_id, business_id=g.current_business.id).first()
    if service is None:
        return jsonify({"error": "not_found"}), 404

    payload, errors = parse(ServiceUpdateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    db.session.commit()
    return jsonify(serialize_service(service))


@owner_bp.delete("/services/<int:service_id>")
@jwt_required
def delete_service(service_id):
    service = Service.query.filter_by(id=service_id, business_id=g.current_business.id).first()
    if service is None:
        return jsonify({"error": "not_found"}), 404

    db.session.delete(service)
    db.session.commit()
    return "", 204


@owner_bp.get("/working-hours")
@jwt_required
def get_working_hours():
    staff = _resolve_staff(g.current_business)
    return jsonify(_serialize_hours(staff.id))


@owner_bp.put("/working-hours")
@jwt_required
def put_working_hours():
    staff = _resolve_staff(g.current_business)
    payload, errors = parse(WorkingHoursUpdateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    _apply_hours_update(staff.id, payload)
    return jsonify(_serialize_hours(staff.id))


@owner_bp.get("/staff/<int:staff_id>/working-hours")
@jwt_required
def get_staff_working_hours(staff_id):
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(_serialize_hours(staff.id))


@owner_bp.put("/staff/<int:staff_id>/working-hours")
@jwt_required
def put_staff_working_hours(staff_id):
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404

    payload, errors = parse(WorkingHoursUpdateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    _apply_hours_update(staff.id, payload)
    return jsonify(_serialize_hours(staff.id))


@owner_bp.get("/staff/<int:staff_id>/time-off")
@jwt_required
def list_staff_time_off(staff_id):
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404
    time_off = (
        StaffTimeOff.query.filter_by(staff_id=staff.id).order_by(StaffTimeOff.start_date).all()
    )
    return jsonify([serialize_time_off(t) for t in time_off])


@owner_bp.post("/staff/<int:staff_id>/time-off")
@jwt_required
def create_staff_time_off(staff_id):
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404

    payload, errors = parse(StaffTimeOffCreateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    time_off = StaffTimeOff(
        staff_id=staff.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        note=payload.note,
    )
    db.session.add(time_off)
    db.session.commit()
    return jsonify(serialize_time_off(time_off)), 201


@owner_bp.delete("/staff/<int:staff_id>/time-off/<int:time_off_id>")
@jwt_required
def delete_staff_time_off(staff_id, time_off_id):
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404
    time_off = StaffTimeOff.query.filter_by(id=time_off_id, staff_id=staff.id).first()
    if time_off is None:
        return jsonify({"error": "not_found"}), 404

    db.session.delete(time_off)
    db.session.commit()
    return "", 204


@owner_bp.get("/staff")
@jwt_required
def list_staff():
    staff = (
        StaffMember.query.filter_by(business_id=g.current_business.id)
        .order_by(StaffMember.sort_order, StaffMember.id)
        .all()
    )
    return jsonify([serialize_staff(s) for s in staff])


@owner_bp.post("/staff")
@jwt_required
def create_staff():
    payload, errors = parse(StaffCreateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    business = g.current_business
    current_count = StaffMember.query.filter_by(business_id=business.id).count()
    if not plan_allows_more_staff(business.plan_id, current_count):
        return jsonify({"error": "plan_staff_limit_reached"}), 402

    copy_from = None
    if payload.copy_services_from is not None:
        copy_from = StaffMember.query.filter_by(
            id=payload.copy_services_from, business_id=business.id
        ).first()
        if copy_from is None:
            return jsonify({"errors": {"copy_services_from": "Invalid staff member"}}), 400

    max_sort = (
        db.session.query(db.func.max(StaffMember.sort_order))
        .filter_by(business_id=business.id)
        .scalar()
        or 0
    )
    staff = StaffMember(business_id=business.id, name=payload.name, sort_order=max_sort + 1)
    db.session.add(staff)
    db.session.flush()

    for weekday, (open_minute, close_minute, is_closed) in DEFAULT_WORKING_HOURS.items():
        db.session.add(
            StaffWorkingHour(
                staff_id=staff.id,
                weekday=weekday,
                open_minute=open_minute,
                close_minute=close_minute,
                is_closed=is_closed,
            )
        )

    if copy_from is not None:
        for service in copy_from.services:
            db.session.add(
                Service(
                    business_id=business.id,
                    staff_id=staff.id,
                    name=service.name,
                    duration_minutes=service.duration_minutes,
                    price=service.price,
                    sort_order=service.sort_order,
                )
            )

    db.session.commit()
    return jsonify(serialize_staff(staff)), 201


@owner_bp.patch("/staff/<int:staff_id>")
@jwt_required
def update_staff(staff_id):
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404

    payload, errors = parse(StaffUpdateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(staff, field, value)
    db.session.commit()
    return jsonify(serialize_staff(staff))


@owner_bp.post("/staff/<int:staff_id>/reset-pin")
@jwt_required
def reset_staff_pin(staff_id):
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404

    staff.pin_hash = None
    staff.pin_attempts = 0
    staff.pin_locked_until = None
    db.session.commit()
    return jsonify(serialize_staff(staff))


@owner_bp.patch("/staff/<int:staff_id>/pin")
@jwt_required
def set_staff_pin(staff_id):
    """Self-service: whoever is using the dashboard (one shared business
    login, see app/auth.py) sets a PIN for the staff persona they're
    currently acting as. Purely an opt-in speed bump against another staff
    member idly switching into your view on a shared device, not a security
    boundary -- the real boundary is the email+password login that already
    gates the whole dashboard."""
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404

    payload, errors = parse(StaffPinSetupSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400
    if payload.pin != payload.confirm_pin:
        return jsonify({"errors": {"confirm_pin": "PINs do not match"}}), 400

    staff.pin_hash = hash_password(payload.pin)
    staff.pin_attempts = 0
    staff.pin_locked_until = None
    db.session.commit()
    return jsonify(serialize_staff(staff))


@owner_bp.post("/staff/<int:staff_id>/pin/verify")
@jwt_required
def verify_staff_pin(staff_id):
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404
    if staff.pin_hash is None:
        return jsonify({"error": "pin_not_set"}), 400
    if staff.pin_locked_until and seconds_since(staff.pin_locked_until) < 0:
        return jsonify({"error": "locked"}), 429

    payload, errors = parse(StaffPinLoginSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    if not verify_password(staff.pin_hash, payload.pin):
        staff.pin_attempts += 1
        if staff.pin_attempts >= PIN_MAX_ATTEMPTS:
            staff.pin_locked_until = utcnow() + timedelta(minutes=PIN_LOCKOUT_MINUTES)
        db.session.commit()
        return jsonify({"error": "invalid_pin"}), 400

    staff.pin_attempts = 0
    staff.pin_locked_until = None
    db.session.commit()
    return jsonify({"verified": True})


@owner_bp.delete("/staff/<int:staff_id>")
@jwt_required
def delete_staff(staff_id):
    staff = _resolve_staff(g.current_business, staff_id)
    if staff is None:
        return jsonify({"error": "not_found"}), 404

    remaining = StaffMember.query.filter_by(business_id=g.current_business.id).count()
    if remaining <= 1:
        return jsonify({"error": "last_staff_member"}), 409

    db.session.delete(staff)
    db.session.commit()
    return "", 204


@owner_bp.get("/appointments")
@jwt_required
def list_appointments():
    payload, errors = parse(AppointmentFilterSchema, request.args.to_dict())
    if errors:
        return jsonify({"errors": errors}), 400

    query = Appointment.query.filter_by(business_id=g.current_business.id)
    if payload.staff_id:
        query = query.filter(Appointment.staff_id == payload.staff_id)
    if payload.status:
        query = query.filter(Appointment.status == payload.status)
    if payload.date_from:
        query = query.filter(
            Appointment.starts_at >= datetime.combine(payload.date_from, datetime.min.time())
        )
    if payload.date_to:
        query = query.filter(
            Appointment.starts_at
            < datetime.combine(payload.date_to, datetime.min.time()) + timedelta(days=1)
        )

    appointments = query.order_by(Appointment.starts_at).all()
    return jsonify([serialize_appointment(a) for a in appointments])


@owner_bp.post("/appointments")
@jwt_required
def create_appointment_manually():
    """Owner-created booking for a walk-in or phone call. Bypasses the public
    flow's availability/working-hours checks entirely (the owner's discretion);
    only the same-staff-same-instant uniqueness constraint still applies.
    """
    business = g.current_business
    payload, errors = parse(AppointmentCreateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    service = Service.query.filter_by(id=payload.service_id, business_id=business.id).first()
    if service is None:
        return jsonify({"errors": {"service_id": "Invalid service"}}), 400

    staff = _resolve_staff(business, payload.staff_id) if payload.staff_id else service.staff
    if staff is None or staff.business_id != business.id:
        return jsonify({"errors": {"staff_id": "Invalid staff member"}}), 400

    if payload.client_id is not None:
        client_obj = Client.query.filter_by(id=payload.client_id, business_id=business.id).first()
        if client_obj is None:
            return jsonify({"errors": {"client_id": "Invalid client"}}), 400
    elif payload.name:
        client_obj = None
        if payload.email:
            client_obj = Client.query.filter_by(
                business_id=business.id, email=payload.email
            ).first()
        if client_obj is None:
            client_obj = Client(
                business_id=business.id,
                email=payload.email,
                phone_e164=payload.phone,
                name=payload.name,
                is_approved=True,
            )
            db.session.add(client_obj)
            db.session.flush()
        else:
            client_obj.name = payload.name
            if payload.phone:
                client_obj.phone_e164 = payload.phone
    else:
        return jsonify({"errors": {"client_id": "Provide client_id, or at least a name"}}), 400

    starts_at = payload.starts_at
    ends_at = starts_at + timedelta(minutes=service.duration_minutes)
    appointment = Appointment(
        business_id=business.id,
        staff_id=staff.id,
        staff_name=staff.name,
        service_id=service.id,
        service_name=service.name,
        service_price=service.price,
        client_id=client_obj.id,
        starts_at=starts_at,
        ends_at=ends_at,
        status="confirmed",
        source="owner_manual",
    )
    db.session.add(appointment)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "slot_unavailable"}), 409

    return jsonify(serialize_appointment(appointment)), 201


@owner_bp.post("/appointments/<int:appointment_id>/approve")
@jwt_required
def approve_appointment(appointment_id):
    appointment = Appointment.query.filter_by(
        id=appointment_id, business_id=g.current_business.id
    ).first()
    if appointment is None:
        return jsonify({"error": "not_found"}), 404

    appointment.status = "confirmed"
    if g.current_business.booking_mode == "approved_clients":
        appointment.client.is_approved = True

    db.session.commit()
    return jsonify(serialize_appointment(appointment))


@owner_bp.post("/appointments/<int:appointment_id>/move")
@jwt_required
def move_appointment(appointment_id):
    """Owner reschedule, bypassing normal availability/working-hours rules --
    it's the owner's call whether to give up a slot, double up, or move someone
    outside normal hours. Only the same-staff-same-instant DB constraint still
    applies, since two clients can't literally be in the same chair at once.
    """
    business = g.current_business
    appointment = Appointment.query.filter_by(id=appointment_id, business_id=business.id).first()
    if appointment is None:
        return jsonify({"error": "not_found"}), 404

    payload, errors = parse(AppointmentMoveSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    if payload.staff_id is not None:
        staff = _resolve_staff(business, payload.staff_id)
        if staff is None:
            return jsonify({"errors": {"staff_id": "Invalid staff member"}}), 400
        appointment.staff_id = staff.id
        appointment.staff_name = staff.name

    duration = appointment.ends_at - appointment.starts_at
    appointment.starts_at = payload.starts_at
    appointment.ends_at = payload.starts_at + duration

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "slot_unavailable"}), 409

    if payload.notify_client:
        _notify_client_of_change(business, appointment, "moved")

    return jsonify(serialize_appointment(appointment))


@owner_bp.post("/appointments/<int:appointment_id>/cancel")
@jwt_required
def cancel_appointment(appointment_id):
    appointment = Appointment.query.filter_by(
        id=appointment_id, business_id=g.current_business.id
    ).first()
    if appointment is None:
        return jsonify({"error": "not_found"}), 404

    payload, errors = parse(AppointmentCancelSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    appointment.status = "cancelled"
    db.session.commit()

    if payload.notify_client:
        _notify_client_of_change(g.current_business, appointment, "cancelled")

    return jsonify(serialize_appointment(appointment))


@owner_bp.get("/clients")
@jwt_required
def list_clients():
    clients = (
        Client.query.filter_by(business_id=g.current_business.id)
        .order_by(Client.created_at.desc())
        .all()
    )
    return jsonify([serialize_client(c) for c in clients])


@owner_bp.post("/clients")
@jwt_required
def create_client():
    payload, errors = parse(ClientCreateSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    if payload.email:
        existing = Client.query.filter_by(
            business_id=g.current_business.id, email=payload.email
        ).first()
        if existing is not None:
            return jsonify({"errors": {"email": "A client with that email already exists"}}), 409

    client = Client(
        business_id=g.current_business.id,
        email=payload.email,
        phone_e164=payload.phone,
        name=payload.name,
        is_approved=payload.is_approved,
    )
    db.session.add(client)
    db.session.commit()
    return jsonify(serialize_client(client)), 201


@owner_bp.post("/clients/<int:client_id>/approve")
@jwt_required
def approve_client(client_id):
    client = Client.query.filter_by(id=client_id, business_id=g.current_business.id).first()
    if client is None:
        return jsonify({"error": "not_found"}), 404

    client.is_approved = True
    db.session.commit()
    return jsonify(serialize_client(client))


@owner_bp.post("/clients/<int:client_id>/unapprove")
@jwt_required
def unapprove_client(client_id):
    """Reverses approve_client() -- a client trusted to auto-confirm under
    booking_mode "approved_clients" goes back to needing manual approval on
    their next booking. Doesn't touch any of their existing appointments."""
    client = Client.query.filter_by(id=client_id, business_id=g.current_business.id).first()
    if client is None:
        return jsonify({"error": "not_found"}), 404

    client.is_approved = False
    db.session.commit()
    return jsonify(serialize_client(client))


@owner_bp.get("/me/stats")
@jwt_required
def get_stats():
    """Lightweight stats computed in Python rather than SQL aggregates --
    fine at the appointment volumes a small local business actually has, and
    much simpler than per-database aggregate-function differences.

    Optional ?staff_id= scopes everything to one staff member, matching the
    dashboard's "viewing as" switcher (see Agenda/Services/Hours, which do
    the same) -- a staff member can see their own numbers, not just the
    business-wide total.
    """
    business = g.current_business
    if not plan_allows_stats(business.plan_id):
        return jsonify({"error": "plan_stats_not_allowed"}), 402
    staff_id = request.args.get("staff_id", type=int)
    now = utcnow().replace(tzinfo=None)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # Start of a 14-day window that includes today (today minus 13 days).
    window_start = now - timedelta(days=13)

    def scoped(query):
        if staff_id is not None:
            return query.filter(Appointment.staff_id == staff_id)
        return query

    month_appointments = scoped(
        Appointment.query.filter(
            Appointment.business_id == business.id,
            Appointment.starts_at >= month_start,
            Appointment.starts_at <= now,
        )
    ).all()
    confirmed_this_month = [a for a in month_appointments if a.status == "confirmed"]
    cancelled_this_month = [a for a in month_appointments if a.status == "cancelled"]
    revenue_this_month = sum(float(a.service_price) for a in confirmed_this_month)

    upcoming_count = scoped(
        Appointment.query.filter(
            Appointment.business_id == business.id,
            Appointment.status.in_(("pending", "confirmed")),
            Appointment.starts_at > now,
        )
    ).count()

    recent = scoped(
        Appointment.query.filter(
            Appointment.business_id == business.id,
            Appointment.starts_at >= window_start.replace(hour=0, minute=0, second=0),
            Appointment.status != "cancelled",
        )
    ).all()
    by_day: dict[str, int] = {}
    for i in range(14):
        day = (window_start + timedelta(days=i)).strftime("%Y-%m-%d")
        by_day[day] = 0
    for appt in recent:
        day = appt.starts_at.strftime("%Y-%m-%d")
        if day in by_day:
            by_day[day] += 1

    service_counts: dict[str, int] = {}
    for appt in month_appointments:
        if appt.status != "cancelled":
            service_counts[appt.service_name] = service_counts.get(appt.service_name, 0) + 1
    top_services = sorted(service_counts.items(), key=lambda item: item[1], reverse=True)[:5]

    total_this_month = len(month_appointments)
    cancellation_rate = len(cancelled_this_month) / total_this_month if total_this_month else 0.0

    return jsonify(
        {
            "revenue_this_month": revenue_this_month,
            "currency": business.currency,
            "appointments_this_month": total_this_month,
            "confirmed_this_month": len(confirmed_this_month),
            "cancelled_this_month": len(cancelled_this_month),
            "cancellation_rate": round(cancellation_rate, 3),
            "upcoming_count": upcoming_count,
            "bookings_by_day": [{"date": d, "count": c} for d, c in by_day.items()],
            "top_services": [{"name": n, "count": c} for n, c in top_services],
        }
    )
