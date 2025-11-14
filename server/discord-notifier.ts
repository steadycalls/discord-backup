import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

interface MeetingNotification {
  channelId: string;
  title: string;
  link?: string;
  summary?: string;
  participants?: any[];
  matchedEmail?: string | null;
}

/**
 * Posts a Read.ai meeting summary to a Discord channel via the Python bot
 * 
 * This function creates a temporary file with meeting data and triggers
 * the Discord bot to post it to the specified channel.
 */
export async function postMeetingToDiscord(meeting: MeetingNotification): Promise<void> {
  // Path to the Discord bot directory
  const botDir = path.join(__dirname, "../../discord_bot");
  const scriptPath = path.join(botDir, "post_meeting.py");
  
  // Prepare meeting data as JSON
  const meetingJson = JSON.stringify({
    channel_id: meeting.channelId,
    title: meeting.title,
    link: meeting.link || "",
    summary: meeting.summary || "",
    participants: meeting.participants || [],
    matched_email: meeting.matchedEmail || "",
  });
  
  // Escape JSON for shell
  const escapedJson = meetingJson.replace(/"/g, '\\"');
  
  try {
    // Call the Python script to post to Discord
    const { stdout, stderr } = await execAsync(
      `cd "${botDir}" && python post_meeting.py '${escapedJson}'`,
      { timeout: 10000 }
    );
    
    if (stderr && !stderr.includes("discord.py")) {
      console.warn("[Discord Notifier] Warning:", stderr);
    }
    
    if (stdout) {
      console.log("[Discord Notifier]", stdout.trim());
    }
  } catch (error: any) {
    console.error("[Discord Notifier] Error posting to Discord:", error.message);
    throw new Error(`Failed to post meeting to Discord: ${error.message}`);
  }
}
