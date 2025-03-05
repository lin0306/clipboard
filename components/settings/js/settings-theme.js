// 监听主题切换事件
ipcRenderer.on('change-theme', (event, theme) => {
    changeTheme(theme);
});

// 切换主题
function changeTheme(theme) {
    console.log('设置页面收到主题切换消息:', theme);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    console.log('已更新DOM类名:', document.body.className);
    loadThemeCSS(theme);
    console.log('已加载主题CSS文件:', theme);
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
    themeLink.href = `../../themes/${theme}/base.css`;
    document.head.appendChild(themeLink);
}

// 添加关闭按钮点击事件监听
// 存储设置窗口的关闭channel ID
let settingsCloseChannel = null;

// 监听主进程发送的channel ID
ipcRenderer.on('settings-channel', (event, channelId) => {
    settingsCloseChannel = channelId;
});

document.addEventListener('DOMContentLoaded', () => {
    const closeButton = document.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        if (settingsCloseChannel) {
            ipcRenderer.send(settingsCloseChannel);
        }
    });
});