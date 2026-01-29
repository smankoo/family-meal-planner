"""
Supabase authentication and JWT validation for FastAPI.
This module validates Supabase JWT tokens using modern asymmetric verification (ES256)
with JWKS endpoint for public key retrieval.
"""
import os
import jwt
import requests
from typing import Optional, Dict
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from functools import lru_cache
from datetime import datetime, timedelta

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable is required")

# Derive JWKS URL from Supabase URL
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# Security scheme
security = HTTPBearer()


class JWKSCache:
    """Cache for JWKS keys with automatic refresh"""

    def __init__(self, jwks_url: str, cache_duration_minutes: int = 60):
        self.jwks_url = jwks_url
        self.cache_duration = timedelta(minutes=cache_duration_minutes)
        self._keys: Optional[Dict] = None
        self._last_fetch: Optional[datetime] = None

    def get_keys(self) -> Dict:
        """Get JWKS keys, fetching from endpoint if cache is stale"""
        now = datetime.now()

        # Fetch if cache is empty or stale
        if self._keys is None or self._last_fetch is None or \
           (now - self._last_fetch) > self.cache_duration:
            try:
                response = requests.get(self.jwks_url, timeout=10)
                response.raise_for_status()
                self._keys = response.json()
                self._last_fetch = now
            except requests.RequestException as e:
                # If fetch fails but we have cached keys, use them
                if self._keys is not None:
                    return self._keys
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Failed to fetch JWKS keys: {str(e)}"
                )

        return self._keys

    def get_signing_key(self, kid: str) -> Optional[str]:
        """Get signing key for a specific key ID"""
        keys = self.get_keys()

        for key in keys.get("keys", []):
            if key.get("kid") == kid:
                # Convert JWK to PEM format using PyJWT
                from jwt.algorithms import RSAAlgorithm, ECAlgorithm

                # Determine algorithm type
                kty = key.get("kty")
                if kty == "RSA":
                    return RSAAlgorithm.from_jwk(key)
                elif kty == "EC":
                    return ECAlgorithm.from_jwk(key)
                else:
                    raise ValueError(f"Unsupported key type: {kty}")

        return None


class SupabaseAuth:
    """Supabase authentication handler with asymmetric JWT verification"""

    def __init__(self):
        self.jwks_cache = JWKSCache(JWKS_URL)
        self.supabase_url = SUPABASE_URL

    def verify_token(self, token: str) -> dict:
        """
        Verify and decode a Supabase JWT token using asymmetric verification.

        This uses the JWKS endpoint to fetch public keys and verify tokens
        signed with ES256 (or RS256) algorithms.

        Args:
            token: The JWT token to verify

        Returns:
            dict: Decoded token payload containing user information

        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            # First, decode header to get key ID (kid)
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing key ID (kid)",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Get the signing key from JWKS
            signing_key = self.jwks_cache.get_signing_key(kid)

            if not signing_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Unable to find signing key",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Verify and decode the token
            # Supabase uses ES256 (ECDSA with P-256 curve) by default
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=["ES256", "RS256"],  # Support both ES256 and RS256
                audience="authenticated",
                issuer=f"{self.supabase_url}/auth/v1",
                options={
                    "verify_aud": True,
                    "verify_iss": True,
                    "verify_exp": True,
                }
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
