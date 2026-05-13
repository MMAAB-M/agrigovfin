document.addEventListener('DOMContentLoaded', function () {
  const $id = (id) => document.getElementById(id);
  const $all = (selector) => Array.from(document.querySelectorAll(selector));

  let products = [];
  let orders = [];
  let catalogues = [];
  let adminStats = null;
  let adminCharts = [];
  let adminUserCharts = [];
  let currentProductModalMode = 'create';
  let currentEditingProduct = null;
  let currentCatalogueModalMode = 'create';
  let currentEditingCatalogue = null;

  const ALGERIA_WILAYAS = [
    { name: 'Adrar', coords: [27.8743, -0.2939] },
    { name: 'Chlef', coords: [36.1691, 1.3317] },
    { name: 'Laghouat', coords: [33.8076, 2.8651] },
    { name: 'Oum El Bouaghi', coords: [35.8775, 7.1135] },
    { name: 'Batna', coords: [35.5559, 6.1741] },
    { name: 'Béjaïa', coords: [36.7525, 5.0557] },
    { name: 'Biskra', coords: [34.8500, 5.7333] },
    { name: 'Béchar', coords: [31.6167, -2.2167] },
    { name: 'Blida', coords: [36.4700, 2.8277] },
    { name: 'Bouira', coords: [36.3749, 3.9020] },
    { name: 'Tamanrasset', coords: [22.7850, 5.5228] },
    { name: 'Tébessa', coords: [35.4042, 8.1242] },
    { name: 'Tlemcen', coords: [34.8783, -1.3150] },
    { name: 'Tiaret', coords: [35.3710, 1.3169] },
    { name: 'Tizi Ouzou', coords: [36.7169, 4.0497] },
    { name: 'Alger', coords: [36.7538, 3.0588] },
    { name: 'Djelfa', coords: [34.6728, 3.2630] },
    { name: 'Jijel', coords: [36.8219, 5.7667] },
    { name: 'Sétif', coords: [36.1900, 5.4100] },
    { name: 'Saïda', coords: [34.8303, 0.1517] },
    { name: 'Skikda', coords: [36.8764, 6.9092] },
    { name: 'Sidi Bel Abbès', coords: [35.1899, -0.6308] },
    { name: 'Annaba', coords: [36.9000, 7.7667] },
    { name: 'Guelma', coords: [36.4621, 7.4261] },
    { name: 'Constantine', coords: [36.3650, 6.6147] },
    { name: 'Médéa', coords: [36.2642, 2.7539] },
    { name: 'Mostaganem', coords: [35.9397, 0.0898] },
    { name: "M'Sila", coords: [35.7058, 4.5419] },
    { name: 'Mascara', coords: [35.3987, 0.1406] },
    { name: 'Ouargla', coords: [31.9493, 5.3250] },
    { name: 'Oran', coords: [35.6981, -0.6348] },
    { name: 'El Bayadh', coords: [33.6832, 1.0193] },
    { name: 'Illizi', coords: [26.4833, 8.4667] },
    { name: 'Bordj Bou Arreridj', coords: [36.0730, 4.7610] },
    { name: 'Boumerdès', coords: [36.7580, 3.4772] },
    { name: 'El Tarf', coords: [36.7672, 8.3138] },
    { name: 'Tindouf', coords: [27.6711, -8.1474] },
    { name: 'Tissemsilt', coords: [35.6072, 1.8108] },
    { name: 'El Oued', coords: [33.3561, 6.8632] },
    { name: 'Khenchela', coords: [35.4358, 7.1433] },
    { name: 'Souk Ahras', coords: [36.2864, 7.9511] },
    { name: 'Tipaza', coords: [36.5897, 2.4475] },
    { name: 'Mila', coords: [36.4503, 6.2644] },
    { name: 'Aïn Defla', coords: [36.2640, 1.9679] },
    { name: 'Naâma', coords: [33.2667, -0.3167] },
    { name: 'Aïn Témouchent', coords: [35.2975, -1.1404] },
    { name: 'Ghardaïa', coords: [32.4902, 3.6738] },
    { name: 'Relizane', coords: [35.7373, 0.5549] },
    { name: 'Timimoun', coords: [29.2639, 0.2306] },
    { name: 'Bordj Badji Mokhtar', coords: [21.3289, 0.9521] },
    { name: 'Ouled Djellal', coords: [34.4166, 5.0666] },
    { name: 'Béni Abbès', coords: [30.1331, -2.1661] },
    { name: 'In Salah', coords: [27.1935, 2.4607] },
    { name: 'In Guezzam', coords: [19.5686, 5.7722] },
    { name: 'Touggourt', coords: [33.1000, 6.0667] },
    { name: 'Djanet', coords: [24.5546, 9.4840] },
    { name: "El M'Ghair", coords: [33.9500, 5.9167] },
    { name: 'El Meniaa', coords: [30.5833, 2.8833] },
  ];

  const CATEGORY_ORDER = ['Legume', 'Fruit', 'Animal', 'Cereale'];
  const CATEGORY_LABELS = {
    Legume: 'Légumes',
    Fruit: 'Fruits',
    Animal: 'Animaux',
    Cereale: 'Céréales',
  };
  const CATEGORY_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#14b8a6', '#ef4444'];

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString('fr-FR')} DA`;
  }

  function orderLabel(status) {
    const map = {
      en_attente: 'En attente', confirmee: 'Confirmée', refusee: 'Refusée',
      en_preparation: 'Préparation', expediee: 'Expédiée', livree: 'Livrée', annulee: 'Annulée',
    };
    return map[status] || status || 'Inconnu';
  }

  function orderStatusBadge(status) {
    const cls = {
      en_attente: 'pending', confirmee: 'in-transit', refusee: 'cancelled',
      en_preparation: 'in-transit', expediee: 'in-transit', livree: 'active', annulee: 'cancelled',
    }[status] || 'pending';
    return `<span class="status ${cls}">${orderLabel(status)}</span>`;
  }


  function ensureToastRoot() {
    let root = document.querySelector('.admin-toast-stack');
    if (!root) {
      root = document.createElement('div');
      root.className = 'admin-toast-stack';
      document.body.appendChild(root);
    }
    return root;
  }

  function notify(message, type = 'success') {
    const root = ensureToastRoot();
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    const icon = type === 'error' ? '⚠️' : type === 'warning' ? '✨' : '✅';
    toast.innerHTML = `<span>${icon}</span><strong>${escapeHtml(message || 'Action effectuée')}</strong>`;
    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }

  function animateNumber(el, target, suffix = '') {
    if (!el) return;
    const end = Number(target || 0);
    if (!Number.isFinite(end)) {
      el.textContent = String(target || '0') + suffix;
      return;
    }
    const start = Number(el.dataset.currentNumber || 0);
    const duration = 650;
    const startTime = performance.now();
    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(start + (end - start) * eased);
      el.textContent = `${value.toLocaleString('fr-FR')}${suffix}`;
      if (progress < 1) requestAnimationFrame(frame);
      else el.dataset.currentNumber = String(end);
    }
    requestAnimationFrame(frame);
  }

  function setStatNumber(el, value, suffix = '') {
    if (!el) return;
    animateNumber(el, value, suffix);
  }

  function applyThemeIcons() {
    const isDark = document.body.classList.contains('dark-mode');
    $all('.admin-theme-toggle').forEach(btn => { btn.textContent = isDark ? '☀️' : '🌙'; });
  }

  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('admin-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    applyThemeIcons();
    initCharts();
  }

  function initTheme() {
    // Default to light mode — only activate dark if user explicitly chose it
    document.body.classList.remove('dark-mode');
    if (localStorage.getItem('admin-theme') === 'dark') {
      document.body.classList.add('dark-mode');
    }
    applyThemeIcons();
    $all('.admin-theme-toggle').forEach(btn => btn.addEventListener('click', toggleTheme));
  }

  function openAdminPage(targetPage) {
    if (!targetPage || !$id(targetPage)) return;
    const links = $all('.admin-menu-link');
    const pages = $all('.admin-page');
    links.forEach(item => item.classList.toggle('active', item.getAttribute('data-page') === targetPage));
    pages.forEach(page => page.classList.toggle('active', page.id === targetPage));
    if (targetPage === 'adminProductsPage') loadProduits();
    if (targetPage === 'adminOrdersPage') { loadOrders(); setTimeout(renderOrdersInsights, 50); }
    if (targetPage === 'adminUsersPage') { renderUsersDashboard(); renderSettingsStats(); }
    if (targetPage === 'adminBenefitsPage') {
      document.dispatchEvent(new CustomEvent('admin:benefits-page-opened'));
      if (window.adminRefreshNotifications) window.adminRefreshNotifications();
    }
    if (targetPage === 'adminSettingsPage') renderSettingsStats();
    if (targetPage === 'adminVetOrgPage' && typeof adminLoadVetOrgData === 'function') setTimeout(adminLoadVetOrgData, 200);
    window.location.hash = targetPage;
  }

  function initNavigation() {
    const links = $all('.admin-menu-link');
    links.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openAdminPage(this.getAttribute('data-page'));
      });
    });
    const initial = (window.location.hash || '').replace('#','');
    if (initial && $id(initial)) openAdminPage(initial);
    window.adminOpenPage = openAdminPage;
  }


  function populateWilayaSelect(selectId, label = 'Toutes les wilayas') {
    const select = $id(selectId);
    if (!select) return;
    const current = select.value || 'all';
    select.innerHTML = `<option value="all">${label}</option>` + ALGERIA_WILAYAS
      .map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`)
      .join('');
    select.value = [...select.options].some(opt => opt.value === current) ? current : 'all';
  }

  function initWilayaSelects() {
    populateWilayaSelect('adminRegionFilter', 'Toutes les régions');
    populateWilayaSelect('adminFilterWilayaProduct', 'Toutes wilayas');
  }

  function getProductWilaya(product) {
    return product.wilaya || product.commune || product.region || product.location || '';
  }

  function getCategoryStats(sourceProducts = products) {
    const stats = {};
    sourceProducts.forEach((product) => {
      const category = product.type || 'Autre';
      const key = CATEGORY_ORDER.find(item => normalizeText(item) === normalizeText(category)) || category || 'Autre';
      stats[key] = (stats[key] || 0) + 1;
    });
    CATEGORY_ORDER.forEach(item => { if (!stats[item]) stats[item] = 0; });
    const orderedKeys = [...CATEGORY_ORDER, ...Object.keys(stats).filter(k => !CATEGORY_ORDER.includes(k))];
    return orderedKeys.map(key => ({ key, label: CATEGORY_LABELS[key] || key, value: stats[key] || 0 }));
  }

  function getDashboardQuantityStats(sourceProducts = products) {
    const dashboardOrder = ['Fruit', 'Legume', 'Animal'];
    const stats = { Fruit: 0, Legume: 0, Animal: 0 };

    sourceProducts.forEach((product) => {
      const category = product.type || product.category || product.categorie || 'Autre';
      const key = dashboardOrder.find(item => normalizeText(item) === normalizeText(category));
      if (!key) return;

      const quantity = Number(product.qty ?? product.quantity ?? product.quantite ?? product.stock ?? 0);
      stats[key] += Number.isFinite(quantity) ? quantity : 0;
    });

    return dashboardOrder.map(key => ({
      key,
      label: CATEGORY_LABELS[key] || key,
      value: stats[key] || 0,
    }));
  }

  function getPopularProducts(sourceProducts = products, limit = 6) {
    const grouped = new Map();
    sourceProducts
      .filter(product => product.source === 'Annonce agriculteur' || product.source === 'Produit officiel')
      .forEach((product) => {
        const name = product.name || 'Produit';
        const key = normalizeText(name) || name;
        const item = grouped.get(key) || {
          name,
          type: product.type || 'Autre',
          qty: 0,
          offers: 0,
          price: product.price || product.officialMin || 0,
          photo: product.photo || '',
        };
        item.qty += Number(product.qty || 0);
        item.offers += product.source === 'Annonce agriculteur' ? 1 : 0;
        if (!item.photo && product.photo) item.photo = product.photo;
        if (!item.price && (product.price || product.officialMin)) item.price = product.price || product.officialMin;
        grouped.set(key, item);
      });
    return [...grouped.values()]
      .sort((a, b) => (b.qty - a.qty) || (b.offers - a.offers) || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  function createChart(ctx, config) {
    if (!ctx || !window.Chart) return;
    adminCharts.push(new Chart(ctx, config));
  }

  function baseChartOptions(extra = {}) {
    const isDark = document.body.classList.contains('dark-mode');
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 850, easing: 'easeOutQuart' },
      plugins: {
        legend: { position: 'bottom', labels: { color: isDark ? '#e5e7eb' : '#334155', usePointStyle: true, padding: 8, boxWidth: 8, boxHeight: 8, font: { size: 10, weight: 700 } } },
        tooltip: { backgroundColor: isDark ? '#111827' : '#ffffff', titleColor: isDark ? '#ffffff' : '#111827', bodyColor: isDark ? '#e5e7eb' : '#374151', borderColor: 'rgba(148,163,184,.25)', borderWidth: 1 },
      },
      scales: extra.scales,
      ...extra,
    };
  }


  function chartTextColor() {
    return document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#475569';
  }

  function gridColor() {
    return document.body.classList.contains('dark-mode') ? 'rgba(226,232,240,.14)' : 'rgba(148,163,184,.16)';
  }

  function aggregateProductSales(sourceOrders = orders) {
    const rows = new Map();
    products.forEach((product) => {
      const key = normalizeText(product.name || '');
      if (!key) return;
      const existing = rows.get(key) || { name: product.name || 'Produit', sold: 0, orders: 0, stock: 0 };
      existing.stock += Number(product.qty || 0);
      rows.set(key, existing);
    });
    sourceOrders.forEach((order) => {
      (order.lignes || []).forEach((line) => {
        const key = normalizeText(line.produit_nom || '');
        if (!key) return;
        const current = rows.get(key) || { name: line.produit_nom || 'Produit', sold: 0, orders: 0, stock: 0 };
        current.sold += Number(line.quantite || 0);
        current.orders += 1;
        rows.set(key, current);
      });
    });
    return Array.from(rows.values()).filter(item => item.name);
  }

  function getRegionOrderStats(sourceOrders = orders, limit = 8) {
    const counts = new Map();
    sourceOrders.forEach((order) => {
      const coordsName = ALGERIA_WILAYAS.find(w => normalizeText(order.adresse_livraison || '').includes(normalizeText(w.name)));
      const name = coordsName?.name || (order.adresse_livraison ? String(order.adresse_livraison).split(',')[0] : 'Non renseignée');
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  function getLowStockProducts(limit = 7, sourceProducts = products) {
    return sourceProducts
      .filter(product => product.source === 'Annonce agriculteur' || product.source === 'Produit officiel')
      .map(product => ({ name: product.name || 'Produit', qty: Number(product.qty || 0), status: product.status || '' }))
      .filter(product => product.qty <= 10 || normalizeText(product.status).includes('stock faible') || normalizeText(product.status).includes('rupture'))
      .sort((a, b) => a.qty - b.qty || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  function getUserRoleStats() {
    const labels = ['Admin', 'Acheteur', 'Agriculteur', 'Transporteur', 'Autre'];
    const stats = { Admin: 0, Acheteur: 0, Agriculteur: 0, Transporteur: 0, Autre: 0 };
    $all('#adminUsersPage .admin-user-row').forEach((row) => {
      const role = normalizeText(row.dataset.role || row.querySelector('td:nth-child(3)')?.textContent || '');
      if (role.includes('admin')) stats.Admin += 1;
      else if (role.includes('acheteur') || role.includes('buyer')) stats.Acheteur += 1;
      else if (role.includes('agriculteur') || role.includes('farmer')) stats.Agriculteur += 1;
      else if (role.includes('transporteur') || role.includes('livreur')) stats.Transporteur += 1;
      else stats.Autre += 1;
    });
    if (!stats.Admin) stats.Admin = 1;
    return labels.map(label => ({ label, value: stats[label] }));
  }

  function createAccessibleEmptyChart(ctx, message = 'Aucune donnée') {
    if (!ctx) return;
    createChart(ctx, {
      type: 'bar',
      data: { labels: [message], datasets: [{ data: [0], backgroundColor: ['rgba(148,163,184,.35)'], borderRadius: 12 }] },
      options: baseChartOptions({ plugins: { ...baseChartOptions().plugins, legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: chartTextColor() } }, y: { beginAtZero: true, ticks: { color: chartTextColor() }, grid: { color: gridColor() } } } }),
    });
  }

  function initCharts() {
    if (!window.Chart) return;
    adminCharts.forEach(chart => chart.destroy());
    adminCharts = [];

    const { filteredOrders, filteredProducts } = getDashboardFilteredData();
    const dashboardProducts = filteredProducts.length ? filteredProducts : products;
    const categoryStats = getCategoryStats(dashboardProducts);
    const dashboardCategoryStats = getDashboardQuantityStats(dashboardProducts);
    const categoryLabels = categoryStats.map(item => item.label);
    const categoryValues = categoryStats.map(item => item.value);
    const dashboardLabels = dashboardCategoryStats.map(item => item.label);
    const dashboardValues = dashboardCategoryStats.map(item => item.value);

    const donutCtx = $id('adminDonutChart');
    createChart(donutCtx, {
      type: 'doughnut',
      data: { labels: categoryLabels, datasets: [{ data: categoryValues, backgroundColor: CATEGORY_COLORS, borderWidth: 3, borderColor: document.body.classList.contains('dark-mode') ? '#1f2937' : '#ffffff', hoverOffset: 10 }] },
      options: baseChartOptions({ cutout: '66%' }),
    });

    const barCtx = $id('adminBarChart');
    const topForBar = getPopularProducts(dashboardProducts, 7);
    createChart(barCtx, {
      type: 'bar',
      data: { labels: topForBar.map(p => p.name), datasets: [{ label: 'Quantité disponible', data: topForBar.map(p => p.qty), backgroundColor: '#22c55e', borderRadius: 12, maxBarThickness: 42 }] },
      options: baseChartOptions({
        plugins: { ...baseChartOptions().plugins, legend: { display: false } },
        scales: {
          x: { ticks: { color: document.body.classList.contains('dark-mode') ? '#cbd5e1' : '#475569' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: document.body.classList.contains('dark-mode') ? '#cbd5e1' : '#475569' }, grid: { color: 'rgba(148,163,184,.16)' } },
        },
      }),
    });

    const stockStatusCtx = $id('adminStockStatusChart');
    const stockStatusData = [
      dashboardProducts.filter(p => Number(p.qty || 0) > 5).length,
      dashboardProducts.filter(p => Number(p.qty || 0) > 0 && Number(p.qty || 0) <= 5).length,
      dashboardProducts.filter(p => Number(p.qty || 0) <= 0).length,
    ];
    createChart(stockStatusCtx, {
      type: 'doughnut',
      data: { labels: ['En stock', 'Stock faible', 'Rupture'], datasets: [{ data: stockStatusData, backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'], borderWidth: 3, borderColor: document.body.classList.contains('dark-mode') ? '#0f172a' : '#ffffff', hoverOffset: 8 }] },
      options: baseChartOptions({ cutout: '64%' }),
    });

    const topFiveCtx = $id('adminTopFiveChart');
    const topFive = getPopularProducts(dashboardProducts, 5);
    createChart(topFiveCtx, {
      type: 'bar',
      data: { labels: topFive.map(p => p.name), datasets: [{ label: 'Quantité', data: topFive.map(p => p.qty), backgroundColor: ['#22c55e','#3b82f6','#8b5cf6','#f59e0b','#64748b'], borderRadius: 10, maxBarThickness: 30 }] },
      options: baseChartOptions({
        plugins: { ...baseChartOptions().plugins, legend: { display: false } },
        scales: {
          x: { ticks: { color: chartTextColor() }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: chartTextColor(), precision: 0 }, grid: { color: gridColor() } },
        },
      }),
    });

    const dashboardCtx = $id('adminSalesChart');
    createChart(dashboardCtx, {
      type: 'bar',
      data: {
        labels: dashboardLabels,
        datasets: [{
          label: 'Quantité disponible',
          data: dashboardValues,
          backgroundColor: CATEGORY_COLORS.slice(0, dashboardLabels.length).map(c => `${c}dd`),
          borderColor: CATEGORY_COLORS.slice(0, dashboardLabels.length),
          borderWidth: 1,
          borderRadius: 14,
          maxBarThickness: 58,
        }]
      },
      options: baseChartOptions({
        plugins: { ...baseChartOptions().plugins, legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: document.body.classList.contains('dark-mode') ? '#cbd5e1' : '#475569', font: { weight: 700 } } },
          y: { beginAtZero: true, ticks: { color: document.body.classList.contains('dark-mode') ? '#cbd5e1' : '#475569' }, grid: { color: 'rgba(148,163,184,.16)' } },
        },
      }),
    });


    const topProductsCtx = $id('adminTopProductsChart');
    if (topProductsCtx) {
      let topSold = aggregateProductSales(filteredOrders).sort((a, b) => b.sold - a.sold).slice(0, 6);
      if (!topSold.some(item => item.sold > 0)) topSold = getPopularProducts(dashboardProducts, 6).map(p => ({ name: p.name, sold: p.qty, orders: p.offers, stock: p.qty }));
      if (topSold.length) {
        createChart(topProductsCtx, {
          type: 'bar',
          data: { labels: topSold.map(item => item.name), datasets: [{ label: 'Vendu', unit: 'unités', data: topSold.map(item => item.sold), backgroundColor: ['#16a34a','#22c55e','#84cc16','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6'], borderRadius: 14, maxBarThickness: 44 }] },
          options: baseChartOptions({ indexAxis: 'y', plugins: { ...baseChartOptions().plugins, legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { color: chartTextColor() }, grid: { color: gridColor() } }, y: { ticks: { color: chartTextColor(), font: { weight: 700 } }, grid: { display: false } } } }),
        });
      } else createAccessibleEmptyChart(topProductsCtx, 'Aucune vente');
    }

    const regionOrdersCtx = $id('adminRegionOrdersChart');
    if (regionOrdersCtx) {
      const regions = getRegionOrderStats(filteredOrders, 6);
      if (regions.length) {
        createChart(regionOrdersCtx, {
          type: 'bar',
          data: { labels: regions.map(item => item.name), datasets: [{ label: 'Commandes', unit: 'cmd', data: regions.map(item => item.count), backgroundColor: ['#2563eb','#3b82f6','#06b6d4','#14b8a6','#22c55e','#84cc16','#f59e0b','#fb7185'], borderRadius: 14, maxBarThickness: 42 }] },
          options: baseChartOptions({ indexAxis: 'y', plugins: { ...baseChartOptions().plugins, legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { color: chartTextColor() }, grid: { color: gridColor() } }, y: { ticks: { color: chartTextColor(), font: { weight: 700 } }, grid: { display: false } } } }),
        });
      } else createAccessibleEmptyChart(regionOrdersCtx, 'Aucune région');
    }

    const lowStockCtx = $id('adminLowStockChart');
    if (lowStockCtx) {
      const lowStock = getLowStockProducts(5, dashboardProducts);
      if (lowStock.length) {
        createChart(lowStockCtx, {
          type: 'bar',
          data: { labels: lowStock.map(item => item.name), datasets: [{ label: 'Stock', unit: 'restant', data: lowStock.map(item => item.qty), backgroundColor: lowStock.map(item => item.qty <= 3 ? '#ef4444' : item.qty <= 6 ? '#f97316' : '#f59e0b'), borderRadius: 12, maxBarThickness: 36 }] },
          options: baseChartOptions({ plugins: { ...baseChartOptions().plugins, legend: { display: false } }, scales: { x: { ticks: { color: chartTextColor(), maxRotation: 35, minRotation: 0 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: chartTextColor() }, grid: { color: gridColor() } } } }),
        });
      } else createAccessibleEmptyChart(lowStockCtx, 'Stock OK');
    }

    const usersCircleCtx = $id('adminUsersCircleChart');
    if (usersCircleCtx) {
      const roleStats = getUserRoleStats();
      createChart(usersCircleCtx, {
        type: 'doughnut',
        data: { labels: roleStats.map(item => item.label), datasets: [{ label: 'Comptes', unit: 'comptes', data: roleStats.map(item => item.value), backgroundColor: ['#111827','#3b82f6','#22c55e','#f59e0b','#8b5cf6'], borderWidth: 4, borderColor: document.body.classList.contains('dark-mode') ? '#1f2937' : '#ffffff', hoverOffset: 12 }] },
        options: baseChartOptions({ cutout: '64%' }),
      });
    }

    const transactionsCtx = $id('adminTransactionsChart');
    if (transactionsCtx) {
      const successCount = getSuccessfulOrders(filteredOrders).length;
      const failedCount = filteredOrders.filter(order => ['refusee', 'annulee', 'echouee', 'failed'].includes(order.statut)).length;
      createChart(transactionsCtx, {
        type: 'doughnut',
        data: { labels: ['Réussies', 'Échouées'], datasets: [{ label: 'Transactions', unit: 'trx', data: [successCount, failedCount], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 4, borderColor: document.body.classList.contains('dark-mode') ? '#1f2937' : '#ffffff', hoverOffset: 12 }] },
        options: baseChartOptions({ cutout: '70%' }),
      });
    }

    const leastProductsCtx = $id('adminLeastProductsChart');
    if (leastProductsCtx) {
      const weakProducts = aggregateProductSales(filteredOrders).sort((a, b) => a.sold - b.sold || a.orders - b.orders || a.stock - b.stock).slice(0, 6);
      if (weakProducts.length) {
        createChart(leastProductsCtx, {
          type: 'bar',
          data: { labels: weakProducts.map(item => item.name), datasets: [{ label: 'Faibles ventes', unit: 'unités', data: weakProducts.map(item => item.sold), backgroundColor: ['#fee2e2','#fecaca','#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b'], borderColor: '#ef4444', borderWidth: 1, borderRadius: 14, maxBarThickness: 40 }] },
          options: baseChartOptions({ indexAxis: 'y', plugins: { ...baseChartOptions().plugins, legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { color: chartTextColor() }, grid: { color: gridColor() } }, y: { ticks: { color: chartTextColor(), font: { weight: 700 } }, grid: { display: false } } } }),
        });
      } else createAccessibleEmptyChart(leastProductsCtx, 'Aucune donnée');
    }

    const stockVsSalesCtx = $id('adminStockVsSalesChart');
    if (stockVsSalesCtx) {
      const mix = aggregateProductSales(filteredOrders).sort((a, b) => (b.stock + b.sold) - (a.stock + a.sold)).slice(0, 6);
      if (mix.length) {
        createChart(stockVsSalesCtx, {
          type: 'bar',
          data: { labels: mix.map(item => item.name), datasets: [
            { type: 'bar', label: 'Stock', data: mix.map(item => item.stock), backgroundColor: 'rgba(59,130,246,.72)', borderRadius: 12, yAxisID: 'y' },
            { type: 'line', label: 'Ventes', data: mix.map(item => item.sold), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,.16)', tension: .42, pointRadius: 5, pointHoverRadius: 7, fill: false, yAxisID: 'y' }
          ] },
          options: baseChartOptions({ scales: { x: { ticks: { color: chartTextColor(), maxRotation: 35 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: chartTextColor() }, grid: { color: gridColor() } } } }),
        });
      } else createAccessibleEmptyChart(stockVsSalesCtx, 'Aucune donnée');
    }

    const statusCtx = $id('adminOrdersStatusChart');
    if (statusCtx) {
      const statuses = ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'refusee', 'annulee'];
      createChart(statusCtx, {
        type: 'pie',
        data: { labels: statuses.map(orderLabel), datasets: [{ data: statuses.map(s => orders.filter(o => o.statut === s).length), backgroundColor: ['#f59e0b','#3b82f6','#8b5cf6','#06b6d4','#22c55e','#ef4444','#64748b'], borderWidth: 2 }] },
        options: baseChartOptions(),
      });
    }

    const weeklyCtx = $id('adminWeeklyDeliveriesChart');
    if (weeklyCtx) {
      const weekly = [orders.filter(o => ['confirmee','en_preparation'].includes(o.statut)).length, orders.filter(o => o.statut === 'expediee').length, orders.filter(o => o.statut === 'livree').length, orders.filter(o => o.statut === 'refusee').length];
      createChart(weeklyCtx, {
        type: 'bar',
        data: { labels: ['À traiter', 'Expédiées', 'Livrées', 'Refusées'], datasets: [{ data: weekly, backgroundColor: ['#8b5cf6','#06b6d4','#22c55e','#ef4444'], borderRadius: 12 }] },
        options: baseChartOptions({ plugins: { ...baseChartOptions().plugins, legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,.16)' } } } }),
      });
    }
  }
  function dashboardBadge(status) {
    const cls = {
      en_attente: 'pending',
      confirmee: 'progress',
      en_preparation: 'progress',
      expediee: 'progress',
      livree: 'done',
      refusee: 'cancelled',
      annulee: 'cancelled',
    }[status] || 'pending';
    return `<span class="badge ${cls}">${orderLabel(status)}</span>`;
  }

  function getDashboardOrderRows(filteredOrders) {
    return filteredOrders.slice(0, 6).map((order) => {
      const buyer = order.acheteur || 'Acheteur';
      const date = order.date_creation ? new Date(order.date_creation).toLocaleDateString('fr-FR') : '—';
      return `
        <tr>
          <td>CMD-${order.id}</td>
          <td>${escapeHtml(buyer)}</td>
          <td>${dashboardBadge(order.statut)}</td>
          <td>${escapeHtml(date)}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="4">Aucune commande récente.</td></tr>';
  }

  function getDashboardPopularProducts(filteredProducts) {
    const popular = getPopularProducts(filteredProducts, 6);
    return popular.map((product, index) => `
        <div class="admin-product-card admin-popular-card">
          <span class="admin-rank-badge">#${index + 1}</span>
          <img src="${escapeHtml(product.photo || 'https://via.placeholder.com/240x140?text=Produit')}" alt="${escapeHtml(product.name || 'Produit')}">
          <h4>${escapeHtml(product.name || 'Produit')}</h4>
          <p>${money(product.price || 0)}</p>
          <small>${Number(product.qty || 0).toLocaleString('fr-FR')} unités · ${Number(product.offers || 0)} annonces</small>
        </div>
      `).join('') || '<p style="color:var(--admin-muted);margin:0;">Aucun produit disponible.</p>';
  }

  function getDashboardFilteredData() {
    const smart = normalizeText($id('adminDashboardGlobalSearch')?.value || '');

    const orderText = (order) => normalizeText(`${order.id || ''} ${order.adresse_livraison || ''} ${order.acheteur || ''} ${order.agriculteur || ''} ${order.statut || ''} ${order.total || ''} ${(order.lignes || []).map(l => l.produit_nom).join(' ')}`);
    const productText = (product) => normalizeText(`${product.id || ''} ${product.name || ''} ${product.seller || ''} ${product.type || ''} ${product.status || ''} ${getProductWilaya(product)} ${product.farmName || ''} ${product.qty || ''} ${product.price || ''}`);

    const filteredOrders = orders.filter((order) => !smart || orderText(order).includes(smart));
    const filteredProducts = products.filter((product) => !smart || productText(product).includes(smart));

    return { filteredOrders, filteredProducts };
  }


  function getDomUsersCount() {
    const rows = $all('#adminUsersPage .admin-user-row').filter(row => rowHasVisibleCells(row));
    return rows.length;
  }

  function getDynamicUsersCount(sourceOrders = orders) {
    const domCount = getDomUsersCount();
    if (domCount) return domCount;
    return new Set(sourceOrders.flatMap((order) => [order.acheteur, order.agriculteur]).filter(Boolean)).size;
  }

  function getTodayOrdersCount(sourceOrders = orders) {
    const today = new Date().toISOString().slice(0, 10);
    return sourceOrders.filter(order => String(order.date_creation || '').slice(0, 10) === today).length;
  }

  function getSystemAlerts() {
    const pendingUsers = $all('#adminPendingUsersBody .admin-user-row').filter(row => row.style.display !== 'none' && rowHasVisibleCells(row)).length;
    const pendingOrders = orders.filter(order => order.statut === 'en_attente').length;
    const refusedOrders = orders.filter(order => ['refusee', 'annulee'].includes(order.statut)).length;
    const lowStock = products.filter(product => product.source === 'Annonce agriculteur' && (Number(product.qty || 0) <= 5 || product.status === 'Stock faible' || product.status === 'Rupture')).length;
    const nonConforme = products.filter(isNonConforme).length;
    return { pendingUsers, pendingOrders, refusedOrders, lowStock, nonConforme, total: pendingUsers + pendingOrders + refusedOrders + lowStock + nonConforme };
  }

  function renderSettingsStats() {
    setStatNumber($id('adminSettingsUsersCount'), getDynamicUsersCount());
    setStatNumber($id('adminSettingsProductsCount'), products.length);
    setStatNumber($id('adminSettingsTodayOrdersCount'), getTodayOrdersCount());
    setStatNumber($id('adminSettingsAlertsCount'), getSystemAlerts().total);
  }

  function renderOrdersInsights() {
    const alertsBox = $id('adminDynamicAlerts');
    const alerts = getSystemAlerts();
    if (alertsBox) {
      const items = [];
      if (alerts.pendingOrders) items.push(`⏳ ${alerts.pendingOrders} commande(s) en attente de traitement`);
      if (alerts.refusedOrders) items.push(`🚫 ${alerts.refusedOrders} commande(s) refusée(s) / annulée(s)`);
      if (alerts.lowStock) items.push(`📉 ${alerts.lowStock} produit(s) en stock faible ou rupture`);
      if (alerts.nonConforme) items.push(`⚠️ ${alerts.nonConforme} annonce(s) hors prix officiel`);
      if (alerts.pendingUsers) items.push(`👥 ${alerts.pendingUsers} compte(s) utilisateur en validation`);
      alertsBox.innerHTML = items.length
        ? items.map((text, index) => `<div class="admin-alert-item" style="animation-delay:${index * 45}ms">${escapeHtml(text)}</div>`).join('')
        : '<div class="admin-empty-state compact">Aucune alerte pour le moment.</div>';
    }

    const topList = $id('adminTopFarmersList');
    if (topList) {
      const grouped = new Map();
      orders.forEach((order) => {
        const name = order.agriculteur || 'Agriculteur';
        const current = grouped.get(name) || { count: 0, total: 0, delivered: 0 };
        current.count += 1;
        current.total += Number(order.total || 0);
        if (order.statut === 'livree') current.delivered += 1;
        grouped.set(name, current);
      });
      const top = [...grouped.entries()].sort((a, b) => (b[1].count - a[1].count) || (b[1].total - a[1].total)).slice(0, 5);
      topList.innerHTML = top.length
        ? top.map(([name, item], index) => `<li><span class="admin-top-rank">#${index + 1}</span><strong>${escapeHtml(name)}</strong><small>${item.count} commande(s) · ${money(item.total)} · ${item.delivered} livrée(s)</small></li>`).join('')
        : '<li>Aucun agriculteur disponible.</li>';
    }
    renderSettingsStats();
  }

  function markLoading(scope, isLoading) {
    const page = $id(scope);
    if (!page) return;
    page.classList.toggle('admin-loading', !!isLoading);
  }

  async function loadAdminStats() {
    try {
      const response = await fetch('/api/admin/stats/');
      const data = await response.json();
      if (response.ok && data && data.success) adminStats = data;
    } catch (error) {
      console.warn('Stats admin API indisponible, fallback local.', error);
    }
    renderDashboardOverview();
    initCharts();
  }

  function getSalesTotalFromOrders(sourceOrders = orders) {
    return sourceOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  }

  function getSuccessfulOrders(sourceOrders = orders) {
    return sourceOrders.filter(order => ['livree', 'confirmee', 'en_preparation', 'expediee'].includes(order.statut));
  }

  function getLeastSoldProduct(filteredProducts = products, filteredOrders = orders) {
    const salesByName = new Map();
    filteredProducts.forEach(product => {
      const key = normalizeText(product.name || '');
      if (key) salesByName.set(key, { name: product.name, qty: 0, orders: 0 });
    });
    filteredOrders.forEach(order => {
      (order.lignes || []).forEach(line => {
        const key = normalizeText(line.produit_nom || '');
        if (!key) return;
        const current = salesByName.get(key) || { name: line.produit_nom, qty: 0, orders: 0 };
        current.qty += Number(line.quantite || 0);
        current.orders += 1;
        salesByName.set(key, current);
      });
    });
    const rows = Array.from(salesByName.values()).filter(item => item.name);
    if (!rows.length) return null;
    return rows.sort((a, b) => (a.qty - b.qty) || (a.orders - b.orders) || String(a.name).localeCompare(String(b.name)))[0];
  }

  function renderDashboardOverview() {
    const dashboard = $id('adminDashboardPage');
    if (!dashboard) return;

    const smartQuery = normalizeText($id('adminDashboardGlobalSearch')?.value || '');
    const baseData = getDashboardFilteredData();
    const filteredOrders = smartQuery ? baseData.filteredOrders : orders;
    const filteredProducts = smartQuery ? baseData.filteredProducts : products;
    const kpis = adminStats?.kpis || {};
    const filteredMode = Boolean(smartQuery);

    const ordersTotal = filteredMode ? filteredOrders.length : Number(kpis.total_commandes ?? filteredOrders.length);
    const productsTotal = filteredMode ? filteredProducts.length : Number(kpis.total_produits ?? filteredProducts.length);
    const successfulOrders = getSuccessfulOrders(filteredOrders);
    const lowProduct = getLeastSoldProduct(filteredProducts, filteredOrders);

    setStatNumber($id('adminTotalProductsValue'), productsTotal);
    setStatNumber($id('adminDashboardOrdersValue'), ordersTotal);
    setStatNumber($id('adminSuccessTransactionsValue'), successfulOrders.length);

    const productsSub = $id('adminTotalProductsSub');
    if (productsSub) productsSub.textContent = filteredMode ? `${filteredProducts.length} produit(s) filtré(s)` : `${Number(kpis.produits_officiels ?? 0).toLocaleString('fr-FR')} officiels · ${Number(kpis.produits_publies ?? 0).toLocaleString('fr-FR')} annonces`;
    const ordersSub = $id('adminDashboardOrdersSub');
    if (ordersSub) ordersSub.textContent = filteredMode ? `${filteredOrders.length} commande(s) filtrée(s)` : `${ordersTotal.toLocaleString('fr-FR')} commande(s) au total`;
    const successSub = $id('adminSuccessTransactionsSub');
    if (successSub) {
      const totalAmount = getSalesTotalFromOrders(successfulOrders);
      successSub.textContent = `${money(totalAmount)} · ${successfulOrders.length.toLocaleString('fr-FR')} transaction(s) réussie(s)`;
    }
    const lowValue = $id('adminLowProductValue');
    const lowSub = $id('adminLowProductSub');
    if (lowProduct) {
      if (lowValue) lowValue.textContent = lowProduct.name;
      if (lowSub) lowSub.textContent = `${Number(lowProduct.qty || 0).toLocaleString('fr-FR')} unité(s) vendue(s) · ${Number(lowProduct.orders || 0).toLocaleString('fr-FR')} commande(s)`;
    } else {
      if (lowValue) lowValue.textContent = '—';
      if (lowSub) lowSub.textContent = 'Aucune vente détectée pour le moment';
    }

    const productsTrend = $id('adminTotalProductsTrend');
    if (productsTrend) productsTrend.textContent = filteredMode ? 'Filtré' : '↗ Live';
    const ordersTrend = $id('adminTotalOrdersTrend');
    if (ordersTrend) ordersTrend.textContent = filteredMode ? 'Filtré' : '↗ Live';
    const successTrend = $id('adminSuccessTransactionsTrend');
    if (successTrend) successTrend.textContent = filteredMode ? 'Filtré' : 'Validées';

    const dashboardTable = dashboard.querySelector('.admin-table-wrapper tbody');
    if (dashboardTable) dashboardTable.innerHTML = getDashboardOrderRows(filteredOrders);

    const productGrid = dashboard.querySelector('.admin-products-grid');
    if (productGrid) productGrid.innerHTML = getDashboardPopularProducts(filteredProducts);

    renderSettingsStats();
  }
  function fillProductModal(product) {
    const cat = $id('adminProductCategoryInput');
    if (!cat) return;
    if (product && product.source === 'Annonce agriculteur') {
      cat.innerHTML = '<option value="Disponible">Disponible</option><option value="Stock faible">Stock faible</option><option value="Rupture">Rupture</option>';
      $id('adminProductNameInput').value = product.name || '';
      cat.value = product.status || 'Disponible';
      $id('adminProductMinInput').value = product.price ?? '';
      $id('adminProductMaxInput').value = product.qty ?? '';
      $id('adminProductPhotoInput').value = product.photo || '';
      $id('adminProductDescriptionInput').value = product.description || '';
      $id('adminProductNameInput').setAttribute('disabled', 'disabled');
    } else {
      cat.innerHTML = catalogues.map(item => `<option value="${escapeHtml(item.nom)}">${escapeHtml(item.nom)}</option>`).join('') || '<option value="">Aucun catalogue</option>';
      $id('adminProductNameInput').value = product?.name || '';
      cat.value = product?.type || 'Legume';
      $id('adminProductMinInput').value = product?.officialMin ?? '';
      $id('adminProductMaxInput').value = product?.officialMax ?? '';
      $id('adminProductPhotoInput').value = product?.photo || '';
      $id('adminProductDescriptionInput').value = product?.description || '';
      $id('adminProductNameInput').removeAttribute('disabled');
    }
  }

  function openProductModal(product = null) {
    currentProductModalMode = product ? 'edit' : 'create';
    currentEditingProduct = product;
    const title = $id('adminProductModalTitle');
    const subtitle = $id('adminProductModalSubtitle');
    if (title) title.textContent = product ? 'Modifier Produit' : 'Ajouter Produit';
    if (subtitle) subtitle.textContent = product ? (product.source === 'Annonce agriculteur' ? 'Modifier prix, quantité et statut du produit agriculteur.' : 'Modifier le produit officiel du catalogue admin.') : 'Ajouter un produit officiel au catalogue admin.';
    fillProductModal(product);
    const modal = $id('adminAddProductModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeProductModal() {
    currentProductModalMode = 'create';
    currentEditingProduct = null;
    fillProductModal(null);
    const title = $id('adminProductModalTitle');
    const subtitle = $id('adminProductModalSubtitle');
    if (title) title.textContent = 'Ajouter Produit';
    if (subtitle) subtitle.textContent = 'Ajouter un produit officiel au catalogue admin.';
    const modal = $id('adminAddProductModal');
    if (modal) modal.style.display = 'none';
  }

  async function loadCatalogues() {
    try {
      const response = await fetch('/api/produits/catalogues/');
      const data = await response.json();
      catalogues = Array.isArray(data) ? data : [];
      renderCataloguesTable();
      updateCatalogueFilters();
    } catch (error) { console.error('Erreur chargement catalogues :', error); }
  }

  function updateCatalogueFilters() {
    const filter = $id('adminFilterType');
    const select = $id('adminProductCategoryInput');
    const options = catalogues.map(item => `<option value="${escapeHtml(item.nom)}">${escapeHtml(item.nom)}</option>`).join('');
    if (filter) {
      const current = filter.value;
      filter.innerHTML = '<option value="all">Tous types</option>' + options;
      filter.value = [...filter.options].some(opt => opt.value === current) ? current : 'all';
    }
    if (select && currentProductModalMode !== 'edit') {
      const current = select.value;
      select.innerHTML = options || '<option value="">Aucun catalogue</option>';
      select.value = [...select.options].some(opt => opt.value === current) ? current : (select.options[0]?.value || '');
    }
  }

  function renderCataloguesTable() {
    const tbody = $id('adminCatalogTableBody');
    if (!tbody) return;
    tbody.innerHTML = catalogues.length ? catalogues.map(item => `
      <tr>
        <td>${escapeHtml(item.nom)}</td>
        <td>${item.produits_count ?? 0}</td>
        <td><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="admin-btn blue-btn admin-edit-catalogue-btn" data-name="${escapeHtml(item.nom)}">Modifier</button><button class="admin-btn gray-btn admin-delete-catalogue-btn" data-name="${escapeHtml(item.nom)}">Supprimer</button></div></td>
      </tr>`).join('') : '<tr><td colspan="3">Aucun catalogue.</td></tr>';
    $all('.admin-edit-catalogue-btn').forEach(btn => btn.onclick = () => openCatalogueModal(btn.dataset.name));
    $all('.admin-delete-catalogue-btn').forEach(btn => btn.onclick = () => deleteCatalogue(btn.dataset.name));
  }

  function openCatalogueModal(name = '') {
    currentCatalogueModalMode = name ? 'edit' : 'create';
    currentEditingCatalogue = name || null;
    if ($id('adminCatalogueNameInput')) $id('adminCatalogueNameInput').value = name || '';
    if ($id('adminCatalogueModalTitle')) $id('adminCatalogueModalTitle').textContent = name ? 'Modifier Catalogue' : 'Ajouter Catalogue';
    if ($id('adminCatalogueModal')) $id('adminCatalogueModal').style.display = 'flex';
  }

  function closeCatalogueModal() {
    currentCatalogueModalMode = 'create';
    currentEditingCatalogue = null;
    if ($id('adminCatalogueNameInput')) $id('adminCatalogueNameInput').value = '';
    if ($id('adminCatalogueModalTitle')) $id('adminCatalogueModalTitle').textContent = 'Ajouter Catalogue';
    if ($id('adminCatalogueModal')) $id('adminCatalogueModal').style.display = 'none';
  }

  async function saveCatalogue() {
    const nom = ($id('adminCatalogueNameInput')?.value || '').trim();
    if (!nom) return notify('Saisissez le nom du catalogue.');
    const url = currentCatalogueModalMode === 'edit' && currentEditingCatalogue
      ? `/api/produits/catalogues/${encodeURIComponent(currentEditingCatalogue)}/modifier/`
      : '/api/produits/catalogues/ajouter/';
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom }) });
    const data = await response.json();
    if (!response.ok || !data.success) return notify(data.error || 'Enregistrement impossible');
    closeCatalogueModal();
    await loadCatalogues();
    await loadProduits();
    notify('Catalogue enregistré avec succès.');
  }

  async function deleteCatalogue(name) {
    if (!window.confirm(`Supprimer le catalogue ${name} ?`)) return;
    const response = await fetch(`/api/produits/catalogues/${encodeURIComponent(name)}/supprimer/`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok || !data.success) return notify(data.error || 'Suppression impossible');
    await loadCatalogues();
    notify('Catalogue supprimé avec succès.');
  }

  async function loadProduits() {
    markLoading('adminProductsPage', true);
    try {
      const response = await fetch('/api/produits/catalog/?scope=admin');
      const data = await response.json();
      products = (Array.isArray(data) ? data : []).map((p, index) => ({
        id: p.id ?? index + 1,
        dbId: p.db_id ?? null,
        source: p.kind === 'listing' ? 'Annonce agriculteur' : 'Produit officiel',
        name: p.nom || '', type: p.categorie || '', qty: Number(p.quantite ?? 0),
        status: p.statut || (p.kind === 'listing' ? 'Disponible' : 'Officiel'),
        price: Number(p.prix ?? p.prix_min ?? 0), officialMin: Number(p.prix_min ?? 0), officialMax: Number(p.prix_max ?? 0),
        seller: p.vendeur_nom || (p.kind === 'listing' ? 'Agriculteur' : 'Admin'), photo: p.photo || '', description: p.description || '',
        wilaya: p.wilaya || '', commune: p.commune || '', farmName: p.ferme_nom || ''
      }));
      await loadAdminStats();
      renderProductsTable();
      renderDashboardOverview();
      renderOrdersInsights();
      initCharts();
    } catch (error) { console.error('Erreur chargement produits :', error); notify('Erreur chargement produits', 'error'); }
    finally { markLoading('adminProductsPage', false); }
  }

  function isNonConforme(product) {
    return product.source === 'Annonce agriculteur' && (product.price < product.officialMin || product.price > product.officialMax);
  }

  function getFilteredProducts() {
    const searchGlobal = normalizeText($id('adminGlobalProductSearch')?.value || '');
    const searchTable = normalizeText($id('adminSearchTableProduct')?.value || '');
    const typeFilter = $id('adminFilterType')?.value || 'all';
    const statusFilter = $id('adminFilterStatusProduct')?.value || 'all';
    const wilayaFilter = normalizeText($id('adminFilterWilayaProduct')?.value || 'all');
    return products.filter(product => {
      const text = normalizeText(`${product.id} ${product.name} ${product.type} ${product.status} ${product.seller} ${getProductWilaya(product)} ${product.farmName || ''}`);
      return (!searchGlobal || text.includes(searchGlobal))
        && (!searchTable || text.includes(searchTable))
        && (typeFilter === 'all' || product.type === typeFilter)
        && (statusFilter === 'all' || product.status === statusFilter)
        && (wilayaFilter === 'all' || !wilayaFilter || text.includes(wilayaFilter));
    });
  }

  function bindProductActionButtons() {
    $all('.admin-edit-product-btn').forEach(btn => btn.onclick = () => {
      const kind = btn.dataset.kind;
      const dbId = Number(btn.dataset.id);
      const product = products.find(p => p.dbId === dbId && ((kind === 'listing' && p.source === 'Annonce agriculteur') || (kind === 'official' && p.source === 'Produit officiel')));
      if (product) openProductModal(product);
    });
    $all('.admin-delete-product-btn').forEach(btn => btn.onclick = () => deleteProduct(btn.dataset.kind, btn.dataset.id));
  }

  function renderProductsTable() {
    const tbody = $id('adminProductTableBody');
    const farmerBody = $id('adminFarmerProductsTableBody');
    if (!tbody) return;
    const filtered = getFilteredProducts();
    const official = filtered.filter(p => p.source === 'Produit officiel');
    const farmer = filtered.filter(p => p.source === 'Annonce agriculteur');
    setStatNumber($id('adminTotalProducts'), filtered.length);
    setStatNumber($id('adminInStock'), filtered.filter(p => p.qty > 0).length);
    setStatNumber($id('adminNonConformeCount'), filtered.filter(isNonConforme).length);
    if ($id('adminTopSale')) $id('adminTopSale').textContent = filtered.length ? [...filtered].sort((a, b) => b.qty - a.qty)[0].name : '--';

    tbody.innerHTML = official.length ? official.map(product => `
      <tr>
        <td>${escapeHtml(product.id)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.type)}</td>
        <td>${product.qty}</td>
        <td><span class="status active">${escapeHtml(product.status)}</span></td>
        <td>${money(product.price)}</td>
        <td>${money(product.officialMin)}</td>
        <td>${money(product.officialMax)}</td>
        <td><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="admin-btn blue-btn admin-edit-product-btn" data-kind="official" data-id="${product.dbId}">Modifier</button><button class="admin-btn gray-btn admin-delete-product-btn" data-kind="official" data-id="${product.dbId}">Supprimer</button></div></td>
      </tr>`).join('') : '<tr><td colspan="9">Aucun produit officiel.</td></tr>';

    if (farmerBody) {
      farmerBody.innerHTML = farmer.length ? farmer.map(product => `
        <tr>
          <td>${escapeHtml(product.id)}</td>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(product.seller)}</td>
          <td>${escapeHtml(product.type)}</td>
          <td>${escapeHtml(getProductWilaya(product) || '—')}</td>
          <td>${product.qty}</td>
          <td><span class="status ${product.status === 'Rupture' ? 'cancelled' : product.status === 'Stock faible' ? 'pending' : 'active'}">${escapeHtml(product.status)}${isNonConforme(product) ? ' ⚠️' : ''}</span></td>
          <td>${money(product.price)}</td>
          <td><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="admin-btn blue-btn admin-edit-product-btn" data-kind="listing" data-id="${product.dbId}">Modifier</button><button class="admin-btn gray-btn admin-delete-product-btn" data-kind="listing" data-id="${product.dbId}">Supprimer</button></div></td>
        </tr>`).join('') : '<tr><td colspan="9">Aucune annonce agriculteur.</td></tr>';
    }
    bindProductActionButtons();
    initCharts();
    renderDashboardOverview();
  }

  async function addOfficialProduct() {
    const nom = ($id('adminProductNameInput')?.value || '').trim();
    const categorie = $id('adminProductCategoryInput')?.value || 'Legume';
    const prixMin = Number($id('adminProductMinInput')?.value || 0);
    const prixMax = Number($id('adminProductMaxInput')?.value || 0);
    const photo = ($id('adminProductPhotoInput')?.value || '').trim();
    const description = ($id('adminProductDescriptionInput')?.value || '').trim();
    if (!nom) return notify('Saisissez le nom du produit.');
    if (prixMin <= 0 || prixMax <= 0) return notify('Saisissez des prix valides.');
    const response = await fetch('/api/produits/ajouter/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, categorie, prix_min: prixMin, prix_max: prixMax, photo, description }) });
    const data = await response.json();
    if (!response.ok || !data.success) return notify(data.error || 'Ajout impossible');
    closeProductModal(); await loadProduits(); notify('Produit ajouté avec succès.');
  }

  async function updateProduct() {
    if (!currentEditingProduct) return;
    let payload;
    let kind;
    if (currentEditingProduct.source === 'Annonce agriculteur') {
      kind = 'listing';
      payload = {
        prix: Number($id('adminProductMinInput')?.value || currentEditingProduct.price),
        quantite: Number($id('adminProductMaxInput')?.value || currentEditingProduct.qty),
        statut: $id('adminProductCategoryInput')?.value || currentEditingProduct.status,
        photo: ($id('adminProductPhotoInput')?.value || '').trim(),
        description: ($id('adminProductDescriptionInput')?.value || '').trim(),
      };
    } else {
      kind = 'official';
      payload = {
        nom: ($id('adminProductNameInput')?.value || '').trim(),
        categorie: $id('adminProductCategoryInput')?.value || 'Legume',
        prix_min: Number($id('adminProductMinInput')?.value || 0),
        prix_max: Number($id('adminProductMaxInput')?.value || 0),
        photo: ($id('adminProductPhotoInput')?.value || '').trim(),
        description: ($id('adminProductDescriptionInput')?.value || '').trim(),
      };
    }
    const response = await fetch(`/api/produits/produits/${kind}/${currentEditingProduct.dbId}/modifier/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok || !data.success) return notify(data.error || 'Modification impossible');
    closeProductModal(); await loadProduits(); notify('Produit modifié avec succès.');
  }

  async function deleteProduct(kind, dbId) {
    if (!window.confirm('Confirmer la suppression ?')) return;
    const response = await fetch(`/api/produits/produits/${kind}/${dbId}/supprimer/`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok || !data.success) return notify(data.error || 'Suppression impossible');
    await loadProduits(); notify('Produit supprimé avec succès.');
  }


  function printEsc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function readonlyField(label, value, wide) {
    return '<label class="admin-print-field '+(wide ? 'wide' : '')+'"><span>'+printEsc(label)+'</span><input value="'+printEsc(value || '—')+'" readonly aria-readonly="true" tabindex="-1"></label>';
  }

  function showAdminPrintForm(title, subtitle, bodyHtml) {
    const modal = $id('adminPrintFormModal');
    const content = $id('adminPrintFormContent');
    if (!modal || !content) return;
    $id('adminPrintFormTitle').textContent = title || 'Formulaire';
    $id('adminPrintFormSubtitle').textContent = subtitle || 'Informations verrouillées, prêtes à imprimer.';
    content.innerHTML = bodyHtml;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-modal-open');
    $id('adminPrintFormBtn')?.focus();
  }

  function closeAdminPrintForm() {
    const modal = $id('adminPrintFormModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-modal-open');
  }

  window.adminPrintAdminForm = showAdminPrintForm;

  function buildOrderPrintForm(order) {
    const lines = Array.isArray(order.lignes) ? order.lignes : [];
    const livraison = order.livraison || {};
    const created = order.date_creation ? new Date(order.date_creation).toLocaleString('fr-FR') : '—';
    const modified = order.date_modification ? new Date(order.date_modification).toLocaleString('fr-FR') : '—';
    const acheteur = order.acheteur_info || {};
    const agriculteur = order.agriculteur_info || {};
    const transporteur = order.transporteur_info || {};
    const totalQty = lines.reduce((sum, line) => sum + Number(line.quantite || 0), 0);
    return '<section class="admin-print-sheet" aria-label="Formulaire commande complet">'
      + '<div class="admin-print-brand"><strong>AgriGov</strong><span>Formulaire officiel complet de commande</span></div>'
      + '<div class="admin-print-grid">'
      + readonlyField('Référence commande', 'CMD-' + order.id)
      + readonlyField('Date création', created)
      + readonlyField('Dernière modification', modified)
      + readonlyField('Statut commande', orderLabel(order.statut))
      + readonlyField('Total commande', money(order.total))
      + readonlyField('Nombre de lignes / quantité', lines.length + ' ligne(s) / ' + totalQty)
      + readonlyField('Acheteur - nom', acheteur.nom || order.acheteur || '—')
      + readonlyField('Acheteur - email', acheteur.email || '—')
      + readonlyField('Acheteur - téléphone', acheteur.telephone || '—')
      + readonlyField('Agriculteur - nom', agriculteur.nom || order.agriculteur || '—')
      + readonlyField('Agriculteur - email', agriculteur.email || '—')
      + readonlyField('Agriculteur - téléphone', agriculteur.telephone || '—')
      + readonlyField('Transporteur - nom', transporteur.nom || 'Non assigné')
      + readonlyField('Transporteur - email', transporteur.email || '—')
      + readonlyField('Transporteur - téléphone', transporteur.telephone || '—')
      + readonlyField('Statut livraison', (livraison.status || 'non_assignee').replaceAll('_',' '))
      + readonlyField('Départ', livraison.lieu_depart || order.agriculteur || '—', true)
      + readonlyField('Destination / adresse livraison', livraison.lieu_destination || order.adresse_livraison || '—', true)
      + readonlyField('Note commande', order.note || 'Aucune note', true)
      + '</div>'
      + '<h4>Produits commandés</h4>'
      + '<table class="admin-print-table"><thead><tr><th>Produit</th><th>Quantité</th><th>Prix unitaire</th><th>Sous-total</th></tr></thead><tbody>'
      + (lines.map(line => '<tr><td>'+printEsc(line.produit_nom || 'Produit')+'</td><td>'+printEsc(line.quantite)+'</td><td>'+printEsc(money(line.prix_unitaire))+'</td><td>'+printEsc(money(line.sous_total))+'</td></tr>').join('') || '<tr><td colspan="4">Aucun produit</td></tr>')
      + '</tbody></table>'
      + '<div class="admin-print-signatures"><span>Signature Admin</span><span>Signature Transporteur</span><span>Signature Acheteur</span></div>'
      + '</section>';
  }

  function printOrderForm(orderId) {
    const order = orders.find(o => String(o.id) === String(orderId));
    if (!order) return notify('Commande introuvable.', 'error');
    closeOrderDetails();
    showAdminPrintForm('Formulaire commande CMD-' + order.id, 'Données auto-remplies et verrouillées.', buildOrderPrintForm(order));
  }

  async function loadOrders() {
    const tbody = $id('adminOrdersTable');
    markLoading('adminOrdersPage', true);
    if (tbody) tbody.innerHTML = '<tr><td colspan="6"><div class="admin-empty-state compact">Chargement dynamique des commandes...</div></td></tr>';
    try {
      const response = await fetch('/api/produits/commandes/');
      orders = await response.json();
      await loadAdminStats();
      renderOrdersTable();
      renderDashboardOverview();
      renderOrdersInsights();
      initCharts();
      
    } catch (error) {
      console.error(error);
      notify('Impossible de charger les commandes.', 'error');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6">Impossible de charger les commandes.</td></tr>';
    } finally {
      markLoading('adminOrdersPage', false);
    }
  }

  function orderSearchText(order) {
    const lines = Array.isArray(order.lignes) ? order.lignes : [];
    const produits = lines.map(line => line.produit_nom || '').join(' ');
    const acheteur = order.acheteur_info || {};
    const agriculteur = order.agriculteur_info || {};
    const transporteur = order.transporteur_info || {};
    const livraison = order.livraison || {};
    return normalizeText([
      'CMD-' + order.id, order.id, order.statut, order.adresse_livraison, order.note,
      order.acheteur, acheteur.nom, acheteur.email, acheteur.telephone,
      order.agriculteur, agriculteur.nom, agriculteur.email, agriculteur.telephone,
      transporteur.nom, transporteur.email, transporteur.telephone,
      livraison.status, livraison.lieu_depart, livraison.lieu_destination, produits
    ].filter(Boolean).join(' '));
  }

  function getFilteredOrders() {
    const search = normalizeText($id('adminOrdersSearchInput')?.value || '');
    const status = $id('adminStatusFilter')?.value || 'all';
    const region = normalizeText($id('adminRegionFilter')?.value || 'all');
    return orders.filter(order => {
      const text = orderSearchText(order);
      const matchesStatus = status === 'all' || order.statut === status || (status === 'pending' && order.statut === 'en_attente') || (status === 'delivered' && order.statut === 'livree') || (status === 'in transit' && ['confirmee','en_preparation','expediee'].includes(order.statut));
      const matchesRegion = region === 'all' || !region || text.includes(region);
      return (!search || text.includes(search)) && matchesStatus && matchesRegion;
    });
  }

  function orderPersonCard(title, person, icon, extra) {
    person = person || {};
    const query = person.email && person.email !== '—' ? person.email : (person.nom || '');
    const role = normalizeText(person.role || title || 'all');
    const canOpen = query && query !== 'Non assigné';
    return '<article class="admin-order-person-card '+(canOpen ? 'is-clickable' : 'is-disabled')+'" tabindex="0" role="button" data-open-user-profile="1" data-user-query="'+escapeHtml(query)+'" data-user-id="'+escapeHtml(person.id || '')+'" data-user-email="'+escapeHtml(person.email || '')+'" data-user-role="'+escapeHtml(role)+'" aria-label="Voir '+escapeHtml(title)+' dans gestion des utilisateurs"><div class="admin-order-person-icon">'+icon+'</div><div><span>'+escapeHtml(title)+'</span><strong>'+escapeHtml(person.nom || 'Non assigné')+'</strong><small>'+escapeHtml(person.email || '—')+'</small><small>'+escapeHtml(person.telephone || '—')+'</small>'+(extra ? '<em>'+escapeHtml(extra)+'</em>' : '')+(canOpen ? '<button class="admin-user-jump-btn" type="button" tabindex="-1">Voir dans utilisateurs</button>' : '')+'</div></article>';
  }

  function openOrderPersonInUsers(card) {
    if (!card) return;
    const query = card.dataset.userQuery || '';
    const role = normalizeText(card.dataset.userRole || 'all');
    if (!query || query === 'Non assigné') return notify('Utilisateur non assigné.', 'warning');
    closeOrderDetails();
    if (typeof window.adminOpenPageSafe === 'function') window.adminOpenPageSafe('adminUsersPage');
    else $id('adminUsersPage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const search = $id('adminUsersSearchInput');
    const roleFilter = $id('adminUsersRoleFilter');
    const statusFilter = $id('adminUsersStatusFilter');
    if (search) search.value = query;
    if (statusFilter) statusFilter.value = 'all';
    if (roleFilter) {
      const wanted = ['acheteur','agriculteur','transporteur'].includes(role) ? role : 'all';
      roleFilter.value = wanted;
    }
    renderUsersDashboard();
    const targetId = card.dataset.userId || '';
    const targetEmail = normalizeText(card.dataset.userEmail || query);
    let firstVisible = $all('#adminUsersPage .admin-user-row').find(row => {
      const sameId = targetId && String(row.dataset.userId || '') === String(targetId);
      const sameEmail = targetEmail && normalizeText(row.dataset.userEmail || row.textContent || '').includes(targetEmail);
      return row.style.display !== 'none' && rowHasVisibleCells(row) && (sameId || sameEmail);
    });
    if (!firstVisible) firstVisible = $all('#adminUsersPage .admin-user-row').find(row => row.style.display !== 'none' && rowHasVisibleCells(row));
    firstVisible?.classList.add('admin-user-row-highlight');
    firstVisible?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => firstVisible?.classList.remove('admin-user-row-highlight'), 2200);
  }

  function openOrderDetails(orderId) {
    const order = orders.find(o => String(o.id) === String(orderId));
    const modal = $id('adminOrderDetailsModal');
    const content = $id('adminOrderDetailsContent');
    if (!order || !modal || !content) return;
    const lines = Array.isArray(order.lignes) ? order.lignes : [];
    const created = order.date_creation ? new Date(order.date_creation).toLocaleString('fr-FR') : '—';
    const livraison = order.livraison || {};
    const transportStatus = livraison.status || 'non_assignee';
    $id('adminOrderModalTitle').textContent = 'Commande CMD-' + order.id;
    $id('adminOrderModalSubtitle').textContent = created + ' • ' + money(order.total) + ' • ' + orderLabel(order.statut);
    content.innerHTML = '<div class="admin-order-modal-actions"><button class="admin-btn primary-btn" type="button" data-print-order="'+order.id+'">🖨️ Imprimer formulaire</button></div><section class="admin-order-detail-summary"><div><span>Statut commande</span>'+orderStatusBadge(order.statut)+'</div><div><span>Total</span><strong>'+money(order.total)+'</strong></div><div><span>Livraison</span><strong>'+escapeHtml(transportStatus.replaceAll('_',' '))+'</strong></div><div><span>Adresse</span><strong>'+escapeHtml(order.adresse_livraison || '—')+'</strong></div></section><section class="admin-order-people-grid" aria-label="Acteurs liés à la commande">'+orderPersonCard('Acheteur', order.acheteur_info || { nom: order.acheteur }, '🛒')+orderPersonCard('Agriculteur', order.agriculteur_info || { nom: order.agriculteur }, '🌾')+orderPersonCard('Transporteur', order.transporteur_info, '🚚', transportStatus === 'non_assignee' ? 'Transporteur non assigné' : transportStatus.replaceAll('_',' '))+'</section><section class="admin-order-route-card"><h4>Parcours livraison</h4><div class="admin-order-route-line"><span>Départ</span><strong>'+escapeHtml(livraison.lieu_depart || order.agriculteur || '—')+'</strong></div><div class="admin-order-route-line"><span>Destination</span><strong>'+escapeHtml(livraison.lieu_destination || order.adresse_livraison || '—')+'</strong></div><div class="admin-order-route-line"><span>Note</span><strong>'+escapeHtml(order.note || 'Aucune note')+'</strong></div></section><section class="admin-order-products-card"><h4>Produits commandés</h4><div class="admin-order-lines">'+(lines.map(line => '<div class="admin-order-line"><strong>'+escapeHtml(line.produit_nom || 'Produit')+'</strong><span>'+line.quantite+' × '+money(line.prix_unitaire)+'</span><b>'+money(line.sous_total)+'</b></div>').join('') || '<div class="admin-empty-state compact">Aucun produit dans cette commande.</div>')+'</div></section>';
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-modal-open');
    $id('adminCloseOrderModalBtn')?.focus();
  }

  function closeOrderDetails() {
    const modal = $id('adminOrderDetailsModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-modal-open');
  }

  function renderOrdersTable() {
    const tbody = $id('adminOrdersTable');
    if (!tbody) return;
    const filtered = getFilteredOrders();
    setStatNumber($id('adminTotalOrdersCount'), filtered.length);
    if ($id('adminSuccessRate')) {
      const closed = filtered.filter(o => ['livree', 'confirmee', 'en_preparation', 'expediee'].includes(o.statut)).length;
      setStatNumber($id('adminSuccessRate'), filtered.length ? Math.round((closed / filtered.length) * 100) : 0, '%');
    }
    const pendingCount = filtered.filter(o => ['en_attente','confirmee','en_preparation','expediee'].includes(o.statut)).length;
    setStatNumber($id('adminPendingOrdersCount'), pendingCount);
    const lateCount = filtered.filter(o => ['refusee','annulee'].includes(o.statut)).length;
    setStatNumber($id('adminLateOrdersCount'), lateCount);
    renderOrdersInsights();
    tbody.innerHTML = filtered.map(order => {
      const lines = Array.isArray(order.lignes) ? order.lignes : [];
      const firstLine = lines[0];
      const productsLabel = lines.length > 1 ? escapeHtml(firstLine?.produit_nom || 'Produits') + ' +' + (lines.length - 1) : escapeHtml(firstLine ? firstLine.produit_nom : '-');
      const transporteur = order.transporteur_info?.nom && order.transporteur_info.nom !== 'Non assigné' ? order.transporteur_info.nom : 'Non assigné';
      return '<tr class="admin-order-row" data-order-id="'+order.id+'" tabindex="0" role="button" aria-label="Ouvrir les détails de la commande CMD-'+order.id+'"><td><strong>CMD-'+order.id+'</strong></td><td>'+escapeHtml(order.acheteur || order.acheteur_info?.nom || 'Acheteur')+'</td><td>'+escapeHtml(order.agriculteur || order.agriculteur_info?.nom || 'Agriculteur')+'</td><td><span class="admin-transport-pill '+(transporteur === 'Non assigné' ? 'muted' : '')+'">'+escapeHtml(transporteur)+'</span></td><td>'+productsLabel+'</td><td>'+escapeHtml(order.adresse_livraison || '—')+'</td><td>'+orderStatusBadge(order.statut)+'</td><td><strong>'+money(order.total)+'</strong></td><td><div class="admin-order-row-actions"><button class="admin-order-details-btn" type="button" data-order-id="'+order.id+'" aria-label="Voir détails CMD-'+order.id+'">Voir</button><button class="admin-order-print-btn" type="button" data-print-order="'+order.id+'" aria-label="Imprimer formulaire CMD-'+order.id+'">Imprimer</button></div></td></tr>';
    }).join('') || '<tr><td colspan="9"><div class="admin-empty-state compact">Aucune commande trouvée.</div></td></tr>';
  }

  document.addEventListener('click', (event) => {
    const printBtn = event.target.closest('[data-print-order]');
    const personCard = event.target.closest('[data-open-user-profile]');
    const detailBtn = event.target.closest('.admin-order-details-btn');
    const row = event.target.closest('.admin-order-row');
    if (printBtn) { event.preventDefault(); event.stopPropagation(); printOrderForm(printBtn.dataset.printOrder); }
    else if (personCard) { event.preventDefault(); event.stopPropagation(); openOrderPersonInUsers(personCard); }
    else if (detailBtn) { event.preventDefault(); event.stopPropagation(); openOrderDetails(detailBtn.dataset.orderId); }
    else if (row) openOrderDetails(row.dataset.orderId);
    if (event.target.id === 'adminOrderDetailsModal') closeOrderDetails();
    if (event.target.id === 'adminPrintFormModal') closeAdminPrintForm();
    if (event.target.closest('#adminCloseOrderModalBtn')) closeOrderDetails();
    if (event.target.closest('#adminClosePrintFormBtn')) closeAdminPrintForm();
    if (event.target.closest('#adminPrintFormBtn')) window.print();
  });

  document.addEventListener('keydown', (event) => {
    const personCard = event.target.closest?.('[data-open-user-profile]');
    if (personCard && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openOrderPersonInUsers(personCard); return; }
    const row = event.target.closest?.('.admin-order-row');
    if (row && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openOrderDetails(row.dataset.orderId); }
    if (event.key === 'Escape') { closeOrderDetails(); closeAdminPrintForm(); }
  });

  function initProductsEvents() {
    ['adminGlobalProductSearch', 'adminSearchTableProduct', 'adminFilterType', 'adminFilterStatusProduct', 'adminFilterWilayaProduct'].forEach(id => {
      const el = $id(id);
      if (!el) return;
      el.addEventListener('input', renderProductsTable);
      el.addEventListener('change', renderProductsTable);
    });
    $id('adminAddCatalogueBtn')?.addEventListener('click', (e) => { e.preventDefault(); openCatalogueModal(); });
    $id('adminAddCatalogueAsideBtn')?.addEventListener('click', (e) => { e.preventDefault(); openCatalogueModal(); });
    $id('adminAddProductBtn')?.addEventListener('click', async () => { await loadCatalogues(); openProductModal(); });
    $id('adminCloseCatalogueModalBtn')?.addEventListener('click', closeCatalogueModal);
    $id('adminCancelCatalogueModalBtn')?.addEventListener('click', closeCatalogueModal);
    $id('adminSaveCatalogueModalBtn')?.addEventListener('click', (e) => { e.preventDefault(); saveCatalogue(); });
    $id('adminCatalogueModal')?.addEventListener('click', (e) => { if (e.target.id === 'adminCatalogueModal') closeCatalogueModal(); });
    $id('adminCloseProductModalBtn')?.addEventListener('click', closeProductModal);
    $id('adminCancelProductModalBtn')?.addEventListener('click', closeProductModal);
    $id('adminSaveProductModalBtn')?.addEventListener('click', () => currentProductModalMode === 'edit' ? updateProduct() : addOfficialProduct());
    $id('adminAddProductModal')?.addEventListener('click', (e) => { if (e.target.id === 'adminAddProductModal') closeProductModal(); });
  }


  function buildOrdersListPrintForm(list) {
    const rows = (list || []).map(order => {
      const transporteur = order.transporteur_info?.nom && order.transporteur_info.nom !== 'Non assigné' ? order.transporteur_info.nom : ((order.livraison?.status || 'non_assignee').replaceAll('_',' '));
      return '<tr><td>CMD-'+printEsc(order.id)+'</td><td>'+printEsc(order.acheteur_info?.nom || order.acheteur || '—')+'</td><td>'+printEsc(order.agriculteur_info?.nom || order.agriculteur || '—')+'</td><td>'+printEsc(transporteur || '—')+'</td><td>'+printEsc(orderLabel(order.statut))+'</td><td>'+printEsc(money(order.total))+'</td></tr>';
    }).join('') || '<tr><td colspan="6">Aucune commande</td></tr>';
    return '<section class="admin-print-sheet"><div class="admin-print-brand"><strong>AgriGov</strong><span>Liste des commandes</span></div><table class="admin-print-table"><thead><tr><th>ID</th><th>Acheteur</th><th>Agriculteur</th><th>Transporteur / livraison</th><th>Statut</th><th>Total</th></tr></thead><tbody>'+rows+'</tbody></table></section>';
  }

  function printFilteredOrdersList() {
    const filtered = getFilteredOrders();
    showAdminPrintForm('Liste des commandes', filtered.length + ' commande(s) affichée(s) avec la recherche actuelle.', buildOrdersListPrintForm(filtered));
  }

  function initOrdersEvents() {
    $id('adminOrdersPrintBtn')?.addEventListener('click', (e) => { e.preventDefault(); printFilteredOrdersList(); });
    ['adminOrdersSearchInput', 'adminStatusFilter', 'adminRegionFilter'].forEach(id => {
      const el = $id(id);
      if (!el) return;
      el.addEventListener('input', () => { renderOrdersTable(); initCharts();  });
      el.addEventListener('change', () => { renderOrdersTable(); initCharts();  });
    });
    ['adminDashboardGlobalSearch'].forEach(id => {
      const el = $id(id);
      if (!el) return;
      el.addEventListener('input', () => { renderDashboardOverview(); renderOrdersInsights(); initCharts();  });
      el.addEventListener('change', () => { renderDashboardOverview(); renderOrdersInsights(); initCharts();  });
    });
  }

  function rowHasVisibleCells(row) {
    return Array.from(row.cells || []).some(cell => cell.textContent.trim() && !cell.hasAttribute('colspan'));
  }

  function applyEmptyRow(tbody, visibleRows, colspan, message) {
    if (!tbody) return;
    tbody.querySelectorAll('.admin-empty-row').forEach(row => row.remove());
    if (visibleRows === 0) {
      tbody.insertAdjacentHTML('beforeend', `<tr class="admin-empty-row"><td colspan="${colspan}">${message}</td></tr>`);
    }
  }


  function getFilteredUserRows() {
    return $all('#adminUsersPage .admin-user-row').filter(row => rowHasVisibleCells(row) && row.style.display !== 'none');
  }

  function getUsersRoleStatsFromRows(rows) {
    const stats = { Admin: 0, Acheteur: 0, Agriculteur: 0, Transporteur: 0, Autres: 0 };
    rows.forEach((row) => {
      const role = normalizeText(row.dataset.role || row.textContent || '');
      if (role.includes('admin')) stats.Admin += 1;
      else if (role.includes('acheteur') || role.includes('buyer')) stats.Acheteur += 1;
      else if (role.includes('agriculteur') || role.includes('farmer')) stats.Agriculteur += 1;
      else if (role.includes('transporteur') || role.includes('livreur')) stats.Transporteur += 1;
      else stats.Autres += 1;
    });
    return Object.entries(stats).map(([label, value]) => ({ label, value })).filter(item => item.value > 0);
  }

  function getUsersDocsStatsFromRows(rows) {
    const stats = { Photos: 0, Certificats: 0, Registres: 0, Transporteurs: 0, Autres: 0 };
    rows.forEach((row) => {
      Array.from(row.querySelectorAll('.admin-doc-chip')).forEach((chip) => {
        if (chip.classList.contains('photo')) stats.Photos += 1;
        else if (chip.classList.contains('certificate')) stats.Certificats += 1;
        else if (chip.classList.contains('register')) stats.Registres += 1;
        else if (chip.classList.contains('vehicle')) stats.Transporteurs += 1;
        else stats.Autres += 1;
      });
    });
    return Object.entries(stats).map(([label, value]) => ({ label, value })).filter(item => item.value > 0);
  }

  function createUserChart(ctx, config) {
    if (!ctx || !window.Chart) return;
    adminUserCharts.push(new Chart(ctx, config));
  }

  function renderUsersCharts() {
    if (!window.Chart) return;
    adminUserCharts.forEach(chart => chart.destroy());
    adminUserCharts = [];
    const rows = getFilteredUserRows();
    const roleStats = getUsersRoleStatsFromRows(rows);
    const docsStats = getUsersDocsStatsFromRows(rows);
    const approved = rows.filter(row => normalizeText(row.dataset.status || '') === 'approved').length;
    const pending = rows.filter(row => normalizeText(row.dataset.status || '') === 'pending').length;
    const rejected = Number($id('adminUsersRejectedCount')?.dataset.total || $id('adminUsersRejectedCount')?.textContent || 0);
    const borderColor = document.body.classList.contains('dark-mode') ? '#0f172a' : '#ffffff';
    const roleCtx = $id('adminUsersRolesChart');
    if (roleCtx) {
      if (roleStats.length) createUserChart(roleCtx, { type: 'doughnut', data: { labels: roleStats.map(i => i.label), datasets: [{ label: 'Utilisateurs', data: roleStats.map(i => i.value), backgroundColor: ['#f59e0b','#3b82f6','#22c55e','#8b5cf6','#64748b'], borderWidth: 4, borderColor, hoverOffset: 10 }] }, options: baseChartOptions({ cutout: '66%' }) });
      else createAccessibleEmptyChart(roleCtx, 'Aucun utilisateur');
    }
    const statusCtx = $id('adminUsersStatusChart');
    if (statusCtx) createUserChart(statusCtx, { type: 'bar', data: { labels: ['Validés','En attente','Refusés'], datasets: [{ label: 'Comptes', data: [approved,pending,rejected], backgroundColor: ['#22c55e','#f59e0b','#ef4444'], borderRadius: 12, maxBarThickness: 44 }] }, options: baseChartOptions({ plugins: { ...baseChartOptions().plugins, legend: { display: false } }, scales: { x: { ticks: { color: chartTextColor(), font: { weight: 700 } }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: chartTextColor(), precision: 0 }, grid: { color: gridColor() } } } }) });
    const docsCtx = $id('adminUsersDocsChart');
    if (docsCtx) {
      if (docsStats.length) createUserChart(docsCtx, { type: 'doughnut', data: { labels: docsStats.map(i => i.label), datasets: [{ label: 'Documents', data: docsStats.map(i => i.value), backgroundColor: ['#14b8a6','#22c55e','#3b82f6','#f97316','#94a3b8'], borderWidth: 4, borderColor, hoverOffset: 10 }] }, options: baseChartOptions({ cutout: '64%' }) });
      else createAccessibleEmptyChart(docsCtx, 'Aucun document');
    }
  }


  function renderUsersDashboard() {
    const query = normalizeText($id('adminUsersSearchInput')?.value || '');
    const roleFilter = normalizeText($id('adminUsersRoleFilter')?.value || 'all');
    const statusFilter = normalizeText($id('adminUsersStatusFilter')?.value || 'all');
    const rows = $all('#adminUsersPage .admin-user-row');
    let visibleApproved = 0;
    let visiblePending = 0;
    rows.forEach((row) => {
      if (!rowHasVisibleCells(row)) return;
      const rowRole = normalizeText(row.dataset.role || '');
      const rowStatus = normalizeText(row.dataset.status || '');
      const text = normalizeText(row.textContent || '');
      const show = (!query || text.includes(query)) && (roleFilter === 'all' || rowRole === roleFilter) && (statusFilter === 'all' || rowStatus === statusFilter);
      row.style.display = show ? '' : 'none';
      if (show && rowStatus === 'approved') visibleApproved += 1;
      if (show && rowStatus === 'pending') visiblePending += 1;
    });
    setStatNumber($id('adminUsersApprovedCount'), visibleApproved);
    setStatNumber($id('adminUsersActiveCount'), visibleApproved);
    setStatNumber($id('adminUsersPendingCount'), visiblePending);
    const rejectedValue = Number($id('adminUsersRejectedCount')?.dataset.total || $id('adminUsersRejectedCount')?.textContent || 0);
    setStatNumber($id('adminUsersRejectedCount'), rejectedValue);

    const pendingBody = $id('adminPendingUsersBody');
    const approvedBody = $id('adminApprovedUsersBody');
    applyEmptyRow(pendingBody, visiblePending, 7, 'Aucun utilisateur ne correspond à la recherche.');
    applyEmptyRow(approvedBody, visibleApproved, 6, 'Aucun utilisateur validé ne correspond à la recherche.');
    renderUsersCharts();
  }

  function initUsersEvents() {
    ['adminUsersSearchInput', 'adminUsersRoleFilter', 'adminUsersStatusFilter'].forEach(id => {
      const el = $id(id);
      if (!el) return;
      el.addEventListener('input', renderUsersDashboard);
      el.addEventListener('change', renderUsersDashboard);
    });
    renderUsersDashboard();
    renderSettingsStats();
  }

  function initSettings() {
    const content = $id('adminSettingsContent');
    const buttons = $all('.admin-tab-btn');
    if (!content || !buttons.length) return;

    let adminProfile = null;

    const renderTab = (label) => {
      if (label === 'Profil') {
        content.innerHTML = `
          <h3>Profil administrateur</h3>
          <div class="admin-form-grid" style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div><label>Prénom</label><input id="adminFirstName" type="text" style="width:100%;padding:12px;border-radius:12px;border:1px solid #d1d5db;margin-top:6px;"></div>
            <div><label>Nom</label><input id="adminLastName" type="text" style="width:100%;padding:12px;border-radius:12px;border:1px solid #d1d5db;margin-top:6px;"></div>
            <div style="grid-column:1 / -1;"><label>Email</label><input id="adminEmail" type="email" style="width:100%;padding:12px;border-radius:12px;border:1px solid #d1d5db;margin-top:6px;"></div>
          </div>
          <div style="margin-top:16px;display:flex;justify-content:flex-end;"><button id="adminSaveProfileBtn" class="admin-btn primary-btn" type="button">Enregistrer</button></div>
        `;
        if (adminProfile) {
          $id('adminFirstName').value = adminProfile.first_name || '';
          $id('adminLastName').value = adminProfile.last_name || '';
          $id('adminEmail').value = adminProfile.email || '';
        }
        $id('adminSaveProfileBtn')?.addEventListener('click', async () => {
          try {
            adminProfile = await window.AgriGovProfileApi.saveProfile({
              first_name: $id('adminFirstName')?.value || '',
              last_name: $id('adminLastName')?.value || '',
              email: $id('adminEmail')?.value || ''
            });
            const badge = document.querySelector('.admin-admin-profile');
            if (badge) badge.textContent = adminProfile.full_name || 'Admin';
            notify('Profil admin mis à jour.');
          } catch (error) {
            notify(error.message || 'Erreur profil admin');
          }
        });
        return;
      }

      if (label === 'Sécurité') {
        content.innerHTML = `
          <h3>Sécurité</h3>
          <div class="admin-form-grid" style="margin-top:16px;display:grid;grid-template-columns:1fr;gap:14px;">
            <div><label>Mot de passe actuel</label><input id="adminPasswordCurrent" type="password" style="width:100%;padding:12px;border-radius:12px;border:1px solid #d1d5db;margin-top:6px;"></div>
            <div><label>Nouveau mot de passe</label><input id="adminPasswordNew" type="password" style="width:100%;padding:12px;border-radius:12px;border:1px solid #d1d5db;margin-top:6px;"></div>
            <div><label>Confirmer</label><input id="adminPasswordConfirm" type="password" style="width:100%;padding:12px;border-radius:12px;border:1px solid #d1d5db;margin-top:6px;"></div>
          </div>
          <div style="margin-top:16px;display:flex;justify-content:flex-end;"><button id="adminChangePasswordBtn" class="admin-btn primary-btn" type="button">Changer le mot de passe</button></div>
        `;
        $id('adminChangePasswordBtn')?.addEventListener('click', async () => {
          try {
            await window.AgriGovProfileApi.changePassword(
              $id('adminPasswordCurrent')?.value || '',
              $id('adminPasswordNew')?.value || '',
              $id('adminPasswordConfirm')?.value || ''
            );
            ['adminPasswordCurrent','adminPasswordNew','adminPasswordConfirm'].forEach(id => { const el = $id(id); if (el) el.value = ''; });
            notify('Mot de passe modifié.');
          } catch (error) {
            notify(error.message || 'Erreur mot de passe');
          }
        });
        return;
      }

      content.innerHTML = `<h3>${label}</h3><p style="margin-top:12px;color:var(--admin-muted);">Section prête pour personnalisation dynamique.</p>`;
    };

    buttons.forEach(btn => btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.textContent.trim());
    }));

    const settingsSearch = $id('adminSettingsSearch');
    settingsSearch?.addEventListener('input', () => {
      const query = normalizeText(settingsSearch.value || '');
      buttons.forEach((btn) => {
        const show = !query || normalizeText(btn.textContent || '').includes(query);
        btn.style.display = show ? '' : 'none';
      });
    });

    window.AgriGovProfileApi?.getProfile().then((profile) => {
      adminProfile = profile;
      const badge = document.querySelector('.admin-admin-profile');
      if (badge) badge.textContent = profile.full_name || 'Admin';
      renderTab('Profil');
    }).catch(() => renderTab('Profil'));
  }

  window.openCatalogueModal = openCatalogueModal;
  window.closeCatalogueModal = closeCatalogueModal;
  window.saveCatalogue = saveCatalogue;

  document.addEventListener('keydown', (event) => {
    const goLink = event.target.closest('[data-admin-go]');
    if (!goLink || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    goLink.click();
  });

  document.addEventListener('click', (event) => {
    const goLink = event.target.closest('[data-admin-go]');
    if (goLink) {
      event.preventDefault();
      const targetPage = goLink.getAttribute('data-admin-go');
      const targetMenu = document.querySelector('.admin-menu-link[data-page="' + targetPage + '"]');
      if (targetMenu) targetMenu.click();
      return;
    }

    const addCatalogueBtn = event.target.closest('#adminAddCatalogueBtn');
    if (addCatalogueBtn) {
      event.preventDefault();
      openCatalogueModal();
      return;
    }

    const saveCatalogueBtn = event.target.closest('#adminSaveCatalogueModalBtn');
    if (saveCatalogueBtn) {
      event.preventDefault();
      saveCatalogue();
      return;
    }

    const closeCatalogueBtn = event.target.closest('#adminCloseCatalogueModalBtn, #adminCancelCatalogueModalBtn');
    if (closeCatalogueBtn) {
      event.preventDefault();
      closeCatalogueModal();
    }
  });

  initTheme();
  initWilayaSelects();
  initNavigation();
  initSettings();
  initProductsEvents();
  initOrdersEvents();
  initUsersEvents();
  loadAdminStats();
  loadCatalogues().then(loadProduits);
  loadOrders();
  renderSettingsStats();
});

/* =========================================================
   PRO FEATURES ADDED
   Toasts + Better Empty States + Ranking + Chart Animation Defaults
   ========================================================= */
(function(){
  function ensureToastStack(){
    let stack = document.querySelector(".admin-toast-stack");
    if(!stack){
      stack = document.createElement("div");
      stack.className = "admin-toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }

  window.adminShowToast = function(message, type){
    const stack = ensureToastStack();
    const toast = document.createElement("div");
    toast.className = "admin-toast " + (type || "success");
    const icon = type === "error" ? "⚠️" : type === "warning" ? "🔔" : "✅";
    toast.innerHTML = "<span>" + icon + "</span><div>" + message + "</div>";
    stack.appendChild(toast);

    requestAnimationFrame(function(){
      toast.classList.add("show");
    });

    setTimeout(function(){
      toast.classList.remove("show");
      setTimeout(function(){
        toast.remove();
      }, 280);
    }, 2800);
  };

  window.adminSetEmptyState = function(container, message, compact){
    if(!container) return;
    container.innerHTML = '<div class="admin-empty-state ' + (compact ? "compact" : "") + '">' + message + '</div>';
  };

  window.adminAddSkeleton = function(container, count){
    if(!container) return;
    const items = Array.from({length: count || 3}).map(function(){
      return '<div class="admin-skeleton" style="height:54px;margin-bottom:10px;"></div>';
    }).join("");
    container.innerHTML = items;
  };

  window.adminApplyRankingBadges = function(){
    document.querySelectorAll(".admin-products-grid .admin-product-card").forEach(function(card, index){
      if(card.querySelector(".admin-rank-badge")) return;
      const badge = document.createElement("span");
      badge.className = "admin-rank-badge";
      badge.textContent = "#" + (index + 1);
      card.prepend(badge);
    });
  };

  window.adminPolishStatuses = function(){
    document.querySelectorAll(".status, .badge, .status-badge").forEach(function(el){
      const text = (el.textContent || "").toLowerCase();
      if(text.includes("pending") || text.includes("attente")) el.classList.add("pending");
      if(text.includes("done") || text.includes("delivered") || text.includes("livré") || text.includes("active")) el.classList.add("done");
      if(text.includes("progress") || text.includes("transit")) el.classList.add("progress");
      if(text.includes("cancel") || text.includes("refus") || text.includes("annul")) el.classList.add("cancelled");
    });
  };

  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(function(){
      window.adminApplyRankingBadges();
      window.adminPolishStatuses();
    }, 600);

    document.addEventListener("click", function(e){
      const actionButton = e.target.closest(".admin-btn, .admin-accept-btn, .admin-refuse-btn, .admin-signal-btn");
      if(!actionButton) return;

      const text = (actionButton.textContent || "").trim().toLowerCase();
      if(text.includes("refus") || text.includes("delete") || text.includes("supprimer")){
        window.adminShowToast("Action appliquée", "warning");
      }else{
        window.adminShowToast("Action effectuée avec succès", "success");
      }
    });
  });
})();

/* VALIDATION TABLE DOCUMENTS UX */
(function(){
  function polishValidationTables(){
    document.querySelectorAll('.admin-docs-cell').forEach(function(cell){
      if(!cell.querySelector('a')){
        cell.innerHTML = '<span class="admin-doc-empty">Aucun document</span>';
      }
    });

    document.querySelectorAll('.admin-actions-cell').forEach(function(cell){
      cell.querySelectorAll('form').forEach(function(form){
        form.classList.add('admin-inline-action-form');
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', polishValidationTables);
  }else{
    polishValidationTables();
  }

  window.adminPolishValidationTables = polishValidationTables;
})();


/* =========================================================
   NAVIGATION FIX — Unified sidebar (replaces old hard-fix)
   Single source of truth: overrides window.adminOpenPage
   and adminOpenPageSafe with one consistent function.
   ========================================================= */
(function () {
  function safeOpenAdminPage(targetPage) {
    if (!targetPage) return;
    var target = document.getElementById(targetPage);
    if (!target) return;

    // Hide / show pages
    document.querySelectorAll('.admin-page').forEach(function (page) {
      var active = page.id === targetPage;
      page.classList.toggle('active', active);
      page.hidden = !active;
      page.style.display = active ? '' : 'none';
    });

    // Highlight active sidebar link
    document.querySelectorAll('.admin-menu-link').forEach(function (link) {
      var active = link.getAttribute('data-page') === targetPage;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    // Update URL hash without reload
    if (window.location.hash !== '#' + targetPage) {
      history.replaceState(null, '', '#' + targetPage);
    }

    // Trigger page-specific data loads (mirrors original openAdminPage)
    if (targetPage === 'adminProductsPage' && typeof loadProduits === 'function') loadProduits();
    if (targetPage === 'adminOrdersPage') {
      if (typeof loadOrders === 'function') loadOrders();
      setTimeout(function () { if (typeof renderOrdersInsights === 'function') renderOrdersInsights(); }, 50);
    }
    if (targetPage === 'adminUsersPage') {
      if (typeof renderUsersDashboard === 'function') renderUsersDashboard();
      if (typeof renderSettingsStats === 'function') renderSettingsStats();
    }
    if (targetPage === 'adminBenefitsPage') {
      document.dispatchEvent(new CustomEvent('admin:benefits-page-opened'));
      if (window.adminRefreshNotifications) window.adminRefreshNotifications();
    }
    if (targetPage === 'adminSettingsPage' && typeof renderSettingsStats === 'function') renderSettingsStats();
  }

  // Expose as both aliases so all existing callers work
  window.adminOpenPageSafe = safeOpenAdminPage;
  window.adminOpenPage = safeOpenAdminPage;

  document.addEventListener('DOMContentLoaded', function () {
    // Make sure all sidebar links have correct href
    document.querySelectorAll('.admin-menu-link[data-page]').forEach(function (link) {
      var page = link.getAttribute('data-page');
      link.setAttribute('href', '#' + page);
      link.setAttribute('role', 'link');
    });

    // Single delegated click handler (capture phase = highest priority)
    document.addEventListener('click', function (event) {
      var link = event.target.closest('.admin-menu-link[data-page], [data-admin-go]');
      if (!link) return;
      var targetPage = link.getAttribute('data-page') || link.getAttribute('data-admin-go');
      if (!targetPage || !document.getElementById(targetPage)) return;
      event.preventDefault();
      event.stopPropagation();
      safeOpenAdminPage(targetPage);
    }, true);

    // Keyboard accessibility
    document.addEventListener('keydown', function (event) {
      var link = event.target.closest('.admin-menu-link[data-page], [data-admin-go]');
      if (!link || (event.key !== 'Enter' && event.key !== ' ')) return;
      var targetPage = link.getAttribute('data-page') || link.getAttribute('data-admin-go');
      if (!targetPage || !document.getElementById(targetPage)) return;
      event.preventDefault();
      safeOpenAdminPage(targetPage);
    }, true);

    // Restore page from URL hash on load
    var initial = (window.location.hash || '').replace('#', '');
    if (initial && document.getElementById(initial)) {
      safeOpenAdminPage(initial);
    } else {
      safeOpenAdminPage('adminDashboardPage');
    }
  });

  // Support browser back/forward
  window.addEventListener('hashchange', function () {
    var targetPage = (window.location.hash || '').replace('#', '');
    if (targetPage && document.getElementById(targetPage)) safeOpenAdminPage(targetPage);
  });
})();

/* ══════════════════════════════════════════════════════════
   ADMIN → ALERTE STOCK FAIBLE → VÉTÉRINAIRES
   Ajout dynamique d'un bouton dans la section stock faible
   ══════════════════════════════════════════════════════════ */
(function adminVetAlertePatch() {
  function getCsrfAdmin() {
    const c = document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith('csrftoken='));
    return c ? c.split('=')[1] : '';
  }

  function addVetAlertButton() {
    const stockCard = document.querySelector('.stock-card, [aria-label*="stock faible"], [id*="LowStock"]')?.closest('.admin-panel, .admin-chart-card');
    if (!stockCard || document.getElementById('adminSendVetAlerteBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'adminSendVetAlerteBtn';
    btn.style.cssText = 'margin-top:10px;width:100%;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:0.83rem;font-weight:700;cursor:pointer;letter-spacing:0.02em';
    btn.innerHTML = '🚨 Alerter les vétérinaires — Stock Faible';
    btn.addEventListener('click', openVetAlerteModal);
    stockCard.appendChild(btn);
  }

  function openVetAlerteModal() {
    const existing = document.getElementById('adminVetAlerteModal');
    if (existing) existing.remove();

    // Compute low stock products for context
    const lowStockItems = (typeof getLowStockProducts === 'function') ? getLowStockProducts(10) : [];
    const defaultMsg = lowStockItems.length
      ? `Stock critique détecté: ${lowStockItems.map(i => i.name + ' (' + i.qty + ' restants)').slice(0,5).join(', ')}. Une intervention vétérinaire est recommandée.`
      : 'Baisse significative du stock animal détectée. Veuillez effectuer une tournée d\'inspection dans votre wilaya.';

    const wilayaOpts = [
      ['01','Adrar'],['02','Chlef'],['03','Laghouat'],['04','Oum El Bouaghi'],['05','Batna'],
      ['06','Béjaïa'],['07','Biskra'],['08','Béchar'],['09','Blida'],['10','Bouïra'],
      ['16','Alger'],['17','Djelfa'],['18','Jijel'],['19','Sétif'],['20','Saïda'],
      ['25','Constantine'],['26','Médéa'],['27','Mostaganem'],['31','Oran'],
    ].map(([v,l]) => `<option value="${v}">${v} — ${l}</option>`).join('');

    const modal = document.createElement('div');
    modal.id = 'adminVetAlerteModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto">
        <h3 style="margin:0 0 6px;font-size:1.05rem">🚨 Envoyer une alerte vétérinaire — Stock Faible</h3>
        <p style="margin:0 0 20px;font-size:0.83rem;color:#666">Cette alerte sera visible par tous les vétérinaires actifs et les incitera à intervenir.</p>
        <div style="display:grid;gap:12px">
          <div>
            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Titre de l'alerte</label>
            <input type="text" id="vetAlerteTitle" value="Alerte stock animal faible" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Message</label>
            <textarea id="vetAlerteMsg" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem;min-height:100px;resize:vertical;box-sizing:border-box">${defaultMsg}</textarea>
          </div>
          <div>
            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Wilayas ciblées (Ctrl+clic pour multi-sélection)</label>
            <select id="vetAlerteWilayas" multiple size="6" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:6px;font-size:0.85rem">${wilayaOpts}</select>
          </div>
          ${lowStockItems.length ? `
          <div style="background:#fff8eb;border-radius:8px;padding:12px;font-size:0.8rem">
            <strong>📉 Produits en stock faible détectés:</strong><br>
            ${lowStockItems.slice(0,5).map(i => `• ${i.name}: ${i.qty} restants`).join('<br>')}
          </div>` : ''}
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
          <button onclick="document.getElementById('adminVetAlerteModal').remove()" style="background:#f5f5f5;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:0.88rem">Annuler</button>
          <button onclick="adminEnvoyerVetAlerte()" style="background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:0.88rem;font-weight:700">🚨 Envoyer l'alerte</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  window.adminEnvoyerVetAlerte = async function() {
    const titre = document.getElementById('vetAlerteTitle')?.value?.trim();
    const message = document.getElementById('vetAlerteMsg')?.value?.trim();
    const selectedWilayas = Array.from(document.getElementById('vetAlerteWilayas')?.selectedOptions || []).map(o => o.value);
    if (!titre || !message) { alert('Veuillez remplir le titre et le message.'); return; }
    try {
      const res = await fetch('/api/admin/alerte/stock/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfAdmin() },
        body: JSON.stringify({ titre, message, wilayas: selectedWilayas }),
      });
      const data = await res.json();
      document.getElementById('adminVetAlerteModal')?.remove();
      // Show success
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#22c55e;color:#fff;padding:14px 22px;border-radius:12px;font-size:0.9rem;font-weight:600;z-index:99999;max-width:380px';
      toast.innerHTML = `✅ ${data.message || 'Alerte envoyée aux vétérinaires!'}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    } catch (e) {
      alert('Erreur lors de l\'envoi de l\'alerte. Vérifiez votre connexion.');
    }
  };

  // Attach after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(addVetAlertButton, 1500));
  } else {
    setTimeout(addVetAlertButton, 1500);
  }
})();

/* ══════════════════════════════════════════════════════════
   PAGE VÉT/ORG — Tabs + chargement données
   ══════════════════════════════════════════════════════════ */
(function adminVetOrgPage() {
  let voData = null;

  function loadVoData() {
    fetch('/api/admin/tournees-rdv/', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(data => {
        voData = data;
        renderVoStats(data.stats);
        renderTournees(data.tournees);
        renderOrgTournees(data.org_tournees || []);
        renderRdvs(data.rdvs);
        renderAlertes(data.alertes);
      })
      .catch(() => {
        document.getElementById('voTourneesBody').innerHTML = '<tr><td colspan="8" style="color:#ef4444;text-align:center;padding:16px">Erreur de chargement. Vérifiez que vous êtes bien connecté en admin.</td></tr>';
      });
  }

  function renderVoStats(stats) {
    if (!stats) return;
    var el = function(id) { return document.getElementById(id); };
    if (el('voTotalTournees')) el('voTotalTournees').textContent = stats.total_tournees ?? '—';
    if (el('voTourneesActives')) el('voTourneesActives').textContent = stats.tournees_actives ?? '—';
    if (el('voRdvAttente')) el('voRdvAttente').textContent = stats.rdvs_en_attente ?? '—';
    if (el('voAlertesActives')) el('voAlertesActives').textContent = stats.alertes_actives ?? '—';
  }

  const STATUT_COLORS = {
    planifiee: '#6366f1', en_cours: '#22c55e', terminee: '#6b7280', annulee: '#ef4444',
    en_attente: '#f59e0b', confirme: '#22c55e', refuse: '#ef4444', termine: '#6b7280', annule: '#ef4444'
  };

  function badge(label, statut) {
    const color = STATUT_COLORS[statut] || '#6b7280';
    return `<span style="background:${color}22;color:${color};padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">${label}</span>`;
  }

  function renderTournees(tournees) {
    const tbody = document.getElementById('voTourneesBody');
    if (!tbody) return;
    if (!tournees || !tournees.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">Aucune tournée enregistrée.</td></tr>';
      return;
    }
    // Store for detail modal
    window._voTournees = tournees;
    tbody.innerHTML = tournees.map(t => `
      <tr>
        <td><span style="cursor:pointer;color:#16a34a;text-decoration:underline;font-weight:600;" onclick="voOpenTourneeDetail(${t.id})">${t.titre}</span></td>
        <td>
          <div style="font-weight:600">${t.vet_titre || t.vet_nom}</div>
          <div style="font-size:0.78rem;color:#6b7280">${t.vet_fonction_label || 'Vétérinaire'}${t.vet_specialite ? ' · ' + t.vet_specialite : ''}</div>
        </td>
        <td>${t.vet_wilaya || '—'}</td>
        <td>${t.wilayas.join(', ') || '—'}</td>
        <td style="white-space:nowrap">${t.date_debut} → ${t.date_fin}</td>
        <td>${badge(t.statut_label, t.statut)}</td>
        <td style="text-align:center">${t.alerte_admin ? '<span style="color:#ef4444;font-weight:700">🔴 Oui</span>' : '<span style="color:#22c55e">✅ Non</span>'}</td>
      </tr>`).join('');
  }

  window.voOpenTourneeDetail = function(id) {
    const t = (window._voTournees || []).find(x => x.id === id);
    if (!t) return;
    const html = `
      <div style="font-size:0.9rem;display:flex;flex-direction:column;gap:14px;">
        <div style="padding:14px;background:rgba(22,163,74,0.07);border-radius:10px;border-left:3px solid #16a34a;">
          <div style="font-weight:700;font-size:1.05rem;margin-bottom:4px;">${t.titre}</div>
          ${t.alerte_admin ? '<div style="font-size:0.72rem;color:#f59e0b;font-weight:600;">📢 Créée en réponse à une alerte admin</div>' : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div style="font-size:0.72rem;color:#9ca3af;margin-bottom:3px;">VÉTÉRINAIRE</div>
            <div style="font-weight:700;">${t.vet_titre || t.vet_nom}</div>
            <div style="font-size:0.8rem;color:#6b7280;">${t.vet_fonction_label || 'Vétérinaire'}${t.vet_specialite ? ' · ' + t.vet_specialite : ''}</div>
            <div style="font-size:0.8rem;color:#6b7280;">📍 ${t.vet_wilaya || '—'}</div>
          </div>
          <div>
            <div style="font-size:0.72rem;color:#9ca3af;margin-bottom:3px;">STATUT</div>
            <span style="background:${(STATUT_COLORS[t.statut]||'#888')}22;color:${STATUT_COLORS[t.statut]||'#888'};padding:4px 12px;border-radius:20px;font-size:0.82rem;font-weight:700;">${t.statut_label}</span>
          </div>
        </div>
        <div>
          <div style="font-size:0.72rem;color:#9ca3af;margin-bottom:3px;">PÉRIODE</div>
          <div style="font-weight:600;">📅 ${t.date_debut} → ${t.date_fin}</div>
        </div>
        <div>
          <div style="font-size:0.72rem;color:#9ca3af;margin-bottom:6px;">WILAYAS CIBLÉES</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${(t.wilayas||[]).map(w=>`<span style="background:rgba(22,163,74,0.12);color:#16a34a;padding:3px 10px;border-radius:99px;font-size:0.78rem;font-weight:600;">📍 ${w}</span>`).join('') || '—'}</div>
        </div>
        ${t.description ? `<div><div style="font-size:0.72rem;color:#9ca3af;margin-bottom:3px;">DESCRIPTION</div><div style="color:#555;">${t.description}</div></div>` : ''}
        ${t.services ? `<div><div style="font-size:0.72rem;color:#9ca3af;margin-bottom:3px;">SERVICES OFFERTS</div><div style="color:#555;">🔧 ${t.services}</div></div>` : ''}
      </div>`;
    // Simple modal using a div overlay
    let overlay = document.getElementById('voDetailOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'voDetailOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
      overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;max-width:560px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <h3 style="margin:0;font-size:1.05rem;">🚗 Détails de la Tournée</h3>
          <button onclick="document.getElementById('voDetailOverlay').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#6b7280;">✕</button>
        </div>
        ${html}
        <div style="text-align:right;margin-top:20px;">
          <button onclick="document.getElementById('voDetailOverlay').remove()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:0.9rem;font-weight:600;cursor:pointer;">Fermer</button>
        </div>
      </div>`;
  };

  function renderOrgTournees(orgTournees) {
    const tbody = document.getElementById('voOrgTourneesBody');
    if (!tbody) return;
    if (!orgTournees || !orgTournees.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">Aucune tournée d\'organisateur enregistrée.</td></tr>';
      return;
    }
    // Stocker pour la modale de détail
    window._voOrgTournees = orgTournees;
    tbody.innerHTML = orgTournees.map(t => `
      <tr>
        <td>
          <span style="cursor:pointer;color:#16a34a;text-decoration:underline;font-weight:600;"
            onclick="voOpenOrgTourneeDetail(${t.id})" title="Voir le détail">${t.nom || '—'}</span>
        </td>
        <td>${t.organisateur_nom || '—'}</td>
        <td>${t.wilaya || '—'}</td>
        <td style="white-space:nowrap">${t.date_debut || '?'} → ${t.date_fin || '?'}</td>
        <td style="font-size:0.82rem;max-width:200px;color:#555;">${t.description ? t.description.slice(0,80) + (t.description.length > 80 ? '\u2026' : '') : '—'}</td>
        <td>${badge(t.statut_label, t.statut)}</td>
      </tr>`).join('');
  }

  window.voOpenOrgTourneeDetail = function(id) {
    const t = (window._voOrgTournees || []).find(x => x.id === id);
    if (!t) return;
    const STATUT_ORG = { planifiee: '#6366f1', en_cours: '#22c55e', terminee: '#6b7280', annulee: '#ef4444' };
    const color = STATUT_ORG[t.statut] || '#6b7280';
    const html = `
      <div style="font-size:0.9rem;display:flex;flex-direction:column;gap:14px;">
        <div style="padding:14px;background:rgba(22,163,74,0.07);border-radius:10px;border-left:3px solid #16a34a;">
          <div style="font-weight:700;font-size:1.05rem;margin-bottom:4px;">🌿 ${t.nom || '—'}</div>
          ${t.alerte_id ? '<div style="font-size:0.72rem;color:#f59e0b;font-weight:600;">📢 Créée en réponse à une alerte admin</div>' : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div style="font-size:0.72rem;color:#9ca3af;margin-bottom:3px;">ORGANISATEUR</div>
            <div style="font-weight:700;">👤 ${t.organisateur_nom || '—'}</div>
          </div>
          <div>
            <div style="font-size:0.72rem;color:#9ca3af;margin-bottom:3px;">STATUT</div>
            <span style="background:${color}22;color:${color};padding:4px 12px;border-radius:20px;font-size:0.82rem;font-weight:700;">${t.statut_label || t.statut || '—'}</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div style="font-size:0.72rem;color:#9ca3af;margin-bottom:3px;">PÉRIODE</div>
            <div style="font-weight:600;">📅 ${t.date_debut || '?'} → ${t.date_fin || '?'}</div>
          </div>
          <div>
            <div style="font-size:0.72rem;color:#9ca3af;margin-bottom:3px;">WILAYA</div>
            <div style="font-weight:600;">📍 ${t.wilaya || '—'}</div>
          </div>
        </div>
        ${t.description ? `
        <div>
          <div style="font-size:0.72rem;color:#9ca3af;margin-bottom:6px;">DESCRIPTION / OBJECTIFS</div>
          <div style="color:#555;line-height:1.6;background:#f9fafb;padding:12px;border-radius:8px;">${t.description}</div>
        </div>` : ''}
      </div>`;

    let overlay = document.getElementById('voDetailOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'voDetailOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
      overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;max-width:560px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <h3 style="margin:0;font-size:1.05rem;">🌿 Détails de la Tournée Organisateur</h3>
          <button onclick="document.getElementById('voDetailOverlay').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#6b7280;">✕</button>
        </div>
        ${html}
        <div style="text-align:right;margin-top:20px;">
          <button onclick="document.getElementById('voDetailOverlay').remove()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:0.9rem;font-weight:600;cursor:pointer;">Fermer</button>
        </div>
      </div>`;
  };

  function renderRdvs(rdvs) {
    const tbody = document.getElementById('voRdvBody');
    if (!tbody) return;
    const filterVal = document.getElementById('voRdvFilterStatut')?.value || 'all';
    const filtered = filterVal === 'all' ? rdvs : rdvs.filter(r => r.statut === filterVal);
    if (!filtered || !filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#999">Aucun rendez-vous.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td>${r.vet_nom}</td>
        <td>${r.agriculteur_nom}</td>
        <td>${r.type_visite}</td>
        <td style="white-space:nowrap">${r.date_rdv} ${r.heure_rdv}</td>
        <td>${r.lieu || '—'} ${r.wilaya ? '— ' + r.wilaya : ''}</td>
        <td>${r.animaux || '—'}</td>
        <td>${badge(r.statut_label, r.statut)}</td>
      </tr>`).join('');
  }

  function getCsrfVo() {
    const c = document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith('csrftoken='));
    return c ? c.split('=')[1] : '';
  }

  // Stocke les données brutes des alertes pour éviter les problèmes d'échappement dans onclick
  let _voAlertesMap = {};

  function renderAlertes(alertes) {
    const grid = document.getElementById('voAlertesGrid');
    if (!grid) return;
    if (!alertes || !alertes.length) {
      grid.innerHTML = '<div style="text-align:center;padding:20px;color:#999">Aucune alerte active.</div>';
      return;
    }
    // Stocker les données dans la map pour y accéder via data-id
    _voAlertesMap = {};
    alertes.forEach(a => { _voAlertesMap[a.id] = a; });

    const destColors = { veterinaire: '#6366f1', organisateur: '#22c55e', tous: '#f59e0b' };
    const destLabels = { veterinaire: '🐾 Vétérinaire', organisateur: '🌿 Organisateur', tous: '📢 Tous' };

    grid.innerHTML = alertes.map(a => {
      const destType = a.destinataire_type || 'veterinaire';
      const destColor = destColors[destType] || '#6366f1';
      const destLabel = destLabels[destType] || destType;
      return `
      <div style="background:var(--admin-card,#fff);border-radius:12px;padding:16px 20px;border-left:4px solid ${destColor};box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div style="flex:1;">
            <strong style="font-size:0.95rem;">🔔 ${a.titre}</strong>
            <span style="background:${destColor}22;color:${destColor};padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;margin-left:8px;">Destinataire : ${destLabel}</span>
            <span style="background:#ef444422;color:#ef4444;padding:2px 8px;border-radius:20px;font-size:0.72rem;margin-left:6px;">${a.type}</span>
            <p style="margin:6px 0 4px;font-size:0.87rem;color:#555;">${a.message}</p>
            <small style="color:#999">Wilayas: ${(a.wilayas||[]).join(', ') || 'Toutes'} — ${a.date}</small>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button data-vo-modifier="${a.id}"
              style="background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:0.8rem;font-weight:600;">✏️ Modifier</button>
            <button data-vo-supprimer="${a.id}"
              style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:0.8rem;font-weight:600;">🗑️ Supprimer</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ── Délégation d'événements pour les boutons Modifier / Supprimer ──
  document.addEventListener('click', function(e) {
    const btnModifier = e.target.closest('[data-vo-modifier]');
    const btnSupprimer = e.target.closest('[data-vo-supprimer]');
    if (btnModifier) {
      const id = btnModifier.dataset.voModifier;
      const a = _voAlertesMap[id];
      if (a) voOuvrirModifierAlerte(a.id, a.titre, a.message, a.type_alerte, a.wilayas_cibles);
    }
    if (btnSupprimer) {
      const id = btnSupprimer.dataset.voSupprimer;
      const a = _voAlertesMap[id];
      if (a) voSupprimerAlerte(a.id, a.titre);
    }
  });

  // ── Supprimer une alerte ──
  async function voSupprimerAlerte(id, titre) {
    if (!confirm('Supprimer l\'alerte « ' + titre + ' » ?\nCette action est irréversible.')) return;
    try {
      const res = await fetch('/api/admin/alerte/' + id + '/supprimer/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfVo() },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        if (window.adminLoadVetOrgData) window.adminLoadVetOrgData();
      } else {
        alert('Erreur lors de la suppression : ' + (data.error || 'inconnue'));
      }
    } catch (e) {
      alert('Erreur réseau lors de la suppression.');
    }
  }

  // ── Ouvrir modal modifier ──
  function voOuvrirModifierAlerte(id, titre, message, type_alerte, wilayas_cibles) {
    // Inject modal styles once
    if (!document.getElementById('voModAlerteStyles')) {
      const st = document.createElement('style');
      st.id = 'voModAlerteStyles';
      st.textContent = `
        #voModifierAlerteModal { animation: voFadeIn .18s ease; }
        @keyframes voFadeIn { from { opacity:0; } to { opacity:1; } }
        #voModifierAlerteModal .vo-card { animation: voSlideUp .2s cubic-bezier(.4,0,.2,1); }
        @keyframes voSlideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .vo-type-card { cursor:pointer; border:2px solid #e2e8f0; border-radius:12px; padding:12px 14px;
          display:flex; align-items:center; gap:10px; transition:all .18s; background:#fff; }
        .vo-type-card:hover { border-color:#4577d6; background:#f0f5ff; transform:translateY(-1px); }
        .vo-type-card.selected { border-color:var(--vo-type-color,#4577d6); background:var(--vo-type-bg,#f0f5ff);
          box-shadow:0 0 0 3px var(--vo-type-glow,rgba(69,119,214,.15)); }
        .vo-type-card .vo-type-icon { font-size:1.5rem; line-height:1; flex-shrink:0; }
        .vo-type-card .vo-type-label { font-weight:700; font-size:.85rem; color:#1e293b; }
        .vo-type-card .vo-type-desc { font-size:.73rem; color:#64748b; margin-top:1px; }
        .vo-field-wrap { margin-bottom:16px; }
        .vo-field-wrap label { display:block; font-size:.78rem; font-weight:700;
          text-transform:uppercase; letter-spacing:.04em; color:#475569; margin-bottom:6px; }
        .vo-field-wrap input, .vo-field-wrap textarea {
          width:100%; box-sizing:border-box; padding:11px 14px;
          border:1.5px solid #e2e8f0; border-radius:10px; font-size:.9rem;
          color:#1e293b; background:#f8fafc; transition:border-color .15s,box-shadow .15s;
          font-family:inherit; outline:none; }
        .vo-field-wrap input:focus, .vo-field-wrap textarea:focus {
          border-color:#4577d6; background:#fff;
          box-shadow:0 0 0 3px rgba(69,119,214,.12); }
        .vo-field-wrap textarea { resize:vertical; min-height:88px; }
        #voModAlerteType { display:none; }
        .vo-modal-footer { display:flex; gap:10px; justify-content:flex-end; margin-top:22px; }
        #voModAlerteAnnuler { background:#f1f5f9; color:#475569; border:none; border-radius:10px;
          padding:10px 22px; cursor:pointer; font-size:.88rem; font-weight:700;
          transition:background .15s; }
        #voModAlerteAnnuler:hover { background:#e2e8f0; }
        #voModAlerteSauver { background:linear-gradient(135deg,#2563eb,#4577d6); color:#fff; border:none;
          border-radius:10px; padding:10px 26px; cursor:pointer; font-size:.88rem; font-weight:700;
          box-shadow:0 4px 14px rgba(37,99,235,.25); transition:opacity .15s,transform .1s; }
        #voModAlerteSauver:hover { opacity:.92; transform:translateY(-1px); }
        #voModAlerteSauver:disabled { opacity:.55; cursor:not-allowed; transform:none; }
        .vo-char-count { font-size:.72rem; color:#94a3b8; text-align:right; margin-top:3px; }
      `;
      document.head.appendChild(st);
    }

    let modal = document.getElementById('voModifierAlerteModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'voModifierAlerteModal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px);';

      // Type definitions — exactly matching backend TYPE_CHOICES
      const TYPES = [
        { value:'stock_faible', icon:'📦', label:'Stock Faible',       desc:'Stock animaux insuffisant',   color:'#d89a31', bg:'#fff9ed', glow:'rgba(216,154,49,.18)' },
        { value:'epidemie',     icon:'🦠', label:'Risque Épidémie',    desc:'Alerte sanitaire urgente',    color:'#d45952', bg:'#fff0f0', glow:'rgba(212,89,82,.18)'  },
        { value:'campagne',     icon:'📢', label:'Campagne Nationale', desc:'Campagne de vaccination/suivi', color:'#3a8b4b', bg:'#f0faf2', glow:'rgba(58,139,75,.18)' },
        { value:'urgent',       icon:'🚨', label:'Urgent',             desc:'Intervention immédiate requise', color:'#dc2626', bg:'#fff0f0', glow:'rgba(220,38,38,.22)' },
      ];

      const typeCards = TYPES.map(t =>
        `<div class="vo-type-card" data-type="${t.value}"
              style="--vo-type-color:${t.color};--vo-type-bg:${t.bg};--vo-type-glow:${t.glow};">
           <span class="vo-type-icon">${t.icon}</span>
           <div>
             <div class="vo-type-label">${t.label}</div>
             <div class="vo-type-desc">${t.desc}</div>
           </div>
         </div>`
      ).join('');

      modal.innerHTML =
        `<div class="vo-card" style="background:#fff;border-radius:20px;width:100%;max-width:540px;
             box-shadow:0 24px 60px rgba(15,23,42,.22);overflow:hidden;position:relative;">

           <!-- Header -->
           <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:22px 28px 20px;position:relative;">
             <button id="voModAlerteClose"
               style="position:absolute;top:14px;right:18px;background:rgba(255,255,255,.15);border:none;
                      border-radius:8px;width:32px;height:32px;cursor:pointer;color:#fff;font-size:1.1rem;
                      display:flex;align-items:center;justify-content:center;transition:background .15s;">✕</button>
             <div style="display:flex;align-items:center;gap:12px;">
               <div style="background:rgba(255,255,255,.15);border-radius:12px;width:44px;height:44px;
                           display:flex;align-items:center;justify-content:center;font-size:1.4rem;">🔔</div>
               <div>
                 <h3 style="margin:0;font-size:1.1rem;font-weight:800;color:#fff;">Modifier l'alerte</h3>
                 <p style="margin:2px 0 0;font-size:.78rem;color:rgba(255,255,255,.7);">Mettez à jour les informations de cette alerte</p>
               </div>
             </div>
           </div>

           <!-- Body -->
           <div style="padding:24px 28px;">
             <input type="hidden" id="voModAlerteId">

             <!-- Titre -->
             <div class="vo-field-wrap">
               <label>✏️ Titre de l'alerte</label>
               <input id="voModAlerteTitre" type="text" maxlength="255" placeholder="Ex : Stock de médicaments faible à Alger">
               <div class="vo-char-count" id="voModAlerteTitreCount">0 / 255</div>
             </div>

             <!-- Message -->
             <div class="vo-field-wrap">
               <label>💬 Message</label>
               <textarea id="voModAlerteMessage" maxlength="1000" placeholder="Décrivez la situation et les actions à entreprendre..."></textarea>
               <div class="vo-char-count" id="voModAlerteMessageCount">0 / 1000</div>
             </div>

             <!-- Type — visual cards -->
             <div class="vo-field-wrap">
               <label>🏷️ Type d'alerte</label>
               <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                 ${typeCards}
               </div>
               <input type="hidden" id="voModAlerteType">
             </div>

             <!-- Footer -->
             <div class="vo-modal-footer">
               <button id="voModAlerteAnnuler">Annuler</button>
               <button id="voModAlerteSauver">💾 Enregistrer les modifications</button>
             </div>
           </div>
         </div>`;

      document.body.appendChild(modal);

      // Close handlers
      document.getElementById('voModAlerteClose').addEventListener('click', function() { modal.style.display = 'none'; });
      document.getElementById('voModAlerteAnnuler').addEventListener('click', function() { modal.style.display = 'none'; });
      modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });

      // Save handler
      document.getElementById('voModAlerteSauver').addEventListener('click', voSauvegarderAlerte);

      // Char counters
      document.getElementById('voModAlerteTitre').addEventListener('input', function() {
        document.getElementById('voModAlerteTitreCount').textContent = this.value.length + ' / 255';
      });
      document.getElementById('voModAlerteMessage').addEventListener('input', function() {
        document.getElementById('voModAlerteMessageCount').textContent = this.value.length + ' / 1000';
      });

      // Type card selection
      modal.querySelectorAll('.vo-type-card').forEach(function(card) {
        card.addEventListener('click', function() {
          modal.querySelectorAll('.vo-type-card').forEach(function(c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          document.getElementById('voModAlerteType').value = card.dataset.type;
        });
      });
    }

    // Populate fields
    document.getElementById('voModAlerteId').value = id;
    const titreInput = document.getElementById('voModAlerteTitre');
    titreInput.value = titre;
    document.getElementById('voModAlerteTitreCount').textContent = titre.length + ' / 255';
    const msgInput = document.getElementById('voModAlerteMessage');
    msgInput.value = message;
    document.getElementById('voModAlerteMessageCount').textContent = message.length + ' / 1000';

    // Select correct type card
    modal.querySelectorAll('.vo-type-card').forEach(function(c) { c.classList.remove('selected'); });
    const activeCard = modal.querySelector('.vo-type-card[data-type="' + (type_alerte || 'stock_faible') + '"]');
    if (activeCard) activeCard.classList.add('selected');
    document.getElementById('voModAlerteType').value = type_alerte || 'stock_faible';

    modal.style.display = 'flex';
  }

  // ── Sauvegarder les modifications ──
  async function voSauvegarderAlerte() {
    const id = document.getElementById('voModAlerteId').value;
    const titre = document.getElementById('voModAlerteTitre').value.trim();
    const message = document.getElementById('voModAlerteMessage').value.trim();
    const type_alerte = document.getElementById('voModAlerteType').value;
    if (!titre || !message) { alert('Le titre et le message sont requis.'); return; }
    const btn = document.getElementById('voModAlerteSauver');
    if (btn) btn.disabled = true;
    try {
      const res = await fetch('/api/admin/alerte/' + id + '/modifier/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfVo() },
        credentials: 'same-origin',
        body: JSON.stringify({ titre: titre, message: message, type_alerte: type_alerte }),
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('voModifierAlerteModal').style.display = 'none';
        if (window.adminLoadVetOrgData) window.adminLoadVetOrgData();
      } else {
        alert('Erreur : ' + (data.error || 'inconnue'));
      }
    } catch (ex) {
      alert('Erreur réseau lors de la modification.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

    // Tab switching
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.vo-tab-btn');
    if (!btn) return;
    const tab = btn.dataset.tab;
    document.querySelectorAll('.vo-tab-btn').forEach(b => {
      b.className = b.className.replace('primary-btn', 'gray-btn').replace(' active', '');
    });
    btn.className = btn.className.replace('gray-btn', 'primary-btn') + ' active';
    document.querySelectorAll('.vo-tab-content').forEach(t => t.style.display = 'none');
    const el = document.getElementById(tab);
    if (el) el.style.display = '';
  });

  // RDV filter
  document.addEventListener('change', function(e) {
    if (e.target.id === 'voRdvFilterStatut' && voData) renderRdvs(voData.rdvs);
  });

  // Refresh button
  document.addEventListener('click', function(e) {
    if (e.target.id === 'voRefreshBtn') loadVoData();
  });

  // Load when page opens via menu click
  document.addEventListener('click', function(e) {
    const link = e.target.closest('[data-page="adminVetOrgPage"]');
    if (link) setTimeout(loadVoData, 200);
  });

  // Load data on first render so it's ready when the page is opened
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadVoData, 500);
  });

  // Expose for manual call
  window.adminLoadVetOrgData = loadVoData;
})();


/* ══════════════════════════════════════════════════════════
   ALERTE STOCK — Bouton + Modale à 2 étapes (Vet / Org)
   ══════════════════════════════════════════════════════════ */
(function adminStockAlertePatch() {
  // ─── Products available in admin (from loaded data) ─────────
  function getProductsByType(type) {
    // type: 'animal' or 'vegetal'
    // Try to read from global admin product table data
    if (typeof window._adminAllProducts !== 'undefined' && window._adminAllProducts.length) {
      return window._adminAllProducts.filter(p => {
        const cat = (p.category || p.categorie || '').toLowerCase();
        if (type === 'animal') return cat.includes('animal');
        return cat.includes('legume') || cat.includes('fruit') || cat.includes('cereal') || cat.includes('céréal');
      });
    }
    // Fallback: read from product table rows
    const rows = document.querySelectorAll('#adminProductTableBody tr, #adminFarmerProductsTableBody tr');
    const products = [];
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 3) return;
      const name = cells[1]?.textContent?.trim();
      const cat = cells[2]?.textContent?.trim()?.toLowerCase() || '';
      if (!name) return;
      if (type === 'animal' && cat.includes('animal')) products.push(name);
      if (type === 'vegetal' && (cat.includes('legume') || cat.includes('fruit') || cat.includes('cereal') || cat.includes('céréal'))) products.push(name);
    });
    // Default fallback lists
    if (!products.length) {
      if (type === 'animal') return ['Vaches laitières', 'Moutons', 'Chèvres', 'Poulets', 'Dindes', 'Lapins', 'Taureaux'];
      return ['Tomates', 'Pommes de terre', 'Oignons', 'Carottes', 'Oranges', 'Raisins', 'Blé', 'Orge', 'Maïs'];
    }
    return products;
  }

  function getCsrf() {
    const c = document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith('csrftoken='));
    return c ? c.split('=')[1] : '';
  }

  // ─── Step 1: Inject ALERTE button on low-stock rows ────────
  function addAlertButtons() {
    const tbody = document.getElementById('adminProductTableBody') || document.getElementById('adminFarmerProductsTableBody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 5) return;
      const statusCell = cells[4]; // Status column
      const statusText = statusCell?.textContent?.trim() || '';
      if ((statusText.includes('Stock faible') || statusText.includes('Rupture')) &&
          !row.querySelector('.vo-alerte-btn')) {
        const btn = document.createElement('button');
        btn.className = 'vo-alerte-btn';
        btn.style.cssText = 'margin-left:6px;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:0.75rem;font-weight:700;cursor:pointer;';
        btn.textContent = '🚨 ALERTE';
        btn.addEventListener('click', () => openStep1Modal());
        statusCell.appendChild(btn);
      }
    });
  }

  // Also add a global button near stock chart
  function addGlobalAlertBtn() {
    const stockCard = document.querySelector('.stock-card')?.closest('.admin-panel, .admin-chart-card');
    if (!stockCard || document.getElementById('voGlobalAlerteBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'voGlobalAlerteBtn';
    btn.style.cssText = 'margin-top:12px;width:100%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:0.83rem;font-weight:700;cursor:pointer;';
    btn.innerHTML = '🚨 Envoyer Alerte Stock';
    btn.addEventListener('click', () => openStep1Modal());
    stockCard.appendChild(btn);
  }

  // ─── Step 1 Modal: Choose Vet or Org ───────────────────────
  function openStep1Modal() {
    document.getElementById('voStep1Modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'voStep1Modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
      <div style="background:var(--admin-card,#fff);border-radius:20px;padding:32px;max-width:440px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.25);text-align:center;">
        <h3 style="margin:0 0 8px;font-size:1.2rem;">🚨 Envoyer une Alerte de Stock</h3>
        <p style="color:#6b7280;font-size:0.87rem;margin:0 0 28px;">Choisissez le service concerné par cette alerte de baisse de stock :</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
          <button id="voChooseOrg" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:14px;padding:20px 16px;cursor:pointer;font-size:0.92rem;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:8px;">
            <span style="font-size:2rem;">🌿</span>
            ORGANISATEUR<br>DES PLANTES
          </button>
          <button id="voChooseVet" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:14px;padding:20px 16px;cursor:pointer;font-size:0.92rem;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:8px;">
            <span style="font-size:2rem;">🐾</span>
            VÉTÉRINAIRE
          </button>
        </div>
        <button onclick="document.getElementById('voStep1Modal')?.remove()" style="background:#f3f4f6;border:none;border-radius:8px;padding:9px 24px;cursor:pointer;color:#6b7280;font-size:0.85rem;">Annuler</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('voChooseOrg').addEventListener('click', () => { modal.remove(); openStep2Modal('organisation'); });
    document.getElementById('voChooseVet').addEventListener('click', () => { modal.remove(); openStep2Modal('veterinaire'); });
  }

  // ─── Step 2 Modal: Fill info ────────────────────────────────
  function openStep2Modal(role) {
    document.getElementById('voStep2Modal')?.remove();
    const isVet = role === 'veterinaire';
    const products = getProductsByType(isVet ? 'animal' : 'vegetal');
    const roleLabel = isVet ? '🐾 Vétérinaire' : '🌿 Organisateur des Plantes';
    const roleColor = isVet ? '#6366f1' : '#22c55e';

    const productOptions = products.map(p => `<option value="${p}">${p}</option>`).join('');

    const modal = document.createElement('div');
    modal.id = 'voStep2Modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
      <div style="background:var(--admin-card,#fff);border-radius:20px;padding:28px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <span style="background:${roleColor}22;color:${roleColor};padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:700;">${roleLabel}</span>
            <h3 style="margin:8px 0 4px;font-size:1.1rem;">Informations de l'alerte</h3>
            <p style="margin:0;color:#6b7280;font-size:0.82rem;">Remplissez les détails pour informer le service concerné.</p>
          </div>
          <button onclick="document.getElementById('voStep2Modal')?.remove()" style="background:#f3f4f6;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:1.1rem;">✕</button>
        </div>

        <div style="display:grid;gap:14px;">
          <!-- Raison -->
          <div>
            <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:6px;">Raison de l'alerte *</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #e5e7eb;border-radius:10px;cursor:pointer;font-size:0.87rem;" id="voRaisonStockLabel">
                <input type="radio" name="voRaison" value="stock_insuffisant" checked> 📉 Stock insuffisant
              </label>
              <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #e5e7eb;border-radius:10px;cursor:pointer;font-size:0.87rem;" id="voRaisonVenteLabel">
                <input type="radio" name="voRaison" value="produit_non_vendu"> 🚫 Produit non vendu
              </label>
            </div>
          </div>

          <!-- Produit -->
          <div>
            <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:6px;">Produit concerné *</label>
            <select id="voProductSelect" style="width:100%;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:0.87rem;">
              <option value="">-- Sélectionnez un produit --</option>
              ${productOptions}
            </select>
          </div>

          <!-- Message complémentaire -->
          <div>
            <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:6px;">Message complémentaire</label>
            <textarea id="voMessageInput" rows="3" placeholder="Détails supplémentaires (optionnel)..."
              style="width:100%;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:0.87rem;resize:vertical;box-sizing:border-box;"></textarea>
          </div>
        </div>

        <div id="voStep2Error" style="display:none;background:#fee2e2;color:#ef4444;border-radius:8px;padding:10px;font-size:0.83rem;margin-top:12px;"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
          <button onclick="document.getElementById('voStep2Modal')?.remove()" style="background:#f3f4f6;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:0.88rem;">Annuler</button>
          <button id="voSendAlerteBtn" style="background:linear-gradient(135deg,${roleColor},${roleColor}cc);color:#fff;border:none;border-radius:10px;padding:10px 24px;cursor:pointer;font-size:0.88rem;font-weight:700;">🚨 Envoyer l'alerte</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('voSendAlerteBtn').addEventListener('click', () => sendAlerte(role));
  }

  async function sendAlerte(role) {
    const raison = document.querySelector('input[name="voRaison"]:checked')?.value;
    const produit = document.getElementById('voProductSelect')?.value;
    const message = document.getElementById('voMessageInput')?.value?.trim();
    const errDiv = document.getElementById('voStep2Error');

    if (!produit) {
      errDiv.textContent = 'Veuillez sélectionner un produit.';
      errDiv.style.display = '';
      return;
    }

    const raisonLabel = raison === 'stock_insuffisant' ? 'Stock insuffisant' : 'Produit non vendu';
    const titre = `${raisonLabel} — ${produit}`;
    const fullMsg = `Raison: ${raisonLabel}\nProduit: ${produit}${message ? '\n\nDétails: ' + message : ''}`;

    const endpoint = role === 'veterinaire' ? '/api/admin/alerte/stock/' : '/api/admin/alerte/organisation/';

    try {
      document.getElementById('voSendAlerteBtn').textContent = 'Envoi...';
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify({ titre, message: fullMsg, wilayas: [] }),
      });
      const data = await res.json();
      document.getElementById('voStep2Modal')?.remove();
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#22c55e;color:#fff;padding:14px 22px;border-radius:12px;font-size:0.9rem;font-weight:600;z-index:99999;max-width:380px;box-shadow:0 8px 24px rgba(0,0,0,.2)';
      toast.innerHTML = `✅ ${data.message || 'Alerte envoyée avec succès!'}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    } catch(e) {
      const errDiv = document.getElementById('voStep2Error');
      if (errDiv) { errDiv.textContent = 'Erreur réseau. Réessayez.'; errDiv.style.display = ''; }
      const btn = document.getElementById('voSendAlerteBtn');
      if (btn) btn.textContent = '🚨 Envoyer l\'alerte';
    }
  }

  // MutationObserver to catch when product table is populated
  const observer = new MutationObserver(() => {
    addAlertButtons();
    addGlobalAlertBtn();
  });

  function init() {
    const tbody1 = document.getElementById('adminProductTableBody');
    const tbody2 = document.getElementById('adminFarmerProductsTableBody');
    if (tbody1) observer.observe(tbody1, { childList: true });
    if (tbody2) observer.observe(tbody2, { childList: true });
    addGlobalAlertBtn();
    setTimeout(addGlobalAlertBtn, 2000);
    setTimeout(addAlertButtons, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
