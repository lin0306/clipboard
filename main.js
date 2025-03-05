const { app, BrowserWindow, ipcMain, clipboard, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  // 读取配置文件
  const configPath = path.join(__dirname, 'conf', 'settings.conf');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const savedTheme = config.theme || 'light';
  console.log('读取到的主题配置:', savedTheme);

  // 获取屏幕尺寸和鼠标位置
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const mousePos = screen.getCursorScreenPoint();

  // 使用配置文件中保存的窗口尺寸，如果没有则使用默认值
  const windowWidth = config.windowWidth || 400;
  const windowHeight = config.windowHeight || 600;

  // 计算窗口的x坐标
  let x = mousePos.x - windowWidth / 2; // 默认窗口中心对齐鼠标
  if (x < 0) { // 如果超出左边界
    x = 0;
  } else if (x + windowWidth > width) { // 如果超出右边界
    x = width - windowWidth;
  }

  // 计算窗口的y坐标
  let y = mousePos.y - windowHeight / 2; // 默认窗口中心对齐鼠标
  if (y < 0) { // 如果超出上边界
    y = 0;
  } else if (y + windowHeight > height) { // 如果超出下边界
    y = height - windowHeight;
  }

  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      nativeWindowOpen: true
    },
    icon: 'images/logo.png',
    x: x,
    y: y,
    transparent: false
  });

  // 加载应用的 index.html
  win.loadFile('index.html');

  // 在页面加载完成后发送主题设置
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('change-theme', savedTheme);
  });

  // // 打开调试工具，设置为单独窗口
  // win.webContents.openDevTools({ mode: 'detach' });

  let lastText = clipboard.readText();
  let lastFiles = clipboard.readBuffer('FileNameW');
  let lastImage = clipboard.readImage().isEmpty() ? null : clipboard.readImage().toPNG();
  let clipboardTimer = null;

  function checkClipboard() {
    // 首先检查窗口和渲染进程状态
    if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) {
      console.log('[主进程] 窗口或渲染进程不可用，跳过剪贴板检查');
      return;
    }

    try {
      const currentText = clipboard.readText();
      const currentFiles = clipboard.readBuffer('FileNameW');
      const currentImage = clipboard.readImage();

      // 检查图片变化
      if (!currentImage.isEmpty()) {
        const currentImageBuffer = currentImage.toPNG();
        const isImageChanged = lastImage !== null && Buffer.compare(currentImageBuffer, lastImage) !== 0;

        if (isImageChanged) {
          console.log('[主进程] 检测到剪贴板中有图片');
          console.log('[主进程] 检测到新的图片内容');
          lastImage = currentImageBuffer;
          const timestamp = Date.now();
          const tempDir = path.join(config.tempPath || path.join(__dirname, 'temp'));

          // 检查是否存在相同内容的图片文件
          let existingImagePath = null;
          if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
              if (file.endsWith('.png')) {
                const filePath = path.join(tempDir, file);
                const fileContent = fs.readFileSync(filePath);
                if (Buffer.compare(fileContent, currentImageBuffer) === 0) {
                  existingImagePath = filePath;
                  break;
                }
              }
            }
          } else {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          let imagePath;
          if (existingImagePath) {
            // 使用已存在的图片文件
            imagePath = existingImagePath;
            console.log('[主进程] 找到相同内容的图片文件:', imagePath);
          } else {
            // 创建新的图片文件
            imagePath = path.join(tempDir, `clipboard_${timestamp}.png`);
            fs.writeFileSync(imagePath, currentImageBuffer);
            console.log('[主进程] 图片已保存到临时目录:', imagePath);
          }

          // 添加更严格的渲染进程状态检查
          if (win && !win.isDestroyed()) {
            const webContents = win.webContents;
            if (webContents && !webContents.isDestroyed()) {
              // 确保渲染进程已完全加载
              if (webContents.getProcessId() && !webContents.isLoading()) {
                try {
                  console.log('[主进程] 准备发送图片信息到渲染进程');
                  win.webContents.send('clipboard-file', {
                    name: path.basename(imagePath),
                    path: imagePath,
                    type: 'image',
                    isNewImage: !existingImagePath // 标记是否为新图片
                  });
                  console.log('[主进程] 图片信息已发送到渲染进程');
                } catch (error) {
                  console.error('[主进程] 发送图片信息到渲染进程时出错:', error);
                  if (!existingImagePath) {
                    try {
                      fs.unlinkSync(imagePath);
                    } catch (unlinkError) {
                      console.error('[主进程] 清理临时文件时出错:', unlinkError);
                    }
                  }
                }
              }
            } else if (!existingImagePath) {
              try {
                fs.unlinkSync(imagePath);
              } catch (unlinkError) {
                console.error('[主进程] 清理临时文件时出错:', unlinkError);
              }
            }
          }
        }
      }

      // 检查文本变化
      if (currentText && currentText !== lastText) {
        lastText = currentText;
        if (win && !win.isDestroyed()) {
          try {
            const webContents = win.webContents;
            if (webContents && !webContents.isDestroyed()) {
              webContents.send('clipboard-text', currentText);
            }
          } catch (error) {
            console.error('[主进程] 发送文本消息时出错:', error);
          }
        }
      }

      // 检查文件变化
      if (currentFiles && currentFiles.length > 0) {
        try {
          const filesString = currentFiles.toString('utf16le').replace(/\x00/g, '');
          const files = filesString.split('\r\n').filter(Boolean);

          // 检查是否与上次的文件列表不同
          if (JSON.stringify(files) !== JSON.stringify(lastFiles)) {
            lastFiles = files;
            if (win && !win.isDestroyed()) {
              const webContents = win.webContents;
              if (webContents && !webContents.isDestroyed()) {
                files.forEach(filePath => {
                  const fileName = path.basename(filePath);
                  webContents.send('clipboard-file', {
                    name: fileName,
                    path: filePath,
                    type: 'file'
                  });
                });
              }
            }
          }
        } catch (error) {
          console.error('处理剪贴板文件时出错:', error);
        }
      }
    } catch (error) {
      console.error('[主进程] 检查剪贴板时出错:', error);
    }

    clipboardTimer = setTimeout(checkClipboard, 100); // 每100毫秒检查一次
  }

  // 窗口加载完成后的处理
  win.webContents.on('did-finish-load', () => {
    // 启动剪贴板监听
    console.log('[主进程] 窗口加载完成，开始监听剪贴板');
    checkClipboard();
  });

  // 监听窗口关闭事件，清理定时器
  win.on('closed', () => {
    if (clipboardTimer) {
      clearTimeout(clipboardTimer);
      clipboardTimer = null;
    }
  });

  // 监听窗口即将关闭事件，保存窗口尺寸
  win.on('close', () => {
    try {
      // 获取当前窗口尺寸
      const size = win.getSize();
      // 更新配置文件
      const configPath = path.join(__dirname, 'conf', 'settings.conf');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config.windowWidth = size[0];
      config.windowHeight = size[1];
      fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
      console.log('[主进程] 窗口尺寸已保存:', size);
    } catch (error) {
      console.error('[主进程] 保存窗口尺寸时出错:', error);
    }
  });

  // 监听窗口移动请求
  ipcMain.on('move-window', (event, offsetX, offsetY) => {
    const [x, y] = win.getPosition();
    win.setPosition(x + offsetX, y + offsetY);
  });

  // 监听关闭窗口的请求
  ipcMain.on('close-window', () => {
    win.close();
  });

  // 打开设置窗口
  ipcMain.on('open-settings', () => {

    // 读取当前主题配置
    const configPath = path.join(__dirname, 'conf', 'settings.conf');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const savedTheme = config.theme || 'light';

    const settingsWindow = new BrowserWindow({
      width: 650,
      height: 500,
      frame: false,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        nativeWindowOpen: true
      },
    });

    settingsWindow.loadFile('components/settings/settings.html');
    // 打开调试工具，设置为单独窗口
    settingsWindow.webContents.openDevTools({ mode: 'detach' });

    // 在页面加载完成后发送主题设置
    settingsWindow.webContents.on('did-finish-load', () => {
      settingsWindow.webContents.send('change-theme', savedTheme);
    });

    // 为当前设置窗口创建一个专门的关闭事件处理函数
    const closeSettingsHandler = () => {
      if (!settingsWindow.isDestroyed()) {
        settingsWindow.close();
      }
    };

    // 注册关闭事件监听
    const closeSettingsChannel = 'close-settings-' + Date.now();
    ipcMain.on(closeSettingsChannel, closeSettingsHandler);

    // 当窗口关闭时，移除事件监听器
    settingsWindow.on('closed', () => {
      ipcMain.removeListener(closeSettingsChannel, closeSettingsHandler);
    });

    // 将新的channel ID发送给渲染进程
    settingsWindow.webContents.on('did-finish-load', () => {
      settingsWindow.webContents.send('settings-channel', closeSettingsChannel);
    });
  });

  // 监听重启应用的请求
  ipcMain.on('reload-app', () => {
    app.relaunch();
    app.exit(0);
  });

  // 处理数据库路径请求
  ipcMain.on('get-db-path', (event) => {
    const configPath = path.join(__dirname, 'conf', 'settings.conf');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const dbPath = path.join(config.dbPath, 'clipboard.db');
    event.returnValue = dbPath;
  });

  // 监听打开开发者工具的请求
  ipcMain.on('open-devtools', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow);

// 在所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});