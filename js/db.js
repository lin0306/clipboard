const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class ClipboardDB {
    constructor() {
        // 读取配置文件
        const configPath = path.join(__dirname, 'conf', 'settings.conf');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // 使用配置的数据库路径
        const dbPath = path.join(config.dbPath, 'clipboard.db');
        this.db = new sqlite3.Database(dbPath);
        this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS clipboard_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    copy_time INTEGER NOT NULL,
                    is_topped BOOLEAN DEFAULT 0,
                    top_time INTEGER
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    addItem(content) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO clipboard_items (content, copy_time) VALUES (?, ?)');
            stmt.run(content, Date.now(), (err) => {
                if (err) reject(err);
                else resolve();
            });
            stmt.finalize();
        });
    }

    getAllItems() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM clipboard_items ORDER BY is_topped DESC, CASE WHEN is_topped = 1 THEN top_time ELSE copy_time END DESC', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    deleteItem(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM clipboard_items WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    clearAll() {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM clipboard_items', [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    toggleTop(id, isTopped) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE clipboard_items SET is_topped = ?, top_time = ? WHERE id = ?',
                [isTopped ? 1 : 0, isTopped ? Date.now() : null, id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    searchItems(query) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM clipboard_items WHERE content LIKE ? ORDER BY is_topped DESC, CASE WHEN is_topped = 1 THEN top_time ELSE copy_time END DESC',
                [`%${query}%`],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
}

module.exports = new ClipboardDB();
window.db = module.exports;