const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

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
