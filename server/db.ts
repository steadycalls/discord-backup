import { and, desc, eq, like, or, sql, SQL } from "drizzle-orm";
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

  // Fetch attachments for each message
  const messageIds = messages.map(m => m.message.id);
  const attachments = messageIds.length > 0
    ? await db.select().from(discordAttachments).where(sql`${discordAttachments.messageId} IN (${sql.join(messageIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  // Group attachments by message ID
  const attachmentsByMessage = attachments.reduce((acc, att) => {
    if (!acc[att.messageId]) acc[att.messageId] = [];
    acc[att.messageId].push(att);
    return acc;
  }, {} as Record<string, typeof attachments>);

  // Add attachments to messages
  const messagesWithAttachments = messages.map(m => ({
    ...m,
    attachments: attachmentsByMessage[m.message.id] || [],
  }));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(discordMessages)
    .where(whereClause);

  return { messages: messagesWithAttachments, total: countResult?.count || 0 };
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

// AI Chat Queries
export async function getChatConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { chatConversations } = await import("../drizzle/schema");
  return db.select().from(chatConversations).where(eq(chatConversations.userId, userId)).orderBy(desc(chatConversations.updatedAt));
}

export async function getChatConversationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { chatConversations } = await import("../drizzle/schema");
  const result = await db.select().from(chatConversations).where(
    and(eq(chatConversations.id, id), eq(chatConversations.userId, userId))
  ).limit(1);
  return result[0];
}

export async function createChatConversation(userId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { chatConversations } = await import("../drizzle/schema");
  const result = await db.insert(chatConversations).values({ userId, title });
  return Number(result[0].insertId);
}

export async function updateChatConversation(id: number, userId: number, updates: { title?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { chatConversations } = await import("../drizzle/schema");
  await db.update(chatConversations).set(updates).where(
    and(eq(chatConversations.id, id), eq(chatConversations.userId, userId))
  );
}

export async function deleteChatConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { chatConversations } = await import("../drizzle/schema");
  await db.delete(chatConversations).where(
    and(eq(chatConversations.id, id), eq(chatConversations.userId, userId))
  );
}

export async function getChatMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { chatMessages } = await import("../drizzle/schema");
  return db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(chatMessages.createdAt);
}

export async function createChatMessage(conversationId: number, role: "user" | "assistant" | "system", content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { chatMessages, chatConversations } = await import("../drizzle/schema");
  
  // Insert message
  await db.insert(chatMessages).values({ conversationId, role, content });
  
  // Update conversation timestamp
  await db.update(chatConversations).set({ updatedAt: new Date() }).where(eq(chatConversations.id, conversationId));
}

// User Settings Queries
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { userSettings } = await import("../drizzle/schema");
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return result[0];
}

export async function upsertUserSettings(userId: number, settings: { openaiApiKey?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { userSettings } = await import("../drizzle/schema");
  
  await db.insert(userSettings).values({ userId, ...settings }).onDuplicateKeyUpdate({
    set: { ...settings, updatedAt: new Date() },
  });
}

// Meetings Queries
export async function getMeetings(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return { meetings: [], total: 0 };
  const { meetings } = await import("../drizzle/schema");
  
  const result = await db.select().from(meetings).orderBy(desc(meetings.receivedAt)).limit(limit).offset(offset);
  
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(meetings);
  
  return { meetings: result, total: countResult?.count || 0 };
}

export async function createMeeting(data: {
  title: string;
  meetingLink?: string;
  summary?: string;
  participants?: string;
  startTime?: Date;
  endTime?: Date;
  rawPayload?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { meetings } = await import("../drizzle/schema");
  
  const result = await db.insert(meetings).values(data);
  return Number(result[0].insertId);
}

// Client Mappings Queries
export async function getClientMappings(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return { mappings: [], total: 0 };
  const { clientMappings } = await import("../drizzle/schema");
  
  const result = await db.select().from(clientMappings).orderBy(desc(clientMappings.uploadedAt)).limit(limit).offset(offset);
  
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(clientMappings);
  
  return { mappings: result, total: countResult?.count || 0 };
}

export async function findClientMappingByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { clientMappings } = await import("../drizzle/schema");
  
  const result = await db.select().from(clientMappings).where(eq(clientMappings.contactEmail, email)).limit(1);
  return result[0];
}

export async function bulkInsertClientMappings(mappings: Array<{
  contactName?: string;
  contactEmail: string;
  discordChannelName?: string;
  discordChannelId?: string;
  accountManager?: string;
  projectOwner?: string;
  clientName?: string;
  uploadedBy?: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { clientMappings } = await import("../drizzle/schema");
  
  if (mappings.length === 0) return;
  
  await db.insert(clientMappings).values(mappings);
}

export async function clearClientMappings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { clientMappings } = await import("../drizzle/schema");
  
  await db.delete(clientMappings);
}

export async function updateMeetingWithChannelId(meetingId: number, channelId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { meetings } = await import("../drizzle/schema");
  
  await db.update(meetings).set({ 
    rawPayload: sql`JSON_SET(${meetings.rawPayload}, '$.matched_channel_id', ${channelId})`
  }).where(eq(meetings.id, meetingId));
}

// Meetings CSV Import
export async function bulkInsertMeetings(meetings: Array<{
  title: string;
  meetingLink?: string;
  summary?: string;
  participants?: string;
  sessionId?: string;
  topics?: string;
  keyQuestions?: string;
  chapters?: string;
  startTime?: Date;
  matchedChannelId?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { meetings: meetingsTable } = await import("../drizzle/schema");
  
  if (meetings.length === 0) return;
  
  await db.insert(meetingsTable).values(meetings);
}

export async function getMeetingsFiltered(filters: {
  startDate?: Date;
  endDate?: Date;
  channelId?: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { meetings: [], total: 0 };
  const { meetings } = await import("../drizzle/schema");
  
  const conditions: SQL[] = [];
  
  if (filters.startDate) {
    conditions.push(sql`${meetings.startTime} >= ${filters.startDate}`);
  }
  
  if (filters.endDate) {
    conditions.push(sql`${meetings.startTime} <= ${filters.endDate}`);
  }
  
  if (filters.channelId) {
    conditions.push(eq(meetings.matchedChannelId, filters.channelId));
  }
  
  if (filters.searchText) {
    conditions.push(
      sql`(${meetings.title} LIKE ${`%${filters.searchText}%`} OR ${meetings.summary} LIKE ${`%${filters.searchText}%`})`
    );
  }
  
  let query = db.select().from(meetings);
  if (conditions.length > 0) {
    query = query.where(sql.join(conditions, sql` AND `)) as typeof query;
  }
  
  const result = await query
    .orderBy(desc(meetings.receivedAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);
  
  // Get total count
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(meetings);
  if (conditions.length > 0) {
    countQuery = countQuery.where(sql.join(conditions, sql` AND `)) as typeof countQuery;
  }
  const [countResult] = await countQuery;
  
  return { meetings: result, total: countResult?.count || 0 };
}

export async function addClientMappingEmail(channelId: string, email: string, contactName?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { clientMappings } = await import("../drizzle/schema");
  
  // Check if mapping already exists
  const existing = await db.select().from(clientMappings)
    .where(sql`${clientMappings.contactEmail} = ${email} AND ${clientMappings.discordChannelId} = ${channelId}`)
    .limit(1);
  
  if (existing.length > 0) {
    throw new Error("This email is already mapped to this channel");
  }
  
  await db.insert(clientMappings).values({
    contactEmail: email,
    discordChannelId: channelId,
    contactName,
  });
}

// Analytics Functions
export async function getMeetingAnalytics(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return {
    totalMeetings: 0,
    meetingsByChannel: [],
    meetingsByMonth: [],
    topParticipants: [],
    averageDuration: 0,
  };
  
  const { meetings } = await import("../drizzle/schema");
  
  const conditions: SQL[] = [];
  if (startDate) {
    conditions.push(sql`${meetings.startTime} >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`${meetings.startTime} <= ${endDate}`);
  }
  
  let baseQuery = db.select().from(meetings);
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(sql.join(conditions, sql` AND `)) as typeof baseQuery;
  }
  
  const allMeetings = await baseQuery;
  
  // Total meetings
  const totalMeetings = allMeetings.length;
  
  // Meetings by channel
  const channelCounts: Record<string, number> = {};
  allMeetings.forEach(meeting => {
    if (meeting.matchedChannelId) {
      channelCounts[meeting.matchedChannelId] = (channelCounts[meeting.matchedChannelId] || 0) + 1;
    }
  });
  
  const meetingsByChannel = Object.entries(channelCounts)
    .map(([channelId, count]) => ({ channelId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Meetings by month
  const monthCounts: Record<string, number> = {};
  allMeetings.forEach(meeting => {
    const date = meeting.startTime || meeting.receivedAt;
    const monthKey = new Date(date).toISOString().substring(0, 7); // YYYY-MM
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  });
  
  const meetingsByMonth = Object.entries(monthCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
  
  // Top participants
  const participantCounts: Record<string, number> = {};
  allMeetings.forEach(meeting => {
    if (meeting.participants) {
      const participants = meeting.participants.split(',').map(p => p.trim());
      participants.forEach(participant => {
        if (participant) {
          participantCounts[participant] = (participantCounts[participant] || 0) + 1;
        }
      });
    }
  });
  
  const topParticipants = Object.entries(participantCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Average duration (if we had duration data)
  const averageDuration = 0; // Placeholder - would need start/end times
  
  return {
    totalMeetings,
    meetingsByChannel,
    meetingsByMonth,
    topParticipants,
    averageDuration,
  };
}

export async function getSearchSuggestions(query: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return { clients: [], participants: [], topics: [] };
  
  const { meetings, clientMappings } = await import("../drizzle/schema");
  
  const searchPattern = `%${query}%`;
  
  // Get client name suggestions
  const clientResults = await db
    .select({ name: clientMappings.contactName })
    .from(clientMappings)
    .where(sql`${clientMappings.contactName} LIKE ${searchPattern}`)
    .groupBy(clientMappings.contactName)
    .limit(limit);
  
  const clients = clientResults
    .map(r => r.name)
    .filter((name): name is string => name !== null);
  
  // Get participant suggestions from meetings
  const meetingResults = await db
    .select({ participants: meetings.participants })
    .from(meetings)
    .where(sql`${meetings.participants} LIKE ${searchPattern}`)
    .limit(50);
  
  const participantSet = new Set<string>();
  meetingResults.forEach(m => {
    if (m.participants) {
      const participants = m.participants.split(',').map(p => p.trim());
      participants.forEach(p => {
        if (p.toLowerCase().includes(query.toLowerCase())) {
          participantSet.add(p);
        }
      });
    }
  });
  
  const participants = Array.from(participantSet).slice(0, limit);
  
  // Get topic suggestions
  const topicResults = await db
    .select({ topics: meetings.topics })
    .from(meetings)
    .where(sql`${meetings.topics} LIKE ${searchPattern}`)
    .limit(50);
  
  const topicSet = new Set<string>();
  topicResults.forEach(m => {
    if (m.topics) {
      const topics = m.topics.split(',').map(t => t.trim());
      topics.forEach(t => {
        if (t.toLowerCase().includes(query.toLowerCase())) {
          topicSet.add(t);
        }
      });
    }
  });
  
  const topics = Array.from(topicSet).slice(0, limit);
  
  return { clients, participants, topics };
}

// User Settings Management
export async function upsertLogoUrl(userId: number, logoUrl: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert logo URL: database not available");
    return;
  }

  try {
    const { userSettings } = await import("../drizzle/schema");
    await db.insert(userSettings).values({
      userId,
      logoUrl,
    }).onDuplicateKeyUpdate({
      set: { logoUrl },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert logo URL:", error);
    throw error;
  }
}

export async function getLogoUrl(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get logo URL: database not available");
    return null;
  }

  try {
    const { userSettings } = await import("../drizzle/schema");
    const result = await db.select().from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    
    return result.length > 0 ? result[0].logoUrl : null;
  } catch (error) {
    console.error("[Database] Failed to get logo URL:", error);
    return null;
  }
}

// Activity Stats
export async function getActivityStats(timeRange: "24h" | "7d") {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get activity stats: database not available");
    return { messages: 0, meetings: 0, chats: 0 };
  }

  try {
    const { discordMessages, meetings, chatConversations } = await import("../drizzle/schema");
    
    // Calculate the cutoff time
    const now = new Date();
    const cutoffTime = new Date(now);
    if (timeRange === "24h") {
      cutoffTime.setHours(cutoffTime.getHours() - 24);
    } else {
      cutoffTime.setDate(cutoffTime.getDate() - 7);
    }

    // Count Discord messages
    const messageCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(discordMessages)
      .where(sql`${discordMessages.createdAt} >= ${cutoffTime}`);
    const messageCount = messageCountResult[0]?.count || 0;

    // Count Read.ai meetings
    const meetingCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(meetings)
      .where(sql`${meetings.startTime} >= ${cutoffTime}`);
    const meetingCount = meetingCountResult[0]?.count || 0;

    // Count AI chat conversations
    const chatCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(chatConversations)
      .where(sql`${chatConversations.createdAt} >= ${cutoffTime}`);
    const chatCount = chatCountResult[0]?.count || 0;

    return {
      messages: Number(messageCount),
      meetings: Number(meetingCount),
      chats: Number(chatCount),
    };
  } catch (error) {
    console.error("[Database] Failed to get activity stats:", error);
    return { messages: 0, meetings: 0, chats: 0 };
  }
}

// Client Channel Statistics
export async function getClientChannelStats(hoursBack: number = 24) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  const results = await db
    .select({
      channelId: discordChannels.id,
      channelName: discordChannels.name,
      clientWebsite: discordChannels.clientWebsite,
      clientBusinessName: discordChannels.clientBusinessName,
      messageCount: sql<number>`COUNT(${discordMessages.id})`,
    })
    .from(discordChannels)
    .leftJoin(discordMessages, eq(discordChannels.id, discordMessages.channelId))
    .where(sql`${discordMessages.createdAt} >= ${cutoffDate}`)
    .groupBy(discordChannels.id, discordChannels.name, discordChannels.clientWebsite, discordChannels.clientBusinessName)
    .orderBy(sql`COUNT(${discordMessages.id}) DESC`);
  
  return results;
}
