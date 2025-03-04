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

const configPath = path.join(__dirname, 'conf', 'shortcut-key.conf');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 键盘快捷键监听
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const searchContainer = document.querySelector('.clipboard-search');
    searchContainer.style.display = 'none';
  }
  // 监听搜索框显示隐藏
  if (config.search) {
    let key = config.search.key;
    let isCtrl = key.includes("ctrl");
    let isAlt = key.includes("alt");
    let isShift = key.includes("shift");
    // mac上是command键，windows上是win键
    let isMeta = key.includes("meta");
    let character = key[key.length - 1];
    if (
      e.key.toLowerCase() === character.toLowerCase()
      && e.ctrlKey === isCtrl
      && e.altKey === isAlt
      && e.shiftKey === isShift
      && e.metaKey === isMeta
    ) {
      e.preventDefault(); // 阻止浏览器默认的查找行为
      const searchBox = document.querySelector('.clipboard-search');
      searchBox.style.display = searchBox.style.display === 'block' ? 'none' : 'block';
      if (searchBox.style.display === 'block') {
        searchBox.querySelector('input').focus();
      }
    }
  }
});