# Quick Recovery Checklist

**Print this checklist and keep it accessible during disaster recovery**

---

## Pre-Recovery Assessment

- [ ] Incident documented (date, time, symptoms)
- [ ] Recovery team notified
- [ ] Stakeholders informed
- [ ] Backup identified: `backup_discord_archive___________.sql.gz`
- [ ] New server IP: `_______________`

---

## Phase 1: Server Setup (30-60 min)

- [ ] Server provisioned (4GB RAM, 50GB storage minimum)
- [ ] SSH access confirmed
- [ ] System updated: `apt update && apt upgrade -y`
- [ ] Docker installed: `curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh`
- [ ] Docker Compose installed: `apt install docker-compose-plugin -y`
- [ ] Firewall configured: `ufw allow 22,80,443/tcp && ufw enable`

---

## Phase 2: Application Deployment (15-30 min)

- [ ] Repository cloned: `git clone https://github.com/steadycalls/discord-backup.git /opt/li-systems`
- [ ] Environment configured: `cd /opt/li-systems && cp .env.docker.example .env && nano .env`
- [ ] Required variables set:
  - [ ] `POSTGRES_PASSWORD`
  - [ ] `DOMAIN`
  - [ ] `VITE_APP_ID`
  - [ ] `JWT_SECRET`
  - [ ] `S3_BUCKET`
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] Services started: `docker compose up -d postgres app nginx certbot`
- [ ] Services verified: `docker compose ps` (all "Up")
- [ ] SSL initialized: `./init-letsencrypt.sh your-email@example.com`

---

## Phase 3: Database Restoration (15-30 min)

- [ ] Application stopped: `docker compose stop app`
- [ ] S3 backups listed: `docker compose run --rm backup /scripts/restore-from-s3.sh`
- [ ] Backup downloaded: `docker compose run --rm backup /scripts/restore-from-s3.sh BACKUP_FILE`
- [ ] Database restored: `docker compose run --rm backup /scripts/restore-database.sh BACKUP_FILE`
- [ ] Restoration confirmed (typed "yes")
- [ ] Application restarted: `docker compose start app`

---

## Phase 4: Verification (30 min)

- [ ] All services running: `docker compose ps`
- [ ] No errors in logs: `docker compose logs app --tail=50`
- [ ] HTTPS accessible: `https://systems.logicinbound.com`
- [ ] Login works
- [ ] Discord messages display
- [ ] Read.ai meetings display
- [ ] A2P status displays
- [ ] AI chat responds

---

## Phase 5: DNS Cutover (5 min + propagation)

- [ ] DNS A record updated to new IP: `_______________`
- [ ] DNS propagation verified: `nslookup systems.logicinbound.com`
- [ ] Traffic monitored: `docker compose logs -f nginx`
- [ ] Backup service enabled: `docker compose up -d backup`

---

## Post-Recovery

- [ ] Recovery time recorded: `_____ hours`
- [ ] Stakeholders notified of completion
- [ ] Post-mortem scheduled
- [ ] Old infrastructure decommissioned
- [ ] This checklist updated with lessons learned

---

## Emergency Stop

If recovery fails and you need to abort:

1. Stop all services: `docker compose down`
2. Document failure point
3. Escalate to next level
4. Consider alternative recovery approach

---

## Quick Command Reference

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f app

# Restart service
docker compose restart app

# Access database
docker compose exec postgres psql -U postgres -d discord_archive

# Download S3 backup
docker compose run --rm backup /scripts/restore-from-s3.sh BACKUP_FILE

# Restore database
docker compose run --rm backup /scripts/restore-database.sh BACKUP_FILE
```

---

**Recovery Start Time:** _______________  
**Recovery End Time:** _______________  
**Total Duration:** _______________  
**Recovered By:** _______________
