"""add owner pin fields to businesses

Revision ID: c7a4d8e1f932
Revises: b3f1e9d2a675
Create Date: 2026-06-27 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c7a4d8e1f932'
down_revision = 'b3f1e9d2a675'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('businesses', schema=None) as batch_op:
        batch_op.add_column(sa.Column('owner_pin_hash', sa.String(length=255), nullable=True))
        batch_op.add_column(
            sa.Column('owner_pin_attempts', sa.Integer(), nullable=False, server_default='0')
        )
        batch_op.add_column(
            sa.Column('owner_pin_locked_until', sa.DateTime(timezone=True), nullable=True)
        )


def downgrade():
    with op.batch_alter_table('businesses', schema=None) as batch_op:
        batch_op.drop_column('owner_pin_locked_until')
        batch_op.drop_column('owner_pin_attempts')
        batch_op.drop_column('owner_pin_hash')
