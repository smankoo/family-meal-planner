"""
Database models for the Family Meal Planner.
Provider-agnostic models that work with any SQL database.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


class User(Base):
    """User model - provider agnostic authentication"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)

    # Authentication provider info
    provider = Column(String(50), default="email", nullable=False)  # email, google, apple
    provider_id = Column(String(255), nullable=True)  # External provider user ID

    # Password hash (only for email auth)
    hashed_password = Column(String(255), nullable=True)

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user_data = relationship("UserData", back_populates="user", cascade="all, delete-orphan")

    # Indexes for performance
    __table_args__ = (
        Index('idx_user_provider', 'provider', 'provider_id'),
        Index('idx_user_email', 'email'),
    )


class UserData(Base):
    """User data storage - flexible JSONB storage for meal plans, preferences, etc."""
    __tablename__ = "user_data"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Data type - constrained to valid types
    data_type = Column(String(50), nullable=False)  # family, preferences, meal_plan, etc.

    # JSON data storage
    data = Column(JSON, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="user_data")

    # Constraints and indexes
    __table_args__ = (
        Index('idx_user_data_user_type', 'user_id', 'data_type', unique=True),
        Index('idx_user_data_user_id', 'user_id'),
        Index('idx_user_data_created_at', 'created_at'),
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
    'current_stage'
}
