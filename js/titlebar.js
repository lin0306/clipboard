document.addEventListener('DOMContentLoaded', () => {
    const titleBar = document.getElementById('title-bar');
    const fixationButton = document.querySelector('.fixation-button');
    const unfixationButton = document.querySelector('.unfixation-button');

    // 点击固定按钮
    fixationButton.addEventListener('click', () => {
        titleBar.classList.add('fixed');
        fixationButton.style.display = 'none';
        unfixationButton.style.display = 'flex';
    });

    // 点击取消固定按钮
    unfixationButton.addEventListener('click', () => {
        titleBar.classList.remove('fixed');
        unfixationButton.style.display = 'none';
        fixationButton.style.display = 'flex';
    });
});
// 添加关闭按钮点击事件监听
const closeButton = document.querySelector('.close-button');
closeButton.addEventListener('click', () => {
    ElectronManager.closeApp();
});