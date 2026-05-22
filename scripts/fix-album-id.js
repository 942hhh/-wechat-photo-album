const Database = require('better-sqlite3');

async function fixAlbumId() {
  const db = new Database('data/album.db');
  
  // 获取当前相册ID
  const [album] = db.prepare('SELECT id FROM albums').all();
  const oldAlbumId = album?.id;
  
  if (!oldAlbumId || oldAlbumId === 'demo-album') {
    console.log('相册ID已经正确');
    db.close();
    return;
  }
  
  console.log(`当前相册ID: ${oldAlbumId}`);
  
  // 关闭外键约束
  db.prepare('PRAGMA foreign_keys = OFF').run();
  
  try {
    // 更新相册表
    db.prepare('UPDATE albums SET id = ? WHERE id = ?').run('demo-album', oldAlbumId);
    
    // 更新照片表
    db.prepare('UPDATE photos SET album_id = ? WHERE album_id = ?').run('demo-album', oldAlbumId);
    
    console.log('相册ID修复完成!');
  } finally {
    // 重新启用外键约束
    db.prepare('PRAGMA foreign_keys = ON').run();
    db.close();
  }
}

fixAlbumId().catch(console.error);
