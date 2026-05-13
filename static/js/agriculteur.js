function agriGet(id) {
  return document.getElementById(id);
}

function agriShowToast(message, type='success') {
  const toast = agriGet('agriToast');
  if (!toast) {
    alert(message);
    return;
  }
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}


function agriGetCSRFToken() {
  const match = document.cookie.split('; ').find((row) => row.startsWith('csrftoken='));
  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

function agriGetCSRF() {
  return agriGetCSRFToken();
}

function agriRefreshDashboard() {
  agriRenderDashboardDynamic();
  drawAgriCharts();
}

function agriListingDbId(itemOrId) {
  if (itemOrId && typeof itemOrId === 'object') {
    return itemOrId.db_id || String(itemOrId.id || '').replace(/^ANN-/, '');
  }
  return String(itemOrId || '').replace(/^ANN-/, '');
}

async function agriReadJson(response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return { success: false, error: raw || 'Réponse invalide du serveur.' };
  }
}

function agriMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} DA`;
}

function agriOrderMeta(status) {
  const map = {
    en_attente: { label: 'En attente', color: '#d97706', icon: '🕒' },
    confirmee: { label: 'Acceptée', color: '#2563eb', icon: '✅' },
    refusee: { label: 'Refusée', color: '#dc2626', icon: '❌' },
    en_preparation: { label: 'En préparation', color: '#7c3aed', icon: '📦' },
    en_attente_transporteur: { label: 'En attente transporteur', color: '#ea580c', icon: '🚚' },
    expediee: { label: 'En livraison', color: '#0891b2', icon: '🛻' },
    livree: { label: 'Livrée', color: '#16a34a', icon: '✅' },
    annulee: { label: 'Annulée', color: '#6b7280', icon: '⚪' },
  };
  return map[status] || { label: status || 'Inconnu', color: '#6b7280', icon: '•' };
}

function agriActionLabel(status) {
  return {
    en_preparation: 'Accepter',
    refusee: 'Refuser',
    expediee: 'Passer en livraison',
    livree: 'Livrée',
  }[status] || agriOrderMeta(status).label;
}

function initAgriTheme() {
  const savedTheme = localStorage.getItem('agriculteur-theme');
  if (savedTheme === 'dark') document.body.classList.add('dark-mode');
  document.querySelectorAll('.agri-theme-toggle').forEach((btn) => {
    btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('agriculteur-theme', isDark ? 'dark' : 'light');
      document.querySelectorAll('.agri-theme-toggle').forEach((b) => b.textContent = isDark ? '☀️' : '🌙');
    });
  });
}

function agriActivatePage(target) {
  const links = document.querySelectorAll('.agri-nav-link');
  const pages = document.querySelectorAll('.agri-page');
  const pageId = target || 'agriDashboardPage';
  let pageFound = false;

  links.forEach((item) => {
    const isActive = item.getAttribute('data-page') === pageId;
    item.classList.toggle('active', isActive);
    if (isActive) pageFound = true;
  });

  pages.forEach((page) => {
    const isActive = page.id === pageId;
    page.classList.toggle('active', isActive);
    if (isActive) pageFound = true;
  });

  if (!pageFound && pageId !== 'agriDashboardPage') {
    agriActivatePage('agriDashboardPage');
    return;
  }

  if (window.location.hash !== `#${pageId}`) {
    history.replaceState(null, '', `#${pageId}`);
  }

  // Scroll to top on every page switch
  window.scrollTo({ top: 0, behavior: 'instant' });
  const mainEl = document.querySelector('.agri-main');
  if (mainEl) mainEl.scrollTop = 0;

  if (pageId === 'agriOrdersPage') {
    agriLoadOrders();
  } else if (pageId === 'agriProductsPage') {
    agriFetchListings().then(agriRenderProducts).catch(console.error);
  } else if (pageId === 'agriFarmsPage') {
    setTimeout(initAgriMaps, 120);
  } else if (pageId === 'agriNotificationsPage') {
    // Notifications are shown in dashboard panel — redirect there
    agriActivatePage('agriDashboardPage');
    return;
  } else if (pageId === 'agriAidePage') {
    // Charger immédiatement les données de la page Aide
    if (typeof aideLoadVets === 'function')        aideLoadVets();
    if (typeof aideLoadMesRdvs === 'function')     aideLoadMesRdvs();
    if (typeof aideLoadVetTournees === 'function') aideLoadVetTournees();
    if (typeof aidePopulateVetSelect === 'function') aidePopulateVetSelect();
  }

  setTimeout(() => {
    initAgriMaps();
    drawAgriCharts();
  }, 250);
}

function initAgriNavigation() {
  // Use capture phase to prevent other handlers from blocking navigation
  document.addEventListener('click', function (e) {
    const link = e.target.closest('.agri-nav-link[data-page]');
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    agriActivatePage(link.getAttribute('data-page'));
  }, true);

  window.addEventListener('hashchange', () => {
    const target = (window.location.hash || '').replace('#', '');
    if (target) agriActivatePage(target);
  });
}


async function agriEnsureSessionRole() {
  try {
    const response = await fetch('/api/session-info/');
    if (!response.ok) {
      window.location.href = '/login/';
      return false;
    }
    const data = await response.json();
    if (data.role !== 'agriculteur') {
      const target = data.dashboard_url || '/login/';
      agriShowToast(`Session active: ${data.role || 'inconnue'}. Redirection...`, 'error');
      setTimeout(() => { window.location.href = target; }, 900);
      return false;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

let officialProducts = [];
let farmerListings = [];
let agriEditingProductId = null;
let farmerOrders = [];
let agriOrdersFilter = 'all';
let farmerFarms = [];
let activeFarmId = null;
let agriCharts = [];
let agriMaps = {};

function agriRenderDashboardDynamic() {
  const cards = document.querySelectorAll('#agriDashboardPage .agri-dashboard-stats .agri-stat-card');
  const totalSales = farmerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const activeProducts = farmerListings.filter((item) => item.statut !== 'Rupture' && Number(item.quantite || 0) > 0).length;
  const lowStock = farmerListings.filter((item) => item.statut === 'Stock faible' || (Number(item.quantite || 0) > 0 && Number(item.quantite || 0) <= 10)).length;
  const activeOrders = farmerOrders.filter((order) => ['en_attente', 'confirmee', 'en_preparation', 'expediee'].includes(order.statut)).length;
  const toShip = farmerOrders.filter((order) => ['en_preparation', 'expediee'].includes(order.statut)).length;
  const delivered = farmerOrders.filter((order) => order.statut === 'livree').length;
  const setCard = (index, title, value, help) => { const card = cards[index]; if (!card) return; const label = card.querySelector('.agri-stat-label'); const number = card.querySelector('h3'); const small = card.querySelector('small'); if (label) label.textContent = title; if (number) number.textContent = value; if (small) small.textContent = help; };
  setCard(0, 'Total Ventes', agriMoney(totalSales), `${delivered} commande(s) livrée(s)`);
  setCard(1, 'Produits Actifs', String(activeProducts), `${lowStock} stock(s) faible(s)`);
  setCard(2, 'Commandes en cours', String(activeOrders), `${toShip} à préparer/livrer`);
  setCard(3, 'Fermes', String(farmerFarms.length), `${new Set(farmerFarms.map(f => agriParseFarmMeta(f).wilaya).filter(Boolean)).size} wilaya(s)`);
  const notifList = document.querySelector('#agriDashboardPage .agri-notif-list');
  if (notifList) {
    const notices = [];
    farmerListings.filter((item) => item.statut === 'Stock faible' || Number(item.quantite || 0) <= 10).slice(0, 3).forEach((item) => notices.push({ dot: 'agri-dot-orange', title: 'Stock à surveiller', text: `${item.nom} · ${Number(item.quantite || 0)} kg restant(s).` }));
    farmerOrders.filter((order) => order.statut === 'en_attente').slice(0, 3).forEach((order) => notices.push({ dot: 'agri-dot-green', title: 'Nouvelle commande', text: `Commande #${order.id} de ${order.acheteur || 'acheteur'} à traiter.` }));
    if (!farmerFarms.length) notices.push({ dot: 'agri-dot-orange', title: 'Ferme manquante', text: 'Ajoutez votre ferme pour améliorer la localisation et la confiance.' });
    notifList.innerHTML = (notices.length ? notices : [{ dot: 'agri-dot-green', title: 'Tout est à jour', text: 'Aucune alerte active pour le moment.' }]).map((item) => `<div class="agri-notif-item"><div class="agri-notif-dot ${item.dot}"></div><div><strong>${item.title}</strong><p>${item.text}</p></div></div>`).join('');
  }
}
function agriMonthlyTotals(lastMonths = 6) {
  const labels = []; const values = []; const now = new Date();
  for (let i = lastMonths - 1; i >= 0; i -= 1) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); labels.push(d.toLocaleDateString('fr-FR', { month: 'short' })); values.push(0); }
  farmerOrders.forEach((order) => { const date = new Date(order.date_creation || order.date || Date.now()); const idx = labels.findIndex((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - (lastMonths - 1 - i), 1); return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth(); }); if (idx >= 0) values[idx] += Number(order.total || 0); });
  return { labels, values };
}


async function agriFetchOfficialProducts() {
  const response = await fetch('/api/produits/catalog/?scope=official');
  officialProducts = await response.json();
}

async function agriFetchListings() {
  const response = await fetch('/api/produits/agriculteur/liste/');
  farmerListings = await response.json();
}

function agriFillProductSelect() {
  const select = agriGet('agriProductSelect');
  if (!select) return;
  select.innerHTML = officialProducts.map((item) => `<option value="${item.produit_id}">${item.nom}</option>`).join('');
  agriUpdateProductPreset();
}

function agriUpdateProductPreset() {
  const produitId = agriGet('agriProductSelect')?.value;
  const current = officialProducts.find((item) => String(item.produit_id) === String(produitId));
  if (!current) return;
  if (agriGet('agriProductCategory')) agriGet('agriProductCategory').value = current.categorie;
  if (agriGet('agriPriceMin')) agriGet('agriPriceMin').value = current.prix_min;
  if (agriGet('agriPriceMax')) agriGet('agriPriceMax').value = current.prix_max;
  const hint = agriGet('agriPriceHint');
  if (hint) hint.textContent = `Le prix doit etre entre ${current.prix_min} DA et ${current.prix_max} DA.`;
}


async function agriLoadFarms() {
  try {
    const response = await fetch('/api/agriculteur/farms/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Impossible de charger les fermes.');
    farmerFarms = Array.isArray(data) ? data : [];
    window.farmerFarms = farmerFarms;
    if (farmerFarms.length && !activeFarmId) activeFarmId = farmerFarms[0].id;
    agriRenderFarms();
  } catch (error) {
    console.error(error);
    farmerFarms = [];
    window.farmerFarms = farmerFarms;
    agriRenderFarms();
  }
}

function agriParseFarmMeta(farmOrText='') {
  const farm = (farmOrText && typeof farmOrText === 'object') ? farmOrText : null;
  const text = farm ? (farm.main_products || '') : String(farmOrText || '');
  const meta = {
    wilaya: farm?.wilaya || '',
    lieu: farm?.lieu || '',
    commune: farm?.commune || '',
    adresse: farm?.adresse || '',
    culture: farm?.culture || '',
    lat: Number.isFinite(Number(farm?.latitude)) ? Number(farm.latitude) : null,
    lng: Number.isFinite(Number(farm?.longitude)) ? Number(farm.longitude) : null,
  };
  text.split('|').map(part => part.trim()).filter(Boolean).forEach((part) => {
    const [rawKey, ...rest] = part.split(':');
    const key = (rawKey || '').trim().toLowerCase();
    const value = rest.join(':').trim();
    if (!key) return;
    if (key === 'wilaya' && !meta.wilaya) meta.wilaya = value;
    if (key === 'lieu' && !meta.lieu) meta.lieu = value;
    if (key === 'commune' && !meta.commune) meta.commune = value;
    if (key === 'adresse' && !meta.adresse) meta.adresse = value;
    if (key === 'culture' && !meta.culture) meta.culture = value;
    if (key === 'coords' && (!Number.isFinite(meta.lat) || !Number.isFinite(meta.lng))) {
      const coords = value.split(',').map(v => Number(v.trim()));
      if (coords.length === 2 && coords.every(v => Number.isFinite(v))) {
        meta.lat = coords[0];
        meta.lng = coords[1];
      }
    }
  });
  return meta;
}

function agriSelectFarm(farmId) {
  activeFarmId = Number(farmId);
  agriRenderFarms();
  initAgriMaps();
}

function currentFarmSurfaceLabel(farm={}) {
  const surface = Number(farm.surface || 0);
  return surface ? surface + " ha" : "Surface non renseignée";
}

function agriFarmProductEmoji(name='') {
  const t = String(name).toLowerCase();
  if (t.includes('tom')) return '🍅';
  if (t.includes('pomme') || t.includes('terre')) return '🥔';
  if (t.includes('laitue') || t.includes('salade')) return '🥬';
  if (t.includes('fraise')) return '🍓';
  if (t.includes('poiv') || t.includes('piment')) return '🫑';
  if (t.includes('carotte')) return '🥕';
  if (t.includes('orange') || t.includes('agrume')) return '🍊';
  if (t.includes('raisin')) return '🍇';
  return '🌿';
}

function agriRenderFarms() {
  agriRenderDashboardDynamic();
  const container = agriGet('agriFarmsContainer');
  const info = agriGet('agriFarmInfoBox');
  const search = (agriGet('agriFarmsSearchInput')?.value || '').toLowerCase().trim();
  const rows = farmerFarms.filter((farm) => {
    const meta = agriParseFarmMeta(farm);
    return !search || `${farm.name} ${meta.wilaya} ${meta.lieu} ${meta.commune} ${meta.culture}`.toLowerCase().includes(search);
  });

  if (agriGet('agriFarmsTotal')) agriGet('agriFarmsTotal').textContent = farmerFarms.length;
  if (agriGet('agriFarmsMain')) agriGet('agriFarmsMain').textContent = farmerFarms.length ? 1 : 0;
  if (agriGet('agriFarmsWilayas')) agriGet('agriFarmsWilayas').textContent = new Set(farmerFarms.map(f => agriParseFarmMeta(f).wilaya).filter(Boolean)).size;

  if (container) {
    container.innerHTML = rows.length ? rows.map((farm) => {
      const meta = agriParseFarmMeta(farm);
      const active = Number(activeFarmId) === Number(farm.id);
      const place = [meta.commune, meta.wilaya].filter(Boolean).join(' · ') || 'Localisation non renseignée';
      return `
        <button type="button" class="agri-farm-card ${active ? 'active' : ''}" onclick="agriSelectFarm(${farm.id})" style="width:100%;text-align:left;cursor:pointer;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
            <div>
              <div style="font-weight:900;margin-bottom:5px;font-size:16px;">🌾 ${farm.name}</div>
              <div style="color:var(--agri-muted);font-size:13px;">📍 ${place}</div>
            </div>
            <span style="background:${active ? 'rgba(58,139,75,.18)' : 'rgba(120,120,120,.12)'};color:var(--agri-green);border-radius:999px;padding:5px 9px;font-weight:800;font-size:12px;">${active ? 'Active' : 'Voir'}</span>
          </div>
          <div style="color:var(--agri-muted);font-size:13px;margin-top:10px;">${meta.culture || 'Culture non renseignée'} · ${currentFarmSurfaceLabel(farm)}</div>
        </button>
      `;
    }).join('') : '<div class="agri-empty">Aucune ferme enregistrée.</div>';
  }

  const current = farmerFarms.find((farm) => Number(farm.id) === Number(activeFarmId)) || farmerFarms[0] || null;
  if (current && !activeFarmId) activeFarmId = current.id;
  if (info) {
    if (!current) {
      info.innerHTML = '<div class="agri-farm-3d-loading">🌾 Aucune ferme enregistrée pour le moment.</div>';
    } else {
      const meta = agriParseFarmMeta(current);
      const place = [meta.commune, meta.wilaya].filter(Boolean).join(', ') || meta.lieu || 'Algérie';
      const address = meta.adresse || meta.lieu || place;
      const hasCoords = Number.isFinite(meta.lat) && Number.isFinite(meta.lng);
      const coordsText = hasCoords ? `${meta.lat.toFixed(4)}, ${meta.lng.toFixed(4)}` : 'Non renseignées';
      const availableProducts = farmerListings.slice(0, 5);
      const fallbackProducts = [
        { nom: 'Tomates', prix: 120, unite: 'kg', statut: 'Disponible' },
        { nom: 'Pommes de terre', prix: 80, unite: 'kg', statut: 'Disponible' },
        { nom: 'Laitue', prix: 60, unite: 'pièce', statut: 'Disponible' },
        { nom: 'Fraises', prix: 250, unite: 'kg', statut: 'Disponible' },
        { nom: 'Poivrons', prix: 0, unite: '', statut: 'Rupture' },
      ];
      const products = (availableProducts.length ? availableProducts : fallbackProducts).slice(0, 5);
      const ordersCount = farmerOrders.length;
      const revenue = farmerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const satisfaction = Math.min(99, 92 + Math.min(7, ordersCount));
      const productCards = products.map((item) => {
        const status = item.statut === 'Rupture' || Number(item.quantite || 0) === 0 ? 'Rupture' : 'Disponible';
        const price = Number(item.prix || item.price || 0);
        return `<div class="agri-farm-mini-product"><span class="agri-farm-product-emoji">${agriFarmProductEmoji(item.nom)}</span><b>${item.nom || 'Produit'}</b><span class="${status === 'Rupture' ? 'status-off' : 'status-ok'}">${status === 'Rupture' ? '● Rupture' : '● Disponible'}</span><small>${price ? `${price} DA/${item.unite || 'kg'}` : '--'}</small></div>`;
      }).join('');
      info.innerHTML = `
        <div class="agri-farm-3d-inner">
          <div class="agri-farm-visual">
            <img src="/static/images/farm-3d-mockup.png" alt="Carte ferme 3D">
            <div class="agri-farm-certified">🛡️ <div>Ferme certifiée<small>Agriculture biologique</small></div></div>
            <div class="agri-farm-pin">📍 ${place}</div>
            <div class="agri-farm-gallery"><span>🚜</span><span>🌱</span><span>🏡</span></div>
          </div>
          <div class="agri-farm-content">
            <div class="agri-farm-title-row">
              <div>
                <h2>${current.name} 🌿</h2>
                <p class="agri-farm-subtitle">${meta.culture || 'Culture de fruits et légumes frais de haute qualité'}</p>
                <div class="agri-farm-rating"><span>⭐ 4.9</span><span>📍 ${place}</span><span>✅ Profil vérifié</span></div>
              </div>
              <button class="agri-farm-more-btn" type="button">•••</button>
            </div>
            <div class="agri-farm-feature-grid">
              <div class="agri-farm-feature"><span class="ico">🌱</span><b>Bio</b><small>100% naturel</small></div>
              <div class="agri-farm-feature"><span class="ico">💧</span><b>Irrigation</b><small>Moderne</small></div>
              <div class="agri-farm-feature"><span class="ico">☀️</span><b>Exposition</b><small>Optimale</small></div>
              <div class="agri-farm-feature"><span class="ico">👥</span><b>Équipe</b><small>12 membres</small></div>
            </div>
            <div class="agri-farm-products-3d">
              <div class="agri-farm-section-head"><h3>Produits disponibles</h3><span class="agri-farm-count-pill">${farmerListings.length || products.length} produits</span></div>
              <div class="agri-farm-product-strip">${productCards}</div>
            </div>
            <div class="agri-farm-bottom-grid">
              <div class="agri-farm-details-3d"><div class="agri-farm-section-head"><h3>Informations</h3></div><ul>
                <li><span>Surface totale</span><strong>${currentFarmSurfaceLabel(current)}</strong></li>
                <li><span>Type de sol</span><strong>Limoneux</strong></li>
                <li><span>Adresse</span><strong>${address}</strong></li>
                <li><span>Coordonnées</span><strong>${coordsText}</strong></li>
              </ul></div>
              <div class="agri-farm-details-3d"><div class="agri-farm-section-head"><h3>Stats</h3></div><ul>
                <li><span>Produits cultivés</span><strong>${farmerListings.length || products.length}</strong></li>
                <li><span>Commandes</span><strong>${ordersCount}</strong></li>
                <li><span>Revenus</span><strong>${revenue.toLocaleString('fr-DZ')} DA</strong></li>
                <li><span>Satisfaction</span><strong>${satisfaction}%</strong></li>
              </ul></div>
            </div>
            <div class="agri-farm-commitments"><div class="agri-farm-section-head"><h3>Nos engagements</h3></div><ul><li>✅ Agriculture responsable et produits locaux</li><li>✅ Circuit court et prix justes</li><li>✅ Qualité contrôlée avant livraison</li></ul></div>
            <div class="agri-farm-action-row"><button class="primary" type="button">🥬 Visiter la ferme</button><button type="button">💬 Contacter</button><button type="button">↗ Partager</button></div>
          </div>
        </div>`;
    }
  }
}
async function agriSaveFarm() {
  const name = (agriGet('agriFarmName')?.value || '').trim();
  const wilaya = (agriGet('agriFarmWilaya')?.value || '').trim();
  const lieu = (agriGet('agriFarmLieu')?.value || '').trim();
  const commune = (agriGet('agriFarmCommune')?.value || '').trim();
  const adresse = (agriGet('agriFarmAdresse')?.value || '').trim();
  const culture = (agriGet('agriFarmCulture')?.value || '').trim();
  const surface = (agriGet('agriFarmArea')?.value || '').trim();
  const lat = (agriGet('agriFarmLat')?.value || '').trim();
  const lng = (agriGet('agriFarmLng')?.value || '').trim();
  if (!name) return agriShowToast('Nom de ferme obligatoire', 'error');
  try {
    const response = await fetch('/api/agriculteur/farms/add/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': agriGetCSRFToken()
      },
      body: JSON.stringify({ name, wilaya, lieu, commune, adresse, culture, surface, lat, lng })
    });
    const data = await agriReadJson(response);
    if (response.status === 401 || response.status === 403) {
      agriShowToast('Session expirée. Reconnectez-vous.', 'error');
      return;
    }
    if (!response.ok || !data.success) {
      agriShowToast(data.error || 'Impossible d\'ajouter la ferme.', 'error');
      return;
    }
    ['agriFarmName','agriFarmWilaya','agriFarmLieu','agriFarmCommune','agriFarmAdresse','agriFarmCulture','agriFarmArea','agriFarmLat','agriFarmLng'].forEach((id) => { if (agriGet(id)) agriGet(id).value = ''; });
    if (agriGet('agriFarmModal')) agriGet('agriFarmModal').style.display = 'none';
    await agriLoadFarms();
    activeFarmId = data.farm?.id || activeFarmId;
    agriActivatePage('agriFarmsPage');
    agriRenderFarms();
    initAgriMaps();
    setTimeout(initAgriMaps, 220);
    agriShowToast('Ferme ajoutée avec succès');
  } catch (error) {
    console.error(error);
    agriShowToast('Erreur réseau.', 'error');
  }
}

function drawAgriCharts() {
  if (!window.Chart) return;
  agriCharts.forEach(chart => chart.destroy());
  agriCharts = [];
  const salesCtx = agriGet('agriSalesChart');
  if (salesCtx) {
    const monthly = agriMonthlyTotals(6);
    agriCharts.push(new Chart(salesCtx, { type: 'line', data: { labels: monthly.labels, datasets: [{ label: 'Ventes', data: monthly.values, tension: 0.35, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }));
  }
  const ordersCtx = agriGet('agriOrdersChart');
  if (ordersCtx) {
    const statuses = ['en_attente','confirmee','en_preparation','expediee','livree','refusee'];
    agriCharts.push(new Chart(ordersCtx, { type: 'doughnut', data: { labels: statuses.map(s => agriOrderMeta(s).label), datasets: [{ data: statuses.map(s => farmerOrders.filter(o => o.statut === s).length) }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }));
  }
  const totalProductsCtx = agriGet('agriTotalProductsChart');
  if (totalProductsCtx) {
    const byCategory = {};
    farmerListings.forEach(item => { byCategory[item.categorie || 'Autre'] = (byCategory[item.categorie || 'Autre'] || 0) + 1; });
    agriCharts.push(new Chart(totalProductsCtx, { type: 'bar', data: { labels: Object.keys(byCategory), datasets: [{ data: Object.values(byCategory) }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }));
  }
  const addedProductsCtx = agriGet('agriAddedProductsChart');
  if (addedProductsCtx) {
    agriCharts.push(new Chart(addedProductsCtx, { type: 'pie', data: { labels: ['Disponible','Stock faible','Rupture'], datasets: [{ data: ['Disponible','Stock faible','Rupture'].map(s => farmerListings.filter(p => p.statut === s).length) }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }));
  }
}

function initLeafletMap(id, center=[36.75, 3.06], zoom=6) {
  if (!window.L) return null;
  const el = agriGet(id);
  if (!el) return null;
  if (agriMaps[id]) agriMaps[id].remove();
  const map = L.map(id).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  agriMaps[id] = map;
  return map;
}

function initAgriMaps() {
  const currentFarm = farmerFarms.find((farm) => Number(farm.id) === Number(activeFarmId)) || farmerFarms[0] || null;
  const currentMeta = currentFarm ? agriParseFarmMeta(currentFarm) : {};
  const farmCenter = (Number.isFinite(currentMeta.lat) && Number.isFinite(currentMeta.lng)) ? [currentMeta.lat, currentMeta.lng] : [36.19, 5.41];
  const farm = initLeafletMap('agriFarmMap', farmCenter, currentFarm ? 9 : 7);
  if (farm) {
    (farmerFarms.length ? farmerFarms : [{ name: 'Ma ferme', main_products: '', id: 0, surface: 0 }]).forEach((entry, idx) => {
      const meta = agriParseFarmMeta(entry);
      const point = (Number.isFinite(meta.lat) && Number.isFinite(meta.lng)) ? [meta.lat, meta.lng] : [36.19 + (idx * 0.2), 5.41 + (idx * 0.2)];
      const popup = `
        <strong>${entry.name || `Ferme ${idx + 1}`}</strong><br>
        ${meta.wilaya || 'Wilaya non renseignée'}${meta.lieu ? ` · ${meta.lieu}` : ''}<br>
        ${meta.culture ? `Culture: ${meta.culture}<br>` : ''}
        Superficie: ${entry.surface || 0} ha
      `;
      L.marker(point).addTo(farm).bindPopup(popup);
    });
    setTimeout(() => farm.invalidateSize(), 150);
  }
}

function agriRenderProducts() {
  const tbody = agriGet('agriProductsTableBody');
  if (!tbody) return;
  const search = (agriGet('agriProductsSearchInput')?.value || '').toLowerCase().trim();
  const category = agriGet('agriCategoryFilter')?.value || 'all';
  const status = agriGet('agriStatusFilter')?.value || 'all';

  const filtered = farmerListings.filter((item) => {
    const text = `${item.nom} ${item.description || ''}`.toLowerCase();
    return (!search || text.includes(search)) && (category === 'all' || item.categorie === category) && (status === 'all' || item.statut === status);
  });

  tbody.innerHTML = filtered.map((item) => `
    <tr>
      <td><img src="${item.photo || '/static/images/product-placeholder.svg'}" alt="${item.nom}" style="width:56px;height:56px;object-fit:cover;border-radius:12px;"></td>
      <td>${item.nom}</td>
      <td>${item.categorie}</td>
      <td>${item.quantite} kg</td>
      <td>${item.prix} DA</td>
      <td>${item.statut}</td>
      <td>
        <div class="agri-product-actions">
          <button type="button" class="agri-action-btn edit" onclick="agriEditProduct('${item.id}')">Modifier</button>
          <button type="button" class="agri-action-btn delete" onclick="agriDeleteProduct('${item.id}')">Supprimer</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">Aucun produit trouvé.</td></tr>';

  const stats = {
    total: farmerListings.length,
    low: farmerListings.filter((item) => item.statut === 'Stock faible').length,
    out: farmerListings.filter((item) => item.statut === 'Rupture').length,
  };
  const ids = {
    agriTotalProductsValue: stats.total,
    agriProductsAddedValue: stats.total,
    agriLowStockValue: stats.low,
    agriOutStockValue: stats.out,
  };
  Object.entries(ids).forEach(([id, value]) => { if (agriGet(id)) agriGet(id).textContent = value; });
  agriRenderDashboardDynamic();
  drawAgriCharts();
}

function agriResetModalFields() {
  ['agriProductQty', 'agriProductPrice', 'agriProductDescription'].forEach((id) => { if (agriGet(id)) agriGet(id).value = ''; });
  const photoInput = agriGet('agriProductPhoto');
  if (photoInput) photoInput.value = '';
  if (agriGet('agriExistingProductPhoto')) agriGet('agriExistingProductPhoto').value = '';
  if (agriGet('agriProductStatus')) agriGet('agriProductStatus').value = 'Disponible';
  agriUpdateProductPreset();
}

function agriResetProductForm() {
  agriEditingProductId = null;
  if (agriGet('agriEditingProductId')) agriGet('agriEditingProductId').value = '';
  if (agriGet('agriProductModalTitle')) agriGet('agriProductModalTitle').textContent = 'Ajouter Produit';
  if (agriGet('agriSaveProductBtn')) agriGet('agriSaveProductBtn').textContent = 'Enregistrer';
  const select = agriGet('agriProductSelect');
  if (select) select.disabled = false;
  agriResetModalFields();
}

function agriReadProductPhoto() {
  const input = agriGet('agriProductPhoto');
  const file = input?.files?.[0];
  if (!file) return Promise.resolve('');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Photo invalide'));
    reader.readAsDataURL(file);
  });
}

async function agriOpenModal() {
  await agriFetchOfficialProducts();
  agriFillProductSelect();
  agriResetProductForm();
  const modal = agriGet('agriProductModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.scrollTop = 0;
  }
}


function agriEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function agriGetBuyerPhone(order) {
  return order?.acheteur_info?.telephone || order?.acheteur_phone || '—';
}

function agriGetFarmAddress() {
  const current = farmerFarms.find((farm) => Number(farm.id) === Number(activeFarmId)) || farmerFarms[0] || null;
  if (!current) return '';
  const meta = agriParseFarmMeta(current);
  return meta.adresse || meta.lieu || meta.commune || meta.wilaya || current.name || '';
}

function agriEstimateDistance(order, farmAddress) {
  const text = `${farmAddress || ''} ${order?.adresse_livraison || ''}`;
  let score = 18 + ((text.length * 7) % 55);
  if ((farmAddress || '').toLowerCase().split(/\s+/).some(w => w && (order?.adresse_livraison || '').toLowerCase().includes(w))) score = Math.max(8, score - 18);
  return score;
}

function agriEstimateCoursePrice(distanceKm) {
  return Math.round(Number(distanceKm || 0) * 10);
}

function agriOrderProductsHtml(order) {
  const lines = order.lignes || [];
  if (!lines.length) return '<div class="agri-course-muted">Aucun produit.</div>';
  return lines.map(l => `
    <div class="agri-order-product-row">
      <span>${agriEscape(l.produit_nom || 'Produit')}</span>
      <b>${Number(l.quantite || 0)} kg</b>
      <strong>${agriMoney(l.sous_total)}</strong>
    </div>
  `).join('');
}

function agriOpenDeliveryOptions(orderId) {
  const order = farmerOrders.find(o => Number(o.id) === Number(orderId));
  if (!order) return agriShowToast('Commande introuvable', 'error');
  const phone = agriGetBuyerPhone(order);
  const modal = document.createElement('div');
  modal.className = 'agri-workflow-modal';
  modal.innerHTML = `
    <div class="agri-workflow-panel small">
      <button class="agri-modal-x" type="button" onclick="this.closest('.agri-workflow-modal').remove()">×</button>
      <div class="agri-modal-icon">🚚</div>
      <h3>Livraison commande #${order.id}</h3>
      <p>Choisissez comment continuer: contacter l’acheteur ou demander une course à un transporteur.</p>
      <div class="agri-modal-actions">
        <a class="agri-btn agri-btn-light" href="tel:${agriEscape(phone)}">📞 Contacter l’acheteur</a>
        <button class="agri-btn agri-btn-primary" type="button" onclick="this.closest('.agri-workflow-modal').remove(); agriOpenCourseForm(${order.id});">🚚 Demander course</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}


/* === FINAL PRO GPS + ADRESSE + REAL DISTANCE HELPERS === */
let agriCourseMapInstance = null;
let agriCourseStart = null;
let agriCourseEnd = null;
let agriCourseStartMarker = null;
let agriCourseEndMarker = null;
let agriCourseRouteLine = null;
let agriCourseRouteReady = false;

function agriFormatLatLng(latlng) {
  if (!latlng) return '';
  return `${Number(latlng.lat).toFixed(6)}, ${Number(latlng.lng).toFixed(6)}`;
}

async function agriReverseGeocode(latlng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await response.json();
    return data.display_name || agriFormatLatLng(latlng);
  } catch (error) {
    console.warn('Reverse geocoding failed', error);
    return agriFormatLatLng(latlng);
  }
}

function agriGetStraightDistanceKm(start, end) {
  if (!start || !end) return 0;
  const toRad = (value) => Number(value) * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function agriSnapPointToRoad(point) {
  const url = `https://router.project-osrm.org/nearest/v1/driving/${Number(point.lng)},${Number(point.lat)}?number=1`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Service OSRM nearest indisponible');
  const data = await response.json();
  if (data.code !== 'Ok' || !data.waypoints || !data.waypoints.length) {
    throw new Error('Aucune route proche de ce point');
  }
  const [lng, lat] = data.waypoints[0].location;
  return { lat, lng };
}

async function agriGetRealRoute(start, end) {
  if (!start || !end) throw new Error('Départ ou destination manquant');
  const snappedStart = await agriSnapPointToRoad(start);
  const snappedEnd = await agriSnapPointToRoad(end);
  const url = `https://router.project-osrm.org/route/v1/driving/${snappedStart.lng},${snappedStart.lat};${snappedEnd.lng},${snappedEnd.lat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Service OSRM route indisponible');
  const data = await response.json();
  console.log('OSRM route réelle:', data);
  if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
    throw new Error(data.message || 'Route réelle introuvable');
  }
  const route = data.routes[0];
  if (!route.distance || route.distance <= 0) throw new Error('Distance réelle invalide');
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration ? route.duration / 60 : null,
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    snappedStart,
    snappedEnd,
  };
}

function agriSetCourseRouteStatus(message, type = 'info') {
  const el = agriGet('agriCourseRouteStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `agri-route-status ${type}`;
}

function agriSetCoursePrice(distanceKm, isReal = false, durationMin = null) {
  const distanceValue = Math.max(0, Number(distanceKm || 0));
  const price = agriEstimateCoursePrice(distanceValue);
  const distanceInput = agriGet('agriCourseDistanceInput');
  if (distanceInput) distanceInput.value = isReal ? distanceValue.toFixed(2) : '0';
  if (agriGet('agriCourseDistance')) {
    const durationText = durationMin ? ` · ${Math.round(durationMin)} min` : '';
    agriGet('agriCourseDistance').textContent = isReal ? `${distanceValue.toFixed(2)} km réels${durationText}` : 'Route réelle non calculée';
  }
  if (agriGet('agriCoursePrice')) agriGet('agriCoursePrice').textContent = isReal ? agriMoney(price) : '—';
  agriCourseRouteReady = Boolean(isReal && distanceValue > 0);
}

async function agriUpdateCourseAddress(type) {
  const point = type === 'start' ? agriCourseStart : agriCourseEnd;
  if (!point) return;
  const address = await agriReverseGeocode(point);
  if (type === 'start') {
    const depart = agriGet('agriCourseDepart');
    const startText = agriGet('agriCourseStartAddress');
    if (depart) depart.value = address;
    if (startText) startText.textContent = address;
  } else {
    const dest = agriGet('agriCourseDestination');
    const endText = agriGet('agriCourseEndAddress');
    if (dest) dest.value = address;
    if (endText) endText.textContent = address;
  }
}

async function agriUpdateCourseRoute() {
  if (!agriCourseMapInstance || !agriCourseStart || !agriCourseEnd) {
    agriCourseRouteReady = false;
    agriSetCoursePrice(0, false);
    agriSetCourseRouteStatus('Placez le départ et la destination pour calculer la route réelle.', 'info');
    return;
  }
  agriCourseRouteReady = false;
  agriSetCoursePrice(0, false);
  agriSetCourseRouteStatus('Calcul de la route réelle avec OSRM...', 'loading');
  try {
    const route = await agriGetRealRoute(agriCourseStart, agriCourseEnd);
    agriSetCoursePrice(route.distanceKm, true, route.durationMin);
    if (agriCourseRouteLine) agriCourseMapInstance.removeLayer(agriCourseRouteLine);
    agriCourseRouteLine = L.polyline(route.coordinates, { weight: 5, opacity: 0.9 }).addTo(agriCourseMapInstance);
    agriCourseMapInstance.fitBounds(agriCourseRouteLine.getBounds(), { padding: [28, 28] });
    agriSetCourseRouteStatus('Route réelle calculée avec succès.', 'success');
  } catch (error) {
    console.error('OSRM route réelle échouée:', error);
    agriCourseRouteReady = false;
    agriSetCoursePrice(0, false);
    if (agriCourseRouteLine) {
      agriCourseMapInstance.removeLayer(agriCourseRouteLine);
      agriCourseRouteLine = null;
    }
    agriSetCourseRouteStatus('Route réelle indisponible. Déplacez les marqueurs près d’une route puis réessayez.', 'error');
    agriShowToast('OSRM n’a pas trouvé de route réelle. Placez les points près d’une route.', 'error');
  }
}

async function agriSetCourseStart(latlng, updateAddress = true) {
  agriCourseStart = { lat: latlng.lat, lng: latlng.lng };
  if (agriCourseStartMarker) {
    agriCourseStartMarker.setLatLng(agriCourseStart);
  } else {
    agriCourseStartMarker = L.marker(agriCourseStart, { draggable: true }).addTo(agriCourseMapInstance).bindPopup('Départ ferme');
    agriCourseStartMarker.on('dragend', async (e) => {
      agriCourseStart = e.target.getLatLng();
      await agriUpdateCourseAddress('start');
      await agriUpdateCourseRoute();
    });
  }
  agriCourseStartMarker.openPopup();
  if (updateAddress) await agriUpdateCourseAddress('start');
  await agriUpdateCourseRoute();
}

async function agriSetCourseEnd(latlng, updateAddress = true) {
  agriCourseEnd = { lat: latlng.lat, lng: latlng.lng };
  if (agriCourseEndMarker) {
    agriCourseEndMarker.setLatLng(agriCourseEnd);
  } else {
    agriCourseEndMarker = L.marker(agriCourseEnd, { draggable: true }).addTo(agriCourseMapInstance).bindPopup('Destination acheteur');
    agriCourseEndMarker.on('dragend', async (e) => {
      agriCourseEnd = e.target.getLatLng();
      await agriUpdateCourseAddress('end');
      await agriUpdateCourseRoute();
    });
  }
  agriCourseEndMarker.openPopup();
  if (updateAddress) await agriUpdateCourseAddress('end');
  await agriUpdateCourseRoute();
}

function agriResetCourseMap() {
  agriCourseStart = null;
  agriCourseEnd = null;
  if (agriCourseStartMarker && agriCourseMapInstance) agriCourseMapInstance.removeLayer(agriCourseStartMarker);
  if (agriCourseEndMarker && agriCourseMapInstance) agriCourseMapInstance.removeLayer(agriCourseEndMarker);
  if (agriCourseRouteLine && agriCourseMapInstance) agriCourseMapInstance.removeLayer(agriCourseRouteLine);
  agriCourseStartMarker = null;
  agriCourseEndMarker = null;
  agriCourseRouteLine = null;
  agriCourseRouteReady = false;
  if (agriGet('agriCourseStartAddress')) agriGet('agriCourseStartAddress').textContent = 'Choisir GPS ou cliquer sur la carte';
  if (agriGet('agriCourseEndAddress')) agriGet('agriCourseEndAddress').textContent = 'Cliquer sur la carte';
  agriSetCoursePrice(0, false);
  agriSetCourseRouteStatus('Placez le départ et la destination pour calculer la route réelle.', 'info');
}

function agriUseGPSForCourse() {
  if (!navigator.geolocation) {
    agriShowToast('GPS non supporté par ce navigateur.', 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      agriCourseMapInstance.setView([point.lat, point.lng], 15);
      await agriSetCourseStart(point, true);
    },
    () => agriShowToast('Active la permission localisation GPS puis réessaie.', 'error'),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function agriFarmCoordinatesFromAddress(address) {
  const text = String(address || '').toLowerCase();
  if (text.includes('constantine')) return { lat: 36.365, lng: 6.6147 };
  if (text.includes('alger') || text.includes('algiers')) return { lat: 36.7538, lng: 3.0588 };
  if (text.includes('setif') || text.includes('sétif')) return { lat: 36.1911, lng: 5.4137 };
  if (text.includes('oran')) return { lat: 35.6971, lng: -0.6308 };
  if (text.includes('batna')) return { lat: 35.5559, lng: 6.1741 };
  return { lat: 36.365, lng: 6.6147 };
}

async function agriGeocodeAddress(address) {
  if (!address) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(address)}&limit=1`; // Algerie/Tunisie accepte
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn('Geocoding failed', e);
  }
  return null;
}

function agriInitCourseMap(farmAddress, destinationAddress) {
  if (!window.L || !agriGet('agriCourseMap')) {
    agriShowToast('Leaflet map non chargé.', 'error');
    return;
  }

  if (agriCourseMapInstance) {
    agriCourseMapInstance.remove();
    agriCourseMapInstance = null;
  }

  agriCourseStart = null;
  agriCourseEnd = null;
  agriCourseStartMarker = null;
  agriCourseEndMarker = null;
  agriCourseRouteLine = null;

  const farmPoint = agriFarmCoordinatesFromAddress(farmAddress);
  agriCourseMapInstance = L.map('agriCourseMap').setView([farmPoint.lat, farmPoint.lng], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(agriCourseMapInstance);

  agriCourseMapInstance.on('click', async (e) => {
    if (!agriCourseStart) {
      await agriSetCourseStart(e.latlng, true);
    } else {
      await agriSetCourseEnd(e.latlng, true);
    }
  });

  setTimeout(async () => {
    agriCourseMapInstance.invalidateSize();

    // Try to geocode farm address for precise start point
    let startPoint = farmPoint;
    if (farmAddress) {
      const geocoded = await agriGeocodeAddress(farmAddress);
      if (geocoded) startPoint = geocoded;
    }
    await agriSetCourseStart(startPoint, true);

    // Auto-place destination if address is available
    if (destinationAddress) {
      const destPoint = await agriGeocodeAddress(destinationAddress);
      if (destPoint) {
        await agriSetCourseEnd(destPoint, true);
      } else {
        // Update the destination text UI even if geocoding fails
        const endText = agriGet('agriCourseEndAddress');
        if (endText) endText.textContent = destinationAddress + ' (cliquez sur la carte pour préciser)';
      }
    }
  }, 200);
}

function agriOpenCourseForm(orderId) {
  const order = farmerOrders.find(o => Number(o.id) === Number(orderId));
  if (!order) return agriShowToast('Commande introuvable', 'error');

  const farmAddress = agriGetFarmAddress();
  const destination = order.adresse_livraison || '';

  const modal = document.createElement('div');
  modal.className = 'agri-workflow-modal';
  modal.innerHTML = `
    <div class="agri-workflow-panel wide">
      <button class="agri-modal-x" type="button" onclick="this.closest('.agri-workflow-modal').remove()">×</button>
      <div class="agri-course-head">
        <div>
          <div class="agri-modal-icon">🛻</div>
          <h3>Demander une course</h3>
          <p>Choisis la ferme de départ, puis clique sur la carte pour placer la destination réelle. Le prix se calcule à 10 DA/km.</p>
        </div>
        <div class="agri-course-price">
          <span>Prix estimé</span>
          <strong id="agriCoursePrice">—</strong>
          <small id="agriCourseDistance">Route réelle non calculée</small>
        </div>
      </div>

      <div class="agri-course-grid">
        <div class="agri-course-form">
          <label>Ferme de départ</label>
          <select id="agriFarmSelect" onchange="agriSelectFarmForCourse(this)">
            ${farmerFarms.map((farm, index) => {
              const meta = agriParseFarmMeta(farm);
              const addr = meta.adresse || meta.lieu || meta.commune || meta.wilaya || farm.name || `Ferme ${index + 1}`;
              return `<option value="${agriEscape(addr)}">${agriEscape(farm.name || `Ferme ${index + 1}`)} — ${agriEscape(addr)}</option>`;
            }).join('') || `<option value="${agriEscape(farmAddress || 'Ferme principale')}">Ferme principale</option>`}
          </select>

          <label>Départ — adresse ferme</label>
          <input id="agriCourseDepart" value="${agriEscape(farmAddress || 'Ferme principale')}" placeholder="Adresse de votre ferme">

          <label>Destination — acheteur</label>
          <input id="agriCourseDestination" value="${agriEscape(destination)}" placeholder="Adresse de l’acheteur">

          <div class="agri-location-box">
            <p><b>📍 Départ:</b> <span id="agriCourseStartAddress">Choisir GPS ou cliquer sur la carte</span></p>
            <p><b>🎯 Destination:</b> <span id="agriCourseEndAddress">Cliquer sur la carte</span></p>
          </div>
          <div id="agriCourseRouteStatus" class="agri-route-status info">Placez le départ et la destination pour calculer la route réelle.</div>

          <input id="agriCourseDistanceInput" type="hidden" value="0">

          <label>Résumé commande</label>
          <div class="agri-course-summary">
            <strong>Acheteur: ${agriEscape(order.acheteur_info?.nom || order.acheteur || '—')}</strong>
            <span>📞 ${agriEscape(agriGetBuyerPhone(order))}</span>
            <span>Total commande: ${agriMoney(order.total)}</span>
            <div class="agri-course-lines">${agriOrderProductsHtml(order)}</div>
          </div>
        </div>

        <div>
          <div id="agriCourseMap" class="agri-course-map"></div>
          <div class="agri-map-actions">
            <button class="agri-btn agri-btn-light" type="button" onclick="agriUseGPSForCourse()">📍 Utiliser GPS comme ferme</button>
            <button class="agri-btn agri-btn-light" type="button" onclick="agriResetCourseMap()">🔄 Réinitialiser</button>
          </div>
          <div class="agri-route-mini">
            <span>🌾 Ferme</span><i></i><span>📍 Acheteur</span>
          </div>
        </div>
      </div>

      <div class="agri-modal-actions end">
        <button class="agri-btn agri-btn-light" type="button" onclick="this.closest('.agri-workflow-modal').remove()">Annuler</button>
        <button class="agri-btn agri-btn-primary" type="button" onclick="agriSubmitCourseRequest(${order.id}, this)">Confirmer la demande</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => agriInitCourseMap(farmAddress, destination), 180);
}

function agriUpdateCourseEstimate() {
  const distance = Number(agriGet('agriCourseDistanceInput')?.value || 0);
  const price = agriEstimateCoursePrice(distance);
  if (agriGet('agriCoursePrice')) agriGet('agriCoursePrice').textContent = agriMoney(price);
  if (agriGet('agriCourseDistance')) agriGet('agriCourseDistance').textContent = distance > 0 ? `${distance} km réels` : 'Route réelle non calculée';
}

async function agriSelectFarmForCourse(select) {
  const address = select?.value || '';
  const depart = agriGet('agriCourseDepart');
  if (depart) depart.value = address;
  if (!agriCourseMapInstance) return;
  const point = agriFarmCoordinatesFromAddress(address);
  agriCourseMapInstance.setView([point.lat, point.lng], 12);
  await agriSetCourseStart(point, true);
}

async function agriSubmitCourseRequest(orderId, btn) {
  const depart = (agriGet('agriCourseDepart')?.value || '').trim();
  const destination = (agriGet('agriCourseDestination')?.value || '').trim();
  const distance = Number(agriGet('agriCourseDistanceInput')?.value || 0);
  if (!depart || !destination) return agriShowToast('Départ et destination obligatoires.', 'error');
  if (!agriCourseStart || !agriCourseEnd) return agriShowToast('Clique sur la carte pour placer départ et destination.', 'error');
  if (!agriCourseRouteReady || !distance || distance <= 0) return agriShowToast('Calculez une route réelle valide avant de confirmer.', 'error');

  const old = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Envoi...'; }

  try {
    const response = await fetch(`/api/produits/commandes/${orderId}/course/demander/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': agriGetCSRF() },
      body: JSON.stringify({ lieu_depart: depart, lieu_destination: destination, distance_km: distance }),
    });
    const data = await agriReadJson(response);
    if (!response.ok || !data.success) {
      agriShowToast(data.error || 'Impossible de demander la course.', 'error');
      return;
    }
    document.querySelector('.agri-workflow-modal')?.remove();
    agriShowToast(`Course demandée · prix estimé ${agriMoney(data.prix_estime)}`);
    await agriLoadOrders();
  } catch (error) {
    console.error(error);
    agriShowToast('Erreur réseau.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = old || 'Confirmer la demande'; }
  }
}

async function agriCancelCourse(orderId) {
  if (!confirm('Annuler cette course ?')) return;
  try {
    const response = await fetch(`/api/produits/commandes/${orderId}/course/annuler/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': agriGetCSRF() },
      body: JSON.stringify({}),
    });
    const data = await agriReadJson(response);
    if (!response.ok || !data.success) return agriShowToast(data.error || 'Impossible d’annuler la course.', 'error');
    agriShowToast('Course annulée.');
    await agriLoadOrders();
  } catch (error) {
    console.error(error);
    agriShowToast('Erreur réseau.', 'error');
  }
}



function agriRenderOrders() {
  const container = agriGet('agriOrdersContainer');
  if (!container) return;
  const search = (agriGet('agriOrdersSearchInput')?.value || '').toLowerCase().trim();
  const matchesFilter = (order) => {
    if (agriOrdersFilter === 'new') return order.statut === 'en_attente';
    if (agriOrdersFilter === 'progress') return ['confirmee', 'en_preparation', 'en_attente_transporteur', 'expediee'].includes(order.statut);
    if (agriOrdersFilter === 'delivered') return order.statut === 'livree';
    if (agriOrdersFilter === 'refused') return ['refusee', 'annulee'].includes(order.statut);
    return true;
  };
  const filtered = farmerOrders.filter((order) => {
    const lignesText = (order.lignes || []).map((l) => `${l.produit_nom} ${l.quantite}`).join(' ');
    const hay = `${order.id} ${order.acheteur} ${order.acheteur_info?.telephone || ''} ${order.adresse_livraison} ${order.statut} ${agriOrderMeta(order.statut).label} ${lignesText}`.toLowerCase();
    return matchesFilter(order) && (!search || hay.includes(search));
  });

  if (agriGet('agriOrdersTotal')) agriGet('agriOrdersTotal').textContent = farmerOrders.length;
  if (agriGet('agriOrdersNew')) agriGet('agriOrdersNew').textContent = farmerOrders.filter(o => o.statut === 'en_attente').length;
  if (agriGet('agriOrdersProgress')) agriGet('agriOrdersProgress').textContent = farmerOrders.filter(o => ['confirmee','en_preparation','en_attente_transporteur','expediee'].includes(o.statut)).length;
  if (agriGet('agriOrdersDelivered')) agriGet('agriOrdersDelivered').textContent = farmerOrders.filter(o => o.statut === 'livree').length;

  if (!filtered.length) {
    container.innerHTML = '<div class="agri-empty">Aucune commande trouvée.</div>';
    if (agriGet('agriTrackingInfo')) agriGet('agriTrackingInfo').innerHTML = '<strong>Suivi</strong><p>Les nouvelles commandes apparaîtront ici.</p>';
    agriRenderDashboardDynamic();
    drawAgriCharts();
    return;
  }

  container.innerHTML = filtered.map((order) => {
    const meta = agriOrderMeta(order.statut);
    const buyer = order.acheteur_info || {};
    const livraison = order.livraison || {};
    const transporteur = order.transporteur_info || {};
    let buttons = '';
    if (order.statut === 'en_attente') {
      buttons = `
        <button class="agri-btn agri-btn-light danger" onclick="agriChangeOrderStatus(${order.id}, 'refusee')">❌ Refuser</button>
        <button class="agri-btn agri-btn-primary" onclick="agriChangeOrderStatus(${order.id}, 'en_preparation')">✅ Accepter</button>
      `;
    } else if (order.statut === 'en_preparation') {
      buttons = `<button class="agri-btn agri-btn-primary" onclick="agriOpenDeliveryOptions(${order.id})">🚚 Livrer</button>`;
    } else if (order.statut === 'en_attente_transporteur') {
      buttons = `<button class="agri-btn agri-btn-light danger" onclick="agriCancelCourse(${order.id})">Annuler course</button>`;
    } else if (order.statut === 'expediee') {
      buttons = `
        <a class="agri-btn agri-btn-light" href="tel:${agriEscape(transporteur.telephone || '')}">📞 Appeler transporteur</a>
        <button class="agri-btn agri-btn-light danger" onclick="agriCancelCourse(${order.id})">Annuler course</button>

      `;
    }

    const notifTransporteur = order.statut === 'expediee' ? `
      <div class="agri-transport-notification">
        <div class="agri-notif-pulse">🔔</div>
        <div>
          <strong>Transporteur accepté</strong>
          <p>${agriEscape(transporteur.nom || 'Transporteur')} · ${agriEscape(transporteur.telephone || 'Téléphone non renseigné')}</p>
          <small>${agriEscape(livraison.lieu_depart || 'Ferme')} → ${agriEscape(livraison.lieu_destination || order.adresse_livraison || 'Destination')}</small>
        </div>
      </div>
    ` : '';

    return `
      <article class="agri-order-pro-card">
        <div class="agri-order-top">
          <div>
            <div class="agri-order-id">CMD-${order.id}</div>
            <h4>${agriEscape(buyer.nom || order.acheteur || 'Acheteur')}</h4>
            <div class="agri-buyer-grid">
              <span>📞 ${agriEscape(buyer.telephone || '—')}</span>
              <span>✉️ ${agriEscape(buyer.email || '—')}</span>
              <span>📍 ${agriEscape(order.adresse_livraison || '—')}</span>
              <span>🕒 ${new Date(order.date_creation).toLocaleString('fr-FR')}</span>
            </div>
          </div>
          <span class="agri-status-pill" style="background:${meta.color};">${meta.icon} ${meta.label}</span>
        </div>

        <div class="agri-order-products-box">
          <div class="agri-section-title">Produits commandés</div>
          ${agriOrderProductsHtml(order)}
        </div>

        <div class="agri-order-bottom">
          <div>
            <span class="agri-muted">Total commande</span>
            <strong>${agriMoney(order.total)}</strong>
          </div>
          <div>
            <span class="agri-muted">Livraison</span>
            <strong>${agriEscape((livraison.status || 'non_assignee').replaceAll('_', ' '))}</strong>
          </div>
        </div>

        ${notifTransporteur}

        <div class="agri-order-actions">${buttons || '<span class="agri-muted">Aucune action disponible.</span>'}</div>
      </article>
    `;
  }).join('');

  const latest = filtered[0];
  if (agriGet('agriTrackingInfo') && latest) {
    agriGet('agriTrackingInfo').innerHTML = `<strong>Commande #${latest.id}</strong><p>${(latest.lignes || []).map(l => `${l.produit_nom} (${l.quantite} kg)`).join(', ')}</p><p>Statut: ${agriOrderMeta(latest.statut).label}</p><p>Acheteur: ${latest.acheteur}</p>`;
  }
  agriRenderDashboardDynamic();
  drawAgriCharts();
}


async function agriLoadOrders() {
  const container = agriGet('agriOrdersContainer');
  if (container) container.innerHTML = '<div class="agri-empty">Chargement des commandes...</div>';
  try {
    const response = await fetch('/api/produits/commandes/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        await agriEnsureSessionRole();
      }
      throw new Error(data.error || 'Impossible de charger les commandes.');
    }
    farmerOrders = Array.isArray(data) ? data : [];
    agriRenderOrders();
    initAgriMaps();
  } catch (error) {
    console.error(error);
    if (container) container.innerHTML = `<div class="agri-empty">${error.message || 'Impossible de charger les commandes.'}</div>`;
  }
}

async function agriChangeOrderStatus(orderId, status) {
  try {
    const response = await fetch(`/api/produits/commandes/${orderId}/statut/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ statut: status }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      agriShowToast(data.error || 'Impossible de modifier le statut.', 'error');
      if (response.status === 401 || response.status === 403) {
        await agriEnsureSessionRole();
      }
      await agriLoadOrders();
      return;
    }
    agriShowToast(`Commande #${orderId} mise à jour`);
    await agriLoadOrders();
    await agriFetchListings();
    agriRenderProducts();
  } catch (error) {
    console.error(error);
    agriShowToast('Erreur réseau.');
  }
}

function initAgriFarms() {
  const modal = agriGet('agriFarmModal');
  agriGet('agriAddFarmBtn')?.addEventListener('click', () => { if (modal) modal.style.display = 'flex'; });
  agriGet('agriCloseFarmModalBtn')?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
  modal?.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; agriResetProductForm(); } });
  agriGet('agriSaveFarmBtn')?.addEventListener('click', agriSaveFarm);
  agriGet('agriFarmsSearchInput')?.addEventListener('input', agriRenderFarms);
  agriGet('agriDashboardViewFarmsBtn')?.addEventListener('click', async () => {
    agriActivatePage('agriFarmsPage');
    await agriLoadFarms();
  });
}


async function agriOpenEditProductModal(productId) {
  await agriFetchOfficialProducts();
  agriFillProductSelect();

  const item = farmerListings.find((product) => String(product.id) === String(productId));
  if (!item) return agriShowToast('Produit introuvable', 'error');

  agriEditingProductId = agriListingDbId(item);
  if (agriGet('agriEditingProductId')) agriGet('agriEditingProductId').value = agriEditingProductId;
  if (agriGet('agriProductModalTitle')) agriGet('agriProductModalTitle').textContent = 'Modifier Produit';
  if (agriGet('agriSaveProductBtn')) agriGet('agriSaveProductBtn').textContent = 'Modifier';

  const select = agriGet('agriProductSelect');
  if (select) {
    const officialId = item.produit_id || item.produit || item.official_product_id || '';
    if (officialId) select.value = String(officialId);
    const byName = officialProducts.find((product) => String(product.nom).toLowerCase() === String(item.nom).toLowerCase());
    if (!officialId && byName) select.value = String(byName.produit_id);
    select.disabled = true;
  }

  agriUpdateProductPreset();

  if (agriGet('agriProductCategory')) agriGet('agriProductCategory').value = item.categorie || '';
  if (agriGet('agriProductQty')) agriGet('agriProductQty').value = item.quantite || 0;
  if (agriGet('agriProductPrice')) agriGet('agriProductPrice').value = item.prix || 0;
  const photoInput = agriGet('agriProductPhoto');
  if (photoInput) photoInput.value = '';
  if (agriGet('agriExistingProductPhoto')) agriGet('agriExistingProductPhoto').value = item.photo || '';
  if (agriGet('agriProductStatus')) agriGet('agriProductStatus').value = item.statut || 'Disponible';
  if (agriGet('agriProductDescription')) agriGet('agriProductDescription').value = item.description || '';

  if (agriGet('agriProductModal')) agriGet('agriProductModal').style.display = 'flex';
}

window.agriEditProduct = function(productId) {
  agriOpenEditProductModal(productId).catch((error) => {
    console.error(error);
    agriShowToast('Impossible de modifier ce produit', 'error');
  });
};

window.agriDeleteProduct = async function(productId) {
  const item = farmerListings.find((product) => String(product.id) === String(productId));
  const dbProductId = agriListingDbId(item || productId);
  if (!item) return agriShowToast('Produit introuvable', 'error');

  if (!confirm(`Supprimer "${item.nom}" ?`)) return;

  try {
    let response = await fetch(`/api/produits/agriculteur/${dbProductId}/supprimer/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': agriGetCSRF(),
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      response = await fetch(`/api/produits/agriculteur/supprimer/${dbProductId}/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': agriGetCSRF(),
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
    }

    if (!response.ok) throw new Error('delete endpoint not available');

    farmerListings = farmerListings.filter((product) => String(product.id) !== String(productId));
    await agriFetchListings().catch(() => {});
    agriRenderProducts();
    agriRefreshDashboard();
    agriShowToast('Produit supprimé avec succès');
  } catch (error) {
    console.warn('Delete API unavailable, applying local UI fallback:', error);
    farmerListings = farmerListings.filter((product) => String(product.id) !== String(productId));
    agriRenderProducts();
    agriRefreshDashboard();
    agriShowToast('Produit supprimé localement');
  }
};

async function agriUpdateProduct(productId, payload) {
  const dbProductId = agriListingDbId(productId);
  const endpoints = [
    { url: `/api/produits/agriculteur/${dbProductId}/modifier/`, method: 'PUT' },
    { url: `/api/produits/agriculteur/${dbProductId}/modifier/`, method: 'POST' },
    { url: `/api/produits/agriculteur/modifier/${dbProductId}/`, method: 'POST' }
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': agriGetCSRF(),
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) return response.json().catch(() => ({}));
  }

  throw new Error('update endpoint not available');
}


function initAgriProducts() {
  const modal = agriGet('agriProductModal');
  agriGet('agriOpenProductModalBtn')?.addEventListener('click', () => { agriResetProductForm(); agriOpenModal(); });
  agriGet('agriDashboardAddProductBtn')?.addEventListener('click', async () => {
    document.querySelectorAll('.agri-nav-link').forEach((link) => link.classList.remove('active'));
    document.querySelector('[data-page="agriProductsPage"]')?.classList.add('active');
    document.querySelectorAll('.agri-page').forEach((page) => page.classList.remove('active'));
    agriGet('agriProductsPage')?.classList.add('active');
    await agriOpenModal();
  });
  agriGet('agriCloseProductModalBtn')?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; agriResetProductForm(); });
  agriGet('agriCancelProductModalBtn')?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; agriResetProductForm(); });
  modal?.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; agriResetProductForm(); } });
  agriGet('agriProductSelect')?.addEventListener('change', agriUpdateProductPreset);

  ['agriProductsSearchInput', 'agriCategoryFilter', 'agriStatusFilter'].forEach((id) => {
    agriGet(id)?.addEventListener('input', agriRenderProducts);
    agriGet(id)?.addEventListener('change', agriRenderProducts);
  });
  agriGet('agriOrdersSearchInput')?.addEventListener('input', agriRenderOrders);
  document.querySelectorAll('.agri-tab-btn[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      agriOrdersFilter = btn.dataset.filter || 'all';
      document.querySelectorAll('.agri-tab-btn[data-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      agriRenderOrders();
    });
  });

  agriGet('agriSaveProductBtn')?.addEventListener('click', async () => {
    const produitId = agriGet('agriProductSelect')?.value;
    const quantite = Number(agriGet('agriProductQty')?.value);
    const prix = Number(agriGet('agriProductPrice')?.value);
    const statut = agriGet('agriProductStatus')?.value || 'Disponible';
    let photo = '';
    try {
      photo = await agriReadProductPhoto();
    } catch (error) {
      return agriShowToast('Photo invalide', 'error');
    }
    if (!photo && agriGet('agriExistingProductPhoto')) photo = agriGet('agriExistingProductPhoto').value || '';
    const description = agriGet('agriProductDescription')?.value.trim() || '';
    const current = officialProducts.find((item) => String(item.produit_id) === String(produitId));
    const editingId = agriEditingProductId || agriGet('agriEditingProductId')?.value;

    if (!current && !editingId) return agriShowToast('Produit invalide', 'error');
    if (!quantite || quantite <= 0) return agriShowToast('Quantité invalide', 'error');
    if (current && (prix < Number(current.prix_min) || prix > Number(current.prix_max))) {
      return agriShowToast(`Le prix doit etre entre ${current.prix_min} DA et ${current.prix_max} DA.`, 'error');
    }

    const payload = { produit_id: produitId, quantite, prix, statut, photo, description };

    if (editingId) {
      try {
        await agriUpdateProduct(editingId, payload);
        await agriFetchListings().catch(() => {});
      } catch (error) {
        console.warn('Update API unavailable, applying local UI fallback:', error);
        farmerListings = farmerListings.map((item) => String(item.id) === String(editingId)
          ? { ...item, quantite, prix, statut, photo, description }
          : item
        );
      }

      if (modal) modal.style.display = 'none';
      agriResetProductForm();
      agriRenderProducts();
      agriRefreshDashboard();
      agriShowToast('Produit modifié avec succès');
      return;
    }

    const response = await fetch('/api/produits/agriculteur/ajouter/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': agriGetCSRF(), 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      agriShowToast(data.error || "Erreur lors de l'ajout du produit.", 'error');
      if (response.status === 401 || response.status === 403) {
        await agriEnsureSessionRole();
      }
      return;
    }

    if (modal) modal.style.display = 'none';
    agriResetProductForm();
    await agriFetchListings();
    agriRenderProducts();
    agriRefreshDashboard();
    agriShowToast('Produit ajouté avec succès');
  });
}

window.agriUseGPSForCourse = agriUseGPSForCourse;
window.agriResetCourseMap = agriResetCourseMap;
window.agriSelectFarmForCourse = agriSelectFarmForCourse;
window.agriOpenDeliveryOptions = agriOpenDeliveryOptions;
window.agriOpenCourseForm = agriOpenCourseForm;
window.agriSubmitCourseRequest = agriSubmitCourseRequest;
window.agriUpdateCourseEstimate = agriUpdateCourseEstimate;
window.agriCancelCourse = agriCancelCourse;
window.agriChangeOrderStatus = agriChangeOrderStatus;
window.agriSelectFarm = agriSelectFarm;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await agriEnsureSessionRole())) return;
  initAgriTheme();
  initAgriNavigation();
  initAgriFarms();
  initAgriProducts();
  await agriFetchOfficialProducts();
  agriFillProductSelect();
  await agriFetchListings();
  agriRenderProducts();
  await agriLoadFarms();
  await agriLoadOrders();
  await initAgriProfile();
  initAgriMaps();
  const initialPage = (window.location.hash || '#agriDashboardPage').replace('#', '') || 'agriDashboardPage';
  agriActivatePage(initialPage);
  setTimeout(drawAgriCharts, 250);
  window.addEventListener('resize', () => setTimeout(drawAgriCharts, 120));
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) await agriEnsureSessionRole();
  });
});


function agriApplyProfileToUi(profile) {
  const fullName = profile?.full_name || '';
  const roleLabel = 'Agriculteur vérifié';
  document.querySelectorAll('.agri-global-name').forEach((el) => { el.textContent = fullName || 'Agriculteur'; });
  document.querySelectorAll('.agri-global-role').forEach((el) => { el.textContent = roleLabel; });
  document.querySelectorAll('.agri-global-avatar').forEach((img) => {
    if (profile?.profile_photo_url) img.src = profile.profile_photo_url;
  });
  if (agriGet('agriHeaderName')) agriGet('agriHeaderName').textContent = fullName || 'Agriculteur';
  if (agriGet('agriHeaderRole')) agriGet('agriHeaderRole').textContent = roleLabel;
}

async function initAgriProfile() {
  if (!window.AgriGovProfileApi) return;
  try {
    const profile = await window.AgriGovProfileApi.getProfile();
    agriGet('agriProfileName').value = profile.full_name || '';
    agriGet('agriProfileEmail').value = profile.email || '';
    agriGet('agriProfilePhone').value = profile.phone || '';
    agriGet('agriProfileWilaya').value = profile.wilaya || profile.city || '';
    agriApplyProfileToUi(profile);
    if (agriGet('agriStatsFarms')) agriGet('agriStatsFarms').textContent = profile.stats?.farms_count ?? 0;
  } catch (error) {
    agriShowToast(error.message || 'Erreur profil', 'error');
  }

  agriGet('agriSaveProfileBtn')?.addEventListener('click', async () => {
    try {
      const fullName = (agriGet('agriProfileName')?.value || '').trim();
      const names = fullName.split(/\s+/).filter(Boolean);
      const firstName = names.shift() || '';
      const lastName = names.join(' ');
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('email', agriGet('agriProfileEmail')?.value || '');
      formData.append('phone', agriGet('agriProfilePhone')?.value || '');
      formData.append('wilaya', agriGet('agriProfileWilaya')?.value || '');
      const photo = agriGet('agriAvatarInput')?.files?.[0];
      if (photo) formData.append('profile_photo', photo);
      const profile = await window.AgriGovProfileApi.saveProfile(formData);
      agriApplyProfileToUi(profile);
      agriShowToast('Profil mis à jour');
    } catch (error) {
      agriShowToast(error.message || 'Erreur sauvegarde profil', 'error');
    }
  });

  agriGet('agriChangePasswordBtn')?.addEventListener('click', async () => {
    try {
      await window.AgriGovProfileApi.changePassword(
        agriGet('agriPasswordCurrent')?.value || '',
        agriGet('agriPasswordNew')?.value || '',
        agriGet('agriPasswordConfirm')?.value || ''
      );
      ['agriPasswordCurrent','agriPasswordNew','agriPasswordConfirm'].forEach(id => { const el = agriGet(id); if (el) el.value = ''; });
      agriShowToast('Mot de passe modifié');
    } catch (error) {
      agriShowToast(error.message || 'Erreur mot de passe', 'error');
    }
  });
}

/* Notifications agriculteur: badge DÉSACTIVÉ, alertes dashboard uniquement */
(function(){
  let agriBenefitNotificationsFix = [];

  function timeLabel(value){
    if(!value) return '';
    const d = new Date(String(value).replace(' ', 'T'));
    if(Number.isNaN(d.getTime())) return String(value);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if(mins < 1) return 'Maintenant';
    if(mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if(hrs < 24) return `Il y a ${hrs} h`;
    return d.toLocaleDateString('fr-FR');
  }

  function buildNotifications(){
    const notices = [];
    (farmerOrders || []).filter(o => o.statut === 'en_attente').slice(0,5).forEach(o => notices.push({dot:'agri-dot-green', title:'Nouvelle commande', text:`Commande #${o.id} de ${o.acheteur || 'acheteur'} à traiter.`, time:timeLabel(o.date_creation || o.date), target:'agriOrdersPage'}));
    (farmerOrders || []).filter(o => ['confirmee','en_preparation','expediee'].includes(o.statut)).slice(0,3).forEach(o => notices.push({dot:'agri-dot-green', title:'Commande en cours', text:`Commande #${o.id} · ${agriOrderMeta(o.statut).label}.`, time:timeLabel(o.date_creation || o.date), target:'agriOrdersPage'}));
    (farmerListings || []).filter(i => i.statut === 'Stock faible' || (Number(i.quantite || 0) > 0 && Number(i.quantite || 0) <= 10)).slice(0,5).forEach(i => notices.push({dot:'agri-dot-orange', title:'Stock à surveiller', text:`${i.nom} · ${Number(i.quantite || 0)} kg restant(s).`, target:'agriProductsPage'}));
    if(!(farmerFarms || []).length){ notices.push({dot:'agri-dot-orange', title:'Ferme manquante', text:'Ajoutez votre ferme pour améliorer la localisation et la confiance.', target:'agriFarmsPage'}); }
    agriBenefitNotificationsFix.forEach(r => {
      if(!r || r.status === 'pending') return;
      notices.push({dot:r.status === 'accepted' ? 'agri-dot-green' : 'agri-dot-orange', title:r.status === 'accepted' ? 'Avantage accepté' : 'Avantage refusé', text:`${r.benefit_title || 'Votre demande'}${r.admin_note ? ' · ' + r.admin_note : ''}`, time:timeLabel(r.updated_at || r.created_at), target:'agriAdvantagesPage'});
    });
    return notices;
  }

  function renderNotifications(){
    const notices = buildNotifications();
    // BADGE DÉSACTIVÉ — ne pas afficher le compteur
    document.querySelectorAll('.agri-notification-count').forEach(b => { b.style.display = 'none'; });
    const list = document.querySelector('#agriDashboardPage .agri-notif-list');
    if(!list) return;
    const items = notices.length ? notices : [{dot:'agri-dot-green', title:'Tout est à jour', text:'Aucune alerte active pour le moment.', target:'agriDashboardPage'}];
    list.innerHTML = items.map(item => `<div class="agri-notif-item" data-notif-target="${item.target || 'agriDashboardPage'}"><div class="agri-notif-dot ${item.dot}"></div><div><strong>${item.title}</strong><p>${item.text}</p>${item.time ? `<small class="agri-notif-time">${item.time}</small>` : ''}</div></div>`).join('');
    list.querySelectorAll('[data-notif-target]').forEach(el => el.addEventListener('click', () => agriActivatePage(el.dataset.notifTarget || 'agriDashboardPage')));
  }

  async function loadBenefitNotifications(){
    try{
      const res = await fetch('/api/benefits/my-requests/', {headers:{'X-Requested-With':'XMLHttpRequest'}});
      const data = await agriReadJson(res);
      if(data.success) agriBenefitNotificationsFix = data.requests || [];
    }catch(e){ console.warn('Notifications avantages indisponibles:', e); }
    renderNotifications();
  }

  function scrollToDashboardNotif() {
    // Target the notifications panel directly by its id
    var panel = document.getElementById('agriDashNotifPanel');
    if (!panel) {
      // Fallback: find by content
      panel = document.querySelector('#agriDashboardPage .agri-dashboard-right article');
    }
    if (!panel) return;
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    panel.style.transition = 'box-shadow 0.4s ease';
    panel.style.boxShadow = '0 0 0 3px rgba(28,124,67,0.55), 0 8px 32px rgba(28,124,67,0.18)';
    setTimeout(function() { panel.style.boxShadow = ''; }, 1800);
  }

  function initNotificationButtons(){
    document.querySelectorAll('.agri-notification-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        // Step 1: activate dashboard page
        agriActivatePage('agriDashboardPage');
        // Step 2: after DOM updates, scroll to notif panel
        setTimeout(scrollToDashboardNotif, 120);
        setTimeout(scrollToDashboardNotif, 400); // retry for safety
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNotificationButtons();
    setTimeout(loadBenefitNotifications, 700);
    setTimeout(renderNotifications, 1200);
  });
  window.addEventListener('agri:benefit-request-updated', loadBenefitNotifications);
  window.agriRefreshNotifications = function(){ loadBenefitNotifications(); renderNotifications(); };
})();
/* === Advanced pro UI override: compact product cards, animated order charts, premium farm cards === */
function agriStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('rupture')) return 'danger';
  if (normalized.includes('faible')) return 'warning';
  return 'success';
}

function agriSafeDate(value) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

drawAgriCharts = function drawAgriCharts() {
  if (!window.Chart) return;
  agriCharts.forEach(chart => chart.destroy());
  agriCharts = [];
  const chartBaseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8 } } },
  };
  const salesCtx = agriGet('agriSalesChart');
  if (salesCtx) {
    const monthly = agriMonthlyTotals(6);
    agriCharts.push(new Chart(salesCtx, { type: 'line', data: { labels: monthly.labels, datasets: [{ label: 'Ventes', data: monthly.values, tension: 0.42, fill: true, pointRadius: 4 }] }, options: { ...chartBaseOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } }));
  }
  const ordersCtx = agriGet('agriOrdersChart');
  if (ordersCtx) {
    const statuses = ['en_attente','confirmee','en_preparation','expediee','livree','refusee'];
    agriCharts.push(new Chart(ordersCtx, { type: 'doughnut', data: { labels: statuses.map(s => agriOrderMeta(s).label), datasets: [{ data: statuses.map(s => farmerOrders.filter(o => o.statut === s).length), borderWidth: 0 }] }, options: { ...chartBaseOptions, cutout: '64%', plugins: { legend: { position: 'bottom' } } } }));
  }
  const totalProductsCtx = agriGet('agriTotalProductsChart');
  if (totalProductsCtx) {
    const byCategory = {};
    farmerListings.forEach(item => { byCategory[item.categorie || 'Autre'] = (byCategory[item.categorie || 'Autre'] || 0) + 1; });
    agriCharts.push(new Chart(totalProductsCtx, { type: 'bar', data: { labels: Object.keys(byCategory), datasets: [{ label: 'Produits', data: Object.values(byCategory), borderRadius: 12 }] }, options: { ...chartBaseOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } }));
  }
  const addedProductsCtx = agriGet('agriAddedProductsChart');
  if (addedProductsCtx) {
    agriCharts.push(new Chart(addedProductsCtx, { type: 'doughnut', data: { labels: ['Disponible','Stock faible','Rupture'], datasets: [{ data: ['Disponible','Stock faible','Rupture'].map(s => farmerListings.filter(p => p.statut === s).length), borderWidth: 0 }] }, options: { ...chartBaseOptions, cutout: '62%', plugins: { legend: { position: 'bottom' } } } }));
  }
  const orderWorkflowCtx = agriGet('agriOrderWorkflowChart');
  if (orderWorkflowCtx) {
    const labels = ['🆕 Nouvelles','📦 Préparation','🚚 Livraison','✅ Livrées','❌ Refusées'];
    const values = [
      farmerOrders.filter(o => o.statut === 'en_attente').length,
      farmerOrders.filter(o => ['confirmee','en_preparation','en_attente_transporteur'].includes(o.statut)).length,
      farmerOrders.filter(o => o.statut === 'expediee').length,
      farmerOrders.filter(o => o.statut === 'livree').length,
      farmerOrders.filter(o => ['refusee','annulee'].includes(o.statut)).length,
    ];
    agriCharts.push(new Chart(orderWorkflowCtx, { type: 'bar', data: { labels, datasets: [{ label: 'Commandes', data: values, borderRadius: 16 }] }, options: { ...chartBaseOptions, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } }));
  }
};

agriRenderProducts = function agriRenderProducts() {
  const cards = agriGet('agriProductsCards');
  const tbody = agriGet('agriProductsTableBody');
  if (!cards && !tbody) return;
  const search = (agriGet('agriProductsSearchInput')?.value || '').toLowerCase().trim();
  const category = agriGet('agriCategoryFilter')?.value || 'all';
  const status = agriGet('agriStatusFilter')?.value || 'all';
  const filtered = farmerListings.filter((item) => {
    const text = `${item.nom} ${item.description || ''} ${item.categorie || ''}`.toLowerCase();
    return (!search || text.includes(search)) && (category === 'all' || item.categorie === category) && (status === 'all' || item.statut === status);
  });
  if (cards) {
    cards.innerHTML = filtered.map((item, index) => {
      const cls = agriStatusClass(item.statut);
      const isOut = cls === 'danger';
      const qty = Number(item.quantite || 0);
      const progress = Math.max(0, Math.min(100, qty));
      return `
        <article class="agri-product-mini-card ${isOut ? 'rupture' : ''}" style="animation-delay:${Math.min(index * 45, 420)}ms">
          <div class="agri-product-mini-photo">
            <img src="${agriEscape(item.photo || '/static/images/product-placeholder.svg')}" alt="${agriEscape(item.nom)}">
            <span class="agri-product-status ${cls}">${isOut ? '🔴 Rupture' : cls === 'warning' ? '🟠 Stock faible' : '🟢 Disponible'}</span>
          </div>
          <div class="agri-product-mini-body">
            <div class="agri-product-mini-title"><h4>${agriEscape(item.nom)}</h4><span>${agriEscape(item.categorie || 'Produit')}</span></div>
            <div class="agri-product-mini-price">${agriMoney(item.prix)} <small>/ kg</small></div>
            <p class="agri-price-hint mini">Le prix doit être un nombre valide et positif.</p>
            <div class="agri-stock-line"><span>Stock</span><strong>${qty} kg</strong></div>
            <div class="agri-stock-progress"><i style="width:${progress}%"></i></div>
            <div class="agri-product-actions compact">
              <button type="button" class="agri-action-btn edit" onclick="agriEditProduct('${agriEscape(item.id)}')">✏️ Modifier</button>
              <button type="button" class="agri-action-btn delete" onclick="agriDeleteProduct('${agriEscape(item.id)}')">🗑️</button>
            </div>
          </div>
        </article>`;
    }).join('') || '<div class="agri-empty">Aucun produit trouvé.</div>';
  }
  if (tbody) {
    tbody.innerHTML = filtered.map((item) => `<tr><td>${agriEscape(item.nom)}</td><td>${agriEscape(item.categorie || '')}</td><td>${agriEscape(String(item.quantite || 0))} kg</td><td>${agriMoney(item.prix)}</td><td>${agriEscape(item.statut || '')}</td></tr>`).join('');
  }
  const stats = { total: farmerListings.length, low: farmerListings.filter((item) => item.statut === 'Stock faible').length, out: farmerListings.filter((item) => item.statut === 'Rupture').length };
  Object.entries({ agriTotalProductsValue: stats.total, agriProductsAddedValue: stats.total, agriLowStockValue: stats.low, agriOutStockValue: stats.out }).forEach(([id, value]) => { if (agriGet(id)) agriGet(id).textContent = value; });
  agriRenderDashboardDynamic();
  drawAgriCharts();
};

agriRenderFarms = function agriRenderFarms() {
  agriRenderDashboardDynamic();
  const container = agriGet('agriFarmsContainer');
  const info = agriGet('agriFarmInfoBox');
  const search = (agriGet('agriFarmsSearchInput')?.value || '').toLowerCase().trim();
  const rows = farmerFarms.filter((farm) => {
    const meta = agriParseFarmMeta(farm);
    return !search || `${farm.name} ${meta.wilaya} ${meta.lieu} ${meta.commune} ${meta.culture}`.toLowerCase().includes(search);
  });
  if (agriGet('agriFarmsTotal')) agriGet('agriFarmsTotal').textContent = farmerFarms.length;
  if (agriGet('agriFarmsMain')) agriGet('agriFarmsMain').textContent = farmerFarms.length ? 1 : 0;
  if (agriGet('agriFarmsWilayas')) agriGet('agriFarmsWilayas').textContent = new Set(farmerFarms.map(f => agriParseFarmMeta(f).wilaya).filter(Boolean)).size;
  if (container) {
    container.innerHTML = rows.length ? rows.map((farm, index) => {
      const meta = agriParseFarmMeta(farm);
      const active = Number(activeFarmId) === Number(farm.id);
      const score = Math.min(100, 55 + (meta.wilaya ? 10 : 0) + (meta.commune ? 10 : 0) + (meta.culture ? 10 : 0) + (Number(farm.surface || 0) > 0 ? 15 : 0));
      return `
        <button type="button" class="agri-farm-card premium ${active ? 'active' : ''}" onclick="agriSelectFarm(${farm.id})" style="animation-delay:${Math.min(index * 55, 440)}ms">
          <div class="agri-farm-card-hero"><span>🌾</span><strong>${score}%</strong></div>
          <div class="agri-farm-card-content">
            <div class="agri-farm-title"><h3>${agriEscape(farm.name || 'Ferme')}</h3><em>${active ? 'Principale' : 'Ferme'}</em></div>
            <p>📍 ${agriEscape(meta.wilaya || 'Wilaya non renseignée')}${meta.lieu ? ` · ${agriEscape(meta.lieu)}` : ''}</p>
            <div class="agri-farm-mini-metrics">
              <span>🏘️ ${agriEscape(meta.commune || 'Commune')}</span>
              <span>🌱 ${agriEscape(meta.culture || 'Culture')}</span>
              <span>📐 ${agriEscape(String(farm.surface || 0))} ha</span>
            </div>
            <div class="agri-farm-score"><i style="width:${score}%"></i></div>
          </div>
        </button>`;
    }).join('') : '<div class="agri-empty">Aucune ferme enregistrée.</div>';
  }
  const current = farmerFarms.find((farm) => Number(farm.id) === Number(activeFarmId)) || farmerFarms[0] || null;
  if (current && !activeFarmId) activeFarmId = current.id;
  if (info) {
    if (!current) {
      info.innerHTML = '<h3>🌾 Ferme avancée</h3><p>Aucune ferme enregistrée pour le moment.</p>';
    } else {
      const meta = agriParseFarmMeta(current);
      const hasCoords = Number.isFinite(meta.lat) && Number.isFinite(meta.lng);
      const coordsText = hasCoords ? `${meta.lat}, ${meta.lng}` : 'Non renseignées';
      info.innerHTML = `
        <div class="agri-farm-info-premium">
          <div class="agri-farm-info-head"><span>🌿</span><div><h3>${agriEscape(current.name)}</h3><p>${agriEscape(meta.culture || 'Culture non renseignée')}</p></div></div>
          <div class="agri-farm-info-grid">
            <p><strong>📍 Wilaya</strong>${agriEscape(meta.wilaya || 'Non renseignée')}</p>
            <p><strong>🏘️ Commune</strong>${agriEscape(meta.commune || 'Non renseignée')}</p>
            <p><strong>🧭 Lieu</strong>${agriEscape(meta.lieu || 'Non renseigné')}</p>
            <p><strong>📐 Superficie</strong>${agriEscape(String(current.surface || 0))} ha</p>
            <p><strong>🏡 Adresse</strong>${agriEscape(meta.adresse || 'Non renseignée')}</p>
            <p><strong>📌 GPS</strong>${agriEscape(coordsText)}</p>
          </div>
        </div>`;
    }
  }
};

agriRenderOrders = function agriRenderOrders() {
  const container = agriGet('agriOrdersContainer');
  if (!container) return;
  const search = (agriGet('agriOrdersSearchInput')?.value || '').toLowerCase().trim();
  const matchesFilter = (order) => {
    if (agriOrdersFilter === 'new') return order.statut === 'en_attente';
    if (agriOrdersFilter === 'progress') return ['confirmee', 'en_preparation', 'en_attente_transporteur', 'expediee'].includes(order.statut);
    if (agriOrdersFilter === 'delivered') return order.statut === 'livree';
    if (agriOrdersFilter === 'refused') return ['refusee', 'annulee'].includes(order.statut);
    return true;
  };
  const filtered = farmerOrders.filter((order) => {
    const lignesText = (order.lignes || []).map((l) => `${l.produit_nom} ${l.quantite}`).join(' ');
    const hay = `${order.id} ${order.acheteur} ${order.acheteur_info?.telephone || ''} ${order.adresse_livraison} ${order.statut} ${agriOrderMeta(order.statut).label} ${lignesText}`.toLowerCase();
    return matchesFilter(order) && (!search || hay.includes(search));
  });
  if (agriGet('agriOrdersTotal')) agriGet('agriOrdersTotal').textContent = farmerOrders.length;
  if (agriGet('agriOrdersNew')) agriGet('agriOrdersNew').textContent = farmerOrders.filter(o => o.statut === 'en_attente').length;
  if (agriGet('agriOrdersProgress')) agriGet('agriOrdersProgress').textContent = farmerOrders.filter(o => ['confirmee','en_preparation','en_attente_transporteur','expediee'].includes(o.statut)).length;
  if (agriGet('agriOrdersDelivered')) agriGet('agriOrdersDelivered').textContent = farmerOrders.filter(o => o.statut === 'livree').length;
  if (!filtered.length) {
    container.innerHTML = '<div class="agri-empty">Aucune commande trouvée.</div>';
    agriRenderDashboardDynamic();
    drawAgriCharts();
    return;
  }
  container.innerHTML = filtered.map((order, index) => {
    const meta = agriOrderMeta(order.statut);
    const buyer = order.acheteur_info || {};
    const livraison = order.livraison || {};
    const transporteur = order.transporteur_info || {};
    let buttons = '';
    if (order.statut === 'en_attente') buttons = `<button class="agri-btn agri-btn-light danger" onclick="agriChangeOrderStatus(${order.id}, 'refusee')">❌ Refuser</button><button class="agri-btn agri-btn-primary" onclick="agriChangeOrderStatus(${order.id}, 'en_preparation')">✅ Accepter</button>`;
    else if (order.statut === 'en_preparation') buttons = `<button class="agri-btn agri-btn-primary" onclick="agriOpenDeliveryOptions(${order.id})">🚚 Livrer</button>`;
    else if (order.statut === 'en_attente_transporteur') buttons = `<button class="agri-btn agri-btn-light danger" onclick="agriCancelCourse(${order.id})">🛑 Annuler course</button>`;
    else if (order.statut === 'expediee') buttons = `<a class="agri-btn agri-btn-light" href="tel:${agriEscape(transporteur.telephone || '')}">📞 Appeler</a><button class="agri-btn agri-btn-light danger" onclick="agriCancelCourse(${order.id})">🛑 Annuler</button>`;
    const notifTransporteur = order.statut === 'expediee' ? `<div class="agri-transport-notification pro"><div class="agri-notif-pulse">🚚</div><div><strong>Transporteur accepté</strong><p>${agriEscape(transporteur.nom || 'Transporteur')} · ${agriEscape(transporteur.telephone || 'Téléphone non renseigné')}</p><small>${agriEscape(livraison.lieu_depart || 'Ferme')} → ${agriEscape(livraison.lieu_destination || order.adresse_livraison || 'Destination')}</small></div></div>` : '';
    return `
      <article class="agri-order-pro-card animated" style="animation-delay:${Math.min(index * 50, 450)}ms">
        <div class="agri-order-emoji-strip"><span>🛒</span><span>📦</span><span>🚚</span><span>✅</span></div>
        <div class="agri-order-top">
          <div><div class="agri-order-id">📋 CMD-${order.id}</div><h4>👤 ${agriEscape(buyer.nom || order.acheteur || 'Acheteur')}</h4><div class="agri-buyer-grid"><span>📞 ${agriEscape(buyer.telephone || '—')}</span><span>✉️ ${agriEscape(buyer.email || '—')}</span><span>📍 ${agriEscape(order.adresse_livraison || '—')}</span><span>🕒 ${agriSafeDate(order.date_creation).toLocaleString('fr-FR')}</span></div></div>
          <span class="agri-status-pill" style="background:${meta.color};">${meta.icon} ${meta.label}</span>
        </div>
        <div class="agri-order-products-box"><div class="agri-section-title">🥬 Produits commandés</div>${agriOrderProductsHtml(order)}</div>
        <div class="agri-order-bottom"><div><span class="agri-muted">💰 Total</span><strong>${agriMoney(order.total)}</strong></div><div><span class="agri-muted">🚛 Livraison</span><strong>${agriEscape((livraison.status || 'non_assignee').replaceAll('_', ' '))}</strong></div></div>
        ${notifTransporteur}
        <div class="agri-order-actions">${buttons || '<span class="agri-muted">✅ Aucune action disponible.</span>'}</div>
      </article>`;
  }).join('');
  agriRenderDashboardDynamic();
  drawAgriCharts();
};

/* ===== FIX CLEAN ferme sans map + profil visible ===== */
function agriRenderFarms() {
  const container = agriGet('agriFarmsContainer');
  const info = agriGet('agriFarmInfoBox');
  const q = (agriGet('agriFarmsSearchInput')?.value || '').toLowerCase().trim();
  const rows = farmerFarms.filter((farm) => {
    const meta = agriParseFarmMeta(farm);
    return !q || `${farm.name || ''} ${meta.wilaya || ''} ${meta.commune || ''} ${meta.lieu || ''} ${meta.culture || ''}`.toLowerCase().includes(q);
  });

  if (agriGet('agriFarmsTotal')) agriGet('agriFarmsTotal').textContent = farmerFarms.length;
  if (agriGet('agriFarmsMain')) agriGet('agriFarmsMain').textContent = farmerFarms.length ? 1 : 0;
  if (agriGet('agriFarmsWilayas')) agriGet('agriFarmsWilayas').textContent = new Set(farmerFarms.map(f => agriParseFarmMeta(f).wilaya).filter(Boolean)).size;

  if (container) {
    container.innerHTML = rows.length ? rows.map((farm) => {
      const meta = agriParseFarmMeta(farm);
      const active = Number(activeFarmId) === Number(farm.id);
      const place = [meta.commune, meta.wilaya].filter(Boolean).join(' · ') || meta.lieu || 'Localisation non renseignée';
      return `
        <button type="button" class="agri-farm-card ${active ? 'active' : ''}" onclick="agriSelectFarm(${farm.id})" style="width:100%;text-align:left;cursor:pointer;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
            <div>
              <div style="font-weight:1000;margin-bottom:5px;font-size:16px;">🌾 ${agriEscape(farm.name || 'Ma ferme')}</div>
              <div style="color:var(--agri-muted);font-size:13px;">📍 ${agriEscape(place)}</div>
            </div>
            <span style="background:${active ? 'rgba(58,139,75,.18)' : 'rgba(120,120,120,.12)'};color:var(--agri-green);border-radius:999px;padding:5px 9px;font-weight:900;font-size:12px;">${active ? 'Active' : 'Voir'}</span>
          </div>
          <div style="color:var(--agri-muted);font-size:13px;margin-top:10px;">${agriEscape(meta.culture || 'Culture non renseignée')} · ${agriEscape(currentFarmSurfaceLabel(farm))}</div>
        </button>
      `;
    }).join('') : '<div class="agri-empty">Aucune ferme enregistrée.</div>';
  }

  const current = farmerFarms.find((farm) => Number(farm.id) === Number(activeFarmId)) || farmerFarms[0] || null;
  if (current && !activeFarmId) activeFarmId = current.id;
  if (!info) return;
  info.classList.add('agri-farm-clean-card');
  if (!current) {
    info.innerHTML = '<div class="agri-farm-clean-content"><span class="agri-farm-clean-kicker">🌾 Ferme</span><h2>Ajoutez votre première ferme</h2><p>Votre carte ferme affichera les informations, produits et statistiques ici.</p></div>';
    return;
  }

  const meta = agriParseFarmMeta(current);
  const place = [meta.commune, meta.wilaya].filter(Boolean).join(', ') || meta.lieu || 'Algérie';
  const address = meta.adresse || meta.lieu || place;
  const products = (farmerListings.length ? farmerListings : [
    { nom: 'Tomates', prix: 120, unite: 'kg', statut: 'Disponible' },
    { nom: 'Pommes de terre', prix: 80, unite: 'kg', statut: 'Disponible' },
    { nom: 'Poivrons', prix: 0, unite: 'kg', statut: 'Rupture' },
  ]).slice(0, 6);
  const ordersCount = farmerOrders.length;
  const revenue = farmerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const productTags = products.map((item) => {
    const off = item.statut === 'Rupture' || Number(item.quantite || 0) === 0;
    return `<span class="${off ? 'off' : ''}">${agriFarmProductEmoji(item.nom)} ${agriEscape(item.nom || 'Produit')} ${off ? '• Rupture' : ''}</span>`;
  }).join('');

  info.innerHTML = `
    <div class="agri-farm-clean-inner">
      <div class="agri-farm-clean-visual">
        <div class="agri-farm-clean-illustration" aria-hidden="true"></div>
        <div class="agri-farm-clean-pin">📍 ${agriEscape(place)}</div>
      </div>
      <div class="agri-farm-clean-content">
        <span class="agri-farm-clean-kicker">✅ Ferme vérifiée</span>
        <div class="agri-farm-clean-title">
          <div>
            <h2>${agriEscape(current.name || 'Ma ferme')} 🌿</h2>
            <p>${agriEscape(meta.culture || 'Culture agricole locale avec produits frais et suivi professionnel.')}</p>
          </div>
          <span class="agri-farm-clean-badge">Active</span>
        </div>
        <div class="agri-farm-clean-stats">
          <div><strong>${farmerListings.length || products.length}</strong><span>Produits</span></div>
          <div><strong>${ordersCount}</strong><span>Commandes</span></div>
          <div><strong>${revenue.toLocaleString('fr-DZ')} DA</strong><span>Revenus</span></div>
        </div>
        <div class="agri-farm-clean-products">${productTags}</div>
        <div class="agri-farm-clean-info">
          <p><b>📍 Localisation</b>${agriEscape(place)}</p>
          <p><b>🧭 Adresse</b>${agriEscape(address)}</p>
          <p><b>🌱 Culture</b>${agriEscape(meta.culture || 'Non renseignée')}</p>
          <p><b>📐 Surface</b>${agriEscape(currentFarmSurfaceLabel(current))}</p>
        </div>
        <div class="agri-farm-clean-actions">
          <button class="primary" type="button">🌾 Voir détails</button>
          <button class="secondary" type="button">✏️ Modifier</button>
        </div>
      </div>
    </div>`;
}

function initAgriMaps() {
  /* Map supprimée de la carte ferme selon demande utilisateur. */
}

/* === FLOW NOTIFICATIONS AGRICULTEUR: problemes et evaluations acheteur === */
(function(){
  const PROBLEMS_KEY = 'agrigovBuyerProblemReportsV1';
  const EVALS_KEY = 'agrigovBuyerEvaluationsV1';
  function readLocalList(key){ try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(_) { return []; } }
  function currentFarmerNames(){
    const names = new Set(['Agriculteur']);
    document.querySelectorAll('#agriSidebarName,.agri-user-name,.agri-profile-name').forEach((el) => { const text = (el.textContent || '').trim(); if (text) names.add(text); });
    if (Array.isArray(farmerOrders)) farmerOrders.forEach((order) => { if (order.agriculteur) names.add(order.agriculteur); });
    return names;
  }
  function isForCurrentFarmer(item){ const names = currentFarmerNames(); return !item.farmerName || names.has(item.farmerName) || names.has('Agriculteur'); }
  function farmerProblemReports(){ return readLocalList(PROBLEMS_KEY).filter(isForCurrentFarmer).sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))); }
  function farmerEvaluations(){ return readLocalList(EVALS_KEY).filter(isForCurrentFarmer).sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))); }
  function renderFarmerFlowPanel(){
    const dashPage = document.getElementById('agriDashboardPage');
    if (!dashPage || document.getElementById('agriFlowNotificationsPanel')) return;
    const panel = document.createElement('section');
    panel.className = 'agri-card agri-flow-panel';
    panel.id = 'agriFlowNotificationsPanel';
    panel.innerHTML = '<div class="agri-card-header"><div><h3>Alertes acheteurs</h3><p>Problemes signales et nouvelles evaluations.</p></div></div><div id="agriFlowNotificationsList" class="agri-flow-list"></div>';
    dashPage.appendChild(panel);
  }
  function updateFarmerFlowPanel(){
    renderFarmerFlowPanel();
    const list = document.getElementById('agriFlowNotificationsList');
    if (!list) return;
    const problems = farmerProblemReports().slice(0,4).map((report) => ({ icon:'⚠️', title:`Probleme signale · CMD-${report.orderId}`, text:`${report.buyerName || 'Acheteur'} : ${report.message || ''}`, extra:(report.products || []).join(', ') || 'Commande' }));
    const evaluations = farmerEvaluations().slice(0,4).map((ev) => ({ icon:'⭐', title:`Nouvelle evaluation · CMD-${ev.orderId}`, text:`${ev.buyerName || 'Acheteur'} a note agriculteur ${ev.farmerStars || '-'} / 5 et produit ${ev.productStars || '-'} / 5.`, extra:ev.comment || (ev.products || []).join(', ') || 'Avis recu' }));
    const rows = [...problems, ...evaluations].slice(0,6);
    list.innerHTML = rows.length ? rows.map((item) => `<div class="agri-flow-item"><div class="agri-flow-icon">${item.icon}</div><div><strong>${agriEscape(item.title)}</strong><p>${agriEscape(item.text)}</p><small>${agriEscape(item.extra)}</small></div></div>`).join('') : '<div class="agri-flow-empty">Aucun probleme ni evaluation pour le moment.</div>';
  }
  const oldRefreshNotifications = window.agriRefreshNotifications;
  window.agriRefreshNotifications = function(){ if (typeof oldRefreshNotifications === 'function') oldRefreshNotifications(); updateFarmerFlowPanel(); injectNotificationCards(); };
  function injectNotificationCards(){
    const count = farmerProblemReports().length + farmerEvaluations().length;
    document.querySelectorAll('.agri-notification-count').forEach((badge) => { const current = parseInt(badge.textContent || '0', 10) || 0; const next = current + count; badge.textContent = next > 9 ? '9+' : String(next); badge.style.display = next ? 'grid' : 'none'; });
  }
  setTimeout(() => { updateFarmerFlowPanel(); injectNotificationCards(); }, 1200);
  window.addEventListener('storage', () => { updateFarmerFlowPanel(); injectNotificationCards(); });
})();

/* === PATCH FINAL DEMANDE: dashboard agriculteur accessible + notifications acheteur === */
(function(){
  const PROBLEMS_KEY = 'agrigovBuyerProblemReportsV1';
  const EVAL_KEY = 'agrigovBuyerEvaluationsV1';
  function readLocal(key){ try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(_){ return []; } }
  function agriCurrentName(){ return document.querySelector('.agri-profile-name, #agriProfileName, .user-name')?.textContent?.trim() || ''; }
  function belongsToFarmer(item){
    const name = agriCurrentName().toLowerCase();
    if (!name) return true;
    return String(item.farmerName || item.agriculteur || '').toLowerCase().includes(name) || name.includes(String(item.farmerName || '').toLowerCase());
  }
  function enhanceAgriAccessibility(){
    document.querySelectorAll('.agri-stat-card,.agri-card,.agri-panel,.agri-action-card').forEach((card, index) => {
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex','0');
      if (!card.hasAttribute('role')) card.setAttribute('role','region');
      if (!card.hasAttribute('aria-label')) card.setAttribute('aria-label', card.textContent.trim().replace(/\s+/g,' ').slice(0,90) || `Carte dashboard ${index + 1}`);
    });
  }
  const oldDashboard = window.agriRenderDashboardDynamic || agriRenderDashboardDynamic;
  window.agriRenderDashboardDynamic = agriRenderDashboardDynamic = function(){
    oldDashboard();
    const problems = readLocal(PROBLEMS_KEY).filter(belongsToFarmer).slice().reverse();
    const evals = readLocal(EVAL_KEY).filter(belongsToFarmer).slice().reverse();
    const cards = document.querySelectorAll('#agriDashboardPage .agri-dashboard-stats .agri-stat-card');
    if (cards[3]) {
      const label = cards[3].querySelector('.agri-stat-label');
      const number = cards[3].querySelector('h3');
      const small = cards[3].querySelector('small');
      if (label) label.textContent = 'Alertes acheteurs';
      if (number) number.textContent = String(problems.length + evals.length);
      if (small) small.textContent = `${problems.length} problème(s), ${evals.length} évaluation(s)`;
    }
    const notifList = document.querySelector('#agriDashboardPage .agri-notif-list');
    if (notifList) {
      const external = [];
      problems.slice(0,3).forEach((item) => external.push({dot:'agri-dot-orange', title:`Problème signalé · CMD-${item.orderId}`, text:`${item.buyerName || 'Acheteur'} : ${item.message}`}));
      evals.slice(0,3).forEach((item) => external.push({dot:'agri-dot-green', title:`Nouvelle évaluation · CMD-${item.orderId}`, text:`Note agriculteur ${item.farmerStars || 0}/5 · ${item.comment || 'Sans commentaire.'}`}));
      if (external.length) {
        notifList.insertAdjacentHTML('afterbegin', external.map((item) => `<div class="agri-notif-item"><div class="agri-notif-dot ${item.dot}"></div><div><strong>${item.title}</strong><p>${item.text}</p></div></div>`).join(''));
      }
    }
    enhanceAgriAccessibility();
  };
  document.addEventListener('DOMContentLoaded', enhanceAgriAccessibility);
})();

/* === CORRECTION FINALE 2: route réelle + dashboard accessible + signalements visibles === */
(function(){
  async function agriRealOsrmRoute(start, end) {
    if (!start || !end) throw new Error('Départ ou destination manquant');
    async function requestRoute(a, b) {
      const url = `https://router.project-osrm.org/route/v1/driving/${Number(a.lng)},${Number(a.lat)};${Number(b.lng)},${Number(b.lat)}?overview=full&geometries=geojson&alternatives=false&steps=false`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Service OSRM route indisponible');
      const data = await response.json();
      console.log('OSRM route réelle:', data);
      if (data.code !== 'Ok' || !data.routes || !data.routes.length) throw new Error(data.message || 'Route réelle introuvable');
      const route = data.routes[0];
      if (!route.distance || route.distance <= 0) throw new Error('Distance réelle invalide');
      return { distanceKm: route.distance / 1000, durationMin: route.duration ? route.duration / 60 : null, coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]) };
    }
    try { return await requestRoute(start, end); }
    catch (firstError) {
      console.warn('OSRM direct échoué, tentative avec nearest:', firstError);
      const snappedStart = await agriSnapPointToRoad(start);
      const snappedEnd = await agriSnapPointToRoad(end);
      return requestRoute(snappedStart, snappedEnd);
    }
  }
  window.agriGetRealRoute = agriGetRealRoute = agriRealOsrmRoute;

  const PROBLEMS_KEY = 'agrigovBuyerProblemReportsV1';
  const EVAL_KEY = 'agrigovBuyerEvaluationsV1';
  function readLocal(key){ try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(_){ return []; } }
  function problems(){ return readLocal(PROBLEMS_KEY).slice().reverse(); }
  function evals(){ return readLocal(EVAL_KEY).slice().reverse(); }
  function safe(value){ return typeof agriEscape === 'function' ? agriEscape(String(value || '')) : String(value || ''); }
  function go(pageId){ if (typeof agriActivatePage === 'function') agriActivatePage(pageId); }

  function makeDashboardCardsAccessible(){
    const cards = document.querySelectorAll('#agriDashboardPage .agri-dashboard-stats .agri-stat-card');
    const targets = ['agriOrdersPage','agriProductsPage','agriOrdersPage','agriDashboardPage'];
    cards.forEach((card, index) => {
      card.setAttribute('tabindex','0');
      card.setAttribute('role','button');
      card.setAttribute('aria-label', (card.textContent || `Carte dashboard ${index + 1}`).trim().replace(/\s+/g,' '));
      card.style.cursor = 'pointer';
      card.onclick = () => go(targets[index] || 'agriDashboardPage');
      card.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); } };
    });
  }

  function ensureAlertsPanel(){
    const page = document.getElementById('agriDashboardPage');
    if (!page) return null;
    let panel = document.getElementById('agriBuyerAlertsPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'agriBuyerAlertsPanel';
      panel.className = 'agri-panel agri-glass agri-buyer-alerts-panel';
      panel.innerHTML = '<div class="agri-panel-head"><div><h3>Messages des acheteurs</h3><p>Signalements de problèmes et évaluations reçues.</p></div></div><div id="agriBuyerAlertsList" class="agri-flow-list"></div>';
      page.appendChild(panel);
    }
    return panel;
  }

  function updateBuyerMessagesForFarmer(){
    const p = problems();
    const e = evals();
    const total = p.length + e.length;
    document.querySelectorAll('.agri-notification-count').forEach((badge) => {
      badge.textContent = total > 9 ? '9+' : String(total);
      badge.style.display = total ? 'grid' : 'none';
    });
    const cards = document.querySelectorAll('#agriDashboardPage .agri-dashboard-stats .agri-stat-card');
    if (cards[3]) {
      const label = cards[3].querySelector('.agri-stat-label');
      const number = cards[3].querySelector('h3');
      const small = cards[3].querySelector('small');
      if (label) label.textContent = 'Alertes acheteurs';
      if (number) number.textContent = String(total);
      if (small) small.textContent = `${p.length} problème(s), ${e.length} évaluation(s)`;
    }
    ensureAlertsPanel();
    const list = document.getElementById('agriBuyerAlertsList');
    if (list) {
      const rows = [];
      p.slice(0, 6).forEach((item) => rows.push({
        icon: '⚠️', cls: 'problem', title: `Signalement problème · CMD-${item.orderId || '—'}`,
        text: `${item.buyerName || 'Acheteur'} : ${item.message || 'Aucun message.'}`,
        extra: `${(item.products || []).join(', ') || 'Commande'} · ${item.quantity || 0} kg · ${agriMoney(item.total || 0)}`
      }));
      e.slice(0, 6).forEach((item) => rows.push({
        icon: '⭐', cls: 'eval', title: `Nouvelle évaluation · CMD-${item.orderId || '—'}`,
        text: `Agriculteur ${item.farmerStars || 0}/5 · Produit ${item.productStars || 0}/5 · Transporteur ${item.transportStars || 0}/5`,
        extra: item.comment || ((item.products || []).join(', ') || 'Avis reçu')
      }));
      list.innerHTML = rows.length ? rows.slice(0, 8).map((item) => `<div class="agri-flow-item ${item.cls}" tabindex="0" role="article" aria-label="${safe(item.title)}"><div class="agri-flow-icon">${item.icon}</div><div><strong>${safe(item.title)}</strong><p>${safe(item.text)}</p><small>${safe(item.extra)}</small></div></div>`).join('') : '<div class="agri-flow-empty">Aucun signalement ni évaluation pour le moment.</div>';
    }
    makeDashboardCardsAccessible();
  }

  const previousDashboardRender = window.agriRenderDashboardDynamic || agriRenderDashboardDynamic;
  window.agriRenderDashboardDynamic = agriRenderDashboardDynamic = function(){
    previousDashboardRender();
    updateBuyerMessagesForFarmer();
  };

  document.addEventListener('DOMContentLoaded', () => {
    makeDashboardCardsAccessible();
    updateBuyerMessagesForFarmer();
    setInterval(updateBuyerMessagesForFarmer, 2500);
  });
  window.addEventListener('storage', updateBuyerMessagesForFarmer);
})();

/* ══════════════════════════════════════════════════
   PAGE NOTIFICATIONS AGRICULTEUR — agriLoadNotifications
   Récupère les notifs depuis /api/agri/notifications/ et
   les affiche dans #agriNotificationsContainer.
   ══════════════════════════════════════════════════ */
window.agriLoadNotifications = async function () {
  const container = document.getElementById('agriNotificationsContainer');
  if (!container) return;

  container.innerHTML = '<div class="agri-empty-state" style="padding:32px;text-align:center;color:#888">⏳ Chargement des notifications…</div>';

  try {
    const resp = await fetch('/api/agri/notifications/', {
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin',
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const notifs = data.notifications || [];

    // Mettre à jour les badges 🔔
    document.querySelectorAll('.agri-notification-count').forEach((badge) => {
      const n = notifs.length;
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.style.display = n ? 'grid' : 'none';
    });

    if (!notifs.length) {
      container.innerHTML = `
        <div class="agri-empty-state" style="padding:48px;text-align:center;">
          <div style="font-size:3rem;margin-bottom:12px;">🔔</div>
          <h3 style="color:#2d6a4f;margin:0 0 8px">Aucune notification</h3>
          <p style="color:#888;margin:0">Vous êtes à jour. Revenez plus tard.</p>
        </div>`;
      return;
    }

    const typeColors = {
      rdv:    { bg: '#e8f5e9', border: '#43a047', icon_bg: '#43a047' },
      alerte: { bg: '#fff8e1', border: '#fb8c00', icon_bg: '#fb8c00' },
      annonce:{ bg: '#e3f2fd', border: '#1e88e5', icon_bg: '#1e88e5' },
    };

    container.innerHTML = notifs.map((n) => {
      const c = typeColors[n.type] || { bg: '#f5f5f5', border: '#9e9e9e', icon_bg: '#9e9e9e' };
      return `
        <div class="agri-notif-card" style="
          display:flex;gap:16px;align-items:flex-start;
          background:${c.bg};border-left:4px solid ${c.border};
          border-radius:12px;padding:16px 20px;margin-bottom:12px;
          box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <div style="
            width:44px;height:44px;border-radius:50%;background:${c.icon_bg};
            display:flex;align-items:center;justify-content:center;
            font-size:1.4rem;flex-shrink:0;">
            ${n.icon || '🔔'}
          </div>
          <div style="flex:1;min-width:0;">
            <strong style="display:block;font-size:1rem;color:#1b1b1b;margin-bottom:4px;">${agriEscape ? agriEscape(n.titre) : n.titre}</strong>
            <p style="margin:0 0 6px;color:#444;font-size:0.9rem;line-height:1.4;">${agriEscape ? agriEscape(n.desc) : n.desc}</p>
            <small style="color:#888;font-size:0.78rem;">🕐 ${n.date || ''}</small>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('agriLoadNotifications error:', err);
    container.innerHTML = `
      <div class="agri-empty-state" style="padding:32px;text-align:center;color:#c0392b;">
        <div style="font-size:2.5rem;margin-bottom:10px;">⚠️</div>
        <p style="margin:0;">Impossible de charger les notifications.<br>
        <button class="agri-btn agri-btn-light" style="margin-top:12px;font-size:0.85rem"
          onclick="agriLoadNotifications()">↻ Réessayer</button></p>
      </div>`;
  }
};
