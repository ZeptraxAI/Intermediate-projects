// Global Application State
let appState = {
    sites: [],
    logs: [],
    stats: [],
    selectedSiteId: null,
    latencyChart: null
};

// DOM Elements
const targetsContainer = document.getElementById('targets-list-container');
const logsTableBody = document.getElementById('logs-table-body');
const selectedSiteTitle = document.getElementById('selected-site-title');
const screenshotHudContainer = document.getElementById('screenshot-hud-container');
const numpyStatsGrid = document.getElementById('numpy-stats-grid');
const formAddTarget = document.getElementById('add-target-form');
const btnForceCheck = document.getElementById('btn-force-check');

// KPI elements
const kpiUptime = document.getElementById('kpi-uptime');
const kpiLatency = document.getElementById('kpi-latency');
const kpiActiveNodes = document.getElementById('kpi-active-nodes');
const kpiTotalChecks = document.getElementById('kpi-total-checks');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchAllData();
    
    // Schedule Auto-Refresh every 12 seconds for real-time responsiveness
    setInterval(fetchAllData, 12000);
    
    // Add Event Listeners
    btnForceCheck.addEventListener('click', triggerManualCheck);
    formAddTarget.addEventListener('submit', handleAddTarget);
});

// Initialize Chart.js with dynamic canvas gradient fills
function initChart() {
    const ctx = document.getElementById('latency-trend-chart').getContext('2d');
    
    // Create gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.00)');
    
    appState.latencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Latency (ms)',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#090e1a',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#60a5fa',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#090e1a',
                    titleFont: { family: 'Outfit', size: 12, weight: 'bold' },
                    bodyFont: { family: 'JetBrains Mono', size: 11 },
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    displayColors: false,
                    padding: 10
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)', drawTicks: false },
                    ticks: { color: '#64748b', font: { size: 9, family: 'JetBrains Mono' }, padding: 8 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)', drawTicks: false },
                    ticks: { color: '#64748b', font: { size: 9, family: 'JetBrains Mono' }, padding: 8 },
                    beginAtZero: true
                }
            }
        }
    });
}

// Fetch all dataset API endpoints
async function fetchAllData() {
    try {
        const refreshIndicator = document.getElementById('refresh-indicator');
        if (refreshIndicator) {
            refreshIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing';
        }
        
        await Promise.all([
            fetchStatus(),
            fetchHistory(),
            fetchStats()
        ]);
        
        // Update dashboard widgets based on newly loaded state
        updateKPIs();
        renderTargets();
        renderHistoryTable();
        
        // Automatically select the first site if none selected yet
        if (!appState.selectedSiteId && appState.sites.length > 0) {
            selectSite(appState.sites[0].id);
        } else if (appState.selectedSiteId) {
            // Keep current site selected and refresh its stats / screenshots
            selectSite(appState.selectedSiteId, false);
        }
        
        if (refreshIndicator) {
            setTimeout(() => {
                refreshIndicator.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--color-success)"></i> Connected';
            }, 600);
        }
    } catch (error) {
        console.error("Failed to sync system telemetry:", error);
    }
}

// Fetch Status of target cluster
async function fetchStatus() {
    const res = await fetch('/api/status');
    appState.sites = await res.json();
}

// Fetch Log Assertions History
async function fetchHistory() {
    const res = await fetch('/api/history?limit=50');
    appState.logs = await res.json();
}

// Fetch NumPy Stats Analytics
async function fetchStats() {
    const res = await fetch('/api/stats');
    appState.stats = await res.json();
}

// Calculate and Update Executive KPIs and circular SVG progress ring
function updateKPIs() {
    if (appState.sites.length === 0) {
        kpiUptime.innerText = '0%';
        kpiLatency.innerText = '0 ms';
        kpiActiveNodes.innerText = '0/0';
        kpiTotalChecks.innerText = '0';
        
        const ring = document.getElementById('kpi-uptime-ring');
        if (ring) ring.style.strokeDashoffset = 163.36;
        return;
    }
    
    // 1. Uptime KPI
    const healthyNodes = appState.sites.filter(s => s.is_up).length;
    const uptimePct = Math.round((healthyNodes / appState.sites.length) * 100);
    kpiUptime.innerText = `${uptimePct}%`;
    kpiUptime.style.color = uptimePct >= 90 ? 'var(--color-success)' : (uptimePct >= 70 ? 'var(--color-warning)' : 'var(--color-danger)');
    
    // Animate Circular Progress Ring (Circumference = 2 * pi * 26 = 163.36)
    const ring = document.getElementById('kpi-uptime-ring');
    if (ring) {
        const circumference = 163.36;
        const offset = circumference - (circumference * uptimePct / 100);
        ring.style.strokeDashoffset = offset;
        
        // Dynamic Stroke Color matching state
        if (uptimePct >= 90) {
            ring.style.stroke = 'var(--color-success)';
        } else if (uptimePct >= 70) {
            ring.style.stroke = 'var(--color-warning)';
        } else {
            ring.style.stroke = 'var(--color-danger)';
        }
    }
    
    // 2. Latency KPI - Median of active online sites
    const onlineLatencies = appState.sites
        .filter(s => s.is_up && s.latency_ms > 0)
        .map(s => s.latency_ms)
        .sort((a, b) => a - b);
        
    let medianLatency = 0;
    if (onlineLatencies.length > 0) {
        const mid = Math.floor(onlineLatencies.length / 2);
        medianLatency = onlineLatencies.length % 2 !== 0 
            ? onlineLatencies[mid] 
            : (onlineLatencies[mid - 1] + onlineLatencies[mid]) / 2;
    }
    kpiLatency.innerText = `${Math.round(medianLatency)} ms`;
    
    // 3. Active Nodes KPI
    kpiActiveNodes.innerText = `${healthyNodes}/${appState.sites.length}`;
    
    // 4. Total Checks KPI
    kpiTotalChecks.innerText = appState.logs.length;
}

// Render targets list side-panel
function renderTargets() {
    if (appState.sites.length === 0) {
        targetsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--color-text-muted);">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.2rem; margin-bottom: 1rem; color: var(--color-warning);"></i>
                <p>No monitoring targets defined. Add a website below to begin monitoring!</p>
            </div>
        `;
        return;
    }
    
    targetsContainer.innerHTML = '';
    
    appState.sites.forEach(site => {
        const isSelected = site.id === appState.selectedSiteId;
        const latencyClass = site.latency_ms > 2000 
            ? 'metric-latency-error' 
            : (site.latency_ms > 1000 ? 'metric-latency-warn' : 'metric-latency-ok');
            
        const card = document.createElement('div');
        card.className = `site-card ${isSelected ? 'selected' : ''}`;
        card.style.cursor = 'pointer';
        
        card.innerHTML = `
            <div class="site-info" onclick="selectSite('${site.id}')">
                <div class="status-indicator ${site.is_up ? 'status-online' : 'status-offline'}"></div>
                <div class="site-meta">
                    <h3>${site.name}</h3>
                    <p>${site.url}</p>
                </div>
            </div>
            <div class="site-metrics">
                <div class="metric-badge">
                    <span class="metric-badge-label">Latency</span>
                    <span class="metric-badge-value ${site.is_up ? latencyClass : 'metric-latency-error'}">
                        ${site.is_up ? Math.round(site.latency_ms) + 'ms' : 'DOWN'}
                    </span>
                </div>
                <div class="site-actions">
                    <button class="btn-icon btn-icon-danger" onclick="deleteTarget('${site.id}', event)" title="Remove Node">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
        
        targetsContainer.appendChild(card);
    });
}

// Select a website target to display detailed stats, screenshot, and address mock
function selectSite(siteId, triggerChartAnim = true) {
    appState.selectedSiteId = siteId;
    
    // Highlight correct site card in targets list
    const cards = targetsContainer.querySelectorAll('.site-card');
    appState.sites.forEach((site, idx) => {
        const card = cards[idx];
        if (card) {
            if (site.id === siteId) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
    });

    const site = appState.sites.find(s => s.id === siteId);
    if (!site) return;
    
    // Update panel title
    selectedSiteTitle.innerHTML = `<i class="fa-solid fa-chart-line"></i> Node Telemetry: ${site.name}`;
    
    // Update Browser mockup address bar URL
    const addressBar = document.getElementById('hud-mock-address');
    if (addressBar) {
        addressBar.innerText = site.url;
    }
    
    // 1. Update Screenshot Preview
    if (site.check_type === 'browser') {
        const randomQueryParam = new Date().getTime(); // Prevent browser caching of image
        const imgPath = `/static/screenshots/${site.id}.png?t=${randomQueryParam}`;
        
        screenshotHudContainer.innerHTML = `
            <img src="${imgPath}" class="screenshot-img" alt="${site.name} telemetry annotated screen view" onerror="handleScreenshotError(this, '${site.name}')">
        `;
    } else {
        screenshotHudContainer.innerHTML = `
            <div class="screenshot-placeholder" style="color: var(--color-warning);">
                <i class="fa-solid fa-bolt placeholder-icon" style="color: var(--color-warning);"></i>
                <p>Node configured for HEAD/GET request mode.</p>
                <span style="font-size:0.8rem; opacity:0.7;">Configure check protocol to 'Playwright' for browser view captures</span>
            </div>
        `;
    }
    
    // 2. Update Latency Charts
    updateLatencyChartForSite(siteId, triggerChartAnim);
    
    // 3. Update NumPy Statistical Insights
    updateNumPyStatsForSite(siteId);
}

function handleScreenshotError(imgEl, name) {
    imgEl.style.display = 'none';
    screenshotHudContainer.innerHTML = `
        <div class="screenshot-placeholder">
            <i class="fa-solid fa-image-blur placeholder-icon"></i>
            <p>Screenshot generating for ${name}...</p>
            <span style="font-size:0.8rem; color:var(--color-text-muted)">The initial check is rendering browser components</span>
        </div>
    `;
}

// Compile stats from NumPy calculations and display in HUD panel
function updateNumPyStatsForSite(siteId) {
    const statObj = appState.stats.find(s => s.site_id === siteId);
    
    if (!statObj || statObj.total_checks === 0) {
        numpyStatsGrid.innerHTML = `
            <div class="stat-box" style="grid-column: span 2; text-align: center; color: var(--color-text-muted);">
                <i class="fa-solid fa-magnifying-glass-chart" style="font-size:1.7rem; margin-bottom: 0.5rem; color: var(--color-primary);"></i>
                <p>No statistics computed yet. Wait for a couple of cycles...</p>
            </div>
        `;
        return;
    }
    
    const outlierCount = statObj.outliers_detected ? statObj.outliers_detected.length : 0;
    
    numpyStatsGrid.innerHTML = `
        <div class="stat-box">
            <div class="stat-box-label">Avg Response Time</div>
            <div class="stat-box-value" style="color: var(--color-primary);">${Math.round(statObj.avg_latency_ms)} ms</div>
        </div>
        <div class="stat-box">
            <div class="stat-box-label">95th Percentile (P95)</div>
            <div class="stat-box-value" style="color: var(--color-warning);">${Math.round(statObj.p95_latency_ms)} ms</div>
        </div>
        <div class="stat-box">
            <div class="stat-box-label">Uptime Diagnostic</div>
            <div class="stat-box-value" style="color: ${statObj.uptime_percentage >= 99 ? 'var(--color-success)' : 'var(--color-danger)'}">
                ${statObj.uptime_percentage}%
            </div>
        </div>
        <div class="stat-box">
            <div class="stat-box-label">Latency Outlier Spikes</div>
            <div class="stat-box-value" style="color: ${outlierCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'}">
                ${outlierCount} spikes
            </div>
        </div>
    `;
}

// Filter logs for selected target, order chronological, populate Chart.js
function updateLatencyChartForSite(siteId, triggerChartAnim) {
    // Get last 10 logs for this site (chronological: oldest to newest for plotting left-to-right)
    const siteLogs = appState.logs
        .filter(l => l.site_id === siteId && l.is_up)
        .slice(0, 10)
        .reverse();
        
    const labels = siteLogs.map(l => {
        const d = new Date(l.timestamp);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    
    const dataPoints = siteLogs.map(l => l.response_time_ms);
    
    appState.latencyChart.data.labels = labels;
    appState.latencyChart.data.datasets[0].data = dataPoints;
    
    appState.latencyChart.update(triggerChartAnim ? 'active' : 'none');
}

// Render raw audit table logs
function renderHistoryTable() {
    if (appState.logs.length === 0) {
        logsTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem; color: var(--color-text-muted);">
                    No assert logs recorded. Wait for monitoring schedules to fire or run check.
                </td>
            </tr>
        `;
        return;
    }
    
    logsTableBody.innerHTML = '';
    
    appState.logs.forEach(log => {
        const dateStr = new Date(log.timestamp).toLocaleString();
        const latencyStr = log.is_up ? `${Math.round(log.response_time_ms)} ms` : '--';
        const errorSnippet = log.error_message ? log.error_message : '-';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-family: var(--font-mono); font-size:0.8rem; color:var(--color-text-sub);">${dateStr}</td>
            <td style="font-weight: 600;">${log.site_name}</td>
            <td style="font-size:0.8rem; text-transform:uppercase; color:var(--color-text-muted); font-family:var(--font-mono);">${log.check_type}</td>
            <td style="font-family: var(--font-mono); font-size:0.85rem; font-weight:500;">${latencyStr}</td>
            <td>
                <span class="status-badge ${log.is_up ? 'badge-up' : 'badge-down'}">
                    ${log.is_up ? 'ONLINE' : 'OFFLINE'}
                </span>
            </td>
            <td style="font-family: var(--font-mono); font-size:0.85rem; color:var(--color-text-sub);">${log.status_code > 0 ? log.status_code : 'N/A'}</td>
            <td style="font-size:0.85rem; color:var(--color-danger); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${errorSnippet}">
                ${errorSnippet}
            </td>
        `;
        logsTableBody.appendChild(row);
    });
}

// On-demand cluster manual health pings trigger
async function triggerManualCheck() {
    btnForceCheck.disabled = true;
    btnForceCheck.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Running sweep...';
    
    try {
        const res = await fetch('/api/check', { method: 'POST' });
        const result = await res.json();
        console.log(result.message);
        
        // Show scanning status in indicator
        const refreshIndicator = document.getElementById('refresh-indicator');
        if (refreshIndicator) {
            refreshIndicator.innerHTML = '<i class="fa-solid fa-satellite-dish fa-beat"></i> Mapping cluster nodes';
        }
        
        // Wait 4.5 seconds for checks to populate then reload
        setTimeout(async () => {
            await fetchAllData();
            btnForceCheck.disabled = false;
            btnForceCheck.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Run Health Check';
        }, 4500);
        
    } catch (e) {
        console.error("Manual check failed:", e);
        btnForceCheck.disabled = false;
        btnForceCheck.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Run Health Check';
    }
}

// Onboarding Target Handler
async function handleAddTarget(e) {
    e.preventDefault();
    
    const name = document.getElementById('site-name').value;
    const id = document.getElementById('site-id').value;
    const url = document.getElementById('site-url').value;
    const check_type = document.getElementById('check-type').value;
    const latency_threshold_ms = parseInt(document.getElementById('latency-threshold').value);
    
    const siteData = { id, name, url, check_type, latency_threshold_ms };
    
    try {
        const res = await fetch('/api/sites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteData)
        });
        
        if (res.ok) {
            formAddTarget.reset();
            await fetchAllData();
            selectSite(id);
        } else {
            const err = await res.json();
            alert(`Error adding target: ${err.detail}`);
        }
    } catch (err) {
        console.error("Network issue adding node target:", err);
    }
}

// Delete target node trigger
async function deleteTarget(siteId, event) {
    if (event) event.stopPropagation(); // Prevent card select trigger
    
    if (!confirm(`Are you sure you want to remove node '${siteId}' from the telemetry cluster?`)) {
        return;
    }
    
    try {
        const res = await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });
        if (res.ok) {
            if (appState.selectedSiteId === siteId) {
                appState.selectedSiteId = null;
            }
            await fetchAllData();
        } else {
            const err = await res.json();
            alert(`Error deleting target: ${err.detail}`);
        }
    } catch (err) {
        console.error("Network issue removing node target:", err);
    }
}
