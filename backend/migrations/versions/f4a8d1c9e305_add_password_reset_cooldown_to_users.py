"""add password reset cooldown timestamp to users

Revision ID: f4a8d1c9e305
Revises: e1f9c3b7a204
Create Date: 2026-06-28 18:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f4a8d1c9e305'
down_revision = 'e1f9c3b7a204'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('password_reset_requested_at', sa.DateTime(timezone=True), nullable=True)
        )


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('password_reset_requested_at')
