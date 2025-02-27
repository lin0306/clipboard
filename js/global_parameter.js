// DOM元素引用
const clipboardList = document.getElementById('clipboard-list');
const emptyState = document.getElementById('empty-state');
const addTagButton = document.querySelector('.add-tag-button');
const tagDialog = document.querySelector('.tag-dialog-overlay');
const tagNameInput = tagDialog.querySelector('input[type="text"]');
const tagDescInput = tagDialog.querySelector('textarea');
const tagDialogCancel = tagDialog.querySelector('.tag-dialog-cancel');
const tagDialogConfirm = tagDialog.querySelector('.tag-dialog-confirm');
const tagDialogError = tagDialog.querySelector('.tag-dialog-error');
const tagsContainer = document.querySelector('.tags-container');