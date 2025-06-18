import { 
  users, channels, videos, automationSettings, activityLogs, apiQuota,
  type User, type InsertUser, type Channel, type InsertChannel,
  type Video, type InsertVideo, type AutomationSettings, type InsertAutomationSettings,
  type ActivityLog, type InsertActivityLog, type ApiQuota
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(id: number, accessToken: string, refreshToken: string, channelId: string): Promise<void>;

  // Channel methods
  getAllChannels(): Promise<Channel[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  getChannelByChannelId(channelId: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannelStats(id: number, totalVideos: number, processedVideos: number): Promise<void>;
  updateChannelStatus(id: number, status: string): Promise<void>;

  // Video methods
  getVideosByChannelId(channelId: number): Promise<Video[]>;
  getVideo(videoId: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideoComment(videoId: string, commentText: string, hasCommented: boolean): Promise<void>;
  updateVideoLike(videoId: string, hasLiked: boolean): Promise<void>;
  updateVideoStatus(videoId: string, status: string, errorMessage?: string): Promise<void>;
  getPendingVideos(): Promise<Video[]>;

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private channels: Map<number, Channel>;
  private videos: Map<string, Video>;
  private automationSettings: AutomationSettings | undefined;
  private activityLogs: ActivityLog[];
  private apiQuota: Map<string, ApiQuota>;
  private currentUserId: number = 1;
  private currentChannelId: number = 1;
  private currentVideoId: number = 1;
  private currentActivityId: number = 1;
  private currentQuotaId: number = 1;

  constructor() {
    this.users = new Map();
    this.channels = new Map();
    this.videos = new Map();
    this.activityLogs = [];
    this.apiQuota = new Map();
    
    // Initialize with default channels
    this.initializeDefaultChannels();
    this.initializeDefaultSettings();
  }

  private initializeDefaultChannels() {
    const defaultChannels = [
      { name: "How To Have Fun Outdoors", handle: "@HowToHaveFunOutdoors", channelId: "UCHowToHaveFunOutdoors" },
      { name: "How To Have Fun Cruising", handle: "@HowToHaveFunCruising", channelId: "UCHowToHaveFunCruising" },
      { name: "How To Have Fun Camping", handle: "@howtohavefuncamping", channelId: "UCHowToHaveFunCamping" },
    ];

    defaultChannels.forEach(channel => {
      const id = this.currentChannelId++;
      this.channels.set(id, {
        id,
        ...channel,
        totalVideos: 0,
        processedVideos: 0,
        status: "pending",
        isActive: true,
        createdAt: new Date(),
      });
    });
  }

  private initializeDefaultSettings() {
    this.automationSettings = {
      id: 1,
      isActive: false,
      delayMinutes: 10,
      aiPrompt: "I want to comment on this video as a user in short version. my comment is encouraging others and its a positive impact and it also influence others. Make sure it not look like ai generated look like raw comment",
      maxCommentsPerDay: 100,
      lastRunAt: null,
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      youtubeToken: null,
      youtubeRefreshToken: null,
      youtubeChannelId: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserTokens(id: number, accessToken: string, refreshToken: string, channelId: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.youtubeToken = accessToken;
      user.youtubeRefreshToken = refreshToken;
      user.youtubeChannelId = channelId;
      this.users.set(id, user);
    }
  }

  async getAllChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async getChannelByChannelId(channelId: string): Promise<Channel | undefined> {
    return Array.from(this.channels.values()).find(channel => channel.channelId === channelId);
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const id = this.currentChannelId++;
    const channel: Channel = {
      ...insertChannel,
      id,
      createdAt: new Date(),
    };
    this.channels.set(id, channel);
    return channel;
  }

  async updateChannelStats(id: number, totalVideos: number, processedVideos: number): Promise<void> {
    const channel = this.channels.get(id);
    if (channel) {
      channel.totalVideos = totalVideos;
      channel.processedVideos = processedVideos;
      this.channels.set(id, channel);
    }
  }

  async updateChannelStatus(id: number, status: string): Promise<void> {
    const channel = this.channels.get(id);
    if (channel) {
      channel.status = status;
      this.channels.set(id, channel);
    }
  }

  async getVideosByChannelId(channelId: number): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(video => video.channelId === channelId);
  }

  async getVideo(videoId: string): Promise<Video | undefined> {
    return this.videos.get(videoId);
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = this.currentVideoId++;
    const video: Video = {
      ...insertVideo,
      id,
    };
    this.videos.set(insertVideo.videoId, video);
    return video;
  }

  async updateVideoComment(videoId: string, commentText: string, hasCommented: boolean): Promise<void> {
    const video = this.videos.get(videoId);
    if (video) {
      video.commentText = commentText;
      video.hasCommented = hasCommented;
      video.commentedAt = new Date();
      this.videos.set(videoId, video);
    }
  }

  async updateVideoLike(videoId: string, hasLiked: boolean): Promise<void> {
    const video = this.videos.get(videoId);
    if (video) {
      video.hasLiked = hasLiked;
      this.videos.set(videoId, video);
    }
  }

  async updateVideoStatus(videoId: string, status: string, errorMessage?: string): Promise<void> {
    const video = this.videos.get(videoId);
    if (video) {
      video.status = status;
      video.errorMessage = errorMessage || null;
      this.videos.set(videoId, video);
    }
  }

  async getPendingVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(video => 
      !video.hasCommented && video.status === "pending"
    );
  }

  async getAutomationSettings(): Promise<AutomationSettings | undefined> {
    return this.automationSettings;
  }

  async updateAutomationSettings(settings: Partial<InsertAutomationSettings>): Promise<void> {
    if (this.automationSettings) {
      this.automationSettings = { ...this.automationSettings, ...settings };
    }
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = this.currentActivityId++;
    const log: ActivityLog = {
      ...insertLog,
      id,
      createdAt: new Date(),
    };
    this.activityLogs.push(log);
    return log;
  }

  async getRecentActivityLogs(limit = 10): Promise<ActivityLog[]> {
    return this.activityLogs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getTodayQuota(): Promise<ApiQuota | undefined> {
    const today = new Date().toISOString().split('T')[0];
    return this.apiQuota.get(today);
  }

  async updateYouTubeQuota(used: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let quota = this.apiQuota.get(today);
    if (!quota) {
      quota = {
        id: this.currentQuotaId++,
        date: today,
        youtubeQuotaUsed: 0,
        geminiQuotaUsed: 0,
        createdAt: new Date(),
      };
    }
    quota.youtubeQuotaUsed += used;
    this.apiQuota.set(today, quota);
  }

  async updateGeminiQuota(used: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let quota = this.apiQuota.get(today);
    if (!quota) {
      quota = {
        id: this.currentQuotaId++,
        date: today,
        youtubeQuotaUsed: 0,
        geminiQuotaUsed: 0,
        createdAt: new Date(),
      };
    }
    quota.geminiQuotaUsed += used;
    this.apiQuota.set(today, quota);
  }

  async getStats(): Promise<{
    totalChannels: number;
    pendingVideos: number;
    commentsToday: number;
    successRate: number;
  }> {
    const totalChannels = this.channels.size;
    const pendingVideos = Array.from(this.videos.values()).filter(v => !v.hasCommented).length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = this.activityLogs.filter(log => 
      log.createdAt.toISOString().split('T')[0] === today && log.type === 'comment'
    );
    const commentsToday = todayLogs.length;
    
    const totalComments = this.activityLogs.filter(log => log.type === 'comment').length;
    const errorComments = this.activityLogs.filter(log => log.type === 'error').length;
    const successRate = totalComments > 0 ? ((totalComments - errorComments) / totalComments) * 100 : 0;

    return {
      totalChannels,
      pendingVideos,
      commentsToday,
      successRate: Math.round(successRate * 10) / 10,
    };
  }
}

export const storage = new MemStorage();
