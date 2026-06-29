"""add login lockout and admin flag to users

Revision ID: e1f9c3b7a204
Revises: d8e2a4f6b103
Create Date: 2026-06-28 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e1f9c3b7a204'
down_revision = 'd8e2a4f6b103'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('login_attempts', sa.Integer(), nullable=False, server_default='0')
        )
        batch_op.add_column(sa.Column('login_locked_until', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(
            sa.Column('is_platform_admin', sa.Boolean(), nullable=False, server_default=sa.false())
        )


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_platform_admin')
        batch_op.drop_column('login_locked_until')
        batch_op.drop_column('login_attempts')
