# bot.py
import os
import json
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db import upsert_user, upsert_guild, upsert_channel, insert_message, insert_attachments

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")
    print("------")

    # Sync basic guild + channel info into DB
    for guild in bot.guilds:
        upsert_guild(guild)
        for channel in guild.text_channels:
            upsert_channel(channel)

    print(f"Synced {len(bot.guilds)} guilds and their channels to database")


@bot.event
async def on_message(message: discord.Message):
    # Avoid infinite loop on bot messages if we ever add commands
    if message.author == bot.user:
        return

    if message.guild is None:
        # Skip DMs for now, easy to add later if desired
        return

    # Ensure related entities are in DB
    upsert_user(message.author)
    upsert_guild(message.guild)
    if isinstance(message.channel, discord.TextChannel):
        upsert_channel(message.channel)

    # Insert message + attachments
    # Create a serializable dictionary of message data
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
    insert_message(message, raw_data)
    insert_attachments(message)

    # Optional: pass through to command handler if using commands
    await bot.process_commands(message)


@bot.command(name="backfill")
@commands.has_permissions(administrator=True)
async def backfill_channel(ctx, limit: int | None = None):
    """Backfill messages for the current channel. limit=None for full history."""
    await ctx.send(f"Starting backfill for #{ctx.channel.name} (limit={limit})...")

    channel = ctx.channel
    count = 0

    async for msg in channel.history(limit=limit, oldest_first=True):
        if msg.guild is None:
            continue

        upsert_user(msg.author)
        upsert_guild(msg.guild)
        if isinstance(msg.channel, discord.TextChannel):
            upsert_channel(msg.channel)

        # Create a serializable dictionary of message data
        raw_data = {
            "id": str(msg.id),
            "content": msg.content,
            "author": {
                "id": str(msg.author.id),
                "name": msg.author.name,
                "discriminator": getattr(msg.author, "discriminator", None),
                "bot": msg.author.bot,
            },
            "channel_id": str(msg.channel.id),
            "guild_id": str(msg.guild.id) if msg.guild else None,
            "created_at": msg.created_at.isoformat(),
            "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
            "pinned": msg.pinned,
            "tts": msg.tts,
            "mention_everyone": msg.mention_everyone,
            "mentions": [str(u.id) for u in msg.mentions],
            "attachments": [
                {
                    "id": str(a.id),
                    "filename": a.filename,
                    "url": a.url,
                    "size": a.size,
                    "content_type": a.content_type,
                }
                for a in msg.attachments
            ],
        }
        insert_message(msg, raw_data)
        insert_attachments(msg)
        count += 1

        if count % 1000 == 0:
            print(f"Backfilled {count} messages in #{channel.name}")

    await ctx.send(f"Backfill complete for #{ctx.channel.name}. Total: {count} messages.")


bot.run(TOKEN)
