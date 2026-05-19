const { RouterOSAPI } = require('node-routeros');

class MikroTikService {
    /**
     * @param {Object} config 
     * @param {string} config.host 
     * @param {number} config.port 
     * @param {string} config.user 
     * @param {string} config.password 
     * @param {string} config.defaultInterface 
     */
    constructor(config) {
        this.config = config;
        this.api = null;
    }

    /**
     * Establishes a connection to the MikroTik router.
     */
    async connect() {
        try {
            this.api = new RouterOSAPI({
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                timeout: 10000 // 10 seconds connection timeout
            });

            await this.api.connect();
            console.log(`Successfully connected to MikroTik router at ${this.config.host}:${this.config.port}`);
        } catch (error) {
            console.error(`Failed to connect to MikroTik router at ${this.config.host}:${this.config.port}:`, error.message || error);
            this.api = null;
            throw error;
        }
    }

    /**
     * Fetches system resource metrics (CPU, Memory, Uptime).
     * Uses `/system/resource/print`.
     */
    async getSystemResources() {
        if (!this.api) {
            throw new Error('Not connected to MikroTik router. Call connect() first.');
        }

        try {
            const rawData = await this.api.write('/system/resource/print');
            
            if (rawData && rawData.length > 0) {
                const resource = rawData[0];
                return {
                    cpuLoad: parseInt(resource['cpu-load'] || '0', 10),
                    freeMemory: parseInt(resource['free-memory'] || '0', 10),
                    totalMemory: parseInt(resource['total-memory'] || '0', 10),
                    uptime: resource['uptime'] || 'unknown',
                    cpu: resource['cpu'] || 'unknown',
                    cpuCount: parseInt(resource['cpu-count'] || '1', 10),
                    version: resource['version'] || 'unknown',
                    boardName: resource['board-name'] || 'unknown'
                };
            }
            throw new Error('No resource data returned from router.');
        } catch (error) {
            console.error('Error fetching system resources:', error.message || error);
            throw error;
        }
    }

    /**
     * Fetches traffic statistics for a given interface.
     * Uses `/interface/monitor-traffic` with `=once`.
     * @param {string} [interfaceName] 
     */
    async getInterfaceTraffic(interfaceName) {
        if (!this.api) {
            throw new Error('Not connected to MikroTik router. Call connect() first.');
        }

        const targetInterface = interfaceName || this.config.defaultInterface;

        try {
            const rawData = await this.api.write('/interface/monitor-traffic', [
                `=interface=${targetInterface}`,
                '=once'
            ]);

            if (rawData && rawData.length > 0) {
                const traffic = rawData[0];
                return {
                    interfaceName: targetInterface,
                    rxBps: parseInt(traffic['rx-bits-per-second'] || '0', 10),
                    txBps: parseInt(traffic['tx-bits-per-second'] || '0', 10),
                    rxPacketsPerSecond: parseInt(traffic['rx-packets-per-second'] || '0', 10),
                    txPacketsPerSecond: parseInt(traffic['tx-packets-per-second'] || '0', 10)
                };
            }
            throw new Error(`No traffic data returned for interface ${targetInterface}.`);
        } catch (error) {
            console.error(`Error fetching traffic data for interface ${targetInterface}:`, error.message || error);
            throw error;
        }
    }

    /**
     * Closes the connection to the MikroTik router cleanly.
     */
    async disconnect() {
        if (this.api) {
            try {
                await this.api.close();
                console.log('Connection to MikroTik router closed cleanly.');
            } catch (error) {
                console.error('Error closing connection:', error.message || error);
            } finally {
                this.api = null;
            }
        }
    }
}

module.exports = MikroTikService;
