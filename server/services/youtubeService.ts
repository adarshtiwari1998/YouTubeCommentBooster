import { google } from 'googleapis';

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
  private apiKey: string;
  private oauth2Client: any;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || '';
    
    const redirectUri = process.env.REPLIT_DEV_DOMAIN ? 
      `${process.env.REPLIT_DEV_DOMAIN}/api/auth/youtube/callback` : 
      'http://localhost:5000/api/auth/youtube/callback';
    
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
    
    const redirectUri = process.env.REPLIT_DEV_DOMAIN ? 
      `${process.env.REPLIT_DEV_DOMAIN}/api/auth/youtube/callback` : 
      'http://localhost:5000/api/auth/youtube/callback';

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      redirect_uri: redirectUri
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
      
      const response = await youtube.search.list({
        key: this.apiKey,
        part: ['snippet'],
        q: cleanHandle,
        type: ['channel'],
        maxResults: 1,
      });

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].snippet?.channelId || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting channel ID from handle:', error);
      return null;
    }
  }

  async getChannelVideos(channelId: string, maxResults = 50, pageToken?: string): Promise<YouTubeVideo[]> {
    try {
      const response = await youtube.search.list({
        key: this.apiKey,
        part: ['snippet'],
        channelId: channelId,
        type: ['video'],
        order: 'date',
        maxResults: maxResults,
        pageToken: pageToken,
      });

      if (!response.data.items) {
        return [];
      }

      const videos = response.data.items.map(item => ({
        id: item.id?.videoId || '',
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
        key: this.apiKey,
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
    try {
      // Handle special case for "mine" to get authenticated user's channel
      const requestParams: any = {
        part: ['snippet', 'statistics'],
      };

      if (channelId === "mine") {
        requestParams.mine = true;
      } else {
        requestParams.id = [channelId];
        requestParams.key = this.apiKey;
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
        key: this.apiKey,
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
