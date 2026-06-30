from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator, model_validator

from app.business_types import BUSINESS_TYPES_BY_ID
from app.phone import normalize_phone
from app.plans import PLANS_BY_ID


def parse(schema_cls: type[BaseModel], data: dict):
    """Validate `data` against `schema_cls`, returning (instance, None) or (None, error_dict)."""
    try:
        return schema_cls.model_validate(data), None
    except ValidationError as exc:
        errors = {".".join(str(p) for p in e["loc"]): e["msg"] for e in exc.errors()}
        return None, errors


class RegisterSchema(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    business_name: str = Field(min_length=1, max_length=255)
    turnstile_token: Optional[str] = None


class RegisterVerifySchema(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=8)


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class RefreshSchema(BaseModel):
    refresh_token: str


class PasswordResetRequestSchema(BaseModel):
    email: EmailStr


class PasswordResetConfirmSchema(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class BusinessUpdateSchema(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    slug: Optional[str] = Field(default=None, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=255)
    type_id: Optional[str] = None
    accent_key: Optional[str] = Field(default=None, max_length=32)
    tagline: Optional[str] = Field(default=None, max_length=255)
    locale_default: Optional[str] = Field(default=None, max_length=8)
    currency: Optional[str] = Field(default=None, max_length=8)
    booking_mode: Optional[Literal["open", "approved_clients", "approve_every"]] = None
    require_verification: Optional[bool] = None
    verification_channel: Optional[Literal["sms", "viber", "whatsapp", "email"]] = None
    collect_phone: Optional[bool] = None
    reminders_enabled: Optional[bool] = None
    reminder_lead_minutes: Optional[int] = Field(default=None, gt=0)
    onboarding_step: Optional[int] = Field(default=None, ge=0)
    address: Optional[str] = Field(default=None, max_length=500)
    about_text: Optional[str] = None
    contact_phone: Optional[str] = Field(default=None, max_length=32)
    instagram_url: Optional[str] = Field(default=None, max_length=512)
    facebook_url: Optional[str] = Field(default=None, max_length=512)
    website_url: Optional[str] = Field(default=None, max_length=512)
    marketing_enabled: Optional[bool] = None
    loyalty_enabled: Optional[bool] = None
    loyalty_every_n: Optional[int] = Field(default=None, gt=1, le=100)

    @field_validator("type_id")
    @classmethod
    def type_id_must_exist(cls, value):
        if value is not None and value not in BUSINESS_TYPES_BY_ID:
            raise ValueError(f"Unknown business type: {value}")
        return value


class ServiceCreateSchema(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    duration_minutes: int = Field(gt=0)
    price: float = Field(ge=0)
    sort_order: int = 0
    active: bool = True
    staff_id: Optional[int] = None


class ServiceUpdateSchema(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    duration_minutes: Optional[int] = Field(default=None, gt=0)
    price: Optional[float] = Field(default=None, ge=0)
    sort_order: Optional[int] = None
    active: Optional[bool] = None


class WorkingHourItemSchema(BaseModel):
    weekday: int = Field(ge=0, le=6)
    open_minute: int = Field(ge=0, le=1440)
    close_minute: int = Field(ge=0, le=1440)
    slot_minutes: int = Field(gt=0, le=480)
    is_closed: bool = False


class WorkingHoursUpdateSchema(BaseModel):
    hours: list[WorkingHourItemSchema]

    @field_validator("hours")
    @classmethod
    def must_cover_every_weekday_once(cls, value):
        weekdays = sorted(item.weekday for item in value)
        if weekdays != list(range(7)):
            raise ValueError("hours must contain exactly one entry per weekday (0-6)")
        return value


class AvailabilityQuerySchema(BaseModel):
    service_id: int
    date: date


class _EmailSchema(BaseModel):
    """Email is the primary booker identity now -- see app/notifier.py."""

    email: EmailStr


class _OptionalPhoneMixin(BaseModel):
    """Phone is collected only as info a business asked for; never required,
    never used to send anything right now."""

    phone: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        if not value:
            return None
        try:
            return normalize_phone(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc


class BookingRequestSchema(_EmailSchema, _OptionalPhoneMixin):
    service_id: int
    starts_at: datetime
    name: str = Field(min_length=1, max_length=255)
    verification_token: Optional[str] = None
    skip_verification: bool = False
    website: str = ""
    turnstile_token: Optional[str] = None


class VerifyStartSchema(_EmailSchema):
    service_id: int
    starts_at: datetime
    website: str = ""
    turnstile_token: Optional[str] = None


class VerifyCheckSchema(_EmailSchema):
    code: str = Field(min_length=4, max_length=8)


class AppointmentFilterSchema(BaseModel):
    status: Optional[Literal["pending", "confirmed", "cancelled"]] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    staff_id: Optional[int] = None


class ClientCreateSchema(_OptionalPhoneMixin):
    name: str = Field(min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    is_approved: bool = True


class StaffCreateSchema(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    copy_services_from: Optional[int] = None


class StaffUpdateSchema(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    active: Optional[bool] = None
    sort_order: Optional[int] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None


_PIN_PATTERN = r"^\d{4,6}$"


class StaffPinSetupSchema(BaseModel):
    pin: str = Field(pattern=_PIN_PATTERN)
    confirm_pin: str = Field(pattern=_PIN_PATTERN)

    @field_validator("confirm_pin")
    @classmethod
    def pins_must_match(cls, value, info):
        if "pin" in info.data and value != info.data["pin"]:
            raise ValueError("PINs do not match")
        return value


class StaffPinLoginSchema(BaseModel):
    pin: str = Field(pattern=_PIN_PATTERN)


class AppointmentMoveSchema(BaseModel):
    starts_at: datetime
    staff_id: Optional[int] = None
    notify_client: bool = False


class AppointmentCancelSchema(BaseModel):
    notify_client: bool = False


class SubscriptionCheckoutSchema(BaseModel):
    plan_id: str

    @field_validator("plan_id")
    @classmethod
    def plan_id_must_exist(cls, value):
        if value not in PLANS_BY_ID:
            raise ValueError(f"Unknown plan: {value}")
        return value


class PromoRedeemSchema(BaseModel):
    code: str = Field(min_length=1, max_length=16)


class VoucherGrantSchema(BaseModel):
    client_id: int
    kind: Literal["percent_off", "free"]
    percent_off: Optional[int] = Field(default=None, gt=0, le=100)

    @model_validator(mode="after")
    def percent_off_required_for_percent_off_kind(self):
        if self.kind == "percent_off" and self.percent_off is None:
            raise ValueError("percent_off is required for kind=percent_off")
        return self


class StaffTimeOffCreateSchema(BaseModel):
    start_date: date
    end_date: date
    note: Optional[str] = Field(default=None, max_length=255)

    @field_validator("end_date")
    @classmethod
    def end_not_before_start(cls, value, info):
        start = info.data.get("start_date")
        if start is not None and value < start:
            raise ValueError("end_date must not be before start_date")
        return value


class AppointmentCreateSchema(_OptionalPhoneMixin):
    service_id: int
    starts_at: datetime
    staff_id: Optional[int] = None
    client_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
