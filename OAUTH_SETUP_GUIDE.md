# OAuth Authentication Setup for Multiple Projects

## The Problem
Your YouTube API keys work with rotation, but OAuth authentication is failing because it's tied to a single Google Cloud project that has reached its quota limit.

## The Solution
Set up OAuth credentials from the same projects that have your working API keys.

## Steps to Fix Authentication

### 1. For Each Google Cloud Project (that has a working API key):

**Project 1 (AIzaSyA-vkoq...):**
- Go to Google Cloud Console for this project
- Navigate to: APIs & Services > Credentials
- Click "Create Credentials" > "OAuth 2.0 Client ID"
- Application type: Web application
- Name: "YouTube Automation App"
- Authorized redirect URIs: Add your Replit URL with `/api/auth/youtube/callback`
  Example: `https://your-replit-app.replit.dev/api/auth/youtube/callback`

**Project 2 (AIzaSyD5hDFm...):**
- Repeat the same process for the second working project

### 2. Configure Multiple OAuth Clients in Replit

Add these new secrets in your Replit project:

```
GOOGLE_CLIENT_ID_2=your_second_project_client_id
GOOGLE_CLIENT_SECRET_2=your_second_project_client_secret
GOOGLE_CLIENT_ID_3=your_third_project_client_id  
GOOGLE_CLIENT_SECRET_3=your_third_project_client_secret
```

### 3. OAuth Rotation Implementation

The system will automatically rotate between OAuth clients when one hits quota limits, similar to the API key rotation.

## Quick Fix (Temporary)
For immediate testing, you can wait until midnight Pacific Time when quotas reset, or use the working API keys you already have for non-authenticated operations.

## Why This Happens
- API keys rotate successfully for public data access
- OAuth tokens are project-specific and have separate quota limits
- Authentication requires OAuth, which is currently tied to an exhausted project

## After Setup
Once you have multiple OAuth clients configured, authentication will work reliably with automatic fallback between projects.