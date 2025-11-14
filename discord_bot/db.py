# db.py
import os
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True


def upsert_user(user):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO discord_users (id, username, discriminator, global_name, bot, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                username = VALUES(username),
                discriminator = VALUES(discriminator),
                global_name = VALUES(global_name),
                bot = VALUES(bot);
            """,
            (
                str(user.id),
                user.name,
                getattr(user, "discriminator", None),
                getattr(user, "global_name", None),
                1 if user.bot else 0,
                user.created_at,
            ),
        )


def upsert_guild(guild):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO discord_guilds (id, name, icon_url, created_at)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                icon_url = VALUES(icon_url);
            """,
            (
                str(guild.id),
                guild.name,
                str(guild.icon.url) if guild.icon else None,
                guild.created_at,
            ),
        )


def upsert_channel(channel):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO discord_channels (id, guild_id, name, type, created_at)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                type = VALUES(type);
            """,
            (
                str(channel.id),
                str(channel.guild.id),
                channel.name,
                str(channel.type),
                channel.created_at,
            ),
        )


def insert_message(message, raw_data):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO discord_messages (
                id, channel_id, guild_id, author_id,
                content, created_at, edited_at,
                is_pinned, is_tts, raw_json
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE id=id;
            """,
            (
                str(message.id),
                str(message.channel.id),
                str(message.guild.id),
                str(message.author.id),
                message.content,
                message.created_at,
                message.edited_at,
                1 if message.pinned else 0,
                1 if message.tts else 0,
                Json(raw_data),
            ),
        )


def insert_attachments(message):
    if not message.attachments:
        return

    with conn.cursor() as cur:
        for a in message.attachments:
            cur.execute(
                """
                INSERT INTO discord_attachments (
                    id, message_id, url, filename, content_type, size_bytes
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE id=id;
                """,
                (
                    str(a.id),
                    str(message.id),
                    a.url,
                    a.filename,
                    a.content_type,
                    a.size,
                ),
            )
