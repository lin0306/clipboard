const { ipcRenderer, clipboard } = require('electron');

// 剪贴板操作封装
class ElectronManager {
    // 写入文本到剪贴板
    static writeToClipboard(text) {
        clipboard.writeText(text);
        message.success('内容已复制到剪贴板');
    }

    // 清空剪贴板
    static clearClipboard() {
        clipboard.clear();
        message.info('剪贴板内容已清空');
    }

    // 注册剪贴板监听
    static registerClipboardListener(callback) {
        ipcRenderer.on('clipboard-text', async (event, text) => {
            if (text) {
                await callback(text);
            }
        });
    }
}

// 创建实例并挂载到全局
const electronManager = new ElectronManager();
window.ElectronManager = electronManager;

module.exports = electronManager;