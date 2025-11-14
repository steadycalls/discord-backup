# Bulk Backfill Guide

This guide explains how to use the automated bulk backfill script to fetch messages from the last 30 days across all channels.

## What It Does

The `backfill_all.py` script will:
- ✅ Automatically process **all guilds** your bot has access to
- ✅ Fetch messages from **all text channels** in each guild
- ✅ Only fetch messages from the **last 30 days**
- ✅ Skip messages older than the cutoff date
- ✅ Handle rate limits automatically
- ✅ Show progress as it runs
- ✅ Automatically stop when complete

## Prerequisites

1. **Bot must be running** - The script uses the same bot token and database connection
2. **Administrator permissions** - Not required for this script (unlike the `!backfill` command)
3. **Virtual environment activated** - Make sure you're in the Python virtual environment

## How to Run

### On Windows (PowerShell)

```powershell
# Navigate to the discord_bot folder
cd C:\path\to\discord-backup\discord_bot

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run the backfill script
python backfill_all.py
```

### On Linux/Mac

```bash
# Navigate to the discord_bot folder
cd /path/to/discord-backup/discord_bot

# Activate virtual environment
source venv/bin/activate

# Run the backfill script
python backfill_all.py
```

## What You'll See

```
Starting Discord bot for bulk backfill...
This will fetch messages from the last 30 days

Logged in as YourBot (ID: 123456789)
------
Starting bulk backfill for last 30 days...

Fetching messages from 2025-10-14 19:30:00 UTC onwards

Processing guild: Restoration Inbound (ID: 123456789)
  Found 25 text channels
  Backfilling #general... 100... 200... 300... ✓ 342 messages
  Backfilling #announcements... ✓ 15 messages
  Backfilling #support... 100... 200... ✓ 287 messages
  ...

============================================================
Backfill complete!
  Guilds processed: 1
  Channels backfilled: 25
  Total messages archived: 5,432
  Date range: 2025-10-14 to 2025-11-13
============================================================
```

## Customizing the Date Range

To change the number of days to backfill, edit `backfill_all.py`:

```python
DAYS_TO_BACKFILL = 30  # Change this number
```

For example:
- `DAYS_TO_BACKFILL = 7` - Last week
- `DAYS_TO_BACKFILL = 90` - Last 3 months
- `DAYS_TO_BACKFILL = 365` - Last year

## Important Notes

### Rate Limits
- The script includes automatic delays to avoid Discord rate limits
- If you see rate limit errors, the script will slow down automatically
- For very large servers, the backfill may take several hours

### Duplicate Messages
- The script uses `ON DUPLICATE KEY UPDATE` in the database
- Running the script multiple times is safe - it won't create duplicates
- Existing messages will be updated if they've been edited

### Bot Permissions
- The bot must have "Read Message History" permission in each channel
- Channels the bot can't access will be skipped with a message

### Stopping the Script
- Press `Ctrl+C` to stop the script at any time
- Already-archived messages will remain in the database
- You can resume by running the script again

## Troubleshooting

### "No access to #channel-name"
**Solution:** Grant the bot "Read Message History" permission for that channel

### "HTTP error: 429"
**Solution:** Discord rate limit hit. The script will automatically slow down. Wait a few minutes and try again.

### "Error: DISCORD_TOKEN not found"
**Solution:** Make sure your `.env` file exists and contains your Discord bot token

### Script runs but no messages appear
**Solution:** 
1. Check that messages in those channels are less than 30 days old
2. Verify the bot has access to the channels
3. Check your web interface at `/messages` to see if they're there

## After Backfilling

Once the script completes:
1. Go to your web interface: `/messages`
2. Select "Restoration Inbound" guild
3. Browse through channels to see archived messages
4. Use the search feature to find specific content

## Running Regularly

To keep your archive up-to-date, you can:
1. **Keep the main bot running** - It will archive new messages automatically
2. **Run this script weekly** - To catch any missed messages
3. **Set up a scheduled task** - See `WINDOWS_SETUP.md` for automation options
