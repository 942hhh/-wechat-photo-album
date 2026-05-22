const Database = require('better-sqlite3');
const db = new Database('data/album.db');

console.log('=== 数据库中的所有表 ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.table(tables);

if (tables.length > 0) {
  console.log('\n=== albums 表内容 ===');
  try {
    const albums = db.prepare('SELECT * FROM albums').all();
    console.table(albums);
  } catch (err) {
    console.log('表 albums 不存在');
  }

  console.log('\n=== photos 表内容 ===');
  try {
    const photos = db.prepare('SELECT * FROM photos').all();
    console.table(photos);
  } catch (err) {
    console.log('表 photos 不存在');
  }
}

db.close();
