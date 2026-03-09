"""
Account management routes - handles account deletion with proper cleanup.
Uses Supabase authentication and admin API.
"""
import os
import requests as http_requests
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Profile, UserData, CollaborativePlan, PlanMember
from supabase_auth import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/account", tags=["account"])

# Supabase admin config — service role key is required for user deletion
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def _cleanup_family_memberships(user_id: str, db: Session) -> None:
    """
    Clean up all family plan memberships for a user being deleted.

    - For plans where user is the sole owner: transfer ownership or delete plan
    - For plans where user is a member: just remove membership

    Uses bulk SQL operations to avoid SQLAlchemy ORM stale-data issues.
    """
    memberships = db.query(PlanMember).filter(PlanMember.user_id == user_id).all()
    plan_ids_to_check = [(m.plan_id, m.role) for m in memberships]

    # First pass: handle ownership transfers and orphaned plan deletions
    for plan_id, role in plan_ids_to_check:
        if role != "owner":
            continue

        owner_count = db.query(PlanMember).filter(
            PlanMember.plan_id == plan_id,
            PlanMember.role == "owner"
        ).count()

        if owner_count == 1:
            other_member = db.query(PlanMember).filter(
                PlanMember.plan_id == plan_id,
                PlanMember.user_id != user_id
            ).first()

            if other_member:
                other_member.role = "owner"
                db.flush()
                logger.info(f"Transferred plan {plan_id} ownership to user {other_member.user_id}")
            else:
                # Last member — delete the entire plan (cascades to plan_members)
                db.query(CollaborativePlan).filter(
                    CollaborativePlan.id == plan_id
                ).delete()
                logger.info(f"Deleted orphaned plan {plan_id}")

    # Second pass: bulk-delete all remaining memberships for this user
    deleted_count = db.query(PlanMember).filter(PlanMember.user_id == user_id).delete()
    db.flush()

    logger.info(f"Cleaned up {deleted_count} family membership(s) for user {user_id}")


def _delete_supabase_auth_user(user_id: str) -> None:
    """
    Delete the user from Supabase auth.users via the admin REST API.
    Requires SUPABASE_SERVICE_ROLE_KEY to be configured.
    """
    if not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("SUPABASE_SERVICE_ROLE_KEY not configured — skipping auth user deletion")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account deletion is not available. Server configuration incomplete."
        )

    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,  # pragma: allowlist secret
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = http_requests.delete(url, headers=headers, timeout=15)

        if response.status_code == 200:
            logger.info(f"Successfully deleted auth user {user_id} from Supabase")
        elif response.status_code == 404:
            # User already gone from auth — that's fine
            logger.warning(f"Auth user {user_id} not found in Supabase (already deleted?)")
        else:
            logger.error(
                f"Failed to delete auth user {user_id}: "
                f"status={response.status_code}, body={response.text}"
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to delete authentication account. Please try again."
            )
    except http_requests.RequestException as e:
        logger.error(f"Network error deleting auth user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach authentication service. Please try again."
        )


@router.delete("/me")
async def delete_account(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Permanently delete the current user's account.

    This performs a full cascade:
    1. Clean up family plan memberships (transfer ownership or delete plans)
    2. Delete all user data (meal plans, preferences, etc.) — handled by DB cascade
    3. Delete the profile record — handled by DB cascade from auth user deletion
    4. Delete the Supabase auth user (the source of truth)

    This action is irreversible.
    """
    logger.info(f"Account deletion requested by user {user_id}")

    try:
        # Step 1: Clean up family memberships (ownership transfer, plan deletion)
        _cleanup_family_memberships(user_id, db)

        # Step 2: Delete all user_data rows explicitly
        # (The profile CASCADE should handle this, but let's be thorough)
        db.query(UserData).filter(UserData.user_id == user_id).delete()

        # Step 3: Delete the profile row
        db.query(Profile).filter(Profile.id == user_id).delete()

        # Commit all DB changes before touching Supabase auth
        db.commit()
        logger.info(f"Database cleanup complete for user {user_id}")

        # Step 4: Delete from Supabase auth (the final, irreversible step)
        _delete_supabase_auth_user(user_id)

        return {"message": "Account deleted successfully"}

    except HTTPException:
        # Re-raise HTTP exceptions (from _delete_supabase_auth_user)
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Account deletion failed for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account deletion failed. Please try again or contact support."
        )
