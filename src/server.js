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
