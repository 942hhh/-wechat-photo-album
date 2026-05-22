const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = 'data';
const dbPath = path.join('.', DATA_DIR, 'album.db');
const absPath = path.resolve(dbPath);

if (!fs.existsSync(path.dirname(absPath))) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
}

const sqlite = new Database(absPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

console.log('=== 初始化数据库表 ===');

// 手动创建表的 SQL 语句
const createTables = `
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT 'stone',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_photo_url TEXT,
  created_by TEXT,
  photo_count INTEGER NOT NULL DEFAULT 0,
  latest_photo_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
);

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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE (photo_id, member_id)
);
`;

try {
  sqlite.exec(createTables);
  console.log('所有表创建成功！');
  
  // 检查是否已有数据
  const albumCount = sqlite.prepare('SELECT COUNT(*) as count FROM albums').get().count;
  if (albumCount === 0) {
    // 插入示例数据
    const insertAlbum = sqlite.prepare(`
      INSERT INTO albums (id, name, description, photo_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    insertAlbum.run('demo-album', '示例相册', '这是一个示例相册', 0, now, now);
    console.log('已创建示例相册');
  }
  
} catch (err) {
  console.error('创建表失败:', err.message);
  process.exit(1);
}

sqlite.close();
console.log('数据库初始化完成！');
