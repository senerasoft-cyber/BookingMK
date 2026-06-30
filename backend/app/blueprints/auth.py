from datetime import timedelta

import jwt
from flask import Blueprint, current_app, jsonify, request

from app.auth import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    verify_password_reset_token,
)
from app.email_sender import get_email_sender
from app.extensions import db
from app.models import (
    DEFAULT_WORKING_HOURS,
    Business,
    StaffMember,
    StaffWorkingHour,
    User,
    seconds_since,
    slugify,
    utcnow,
)
from app.schemas import (
    LoginSchema,
    PasswordResetConfirmSchema,
    PasswordResetRequestSchema,
    RefreshSchema,
    RegisterSchema,
    RegisterVerifySchema,
    is_common_password,
    parse,
    password_contains,
)
from app.turnstile import verify_turnstile

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15
PASSWORD_RESET_COOLDOWN_SECONDS = 60
REGISTER_CODE_TTL_MINUTES = 10
REGISTER_CODE_MAX_ATTEMPTS = 5


def _tokens_response(user: User, status: int = 200):
    return (
        jsonify(
            {
                "access_token": create_access_token(user.id),
                "refresh_token": create_refresh_token(user.id),
                "business": {
                    "id": user.business.id,
                    "name": user.business.name,
                    "slug": user.business.slug,
                    "onboarding_step": user.business.onboarding_step,
                },
            }
        ),
        status,
    )


def _unique_slug(name: str) -> str:
    base = slugify(name)
    slug = base
    suffix = 2
    while Business.query.filter_by(slug=slug).first() is not None:
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


def _send_register_code(user: User) -> None:
    import secrets as _secrets

    code = f"{_secrets.randbelow(1_000_000):06d}"
    user.email_verify_code_hash = hash_password(code)
    user.email_verify_expires_at = utcnow() + timedelta(minutes=REGISTER_CODE_TTL_MINUTES)
    user.email_verify_attempts = 0
    db.session.commit()
    get_email_sender().send(
        user.email,
        "Your Bukano verification code",
        f"Your verification code is {code}. It expires in {REGISTER_CODE_TTL_MINUTES} minutes.",
    )


@auth_bp.post("/register")
def register():
    payload, errors = parse(RegisterSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    if not verify_turnstile(payload.turnstile_token, request.remote_addr):
        return jsonify({"error": "captcha_failed"}), 400

    email = payload.email.lower()
    if is_common_password(payload.password):
        return jsonify(
            {"errors": {"password": "That password is too common -- please choose something less predictable."}}
        ), 400
    if password_contains(payload.password, email.split("@")[0]):
        return jsonify(
            {"errors": {"password": "Your password shouldn't contain your email address."}}
        ), 400
    if User.query.filter_by(email=email).first() is not None:
        return jsonify({"errors": {"email": "Email is already registered"}}), 409

    user = User(email=email, password_hash=hash_password(payload.password))
    business = Business(
        owner=user,
        name=payload.business_name,
        slug=_unique_slug(payload.business_name),
        daily_sms_cap=current_app.config["DAILY_SMS_CAP"],
    )
    db.session.add(user)
    db.session.add(business)
    db.session.flush()

    staff = StaffMember(business_id=business.id, name="Owner")
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

    db.session.commit()
    _send_register_code(user)

    return jsonify({"status": "verification_required", "email": email}), 200


@auth_bp.post("/register/verify")
def register_verify():
    payload, errors = parse(RegisterVerifySchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    email = payload.email.lower()
    user = User.query.filter_by(email=email).first()
    if user is None or user.email_verified_at is not None:
        return jsonify({"error": "invalid_or_expired_code"}), 400

    if not user.email_verify_code_hash or seconds_since(user.email_verify_expires_at) > 0:
        return jsonify({"error": "invalid_or_expired_code"}), 400
    if user.email_verify_attempts >= REGISTER_CODE_MAX_ATTEMPTS:
        return jsonify({"error": "too_many_attempts"}), 429
    if not verify_password(user.email_verify_code_hash, payload.code):
        user.email_verify_attempts += 1
        db.session.commit()
        return jsonify({"error": "invalid_or_expired_code"}), 400

    user.email_verified_at = utcnow()
    user.email_verify_code_hash = None
    db.session.commit()

    get_email_sender().send(
        user.email,
        "Welcome to Bukano",
        f"Your business '{user.business.name}' is set up. Finish onboarding to start taking bookings.",
    )

    return _tokens_response(user, status=201)


@auth_bp.post("/register/resend")
def register_resend():
    """Resend the verification code if the user didn't get it.
    Same security response regardless of whether the email exists."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").lower().strip()
    user = User.query.filter_by(email=email).first()
    if user is not None and user.email_verified_at is None:
        _send_register_code(user)
    return jsonify({"status": "sent"})


@auth_bp.post("/login")
def login():
    payload, errors = parse(LoginSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    user = User.query.filter_by(email=payload.email.lower()).first()
    if user is None:
        return jsonify({"error": "invalid_credentials"}), 401

    if user.login_locked_until and seconds_since(user.login_locked_until) < 0:
        return jsonify({"error": "locked"}), 429

    if not verify_password(user.password_hash, payload.password):
        user.login_attempts += 1
        if user.login_attempts >= LOGIN_MAX_ATTEMPTS:
            user.login_locked_until = utcnow() + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
        db.session.commit()
        return jsonify({"error": "invalid_credentials"}), 401

    if not user.email_verified_at:
        return jsonify({"error": "email_not_verified"}), 403

    user.login_attempts = 0
    user.login_locked_until = None
    db.session.commit()
    return _tokens_response(user)


@auth_bp.post("/refresh")
def refresh():
    payload, errors = parse(RefreshSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        claims = decode_token(payload.refresh_token, "refresh")
    except jwt.InvalidTokenError:
        return jsonify({"error": "invalid_token"}), 401

    user = db.session.get(User, claims["sub"])
    if user is None:
        return jsonify({"error": "invalid_token"}), 401

    return jsonify({"access_token": create_access_token(user.id)})


@auth_bp.post("/password-reset/request")
def password_reset_request():
    payload, errors = parse(PasswordResetRequestSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    # Always return the same message regardless of whether the email is
    # registered, or whether it was actually sent this time (rate-limited) --
    # otherwise this endpoint becomes a way to enumerate which emails have an
    # account, or to email-bomb someone by spamming it.
    user = User.query.filter_by(email=payload.email.lower()).first()
    on_cooldown = (
        user is not None
        and user.password_reset_requested_at is not None
        and seconds_since(user.password_reset_requested_at) < PASSWORD_RESET_COOLDOWN_SECONDS
    )
    if user is not None and not on_cooldown:
        user.password_reset_requested_at = utcnow()
        db.session.commit()
        token = create_password_reset_token(user)
        reset_link = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
        get_email_sender().send(
            user.email,
            "Reset your Bukano password",
            f"Click here to set a new password (expires in 30 minutes): {reset_link}",
        )
    return jsonify({"message": "If that email exists, a reset link has been sent."})


@auth_bp.post("/password-reset/confirm")
def password_reset_confirm():
    payload, errors = parse(PasswordResetConfirmSchema, request.get_json(silent=True) or {})
    if errors:
        return jsonify({"errors": errors}), 400

    user = verify_password_reset_token(payload.token)
    if user is None:
        return jsonify({"error": "invalid_or_expired_token"}), 400

    if is_common_password(payload.new_password):
        return jsonify(
            {"errors": {"new_password": "That password is too common -- please choose something less predictable."}}
        ), 400
    if password_contains(payload.new_password, user.email.split("@")[0]):
        return jsonify(
            {"errors": {"new_password": "Your password shouldn't contain your email address."}}
        ), 400

    user.password_hash = hash_password(payload.new_password)
    user.login_attempts = 0
    user.login_locked_until = None
    db.session.commit()
    return jsonify({"message": "Password updated."})
