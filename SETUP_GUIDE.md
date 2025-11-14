# Discord Archive Setup Guide

This guide walks you through setting up the complete Discord to PostgreSQL message archive system with webhook management.

## System Overview

The Discord Archive system consists of three main components:

1. **Discord Bot (Python)**: Connects to Discord, listens for messages, and writes them to the database
2. **Database (MySQL/TiDB)**: Stores Discord messages, users, channels, guilds, and webhook configurations
3. **Web Interface (React + tRPC)**: Provides a UI for browsing messages and managing webhooks

## Prerequisites

Before you begin, ensure you have:

- **Database**: MySQL 8.0+ or TiDB (already configured in this Manus project)
- **Python 3.10+**: For running the Discord bot
- **Discord Bot**: Created in Discord Developer Portal with proper permissions
- **Node.js 18+**: For the web interface (already set up in this project)

## Part 1: Discord Bot Setup

### Step 1: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Navigate to the "Bot" tab and click "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - **MESSAGE CONTENT INTENT** (required to read message text)
   - SERVER MEMBERS INTENT (optional but useful)
   - PRESENCE INTENT (optional)
5. Copy the bot token (you'll need this later)

### Step 2: Invite Bot to Your Server

1. In Discord Developer Portal, go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select bot permissions:
   - Read Messages/View Channels
   - Read Message History
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

### Step 3: Configure Bot Environment

1. Navigate to the Discord bot directory:
   ```bash
   cd discord_bot
   ```

2. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

3. Edit `.env` and add your credentials:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   DATABASE_URL=mysql://username:password@host:port/database_name
   ```

   **Note**: Get the `DATABASE_URL` from the Manus project dashboard under Settings → Database.

### Step 4: Install Python Dependencies

```bash
# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 5: Run the Discord Bot

```bash
python bot.py
```

You should see:
```
Logged in as YourBot (ID: 123456789)
------
Synced X guilds and their channels to database
```

The bot is now running and will automatically archive new messages!

### Step 6: Backfill Historical Messages (Optional)

To import existing messages from a channel:

1. In Discord, go to the channel you want to backfill
2. Type: `!backfill` (for all messages) or `!backfill 1000` (for last 1000 messages)
3. Wait for the bot to complete the backfill

**Note**: Backfilling large channels can take time. The bot will log progress every 1000 messages.

## Part 2: Web Interface Setup

The web interface is already set up in this Manus project. You can access it at the project URL.

### Features Available:

1. **Home Page** (`/`): Overview and navigation
2. **Message Browser** (`/messages`): Search and filter archived Discord messages
3. **Webhook Management** (`/webhooks`): Create and manage webhooks (requires login)
4. **Webhook Logs** (`/webhook-logs`): View webhook delivery history

### Using the Web Interface:

1. **Browse Messages**: Visit `/messages` to search through archived Discord messages
   - Filter by guild, channel, or search content
   - Pagination support for large datasets

2. **Manage Webhooks**: Visit `/webhooks` (requires authentication)
   - Click "Create Webhook" to add a new webhook
   - Configure event types: `message_insert`, `message_update`, `message_delete`, or `all`
   - Optional filters: guild ID, channel ID
   - Test webhooks before deploying

3. **Monitor Deliveries**: Visit `/webhook-logs` to see webhook delivery status
   - Success/failure status
   - HTTP status codes
   - Error messages for failed deliveries

## Part 3: Webhook System

### How Webhooks Work

When configured, the system will send HTTP POST requests to your webhook URLs when Discord message events occur.

### Webhook Payload Format

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

### Setting Up Webhook Triggers (Advanced)

Currently, webhooks are triggered manually via the "Test" button. To enable automatic webhook triggers on database events, you need to implement a webhook dispatcher service.

**Option 1: PostgreSQL NOTIFY/LISTEN (Recommended)**

Create a background service that:
1. Listens to PostgreSQL NOTIFY events
2. Queries active webhooks from the database
3. Sends HTTP POST requests to webhook URLs
4. Logs delivery status

**Option 2: Application-Level Triggers**

Modify the Discord bot to call webhook endpoints directly after inserting messages.

## Part 4: Database Schema

The system uses the following tables:

### Discord Data Tables:
- `discord_guilds`: Discord servers
- `discord_channels`: Text channels
- `discord_users`: Discord users
- `discord_messages`: Message content and metadata
- `discord_attachments`: File attachments

### Webhook Management Tables:
- `webhooks`: Webhook configurations
- `webhook_logs`: Delivery history

### Authentication Tables:
- `users`: Web application users (Manus OAuth)

## Troubleshooting

### Bot Not Connecting

**Error**: `discord.errors.LoginFailure: Improper token has been passed`

**Solution**: Check that your `DISCORD_TOKEN` in `.env` is correct and has no extra spaces.

### Bot Can't Read Messages

**Error**: Bot joins but doesn't archive messages

**Solution**: Ensure MESSAGE CONTENT INTENT is enabled in Discord Developer Portal.

### Database Connection Failed

**Error**: `psycopg2.OperationalError: could not connect to server`

**Solution**: 
- Verify `DATABASE_URL` is correct
- Check that the database is accessible from your network
- For Manus projects, get the connection string from the dashboard

### Messages Not Appearing in Web Interface

**Possible causes**:
1. Bot is not running
2. Bot doesn't have permission to read the channel
3. Database connection issue

**Solution**: Check bot logs and verify it's successfully inserting messages.

## Production Deployment

### Running the Bot as a Service

**Using systemd (Linux)**:

1. Create `/etc/systemd/system/discord-archive-bot.service`:
   ```ini
   [Unit]
   Description=Discord Archive Bot
   After=network.target

   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/discord_archive/discord_bot
   Environment="PATH=/path/to/venv/bin"
   ExecStart=/path/to/venv/bin/python bot.py
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

2. Enable and start:
   ```bash
   sudo systemctl enable discord-archive-bot
   sudo systemctl start discord-archive-bot
   ```

**Using Docker**:

Create `Dockerfile` in `discord_bot/`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "bot.py"]
```

Run:
```bash
docker build -t discord-archive-bot .
docker run -d --env-file .env discord-archive-bot
```

### Web Interface Deployment

The web interface is already deployed on Manus. To deploy elsewhere:

1. Build the production bundle:
   ```bash
   pnpm build
   ```

2. Deploy the `dist` folder to your hosting provider

## Security Considerations

1. **Never commit `.env` files**: Keep tokens and passwords secret
2. **Use HTTPS for webhooks**: Protect webhook payloads in transit
3. **Validate webhook signatures**: Implement HMAC signatures for webhook security
4. **Rate limit webhooks**: Prevent abuse of your webhook endpoints
5. **Restrict database access**: Use read-only credentials where possible

## Next Steps

- Implement automatic webhook triggers using PostgreSQL NOTIFY/LISTEN
- Add message edit and delete tracking
- Create analytics dashboards for message statistics
- Export message data to CSV/JSON
- Add full-text search with Elasticsearch

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Discord.py documentation: https://discordpy.readthedocs.io/
- Check Manus documentation: https://docs.manus.im/
