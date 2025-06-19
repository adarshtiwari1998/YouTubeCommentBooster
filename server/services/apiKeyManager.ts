export class ApiKeyManager {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private keyQuotaStatus: Map<string, { used: boolean; resetTime: number }> = new Map();

  constructor(apiKeyString: string) {
    // Support multiple API keys separated by commas
    this.apiKeys = apiKeyString.split(',').map(key => key.trim()).filter(key => key.length > 0);
    
    console.log(`Configured ${this.apiKeys.length} YouTube API keys`);
    this.apiKeys.forEach((key, index) => {
      console.log(`Key ${index + 1}: ${key.substring(0, 12)}...`);
    });
    
    if (this.apiKeys.length === 0) {
      console.warn('No YouTube API keys configured');
    }
    
    // Initialize quota status for each key
    this.apiKeys.forEach(key => {
      this.keyQuotaStatus.set(key, { used: false, resetTime: this.getNextResetTime() });
    });
  }

  private getNextResetTime(): number {
    // YouTube API quota resets at midnight Pacific Time
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(8, 0, 0, 0); // 8 AM UTC = midnight Pacific
    
    if (now.getTime() > resetTime.getTime()) {
      resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    }
    
    return resetTime.getTime();
  }

  getCurrentApiKey(): string {
    if (this.apiKeys.length === 0) {
      console.warn('No API keys available');
      return '';
    }

    const now = Date.now();
    
    // Reset quota status if we've passed the reset time
    this.keyQuotaStatus.forEach((status, key) => {
      if (now > status.resetTime) {
        status.used = false;
        status.resetTime = this.getNextResetTime();
        console.log(`Reset quota status for key ${key.substring(0, 12)}...`);
      }
    });

    // Find first available key
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[keyIndex];
      const status = this.keyQuotaStatus.get(key);
      
      if (status && !status.used) {
        this.currentKeyIndex = keyIndex;
        console.log(`Using API key ${keyIndex + 1}: ${key.substring(0, 12)}...`);
        return key;
      }
    }

    // If all keys are exhausted, return the current one anyway
    const currentKey = this.apiKeys[this.currentKeyIndex];
    console.log(`All keys exhausted, using current: ${currentKey.substring(0, 12)}...`);
    return currentKey;
  }

  markKeyAsExhausted(apiKey: string): void {
    const status = this.keyQuotaStatus.get(apiKey);
    if (status) {
      status.used = true;
      console.log(`API key ${apiKey.substring(0, 12)}... marked as exhausted`);
      
      // Move to next key
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      console.log(`Switched to API key index ${this.currentKeyIndex + 1}`);
    }
  }

  isQuotaError(error: any): boolean {
    return error?.code === 403 && 
           (error?.message?.includes('quota') || 
            error?.message?.includes('exceeded') ||
            error?.cause?.message?.includes('quota'));
  }

  async executeWithRetry<T>(
    operation: (apiKey: string) => Promise<T>,
    requiresAuth: boolean = false
  ): Promise<T> {
    const maxRetries = requiresAuth ? 1 : this.apiKeys.length;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const currentKey = this.getCurrentApiKey();
        return await operation(currentKey);
      } catch (error) {
        lastError = error;
        
        // If this is a quota error and we don't require auth, try next API key
        if (!requiresAuth && this.isQuotaError(error)) {
          const currentKey = this.getCurrentApiKey();
          this.markKeyAsExhausted(currentKey);
          console.log(`Quota exhausted for key, trying next one. Attempt ${attempt + 1}/${maxRetries}`);
          continue;
        }
        
        // For other errors or authenticated requests, break the loop
        break;
      }
    }

    throw lastError;
  }
}