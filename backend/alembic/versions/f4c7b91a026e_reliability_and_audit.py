"""Add session revocation, payment receipts/audit, and bounded scoring retries."""
from alembic import op
import sqlalchemy as sa

revision = "f4c7b91a026e"
down_revision = "e7b2c80d913a"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("auth_version", sa.Integer(), server_default="0", nullable=False))
    op.add_column("exam_jobs", sa.Column("attempts", sa.Integer(), server_default="0", nullable=False))
    op.add_column("exam_jobs", sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("exam_jobs", sa.Column("last_error", sa.String(100), nullable=True))
    op.create_table("payment_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("environment", sa.String(20), nullable=False),
        sa.Column("client_id", sa.String(100), nullable=False),
        sa.Column("request_id", sa.String(128), nullable=False),
        sa.Column("body_hash", sa.String(64), nullable=False),
        sa.Column("order_id", sa.String(100), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_error", sa.String(100), nullable=True),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("environment", "client_id", "request_id", "body_hash", name="uq_payment_event_receipt"))
    for name in ("order_id", "status"):
        op.create_index("ix_payment_events_" + name, "payment_events", [name])
    op.create_index('ix_payment_events_retry', 'payment_events', ['status', 'next_attempt_at'])
    op.create_table("audit_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.String(100), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    for name in ("action", "entity_id"):
        op.create_index("ix_audit_events_" + name, "audit_events", [name])


def downgrade():
    raise RuntimeError("Preserve payment/audit records and session revocations during application rollback.")
