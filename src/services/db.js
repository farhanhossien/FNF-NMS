const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../database.sqlite');

let db;

function initDb() {
    if (db) return db;

    console.log(`[DB] Initializing database at ${dbPath}`);
    db = new Database(dbPath);

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            target TEXT,
            plan_mbps INTEGER
        );

        CREATE TABLE IF NOT EXISTS bandwidth_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            rx_bytes INTEGER,
            tx_bytes INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    return db;
}

function getDb() {
    if (!db) {
        return initDb();
    }
    return db;
}

module.exports = { initDb, getDb };
