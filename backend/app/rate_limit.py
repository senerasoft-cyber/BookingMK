from datetime import timedelta

from app.models import Appointment, Business, Client, VerificationCode, seconds_since, utcnow
from app.plans import plan_monthly_sms_cap

PHONE_COOLDOWN_SECONDS = 60
PHONE_DAILY_MAX = 5
IP_COOLDOWN_SECONDS = 60


def check_rate_limits(business: Business, phone_e164: str, ip_address: str | None) -> str | None:
    """Returns an error code if the send should be blocked, else None."""
    last_for_phone = (
        VerificationCode.query.filter_by(business_id=business.id, phone_e164=phone_e164)
        .order_by(VerificationCode.created_at.desc())
        .first()
    )
    if last_for_phone and seconds_since(last_for_phone.created_at) < PHONE_COOLDOWN_SECONDS:
        return "rate_limited"

    day_ago = utcnow() - timedelta(hours=24)
    phone_daily_count = VerificationCode.query.filter(
        VerificationCode.business_id == business.id,
        VerificationCode.phone_e164 == phone_e164,
        VerificationCode.created_at >= day_ago,
    ).count()
    if phone_daily_count >= PHONE_DAILY_MAX:
        return "rate_limited"

    if ip_address:
        last_for_ip = (
            VerificationCode.query.filter_by(ip_address=ip_address)
            .order_by(VerificationCode.created_at.desc())
            .first()
        )
        if last_for_ip and seconds_since(last_for_ip.created_at) < IP_COOLDOWN_SECONDS:
            return "rate_limited"

    month_ago = utcnow() - timedelta(days=30)
    monthly_cap = plan_monthly_sms_cap(business.plan_id)
    business_monthly_count = VerificationCode.query.filter(
        VerificationCode.business_id == business.id,
        VerificationCode.created_at >= month_ago,
    ).count()
    if business_monthly_count >= monthly_cap:
        print(
            f"[sms-cap-alert] business {business.id} ({business.slug}) "
            f"hit its plan's monthly SMS cap of {monthly_cap}",
            flush=True,
        )
        return "daily_cap_reached"

    return None


def check_booking_message_rate_limit(business: Business, phone_e164: str) -> str | None:
    """Same cap as verification codes, but counted off `appointments` instead of
    `verification_codes` -- bookings on a business that doesn't require
    verification never create a VerificationCode row, so check_rate_limits()
    above has nothing to count for them. Only gates whether the
    booking-confirmation *message* goes out; the booking itself always still
    succeeds even if the cap is hit.
    """
    day_ago = utcnow() - timedelta(hours=24)
    phone_count = (
        Appointment.query.join(Client, Appointment.client_id == Client.id)
        .filter(
            Appointment.business_id == business.id,
            Client.phone_e164 == phone_e164,
            Appointment.created_at >= day_ago,
        )
        .count()
    )
    if phone_count > PHONE_DAILY_MAX:
        return "rate_limited"

    month_ago = utcnow() - timedelta(days=30)
    monthly_cap = plan_monthly_sms_cap(business.plan_id)
    business_count = Appointment.query.filter(
        Appointment.business_id == business.id,
        Appointment.created_at >= month_ago,
    ).count()
    if business_count > monthly_cap:
        print(
            f"[sms-cap-alert] business {business.id} ({business.slug}) "
            f"hit its plan's monthly booking-message cap of {monthly_cap}",
            flush=True,
        )
        return "daily_cap_reached"

    return None


def is_suspicious_booking_volume(
    business: Business, phone_e164: str, ip_address: str | None
) -> bool:
    """True if this booking should be force-flagged for the owner to review
    instead of following the business's normal booking_mode -- the phone or
    IP is already at today's per-phone/IP cap, or the business has done a
    whole month's worth of its plan's message budget in the last 24h alone,
    either of which a real one-off customer essentially never hits. Doesn't
    block the booking, just stops it from auto-confirming so a script can't
    silently fill the calendar.
    """
    day_ago = utcnow() - timedelta(hours=24)

    phone_count = (
        Appointment.query.join(Client, Appointment.client_id == Client.id)
        .filter(
            Appointment.business_id == business.id,
            Client.phone_e164 == phone_e164,
            Appointment.created_at >= day_ago,
        )
        .count()
    )
    if phone_count >= PHONE_DAILY_MAX:
        return True

    if ip_address:
        ip_count = Appointment.query.filter(
            Appointment.business_id == business.id,
            Appointment.booking_ip == ip_address,
            Appointment.created_at >= day_ago,
        ).count()
        if ip_count >= PHONE_DAILY_MAX:
            return True

    business_count = Appointment.query.filter(
        Appointment.business_id == business.id,
        Appointment.created_at >= day_ago,
    ).count()
    return business_count >= plan_monthly_sms_cap(business.plan_id)


# --- Email equivalents below: verification/reminders/confirmations are
# email-only for now (see app/notifier.py), so these are what's actually
# called from app/blueprints/public.py today. The phone-keyed functions
# above are left in place, unused, for whenever a phone-channel add-on
# returns -- not deleted to avoid redoing this when that day comes.

EMAIL_COOLDOWN_SECONDS = 60
EMAIL_DAILY_MAX = 5
# Not cost-driven like plan_monthly_sms_cap -- email costs a fraction of a
# cent per message, so this exists purely to stop a script from filling a
# business's calendar with junk bookings, not to protect platform spend.
EMAIL_MONTHLY_CAP = 300


def check_email_rate_limits(business: Business, email: str, ip_address: str | None) -> str | None:
    """Email equivalent of check_rate_limits() above."""
    last_for_email = (
        VerificationCode.query.filter_by(business_id=business.id, email=email)
        .order_by(VerificationCode.created_at.desc())
        .first()
    )
    if last_for_email and seconds_since(last_for_email.created_at) < EMAIL_COOLDOWN_SECONDS:
        return "rate_limited"

    day_ago = utcnow() - timedelta(hours=24)
    email_daily_count = VerificationCode.query.filter(
        VerificationCode.business_id == business.id,
        VerificationCode.email == email,
        VerificationCode.created_at >= day_ago,
    ).count()
    if email_daily_count >= EMAIL_DAILY_MAX:
        return "rate_limited"

    if ip_address:
        last_for_ip = (
            VerificationCode.query.filter_by(ip_address=ip_address)
            .order_by(VerificationCode.created_at.desc())
            .first()
        )
        if last_for_ip and seconds_since(last_for_ip.created_at) < IP_COOLDOWN_SECONDS:
            return "rate_limited"

    month_ago = utcnow() - timedelta(days=30)
    business_monthly_count = VerificationCode.query.filter(
        VerificationCode.business_id == business.id,
        VerificationCode.created_at >= month_ago,
    ).count()
    if business_monthly_count >= EMAIL_MONTHLY_CAP:
        print(
            f"[email-cap-alert] business {business.id} ({business.slug}) "
            f"hit its monthly verification-email cap of {EMAIL_MONTHLY_CAP}",
            flush=True,
        )
        return "daily_cap_reached"

    return None


def check_email_booking_message_rate_limit(business: Business, email: str) -> str | None:
    """Email equivalent of check_booking_message_rate_limit() above."""
    day_ago = utcnow() - timedelta(hours=24)
    email_count = (
        Appointment.query.join(Client, Appointment.client_id == Client.id)
        .filter(
            Appointment.business_id == business.id,
            Client.email == email,
            Appointment.created_at >= day_ago,
        )
        .count()
    )
    if email_count > EMAIL_DAILY_MAX:
        return "rate_limited"

    month_ago = utcnow() - timedelta(days=30)
    business_count = Appointment.query.filter(
        Appointment.business_id == business.id,
        Appointment.created_at >= month_ago,
    ).count()
    if business_count > EMAIL_MONTHLY_CAP:
        print(
            f"[email-cap-alert] business {business.id} ({business.slug}) "
            f"hit its monthly booking-confirmation cap of {EMAIL_MONTHLY_CAP}",
            flush=True,
        )
        return "daily_cap_reached"

    return None


def is_suspicious_email_booking_volume(
    business: Business, email: str, ip_address: str | None
) -> bool:
    """Email equivalent of is_suspicious_booking_volume() above."""
    day_ago = utcnow() - timedelta(hours=24)

    email_count = (
        Appointment.query.join(Client, Appointment.client_id == Client.id)
        .filter(
            Appointment.business_id == business.id,
            Client.email == email,
            Appointment.created_at >= day_ago,
        )
        .count()
    )
    if email_count >= EMAIL_DAILY_MAX:
        return True

    if ip_address:
        ip_count = Appointment.query.filter(
            Appointment.business_id == business.id,
            Appointment.booking_ip == ip_address,
            Appointment.created_at >= day_ago,
        ).count()
        if ip_count >= EMAIL_DAILY_MAX:
            return True

    business_count = Appointment.query.filter(
        Appointment.business_id == business.id,
        Appointment.created_at >= day_ago,
    ).count()
    return business_count >= EMAIL_MONTHLY_CAP
