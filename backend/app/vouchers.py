import secrets
import string

from app.extensions import db
from app.models import Appointment, Voucher, utcnow

CODE_ALPHABET = string.ascii_uppercase + string.digits
CODE_LENGTH = 6
# Bookings that count toward "how many times has this client booked" -- same
# set availability.py treats as occupying a slot, i.e. not cancelled.
COUNTABLE_STATUSES = ("pending", "confirmed")


def _random_code(prefix: str) -> str:
    return f"{prefix}-{''.join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))}"


def client_booking_count(client_id: int) -> int:
    return Appointment.query.filter(
        Appointment.client_id == client_id, Appointment.status.in_(COUNTABLE_STATUSES)
    ).count()


def grant_voucher(business_id: int, client_id: int, kind: str, percent_off=None, source="manual"):
    code = _random_code("FREE" if kind == "free" else "DISC")
    voucher = Voucher(
        business_id=business_id,
        client_id=client_id,
        code=code,
        kind=kind,
        percent_off=percent_off if kind == "percent_off" else None,
        source=source,
    )
    db.session.add(voucher)
    return voucher


def find_unconsumed_voucher(business_id: int, client_id: int) -> Voucher | None:
    return (
        Voucher.query.filter_by(business_id=business_id, client_id=client_id, consumed_at=None)
        .order_by(Voucher.granted_at)
        .first()
    )


def consume_voucher(voucher: Voucher, appointment_id: int) -> None:
    voucher.consumed_at = utcnow()
    voucher.consumed_appointment_id = appointment_id


def maybe_grant_loyalty_voucher(business, client) -> Voucher | None:
    """Call after an appointment has been committed. Grants a free-booking
    voucher the moment the client's countable booking total is a multiple of
    `loyalty_every_n` -- the voucher is for their *next* visit, not this one,
    since this one's confirmation email has typically already been composed
    by the time the count is known."""
    if not business.loyalty_enabled:
        return None
    count = client_booking_count(client.id)
    if count == 0 or count % business.loyalty_every_n != 0:
        return None
    return grant_voucher(business.id, client.id, kind="free", source="loyalty")


def voucher_email_line(voucher: Voucher) -> str:
    if voucher.kind == "free":
        return f"You've earned a free booking! Show this code when you arrive: {voucher.code}."
    return (
        f"You have a {voucher.percent_off}% off voucher -- show this code when you arrive: "
        f"{voucher.code}."
    )
