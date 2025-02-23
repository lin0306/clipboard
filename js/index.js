// DOM元素引用
const clipboardList = document.getElementById('clipboard-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.querySelector('.clipboard-search-input');
let selectedIndex = 0; // 当前选中项的索引

/**
 * 初始化剪贴板列表
 * 从数据库加载所有历史记录并显示
 */
async function initializeClipboard() {
  try {
    await db.init();
    const items = await db.getAllItems();
    items.forEach(item => createClipboardItem(item.content, item.is_topped === 1, item.id, item.copy_time, item.top_time, item.type, item.file_path));
    updateEmptyState();
  } catch (error) {
    console.error('初始化剪贴板失败:', error);
  }
}

/**
 * 根据搜索文本过滤剪贴板列表
 * @param {string} searchText - 搜索关键词
 */
async function filterClipboardItems(searchText) {
  if (searchText === '') {
    // 搜索框为空时显示所有项
    const items = await db.getAllItems();
    clearClipboardList();
    items.forEach(item => createClipboardItem(item.content, item.is_topped === 1, item.id, item.copy_time, item.top_time, item.type, item.file_path));
  } else {
    // 根据搜索文本过滤项
    const items = await db.searchItems(searchText);
    clearClipboardList();
    items.forEach(item => createClipboardItem(item.content, item.is_topped === 1, item.id, item.copy_time, item.top_time, item.type, item.file_path));
  }
  updateEmptyState();
}

/**
 * 清空剪贴板列表
 * 保留emptyState元素
 */
function clearClipboardList() {
  Array.from(clipboardList.children).forEach(child => {
    if (child !== emptyState) {
      clipboardList.removeChild(child);
    }
  });
}

// 监听搜索输入框变化
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.stopPropagation();
    filterClipboardItems(e.target.value);
  }
});

const searchButton = document.querySelector('.clipboard-search-button');
searchButton.addEventListener('click', () => {
  filterClipboardItems(searchInput.value);
});

/**
 * 创建剪贴板列表项
 * @param {string} text - 剪贴板内容
 * @param {boolean} isTopped - 是否置顶
 * @param {number|null} id - 数据库中的ID
 * @param {number} copyTime - 复制时间戳
 * @param {number|null} topTime - 置顶时间戳
 * @returns {HTMLElement} 创建的列表项元素
 */
function createClipboardItem(text, isTopped = false, id = null, copyTime = Date.now(), topTime = null, type = 'text', filePath = null) {
  console.log(type);
  // 创建容器元素
  const container = document.createElement('div');
  container.classList.add('clipboard-item');
  container.dataset.topped = isTopped.toString();
  container.dataset.copyTime = copyTime.toString();
  container.dataset.type = type;
  if (filePath) container.dataset.filePath = filePath;
  if (id) container.dataset.id = id.toString();
  if (topTime) container.dataset.topTime = topTime.toString();

  // 创建内容元素
  const listItem = document.createElement('div');
  listItem.classList.add('clipboard-content');
  
  // 根据类型显示不同的内容
  if (type === 'file' || type === 'image') {
    const fileName = require('path').basename(text);
    if (type === 'image') {
      const imagePreview = document.createElement('div');
      imagePreview.classList.add('image-preview');
      const img = document.createElement('img');
      img.src = filePath;
      img.classList.add('clipboard-image');
      img.style.width = 'auto';
      img.style.height = '3em';
      img.style.maxWidth = '100%';
      img.style.objectFit = 'contain';
      imagePreview.style.display = 'flex';
      imagePreview.style.justifyContent = 'center';
      imagePreview.style.alignItems = 'center';
      imagePreview.style.height = '3em';
      imagePreview.style.overflow = 'hidden';
      imagePreview.appendChild(img);
      container.appendChild(imagePreview);
  
      listItem.innerHTML = `
        <div class="file-info">
          <span class="file-icon">🖼️</span>
          <span class="file-name">${fileName}</span>
        </div>
      `;
      container.classList.add('image-item');
    } else {
      listItem.innerHTML = `<span class="file-icon">📄</span> ${fileName}<br><span class="file-path">${text}</span>`;
      container.classList.add('file-item');
    }
  } else {
    listItem.textContent = text;
  }
  
  container.appendChild(listItem);

  // 创建置顶按钮
  const topButton = document.createElement('div');
  topButton.classList.add('top-button');
  if (isTopped) topButton.classList.add('topped');
  topButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isCurrentlyTopped = container.dataset.topped === 'true';
    if (container.dataset.id) {
      await db.toggleTop(parseInt(container.dataset.id), !isCurrentlyTopped);
      await filterClipboardItems(searchInput.value);
    }
  });
  container.appendChild(topButton);

  // 创建删除按钮
  const deleteButton = document.createElement('div');
  deleteButton.classList.add('delete-button');
  deleteButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (container.dataset.id) {
      await db.deleteItem(parseInt(container.dataset.id));
    }
    clipboardList.removeChild(container);
    updateEmptyState();
  });
  container.appendChild(deleteButton);

  // 监听鼠标悬停事件，更新选中状态
  container.addEventListener('mouseenter', () => {
    const items = Array.from(clipboardList.children).filter(item => 
      item !== emptyState && 
      item.style.display !== 'none'
    );
    const containerIndex = items.indexOf(container);
    if (containerIndex !== -1) {
      updateSelection(containerIndex);
    }
  });

  // 监听双击事件，复制内容到剪贴板或打开文件
  container.addEventListener('dblclick', async () => {
    if (type === 'file') {
      require('electron').shell.openPath(filePath);
    } else if (type === 'image') {
      ElectronManager.writeImageToClipboard(filePath);
      if (container.dataset.id) {
        const currentTime = Date.now();
        await db.updateItemTime(parseInt(container.dataset.id), currentTime);
        await filterClipboardItems(searchInput.value);
      }
    } else {
      ElectronManager.writeToClipboard(listItem.textContent);
      if (container.dataset.id) {
        const currentTime = Date.now();
        await db.updateItemTime(parseInt(container.dataset.id), currentTime);
        await filterClipboardItems(searchInput.value);
      }
    }
  });

  clipboardList.insertBefore(container, emptyState);
  return container;
}

// 监听主进程发送的新剪贴板内容
ElectronManager.registerClipboardListener(async (text) => {
  console.log('[渲染进程] 接收到文本复制事件:', text);
  if (!text) {
    updateEmptyState();
    return;
  }

  await db.addItem(text);
  await filterClipboardItems(searchInput.value);
  updateSelection(0);
});

// 监听主进程发送的文件复制事件
ipcRenderer.on('clipboard-file', async (event, fileInfo) => {
  console.log('[渲染进程] 接收到文件复制事件');
  console.log('[渲染进程] 文件信息:', fileInfo);
  await db.addItem(fileInfo.name, fileInfo.type, fileInfo.path);
  console.log('[渲染进程] 文件信息已保存到数据库');
  await filterClipboardItems(searchInput.value);
  console.log('[渲染进程] 界面列表已更新');
  updateSelection(0);
});

/**
 * 创建剪贴板列表项
 * @param {string} text - 剪贴板内容
 * @param {boolean} isTopped - 是否置顶
 * @param {number|null} id - 数据库中的ID
 * @param {number} copyTime - 复制时间戳
 * @param {number|null} topTime - 置顶时间戳
 * @returns {HTMLElement} 创建的列表项元素
 */
function createClipboardItem(text, isTopped = false, id = null, copyTime = Date.now(), topTime = null, type = 'text', filePath = null) {
  console.log('[渲染进程] createClipboardItem被调用，参数:', { text, isTopped, id, type, filePath });
  // 创建容器元素
  const container = document.createElement('div');
  container.classList.add('clipboard-item');
  container.dataset.topped = isTopped.toString();
  container.dataset.copyTime = copyTime.toString();
  container.dataset.type = type;
  if (filePath) container.dataset.filePath = filePath;
  if (id) container.dataset.id = id.toString();
  if (topTime) container.dataset.topTime = topTime.toString();

  // 创建内容元素
  const listItem = document.createElement('div');
  listItem.classList.add('clipboard-content');
  
  // 根据类型显示不同的内容
  if (type === 'file' || type === 'image') {
    const fileName = require('path').basename(text);
    if (type === 'image') {
      listItem.innerHTML = `
        <div class="image-preview">
          <img src="${filePath}" class="clipboard-image" style="max-width: 100%; max-height: 200px; object-fit: contain;">
        </div>
      `;
      container.classList.add('image-item');
    } else {
      listItem.innerHTML = `<span class="file-icon">📄</span> ${fileName}<br><span class="file-path">${text}</span>`;
      container.classList.add('file-item');
    }
  } else {
    listItem.textContent = text;
  }
  
  container.appendChild(listItem);

  // 创建置顶按钮
  const topButton = document.createElement('div');
  topButton.classList.add('top-button');
  if (isTopped) topButton.classList.add('topped');
  topButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isCurrentlyTopped = container.dataset.topped === 'true';
    if (container.dataset.id) {
      await db.toggleTop(parseInt(container.dataset.id), !isCurrentlyTopped);
      await filterClipboardItems(searchInput.value);
    }
  });
  container.appendChild(topButton);

  // 创建删除按钮
  const deleteButton = document.createElement('div');
  deleteButton.classList.add('delete-button');
  deleteButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (container.dataset.id) {
      await db.deleteItem(parseInt(container.dataset.id));
    }
    clipboardList.removeChild(container);
    updateEmptyState();
  });
  container.appendChild(deleteButton);

  // 监听鼠标悬停事件，更新选中状态
  container.addEventListener('mouseenter', () => {
    const items = Array.from(clipboardList.children).filter(item => 
      item !== emptyState && 
      item.style.display !== 'none'
    );
    const containerIndex = items.indexOf(container);
    if (containerIndex !== -1) {
      updateSelection(containerIndex);
    }
  });

  // 监听双击事件，复制内容到剪贴板或打开文件
  container.addEventListener('dblclick', async () => {
    if (type === 'file') {
      require('electron').shell.openPath(filePath);
    } else if (type === 'image') {
      ElectronManager.writeImageToClipboard(filePath);
      if (container.dataset.id) {
        const currentTime = Date.now();
        await db.updateItemTime(parseInt(container.dataset.id), currentTime);
        await filterClipboardItems(searchInput.value);
      }
    } else {
      ElectronManager.writeToClipboard(listItem.textContent);
      if (container.dataset.id) {
        const currentTime = Date.now();
        await db.updateItemTime(parseInt(container.dataset.id), currentTime);
        await filterClipboardItems(searchInput.value);
      }
    }
  });

  clipboardList.insertBefore(container, emptyState);
  return container;
}

// 监听键盘事件，实现键盘导航和操作
document.addEventListener('keydown', (event) => {
  const items = Array.from(clipboardList.children).filter(item => 
    item !== emptyState && 
    item.style.display !== 'none'
  );
  if (items.length === 0) return;

  if (event.key === 'ArrowDown') {
    if (selectedIndex < items.length - 1) {
      selectedIndex++;
    }
  } else if (event.key === 'ArrowUp') {
    if (selectedIndex > 0) {
      selectedIndex--;
    }
  } else if (event.key === 'Enter' && selectedIndex !== -1) {
    const selectedItem = items[selectedIndex].querySelector('.clipboard-content');
    ElectronManager.writeToClipboard(selectedItem.textContent);
}

  updateSelection(selectedIndex);
});

/**
 * 更新列表项的选中状态
 * @param {number} index - 要选中的项的索引
 */
function updateSelection(index) {
  const items = Array.from(clipboardList.children).filter(item => 
    item !== emptyState && 
    item.style.display !== 'none'
  );
  
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === index);
  });
  selectedIndex = index;

  if (items[index]) {
    items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// 监听主进程发送的菜单事件
ipcRenderer.on('clear-clipboard', async () => {
  await db.clearAll();
  clearClipboardList();
  ElectronManager.clearClipboard();
  message.info('剪贴板内容已清空');
  selectedIndex = -1;
  updateEmptyState();
});

ipcRenderer.on('open-settings', () => {
  // TODO: 实现设置面板功能
  message.info('设置功能即将上线');
});

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

// 监听主题切换事件
ipcRenderer.on('change-theme', (event, theme) => {
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
});

// 监听主进程发送的toggle-search事件
ipcRenderer.on('toggle-search', () => {
  const searchContainer = document.querySelector('.clipboard-search');
  if (searchContainer.style.display === 'none' || !searchContainer.style.display) {
    searchContainer.style.display = 'block';
    searchInput.focus();
  } else {
    searchContainer.style.display = 'none';
  }
});

// 监听ESC键关闭搜索框
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const searchContainer = document.querySelector('.clipboard-search');
    searchContainer.style.display = 'none';
  }
});

// 初始化应用
initializeClipboard();
/**
 * 更新空状态的显示/隐藏
 */
function updateEmptyState() {
  const items = Array.from(clipboardList.children).filter(item => 
    item !== emptyState && 
    item.style.display !== 'none'
  );
  emptyState.style.display = items.length === 0 ? 'flex' : 'none';
}