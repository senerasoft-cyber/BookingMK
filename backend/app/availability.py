from datetime import date as date_cls
from datetime import datetime, timedelta

from app.models import Appointment, StaffTimeOff, StaffWorkingHour

ACTIVE_STATUSES = ("pending", "confirmed")


def get_available_slots(staff_id: int, on_date: date_cls, duration_minutes: int) -> list[datetime]:
    working_hour = StaffWorkingHour.query.filter_by(
        staff_id=staff_id, weekday=on_date.weekday()
    ).first()
    if working_hour is None or working_hour.is_closed:
        return []

    on_vacation = StaffTimeOff.query.filter(
        StaffTimeOff.staff_id == staff_id,
        StaffTimeOff.start_date <= on_date,
        StaffTimeOff.end_date >= on_date,
    ).first()
    if on_vacation is not None:
        return []

    day_start = datetime.combine(on_date, datetime.min.time())
    existing = Appointment.query.filter(
        Appointment.staff_id == staff_id,
        Appointment.status.in_(ACTIVE_STATUSES),
        Appointment.starts_at >= day_start,
        Appointment.starts_at < day_start + timedelta(days=1),
    ).all()

    slot_minutes = working_hour.slot_minutes
    now = datetime.now()

    slots = []
    cursor = working_hour.open_minute
    while cursor + duration_minutes <= working_hour.close_minute:
        slot_start = day_start + timedelta(minutes=cursor)
        slot_end = slot_start + timedelta(minutes=duration_minutes)
        if slot_start > now and not any(
            slot_start < appt.ends_at and slot_end > appt.starts_at for appt in existing
        ):
            slots.append(slot_start)
        cursor += slot_minutes

    return slots
