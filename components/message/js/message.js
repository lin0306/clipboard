class Message {
  constructor() {
    this.defaultDuration = 2000;
    this.loadingOverlay = null;
  }

  show(text, type = 'success', duration = this.defaultDuration) {
    const messageLine = document.createElement('div');
    messageLine.classList.add('message-line');
    const message = document.createElement('div');
    message.className = `message-notification ${type}`;
    message.textContent = text;
    messageLine.appendChild(message);
    document.body.appendChild(messageLine);

    // 触发重排以应用动画
    message.offsetHeight;
    message.style.opacity = '1';
    message.style.transform = 'translateY(0)';

    setTimeout(() => {
      message.style.opacity = '0';
      message.style.transform = 'translateY(-100%)';
      setTimeout(() => message.remove(), 300);
    }, duration);
  }

  success(text, duration) {
    this.show(text, 'success', duration);
  }

  info(text, duration) {
    this.show(text, 'info', duration);
  }

  warning(text, duration) {
    this.show(text, 'warning', duration);
  }

  error(text, duration) {
    this.show(text, 'error', duration);
  }

  showLoading(text = '加载中...') {
    if (this.loadingOverlay) {
      this.hideLoading();
    }
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'loading-overlay';
    
    // 创建loader容器
    const loader = document.createElement('div');
    loader.className = 'loader';
    
    // 使用SVG图标替代粒子元素
    const loadingImg = document.createElement('img');
    // 根据当前主题获取对应的loading.svg
    const currentTheme = localStorage.getItem('theme') || 'light';
    loadingImg.src = `themes/${currentTheme}/loading.svg`;
    loadingImg.className = 'loading-svg';
    loader.appendChild(loadingImg);
    
    // 创建文本元素
    const textDiv = document.createElement('div');
    textDiv.className = 'loading-text';
    textDiv.textContent = text;
    
    // 组装DOM结构
    this.loadingOverlay.appendChild(loader);
    this.loadingOverlay.appendChild(textDiv);
    
    document.body.appendChild(this.loadingOverlay);
    
    // 触发重排以应用动画
    this.loadingOverlay.offsetHeight;
    this.loadingOverlay.classList.add('show');
  }

  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('show');
      setTimeout(() => {
        this.loadingOverlay.remove();
        this.loadingOverlay = null;
      }, 300);
    }
  }
}

const message = new Message();
window.message = message;
module.exports = message;