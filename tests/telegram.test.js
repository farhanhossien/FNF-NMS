const test = require('node:test');
const assert = require('node:assert');
const TelegramService = require('../src/services/telegram');

test('TelegramService initializes correctly when enabled', () => {
    const config = { token: 'mock-token', chatId: '12345' };
    const service = new TelegramService(config);
    
    assert.strictEqual(service.token, 'mock-token');
    assert.strictEqual(service.chatId, '12345');
    assert.strictEqual(service.enabled, true);
});

test('TelegramService is disabled when config is missing', () => {
    const config = { token: '', chatId: '' };
    const service = new TelegramService(config);
    
    assert.strictEqual(service.enabled, false);
});

test('TelegramService returns false on sendAlert when disabled', async () => {
    const config = { token: '', chatId: '' };
    const service = new TelegramService(config);
    
    const result = await service.sendAlert('Test message');
    assert.strictEqual(result, false);
});
