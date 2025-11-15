// Webhook receiver for Pabbly integration
// This endpoint receives the Discord channel webhooks inventory from the scheduled script

import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storeChannelWebhooksInventory } from "./storage";

const webhookInventorySchema = z.object({
  export_timestamp: z.string(),
  export_datetime: z.string(),
  guild_id: z.string(),
  summary: z.object({
    total_channels: z.number(),
    total_webhooks: z.number(),
    channels_with_webhooks: z.number(),
  }),
  webhooks: z.array(
    z.object({
      channel_name: z.string(),
      channel_id: z.string(),
      channel_type: z.number(),
      webhook_id: z.string(),
      webhook_name: z.string(),
      webhook_url: z.string(),
    })
  ),
  all_channels: z.array(
    z.object({
      channel_name: z.string(),
      channel_id: z.string(),
      channel_type: z.number(),
      has_webhook: z.boolean(),
    })
  ),
});

export const webhookReceiverRouter = router({
  receiveInventory: publicProcedure
    .input(webhookInventorySchema)
    .mutation(async ({ input }) => {
      try {
        await storeChannelWebhooksInventory(input);
        console.log(`[Webhook Receiver] Stored inventory: ${input.summary.total_webhooks} webhooks from ${input.summary.total_channels} channels`);
        return {
          success: true,
          message: "Webhook inventory stored successfully",
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error("[Webhook Receiver] Failed to store inventory:", error);
        throw new Error("Failed to store webhook inventory");
      }
    }),
});
