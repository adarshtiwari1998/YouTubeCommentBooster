# YouTube Automation System

## Overview

This is a full-stack YouTube automation application built with React (TypeScript) frontend and Express.js backend. The system automates commenting and liking on YouTube videos across multiple channels using AI-generated comments. It features a modern UI built with shadcn/ui components and uses PostgreSQL with Drizzle ORM for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM with PostgreSQL
- **External APIs**: YouTube Data API v3, Google Generative AI (Gemini)
- **Authentication**: OAuth 2.0 flow with YouTube
- **Task Scheduling**: Node-cron for automation timing

### Database Design
- **Primary Database**: PostgreSQL via Neon Database
- **Schema Management**: Drizzle Kit for migrations
- **Key Tables**:
  - `users`: User accounts and YouTube credentials
  - `channels`: YouTube channels being monitored
  - `videos`: Individual videos and their processing status
  - `automation_settings`: System configuration
  - `processing_logs`: Audit trail and debugging
  - `video_queue`: Processing queue management

## Key Components

### 1. YouTube Integration
- OAuth 2.0 authentication flow with YouTube
- Channel discovery and video fetching
- Automated commenting and liking capabilities
- Rate limiting and quota management

### 2. AI Comment Generation
- Google Gemini AI integration for natural comment generation
- Customizable prompts for different commenting styles
- Fallback to predefined comments if AI fails

### 3. Automation Engine
- Cron-based scheduling system
- Configurable delays between actions
- Priority-based video processing queue
- Error handling and retry mechanisms

### 4. User Interface
- Dashboard with real-time status updates
- Channel management interface
- Analytics and reporting views
- Settings configuration panel

### 5. Processing Pipeline
- Video discovery and filtering
- Queue management with priority handling
- Batch processing with rate limiting
- Comprehensive logging and error tracking

## Data Flow

1. **Channel Addition**: Users add YouTube channels to monitor
2. **Video Discovery**: System periodically fetches new videos from channels
3. **Content Filtering**: Videos are filtered based on criteria and added to processing queue
4. **AI Processing**: Gemini AI generates contextual comments for queued videos
5. **Action Execution**: System posts comments and likes with configured delays
6. **Status Tracking**: All actions are logged for monitoring and analytics

## External Dependencies

### Core Services
- **Neon Database**: PostgreSQL hosting with connection pooling
- **YouTube Data API v3**: Video data and interaction capabilities
- **Google Generative AI**: AI-powered comment generation
- **Google OAuth 2.0**: Authentication and authorization

### Development Tools
- **Replit**: Development environment and deployment platform
- **Vite**: Frontend build tooling and development server
- **shadcn/ui**: Pre-built accessible UI components

### Key Libraries
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@google/generative-ai**: Gemini AI integration
- **googleapis**: YouTube API client
- **node-cron**: Task scheduling

## Deployment Strategy

### Development Environment
- Replit-based development with hot reload
- Environment variables for API keys and database connections
- Local development server on port 5000

### Production Deployment
- Replit Autoscale deployment target
- Build process: `npm run build` (Vite + esbuild)
- Start command: `npm run start`
- Static file serving for the React frontend

### Environment Configuration
- Database URL for PostgreSQL connection
- YouTube API credentials (Client ID, Secret, API Key)
- Gemini AI API key
- OAuth redirect URLs

## Changelog
- June 19, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.