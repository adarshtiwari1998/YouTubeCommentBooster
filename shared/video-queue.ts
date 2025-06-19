import { pgTable, serial, text, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videoQueue = pgTable("video_queue", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title").notNull(),
  videoUrl: text("video_url").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  priority: integer("priority").notNull().default(1),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  metadata: json("metadata"), // Additional video info
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVideoQueueSchema = createInsertSchema(videoQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVideoQueue = z.infer<typeof insertVideoQueueSchema>;
export type VideoQueue = typeof videoQueue.$inferSelect;