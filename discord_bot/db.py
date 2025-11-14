# db.py - MySQL/TiDB version
import os
import json
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Parse the DATABASE_URL
parsed = urlparse(DATABASE_URL)
db_config = {
    'host': parsed.hostname,
    'port': parsed.port or 3306,
    'user': parsed.username,
    'password': parsed.password,
    'database': parsed.path.lstrip('/').split('?')[0],
}

# Check if SSL is required
if '?' in DATABASE_URL and 'ssl' in DATABASE_URL:
    db_config['ssl_disabled'] = False
else:
    db_config['ssl_disabled'] = True

def get_connection():
    """Get a new database connection"""
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except Error as e:
        print(f"Error connecting to database: {e}")
        raise


def upsert_user(user):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO discord_users (id, username, discriminator, global_name, bot, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                username = VALUES(username),
                discriminator = VALUES(discriminator),
                global_name = VALUES(global_name),
                bot = VALUES(bot)
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
        conn.commit()
    except Error as e:
        print(f"Error upserting user: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


def upsert_guild(guild):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO discord_guilds (id, name, icon_url, created_at)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                icon_url = VALUES(icon_url)
            """,
            (
                str(guild.id),
                guild.name,
                str(guild.icon.url) if guild.icon else None,
                guild.created_at,
            ),
        )
        conn.commit()
    except Error as e:
        print(f"Error upserting guild: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


def upsert_channel(channel):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO discord_channels (id, guild_id, name, type, created_at)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                type = VALUES(type)
            """,
            (
                str(channel.id),
                str(channel.guild.id),
                channel.name,
                str(channel.type),
                channel.created_at,
            ),
        )
        conn.commit()
    except Error as e:
        print(f"Error upserting channel: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


def insert_message(message, raw_data):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO discord_messages (
                id, channel_id, guild_id, author_id,
                content, created_at, edited_at,
                is_pinned, is_tts, raw_json
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE id=id
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
                json.dumps(raw_data),
            ),
        )
        conn.commit()
    except Error as e:
        print(f"Error inserting message: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


def insert_attachments(message):
    if not message.attachments:
        return

    conn = get_connection()
    cursor = conn.cursor()
    try:
        for a in message.attachments:
            cursor.execute(
                """
                INSERT INTO discord_attachments (
                    id, message_id, url, filename, content_type, size_bytes
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE id=id
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
        conn.commit()
    except Error as e:
        print(f"Error inserting attachments: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
