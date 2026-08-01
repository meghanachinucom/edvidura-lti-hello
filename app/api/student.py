"""Student onboarding router."""
from __future__ import annotations

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
import psycopg

from app import db
from app.schemas.student import StudentCreate, StudentResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/students", tags=["Students"])


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_student(payload: StudentCreate) -> dict:
    logger.info(
        "Creating student code=%s for institution_id=%s",
        payload.student_code,
        payload.institution_id,
    )

    # 1. Validate institution existence
    institution = db.get_institution(payload.institution_id)
    if not institution:
        logger.warning("Institution %s not found for student creation", payload.institution_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id '{payload.institution_id}' does not exist.",
        )

    # 2. Validate composite uniqueness (institution_id, student_code)
    existing = db.get_student_by_institution_and_code(payload.institution_id, payload.student_code)
    if existing:
        logger.warning(
            "Duplicate student_code %s for institution %s",
            payload.student_code,
            payload.institution_id,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student with code '{payload.student_code}' already exists for this institution.",
        )

    # 3. Create student
    try:
        student = db.create_student(
            institution_id=payload.institution_id,
            student_code=payload.student_code,
            name=payload.name,
            email=payload.email,
        )
        logger.info("Successfully created student id=%s", student["id"])
        return student
    except psycopg.errors.UniqueViolation:
        logger.warning(
            "Unique violation for student_code %s at institution %s",
            payload.student_code,
            payload.institution_id,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student with code '{payload.student_code}' already exists for this institution.",
        )
    except psycopg.errors.ForeignKeyViolation:
        logger.warning("Foreign key violation for institution_id: %s", payload.institution_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id '{payload.institution_id}' does not exist.",
        )
    except Exception as exc:
        logger.error("Failed to create student: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get("", response_model=List[StudentResponse])
@router.get("/", response_model=List[StudentResponse], include_in_schema=False)
def list_students(institution_id: Optional[UUID] = Query(default=None)) -> list[dict]:
    logger.info("Listing students (institution_id=%s)", institution_id)
    return db.list_students(institution_id=institution_id)
