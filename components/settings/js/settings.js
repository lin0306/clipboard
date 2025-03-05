document.addEventListener('DOMContentLoaded', () => {
    // 初始化设置菜单交互
    const menuItems = document.querySelectorAll('.settings-menu li');
    const containers = document.querySelectorAll('.settings-container > div');

    // 初始化select元素交互
    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', () => {
            select.blur();
        });
    });

    document.getElementById("remember-window-size").addEventListener('change', () => {
        const checked = document.getElementById("remember-window-size").checked;
        const windowHeight = document.getElementById("window-height");
        const windowWidth = document.getElementById("window-width");
        windowHeight.disabled = checked;
        windowWidth.disabled = checked;
    });

    // 默认激活第一个标签页
    menuItems[0].classList.add('active');
    containers[0].classList.add('active');

    menuItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            // 移除所有active类
            menuItems.forEach(i => i.classList.remove('active'));
            containers.forEach(c => c.classList.remove('active'));

            // 添加active类到当前选中项
            item.classList.add('active');
            containers[index].classList.add('active');
        });
    });
});

document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.select-wrapper')) {
        document.querySelectorAll('select').forEach(select => {
            if (select.value === select.dataset.originalValue) {
                select.parentElement.querySelector('.arrow-icon').classList.remove('rotate');
            }
        });
    }
});

ipcRenderer.on('init-config', (event, config) => {
    initData(config);
});

function initData(config) {
    console.log('页面数据初始化', config);
    const powerOnSelfStart = document.getElementById("power-on-self-start");
    const replaceGlobalHotkey = document.getElementById("replace-global-hotkey");
    const rememberWindowSize = document.getElementById("remember-window-size");
    const windowHeight = document.getElementById("window-height");
    const windowWidth = document.getElementById("window-width");
    const languages = document.getElementById("languages");
    // 绑定开关状态
    powerOnSelfStart.checked = Boolean(config.powerOnSelfStart);
    powerOnSelfStart.dispatchEvent(new Event('change'));
    replaceGlobalHotkey.checked = Boolean(config.replaceGlobalHotkey);
    replaceGlobalHotkey.dispatchEvent(new Event('change'));
    rememberWindowSize.checked = Boolean(config.rememberWindowSize);
    rememberWindowSize.dispatchEvent(new Event('change'));

    // 处理窗口尺寸输入框
    windowHeight.value = parseInt(config.windowHeight) || 600;
    windowWidth.value = parseInt(config.windowWidth) || 800;
    windowHeight.disabled = config.rememberWindowSize;
    windowWidth.disabled = config.rememberWindowSize;

    console.log(config.languages);
    // 绑定语言选项
    Array.from(languages.options).forEach(option => {
        console.log(option.value)
        if (option.value === config.languages) {
            option.selected = true;
        }
    });
    languages.dispatchEvent(new Event('change'));
}