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
            const nameOid = "1.3.6.1.4.1.3320.101.10.1.1.2";       // ONU description/name
            const rxPowerOid = "1.3.6.1.4.1.3320.101.10.5.1.5";    // ONU Rx optical power
            const txPowerOid = "1.3.6.1.4.1.3320.101.10.5.1.6";    // ONU Tx optical power
            const statusOid = "1.3.6.1.4.1.3320.101.10.1.1.26";    // ONU registration status (1: active/registered)

            let walkCount = 0;
            let hasError = false;

            const checkDone = () => {
                walkCount++;
                if (walkCount === 4) {
                    if (hasError || Object.keys(onus).length === 0) {
                        return resolve(this.getFallbackMetrics());
                    }

                    // Build final metrics
                    const metrics = Object.keys(onus).map(ifIndex => {
                        const o = onus[ifIndex];
                        const status = o.status === 1 ? 'online' : 'offline';
                        
                        // Parse values (BDCOM returns 10 * dBm, e.g. -215 for -21.5 dBm)
                        let rxPower = o.rxPower !== undefined ? o.rxPower / 10 : -40;
                        let txPower = o.txPower !== undefined ? o.txPower / 10 : 0;

                        if (status === 'offline') {
                            rxPower = -40;
                            txPower = 0;
                        }

                        return {
                            onuId: o.name ? o.name.trim() : `BDCOM-ONU-${ifIndex}`,
                            rxPower: parseFloat(rxPower.toFixed(2)),
                            txPower: parseFloat(txPower.toFixed(2)),
                            status: status,
                            distance: 'N/A'
                        };
                    });

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

            // Start walks with custom type parsers
            walkHandler(nameOid, 'name', (val) => val.toString());
            walkHandler(rxPowerOid, 'rxPower', (val) => {
                const num = parseInt(val.toString(), 10);
                return num > 32767 ? num - 65536 : num;
            });
            walkHandler(txPowerOid, 'txPower', (val) => {
                const num = parseInt(val.toString(), 10);
                return num > 32767 ? num - 65536 : num;
            });
            walkHandler(statusOid, 'status', (val) => parseInt(val.toString(), 10));
        });
    }

    getFallbackMetrics() {
        // Return highly realistic BDCOM mock ONU diagnostics (20 ONUs) if OLT SNMP times out
        const metrics = [];
        const clientNames = [
            'Farhan', 'Sabbir', 'FNF_User3', 'Sumon', 'Rashed', 'Jamil', 'Anik', 'Tanvir',
            'Imran', 'Hasan', 'Nayeem', 'Roni', 'Shakil', 'Arif', 'Mizan', 'Ripon',
            'Sujon', 'Kamal', 'Babul', 'Test_Client'
        ];

        for (let i = 1; i <= 20; i++) {
            const name = clientNames[i - 1] || `User_${i}`;
            const isOffline = i === 4 || i === 15;
            const isWeak = i === 2 || i === 12;
            
            let rxPower = -20 - (i % 6); // Realistic dBm signal between -20 and -26
            if (isWeak) rxPower = -28.5;  // Weak signal warning
            if (isOffline) rxPower = -40.0; // Offline signal
            
            metrics.push({
                onuId: `BDCOM-PON1:${i} (${name})`,
                rxPower: parseFloat(rxPower.toFixed(2)),
                txPower: isOffline ? 0.0 : parseFloat((1.5 + (i % 3) * 0.3).toFixed(2)),
                status: isOffline ? 'offline' : 'online',
                distance: isOffline ? 'N/A' : `${(1.0 + (i * 0.15)).toFixed(2)} km`
            });
        }

        const warnings = metrics.filter(m => m.rxPower <= this.THRESHOLD_DBM || m.status === 'offline');
        return {
            timestamp: new Date().toISOString(),
            totalOnus: metrics.length,
            metrics: metrics,
            warnings: warnings,
            hasWarnings: warnings.length > 0,
            mode: 'Simulation Mode (BDCOM P3608B)'
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
