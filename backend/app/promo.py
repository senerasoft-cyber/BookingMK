import secrets
import string
from datetime import timedelta

from app.extensions import db
from app.models import PromoCode, utcnow

CODE_ALPHABET = string.ascii_uppercase + string.digits
CODE_LENGTH = 8


def _random_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def generate_promo_codes(
    count: int, duration_days: int, plan_id: str, note: str | None = None
) -> list[PromoCode]:
    codes = []
    for _ in range(count):
        # Collisions are astronomically unlikely at 8 chars from a 36-symbol
        # alphabet, but check anyway since redemption depends on uniqueness.
        code = _random_code()
        while PromoCode.query.filter_by(code=code).first() is not None:
            code = _random_code()
        promo = PromoCode(code=code, plan_id=plan_id, duration_days=duration_days, note=note)
        db.session.add(promo)
        codes.append(promo)
    db.session.commit()
    return codes


class PromoCodeError(Exception):
    def __init__(self, error_code: str):
        self.error_code = error_code
        super().__init__(error_code)


def redeem_promo_code(business, code: str) -> PromoCode:
    """Raises PromoCodeError("invalid_code") or PromoCodeError("already_redeemed")
    on failure; otherwise activates `business` on the code's plan for its
    duration and returns the now-redeemed PromoCode."""
    promo = PromoCode.query.filter_by(code=code.strip().upper()).first()
    if promo is None:
        raise PromoCodeError("invalid_code")
    if promo.redeemed_at is not None:
        raise PromoCodeError("already_redeemed")

    promo.redeemed_at = utcnow()
    promo.redeemed_by_business_id = business.id

    business.plan_id = promo.plan_id
    business.subscription_status = "active"
    business.subscription_provider = "promo"
    business.subscription_id = None
    business.subscription_customer_id = None
    business.current_period_end = utcnow() + timedelta(days=promo.duration_days)

    db.session.commit()
    return promo
