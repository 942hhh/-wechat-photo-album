const Database = require('better-sqlite3');
const fs = require('fs');

// 删除旧数据库
if (fs.existsSync('data/album.db')) {
  fs.unlinkSync('data/album.db');
  console.log('已删除旧数据库');
}

// 创建新数据库
const db = new Database('data/album.db');

// 创建表
db.prepare(`
  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_photo_url TEXT,
    created_by TEXT,
    photo_count INTEGER NOT NULL DEFAULT 0,
    latest_photo_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    album_id TEXT NOT NULL,
    uploaded_by TEXT,
    r2_key_original TEXT DEFAULT '',
    r2_key_thumb TEXT DEFAULT '',
    original_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    content_type TEXT NOT NULL,
    description TEXT DEFAULT '',
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    avatar_color TEXT NOT NULL DEFAULT 'stone',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();

// 插入示例相册
db.prepare(`
  INSERT INTO albums (id, name, description)
  VALUES ('demo-album', '示例相册', '这是一个示例相册')
`).run();

console.log('数据库重建完成');
db.close();
