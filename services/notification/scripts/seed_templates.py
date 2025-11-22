"""
Seed Notification Templates
===========================
Populate the notification_templates table with all 16 email templates.

Usage:
    python scripts/seed_templates.py
"""

import asyncio
import sys
import uuid
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger, setup_logging
from app.models.notification import NotificationTemplate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Setup logging
setup_logging()
logger = get_logger(__name__)

# Template definitions
TEMPLATES = [
    {
        "name": "welcome_email",
        "type": "email",
        "description": "Welcome email sent after successful registration with email verification link",
        "subject": "Benvenuto su RefertoSicuro - Verifica il tuo account",
        "variables": ["user_name", "verification_link", "trial_days"],
        "locale": "it",
    },
    {
        "name": "email_verification",
        "type": "email",
        "description": "Standalone email verification (resend verification)",
        "subject": "Verifica il tuo indirizzo email - RefertoSicuro",
        "variables": ["user_name", "verification_link"],
        "locale": "it",
    },
    {
        "name": "password_reset",
        "type": "email",
        "description": "Password reset link for forgotten password",
        "subject": "Reimpostazione password - RefertoSicuro",
        "variables": ["user_name", "reset_link", "expiration_hours"],
        "locale": "it",
    },
    {
        "name": "password_changed_alert",
        "type": "email",
        "description": "Security alert when password is changed",
        "subject": "⚠️ Password modificata - RefertoSicuro",
        "variables": ["user_name", "changed_at", "ip_address", "support_link"],
        "locale": "it",
    },
    {
        "name": "2fa_enabled",
        "type": "email",
        "description": "Confirmation when 2FA is enabled on account",
        "subject": "Autenticazione a due fattori attivata - RefertoSicuro",
        "variables": ["user_name", "enabled_at", "backup_codes_count"],
        "locale": "it",
    },
    {
        "name": "trial_started",
        "type": "email",
        "description": "Welcome email when trial period starts",
        "subject": "Inizia il tuo trial di 7 giorni - RefertoSicuro",
        "variables": ["user_name", "trial_days", "trial_reports_limit", "upgrade_link"],
        "locale": "it",
    },
    {
        "name": "trial_ending_3days",
        "type": "email",
        "description": "Reminder 3 days before trial expires",
        "subject": "Il tuo trial scade tra 3 giorni - RefertoSicuro",
        "variables": ["user_name", "days_remaining", "reports_used", "upgrade_link"],
        "locale": "it",
    },
    {
        "name": "trial_ending_1day",
        "type": "email",
        "description": "Final reminder 1 day before trial expires",
        "subject": "⏰ Ultimo giorno di trial - RefertoSicuro",
        "variables": ["user_name", "reports_used", "upgrade_link"],
        "locale": "it",
    },
    {
        "name": "trial_expired",
        "type": "email",
        "description": "Notification when trial period has ended",
        "subject": "Il tuo trial è terminato - Continua con RefertoSicuro",
        "variables": ["user_name", "reports_created", "upgrade_link"],
        "locale": "it",
    },
    {
        "name": "payment_successful",
        "type": "email",
        "description": "Payment confirmation and receipt",
        "subject": "Pagamento ricevuto - RefertoSicuro",
        "variables": [
            "user_name",
            "amount",
            "currency",
            "plan_name",
            "invoice_link",
            "next_billing_date",
        ],
        "locale": "it",
    },
    {
        "name": "payment_failed",
        "type": "email",
        "description": "Payment failure notification with retry instructions",
        "subject": "⚠️ Problema con il pagamento - RefertoSicuro",
        "variables": ["user_name", "amount", "error_message", "update_payment_link", "retry_date"],
        "locale": "it",
    },
    {
        "name": "subscription_cancelled",
        "type": "email",
        "description": "Confirmation when subscription is cancelled",
        "subject": "Abbonamento cancellato - RefertoSicuro",
        "variables": [
            "user_name",
            "plan_name",
            "cancellation_date",
            "access_until",
            "reactivate_link",
        ],
        "locale": "it",
    },
    {
        "name": "quota_warning_80",
        "type": "email",
        "description": "Warning when 80% of monthly quota is used",
        "subject": "⚠️ Hai usato l'80% dei tuoi referti - RefertoSicuro",
        "variables": [
            "user_name",
            "reports_used",
            "reports_limit",
            "reports_remaining",
            "upgrade_link",
        ],
        "locale": "it",
    },
    {
        "name": "quota_warning_90",
        "type": "email",
        "description": "Warning when 90% of monthly quota is used",
        "subject": "⚠️ Hai usato il 90% dei tuoi referti - RefertoSicuro",
        "variables": [
            "user_name",
            "reports_used",
            "reports_limit",
            "reports_remaining",
            "upgrade_link",
        ],
        "locale": "it",
    },
    {
        "name": "quota_exceeded",
        "type": "email",
        "description": "Notification when monthly quota is exceeded",
        "subject": "❌ Limite referti raggiunto - RefertoSicuro",
        "variables": ["user_name", "reports_limit", "upgrade_link", "reset_date"],
        "locale": "it",
    },
    {
        "name": "gdpr_export_ready",
        "type": "email",
        "description": "GDPR data export download link",
        "subject": "I tuoi dati sono pronti per il download - RefertoSicuro",
        "variables": ["user_name", "download_link", "expiration_hours"],
        "locale": "it",
    },
]


async def seed_templates(session: AsyncSession) -> None:
    """
    Seed notification templates into the database.

    Args:
        session: Database session
    """
    logger.info("Starting template seeding...")

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for template_data in TEMPLATES:
        # Check if template already exists
        stmt = select(NotificationTemplate).where(
            NotificationTemplate.name == template_data["name"]
        )
        result = await session.execute(stmt)
        existing_template = result.scalar_one_or_none()

        if existing_template:
            # Update existing template
            logger.info(f"Template '{template_data['name']}' already exists, updating...")
            existing_template.description = template_data["description"]
            existing_template.subject = template_data["subject"]
            existing_template.variables = template_data["variables"]
            existing_template.locale = template_data["locale"]
            existing_template.is_active = True
            updated_count += 1
        else:
            # Create new template with placeholder body
            # (actual HTML/text templates will be created in Phase 4)
            logger.info(f"Creating template '{template_data['name']}'...")

            template = NotificationTemplate(
                id=uuid.uuid4(),
                name=template_data["name"],
                type=template_data["type"],
                description=template_data["description"],
                subject=template_data["subject"],
                body_html=f"<p>Template HTML for {template_data['name']} - To be created in Phase 4</p>",
                body_text=f"Template text for {template_data['name']} - To be created in Phase 4",
                variables=template_data["variables"],
                locale=template_data["locale"],
                version=1,
                is_active=True,
            )
            session.add(template)
            created_count += 1

    # Commit all changes
    await session.commit()

    logger.info(
        f"Template seeding complete! Created: {created_count}, Updated: {updated_count}, "
        f"Skipped: {skipped_count}"
    )
    logger.info(f"Total templates in database: {created_count + updated_count}")


async def verify_templates(session: AsyncSession) -> None:
    """
    Verify all templates are in the database.

    Args:
        session: Database session
    """
    logger.info("Verifying templates...")

    stmt = select(NotificationTemplate).where(NotificationTemplate.is_active == True)
    result = await session.execute(stmt)
    templates = result.scalars().all()

    logger.info(f"Found {len(templates)} active templates:")
    for template in templates:
        logger.info(f"  - {template.name} ({template.type}): {len(template.variables)} variables")

    # Check if all expected templates exist
    template_names = {t.name for t in templates}
    expected_names = {t["name"] for t in TEMPLATES}
    missing = expected_names - template_names

    if missing:
        logger.warning(f"Missing templates: {missing}")
    else:
        logger.info("✅ All templates present!")


async def main():
    """Main entry point."""
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Database: {settings.POSTGRES_DB}")

    async with AsyncSessionLocal() as session:
        try:
            await seed_templates(session)
            await verify_templates(session)
            logger.info("✅ Template seeding completed successfully!")
        except Exception as e:
            logger.error(f"❌ Template seeding failed: {e}", exc_info=True)
            await session.rollback()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
