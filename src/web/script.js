let itemsData = [];
let selectedItem = null;
let priceChart = null;
let currentTimeframe = 'all';

const searchInput = document.getElementById('searchInput');
const itemList = document.getElementById('itemList');
const dashboardCard = document.getElementById('dashboardCard');
const statsGrid = document.getElementById('statsGrid');
const noSelectionView = document.getElementById('noSelectionView');
const overviewContainer = document.getElementById('overviewContainer');
const tabOverview = document.getElementById('tabOverview');
const tabTopProfit = document.getElementById('tabTopProfit');
const tabMostSell = document.getElementById('tabMostSell');
const tabChart = document.getElementById('tabChart');
const leaderboardContainer = document.getElementById('leaderboardContainer');

function sortItemsByChange(items) {
    return [...items].sort((a, b) => {
        const changeA = Math.abs(a.pct_change_24h || 0);
        const changeB = Math.abs(b.pct_change_24h || 0);
        if (changeA !== changeB) {
            return changeB - changeA;
        }
        return a.name_th.localeCompare(b.name_th);
    });
}

async function fetchMarketPrices() {
    try {
        const res = await fetch('/api/market-prices');
        if (!res.ok) throw new Error('API server returned error');
        const data = await res.json();
        itemsData = sortItemsByChange(data.items || []);
        renderItemList(itemsData);
        renderOverviewGrid(itemsData);
    } catch (err) {
        itemList.innerHTML = `<div class="error-message">Failed to load market data: ${err.message}</div>`;
    }
}

function renderItemList(items) {
    itemList.innerHTML = '';
    items.forEach(item => {
        const cleanId = item.mc_id.replace(/^[^:]+:/, '');
        const row = document.createElement('div');
        row.className = 'item-row';
        if (selectedItem && selectedItem.mc_id === item.mc_id) {
            row.classList.add('active');
        }
        row.innerHTML = `
            <img class="item-thumbnail" src="/api/item-image?mc_id=${encodeURIComponent(item.mc_id)}" alt="" onerror="this.style.display='none'">
            <div class="item-details">
                <div class="item-name">${item.name_th}</div>
                <div class="item-id">${cleanId}</div>
            </div>
        `;
        row.addEventListener('click', () => selectItem(item));
        itemList.appendChild(row);
    });
}

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = itemsData.filter(item => 
        item.name_th.toLowerCase().includes(query) || 
        item.mc_id.toLowerCase().includes(query)
    );
    renderItemList(filtered);
    renderOverviewGrid(filtered);
});

function formatCompact(num) {
    if (num === undefined || num === null) return '-';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toLocaleString();
}

function renderLeaderboard(items, type) {
    leaderboardContainer.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    
    items.forEach((item, idx) => {
        const rank = idx + 1;
        const cleanId = item.mc_id.replace(/^[^:]+:/, '');
        const medalBadge = rank <= 3 ? 
            `<span class="rank-badge rank-${rank}">${medals[idx]}</span>` : 
            `<span class="rank-badge">${rank}</span>`;
        
        let statValueHTML = '';
        if (type === 'profit') {
            const profit = item.sell_price - item.buy_price;
            statValueHTML = `
                <div class="leaderboard-stat-item">
                    <span class="leaderboard-stat-label">Profit</span>
                    <span class="leaderboard-stat-value profit">+${profit.toLocaleString()}</span>
                </div>
            `;
        } else {
            const volume = item.volume_sold_24h || 0;
            statValueHTML = `
                <div class="leaderboard-stat-item">
                    <span class="leaderboard-stat-label">24h Vol Sold</span>
                    <span class="leaderboard-stat-value volume">${volume.toLocaleString()}</span>
                </div>
            `;
        }
        
        const card = document.createElement('div');
        card.className = 'leaderboard-card';
        card.innerHTML = `
            ${medalBadge}
            <div class="leaderboard-icon-container">
                <img class="leaderboard-icon" src="/api/item-image?mc_id=${encodeURIComponent(item.mc_id)}" alt="" onerror="this.parentNode.style.display='none'">
            </div>
            <div class="leaderboard-details">
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${item.name_th}</div>
                    <div class="leaderboard-id">${cleanId}</div>
                </div>
                <div class="leaderboard-stats">
                    ${statValueHTML}
                    <div class="leaderboard-stat-item">
                        <span class="leaderboard-secondary-stats">Buy: ${item.buy_price.toLocaleString()} | Sell: ${item.sell_price.toLocaleString()}</span>
                        <span class="leaderboard-secondary-stats">Spread: ${item.spread_ratio.toFixed(2)}x</span>
                    </div>
                </div>
            </div>
        `;
        card.addEventListener('click', () => selectItem(item));
        leaderboardContainer.appendChild(card);
    });
}

function renderOverviewGrid(items) {
    overviewContainer.innerHTML = '';
    items.forEach(item => {
        const margin = item.sell_price - item.buy_price;
        const marginPct = item.buy_price > 0 ? ((margin / item.buy_price) * 100).toFixed(1) : '0';
        
        const history = item.history || [];
        let buyDiff = 0;
        let sellDiff = 0;
        if (history.length >= 2) {
            buyDiff = item.buy_price - history[history.length - 2].buy_price;
            sellDiff = item.sell_price - history[history.length - 2].sell_price;
        } else if (item.pct_change_24h !== undefined) {
            buyDiff = item.pct_change_24h;
            sellDiff = item.pct_change_24h;
        }

        const buyClass = buyDiff > 0 ? 'text-green' : (buyDiff < 0 ? 'text-red' : 'highlight');
        const sellClass = sellDiff > 0 ? 'text-green' : (sellDiff < 0 ? 'text-red' : 'highlight');
        const buyVolClass = buyDiff > 0 ? 'text-green' : (buyDiff < 0 ? 'text-red' : '');
        const sellVolClass = sellDiff > 0 ? 'text-green' : (sellDiff < 0 ? 'text-red' : '');

        const card = document.createElement('div');
        card.className = 'overview-card';
        card.innerHTML = `
            <div class="overview-card-header">
                <div class="overview-card-title">${item.name_th}</div>
                <div class="overview-card-icon-container">
                    <img class="overview-card-icon" src="/api/item-image?mc_id=${encodeURIComponent(item.mc_id)}" alt="" onerror="this.parentNode.style.display='none'">
                </div>
            </div>
            <div class="overview-card-details">
                <div class="overview-card-row">
                    <span class="overview-card-label">Buy Order Price</span>
                    <span class="overview-card-value ${buyClass}">${formatCompact(item.buy_price)}</span>
                </div>
                <div class="overview-card-row">
                    <span class="overview-card-label">Sell Order Price</span>
                    <span class="overview-card-value ${sellClass}">${formatCompact(item.sell_price)}</span>
                </div>
                <div class="overview-card-row">
                    <span class="overview-card-label">Buy Volume (24h)</span>
                    <span class="overview-card-value ${buyVolClass}">${formatCompact(item.volume_bought_24h || 0)}</span>
                </div>
                <div class="overview-card-row">
                    <span class="overview-card-label">Sell Volume (24h)</span>
                    <span class="overview-card-value ${sellVolClass}">${formatCompact(item.volume_sold_24h || 0)}</span>
                </div>
                <div class="overview-card-row">
                    <span class="overview-card-label">Margin</span>
                    <span class="overview-card-value margin">${formatCompact(margin)} (${marginPct}%)</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => selectItem(item));
        overviewContainer.appendChild(card);
    });
}

function selectItem(item) {
    selectedItem = item;
    
    // Close sidebar drawer on mobile after selection
    const sidebarEl = document.querySelector('.sidebar');
    const backdropEl = document.getElementById('sidebarBackdrop');
    if (sidebarEl && backdropEl) {
        sidebarEl.classList.remove('open');
        backdropEl.classList.remove('open');
    }

    document.querySelectorAll('.item-row').forEach(row => {
        const id = row.querySelector('.item-id').textContent;
        const cleanId = item.mc_id.replace(/^[^:]+:/, '');
        if (id === cleanId) {
            row.classList.add('active');
        } else {
            row.classList.remove('active');
        }
    });

    noSelectionView.style.display = 'none';
    overviewContainer.style.display = 'none';
    leaderboardContainer.style.display = 'none';
    dashboardCard.style.display = 'block';
    statsGrid.style.display = 'grid';

    tabChart.disabled = false;
    tabOverview.classList.remove('active');
    tabTopProfit.classList.remove('active');
    tabMostSell.classList.remove('active');
    tabChart.classList.add('active');

    document.getElementById('itemIconContainer').innerHTML = `
        <img src="/api/item-image?mc_id=${encodeURIComponent(item.mc_id)}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px;" onerror="this.style.display='none'">
    `;
    document.getElementById('itemName').textContent = item.name_th;
    document.getElementById('itemId').textContent = item.mc_id;
    document.getElementById('buyPriceVal').textContent = item.buy_price.toLocaleString() + ' coins';
    document.getElementById('sellPriceVal').textContent = item.sell_price.toLocaleString() + ' coins';
    document.getElementById('spreadRatioVal').textContent = item.spread_ratio.toFixed(2) + 'x';
    
    const changeVal = item.pct_change_24h || 0;
    const changeEl = document.getElementById('change24hVal');
    changeEl.textContent = (changeVal >= 0 ? '+' : '') + changeVal.toFixed(2) + '%';
    changeEl.className = 'stat-value ' + (changeVal >= 0 ? 'green' : 'pink');

    updateChart();
}

function updateChart() {
    if (!selectedItem || !selectedItem.history) return;
    let history = [...selectedItem.history];
    if (currentTimeframe !== 'all') {
        const limitMs = parseInt(currentTimeframe) * 60 * 1000;
        const now = Date.now();
        history = history.filter(h => (now - new Date(h.ts).getTime()) <= limitMs);
    }
    const labels = history.map(h => {
        const d = new Date(h.ts);
        return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) + 
               (currentTimeframe === 'all' || parseInt(currentTimeframe) > 180 ? ' (' + d.getDate() + '/' + (d.getMonth() + 1) + ')' : '');
    });
    const buyPrices = history.map(h => h.buy_price);
    const sellPrices = history.map(h => h.sell_price);

    if (priceChart) {
        priceChart.destroy();
    }

    const ctx = document.getElementById('priceChart').getContext('2d');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Buy Price',
                    data: buyPrices,
                    borderColor: '#23a55a',
                    backgroundColor: 'rgba(35, 165, 90, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Sell Price',
                    data: sellPrices,
                    borderColor: '#ff4f9f',
                    backgroundColor: 'rgba(255, 79, 159, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#f5f6f8',
                        font: { family: 'Outfit', size: 13 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#16181d',
                    borderColor: '#242730',
                    borderWidth: 1,
                    titleColor: '#f5f6f8',
                    bodyColor: '#8e9297',
                    titleFont: { family: 'Outfit', weight: 'bold' },
                    bodyFont: { family: 'Outfit' }
                }
            },
            scales: {
                x: {
                    grid: { color: '#242730' },
                    ticks: { color: '#8e9297', font: { family: 'Outfit' } }
                },
                y: {
                    grid: { color: '#242730' },
                    ticks: { color: '#8e9297', font: { family: 'Outfit' } }
                }
            }
        }
    });
}

document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTimeframe = e.target.getAttribute('data-range');
        updateChart();
    });
});

document.getElementById('downloadCsvBtn').addEventListener('click', () => {
    if (!selectedItem || !selectedItem.history) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp (UTC),Local Time,Buy Price,Sell Price\n";
    selectedItem.history.forEach(h => {
        const utcTime = h.ts;
        const localTime = new Date(h.ts).toLocaleString().replace(/,/g, '');
        csvContent += `${utcTime},${localTime},${h.buy_price},${h.sell_price}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const cleanId = selectedItem.mc_id.replace(/^[^:]+:/, '');
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${cleanId}_price_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

function deactivateAllTabs() {
    tabOverview.classList.remove('active');
    tabTopProfit.classList.remove('active');
    tabMostSell.classList.remove('active');
    tabChart.classList.remove('active');
    
    overviewContainer.style.display = 'none';
    leaderboardContainer.style.display = 'none';
    dashboardCard.style.display = 'none';
    statsGrid.style.display = 'none';
    noSelectionView.style.display = 'none';
}

tabOverview.addEventListener('click', () => {
    deactivateAllTabs();
    tabOverview.classList.add('active');
    overviewContainer.style.display = 'grid';
    document.querySelectorAll('.item-row').forEach(row => row.classList.remove('active'));
});

tabTopProfit.addEventListener('click', () => {
    deactivateAllTabs();
    tabTopProfit.classList.add('active');
    leaderboardContainer.style.display = 'flex';
    
    const sorted = [...itemsData]
        .map(item => ({ ...item, profit: item.sell_price - item.buy_price }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);
        
    renderLeaderboard(sorted, 'profit');
    document.querySelectorAll('.item-row').forEach(row => row.classList.remove('active'));
});

tabMostSell.addEventListener('click', () => {
    deactivateAllTabs();
    tabMostSell.classList.add('active');
    leaderboardContainer.style.display = 'flex';
    
    const sorted = [...itemsData]
        .map(item => ({ ...item, volume_sold: item.volume_sold_24h || 0 }))
        .sort((a, b) => b.volume_sold - a.volume_sold)
        .slice(0, 10);
        
    renderLeaderboard(sorted, 'volume');
    document.querySelectorAll('.item-row').forEach(row => row.classList.remove('active'));
});

tabChart.addEventListener('click', () => {
    if (selectedItem) {
        deactivateAllTabs();
        tabChart.classList.add('active');
        dashboardCard.style.display = 'block';
        statsGrid.style.display = 'grid';
    }
});

// Setup mobile sidebar toggle listeners
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');

if (menuToggle && sidebar && sidebarBackdrop) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarBackdrop.classList.toggle('open');
    });
    
    sidebarBackdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('open');
    });
}

fetchMarketPrices();
