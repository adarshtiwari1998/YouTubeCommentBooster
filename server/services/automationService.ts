import cron from 'node-cron';
import { storage } from '../storage';
import { youtubeService } from './youtubeService';
import { geminiService } from './geminiService';

export class AutomationService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private currentChannelIndex = 0;

  async startAutomation(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Automation is already running');
    }

    const settings = await storage.getAutomationSettings();
    if (!settings || !settings.isActive) {
      throw new Error('Automation is not enabled');
    }

    this.isRunning = true;
    
    // Log automation start
    await storage.createActivityLog({
      type: 'system',
      message: 'Automation started',
      videoId: null,
      channelId: null,
      metadata: null,
    });

    // Start processing immediately
    this.processNextVideo();

    // Schedule recurring processing based on delay
    const cronExpression = this.getCronExpression(settings.delayMinutes);
    this.cronJob = cron.schedule(cronExpression, () => {
      this.processNextVideo();
    });
  }

  async stopAutomation(): Promise<void> {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }
    
    this.isRunning = false;
    
    await storage.createActivityLog({
      type: 'system',
      message: 'Automation stopped',
      videoId: null,
      channelId: null,
      metadata: null,
    });

    await storage.updateAutomationSettings({ isActive: false });
  }

  async pauseAutomation(): Promise<void> {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }
    
    this.isRunning = false;
    
    await storage.createActivityLog({
      type: 'system',
      message: 'Automation paused',
      videoId: null,
      channelId: null,
      metadata: null,
    });
  }

  private async processNextVideo(): Promise<void> {
    try {
      const settings = await storage.getAutomationSettings();
      if (!settings || !settings.isActive) {
        await this.stopAutomation();
        return;
      }

      // Check daily comment limit
      const stats = await storage.getStats();
      if (stats.commentsToday >= settings.maxCommentsPerDay) {
        await storage.createActivityLog({
          type: 'system',
          message: `Daily comment limit reached (${settings.maxCommentsPerDay})`,
          videoId: null,
          channelId: null,
          metadata: null,
        });
        return;
      }

      // Get all pending videos
      const pendingVideos = await storage.getPendingVideos();
      if (pendingVideos.length === 0) {
        await storage.createActivityLog({
          type: 'system',
          message: 'No pending videos found. Automation complete.',
          videoId: null,
          channelId: null,
          metadata: null,
        });
        await this.stopAutomation();
        return;
      }

      // Process next video
      const video = pendingVideos[0];
      await this.processVideo(video);

    } catch (error) {
      console.error('Error in automation process:', error);
      await storage.createActivityLog({
        type: 'error',
        message: `Automation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        videoId: null,
        channelId: null,
        metadata: null,
      });
    }
  }

  private async processVideo(video: any): Promise<void> {
    try {
      await storage.updateVideoStatus(video.videoId, 'processing');

      // Get video details for better comment generation
      const videoDetails = await youtubeService.getVideoDetails(video.videoId);
      if (!videoDetails) {
        throw new Error('Could not fetch video details');
      }

      // Generate comment using Gemini
      const settings = await storage.getAutomationSettings();
      const commentText = await geminiService.generateComment(
        videoDetails.title || video.title,
        videoDetails.description || '',
        settings?.aiPrompt || ''
      );

      // Post comment
      await youtubeService.postComment(video.videoId, commentText);
      await storage.updateVideoComment(video.videoId, commentText, true);

      // Like video
      await youtubeService.likeVideo(video.videoId);
      await storage.updateVideoLike(video.videoId, true);

      // Update video status
      await storage.updateVideoStatus(video.videoId, 'completed');

      // Log success
      await storage.createActivityLog({
        type: 'comment',
        message: `Commented on "${videoDetails.title}"`,
        videoId: video.videoId,
        channelId: video.channelId,
        metadata: { commentText },
      });

      // Update API quota
      await storage.updateYouTubeQuota(5); // Rough estimate for comment + like operations
      await storage.updateGeminiQuota(1);

    } catch (error) {
      console.error('Error processing video:', error);
      
      await storage.updateVideoStatus(
        video.videoId, 
        'error', 
        error instanceof Error ? error.message : 'Unknown error'
      );

      await storage.createActivityLog({
        type: 'error',
        message: `Failed to process video "${video.title}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        videoId: video.videoId,
        channelId: video.channelId,
        metadata: null,
      });
    }
  }

  private getCronExpression(minutes: number): string {
    // Convert minutes to cron expression
    if (minutes < 60) {
      return `*/${minutes} * * * *`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `0 */${hours} * * *`;
    }
  }

  async syncChannelVideos(channelId: number): Promise<void> {
    try {
      const channel = await storage.getChannel(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      await storage.updateChannelStatus(channelId, 'processing');

      // Get videos from YouTube
      const youtubeVideos = await youtubeService.getChannelVideos(channel.channelId);
      
      let newVideosCount = 0;
      for (const ytVideo of youtubeVideos) {
        const existingVideo = await storage.getVideo(ytVideo.id);
        if (!existingVideo) {
          await storage.createVideo({
            videoId: ytVideo.id,
            channelId: channelId,
            title: ytVideo.title,
            publishedAt: new Date(ytVideo.publishedAt),
            hasCommented: false,
            hasLiked: false,
            commentText: null,
            commentedAt: null,
            status: 'pending',
            errorMessage: null,
          });
          newVideosCount++;
        }
      }

      // Update channel stats
      const allVideos = await storage.getVideosByChannelId(channelId);
      const processedVideos = allVideos.filter(v => v.hasCommented).length;
      
      await storage.updateChannelStats(channelId, youtubeVideos.length, processedVideos);
      await storage.updateChannelStatus(channelId, 'active');

      await storage.createActivityLog({
        type: 'system',
        message: `Synced ${newVideosCount} new videos from ${channel.name}`,
        videoId: null,
        channelId: channelId,
        metadata: { newVideosCount, totalVideos: youtubeVideos.length },
      });

    } catch (error) {
      console.error('Error syncing channel videos:', error);
      await storage.updateChannelStatus(channelId, 'error');
      throw error;
    }
  }

  isAutomationRunning(): boolean {
    return this.isRunning;
  }
}

export const automationService = new AutomationService();
