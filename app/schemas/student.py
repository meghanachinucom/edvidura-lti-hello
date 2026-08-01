"""Pydantic schemas for student onboarding."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class StudentCreate(BaseModel):
    institution_id: UUID = Field(..., description="UUID of the institution")
    student_code: str = Field(..., description="Unique code for the student within the institution")
    name: str = Field(..., description="Full name of student")
    email: EmailStr = Field(..., description="Email address of student")


class StudentResponse(BaseModel):
    id: UUID
    institution_id: UUID
    student_code: str
    name: str
    email: str
    status: str
    created_at: datetime
