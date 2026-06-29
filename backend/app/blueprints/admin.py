from flask import Blueprint, jsonify

from app.auth import admin_required
from app.models import Business, PromoCode
from app.plans import PLANS_BY_ID

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


@admin_bp.get("/overview")
@admin_required
def overview():
    businesses = Business.query.all()

    by_status: dict[str, int] = {}
    by_plan: dict[str, int] = {}
    mrr_eur = 0.0
    for business in businesses:
        by_status[business.subscription_status] = by_status.get(business.subscription_status, 0) + 1
        # Promo-trial businesses aren't paying -- don't count them toward MRR,
        # even though they're "active" for booking-access purposes.
        if (
            business.subscription_status == "active"
            and business.plan_id
            and business.subscription_provider != "promo"
        ):
            by_plan[business.plan_id] = by_plan.get(business.plan_id, 0) + 1
            plan = PLANS_BY_ID.get(business.plan_id)
            if plan:
                mrr_eur += plan["price_eur_monthly"]

    recent = sorted(businesses, key=lambda b: b.created_at, reverse=True)[:10]

    return jsonify(
        {
            "total_businesses": len(businesses),
            "by_subscription_status": by_status,
            "active_by_plan": by_plan,
            "mrr_eur": mrr_eur,
            "recent_businesses": [
                {
                    "id": b.id,
                    "name": b.name,
                    "slug": b.slug,
                    "plan_id": b.plan_id,
                    "subscription_status": b.subscription_status,
                    "created_at": b.created_at.isoformat(),
                }
                for b in recent
            ],
        }
    )


@admin_bp.get("/promo-codes")
@admin_required
def list_promo_codes():
    codes = PromoCode.query.order_by(PromoCode.created_at.desc()).all()
    return jsonify(
        [
            {
                "id": c.id,
                "code": c.code,
                "plan_id": c.plan_id,
                "duration_days": c.duration_days,
                "note": c.note,
                "redeemed_at": c.redeemed_at.isoformat() if c.redeemed_at else None,
                "redeemed_by_business_name": (
                    c.redeemed_by_business.name if c.redeemed_by_business else None
                ),
                "created_at": c.created_at.isoformat(),
            }
            for c in codes
        ]
    )
