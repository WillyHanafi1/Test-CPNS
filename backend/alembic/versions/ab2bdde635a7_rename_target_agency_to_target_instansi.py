"""rename target_agency to target_instansi

Revision ID: ab2bdde635a7
Revises: 73e8751dbbd8
Create Date: 2026-03-11 17:22:27.378969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab2bdde635a7'
down_revision: Union[str, Sequence[str], None] = '73e8751dbbd8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('user_profiles', 'target_agency', new_column_name='target_instansi')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('user_profiles', 'target_instansi', new_column_name='target_agency')
