#!/usr/bin/env python3
"""
Auto-Archive Inactive Channels Script
Automatically moves channels with no messages in the last 30 days to the Archive category.
"""

import asyncio
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import discord
from discord.ext import commands

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
ARCHIVE_CATEGORY_ID = 688116533553266759  # Archive/Deleted Channels category
INACTIVITY_DAYS = 30  # Number of days of inactivity before archiving

# Configure intents
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=intents)


async def get_last_message_date(channel):
    """Get the timestamp of the last message in a channel."""
    try:
        # Fetch the most recent message
        async for message in channel.history(limit=1):
            return message.created_at
        # No messages found
        return None
    except discord.Forbidden:
        print(f"    ✗ No access to read messages in #{channel.name}")
        return None
    except Exception as e:
        print(f"    ✗ Error reading #{channel.name}: {e}")
        return None


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name} (ID: {bot.user.id})")
    print("------")
    print(f"Auto-Archive Script - Moving channels inactive for {INACTIVITY_DAYS}+ days")
    print()

    # Calculate the cutoff date
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=INACTIVITY_DAYS)
    print(f"Cutoff date: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"Channels with no messages since this date will be archived.")
    print()

    total_archived = 0
    total_checked = 0

    # Process all guilds
    for guild in bot.guilds:
        print(f"Processing guild: {guild.name} (ID: {guild.id})")

        # Get the archive category
        archive_category = guild.get_channel(ARCHIVE_CATEGORY_ID)
        if not archive_category:
            print(f"  ✗ Archive category (ID: {ARCHIVE_CATEGORY_ID}) not found in this guild")
            print(f"  Skipping guild: {guild.name}")
            print()
            continue

        if not isinstance(archive_category, discord.CategoryChannel):
            print(f"  ✗ Channel {ARCHIVE_CATEGORY_ID} is not a category")
            print(f"  Skipping guild: {guild.name}")
            print()
            continue

        print(f"  ✓ Archive category found: {archive_category.name}")
        print()

        # Get all text channels (excluding those already in the archive category)
        text_channels = [
            ch for ch in guild.channels
            if isinstance(ch, discord.TextChannel) and ch.category_id != ARCHIVE_CATEGORY_ID
        ]

        print(f"  Checking {len(text_channels)} channels for inactivity...")
        print()

        for channel in text_channels:
            total_checked += 1
            print(f"  Checking #{channel.name}...", end=" ", flush=True)

            # Get the last message date
            last_message_date = await get_last_message_date(channel)

            if last_message_date is None:
                # No messages found - channel is empty or inaccessible
                print(f"No messages found (empty or no access)")
                continue

            # Calculate days since last message
            days_inactive = (datetime.now(timezone.utc) - last_message_date).days

            if days_inactive >= INACTIVITY_DAYS:
                print(f"Inactive for {days_inactive} days → Moving to archive...", end=" ", flush=True)

                try:
                    # Move channel to archive category
                    await channel.edit(category=archive_category)
                    print(f"✓ Archived")
                    total_archived += 1

                    # Small delay to avoid rate limits
                    await asyncio.sleep(1)

                except discord.Forbidden:
                    print(f"✗ No permission to move channel")
                except discord.HTTPException as e:
                    print(f"✗ HTTP error: {e}")
                except Exception as e:
                    print(f"✗ Error: {e}")
            else:
                print(f"Active ({days_inactive} days since last message)")

        print()

    print("=" * 60)
    print(f"Auto-Archive complete!")
    print(f"  Channels checked: {total_checked}")
    print(f"  Channels archived: {total_archived}")
    print(f"  Inactivity threshold: {INACTIVITY_DAYS} days")
    print("=" * 60)

    # Close the bot after archiving is complete
    await bot.close()


if __name__ == "__main__":
    if not TOKEN:
        print("Error: DISCORD_TOKEN not found in .env file")
        exit(1)

    print("Starting Discord bot for auto-archiving inactive channels...")
    print()

    bot.run(TOKEN)
