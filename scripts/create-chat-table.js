import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(".", "data", "album.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

// 创建 chat_messages 表
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  )
`);

console.log("✅ chat_messages table created successfully");

db.close();
