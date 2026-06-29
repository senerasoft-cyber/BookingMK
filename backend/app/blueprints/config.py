from flask import Blueprint, jsonify

from app.business_types import BUSINESS_TYPES

config_bp = Blueprint("config", __name__)


@config_bp.get("/business-types")
def list_business_types():
    return jsonify(BUSINESS_TYPES)
