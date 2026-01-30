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
    id: UUID
    user_id: UUID
    data_type: str
    data: Any  # Can be dict, list, string, number, etc.
    created_at: datetime
    updated_at: datetime

    @field_serializer('id', 'user_id')
    def serialize_uuid(self, value: UUID) -> str:
        """Convert UUID to string for JSON serialization"""
        return str(value)

    class Config:
        from_attributes = True
