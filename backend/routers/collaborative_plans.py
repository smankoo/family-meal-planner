"""
Collaborative meal plan routes - enables real-time plan sharing and collaboration.
Multiple users can share and edit the same meal plan.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import secrets

from database import get_db
from models import CollaborativePlan, PlanMember, Profile
from schemas import (
    CollaborativePlanCreate,
    CollaborativePlanUpdate,
    CollaborativePlanResponse,
    PlanMemberResponse,
    JoinPlanRequest,
    UserResponse
)
from supabase_auth import get_current_user_id

router = APIRouter(prefix="/collaborative-plans", tags=["collaborative-plans"])


def generate_share_id() -> str:
    """Generate a short, readable share ID"""
    return secrets.token_hex(6).lower()


@router.post("/", response_model=CollaborativePlanResponse)
async def create_collaborative_plan(
    plan_data: CollaborativePlanCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Create a new collaborative plan and make the creator the owner.
    This is called when a user wants to share their current plan.
    """
    # Generate unique share_id
    share_id = generate_share_id()
    while db.query(CollaborativePlan).filter(CollaborativePlan.share_id == share_id).first():
        share_id = generate_share_id()

    # Create the collaborative plan
    collab_plan = CollaborativePlan(
        share_id=share_id,
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

    db.add(collab_plan)
    db.flush()  # Get the ID without committing

    # Add creator as owner
    member = PlanMember(
        plan_id=collab_plan.id,
        user_id=user_id,
        role="owner"
    )

    db.add(member)
    db.commit()
    db.refresh(collab_plan)

    # Load members
    members = db.query(PlanMember).filter(PlanMember.plan_id == collab_plan.id).all()

    # Manually construct response to handle UUID conversion
    return CollaborativePlanResponse(
        id=str(collab_plan.id),
        share_id=collab_plan.share_id,
        plan_data=collab_plan.plan_data,
        family_data=collab_plan.family_data,
        preferences_data=collab_plan.preferences_data,
        prep_tasks=collab_plan.prep_tasks,
        grocery_items=collab_plan.grocery_items,
        invalidation_state=collab_plan.invalidation_state,
        has_plan=str(collab_plan.has_plan) if collab_plan.has_plan is not None else "true",
        current_stage=str(collab_plan.current_stage) if collab_plan.current_stage is not None else "0",
        title=collab_plan.title,
        created_by=str(collab_plan.created_by),
        created_at=collab_plan.created_at,
        updated_at=collab_plan.updated_at,
        last_modified_by=str(collab_plan.last_modified_by) if collab_plan.last_modified_by else None,
        members=[
            PlanMemberResponse(
                id=str(m.id),
                user_id=str(m.user_id),
                role=m.role,
                joined_at=m.joined_at,
                last_viewed_at=m.last_viewed_at
            ) for m in members
        ]
    )


@router.get("/my-plans", response_model=List[CollaborativePlanResponse])
async def get_my_collaborative_plans(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all collaborative plans the user is a member of"""
    # Find all plans where user is a member
    memberships = db.query(PlanMember).filter(PlanMember.user_id == user_id).all()
    plan_ids = [m.plan_id for m in memberships]

    if not plan_ids:
        return []

    plans = db.query(CollaborativePlan).filter(CollaborativePlan.id.in_(plan_ids)).all()

    result = []
    for plan in plans:
        members = db.query(PlanMember).filter(PlanMember.plan_id == plan.id).all()
        response_data = CollaborativePlanResponse(
            id=str(plan.id),
            share_id=plan.share_id,
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
                    last_viewed_at=m.last_viewed_at
                ) for m in members
            ]
        )
        result.append(response_data)

    return result


@router.get("/by-share-id/{share_id}", response_model=CollaborativePlanResponse)
async def get_plan_by_share_id(
    share_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Get a collaborative plan by its share ID.
    User must be authenticated but doesn't need to be a member yet.
    """
    plan = db.query(CollaborativePlan).filter(CollaborativePlan.share_id == share_id).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )

    # Load members
    members = db.query(PlanMember).filter(PlanMember.plan_id == plan.id).all()

    return CollaborativePlanResponse(
        id=str(plan.id),
        share_id=plan.share_id,
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
                last_viewed_at=m.last_viewed_at
            ) for m in members
        ]
    )
async def join_collaborative_plan(
    request: JoinPlanRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Join a collaborative plan by share ID.
    This makes the plan the user's active plan.
    """
    # Find the plan
    plan = db.query(CollaborativePlan).filter(CollaborativePlan.share_id == request.share_id).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
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
        return {"message": "Already a member of this plan", "plan_id": str(plan.id)}

    # Add as member
    member = PlanMember(
        plan_id=plan.id,
        user_id=user_id,
        role="member"
    )

    db.add(member)
    db.commit()

    return {"message": "Successfully joined plan", "plan_id": str(plan.id)}


@router.put("/{plan_id}", response_model=CollaborativePlanResponse)
async def update_collaborative_plan(
    plan_id: str,
    updates: CollaborativePlanUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Update a collaborative plan. Any member can update.
    Changes are reflected for all members in real-time.
    """
    # Find the plan
    plan = db.query(CollaborativePlan).filter(CollaborativePlan.id == plan_id).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )

    # Check if user is a member
    member = db.query(PlanMember).filter(
        PlanMember.plan_id == plan_id,
        PlanMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this plan"
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

    # Load members
    members = db.query(PlanMember).filter(PlanMember.plan_id == plan.id).all()

    return CollaborativePlanResponse(
        id=str(plan.id),
        share_id=plan.share_id,
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
                last_viewed_at=m.last_viewed_at
            ) for m in members
        ]
    )


@router.delete("/{plan_id}")
async def delete_collaborative_plan(
    plan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a collaborative plan. Only owners can delete."""
    # Check if user is owner
    member = db.query(PlanMember).filter(
        PlanMember.plan_id == plan_id,
        PlanMember.user_id == user_id,
        PlanMember.role == "owner"
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only plan owners can delete plans"
        )

    plan = db.query(CollaborativePlan).filter(CollaborativePlan.id == plan_id).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )

    db.delete(plan)
    db.commit()

    return {"message": "Plan deleted successfully"}


@router.post("/{plan_id}/leave")
async def leave_collaborative_plan(
    plan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Leave a collaborative plan"""
    member = db.query(PlanMember).filter(
        PlanMember.plan_id == plan_id,
        PlanMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of this plan"
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
                return {"message": "Plan deleted as you were the last member"}

    db.delete(member)
    db.commit()

    return {"message": "Successfully left the plan"}
