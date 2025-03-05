// 获取主题列表
function getThemes() {
    const themesPath = path.join(__dirname, 'themes');
    try {
        return fs.readdirSync(themesPath).filter(file => {
            return fs.statSync(path.join(themesPath, file)).isDirectory();
        });
    } catch (error) {
        console.error('获取主题列表失败:', error);
        return [];
    }
}

// 初始化主题列表
function initThemeMenu() {
    const themesMenu = document.getElementById('themes-menu');
    const themes = getThemes();

    themes.forEach(theme => {
        const li = document.createElement('li');
        li.className = 'themes-item';
        li.id = theme;

        const hookDiv = document.createElement('div');
        hookDiv.className = 'themes-hook';
        hookDiv.dataset.id = theme;

        const themeNameDiv = document.createElement('div');
        themeNameDiv.textContent = theme;

        li.appendChild(hookDiv);
        li.appendChild(themeNameDiv);
        themesMenu.appendChild(li);

        // 主题切换
        li.addEventListener('click', () => {
            // 更新主题配置
            changeTheme(theme);
            updateThemeToConf(theme);
        });
    });
}

// 当DOM加载完成后初始化主题列表
document.addEventListener('DOMContentLoaded', initThemeMenu);

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
    searchIcon.src = `themes/${theme}/images/search.svg`;
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
      emptyStateImg.src = `themes/${theme}/images/empty.svg`;
    }
}
// 更新主题配置
function updateThemeToConf(theme) {
    const configPath = path.join(__dirname, 'conf', 'settings.conf');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.theme = theme;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}