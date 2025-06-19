import { storage } from "../storage";
import { youtubeService } from "./youtubeService";
import { geminiService } from "./geminiService";
import { automationService } from "./automationService";

export class VideoProcessingService {
  private processingChannels = new Set<number>();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start checking for new videos every hour
    this.checkInterval = setInterval(() => {
      this.checkForNewVideos();
    }, 60 * 60 * 1000); // 1 hour
  }

  async startChannelProcessing(channelId: number, isAuthenticated: boolean = false): Promise<void> {
    if (this.processingChannels.has(channelId)) {
      console.log(`Channel ${channelId} is already being processed`);
      return;
    }

    this.processingChannels.add(channelId);

    try {
      const channel = await storage.getChannel(channelId);
      if (!channel) {
        throw new Error(`Channel ${channelId} not found`);
      }

      await this.logProcessing(channelId, null, 'channel_start', 'info', `Starting processing for channel: ${channel.name}`);

      // Step 1: Fetch videos if not completed
      if (!channel.fetchingComplete) {
        await this.fetchChannelVideos(channelId);
      }

      // Step 2: If authenticated, start filtering and processing
      if (isAuthenticated) {
        await this.filterVideos(channelId);
        await this.queueVideosForProcessing(channelId);
        await this.processVideoQueue(channelId);
      } else {
        await this.logProcessing(channelId, null, 'auth_required', 'warning', 'Authentication required to proceed with filtering and processing');
      }

    } catch (error) {
      await this.logProcessing(channelId, null, 'channel_error', 'error', `Channel processing failed: ${error.message}`);
      throw error;
    } finally {
      this.processingChannels.delete(channelId);
    }
  }

  async fetchChannelVideos(channelId: number): Promise<void> {
    const channel = await storage.getChannel(channelId);
    if (!channel) throw new Error(`Channel ${channelId} not found`);

    await this.logProcessing(channelId, null, 'fetch_start', 'info', `Starting video fetch for ${channel.name}`);
    await storage.updateChannelStatus(channelId, 'fetching');

    try {
      let allVideos: any[] = [];
      let nextPageToken = '';
      let pageCount = 0;

      do {
        const videos = await youtubeService.getChannelVideos(channel.channelId, 50, nextPageToken);
        allVideos = allVideos.concat(videos);
        
        // Save videos in batches
        for (const video of videos) {
          const existingVideo = await storage.getVideo(video.id);
          if (!existingVideo) {
            await storage.createVideo({
              videoId: video.id,
              channelId: channelId,
              title: video.title,
              description: video.description || '',
              publishedAt: new Date(video.publishedAt),
              thumbnailUrl: video.thumbnailUrl,
              duration: video.duration,
              viewCount: parseInt(video.viewCount) || 0,
              likeCount: parseInt(video.likeCount) || 0,
              commentCount: parseInt(video.commentCount) || 0,
              processingStage: 'fetched'
            });
          }
        }

        pageCount++;
        await this.logProcessing(channelId, null, 'fetch_progress', 'info', `Fetched page ${pageCount}, total videos: ${allVideos.length}`);
        
        nextPageToken = videos.nextPageToken || '';
      } while (nextPageToken && pageCount < 20); // Limit to prevent infinite loops

      // Update channel statistics
      await storage.updateChannelStats(channelId, allVideos.length, 0);
      await storage.updateChannel(channelId, {
        fetchedVideos: allVideos.length,
        fetchingComplete: true,
        status: 'fetched'
      });

      await this.logProcessing(channelId, null, 'fetch_complete', 'success', `Completed fetching ${allVideos.length} videos for ${channel.name}`);

    } catch (error) {
      await storage.updateChannelStatus(channelId, 'error');
      await this.logProcessing(channelId, null, 'fetch_error', 'error', `Failed to fetch videos: ${error.message}`);
      throw error;
    }
  }

  async filterVideos(channelId: number): Promise<void> {
    const channel = await storage.getChannel(channelId);
    if (!channel) throw new Error(`Channel ${channelId} not found`);

    await this.logProcessing(channelId, null, 'filter_start', 'info', `Starting video filtering for ${channel.name}`);
    await storage.updateChannelStatus(channelId, 'filtering');

    try {
      const videos = await storage.getVideosByChannelId(channelId);
      let filteredCount = 0;

      for (const video of videos) {
        // Check if user has already engaged with this video
        const engagement = await youtubeService.checkUserEngagement(video.videoId, youtubeService.getUserChannelId());
        
        const needsComment = !engagement.hasCommented;
        const needsLike = !engagement.hasLiked;

        if (needsComment || needsLike) {
          await storage.updateVideoEngagement(video.videoId, {
            needsComment,
            needsLike,
            processingStage: 'filtered',
            hasCommented: engagement.hasCommented,
            hasLiked: engagement.hasLiked
          });
          filteredCount++;
        } else {
          await storage.updateVideoStatus(video.videoId, 'completed', null);
        }

        if (filteredCount % 10 === 0) {
          await this.logProcessing(channelId, null, 'filter_progress', 'info', `Filtered ${filteredCount} videos requiring action`);
        }
      }

      await storage.updateChannel(channelId, {
        filteredVideos: filteredCount,
        filteringComplete: true,
        status: 'filtered'
      });

      await this.logProcessing(channelId, null, 'filter_complete', 'success', `Filtering complete: ${filteredCount} videos need action out of ${videos.length} total`);

    } catch (error) {
      await storage.updateChannelStatus(channelId, 'error');
      await this.logProcessing(channelId, null, 'filter_error', 'error', `Failed to filter videos: ${error.message}`);
      throw error;
    }
  }

  async queueVideosForProcessing(channelId: number): Promise<void> {
    const channel = await storage.getChannel(channelId);
    if (!channel) throw new Error(`Channel ${channelId} not found`);

    await this.logProcessing(channelId, null, 'queue_start', 'info', `Starting to queue videos for processing`);

    try {
      const videos = await storage.getVideosNeedingAction(channelId);
      let queuedCount = 0;

      for (const video of videos) {
        // Queue comment action if needed
        if (video.needsComment) {
          await storage.addToVideoQueue({
            videoId: video.videoId,
            channelId: channelId,
            action: 'comment',
            priority: 1
          });
          queuedCount++;
        }

        // Queue like action if needed
        if (video.needsLike) {
          await storage.addToVideoQueue({
            videoId: video.videoId,
            channelId: channelId,
            action: 'like',
            priority: 2
          });
          queuedCount++;
        }

        await storage.updateVideoProcessingStage(video.videoId, 'queued');
      }

      await storage.updateChannel(channelId, {
        queuedVideos: queuedCount,
        status: 'queued'
      });

      await this.logProcessing(channelId, null, 'queue_complete', 'success', `Queued ${queuedCount} actions for processing`);

    } catch (error) {
      await this.logProcessing(channelId, null, 'queue_error', 'error', `Failed to queue videos: ${error.message}`);
      throw error;
    }
  }

  async processVideoQueue(channelId: number): Promise<void> {
    const channel = await storage.getChannel(channelId);
    if (!channel) throw new Error(`Channel ${channelId} not found`);

    await this.logProcessing(channelId, null, 'process_start', 'info', `Starting video queue processing`);
    await storage.updateChannelStatus(channelId, 'processing');

    try {
      const queueItems = await storage.getPendingQueueItems(channelId);
      const settings = await storage.getAutomationSettings();
      const delayMs = (settings?.delayMinutes || 10) * 60 * 1000;

      for (const item of queueItems) {
        try {
          await this.processQueueItem(item);
          
          // Wait for the specified delay between actions
          if (queueItems.indexOf(item) < queueItems.length - 1) {
            await this.logProcessing(channelId, item.videoId, 'delay', 'info', `Waiting ${settings?.delayMinutes || 10} minutes before next action`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          await this.logProcessing(channelId, item.videoId, 'process_error', 'error', `Failed to process ${item.action}: ${error.message}`);
        }
      }

      const completedCount = await storage.getCompletedVideosCount(channelId);
      await storage.updateChannel(channelId, {
        completedVideos: completedCount,
        status: 'completed'
      });

      await this.logProcessing(channelId, null, 'process_complete', 'success', `Completed processing ${queueItems.length} actions`);

    } catch (error) {
      await storage.updateChannelStatus(channelId, 'error');
      await this.logProcessing(channelId, null, 'process_error', 'error', `Failed to process video queue: ${error.message}`);
      throw error;
    }
  }

  async processQueueItem(item: any): Promise<void> {
    await storage.updateQueueItemStatus(item.id, 'processing');

    try {
      const video = await storage.getVideo(item.videoId);
      if (!video) throw new Error(`Video ${item.videoId} not found`);

      if (item.action === 'comment') {
        const commentText = await geminiService.generateComment(
          video.title,
          video.description || '',
          "Generate an encouraging, positive comment that shows genuine interest in the content"
        );

        await youtubeService.postComment(item.videoId, commentText);
        await storage.updateVideoComment(item.videoId, commentText, true);
        
        await this.logProcessing(item.channelId, item.videoId, 'comment_success', 'success', `Posted comment: ${commentText.substring(0, 50)}...`);
      } else if (item.action === 'like') {
        await youtubeService.likeVideo(item.videoId);
        await storage.updateVideoLike(item.videoId, true);
        
        await this.logProcessing(item.channelId, item.videoId, 'like_success', 'success', `Liked video: ${video.title}`);
      }

      await storage.updateQueueItemStatus(item.id, 'completed');
      await storage.updateVideoProcessingStage(item.videoId, 'completed');

    } catch (error) {
      await storage.updateQueueItemStatus(item.id, 'failed', error.message);
      await storage.incrementQueueItemAttempts(item.id);
      throw error;
    }
  }

  async checkForNewVideos(): Promise<void> {
    const activeChannels = await storage.getActiveChannels();
    
    for (const channel of activeChannels) {
      try {
        const lastCheck = channel.lastNewVideoCheck || channel.createdAt;
        const hoursSinceLastCheck = (Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastCheck >= 1) {
          await this.checkChannelForNewVideos(channel.id);
          await storage.updateChannel(channel.id, {
            lastNewVideoCheck: new Date()
          });
        }
      } catch (error) {
        console.error(`Failed to check for new videos in channel ${channel.id}:`, error);
      }
    }
  }

  async checkChannelForNewVideos(channelId: number): Promise<void> {
    const channel = await storage.getChannel(channelId);
    if (!channel) return;

    const latestVideo = await storage.getLatestVideoForChannel(channelId);
    const latestVideoDate = latestVideo ? new Date(latestVideo.publishedAt) : new Date(0);

    const recentVideos = await youtubeService.getChannelVideos(channel.channelId, 10);
    const newVideos = recentVideos.filter(video => 
      new Date(video.publishedAt) > latestVideoDate
    );

    if (newVideos.length > 0) {
      await this.logProcessing(channelId, null, 'new_videos_found', 'info', `Found ${newVideos.length} new videos`);
      
      // Add new videos to database
      for (const video of newVideos) {
        await storage.createVideo({
          videoId: video.id,
          channelId: channelId,
          title: video.title,
          description: video.description || '',
          publishedAt: new Date(video.publishedAt),
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          viewCount: parseInt(video.viewCount) || 0,
          likeCount: parseInt(video.likeCount) || 0,
          commentCount: parseInt(video.commentCount) || 0,
          processingStage: 'fetched'
        });
      }

      // Update channel stats
      await storage.updateChannelStats(channelId, channel.totalVideos + newVideos.length, channel.processedVideos);
      
      // If authenticated, process new videos
      const user = await storage.getUser(1); // Assuming single user for now
      if (user?.youtubeToken) {
        await this.startChannelProcessing(channelId, true);
      }
    }
  }

  async logProcessing(channelId: number, videoId: string | null, stage: string, status: string, message: string, metadata?: any): Promise<void> {
    await storage.createProcessingLog({
      channelId,
      videoId,
      stage,
      status,
      message,
      metadata
    });
  }

  async getChannelProcessingStatus(channelId: number): Promise<any> {
    const channel = await storage.getChannel(channelId);
    if (!channel) throw new Error(`Channel ${channelId} not found`);

    const videos = await storage.getVideosByChannelId(channelId);
    const logs = await storage.getProcessingLogs(channelId, 20);
    
    const stats = {
      totalVideos: videos.length,
      fetchedVideos: videos.filter(v => v.processingStage === 'fetched' || v.processingStage === 'filtered' || v.processingStage === 'queued' || v.processingStage === 'completed').length,
      filteredVideos: videos.filter(v => v.processingStage === 'filtered' || v.processingStage === 'queued' || v.processingStage === 'completed').length,
      queuedVideos: videos.filter(v => v.processingStage === 'queued').length,
      completedVideos: videos.filter(v => v.processingStage === 'completed').length,
      needsComment: videos.filter(v => v.needsComment && !v.hasCommented).length,
      needsLike: videos.filter(v => v.needsLike && !v.hasLiked).length,
      commented: videos.filter(v => v.hasCommented).length,
      liked: videos.filter(v => v.hasLiked).length,
      commentPending: videos.filter(v => v.needsComment && !v.hasCommented).length,
      likePending: videos.filter(v => v.needsLike && !v.hasLiked).length
    };

    return {
      channel,
      stats,
      logs: logs.slice(0, 10), // Latest 10 logs
      isProcessing: this.processingChannels.has(channelId)
    };
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const videoProcessingService = new VideoProcessingService();