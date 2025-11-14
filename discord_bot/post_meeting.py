#!/usr/bin/env python3
"""
Post Read.ai meeting summaries to Discord channels
Called by the web server when a Read.ai webhook is received
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import discord
from discord.ext import commands
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

async def post_meeting_summary(meeting_data):
    """Post a meeting summary to a Discord channel"""
    
    # Create bot with minimal intents
    intents = discord.Intents.default()
    intents.message_content = True
    bot = commands.Bot(command_prefix="!", intents=intents)
    
    @bot.event
    async def on_ready():
        try:
            print(f"Bot connected as {bot.user}")
            
            # Get the channel
            channel_id = int(meeting_data["channel_id"])
            channel = bot.get_channel(channel_id)
            
            if not channel:
                print(f"Error: Channel {channel_id} not found")
                await bot.close()
                return
            
            # Build the message
            title = meeting_data.get("title", "Meeting Summary")
            link = meeting_data.get("link", "")
            summary = meeting_data.get("summary", "")
            participants = meeting_data.get("participants", [])
            
            # Create embed
            embed = discord.Embed(
                title=f"📝 {title}",
                description=summary[:4000] if summary else "No summary available",
                color=discord.Color.blue()
            )
            
            if link:
                embed.add_field(name="🔗 Meeting Link", value=link, inline=False)
            
            if participants:
                # Format participants
                if isinstance(participants, list):
                    if len(participants) > 0:
                        participant_text = ", ".join([
                            p if isinstance(p, str) else p.get("name", "Unknown")
                            for p in participants[:10]  # Limit to 10
                        ])
                        if len(participants) > 10:
                            participant_text += f" and {len(participants) - 10} more"
                        embed.add_field(name="👥 Participants", value=participant_text, inline=False)
            
            embed.set_footer(text="Posted by Read.ai Integration")
            
            # Send the message
            await channel.send(embed=embed)
            print(f"Successfully posted meeting summary to channel {channel_id}")
            
        except Exception as e:
            print(f"Error posting message: {e}")
        finally:
            await bot.close()
    
    # Run the bot
    try:
        await bot.start(DISCORD_TOKEN)
    except Exception as e:
        print(f"Bot error: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python post_meeting.py '<json_data>'")
        sys.exit(1)
    
    try:
        meeting_data = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        sys.exit(1)
    
    # Run async function
    asyncio.run(post_meeting_summary(meeting_data))

if __name__ == "__main__":
    main()
