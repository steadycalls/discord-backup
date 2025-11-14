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
    raw_data = message.to_dict()
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

        raw_data = msg.to_dict()
        insert_message(msg, raw_data)
        insert_attachments(msg)
        count += 1

        if count % 1000 == 0:
            print(f"Backfilled {count} messages in #{channel.name}")

    await ctx.send(f"Backfill complete for #{ctx.channel.name}. Total: {count} messages.")


bot.run(TOKEN)
