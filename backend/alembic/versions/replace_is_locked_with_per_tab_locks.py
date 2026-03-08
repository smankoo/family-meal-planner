"""Replace is_locked with per-tab lock columns

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'  # pragma: allowlist secret
down_revision: Union[str, None] = 'a1b2c3d4e5f6'  # pragma: allowlist secret
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add per-tab lock columns
    op.add_column(
        'collaborative_plans',
        sa.Column('is_meals_locked', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column(
        'collaborative_plans',
        sa.Column('is_prep_locked', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column(
        'collaborative_plans',
        sa.Column('is_grocery_locked', sa.Boolean(), nullable=False, server_default='false')
    )

    # Migrate existing lock state: if is_locked was true, lock all three tabs
    op.execute("""
        UPDATE collaborative_plans
        SET is_meals_locked = is_locked,
            is_prep_locked = is_locked,
            is_grocery_locked = is_locked
    """)

    # Drop old column
    op.drop_column('collaborative_plans', 'is_locked')


def downgrade() -> None:
    # Re-add the single lock column
    op.add_column(
        'collaborative_plans',
        sa.Column('is_locked', sa.Boolean(), nullable=False, server_default='false')
    )

    # If any tab was locked, mark the plan as locked
    op.execute("""
        UPDATE collaborative_plans
        SET is_locked = (is_meals_locked OR is_prep_locked OR is_grocery_locked)
    """)

    op.drop_column('collaborative_plans', 'is_meals_locked')
    op.drop_column('collaborative_plans', 'is_prep_locked')
    op.drop_column('collaborative_plans', 'is_grocery_locked')
