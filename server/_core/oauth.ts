import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if user email domain is allowed
      const allowedDomains = ["logicinbound.com"];
      const userEmail = userInfo.email?.toLowerCase() || "";
      const emailDomain = userEmail.split("@")[1];
      
      if (!allowedDomains.includes(emailDomain)) {
        res.status(403).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Access Denied</title>
              <style>
                body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
                .container { text-align: center; max-width: 500px; padding: 2rem; }
                h1 { color: #ef4444; margin-bottom: 1rem; }
                p { margin-bottom: 1.5rem; line-height: 1.6; }
                .email { color: #60a5fa; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Access Denied</h1>
                <p>Only users with <span class="email">@logicinbound.com</span> email addresses can access this application.</p>
                <p>Your email: <span class="email">${userEmail}</span></p>
                <p>Please contact your administrator if you believe this is an error.</p>
              </div>
            </body>
          </html>
        `);
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
