const env = require('./config/env');
const MikroTikService = require('./services/mikrotik');

async function main() {
    console.log('=========================================');
    console.log('      FNF Network Monitor (FNF NMS)     ');
    console.log('         Phase 1 Core Test Run           ');
    console.log('=========================================');

    const service = new MikroTikService(env.mikrotik);

    try {
        console.log(`Connecting to core router at ${env.mikrotik.host}:${env.mikrotik.port}...`);
        await service.connect();

        console.log('\n--- Fetching Health Metrics ---');
        const resources = await service.getSystemResources();
        console.log('System Resources:');
        console.log(`  - Board Name:   ${resources.boardName}`);
        console.log(`  - CPU Model:    ${resources.cpu}`);
        console.log(`  - CPU Cores:    ${resources.cpuCount}`);
        console.log(`  - CPU Load:     ${resources.cpuLoad}%`);
        console.log(`  - Free Memory:  ${(resources.freeMemory / 1024 / 1024).toFixed(2)} MB / ${(resources.totalMemory / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  - Uptime:       ${resources.uptime}`);
        console.log(`  - ROS Version:  ${resources.version}`);

        console.log('\n--- Fetching Bandwidth/Traffic Metrics ---');
        const traffic = await service.getInterfaceTraffic();
        console.log(`Interface Traffic (${traffic.interfaceName}):`);
        console.log(`  - RX Speed:     ${(traffic.rxBps / 1024 / 1024).toFixed(2)} Mbps (${traffic.rxPacketsPerSecond} pps)`);
        console.log(`  - TX Speed:     ${(traffic.txBps / 1024 / 1024).toFixed(2)} Mbps (${traffic.txPacketsPerSecond} pps)`);

        console.log('\n=========================================');
        console.log('   Verification successful: Data fetched.');
        console.log('=========================================');
    } catch (error) {
        console.error('\n❌ Execution failed during monitoring sequence:');
        console.error(error.message || error);
    } finally {
        console.log('\nDisconnecting...');
        await service.disconnect();
    }
}

// Run the application
main();
