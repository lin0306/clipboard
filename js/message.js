class Message {
  constructor() {
    this.defaultDuration = 2000;
    this.defaultPosition = { top: '50px', left: '30%' };
    this.loadingOverlay = null;
  }

  show(text, type = 'success', duration = this.defaultDuration) {
    const message = document.createElement('div');
    message.className = `message-notification ${type}`;
    message.textContent = text;
    message.style.top = this.defaultPosition.top;
    message.style.left = this.defaultPosition.left;
    document.body.appendChild(message);

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
    
    // 创建9个粒子元素
    for (let i = 1; i <= 9; i++) {
      const particle = document.createElement('div');
      particle.className = `particle p${i}`;
      loader.appendChild(particle);
    }
    
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