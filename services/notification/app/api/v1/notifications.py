"""
Notifications API Endpoints
===========================
Send and manage notifications
"""

import uuid
from datetime import datetime, timezone
from typing import List

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.notification import NotificationQueue
from app.schemas.email import EmailResponse, SendEmailRequest, SendEmailResponse
from app.services.template_service import get_template_service
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.post("/send", response_model=SendEmailResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_notification(
    request: SendEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> SendEmailResponse:
    """
    Queue a notification for sending.

    Args:
        request: Email send request
        db: Database session

    Returns:
        SendEmailResponse with notification ID

    Raises:
        HTTPException: If template rendering fails
    """
    try:
        # Render template
        template_service = get_template_service()
        html, text = template_service.render_email(request.template_name, request.variables)

        # Extract subject from variables or template
        subject = request.variables.get("subject", f"RefertoSicuro - {request.template_name}")

        # Queue notification
        notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient=request.recipient,
            template_name=request.template_name,
            subject=subject,
            body_html=html,
            body_text=text,
            variables=request.variables,
            status="pending",
            priority=request.priority,
            correlation_id=request.correlation_id,
            event_type=request.event_type,
            user_id=request.user_id,
            scheduled_at=request.scheduled_at or datetime.now(timezone.utc),
        )

        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        logger.info(f"Notification queued: {notification.id} for {request.recipient}")

        return SendEmailResponse(
            success=True,
            notification_id=notification.id,
            message="Notification queued successfully",
            queued_at=notification.created_at,
            scheduled_at=notification.scheduled_at,
        )

    except Exception as e:
        logger.error(f"Failed to queue notification: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue notification: {str(e)}",
        )


@router.get("/{notification_id}", response_model=EmailResponse)
async def get_notification_status(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> EmailResponse:
    """
    Get notification status by ID.

    Args:
        notification_id: Notification ID
        db: Database session

    Returns:
        EmailResponse with notification details

    Raises:
        HTTPException: If notification not found
    """
    stmt = select(NotificationQueue).where(NotificationQueue.id == notification_id)
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification {notification_id} not found",
        )

    return EmailResponse(
        id=notification.id,
        recipient=notification.recipient,
        subject=notification.subject,
        status=notification.status,
        created_at=notification.created_at,
        sent_at=notification.sent_at,
        error_message=notification.error_message,
    )


@router.get("/", response_model=List[EmailResponse])
async def list_notifications(
    skip: int = 0,
    limit: int = 20,
    status_filter: str = None,
    db: AsyncSession = Depends(get_db),
) -> List[EmailResponse]:
    """
    List notifications with pagination.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        status_filter: Filter by status (pending, sent, failed)
        db: Database session

    Returns:
        List of EmailResponse objects
    """
    stmt = select(NotificationQueue).order_by(NotificationQueue.created_at.desc())

    if status_filter:
        stmt = stmt.where(NotificationQueue.status == status_filter)

    stmt = stmt.offset(skip).limit(limit)

    result = await db.execute(stmt)
    notifications = result.scalars().all()

    return [
        EmailResponse(
            id=n.id,
            recipient=n.recipient,
            subject=n.subject,
            status=n.status,
            created_at=n.created_at,
            sent_at=n.sent_at,
            error_message=n.error_message,
        )
        for n in notifications
    ]
