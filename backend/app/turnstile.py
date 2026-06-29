import requests
from flask import current_app

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile(token: str | None, remote_ip: str | None) -> bool:
    """Validate a Cloudflare Turnstile token.

    In dev mode (no TURNSTILE_SECRET_KEY configured) this always passes, so
    the booking flow works end to end without a real Turnstile site set up.
    """
    secret = current_app.config.get("TURNSTILE_SECRET_KEY")
    if not secret:
        return True
    if not token:
        return False

    response = requests.post(
        VERIFY_URL,
        data={"secret": secret, "response": token, "remoteip": remote_ip},
        timeout=10,
    )
    return bool(response.json().get("success"))
