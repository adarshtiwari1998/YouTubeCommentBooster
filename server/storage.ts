import { 
  users, channels, videos, automationSettings, activityLogs, apiQuota,
  type User, type InsertUser, type Channel, type InsertChannel,
  type Video, type InsertVideo, type AutomationSettings, type InsertAutomationSettings,
  type ActivityLog, type InsertActivityLog, type ApiQuota
} from "@shared/schema";
import { videoQueue } from "@shared/video-queue";
import { processingLogs } from "@shared/processing-logs";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(id: number, accessToken: string, refreshToken: string, channelId: string): Promise<void>;
  disconnectYouTube(id: number): Promise<void>;

  // Channel methods
  getAllChannels(): Promise<Channel[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  getChannelByChannelId(channelId: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannelStats(id: number, totalVideos: number, processedVideos: number): Promise<void>;
  updateChannelStatus(id: number, status: string): Promise<void>;
  deleteChannel(id: number): Promise<void>;

  // Video methods
  getVideosByChannelId(channelId: number): Promise<Video[]>;
  getVideo(videoId: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideoComment(videoId: string, commentText: string, hasCommented: boolean): Promise<void>;
  updateVideoLike(videoId: string, hasLiked: boolean): Promise<void>;
  updateVideoStatus(videoId: string, status: string, errorMessage?: string): Promise<void>;
  getPendingVideos(): Promise<Video[]>;
  getVideosNeedingAction(): Promise<Video[]>;

  // Automation settings
  getAutomationSettings(): Promise<AutomationSettings | undefined>;
  updateAutomationSettings(settings: Partial<InsertAutomationSettings>): Promise<void>;

  // Activity logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivityLogs(limit?: number): Promise<ActivityLog[]>;

  // API quota
  getTodayQuota(): Promise<ApiQuota | undefined>;
  updateYouTubeQuota(used: number): Promise<void>;
  updateGeminiQuota(used: number): Promise<void>;

  // Statistics
  getStats(): Promise<{
    totalChannels: number;
    pendingVideos: number;
    commentsToday: number;
    successRate: number;
  }>;

  // Video processing methods
  updateChannel(id: number, updates: Partial<Channel>): Promise<void>;
  updateVideoEngagement(videoId: string, updates: any): Promise<void>;
  updateVideoProcessingStage(videoId: string, stage: string): Promise<void>;
  getVideosNeedingAction(channelId?: number): Promise<Video[]>;
  addToVideoQueue(item: any): Promise<void>;
  getPendingQueueItems(channelId?: number): Promise<any[]>;
  updateQueueItemStatus(id: number, status: string, errorMessage?: string): Promise<void>;
  incrementQueueItemAttempts(id: number): Promise<void>;
  getCompletedVideosCount(channelId: number): Promise<number>;
  getActiveChannels(): Promise<Channel[]>;
  getLatestVideoForChannel(channelId: number): Promise<Video | undefined>;
  createProcessingLog(log: any): Promise<void>;
  getProcessingLogs(channelId?: number, limit?: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserTokens(id: number, accessToken: string, refreshToken: string, channelId: string): Promise<void> {
    await db
      .update(users)
      .set({
        youtubeToken: accessToken,
        youtubeRefreshToken: refreshToken,
        youtubeChannelId: channelId,
      })
      .where(eq(users.id, id));
  }

  async disconnectYouTube(id: number): Promise<void> {
    await db
      .update(users)
      .set({
        youtubeToken: null,
        youtubeRefreshToken: null,
        youtubeChannelId: null,
      })
      .where(eq(users.id, id));
  }

  async getAllChannels(): Promise<Channel[]> {
    return await db.select().from(channels).orderBy(desc(channels.createdAt));
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || undefined;
  }

  async getChannelByChannelId(channelId: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.channelId, channelId));
    return channel || undefined;
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const [channel] = await db
      .insert(channels)
      .values(insertChannel)
      .returning();
    return channel;
  }

  async updateChannelStats(id: number, totalVideos: number, processedVideos: number): Promise<void> {
    await db
      .update(channels)
      .set({
        totalVideos,
        processedVideos,
        lastSyncAt: new Date(),
      })
      .where(eq(channels.id, id));
  }

  async updateChannelStatus(id: number, status: string): Promise<void> {
    await db
      .update(channels)
      .set({ status })
      .where(eq(channels.id, id));
  }

  async deleteChannel(id: number): Promise<void> {
    // Delete all related data for this channel
    await db.delete(videos).where(eq(videos.channelId, id));
    await db.delete(videoQueue).where(eq(videoQueue.channelId, id));
    await db.delete(processingLogs).where(eq(processingLogs.channelId, id));
    // Delete the channel
    await db.delete(channels).where(eq(channels.id, id));
  }

  async getVideosByChannelId(channelId: number): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.channelId, channelId))
      .orderBy(desc(videos.publishedAt));
  }

  async getVideo(videoId: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.videoId, videoId));
    return video || undefined;
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const [video] = await db
      .insert(videos)
      .values(insertVideo)
      .returning();
    return video;
  }

  async updateVideoComment(videoId: string, commentText: string, hasCommented: boolean): Promise<void> {
    await db
      .update(videos)
      .set({
        commentText,
        hasCommented,
        commentedAt: new Date(),
      })
      .where(eq(videos.videoId, videoId));
  }

  async updateVideoLike(videoId: string, hasLiked: boolean): Promise<void> {
    await db
      .update(videos)
      .set({ hasLiked })
      .where(eq(videos.videoId, videoId));
  }

  async updateVideoStatus(videoId: string, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(videos)
      .set({
        status,
        errorMessage: errorMessage || null,
      })
      .where(eq(videos.videoId, videoId));
  }

  async getPendingVideos(): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.hasCommented, false),
        eq(videos.status, "pending")
      ))
      .orderBy(videos.publishedAt);
  }

  async getVideosNeedingAction(): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.status, "pending")
      ))
      .orderBy(videos.publishedAt);
  }

  async getAutomationSettings(): Promise<AutomationSettings | undefined> {
    const [settings] = await db.select().from(automationSettings).limit(1);
    return settings || undefined;
  }

  async updateAutomationSettings(settings: Partial<InsertAutomationSettings>): Promise<void> {
    const existing = await this.getAutomationSettings();
    if (existing) {
      await db
        .update(automationSettings)
        .set(settings)
        .where(eq(automationSettings.id, existing.id));
    } else {
      await db.insert(automationSettings).values(settings);
    }
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getRecentActivityLogs(limit = 10): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getTodayQuota(): Promise<ApiQuota | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [quota] = await db
      .select()
      .from(apiQuota)
      .where(eq(apiQuota.date, today));
    return quota || undefined;
  }

  async updateYouTubeQuota(used: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.getTodayQuota();
    
    if (existing) {
      await db
        .update(apiQuota)
        .set({ youtubeQuotaUsed: (existing.youtubeQuotaUsed || 0) + used })
        .where(eq(apiQuota.id, existing.id));
    } else {
      await db.insert(apiQuota).values({
        date: today,
        youtubeQuotaUsed: used,
        geminiQuotaUsed: 0,
      });
    }
  }

  async updateGeminiQuota(used: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.getTodayQuota();
    
    if (existing) {
      await db
        .update(apiQuota)
        .set({ geminiQuotaUsed: (existing.geminiQuotaUsed || 0) + used })
        .where(eq(apiQuota.id, existing.id));
    } else {
      await db.insert(apiQuota).values({
        date: today,
        youtubeQuotaUsed: 0,
        geminiQuotaUsed: used,
      });
    }
  }

  async getStats(): Promise<{
    totalChannels: number;
    pendingVideos: number;
    commentsToday: number;
    successRate: number;
  }> {
    const totalChannels = (await db.select().from(channels)).length;
    const pendingVideos = (await db
      .select()
      .from(videos)
      .where(eq(videos.hasCommented, false))).length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.type, 'comment'));
    
    const commentsToday = todayLogs.filter(log => 
      log.createdAt && log.createdAt.toISOString().split('T')[0] === today
    ).length;
    
    const totalComments = (await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.type, 'comment'))).length;
    
    const errorComments = (await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.type, 'error'))).length;
    
    const successRate = totalComments > 0 ? ((totalComments - errorComments) / totalComments) * 100 : 0;

    return {
      totalChannels,
      pendingVideos,
      commentsToday,
      successRate: Math.round(successRate * 10) / 10,
    };
  }

  // Video processing methods implementation
  async updateChannel(id: number, updates: any): Promise<void> {
    await db.update(channels).set(updates).where(eq(channels.id, id));
  }

  async updateVideoEngagement(videoId: string, updates: any): Promise<void> {
    await db.update(videos).set(updates).where(eq(videos.videoId, videoId));
  }

  async updateVideoProcessingStage(videoId: string, stage: string): Promise<void> {
    await db.update(videos).set({ processingStage: stage }).where(eq(videos.videoId, videoId));
  }

  async getVideosNeedingAction(channelId?: number): Promise<Video[]> {
    const query = db.select().from(videos).where(
      and(
        channelId ? eq(videos.channelId, channelId) : undefined,
        or(
          eq(videos.needsComment, true),
          eq(videos.needsLike, true)
        )
      )
    );
    return await query;
  }

  async addToVideoQueue(item: any): Promise<void> {
    await db.execute(sql`
      INSERT INTO video_queue (video_id, channel_id, action, priority, scheduled_at, status)
      VALUES (${item.videoId}, ${item.channelId}, ${item.action}, ${item.priority}, NOW(), 'pending')
    `);
  }

  async getPendingQueueItems(channelId?: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM video_queue 
      WHERE status = 'pending' 
      ${channelId ? sql`AND channel_id = ${channelId}` : sql``}
      ORDER BY priority, scheduled_at
    `);
    return result.rows as any[];
  }

  async updateQueueItemStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    await db.execute(sql`
      UPDATE video_queue 
      SET status = ${status}, 
          processed_at = ${status === 'completed' ? new Date() : null},
          error_message = ${errorMessage || null}
      WHERE id = ${id}
    `);
  }

  async incrementQueueItemAttempts(id: number): Promise<void> {
    await db.execute(sql`
      UPDATE video_queue 
      SET attempts = attempts + 1
      WHERE id = ${id}
    `);
  }

  async getCompletedVideosCount(channelId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(videos)
      .where(and(
        eq(videos.channelId, channelId),
        eq(videos.processingStage, 'completed')
      ));
    return result[0].count;
  }

  async getActiveChannels(): Promise<Channel[]> {
    return await db.select().from(channels).where(eq(channels.isActive, true));
  }

  async getLatestVideoForChannel(channelId: number): Promise<Video | undefined> {
    const result = await db.select().from(videos)
      .where(eq(videos.channelId, channelId))
      .orderBy(desc(videos.publishedAt))
      .limit(1);
    return result[0];
  }

  async createProcessingLog(log: any): Promise<void> {
    await db.execute(sql`
      INSERT INTO processing_logs (channel_id, video_id, stage, status, message, metadata, created_at)
      VALUES (${log.channelId}, ${log.videoId}, ${log.stage}, ${log.status}, ${log.message}, ${JSON.stringify(log.metadata || {})}, NOW())
    `);
  }

  async getProcessingLogs(channelId?: number, limit = 50): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM processing_logs 
      ${channelId ? sql`WHERE channel_id = ${channelId}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return result.rows as any[];
  }
}

export const storage = new DatabaseStorage();
