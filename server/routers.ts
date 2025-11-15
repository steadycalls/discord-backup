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
    uploadFile: protectedProcedure
      .input(z.object({
        file: z.string(), // base64 encoded file
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("./storage");
        
        // Decode base64
        const buffer = Buffer.from(input.file, 'base64');
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const ext = input.filename.split('.').pop() || 'bin';
        const fileKey = `chat-uploads/${ctx.user.id}/${timestamp}-${randomSuffix}.${ext}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        return { url, filename: input.filename, mimeType: input.mimeType };
      }),
    sendMessage: protectedProcedure
      .input(z.object({ 
        conversationId: z.number(), 
        content: z.string().min(1),
        attachments: z.array(z.object({
          url: z.string(),
          filename: z.string(),
          mimeType: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { 
          createChatMessage, 
          getChatMessages,
          getChatConversationById, 
          getUserSettings, 
          getDiscordMessages,
          getDiscordChannels,
          getMeetings,
          getClientMappings
        } = await import("./db");
        
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
        
        // Detect if user is asking about a specific channel
        const channelMatch = input.content.match(/channel[\s#]+([-\w]+)/i) || 
                            input.content.match(/from\s+([-\w]+)\s+channel/i) ||
                            input.content.match(/#([-\w]+)/);
        
        let channelFilter: string | undefined;
        const channels = await getDiscordChannels();
        
        if (channelMatch) {
          const channelName = channelMatch[1];
          const matchedChannel = channels.find(ch => 
            ch.name.toLowerCase().includes(channelName.toLowerCase()) ||
            channelName.toLowerCase().includes(ch.name.toLowerCase())
          );
          if (matchedChannel) {
            channelFilter = matchedChannel.id;
          }
        } else {
          // Try to infer channel from keywords in the message
          const lowerContent = input.content.toLowerCase();
          const inferredChannel = channels.find(ch => {
            const channelWords = ch.name.toLowerCase().split('-');
            return channelWords.some(word => lowerContent.includes(word) && word.length > 3);
          });
          if (inferredChannel) {
            channelFilter = inferredChannel.id;
          }
        }
        
        // Build comprehensive context from all databases
        let context = "\n\n=== AVAILABLE DATA ===";
        
        // 1. Search Discord messages - use broader search if no specific search terms
        const hasSpecificSearch = input.content.split(' ').some(word => word.length > 4);
        const searchResults = await getDiscordMessages({
          searchText: hasSpecificSearch ? input.content : undefined,
          channelId: channelFilter,
          limit: 20,
        });
        
        if (searchResults.messages.length > 0) {
          context += "\n\n--- Recent Discord Messages ---\n";
          searchResults.messages.forEach((msg) => {
            const timestamp = new Date(msg.message.createdAt).toLocaleDateString();
            context += `[${timestamp}] [#${msg.channel?.name}] ${msg.author?.username}: ${msg.message.content}\n`;
          });
        }
        
        // 2. Get recent meetings from Read.ai
        const meetingsData = await getMeetings(5, 0);
        if (meetingsData.meetings.length > 0) {
          context += "\n\n--- Recent Read.ai Meetings ---\n";
          meetingsData.meetings.forEach((meeting) => {
            const timestamp = new Date(meeting.receivedAt).toLocaleDateString();
            context += `[${timestamp}] ${meeting.title}\n`;
            if (meeting.summary) {
              context += `Summary: ${meeting.summary.substring(0, 200)}...\n`;
            }
            if (meeting.meetingLink) {
              context += `Link: ${meeting.meetingLink}\n`;
            }
          });
        }
        
        // 3. Get client mappings if relevant
        const clientData = await getClientMappings(50, 0);
        if (clientData.mappings.length > 0 && (input.content.toLowerCase().includes('client') || input.content.toLowerCase().includes('contact'))) {
          context += "\n\n--- Client Database (sample) ---\n";
          clientData.mappings.slice(0, 5).forEach((mapping) => {
            context += `${mapping.contactName || 'Unknown'} (${mapping.contactEmail}) -> #${mapping.discordChannelName}\n`;
          });
        }
        
        // Enhanced system prompt
        const systemPrompt = `You are an AI assistant with access to a Discord archive system that includes:

1. **Discord Messages Database**: Archived messages from all channels with timestamps, authors, and content
2. **Read.ai Meetings Database**: Meeting summaries, links, participants, and transcripts
3. **Client Database**: Client contact information mapped to Discord channels

When answering questions:
- Use the provided data context to give accurate, specific answers
- Reference specific channels, dates, and people when available
- Summarize information concisely but comprehensively
- If asking about a specific channel, focus on that channel's data
- Mention when information might be incomplete or outdated
- Format responses with clear sections and bullet points when appropriate`;
        
        // Get conversation history for context
        const history = await getChatMessages(input.conversationId);
        
        // Build messages array with conversation history
        const messages: Array<{ role: string; content: string }> = [
          {
            role: "system",
            content: systemPrompt,
          },
        ];
        
        // Add conversation history (last 10 messages for context)
        const recentHistory = history.slice(-10);
        recentHistory.forEach((msg: { role: string; content: string }) => {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        });
        
        // Add current user message with context and attachments
        const userMessageContent: any = [];
        
        // Add text content
        userMessageContent.push({
          type: "text",
          text: input.content + context,
        });
        
        // Add image attachments if present
        if (input.attachments && input.attachments.length > 0) {
          for (const attachment of input.attachments) {
            if (attachment.mimeType.startsWith('image/')) {
              userMessageContent.push({
                type: "image_url",
                image_url: {
                  url: attachment.url,
                },
              });
            }
          }
        }
        
        messages.push({
          role: "user",
          content: userMessageContent,
        });
        
        // Use vision model if images are attached, otherwise use standard model
        const model = input.attachments?.some(a => a.mimeType.startsWith('image/')) 
          ? "gpt-4o" 
          : "gpt-4o-mini";
        
        // Call OpenAI API
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.openaiApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
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
    filter: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        channelId: z.string().optional(),
        searchText: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const { getMeetingsFiltered } = await import("./db");
        return getMeetingsFiltered({
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          channelId: input.channelId,
          searchText: input.searchText,
          limit: input.limit,
          offset: input.offset,
        });
      }),
    uploadCsv: protectedProcedure
      .input(z.object({ csvContent: z.string() }))
      .mutation(async ({ input }) => {
        const { bulkInsertMeetings } = await import("./db");
        
        // Parse CSV
        const lines = input.csvContent.split('\n');
        const headers = lines[0].split(',');
        
        // Find column indices
        const dateIndex = headers.findIndex(h => h.trim().toLowerCase() === 'date');
        const titleIndex = headers.findIndex(h => h.trim().toLowerCase() === 'title');
        const summaryIndex = headers.findIndex(h => h.trim().toLowerCase() === 'summary');
        const linkIndex = headers.findIndex(h => h.trim().toLowerCase() === 'link');
        const peopleIndex = headers.findIndex(h => h.trim().toLowerCase() === 'people');
        const sessionIdIndex = headers.findIndex(h => h.trim().toLowerCase() === 'session id');
        const topicsIndex = headers.findIndex(h => h.trim().toLowerCase() === 'topics');
        const questionsIndex = headers.findIndex(h => h.trim().toLowerCase() === 'key questions');
        const chaptersIndex = headers.findIndex(h => h.trim().toLowerCase() === 'chapters');
        
        if (titleIndex === -1) {
          throw new Error("Required 'Title' column not found in CSV");
        }
        
        // Parse data rows
        const meetings = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const columns = line.split(',');
          const title = columns[titleIndex]?.trim();
          
          if (!title || title === 'Meeting Title') continue; // Skip header or empty
          
          let startTime: Date | undefined;
          if (dateIndex >= 0 && columns[dateIndex]) {
            try {
              startTime = new Date(columns[dateIndex].trim());
            } catch (e) {
              // Invalid date, skip
            }
          }
          
          meetings.push({
            title,
            meetingLink: linkIndex >= 0 ? columns[linkIndex]?.trim() : undefined,
            summary: summaryIndex >= 0 ? columns[summaryIndex]?.trim() : undefined,
            participants: peopleIndex >= 0 ? columns[peopleIndex]?.trim() : undefined,
            sessionId: sessionIdIndex >= 0 ? columns[sessionIdIndex]?.trim() : undefined,
            topics: topicsIndex >= 0 ? columns[topicsIndex]?.trim() : undefined,
            keyQuestions: questionsIndex >= 0 ? columns[questionsIndex]?.trim() : undefined,
            chapters: chaptersIndex >= 0 ? columns[chaptersIndex]?.trim() : undefined,
            startTime,
          });
        }
        
        await bulkInsertMeetings(meetings);
        
        return { success: true, count: meetings.length };
      }),
  }),

  // Client Mappings Routes (for Read.ai → Discord routing)
  clientMappings: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const { getClientMappings } = await import("./db");
        return getClientMappings(input?.limit, input?.offset);
      }),
    upload: protectedProcedure
      .input(z.object({ csvContent: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { bulkInsertClientMappings, clearClientMappings } = await import("./db");
        
        // Parse CSV
        const lines = input.csvContent.split('\n');
        const headers = lines[0].split(',');
        
        // Find column indices
        const emailIndex = headers.findIndex(h => h.includes('Primary Point of Contact Email'));
        const channelNameIndex = headers.findIndex(h => h.includes('Discord Channel Name'));
        const channelIdIndex = headers.findIndex(h => h.includes('Discord Channel ID'));
        const contactNameIndex = headers.findIndex(h => h.includes('Primary Point of Contact Name'));
        const amIndex = headers.findIndex(h => h.trim() === 'AM');
        const poIndex = headers.findIndex(h => h.trim() === 'PO');
        
        if (emailIndex === -1 || channelIdIndex === -1) {
          throw new Error("Required columns not found in CSV");
        }
        
        // Parse data rows
        const mappings = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const columns = line.split(',');
          const email = columns[emailIndex]?.trim();
          const channelId = columns[channelIdIndex]?.trim();
          
          // Skip if email is missing, empty, or a placeholder
          if (!email || email === '(repeat)' || email.startsWith('(')) continue;
          if (!channelId) continue;
          
          mappings.push({
            contactEmail: email,
            contactName: contactNameIndex >= 0 ? columns[contactNameIndex]?.trim() : undefined,
            discordChannelName: channelNameIndex >= 0 ? columns[channelNameIndex]?.trim() : undefined,
            discordChannelId: channelId,
            accountManager: amIndex >= 0 ? columns[amIndex]?.trim() : undefined,
            projectOwner: poIndex >= 0 ? columns[poIndex]?.trim() : undefined,
            uploadedBy: ctx.user.id,
          });
        }
        
        // Clear existing mappings and insert new ones
        await clearClientMappings();
        await bulkInsertClientMappings(mappings);
        
        return { success: true, count: mappings.length };
      }),
  }),

  // Discord-to-Client Matching Routes
  discordClientMatch: router({
    addEmailMapping: protectedProcedure
      .input(z.object({
        channelId: z.string(),
        email: z.string().email(),
        contactName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { addClientMappingEmail } = await import("./db");
        await addClientMappingEmail(input.channelId, input.email, input.contactName);
        return { success: true };
      }),
  }),

  // Analytics Routes
  analytics: router({
    getMeetingStats: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { getMeetingAnalytics } = await import("./db");
        const startDate = input.startDate ? new Date(input.startDate) : undefined;
        const endDate = input.endDate ? new Date(input.endDate) : undefined;
        return await getMeetingAnalytics(startDate, endDate);
      }),
    getSearchSuggestions: protectedProcedure
      .input(z.object({ query: z.string().min(1), limit: z.number().optional() }))
      .query(async ({ input }) => {
        const { getSearchSuggestions } = await import("./db");
        return await getSearchSuggestions(input.query, input.limit);
      }),
  }),

  // Activity Stats
  stats: router({
    activity: publicProcedure
      .input(z.object({ timeRange: z.enum(["24h", "7d"]) }))
      .query(async ({ input }) => {
        const { getActivityStats } = await import("./db");
        return getActivityStats(input.timeRange);
      }),
    clientChannels: publicProcedure
      .input(z.object({ timeRange: z.enum(["24h", "7d", "30d"]) }))
      .query(async ({ input }) => {
        const { getClientChannelStats } = await import("./db");
        const hours = input.timeRange === "24h" ? 24 : input.timeRange === "7d" ? 168 : 720;
        return getClientChannelStats(hours);
      }),
  }),

  // Logo Management
  logo: router({
    upload: protectedProcedure
      .input(z.object({
        file: z.string(), // base64 encoded image
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("./storage");
        
        // Decode base64 to buffer
        const base64Data = input.file.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileKey = `logos/${ctx.user.id}-${timestamp}-${input.filename}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Store logo URL in user settings
        const { upsertLogoUrl } = await import("./db");
        await upsertLogoUrl(ctx.user.id, url);
        
        return { url };
      }),
    get: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return { url: null };
      
      const { getLogoUrl } = await import("./db");
      const logoUrl = await getLogoUrl(ctx.user.id);
      return { url: logoUrl };
    }),
  }),
});

export type AppRouter = typeof appRouter;
