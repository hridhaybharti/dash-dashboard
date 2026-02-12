import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEntrySchema } from "../shared/schema";
import multer from "multer";
import { parse as csvParse } from "csv-parse/sync";
import * as xlsx from "xlsx";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Get all entries with search/filter
  app.get("/api/entries", async (req, res) => {
    const { q, category } = req.query;
    const entries = await storage.getEntries(q as string, category as string);
    res.json(entries);
  });

  // Get dashboard stats
  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // Create single entry
  app.post("/api/entries", async (req, res) => {
    try {
      const data = insertEntrySchema.parse(req.body);
      const entry = await storage.createEntry(data);
      res.status(201).json(entry);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Upload file (CSV/XLSX)
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      let rows: any[] = [];
      const extension = req.file.originalname.split(".").pop()?.toLowerCase();

      if (extension === "csv") {
        rows = csvParse(req.file.buffer.toString(), {
          columns: true,
          skip_empty_lines: true,
        });
      } else if (["xlsx", "xls"].includes(extension || "")) {
        const workbook = xlsx.read(req.file.buffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = xlsx.utils.sheet_to_json(firstSheet);
      } else {
        return res.status(400).json({ message: "Unsupported file format" });
      }

      const entriesToCreate: any[] = [];
      for (const row of rows) {
        const value = row.IP || row.ip || row.Hash || row.hash || row.value;
        const remark = row.Remark || row.remark || row.notes || "";
        
        if (!value) continue;

        const type = detectType(value);
        const category = ["ipv4", "ipv6"].includes(type) ? "ip" : "hash";

        entriesToCreate.push({
          value: String(value).trim(),
          type,
          category,
          remark,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify(row)
        });
      }

      await storage.batchCreateEntries(entriesToCreate);
      res.status(201).json({ message: `Successfully imported ${entriesToCreate.length} entries` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: "Failed to parse file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function detectType(value: string): string {
  const v = String(value).trim();
  // IPv4 regex
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v)) return "ipv4";
  // IPv6 regex
  if (/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v)) return "ipv6";
  // Hashes
  if (v.length === 32) return "md5";
  if (v.length === 40) return "sha1";
  if (v.length === 64) return "sha256";
  
  return "ipv4"; // Default fallback
}
