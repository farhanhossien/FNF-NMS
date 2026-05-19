const assert = require('node:assert');
const test = require('node:test');

// Simple mock for RouterOSAPI
class MockRouterOSAPI {
    constructor(config) {
        MockRouterOSAPI.lastInstance = this;
        this.config = config;
        this.connected = false;
    }

    async connect() {
        if (this.config.host === 'fail-host') {
            throw new Error('Connection failed');
        }
        this.connected = true;
        return true;
    }

    async write(command, args) {
        if (!this.connected) {
            throw new Error('Not connected');
        }
        if (command === '/system/resource/print') {
            return [{
                'cpu-load': '12',
                'free-memory': '1000000',
                'total-memory': '2000000',
                'uptime': '1d2h3m',
                'cpu': 'tile',
                'cpu-count': '36',
                'version': '7.12',
                'board-name': 'CCR2004'
            }];
        }
        if (command === '/interface/monitor-traffic') {
            const iface = args[0].split('=')[2];
            return [{
                'rx-bits-per-second': '5000000',
                'tx-bits-per-second': '8000000',
                'rx-packets-per-second': '1200',
                'tx-packets-per-second': '1500'
            }];
        }
        throw new Error('Unknown command');
    }

    async close() {
        this.connected = false;
        return true;
    }
}

// Inject mock into require.cache
require.cache[require.resolve('node-routeros')] = {
    exports: { RouterOSAPI: MockRouterOSAPI }
};

const MikroTikService = require('../src/services/mikrotik');

test('MikroTikService - successful connection and data fetching', async () => {
    const config = {
        host: '192.168.88.1',
        port: 8728,
        user: 'admin',
        password: 'password',
        defaultInterface: 'ether1'
    };
    
    const service = new MikroTikService(config);
    await service.connect();
    
    assert.strictEqual(service.api instanceof MockRouterOSAPI, true);
    
    const resources = await service.getSystemResources();
    assert.strictEqual(resources.cpuLoad, 12);
    assert.strictEqual(resources.boardName, 'CCR2004');
    assert.strictEqual(resources.uptime, '1d2h3m');
    assert.strictEqual(resources.cpuCount, 36);
    
    const traffic = await service.getInterfaceTraffic('ether1');
    assert.strictEqual(traffic.rxBps, 5000000);
    assert.strictEqual(traffic.txBps, 8000000);
    assert.strictEqual(traffic.rxPacketsPerSecond, 1200);
    assert.strictEqual(traffic.txPacketsPerSecond, 1500);
    
    await service.disconnect();
    assert.strictEqual(service.api, null);
});

test('MikroTikService - connection failure', async () => {
    const config = {
        host: 'fail-host',
        port: 8728,
        user: 'admin',
        password: 'password'
    };
    
    const service = new MikroTikService(config);
    await assert.rejects(async () => {
        await service.connect();
    }, /Connection failed/);
});

test('MikroTikService - fetch before connection throws error', async () => {
    const config = {
        host: '192.168.88.1',
        port: 8728,
        user: 'admin',
        password: 'password'
    };
    const service = new MikroTikService(config);
    
    await assert.rejects(async () => {
        await service.getSystemResources();
    }, /Not connected/);
    
    await assert.rejects(async () => {
        await service.getInterfaceTraffic();
    }, /Not connected/);
});
