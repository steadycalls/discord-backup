# Emergency Contact List

**Last Updated:** _______________  
**Review Frequency:** Quarterly

---

## Internal Recovery Team

### Primary Contacts

| Role | Name | Mobile Phone | Email | Availability |
|------|------|--------------|-------|--------------|
| **Incident Commander** | | | | 24/7 |
| **Technical Lead** | | | | 24/7 |
| **Database Administrator** | | | | Business hours |
| **DevOps Engineer** | | | | Business hours |
| **Security Lead** | | | | On-call |

### Backup Contacts

| Role | Name | Mobile Phone | Email | Availability |
|------|------|--------------|-------|--------------|
| **Backup Incident Commander** | | | | 24/7 |
| **Backup Technical Lead** | | | | 24/7 |
| **Backup Database Admin** | | | | Business hours |

---

## Management & Stakeholders

| Role | Name | Mobile Phone | Email | When to Contact |
|------|------|--------------|-------|-----------------|
| **CTO / VP Engineering** | | | | Incidents > 2 hours |
| **CEO** | | | | Critical business impact |
| **Head of Operations** | | | | Service disruption |
| **Communications Lead** | | | | All incidents |

---

## External Vendors & Services

### Cloud Infrastructure

**AWS Support**
- Account ID: _______________
- Support Plan: _______________
- Phone: 1-866-987-7638 (US)
- Email: _______________
- Portal: https://console.aws.amazon.com/support/

**Server Provider** (DigitalOcean/Linode/Vultr)
- Account ID: _______________
- Support Phone: _______________
- Support Email: _______________
- Portal: _______________

### Domain & DNS

**Domain Registrar**
- Registrar: _______________
- Account ID: _______________
- Support Phone: _______________
- Support Email: _______________
- Portal: _______________

### Application Services

**Manus Platform**
- Support: https://help.manus.im
- Documentation: https://docs.manus.im
- Status Page: _______________

**Discord**
- Support: https://support.discord.com
- Status: https://discordstatus.com
- API Documentation: https://discord.com/developers/docs

**GoHighLevel**
- Support Phone: _______________
- Support Email: _______________
- Portal: https://help.gohighlevel.com

**Read.ai**
- Support Email: _______________
- Documentation: https://docs.read.ai

---

## Escalation Path

### Level 1: Initial Response (0-30 minutes)
**Contact:** Technical Lead  
**Actions:**
- Assess incident severity
- Begin recovery procedures
- Notify Incident Commander

### Level 2: Extended Incident (30-60 minutes)
**Contact:** Incident Commander  
**Actions:**
- Coordinate recovery team
- Notify stakeholders
- Escalate to management if needed

### Level 3: Critical Incident (1-2 hours)
**Contact:** CTO / VP Engineering  
**Actions:**
- Authorize emergency resources
- Approve vendor escalations
- Coordinate external communications

### Level 4: Business-Critical (2+ hours)
**Contact:** CEO  
**Actions:**
- Executive decision-making
- Customer communications
- Legal/compliance notifications

---

## Incident Severity Levels

### Severity 1: Critical
- **Impact:** Complete system outage
- **Response Time:** Immediate (< 15 minutes)
- **Escalation:** Incident Commander immediately
- **Examples:** Database loss, infrastructure failure

### Severity 2: High
- **Impact:** Major functionality impaired
- **Response Time:** 30 minutes
- **Escalation:** Technical Lead
- **Examples:** Webhook failures, partial outage

### Severity 3: Medium
- **Impact:** Minor functionality affected
- **Response Time:** 2 hours
- **Escalation:** On-call engineer
- **Examples:** Slow performance, non-critical errors

### Severity 4: Low
- **Impact:** Minimal user impact
- **Response Time:** Next business day
- **Escalation:** Standard support
- **Examples:** Cosmetic issues, minor bugs

---

## Communication Templates

### Initial Incident Notification

**Subject:** [SEVERITY] System Incident - [Brief Description]

```
INCIDENT ALERT

Severity: [1/2/3/4]
Status: Investigating / In Progress / Resolved
System: Logic Inbound Systems Manager
Impact: [Description]

Symptoms:
- [List symptoms]

Actions Taken:
- [List actions]

Next Steps:
- [List next steps]

Estimated Resolution: [Time]
Next Update: [Time]

Contact: [Name] - [Phone] - [Email]
```

### Recovery Complete Notification

**Subject:** [RESOLVED] System Incident - Recovery Complete

```
INCIDENT RESOLVED

Incident ID: [ID]
Duration: [X hours]
Root Cause: [Brief description]

Resolution:
- [List resolution steps]

Verification:
- [List verification steps]

Post-Recovery Actions:
- [List follow-up tasks]

Post-Mortem: [Date/Time]

Contact: [Name] - [Phone] - [Email]
```

---

## After-Hours Contact Procedures

### Business Hours
**Monday-Friday: 9 AM - 5 PM EST**
1. Call Technical Lead
2. If no answer within 5 minutes, call Backup Technical Lead
3. If no answer within 10 minutes, escalate to Incident Commander

### After Hours / Weekends
**All other times**
1. Call Incident Commander immediately
2. Incident Commander will assemble recovery team
3. For Severity 1, also notify CTO

### Holidays
**Major holidays**
1. Follow after-hours procedure
2. Expect longer response times
3. Escalate to CTO for Severity 1 incidents

---

## Quick Reference

### Emergency Hotline
**Primary:** _______________  
**Backup:** _______________

### Incident Reporting
**Email:** incidents@logicinbound.com  
**Slack:** #incidents  
**Phone:** _______________

### Status Page
**URL:** _______________  
**Update Access:** _______________

---

## Document Maintenance

**Document Owner:** _______________  
**Last Verified:** _______________  
**Next Review:** _______________

**Review Checklist:**
- [ ] All phone numbers tested
- [ ] All email addresses verified
- [ ] All vendor accounts accessible
- [ ] Escalation path validated
- [ ] Templates updated
- [ ] Team members confirmed availability

---

**IMPORTANT:** Print this document and store in a secure, accessible location. Ensure all team members have access during emergencies.
