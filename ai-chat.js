// AI Chat Integration for Bitrate
// Безопасная интеграция Groq AI через backend сервер

const AI_SERVER_URL = 'http://localhost:3000';

class BitrateAI {
  constructor() {
    this.isConnected = false;
    this.checkConnection();
  }

  async checkConnection() {
    try {
      const response = await fetch(`${AI_SERVER_URL}/api/health`);
      this.isConnected = response.ok;
      console.log('AI Server status:', this.isConnected ? 'Connected ✓' : 'Disconnected ✗');
    } catch (error) {
      this.isConnected = false;
      console.warn('AI Server not available. Running without AI features.');
    }
  }

  async chat(message) {
    if (!this.isConnected) {
      return 'AI сервер недоступен. Проверьте, запущен ли backend.';
    }

    try {
      const response = await fetch(`${AI_SERVER_URL}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'Нет ответа от AI';
    } catch (error) {
      console.error('AI Chat error:', error);
      return `Ошибка: ${error.message}`;
    }
  }
}

// Инициализация AI
const bitrateAI = new BitrateAI();

// Добавь в существующий код Bitrate:
// Когда пользователь пишет в чат, можно использовать:
// const aiResponse = await bitrateAI.chat(userMessage);
