"""
User data routes - handles meal plans, preferences, etc.
Uses Supabase authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from database import get_db
from models import Profile, UserData, VALID_DATA_TYPES
from schemas import UserDataCreate, UserDataUpdate, UserDataResponse
from supabase_auth import get_current_user_id

router = APIRouter(prefix="/user-data", tags=["user-data"])


@router.get("/", response_model=List[UserDataResponse])
async def get_user_data(
    data_type: str = None,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get user data, optionally filtered by data_type"""
    query = db.query(UserData).filter(UserData.user_id == user_id)

    if data_type:
        if data_type not in VALID_DATA_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid data_type. Must be one of: {', '.join(VALID_DATA_TYPES)}"
            )
        query = query.filter(UserData.data_type == data_type)

    user_data = query.all()
    return [UserDataResponse.from_orm(data) for data in user_data]


@router.get("/{data_type}", response_model=UserDataResponse)
async def get_user_data_by_type(
    data_type: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get specific user data by type"""
    if data_type not in VALID_DATA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data_type. Must be one of: {', '.join(VALID_DATA_TYPES)}"
        )

    user_data = db.query(UserData).filter(
        UserData.user_id == user_id,
        UserData.data_type == data_type
    ).first()

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No data found for type: {data_type}"
        )

    return UserDataResponse.from_orm(user_data)


@router.post("/", response_model=UserDataResponse)
async def create_user_data(
    data: UserDataCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create new user data"""
    if data.data_type not in VALID_DATA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data_type. Must be one of: {', '.join(VALID_DATA_TYPES)}"
        )

    # Check if data already exists for this type
    existing_data = db.query(UserData).filter(
        UserData.user_id == user_id,
        UserData.data_type == data.data_type
    ).first()

    if existing_data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Data already exists for type: {data.data_type}. Use PUT to update."
        )

    user_data = UserData(
        user_id=user_id,
        data_type=data.data_type,
        data=data.data
    )

    db.add(user_data)
    db.commit()
    db.refresh(user_data)

    return UserDataResponse.from_orm(user_data)


@router.put("/{data_type}", response_model=UserDataResponse)
async def update_user_data(
    data_type: str,
    data: UserDataUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update user data by type (upsert)"""
    if data_type not in VALID_DATA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data_type. Must be one of: {', '.join(VALID_DATA_TYPES)}"
        )

    # Try to find existing data
    user_data = db.query(UserData).filter(
        UserData.user_id == user_id,
        UserData.data_type == data_type
    ).first()

    if user_data:
        # Update existing data
        user_data.data = data.data
    else:
        # Create new data
        user_data = UserData(
            user_id=user_id,
            data_type=data_type,
            data=data.data
        )
        db.add(user_data)

    db.commit()
    db.refresh(user_data)

    return UserDataResponse.from_orm(user_data)


@router.delete("/{data_type}")
async def delete_user_data(
    data_type: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete user data by type"""
    if data_type not in VALID_DATA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data_type. Must be one of: {', '.join(VALID_DATA_TYPES)}"
        )

    user_data = db.query(UserData).filter(
        UserData.user_id == user_id,
        UserData.data_type == data_type
    ).first()

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No data found for type: {data_type}"
        )

    db.delete(user_data)
    db.commit()

    return {"message": f"Data deleted for type: {data_type}"}


@router.get("/export/all")
async def export_all_user_data(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Export all user data for backup/migration"""
    user_data = db.query(UserData).filter(UserData.user_id == user_id).all()

    export_data = {
        "user_id": user_id,
        "exported_at": datetime.utcnow().isoformat(),
        "data": {}
    }

    for data in user_data:
        export_data["data"][data.data_type] = data.data

    return export_data


@router.post("/import/all")
async def import_all_user_data(
    import_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Import user data from backup/migration"""
    if "data" not in import_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid import data format"
        )

    imported_count = 0

    for data_type, data_content in import_data["data"].items():
        if data_type not in VALID_DATA_TYPES:
            continue  # Skip invalid data types

        # Upsert data
        user_data = db.query(UserData).filter(
            UserData.user_id == user_id,
            UserData.data_type == data_type
        ).first()

        if user_data:
            user_data.data = data_content
        else:
            user_data = UserData(
                user_id=user_id,
                data_type=data_type,
                data=data_content
            )
            db.add(user_data)

        imported_count += 1

    db.commit()

    return {"message": f"Imported {imported_count} data items"}
