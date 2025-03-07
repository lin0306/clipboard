const path = require('path');
const fs = require('fs');

let settingConfig = null;
// 获取重启弹窗容器元素
const restartDialogOverlay = document.querySelector('.restart-dialog-overlay');
const restartDialogCancel = document.querySelector('.restart-dialog-cancel');
const restartDialogConfirm = document.querySelector('.restart-dialog-confirm');

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

    // 固定窗口大小开关点击事件
    document.getElementById("fixed-window-size").addEventListener('change', () => {
        const checked = document.getElementById("fixed-window-size").checked;
        const windowHeight = document.getElementById("window-height");
        const windowWidth = document.getElementById("window-width");
        windowHeight.disabled = !checked;
        windowWidth.disabled = !checked;
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
            // 切换时，重置未保存的所有数据
            setGeneralData(settingConfig);
        });
    });

    // 通用设置重置按钮点击事件
    document.getElementById("general-reset").addEventListener('click', () => {
        setGeneralData(settingConfig);
    });

    // 通用设置保存按钮点击事件
    document.getElementById("general-save").addEventListener('click', () => {
        const powerOnSelfStart = document.getElementById("power-on-self-start").checked;;
        const replaceGlobalHotkey = document.getElementById("replace-global-hotkey").checked;;
        const fixedWindowSize = document.getElementById("fixed-window-size").checked;;
        const windowHeight = document.getElementById("window-height").value;
        const windowWidth = document.getElementById("window-width").value;
        const languagesElement = document.getElementById("languages");
        const languagesSelectIndex = languagesElement.selectedIndex;
        const languagesValue = languagesElement.options[languagesSelectIndex].value;
        // 没有更新数据，忽略
        if (
            (powerOnSelfStart ? 1 : 0) === (Boolean(settingConfig.powerOnSelfStart) ? 1 : 0)
            && (replaceGlobalHotkey ? 1 : 0) === (Boolean(settingConfig.replaceGlobalHotkey) ? 1 : 0)
            && (fixedWindowSize ? 1 : 0) === (Boolean(settingConfig.fixedWindowSize) ? 1 : 0)
            && fixedWindowSize === Boolean(settingConfig.fixedWindowSize)
            && parseInt(windowHeight) === parseInt(settingConfig.windowHeight)
            && parseInt(windowWidth) === parseInt(settingConfig.windowWidth)
            && languagesValue === settingConfig.languages
        ) {
            return;
        }
        saveGeneralData(powerOnSelfStart, replaceGlobalHotkey, fixedWindowSize, windowHeight, windowWidth, languagesValue);
        saveGeneralDataToFile(powerOnSelfStart, replaceGlobalHotkey, fixedWindowSize, windowHeight, windowWidth, languagesValue);
        message.success('保存成功');
        openRestartDialog();
    });

    // 重启确认弹窗 - 确认按钮
    restartDialogConfirm.addEventListener('click', async () => {
        ElectronManager.reloadApp();
    });

    // 重启确认弹窗 - 取消按钮
    restartDialogCancel.addEventListener('click', () => {
        restartDialogOverlay.classList.remove('show');
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
    settingConfig = config;
    console.log('页面数据初始化', config);
    setGeneralData(config);
    setStorageData(config);
    initShortcutKeys();
}

// 通用设置初始化
function setGeneralData(config) {
    console.log('通用设置页面数据初始化');
    const powerOnSelfStart = document.getElementById("power-on-self-start");
    const replaceGlobalHotkey = document.getElementById("replace-global-hotkey");
    const fixedWindowSize = document.getElementById("fixed-window-size");
    const windowHeight = document.getElementById("window-height");
    const windowWidth = document.getElementById("window-width");
    const languages = document.getElementById("languages");
    // 绑定开关状态
    powerOnSelfStart.checked = Boolean(config.powerOnSelfStart);
    powerOnSelfStart.dispatchEvent(new Event('change'));
    replaceGlobalHotkey.checked = Boolean(config.replaceGlobalHotkey);
    replaceGlobalHotkey.dispatchEvent(new Event('change'));
    fixedWindowSize.checked = Boolean(config.fixedWindowSize);
    fixedWindowSize.dispatchEvent(new Event('change'));

    // 处理窗口尺寸输入框
    windowHeight.value = parseInt(config.windowHeight) || 600;
    windowWidth.value = parseInt(config.windowWidth) || 800;
    windowHeight.disabled = !config.fixedWindowSize;
    windowWidth.disabled = !config.fixedWindowSize;

    // 绑定语言选项
    Array.from(languages.options).forEach(option => {
        if (option.value === config.languages) {
            option.selected = true;
        }
    });
    languages.dispatchEvent(new Event('change'));
}

// 通用设置保存到设置的变量中
function saveGeneralData(powerOnSelfStart, replaceGlobalHotkey, fixedWindowSize, windowHeight, windowWidth, languagesValue) {
    settingConfig.powerOnSelfStart = powerOnSelfStart;
    settingConfig.replaceGlobalHotkey = replaceGlobalHotkey;
    settingConfig.fixedWindowSize = fixedWindowSize;
    if (!fixedWindowSize) {
        settingConfig.windowHeight = windowHeight;
        settingConfig.windowWidth = windowWidth;
    }
    settingConfig.languages = languagesValue;
    console.log('通用设置保存到局部变量成功');
}

// 通用设置保存到文件
function saveGeneralDataToFile(powerOnSelfStart, replaceGlobalHotkey, fixedWindowSize, windowHeight, windowWidth, languagesValue) {
    const configPath = path.join(__dirname, '../../conf', 'settings.conf');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.powerOnSelfStart = powerOnSelfStart;
    config.replaceGlobalHotkey = replaceGlobalHotkey;
    config.fixedWindowSize = fixedWindowSize;
    if (!fixedWindowSize) {
        config.windowHeight = windowHeight;
        config.windowWidth = windowWidth;
    }
    config.languages = languagesValue;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    console.log('通用设置保存到文件成功');
}

function setStorageData(config) {
    console.log('存储设置页面数据初始化');
    const dataStorage = document.getElementById("data-storage");
    const tempStorage = document.getElementById("temp-storage");
    dataStorage.value = config.dbPath;
    tempStorage.value = config.tempPath;
}


// 初始化快捷键配置
function initShortcutKeys() {
    console.log('初始化快捷键配置');
    const container = document.querySelector('.shortcut-key-container');
    container.innerHTML = '';
    const configPath = path.join(__dirname, '../../conf', 'shortcut-key.conf');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    for (const name in config) {
     console.log('name', name);
     console.log('keys', config[name]);   
    }
    // window.electron.readConfig('shortcut-key.conf')
    //     .then(data => {
    //         Object.entries(data).forEach(([name, keys]) => {
    //             const line = document.createElement('div');
    //             line.className = 'line';

    //             const title = document.createElement('div');
    //             title.className = 'little';
    //             title.textContent = name;

    //             const keysContainer = document.createElement('div');
    //             keysContainer.className = 'operate';
    //             keys.split('+').forEach(key => {
    //                 const keySpan = document.createElement('span');
    //                 keySpan.className = 'key';
    //                 keySpan.textContent = key.trim();
    //                 keysContainer.appendChild(keySpan);
    //                 if (key !== keys.split('+').pop()) {
    //                     keysContainer.appendChild(document.createTextNode(' + '));
    //                 }
    //             });

    //             line.appendChild(title);
    //             line.appendChild(keysContainer);
    //             container.appendChild(line);
    //         });
    //     })
    //     .catch(err => {
    //         console.error('读取快捷键配置失败:', err);
    //     });
}



// 打开重启弹窗
function openRestartDialog() {
    restartDialogOverlay.classList.add('show');
    restartDialogCancel.focus();
}
