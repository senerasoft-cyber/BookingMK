import phonenumbers


def normalize_phone(raw: str) -> str:
    """Normalize an international phone number to E.164 (+<country><number>).

    Phone is optional, info-only contact info now (see app/notifier.py) --
    not tied to any one country, so the input must include its own country
    code (e.g. "+389 70 123 456" or "+1 415 555 0100"); there's no default
    region to fall back to for a bare national number.
    """
    try:
        parsed = phonenumbers.parse(raw or "", None)
    except phonenumbers.NumberParseException as exc:
        raise ValueError(
            "Enter a phone number with its country code (e.g. +389 70 123 456)"
        ) from exc

    if not phonenumbers.is_valid_number(parsed):
        raise ValueError("Enter a phone number with its country code (e.g. +389 70 123 456)")

    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
