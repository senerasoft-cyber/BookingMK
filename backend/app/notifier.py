from abc import ABC, abstractmethod

import requests
from flask import current_app

from app.plans import plan_allows_real_channels


class Notifier(ABC):
    @abstractmethod
    def send(self, phone_e164: str, message: str) -> None: ...


class StubNotifier(Notifier):
    """Dev fallback: logs to the console instead of sending anything."""

    def send(self, phone_e164: str, message: str) -> None:
        print(f"[stub-notifier] -> {phone_e164}: {message}", flush=True)


class ViberNotifier(Notifier):
    """Placeholder: Twilio has no Viber Business Messages product, so there's no
    real implementation yet. Behaves like StubNotifier until a provider (e.g.
    Infobip, or Viber's own Business Messages API) is chosen and wired in here.
    """

    def send(self, phone_e164: str, message: str) -> None:
        print(f"[viber-notifier:stub] -> {phone_e164}: {message}", flush=True)


def _send_via_twilio(from_: str, to: str, body: str) -> None:
    sid = current_app.config["TWILIO_ACCOUNT_SID"]
    token = current_app.config["TWILIO_AUTH_TOKEN"]
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    response = requests.post(
        url, auth=(sid, token), data={"From": from_, "To": to, "Body": body}, timeout=10
    )
    response.raise_for_status()


class SmsNotifier(Notifier):
    def send(self, phone_e164: str, message: str) -> None:
        _send_via_twilio(current_app.config["TWILIO_SMS_FROM"], phone_e164, message)


class WhatsappNotifier(Notifier):
    def send(self, phone_e164: str, message: str) -> None:
        _send_via_twilio(
            f"whatsapp:{current_app.config['TWILIO_WHATSAPP_FROM']}",
            f"whatsapp:{phone_e164}",
            message,
        )


def get_notifier(channel: str, business=None) -> Notifier:
    """`business` is optional only for callers that pre-date plan gating (none
    left in this codebase, but keeps the signature forgiving); pass it so a
    Basic-plan business doesn't get real SMS/WhatsApp spend it didn't pay for.
    """
    if business is not None and not plan_allows_real_channels(business.plan_id):
        return ViberNotifier() if channel == "viber" else StubNotifier()

    if channel == "viber":
        return ViberNotifier()

    twilio_configured = bool(current_app.config.get("TWILIO_ACCOUNT_SID"))
    if channel == "whatsapp" and twilio_configured:
        return WhatsappNotifier()
    if channel == "sms" and twilio_configured:
        return SmsNotifier()
    return StubNotifier()
