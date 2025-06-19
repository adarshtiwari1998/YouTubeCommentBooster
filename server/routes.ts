import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { youtubeService } from "./services/youtubeService";
import { geminiService } from "./services/geminiService";
import { automationService } from "./services/automationService";
import { videoProcessingService } from "./services/videoProcessingService";
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

  app.get("/api/auth/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      let youtubeAccount = null;
      
      if (req.user.youtubeToken) {
        try {
          youtubeService.setCredentials(req.user.youtubeToken, req.user.youtubeRefreshToken);
          youtubeAccount = await youtubeService.getChannelInfo("mine");
        } catch (error) {
          console.error("Error fetching YouTube account details:", error);
        }
      }

      res.json({
        authenticated: true,
        user: {
          id: req.user.id,
          username: req.user.username,
          youtubeConnected: !!req.user.youtubeToken,
          youtubeChannelId: req.user.youtubeChannelId,
          youtubeAccount: youtubeAccount,
        },
      });
    } catch (error) {
      console.error("Auth status error:", error);
      res.status(500).json({ error: "Failed to get auth status" });
    }
  });

  app.get("/api/auth/youtube", requireAuth, (req: AuthRequest, res) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: "Google OAuth credentials not configured" });
      }
      
      if (!process.env.YOUTUBE_API_KEY) {
        return res.status(500).json({ error: "YouTube API key not configured" });
      }
      
      const authUrl = youtubeService.getAuthUrl();
      console.log("Generated auth URL:", authUrl);
      res.json({ authUrl });
    } catch (error) {
      console.error("YouTube auth URL error:", error);
      res.status(500).json({ error: "Failed to generate YouTube authentication URL" });
    }
  });

  app.get("/api/auth/youtube/callback", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { code, error } = req.query;
      
      // Handle OAuth errors (user denied access, etc.)
      if (error) {
        console.log("OAuth error:", error);
        return res.redirect("/settings?error=access_denied");
      }
      
      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }

      const tokens = await youtubeService.getTokenFromCode(code as string);
      youtubeService.setCredentials(tokens.access_token, tokens.refresh_token);
      
      const userChannelInfo = await youtubeService.getChannelInfo("mine");
      
      if (!userChannelInfo) {
        return res.status(400).json({ error: "Unable to fetch YouTube channel information" });
      }

      await storage.updateUserTokens(
        req.user.id,
        tokens.access_token,
        tokens.refresh_token,
        userChannelInfo.id || 'unknown'
      );

      await storage.createActivityLog({
        type: "info",
        message: `YouTube authentication successful for channel: ${userChannelInfo.title}`,
        metadata: { channelId: userChannelInfo.id, channelName: userChannelInfo.title },
      });

      res.redirect("/settings?auth=success");
    } catch (error) {
      console.error("YouTube callback error:", error);
      
      // Handle specific OAuth errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('invalid_grant')) {
        return res.redirect("/settings?error=expired_code");
      }
      
      res.redirect("/settings?error=auth_failed");
    }
  });

  // YouTube disconnect
  app.post("/api/auth/youtube/disconnect", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      
      // Disconnect YouTube account
      await storage.disconnectYouTube(userId);
      
      res.json({ success: true, message: "YouTube account disconnected successfully" });
    } catch (error) {
      console.error("YouTube disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect YouTube account" });
    }
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
      
      // Auto-start fetching for new channels
      for (const channel of channels) {
        if (channel.status === 'pending') {
          videoProcessingService.startChannelProcessing(channel.id, false).catch(error => {
            console.error(`Auto-fetch failed for channel ${channel.id}:`, error);
          });
        }
      }
      
      res.json(channels);
    } catch (error) {
      console.error("Get channels error:", error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.post("/api/channels", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { channelUrl } = req.body;
      
      if (!channelUrl || typeof channelUrl !== 'string') {
        return res.status(400).json({ error: "Valid channel URL is required" });
      }

      // Extract channel handle from URL
      const urlPattern = /youtube\.com\/@([^\/\?]+)/;
      const match = channelUrl.match(urlPattern);
      
      if (!match) {
        return res.status(400).json({ error: "Invalid YouTube channel URL format. Please use format: https://www.youtube.com/@channelhandle" });
      }

      const handle = `@${match[1]}`;
      
      // Get channel ID from handle using YouTube API
      const channelId = await youtubeService.getChannelIdFromHandle(handle);
      if (!channelId) {
        return res.status(404).json({ error: "Channel not found. Please check the URL and ensure the channel exists." });
      }

      // Check if channel already exists by channel ID or handle
      const existingChannelById = await storage.getChannelByChannelId(channelId);
      if (existingChannelById) {
        return res.status(409).json({ error: "This channel is already added to your automation list." });
      }
      
      // Also check by handle to prevent duplicates with different channel IDs
      const channels = await storage.getAllChannels();
      const existingChannelByHandle = channels.find(c => c.handle === handle);
      if (existingChannelByHandle) {
        return res.status(409).json({ error: "A channel with this handle already exists." });
      }

      // Get channel info to fetch proper name and details
      const channelInfo = await youtubeService.getChannelInfo(channelId);
      if (!channelInfo) {
        return res.status(404).json({ error: "Unable to fetch channel information from YouTube API." });
      }

      // Create channel with fetched information
      const newChannel = await storage.createChannel({
        name: channelInfo.title || handle,
        handle: handle,
        channelId: channelId || '',
        subscriberCount: channelInfo.subscriberCount || "0",
        totalVideos: parseInt(channelInfo.videoCount || '0') || 0,
        processedVideos: 0,
        status: "pending",
        isActive: true,
        thumbnailUrl: channelInfo.thumbnailUrl,
      });

      // Log channel addition
      await storage.createActivityLog({
        type: "info",
        message: `Added new channel: ${channelInfo.title} (${handle})`,
        metadata: { channelId, channelName: channelInfo.title },
      });

      // Start automatic video importing process
      videoProcessingService.startChannelProcessing(newChannel.id, false).catch(error => {
        console.error(`Auto-import failed for channel ${newChannel.id}:`, error);
      });

      res.json(newChannel);
    } catch (error) {
      console.error("Add channel error:", error);
      res.status(500).json({ error: "Failed to add channel. Please try again." });
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
      
      // Enhance videos with engagement status if user is authenticated
      if (req.user.youtubeChannelId) {
        const enhancedVideos = await Promise.all(
          videos.map(async (video) => {
            try {
              const engagement = await youtubeService.checkUserEngagement(
                video.videoId, 
                req.user.youtubeChannelId
              );
              return {
                ...video,
                userHasCommented: engagement.hasCommented,
                userHasLiked: engagement.hasLiked,
                userComment: engagement.comment,
              };
            } catch (error) {
              return video;
            }
          })
        );
        res.json(enhancedVideos);
      } else {
        res.json(videos);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.post("/api/channels/:id/analyze", requireAuth, requireYouTubeAuth, async (req: AuthRequest, res) => {
    try {
      const channelId = parseInt(req.params.id);
      youtubeService.setCredentials(req.user.youtubeToken, req.user.youtubeRefreshToken);
      
      const channel = await storage.getChannel(channelId);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      // Get all videos for the channel
      const videos = await storage.getVideosByChannelId(channelId);
      
      // Filter videos that need action (comment or like)
      const videosNeedingAction = [];
      
      for (const video of videos) {
        const engagement = await youtubeService.checkUserEngagement(
          video.videoId,
          req.user.youtubeChannelId
        );
        
        const needsComment = !engagement.hasCommented;
        const needsLike = !engagement.hasLiked;
        
        if (needsComment || needsLike) {
          videosNeedingAction.push({
            ...video,
            needsComment,
            needsLike,
            userHasCommented: engagement.hasCommented,
            userHasLiked: engagement.hasLiked,
          });
        }
      }

      res.json({
        totalVideos: videos.length,
        videosNeedingAction: videosNeedingAction.length,
        videosNeedingComment: videosNeedingAction.filter(v => v.needsComment).length,
        videosNeedingLike: videosNeedingAction.filter(v => v.needsLike).length,
        videos: videosNeedingAction,
      });
    } catch (error) {
      console.error("Channel analysis error:", error);
      res.status(500).json({ error: "Failed to analyze channel" });
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
          status: process.env.YOUTUBE_API_KEY ? (req.user.youtubeToken ? "connected" : "ready") : "disconnected",
          quotaUsed: quota?.youtubeQuotaUsed || 0,
          quotaPercentage: Math.round(((quota?.youtubeQuotaUsed || 0) / 10000) * 100),
          apiKeyConfigured: !!process.env.YOUTUBE_API_KEY,
          userAuthenticated: !!req.user.youtubeToken
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

  // New video processing endpoints
  app.post("/api/channels/:id/process", requireAuth, async (req: AuthRequest, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const isAuthenticated = !!req.user.youtubeToken;
      
      if (req.user.youtubeToken) {
        youtubeService.setCredentials(req.user.youtubeToken, req.user.youtubeRefreshToken);
      }
      
      // Start processing in background
      videoProcessingService.startChannelProcessing(channelId, isAuthenticated).catch(error => {
        console.error(`Background processing failed for channel ${channelId}:`, error);
      });
      
      res.json({ 
        success: true, 
        message: isAuthenticated ? "Processing started" : "Video fetching started (authentication required for full processing)"
      });
    } catch (error) {
      console.error("Channel processing error:", error);
      res.status(500).json({ error: "Failed to start channel processing" });
    }
  });

  app.get("/api/channels/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const status = await videoProcessingService.getChannelProcessingStatus(channelId);
      res.json(status);
    } catch (error) {
      console.error("Channel status error:", error);
      res.status(500).json({ error: "Failed to get channel status" });
    }
  });

  app.get("/api/channels/:id/videos", requireAuth, async (req: AuthRequest, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const videos = await storage.getVideosByChannelId(channelId);
      res.json(videos);
    } catch (error) {
      console.error("Get videos error:", error);
      res.status(500).json({ error: "Failed to get videos" });
    }
  });

  app.get("/api/processing/logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getProcessingLogs(channelId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Get logs error:", error);
      res.status(500).json({ error: "Failed to get processing logs" });
    }
  });

  app.get("/api/videos/queue", requireAuth, async (req: AuthRequest, res) => {
    try {
      const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
      const queue = await storage.getPendingQueueItems(channelId);
      res.json(queue);
    } catch (error) {
      console.error("Get queue error:", error);
      res.status(500).json({ error: "Failed to get video queue" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
