import re
import unicodedata
from datetime import datetime, timezone

from sqlalchemy import Index, UniqueConstraint
from sqlalchemy.sql import text

from app.extensions import db


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def seconds_since(dt: datetime) -> float:
    """Seconds elapsed since `dt`, tolerant of SQLite dropping tzinfo on read-back
    (Postgres preserves it; SQLite returns naive UTC since we always write utcnow())."""
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return (now_naive - dt).total_seconds()


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value or "business"


DEFAULT_WORKING_HOURS = {
    0: (540, 1020, False),  # Monday 09:00-17:00
    1: (540, 1020, False),
    2: (540, 1020, False),
    3: (540, 1020, False),
    4: (540, 1020, False),
    5: (540, 840, False),  # Saturday 09:00-14:00
    6: (0, 0, True),  # Sunday closed
}


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    login_attempts = db.Column(db.Integer, nullable=False, default=0)
    login_locked_until = db.Column(db.DateTime(timezone=True), nullable=True)
    password_reset_requested_at = db.Column(db.DateTime(timezone=True), nullable=True)
    # Platform operator, not a per-business permission -- granted only via the
    # `flask create-admin` CLI command, no self-service path to set this.
    is_platform_admin = db.Column(db.Boolean, nullable=False, default=False)
    # Null until the owner clicks the 6-digit code emailed at registration.
    # Login is blocked until this is set (see /auth/login).
    email_verified_at = db.Column(db.DateTime(timezone=True), nullable=True)
    # Registration verification code stored directly on User so it doesn't
    # interfere with the booking-flow VerificationCode table (different
    # purpose, different rate limits).
    email_verify_code_hash = db.Column(db.String(255), nullable=True)
    email_verify_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    email_verify_attempts = db.Column(db.Integer, nullable=False, default=0)
    # Bumped whenever existing sessions should be invalidated (currently: on
    # password reset). Embedded in every access/refresh JWT as "tv" and checked
    # on every request, so a stolen refresh token stops working immediately
    # once the real owner resets their password, instead of staying valid
    # until it naturally expires.
    token_version = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    business = db.relationship(
        "Business", back_populates="owner", uselist=False, cascade="all, delete-orphan"
    )


class Business(db.Model):
    __tablename__ = "businesses"

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False, index=True)
    type_id = db.Column(db.String(64), nullable=True)
    accent_key = db.Column(db.String(32), nullable=False, default="slate")
    tagline = db.Column(db.String(255), nullable=True)
    logo_url = db.Column(db.String(512), nullable=True)
    cover_url = db.Column(db.String(512), nullable=True)
    locale_default = db.Column(db.String(8), nullable=False, default="mk")
    currency = db.Column(db.String(8), nullable=False, default="MKD")
    booking_mode = db.Column(db.String(32), nullable=False, default="open")
    require_verification = db.Column(db.Boolean, nullable=False, default=False)
    # "sms"/"viber"/"whatsapp" are dormant for now -- verification and
    # reminders are email-only until phone-based channels return as a
    # per-business pay-as-you-go add-on (see app/notifier.py). New businesses
    # default to "email", the only channel actually wired up.
    verification_channel = db.Column(db.String(16), nullable=False, default="email")
    # Whether the public booking form should additionally ask clients for a
    # phone number -- info-only, never used to send anything right now.
    collect_phone = db.Column(db.Boolean, nullable=False, default=False)
    reminders_enabled = db.Column(db.Boolean, nullable=False, default=True)
    reminder_lead_minutes = db.Column(db.Integer, nullable=False, default=1440)
    # Unused going forward -- real-channel message volume is capped by
    # plan_monthly_sms_cap() in app/plans.py (a hardcoded function of plan
    # price, not owner-editable), not this column. Column kept rather than
    # migrated away since nothing reads it anymore and there's no live data
    # yet to migrate.
    daily_sms_cap = db.Column(db.Integer, nullable=False, default=50)
    onboarding_step = db.Column(db.Integer, nullable=False, default=0)
    onboarding_completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    # Owner PIN: a lighter-weight "who's working right now" gate shown after the
    # owner's email+password login on a shared device, separate from staff PINs
    # below -- deliberately not tied to any one StaffMember row (the owner stays
    # the owner even if they delete their own staff seat).
    owner_pin_hash = db.Column(db.String(255), nullable=True)
    owner_pin_attempts = db.Column(db.Integer, nullable=False, default=0)
    owner_pin_locked_until = db.Column(db.DateTime(timezone=True), nullable=True)
    # Subscription (Milestone 8): provider-agnostic on purpose, so swapping or
    # adding a payment processor later doesn't need a schema change. plan_id
    # references app/plans.py's static catalog, not a DB table. status "none"
    # means never subscribed (or cancelled) -- the public booking surface is
    # gated on status == "active", not on plan_id alone.
    plan_id = db.Column(db.String(32), nullable=True)
    subscription_status = db.Column(db.String(16), nullable=False, default="none")
    subscription_provider = db.Column(db.String(32), nullable=True)
    subscription_customer_id = db.Column(db.String(128), nullable=True)
    subscription_id = db.Column(db.String(128), nullable=True)
    current_period_end = db.Column(db.DateTime(timezone=True), nullable=True)
    # Set once, the first time this business starts a self-serve free trial,
    # and never cleared again -- the guard against re-triggering a trial by
    # cancelling/downgrading back to "none".
    trial_started_at = db.Column(db.DateTime(timezone=True), nullable=True)
    billing_interval = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    # Public page content -- all optional and shown only when set, so there's
    # no separate "enabled" toggle per section: clearing the field/list is how
    # a business turns a section off.
    address = db.Column(db.String(500), nullable=True)
    about_text = db.Column(db.Text, nullable=True)
    contact_phone = db.Column(db.String(32), nullable=True)
    instagram_url = db.Column(db.String(512), nullable=True)
    facebook_url = db.Column(db.String(512), nullable=True)
    website_url = db.Column(db.String(512), nullable=True)
    gallery_urls = db.Column(db.JSON, nullable=False, default=list)
    # Vouchers/loyalty (see app/vouchers.py) -- off by default, opt-in from
    # Settings, so it never just appears in the dashboard unannounced.
    marketing_enabled = db.Column(db.Boolean, nullable=False, default=False)
    loyalty_enabled = db.Column(db.Boolean, nullable=False, default=False)
    # "Every Nth booking earns a free-booking voucher" -- only read when
    # loyalty_enabled is True.
    loyalty_every_n = db.Column(db.Integer, nullable=False, default=10)

    owner = db.relationship("User", back_populates="business")
    staff_members = db.relationship(
        "StaffMember",
        back_populates="business",
        cascade="all, delete-orphan",
        order_by="StaffMember.sort_order",
    )
    services = db.relationship(
        "Service",
        back_populates="business",
        cascade="all, delete-orphan",
        order_by="Service.sort_order",
    )


class StaffMember(db.Model):
    """A bookable staff member within a business. Every business has at least one
    (created automatically at registration to represent the owner), so
    single-operator businesses work with no extra setup -- multi-staff is purely
    additive on top of that default row.
    """

    __tablename__ = "staff_members"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    # Short bio/specialties shown on the public page -- optional, blank means
    # nothing extra is shown for that staff member.
    bio = db.Column(db.Text, nullable=True)
    photo_url = db.Column(db.String(512), nullable=True)
    # Self-service PIN (set by the staff member on first login, not by the owner) --
    # null until they complete first-time setup. Kept deliberately separate from
    # User/password auth: this is a lightweight, low-privilege view of one staff
    # member's own agenda, not a full account system.
    pin_hash = db.Column(db.String(255), nullable=True)
    pin_attempts = db.Column(db.Integer, nullable=False, default=0)
    pin_locked_until = db.Column(db.DateTime(timezone=True), nullable=True)
    active = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    business = db.relationship("Business", back_populates="staff_members")
    working_hours = db.relationship(
        "StaffWorkingHour",
        back_populates="staff",
        cascade="all, delete-orphan",
        order_by="StaffWorkingHour.weekday",
    )
    time_off = db.relationship(
        "StaffTimeOff",
        back_populates="staff",
        cascade="all, delete-orphan",
        order_by="StaffTimeOff.start_date",
    )
    services = db.relationship(
        "Service",
        back_populates="staff",
        cascade="all, delete-orphan",
        order_by="Service.sort_order",
    )


class StaffWorkingHour(db.Model):
    __tablename__ = "staff_working_hours"
    __table_args__ = (
        UniqueConstraint("staff_id", "weekday", name="uq_staff_working_hours_weekday"),
    )

    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey("staff_members.id"), nullable=False, index=True)
    weekday = db.Column(db.Integer, nullable=False)
    open_minute = db.Column(db.Integer, nullable=False, default=540)
    close_minute = db.Column(db.Integer, nullable=False, default=1020)
    slot_minutes = db.Column(db.Integer, nullable=False, default=30)
    is_closed = db.Column(db.Boolean, nullable=False, default=False)

    staff = db.relationship("StaffMember", back_populates="working_hours")


class StaffTimeOff(db.Model):
    """A vacation/closed date range for one staff member -- on top of the
    weekly StaffWorkingHour schedule above, not a replacement for it.
    Blocks public booking and reschedules (see app/availability.py) but not
    the owner manually adding an appointment, same as a regular closed day."""

    __tablename__ = "staff_time_off"

    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey("staff_members.id"), nullable=False, index=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    note = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    staff = db.relationship("StaffMember", back_populates="time_off")


class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    staff_id = db.Column(db.Integer, db.ForeignKey("staff_members.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    active = db.Column(db.Boolean, nullable=False, default=True)

    business = db.relationship("Business", back_populates="services")
    staff = db.relationship("StaffMember", back_populates="services")


class Client(db.Model):
    __tablename__ = "clients"
    # Email is the primary identity now (verification moved off phone -- see
    # app/notifier.py); phone is optional, info-only, and never unique on its
    # own, since a shared/family phone number shouldn't collide across two
    # genuinely different email-identified clients.
    __table_args__ = (UniqueConstraint("business_id", "email", name="uq_clients_email"),)

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=True)
    phone_e164 = db.Column(db.String(32), nullable=True)
    name = db.Column(db.String(255), nullable=False)
    is_approved = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    business = db.relationship("Business")


class Appointment(db.Model):
    __tablename__ = "appointments"
    __table_args__ = (
        # Scoped to staff_id (not business_id): two different staff members at the
        # same business can be booked at the same business-wide timestamp -- that's
        # the entire point of having more than one. A staff member still can't be
        # double-booked at their own exact same instant.
        Index(
            "uq_appointments_active_slot",
            "staff_id",
            "starts_at",
            unique=True,
            sqlite_where=text("status != 'cancelled'"),
            postgresql_where=text("status != 'cancelled'"),
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    staff_id = db.Column(
        db.Integer,
        db.ForeignKey("staff_members.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    staff_name = db.Column(db.String(255), nullable=True)
    service_id = db.Column(
        db.Integer, db.ForeignKey("services.id", ondelete="SET NULL"), nullable=True
    )
    service_name = db.Column(db.String(255), nullable=False)
    service_price = db.Column(db.Numeric(10, 2), nullable=False)
    # Set when a Voucher was attached to this booking's confirmation email --
    # informational only (see app/vouchers.py), the owner honors it in person.
    # service_price above is always the full listed price, never auto-reduced.
    voucher_code = db.Column(db.String(32), nullable=True)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"), nullable=False)
    starts_at = db.Column(db.DateTime(timezone=False), nullable=False)
    ends_at = db.Column(db.DateTime(timezone=False), nullable=False)
    status = db.Column(db.String(16), nullable=False, default="pending")
    source = db.Column(db.String(32), nullable=False, default="public_page")
    # Set on public bookings only (null for owner-created ones); used purely to
    # detect one source hammering the booking page, not shown to the client.
    booking_ip = db.Column(db.String(64), nullable=True)
    # Forced true (and status forced to "pending") when this booking pushed the
    # phone/IP/business past today's volume cap -- the booking still succeeds,
    # it just needs the owner's eyes instead of auto-confirming.
    flagged_for_review = db.Column(db.Boolean, nullable=False, default=False)
    reminder_sent_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    business = db.relationship("Business")
    staff = db.relationship("StaffMember")
    service = db.relationship("Service")
    client = db.relationship("Client")


class VerificationCode(db.Model):
    __tablename__ = "verification_codes"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    # phone_e164 is unused by new codes (verification is email-only for now,
    # see app/notifier.py) but kept nullable rather than dropped for the
    # eventual phone-channel add-on.
    phone_e164 = db.Column(db.String(32), nullable=True, index=True)
    email = db.Column(db.String(255), nullable=True, index=True)
    code_hash = db.Column(db.String(255), nullable=False)
    channel = db.Column(db.String(16), nullable=False)
    ip_address = db.Column(db.String(64), nullable=True, index=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    consumed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    business = db.relationship("Business")


class PromoCode(db.Model):
    """Platform-level, admin-issued codes that grant a business free access
    for a set period -- for friends/beta testers, not a public free tier.
    One-time use: redeeming sets redeemed_at/redeemed_by_business_id, and a
    second attempt with the same code is rejected. Generated via the
    `flask generate-promo-codes` CLI command, not self-service."""

    __tablename__ = "promo_codes"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(16), unique=True, nullable=False, index=True)
    plan_id = db.Column(db.String(32), nullable=False)
    duration_days = db.Column(db.Integer, nullable=False)
    note = db.Column(db.String(255), nullable=True)
    redeemed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    redeemed_by_business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    redeemed_by_business = db.relationship("Business")


class Voucher(db.Model):
    """A business's own reward for one specific client -- separate from
    PromoCode above, which is the platform's trial-access system. Mid+ plan
    feature (see app/plans.py:plan_allows_marketing_tools), and off entirely
    unless the business turns on Business.marketing_enabled.

    Always granted to a named client (manually by the owner, or
    automatically by the loyalty "every Nth booking" rule -- see
    app/vouchers.py), never typed in by an anonymous booker. Sits unconsumed
    until the client's next booking, where it's mentioned in that booking's
    confirmation email and marked consumed -- the owner honors it in person,
    nothing here ever changes an appointment's actual service_price."""

    __tablename__ = "vouchers"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"), nullable=False, index=True)
    code = db.Column(db.String(32), nullable=False)
    kind = db.Column(db.String(16), nullable=False)  # "percent_off" | "free"
    percent_off = db.Column(db.Integer, nullable=True)  # set only when kind == "percent_off"
    source = db.Column(db.String(16), nullable=False, default="manual")  # "manual" | "loyalty"
    granted_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    consumed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    consumed_appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), nullable=True)

    business = db.relationship("Business")
    client = db.relationship("Client")
