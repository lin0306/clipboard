class Message {
  constructor() {
    this.defaultDuration = 2000;
    this.defaultPosition = { top: '10px', left: '30%' };
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
}

const message = new Message();
window.message = message;
module.exports = message;