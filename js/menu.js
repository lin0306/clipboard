document.addEventListener('DOMContentLoaded', () => {
    // 获取菜单项元素
    const programMenu = document.getElementById('program');
    const settingMenu = document.getElementById('setting');
    const debuggingToolMenu = document.getElementById('debugging-tool');
    const reloadMenu = document.getElementById('reload');
    const closeMenu = document.getElementById('close');
    const findMenu = document.getElementById('find');
    const clearClipboardMenu = document.getElementById('clear-clipboard');
    const instructionMenu = document.getElementById('instruction');
    const updateLogMenu = document.getElementById('update-log');
    const checkUpdateMenu = document.getElementById('check-update');
    const asForMenu = document.getElementById('as-for');

    // 获取清空确认弹窗元素
    const clearDialogOverlay = document.querySelector('.clear-dialog-overlay');
    const clearDialogConfirm = document.querySelector('.clear-dialog-confirm');
    const clearDialogCancel = document.querySelector('.clear-dialog-cancel');

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
        ElectronManager.openSetting();
    });

    reloadMenu.addEventListener('click', () => {
        // 重新加载应用
        ElectronManager.reloadApp();
    });

    closeMenu.addEventListener('click', () => {
        // 关闭应用
        ElectronManager.closeApp();
    });

    // 调试工具菜单项事件处理
    debuggingToolMenu.addEventListener('click', () => {
        // 打开开发者工具
        ElectronManager.openDevTools();
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
    clearClipboardMenu.addEventListener('click', () => {
        clearDialogOverlay.classList.add('show');
    });

    // 清空确认弹窗 - 确认按钮
    clearDialogConfirm.addEventListener('click', async () => {
        await db.clearAll();
        clearClipboardList();
        updateEmptyState();
        clearDialogOverlay.classList.remove('show');
        showMessage('success', '剪贴板已清空');
    });

    // 清空确认弹窗 - 取消按钮
    clearDialogCancel.addEventListener('click', () => {
        clearDialogOverlay.classList.remove('show');
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

