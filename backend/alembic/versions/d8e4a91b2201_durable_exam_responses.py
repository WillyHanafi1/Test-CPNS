"""Add immutable package revisions and durable exam responses/jobs.

Revision ID: d8e4a91b2201
Revises: 667ecbb432df
"""
from alembic import op
import sqlalchemy as sa

revision = "d8e4a91b2201"
down_revision = "667ecbb432df"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("package_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("package_id", sa.Uuid(), sa.ForeignKey("packages.id"), nullable=False),
        sa.Column("digest", sa.String(64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("package_id", "digest", name="uq_package_revision_digest"))
    op.create_index("ix_package_revisions_package_id", "package_revisions", ["package_id"])
    op.add_column("packages", sa.Column("published_revision_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_package_published_revision", "packages", "package_revisions", ["published_revision_id"], ["id"])
    op.add_column("exam_sessions", sa.Column("revision_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_session_revision", "exam_sessions", "package_revisions", ["revision_id"], ["id"])
    op.add_column("exam_sessions", sa.Column("writer_epoch", sa.Integer(), server_default="1", nullable=False))
    op.add_column("exam_sessions", sa.Column("writer_id", sa.String(100), nullable=True))
    op.add_column("exam_sessions", sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("uq_modern_active_session", "exam_sessions", ["user_id"], unique=True,
                    postgresql_where=sa.text("revision_id IS NOT NULL AND status = 'ongoing'"))
    op.create_table("exam_responses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("exam_sessions.id"), nullable=False),
        sa.Column("question_id", sa.Uuid(), nullable=False),
        sa.Column("option_id", sa.Uuid(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("mutation_id", sa.String(100), nullable=False),
        sa.Column("saved_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_id", "question_id", name="uq_response_session_question"))
    op.create_index("ix_exam_responses_session_id", "exam_responses", ["session_id"])
    op.create_table("exam_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("exam_sessions.id"), nullable=False, unique=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_exam_jobs_status", "exam_jobs", ["status"])
    op.add_column("user_transactions", sa.Column("duration_days", sa.Integer(), nullable=True))
    op.add_column("user_transactions", sa.Column("granted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    # Never invoke during app rollback; responses are acknowledged participant data.
    raise RuntimeError("Use a reviewed recovery migration; durable exam responses must not be dropped.")
