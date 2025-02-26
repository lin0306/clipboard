// DOM元素引用
const clipboardList = document.getElementById('clipboard-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.querySelector('.clipboard-search-input');
const addTagButton = document.querySelector('.add-tag-button');
const tagDialog = document.querySelector('.tag-dialog-overlay');
const tagNameInput = tagDialog.querySelector('input[type="text"]');
const tagDescInput = tagDialog.querySelector('textarea');
const tagDialogCancel = tagDialog.querySelector('.tag-dialog-cancel');
const tagDialogConfirm = tagDialog.querySelector('.tag-dialog-confirm');
const tagDialogError = tagDialog.querySelector('.tag-dialog-error');
const tagsContainer = document.querySelector('.tags-container');
let selectedIndex = 0; // 当前选中项的索引
let openTagDialog = 0; // 是否打开新增标签对话框

// 标签相关功能
// 处理标签点击事件
const handleTagClick = async (tagElement) => {
  // 移除所有标签的active类
  const allTags = document.querySelectorAll('.tag-item, .custom-tag-item');
  // openTagDialog 更新有延迟，这里需要延迟处理
  setTimeout(() => {
    if(openTagDialog !== 1) {
      allTags.forEach(tag => tag.classList.remove('active'));
    }
  }, 10);

  // 添加active类到被点击的标签
  // 删除的到时候有延迟，重新复制的时候也需要延迟，不然会出现先加后删的情况
  setTimeout(() => {
    tagElement.classList.add('active');
  }, 11);

  // 获取标签名称
  const tagName = tagElement.textContent;
  const isAllTag = tagName === '全部';
  if(tagName === '+ 添加标签') {
    return;
  }

  try {
    // 根据标签筛选内容
    const items = isAllTag ? await db.getAllItems() : await db.getItemsByTag(tagName);
    clearClipboardList();
    items.forEach(item => createClipboardItem(item.content, item.is_topped === 1, item.id, item.copy_time, item.top_time, item.type, item.file_path));
    updateEmptyState();

    // 关闭标签列表
    const tagsToggle = document.querySelector('.tags-toggle');
    const tagsContainer = document.querySelector('.tags-container');
    tagsToggle.classList.remove('expanded');
    tagsContainer.classList.remove('expanded');
  } catch (error) {
    console.error('[标签筛选] 筛选内容失败:', error);
    message.error('筛选内容失败');
  }
};

// 为所有标签添加点击事件
function bindTagClickEvents() {
  const allTags = document.querySelectorAll('.tag-item, .custom-tag-item');
  allTags.forEach(tag => {
    tag.addEventListener('click', function() {
      handleTagClick(this);
    });
  });
}

// 初始绑定标签点击事件
bindTagClickEvents();
addTagButton.addEventListener('click', (e) => {
  e.stopPropagation();
  tagDialog.style.display = 'flex';
  tagNameInput.value = '';
  tagDescInput.value = '';
  tagDialogError.style.display = 'none';
  tagNameInput.focus();
  openTagDialog = 1;
});

tagDialogCancel.addEventListener('click', () => {
  tagDialog.style.display = 'none';
  setTimeout(() => {
    openTagDialog = 0;
  }, 100);
});

tagDialogConfirm.addEventListener('click', async () => {
  const tagName = tagNameInput.value.trim();
  const tagDesc = tagDescInput.value.trim();

  if (!tagName) {
    tagDialogError.style.display = 'block';
    return;
  }

  try {
    console.log('[标签创建] 开始创建新标签:', tagName);
    // 将标签保存到数据库
    await db.addTag(tagName);
    console.log('[标签创建] 标签已保存到数据库');

    // 获取新创建的标签ID
    const tags = await db.getAllTags();
    const newTag = tags.find(t => t.name === tagName);
    if (!newTag) {
        throw new Error('无法获取新创建的标签');
    }

    // 创建新标签元素
    const tagItem = document.createElement('div');
    tagItem.classList.add('custom-tag-item');
    tagItem.dataset.id = newTag.id;

    // 创建标签内容容器
    const tagContent = document.createElement('div');
    tagContent.classList.add('custom-tag-content');
    tagContent.textContent = tagName;
    tagContent.title = tagDesc; // 将描述设置为提示文本
    tagItem.appendChild(tagContent);

    // 创建删除按钮
    const deleteButton = document.createElement('div');
    deleteButton.classList.add('custom-tag-delete');
    deleteButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const tags = await db.getAllTags();
        const tag = tags.find(t => t.name === tagName);
        if (tag) {
          await db.deleteTag(tag.id);
          console.log('[标签删除] 标签已从数据库中删除:', tagName);
        }
        tagsContainer.removeChild(tagItem);
        console.log('[标签删除] 标签已从界面移除:', tagName);
      } catch (error) {
        console.error('[标签删除] 删除标签失败:', error);
        message.error('删除标签失败');
      }
    });

    // 将删除按钮添加到标签中
    tagItem.appendChild(deleteButton);

    // 添加拖拽相关事件处理
    tagItem.addEventListener('dragover', async (e) => {
      e.preventDefault();
      if (!draggedItem) return;

      const clipboardItem = draggedItem.closest('.clipboard-item');
      if (!clipboardItem) return;

      const itemId = clipboardItem ? parseInt(clipboardItem.dataset.id) : null;
      if (itemId) {
        try {
          const tagContent = tagItem.querySelector('.custom-tag-content');
          const tagName = tagContent ? tagContent.textContent : '';
          const currentTags = await db.getItemTags(itemId);
          const isTagBound = currentTags.some(t => t.name === tagName);

          if (isTagBound && !tagItem.classList.contains('tag-disable')) {
            e.dataTransfer.dropEffect = 'none';
            tagItem.classList.add('tag-disable');
            tagItem.classList.remove('over');
          } else if (!isTagBound && !tagItem.classList.contains('over')) {
            e.dataTransfer.dropEffect = 'copy';
            tagItem.classList.add('over');
            tagItem.classList.remove('tag-disable');
          }
        } catch (error) {
          console.error('[标签绑定] 检查标签绑定状态失败:', error);
        }
      }
    });

    tagItem.addEventListener('drop', async (e) => {
      e.preventDefault();
      tagItem.classList.remove('over');
      tagItem.classList.remove('tag-disable');

      const clipboardItem = draggedItem.closest('.clipboard-item');
      const itemId = clipboardItem ? parseInt(clipboardItem.dataset.id) : null;

      if (itemId) {
        try {
          const tagContent = tagItem.querySelector('.custom-tag-content');
          const tagName = tagContent ? tagContent.textContent : '';
          const currentTags = await db.getItemTags(itemId);
          const isTagBound = currentTags.some(t => t.name === tagName);

          if (isTagBound) {
            message.error(`该内容已添加到标签"${tagName}"`);
          } else {
            await db.bindItemToTag(itemId, tagName);
            // 更新标签显示
            const clipboardTagsContainer = clipboardItem.querySelector('.clipboard-tags');
            clipboardTagsContainer.innerHTML = '';
            const tags = await db.getItemTags(itemId);
            tags.forEach(tag => {
              const tagElement = document.createElement('div');
              tagElement.classList.add('clipboard-tag');
              tagElement.textContent = tag.name;
              clipboardTagsContainer.appendChild(tagElement);
            });
            message.success(`已将内容添加到标签"${tagName}"`);
          }
        } catch (error) {
          console.error('[标签绑定] 绑定标签失败:', error);
          message.error('绑定标签失败');
        }
      }

      // 清理拖拽状态
      document.body.removeAttribute('data-is-dragging');
      const tagsToggle = document.querySelector('.tags-toggle');
      const tagsContainer = document.querySelector('.tags-container');
      tagsToggle.classList.remove('expanded');
      tagsContainer.classList.remove('expanded');
    });

    // 获取"全部"标签元素（第一个标签项）
    const allTagItem = tagsContainer.querySelector('.tag-item');

    // 将新标签插入到"全部"标签之后
    if (allTagItem && allTagItem.nextSibling) {
      tagsContainer.insertBefore(tagItem, allTagItem.nextSibling);
    } else {
      tagsContainer.appendChild(tagItem);
    }
    tagItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // 重新绑定所有标签的点击事件
    bindTagClickEvents();
    tagDialog.style.display = 'none';
    tagNameInput.value = '';
    tagDescInput.value = '';
    tagDialogError.style.display = 'none';
    tagNameInput.focus();
    console.log('[标签创建] 新标签创建完成:', tagName);
  } catch (error) {
    console.error('[标签创建] 创建标签失败:', error);
    message.error('创建标签失败');
  }
  setTimeout(() => {
    openTagDialog = 0;
  }, 100);
});

/**
 * 初始化剪贴板列表
 * 从数据库加载所有历史记录并显示
 */
async function initializeClipboard() {
  try {
    console.log('[初始化] 开始初始化剪贴板应用');
    console.log('[初始化] 正在初始化数据库连接...');
    await db.init();
    console.log('[初始化] 数据库连接初始化完成');

    // 获取并渲染标签列表
    console.log('[标签加载] 开始从数据库获取标签列表');
    const tags = await db.getAllTags();
    console.log('[标签加载] 成功获取标签列表, 共', tags.length, '个标签');

    tags.forEach(tag => {
      console.log('[标签渲染] 正在创建标签元素:', tag.name);
      const tagItem = document.createElement('div');
      tagItem.classList.add('custom-tag-item');
      tagItem.dataset.id = tag.id;

      const tagContent = document.createElement('div');
      tagContent.classList.add('custom-tag-content');
      tagContent.textContent = tag.name;
      tagItem.appendChild(tagContent);

      const deleteButton = document.createElement('div');
      deleteButton.classList.add('custom-tag-delete');
      deleteButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await db.deleteTag(tag.id);
          console.log('[标签删除] 标签已从数据库中删除:', tag.name);
          tagsContainer.removeChild(tagItem);
          console.log('[标签删除] 标签已从界面移除:', tag.name);
        } catch (error) {
          console.error('[标签删除] 删除标签失败:', error);
          message.error('删除标签失败');
        }
      });

      tagItem.appendChild(deleteButton);

      // 获取"全部"标签元素
      const allTagItem = tagsContainer.querySelector('.tag-item');
      // 将新标签插入到"全部"标签之后
      if (allTagItem && allTagItem.nextSibling) {
        tagsContainer.insertBefore(tagItem, allTagItem.nextSibling);
      } else {
        tagsContainer.appendChild(tagItem);
      }
      console.log('[标签渲染] 标签元素创建完成:', tag.name);
    });

    // 重新绑定所有标签的点击事件
    bindTagClickEvents();

    console.log('[标签加载] 所有标签渲染完成');

    // 获取并显示剪贴板项目
    console.log('[剪贴板] 开始加载剪贴板项目');
    const items = await db.getAllItems();
    console.log('[剪贴板] 成功获取剪贴板项目, 共', items.length, '个项目');
    items.forEach(item => createClipboardItem(item.content, item.is_topped === 1, item.id, item.copy_time, item.top_time, item.type, item.file_path));
    updateEmptyState();
    console.log('[初始化] 剪贴板应用初始化完成');
  } catch (error) {
    console.error('[初始化] 初始化剪贴板失败:', error);
    message.error('初始化失败');
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

  // 根据类型显示不同的内容
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
    imagePreview.style.alignItems = 'center';
    imagePreview.style.height = '3em';
    imagePreview.style.overflow = 'hidden';
    imagePreview.appendChild(img);
    container.appendChild(imagePreview);
    container.classList.add('image-item');
  } else {
    // 创建内容元素
    const listItem = document.createElement('div');
    listItem.classList.add('clipboard-content');
    listItem.textContent = text;
    container.appendChild(listItem);
  }

  // 创建标签容器
  const clipboardTagsContainer = document.createElement('div');
  clipboardTagsContainer.classList.add('clipboard-tags');

  // 获取并显示标签
  if (id) {
    db.getItemTags(id).then(tags => {
      tags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.classList.add('clipboard-tag');
        tagElement.textContent = tag.name;
        clipboardTagsContainer.appendChild(tagElement);
      });
    }).catch(error => {
      console.error('[标签加载] 加载标签失败:', error);
    });
  }

  container.appendChild(clipboardTagsContainer);

  // 创建更多按钮
  const moreButton = document.createElement('div');
  moreButton.classList.add('more-button');

  // 创建下拉菜单
  const dropdownMenu = document.createElement('div');
  dropdownMenu.classList.add('dropdown-menu');

  // 创建删除选项
  const deleteOption = document.createElement('div');
  deleteOption.classList.add('dropdown-item');
  deleteOption.textContent = '删除';
  deleteOption.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (container.dataset.id) {
      await db.deleteItem(parseInt(container.dataset.id));
    }
    clipboardList.removeChild(container);
    updateEmptyState();
  });

  // 创建设置标签选项
  const tagOption = document.createElement('div');
  tagOption.classList.add('dropdown-item');
  tagOption.classList.add('set-tag-item');
  tagOption.textContent = '设置标签';

  // 添加按住展开标签列表的功能
  let pressTimer;
  tagOption.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => {
      const tagsToggle = document.querySelector('.tags-toggle');
      const tagsContainer = document.querySelector('.tags-container');
      tagsToggle.classList.add('expanded');
      tagsContainer.classList.add('expanded');
      // 标记当前正在拖拽
      document.body.setAttribute('data-is-dragging', 'true');

      // 重新获取并绑定所有自定义标签的拖拽事件
      const customTags = document.querySelectorAll('.custom-tag-item');
      customTags.forEach(tag => {
        // 移除已有的drop事件监听器
        const oldListener = tag._dropListener;
        if (oldListener) {
          tag.removeEventListener('drop', oldListener);
        }

        // 添加新的drop事件监听器
        const dropListener = async (e) => {
          e.preventDefault();
          const clipboardItem = tagOption.closest('.clipboard-item');
          const itemId = clipboardItem ? parseInt(clipboardItem.dataset.id) : null;

          if (itemId) {
            try {
              const tagContent = tag.querySelector('.custom-tag-content');
              const tagName = tagContent ? tagContent.textContent : '';
              const currentTags = await db.getItemTags(itemId);
              const isTagBound = currentTags.some(t => t.name === tagName);

              if (isTagBound) {
                message.error(`该内容已添加到标签"${tagName}"`);
              } else {
                await db.bindItemToTag(itemId, tagName);
                // 更新标签显示
                const clipboardTagsContainer = clipboardItem.querySelector('.clipboard-tags');
                clipboardTagsContainer.innerHTML = '';
                const tags = await db.getItemTags(itemId);
                tags.forEach(tag => {
                  const tagElement = document.createElement('div');
                  tagElement.classList.add('clipboard-tag');
                  tagElement.textContent = tag.name;
                  clipboardTagsContainer.appendChild(tagElement);
                });
                message.success(`已将内容添加到标签"${tagName}"`);
              }
            } catch (error) {
              console.error('[标签绑定] 绑定标签失败:', error);
              message.error('绑定标签失败');
            }
          }

          // 清理拖拽状态
          document.body.removeAttribute('data-is-dragging');
          const tagsToggle = document.querySelector('.tags-toggle');
          const tagsContainer = document.querySelector('.tags-container');
          tagsToggle.classList.remove('expanded');
          tagsContainer.classList.remove('expanded');
        };

        tag.addEventListener('drop', dropListener);
        tag._dropListener = dropListener; // 保存监听器引用以便后续移除
      });
    }, 200);
  });

  tagOption.addEventListener('mouseup', () => {
    clearTimeout(pressTimer);
  });

  tagOption.addEventListener('mouseleave', () => {
    clearTimeout(pressTimer);
  });

  // 设置标签按钮可拖动
  tagOption.draggable = true;
  let draggedItem = null;

  // 拖动开始
  tagOption.addEventListener('dragstart', (e) => {
    draggedItem = e.target;
    e.target.classList.add('dragging');
    const tagsToggle = document.querySelector('.tags-toggle');
    const tagsContainer = document.querySelector('.tags-container');
    tagsToggle.classList.add('expanded');
    tagsContainer.classList.add('expanded');
    const customTags = document.querySelectorAll('.custom-tag-item');
    // 移除所有自定义标签的drop事件监听器
    customTags.forEach(tag => {
      tag.classList.remove('over');
      tag.classList.remove('tag-disable');
    });
  });

  // 拖动结束
  tagOption.addEventListener('dragend', () => {
    draggedItem.classList.remove('dragging');
    draggedItem = null;
    tagsToggle.classList.remove('expanded');
    tagsContainer.classList.remove('expanded');
  });

  // 处理自定义标签的拖拽
  const customTags = document.querySelectorAll('.custom-tag-item');
  customTags.forEach(tag => {
    // 阻止全部和新增标签按钮的拖入
    if (tag.classList.contains('all-tags') || tag.classList.contains('add-tag-button')) {
      tag.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'none';
      });
      return;
    }

    // 处理拖动悬停
    tag.addEventListener('dragover', async (e) => {
      e.preventDefault();
      if (!draggedItem) return;

      const clipboardItem = draggedItem.closest('.clipboard-item');
      if (!clipboardItem) return;

      const itemId = clipboardItem ? parseInt(clipboardItem.dataset.id) : null;
      if (itemId) {
        try {
          const tagContent = tag.querySelector('.custom-tag-content');
          const tagName = tagContent ? tagContent.textContent : '';
          const currentTags = await db.getItemTags(itemId);
          const isTagBound = currentTags.some(t => t.name === tagName);

          if (isTagBound && !tag.classList.contains('tag-disable')) {
            e.dataTransfer.dropEffect = 'none';
            tag.classList.add('tag-disable');
            tag.classList.remove('over');
          } else if (!isTagBound && !tag.classList.contains('over')) {
            e.dataTransfer.dropEffect = 'copy';
            tag.classList.add('over');
            tag.classList.remove('tag-disable');
          }
        } catch (error) {
          console.error('[标签绑定] 检查标签绑定状态失败:', error);
        }
      }
    });

    // 处理放置
    tag.addEventListener('drop', async (e) => {
      e.preventDefault();
      tag.classList.remove('over');
      tag.classList.remove('tag-disable');

      const clipboardItem = draggedItem.closest('.clipboard-item');
      const itemId = clipboardItem ? parseInt(clipboardItem.dataset.id) : null;

      if (itemId) {
        try {
          const tagContent = tag.querySelector('.custom-tag-content');
          const tagName = tagContent ? tagContent.textContent : '';
          const currentTags = await db.getItemTags(itemId);
          const isTagBound = currentTags.some(t => t.name === tagName);

          if (isTagBound) {
            message.error(`该内容已添加到标签"${tagName}"`);
          } else {
            await db.bindItemToTag(itemId, tagName);
            // 更新标签显示
            const clipboardTagsContainer = clipboardItem.querySelector('.clipboard-tags');
            clipboardTagsContainer.innerHTML = '';
            const tags = await db.getItemTags(itemId);
            tags.forEach(tag => {
              const tagElement = document.createElement('div');
              tagElement.classList.add('clipboard-tag');
              tagElement.textContent = tag.name;
              clipboardTagsContainer.appendChild(tagElement);
            });
            message.success(`已将内容添加到标签"${tagName}"`);
          }
        } catch (error) {
          console.error('[标签绑定] 绑定标签失败:', error);
          message.error('绑定标签失败');
        }
      }

      // 清理拖拽状态
      const tagsToggle = document.querySelector('.tags-toggle');
      const tagsContainer = document.querySelector('.tags-container');
      tagsToggle.classList.remove('expanded');
      tagsContainer.classList.remove('expanded');
      const customTags = document.querySelectorAll('.custom-tag-item');
      // 移除所有自定义标签的drop事件监听器
      customTags.forEach(tag => {
        tag.classList.remove('over');
        tag.classList.remove('tag-disable');
      });
    });
  });

  // 阻止冒泡，避免触发其他点击事件
  tagOption.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 阻止冒泡，避免触发其他点击事件
  tagOption.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 将选项添加到下拉菜单
  dropdownMenu.appendChild(deleteOption);
  dropdownMenu.appendChild(tagOption);

  // 处理更多按钮点击事件
  moreButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const allDropdowns = document.querySelectorAll('.dropdown-menu');
    const isCurrentlyVisible = dropdownMenu.style.display === 'block';

    // 先隐藏所有下拉列表
    allDropdowns.forEach(menu => {
      menu.style.display = 'none';
    });

    // 如果当前下拉列表之前不是显示状态，则显示它
    if (!isCurrentlyVisible) {
      dropdownMenu.style.display = 'block';
    }
  });

  // 点击其他地方关闭下拉菜单
  document.addEventListener('click', () => {
    dropdownMenu.style.display = 'none';
  });

  container.appendChild(moreButton);
  container.appendChild(dropdownMenu);

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
    if (type === 'image') {
      ElectronManager.writeImageToClipboard(filePath);
      if (container.dataset.id) {
        const currentTime = Date.now();
        await db.updateItemTime(parseInt(container.dataset.id), currentTime);
        // 重新获取并显示标签
        const clipboardTagsContainer = container.querySelector('.clipboard-tags');
        clipboardTagsContainer.innerHTML = '';
        const tags = await db.getItemTags(parseInt(container.dataset.id));
        tags.forEach(tag => {
          const tagElement = document.createElement('div');
          tagElement.classList.add('clipboard-tag');
          tagElement.textContent = tag.name;
          clipboardTagsContainer.appendChild(tagElement);
        });
        await filterClipboardItems(searchInput.value);
      }
    } else {
      const contentElement = container.querySelector('.clipboard-content');
      ElectronManager.writeToClipboard(contentElement.textContent);
      if (container.dataset.id) {
        const currentTime = Date.now();
        await db.updateItemTime(parseInt(container.dataset.id), currentTime);
        // 重新获取并显示标签
        const clipboardTagsContainer = container.querySelector('.clipboard-tags');
        clipboardTagsContainer.innerHTML = '';
        const tags = await db.getItemTags(parseInt(container.dataset.id));
        tags.forEach(tag => {
          const tagElement = document.createElement('div');
          tagElement.classList.add('clipboard-tag');
          tagElement.textContent = tag.name;
          clipboardTagsContainer.appendChild(tagElement);
        });
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

// 标签列表展开/收起功能
const tagsToggle = document.querySelector('.tags-toggle');

tagsToggle.addEventListener('click', () => {
  tagsToggle.classList.toggle('expanded');
  tagsContainer.classList.toggle('expanded');
  const customTags = document.querySelectorAll('.custom-tag-item');
  // 移除所有自定义标签的drop事件监听器
  customTags.forEach(tag => {
    tag.classList.remove('over');
    tag.classList.remove('tag-disable');
  });
});

// 点击其他区域时收起标签列表
document.addEventListener('click', (e) => {
  // 打开了新增标签弹窗，不收起标签列表
  if (openTagDialog === 1) {
    return;
  }
  if (!tagsToggle.contains(e.target) && !tagsContainer.contains(e.target)) {
    tagsToggle.classList.remove('expanded');
    tagsContainer.classList.remove('expanded');
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
// 添加关闭按钮点击事件监听
const closeButton = document.querySelector('.close-button');
closeButton.addEventListener('click', () => {
  closeWindow();
});