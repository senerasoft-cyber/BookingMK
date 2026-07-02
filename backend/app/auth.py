from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from flask import current_app, g, jsonify, request

from app.extensions import db
from app.models import User

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def _encode_token(user_id: int, token_type: str, ttl: timedelta, token_version: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": token_type,
        "tv": token_version,
        "iat": now,
        "exp": now + ttl,
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def create_access_token(user: User) -> str:
    ttl = timedelta(minutes=current_app.config["JWT_ACCESS_TTL_MINUTES"])
    return _encode_token(user.id, "access", ttl, user.token_version)


def create_refresh_token(user: User) -> str:
    ttl = timedelta(days=current_app.config["JWT_REFRESH_TTL_DAYS"])
    return _encode_token(user.id, "refresh", ttl, user.token_version)


def decode_token(token: str, expected_type: str) -> dict:
    payload = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Unexpected token type")
    return payload


VERIFICATION_TOKEN_TTL_MINUTES = 15


def create_verification_token(business_id: int, identifier: str) -> str:
    """`identifier` is whatever was verified -- an email today, potentially a
    phone number again once a phone-based channel add-on returns."""
    now = datetime.now(timezone.utc)
    payload = {
        "type": "booker_verification",
        "business_id": business_id,
        "identifier": identifier,
        "iat": now,
        "exp": now + timedelta(minutes=VERIFICATION_TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def verify_verification_token(token: str, business_id: int, identifier: str) -> bool:
    try:
        payload = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return False
    return (
        payload.get("type") == "booker_verification"
        and payload.get("business_id") == business_id
        and payload.get("identifier") == identifier
    )


BOOKING_MANAGEMENT_TOKEN_TTL_DAYS = 90


def create_booking_management_token(appointment_id: int, business_id: int) -> str:
    """Lets an anonymous client (no account) view/cancel/reschedule the one
    appointment this token was issued for, via a link in their confirmation
    email. Long-lived since it's mailed once and may be used weeks later."""
    now = datetime.now(timezone.utc)
    payload = {
        "type": "booking_management",
        "appointment_id": appointment_id,
        "business_id": business_id,
        "iat": now,
        "exp": now + timedelta(days=BOOKING_MANAGEMENT_TOKEN_TTL_DAYS),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def verify_booking_management_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None
    if payload.get("type") != "booking_management":
        return None
    return payload


PASSWORD_RESET_TOKEN_TTL_MINUTES = 30


def create_password_reset_token(user: User) -> str:
    """Stateless (no DB table needed): embeds the user's *current* password_hash
    so the token naturally invalidates itself once used (or once the password
    changes any other way) -- confirm() rejects it if password_hash has moved
    on, without needing to track "already used" tokens separately.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "type": "password_reset",
        "sub": user.id,
        "pwd_fp": user.password_hash,
        "iat": now,
        "exp": now + timedelta(minutes=PASSWORD_RESET_TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def verify_password_reset_token(token: str) -> User | None:
    try:
        payload = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None
    if payload.get("type") != "password_reset":
        return None

    user = db.session.get(User, payload.get("sub"))
    if user is None or payload.get("pwd_fp") != user.password_hash:
        return None
    return user


def jwt_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "missing_token"}), 401

        token = header.removeprefix("Bearer ")
        try:
            payload = decode_token(token, "access")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token_expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "invalid_token"}), 401

        user = db.session.get(User, payload["sub"])
        if user is None or user.business is None:
            return jsonify({"error": "business_not_found"}), 404
        if payload.get("tv", 0) != user.token_version:
            return jsonify({"error": "invalid_token"}), 401

        g.current_user = user
        g.current_business = user.business
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    """Platform-operator endpoints (cross-business overview), not a per-business
    owner permission. Granted only via the `flask create-admin` CLI command --
    deliberately no self-service way to become an admin."""

    @wraps(fn)
    @jwt_required
    def wrapper(*args, **kwargs):
        if not g.current_user.is_platform_admin:
            return jsonify({"error": "forbidden"}), 403
        return fn(*args, **kwargs)

    return wrapper
