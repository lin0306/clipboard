const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('electron');
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
            this.db.serialize(() => {
                // 创建剪贴板条目表
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
                `);

                // 创建标签表
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        created_at INTEGER NOT NULL
                    )
                `);

                // 创建剪贴板条目和标签的关联表
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS item_tags (
                        item_id INTEGER,
                        tag_id INTEGER,
                        FOREIGN KEY (item_id) REFERENCES clipboard_items (id) ON DELETE CASCADE,
                        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
                        PRIMARY KEY (item_id, tag_id)
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
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

    getItemsByTag(tagName) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT ci.* FROM clipboard_items ci ' +
                'INNER JOIN item_tags it ON ci.id = it.item_id ' +
                'INNER JOIN tags t ON it.tag_id = t.id ' +
                'WHERE t.name = ? ' +
                'ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC',
                [tagName],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
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

    // 标签相关的方法
    addTag(name) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO tags (name, created_at) VALUES (?, ?)',
                [name, Date.now()],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    deleteTag(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM tags WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getAllTags() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM tags ORDER BY created_at ASC', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    addItemTag(itemId, tagId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)',
                [itemId, tagId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    removeItemTag(itemId, tagId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?',
                [itemId, tagId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    getItemTags(itemId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT t.* FROM tags t INNER JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?',
                [itemId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    bindItemToTag(itemId, tagName) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT id FROM tags WHERE name = ?', [tagName], (err, tag) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!tag) {
                    reject(new Error('标签不存在'));
                    return;
                }
                // 检查标签是否已经绑定
                this.db.get('SELECT * FROM item_tags WHERE item_id = ? AND tag_id = ?', [itemId, tag.id], (err, existingTag) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (existingTag) {
                        // 如果标签已经绑定，直接返回成功
                        resolve();
                        return;
                    }
                    // 标签未绑定，执行绑定操作
                    this.addItemTag(itemId, tag.id)
                        .then(resolve)
                        .catch(reject);
                });
            });
        });
    }
}

module.exports = new ClipboardDB();
window.db = module.exports;