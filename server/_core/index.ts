import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Read.ai webhook endpoint
  app.post("/api/webhooks/readai", async (req, res) => {
    try {
      const payload = req.body;
      const { createMeeting, findClientMappingByEmail } = await import("../db");
      
      // Extract meeting data from Read.ai webhook payload
      const meetingData = {
        title: payload.title || payload.meeting_title || "Untitled Meeting",
        meetingLink: payload.link || payload.meeting_link || payload.url,
        summary: payload.summary || payload.meeting_summary,
        participants: payload.participants ? JSON.stringify(payload.participants) : undefined,
        startTime: payload.start_time ? new Date(payload.start_time) : undefined,
        endTime: payload.end_time ? new Date(payload.end_time) : undefined,
        rawPayload: JSON.stringify(payload),
      };
      
      await createMeeting(meetingData);
      
      // Match participants with client database to find Discord channel
      let matchedChannelId: string | null = null;
      let matchedEmail: string | null = null;
      
      if (payload.participants && Array.isArray(payload.participants)) {
        for (const participant of payload.participants) {
          // Try to extract email from participant object or string
          let email: string | null = null;
          
          if (typeof participant === 'object' && participant.email) {
            email = participant.email;
          } else if (typeof participant === 'string' && participant.includes('@')) {
            email = participant;
          }
          
          if (email) {
            const mapping = await findClientMappingByEmail(email);
            if (mapping && mapping.discordChannelId) {
              matchedChannelId = mapping.discordChannelId;
              matchedEmail = email;
              console.log(`[Read.ai] Matched participant ${email} to channel ${mapping.discordChannelName} (${matchedChannelId})`);
              break;
            }
          }
        }
      }
      
      // If we found a matching channel, post to Discord
      if (matchedChannelId) {
        try {
          // Import Discord.py bot trigger function
          const { postMeetingToDiscord } = await import("../discord-notifier");
          await postMeetingToDiscord({
            channelId: matchedChannelId,
            title: meetingData.title,
            link: meetingData.meetingLink,
            summary: meetingData.summary,
            participants: payload.participants,
            matchedEmail,
          });
          console.log(`[Read.ai] Posted meeting summary to Discord channel ${matchedChannelId}`);
        } catch (discordError: any) {
          console.error("[Read.ai] Failed to post to Discord:", discordError.message);
          // Don't fail the webhook if Discord posting fails
        }
      } else {
        console.log("[Read.ai] No matching Discord channel found for participants");
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Meeting data received",
        matched: !!matchedChannelId,
        channelId: matchedChannelId 
      });
    } catch (error: any) {
      console.error("Read.ai webhook error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
