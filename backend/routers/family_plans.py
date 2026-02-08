"""
Family meal plan routes - enables real-time plan sharing and collaboration among family members.
Multiple users can share and edit the same meal plan.

Real-time updates are pushed to connected clients via Supabase Broadcast REST API
after every write operation. This ensures all family members see changes instantly.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

import uuid
import logging

from database import get_db
from models import CollaborativePlan, PlanMember, Profile
from schemas import (
    FamilyPlanCreate,
    FamilyPlanUpdate,
    FamilyPlanResponse,
    PlanMemberResponse,
    JoinFamilyRequest,
    UserResponse
)
from supabase_auth import get_current_user_id
from realtime_broadcast import broadcast_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/family-plans", tags=["family-plans"])


def generate_invite_code() -> str:
    """Generate a full UUID invite code for better uniqueness"""
    return str(uuid.uuid4())


def _plan_broadcast_payload(plan: CollaborativePlan) -> dict:
    """Build the broadcast payload from a plan model. Reused across endpoints."""
    return {
        "plan_data": plan.plan_data,
        "family_data": plan.family_data,
        "preferences_data": plan.preferences_data,
        "prep_tasks": plan.prep_tasks,
        "grocery_items": plan.grocery_items,
        "invalidation_state": plan.invalidation_state,
        "has_plan": str(plan.has_plan) if plan.has_plan is not None else "true",
        "current_stage": str(plan.current_stage) if plan.current_stage is not None else "0",
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
        "last_modified_by": str(plan.last_modified_by) if plan.last_modified_by else None,
    }


def _plan_response(plan: CollaborativePlan, members: list[PlanMember]) -> FamilyPlanResponse:
    """Build a FamilyPlanResponse from a plan model. DRY helper for all endpoints."""
    return FamilyPlanResponse(
        id=str(plan.id),
        invite_code=plan.share_id,
        plan_data=plan.plan_data,
        family_data=plan.family_data,
        preferences_data=plan.preferences_data,
        prep_tasks=plan.prep_tasks,
        grocery_items=plan.grocery_items,
        invalidation_state=plan.invalidation_state,
        has_plan=str(plan.has_plan) if plan.has_plan is not None else "true",
        current_stage=str(plan.current_stage) if plan.current_stage is not None else "0",
        title=plan.title,
        created_by=str(plan.created_by),
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        last_modified_by=str(plan.last_modified_by) if plan.last_modified_by else None,
        members=[
            PlanMemberResponse(
                id=str(m.id),
                user_id=str(m.user_id),
                role=m.role,
                joined_at=m.joined_at,
                last_viewed_at=m.last_viewed_at,
                user=UserResponse(
                    id=str(m.user.id),
                    email=m.user.email,
                    name=m.user.name,
                    avatar_url=m.user.avatar_url,
                    provider="email",  # Default, actual provider is in auth.users
                    is_active=True,
                    email_verified=True,
                    created_at=m.user.created_at,
                    last_login=None
                ) if m.user else None
            ) for m in members
        ]
    )


@router.post("/", response_model=FamilyPlanResponse)
async def create_family_plan(
    plan_data: FamilyPlanCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Create or update a family plan for the user.
    If the user is already an owner of a plan, update that plan and return its existing invite code.
    If not, create a new plan with a new invite code.

    This ensures each family has ONE persistent invite code that doesn't change.
    """
    # Check if user is already an owner of a plan
    existing_membership = db.query(PlanMember).filter(
        PlanMember.user_id == user_id,
        PlanMember.role == "owner"
    ).first()

    if existing_membership:
        # User already owns a plan - update it instead of creating a new one
        family_plan = db.query(CollaborativePlan).filter(
            CollaborativePlan.id == existing_membership.plan_id
        ).first()

        if family_plan:
            # Update the existing plan with new data
            family_plan.plan_data = plan_data.plan_data
            family_plan.family_data = plan_data.family_data
            family_plan.preferences_data = plan_data.preferences_data
            family_plan.prep_tasks = plan_data.prep_tasks
            family_plan.grocery_items = plan_data.grocery_items
            family_plan.invalidation_state = plan_data.invalidation_state
            family_plan.has_plan = plan_data.has_plan
            family_plan.current_stage = plan_data.current_stage
            family_plan.title = plan_data.title
            family_plan.last_modified_by = user_id

            db.commit()
            db.refresh(family_plan)

            # Broadcast the update
            broadcast_payload = _plan_broadcast_payload(family_plan)
            background_tasks.add_task(
                broadcast_service.broadcast_plan_update,
                plan_id=str(family_plan.id),
                event="plan_updated",
                payload=broadcast_payload,
                modified_by=user_id,
            )

            members = db.query(PlanMember).filter(PlanMember.plan_id == family_plan.id).all()
            return _plan_response(family_plan, members)

    # No existing plan - create a new one
    invite_code = generate_invite_code()
    while db.query(CollaborativePlan).filter(CollaborativePlan.share_id == invite_code).first():
        invite_code = generate_invite_code()

    family_plan = CollaborativePlan(
        share_id=invite_code,
        plan_data=plan_data.plan_data,
        family_data=plan_data.family_data,
        preferences_data=plan_data.preferences_data,
        prep_tasks=plan_data.prep_tasks,
        grocery_items=plan_data.grocery_items,
        invalidation_state=plan_data.invalidation_state,
        has_plan=plan_data.has_plan,
        current_stage=plan_data.current_stage,
        title=plan_data.title,
        created_by=user_id,
        last_modified_by=user_id
    )

    db.add(family_plan)
    db.flush()

    # Add creator as owner
    member = PlanMember(
        plan_id=family_plan.id,
        user_id=user_id,
        role="owner"
    )

    db.add(member)
    db.commit()
    db.refresh(family_plan)

    members = db.query(PlanMember).filter(PlanMember.plan_id == family_plan.id).all()

    return _plan_response(family_plan, members)


@router.get("/my-plans", response_model=List[FamilyPlanResponse])
async def get_my_family_plans(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all family plans the user is a member of"""
    memberships = db.query(PlanMember).filter(PlanMember.user_id == user_id).all()
    plan_ids = [m.plan_id for m in memberships]

    if not plan_ids:
        return []

    plans = db.query(CollaborativePlan).filter(CollaborativePlan.id.in_(plan_ids)).all()

    result = []
    for plan in plans:
        members = db.query(PlanMember).filter(PlanMember.plan_id == plan.id).all()
        result.append(_plan_response(plan, members))

    return result


@router.get("/by-invite-code/{invite_code}", response_model=FamilyPlanResponse)
async def get_plan_by_invite_code(
    invite_code: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Get a family plan by its invite code.
    User must be authenticated but doesn't need to be a member yet.
    """
    plan = db.query(CollaborativePlan).filter(CollaborativePlan.share_id == invite_code).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family plan not found"
        )

    members = db.query(PlanMember).filter(PlanMember.plan_id == plan.id).all()
    return _plan_response(plan, members)


@router.post("/join", response_model=dict)
async def join_family(
    request: JoinFamilyRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Join a family plan by invite code.
    This makes the plan the user's active plan.
    """
    # Find the plan
    plan = db.query(CollaborativePlan).filter(CollaborativePlan.share_id == request.invite_code).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family plan not found"
        )

    # Check if already a member
    existing_member = db.query(PlanMember).filter(
        PlanMember.plan_id == plan.id,
        PlanMember.user_id == user_id
    ).first()

    if existing_member:
        # Update last viewed
        existing_member.last_viewed_at = datetime.utcnow()
        db.commit()
        return {"message": "Already a member of this family", "plan_id": str(plan.id)}

    # Add as member
    member = PlanMember(
        plan_id=plan.id,
        user_id=user_id,
        role="member"
    )

    db.add(member)
    db.commit()

    return {"message": "Successfully joined family", "plan_id": str(plan.id)}


@router.get("/{plan_id}", response_model=FamilyPlanResponse)
async def get_family_plan(
    plan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Get a family plan by ID.
    User must be a member of the plan.
    """
    plan = db.query(CollaborativePlan).filter(CollaborativePlan.id == plan_id).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family plan not found"
        )

    member = db.query(PlanMember).filter(
        PlanMember.plan_id == plan_id,
        PlanMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this family"
        )

    members = db.query(PlanMember).filter(PlanMember.plan_id == plan.id).all()
    return _plan_response(plan, members)


@router.put("/{plan_id}", response_model=FamilyPlanResponse)
async def update_family_plan(
    plan_id: str,
    updates: FamilyPlanUpdate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Update a family plan. Any member can update.
    After DB commit, broadcasts the change to all connected family members
    via Supabase Realtime so they see updates instantly.
    """
    plan = db.query(CollaborativePlan).filter(CollaborativePlan.id == plan_id).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family plan not found"
        )

    member = db.query(PlanMember).filter(
        PlanMember.plan_id == plan_id,
        PlanMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this family"
        )

    # Update fields
    if updates.plan_data is not None:
        plan.plan_data = updates.plan_data
    if updates.family_data is not None:
        plan.family_data = updates.family_data
    if updates.preferences_data is not None:
        plan.preferences_data = updates.preferences_data
    if updates.prep_tasks is not None:
        plan.prep_tasks = updates.prep_tasks
    if updates.grocery_items is not None:
        plan.grocery_items = updates.grocery_items
    if updates.invalidation_state is not None:
        plan.invalidation_state = updates.invalidation_state
    if updates.has_plan is not None:
        plan.has_plan = updates.has_plan
    if updates.current_stage is not None:
        plan.current_stage = updates.current_stage
    if updates.title is not None:
        plan.title = updates.title

    plan.last_modified_by = user_id

    db.commit()
    db.refresh(plan)

    # Broadcast the change to other family members IMMEDIATELY (not in background)
    # This ensures the broadcast happens before we return the response
    broadcast_payload = _plan_broadcast_payload(plan)

    try:
        # Await the broadcast to ensure it completes
        await broadcast_service.broadcast_plan_update(
            plan_id=str(plan.id),
            event="plan_updated",
            payload=broadcast_payload,
            modified_by=user_id,
        )
        logger.info(f"[FamilyPlan] Broadcast sent for plan {plan.id}")
    except Exception as e:
        logger.error(f"[FamilyPlan] Broadcast failed for plan {plan.id}: {e}")
        # Don't fail the request if broadcast fails - clients will get it via poll

    members = db.query(PlanMember).filter(PlanMember.plan_id == plan.id).all()
    return _plan_response(plan, members)


@router.delete("/{plan_id}")
async def delete_family_plan(
    plan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a family plan. Only owners can delete."""
    # Check if user is owner
    member = db.query(PlanMember).filter(
        PlanMember.plan_id == plan_id,
        PlanMember.user_id == user_id,
        PlanMember.role == "owner"
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only family owners can delete plans"
        )

    plan = db.query(CollaborativePlan).filter(CollaborativePlan.id == plan_id).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family plan not found"
        )

    db.delete(plan)
    db.commit()

    return {"message": "Family plan deleted successfully"}


@router.post("/{plan_id}/leave")
async def leave_family(
    plan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Leave a family plan"""
    member = db.query(PlanMember).filter(
        PlanMember.plan_id == plan_id,
        PlanMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of this family"
        )

    # Check if this is the last owner
    if member.role == "owner":
        owner_count = db.query(PlanMember).filter(
            PlanMember.plan_id == plan_id,
            PlanMember.role == "owner"
        ).count()

        if owner_count == 1:
            # Transfer ownership to another member or delete plan
            other_member = db.query(PlanMember).filter(
                PlanMember.plan_id == plan_id,
                PlanMember.user_id != user_id
            ).first()

            if other_member:
                other_member.role = "owner"
            else:
                # Last member, delete the plan
                plan = db.query(CollaborativePlan).filter(CollaborativePlan.id == plan_id).first()
                if plan:
                    db.delete(plan)
                db.commit()
                return {"message": "Family plan deleted as you were the last member"}

    db.delete(member)
    db.commit()

    return {"message": "Successfully left the family"}
