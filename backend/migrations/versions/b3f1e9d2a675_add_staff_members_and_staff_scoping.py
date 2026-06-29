"""add staff_members, staff_working_hours, and staff_id on services/appointments

Revision ID: b3f1e9d2a675
Revises: 7042c53b73d7
Create Date: 2026-06-27 00:00:00.000000

"""
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b3f1e9d2a675'
down_revision = '7042c53b73d7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'staff_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('pin_hash', sa.String(length=255), nullable=True),
        sa.Column('pin_attempts', sa.Integer(), nullable=False),
        sa.Column('pin_locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('staff_members', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_staff_members_business_id'), ['business_id'], unique=False
        )

    op.create_table(
        'staff_working_hours',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('staff_id', sa.Integer(), nullable=False),
        sa.Column('weekday', sa.Integer(), nullable=False),
        sa.Column('open_minute', sa.Integer(), nullable=False),
        sa.Column('close_minute', sa.Integer(), nullable=False),
        sa.Column('slot_minutes', sa.Integer(), nullable=False),
        sa.Column('is_closed', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['staff_id'], ['staff_members.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('staff_id', 'weekday', name='uq_staff_working_hours_weekday'),
    )
    with op.batch_alter_table('staff_working_hours', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_staff_working_hours_staff_id'), ['staff_id'], unique=False
        )

    with op.batch_alter_table('services', schema=None) as batch_op:
        batch_op.add_column(sa.Column('staff_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_services_staff_id_staff_members', 'staff_members', ['staff_id'], ['id']
        )
        batch_op.create_index(batch_op.f('ix_services_staff_id'), ['staff_id'], unique=False)

    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('staff_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('staff_name', sa.String(length=255), nullable=True))
        batch_op.create_foreign_key(
            'fk_appointments_staff_id_staff_members',
            'staff_members',
            ['staff_id'],
            ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_index(batch_op.f('ix_appointments_staff_id'), ['staff_id'], unique=False)

    # --- data backfill ---
    # One "Owner" staff member per existing business, carrying over its
    # working_hours; existing services/appointments are reassigned to that
    # staff member so single-operator businesses see no behavior change.
    bind = op.get_bind()
    metadata = sa.MetaData()
    businesses = sa.Table('businesses', metadata, autoload_with=bind)
    working_hours = sa.Table('working_hours', metadata, autoload_with=bind)
    staff_members = sa.Table('staff_members', metadata, autoload_with=bind)
    staff_working_hours = sa.Table('staff_working_hours', metadata, autoload_with=bind)
    services = sa.Table('services', metadata, autoload_with=bind)
    appointments = sa.Table('appointments', metadata, autoload_with=bind)

    for business in bind.execute(sa.select(businesses.c.id)).fetchall():
        business_id = business.id
        result = bind.execute(
            staff_members.insert().values(
                business_id=business_id,
                name='Owner',
                pin_attempts=0,
                active=True,
                sort_order=0,
                created_at=datetime.now(timezone.utc),
            )
        )
        staff_id = result.inserted_primary_key[0]

        for hour in bind.execute(
            sa.select(working_hours).where(working_hours.c.business_id == business_id)
        ).fetchall():
            bind.execute(
                staff_working_hours.insert().values(
                    staff_id=staff_id,
                    weekday=hour.weekday,
                    open_minute=hour.open_minute,
                    close_minute=hour.close_minute,
                    slot_minutes=hour.slot_minutes,
                    is_closed=hour.is_closed,
                )
            )

        bind.execute(
            services.update()
            .where(services.c.business_id == business_id)
            .values(staff_id=staff_id)
        )
        bind.execute(
            appointments.update()
            .where(appointments.c.business_id == business_id)
            .values(staff_id=staff_id, staff_name='Owner')
        )

    with op.batch_alter_table('services', schema=None) as batch_op:
        batch_op.alter_column('staff_id', existing_type=sa.Integer(), nullable=False)

    with op.batch_alter_table('working_hours', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_working_hours_business_id'))
    op.drop_table('working_hours')

    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.drop_index(
            'uq_appointments_active_slot',
            sqlite_where=sa.text("status != 'cancelled'"),
            postgresql_where=sa.text("status != 'cancelled'"),
        )
        batch_op.create_index(
            'uq_appointments_active_slot',
            ['staff_id', 'starts_at'],
            unique=True,
            sqlite_where=sa.text("status != 'cancelled'"),
            postgresql_where=sa.text("status != 'cancelled'"),
        )


def downgrade():
    # Not supported: multi-staff is a structural change (services/appointments
    # become staff-keyed, not business-keyed); collapsing back to one
    # business-level working_hours row per business would have to arbitrarily
    # discard all but one staff member's hours.
    raise NotImplementedError("downgrade not supported for this migration")
