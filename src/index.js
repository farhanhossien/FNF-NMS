const env = require('./config/env');
const MikroTikService = require('./services/mikrotik');
const OltService = require('./services/olt');
const TelegramService = require('./services/telegram');
const DashboardServer = require('./server');
const TrafficLogger = require('./services/traffic_logger');
const cron = require('node-cron');

const { getDb } = require('./services/db');
const db = getDb();

const mikrotikService = new MikroTikService(env.mikrotik);
const oltService = new OltService(env.olt);
const telegram = new TelegramService(env.telegram);
const dashboard = new DashboardServer(env.server);
const trafficLogger = new TrafficLogger(mikrotikService);

const POLLING_INTERVAL = 5000; // 5 seconds
const state = {
    mikrotikDown: false,
    oltDown: false,
    downOnus: new Set()
};

async function getActiveConfig(type) {
    try {
        const active = db.prepare('SELECT * FROM devices WHERE type = ? AND active = 1').get(type);
        if (active) {
            if (type === 'mikrotik') {
                return {
                    host: active.host,
                    port: active.port || 8728,
                    user: active.username,
                    password: active.password,
                    defaultInterface: env.mikrotik.defaultInterface || 'ether1'
                };
            } else if (type === 'olt') {
                return {
                    host: active.host,
                    community: active.community || 'public'
                };
            }
        }
    } catch (e) {
        // Table might not exist yet
    }
    return null;
}

async function checkMikroTik() {
    try {
        const activeConfig = await getActiveConfig('mikrotik') || env.mikrotik;
        
        if (JSON.stringify(mikrotikService.config) !== JSON.stringify(activeConfig)) {
            console.log(`[MikroTik] Switching active config to ${activeConfig.host}`);
            await mikrotikService.disconnect();
            mikrotikService.config = activeConfig;
            mikrotikService.session = null;
        }

        if (!mikrotikService.session) {
            await mikrotikService.connect();
            mikrotikService.session = true;
        }
        
        const resources = await mikrotikService.getSystemResources();
        const traffic = await mikrotikService.getInterfaceTraffic();
        
        if (state.mikrotikDown) {
            state.mikrotikDown = false;
            await telegram.sendRecovery(`Core Router (${mikrotikService.config.host}) is back online.`);
        }
        
        dashboard.broadcast('mikrotik_data', { resources, traffic });
        
    } catch (error) {
        console.error('MikroTik Error:', error.message);
        mikrotikService.session = null; // force reconnect next time
        
        if (!state.mikrotikDown) {
            state.mikrotikDown = true;
            await telegram.sendAlert(`Core Router (${mikrotikService.config.host}) is OFFLINE or unreachable!`);
        }
    }
}

async function checkOlt() {
    try {
        const activeConfig = await getActiveConfig('olt') || env.olt;

        if (oltService.host !== activeConfig.host || oltService.community !== activeConfig.community) {
            console.log(`[OLT] Switching active config to ${activeConfig.host}`);
            await oltService.disconnect();
            oltService.host = activeConfig.host;
            oltService.community = activeConfig.community;
            oltService.session = null;
        }

        if (!oltService.session) {
            await oltService.connect();
        }
        
        const opticalData = await oltService.getOnuOpticalMetrics();
        
        if (state.oltDown) {
            state.oltDown = false;
            await telegram.sendRecovery(`OLT (${env.olt.host}) is back online.`);
        }
        
        dashboard.broadcast('olt_data', opticalData);
        
        // Check for ONU warnings
        const currentDownOnus = new Set(opticalData.warnings.map(w => w.onuId));
        
        for (const w of opticalData.warnings) {
            if (!state.downOnus.has(w.onuId)) {
                // New warning
                const reason = w.status === 'offline' ? 'is OFFLINE' : `has weak signal (${w.rxPower} dBm)`;
                await telegram.sendAlert(`ONU ${w.onuId} ${reason}.`);
                state.downOnus.add(w.onuId);
            }
        }
        
        // Check for recovered ONUs
        for (const onuId of state.downOnus) {
            if (!currentDownOnus.has(onuId)) {
                // It was down, now it's okay
                await telegram.sendRecovery(`ONU ${onuId} signal recovered and is within normal range.`);
                state.downOnus.delete(onuId);
            }
        }
        
    } catch (error) {
        console.error('OLT Error:', error.message);
        oltService.session = null; // force reconnect next time
        
        if (!state.oltDown) {
            state.oltDown = true;
            await telegram.sendAlert(`OLT (${env.olt.host}) is OFFLINE or unreachable!`);
        }
    }
}

async function pollingLoop() {
    console.log(`\n[${new Date().toISOString()}] Polling devices...`);
    await checkMikroTik();
    await checkOlt();
    
    setTimeout(pollingLoop, POLLING_INTERVAL);
}

async function main() {
    console.log('=========================================');
    console.log('      FNF Network Monitor (FNF NMS)     ');
    console.log('         Phase 3 Real-time Monitor       ');
    console.log('=========================================');

    await dashboard.start();
    
    if (env.telegram.token && env.telegram.chatId) {
        await telegram.sendAlert('🚀 FNF NMS has started monitoring.');
    } else {
        console.log('Telegram is not configured. Alerts will only be logged locally.');
    }
    
    // Schedule Traffic Logger to run every minute (for testing/demo) 
    // In production, this would be '0 * * * *' (every hour)
    cron.schedule('* * * * *', async () => {
        if (mikrotikService.session) {
            await trafficLogger.logTraffic();
        }
    });

    pollingLoop();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down FNF NMS...');
    if (env.telegram.token && env.telegram.chatId) {
        await telegram.sendAlert('🛑 FNF NMS is shutting down.');
    }
    await mikrotikService.disconnect();
    await oltService.disconnect();
    process.exit(0);
});

// Run the application
main();
