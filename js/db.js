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
                    top_time INTEGER,
                    type TEXT DEFAULT 'text',
                    file_path TEXT
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    addItem(content, type = 'text', filePath = null) {
        return new Promise(async (resolve, reject) => {
            try {
                let copyTime = Date.now();
                
                // 删除相同内容的旧记录
                if (type === 'text') {
                    await new Promise((resolve, reject) => {
                        this.db.run('DELETE FROM clipboard_items WHERE content = ? AND type = ?', [content, type], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                } else if (type === 'image' && filePath) {
                    const row = await new Promise((resolve, reject) => {
                        this.db.get('SELECT copy_time FROM clipboard_items WHERE type = ? AND file_path = ?', ['image', filePath], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                    
                    if (row) {
                        copyTime = row.copy_time;
                    }
                    
                    await this.db.run('DELETE FROM clipboard_items WHERE type = ? AND file_path = ?', ['image', filePath]);
                }
                
                const stmt = this.db.prepare('INSERT INTO clipboard_items (content, copy_time, type, file_path) VALUES (?, ?, ?, ?)');
                stmt.run(content, copyTime, type, filePath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
                stmt.finalize();
            } catch (err) {
                reject(err);
            }
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
        return new Promise(async (resolve, reject) => {
            try {
                // 先获取要删除的项目信息
                const row = await new Promise((resolve, reject) => {
                    this.db.get('SELECT type, file_path FROM clipboard_items WHERE id = ?', [id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                // 如果是图片类型，删除对应的临时文件
                if (row && row.type === 'image' && row.file_path) {
                    try {
                        fs.unlinkSync(row.file_path);
                    } catch (unlinkError) {
                        console.error('删除临时图片文件失败:', unlinkError);
                    }
                }

                // 删除数据库记录
                await new Promise((resolve, reject) => {
                    this.db.run('DELETE FROM clipboard_items WHERE id = ?', [id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    clearAll() {
        return new Promise(async (resolve, reject) => {
            try {
                // 读取配置文件获取临时文件存储路径
                const configPath = path.join(__dirname, 'conf', 'settings.conf');
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const tempDir = config.tempPath;

                // 先获取所有图片类型的记录
                console.log('[clearAll] 正在获取所有图片记录...');
                const rows = await new Promise((resolve, reject) => {
                    this.db.all('SELECT type, file_path FROM clipboard_items WHERE type = ?', ['image'], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                // 删除所有图片文件
                console.log('[clearAll] 开始删除图片文件...');
                for (const row of rows) {
                    if (row.file_path) {
                        try {
                            fs.unlinkSync(row.file_path);
                            console.log(`[clearAll] 成功删除图片文件: ${row.file_path}`);
                        } catch (unlinkError) {
                            console.error(`[clearAll] 删除图片文件失败: ${row.file_path}`, unlinkError);
                        }
                    }
                }

                // 清空数据库记录
                console.log('[clearAll] 正在清空数据库记录...');
                await new Promise((resolve, reject) => {
                    this.db.run('DELETE FROM clipboard_items', [], (err) => {
                        if (err) {
                            console.error('[clearAll] 清空数据库记录失败:', err);
                            reject(err);
                        } else {
                            console.log('[clearAll] 数据库记录已清空');
                            resolve();
                        }
                    });
                });

                // 确保temp目录存在
                if (!fs.existsSync(tempDir)) {
                    console.log('[clearAll] 正在创建临时目录...');
                    fs.mkdirSync(tempDir, { recursive: true, mode: 0o777 });
                    console.log('[clearAll] 临时目录创建成功');
                }

                console.log('[clearAll] 剪贴板内容和临时文件清理完成');
                resolve();
            } catch (err) {
                console.error('[clearAll] 清空剪贴板时发生错误:', err);
                reject(err);
            }
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

    updateItemTime(id, newTime) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE clipboard_items SET copy_time = ? WHERE id = ?',
                [newTime, id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
}

module.exports = new ClipboardDB();
window.db = module.exports;