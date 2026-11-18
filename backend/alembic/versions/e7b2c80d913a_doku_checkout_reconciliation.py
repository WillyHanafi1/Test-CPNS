"""Persist merchant correlation and recoverable Checkout requests.

Revision ID: e7b2c80d913a
Revises: d8e4a91b2201
"""
from alembic import op
import sqlalchemy as sa

revision = "e7b2c80d913a"
down_revision = "d8e4a91b2201"
branch_labels = None
depends_on = None


def upgrade():
    for column in (
        sa.Column("payment_environment", sa.String(20), nullable=True),
        sa.Column("payment_client_id", sa.String(100), nullable=True),
        sa.Column("payment_request_body", sa.Text(), nullable=True),
        sa.Column("payment_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payment_checked_at", sa.DateTime(timezone=True), nullable=True),
    ):
        op.add_column("user_transactions", column)


def downgrade():
    raise RuntimeError("Keep payment recovery records during application rollback; use a reviewed recovery migration.")
