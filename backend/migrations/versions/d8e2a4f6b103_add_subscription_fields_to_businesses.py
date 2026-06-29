"""add subscription fields to businesses

Revision ID: d8e2a4f6b103
Revises: c7a4d8e1f932
Create Date: 2026-06-28 00:00:00.000000

"""
from datetime import datetime, timedelta, timezone

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'd8e2a4f6b103'
down_revision = 'c7a4d8e1f932'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('businesses', schema=None) as batch_op:
        batch_op.add_column(sa.Column('plan_id', sa.String(length=32), nullable=True))
        batch_op.add_column(
            sa.Column('subscription_status', sa.String(length=16), nullable=False, server_default='none')
        )
        batch_op.add_column(sa.Column('subscription_provider', sa.String(length=32), nullable=True))
        batch_op.add_column(
            sa.Column('subscription_customer_id', sa.String(length=128), nullable=True)
        )
        batch_op.add_column(sa.Column('subscription_id', sa.String(length=128), nullable=True))
        batch_op.add_column(
            sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True)
        )

    # Grandfather in every business that existed before the paywall: new
    # registrations require payment going forward (subscription_status
    # defaults to 'none' above), but businesses already running shouldn't go
    # dark the moment this migration runs.
    bind = op.get_bind()
    metadata = sa.MetaData()
    businesses = sa.Table('businesses', metadata, autoload_with=bind)
    bind.execute(
        businesses.update().values(
            plan_id='top',
            subscription_status='active',
            subscription_provider='grandfathered',
            current_period_end=datetime.now(timezone.utc) + timedelta(days=3650),
        )
    )


def downgrade():
    with op.batch_alter_table('businesses', schema=None) as batch_op:
        batch_op.drop_column('current_period_end')
        batch_op.drop_column('subscription_id')
        batch_op.drop_column('subscription_customer_id')
        batch_op.drop_column('subscription_provider')
        batch_op.drop_column('subscription_status')
        batch_op.drop_column('plan_id')
