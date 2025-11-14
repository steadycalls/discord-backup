import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Discord Archive Routes
  discord: router({
    guilds: publicProcedure.query(async () => {
      const { getDiscordGuilds } = await import("./db");
      return getDiscordGuilds();
    }),
    channels: publicProcedure
      .input(z.object({ guildId: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const { getDiscordChannels } = await import("./db");
        return getDiscordChannels(input?.guildId);
      }),
    messages: publicProcedure
      .input(
        z.object({
          guildId: z.string().optional(),
          channelId: z.string().optional(),
          authorId: z.string().optional(),
          searchText: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const { getDiscordMessages } = await import("./db");
        return getDiscordMessages(input);
      }),
    attachments: publicProcedure.input(z.object({ messageId: z.string() })).query(async ({ input }) => {
      const { getMessageAttachments } = await import("./db");
      return getMessageAttachments(input.messageId);
    }),
  }),

  // Webhook Management Routes
  webhooks: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getWebhooks } = await import("./db");
      return getWebhooks(ctx.user.id);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getWebhookById } = await import("./db");
      return getWebhookById(input.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          url: z.string().url(),
          eventType: z.enum(["message_insert", "message_update", "message_delete", "all"]),
          guildFilter: z.string().optional(),
          channelFilter: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { createWebhook } = await import("./db");
        const webhookId = await createWebhook({
          ...input,
          createdBy: ctx.user.id,
          isActive: 1,
        });
        return { id: webhookId };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          url: z.string().url().optional(),
          eventType: z.enum(["message_insert", "message_update", "message_delete", "all"]).optional(),
          isActive: z.number().min(0).max(1).optional(),
          guildFilter: z.string().optional(),
          channelFilter: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { updateWebhook } = await import("./db");
        const { id, ...updates } = input;
        await updateWebhook(id, updates);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { deleteWebhook } = await import("./db");
      await deleteWebhook(input.id);
      return { success: true };
    }),
    logs: protectedProcedure
      .input(z.object({ webhookId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const { getWebhookLogs } = await import("./db");
        return getWebhookLogs(input?.webhookId, input?.limit);
      }),
    test: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { getWebhookById, createWebhookLog } = await import("./db");
      const webhook = await getWebhookById(input.id);
      if (!webhook) throw new Error("Webhook not found");

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "test",
            message: "This is a test webhook delivery from Discord Archive",
            timestamp: new Date().toISOString(),
          }),
        });

        await createWebhookLog({
          webhookId: webhook.id,
          eventType: "test",
          messageId: null,
          statusCode: response.status,
          success: response.ok ? 1 : 0,
          errorMessage: response.ok ? null : await response.text(),
        });

        return { success: response.ok, status: response.status };
      } catch (error: any) {
        await createWebhookLog({
          webhookId: webhook.id,
          eventType: "test",
          messageId: null,
          statusCode: null,
          success: 0,
          errorMessage: error.message,
        });
        throw error;
      }
    }),
  }),

  // AI Chat Routes
  chat: router({
    conversations: protectedProcedure.query(async ({ ctx }) => {
      const { getChatConversations } = await import("./db");
      return getChatConversations(ctx.user.id);
    }),
    conversation: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const { getChatConversationById } = await import("./db");
      return getChatConversationById(input.id, ctx.user.id);
    }),
    messages: protectedProcedure.input(z.object({ conversationId: z.number() })).query(async ({ input }) => {
      const { getChatMessages } = await import("./db");
      return getChatMessages(input.conversationId);
    }),
    createConversation: protectedProcedure
      .input(z.object({ title: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const { createChatConversation } = await import("./db");
        const id = await createChatConversation(ctx.user.id, input.title);
        return { id };
      }),
    sendMessage: protectedProcedure
      .input(z.object({ conversationId: z.number(), content: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const { createChatMessage, getChatConversationById, getUserSettings, getDiscordMessages } = await import("./db");
        
        // Verify conversation belongs to user
        const conversation = await getChatConversationById(input.conversationId, ctx.user.id);
        if (!conversation) throw new Error("Conversation not found");
        
        // Save user message
        await createChatMessage(input.conversationId, "user", input.content);
        
        // Get user's OpenAI API key
        const settings = await getUserSettings(ctx.user.id);
        if (!settings?.openaiApiKey) {
          throw new Error("OpenAI API key not configured. Please add it in Settings.");
        }
        
        // Search Discord messages for context
        const searchResults = await getDiscordMessages({
          searchText: input.content,
          limit: 5,
        });
        
        // Build context from search results
        let context = "";
        if (searchResults.messages.length > 0) {
          context = "\n\nRelevant Discord messages:\n";
          searchResults.messages.forEach((msg) => {
            context += `[${msg.channel?.name}] ${msg.author?.username}: ${msg.message.content}\n`;
          });
        }
        
        // Call OpenAI API
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that can search through archived Discord messages. When answering questions, use the provided Discord message context if relevant.",
              },
              {
                role: "user",
                content: input.content + context,
              },
            ],
          }),
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${error}`);
        }
        
        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content || "No response";
        
        // Save assistant message
        await createChatMessage(input.conversationId, "assistant", assistantMessage);
        
        return { content: assistantMessage };
      }),
    deleteConversation: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const { deleteChatConversation } = await import("./db");
      await deleteChatConversation(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // Settings Routes
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getUserSettings } = await import("./db");
      return getUserSettings(ctx.user.id);
    }),
    update: protectedProcedure
      .input(z.object({ openaiApiKey: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { upsertUserSettings } = await import("./db");
        await upsertUserSettings(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // Meetings Routes (Read.ai webhook integration)
  meetings: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const { getMeetings } = await import("./db");
        return getMeetings(input?.limit, input?.offset);
      }),
  }),
});

export type AppRouter = typeof appRouter;
