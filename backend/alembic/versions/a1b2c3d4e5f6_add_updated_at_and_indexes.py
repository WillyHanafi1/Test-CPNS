"""add updated_at to sessions and transactions, update constraints

Revision ID: a1b2c3d4e5f6
Revises: 998993f6b30a
Create Date: 2026-03-21 19:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '998993f6b30a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add updated_at to exam_sessions
    op.add_column('exam_sessions', sa.Column(
        'updated_at', sa.DateTime(timezone=True), nullable=True,
        server_default=sa.text('now()')
    ))
    
    # 2. Add updated_at to user_transactions
    op.add_column('user_transactions', sa.Column(
        'updated_at', sa.DateTime(timezone=True), nullable=True,
        server_default=sa.text('now()')
    ))

    # 3. Add composite indexes to packages
    op.create_index('ix_package_published_active', 'packages', ['is_published', 'is_active'], unique=False)
    op.create_index('ix_package_category', 'packages', ['category'], unique=False)

    # 4. Add composite index to answers
    op.create_index('ix_answer_session_question', 'answers', ['session_id', 'question_id'], unique=False)

    # 5. Add composite indexes to exam_sessions
    op.create_index('ix_exam_session_user_status', 'exam_sessions', ['user_id', 'status'], unique=False)
    op.create_index('ix_exam_session_user_package', 'exam_sessions', ['user_id', 'package_id'], unique=False)

    # 6. Add composite indexes to chat_sessions
    op.create_index('ix_chat_session_user_question', 'chat_sessions', ['user_id', 'question_id'], unique=False)
    op.create_index('ix_chat_session_user_exam', 'chat_sessions', ['user_id', 'exam_session_id'], unique=False)

    # 7. Update check_transaction_type constraint (remove single_package)
    op.drop_constraint('check_transaction_type', 'user_transactions', type_='check')
    op.create_check_constraint(
        'check_transaction_type', 'user_transactions',
        "transaction_type IN ('pro_upgrade', 'donation')"
    )

    # 8. Update other check constraints to use SQL strings (idempotent re-creation)
    # User role constraint
    try:
        op.drop_constraint('check_user_role', 'users', type_='check')
    except Exception:
        pass
    op.create_check_constraint(
        'check_user_role', 'users',
        "role IN ('admin', 'participant')"
    )

    # Auth provider constraint
    try:
        op.drop_constraint('check_auth_provider', 'users', type_='check')
    except Exception:
        pass
    op.create_check_constraint(
        'check_auth_provider', 'users',
        "auth_provider IN ('local', 'google')"
    )


def downgrade() -> None:
    # Remove new indexes
    op.drop_index('ix_package_published_active', table_name='packages')
    op.drop_index('ix_package_category', table_name='packages')
    op.drop_index('ix_answer_session_question', table_name='answers')
    op.drop_index('ix_exam_session_user_status', table_name='exam_sessions')
    op.drop_index('ix_exam_session_user_package', table_name='exam_sessions')
    op.drop_index('ix_chat_session_user_question', table_name='chat_sessions')
    op.drop_index('ix_chat_session_user_exam', table_name='chat_sessions')

    # Restore original constraint (with single_package)
    op.drop_constraint('check_transaction_type', 'user_transactions', type_='check')
    op.create_check_constraint(
        'check_transaction_type', 'user_transactions',
        "transaction_type IN ('pro_upgrade', 'single_package', 'donation')"
    )
    
    # Remove updated_at columns
    op.drop_column('user_transactions', 'updated_at')
    op.drop_column('exam_sessions', 'updated_at')
