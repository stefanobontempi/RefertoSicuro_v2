# Notification Service - Monitoring Stack ✅

**Status**: COMPLETE
**Date**: 2025-11-22

## Overview

Complete monitoring stack implemented with Prometheus + Grafana for real-time metrics visualization.

## Components

### 1. Metrics Collection (Prometheus)

**Service**: Notification Service
**Endpoint**: <http://localhost:8015/metrics>
**Format**: Prometheus exposition format

**Metrics Exposed**:

- **Business Metrics**:

  - `notification_emails_sent_total` - Total emails sent (counter)
  - `notification_emails_queued_total` - Total emails queued (counter)
  - `notification_queue_size` - Current queue size by status (gauge)
  - `notification_email_delivery_seconds` - Email delivery duration (histogram)
  - `notification_email_retry_total` - Retry attempts (counter)

- **System Metrics**:
  - `notification_rabbitmq_messages_consumed_total` - RabbitMQ messages
  - `notification_smtp_errors_total` - SMTP errors
  - `notification_worker_errors_total` - Worker errors
  - `notification_template_rendering_seconds` - Template rendering time

**Implementation**: `app/core/metrics.py`

- All metrics initialized at startup via `initialize_metrics()`
- Helper functions: `track_email_sent()`, `update_queue_sizes()`, etc.

### 2. Prometheus Server

**URL**: <http://localhost:9090>
**Scrape Interval**: 10 seconds
**Target**: `host.docker.internal:8015`

**Configuration**: `configs/prometheus/prometheus.yml`

```yaml
scrape_configs:
  - job_name: "notification-service"
    static_configs:
      - targets: ["host.docker.internal:8015"]
    metrics_path: "/metrics"
    scrape_interval: 10s
```

**Status**: ✅ UP and scraping successfully

### 3. Grafana Dashboard

**URL**: <http://localhost:3000>
**Credentials**: `admin` / `grafana_password`

**Dashboard**: Notification Service Dashboard
**Direct Link**: <http://localhost:3000/d/e946eb42-dac0-4282-864a-3b7d29ed9537/notification-service-dashboard>

**Panels (10 total)**:

1. Email Sending Rate - `rate(notification_emails_sent_total[5m])`
2. Queue Size - `notification_queue_size`
3. Email Delivery Duration (p95/p99) - `histogram_quantile()`
4. SMTP Errors - `rate(notification_smtp_errors_total[5m])`
5. RabbitMQ Message Processing - `rate(notification_rabbitmq_messages_consumed_total[5m])`
6. Template Rendering Duration - `histogram_quantile()`
7. Worker Batch Size - Average batch size calculation
8. Email Success Rate - Percentage (singlestat)
9. Total Emails Sent (5m) - Volume counter
10. Worker Errors - Error rate with alerting

**Alerts**:

- Email Delivery Latency High (p95 > 500ms)
- Worker Error Rate High (> 0.05 errors/sec)

**Configuration**: `services/notification/grafana/notification-dashboard.json`

## Testing

### Manual Metrics Update

Update metrics from database manually for testing:

```bash
curl -X POST http://localhost:8015/debug/update-metrics
```

Response:

```json
{
  "status": "ok",
  "metrics_updated": {
    "pending": 0,
    "retry": 5,
    "failed": 0
  }
}
```

### Verify Prometheus Collection

```bash
# Check metrics endpoint
curl -s http://localhost:8015/metrics | grep notification_queue_size

# Query Prometheus directly
curl -s 'http://localhost:9090/api/v1/query?query=notification_queue_size' | python -m json.tool
```

### Insert Test Data

```bash
cd /Users/stefano/DEV/RefertoSicuro_v2/services/notification
python /tmp/test_notification_metrics.py
```

Inserts 5 test emails into `notification_queue` table with status="pending".

## Architecture

```
┌─────────────────────┐
│ Notification Service│
│   Port: 8015       │
│                    │
│  /metrics endpoint │
└─────────┬───────────┘
          │ Expose metrics
          │ (pull every 10s)
          ▼
┌─────────────────────┐
│   Prometheus       │
│   Port: 9090       │
│                    │
│  - Scrape metrics  │
│  - Store TSDB      │
│  - Query API       │
└─────────┬───────────┘
          │ Query via PromQL
          │
          ▼
┌─────────────────────┐
│     Grafana        │
│   Port: 3000       │
│                    │
│  - Visualize       │
│  - Alert           │
│  - Dashboard       │
└─────────────────────┘
```

## Key Files

- `app/main.py` - Metrics initialization in lifespan
- `app/core/metrics.py` - Metrics definitions and helpers
- `app/core/config.py` - Configuration
- `grafana/notification-dashboard.json` - Dashboard configuration
- `configs/prometheus/prometheus.yml` - Prometheus config
- `GRAFANA_SETUP.md` - Setup guide

## Troubleshooting

### Dashboard Shows "No Data"

1. **Check time range**: Set to "Last 15 minutes" (top right)
2. **Check Prometheus target**: <http://localhost:9090/targets> (should be UP)
3. **Verify metrics exist**: <http://localhost:8015/metrics>
4. **Manually update**: `curl -X POST http://localhost:8015/debug/update-metrics`

### Metrics Show Zero Values

- Worker needs to be running to process emails and update metrics
- Use debug endpoint to manually sync from database
- Check that `initialize_metrics()` is called in `app/main.py`

### Prometheus Not Scraping

- Check Prometheus config: `configs/prometheus/prometheus.yml`
- Verify target is `host.docker.internal:8015` (not `notification-service:8015`)
- Restart Prometheus: `docker-compose -f docker-compose.dev.yml restart prometheus`

## Next Steps

### Phase 8 Complete ✅

All monitoring infrastructure is in place:

- ✅ Prometheus metrics collection
- ✅ Grafana dashboard with 10 panels
- ✅ 2 alerting rules configured
- ✅ Debug endpoint for testing
- ✅ Documentation complete

### Future Enhancements

1. **Integrate metrics into worker**: Add `update_queue_sizes()` calls in email worker
2. **Add more business metrics**: User engagement, template usage, delivery success by provider
3. **Configure alerting channels**: Slack/PagerDuty integration
4. **Add SLO/SLI tracking**: Service level objectives and indicators
5. **Performance tests**: Complete performance test suite (currently skipped)

## References

- [GRAFANA_SETUP.md](./GRAFANA_SETUP.md) - Complete setup guide
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
