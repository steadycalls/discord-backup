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
});

export type AppRouter = typeof appRouter;
