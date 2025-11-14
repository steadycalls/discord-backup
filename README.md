# Discord Archive & Webhook Manager

A complete system for archiving Discord messages to PostgreSQL/MySQL and managing webhooks triggered by database events.

## Features

### 🗄️ Message Archive
- Automatically archive all Discord messages to a database
- Store complete message metadata, attachments, and user information
- Backfill historical messages from any channel
- Normalized database schema for efficient querying

### 🔍 Search & Browse
- Web interface for browsing archived messages
- Filter by guild, channel, user, or content
- Full-text search across message content
- Pagination for large datasets

### 🪝 Webhook Management
- Create webhooks triggered by Discord message events
- Support for INSERT, UPDATE, DELETE, and ALL event types
- Optional filters by guild or channel
- Test webhook endpoints before deployment
- View webhook delivery logs with success/failure status

## Architecture

```
┌─────────────────┐
│  Discord Server │
└────────┬────────┘
         │
         │ Discord API
         │
    ┌────▼─────┐
    │   Bot    │ (Python + discord.py)
    │ (Python) │
    └────┬─────┘
         │
         │ MySQL/TiDB
         │
    ┌────▼──────────┐
    │   Database    │
    │ (MySQL/TiDB)  │
    └────┬──────────┘
         │
         │ tRPC API
         │
    ┌────▼──────────┐
    │ Web Interface │ (React + TypeScript)
    │   (React)     │
    └───────────────┘
```

## Quick Start

### 1. Set Up Discord Bot

```bash
cd discord_bot
./install.sh
```

Edit `.env` with your Discord bot token and database credentials, then:

```bash
source venv/bin/activate
python bot.py
```

### 2. Access Web Interface

The web interface is already deployed and accessible at your Manus project URL.

- **Browse Messages**: `/messages`
- **Manage Webhooks**: `/webhooks` (requires login)
- **View Logs**: `/webhook-logs`

### 3. Backfill Historical Messages

In Discord, type:
```
!backfill          # All messages
!backfill 5000     # Last 5000 messages
```

## Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**: Detailed setup instructions
- **[discord_bot/](./discord_bot/)**: Discord bot source code
- **[client/src/pages/](./client/src/pages/)**: Web interface pages
- **[server/routers.ts](./server/routers.ts)**: API endpoints

## Database Schema

### Core Tables

- **discord_guilds**: Discord servers
- **discord_channels**: Text channels  
- **discord_users**: Discord users
- **discord_messages**: Message content and metadata
- **discord_attachments**: File attachments

### Webhook Tables

- **webhooks**: Webhook configurations
- **webhook_logs**: Delivery history and status

## Technology Stack

### Discord Bot
- Python 3.10+
- discord.py 2.4.0
- psycopg2-binary (PostgreSQL adapter)
- python-dotenv

### Web Application
- React 19
- TypeScript
- tRPC 11 (type-safe API)
- Tailwind CSS 4
- shadcn/ui components

### Database
- MySQL 8.0+ or TiDB
- Drizzle ORM

## Project Structure

```
discord_archive/
├── discord_bot/           # Python Discord bot
│   ├── bot.py            # Main bot logic
│   ├── db.py             # Database helpers
│   ├── requirements.txt  # Python dependencies
│   ├── env.example       # Environment template
│   └── install.sh        # Installation script
├── client/               # React frontend
│   └── src/
│       └── pages/        # UI pages
├── server/               # Node.js backend
│   ├── routers.ts        # tRPC procedures
│   └── db.ts             # Database queries
├── drizzle/              # Database schema
│   └── schema.ts         # Table definitions
├── SETUP_GUIDE.md        # Detailed setup guide
└── README.md             # This file
```

## Common Use Cases

### 1. Message Analytics
Query the database to analyze:
- Most active users and channels
- Message frequency over time
- Keyword trends
- User engagement patterns

### 2. Content Moderation
- Search for specific keywords or phrases
- Review message history for policy violations
- Export evidence for moderation actions

### 3. Integration with External Systems
- Trigger webhooks on new messages
- Send notifications to Slack, Teams, or custom services
- Feed data into analytics platforms
- Sync with CRM or ticketing systems

### 4. Backup & Compliance
- Maintain complete message history
- Export data for compliance requirements
- Disaster recovery for Discord servers

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit `.env` files** - Keep tokens and credentials secret
2. **Use HTTPS for webhooks** - Protect data in transit
3. **Implement rate limiting** - Prevent webhook abuse
4. **Restrict database access** - Use principle of least privilege
5. **Enable MESSAGE_CONTENT_INTENT carefully** - This gives the bot access to all message content

## Webhook Payload Example

When a message event occurs, registered webhooks receive:

```json
{
  "event": "message_insert",
  "message": {
    "id": "1234567890",
    "content": "Hello, world!",
    "author": {
      "id": "9876543210",
      "username": "user123"
    },
    "channel": {
      "id": "1111111111",
      "name": "general"
    },
    "guild": {
      "id": "2222222222",
      "name": "My Server"
    },
    "created_at": "2024-01-15T12:00:00Z"
  },
  "timestamp": "2024-01-15T12:00:01Z"
}
```

## Troubleshooting

### Bot Not Archiving Messages

1. Check bot has MESSAGE_CONTENT_INTENT enabled
2. Verify bot has "Read Messages" permission in channels
3. Check database connection in `.env`
4. Review bot logs for errors

### Webhooks Not Triggering

Currently, webhooks must be tested manually via the web interface. To enable automatic triggers:

1. Implement a webhook dispatcher service
2. Use PostgreSQL NOTIFY/LISTEN or polling
3. Query active webhooks and send HTTP requests
4. Log delivery status to `webhook_logs` table

See SETUP_GUIDE.md for implementation details.

## Contributing

This is a Manus project template. Feel free to customize and extend:

- Add message edit/delete tracking
- Implement automatic webhook triggers
- Add analytics dashboards
- Export functionality (CSV, JSON)
- Full-text search with Elasticsearch

## License

This project is provided as-is for use with Manus platform.

## Support

- **Setup Issues**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Discord.py Docs**: https://discordpy.readthedocs.io/
- **Manus Docs**: https://docs.manus.im/
