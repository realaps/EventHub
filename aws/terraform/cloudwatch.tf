# CloudWatch: log groups, log-based metrics, alarms and a dashboard

locals {
  log_groups = {
    access = "/eventhub/nginx/access"
    error  = "/eventhub/nginx/error"
    app    = "/eventhub/app"
  }
}

resource "aws_cloudwatch_log_group" "eventhub" {
  for_each          = local.log_groups
  name              = each.value
  retention_in_days = 7
}

# Nginx writes JSON access logs, so CloudWatch can filter on fields
resource "aws_cloudwatch_log_metric_filter" "requests" {
  name           = "eventhub-requests"
  log_group_name = aws_cloudwatch_log_group.eventhub["access"].name
  pattern        = "{ $.status > 0 }"

  metric_transformation {
    name          = "Requests"
    namespace     = "EventHub"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "errors_5xx" {
  name           = "eventhub-5xx"
  log_group_name = aws_cloudwatch_log_group.eventhub["access"].name
  pattern        = "{ $.status >= 500 }"

  metric_transformation {
    name          = "Errors5xx"
    namespace     = "EventHub"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_sns_topic" "alerts" {
  name = "eventhub-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "eventhub-high-cpu"
  alarm_description   = "EventHub EC2 CPU above 70% for 10 minutes"
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  dimensions          = { InstanceId = aws_instance.web.id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 70
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "status_check" {
  alarm_name          = "eventhub-status-check-failed"
  alarm_description   = "EC2 instance or system status check failed"
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  dimensions          = { InstanceId = aws_instance.web.id }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "errors_5xx" {
  alarm_name          = "eventhub-5xx-errors"
  alarm_description   = "5 or more HTTP 5xx responses in 5 minutes (from Nginx logs)"
  namespace           = "EventHub"
  metric_name         = "Errors5xx"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_dashboard" "eventhub" {
  dashboard_name = "EventHub"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric", x = 0, y = 0, width = 12, height = 6
        properties = {
          title   = "EC2 CPU utilisation (%)"
          region  = var.region
          stat    = "Average"
          period  = 300
          metrics = [["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.web.id]]
        }
      },
      {
        type = "metric", x = 12, y = 0, width = 12, height = 6
        properties = {
          title   = "Memory used (%) - CloudWatch agent"
          region  = var.region
          stat    = "Average"
          period  = 60
          metrics = [["CWAgent", "mem_used_percent", "InstanceId", aws_instance.web.id]]
        }
      },
      {
        type = "metric", x = 0, y = 6, width = 12, height = 6
        properties = {
          title   = "HTTP requests vs 5xx errors (from Nginx logs)"
          region  = var.region
          stat    = "Sum"
          period  = 60
          metrics = [["EventHub", "Requests"], ["EventHub", "Errors5xx"]]
        }
      },
      {
        type = "log", x = 12, y = 6, width = 12, height = 6
        properties = {
          title  = "Latest requests"
          region = var.region
          query  = "SOURCE '${aws_cloudwatch_log_group.eventhub["access"].name}' | fields @timestamp, status, request, remote_addr | sort @timestamp desc | limit 20"
          view   = "table"
        }
      }
    ]
  })
}
