"""add token_version to users

Revision ID: b7c4e9a21d3f
Revises: a3b9f2e1c845
Create Date: 2026-07-02 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b7c4e9a21d3f'
down_revision = 'a3b9f2e1c845'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('token_version', sa.Integer(), nullable=False, server_default='0')
        )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('token_version', server_default=None)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('token_version')
