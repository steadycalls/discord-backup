import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Discord Archive Tables
export const discordGuilds = mysqlTable("discord_guilds", {
  id: varchar("id", { length: 64 }).primaryKey(), // Discord guild ID
  name: text("name").notNull(),
  iconUrl: text("iconUrl"),
  createdAt: timestamp("createdAt").notNull(),
  insertedAt: timestamp("insertedAt").defaultNow().notNull(),
});

export const discordChannels = mysqlTable("discord_channels", {
  id: varchar("id", { length: 64 }).primaryKey(), // Discord channel ID
  guildId: varchar("guildId", { length: 64 }).notNull().references(() => discordGuilds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: varchar("type", { length: 32 }).notNull(), // text, voice, forum, etc.
  createdAt: timestamp("createdAt").notNull(),
  insertedAt: timestamp("insertedAt").defaultNow().notNull(),
});

export const discordUsers = mysqlTable("discord_users", {
  id: varchar("id", { length: 64 }).primaryKey(), // Discord user ID
  username: text("username").notNull(),
  discriminator: varchar("discriminator", { length: 16 }),
  globalName: text("globalName"),
  bot: int("bot").default(0).notNull(), // 0 = false, 1 = true
  createdAt: timestamp("createdAt").notNull(),
  insertedAt: timestamp("insertedAt").defaultNow().notNull(),
});

export const discordMessages = mysqlTable("discord_messages", {
  id: varchar("id", { length: 64 }).primaryKey(), // Discord message ID
  channelId: varchar("channelId", { length: 64 }).notNull().references(() => discordChannels.id, { onDelete: "cascade" }),
  guildId: varchar("guildId", { length: 64 }).notNull().references(() => discordGuilds.id, { onDelete: "cascade" }),
  authorId: varchar("authorId", { length: 64 }).notNull().references(() => discordUsers.id, { onDelete: "cascade" }),
  content: text("content"),
  createdAt: timestamp("createdAt").notNull(), // Original Discord timestamp
  editedAt: timestamp("editedAt"),
  isPinned: int("isPinned").default(0).notNull(),
  isTts: int("isTts").default(0).notNull(),
  rawJson: text("rawJson"), // Full message payload for future use
  insertedAt: timestamp("insertedAt").defaultNow().notNull(), // When we wrote it to DB
});

export const discordAttachments = mysqlTable("discord_attachments", {
  id: varchar("id", { length: 64 }).primaryKey(), // Discord attachment ID
  messageId: varchar("messageId", { length: 64 }).notNull().references(() => discordMessages.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename"),
  contentType: varchar("contentType", { length: 128 }),
  sizeBytes: int("sizeBytes"),
  insertedAt: timestamp("insertedAt").defaultNow().notNull(),
});

// Webhook Management Tables
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  eventType: mysqlEnum("eventType", ["message_insert", "message_update", "message_delete", "all"]).notNull(),
  isActive: int("isActive").default(1).notNull(), // 0 = inactive, 1 = active
  guildFilter: varchar("guildFilter", { length: 64 }), // Optional: filter by guild ID
  channelFilter: varchar("channelFilter", { length: 64 }), // Optional: filter by channel ID
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const webhookLogs = mysqlTable("webhook_logs", {
  id: int("id").autoincrement().primaryKey(),
  webhookId: int("webhookId").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  eventType: varchar("eventType", { length: 32 }).notNull(),
  messageId: varchar("messageId", { length: 64 }),
  statusCode: int("statusCode"),
  success: int("success").notNull(), // 0 = failed, 1 = success
  errorMessage: text("errorMessage"),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
});

export type DiscordGuild = typeof discordGuilds.$inferSelect;
export type DiscordChannel = typeof discordChannels.$inferSelect;
export type DiscordUser = typeof discordUsers.$inferSelect;
export type DiscordMessage = typeof discordMessages.$inferSelect;
export type DiscordAttachment = typeof discordAttachments.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type WebhookLog = typeof webhookLogs.$inferSelect;

export type InsertWebhook = typeof webhooks.$inferInsert;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;
// AI Chat Tables
export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// User Settings Table
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  openaiApiKey: text("openaiApiKey"), // Encrypted API key
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Read.ai Meetings Table
export const meetings = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  meetingLink: text("meetingLink"),
  summary: text("summary"),
  participants: text("participants"), // JSON array of participant names
  sessionId: varchar("sessionId", { length: 64 }),
  topics: text("topics"), // Comma-separated or JSON
  keyQuestions: text("keyQuestions"), // Comma-separated or JSON
  chapters: text("chapters"), // JSON
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  rawPayload: text("rawPayload"), // Full webhook payload for reference
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  matchedChannelId: varchar("matchedChannelId", { length: 64 }), // Discord channel ID if matched
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;

export type InsertChatConversation = typeof chatConversations.$inferInsert;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type InsertUserSettings = typeof userSettings.$inferInsert;
export type InsertMeeting = typeof meetings.$inferInsert;

// Client Mappings Table (for Read.ai → Discord channel routing)
export const clientMappings = mysqlTable("client_mappings", {
  id: int("id").autoincrement().primaryKey(),
  contactName: text("contactName"),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  discordChannelName: text("discordChannelName"),
  discordChannelId: varchar("discordChannelId", { length: 64 }),
  accountManager: text("accountManager"),
  projectOwner: text("projectOwner"),
  clientName: text("clientName"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  uploadedBy: int("uploadedBy").references(() => users.id),
});

export type ClientMapping = typeof clientMappings.$inferSelect;
export type InsertClientMapping = typeof clientMappings.$inferInsert;
