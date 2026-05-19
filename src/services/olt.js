const snmp = require('net-snmp');

class OltService {
    constructor(config) {
        this.host = config.host;
        this.community = config.community;
        this.session = null;
        this.THRESHOLD_DBM = -27; // Warning threshold
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                // Create SNMP Session
                this.session = snmp.createSession(this.host, this.community, {
                    timeout: 2000, // 2 seconds timeout for fast fallback
                    retries: 1
                });
                
                // Verify session by querying SysDescr OID
                const sysDescrOid = "1.3.6.1.2.1.1.1.0";
                this.session.get([sysDescrOid], (error, varbinds) => {
                    if (error) {
                        console.warn(`[OLT SNMP] Cannot reach OLT at ${this.host}. Enabling fallback mode.`);
                    } else {
                        console.log(`[OLT SNMP] Connected successfully to OLT at ${this.host}`);
                    }
                    resolve(true); // Resolve true in either case so server starts
                });
            } catch (error) {
                console.error(`[OLT SNMP] Connection setup failed:`, error.message);
                resolve(true); // Fallback active
            }
        });
    }

    async getOnuOpticalMetrics() {
        return new Promise((resolve) => {
            if (!this.session) {
                return resolve(this.getFallbackMetrics());
            }

            const onus = {};
            // BDCOM EPON OIDs
            const ifDescrOid = "1.3.6.1.2.1.2.2.1.2";              // Walk interface descriptions (e.g. epon0/3:1)
            const rxPowerOid = "1.3.6.1.4.1.3320.101.10.5.1.5";    // ONU Rx optical power at OLT (0.1 dBm)
            const txPowerOid = "1.3.6.1.4.1.3320.101.10.5.1.6";    // ONU Tx optical power at OLT (0.1 dBm)

            let walkCount = 0;
            let hasError = false;

            const checkDone = () => {
                walkCount++;
                if (walkCount === 3) {
                    if (hasError || Object.keys(onus).length === 0) {
                        return resolve(this.getFallbackMetrics());
                    }

                    // Build final metrics matching actual epon interfaces
                    const metrics = Object.keys(onus).map(ifIndex => {
                        const o = onus[ifIndex];
                        const interfaceName = o.interfaceName ? o.interfaceName.trim() : '';

                        // Only include EPON ONT/ONU sub-interfaces (like epon0/3:1)
                        if (!interfaceName.toLowerCase().includes('epon') || !interfaceName.includes(':')) {
                            return null;
                        }

                        // Parse values (BDCOM returns 10 * dBm, e.g. -169 for -16.9 dBm)
                        let rxPower = o.rxPower !== undefined ? o.rxPower / 10 : -40;
                        let txPower = o.txPower !== undefined ? o.txPower / 10 : 0;
                        
                        const isOffline = rxPower <= -35 || rxPower >= 0;
                        const status = isOffline ? 'offline' : 'online';

                        if (isOffline) {
                            rxPower = -40;
                            txPower = 0;
                        }

                        return {
                            onuId: interfaceName, // Matches epon0/3:1, epon0/3:2
                            rxPower: parseFloat(rxPower.toFixed(2)),
                            txPower: parseFloat(txPower.toFixed(2)),
                            status: status,
                            distance: 'N/A'
                        };
                    }).filter(Boolean);

                    const warnings = metrics.filter(m => m.rxPower <= this.THRESHOLD_DBM || m.status === 'offline');
                    
                    resolve({
                        timestamp: new Date().toISOString(),
                        totalOnus: metrics.length,
                        metrics: metrics,
                        warnings: warnings,
                        hasWarnings: warnings.length > 0,
                        mode: 'SNMP Live'
                    });
                }
            };

            const walkHandler = (oid, key, parser = (val) => val) => {
                this.session.subtree(oid, (varbinds) => {
                    for (const vb of varbinds) {
                        const parts = vb.oid.split('.');
                        const ifIndex = parts[parts.length - 1];
                        if (!onus[ifIndex]) onus[ifIndex] = {};
                        onus[ifIndex][key] = parser(vb.value);
                    }
                }, (error) => {
                    if (error) {
                        hasError = true;
                    }
                    checkDone();
                });
            };

            // Start walks
            walkHandler(ifDescrOid, 'interfaceName', (val) => val.toString());
            walkHandler(rxPowerOid, 'rxPower', (val) => {
                const num = parseInt(val.toString(), 10);
                return num > 32767 ? num - 65536 : num;
            });
            walkHandler(txPowerOid, 'txPower', (val) => {
                const num = parseInt(val.toString(), 10);
                return num > 32767 ? num - 65536 : num;
            });
        });
    }

    getFallbackMetrics() {
        // Return the exact real epon0/3 ONU interface list and dBm signals shown in your OLT CLI screenshot!
        const cliData = [
            { id: 'epon0/3:1', rx: -16.9, tx: 2.6, status: 'online' },
            { id: 'epon0/3:2', rx: -18.2, tx: 2.1, status: 'online' },
            { id: 'epon0/3:3', rx: -21.8, tx: 2.3, status: 'online' },
            { id: 'epon0/3:4', rx: -20.2, tx: 2.4, status: 'online' },
            { id: 'epon0/3:5', rx: -15.4, tx: 2.2, status: 'online' },
            { id: 'epon0/3:6', rx: -22.2, tx: 2.4, status: 'online' },
            { id: 'epon0/3:7', rx: -21.2, tx: 2.6, status: 'online' },
            { id: 'epon0/3:8', rx: -18.3, tx: 2.4, status: 'online' },
            { id: 'epon0/3:9', rx: -7.9,  tx: 2.1, status: 'online' },
            { id: 'epon0/3:10', rx: -18.0, tx: 2.4, status: 'online' },
            { id: 'epon0/3:11', rx: -15.6, tx: 2.3, status: 'online' },
            { id: 'epon0/3:12', rx: -28.8, tx: 2.4, status: 'online' }, // Weak signal!
            { id: 'epon0/3:13', rx: -18.3, tx: 2.6, status: 'online' },
            { id: 'epon0/3:14', rx: -16.7, tx: 2.3, status: 'online' },
            { id: 'epon0/3:15', rx: -16.6, tx: 2.5, status: 'online' },
            { id: 'epon0/3:16', rx: -19.5, tx: 2.4, status: 'online' }
        ];

        const metrics = cliData.map(d => ({
            onuId: d.id,
            rxPower: d.rx,
            txPower: d.tx,
            status: d.status,
            distance: 'N/A'
        }));

        const warnings = metrics.filter(m => m.rxPower <= this.THRESHOLD_DBM || m.status === 'offline');
        return {
            timestamp: new Date().toISOString(),
            totalOnus: metrics.length,
            metrics: metrics,
            warnings: warnings,
            hasWarnings: warnings.length > 0,
            mode: 'Simulation Mode (Chokbazer_olt epon0/3)'
        };
    }

    async disconnect() {
        if (this.session) {
            try {
                this.session.close();
            } catch (e) {}
            this.session = null;
        }
        return true;
    }
}

module.exports = OltService;
