const socket = io();

const els = {
    uptime: document.getElementById('uptime-val'),
    clients: document.getElementById('stat-clients'),
    allocated: document.getElementById('stat-allocated'),
    usage: document.getElementById('stat-usage'),
    tblClients: document.getElementById('tbl-clients'),
    tblAlloc: document.getElementById('tbl-alloc'),
    clientList: document.getElementById('client-list-body'),
    navItems: document.querySelectorAll('.nav-item[data-target]'),
    views: document.querySelectorAll('.view-section'),
    crCpu: document.getElementById('cr-cpu'),
    crMem: document.getElementById('cr-mem'),
    oltList: document.getElementById('olt-list-body'),
    breadcrumbsTitle: document.querySelector('.breadcrumbs h2'),
    breadcrumbsPath: document.querySelector('.breadcrumbs p'),
    formMikrotik: document.getElementById('form-add-mikrotik'),
    formOlt: document.getElementById('form-add-olt'),
    mtDeviceList: document.getElementById('mt-device-list'),
    oltDeviceList: document.getElementById('olt-device-list')
};

let usageChart;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('usageChart').getContext('2d');
    
    // Gradient for Upload (Purple)
    const gradientPurple = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPurple.addColorStop(0, 'rgba(157, 78, 221, 0.25)');
    gradientPurple.addColorStop(1, 'rgba(157, 78, 221, 0.0)');

    // Gradient for Download (Cyan)
    const gradientCyan = ctx.createLinearGradient(0, 0, 0, 400);
    gradientCyan.addColorStop(0, 'rgba(0, 212, 255, 0.25)');
    gradientCyan.addColorStop(1, 'rgba(0, 212, 255, 0.0)');

    usageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [
                {
                    label: 'Download',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#00d4ff',
                    backgroundColor: gradientCyan,
                    borderWidth: 2,
                    pointBackgroundColor: '#00d4ff',
                    pointBorderColor: 'rgba(255,255,255,0.8)',
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Upload',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#9d4edd',
                    backgroundColor: gradientPurple,
                    borderWidth: 2,
                    pointBackgroundColor: '#9d4edd',
                    pointBorderColor: 'rgba(255,255,255,0.8)',
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 212, 255, 0.05)' },
                    ticks: { 
                        color: '#64748b',
                        font: {
                            family: 'JetBrains Mono',
                            size: 10
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: '#64748b',
                        font: {
                            family: 'Rajdhani',
                            size: 12,
                            weight: '600'
                        }
                    }
                }
            },
            plugins: {
                legend: { 
                    labels: { 
                        color: '#f1f5f9',
                        font: {
                            family: 'Rajdhani',
                            size: 13,
                            weight: '600'
                        }
                    } 
                }
            }
        }
    });
}

// Fetch Initial Stats
async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        
        els.clients.textContent = data.totalClients;
        els.allocated.textContent = data.totalAllocated;
        
        els.tblClients.textContent = data.totalClients;
        els.tblAlloc.textContent = data.totalAllocated;
    } catch (e) {
        console.error('Failed to fetch stats:', e);
    }
}

// Fetch Users and Render Table
let globalUsers = [];
let globalOltData = {};

async function renderClientTable(searchTerm = '') {
    try {
        const res = await fetch('/api/users');
        globalUsers = await res.json();
        
        const filtered = globalUsers.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.target.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filtered.length === 0) {
            els.clientList.innerHTML = '<tr><td colspan="6" style="text-align: center;">No clients found</td></tr>';
            return;
        }

        els.clientList.innerHTML = filtered.map((u, i) => {
            // Fake the plan for UI purposes
            const plan = '20 Mbps'; 
            
            // Find OLT data if exists
            const onuId = u.target.split('/')[0]; // Simple guess to match IP to ONU ID
            const onu = globalOltData[onuId];
            
            let onuSignal = '-- / --';
            let onuStatus = '<span class="badge badge-danger">Offline</span>';
            
            if (onu) {
                onuSignal = `${onu.rxPower} / ${onu.txPower} dBm`;
                if (onu.rxPower <= -27) {
                    onuStatus = '<span class="badge badge-warning">Weak</span>';
                } else if (onu.status === 'online') {
                    onuStatus = '<span class="badge badge-success">Online</span>';
                }
            } else {
                onuStatus = '<span class="badge badge-success">Online</span>'; // Assume online if no OLT matching setup yet
            }

            return `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${u.name}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${u.target}</span></td>
                    <td>${plan}</td>
                    <td id="live-usage-${u.id}">0 Mbps / 0 Mbps</td>
                    <td>${onuStatus}</td>
                    <td>${onuSignal}</td>
                </tr>
            `;
        }).join('');
        
        // Fetch chart for first user as demo
        if (filtered.length > 0) {
            fetchUserHistory(filtered[0].id);
        }
        
    } catch (e) {
        console.error('Failed to render clients:', e);
    }
}

// Fetch Historical Data for Chart
async function fetchUserHistory(userId) {
    try {
        const res = await fetch(`/api/usage/${userId}`);
        const data = await res.json();
        
        // Update Chart
        if (data.length > 0) {
            const labels = data.map(d => d.log_date);
            const rxData = data.map(d => (d.rx_bytes / 1024 / 1024 / 1024).toFixed(2)); // GB
            const txData = data.map(d => (d.tx_bytes / 1024 / 1024 / 1024).toFixed(2)); // GB
            
            usageChart.data.labels = labels;
            usageChart.data.datasets[0].data = rxData;
            usageChart.data.datasets[1].data = txData;
            usageChart.update();
        }
    } catch (e) {
        console.error('Failed to fetch history:', e);
    }
}

// Socket Live Updates
socket.on('mikrotik_data', (data) => {
    if (data.resources) {
        els.uptime.textContent = data.resources.uptime;
        if(els.crCpu) els.crCpu.textContent = data.resources.cpuLoad + '%';
        if(els.crMem) els.crMem.textContent = (data.resources.freeMemory / 1024 / 1024).toFixed(1) + ' MB';
    }
    if (data.traffic) {
        const rx = (data.traffic.rxBps / 1024 / 1024).toFixed(2);
        const tx = (data.traffic.txBps / 1024 / 1024).toFixed(2);
        els.usage.textContent = `${(parseFloat(rx) + parseFloat(tx)).toFixed(2)} Gbps`; // Mocking Gbps for UI scale
    }
});

socket.on('olt_data', (data) => {
    // Cache OLT data for rendering table
    if (data.metrics) {
        globalOltData = {};
        
        // Render the OLT specific tab
        if(els.oltList) {
            els.oltList.innerHTML = data.metrics.map(m => {
                let badge = m.status === 'online' ? '<span class="badge badge-success">Online</span>' : '<span class="badge badge-danger">Offline</span>';
                if(m.rxPower <= -27) badge = '<span class="badge badge-warning">Weak</span>';
                
                return `<tr>
                    <td>${m.onuId}</td>
                    <td>${badge}</td>
                    <td>${m.distance}</td>
                    <td>${m.rxPower} dBm</td>
                    <td>${m.txPower} dBm</td>
                </tr>`;
            }).join('');
        }

        data.metrics.forEach(m => {
            globalOltData[m.onuId] = m;
        });
        
        // Re-render table if users are already loaded
        if (globalUsers.length > 0) {
            renderClientTable();
        }
    }
});

// Fetch and render devices
async function fetchDevices() {
    try {
        const res = await fetch('/api/devices');
        const devices = await res.json();

        const mikrotiks = devices.filter(d => d.type === 'mikrotik');
        const olts = devices.filter(d => d.type === 'olt');

        // Render MikroTiks
        if (mikrotiks.length === 0) {
            if(els.mtDeviceList) els.mtDeviceList.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No configured routers</td></tr>';
        } else {
            if(els.mtDeviceList) els.mtDeviceList.innerHTML = mikrotiks.map(d => {
                const badge = d.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Inactive</span>';
                return `
                    <tr>
                        <td><strong>${d.name}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${d.host}</span></td>
                        <td>${badge}</td>
                        <td>
                            <div style="display:flex; gap:8px;">
                                ${!d.active ? `<button class="btn btn-primary" style="padding: 2px 8px; font-size:0.7rem;" onclick="activateDevice(${d.id})">Activate</button>` : ''}
                                <button class="btn btn-primary" style="padding: 2px 8px; font-size:0.7rem; background:transparent; border-color:var(--accent-red); color:var(--accent-red);" onclick="deleteDevice(${d.id})">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Render OLTs
        if (olts.length === 0) {
            if(els.oltDeviceList) els.oltDeviceList.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No configured OLTs</td></tr>';
        } else {
            if(els.oltDeviceList) els.oltDeviceList.innerHTML = olts.map(d => {
                const badge = d.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Inactive</span>';
                return `
                    <tr>
                        <td><strong>${d.name}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${d.host}</span></td>
                        <td>${badge}</td>
                        <td>
                            <div style="display:flex; gap:8px;">
                                ${!d.active ? `<button class="btn btn-primary" style="padding: 2px 8px; font-size:0.7rem;" onclick="activateDevice(${d.id})">Activate</button>` : ''}
                                <button class="btn btn-primary" style="padding: 2px 8px; font-size:0.7rem; background:transparent; border-color:var(--accent-red); color:var(--accent-red);" onclick="deleteDevice(${d.id})">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) {
        console.error('Failed to fetch devices:', e);
    }
}

async function activateDevice(id) {
    try {
        await fetch(`/api/devices/${id}/active`, { method: 'POST' });
        fetchDevices();
        renderClientTable();
    } catch (e) {
        console.error(e);
    }
}

async function deleteDevice(id) {
    if (confirm('Are you sure you want to delete this device?')) {
        try {
            await fetch(`/api/devices/${id}`, { method: 'DELETE' });
            fetchDevices();
        } catch (e) {
            console.error(e);
        }
    }
}

// Bind to window for onclick handlers
window.activateDevice = activateDevice;
window.deleteDevice = deleteDevice;

// Tab Navigation Logic
function setupNavigation() {
    els.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active from all nav items
            els.navItems.forEach(n => n.classList.remove('active'));
            // Hide all views
            els.views.forEach(v => v.style.display = 'none');
            
            // Add active to clicked nav item
            item.classList.add('active');
            
            // Show target view
            const targetId = item.getAttribute('data-target');
            const targetView = document.getElementById(targetId);
            if(targetView) {
                targetView.style.display = 'block';
            }

            // Update Breadcrumbs
            const title = item.textContent;
            els.breadcrumbsTitle.textContent = title;
            els.breadcrumbsPath.textContent = `Home / ${title}`;
        });
    });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchStats();
    renderClientTable();
    setupNavigation();
    fetchDevices();

    // Client search binding
    const searchInput = document.getElementById('client-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderClientTable(e.target.value);
        });
    }

    // Form handlers
    if (els.formMikrotik) {
        els.formMikrotik.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('mt-name').value;
            const host = document.getElementById('mt-host').value;
            const port = parseInt(document.getElementById('mt-port').value) || 8728;
            const username = document.getElementById('mt-user').value;
            const password = document.getElementById('mt-pass').value;

            try {
                const res = await fetch('/api/devices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'mikrotik', name, host, port, username, password })
                });
                if (res.ok) {
                    els.formMikrotik.reset();
                    fetchDevices();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    if (els.formOlt) {
        els.formOlt.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('olt-name').value;
            const host = document.getElementById('olt-host').value;
            const community = document.getElementById('olt-community').value || 'public';

            try {
                const res = await fetch('/api/devices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'olt', name, host, community })
                });
                if (res.ok) {
                    els.formOlt.reset();
                    fetchDevices();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
});
