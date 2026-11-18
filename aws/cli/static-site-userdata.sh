#!/bin/bash
# EC2 user-data: runs once at first boot. Installs Nginx and publishes a static EventHub page.
dnf install -y nginx
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
IID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)
cat > /usr/share/nginx/html/index.html <<HTML
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>EventHub - static site (AWS CLI)</title>
<style>
 body{font-family:system-ui,Segoe UI,sans-serif;background:#f4f6fb;color:#1c2333;margin:0;padding:60px 20px;text-align:center}
 .card{max-width:620px;margin:auto;background:#fff;border:1px solid #e2e6ef;border-radius:14px;padding:32px;border-top:6px solid #3b5bdb}
 code{background:#eef1f8;padding:2px 6px;border-radius:5px}
</style></head>
<body><div class="card">
 <h1>EventHub</h1>
 <p>College Event Management &amp; Registration System</p>
 <p>This static page is hosted on <b>Amazon EC2</b> with <b>Nginx</b>.<br>
 Every resource was created with the <b>AWS CLI</b>.</p>
 <p>Instance: <code>$IID</code> &middot; Zone: <code>$AZ</code></p>
 <p><small>Created $(date -u '+%Y-%m-%d %H:%M UTC')</small></p>
</div></body></html>
HTML
systemctl enable --now nginx
