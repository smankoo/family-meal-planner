"""
Supabase authentication and JWT validation for FastAPI.
This module validates Supabase JWT tokens and extracts user information.
"""
import os
import jwt
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Security scheme
security = HTTPBearer()


class SupabaseAuth:
    """Supabase authentication handler"""

    def __init__(self):
        if not SUPABASE_JWT_SECRET:
            raise ValueError("SUPABASE_JWT_SECRET environment variable is required")
        self.jwt_secret = SUPABASE_JWT_SECRET

    def verify_token(self, token: str) -> dict:
        """
        Verify and decode a Supabase JWT token.

        Args:
            token: The JWT token to verify

        Returns:
            dict: Decoded token payload containing user information

        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            # Decode and verify the JWT token
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True}
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def get_user_id(self, token: str) -> str:
        """
        Extract user ID from a Supabase JWT token.

        Args:
            token: The JWT token

        Returns:
            str: The user ID (UUID)
        """
        payload = self.verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token does not contain user ID",
            )
        return user_id


# Global instance
supabase_auth = SupabaseAuth()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """
    FastAPI dependency to get the current authenticated user ID.

    Usage:
        @app.get("/protected")
        async def protected_route(user_id: str = Depends(get_current_user_id)):
            return {"user_id": user_id}

    Args:
        credentials: HTTP Bearer token from request header

    Returns:
        str: The authenticated user's ID (UUID)

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    return supabase_auth.get_user_id(token)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    FastAPI dependency to get the current authenticated user's full token payload.

    Usage:
        @app.get("/me")
        async def get_me(user: dict = Depends(get_current_user)):
            return user

    Args:
        credentials: HTTP Bearer token from request header

    Returns:
        dict: The decoded JWT payload with user information

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    return supabase_auth.verify_token(token)


# Optional: For routes that don't require authentication but can use it if present
async def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[str]:
    """
    FastAPI dependency for optional authentication.
    Returns user ID if authenticated, None otherwise.

    Usage:
        @app.get("/public-or-private")
        async def route(user_id: Optional[str] = Depends(get_optional_user_id)):
            if user_id:
                return {"message": "Authenticated", "user_id": user_id}
            return {"message": "Anonymous"}
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        return supabase_auth.get_user_id(token)
    except HTTPException:
        return None
