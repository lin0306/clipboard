const { ipcRenderer, clipboard } = require('electron');

// 窗口控制功能
function closeWindow() {
    ipcRenderer.send('close-window');
}

// 剪贴板操作封装
class ElectronManager {
    // 写入文本到剪贴板
    static writeToClipboard(text) {
        clipboard.writeText(text);
        message.success('内容已复制到剪贴板');
    }

    // 写入图片到剪贴板
    static writeImageToClipboard(imagePath) {
        try {
            const nativeImage = require('electron').nativeImage;
            const image = nativeImage.createFromPath(imagePath);
            if (image.isEmpty()) {
                message.error('无法读取图片文件');
                return;
            }
            clipboard.writeImage(image);
            message.success('图片已复制到剪贴板');
        } catch (error) {
            console.error('写入图片到剪贴板失败:', error);
            message.error('复制图片失败');
        }
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

    // 关闭应用程序
    static closeApp() {
        ipcRenderer.send('close-window');
    }

    // 重新加载应用程序
    static reloadApp() {
        ipcRenderer.send('reload-app');
        // 等待一段时间后关闭当前窗口
        setTimeout(() => {
            window.close();
        }, 100);
    }
}

// 创建实例并挂载到全局
const electronManager = new ElectronManager();
window.ElectronManager = electronManager;

module.exports = electronManager;