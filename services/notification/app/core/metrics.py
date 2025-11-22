"""
Prometheus Metrics
==================
Application and business metrics for monitoring.
"""

from prometheus_client import Counter, Gauge, Histogram, Info

# ============================================================================
# BUSINESS METRICS
# ============================================================================

# Email sending metrics
emails_sent_total = Counter(
    "notification_emails_sent_total",
    "Total number of emails sent",
    ["template", "status"],  # status: sent, failed, retry
)

emails_queued_total = Counter(
    "notification_emails_queued_total",
    "Total number of emails queued",
    ["template", "source"],  # source: api, rabbitmq
)

# Queue metrics
queue_size = Gauge(
    "notification_queue_size",
    "Number of emails in notification queue",
    ["status"],  # status: pending, retry, failed
)

queue_processing_duration = Histogram(
    "notification_queue_processing_seconds",
    "Time spent processing email queue batch",
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0],
)

# Email delivery metrics
email_delivery_duration = Histogram(
    "notification_email_delivery_seconds",
    "Time spent delivering a single email",
    ["template"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0],
)

email_retry_total = Counter(
    "notification_email_retry_total",
    "Total number of email retry attempts",
    ["template", "attempt"],  # attempt: 1, 2, 3
)

# ============================================================================
# SYSTEM METRICS
# ============================================================================

# RabbitMQ metrics
rabbitmq_messages_consumed = Counter(
    "notification_rabbitmq_messages_consumed_total",
    "Total number of RabbitMQ messages consumed",
    ["event_type", "status"],  # status: success, failed
)

rabbitmq_message_processing_duration = Histogram(
    "notification_rabbitmq_message_processing_seconds",
    "Time spent processing RabbitMQ message",
    ["event_type"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
)

rabbitmq_connection_errors = Counter(
    "notification_rabbitmq_connection_errors_total",
    "Total number of RabbitMQ connection errors",
)

# Template rendering metrics
template_rendering_duration = Histogram(
    "notification_template_rendering_seconds",
    "Time spent rendering email template",
    ["template"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
)

template_rendering_errors = Counter(
    "notification_template_rendering_errors_total",
    "Total number of template rendering errors",
    ["template", "error_type"],
)

# SMTP metrics
smtp_send_duration = Histogram(
    "notification_smtp_send_seconds",
    "Time spent sending email via SMTP",
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)

smtp_errors_total = Counter(
    "notification_smtp_errors_total",
    "Total number of SMTP errors",
    ["error_type"],  # connection, timeout, auth, etc.
)

smtp_connection_pool = Gauge(
    "notification_smtp_connection_pool_size",
    "Number of active SMTP connections",
)

# Database metrics
database_query_duration = Histogram(
    "notification_database_query_seconds",
    "Time spent executing database queries",
    ["operation"],  # insert, update, select, delete
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5],
)

database_connection_errors = Counter(
    "notification_database_connection_errors_total",
    "Total number of database connection errors",
)

# Worker metrics
worker_batch_size = Histogram(
    "notification_worker_batch_size",
    "Number of emails processed in worker batch",
    buckets=[1, 5, 10, 25, 50, 100, 250, 500],
)

worker_idle_duration = Histogram(
    "notification_worker_idle_seconds",
    "Time worker spent idle (no emails to process)",
    buckets=[1, 5, 10, 30, 60, 300, 600],
)

worker_errors_total = Counter(
    "notification_worker_errors_total",
    "Total number of worker processing errors",
    ["error_type"],
)

# ============================================================================
# APPLICATION INFO
# ============================================================================

app_info = Info(
    "notification_service",
    "Notification Service information",
)


def set_app_info(version: str, environment: str, build: str) -> None:
    """
    Set application information for metrics.

    Args:
        version: Application version (e.g., "2.0.0")
        environment: Environment name (e.g., "production", "staging")
        build: Build number or git commit hash
    """
    app_info.info(
        {
            "version": version,
            "environment": environment,
            "build": build,
        }
    )


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def track_email_sent(template: str, status: str) -> None:
    """
    Track email sent metric.

    Args:
        template: Template name
        status: Email status (sent, failed, retry)
    """
    emails_sent_total.labels(template=template, status=status).inc()


def track_email_queued(template: str, source: str) -> None:
    """
    Track email queued metric.

    Args:
        template: Template name
        source: Source of the email (api, rabbitmq)
    """
    emails_queued_total.labels(template=template, source=source).inc()


def track_rabbitmq_message(event_type: str, status: str, duration: float) -> None:
    """
    Track RabbitMQ message processing.

    Args:
        event_type: Event type (e.g., "user.registered")
        status: Processing status (success, failed)
        duration: Processing duration in seconds
    """
    rabbitmq_messages_consumed.labels(event_type=event_type, status=status).inc()
    rabbitmq_message_processing_duration.labels(event_type=event_type).observe(duration)


def track_template_rendering(template: str, duration: float, error: str = None) -> None:
    """
    Track template rendering.

    Args:
        template: Template name
        duration: Rendering duration in seconds
        error: Error type if rendering failed (optional)
    """
    template_rendering_duration.labels(template=template).observe(duration)

    if error:
        template_rendering_errors.labels(template=template, error_type=error).inc()


def track_smtp_send(duration: float, error: str = None) -> None:
    """
    Track SMTP send operation.

    Args:
        duration: Send duration in seconds
        error: Error type if send failed (optional)
    """
    smtp_send_duration.observe(duration)

    if error:
        smtp_errors_total.labels(error_type=error).inc()


def update_queue_sizes(pending: int, retry: int, failed: int) -> None:
    """
    Update queue size gauges.

    Args:
        pending: Number of pending emails
        retry: Number of emails in retry state
        failed: Number of failed emails
    """
    queue_size.labels(status="pending").set(pending)
    queue_size.labels(status="retry").set(retry)
    queue_size.labels(status="failed").set(failed)
