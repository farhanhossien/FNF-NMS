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
    breadcrumbsPath: document.querySelector('.breadcrumbs p')
};

let usageChart;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('usageChart').getContext('2d');
    
    // Gradient for Upload (Purple)
    const gradientPurple = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPurple.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
    gradientPurple.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

    // Gradient for Download (Blue)
    const gradientBlue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBlue.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradientBlue.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    usageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [
                {
                    label: 'Download',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#3B82F6',
                    backgroundColor: gradientBlue,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Upload',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#8B5CF6',
                    backgroundColor: gradientPurple,
                    borderWidth: 2,
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
                    grid: { color: '#374151' },
                    ticks: { color: '#9CA3AF' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9CA3AF' }
                }
            },
            plugins: {
                legend: { labels: { color: '#F3F4F6' } }
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

async function renderClientTable() {
    try {
        const res = await fetch('/api/users');
        globalUsers = await res.json();
        
        if (globalUsers.length === 0) {
            els.clientList.innerHTML = '<tr><td colspan="6" style="text-align: center;">No clients found</td></tr>';
            return;
        }

        els.clientList.innerHTML = globalUsers.map((u, i) => {
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
        if (globalUsers.length > 0) {
            fetchUserHistory(globalUsers[0].id);
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
});
