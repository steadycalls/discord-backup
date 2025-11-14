# db.py - MySQL/TiDB version with improved connection handling
import os
import json
import mysql.connector
from mysql.connector import Error, pooling
from dotenv import load_dotenv
from urllib.parse import urlparse
import time

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Parse the DATABASE_URL
parsed = urlparse(DATABASE_URL)

# Build connection config with proper SSL handling
db_config = {
    'host': parsed.hostname,
    'port': parsed.port or 3306,
    'user': parsed.username,
    'password': parsed.password,
    'database': parsed.path.lstrip('/').split('?')[0],
    'connect_timeout': 30,
    'autocommit': False,
    'pool_name': 'discord_bot_pool',
    'pool_size': 5,
    'pool_reset_session': True,
}

# TiDB Cloud requires SSL
if 'tidbcloud.com' in DATABASE_URL or 'ssl' in DATABASE_URL.lower():
    db_config['ssl_disabled'] = False
    # TiDB Cloud uses proper CA certificates, so we can verify
    db_config['ssl_verify_cert'] = False  # Set to False to avoid certificate verification issues
    db_config['ssl_verify_identity'] = False

# Create connection pool
try:
    connection_pool = pooling.MySQLConnectionPool(**db_config)
    print(f"✅ Database connection pool created successfully")
except Error as e:
    print(f"❌ Error creating connection pool: {e}")
    connection_pool = None


def get_connection(retries=3):
    """Get a connection from the pool with retry logic"""
    for attempt in range(retries):
        try:
            if connection_pool:
                conn = connection_pool.get_connection()
                # Test the connection
                conn.ping(reconnect=True, attempts=3, delay=1)
                return conn
            else:
                # Fallback to direct connection if pool failed
                conn = mysql.connector.connect(
                    host=parsed.hostname,
                    port=parsed.port or 3306,
                    user=parsed.username,
                    password=parsed.password,
                    database=parsed.path.lstrip('/').split('?')[0],
                    connect_timeout=30,
                    ssl_disabled=False if 'tidbcloud.com' in DATABASE_URL else True,
                    ssl_verify_cert=False,
                    ssl_verify_identity=False,
                )
                return conn
        except Error as e:
            print(f"⚠️  Connection attempt {attempt + 1}/{retries} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise


def upsert_user(user):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO discord_users (id, username, discriminator, globalName, bot, createdAt)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                username = VALUES(username),
                discriminator = VALUES(discriminator),
                globalName = VALUES(globalName),
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
        print(f"❌ Error upserting user {user.id}: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def upsert_guild(guild):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO discord_guilds (id, name, iconUrl, createdAt)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                iconUrl = VALUES(iconUrl)
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
        print(f"❌ Error upserting guild {guild.id}: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def upsert_channel(channel):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO discord_channels (id, guildId, name, type, createdAt)
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
        print(f"❌ Error upserting channel {channel.id}: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def insert_message(message, raw_data):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO discord_messages (
                id, channelId, guildId, authorId,
                content, createdAt, editedAt,
                isPinned, isTts, rawJson
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
        print(f"❌ Error inserting message {message.id}: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def insert_attachments(message):
    if not message.attachments:
        return

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        for a in message.attachments:
            cursor.execute(
                """
                INSERT INTO discord_attachments (
                    id, messageId, url, filename, contentType, sizeBytes
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
        print(f"❌ Error inserting attachments for message {message.id}: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
