"""
Pydantic schemas for API request/response models.
"""
from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: str
    avatar_url: Optional[str] = None
    provider: str
    is_active: bool
    email_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[str] = None


# OAuth schemas
class OAuthCallback(BaseModel):
    provider: str  # "google" or "apple"
    code: str
    state: Optional[str] = None


# User data schemas
class UserDataCreate(BaseModel):
    data_type: str
    data: Any  # Can be dict, list, string, number, etc.


class UserDataUpdate(BaseModel):
    data: Any  # Can be dict, list, string, number, etc.


class UserDataResponse(BaseModel):
    id: str
    user_id: str
    data_type: str
    data: Any  # Can be dict, list, string, number, etc.
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Custom validation to handle UUID objects from SQLAlchemy"""
        if hasattr(obj, '__dict__'):
            # Convert UUID objects to strings before validation
            data = {}
            for key, value in obj.__dict__.items():
                if isinstance(value, UUID):
                    data[key] = str(value)
                else:
                    data[key] = value
            return super().model_validate(data, **kwargs)
        return super().model_validate(obj, **kwargs)


# Collaborative plan schemas (legacy - kept for backwards compatibility)
class PlanMemberResponse(BaseModel):
    id: str
    user_id: str
    role: str
    joined_at: datetime
    last_viewed_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class CollaborativePlanCreate(BaseModel):
    plan_data: Any
    family_data: Optional[Any] = None
    preferences_data: Optional[Any] = None
    prep_tasks: Optional[Any] = None
    grocery_items: Optional[Any] = None
    invalidation_state: Optional[Any] = None
    has_plan: Optional[str] = "true"
    current_stage: Optional[str] = "0"
    title: Optional[str] = None


class CollaborativePlanUpdate(BaseModel):
    plan_data: Optional[Any] = None
    family_data: Optional[Any] = None
    preferences_data: Optional[Any] = None
    prep_tasks: Optional[Any] = None
    grocery_items: Optional[Any] = None
    invalidation_state: Optional[Any] = None
    has_plan: Optional[str] = None
    current_stage: Optional[str] = None
    title: Optional[str] = None


class CollaborativePlanResponse(BaseModel):
    id: str
    share_id: str
    plan_data: Any
    family_data: Optional[Any] = None
    preferences_data: Optional[Any] = None
    prep_tasks: Optional[Any] = None
    grocery_items: Optional[Any] = None
    invalidation_state: Optional[Any] = None
    has_plan: str
    current_stage: str
    title: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    last_modified_by: Optional[str] = None
    members: Optional[list[PlanMemberResponse]] = None

    class Config:
        from_attributes = True


class JoinPlanRequest(BaseModel):
    share_id: str


# Family plan schemas (new naming convention)
class FamilyPlanCreate(BaseModel):
    plan_data: Any
    family_data: Optional[Any] = None
    preferences_data: Optional[Any] = None
    prep_tasks: Optional[Any] = None
    grocery_items: Optional[Any] = None
    invalidation_state: Optional[Any] = None
    has_plan: Optional[str] = "true"
    current_stage: Optional[str] = "0"
    title: Optional[str] = None
    is_locked: Optional[bool] = False


class FamilyPlanUpdate(BaseModel):
    plan_data: Optional[Any] = None
    family_data: Optional[Any] = None
    preferences_data: Optional[Any] = None
    prep_tasks: Optional[Any] = None
    grocery_items: Optional[Any] = None
    invalidation_state: Optional[Any] = None
    has_plan: Optional[str] = None
    current_stage: Optional[str] = None
    title: Optional[str] = None
    is_locked: Optional[bool] = None


class FamilyPlanResponse(BaseModel):
    id: str
    invite_code: str  # Maps to share_id in DB
    plan_data: Any
    family_data: Optional[Any] = None
    preferences_data: Optional[Any] = None
    prep_tasks: Optional[Any] = None
    grocery_items: Optional[Any] = None
    invalidation_state: Optional[Any] = None
    has_plan: str
    current_stage: str
    title: Optional[str] = None
    is_locked: bool = False
    created_by: str
    created_at: datetime
    updated_at: datetime
    last_modified_by: Optional[str] = None
    members: Optional[list[PlanMemberResponse]] = None

    class Config:
        from_attributes = True


class JoinFamilyRequest(BaseModel):
    invite_code: str
