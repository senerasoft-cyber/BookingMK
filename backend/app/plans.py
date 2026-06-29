"""Static list of subscription tiers, same pattern as business_types.py: not a
database table, just a small fixed catalog. `max_staff: None` means unlimited.

Prices are placeholders -- change them here, nothing else needs to know.

`branding` and `auto_notify` (email reminders / notify-on-change) are baseline
on every plan -- they used to be Mid/Top-only because they rode on paid SMS,
but reminders are email-based (near-free) now. Left as per-plan flags rather
than deleted so a future differentiator could reuse the same on/off shape.
`real_channels` is dormant for now: SMS/Viber/WhatsApp were pulled from the
default flow entirely (see app/notifier.py) and are planned to come back
later as a per-business pay-as-you-go add-on billed separately, not a
plan-tier feature.

Basic is deliberately bare: one staff seat, just enough to try the product
with zero clutter. Mid is "run a real, busy business" -- a few staff, the
stats dashboard to actually see what's happening, and marketing tools
(discount codes) to bring clients back. Top adds unlimited staff for
multi-location-scale businesses plus white-labeling.
"""

PLANS = [
    {
        "id": "basic",
        "name": "Basic",
        "max_staff": 1,
        "price_eur_monthly": 9,
        "real_channels": False,
        "branding": True,
        "auto_notify": True,
        "white_label": False,
        "stats": False,
        "marketing_tools": False,
    },
    {
        "id": "mid",
        "name": "Mid",
        "max_staff": 3,
        "price_eur_monthly": 19,
        "real_channels": True,
        "branding": True,
        "auto_notify": True,
        "white_label": False,
        "stats": True,
        "marketing_tools": True,
    },
    {
        "id": "top",
        "name": "Top",
        "max_staff": None,
        "price_eur_monthly": 39,
        "real_channels": True,
        "branding": True,
        "auto_notify": True,
        "white_label": True,
        "stats": True,
        "marketing_tools": True,
    },
]

PLANS_BY_ID = {p["id"]: p for p in PLANS}

# Real per-message cost is ~$0.20 (Twilio SMS to a North Macedonian number);
# budgeted slightly above that to leave room for multi-segment messages
# (reminders run longer than a 6-digit code) and EUR/USD movement.
SMS_COST_EUR = 0.22
# A platform-wide ceiling, not business-editable: real-channel SMS/WhatsApp/
# Viber spend for a business (verification codes + booking-confirmation
# messages + reminders, combined) is capped at half that business's own plan
# price, so the platform can never lose money on messaging for a single
# business no matter how it's used. Basic has no real channels at all
# (see plan_allows_real_channels), so its number here only bounds the
# "suspicious volume" flagging in rate_limit.py, not real spend.
MIN_MONTHLY_SMS_CAP = 20


def plan_monthly_sms_cap(plan_id: str | None) -> int:
    plan = PLANS_BY_ID.get(plan_id)
    if plan is None:
        return MIN_MONTHLY_SMS_CAP
    if not plan["real_channels"]:
        return MIN_MONTHLY_SMS_CAP
    budget = (plan["price_eur_monthly"] * 0.5) / SMS_COST_EUR
    return max(MIN_MONTHLY_SMS_CAP, int(budget))


def plan_allows_more_staff(plan_id: str | None, current_staff_count: int) -> bool:
    plan = PLANS_BY_ID.get(plan_id)
    if plan is None:
        return False
    if plan["max_staff"] is None:
        return True
    return current_staff_count < plan["max_staff"]


def plan_allows_real_channels(plan_id: str | None) -> bool:
    plan = PLANS_BY_ID.get(plan_id)
    return bool(plan and plan["real_channels"])


def plan_allows_branding(plan_id: str | None) -> bool:
    plan = PLANS_BY_ID.get(plan_id)
    return bool(plan and plan["branding"])


def plan_allows_auto_notify(plan_id: str | None) -> bool:
    plan = PLANS_BY_ID.get(plan_id)
    return bool(plan and plan["auto_notify"])


def plan_allows_white_label(plan_id: str | None) -> bool:
    """Top-only: hides the "Powered by Bukano" credit on the public page.
    Costs nothing to grant, so it's a clean differentiator now that
    branding/reminders are baseline on every plan (see module docstring)."""
    plan = PLANS_BY_ID.get(plan_id)
    return bool(plan and plan["white_label"])


def plan_allows_stats(plan_id: str | None) -> bool:
    plan = PLANS_BY_ID.get(plan_id)
    return bool(plan and plan["stats"])


def plan_allows_marketing_tools(plan_id: str | None) -> bool:
    plan = PLANS_BY_ID.get(plan_id)
    return bool(plan and plan["marketing_tools"])
