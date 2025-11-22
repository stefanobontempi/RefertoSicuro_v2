# Grafana Dashboard Setup Guide

## Accessing Grafana

### 1. Start Grafana and Prometheus

```bash
cd /Users/stefano/DEV/RefertoSicuro_v2
docker-compose -f docker-compose.dev.yml up -d grafana prometheus
```

### 2. Access Grafana UI

- **URL**: <http://localhost:3000>
- **Username**: `admin`
- **Password**: `grafana_password` (from docker-compose.dev.yml)

### 3. Import Notification Service Dashboard

**⚠️ IMPORTANT**: Set time range to **"Last 15 minutes"** after import to see data!

1. Login to Grafana (<http://localhost:3000>)
2. Click on the **+ icon** in the left sidebar
3. Select **"Import dashboard"**
4. Click **"Upload JSON file"**
5. Select: `services/notification/grafana/notification-dashboard.json`
6. Select **Prometheus** as the datasource
7. Click **"Import"**
8. **Set time range**: Click time picker (top right) → Select **"Last 15 minutes"**
9. **Enable auto-refresh**: Click refresh dropdown → Select **"10s"**

## Dashboard Overview

The Notification Service dashboard includes 10 panels:

### Monitoring Panels

1. **Email Sending Rate** - Real-time email sending throughput
2. **Queue Size** - Number of emails in pending/retry/failed state
3. **Email Delivery Duration (p95/p99)** - Latency percentiles with alerting
4. **SMTP Errors** - Error rate by error type
5. **RabbitMQ Message Processing** - Event consumption metrics
6. **Template Rendering Duration** - Template performance
7. **Worker Batch Size** - Average emails per worker batch
8. **Email Success Rate** - Percentage of successfully sent emails (singlestat)
9. **Total Emails Sent (5m)** - Recent email volume
10. **Worker Errors** - Worker error rate with alerting

### Alerting Rules

The dashboard includes 2 pre-configured alerts:

- **Email Delivery Latency High**: Triggers if p95 > 500ms
- **Worker Error Rate High**: Triggers if error rate > 0.05 errors/sec

## Prometheus Configuration

### Current Setup

Prometheus is running on <http://localhost:9090>

### Configure Scraping for Notification Service

To see metrics on the dashboard, you need to configure Prometheus to scrape the Notification Service `/metrics` endpoint.

**Edit**: `infrastructure/prometheus/prometheus.yml` (or create it)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "notification-service"
    static_configs:
      - targets: ["notification-service:8015"]
    metrics_path: "/metrics"
```

**Reload Prometheus**:

```bash
docker-compose -f docker-compose.dev.yml restart prometheus
```

## Starting the Notification Service

To generate metrics, the Notification Service must be running:

```bash
cd services/notification
uvicorn app.main:app --host 0.0.0.0 --port 8015 --reload
```

Once running, metrics will be available at: <http://localhost:8015/metrics>

## Verifying Metrics

### Check Metrics Endpoint

```bash
curl http://localhost:8015/metrics
```

You should see Prometheus-format metrics like:

```
# HELP notification_emails_sent_total Total number of emails sent
# TYPE notification_emails_sent_total counter
notification_emails_sent_total{template="welcome",status="sent"} 42.0
...
```

### Check Prometheus Targets

1. Go to <http://localhost:9090/targets>
2. Verify `notification-service` target is **UP**
3. If DOWN, check Prometheus configuration and network connectivity

## Troubleshooting

### Grafana not accessible

```bash
# Check if container is running
docker ps | grep grafana

# Check logs
docker logs rs_grafana

# Restart
docker-compose -f docker-compose.dev.yml restart grafana
```

### Prometheus not scraping

```bash
# Check Prometheus logs
docker logs rs_prometheus

# Verify target configuration
curl http://localhost:9090/api/v1/targets

# Test metrics endpoint
curl http://localhost:8015/metrics
```

### Dashboard shows "No Data"

1. ✅ Notification Service is running
2. ✅ Prometheus is scraping (check <http://localhost:9090/targets>)
3. ✅ Metrics endpoint returns data (curl <http://localhost:8015/metrics>)
4. ✅ Time range in Grafana is set correctly (try "Last 5 minutes")
5. ✅ Data source in dashboard is set to "Prometheus"

## Useful Queries

You can run these directly in Prometheus (<http://localhost:9090>) or Grafana:

### Email Throughput

```promql
rate(notification_emails_sent_total[5m])
```

### Queue Depth

```promql
notification_queue_size
```

### Success Rate

```promql
sum(rate(notification_emails_sent_total{status="sent"}[5m]))
/
sum(rate(notification_emails_sent_total[5m])) * 100
```

### p95 Latency

```promql
histogram_quantile(0.95, rate(notification_email_delivery_seconds_bucket[5m]))
```

## Next Steps

1. Configure Prometheus to scrape all microservices
2. Create additional dashboards for Auth, Billing, Reports services
3. Setup alerting with PagerDuty/Slack integration
4. Enable long-term metrics retention
