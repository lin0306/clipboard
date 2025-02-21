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

  function checkClipboard() {
    const currentText = clipboard.readText();
    if (currentText && currentText !== lastText) {
      lastText = currentText;
      win.webContents.send('clipboard-text', currentText);
    }
    setTimeout(checkClipboard, 100); // 每100毫秒检查一次
  }

  checkClipboard();

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