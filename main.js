const { app, BrowserWindow, ipcMain, clipboard, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  // 读取配置文件
  const configPath = path.join(__dirname, 'conf', 'settings.conf');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(config);
  const savedTheme = config.theme || 'light';
  console.log('读取到的主题配置:', savedTheme);

  // 获取屏幕尺寸和鼠标位置
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const mousePos = screen.getCursorScreenPoint();
  
  // 计算窗口位置，确保不超出屏幕
  const windowWidth = 400;
  const windowHeight = 600;
  
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
    frame: true,
    resizable: false, // 禁止调整窗口大小
    minimizable: false, // 禁止最小化
    maximizable: false, // 禁止最大化
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      nativeWindowOpen: true
    },
    icon: 'images/logo.png',
    x: x,
    y: y,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#f5f7fa',
    transparent: false
  });

  // 监听系统主题变化
  nativeTheme.on('updated', () => {
    console.log('系统主题发生变化');
    win.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#f5f7fa');
    console.log('窗口背景色已更新:', nativeTheme.shouldUseDarkColors ? '深色' : '浅色');
    // 只在自动模式下响应系统主题变化
    if (nativeTheme.themeSource === 'system') {
      console.log('当前为自动主题模式，正在更新配置...');
      const configPath = path.join(__dirname, 'conf', 'settings.conf');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const newTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      console.log('当前系统主题:', newTheme);
      if (config.theme !== newTheme) {
        console.log('检测到主题变化，从', config.theme, '切换为', newTheme);
        config.theme = newTheme;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        console.log('配置文件已更新');
        win.webContents.send('change-theme', newTheme);
        console.log('已发送主题切换消息到渲染进程');
      } else {
        console.log('主题未发生变化，保持当前设置');
      }
    } else {
      console.log('非自动主题模式，忽略系统主题变化');
    }
  });

  // 获取当前主题
  ipcMain.handle('dark-mode', () => {
    return nativeTheme.themeSource;
  });

  // 设置主题
  ipcMain.handle('dark-mode:change', (_, type) => {
    nativeTheme.themeSource = type;
    const configPath = path.join(__dirname, 'conf', 'settings.conf');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    // 如果是system模式，则根据系统当前主题设置
    if (type === 'system') {
      config.theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    } else {
      config.theme = type;
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    win.webContents.send('change-theme', config.theme);
    return nativeTheme.themeSource;
  });

  // 设置菜单样式
  win.webContents.on('dom-ready', () => {
    win.webContents.insertCSS(`
      .menubar {
        height: 28px !important;
        background-color: ${config.theme === 'dark' ? '#1e1e1e' : '#f5f7fa'} !important;
        color: ${config.theme === 'dark' ? '#ffffff' : '#000000'} !important;
      }
      .submenu-item {
        padding: 4px 12px !important;
        height: 28px !important;
        white-space: nowrap !important;
        background-color: ${config.theme === 'dark' ? '#1e1e1e' : '#f5f7fa'} !important;
        color: ${config.theme === 'dark' ? '#ffffff' : '#000000'} !important;
      }
      .submenu-item:hover {
        background-color: ${config.theme === 'dark' ? '#2d2d2d' : '#e0e0e0'} !important;
      }
    `);
  });

  // 加载应用的 index.html
  win.loadFile('index.html');

  // 在页面加载完成后发送主题设置
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('change-theme', savedTheme);
  });

  // 打开调试工具，设置为单独窗口
  win.webContents.openDevTools({ mode: 'detach' });

  // 创建自定义菜单
  const template = [
    {
      label: '选项',
      submenu: [
        {
          label: '偏好设置',
          click: () => {
            // TODO: 实现设置功能
            win.webContents.send('open-settings');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '重新加载',
          click: () => {
            app.relaunch();
            app.exit(0);
          }
        },
        {
          type: 'separator'
        },
        {
          label: '关闭',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '查找',
      accelerator: 'CmdOrCtrl+F',
      click: () => {
        win.webContents.send('toggle-search');
      }
    },
    {
      label: '清空剪贴板',
      click: () => {
        win.webContents.send('clear-clipboard');
      }
    },
    {
      label: '主题',
      submenu: [
        {
          label: '浅色主题',
          type: 'checkbox',
          id: 'light-theme',
          checked: true,
          click: (menuItem) => {
            menuItem.checked = true;
            const darkThemeItem = menu.getMenuItemById('dark-theme');
            if (darkThemeItem) darkThemeItem.checked = false;
            const configPath = path.join(__dirname, 'conf', 'settings.conf');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config.theme = 'light';
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
            win.webContents.send('change-theme', 'light');
          }
        },
        {
          label: '深色主题',
          type: 'checkbox',
          id: 'dark-theme',
          checked: false,
          click: (menuItem) => {
            menuItem.checked = true;
            const lightThemeItem = menu.getMenuItemById('light-theme');
            if (lightThemeItem) lightThemeItem.checked = false;
            const configPath = path.join(__dirname, 'conf', 'settings.conf');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config.theme = 'dark';
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
            win.webContents.send('change-theme', 'dark');
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '使用说明',
          click: () => {
            win.webContents.send('show-help');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '更新日志',
          click: () => {
            win.webContents.send('show-changelog');
          }
        },
        {
          label: '检查更新',
          click: () => {
            win.webContents.send('check-update');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '关于',
          click: () => {
            win.webContents.send('show-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  const lightThemeItem = menu.getMenuItemById('light-theme');
  const darkThemeItem = menu.getMenuItemById('dark-theme');
  if (lightThemeItem) {
    lightThemeItem.checked = savedTheme === 'light';
    console.log('浅色主题菜单项状态:', lightThemeItem.checked);
  }
  if (darkThemeItem) {
    darkThemeItem.checked = savedTheme === 'dark';
    console.log('深色主题菜单项状态:', darkThemeItem.checked);
  }
  console.log('正在发送主题切换消息:', savedTheme);
  win.webContents.send('change-theme', savedTheme);
  win.webContents.once('dom-ready', () => {
    console.log('DOM加载完成，重新发送主题切换消息');
    win.webContents.send('change-theme', savedTheme);
  });

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

  // 监听窗口移动请求
  ipcMain.on('move-window', (event, offsetX, offsetY) => {
    const [x, y] = win.getPosition();
    win.setPosition(x + offsetX, y + offsetY);
  });

  // 监听关闭窗口的请求
  ipcMain.on('close-window', () => {
    win.close();
  });

  // 处理数据库路径请求
  ipcMain.on('get-db-path', (event) => {
    const configPath = path.join(__dirname, 'conf', 'settings.conf');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const dbPath = path.join(config.dbPath, 'clipboard.db');
    event.returnValue = dbPath;
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