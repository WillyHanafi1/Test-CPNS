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

    # 1. Add updated_at to exam_sessions — IF NOT EXISTS (avoids transaction abort)
    conn.execute(sa.text("""
        ALTER TABLE exam_sessions
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    """))

    # 2. Add updated_at to user_transactions — IF NOT EXISTS
    conn.execute(sa.text("""
        ALTER TABLE user_transactions
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    """))

    # 3. Indexes — IF NOT EXISTS (fully idempotent)
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

    # 4. Update check_transaction_type — drop IF EXISTS, then create
    conn.execute(sa.text("""
        ALTER TABLE user_transactions
        DROP CONSTRAINT IF EXISTS check_transaction_type
    """))
    conn.execute(sa.text("""
        ALTER TABLE user_transactions
        ADD CONSTRAINT check_transaction_type
        CHECK (transaction_type IN ('pro_upgrade', 'donation'))
    """))

    # 5. Update check_user_role — drop IF EXISTS, then create
    conn.execute(sa.text("""
        ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role
    """))
    conn.execute(sa.text("""
        ALTER TABLE users
        ADD CONSTRAINT check_user_role
        CHECK (role IN ('admin', 'participant'))
    """))

    # 6. Update check_auth_provider — drop IF EXISTS, then create
    conn.execute(sa.text("""
        ALTER TABLE users DROP CONSTRAINT IF EXISTS check_auth_provider
    """))
    conn.execute(sa.text("""
        ALTER TABLE users
        ADD CONSTRAINT check_auth_provider
        CHECK (auth_provider IN ('local', 'google'))
    """))


def downgrade() -> None:
    conn = op.get_bind()

    # Remove indexes
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_package_published_active"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_package_category"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_answer_session_question"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_exam_session_user_status"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_exam_session_user_package"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_chat_session_user_question"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_chat_session_user_exam"))

    # Restore original constraint (with single_package)
    conn.execute(sa.text("""
        ALTER TABLE user_transactions DROP CONSTRAINT IF EXISTS check_transaction_type
    """))
    conn.execute(sa.text("""
        ALTER TABLE user_transactions
        ADD CONSTRAINT check_transaction_type
        CHECK (transaction_type IN ('pro_upgrade', 'single_package', 'donation'))
    """))

    # Remove updated_at columns
    conn.execute(sa.text(
        "ALTER TABLE user_transactions DROP COLUMN IF EXISTS updated_at"
    ))
    conn.execute(sa.text(
        "ALTER TABLE exam_sessions DROP COLUMN IF EXISTS updated_at"
    ))
