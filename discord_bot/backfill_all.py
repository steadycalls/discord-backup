#!/usr/bin/env python3
"""
Automated Bulk Backfill Script
Fetches messages from the last 30 days across all channels in specified guilds.
"""

import asyncio
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import discord
from discord.ext import commands

from db import (
    upsert_user,
    upsert_guild,
    upsert_channel,
    insert_message,
    insert_attachments,
)

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
DAYS_TO_BACKFILL = 30  # Number of days to fetch messages from

# Configure intents
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name} (ID: {bot.user.id})")
    print("------")
    print(f"Starting bulk backfill for last {DAYS_TO_BACKFILL} days...")
    print()

    # Calculate the cutoff date
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=DAYS_TO_BACKFILL)
    print(f"Fetching messages from {cutoff_date.strftime('%Y-%m-%d %H:%M:%S UTC')} onwards")
    print()

    total_messages = 0
    total_channels = 0

    # Process all guilds
    for guild in bot.guilds:
        print(f"Processing guild: {guild.name} (ID: {guild.id})")
        upsert_guild(guild)

        # Get all text channels
        text_channels = [ch for ch in guild.channels if isinstance(ch, discord.TextChannel)]
        print(f"  Found {len(text_channels)} text channels")

        for channel in text_channels:
            try:
                print(f"  Backfilling #{channel.name}...", end=" ", flush=True)
                upsert_channel(channel)

                channel_message_count = 0

                # Fetch messages from newest to oldest until we hit the cutoff date
                async for message in channel.history(limit=None, oldest_first=False):
                    # Stop if message is older than cutoff date
                    if message.created_at < cutoff_date:
                        break

                    # Skip messages without a guild (shouldn't happen in text channels)
                    if message.guild is None:
                        continue

                    # Upsert user and guild data
                    upsert_user(message.author)

                    # Create message data dictionary
                    raw_data = {
                        "id": str(message.id),
                        "content": message.content,
                        "author": {
                            "id": str(message.author.id),
                            "name": message.author.name,
                            "discriminator": getattr(message.author, "discriminator", None),
                            "bot": message.author.bot,
                        },
                        "channel_id": str(message.channel.id),
                        "guild_id": str(message.guild.id) if message.guild else None,
                        "created_at": message.created_at.isoformat(),
                        "edited_at": message.edited_at.isoformat() if message.edited_at else None,
                        "pinned": message.pinned,
                        "tts": message.tts,
                        "mention_everyone": message.mention_everyone,
                        "mentions": [str(u.id) for u in message.mentions],
                        "attachments": [
                            {
                                "id": str(a.id),
                                "filename": a.filename,
                                "url": a.url,
                                "size": a.size,
                                "content_type": a.content_type,
                            }
                            for a in message.attachments
                        ],
                    }

                    # Insert message and attachments
                    insert_message(message, raw_data)
                    insert_attachments(message)

                    channel_message_count += 1

                    # Progress indicator every 100 messages
                    if channel_message_count % 100 == 0:
                        print(f"{channel_message_count}...", end=" ", flush=True)

                    # Small delay to avoid rate limits
                    if channel_message_count % 50 == 0:
                        await asyncio.sleep(0.5)

                print(f"✓ {channel_message_count} messages")
                total_messages += channel_message_count
                total_channels += 1

            except discord.Forbidden:
                print(f"✗ No access to #{channel.name}")
            except discord.HTTPException as e:
                print(f"✗ HTTP error: {e}")
            except Exception as e:
                print(f"✗ Error: {e}")

        print()

    print("=" * 60)
    print(f"Backfill complete!")
    print(f"  Guilds processed: {len(bot.guilds)}")
    print(f"  Channels backfilled: {total_channels}")
    print(f"  Total messages archived: {total_messages}")
    print(f"  Date range: {cutoff_date.strftime('%Y-%m-%d')} to {datetime.now(timezone.utc).strftime('%Y-%m-%d')}")
    print("=" * 60)

    # Close the bot after backfill is complete
    await bot.close()


if __name__ == "__main__":
    if not TOKEN:
        print("Error: DISCORD_TOKEN not found in .env file")
        exit(1)

    print("Starting Discord bot for bulk backfill...")
    print(f"This will fetch messages from the last {DAYS_TO_BACKFILL} days")
    print()

    bot.run(TOKEN)
