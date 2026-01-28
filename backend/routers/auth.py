"""
Authentication routes - provider agnostic.
Handles email/password, Google OAuth, Apple OAuth.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, Token, UserResponse, UserUpdate, OAuthCallback
from auth import (
    authenticate_user,
    create_user_email,
    create_user_oauth,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email and password"""
    try:
        user = create_user_email(
            db=db,
            email=user_data.email,
            password=user_data.password,  # pragma: allowlist secret
            name=user_data.name
        )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )

        return Token(
            access_token=access_token,
            user=UserResponse.from_orm(user)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )


@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )

    return Token(
        access_token=access_token,
        user=UserResponse.from_orm(user)
    )


@router.post("/oauth/callback", response_model=Token)
async def oauth_callback(callback_data: OAuthCallback, db: Session = Depends(get_db)):
    """Handle OAuth callback from Google or Apple"""
    # TODO: Implement OAuth token exchange
    # This would typically involve:
    # 1. Exchange authorization code for access token
    # 2. Get user info from provider
    # 3. Create or update user in database
    # 4. Return JWT token

    # For now, return a placeholder response
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="OAuth implementation coming soon"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse.from_orm(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user information"""
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    return UserResponse.from_orm(current_user)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout (client should discard token)"""
    # In a more sophisticated setup, you might maintain a token blacklist
    # For now, we rely on the client to discard the token
    return {"message": "Successfully logged out"}


@router.get("/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    """Verify if the current token is valid"""
    return {"valid": True, "user_id": current_user.id}
