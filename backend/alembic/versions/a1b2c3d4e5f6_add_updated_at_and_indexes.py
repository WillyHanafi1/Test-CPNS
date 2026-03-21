"""add updated_at to sessions and transactions, update constraints

Revision ID: a1b2c3d4e5f6
Revises: 998993f6b30a
Create Date: 2026-03-21 19:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '998993f6b30a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add updated_at to exam_sessions (idempotent)
    try:
        op.add_column('exam_sessions', sa.Column(
            'updated_at', sa.DateTime(timezone=True), nullable=True,
            server_default=sa.text('now()')
        ))
    except Exception:
        pass  # Column already exists

    # 2. Add updated_at to user_transactions (idempotent)
    try:
        op.add_column('user_transactions', sa.Column(
            'updated_at', sa.DateTime(timezone=True), nullable=True,
            server_default=sa.text('now()')
        ))
    except Exception:
        pass  # Column already exists

    # 3-9. Create indexes using IF NOT EXISTS (safe for re-runs)
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_package_published_active ON packages (is_published, is_active)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_package_category ON packages (category)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_answer_session_question ON answers (session_id, question_id)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_exam_session_user_status ON exam_sessions (user_id, status)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_exam_session_user_package ON exam_sessions (user_id, package_id)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_chat_session_user_question ON chat_sessions (user_id, question_id)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_chat_session_user_exam ON chat_sessions (user_id, exam_session_id)"
    ))

    # 10. Update check_transaction_type constraint (remove single_package)
    try:
        op.drop_constraint('check_transaction_type', 'user_transactions', type_='check')
    except Exception:
        pass
    op.create_check_constraint(
        'check_transaction_type', 'user_transactions',
        "transaction_type IN ('pro_upgrade', 'donation')"
    )

    # 11. Update user role constraint
    try:
        op.drop_constraint('check_user_role', 'users', type_='check')
    except Exception:
        pass
    op.create_check_constraint(
        'check_user_role', 'users',
        "role IN ('admin', 'participant')"
    )

    # 12. Update auth provider constraint
    try:
        op.drop_constraint('check_auth_provider', 'users', type_='check')
    except Exception:
        pass
    op.create_check_constraint(
        'check_auth_provider', 'users',
        "auth_provider IN ('local', 'google')"
    )


def downgrade() -> None:
    conn = op.get_bind()

    # Remove indexes (IF EXISTS = safe)
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_package_published_active"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_package_category"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_answer_session_question"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_exam_session_user_status"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_exam_session_user_package"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_chat_session_user_question"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_chat_session_user_exam"))

    # Restore original constraint (with single_package)
    try:
        op.drop_constraint('check_transaction_type', 'user_transactions', type_='check')
    except Exception:
        pass
    op.create_check_constraint(
        'check_transaction_type', 'user_transactions',
        "transaction_type IN ('pro_upgrade', 'single_package', 'donation')"
    )

    # Remove updated_at columns
    try:
        op.drop_column('user_transactions', 'updated_at')
    except Exception:
        pass
    try:
        op.drop_column('exam_sessions', 'updated_at')
    except Exception:
        pass
