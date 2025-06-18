import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  youtubeToken: text("youtube_token"),
  youtubeRefreshToken: text("youtube_refresh_token"),
  youtubeChannelId: text("youtube_channel_id"),
});

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  channelId: text("channel_id").notNull(),
  totalVideos: integer("total_videos").default(0),
  processedVideos: integer("processed_videos").default(0),
  status: text("status").notNull().default("pending"), // pending, processing, completed, error
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  videoId: text("video_id").notNull().unique(),
  channelId: integer("channel_id").references(() => channels.id),
  title: text("title").notNull(),
  publishedAt: timestamp("published_at"),
  hasCommented: boolean("has_commented").default(false),
  hasLiked: boolean("has_liked").default(false),
  commentText: text("comment_text"),
  commentedAt: timestamp("commented_at"),
  status: text("status").default("pending"), // pending, processing, completed, error
  errorMessage: text("error_message"),
});

export const automationSettings = pgTable("automation_settings", {
  id: serial("id").primaryKey(),
  isActive: boolean("is_active").default(false),
  delayMinutes: integer("delay_minutes").default(10),
  aiPrompt: text("ai_prompt").default("I want to comment on this video as a user in short version. my comment is encouraging others and its a positive impact and it also influence others. Make sure it not look like ai generated look like raw comment"),
  maxCommentsPerDay: integer("max_comments_per_day").default(100),
  lastRunAt: timestamp("last_run_at"),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // comment, like, error, system
  message: text("message").notNull(),
  videoId: text("video_id"),
  channelId: integer("channel_id").references(() => channels.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiQuota = pgTable("api_quota", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  youtubeQuotaUsed: integer("youtube_quota_used").default(0),
  geminiQuotaUsed: integer("gemini_quota_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
});

export const insertAutomationSettingsSchema = createInsertSchema(automationSettings).omit({
  id: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export type InsertAutomationSettings = z.infer<typeof insertAutomationSettingsSchema>;
export type AutomationSettings = typeof automationSettings.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type ApiQuota = typeof apiQuota.$inferSelect;
