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
    }
};

module.exports = config;
