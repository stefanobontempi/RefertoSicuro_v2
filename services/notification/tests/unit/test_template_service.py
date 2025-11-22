"""
Template Service Unit Tests
===========================
Test template rendering functionality
"""

import pytest
from app.services.template_service import TemplateError, TemplateService


class TestTemplateService:
    """Test TemplateService class."""

    def test_template_service_initialization(self):
        """Test template service can be initialized."""
        service = TemplateService()
        assert service is not None
        assert service.env is not None

    def test_render_welcome_email_html(self, sample_template_variables):
        """Test rendering welcome email HTML template."""
        service = TemplateService()

        html = service.render_template("welcome_email", sample_template_variables, format="html")

        assert html is not None
        assert "Mario Rossi" in html
        assert "verification_link" in html or "verify" in html.lower()
        assert "<!DOCTYPE html>" in html

    def test_render_welcome_email_text(self, sample_template_variables):
        """Test rendering welcome email text template."""
        service = TemplateService()

        text = service.render_template("welcome_email", sample_template_variables, format="txt")

        assert text is not None
        assert "Mario Rossi" in text
        assert "REFERTOSICURO" in text.upper()

    def test_render_email_both_formats(self, sample_template_variables):
        """Test rendering both HTML and text formats."""
        service = TemplateService()

        html, text = service.render_email("welcome_email", sample_template_variables)

        assert html is not None
        assert text is not None
        assert "Mario Rossi" in html
        assert "Mario Rossi" in text
        assert "<!DOCTYPE html>" in html
        assert "<!DOCTYPE html>" not in text

    def test_render_password_reset_template(self):
        """Test rendering password reset template."""
        service = TemplateService()

        variables = {
            "user_name": "Test User",
            "reset_link": "https://refertosicuro.it/reset/token123",
            "expiration_hours": 6,
        }

        html, text = service.render_email("password_reset", variables)

        assert "Test User" in html
        assert "reset/token123" in html
        assert "6" in html or "sei" in html.lower()

    def test_render_nonexistent_template_raises_error(self):
        """Test that rendering nonexistent template raises TemplateError."""
        service = TemplateService()

        with pytest.raises(TemplateError, match="Template not found"):
            service.render_template("nonexistent_template", {}, format="html")

    def test_template_variables_are_substituted(self):
        """Test that template variables are correctly substituted."""
        service = TemplateService()

        variables = {
            "user_name": "Giovanni Verdi",
            "verification_link": "https://test.com/verify/xyz",
            "trial_days": 14,
        }

        html, text = service.render_email("welcome_email", variables)

        # Check all variables are substituted
        assert "Giovanni Verdi" in html
        assert "Giovanni Verdi" in text
        assert "verify/xyz" in html
        assert "14" in html or "14" in text

    def test_currency_filter(self):
        """Test custom currency filter."""
        service = TemplateService()

        # Test EUR formatting
        result = service._currency_filter(49.99, "EUR")
        assert "€" in result
        assert "49" in result

        # Test USD formatting
        result = service._currency_filter(99.99, "USD")
        assert "$" in result
        assert "99" in result

    def test_list_templates(self):
        """Test listing available templates."""
        service = TemplateService()

        templates = service.list_templates()

        assert isinstance(templates, list)
        assert len(templates) > 0
        assert "welcome_email" in templates
        assert "password_reset" in templates

    def test_common_variables_are_added(self):
        """Test that common variables are automatically added."""
        service = TemplateService()

        variables = {"user_name": "Test"}
        html, text = service.render_email("welcome_email", variables)

        # Common variables should be present
        assert "refertosicuro" in html.lower()

    def test_all_auth_templates_render_successfully(self):
        """Test that all 5 Auth templates render without errors."""
        service = TemplateService()

        templates_and_vars = [
            (
                "welcome_email",
                {"user_name": "Test", "verification_link": "http://test", "trial_days": 7},
            ),
            (
                "password_reset",
                {"user_name": "Test", "reset_link": "http://test", "expiration_hours": 6},
            ),
            ("email_verification", {"user_name": "Test", "verification_link": "http://test"}),
            (
                "password_changed_alert",
                {
                    "user_name": "Test",
                    "changed_at": "2025-11-22",
                    "ip_address": "127.0.0.1",
                    "support_link": "http://test",
                },
            ),
            (
                "2fa_enabled",
                {"user_name": "Test", "enabled_at": "2025-11-22", "backup_codes_count": 10},
            ),
        ]

        for template_name, variables in templates_and_vars:
            html, text = service.render_email(template_name, variables)
            assert html is not None, f"HTML rendering failed for {template_name}"
            assert text is not None, f"Text rendering failed for {template_name}"
            assert len(html) > 100, f"HTML too short for {template_name}"
            assert len(text) > 50, f"Text too short for {template_name}"
