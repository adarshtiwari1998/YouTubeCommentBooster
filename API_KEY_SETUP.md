# Multiple YouTube API Keys Setup

## Overview
Your application now supports multiple YouTube API keys to handle quota limits automatically. When one key reaches its daily quota, the system will automatically rotate to the next available key.

## Configuration

### Setting Up Multiple API Keys

1. **Get Additional API Keys:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new projects or use existing ones
   - Enable YouTube Data API v3 for each project
   - Create API keys for each project

2. **Configure in Replit:**
   - Go to your Replit project's Secrets tab
   - Update the `YOUTUBE_API_KEY` secret with comma-separated values:
   ```
   AIzaSyBxxxxxxxxxxxxxxxxxxxxxx,AIzaSyCyyyyyyyyyyyyyyyyyyyy,AIzaSyDzzzzzzzzzzzzzzzzzzzz
   ```

### How It Works

- **Automatic Rotation:** When a quota error occurs, the system automatically switches to the next API key
- **Daily Reset:** Quota status resets daily at midnight Pacific Time (YouTube's reset schedule)
- **Smart Retry:** Failed requests are retried with different API keys automatically
- **Quota Tracking:** Each key's usage is tracked independently

### Benefits

- **Increased Quota:** Multiple 10,000-unit quotas instead of just one
- **Automatic Failover:** No manual intervention needed when quotas are exhausted
- **Seamless Operation:** Your automation continues running even during high usage periods

### Monitoring

The application logs quota exhaustion events:
```
API key AIzaSyBx... marked as exhausted
Quota exhausted for key, trying next one. Attempt 1/3
```

### Best Practices

1. **Use 3-5 API keys** for optimal coverage
2. **Monitor logs** to understand usage patterns
3. **Consider upgrading quotas** through Google Cloud Console if needed
4. **Distribute usage** across different time zones if possible

### Troubleshooting

If you see quota errors even with multiple keys:
- All keys have reached their daily limits
- Keys will reset at midnight Pacific Time
- Consider requesting quota increases from Google
- Check for any API usage spikes in your automation settings