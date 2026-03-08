"""Drop stale user_data_data_type_check constraint

The user_data table has two CHECK constraints on data_type:
- user_data_data_type_check (old, missing active_plan_id)
- valid_data_types (current, includes active_plan_id)

The old one blocks inserts for active_plan_id. Drop it.

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-03-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'  # pragma: allowlist secret
down_revision: Union[str, None] = 'b2c3d4e5f6g7'  # pragma: allowlist secret
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('user_data_data_type_check', 'user_data', type_='check')


def downgrade() -> None:
    op.create_check_constraint(
        'user_data_data_type_check',
        'user_data',
        "data_type IN ('family', 'preferences', 'meal_plan', 'prep_tasks', 'grocery_items', 'invalidation_state', 'has_plan', 'current_stage')"
    )
