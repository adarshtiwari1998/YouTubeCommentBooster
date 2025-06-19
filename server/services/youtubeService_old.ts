import { google } from 'googleapis';
import { ApiKeyManager } from './apiKeyManager';

const youtube = google.youtube('v3');

export interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  channelId: string;
}

export interface YouTubeComment {
  id: string;
  textDisplay: string;
  authorDisplayName: string;
  publishedAt: string;
}

export class YouTubeService {
  private apiKeyManager: ApiKeyManager;
  private oauth2Client: any;

  constructor() {
    // Initialize API key manager with environment variable
    const apiKeyString = process.env.YOUTUBE_API_KEY || '';
    this.apiKeyManager = new ApiKeyManager(apiKeyString);
    
    // Get redirect URI from environment variable
    const baseUrl = process.env.REPLIT_DOMAINS || 'http://localhost:5000';
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;
    
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  }

  setCredentials(accessToken: string, refreshToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async getTokenFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async getChannelIdFromHandle(handle: string): Promise<string | null> {
    try {
      // Remove @ symbol if present
      const cleanHandle = handle.replace('@', '');
      
      return await this.apiKeyManager.executeWithRetry(async (apiKey) => {
        const response = await youtube.search.list({
          key: apiKey,
          part: ['snippet'],
          q: cleanHandle,
          type: ['channel'],
          maxResults: 1,
        });

        if (response.data.items && response.data.items.length > 0) {
          return response.data.items[0].snippet?.channelId || null;
        }
        
        return null;
      });
    } catch (error) {
      console.error('Error getting channel ID from handle:', error);
      return null;
    }
  }

  async getChannelVideos(channelId: string, maxResults = 50, pageToken?: string): Promise<YouTubeVideo[]> {
    try {
      // First, get the channel's uploads playlist ID
      const channelResponse = await youtube.channels.list({
        key: this.getCurrentApiKey(),
        part: ['contentDetails'],
        id: [channelId]
      });

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
      
      if (!uploadsPlaylistId) {
        throw new Error('Channel uploads playlist not found');
      }

      // Now get ALL videos from the uploads playlist (includes Shorts)
      const response = await youtube.playlistItems.list({
        key: this.getCurrentApiKey(),
        part: ['snippet'],
        playlistId: uploadsPlaylistId,
        maxResults: maxResults,
        pageToken: pageToken,
      });

      if (!response.data.items) {
        return [];
      }

      const videos = response.data.items.map(item => ({
        id: item.snippet?.resourceId?.videoId || '',
        title: item.snippet?.title || '',
        publishedAt: item.snippet?.publishedAt || '',
        channelId: item.snippet?.channelId || '',
        description: item.snippet?.description || '',
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || '',
        duration: '',
        viewCount: '0',
        likeCount: '0',
        commentCount: '0'
      }));

      // Add nextPageToken to result for pagination
      (videos as any).nextPageToken = response.data.nextPageToken;
      
      return videos;
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      throw error;
    }
  }

  async getUserChannelId(): Promise<string> {
    try {
      const response = await youtube.channels.list({
        auth: this.oauth2Client,
        part: ['id'],
        mine: true
      });
      
      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].id || '';
      }
      
      throw new Error('No channel found for authenticated user');
    } catch (error) {
      console.error('Error getting user channel ID:', error);
      throw error;
    }
  }

  async getUserCommentOnVideo(videoId: string, userChannelId: string): Promise<YouTubeComment | null> {
    try {
      const response = await youtube.commentThreads.list({
        key: this.getCurrentApiKey(),
        part: ['snippet'],
        videoId: videoId,
        maxResults: 100,
      });

      if (!response.data.items) {
        return null;
      }

      // Look for comments from the specific user
      for (const item of response.data.items) {
        const comment = item.snippet?.topLevelComment?.snippet;
        if (comment?.authorChannelId?.value === userChannelId) {
          return {
            id: item.snippet?.topLevelComment?.id || '',
            textDisplay: comment.textDisplay || '',
            authorDisplayName: comment.authorDisplayName || '',
            publishedAt: comment.publishedAt || '',
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking user comment on video:', error);
      return null;
    }
  }

  async postComment(videoId: string, commentText: string): Promise<boolean> {
    try {
      await youtube.commentThreads.insert({
        auth: this.oauth2Client,
        part: ['snippet'],
        requestBody: {
          snippet: {
            videoId: videoId,
            topLevelComment: {
              snippet: {
                textOriginal: commentText,
              },
            },
          },
        },
      });

      return true;
    } catch (error) {
      console.error('Error posting comment:', error);
      throw error;
    }
  }

  async likeVideo(videoId: string): Promise<boolean> {
    try {
      await youtube.videos.rate({
        auth: this.oauth2Client,
        id: videoId,
        rating: 'like',
      });

      return true;
    } catch (error) {
      console.error('Error liking video:', error);
      throw error;
    }
  }

  async getChannelInfo(channelId: string) {
    const maxRetries = this.apiKeys.length;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Handle special case for "mine" to get authenticated user's channel
        const requestParams: any = {
          part: ['snippet', 'statistics'],
        };

        if (channelId === "mine") {
          requestParams.mine = true;
          requestParams.auth = this.oauth2Client;
        } else {
          requestParams.id = [channelId];
          requestParams.key = this.getCurrentApiKey();
        }

        const response = await youtube.channels.list(requestParams);

        if (!response.data.items || response.data.items.length === 0) {
          return null;
        }

        const channel = response.data.items[0];
        return {
          id: channel.id,
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          thumbnailUrl: channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
          subscriberCount: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          viewCount: channel.statistics?.viewCount,
        };
      } catch (error) {
        lastError = error;
        
        // If this is a quota error and we're not using authenticated requests, try next API key
        if (channelId !== "mine" && this.isQuotaError(error)) {
          const currentKey = this.getCurrentApiKey();
          this.markKeyAsExhausted(currentKey);
          console.log(`Quota exhausted for key, trying next one. Attempt ${attempt + 1}/${maxRetries}`);
          continue;
        }
        
        // For other errors or authenticated requests, break the loop
        break;
      }
    }

    console.error('Error getting channel info after all retries:', lastError);
    return null;
  }

  async checkUserEngagement(videoId: string, userChannelId: string): Promise<{
    hasCommented: boolean;
    hasLiked: boolean;
    comment?: YouTubeComment;
  }> {
    try {
      // Check for existing comment
      const comment = await this.getUserCommentOnVideo(videoId, userChannelId);
      
      // Check if video is liked (this requires OAuth scope that might not be available)
      // For now, we'll return false for hasLiked as checking likes requires special permissions
      const hasLiked = false;

      return {
        hasCommented: !!comment,
        hasLiked: hasLiked,
        comment: comment || undefined,
      };
    } catch (error) {
      console.error('Error checking user engagement:', error);
      return { hasCommented: false, hasLiked: false };
    }
  }

  async getVideoDetails(videoId: string) {
    try {
      const response = await youtube.videos.list({
        key: this.getCurrentApiKey(),
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [videoId],
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      const video = response.data.items[0];
      return {
        id: video.id,
        title: video.snippet?.title,
        description: video.snippet?.description,
        publishedAt: video.snippet?.publishedAt,
        channelId: video.snippet?.channelId,
        channelTitle: video.snippet?.channelTitle,
        thumbnailUrl: video.snippet?.thumbnails?.medium?.url,
        duration: video.contentDetails?.duration,
        viewCount: video.statistics?.viewCount,
        likeCount: video.statistics?.likeCount,
        commentCount: video.statistics?.commentCount,
      };
    } catch (error) {
      console.error('Error getting video details:', error);
      return null;
    }
  }
}

export const youtubeService = new YouTubeService();
