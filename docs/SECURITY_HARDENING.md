# Security Hardening — Hetzner VPS (gerpain.com)

> VPS IP: `23.88.62.128`  
> Last updated: 2026-02-19

---

## Immediate Actions

### 1. Secrets Management

**Current state:** Secrets stored in plain `.env` files.

**Option A — Doppler (recommended, free tier)**
```bash
# Install Doppler CLI on VPS
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Inject secrets at runtime instead of reading .env
doppler run -- bun start
```

**Option B — 1Password Secrets Automation**
- Use `op run --env-file=.env.tpl -- bun start`
- Requires 1Password Teams/Business plan

**Option C — Minimum viable fix (do this now)**
```bash
chmod 600 /path/to/.env
chown deploy:deploy /path/to/.env
```

---

### 2. Dedicated Deploy User

Never deploy as a personal user (`aliou`). Create a restricted `deploy` user:

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy

# Copy your SSH public key to deploy user
sudo mkdir -p /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Optionally restrict deploy user to specific commands only (sudoers)
# /etc/sudoers.d/deploy
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart gerpain, /usr/bin/pm2
```

---

### 3. Caddy Rate Limiting

Add rate limiting to your `Caddyfile` to protect against brute-force and DDoS:

```caddyfile
gerpain.com {
    rate_limit {
        zone api {
            key {remote_host}
            events 100
            window 1m
        }
    }

    # Tighter limit on auth endpoints
    @auth_routes path /api/auth/*
    rate_limit @auth_routes {
        zone auth {
            key {remote_host}
            events 10
            window 1m
        }
    }

    reverse_proxy localhost:3000
}
```

> **Note:** Requires the [caddy-ratelimit](https://github.com/mholt/caddy-ratelimit) plugin. Build Caddy with it:
> ```bash
> xcaddy build --with github.com/mholt/caddy-ratelimit
> ```

---

### 4. Database Security (Neon PostgreSQL)

- **Restrict connections to VPS IP only:** In the Neon dashboard → Project Settings → Networking, add IP allowlist: `23.88.62.128/32`
- **Enable connection pooling:** Use the pooled connection string (`-pooler` suffix in Neon connection URL) in production to prevent connection exhaustion
- **Rotate database password** after restricting IP access

---

## Long-term Security Roadmap

| Priority | Task | Effort | Notes |
|----------|------|--------|-------|
| 🔴 High | Automated database backups | ~2h | `pg_dump` cron + upload to S3/R2 |
| 🔴 High | Log aggregation — fail2ban + auditd | ~2h | Block repeated SSH/auth failures |
| 🟡 Medium | Containerize with Docker for process isolation | ~4h | See `rebuild_gerpain/` for Docker work |
| 🟡 Medium | Dependency scanning — Snyk or Dependabot | ~30min | Add `.github/dependabot.yml` |
| 🟢 Low | Migrate to HashiCorp Vault for secrets | ~1d | Overkill until scale demands it |

---

## Automated Database Backups (High Priority Detail)

```bash
# /home/deploy/scripts/backup-db.sh
#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="gerpain_backup_${TIMESTAMP}.sql.gz"
S3_BUCKET="s3://your-bucket/backups/"

pg_dump "$DATABASE_URL" | gzip > "/tmp/${BACKUP_FILE}"
aws s3 cp "/tmp/${BACKUP_FILE}" "${S3_BUCKET}"
rm "/tmp/${BACKUP_FILE}"

echo "Backup ${BACKUP_FILE} uploaded successfully"
```

```bash
# Add to crontab (daily at 2am)
0 2 * * * /home/deploy/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

---

## fail2ban Setup (High Priority Detail)

```bash
sudo apt install fail2ban -y

# /etc/fail2ban/jail.local
[sshd]
enabled = true
maxretry = 5
bantime = 3600
findtime = 600

[nginx-http-auth]
enabled = true
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Dependabot Configuration (Quick Win)

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

---

## SSH Hardening Checklist

```bash
# /etc/ssh/sshd_config — recommended settings
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

```bash
sudo systemctl restart sshd
```

---

## Quick Reference — Current VPS

| Item | Value |
|------|-------|
| VPS IP | `23.88.62.128` |
| Provider | Hetzner |
| Reverse proxy | Caddy |
| Process manager | PM2 |
| Database | Neon PostgreSQL (external) |
| Runtime | Bun |
