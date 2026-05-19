const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
    mikrotik: {
        host: process.env.MIKROTIK_HOST || '192.168.88.1',
        port: parseInt(process.env.MIKROTIK_PORT || '8728', 10),
        user: process.env.MIKROTIK_USER || 'admin',
        password: process.env.MIKROTIK_PASS || 'password',
        defaultInterface: process.env.MIKROTIK_INTERFACE || 'ether1'
    },
    olt: {
        host: process.env.OLT_HOST || '192.168.1.100',
        community: process.env.OLT_SNMP_COMMUNITY || 'public'
    },
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || ''
    },
    server: {
        port: parseInt(process.env.PORT || '3000', 10)
    }
};

module.exports = config;
