import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  discordAttachments,
  discordChannels,
  discordGuilds,
  discordMessages,
  discordUsers,
  InsertWebhook,
  InsertWebhookLog,
  webhookLogs,
  webhooks,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Discord Archive Queries

export async function getDiscordGuilds() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discordGuilds).orderBy(desc(discordGuilds.insertedAt));
}

export async function getDiscordChannels(guildId?: string) {
  const db = await getDb();
  if (!db) return [];
  if (guildId) {
    return db.select().from(discordChannels).where(eq(discordChannels.guildId, guildId));
  }
  return db.select().from(discordChannels).orderBy(desc(discordChannels.insertedAt));
}

export async function getDiscordMessages(filters: {
  guildId?: string;
  channelId?: string;
  authorId?: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { messages: [], total: 0 };

  const conditions = [];
  if (filters.guildId) conditions.push(eq(discordMessages.guildId, filters.guildId));
  if (filters.channelId) conditions.push(eq(discordMessages.channelId, filters.channelId));
  if (filters.authorId) conditions.push(eq(discordMessages.authorId, filters.authorId));
  if (filters.searchText) {
    conditions.push(like(discordMessages.content, `%${filters.searchText}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const messages = await db
    .select({
      message: discordMessages,
      author: discordUsers,
      channel: discordChannels,
      guild: discordGuilds,
    })
    .from(discordMessages)
    .leftJoin(discordUsers, eq(discordMessages.authorId, discordUsers.id))
    .leftJoin(discordChannels, eq(discordMessages.channelId, discordChannels.id))
    .leftJoin(discordGuilds, eq(discordMessages.guildId, discordGuilds.id))
    .where(whereClause)
    .orderBy(desc(discordMessages.createdAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(discordMessages)
    .where(whereClause);

  return { messages, total: countResult?.count || 0 };
}

export async function getMessageAttachments(messageId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discordAttachments).where(eq(discordAttachments.messageId, messageId));
}

// Webhook Management Queries
export async function getWebhooks(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db.select().from(webhooks).where(eq(webhooks.createdBy, userId)).orderBy(desc(webhooks.createdAt));
  }
  return db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
}

export async function getWebhookById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
  return result[0];
}

export async function createWebhook(webhook: InsertWebhook) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(webhooks).values(webhook);
  return Number(result[0].insertId);
}

export async function updateWebhook(id: number, updates: Partial<InsertWebhook>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(webhooks).set(updates).where(eq(webhooks.id, id));
}

export async function deleteWebhook(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(webhooks).where(eq(webhooks.id, id));
}

export async function getWebhookLogs(webhookId?: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  if (webhookId) {
    return db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookId, webhookId))
      .orderBy(desc(webhookLogs.deliveredAt))
      .limit(limit);
  }
  return db.select().from(webhookLogs).orderBy(desc(webhookLogs.deliveredAt)).limit(limit);
}

export async function createWebhookLog(log: InsertWebhookLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookLogs).values(log);
}

export async function getActiveWebhooksForEvent(eventType: string, guildId?: string, channelId?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.isActive, 1),
        or(
          sql`${webhooks.eventType} = ${eventType}`,
          sql`${webhooks.eventType} = 'all'`
        )
      )
    );

  return query;
}
