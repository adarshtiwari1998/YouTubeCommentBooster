import { pgTable, serial, text, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const processingLogs = pgTable("processing_logs", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  videoId: text("video_id"),
  stage: text("stage").notNull(), // fetch, filter, queue, process, comment, like
  status: text("status").notNull(), // started, completed, failed
  message: text("message").notNull(),
  metadata: json("metadata"), // Additional context data
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProcessingLogSchema = createInsertSchema(processingLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertProcessingLog = z.infer<typeof insertProcessingLogSchema>;
export type ProcessingLog = typeof processingLogs.$inferSelect;