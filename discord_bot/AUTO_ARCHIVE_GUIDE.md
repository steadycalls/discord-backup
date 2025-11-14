# Auto-Archive Inactive Channels Guide

This script automatically moves Discord channels to the "Archive/Deleted Channels" category if they haven't had any messages for 30+ days.

## What It Does

The `auto_archive_channels.py` script will:
- ✅ Check all text channels in your Discord server
- ✅ Find the last message date in each channel
- ✅ Move channels with no messages in the last 30 days to the Archive category
- ✅ Send a notification message to the MCP channel mentioning Evan
- ✅ Skip channels already in the Archive category
- ✅ Show detailed progress as it runs
- ✅ Handle rate limits automatically

## Prerequisites

1. **Bot token configured** - Same `.env` file as the main bot
2. **Bot permissions** - The bot needs "Manage Channels" permission
3. **Archive category exists** - Category ID: `688116533553266759`

## How to Run

### On Windows (PowerShell)

```powershell
# Navigate to the discord_bot folder
cd C:\path\to\discord-backup\discord_bot

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run the auto-archive script
python auto_archive_channels.py
```

### On Linux/Mac

```bash
# Navigate to the discord_bot folder
cd /path/to/discord-backup/discord_bot

# Activate virtual environment
source venv/bin/activate

# Run the auto-archive script
python auto_archive_channels.py
```

## What You'll See

```
Starting Discord bot for auto-archiving inactive channels...

Logged in as YourBot (ID: 123456789)
------
Auto-Archive Script - Moving channels inactive for 30+ days

Cutoff date: 2025-10-14 19:30:00 UTC
Channels with no messages since this date will be archived.

Processing guild: Restoration Inbound (ID: 123456789)
  ✓ Archive category found: Archive/Deleted Channels

  Checking 25 channels for inactivity...

  Checking #general... Active (2 days since last message)
  Checking #old-project... Inactive for 45 days → Moving to archive... ✓ Archived
  Checking #announcements... Active (5 days since last message)
  Checking #abandoned-channel... Inactive for 60 days → Moving to archive... ✓ Archived
  ...

============================================================
Auto-Archive complete!
  Channels checked: 25
  Channels archived: 3
  Inactivity threshold: 30 days
============================================================
```

## Customizing the Inactivity Period

To change the number of days before archiving, edit `auto_archive_channels.py`:

```python
INACTIVITY_DAYS = 30  # Change this number
```

Examples:
- `INACTIVITY_DAYS = 14` - Archive after 2 weeks
- `INACTIVITY_DAYS = 60` - Archive after 2 months
- `INACTIVITY_DAYS = 90` - Archive after 3 months

## Customizing Notifications

To change who gets notified or which channel receives notifications:

```python
NOTIFICATION_CHANNEL_ID = 1382205920502743110  # Change to your channel ID
NOTIFY_USER_ID = 170328940798279689  # Change to the user ID to mention
```

**How to find IDs:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click on the channel or user
3. Click "Copy ID"

## Changing the Archive Category

If you want to use a different category, update the category ID:

```python
ARCHIVE_CATEGORY_ID = 688116533553266759  # Replace with your category ID
```

**How to find a category ID:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click on the category
3. Click "Copy ID"

## Important Notes

### Bot Permissions Required
- **Manage Channels** - To move channels between categories
- **Read Message History** - To check the last message date

### Channels That Won't Be Moved
- Channels already in the Archive category
- Channels the bot doesn't have access to
- Voice channels (script only processes text channels)

### Safety Features
- **Dry run option** - You can modify the script to preview changes without moving channels
- **No deletion** - Channels are only moved, never deleted
- **Reversible** - You can manually move channels back if needed

### Rate Limits
- The script includes 1-second delays between channel moves
- Discord allows ~50 channel edits per 10 seconds
- For large servers, the script may take a few minutes

## Running on a Schedule

### Windows Task Scheduler

1. Open Task Scheduler
2. Create a new task
3. Set trigger (e.g., weekly on Sunday at 2 AM)
4. Set action:
   - Program: `C:\path\to\discord-backup\discord_bot\venv\Scripts\python.exe`
   - Arguments: `auto_archive_channels.py`
   - Start in: `C:\path\to\discord-backup\discord_bot`

### Linux Cron Job

```bash
# Edit crontab
crontab -e

# Add this line to run every Sunday at 2 AM
0 2 * * 0 cd /path/to/discord-backup/discord_bot && ./venv/bin/python auto_archive_channels.py
```

## Troubleshooting

### "Archive category not found"
**Solution:** Verify the category ID is correct. Enable Developer Mode in Discord, right-click the category, and copy the ID.

### "No permission to move channel"
**Solution:** Grant the bot "Manage Channels" permission in Server Settings → Roles.

### "No messages found (empty or no access)"
**Solution:** 
- The channel might be empty (never had messages)
- The bot might not have "Read Message History" permission

### Script moves too many channels
**Solution:** Increase `INACTIVITY_DAYS` to a higher number (e.g., 60 or 90 days)

## Dry Run Mode (Preview Only)

To preview which channels would be archived without actually moving them, edit the script and comment out the move command:

```python
# await channel.edit(category=archive_category)
print(f"[DRY RUN] Would archive this channel")
```

Run the script to see what would happen, then uncomment the line to actually move channels.

## Unarchiving Channels

To move a channel back from the archive:
1. Go to Discord
2. Drag the channel from "Archive/Deleted Channels" to another category
3. Or right-click → Edit Channel → Category → Select a different category

## Best Practices

1. **Run weekly** - Keep your server organized automatically
2. **Review before archiving** - Use dry run mode first if unsure
3. **Communicate with team** - Let people know inactive channels will be archived
4. **Set appropriate threshold** - 30 days works for most servers, but adjust as needed
