from flask import Blueprint, current_app, g, jsonify, request, send_from_directory

from app.auth import jwt_required
from app.blueprints.owner import serialize_business, serialize_staff
from app.extensions import db
from app.models import StaffMember
from app.plans import plan_allows_branding
from app.storage import get_storage

uploads_bp = Blueprint("uploads", __name__)

ALLOWED_KINDS = {"logo", "cover", "gallery", "staff_photo"}
GALLERY_MAX_IMAGES = 12


@uploads_bp.post("/uploads")
@jwt_required
def upload_file():
    kind = request.form.get("kind")
    if kind not in ALLOWED_KINDS:
        return (
            jsonify(
                {"errors": {"kind": "kind must be 'logo', 'cover', 'gallery', or 'staff_photo'"}}
            ),
            400,
        )

    file = request.files.get("file")
    if file is None or not file.filename:
        return jsonify({"errors": {"file": "No file provided"}}), 400

    business = g.current_business
    if not plan_allows_branding(business.plan_id):
        return jsonify({"error": "plan_branding_not_allowed"}), 402

    if kind == "staff_photo":
        staff_id = request.form.get("staff_id", type=int)
        staff = StaffMember.query.filter_by(id=staff_id, business_id=business.id).first()
        if staff is None:
            return jsonify({"errors": {"staff_id": "Invalid staff member"}}), 400
        try:
            url = get_storage().save(business.id, f"staff-{staff.id}", file)
        except ValueError as exc:
            return jsonify({"errors": {"file": str(exc)}}), 400
        staff.photo_url = url
        db.session.commit()
        return jsonify(serialize_staff(staff)), 201

    if kind == "gallery" and len(business.gallery_urls or []) >= GALLERY_MAX_IMAGES:
        return jsonify({"error": "gallery_full"}), 400

    try:
        url = get_storage().save(business.id, kind, file)
    except ValueError as exc:
        return jsonify({"errors": {"file": str(exc)}}), 400

    if kind == "logo":
        business.logo_url = url
    elif kind == "cover":
        business.cover_url = url
    else:
        business.gallery_urls = [*(business.gallery_urls or []), url]
    db.session.commit()

    return jsonify(serialize_business(business)), 201


@uploads_bp.delete("/uploads/gallery")
@jwt_required
def delete_gallery_image():
    url = request.args.get("url")
    business = g.current_business
    business.gallery_urls = [u for u in (business.gallery_urls or []) if u != url]
    db.session.commit()
    return jsonify(serialize_business(business))


@uploads_bp.get("/uploads/<int:business_id>/<filename>")
def serve_upload(business_id, filename):
    folder = f"{current_app.config['UPLOADS_DIR']}/{business_id}"
    return send_from_directory(folder, filename)
