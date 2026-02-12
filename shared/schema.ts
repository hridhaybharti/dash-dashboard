import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  value: text("value").notNull(), // The actual IP or Hash string
  type: text("type").notNull(), // ipv4, ipv6, md5, sha1, sha256
  category: text("category").notNull(), // ip or hash
  remark: text("remark"),
  timestamp: text("timestamp").notNull(), // ISO string
  metadata: text("metadata"), // Stringified JSON for extra spreadsheet columns
});

export const insertEntrySchema = createInsertSchema(entries).omit({ 
  id: true 
}).extend({
  value: z.string().min(1, "Value is required"),
  type: z.enum(["ipv4", "ipv6", "md5", "sha1", "sha256"]),
  category: z.enum(["ip", "hash"]),
  timestamp: z.string().optional(),
});

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = z.infer<typeof insertEntrySchema>;
