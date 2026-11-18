"""Record confirmed payment time without inventing dates for historical successes."""
from alembic import op
import sqlalchemy as sa

revision = 'c3d9e25b4a60'
down_revision = 'f4c7b91a026e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_transactions', sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_user_transactions_paid_at', 'user_transactions', ['paid_at'])


def downgrade():
    raise RuntimeError('Preserve confirmed payment dates during application rollback.')
