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
  
  const { meetings } = await import("../drizzle/schema");
  const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  // Get message counts per channel
  const messageResults = await db
    .select({
      channelId: discordChannels.id,
      channelName: discordChannels.name,
      clientWebsite: discordChannels.clientWebsite,
      clientBusinessName: discordChannels.clientBusinessName,
      tags: discordChannels.tags,
      messageCount: sql<number>`COUNT(${discordMessages.id})`,
    })
    .from(discordChannels)
    .leftJoin(discordMessages, eq(discordChannels.id, discordMessages.channelId))
    .where(sql`${discordMessages.createdAt} >= ${cutoffDate}`)
    .groupBy(discordChannels.id, discordChannels.name, discordChannels.clientWebsite, discordChannels.clientBusinessName, discordChannels.tags)
    .orderBy(sql`COUNT(${discordMessages.id}) DESC`);
  
  // Get meeting counts per channel
  const meetingResults = await db
    .select({
      channelId: meetings.matchedChannelId,
      meetingCount: sql<number>`COUNT(${meetings.id})`,
    })
    .from(meetings)
    .where(sql`${meetings.startTime} >= ${cutoffDate} AND ${meetings.matchedChannelId} IS NOT NULL`)
    .groupBy(meetings.matchedChannelId);
  
  // Create a map of channel ID to meeting count
  const meetingCountMap = new Map<string, number>();
  meetingResults.forEach(result => {
    if (result.channelId) {
      meetingCountMap.set(result.channelId, result.meetingCount);
    }
  });
  
  // Combine message and meeting counts
  const results = messageResults.map(channel => ({
    ...channel,
    meetingCount: meetingCountMap.get(channel.channelId) || 0,
  }));
  
  return results;
}

// Update Discord Channel Metadata
export async function updateDiscordChannel(
  channelId: string,
  updates: {
    clientWebsite?: string;
    clientBusinessName?: string;
    tags?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(discordChannels)
    .set(updates)
    .where(eq(discordChannels.id, channelId));
}

// Activity Alerts Management
export async function getActivityAlerts() {
  const db = await getDb();
  if (!db) return [];
  
  const { activityAlerts } = await import("../drizzle/schema");
  return db.select().from(activityAlerts);
}

export async function createActivityAlert(data: {
  name: string;
  alertType: "zero_messages" | "volume_spike";
  threshold: number;
  channelFilter?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { activityAlerts } = await import("../drizzle/schema");
  const result = await db.insert(activityAlerts).values(data);
  return result[0].insertId;
}

export async function updateActivityAlert(
  id: number,
  updates: {
    name?: string;
    threshold?: number;
    isActive?: number;
    channelFilter?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { activityAlerts } = await import("../drizzle/schema");
  await db
    .update(activityAlerts)
    .set(updates)
    .where(eq(activityAlerts.id, id));
}

export async function deleteActivityAlert(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { activityAlerts } = await import("../drizzle/schema");
  await db.delete(activityAlerts).where(eq(activityAlerts.id, id));
}

export async function checkAndTriggerAlerts() {
  const db = await getDb();
  if (!db) return [];
  
  const { activityAlerts } = await import("../drizzle/schema");
  const { notifyOwner } = await import("./_core/notification");
  
  const alerts = await db
    .select()
    .from(activityAlerts)
    .where(eq(activityAlerts.isActive, 1));
  
  const triggered = [];
  
  for (const alert of alerts) {
    if (alert.alertType === "zero_messages") {
      // Check for channels with zero messages in the last X days
      const hoursBack = alert.threshold * 24;
      const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      
      const channelsWithMessages = await db
        .select({ channelId: discordMessages.channelId })
        .from(discordMessages)
        .where(sql`${discordMessages.createdAt} >= ${cutoffDate}`)
        .groupBy(discordMessages.channelId);
      
      const activeChannelIds = new Set(channelsWithMessages.map(c => c.channelId));
      
      // Get all channels
      const allChannels = await db.select().from(discordChannels);
      
      // Filter channels based on alert filter
      let filteredChannels = allChannels;
      if (alert.channelFilter) {
        const filterTags = alert.channelFilter.split(',').map(t => t.trim());
        filteredChannels = allChannels.filter(channel => {
          if (filterTags.includes(channel.id)) return true;
          if (channel.tags) {
            const channelTags = channel.tags.split(',').map(t => t.trim());
            return filterTags.some(tag => channelTags.includes(tag));
          }
          return false;
        });
      }
      
      // Find channels with zero messages
      const inactiveChannels = filteredChannels.filter(
        channel => !activeChannelIds.has(channel.id)
      );
      
      if (inactiveChannels.length > 0) {
        const channelNames = inactiveChannels.map(c => c.name).join(', ');
        await notifyOwner({
          title: `Alert: ${alert.name}`,
          content: `${inactiveChannels.length} channel(s) have had zero messages in the last ${alert.threshold} days: ${channelNames}`,
        });
        
        triggered.push({
          alertId: alert.id,
          alertName: alert.name,
          channelCount: inactiveChannels.length,
        });
        
        // Update last triggered time
        await db
          .update(activityAlerts)
          .set({ lastTriggered: new Date() })
          .where(eq(activityAlerts.id, alert.id));
      }
    } else if (alert.alertType === "volume_spike") {
      // Check for unusual message volume spikes
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const channels24h = await db
        .select({
          channelId: discordMessages.channelId,
          count: sql<number>`COUNT(${discordMessages.id})`,
        })
        .from(discordMessages)
        .where(sql`${discordMessages.createdAt} >= ${last24h}`)
        .groupBy(discordMessages.channelId);
      
      const channels7d = await db
        .select({
          channelId: discordMessages.channelId,
          count: sql<number>`COUNT(${discordMessages.id})`,
        })
        .from(discordMessages)
        .where(sql`${discordMessages.createdAt} >= ${last7d}`)
        .groupBy(discordMessages.channelId);
      
      const avgMap = new Map<string, number>();
      channels7d.forEach(c => {
        avgMap.set(c.channelId, c.count / 7);
      });
      
      const spikes = [];
      for (const c24 of channels24h) {
        const avg = avgMap.get(c24.channelId) || 0;
        if (avg > 0) {
          const percentIncrease = ((c24.count - avg) / avg) * 100;
          if (percentIncrease >= alert.threshold) {
            const channel = await db
              .select()
              .from(discordChannels)
              .where(eq(discordChannels.id, c24.channelId))
              .limit(1);
            
            if (channel[0]) {
              spikes.push({
                channelName: channel[0].name,
                increase: Math.round(percentIncrease),
                count: c24.count,
              });
            }
          }
        }
      }
      
      if (spikes.length > 0) {
        const spikeDetails = spikes
          .map(s => `${s.channelName}: +${s.increase}% (${s.count} messages)`)
          .join(', ');
        
        await notifyOwner({
          title: `Alert: ${alert.name}`,
          content: `${spikes.length} channel(s) have unusual message volume spikes: ${spikeDetails}`,
        });
        
        triggered.push({
          alertId: alert.id,
          alertName: alert.name,
          channelCount: spikes.length,
        });
        
        // Update last triggered time
        await db
          .update(activityAlerts)
          .set({ lastTriggered: new Date() })
          .where(eq(activityAlerts.id, alert.id));
      }
    }
  }
  
  return triggered;
}


// ============================================================================
// A2P (Application-to-Person) Campaign Monitoring
// ============================================================================

export async function upsertGhlLocation(location: {
  id: string;
  name: string;
  companyName?: string;
  tags?: string;
}) {
  const db = await getDb();
  if (!db) return;

  const { ghlLocations } = await import("../drizzle/schema");
  
  await db.insert(ghlLocations).values({
    id: location.id,
    name: location.name,
    companyName: location.companyName || null,
    tags: location.tags || null,
    lastSeenAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      name: location.name,
      companyName: location.companyName || null,
      tags: location.tags || null,
      lastSeenAt: new Date(),
    },
  });
}

export async function getAllGhlLocations() {
  const db = await getDb();
  if (!db) return [];

  const { ghlLocations } = await import("../drizzle/schema");
  return await db.select().from(ghlLocations).orderBy(ghlLocations.name);
}

export async function insertA2pStatus(status: {
  locationId: string;
  checkedAt: Date;
  brandStatus: string;
  campaignStatus: string;
  sourceUrl: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) return;

  const { a2pStatus } = await import("../drizzle/schema");
  
  await db.insert(a2pStatus).values({
    locationId: status.locationId,
    checkedAt: status.checkedAt,
    brandStatus: status.brandStatus,
    campaignStatus: status.campaignStatus,
    sourceUrl: status.sourceUrl,
    notes: status.notes || null,
  });
}

export async function getLatestA2pStatus() {
  const db = await getDb();
  if (!db) return [];

  const { a2pStatus, ghlLocations } = await import("../drizzle/schema");
  
  // Get the latest status for each location
  const latestStatuses = await db
    .select({
      id: a2pStatus.id,
      locationId: a2pStatus.locationId,
      locationName: ghlLocations.name,
      companyName: ghlLocations.companyName,
      tags: ghlLocations.tags,
      checkedAt: a2pStatus.checkedAt,
      brandStatus: a2pStatus.brandStatus,
      campaignStatus: a2pStatus.campaignStatus,
      sourceUrl: a2pStatus.sourceUrl,
      notes: a2pStatus.notes,
    })
    .from(a2pStatus)
    .innerJoin(ghlLocations, eq(a2pStatus.locationId, ghlLocations.id))
    .orderBy(a2pStatus.checkedAt);

  // Group by locationId and keep only the latest
  const latestByLocation = new Map();
  latestStatuses.forEach(status => {
    const existing = latestByLocation.get(status.locationId);
    if (!existing || new Date(status.checkedAt) > new Date(existing.checkedAt)) {
      latestByLocation.set(status.locationId, status);
    }
  });

  return Array.from(latestByLocation.values());
}

export async function getNonApprovedA2pCampaigns(tagFilter?: string) {
  const allStatuses = await getLatestA2pStatus();
  
  return allStatuses.filter(status => {
    // Filter by approval status
    const isNotApproved = 
      status.brandStatus !== "Approved" || 
      status.campaignStatus !== "Approved";
    
    if (!isNotApproved) return false;
    
    // Filter by tag if specified
    if (tagFilter && status.tags) {
      const tags = status.tags.split(',').map((t: string) => t.trim());
      return tags.includes(tagFilter);
    }
    
    return true;
  });
}

export async function updateGhlLocationTags(locationId: string, tags: string) {
  const db = await getDb();
  if (!db) return;

  const { ghlLocations } = await import("../drizzle/schema");
  
  await db.update(ghlLocations)
    .set({ tags })
    .where(eq(ghlLocations.id, locationId));
}


export async function sendDailyA2pSummary() {
  // Get all non-approved campaigns tagged as "client"
  const nonApproved = await getNonApprovedA2pCampaigns("client");
  
  if (nonApproved.length === 0) {
    console.log("[A2P] All client campaigns are approved");
    return { sent: false, count: 0 };
  }

  // Build summary message
  const summary = nonApproved.map(status => {
    const issues = [];
    if (status.brandStatus !== "Approved") {
      issues.push(`Brand: ${status.brandStatus}`);
    }
    if (status.campaignStatus !== "Approved") {
      issues.push(`Campaign: ${status.campaignStatus}`);
    }
    return `• ${status.locationName} (${status.companyName || "No company"}) - ${issues.join(", ")}\n  Link: ${status.sourceUrl}`;
  }).join("\n\n");

  const title = `A2P Status Alert: ${nonApproved.length} Client Campaign${nonApproved.length > 1 ? "s" : ""} Not Approved`;
  const content = `The following client campaigns are not fully approved for A2P messaging:\n\n${summary}\n\nPlease review and complete the A2P registration process for these locations.`;

  // Send notification to owner
  const { notifyOwner } = await import("./_core/notification");
  const sent = await notifyOwner({ title, content });

  return { sent, count: nonApproved.length };
}


export async function getA2pStatusHistory(locationId: string) {
  const db = await getDb();
  if (!db) return [];

  const { a2pStatus, ghlLocations } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  
  const history = await db
    .select({
      id: a2pStatus.id,
      locationId: a2pStatus.locationId,
      locationName: ghlLocations.name,
      companyName: ghlLocations.companyName,
      checkedAt: a2pStatus.checkedAt,
      brandStatus: a2pStatus.brandStatus,
      campaignStatus: a2pStatus.campaignStatus,
      sourceUrl: a2pStatus.sourceUrl,
      notes: a2pStatus.notes,
    })
    .from(a2pStatus)
    .innerJoin(ghlLocations, eq(a2pStatus.locationId, ghlLocations.id))
    .where(eq(a2pStatus.locationId, locationId))
    .orderBy(desc(a2pStatus.checkedAt));

  return history;
}
