# How to Get Your Discord Bot Token

Follow these steps to create a Discord bot and get your token:

## Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click the **"New Application"** button (top right)
3. Enter a name for your application (e.g., "Message Archive Bot")
4. Click **"Create"**

## Step 2: Create Bot User

1. In your application, click **"Bot"** in the left sidebar
2. Click **"Add Bot"** button
3. Click **"Yes, do it!"** to confirm

## Step 3: Get Bot Token

1. Under the "TOKEN" section, click **"Reset Token"**
2. Click **"Yes, do it!"** to confirm
3. **Copy the token** - this is your `DISCORD_TOKEN`
   - ⚠️ **IMPORTANT**: Save this token securely! You won't be able to see it again
   - If you lose it, you'll need to reset the token

## Step 4: Enable Privileged Intents

Scroll down to **"Privileged Gateway Intents"** and enable:

- ✅ **MESSAGE CONTENT INTENT** (Required - allows bot to read message text)
- ✅ **SERVER MEMBERS INTENT** (Optional but recommended)
- ✅ **PRESENCE INTENT** (Optional)

Click **"Save Changes"** at the bottom

## Step 5: Generate Invite Link

1. Click **"OAuth2"** → **"URL Generator"** in the left sidebar
2. Under **"SCOPES"**, select:
   - ✅ `bot`
3. Under **"BOT PERMISSIONS"**, select:
   - ✅ Read Messages/View Channels
   - ✅ Read Message History
   - ✅ Send Messages (for backfill command responses)
4. Copy the **Generated URL** at the bottom

## Step 6: Invite Bot to Your Server

1. Paste the generated URL in your browser
2. Select the server you want to add the bot to
3. Click **"Authorize"**
4. Complete the CAPTCHA if prompted

## Step 7: Update .env File

Now that you have your token, update the `.env` file:

```bash
# Edit the .env file
nano .env
```

Replace `your_discord_bot_token_here` with your actual token:

```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GaBcDe.FgHiJkLmNoPqRsTuVwXyZ1234567890
```

**Save and exit** (Ctrl+X, then Y, then Enter)

## Verify Configuration

Your `.env` file should now look like:

```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GaBcDe.FgHiJkLmNoPqRsTuVwXyZ1234567890
DATABASE_URL=mysql://username:password@host:port/database
```

## Security Notes

⚠️ **Keep your token secret!**
- Never share your bot token publicly
- Never commit `.env` files to Git
- If your token is exposed, reset it immediately in the Developer Portal

## Next Steps

Once your `.env` file is configured:

1. Install Python dependencies: `pip install -r requirements.txt`
2. Run the bot: `python bot.py`
3. Check that the bot appears online in your Discord server
4. Test by sending a message in a channel the bot can see
5. Check the web interface at `/messages` to see archived messages

## Troubleshooting

**Bot shows offline:**
- Check that your token is correct (no extra spaces)
- Verify the bot is invited to your server
- Check the bot logs for error messages

**Bot can't read messages:**
- Ensure MESSAGE CONTENT INTENT is enabled
- Verify bot has "Read Messages/View Channels" permission
- Check channel-specific permissions

**Need help?**
- Discord Developer Docs: https://discord.com/developers/docs
- discord.py Documentation: https://discordpy.readthedocs.io/
