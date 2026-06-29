from datetime import datetime, timedelta

from app.extensions import db
from app.models import Appointment, Business, Client, utcnow
from app.reminders import send_due_reminders
from tests.conftest import register_business


def create_appointment(
    app,
    business_id,
    minutes_from_now,
    status="confirmed",
    reminder_sent=False,
    email="ana@example.com",
):
    with app.app_context():
        client_obj = Client(business_id=business_id, email=email, name="Ana")
        db.session.add(client_obj)
        db.session.flush()
        starts_at = datetime.now() + timedelta(minutes=minutes_from_now)
        appt = Appointment(
            business_id=business_id,
            service_name="Haircut",
            service_price=400,
            client_id=client_obj.id,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(minutes=30),
            status=status,
            reminder_sent_at=utcnow() if reminder_sent else None,
        )
        db.session.add(appt)
        db.session.commit()
        return appt.id


def set_business_reminders(app, business_id, enabled=True, lead_minutes=60):
    with app.app_context():
        business = db.session.get(Business, business_id)
        business.reminders_enabled = enabled
        business.reminder_lead_minutes = lead_minutes
        db.session.commit()


def reminder_sent_at(app, appointment_id):
    with app.app_context():
        return db.session.get(Appointment, appointment_id).reminder_sent_at


def test_sends_reminder_within_lead_time(client, app):
    data = register_business(client)
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=True, lead_minutes=60)
    appt_id = create_appointment(app, business_id, minutes_from_now=30)

    with app.app_context():
        sent = send_due_reminders()

    assert sent == 1
    assert reminder_sent_at(app, appt_id) is not None


def test_skips_appointment_outside_lead_time(client, app):
    data = register_business(client)
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=True, lead_minutes=60)
    appt_id = create_appointment(app, business_id, minutes_from_now=120)

    with app.app_context():
        sent = send_due_reminders()

    assert sent == 0
    assert reminder_sent_at(app, appt_id) is None


def test_skips_when_reminders_disabled(client, app):
    data = register_business(client)
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=False, lead_minutes=60)
    create_appointment(app, business_id, minutes_from_now=10)

    with app.app_context():
        sent = send_due_reminders()

    assert sent == 0


def test_skips_pending_appointments(client, app):
    data = register_business(client)
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=True, lead_minutes=60)
    create_appointment(app, business_id, minutes_from_now=10, status="pending")

    with app.app_context():
        sent = send_due_reminders()

    assert sent == 0


def test_does_not_resend_already_reminded_appointment(client, app):
    data = register_business(client)
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=True, lead_minutes=60)
    create_appointment(app, business_id, minutes_from_now=10, reminder_sent=True)

    with app.app_context():
        sent = send_due_reminders()

    assert sent == 0


def test_skips_past_appointments(client, app):
    data = register_business(client)
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=True, lead_minutes=1440)
    create_appointment(app, business_id, minutes_from_now=-10)

    with app.app_context():
        sent = send_due_reminders()

    assert sent == 0


def test_skips_unsubscribed_business(client, app):
    """auto_notify is now baseline on every paid plan (email reminders are
    near-free), but an unsubscribed business (plan_id=None) still gets none."""
    data = register_business(client, plan_id=None)
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=True, lead_minutes=60)
    appt_id = create_appointment(app, business_id, minutes_from_now=10)

    with app.app_context():
        sent = send_due_reminders()

    assert sent == 0
    assert reminder_sent_at(app, appt_id) is None


def test_sends_reminder_on_basic_plan(client, app):
    """Reminders used to be Top-only because SMS cost money; that gate is
    gone now that the underlying channel is moving to email, so Basic gets
    reminders too."""
    data = register_business(client, plan_id="basic")
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=True, lead_minutes=60)
    appt_id = create_appointment(app, business_id, minutes_from_now=10)

    with app.app_context():
        sent = send_due_reminders()

    assert sent == 1
    assert reminder_sent_at(app, appt_id) is not None


def test_sends_reminder_via_email(client, app, capsys):
    data = register_business(client)
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=True, lead_minutes=60)
    create_appointment(app, business_id, minutes_from_now=10, email="ana@example.com")

    with app.app_context():
        send_due_reminders()

    captured = capsys.readouterr()
    assert "[stub-email]" in captured.out
    assert "ana@example.com" in captured.out


def test_skips_client_with_no_email(client, app):
    """A walk-in client entered with phone only (no email) can't get a
    reminder -- there's no other channel wired up right now."""
    data = register_business(client)
    business_id = data["business"]["id"]
    set_business_reminders(app, business_id, enabled=True, lead_minutes=60)
    appt_id = create_appointment(app, business_id, minutes_from_now=10, email=None)

    with app.app_context():
        sent = send_due_reminders()

    assert sent == 0
    assert reminder_sent_at(app, appt_id) is None
