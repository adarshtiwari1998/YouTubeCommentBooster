import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface AuthRequest extends Request {
  user?: any;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // For demo purposes, we'll assume user ID 1 exists
    // In production, this would check session/JWT token
    const userId = 1;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
}

export async function requireYouTubeAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!req.user.youtubeToken) {
      return res.status(401).json({ error: 'YouTube authentication required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'YouTube authentication error' });
  }
}
