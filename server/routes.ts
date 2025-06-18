import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { youtubeService } from "./services/youtubeService";
import { geminiService } from "./services/geminiService";
import { automationService } from "./services/automationService";
import { requireAuth, requireYouTubeAuth, type AuthRequest } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a demo user if none exists
  const existingUser = await storage.getUserByUsername("demo");
  if (!existingUser) {
    await storage.createUser({
      username: "demo",
      password: "demo123"
    });
  }

  // Auth routes
  app.get("/api/auth/youtube", requireAuth, (req: AuthRequest, res) => {
    try {
      const authUrl = youtubeService.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/auth/callback", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Authorization code required" });
      }

      const tokens = await youtubeService.getTokenFromCode(code);
      if (!tokens.access_token || !tokens.refresh_token) {
        return res.status(400).json({ error: "Failed to get tokens" });
      }

      // Get user's channel ID
      youtubeService.setCredentials(tokens.access_token, tokens.refresh_token);
      
      // For demo, we'll use a placeholder channel ID
      const channelId = "UC_demo_channel_id";
      
      await storage.updateUserTokens(
        req.user.id,
        tokens.access_token,
        tokens.refresh_token,
        channelId
      );

      res.redirect("/?auth=success");
    } catch (error) {
      console.error("Auth callback error:", error);
      res.redirect("/?auth=error");
    }
  });

  app.get("/api/auth/status", requireAuth, (req: AuthRequest, res) => {
    res.json({
      authenticated: !!req.user.youtubeToken,
      user: {
        username: req.user.username,
        youtubeChannelId: req.user.youtubeChannelId,
      },
    });
  });

  // Dashboard stats
  app.get("/api/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Channels
  app.get("/api/channels", requireAuth, async (req: AuthRequest, res) => {
    try {
      const channels = await storage.getAllChannels();
      const channelsWithProgress = await Promise.all(
        channels.map(async (channel) => {
          const videos = await storage.getVideosByChannelId(channel.id);
          const progress = (channel.totalVideos || 0) > 0 
            ? Math.round(((channel.processedVideos || 0) / (channel.totalVideos || 0)) * 100)
            : 0;
          
          return {
            ...channel,
            progress,
            pendingVideos: (channel.totalVideos || 0) - (channel.processedVideos || 0),
          };
        })
      );
      
      res.json(channelsWithProgress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.post("/api/channels", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { channelUrl } = req.body;
      
      if (!channelUrl) {
        return res.status(400).json({ error: "Channel URL is required" });
      }

      // Extract handle from URL
      const urlMatch = channelUrl.match(/@([^/?]+)/);
      if (!urlMatch) {
        return res.status(400).json({ error: "Invalid YouTube channel URL format" });
      }

      const handle = `@${urlMatch[1]}`;
      
      // Check if channel already exists
      const existingChannel = await storage.getChannelByChannelId(handle);
      if (existingChannel) {
        return res.status(400).json({ error: "Channel already exists" });
      }

      // Get channel info from YouTube API
      const channelId = await youtubeService.getChannelIdFromHandle(handle);
      if (!channelId) {
        return res.status(404).json({ error: "Channel not found on YouTube" });
      }

      // Get channel details
      const channelInfo = await youtubeService.getChannelInfo(channelId);
      if (!channelInfo) {
        return res.status(404).json({ error: "Failed to fetch channel information" });
      }

      // Create channel in database
      const newChannel = await storage.createChannel({
        name: channelInfo.title,
        handle: handle,
        channelId: channelId,
        thumbnailUrl: channelInfo.thumbnailUrl,
        subscriberCount: channelInfo.subscriberCount,
        totalVideos: 0,
        processedVideos: 0,
        status: "pending",
        isActive: true,
      });

      res.json(newChannel);
    } catch (error) {
      console.error("Add channel error:", error);
      res.status(500).json({ error: "Failed to add channel" });
    }
  });

  app.delete("/api/channels/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const channelId = parseInt(req.params.id);
      await storage.deleteChannel(channelId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete channel error:", error);
      res.status(500).json({ error: "Failed to delete channel" });
    }
  });

  app.post("/api/channels/:id/sync", requireAuth, requireYouTubeAuth, async (req: AuthRequest, res) => {
    try {
      const channelId = parseInt(req.params.id);
      youtubeService.setCredentials(req.user.youtubeToken, req.user.youtubeRefreshToken);
      
      await automationService.syncChannelVideos(channelId);
      res.json({ success: true });
    } catch (error) {
      console.error("Channel sync error:", error);
      res.status(500).json({ error: "Failed to sync channel" });
    }
  });

  // Videos
  app.get("/api/channels/:id/videos", requireAuth, async (req: AuthRequest, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const videos = await storage.getVideosByChannelId(channelId);
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  // Automation
  app.get("/api/automation/settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const settings = await storage.getAutomationSettings();
      res.json(settings || {
        isActive: false,
        delayMinutes: 10,
        aiPrompt: "I want to comment on this video as a user in short version. my comment is encouraging others and its a positive impact and it also influence others. Make sure it not look like ai generated look like raw comment",
        maxCommentsPerDay: 100
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation settings" });
    }
  });

  app.put("/api/automation/settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.updateAutomationSettings(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.post("/api/automation/start", requireAuth, requireYouTubeAuth, async (req: AuthRequest, res) => {
    try {
      youtubeService.setCredentials(req.user.youtubeToken, req.user.youtubeRefreshToken);
      await storage.updateAutomationSettings({ isActive: true });
      await automationService.startAutomation();
      res.json({ success: true });
    } catch (error) {
      console.error("Start automation error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start automation" });
    }
  });

  app.post("/api/automation/stop", requireAuth, async (req: AuthRequest, res) => {
    try {
      await automationService.stopAutomation();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to stop automation" });
    }
  });

  app.post("/api/automation/pause", requireAuth, async (req: AuthRequest, res) => {
    try {
      await automationService.pauseAutomation();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to pause automation" });
    }
  });

  app.get("/api/automation/status", requireAuth, (req: AuthRequest, res) => {
    res.json({
      isRunning: automationService.isAutomationRunning(),
    });
  });

  // Activity logs
  app.get("/api/activity", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await storage.getRecentActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // System status
  app.get("/api/system/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const quota = await storage.getTodayQuota();
      const geminiStatus = await geminiService.testConnection();
      
      res.json({
        youtube: {
          status: req.user.youtubeToken ? "connected" : "disconnected",
          quotaUsed: quota?.youtubeQuotaUsed || 0,
          quotaPercentage: Math.round(((quota?.youtubeQuotaUsed || 0) / 10000) * 100)
        },
        gemini: {
          status: geminiStatus ? "connected" : "disconnected",
          quotaUsed: quota?.geminiQuotaUsed || 0,
        },
        automation: {
          status: automationService.isAutomationRunning() ? "running" : "stopped",
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
