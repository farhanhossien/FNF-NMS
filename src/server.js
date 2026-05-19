const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { getDb } = require('./services/db');

class DashboardServer {
    constructor(config) {
        this.port = config.port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: '*'
            }
        });

        this.setupRoutes();
        this.setupSocket();
    }

    setupRoutes() {
        // Serve static files from the public directory
        this.app.use(express.static(path.join(__dirname, '../public')));
        this.app.use(express.json());

        const db = getDb();

        this.app.get('/api/stats', (req, res) => {
            const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
            // mock total bandwidth allocated (assuming 20 Mbps per user)
            const totalBandwidth = (userCount * 20).toFixed(2);
            res.json({
                totalResellers: 1,
                totalClients: userCount,
                totalAllocated: totalBandwidth + ' Mbps'
            });
        });

        this.app.get('/api/users', (req, res) => {
            const users = db.prepare('SELECT * FROM users').all();
            res.json(users);
        });

        this.app.get('/api/usage/:userId', (req, res) => {
            const { userId } = req.params;
            const history = db.prepare(`
                SELECT 
                    date(timestamp) as log_date,
                    MAX(rx_bytes) - MIN(rx_bytes) as rx_bytes,
                    MAX(tx_bytes) - MIN(tx_bytes) as tx_bytes
                FROM bandwidth_logs
                WHERE user_id = ? AND timestamp >= date('now', '-7 days')
                GROUP BY date(timestamp)
                ORDER BY log_date ASC
            `).all(userId);
            res.json(history);
        });

        // Device Manager APIs
        this.app.get('/api/devices', (req, res) => {
            const devices = db.prepare('SELECT * FROM devices').all();
            res.json(devices);
        });

        this.app.post('/api/devices', (req, res) => {
            const { type, name, host, port, username, password, community } = req.body;
            if (!type || !name || !host) {
                return res.status(400).json({ error: 'Missing type, name or host' });
            }
            const stmt = db.prepare(`
                INSERT INTO devices (type, name, host, port, username, password, community)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const info = stmt.run(type, name, host, port || null, username || null, password || null, community || null);
            res.json({ id: info.lastInsertRowid, type, name, host });
        });

        this.app.post('/api/devices/:id/active', (req, res) => {
            const { id } = req.params;
            const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
            if (!device) {
                return res.status(404).json({ error: 'Device not found' });
            }
            
            // Set all of same type to active = 0
            db.prepare('UPDATE devices SET active = 0 WHERE type = ?').run(device.type);
            // Set current one to active = 1
            db.prepare('UPDATE devices SET active = 1 WHERE id = ?').run(id);
            
            res.json({ success: true, active: id });
        });

        this.app.delete('/api/devices/:id', (req, res) => {
            const { id } = req.params;
            db.prepare('DELETE FROM devices WHERE id = ?').run(id);
            res.json({ success: true });
        });
    }

    setupSocket() {
        this.io.on('connection', (socket) => {
            console.log(`[Dashboard] Client connected: ${socket.id}`);
            
            socket.on('disconnect', () => {
                console.log(`[Dashboard] Client disconnected: ${socket.id}`);
            });
        });
    }

    broadcast(event, data) {
        this.io.emit(event, data);
    }

    start() {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                console.log(`🚀 Dashboard server running on http://localhost:${this.port}`);
                resolve();
            });
        });
    }
}

module.exports = DashboardServer;
