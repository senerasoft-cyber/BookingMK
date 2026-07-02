import hashlib
import hmac
import time
from abc import ABC, abstractmethod
from datetime import timedelta

import requests
from flask import current_app

from app.extensions import db
from app.models import seconds_since, utcnow
from app.plans import PLANS_BY_ID

PADDLE_API_BASE = "https://api.paddle.com"
PADDLE_SANDBOX_API_BASE = "https://sandbox-api.paddle.com"


class BillingProvider(ABC):
    @abstractmethod
    def create_checkout(self, business, plan_id: str, interval: str = "monthly") -> dict:
        """Starts a subscription for `business` on `plan_id` / `interval`.
        Returns a dict the frontend can act on -- real providers include a
        `checkout_url` to redirect to; the dev stub activates immediately and
        returns none. `interval` is 'monthly' or 'yearly'."""

    @abstractmethod
    def cancel_subscription(self, business) -> None: ...


class StubBillingProvider(BillingProvider):
    """Dev fallback when no PADDLE_API_KEY is configured: activates the plan
    immediately with no real payment, exactly like StubNotifier logs instead of
    sending. Lets the entire paywall/tier-gating flow be exercised locally
    without a real Paddle account.
    """

    def create_checkout(self, business, plan_id: str, interval: str = "monthly") -> dict:
        business.plan_id = plan_id
        business.billing_interval = interval
        business.subscription_status = "active"
        business.subscription_provider = "stub"
        business.subscription_customer_id = (
            business.subscription_customer_id or f"stub-{business.id}"
        )
        business.subscription_id = f"stub-sub-{business.id}-{plan_id}-{interval}"
        business.current_period_end = utcnow() + timedelta(days=365 if interval == "yearly" else 30)
        return {"checkout_url": None}

    def cancel_subscription(self, business) -> None:
        business.subscription_status = "canceled"


class PaddleBillingProvider(BillingProvider):
    """Built against Paddle's Billing API (api.paddle.com, Bearer auth) and its
    documented webhook signature scheme. Not verified against a live account --
    test against a Paddle sandbox before relying on this; see the README for
    exact setup steps (price IDs, API key, webhook secret).
    """

    def __init__(self):
        self.api_key = current_app.config["PADDLE_API_KEY"]
        self.sandbox = current_app.config["PADDLE_SANDBOX"]
        self.price_ids = current_app.config["PADDLE_PRICE_IDS"]

    @property
    def _base_url(self) -> str:
        return PADDLE_SANDBOX_API_BASE if self.sandbox else PADDLE_API_BASE

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def create_checkout(self, business, plan_id: str, interval: str = "monthly") -> dict:
        price_key = f"{plan_id}_{interval}"
        price_id = self.price_ids.get(price_key)
        if not price_id:
            raise ValueError(f"No Paddle price id configured for '{price_key}'")

        # Paddle Billing: creating a transaction returns a Paddle-hosted checkout
        # URL at data.checkout.url (requires a default payment link configured
        # in Checkout settings) -- the frontend redirects the browser there.
        business.billing_interval = interval
        response = requests.post(
            f"{self._base_url}/transactions",
            headers=self._headers(),
            json={
                "items": [{"price_id": price_id, "quantity": 1}],
                "custom_data": {
                    "business_id": business.id,
                    "plan_id": plan_id,
                    "interval": interval,
                },
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()["data"]
        checkout_url = (data.get("checkout") or {}).get("url")
        return {"checkout_url": checkout_url, "transaction_id": data.get("id")}

    def cancel_subscription(self, business) -> None:
        if not business.subscription_id:
            return
        response = requests.post(
            f"{self._base_url}/subscriptions/{business.subscription_id}/cancel",
            headers=self._headers(),
            json={"effective_from": "next_billing_period"},
            timeout=10,
        )
        response.raise_for_status()


def get_billing_provider() -> BillingProvider:
    if current_app.config.get("PADDLE_API_KEY"):
        return PaddleBillingProvider()
    if not current_app.debug and not current_app.testing:
        # Refuse to silently grant free, unpaid "active" subscriptions in a
        # real deployment just because PADDLE_API_KEY was forgotten -- fail
        # loudly instead of quietly giving the product away.
        raise RuntimeError(
            "PADDLE_API_KEY is not set outside of dev/test. Refusing to fall back to the "
            "free dev stub billing provider in what looks like a production environment."
        )
    return StubBillingProvider()


def verify_paddle_signature(raw_body: bytes, signature_header: str, secret: str) -> bool:
    """Paddle signs webhooks as `Paddle-Signature: ts=<unix_ts>;h1=<hex_hmac>`,
    where h1 = HMAC-SHA256(secret, f"{ts}:{raw_body}"). Verified against Paddle's
    documented scheme, not a live webhook -- double-check against your sandbox's
    actual deliveries before trusting this in production.
    """
    parts = dict(p.split("=", 1) for p in signature_header.split(";") if "=" in p)
    ts = parts.get("ts")
    h1 = parts.get("h1")
    if not ts or not h1:
        return False

    signed_payload = f"{ts}:{raw_body.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, h1):
        return False

    # Reject signatures older than 5 minutes to limit replay-attack exposure.
    return abs(time.time() - int(ts)) < 300


def is_subscription_active(business) -> bool:
    """The single source of truth for "can this business take bookings" --
    use this instead of reading business.subscription_status directly.

    Self-healing: a promo-code trial (or a Paddle period that lapsed without
    its cancel webhook arriving yet) is caught here by checking
    current_period_end against now, and the stored status is corrected on the
    spot rather than needing a separate scheduled job to notice.
    """
    if business.subscription_status != "active":
        return False
    if business.current_period_end and seconds_since(business.current_period_end) > 0:
        business.subscription_status = "canceled"
        db.session.commit()
        return False
    return True


def plan_serialized(plan_id: str | None) -> dict | None:
    if plan_id is None:
        return None
    return PLANS_BY_ID.get(plan_id)


# Self-serve trial: no card collected, so unlike a Paddle subscription it
# can't auto-charge when it ends -- current_period_end simply lapses and
# is_subscription_active() above self-heals it to "canceled" same as any
# other expired period. TRIAL_PLAN_ID is Top so the trial shows the full
# product, not a feature-gated slice of it.
TRIAL_PLAN_ID = "top"
TRIAL_DURATION_DAYS = 7


class TrialError(Exception):
    def __init__(self, error_code: str):
        self.error_code = error_code
        super().__init__(error_code)


def start_trial(business) -> None:
    """Raises TrialError("trial_already_used") if this business has already
    had a trial -- trial_started_at is set once below and never cleared."""
    if business.trial_started_at is not None:
        raise TrialError("trial_already_used")

    business.trial_started_at = utcnow()
    business.plan_id = TRIAL_PLAN_ID
    business.subscription_status = "active"
    business.subscription_provider = "trial"
    business.subscription_id = None
    business.subscription_customer_id = None
    business.current_period_end = utcnow() + timedelta(days=TRIAL_DURATION_DAYS)
    db.session.commit()
