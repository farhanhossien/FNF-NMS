const socket = io();

const els = {
    status: document.getElementById('connection-status'),
    cpuLoad: document.getElementById('cpu-load'),
    memFree: document.getElementById('mem-free'),
    uptime: document.getElementById('uptime'),
    coreStatus: document.getElementById('core-status'),
    rxSpeed: document.getElementById('rx-speed'),
    txSpeed: document.getElementById('tx-speed'),
    totalOnus: document.getElementById('total-onus'),
    warningOnus: document.getElementById('warning-onus'),
    onuList: document.getElementById('onu-list')
};

socket.on('connect', () => {
    els.status.textContent = 'Connected Live';
    els.status.style.color = 'var(--success)';
    els.status.style.background = 'rgba(16, 185, 129, 0.1)';
});

socket.on('disconnect', () => {
    els.status.textContent = 'Disconnected';
    els.status.style.color = 'var(--danger)';
    els.status.style.background = 'rgba(239, 68, 68, 0.1)';
    els.coreStatus.textContent = 'Offline';
    els.coreStatus.className = 'value status-bad';
});

socket.on('mikrotik_data', (data) => {
    if (data.resources) {
        els.cpuLoad.textContent = `${data.resources.cpuLoad}%`;
        els.memFree.textContent = `${(data.resources.freeMemory / 1024 / 1024).toFixed(1)} MB`;
        els.uptime.textContent = data.resources.uptime;
        els.coreStatus.textContent = 'Online';
        els.coreStatus.className = 'value status-good';
    }
    
    if (data.traffic) {
        els.rxSpeed.textContent = `${(data.traffic.rxBps / 1024 / 1024).toFixed(2)} Mbps`;
        els.txSpeed.textContent = `${(data.traffic.txBps / 1024 / 1024).toFixed(2)} Mbps`;
    }
});

socket.on('olt_data', (data) => {
    els.totalOnus.textContent = data.totalOnus;
    els.warningOnus.textContent = data.warnings.length;
    
    if (data.warnings.length > 0) {
        els.warningOnus.classList.add('warning-text');
    } else {
        els.warningOnus.classList.remove('warning-text');
        els.warningOnus.classList.add('status-good');
    }

    renderOnus(data.metrics);
});

function renderOnus(metrics) {
    if (!metrics || metrics.length === 0) {
        els.onuList.innerHTML = '<div class="empty-state">No ONU data available.</div>';
        return;
    }

    els.onuList.innerHTML = metrics.map(onu => {
        const isBad = onu.rxPower <= -27 || onu.status === 'offline';
        return `
            <div class="onu-card ${isBad ? 'danger' : ''}">
                <div class="onu-header">
                    <span>${onu.onuId}</span>
                    <span class="onu-status ${onu.status}"></span>
                </div>
                <div class="onu-stats">
                    <span>RX: <span class="rx-val ${isBad ? 'bad' : ''}">${onu.rxPower} dBm</span></span>
                    <span>TX: ${onu.txPower} dBm</span>
                </div>
            </div>
        `;
    }).join('');
}
