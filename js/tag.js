const addTagButton = document.querySelector('.add-tag-button');
const tagDialog = document.querySelector('.tag-dialog-overlay');
const tagNameInput = tagDialog.querySelector('input[type="text"]');
const tagDescInput = tagDialog.querySelector('textarea');
const tagDialogCancel = tagDialog.querySelector('.tag-dialog-cancel');
const tagDialogConfirm = tagDialog.querySelector('.tag-dialog-confirm');
const tagDialogError = tagDialog.querySelector('.tag-dialog-error');
let openTagDialog = 0; // 是否打开新增标签对话框
// 处理标签点击事件
const handleTagClick = async (tagElement) => {
    // 移除所有标签的active类
    const allTags = document.querySelectorAll('.tag-item, .custom-tag-item');
    // openTagDialog 更新有延迟，这里需要延迟处理
    setTimeout(() => {
        if (openTagDialog !== 1) {
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
    if (tagName === '+ 添加标签') {
        return;
    }

    try {
        // 获取搜索框的值
        const searchText = document.querySelector('.clipboard-search-input').value;
        // 根据搜索文本和标签过滤项目
        const items = await db.searchItems(searchText, isAllTag ? null : tagName);
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
        tag.addEventListener('click', function () {
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