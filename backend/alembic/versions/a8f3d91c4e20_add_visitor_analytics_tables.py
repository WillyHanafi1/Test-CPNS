"""Add privacy-friendly visitor analytics tables (daily stats, anonymized dedup, top pages)."""
from alembic import op
import sqlalchemy as sa

revision = "a8f3d91c4e20"
down_revision = "c3d9e25b4a60"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "site_daily_stats",
        sa.Column("stat_date", sa.Date(), nullable=False),
        sa.Column("pageviews", sa.Integer(), server_default="0", nullable=False),
        sa.Column("unique_visitors", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("stat_date"),
    )

    op.create_table(
        "site_visitor_daily",
        sa.Column("visit_date", sa.Date(), nullable=False),
        sa.Column("visitor_hash", sa.String(length=32), nullable=False),
        sa.Column("first_path", sa.String(length=120), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("visit_date", "visitor_hash"),
    )
    op.create_index(
        "ix_site_visitor_daily_last_seen_at",
        "site_visitor_daily",
        ["last_seen_at"],
    )

    op.create_table(
        "site_page_daily_stats",
        sa.Column("stat_date", sa.Date(), nullable=False),
        sa.Column("path", sa.String(length=120), nullable=False),
        sa.Column("pageviews", sa.Integer(), server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("stat_date", "path"),
    )


def downgrade():
    op.drop_table("site_page_daily_stats")
    op.drop_index("ix_site_visitor_daily_last_seen_at", table_name="site_visitor_daily")
    op.drop_table("site_visitor_daily")
    op.drop_table("site_daily_stats")
