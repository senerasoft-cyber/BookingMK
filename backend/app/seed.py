from datetime import datetime, timedelta

from app.auth import hash_password
from app.blueprints.owner import ONBOARDING_FINAL_STEP
from app.business_types import BUSINESS_TYPES_BY_ID
from app.extensions import db
from app.models import (
    DEFAULT_WORKING_HOURS,
    Appointment,
    Business,
    Client,
    Service,
    StaffMember,
    StaffWorkingHour,
    User,
    utcnow,
)

DEMO_PASSWORD = "password123"

DEMO_BUSINESSES = [
    {
        "type_id": "barber",
        "name": "Берберница Скопје",
        "slug": "berber-skopje",
        "email": "owner-barber@example.com",
        "flagship": True,
    },
    {
        "type_id": "hair_salon",
        "name": "Фризерски Салон Линија",
        "slug": "salon-linija",
        "email": "owner-salon@example.com",
    },
    {
        "type_id": "dental",
        "name": "Дентална Ординација Бели Заби",
        "slug": "dental-beli-zabi",
        "email": "owner-dental@example.com",
    },
    {
        "type_id": "therapy_counseling",
        "name": "Центар за Терапија Мир",
        "slug": "centar-mir",
        "email": "owner-therapy@example.com",
    },
    {
        "type_id": "personal_trainer",
        "name": "Персонален Тренер Сила",
        "slug": "trener-sila",
        "email": "owner-trainer@example.com",
    },
]

FLAGSHIP_STAFF = [
    {"name": "Owner", "bio": "Founder, 12 years behind the chair."},
    {"name": "Ивана", "bio": "Specialist in fades and beard styling."},
    {"name": "Дамјан", "bio": "Classic cuts and hot towel shaves."},
]


def _add_working_hours(staff_id: int) -> None:
    for weekday, (open_minute, close_minute, is_closed) in DEFAULT_WORKING_HOURS.items():
        db.session.add(
            StaffWorkingHour(
                staff_id=staff_id,
                weekday=weekday,
                open_minute=open_minute,
                close_minute=close_minute,
                is_closed=is_closed,
            )
        )


def _add_services(business_id: int, staff_id: int, default_services: list[dict]) -> list[Service]:
    services = []
    for index, default_service in enumerate(default_services):
        service = Service(
            business_id=business_id,
            staff_id=staff_id,
            name=default_service["name_mk"],
            duration_minutes=default_service["duration_minutes"],
            price=default_service["price"],
            sort_order=index,
        )
        db.session.add(service)
        services.append(service)
    db.session.flush()
    return services


def _add_spread_of_appointments(
    business_id: int, staff_id: int, staff_name: str, service: Service
) -> None:
    """A realistic mix for exercising the stats dashboard and agenda: a few
    confirmed appointments in the past two weeks, one cancelled, one pending,
    and a couple of upcoming ones."""
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    plan = [
        (timedelta(days=-10), "confirmed", "ana@example.com", "Ана Стојановска"),
        (timedelta(days=-6), "confirmed", "marko@example.com", "Марко Петровски"),
        (timedelta(days=-3), "cancelled", "elena@example.com", "Елена Поповска"),
        (timedelta(hours=20), "confirmed", "ana@example.com", "Ана Стојановска"),
        (timedelta(days=2), "pending", "marko@example.com", "Марко Петровски"),
    ]
    for offset, status, email, name in plan:
        client = Client.query.filter_by(business_id=business_id, email=email).first()
        if client is None:
            client = Client(business_id=business_id, email=email, name=name, is_approved=True)
            db.session.add(client)
            db.session.flush()
        starts_at = now + offset
        db.session.add(
            Appointment(
                business_id=business_id,
                staff_id=staff_id,
                staff_name=staff_name,
                service_id=service.id,
                service_name=service.name,
                service_price=service.price,
                client_id=client.id,
                starts_at=starts_at,
                ends_at=starts_at + timedelta(minutes=service.duration_minutes),
                status=status,
                reminder_sent_at=utcnow() if offset < timedelta(0) else None,
            )
        )


def _seed_one(spec: dict) -> Business:
    business_type = BUSINESS_TYPES_BY_ID[spec["type_id"]]
    flagship = spec.get("flagship", False)

    user = User(email=spec["email"], password_hash=hash_password(DEMO_PASSWORD))
    business = Business(
        owner=user,
        name=spec["name"],
        slug=spec["slug"],
        type_id=spec["type_id"],
        accent_key=business_type["accent_key"],
        tagline=f"{spec['name']} — demo seed data",
        onboarding_step=ONBOARDING_FINAL_STEP,
        onboarding_completed_at=utcnow(),
        # Demo businesses are pre-subscribed (Top, the most permissive plan) so
        # they're fully explorable without going through checkout.
        plan_id="top",
        subscription_status="active",
        subscription_provider="seed",
        current_period_end=utcnow() + timedelta(days=3650),
        collect_phone=flagship,
        address="Бул. Партизански одреди 42, Скопје" if flagship else None,
        about_text=(
            "Семеен берберски салон во центарот на Скопје веќе 12 години. "
            "Стручен тим, опуштена атмосфера, прецизна работа."
            if flagship
            else None
        ),
        contact_phone="+389 70 111 222" if flagship else None,
        instagram_url="https://instagram.com/berberskopje" if flagship else None,
    )
    db.session.add(user)
    db.session.add(business)
    db.session.flush()

    staff_specs = FLAGSHIP_STAFF if flagship else [{"name": "Owner", "bio": None}]
    staff_members = []
    for index, staff_spec in enumerate(staff_specs):
        staff = StaffMember(
            business_id=business.id,
            name=staff_spec["name"],
            bio=staff_spec["bio"],
            sort_order=index,
        )
        db.session.add(staff)
        db.session.flush()
        _add_working_hours(staff.id)
        staff_members.append(staff)

    for staff in staff_members:
        services = _add_services(business.id, staff.id, business_type["default_services"])
        _add_spread_of_appointments(business.id, staff.id, staff.name, services[0])

    return business


def seed_demo_data() -> list[Business]:
    created = []
    for spec in DEMO_BUSINESSES:
        if Business.query.filter_by(name=spec["name"]).first() is not None:
            print(f"[seed] '{spec['name']}' already exists, skipping")
            continue
        created.append(_seed_one(spec))

    db.session.commit()
    return created
