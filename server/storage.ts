import { entries, type Entry, type InsertEntry } from "../shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { eq, or, like, desc, sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "data", "dashboard.sqlite");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite);

// Initialize table if it doesn't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    remark TEXT,
    timestamp TEXT NOT NULL,
    metadata TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_entries_value ON entries(value);
  CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category);
`);

export interface IStorage {
  getEntries(query?: string, category?: string): Promise<Entry[]>;
  createEntry(entry: InsertEntry): Promise<Entry>;
  batchCreateEntries(entries: InsertEntry[]): Promise<void>;
  getStats(): Promise<{ total: number, ips: number, hashes: number }>;
}

export class SqliteStorage implements IStorage {
  async getEntries(query?: string, category?: string): Promise<Entry[]> {
    let baseQuery = db.select().from(entries);
    
    const filters = [];
    if (category) {
      filters.push(eq(entries.category, category));
    }
    
    if (query) {
      filters.push(or(
        like(entries.value, `${query}%`), // Prioritize prefix matches
        like(entries.value, `%${query}%`)
      ));
    }

    if (filters.length > 0) {
      // Prioritize prefix match by sorting
      return await db.select().from(entries)
        .where(filters.length > 1 ? sql`(${sql.join(filters, sql` AND `)})` : filters[0])
        .orderBy(
          sql`CASE WHEN ${entries.value} LIKE ${query + '%'} THEN 0 ELSE 1 END`,
          desc(entries.timestamp)
        );
    }

    return await baseQuery.orderBy(desc(entries.timestamp)).limit(500);
  }

  async createEntry(insertEntry: InsertEntry): Promise<Entry> {
    const [entry] = await db.insert(entries).values({
      ...insertEntry,
      timestamp: insertEntry.timestamp || new Date().toISOString()
    }).returning();
    return entry;
  }

  async batchCreateEntries(newEntries: InsertEntry[]): Promise<void> {
    // SQLite has a limit on variables per statement, so we chunk large batches
    const chunkSize = 500;
    for (let i = 0; i < newEntries.length; i += chunkSize) {
      const chunk = newEntries.slice(i, i + chunkSize).map(e => ({
        ...e,
        timestamp: e.timestamp || new Date().toISOString()
      }));
      await db.insert(entries).values(chunk);
    }
  }

  async getStats() {
    const all = await db.select().from(entries);
    return {
      total: all.length,
      ips: all.filter(e => e.category === 'ip').length,
      hashes: all.filter(e => e.category === 'hash').length
    };
  }
}

export const storage = new SqliteStorage();
