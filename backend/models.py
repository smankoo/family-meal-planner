"""
Database models for the Family Meal Planner.
Supabase-compatible models using SQLAlchemy ORM.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


class Profile(Base):
    """
    User profile model - extends Supabase auth.users
    This table is automatically populated via database trigger when a user signs up
    """
    __tablename__ = "profiles"

    # References auth.users(id) - managed by Supabase
    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(Text, nullable=False)
    name = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user_data = relationship("UserData", back_populates="profile", cascade="all, delete-orphan")

    # Indexes for performance
    __table_args__ = (
        Index('idx_profiles_email', 'email'),
    )


class UserData(Base):
    """User data storage - flexible JSONB storage for meal plans, preferences, etc."""
    __tablename__ = "user_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)

    # Data type - constrained to valid types
    data_type = Column(
        Text,
        CheckConstraint(
            "data_type IN ('family', 'preferences', 'meal_plan', 'prep_tasks', 'grocery_items', 'invalidation_state', 'has_plan', 'current_stage', 'active_plan_id')",
            name='valid_data_types'
        ),
        nullable=False
    )

    # JSONB data storage (PostgreSQL specific)
    data = Column(JSON, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    profile = relationship("Profile", back_populates="user_data")

    # Constraints and indexes
    __table_args__ = (
        Index('idx_user_data_user_id', 'user_id'),
        Index('idx_user_data_data_type', 'data_type'),
    )


class CollaborativePlan(Base):
    """Collaborative meal plans that can be shared among multiple users"""
    __tablename__ = "collaborative_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    share_id = Column(Text, unique=True, nullable=False)

    # Plan data
    plan_data = Column(JSON, nullable=False)
    family_data = Column(JSON, nullable=True)
    preferences_data = Column(JSON, nullable=True)
    prep_tasks = Column(JSON, nullable=True)
    grocery_items = Column(JSON, nullable=True)
    invalidation_state = Column(JSON, nullable=True)
    has_plan = Column(String, default="true")
    current_stage = Column(String, default="0")
    title = Column(Text, nullable=True)

    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_modified_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)

    # Relationships
    creator = relationship("Profile", foreign_keys=[created_by])
    last_modifier = relationship("Profile", foreign_keys=[last_modified_by])
    members = relationship("PlanMember", back_populates="plan", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_collaborative_plans_share_id', 'share_id'),
        Index('idx_collaborative_plans_created_by', 'created_by'),
    )


class PlanMember(Base):
    """Members who have access to a collaborative plan"""
    __tablename__ = "plan_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("collaborative_plans.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    role = Column(Text, nullable=False, default="member")  # 'owner' or 'member'
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_viewed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    plan = relationship("CollaborativePlan", back_populates="members")
    user = relationship("Profile")

    __table_args__ = (
        Index('idx_plan_members_plan_id', 'plan_id'),
        Index('idx_plan_members_user_id', 'user_id'),
    )


# Valid data types for user_data
VALID_DATA_TYPES = {
    'family',
    'preferences',
    'meal_plan',
    'prep_tasks',
    'grocery_items',
    'invalidation_state',
    'has_plan',
    'current_stage',
    'active_plan_id'
}
