"""add booking_ip and flagged_for_review to appointments

Revision ID: a7c2e9f1d406
Revises: f4a8d1c9e305
Create Date: 2026-06-28 19:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a7c2e9f1d406'
down_revision = 'f4a8d1c9e305'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('booking_ip', sa.String(length=64), nullable=True))
        batch_op.add_column(
            sa.Column('flagged_for_review', sa.Boolean(), nullable=False, server_default=sa.false())
        )


def downgrade():
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.drop_column('flagged_for_review')
        batch_op.drop_column('booking_ip')
