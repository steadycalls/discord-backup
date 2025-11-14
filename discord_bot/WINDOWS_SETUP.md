# Discord Bot Setup for Windows

This guide will help you set up the Discord bot on Windows.

## Prerequisites

Before starting, make sure you have:

1. **Python 3.10 or higher** installed
   - Download from: https://www.python.org/downloads/
   - ⚠️ During installation, check **"Add Python to PATH"**
   - Verify: Open PowerShell and run `python --version`

2. **Discord Bot Token**
   - See `GET_DISCORD_TOKEN.md` for detailed instructions
   - Or follow the quick steps below

## Quick Setup Steps

### Step 1: Navigate to the discord_bot folder

Open PowerShell and navigate to the discord_bot directory:

```powershell
cd discord_bot
```

### Step 2: Run the installation script

```powershell
.\install.ps1
```

If you get an error about execution policy, run this first:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try `.\install.ps1` again.

### Step 3: Edit the .env file

Open the `.env` file in Notepad or your favorite text editor:

```powershell
notepad .env
```

You'll see:

```env
DISCORD_TOKEN=your_discord_bot_token_here
DATABASE_URL=mysql://...
```

**Replace `your_discord_bot_token_here` with your actual Discord bot token.**

The `DATABASE_URL` should already be filled in from the Manus project.

Save and close the file.

### Step 4: Activate the virtual environment

```powershell
.\venv\Scripts\Activate.ps1
```

You should see `(venv)` appear at the start of your command prompt.

### Step 5: Run the bot

```powershell
python bot.py
```

You should see:

```
Logged in as YourBot (ID: 123456789)
------
Synced X guilds and their channels to database
```

🎉 **Your bot is now running!**

## Getting Your Discord Bot Token (Quick Version)

1. Go to https://discord.com/developers/applications
2. Click "New Application" → Give it a name → Create
3. Click "Bot" in sidebar → "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - ✅ **MESSAGE CONTENT INTENT** (required!)
   - ✅ SERVER MEMBERS INTENT (optional)
5. Click "Reset Token" → Copy the token
6. Paste it in your `.env` file

## Inviting the Bot to Your Server

1. In Discord Developer Portal, go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select permissions:
   - Read Messages/View Channels
   - Read Message History
   - Send Messages
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

## Using the Bot

### Archive New Messages

The bot automatically archives all new messages in channels it can see.

### Backfill Historical Messages

In Discord, type:

```
!backfill          # All messages in the channel
!backfill 1000     # Last 1000 messages
```

**Note:** You need Administrator permission to use the backfill command.

## Troubleshooting

### "python is not recognized"

**Problem:** Python is not in your PATH.

**Solution:**
1. Reinstall Python from https://www.python.org/downloads/
2. During installation, check **"Add Python to PATH"**
3. Restart PowerShell

### "Execution policy" error

**Problem:** PowerShell script execution is disabled.

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Bot doesn't start

**Problem:** Missing dependencies or wrong Python version.

**Solution:**
1. Check Python version: `python --version` (should be 3.10+)
2. Reinstall dependencies:
   ```powershell
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

### Bot can't read messages

**Problem:** MESSAGE_CONTENT_INTENT not enabled.

**Solution:**
1. Go to Discord Developer Portal
2. Select your application → Bot
3. Enable "MESSAGE CONTENT INTENT"
4. Save changes
5. Restart the bot

### "Improper token has been passed"

**Problem:** Discord token is incorrect or has extra spaces.

**Solution:**
1. Open `.env` file
2. Make sure there are no spaces around the token
3. Verify the token in Discord Developer Portal
4. If needed, reset the token and update `.env`

## Running the Bot in Background

### Option 1: Keep PowerShell window open

Just minimize the PowerShell window. The bot will run as long as the window is open.

### Option 2: Use Windows Task Scheduler

1. Create a batch file `run_bot.bat`:
   ```batch
   @echo off
   cd C:\path\to\discord_bot
   call venv\Scripts\activate.bat
   python bot.py
   ```

2. Open Task Scheduler
3. Create Basic Task
4. Set trigger (e.g., "At startup")
5. Set action: Start a program → Select `run_bot.bat`

### Option 3: Use NSSM (Non-Sucking Service Manager)

1. Download NSSM: https://nssm.cc/download
2. Extract and run:
   ```powershell
   nssm install DiscordBot
   ```
3. Set path to `python.exe` and arguments: `C:\path\to\discord_bot\bot.py`
4. Set startup directory: `C:\path\to\discord_bot`
5. Install and start the service

## Viewing Archived Messages

Once the bot is running and archiving messages:

1. Go to your Manus project URL
2. Click "Browse Messages"
3. Filter by guild, channel, or search content

## Managing Webhooks

1. Sign in to the web interface
2. Go to "Manage Webhooks"
3. Create webhooks to receive notifications when messages are archived

## Need More Help?

- Full setup guide: `SETUP_GUIDE.md`
- Discord token guide: `GET_DISCORD_TOKEN.md`
- Discord.py docs: https://discordpy.readthedocs.io/
- Manus docs: https://docs.manus.im/
