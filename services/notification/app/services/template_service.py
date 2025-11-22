"""
Template Service
================
Jinja2 template rendering for email notifications
"""

from pathlib import Path
from typing import Dict, Optional, Tuple

from app.core.config import settings
from app.core.logging import get_logger
from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape

logger = get_logger(__name__)


class TemplateError(Exception):
    """Raised when template rendering fails."""

    pass


class TemplateService:
    """
    Render email templates using Jinja2.

    Supports both HTML and plain text templates with variable substitution.
    Templates are cached for performance.
    """

    def __init__(self):
        """Initialize Jinja2 environment."""
        # Get template directory
        template_dir = Path(settings.TEMPLATE_DIR)
        if not template_dir.is_absolute():
            # Make relative to project root
            template_dir = Path(__file__).parent.parent / template_dir

        if not template_dir.exists():
            logger.warning(f"Template directory does not exist: {template_dir}")
            template_dir.mkdir(parents=True, exist_ok=True)

        # Create Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True,
        )

        # Add custom filters
        self.env.filters["currency"] = self._currency_filter
        self.env.filters["date_format"] = self._date_format_filter

        logger.info(f"Template service initialized with directory: {template_dir}")

    @staticmethod
    def _currency_filter(value: float, currency: str = "EUR") -> str:
        """
        Format currency values.

        Args:
            value: Amount to format
            currency: Currency code (default: EUR)

        Returns:
            Formatted currency string

        Example:
            {{ amount|currency("EUR") }} -> "€49,99"
        """
        if currency == "EUR":
            return f"€{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        elif currency == "USD":
            return f"${value:,.2f}"
        else:
            return f"{value:,.2f} {currency}"

    @staticmethod
    def _date_format_filter(value: str, format: str = "%d/%m/%Y") -> str:
        """
        Format date strings.

        Args:
            value: Date string to format
            format: Output format (default: Italian DD/MM/YYYY)

        Returns:
            Formatted date string

        Example:
            {{ date|date_format("%d %B %Y") }} -> "22 novembre 2025"
        """
        from datetime import datetime

        try:
            if isinstance(value, str):
                # Try to parse ISO format
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            else:
                dt = value
            return dt.strftime(format)
        except Exception as e:
            logger.warning(f"Date formatting failed for {value}: {e}")
            return str(value)

    def render_template(
        self, template_name: str, variables: Dict[str, any], format: str = "html"
    ) -> str:
        """
        Render a single template (HTML or text).

        Args:
            template_name: Template name without extension (e.g., "welcome_email")
            variables: Dictionary of variables to substitute
            format: "html" or "txt"

        Returns:
            Rendered template string

        Raises:
            TemplateError: If template not found or rendering fails
        """
        template_file = f"{template_name}.{format}"

        try:
            template = self.env.get_template(template_file)
            rendered = template.render(**variables)
            logger.debug(f"Rendered template: {template_file}")
            return rendered

        except TemplateNotFound:
            error_msg = f"Template not found: {template_file}"
            logger.error(error_msg)
            raise TemplateError(error_msg)

        except Exception as e:
            error_msg = f"Template rendering failed for {template_file}: {e}"
            logger.error(error_msg, exc_info=True)
            raise TemplateError(error_msg)

    def render_email(self, template_name: str, variables: Dict[str, any]) -> Tuple[str, str]:
        """
        Render both HTML and text versions of an email template.

        Args:
            template_name: Template name without extension
            variables: Dictionary of variables to substitute

        Returns:
            Tuple of (html, text) rendered templates

        Raises:
            TemplateError: If templates not found or rendering fails

        Example:
            html, text = service.render_email("welcome_email", {
                "user_name": "Mario Rossi",
                "verification_link": "https://..."
            })
        """
        # Add common variables
        common_vars = {
            "frontend_url": settings.FRONTEND_URL,
            "backend_url": settings.BACKEND_URL,
            "support_email": settings.SMTP_FROM,
            "company_name": "RefertoSicuro",
        }
        variables = {**common_vars, **variables}

        # Validate required variables
        self._validate_variables(template_name, variables)

        # Render both versions
        try:
            html = self.render_template(template_name, variables, format="html")
            text = self.render_template(template_name, variables, format="txt")
            return html, text

        except TemplateError:
            raise
        except Exception as e:
            error_msg = f"Email rendering failed for {template_name}: {e}"
            logger.error(error_msg, exc_info=True)
            raise TemplateError(error_msg)

    def _validate_variables(self, template_name: str, variables: Dict[str, any]) -> None:
        """
        Validate that all required variables are present.

        This is a basic check - actual validation should be done against
        the template schema stored in the database.

        Args:
            template_name: Template name
            variables: Variables to validate

        Raises:
            TemplateError: If required variables are missing
        """
        # Basic validation - check for None values
        missing = [k for k, v in variables.items() if v is None]
        if missing:
            logger.warning(f"Template {template_name} has None values for: {missing}")

    def get_template_preview(self, template_name: str, format: str = "html") -> Optional[str]:
        """
        Get template source code for preview/debugging.

        Args:
            template_name: Template name without extension
            format: "html" or "txt"

        Returns:
            Template source code or None if not found
        """
        template_file = f"{template_name}.{format}"
        try:
            template = self.env.get_template(template_file)
            return template.source
        except TemplateNotFound:
            return None

    def list_templates(self) -> list[str]:
        """
        List all available templates.

        Returns:
            List of template names (without extensions)
        """
        try:
            template_files = self.env.list_templates()
            # Extract unique template names (remove .html and .txt extensions)
            template_names = {Path(f).stem for f in template_files if f.endswith((".html", ".txt"))}
            return sorted(template_names)
        except Exception as e:
            logger.error(f"Failed to list templates: {e}")
            return []


# Singleton instance
_template_service: Optional[TemplateService] = None


def get_template_service() -> TemplateService:
    """
    Get singleton template service instance.

    Returns:
        TemplateService instance
    """
    global _template_service
    if _template_service is None:
        _template_service = TemplateService()
    return _template_service
