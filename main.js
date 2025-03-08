const { app, BrowserWindow, ipcMain, clipboard, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');

// 这个设置允许macOS在全屏模式下显示在顶部。由于Windows操作系统没有这个设置，所以在设置之前要检查是否是macOS。这个设置只适用于macOS。
const is_mac = process.platform === 'darwin'
if (is_mac) {
  app.dock.hide();
}

let isOpenWindow = false;
let isHideWindow = false;
let x = null;
let y = null;
function createWindow() {
  console.log("是否打开了主窗口：" + isOpenWindow);
  if (isOpenWindow) {
    return;
  }
  isOpenWindow = true;
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

  if (isHideWindow) { } else {
    // 计算窗口的x坐标
    x = mousePos.x - windowWidth / 2; // 默认窗口中心对齐鼠标
    if (x < 0) { // 如果超出左边界
      x = 0;
    } else if (x + windowWidth > width) { // 如果超出右边界
      x = width - windowWidth;
    }

    // 计算窗口的y坐标
    y = mousePos.y - windowHeight / 2; // 默认窗口中心对齐鼠标
    if (y < 0) { // 如果超出上边界
      y = 0;
    } else if (y + windowHeight > height) { // 如果超出下边界
      y = height - windowHeight;
    }
  }

  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    frame: false,
    resizable: !Boolean(config.fixedWindowSize),
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

  // 窗口置顶
  // 这个设置允许在Keynote演示模式下显示在顶部。BrowserWindow中有一项alwaysOnTop。
  // 当我设置为true时，其他应用程序会被覆盖在顶部，但Keynote演示模式下不行。
  // 所以我需要设置mainWindow.setAlwaysOnTop(true, "screen-saver")。
  win.setAlwaysOnTop(true, "screen-saver")
  // 这个设置允许在切换到其他工作区时显示。
  win.setVisibleOnAllWorkspaces(true)

  // 加载应用的 index.html
  win.loadFile('index.html');

  // 在页面加载完成后发送主题设置
  win.webContents.on('did-finish-load', () => {
    console.log('[主进程] 发送主题设置到渲染进程');
    win.webContents.send('change-theme', savedTheme);
    // 启动剪贴板监听
    console.log('[主进程] 窗口加载完成，开始监听剪贴板');
    checkClipboard();
  });

  // 打开调试工具，设置为单独窗口
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
      if (!Boolean(config.fixedWindowSize)) {
        config.windowWidth = size[0];
        config.windowHeight = size[1];
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        console.log('[主进程] 窗口尺寸已保存:', size);
      } else {
        console.log('[主进程] 已设置窗口大小不监听，不更新窗口大小');
      }
    } catch (error) {
      console.error('[主进程] 保存窗口尺寸时出错:', error);
    }
  });

  // 监听关闭窗口的请求
  ipcMain.on('close-window', () => {
    isOpenWindow = false;
    if (Boolean(config.colsingHideToTaskbar)) {
      const [currentX, currentY] = win.getPosition();
      x = currentX;
      y = currentY;
      win.hide();
      isHideWindow = true;
    } else {
      win.close();
      app.exit(0);
    }
  });

  // 打开设置窗口
  ipcMain.on('open-settings', createSettingsWindow);

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

  //创建系统托盘右键菜单
  createTray(win);
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当运行第二个实例时,将会聚焦到mainWindow这个窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.show()
    }
  })
  // 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
  app.whenReady().then(createWindow);
}

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

// 是否已经打开设置窗口
let isOpenSettingsWindow = false;
// 创建设置窗口
function createSettingsWindow() {
  if (isOpenSettingsWindow) {
    return;
  }
  isOpenSettingsWindow = true;
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
  // settingsWindow.webContents.openDevTools({ mode: 'detach' });

  // 在页面加载完成后发送主题设置
  settingsWindow.webContents.on('did-finish-load', () => {
    settingsWindow.webContents.send('change-theme', savedTheme);
    settingsWindow.webContents.send('init-config');
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
    isOpenSettingsWindow = false;
  });

  // 将新的channel ID发送给渲染进程
  settingsWindow.webContents.on('did-finish-load', () => {
    settingsWindow.webContents.send('settings-channel', closeSettingsChannel);
  });

  // 监听打开开发者工具的请求
  ipcMain.on('open-settings-devtools', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });
}

// 系统托盘对象
function createTray(win) {
  console.log("是否隐藏了主窗口：" + isHideWindow);
  if (isHideWindow) {
    return;
  }
  const trayMenuTemplate = [
    {
      label: '打开主窗口',
      click: function () {
        createWindow();
      }
    },
    {
      label: '设置',
      click: function () {
        createSettingsWindow();
      }
    },
    {
      label: '帮助',
      click: function () { }
    },
    {
      label: '关于',
      click: function () { }
    },
    {
      label: '退出',
      click: function () {
        app.quit();
        app.quit(); //因为程序设定关闭为最小化，所以调用两次关闭，防止最大化时一次不能关闭的情况
      }
    }
  ];

  //系统托盘图标目录
  const trayIcon = path.join(__dirname, 'images', 'logo.png');

  const appTray = new Tray(trayIcon);

  //图标的上下文菜单
  const contextMenu = Menu.buildFromTemplate(trayMenuTemplate);

  //设置此托盘图标的悬停提示内容
  appTray.setToolTip('我的剪贴板');

  //设置此图标的上下文菜单
  appTray.setContextMenu(contextMenu);
  //单击右下角小图标显示应用
  appTray.on('click', function () {
    win.show();
  });
}
