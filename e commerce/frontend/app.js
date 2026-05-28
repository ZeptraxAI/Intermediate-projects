// Global Application State
let appState = {
    products: [],
    alerts: [],
    selectedProductId: null,
    chartInstance: null
};

// API Base URL
const API_BASE = '/api';

// On Document Ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Initialize Application
function initApp() {
    setupTabNavigation();
    setupModals();
    setupEventListeners();
    
    // Initialize Lucide icons on static HTML
    lucide.createIcons();
    
    // Initial fetch of database info
    refreshData();
    
    // Fetch Mailbox logs every 10 seconds for real-time demonstration
    setInterval(fetchMailboxPreview, 10000);
}

// -------------------------------------------------------------
// UI Navigation & Tabs
// -------------------------------------------------------------
function setupTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Toggle sidebar active state
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle tab views
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            // Specific tab initializations
            if (tabId === 'insights') {
                renderInsightsProductList();
            } else if (tabId === 'settings') {
                fetchSMTPConfig();
                fetchMailboxPreview();
            }
        });
    });
}

function setupModals() {
    const modal = document.getElementById('add-product-modal');
    const openBtn = document.getElementById('add-product-modal-btn');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('btn-cancel-modal');

    const openModal = () => {
        modal.classList.add('open');
        fetchCatalog();
    };
    const closeModal = () => {
        modal.classList.remove('open');
        document.getElementById('add-product-form').reset();
    };

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Close when clicking background glass
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Modal tab switching
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-modal-tab');
            document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.modal-tab-pane').forEach(p => p.classList.remove('active'));
            document.getElementById(`modal-tab-${tabId}`).classList.add('active');
        });
    });

    // Catalog search
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderCatalogGrid());
    }

    // Catalog category filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderCatalogGrid();
        });
    });
}

// Catalog state
let catalogData = [];

async function fetchCatalog() {
    try {
        const response = await fetch(`${API_BASE}/catalog`);
        if (!response.ok) throw new Error('Catalog fetch failed');
        catalogData = await response.json();
        renderCatalogGrid();
    } catch (err) {
        console.error(err);
        document.getElementById('catalog-grid').innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:30px 0;">Could not load catalog.</p>';
    }
}

function renderCatalogGrid() {
    const grid = document.getElementById('catalog-grid');
    const searchQuery = (document.getElementById('catalog-search')?.value || '').toLowerCase();
    const activeChip = document.querySelector('.filter-chip.active');
    const selectedCategory = activeChip ? activeChip.getAttribute('data-category') : 'All';

    // Filter catalog
    let filtered = catalogData.filter(item => {
        const matchesSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery) || item.store.toLowerCase().includes(searchQuery) || item.category.toLowerCase().includes(searchQuery);
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Check which URLs are already tracked
    const trackedUrls = appState.products.map(p => p.url);

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 0;color:var(--text-muted);">
            <i data-lucide="search" style="width:32px;height:32px;margin-bottom:10px;opacity:0.4;"></i>
            <p>No products match your search.</p>
        </div>`;
        lucide.createIcons();
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const isTracked = trackedUrls.some(u => u === item.url);
        const storeClass = item.store.toLowerCase();
        return `
            <div class="catalog-card">
                <div class="catalog-card-img">
                    <span class="catalog-store-tag ${storeClass}">${item.store}</span>
                    <img src="${item.image_url}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'">
                </div>
                <div class="catalog-card-body">
                    <div class="catalog-card-title" title="${item.title}">${item.title}</div>
                    <div class="catalog-card-rating">${'★'.repeat(Math.round(item.rating))}${'☆'.repeat(5 - Math.round(item.rating))} (${item.rating})</div>
                    <div class="catalog-card-price">₹${item.price.toLocaleString('en-IN')}</div>
                    <button class="catalog-card-track-btn" ${isTracked ? 'disabled' : ''} onclick="trackFromCatalog('${item.url}'${isTracked ? ', true' : ''})">
                        ${isTracked ? '<i data-lucide="check-circle" style="width:14px;height:14px;"></i> Already Tracked' : '<i data-lucide="plus" style="width:14px;height:14px;"></i> Track This'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

async function trackFromCatalog(url, alreadyTracked) {
    if (alreadyTracked) return;

    const email = document.getElementById('catalog-alert-email')?.value || '';
    const targetStr = document.getElementById('catalog-alert-target')?.value || '';

    const body = { url: url, force_mock: true };
    if (email && targetStr) {
        body.email = email;
        body.target_price = parseFloat(targetStr);
    }

    // Disable the button that was clicked
    const buttons = document.querySelectorAll('.catalog-card-track-btn');
    buttons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes(url)) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Adding...';
        }
    });

    try {
        const response = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Failed to add product');

        showToast(`Tracking started: ${result.details.title.substring(0, 30)}...`, 'success');
        await refreshData();
        renderCatalogGrid(); // refresh to show "Already Tracked"
    } catch (err) {
        showToast(err.message, 'error');
        renderCatalogGrid(); // re-render to reset buttons
    }
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'x-circle';
    
    toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons({node: toast});
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// -------------------------------------------------------------
// API Actions & Data Fetchers
// -------------------------------------------------------------
async function refreshData() {
    await fetchProducts();
    await fetchAlerts();
    fetchMailboxPreview();
}

async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) throw new Error('Failed to load products');
        
        appState.products = await response.json();
        
        // Update stats top cards
        document.getElementById('stat-count').innerText = appState.products.length;
        
        renderProductsGrid();
        populateProductDropdowns();
        
        // Update selected product reference in Insights if needed
        if (appState.products.length > 0 && !appState.selectedProductId) {
            appState.selectedProductId = appState.products[0].id;
        }
    } catch (err) {
        showToast('Error syncing products with server.', 'error');
        console.error(err);
    }
}

async function fetchAlerts() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        if (!response.ok) throw new Error('Failed to load alerts');
        
        appState.alerts = await response.json();
        
        // Update active alerts count card
        const activeCount = appState.alerts.filter(a => a.is_active === 1).length;
        const triggeredCount = appState.alerts.filter(a => a.is_triggered === 1).length;
        
        document.getElementById('stat-alerts').innerText = activeCount;
        document.getElementById('stat-deals').innerText = triggeredCount;
        
        renderAlertsTable();
    } catch (err) {
        console.error(err);
    }
}

async function fetchSMTPConfig() {
    try {
        const response = await fetch(`${API_BASE}/config`);
        if (!response.ok) return;
        const config = await response.json();
        
        document.getElementById('smtp-enabled').checked = config.enabled;
        document.getElementById('smtp-server').value = config.smtp_server || 'smtp.gmail.com';
        document.getElementById('smtp-port').value = config.smtp_port || 587;
        document.getElementById('smtp-email').value = config.sender_email || '';
        document.getElementById('smtp-password').value = config.sender_password || '';
    } catch (err) {
        console.error(err);
    }
}

async function fetchMailboxPreview() {
    try {
        const response = await fetch(`${API_BASE}/alerts-preview`);
        if (!response.ok) return;
        const data = await response.json();
        document.getElementById('alerts-mailbox-preview').innerHTML = data.html;
    } catch (err) {
        console.error(err);
    }
}

// -------------------------------------------------------------
// Component Renderers (HTML Generator)
// -------------------------------------------------------------
function renderProductsGrid() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    
    if (appState.products.length === 0) {
        grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; padding: 60px 0;">
            <span class="empty-icon"><i data-lucide="shopping-cart"></i></span>
            <h3>No Products Tracked</h3>
            <p>Paste Amazon or Flipkart product links to start tracking live prices and forecasting trends.</p>
        </div>`;
        lucide.createIcons();
        return;
    }
    
    appState.products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const storeClass = p.store.toLowerCase();
        const dropBadge = p.drop_percentage > 0 
            ? `<span class="discount-badge">-${p.drop_percentage}% discount</span>`
            : '';
            
        const targetLabel = p.target_price 
            ? `<div class="price-alert-target"><span>Alert Target</span><span class="target-val">₹${p.target_price.toLocaleString('en-IN')}</span></div>`
            : `<div class="price-alert-target"><span>Alert Target</span><span class="target-val" style="color:var(--text-dark)">Not Set</span></div>`;
            
        // Setup prediction probability status
        let probClass = 'low';
        if (p.stats.price_drop_prob >= 70) probClass = 'high';
        else if (p.stats.price_drop_prob >= 40) probClass = 'medium';
        
        card.innerHTML = `
            <span class="card-store-badge ${storeClass}">${p.store}</span>
            <button class="card-delete-btn" onclick="deleteProduct(${p.id})"><i data-lucide="x" style="width:14px;height:14px;"></i></button>
            <div class="product-img-wrapper">
                <img src="${p.image_url}" alt="Product Image" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22150%22 height=%22150%22/%3E%3Ctext x=%2275%22 y=%2275%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-family=%22sans-serif%22 font-size=%2212%22 fill=%22%2394a3b8%22%3ENo Image%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="product-info">
                <h3 class="product-title" title="${p.title}">${p.title}</h3>
                <div class="product-rating">
                    <span class="rating-stars">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}</span>
                    <span>(${p.rating})</span>
                </div>
                <div class="price-box">
                    <div class="price-main">
                        <span class="price-val">₹${p.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                        ${dropBadge}
                    </div>
                    ${targetLabel}
                </div>
                <div class="prediction-pill">
                    <span>Price Drop Prob.</span>
                    <span class="prob-badge ${probClass}">${p.stats.price_drop_prob}%</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary" onclick="viewProductInsights(${p.id})"><i data-lucide="bar-chart-2" style="width:14px;height:14px;"></i> Insights</button>
                    <button class="btn btn-primary" onclick="forceProductScrape(${p.id})"><i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> Scrape</button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
    lucide.createIcons();
}

function populateProductDropdowns() {
    const selects = [document.getElementById('alert-product')];
    selects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="" disabled selected>Choose a tracked item...</option>';
        
        appState.products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = `[${p.store}] ${p.title.substring(0, 45)}...`;
            select.appendChild(opt);
        });
        
        if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
            select.value = currentVal;
        }
    });
}

function renderAlertsTable() {
    const tbody = document.getElementById('alerts-table-body');
    tbody.innerHTML = '';
    
    if (appState.alerts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No active alerts configured.</td></tr>`;
        return;
    }
    
    appState.alerts.forEach(a => {
        const row = document.createElement('tr');
        
        // Status Badge
        let statusBadge = '';
        if (a.is_active === 1) {
            statusBadge = '<span class="badge badge-active">Active Monitoring</span>';
        } else {
            statusBadge = '<span class="badge badge-triggered">Triggered</span>';
        }
        
        const storeLabel = a.product_url.includes('amazon') ? 'Amazon' : 'Flipkart';
        const storeClass = storeLabel.toLowerCase();
        
        row.innerHTML = `
            <td>
                <div style="max-width: 250px; font-weight:600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${a.product_title}">
                    <span class="card-store-badge ${storeClass}" style="position:static; margin-right:8px; display:inline-block; padding: 2px 6px; font-size:10px;">${storeLabel}</span>
                    ${a.product_title}
                </div>
            </td>
            <td style="font-weight: 700; color: var(--secondary);">₹${a.target_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td style="font-weight: 700; color: var(--text-main);">₹${a.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td style="color: var(--text-muted); font-size: 13px;">${a.email}</td>
            <td style="font-weight: 500;">
                Price &le; ₹${a.target_price.toLocaleString('en-IN')}
            </td>
            <td>${statusBadge}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function renderInsightsProductList() {
    const list = document.getElementById('insights-product-list');
    list.innerHTML = '';
    
    if (appState.products.length === 0) {
        list.innerHTML = `<li style="padding:15px; color:var(--text-dark); text-align:center; font-style:italic;">No products cataloged</li>`;
        return;
    }
    
    appState.products.forEach(p => {
        const li = document.createElement('li');
        li.className = `insights-item ${appState.selectedProductId === p.id ? 'active' : ''}`;
        li.innerHTML = `
            <h4>${p.title}</h4>
            <span>${p.store} • ₹${p.current_price.toLocaleString('en-IN')}</span>
        `;
        li.addEventListener('click', () => {
            document.querySelectorAll('.insights-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            viewProductInsights(p.id, false); // view but don't redirect tab
        });
        list.appendChild(li);
    });
    
    if (appState.selectedProductId) {
        loadProductInsights(appState.selectedProductId);
    }
}

// -------------------------------------------------------------
// Interactive Tab Insights & Chart.js
// -------------------------------------------------------------
function viewProductInsights(productId, switchTab = true) {
    appState.selectedProductId = productId;
    
    if (switchTab) {
        // Find Insights navigation button and simulate click
        const insightsBtn = document.querySelector('.nav-btn[data-tab="insights"]');
        if (insightsBtn) insightsBtn.click();
    } else {
        loadProductInsights(productId);
    }
}

async function loadProductInsights(productId) {
    const selectedProduct = appState.products.find(p => p.id === productId);
    if (!selectedProduct) return;
    
    // Remove empty state, show details view
    document.getElementById('no-product-selected').classList.add('hidden');
    document.getElementById('insights-charts-view').classList.remove('hidden');
    
    // Set headers
    const badge = document.getElementById('insights-store-badge');
    badge.className = `store-badge ${selectedProduct.store}`;
    badge.innerText = selectedProduct.store;
    
    document.getElementById('insights-title').innerText = selectedProduct.title;
    document.getElementById('insights-price').innerText = `₹${selectedProduct.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    // Prediction probability details
    const pVal = selectedProduct.stats.price_drop_prob;
    document.getElementById('insights-prob-val').innerText = `${pVal}%`;
    const probBar = document.getElementById('insights-prob-bar');
    probBar.style.width = `${pVal}%`;
    
    // Style progress bar color based on probability
    if (pVal >= 70) {
        probBar.style.background = 'linear-gradient(90deg, var(--danger) 0%, var(--warning) 100%)';
        document.getElementById('insights-prob-desc').innerHTML = `<strong>Strong price drop alert!</strong> The ML model detects a downward price trend. Prices will likely fall within 3 days.`;
    } else if (pVal >= 40) {
        probBar.style.background = 'linear-gradient(90deg, var(--warning) 0%, var(--primary) 100%)';
        document.getElementById('insights-prob-desc').innerHTML = `<strong>Moderate drop likelihood.</strong> Price contains standard volatility. Keep an eye on minor fluctuations.`;
    } else {
        probBar.style.background = 'linear-gradient(90deg, var(--primary) 0%, var(--success) 100%)';
        document.getElementById('insights-prob-desc').innerHTML = `<strong>Stable pricing index.</strong> The price curve is flat or slightly upward. Quick discount events are unlikely.`;
    }
    
    // Stats grid
    document.getElementById('insights-min').innerText = `₹${selectedProduct.stats.min_price.toLocaleString('en-IN')}`;
    document.getElementById('insights-max').innerText = `₹${selectedProduct.stats.max_price.toLocaleString('en-IN')}`;
    document.getElementById('insights-avg').innerText = `₹${selectedProduct.stats.avg_price.toLocaleString('en-IN')}`;
    
    const vol = selectedProduct.stats.volatility;
    let volText = 'Low';
    if (vol > 0.02) volText = 'High';
    else if (vol > 0.008) volText = 'Medium';
    document.getElementById('insights-vol').innerText = volText;
    
    // Buy Verdict logic
    const verdictBox = document.getElementById('buy-verdict-box');
    const vTitle = document.getElementById('verdict-title');
    const vDesc = document.getElementById('verdict-desc');
    
    const targetPrice = selectedProduct.target_price;
    const currentPrice = selectedProduct.current_price;
    
    if (targetPrice && currentPrice <= targetPrice) {
        verdictBox.style.borderColor = 'var(--success)';
        verdictBox.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
        vTitle.innerText = "Target Hit! - BUY NOW";
        vDesc.innerText = `Current price (₹${currentPrice.toLocaleString('en-IN')}) is below your configured trigger limit of ₹${targetPrice.toLocaleString('en-IN')}. Excellent deal!`;
    } else if (pVal >= 70) {
        verdictBox.style.borderColor = 'var(--warning)';
        verdictBox.style.backgroundColor = 'rgba(245, 158, 11, 0.05)';
        vTitle.innerText = "Strategy: Wait for Price Drop";
        vDesc.innerText = `Machine Learning models predict a price drop within the next 3 days (${pVal}% confidence). We recommend holding off on purchases.`;
    } else if (currentPrice <= selectedProduct.stats.avg_price * 0.95) {
        verdictBox.style.borderColor = 'var(--success)';
        verdictBox.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
        vTitle.innerText = "Strategy: Good Deal - BUY";
        vDesc.innerText = `Current price is 5% or more below the average historical index. Low likelihood of immediate further drops.`;
    } else {
        verdictBox.style.borderColor = 'var(--primary)';
        verdictBox.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
        vTitle.innerText = "Strategy: Normal Pricing";
        vDesc.innerText = `Current pricing is stable. If you aren't in a rush, configure a price drop threshold in the Alert Center.`;
    }

    // Load price history list to draw chart
    try {
        const response = await fetch(`${API_BASE}/products/${productId}/history`);
        if (!response.ok) return;
        const rawHistory = await response.json();
        
        renderChart(rawHistory, selectedProduct.forecast);
    } catch (err) {
        console.error(err);
    }
}

function renderChart(history, forecast) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Destroy previous Chart instance to avoid canvas overlapping
    if (appState.chartInstance) {
        appState.chartInstance.destroy();
    }
    
    // Format History labels & data
    const historyLabels = history.map(h => {
        const d = new Date(h.timestamp);
        return d.toLocaleDateString('en-IN', {month: 'short', day: 'numeric'});
    });
    const historyData = history.map(h => h.price);
    
    // Join history and forecast lines.
    // The forecast line must start from the last element of the history list to form a single continuous graph.
    const lastHistoryPrice = historyData[historyData.length - 1];
    const lastHistoryLabel = historyLabels[historyLabels.length - 1];
    
    const forecastLabels = forecast.map(f => {
        const d = new Date(f.date);
        return d.toLocaleDateString('en-IN', {month: 'short', day: 'numeric'});
    });
    const forecastData = forecast.map(f => f.price);
    
    // Form composite arrays
    const combinedLabels = [...historyLabels, ...forecastLabels];
    
    // Populate padding array so the graphs overlap
    const paddedHistoryData = [...historyData];
    for (let i = 0; i < forecastData.length; i++) paddedHistoryData.push(null);
    
    const paddedForecastData = [];
    for (let i = 0; i < historyData.length - 1; i++) paddedForecastData.push(null);
    paddedForecastData.push(lastHistoryPrice); // connecting link
    paddedForecastData.push(...forecastData);
    
    appState.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: combinedLabels,
            datasets: [
                {
                    label: 'Historical Pricing',
                    data: paddedHistoryData,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.06)',
                    borderWidth: 3,
                    pointRadius: 1,
                    pointHoverRadius: 6,
                    fill: true,
                    spanGaps: false
                },
                {
                    label: 'ML Forecast (7 Days)',
                    data: paddedForecastData,
                    borderColor: '#0891b2',
                    borderDash: [5, 5],
                    borderWidth: 3,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    fill: false,
                    spanGaps: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#475569',
                        font: { family: 'Plus Jakarta Sans', weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(79, 70, 229, 0.2)',
                    borderWidth: 1,
                    titleFont: { family: 'Plus Jakarta Sans', weight: 'bold' },
                    bodyFont: { family: 'Plus Jakarta Sans' },
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0, 0, 0, 0.04)' },
                    ticks: { color: '#475569', font: { family: 'Plus Jakarta Sans' } }
                },
                y: {
                    grid: { color: 'rgba(0, 0, 0, 0.04)' },
                    ticks: {
                        color: '#475569',
                        font: { family: 'Plus Jakarta Sans' },
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                }
            }
        }
    });
}

// -------------------------------------------------------------
// Interactive Events Handlers
// -------------------------------------------------------------
function setupEventListeners() {
    // FORM: Add Product Tracker
    const addProductForm = document.getElementById('add-product-form');
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = document.getElementById('prod-url').value;
        const forceMock = document.getElementById('prod-force-mock').checked;
        const email = document.getElementById('prod-alert-email').value;
        const targetStr = document.getElementById('prod-alert-target').value;
        
        const submitBtn = document.getElementById('btn-submit-product');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Analyzing Link...';
        
        try {
            const body = {
                url: url,
                force_mock: forceMock
            };
            
            if (email && targetStr) {
                body.email = email;
                body.target_price = parseFloat(targetStr);
            }
            
            const response = await fetch(`${API_BASE}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || 'Failed to add product');
            }
            
            showToast(`Product added: ${result.details.title.substring(0, 25)}...`, 'success');
            
            // Close modal
            document.getElementById('add-product-modal').classList.remove('open');
            addProductForm.reset();
            
            refreshData();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Start Tracking';
        }
    });

    // FORM: Add Alert
    const newAlertForm = document.getElementById('new-alert-form');
    newAlertForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productId = parseInt(document.getElementById('alert-product').value);
        const email = document.getElementById('alert-email').value;
        const targetPrice = parseFloat(document.getElementById('alert-target').value);
        
        try {
            const response = await fetch(`${API_BASE}/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: productId,
                    email: email,
                    target_price: targetPrice
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || 'Failed to register alert');
            }
            
            showToast('Price threshold alert registered!', 'success');
            newAlertForm.reset();
            
            refreshData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // FORM: SMTP Configuration
    const smtpForm = document.getElementById('smtp-config-form');
    smtpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const enabled = document.getElementById('smtp-enabled').checked;
        const server = document.getElementById('smtp-server').value;
        const port = parseInt(document.getElementById('smtp-port').value);
        const email = document.getElementById('smtp-email').value;
        const password = document.getElementById('smtp-password').value;
        
        try {
            const response = await fetch(`${API_BASE}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtp_server: server,
                    smtp_port: port,
                    sender_email: email,
                    sender_password: password,
                    enabled: enabled
                })
            });
            
            if (!response.ok) throw new Error('Failed to update config');
            
            showToast('SMTP credentials saved!', 'success');
            fetchSMTPConfig();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Global: Scan all products
    document.getElementById('scrape-all-btn').addEventListener('click', async () => {
        const btn = document.getElementById('scrape-all-btn');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="icon" style="animation:spin 1s linear infinite;"></i> Scanning...';
        
        try {
            const response = await fetch(`${API_BASE}/scrape-all`, { method: 'POST' });
            if (!response.ok) throw new Error('API trigger error');
            
            showToast('Scanning price catalogs in background...', 'info');
            
            // Allow 3 seconds for async threads before client-refresh
            setTimeout(async () => {
                await refreshData();
                btn.disabled = false;
                btn.innerHTML = '<i class="icon" data-lucide="refresh-cw"></i> Scan All Prices';
                lucide.createIcons();
                showToast('Database scan complete.', 'success');
            }, 3000);
        } catch (err) {
            showToast('Error executing batch scan.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="icon" data-lucide="refresh-cw"></i> Scan All Prices';
            lucide.createIcons();
        }
    });

    // Excel Export Trigger
    document.getElementById('export-excel-btn').addEventListener('click', () => {
        showToast('Building Excel Workbook...', 'info');
        window.location.href = `${API_BASE}/export`;
    });

    // Reset database action
    document.getElementById('btn-reset-db').addEventListener('click', async () => {
        if (!confirm('🚨 WARNING: This will delete ALL tracked products, history, and configured alerts. Proceed?')) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/clear-db`, { method: 'POST' });
            if (!response.ok) throw new Error('DB wipe failure');
            
            showToast('Database reset successfully. Reloading cache...', 'success');
            appState.selectedProductId = null;
            
            // Hide chart detailed insights
            document.getElementById('no-product-selected').classList.remove('hidden');
            document.getElementById('insights-charts-view').classList.add('hidden');
            
            refreshData();
        } catch (err) {
            showToast('Reset failed.', 'error');
        }
    });

    // Clear alerts logs
    document.getElementById('btn-clear-logs').addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE}/clear-logs`, { method: 'POST' });
            if (!response.ok) throw new Error('Log clear error');
            
            showToast('Mailbox logs flushed.', 'success');
            fetchMailboxPreview();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// -------------------------------------------------------------
// Callback controls triggered by Inline Click-handlers
// -------------------------------------------------------------
async function deleteProduct(productId) {
    if (!confirm('Stop tracking this product and delete its data records?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete product');
        
        showToast('Product tracking removed.', 'info');
        
        if (appState.selectedProductId === productId) {
            appState.selectedProductId = null;
            document.getElementById('no-product-selected').classList.remove('hidden');
            document.getElementById('insights-charts-view').classList.add('hidden');
        }
        
        refreshData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function forceProductScrape(productId) {
    showToast('Connecting to store endpoint...', 'info');
    try {
        const response = await fetch(`${API_BASE}/products/${productId}/scrape`, {
            method: 'POST'
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Scraping error');
        
        showToast(`Scrape complete! Current price: ₹${result.price.toLocaleString('en-IN')}`, 'success');
        refreshData();
        
        // If we are currently inspecting this product inside Insights, reload details
        if (appState.selectedProductId === productId) {
            loadProductInsights(productId);
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}
