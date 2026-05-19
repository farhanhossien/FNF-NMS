const TelegramBot = require('node-telegram-bot-api');

class TelegramService {
    constructor(config) {
        this.token = config.token;
        this.chatId = config.chatId;
        this.bot = null;
        this.enabled = Boolean(this.token && this.chatId);
        
        if (this.enabled) {
            // Use polling only if needed, usually we just send messages
            this.bot = new TelegramBot(this.token, { polling: false });
        } else {
            console.warn('⚠️ Telegram Service is disabled. Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables.');
        }
    }

    async sendAlert(message) {
        if (!this.enabled) {
            console.log(`[Telegram Mock - Alert]: ${message}`);
            return false;
        }

        try {
            const formattedMessage = `🚨 *FNF NMS ALERT* 🚨\n\n${message}`;
            await this.bot.sendMessage(this.chatId, formattedMessage, { parse_mode: 'Markdown' });
            return true;
        } catch (error) {
            console.error('❌ Failed to send Telegram alert:', error.message);
            return false;
        }
    }

    async sendRecovery(message) {
        if (!this.enabled) {
            console.log(`[Telegram Mock - Recovery]: ${message}`);
            return false;
        }

        try {
            const formattedMessage = `✅ *FNF NMS RECOVERY* ✅\n\n${message}`;
            await this.bot.sendMessage(this.chatId, formattedMessage, { parse_mode: 'Markdown' });
            return true;
        } catch (error) {
            console.error('❌ Failed to send Telegram recovery:', error.message);
            return false;
        }
    }
}

module.exports = TelegramService;
