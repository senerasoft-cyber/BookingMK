from datetime import datetime, timedelta

from app.email_sender import get_email_sender
from app.extensions import db
from app.models import Appointment, Business, utcnow
from app.plans import plan_allows_auto_notify


def send_due_reminders() -> int:
    """Send a reminder for every confirmed appointment that's within its
    business's reminder lead time and hasn't been reminded yet. Must be
    called within an active Flask app context.
    """
    now = datetime.now()
    candidates = (
        Appointment.query.join(Business, Appointment.business_id == Business.id)
        .filter(
            Appointment.status == "confirmed",
            Appointment.reminder_sent_at.is_(None),
            Appointment.starts_at > now,
            Business.reminders_enabled.is_(True),
        )
        .all()
    )

    sent = 0
    for appointment in candidates:
        business = appointment.business
        if not plan_allows_auto_notify(business.plan_id):
            continue
        if not appointment.client.email:
            continue
        if appointment.starts_at - now > timedelta(minutes=business.reminder_lead_minutes):
            continue

        message = (
            f"Reminder: {appointment.service_name} at {business.name} on "
            f"{appointment.starts_at.strftime('%Y-%m-%d %H:%M')}."
        )
        get_email_sender().send(
            appointment.client.email, f"Reminder: your booking at {business.name}", message
        )
        appointment.reminder_sent_at = utcnow()
        sent += 1

    if sent:
        db.session.commit()
    return sent
