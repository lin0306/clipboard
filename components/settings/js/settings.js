document.addEventListener('DOMContentLoaded', () => {
    // 初始化设置菜单交互
    const menuItems = document.querySelectorAll('.settings-menu li');
    const containers = document.querySelectorAll('.settings-container > div');

    // 初始化select元素交互
    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('focus', () => {
            select.parentElement.querySelector('.arrow-icon').classList.add('rotate');
        });
        select.addEventListener('blur', () => {
            select.parentElement.querySelector('.arrow-icon').classList.remove('rotate');
        });
        select.addEventListener('change', function () {
            this.blur();
            this.parentNode.querySelector('.arrow-icon').classList.remove('rotate');
        });
    });
    document.querySelectorAll('option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.arrow-icon').classList.remove('rotate');
        });
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