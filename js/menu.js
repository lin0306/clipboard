document.addEventListener('DOMContentLoaded', () => {
    // 获取菜单项元素
    const programMenu = document.getElementById('program');
    const settingMenu = document.getElementById('setting');
    const reloadMenu = document.getElementById('reload');
    const closeMenu = document.getElementById('close');
    const findMenu = document.getElementById('find');
    const clearClipboardMenu = document.getElementById('clear-clipboard');
    const lightThemeMenu = document.getElementById('light');
    const darkThemeMenu = document.getElementById('dark');
    const instructionMenu = document.getElementById('instruction');
    const updateLogMenu = document.getElementById('update-log');
    const checkUpdateMenu = document.getElementById('check-update');
    const asForMenu = document.getElementById('as-for');

    // 处理二级菜单的显示和隐藏
    const handleSubMenu = (menuItem) => {
        const subMenu = menuItem.parentElement.querySelector('.secondary-menu');
        if (subMenu) {
            const allSubMenus = document.querySelectorAll('.secondary-menu');
            allSubMenus.forEach(menu => {
                if (menu !== subMenu) {
                    menu.style.display = 'none';
                }
            });
            subMenu.style.display = subMenu.style.display === 'block' ? 'none' : 'block';
        }
    };

    // 程序菜单项事件处理
    settingMenu.addEventListener('click', () => {
        // 打开设置窗口
        // window.electron.openSettings();
        message.info("设置功能开发中");
    });

    reloadMenu.addEventListener('click', () => {
        console.log(1)
        // 重新加载应用
        ElectronManager.reloadApp();
    });

    closeMenu.addEventListener('click', () => {
        // 关闭应用
        ElectronManager.closeApp();
    });

    // 查找功能
    findMenu.addEventListener('click', () => {
        const searchBox = document.querySelector('.clipboard-search');
        searchBox.style.display = searchBox.style.display === 'block' ? 'none' : 'block';
        if (searchBox.style.display === 'block') {
            searchBox.querySelector('input').focus();
        }
    });

    // 清空剪贴板
    clearClipboardMenu.addEventListener('click', async () => {
        if (confirm('确定要清空剪贴板吗？')) {
            await db.clearAll();
            clearClipboardList();
            updateEmptyState();
            showMessage('success', '剪贴板已清空');
        }
    });

    // 主题切换
    lightThemeMenu.addEventListener('click', () => {
        // 更新主题配置
        changeTheme('light');
        updateThemeToConf('light');
    });

    darkThemeMenu.addEventListener('click', () => {
        // 更新主题配置
        changeTheme('dark');
        updateThemeToConf('dark');
    });

    // 帮助菜单项事件处理
    instructionMenu.addEventListener('click', () => {
        window.electron.openInstruction();
    });

    updateLogMenu.addEventListener('click', () => {
        window.electron.openUpdateLog();
    });

    checkUpdateMenu.addEventListener('click', () => {
        window.electron.checkUpdate();
    });

    asForMenu.addEventListener('click', () => {
        window.electron.openAbout();
    });
});

// 监听主题切换事件
ipcRenderer.on('change-theme', (event, theme) => {
    changeTheme(theme);
});

// 切换主题
function changeTheme(theme) {
    console.log('收到主题切换消息:', theme);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    console.log('已更新DOM类名:', document.body.className);
    localStorage.setItem('theme', theme);
    console.log('已保存主题设置到localStorage');
    loadThemeCSS(theme);
    console.log('已加载主题CSS文件:', theme);
  
    // 更新搜索图标
    const searchIcon = document.getElementById('search-icon');
    searchIcon.src = `themes/${theme}/search.svg`;
    console.log('已更新搜索图标:', theme);

    // 更新主题菜单勾选图标
    const themesHooks = document.querySelectorAll('.themes-hook');
    themesHooks.forEach(hook => {
        const hookId = hook.getAttribute('data-id');
        console.log('主题勾选图标ID:', hookId);
        // 根据data-id判断是否为当前主题
        if (hookId === theme) {
            hook.style.opacity = '1';
        } else {
            hook.style.opacity = '0';
        }
    });
    console.log('已更新主题勾选图标:', theme);
}

// 加载主题CSS文件
function loadThemeCSS(theme) {
    const existingThemeLink = document.getElementById('theme-css');
    if (existingThemeLink) {
      existingThemeLink.remove();
    }
  
    const themeLink = document.createElement('link');
    themeLink.id = 'theme-css';
    themeLink.rel = 'stylesheet';
    themeLink.href = `themes/${theme}/base.css`;
    document.head.appendChild(themeLink);
  
    // 更新空状态图片
    const emptyStateImg = document.querySelector('#empty-state img');
    if (emptyStateImg) {
      emptyStateImg.src = `themes/${theme}/empty.svg`;
    }
}
// 更新主题配置
function updateThemeToConf(theme) {
    const configPath = path.join(__dirname, 'conf', 'settings.conf');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.theme = theme;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    win.webContents.send('change-theme', config.theme);
}