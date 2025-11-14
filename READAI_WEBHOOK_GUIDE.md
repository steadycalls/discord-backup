# Read.ai Webhook Integration Guide

This guide explains how to set up Read.ai webhooks to automatically capture meeting data (title, link, summary, participants) into your Discord Archive system.

## Overview

The Discord Archive system includes an inbound webhook endpoint that receives meeting data from Read.ai and stores it in the database for future reference.

## Webhook Endpoint

**URL:** `https://your-domain.com/api/webhooks/readai`
**Method:** `POST`
**Content-Type:** `application/json`

## Setup Instructions

### 1. Get Your Webhook URL

After deploying your Discord Archive application, your webhook URL will be:

```
https://[your-domain]/api/webhooks/readai
```

For example:
- Production: `https://discord-archive.manus.space/api/webhooks/readai`
- Development: `https://3000-[your-preview-url].manusvm.computer/api/webhooks/readai`

### 2. Configure Read.ai Webhook

1. Log in to your Read.ai account
2. Navigate to **Settings** → **Integrations** → **Webhooks**
3. Click **Add Webhook**
4. Enter your webhook URL from step 1
5. Select the events you want to receive (e.g., "Meeting Completed")
6. Save the configuration

### 3. Test the Integration

Read.ai will send a test payload when you save the webhook. You should see:
- A success response from the endpoint
- Meeting data appearing in your database

## Webhook Payload Format

Read.ai sends meeting data in the following format (fields may vary):

```json
{
  "title": "Team Standup",
  "meeting_title": "Team Standup",
  "link": "https://read.ai/meeting/abc123",
  "meeting_link": "https://read.ai/meeting/abc123",
  "url": "https://read.ai/meeting/abc123",
  "summary": "Discussed project progress and blockers...",
  "meeting_summary": "Discussed project progress and blockers...",
  "participants": ["John Doe", "Jane Smith", "Bob Johnson"],
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T10:30:00Z"
}
```

## Data Storage

The webhook endpoint automatically:

1. Extracts meeting information from the payload
2. Stores it in the `meetings` table with the following fields:
   - `title` - Meeting title
   - `meetingLink` - Link to the Read.ai meeting
   - `summary` - Meeting summary/transcript
   - `participants` - JSON array of participant names
   - `startTime` - Meeting start time
   - `endTime` - Meeting end time
   - `rawPayload` - Complete webhook payload for reference
   - `receivedAt` - Timestamp when webhook was received

## Viewing Meeting Data

Currently, meeting data is stored in the database. To view meetings:

### Option 1: Database Query

Use the database management UI or run a query:

```sql
SELECT * FROM meetings ORDER BY receivedAt DESC LIMIT 10;
```

### Option 2: API Access (Coming Soon)

A meetings viewer page will be added to the web interface to browse and search received meetings.

## Troubleshooting

### Webhook Not Receiving Data

1. **Check the URL**: Ensure the webhook URL is correct and accessible
2. **Check logs**: Look at server logs for any errors
3. **Test manually**: Send a test POST request:

```bash
curl -X POST https://your-domain.com/api/webhooks/readai \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Meeting",
    "link": "https://read.ai/test",
    "summary": "This is a test",
    "participants": ["Test User"]
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Meeting data received"
}
```

### Database Connection Issues

If meetings aren't being saved:
1. Check database connection in server logs
2. Verify the `meetings` table exists
3. Run database migrations: `pnpm db:push`

## Security Considerations

### Webhook Authentication (Optional)

For production use, consider adding webhook authentication:

1. **Shared Secret**: Read.ai can include a secret token in headers
2. **IP Whitelisting**: Restrict webhook endpoint to Read.ai IP addresses
3. **HTTPS Only**: Always use HTTPS in production

Example with secret validation (to be implemented):

```typescript
app.post("/api/webhooks/readai", async (req, res) => {
  const secret = req.headers["x-webhook-secret"];
  if (secret !== process.env.READAI_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // ... rest of handler
});
```

## Next Steps

- [ ] Add meetings viewer page to web interface
- [ ] Implement search and filtering for meetings
- [ ] Add notifications when new meetings are received
- [ ] Export meeting summaries to Discord channels
- [ ] Link meetings to related Discord conversations

## Support

For issues with:
- **Read.ai webhook configuration**: Contact Read.ai support
- **Discord Archive system**: Check server logs and database status
- **Integration problems**: Review this guide and test with manual requests
