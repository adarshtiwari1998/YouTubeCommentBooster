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
  private oauth2Clients: any[];
  private currentOAuthIndex: number = 0;

  constructor() {
    // Initialize API key manager with environment variable
    const apiKeyString = process.env.YOUTUBE_API_KEY || '';
    this.apiKeyManager = new ApiKeyManager(apiKeyString);
    
    // Get redirect URI from environment variable
    const baseUrl = process.env.REPLIT_DOMAINS || 'http://localhost:5000';
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;
    
    // Initialize multiple OAuth clients
    this.oauth2Clients = [];
    
    // Primary OAuth client
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.oauth2Clients.push(new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      ));
    }
    
    // Additional OAuth clients (if configured)
    for (let i = 2; i <= 5; i++) {
      const clientId = process.env[`GOOGLE_CLIENT_ID_${i}`];
      const clientSecret = process.env[`GOOGLE_CLIENT_SECRET_${i}`];
      
      if (clientId && clientSecret) {
        this.oauth2Clients.push(new google.auth.OAuth2(
          clientId,
          clientSecret,
          redirectUri
        ));
        console.log(`Configured OAuth client ${i}`);
      }
    }
    
    console.log(`Configured ${this.oauth2Clients.length} OAuth clients for authentication`);
  }

  private getCurrentOAuthClient() {
    if (this.oauth2Clients.length === 0) {
      throw new Error('No OAuth clients configured');
    }
    return this.oauth2Clients[this.currentOAuthIndex];
  }

  private switchToNextOAuthClient() {
    this.currentOAuthIndex = (this.currentOAuthIndex + 1) % this.oauth2Clients.length;
    console.log(`Switched to OAuth client ${this.currentOAuthIndex + 1}/${this.oauth2Clients.length}`);
  }

  setCredentials(accessToken: string, refreshToken: string) {
    const currentClient = this.getCurrentOAuthClient();
    currentClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    const currentClient = this.getCurrentOAuthClient();
    const authUrl = currentClient.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
    
    console.log('Generated auth URL:', authUrl);
    return authUrl;
  }

  async exchangeCodeForTokens(code: string) {
    const maxRetries = this.oauth2Clients.length;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const currentClient = this.getCurrentOAuthClient();
        const { tokens } = await currentClient.getToken(code);
        console.log(`OAuth token exchange successful with client ${this.currentOAuthIndex + 1}`);
        return tokens;
      } catch (error: any) {
        lastError = error;
        console.log(`OAuth token exchange failed with client ${this.currentOAuthIndex + 1}:`, error.message);
        
        if (attempt < maxRetries - 1) {
          this.switchToNextOAuthClient();
        }
      }
    }

    throw lastError;
  }

  async getChannelIdFromHandle(handle: string): Promise<string | null> {
    try {
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

  async getChannelVideos(channelId: string, maxResults = 50, pageToken?: string): Promise<{ videos: YouTubeVideo[], nextPageToken: string | null }> {
    try {
      return await this.apiKeyManager.executeWithRetry(async (apiKey) => {
        // First, get the channel's uploads playlist ID
        const channelResponse = await youtube.channels.list({
          key: apiKey,
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

        // Now get videos from the uploads playlist (includes Shorts)
        const response = await youtube.playlistItems.list({
          key: apiKey,
          part: ['snippet'],
          playlistId: uploadsPlaylistId,
          maxResults: maxResults,
          pageToken: pageToken || undefined,
        });

        if (!response.data.items) {
          return { videos: [], nextPageToken: null };
        }

        const videos = response.data.items
          .filter(item => item.snippet?.resourceId?.videoId)
          .map(item => ({
            id: item.snippet!.resourceId!.videoId!,
            title: item.snippet!.title || '',
            publishedAt: item.snippet!.publishedAt || '',
            channelId: item.snippet!.videoOwnerChannelId || channelId,
          }));

        return { 
          videos, 
          nextPageToken: response.data.nextPageToken || null 
        };
      });
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      throw error;
    }
  }

  async getUserChannelId(): Promise<string> {
    try {
      const currentClient = this.getCurrentOAuthClient();
      const response = await youtube.channels.list({
        auth: currentClient,
        part: ['id'],
        mine: true,
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No channel found for authenticated user');
      }

      return response.data.items[0].id!;
    } catch (error) {
      console.error('Error getting user channel ID:', error);
      throw error;
    }
  }

  async getUserCommentOnVideo(videoId: string, userChannelId: string): Promise<YouTubeComment | null> {
    try {
      return await this.apiKeyManager.executeWithRetry(async (apiKey) => {
        const response = await youtube.commentThreads.list({
          key: apiKey,
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
      });
    } catch (error) {
      console.error('Error checking user comment on video:', error);
      return null;
    }
  }

  async postComment(videoId: string, commentText: string): Promise<boolean> {
    try {
      const currentClient = this.getCurrentOAuthClient();
      await youtube.commentThreads.insert({
        auth: currentClient,
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
      const currentClient = this.getCurrentOAuthClient();
      await youtube.videos.rate({
        auth: currentClient,
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
    try {
      // Handle special case for "mine" to get authenticated user's channel
      if (channelId === "mine") {
        const maxRetries = this.oauth2Clients.length;
        let lastError: any;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const currentClient = this.getCurrentOAuthClient();
            const response = await youtube.channels.list({
              auth: currentClient,
              part: ['snippet', 'statistics'],
              mine: true,
            });

            if (!response.data.items || response.data.items.length === 0) {
              return null;
            }

            const channel = response.data.items[0];
            console.log(`OAuth channel info successful with client ${this.currentOAuthIndex + 1}`);
            return {
              id: channel.id,
              title: channel.snippet?.title,
              description: channel.snippet?.description,
              thumbnailUrl: channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
              subscriberCount: channel.statistics?.subscriberCount,
              videoCount: channel.statistics?.videoCount,
              viewCount: channel.statistics?.viewCount,
            };
          } catch (error: any) {
            lastError = error;
            console.log(`OAuth channel info failed with client ${this.currentOAuthIndex + 1}:`, error.message);
            
            if (error.code === 403 && error.message?.includes('quota') && attempt < maxRetries - 1) {
              this.switchToNextOAuthClient();
              continue;
            }
            break;
          }
        }
        
        throw lastError;
      } else {
        return await this.apiKeyManager.executeWithRetry(async (apiKey) => {
          const response = await youtube.channels.list({
            key: apiKey,
            part: ['snippet', 'statistics'],
            id: [channelId],
          });

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
        });
      }
    } catch (error) {
      console.error('Error getting channel info:', error);
      return null;
    }
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
        hasLiked,
        comment: comment || undefined,
      };
    } catch (error) {
      console.error('Error checking user engagement:', error);
      return { hasCommented: false, hasLiked: false };
    }
  }

  async getVideoDetails(videoId: string) {
    try {
      return await this.apiKeyManager.executeWithRetry(async (apiKey) => {
        const response = await youtube.videos.list({
          key: apiKey,
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
          viewCount: video.statistics?.viewCount,
          likeCount: video.statistics?.likeCount,
          commentCount: video.statistics?.commentCount,
          duration: video.contentDetails?.duration,
          thumbnailUrl: video.snippet?.thumbnails?.maxres?.url || 
                       video.snippet?.thumbnails?.high?.url || 
                       video.snippet?.thumbnails?.medium?.url,
        };
      });
    } catch (error) {
      console.error('Error getting video details:', error);
      return null;
    }
  }
}

export const youtubeService = new YouTubeService();