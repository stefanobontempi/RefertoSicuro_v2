"""
Templates API Endpoints
=======================
Manage email templates (Admin only)
"""

import uuid
from typing import List

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.notification import NotificationTemplate
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


class TemplateResponse(BaseModel):
    """Template response model."""

    id: uuid.UUID
    name: str
    type: str
    description: str | None
    subject: str | None
    variables: list
    locale: str
    is_active: bool

    class Config:
        from_attributes = True


class TemplateCreateRequest(BaseModel):
    """Create template request."""

    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern="^(email|sms|push)$")
    description: str | None = None
    subject: str | None = None
    body_html: str | None = None
    body_text: str = Field(..., min_length=1)
    variables: list = Field(default_factory=list)
    locale: str = Field(default="it")


@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    type_filter: str = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
) -> List[TemplateResponse]:
    """
    List all email templates.

    Args:
        type_filter: Filter by type (email, sms, push)
        active_only: Only return active templates
        db: Database session

    Returns:
        List of templates
    """
    stmt = select(NotificationTemplate).order_by(NotificationTemplate.name)

    if type_filter:
        stmt = stmt.where(NotificationTemplate.type == type_filter)

    if active_only:
        stmt = stmt.where(NotificationTemplate.is_active == True)

    result = await db.execute(stmt)
    templates = result.scalars().all()

    return [TemplateResponse.model_validate(t) for t in templates]


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:
    """
    Get template by ID.

    Args:
        template_id: Template ID
        db: Database session

    Returns:
        Template details

    Raises:
        HTTPException: If template not found
    """
    stmt = select(NotificationTemplate).where(NotificationTemplate.id == template_id)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found",
        )

    return TemplateResponse.model_validate(template)


@router.post("/", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    request: TemplateCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:
    """
    Create a new email template.

    Args:
        request: Template creation request
        db: Database session

    Returns:
        Created template

    Raises:
        HTTPException: If template name already exists
    """
    # Check if template with same name exists
    stmt = select(NotificationTemplate).where(NotificationTemplate.name == request.name)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Template with name '{request.name}' already exists",
        )

    # Create template
    template = NotificationTemplate(
        id=uuid.uuid4(),
        name=request.name,
        type=request.type,
        description=request.description,
        subject=request.subject,
        body_html=request.body_html,
        body_text=request.body_text,
        variables=request.variables,
        locale=request.locale,
        is_active=True,
    )

    db.add(template)
    await db.commit()
    await db.refresh(template)

    logger.info(f"Template created: {template.name}")

    return TemplateResponse.model_validate(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Deactivate a template (soft delete).

    Args:
        template_id: Template ID
        db: Database session

    Raises:
        HTTPException: If template not found
    """
    stmt = select(NotificationTemplate).where(NotificationTemplate.id == template_id)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found",
        )

    template.is_active = False
    await db.commit()

    logger.info(f"Template deactivated: {template.name}")
