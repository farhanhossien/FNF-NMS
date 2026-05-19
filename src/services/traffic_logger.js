const { getDb } = require('./db');

class TrafficLogger {
    constructor(mikrotikService) {
        this.mikrotik = mikrotikService;
        this.db = getDb();
    }

    async logTraffic() {
        console.log(`[TrafficLogger] Fetching simple queues for bandwidth tracking...`);
        try {
            const queues = await this.mikrotik.getSimpleQueues();
            
            const insertUser = this.db.prepare(`
                INSERT INTO users (id, name, target, plan_mbps) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                name=excluded.name, target=excluded.target
            `);

            const insertLog = this.db.prepare(`
                INSERT INTO bandwidth_logs (user_id, rx_bytes, tx_bytes) 
                VALUES (?, ?, ?)
            `);

            this.db.transaction(() => {
                for (const q of queues) {
                    if (q.disabled || q.name.includes('default')) continue;

                    // Upsert User
                    insertUser.run(q.id, q.name, q.target, 0); // plan_mbps can be derived later
                    
                    // Insert Log
                    insertLog.run(q.id, q.rxBytes, q.txBytes);
                }
            })();

            console.log(`[TrafficLogger] Logged bandwidth for ${queues.length} users.`);
        } catch (error) {
            console.error('[TrafficLogger] Failed to log traffic:', error.message);
        }
    }

    /**
     * Returns usage summary for the last X days per user
     */
    getUsageHistory(days = 7) {
        const query = this.db.prepare(`
            SELECT 
                user_id,
                date(timestamp) as log_date,
                MAX(rx_bytes) - MIN(rx_bytes) as daily_rx_bytes,
                MAX(tx_bytes) - MIN(tx_bytes) as daily_tx_bytes
            FROM bandwidth_logs
            WHERE timestamp >= date('now', '-' || ? || ' days')
            GROUP BY user_id, date(timestamp)
            ORDER BY log_date ASC
        `);
        return query.all(days);
    }
}

module.exports = TrafficLogger;
