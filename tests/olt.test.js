const test = require('node:test');
const assert = require('node:assert');
const OltService = require('../src/services/olt');

test('OltService initializes correctly', () => {
    const config = { host: '192.168.1.100', community: 'public' };
    const service = new OltService(config);
    
    assert.strictEqual(service.host, '192.168.1.100');
    assert.strictEqual(service.community, 'public');
    assert.strictEqual(service.THRESHOLD_DBM, -27);
});

test('OltService handles metrics and thresholds correctly', async () => {
    const config = { host: '127.0.0.1', community: 'public' };
    const service = new OltService(config);
    
    // We mock the connect since we don't have a real SNMP agent
    service.session = { 
        close: () => {} 
    };
    
    const data = await service.getOnuOpticalMetrics();
    
    assert.ok(data.metrics.length > 0, 'Should return ONU metrics');
    assert.ok(data.warnings.length > 0, 'Should detect warnings');
    assert.strictEqual(data.hasWarnings, true);
    
    const weakOnu = data.warnings.find(w => w.onuId === 'ONU-002');
    assert.ok(weakOnu, 'Should flag ONU-002 as warning');
    assert.ok(weakOnu.rxPower <= -27, 'ONU-002 power should be below threshold');
});
