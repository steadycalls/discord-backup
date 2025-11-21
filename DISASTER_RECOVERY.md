# Disaster Recovery Runbook

**Logic Inbound Systems Manager - Complete System Restoration Guide**

---

## Table of Contents

1. [Overview](#overview)
2. [When to Use This Runbook](#when-to-use-this-runbook)
3. [Prerequisites](#prerequisites)
4. [Recovery Time Objectives](#recovery-time-objectives)
5. [Phase 1: Assessment and Preparation](#phase-1-assessment-and-preparation)
6. [Phase 2: Infrastructure Provisioning](#phase-2-infrastructure-provisioning)
7. [Phase 3: Application Deployment](#phase-3-application-deployment)
8. [Phase 4: Database Restoration](#phase-4-database-restoration)
9. [Phase 5: Verification and Testing](#phase-5-verification-and-testing)
10. [Phase 6: DNS and Traffic Cutover](#phase-6-dns-and-traffic-cutover)
11. [Post-Recovery Tasks](#post-recovery-tasks)
12. [Troubleshooting](#troubleshooting)
13. [Emergency Contacts](#emergency-contacts)

---

## Overview

This runbook provides step-by-step procedures for complete disaster recovery of the Logic Inbound Systems Manager application from S3 backups. It covers scenarios ranging from database corruption to complete infrastructure loss.

**Last Updated:** 2024-01-01  
**Document Owner:** IT Operations Team  
**Review Frequency:** Quarterly

---

## When to Use This Runbook

Use this runbook in the following scenarios:

### Complete Infrastructure Loss
- Data center failure
- Cloud provider outage
- Ransomware attack requiring clean rebuild
- Natural disaster affecting primary infrastructure

### Critical Data Loss
- Database corruption beyond repair
- Accidental data deletion
- Failed migration or upgrade

### Application Failure
- Unrecoverable application errors
- Configuration corruption
- Security breach requiring system rebuild

---

## Prerequisites

### Required Access

- [ ] AWS Console access with S3 read permissions
- [ ] Server/VPS root access (SSH)
- [ ] Domain registrar access (for DNS changes)
- [ ] GitHub repository access
- [ ] Manus OAuth application credentials

### Required Information

- [ ] S3 bucket name and region
- [ ] AWS access keys
- [ ] Latest backup filename
- [ ] Domain name
- [ ] SSL certificate email
- [ ] Database credentials
- [ ] Manus OAuth credentials

### Required Tools

- [ ] SSH client
- [ ] AWS CLI (optional, for verification)
- [ ] Text editor
- [ ] Web browser

---

## Recovery Time Objectives

| Component | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|-----------|-------------------------------|--------------------------------|
| Infrastructure | 30-60 minutes | N/A |
| Application | 15-30 minutes | N/A |
| Database | 15-30 minutes | 24 hours (daily backups) |
| DNS Propagation | 1-24 hours | N/A |
| **Total System** | **2-4 hours** | **24 hours** |

---

## Phase 1: Assessment and Preparation

### Step 1.1: Assess the Situation

**Objective:** Understand the scope of the disaster and determine recovery approach.

1. **Document the incident:**
   ```
   Date/Time: _______________
   Reported by: _______________
   Symptoms: _______________
   Affected components: _______________
   ```

2. **Determine recovery scope:**
   - [ ] Database only
   - [ ] Application only
   - [ ] Complete infrastructure

3. **Identify last known good state:**
   - Check S3 for latest backup
   - Verify backup integrity
   - Note backup timestamp

### Step 1.2: Assemble Recovery Team

**Roles:**
- **Incident Commander:** Coordinates recovery efforts
- **Technical Lead:** Executes recovery procedures
- **Communications Lead:** Updates stakeholders
- **Documentation Lead:** Records all actions

### Step 1.3: Notify Stakeholders

**Internal Notification Template:**
```
Subject: INCIDENT - System Recovery in Progress

We are currently executing disaster recovery procedures for the Logic Inbound Systems Manager.

Status: Recovery in progress
Estimated Recovery Time: [X] hours
Impact: [Description]
Next Update: [Time]

Recovery Team Contact: [Email/Phone]
```

### Step 1.4: Verify S3 Backup Availability

1. **List available backups:**
   ```bash
   aws s3 ls s3://YOUR-BUCKET/database-backups/ --region us-east-1
   ```

2. **Identify target backup:**
   ```
   Backup file: backup_discord_archive_YYYYMMDD_HHMMSS.sql.gz
   Size: _______________
   Date: _______________
   ```

3. **Download backup for verification (optional):**
   ```bash
   aws s3 cp s3://YOUR-BUCKET/database-backups/backup_discord_archive_YYYYMMDD_HHMMSS.sql.gz ./verify-backup.sql.gz
   gzip -t verify-backup.sql.gz
   ```

---

## Phase 2: Infrastructure Provisioning

### Step 2.1: Provision New Server

**Minimum Requirements:**
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 50 GB SSD
- **OS:** Ubuntu 22.04 LTS
- **Network:** Public IP address

**Recommended Providers:**
- AWS EC2 (t3.medium or larger)
- DigitalOcean Droplet ($24/month or larger)
- Linode (4GB plan or larger)
- Vultr (4GB plan or larger)

### Step 2.2: Initial Server Setup

1. **Connect to server:**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Update system:**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Install Docker and Docker Compose:**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   apt install docker-compose-plugin -y
   
   # Verify installation
   docker --version
   docker compose version
   ```

4. **Configure firewall:**
   ```bash
   # Install UFW
   apt install ufw -y
   
   # Allow SSH, HTTP, HTTPS
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   
   # Enable firewall
   ufw --force enable
   
   # Verify status
   ufw status
   ```

5. **Create application directory:**
   ```bash
   mkdir -p /opt/li-systems
   cd /opt/li-systems
   ```

---

## Phase 3: Application Deployment

### Step 3.1: Clone Repository

```bash
cd /opt/li-systems
git clone https://github.com/steadycalls/discord-backup.git .
```

### Step 3.2: Configure Environment Variables

1. **Copy environment template:**
   ```bash
   cp .env.docker.example .env
   ```

2. **Edit configuration:**
   ```bash
   nano .env
   ```

3. **Required variables:**
   ```env
   # Database
   POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
   
   # Domain
   DOMAIN=systems.logicinbound.com
   
   # Manus OAuth
   VITE_APP_ID=your_manus_app_id
   JWT_SECRET=your_jwt_secret
   OWNER_OPEN_ID=your_owner_open_id
   OWNER_NAME=Your Name
   
   # Manus APIs
   BUILT_IN_FORGE_API_KEY=your_forge_api_key
   VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key
   
   # S3 Backup Configuration
   S3_BUCKET=your-backup-bucket
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   ```

4. **Save and exit** (Ctrl+X, Y, Enter)

### Step 3.3: Start Application Services

1. **Start services (without backup service initially):**
   ```bash
   # Start only essential services
   docker compose up -d postgres app nginx certbot
   ```

2. **Verify services are running:**
   ```bash
   docker compose ps
   ```

3. **Check logs for errors:**
   ```bash
   docker compose logs app
   docker compose logs postgres
   ```

### Step 3.4: Initialize SSL Certificates

1. **Run Let's Encrypt initialization:**
   ```bash
   ./init-letsencrypt.sh your-email@example.com
   ```

2. **Verify HTTPS access:**
   ```bash
   curl -I https://systems.logicinbound.com
   ```

---

## Phase 4: Database Restoration

### Step 4.1: Stop Application

```bash
docker compose stop app
```

### Step 4.2: Download Backup from S3

1. **List available backups:**
   ```bash
   docker compose run --rm backup /scripts/restore-from-s3.sh
   ```

2. **Download specific backup:**
   ```bash
   docker compose run --rm backup /scripts/restore-from-s3.sh backup_discord_archive_YYYYMMDD_HHMMSS.sql.gz
   ```

3. **Verify download:**
   ```bash
   docker compose exec backup ls -lh /backups/
   ```

### Step 4.3: Restore Database

1. **Run restoration script:**
   ```bash
   docker compose run --rm backup /scripts/restore-database.sh backup_discord_archive_YYYYMMDD_HHMMSS.sql.gz
   ```

2. **Confirm restoration when prompted:**
   ```
   Are you sure you want to continue? (yes/no): yes
   ```

3. **Wait for restoration to complete**
   - Monitor progress
   - Note any errors

4. **Verify restoration:**
   ```bash
   docker compose exec postgres psql -U postgres -d discord_archive -c "SELECT COUNT(*) FROM users;"
   ```

### Step 4.4: Restart Application

```bash
docker compose start app
```

---

## Phase 5: Verification and Testing

### Step 5.1: Application Health Check

1. **Check all services are running:**
   ```bash
   docker compose ps
   ```
   
   Expected output: All services should show "Up" status

2. **Check application logs:**
   ```bash
   docker compose logs app --tail=50
   ```
   
   Look for: "Server running on http://localhost:3000/"

3. **Check database connectivity:**
   ```bash
   docker compose logs app | grep -i database
   ```
   
   Should show successful database connections

### Step 5.2: Web Interface Testing

1. **Access application:**
   ```
   https://systems.logicinbound.com
   ```

2. **Test authentication:**
   - [ ] Login page loads
   - [ ] Can authenticate with Manus OAuth
   - [ ] User dashboard displays

3. **Test core functionality:**
   - [ ] Discord messages display
   - [ ] Read.ai meetings display
   - [ ] A2P status displays
   - [ ] AI chat responds
   - [ ] Client mappings work

### Step 5.3: Data Integrity Verification

1. **Verify user accounts:**
   ```bash
   docker compose exec postgres psql -U postgres -d discord_archive -c "SELECT COUNT(*) FROM users;"
   ```

2. **Verify Discord messages:**
   ```bash
   docker compose exec postgres psql -U postgres -d discord_archive -c "SELECT COUNT(*) FROM discord_messages;"
   ```

3. **Verify Read.ai meetings:**
   ```bash
   docker compose exec postgres psql -U postgres -d discord_archive -c "SELECT COUNT(*) FROM readai_meetings;"
   ```

4. **Verify A2P campaigns:**
   ```bash
   docker compose exec postgres psql -U postgres -d discord_archive -c "SELECT COUNT(*) FROM a2p_status;"
   ```

### Step 5.4: External Service Testing

1. **Test Discord webhook:**
   - Send test message to Discord
   - Verify it appears in application

2. **Test Read.ai webhook:**
   - Trigger test meeting webhook
   - Verify meeting data received

3. **Test A2P scraper:**
   - Manually trigger scraper (if possible)
   - Verify status updates received

---

## Phase 6: DNS and Traffic Cutover

### Step 6.1: Update DNS Records

1. **Log into domain registrar**

2. **Update A record:**
   ```
   Type: A
   Name: systems (or @)
   Value: NEW_SERVER_IP
   TTL: 300 (5 minutes)
   ```

3. **Verify DNS propagation:**
   ```bash
   # Check from multiple locations
   nslookup systems.logicinbound.com
   dig systems.logicinbound.com
   ```

4. **Wait for propagation:**
   - Minimum: 5 minutes (TTL)
   - Maximum: 24-48 hours (cached records)

### Step 6.2: Monitor Traffic

1. **Watch application logs:**
   ```bash
   docker compose logs -f app
   ```

2. **Monitor for errors:**
   ```bash
   docker compose logs app | grep -i error
   ```

3. **Check access logs:**
   ```bash
   docker compose logs nginx | grep -E "GET|POST"
   ```

### Step 6.3: Enable Backup Service

Once system is stable:

```bash
docker compose up -d backup
```

Verify backups resume:
```bash
docker compose logs backup
```

---

## Post-Recovery Tasks

### Immediate (Within 24 Hours)

- [ ] **Document recovery process**
  - Record actual recovery time
  - Note any deviations from runbook
  - Document issues encountered

- [ ] **Verify backup system**
  - Confirm automated backups resume
  - Verify S3 uploads working
  - Check backup logs

- [ ] **Update monitoring**
  - Verify all monitoring alerts active
  - Update IP addresses in monitoring systems
  - Test alert notifications

- [ ] **Notify stakeholders**
  - Send recovery completion notice
  - Provide post-mortem summary
  - Schedule debrief meeting

### Short-term (Within 1 Week)

- [ ] **Conduct post-mortem**
  - What caused the disaster?
  - What went well in recovery?
  - What could be improved?
  - Update runbook based on lessons learned

- [ ] **Test restored system**
  - Comprehensive functionality testing
  - Performance testing
  - Security audit

- [ ] **Update documentation**
  - Update this runbook with improvements
  - Update emergency contact list
  - Document new server details

- [ ] **Decommission old infrastructure**
  - Backup any remaining data
  - Cancel old services
  - Update billing

### Long-term (Within 1 Month)

- [ ] **Review disaster recovery plan**
  - Update RTO/RPO objectives
  - Review backup retention policies
  - Evaluate recovery procedures

- [ ] **Conduct DR drill**
  - Schedule practice recovery
  - Test team readiness
  - Validate runbook accuracy

- [ ] **Implement improvements**
  - Address identified weaknesses
  - Automate manual steps
  - Enhance monitoring

---

## Troubleshooting

### Issue: Docker Compose Fails to Start

**Symptoms:**
- Services fail to start
- Port conflicts
- Permission errors

**Solutions:**

1. **Check port availability:**
   ```bash
   netstat -tulpn | grep -E '80|443|5432|3000'
   ```

2. **Check Docker status:**
   ```bash
   systemctl status docker
   ```

3. **Check logs:**
   ```bash
   docker compose logs
   ```

4. **Reset Docker:**
   ```bash
   docker compose down -v
   docker compose up -d
   ```

### Issue: Database Restoration Fails

**Symptoms:**
- Restoration script errors
- Connection refused
- Authentication failures

**Solutions:**

1. **Verify database is running:**
   ```bash
   docker compose ps postgres
   ```

2. **Check database logs:**
   ```bash
   docker compose logs postgres
   ```

3. **Verify credentials:**
   ```bash
   grep POSTGRES .env
   ```

4. **Manual restoration:**
   ```bash
   gunzip -c /path/to/backup.sql.gz | docker compose exec -T postgres psql -U postgres -d discord_archive
   ```

### Issue: SSL Certificate Fails

**Symptoms:**
- Let's Encrypt errors
- Certificate not issued
- HTTPS not working

**Solutions:**

1. **Verify DNS points to server:**
   ```bash
   nslookup systems.logicinbound.com
   ```

2. **Check firewall:**
   ```bash
   ufw status
   ```

3. **Try staging certificate first:**
   ```bash
   ./init-letsencrypt.sh your-email@example.com 1
   ```

4. **Check Certbot logs:**
   ```bash
   docker compose logs certbot
   ```

### Issue: Application Won't Start

**Symptoms:**
- Container exits immediately
- Database connection errors
- Missing environment variables

**Solutions:**

1. **Check environment variables:**
   ```bash
   docker compose config
   ```

2. **Verify database connectivity:**
   ```bash
   docker compose exec app ping postgres
   ```

3. **Check application logs:**
   ```bash
   docker compose logs app
   ```

4. **Rebuild application:**
   ```bash
   docker compose up -d --build app
   ```

### Issue: S3 Backup Download Fails

**Symptoms:**
- Access denied
- Backup not found
- Network errors

**Solutions:**

1. **Verify AWS credentials:**
   ```bash
   docker compose exec backup env | grep AWS
   ```

2. **Test S3 access:**
   ```bash
   docker compose exec backup aws s3 ls s3://YOUR-BUCKET/
   ```

3. **Check IAM permissions:**
   - Verify IAM user has s3:GetObject permission
   - Check bucket policy

4. **Manual download:**
   ```bash
   aws s3 cp s3://YOUR-BUCKET/database-backups/backup.sql.gz ./backup.sql.gz
   docker cp backup.sql.gz li-systems-backup:/backups/
   ```

---

## Emergency Contacts

### Internal Team

| Role | Name | Phone | Email | Backup Contact |
|------|------|-------|-------|----------------|
| Incident Commander | | | | |
| Technical Lead | | | | |
| Database Admin | | | | |
| DevOps Engineer | | | | |

### External Vendors

| Service | Contact | Phone | Email | Account ID |
|---------|---------|-------|-------|------------|
| AWS Support | | | | |
| Server Provider | | | | |
| Domain Registrar | | | | |
| Manus Support | | https://help.manus.im | |

### Escalation Path

1. **Level 1:** Technical Lead (0-30 minutes)
2. **Level 2:** Incident Commander (30-60 minutes)
3. **Level 3:** CTO/VP Engineering (1+ hours)
4. **Level 4:** CEO (Critical business impact)

---

## Appendix A: Recovery Checklist

Use this checklist during actual recovery:

### Pre-Recovery
- [ ] Incident documented
- [ ] Recovery team assembled
- [ ] Stakeholders notified
- [ ] S3 backup verified
- [ ] Server provisioned

### Infrastructure
- [ ] Docker installed
- [ ] Firewall configured
- [ ] Repository cloned
- [ ] Environment configured

### Application
- [ ] Services started
- [ ] SSL certificates obtained
- [ ] Application accessible

### Database
- [ ] Backup downloaded
- [ ] Database restored
- [ ] Data verified

### Verification
- [ ] All services running
- [ ] Web interface working
- [ ] Core functionality tested
- [ ] External services connected

### Cutover
- [ ] DNS updated
- [ ] Traffic monitored
- [ ] Backups enabled

### Post-Recovery
- [ ] Recovery documented
- [ ] Stakeholders notified
- [ ] Post-mortem scheduled
- [ ] Runbook updated

---

## Appendix B: Quick Reference Commands

```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f app

# Restart service
docker compose restart app

# List S3 backups
docker compose run --rm backup /scripts/restore-from-s3.sh

# Download S3 backup
docker compose run --rm backup /scripts/restore-from-s3.sh BACKUP_FILE

# Restore database
docker compose run --rm backup /scripts/restore-database.sh BACKUP_FILE

# Check database
docker compose exec postgres psql -U postgres -d discord_archive -c "SELECT COUNT(*) FROM users;"

# Update DNS
# Log into domain registrar and update A record

# Monitor traffic
docker compose logs -f nginx
```

---

**Document Version:** 1.0  
**Last Reviewed:** 2024-01-01  
**Next Review:** 2024-04-01  
**Document Owner:** IT Operations Team
