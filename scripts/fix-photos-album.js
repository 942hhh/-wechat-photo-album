const Database = require('better-sqlite3');

async function fixPhotosAlbum() {
  const db = new Database('data/album.db');

  // 获取当前相册ID
  const [album] = db.prepare('SELECT id FROM albums').all();

  if (!album) {
    console.log('没有相册');
    db.close();
    return;
  }

  const albumId = album.id;
  console.log(`当前相册ID: ${albumId}`);

  // 检查是否有照片的album_id不匹配
  const photos = db.prepare('SELECT id, album_id FROM photos').all();
  console.log(`共有 ${photos.length} 张照片`);

  // 更新所有照片的album_id
  for (const photo of photos) {
    if (photo.album_id !== albumId) {
      console.log(`更新照片 ${photo.id}: ${photo.album_id} -> ${albumId}`);
      db.prepare('UPDATE photos SET album_id = ? WHERE id = ?').run(albumId, photo.id);
    }
  }

  // 更新相册的photo_count
  const count = db.prepare('SELECT COUNT(*) as count FROM photos WHERE album_id = ?').get(albumId);
  db.prepare('UPDATE albums SET photo_count = ? WHERE id = ?').run(count.count, albumId);

  console.log('修复完成!');
  db.close();
}

fixPhotosAlbum().catch(console.error);
