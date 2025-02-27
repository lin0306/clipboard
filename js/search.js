const searchInput = document.querySelector('.clipboard-search-input');

// 监听搜索输入框变化
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.stopPropagation();
        filterClipboardItems(e.target.value);
    }
});

// 监听搜索按钮点击
const searchButton = document.querySelector('.clipboard-search-button');
searchButton.addEventListener('click', () => {
    filterClipboardItems(searchInput.value);
});

// 监听ESC键关闭搜索框和Ctrl+F打开搜索框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const searchContainer = document.querySelector('.clipboard-search');
      searchContainer.style.display = 'none';
    }
    // 检查是否按下了Ctrl+F
    if (e.ctrlKey && e.key.toLowerCase() === 'f') {
      e.preventDefault(); // 阻止浏览器默认的查找行为
      const searchBox = document.querySelector('.clipboard-search');
      searchBox.style.display = searchBox.style.display === 'block' ? 'none' : 'block';
      if (searchBox.style.display === 'block') {
        searchBox.querySelector('input').focus();
      }
    }
  });