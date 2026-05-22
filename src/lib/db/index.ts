import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DATA_DIR = "data";
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || path.join(".", DATA_DIR, "album.db");
  const absPath = path.resolve(dbPath);

  if (!fs.existsSync(path.dirname(absPath))) {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
  }

  const sqlite = new Database(absPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  db = drizzle(sqlite, { schema });
  return db;
}
