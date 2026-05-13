let isDark = false;
let buyerProducts = [];
let buyerOrders = [];
let buyerCart = [];
let cartFarmerId = null;
let currentOrderDraft = null;

/* ── CSRF token helper ──────────────────────────────────────────────────── */
function getBuyerCSRFToken() {
  // 1. Django injects csrftoken cookie
  const cookie = document.cookie.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('csrftoken='));
  if (cookie) return cookie.split('=')[1];
  // 2. Fallback: hidden input injected by {% csrf_token %}
  const input = document.querySelector('[name=csrfmiddlewaretoken]');
  if (input) return input.value;
  return '';
}
window.getBuyerCSRFToken = getBuyerCSRFToken;

const sections = ['dashboard','commandes','produits','livraison','notifications','profil','parametres'];
const titles = {
  dashboard:'Tableau de bord', commandes:'Mes Commandes', produits:'Catalogue Produits',
  livraison:'Suivi Livraison',
  notifications:'Notifications', profil:'Mon Profil', parametres:'Paramètres'
};

function buyerMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} DA`;
}

function buyerStatusMeta(status) {
  const map = {
    en_attente: { label: 'En attente', cls: 'badge-new', filter: 'new' },
    confirmee: { label: 'Confirmée', cls: 'badge-progress', filter: 'progress' },
    refusee: { label: 'Refusée', cls: 'badge-refused', filter: 'refused' },
    en_preparation: { label: 'Préparation', cls: 'badge-progress', filter: 'progress' },
    expediee: { label: 'Expédiée', cls: 'badge-progress', filter: 'progress' },
    livree: { label: 'Livrée', cls: 'badge-done', filter: 'done' },
    annulee: { label: 'Annulée', cls: 'badge-refused', filter: 'refused' },
  };
  return map[status] || { label: status || 'Inconnue', cls: 'badge-new', filter: 'all' };
}

function toggleDark() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  ['toggle-sw','toggle-settings'].forEach(id => document.getElementById(id)?.classList.toggle('on', isDark));
  const icon = isDark ? '☀️' : '🌙';
  const label = isDark ? 'Mode clair' : 'Mode sombre';
  const a = document.getElementById('dark-icon-sidebar');
  const b = document.getElementById('dark-label-sidebar');
  const c = document.getElementById('dark-icon-top');
  if (a) a.textContent = icon;
  if (b) b.textContent = label;
  if (c) c.textContent = icon;
}


async function buyerEnsureSessionRole() {
  try {
    const response = await fetch('/api/session-info/');
    if (!response.ok) {
      window.location.href = '/login/';
      return false;
    }
    const data = await response.json();
    if (data.role !== 'acheteur') {
      showBuyerToast(`Session active: ${data.role || 'inconnue'}. Redirection...`, 'error');
      setTimeout(() => { window.location.href = data.dashboard_url || '/login/'; }, 900);
      return false;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function navigate(page) {
  sections.forEach((s) => document.getElementById('sec-' + s)?.classList.remove('active'));
  document.getElementById('sec-' + page)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.remove('active');
    if ((item.getAttribute('onclick') || '').includes(`'${page}'`)) item.classList.add('active');
  });
  const title = document.getElementById('topbar-title');
  if (title) title.textContent = titles[page] || page;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'produits') loadCatalogueProduits();
  if (page === 'commandes') loadBuyerOrders();
  if (page === 'livraison') loadBuyerOrders(); // FIX: was renderBuyerLogisticsSection() — must fetch data first
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('overlay')?.classList.toggle('visible');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('overlay')?.classList.remove('visible');
}

function filterOrders(btn, status) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.order-card').forEach(card => {
    card.style.display = (status === 'all' || card.dataset.status === status) ? '' : 'none';
  });
}

function showBuyerToast(message, type='success') {
  let wrap = document.getElementById('buyerToastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'buyerToastWrap';
    wrap.className = 'buyer-system-toast-wrap';
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-atomic', 'true');
    document.body.appendChild(wrap);
  }

  const meta = {
    success: { icon: '✓', title: 'Action réussie' },
    error: { icon: '!', title: 'Attention' },
    info: { icon: 'i', title: 'Information' },
    warning: { icon: '!', title: 'Vérification' }
  }[type] || { icon: 'i', title: 'Information' };

  const toast = document.createElement('div');
  toast.className = `buyer-system-toast ${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `
    <div class="buyer-system-toast-icon">${meta.icon}</div>
    <div class="buyer-system-toast-content">
      <strong>${escapeHtml(meta.title)}</strong>
      <span>${escapeHtml(message || 'Notification système')}</span>
    </div>
    <button class="buyer-system-toast-close" type="button" aria-label="Fermer">×</button>
  `;
  toast.querySelector('.buyer-system-toast-close')?.addEventListener('click', () => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 220);
  });
  wrap.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
  }, 3800);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]|'/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function persistCart() {
  try {
    localStorage.setItem('agrigovBuyerCart', JSON.stringify({ items: buyerCart, farmerId: cartFarmerId }));
  } catch (error) {
    console.warn('Impossible de sauvegarder le panier', error);
  }
}

function restoreCart() {
  try {
    const raw = localStorage.getItem('agrigovBuyerCart');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    buyerCart = Array.isArray(parsed?.items) ? parsed.items : [];
    cartFarmerId = parsed?.farmerId || (buyerCart[0]?.agriculteur_id ?? null);
  } catch (error) {
    buyerCart = [];
    cartFarmerId = null;
  }
}

function getProductByDbId(dbId) {
  return buyerProducts.find((item) => Number(item.db_id || item.id) === Number(dbId));
}

function getCartStats() {
  const totalItems = buyerCart.reduce((sum, item) => sum + Number(item.quantite || 0), 0);
  const totalPrice = buyerCart.reduce((sum, item) => sum + (Number(item.prix || 0) * Number(item.quantite || 0)), 0);
  return { totalItems, totalPrice };
}

function updateCartBadge() {
  const badge = document.getElementById('buyerCartBadge');
  const count = document.getElementById('buyerCartCount');
  const total = document.getElementById('buyerCartTotal');
  const { totalItems, totalPrice } = getCartStats();
  if (badge) badge.textContent = totalItems;
  if (count) count.textContent = `${totalItems} kg`;
  if (total) total.textContent = buyerMoney(totalPrice);
}

function renderBuyerCart() {
  const body = document.getElementById('buyerCartItems');
  const farmer = document.getElementById('buyerCartFarmer');
  const empty = document.getElementById('buyerCartEmpty');
  const checkoutBtn = document.getElementById('buyerCheckoutBtn');
  const clearBtn = document.getElementById('buyerClearCartBtn');
  if (!body) return;

  const { totalItems, totalPrice } = getCartStats();
  const farmerName = buyerCart[0]?.vendeur_nom || 'Aucun agriculteur';
  if (farmer) farmer.textContent = buyerCart.length ? `Panier lié à ${farmerName}` : 'Panier vide';
  if (empty) empty.style.display = buyerCart.length ? 'none' : 'block';
  if (checkoutBtn) checkoutBtn.disabled = !buyerCart.length;
  if (clearBtn) clearBtn.disabled = !buyerCart.length;
  document.getElementById('buyerCartSummaryQty').textContent = `${totalItems} kg`;
  document.getElementById('buyerCartSummaryTotal').textContent = buyerMoney(totalPrice);

  if (!buyerCart.length) {
    body.innerHTML = '';
    updateCartBadge();
    persistCart();
    return;
  }

  body.innerHTML = buyerCart.map((item) => `
    <div class="cart-item">
      <img class="cart-item-image" src="${escapeHtml(item.photo || 'https://via.placeholder.com/100x100?text=Produit')}" alt="${escapeHtml(item.nom)}">
      <div class="cart-item-main">
        <div class="cart-item-top">
          <div>
            <div class="cart-item-name">${escapeHtml(item.nom)}</div>
            <div class="cart-item-meta">${escapeHtml(item.vendeur_nom || 'Agriculteur')} · ${escapeHtml(item.categorie || '')}</div>
          </div>
          <button class="cart-item-remove" onclick="removeCartItem(${Number(item.listing_id)})">×</button>
        </div>
        <div class="cart-item-bottom">
          <div class="qty-stepper">
            <button onclick="changeCartQty(${Number(item.listing_id)}, -1)">−</button>
            <span>${Number(item.quantite)} kg</span>
            <button onclick="changeCartQty(${Number(item.listing_id)}, 1)">+</button>
          </div>
          <div class="cart-item-price">${buyerMoney(Number(item.prix) * Number(item.quantite))}</div>
        </div>
      </div>
    </div>
  `).join('');
  updateCartBadge();
  persistCart();
}

function addToCart(listingId) {
  const product = getProductByDbId(listingId);
  if (!product || !product.db_id) {
    showBuyerToast('Choisissez une annonce d\'agriculteur disponible.', 'error');
    return;
  }

  if (cartFarmerId && Number(cartFarmerId) !== Number(product.agriculteur_id)) {
    showBuyerToast('Un panier doit contenir les produits d\'un seul agriculteur.', 'error');
    return;
  }

  const existing = buyerCart.find((item) => Number(item.listing_id) === Number(product.db_id));
  const maxQty = Number(product.quantite || 0);

  if (existing) {
    if (existing.quantite >= maxQty) {
      showBuyerToast('Stock maximal atteint pour ce produit.', 'error');
      return;
    }
    existing.quantite += 1;
  } else {
    buyerCart.push({
      listing_id: Number(product.db_id),
      agriculteur_id: Number(product.agriculteur_id),
      nom: product.nom,
      vendeur_nom: product.vendeur_nom,
      categorie: product.categorie,
      photo: product.photo,
      prix: Number(product.prix || 0),
      stock_max: maxQty,
      quantite: 1,
    });
  }

  cartFarmerId = Number(product.agriculteur_id);
  renderBuyerCart();
  showBuyerToast(`${product.nom} ajouté au panier.`);
}

function changeCartQty(listingId, delta) {
  const item = buyerCart.find((row) => Number(row.listing_id) === Number(listingId));
  if (!item) return;
  item.quantite += delta;
  if (item.quantite <= 0) {
    removeCartItem(listingId);
    return;
  }
  if (item.quantite > Number(item.stock_max || 0)) {
    item.quantite = Number(item.stock_max || 0);
    showBuyerToast('Stock maximal atteint pour ce produit.', 'error');
  }
  renderBuyerCart();
}

function removeCartItem(listingId) {
  buyerCart = buyerCart.filter((row) => Number(row.listing_id) !== Number(listingId));
  if (!buyerCart.length) cartFarmerId = null;
  renderBuyerCart();
}

function clearBuyerCart() {
  buyerCart = [];
  cartFarmerId = null;
  renderBuyerCart();
}

function toggleBuyerCart(forceOpen) {
  const drawer = document.getElementById('buyerCartDrawer');
  const overlay = document.getElementById('buyerCartOverlay');
  if (!drawer || !overlay) return;
  const open = typeof forceOpen === 'boolean' ? forceOpen : !drawer.classList.contains('open');
  drawer.classList.toggle('open', open);
  overlay.classList.toggle('visible', open);
}

function openCheckoutModal() {
  if (!buyerCart.length) {
    showBuyerToast('Le panier est vide.', 'error');
    return;
  }
  currentOrderDraft = {
    adresse: document.getElementById('buyerCheckoutAddress')?.value || '',
    note: document.getElementById('buyerCheckoutNote')?.value || '',
  };
  document.getElementById('buyerCheckoutAddress').value = currentOrderDraft.adresse;
  document.getElementById('buyerCheckoutNote').value = currentOrderDraft.note;
  document.getElementById('buyerCheckoutItems').innerHTML = buyerCart.map(item => `
    <div class="checkout-line">
      <span>${escapeHtml(item.nom)} · ${Number(item.quantite)} kg</span>
      <strong>${buyerMoney(Number(item.prix) * Number(item.quantite))}</strong>
    </div>
  `).join('');
  document.getElementById('buyerCheckoutTotal').textContent = buyerMoney(getCartStats().totalPrice);
  document.getElementById('buyerCheckoutModal').classList.add('visible');
  toggleBuyerCart(false);
}

function closeCheckoutModal() {
  document.getElementById('buyerCheckoutModal')?.classList.remove('visible');
}

async function submitCheckout() {
  const address = (document.getElementById('buyerCheckoutAddress')?.value || '').trim();
  const note = (document.getElementById('buyerCheckoutNote')?.value || '').trim();
  const submitBtn = document.getElementById('buyerCheckoutSubmit');

  if (!address) {
    showBuyerToast('Ajoute une adresse de livraison.', 'error');
    return;
  }
  if (!buyerCart.length) {
    showBuyerToast('Le panier est vide.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Validation...';
  try {
    const response = await fetch('/api/produits/commandes/creer/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adresse_livraison: address,
        note,
        items: buyerCart.map(item => ({ listing_id: item.listing_id, quantite: item.quantite })),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      showBuyerToast(data.error || 'Impossible de créer la commande.', 'error');
      if (response.status === 401 || response.status === 403) {
        await buyerEnsureSessionRole();
      }
      return;
    }
    closeCheckoutModal();
    clearBuyerCart();
    await loadCatalogueProduits();
    await loadBuyerOrders();
    showBuyerToast(`Commande #${data.commande.id} créée avec succès.`);
    navigate('commandes');
  } catch (error) {
    console.error(error);
    showBuyerToast('Erreur réseau lors de la création de la commande.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirmer la commande';
  }
}

function quickOrderFromProduct(listingId) {
  addToCart(listingId);
  toggleBuyerCart(true);
}

async function loadCatalogueProduits() {
  const grid = document.getElementById('buyerProductsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="card" style="padding:20px;">Chargement du catalogue...</div>';
  try {
    const response = await fetch('/api/produits/catalog/?scope=buyer');
    const data = await response.json();
    buyerProducts = Array.isArray(data) ? data : [];
    syncCartWithProducts();
    renderBuyerProducts();
    renderBuyerCart();
    renderBuyerDashboard();
    renderBuyerLogisticsSection();
    renderBuyerNotificationsSection();
    updateBuyerNavBadges();
  } catch (error) {
    console.error('Erreur catalogue :', error);
    grid.innerHTML = '<div class="card" style="padding:20px;color:#b91c1c;">Impossible de charger le catalogue.</div>';
    await buyerEnsureSessionRole();
  }
}

function syncCartWithProducts() {
  buyerCart = buyerCart
    .map((item) => {
      const fresh = getProductByDbId(item.listing_id);
      if (!fresh) return null;
      const stockMax = Number(fresh.quantite || 0);
      if (stockMax <= 0) return null;
      return {
        ...item,
        nom: fresh.nom,
        vendeur_nom: fresh.vendeur_nom,
        categorie: fresh.categorie,
        photo: fresh.photo,
        prix: Number(fresh.prix || 0),
        stock_max: stockMax,
        quantite: Math.min(Number(item.quantite || 1), stockMax),
      };
    })
    .filter(Boolean);
  if (!buyerCart.length) cartFarmerId = null;
}

function renderBuyerProducts() {
  const grid = document.getElementById('buyerProductsGrid');
  if (!grid) return;
  const search = (document.getElementById('buyerProductSearch')?.value || '').toLowerCase().trim();
  const category = document.getElementById('buyerCategoryFilter')?.value || 'all';
  const rows = buyerProducts.filter((item) => {
    const matchSearch = !search || `${item.nom} ${item.description || ''} ${item.vendeur_nom || ''}`.toLowerCase().includes(search);
    const matchCategory = category === 'all' || item.categorie === category;
    return matchSearch && matchCategory;
  });

  if (!rows.length) {
    grid.innerHTML = '<div class="card" style="padding:20px;">Aucun produit disponible pour le moment.</div>';
    return;
  }

  grid.innerHTML = rows.map((product) => {
    // RÈGLE : l'acheteur voit UNIQUEMENT les publications des agriculteurs.
    const listingId = Number(product.db_id || 0);
    const inCart = buyerCart.find((item) => Number(item.listing_id) === listingId);
    const sellerConflict = cartFarmerId && Number(cartFarmerId) !== Number(product.agriculteur_id);
    const disabled = !listingId || sellerConflict || Number(product.quantite || 0) <= 0;
    return `
      <div class="product-card product-card-rich ${disabled ? 'is-disabled' : ''}">
        <div class="product-image-wrap">
          <img class="product-image" src="${escapeHtml(product.photo || 'https://via.placeholder.com/400x240?text=Produit')}" alt="${escapeHtml(product.nom)}">
        </div>
        <div class="product-body">
          <div class="product-header-row">
            <div>
              <div class="product-name">${escapeHtml(product.nom)}</div>
              <div class="product-origin">${escapeHtml(product.vendeur_nom || 'Agriculteur')} · ${escapeHtml(product.categorie)}</div>
            </div>
            <span class="badge ${Number(product.quantite || 0) > 0 ? 'badge-progress' : 'badge-refused'}">${escapeHtml(product.statut || 'Disponible')}</span>
          </div>
          <div class="product-desc">${escapeHtml(product.description || 'Produit agricole disponible.')}</div>
          <div class="product-meta product-meta-rich">
            <span>📦 ${Number(product.quantite || 0)} kg</span>
            <span>🧾 Réf. ${escapeHtml(product.id)}</span>
          </div>
          <div class="product-price-row product-price-actions">
            <div>
              <div class="product-price">${escapeHtml(product.prix)}<span> DA/kg</span></div>
              <div class="product-range">Fourchette officielle: ${escapeHtml(product.prix_min)} - ${escapeHtml(product.prix_max)} DA</div>
            </div>
            <div class="product-actions-stack">
              <button class="btn-soft" ${disabled ? 'disabled' : ''} onclick="addToCart(${listingId})">${inCart ? 'Ajouter encore' : 'Panier'}</button>
              <button class="btn-add-wide" ${disabled ? 'disabled' : ''} onclick="quickOrderFromProduct(${listingId})">Commander</button>
            </div>
          </div>
          ${sellerConflict ? '<div class="product-warning">Votre panier contient déjà les produits d\'un autre agriculteur.</div>' : ''}
          ${inCart ? `<div class="product-in-cart">Déjà dans le panier : ${Number(inCart.quantite)} kg</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function loadBuyerOrders() {
  // FIX: removed `if (!list) return` — orders-list only exists on the commandes page,
  // so this was silently aborting the fetch when navigating directly to livraison.
  const list = document.getElementById('orders-list');
  if (list) list.innerHTML = '<div class="card" style="padding:20px;">Chargement des commandes...</div>';
  try {
    const response = await fetch('/api/produits/commandes/');
    const data = await response.json();
    buyerOrders = Array.isArray(data) ? data : [];
    console.log('[loadBuyerOrders] Chargé:', buyerOrders.length, 'commandes', buyerOrders.map(o => `CMD-${o.id}(${o.statut})`));
    renderBuyerOrders();
    renderBuyerDashboard();
    renderBuyerLogisticsSection();
    renderBuyerNotificationsSection();
    updateBuyerNavBadges();
  } catch (error) {
    console.error('[loadBuyerOrders] Erreur fetch:', error);
    if (list) list.innerHTML = '<div class="card" style="padding:20px;color:#b91c1c;">Impossible de charger les commandes.</div>';
  }
}

function renderBuyerOrders() {
  const list = document.getElementById('orders-list');
  if (!list) return;

  const totalEl = document.getElementById('buyerOrdersTotal');
  const newEl = document.getElementById('buyerOrdersNew');
  const progressEl = document.getElementById('buyerOrdersProgress');
  const deliveredEl = document.getElementById('buyerOrdersDelivered');
  if (totalEl) totalEl.textContent = buyerOrders.length;
  if (newEl) newEl.textContent = buyerOrders.filter(o => o.statut === 'en_attente').length;
  if (progressEl) progressEl.textContent = buyerOrders.filter(o => ['confirmee','en_preparation','expediee'].includes(o.statut)).length;
  if (deliveredEl) deliveredEl.textContent = buyerOrders.filter(o => o.statut === 'livree').length;

  if (!buyerOrders.length) {
    list.innerHTML = '<div class="card" style="padding:20px;">Aucune commande pour le moment.</div>';
    return;
  }

  list.innerHTML = buyerOrders.map((order) => {
    const meta = buyerStatusMeta(order.statut);
    const firstLine = order.lignes?.[0];
    const linesText = (order.lignes || []).map(l => `${l.produit_nom} (${l.quantite} kg)`).join(', ');
    const cancelBtn = order.statut === 'en_attente'
      ? `<button class="btn-outline-green" onclick="cancelBuyerOrder(${order.id})">Annuler</button>`
      : '';
    return `
      <div class="order-card" data-status="${meta.filter}">
        <div class="order-card-top">
          <div><div class="order-id">CMD-${order.id}</div><div class="order-farm">${escapeHtml(order.agriculteur)}</div></div>
          <div style="text-align:right"><span class="badge ${meta.cls}">${meta.label}</span><div class="order-date">${new Date(order.date_creation).toLocaleString('fr-FR')}</div></div>
        </div>
        <div class="order-card-body">
          <div><div class="order-field-label">Produit</div><div class="order-field-val">${escapeHtml(firstLine ? firstLine.produit_nom : '-')}</div></div>
          <div><div class="order-field-label">Lignes</div><div class="order-field-val">${order.lignes.length}</div></div>
          <div><div class="order-field-label">Montant</div><div class="order-field-val">${buyerMoney(order.total)}</div></div>
        </div>
        <div style="padding:0 20px 16px;color:var(--text-muted);font-size:13px;">📦 ${escapeHtml(linesText || 'Aucune ligne')}<br>📍 ${escapeHtml(order.adresse_livraison)}</div>
        <div class="order-card-footer">
          <span style="font-size:13px;color:var(--text-muted)">${escapeHtml(order.note || 'Sans note particulière')}</span>
          <div style="display:flex;gap:9px">${cancelBtn}</div>
        </div>
      </div>
    `;
  }).join('');
}

async function cancelBuyerOrder(orderId) {
  if (!confirm('Annuler cette commande ?')) return;
  try {
    const response = await fetch(`/api/produits/commandes/${orderId}/statut/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'annulee' }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      showBuyerToast(data.error || 'Impossible d\'annuler la commande.', 'error');
      return;
    }
    await loadBuyerOrders();
    await loadCatalogueProduits();
    showBuyerToast('Commande annulée.');
  } catch (error) {
    console.error(error);
    showBuyerToast('Erreur réseau.', 'error');
  }
}


function buyerRecentActivities() {
  return buyerOrders.slice(0, 4).map((order) => {
    const firstLine = order.lignes?.[0];
    return {
      title: `Commande CMD-${order.id}`,
      subtitle: `${order.agriculteur} · ${firstLine ? firstLine.produit_nom : 'Produit'}`,
      amount: buyerMoney(order.total),
      icon: order.statut === 'livree' ? '✅' : order.statut === 'expediee' ? '🚛' : '📋',
    };
  });
}

function buyerSupplierStats() {
  const map = new Map();
  buyerOrders.forEach((order) => {
    const key = order.agriculteur || 'Agriculteur';
    if (!map.has(key)) map.set(key, { name: key, commandes: 0, produits: new Set() });
    const row = map.get(key);
    row.commandes += 1;
    (order.lignes || []).forEach((line) => row.produits.add(line.produit_nom));
  });
  return Array.from(map.values()).map((item) => ({
    ...item,
    produitsLabel: Array.from(item.produits).slice(0, 3).join(', ') || 'Catalogue varié'
  }));
}


function buyerMonthlyTotals(lastMonths = 6) {
  const labels = []; const values = []; const now = new Date();
  for (let i = lastMonths - 1; i >= 0; i -= 1) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); labels.push(d.toLocaleDateString('fr-FR', { month: 'short' })); values.push(0); }
  buyerOrders.forEach((order) => { const date = new Date(order.date_creation || order.date || Date.now()); const idx = labels.findIndex((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - (lastMonths - 1 - i), 1); return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth(); }); if (idx >= 0) values[idx] += Number(order.total || 0); });
  return { labels, values };
}

function buildBuyerChart(values) {
  const safe = values.length ? values : [0, 0, 0, 0, 0, 0];
  const max = Math.max(...safe, 1);
  return safe.map((value) => `<div class="chart-col"><div class="bar" style="height:${Math.max(10, Math.round((value / max) * 120))}px"></div></div>`).join('');
}

function renderBuyerDashboard() {
  const section = document.getElementById('sec-dashboard');
  if (!section) return;
  const totalOrders = buyerOrders.length;
  const deliveredOrders = buyerOrders.filter((o) => o.statut === 'livree').length;
  const activeOrders = buyerOrders.filter((o) => ['confirmee','en_preparation','expediee'].includes(o.statut)).length;
  const pendingOrders = buyerOrders.filter((o) => o.statut === 'en_attente').length;
  const totalSpent = buyerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const notificationsCount = pendingOrders + activeOrders + Math.min(3, buyerProducts.filter((item) => Number(item.quantite || 0) > 0).length);
  const monthly = buyerMonthlyTotals(6);
  const monthlyLabels = monthly.labels;
  const monthlyValues = monthly.values;
  const activities = buyerRecentActivities();
  section.innerHTML = `
    <div class="welcome-banner">
      <div class="welcome-grid"></div>
      <div class="welcome-text">
        <div class="welcome-greeting">Bonjour, ${escapeHtml(document.getElementById('buyerSidebarName')?.textContent || 'Acheteur')} · AgriGov Market</div>
        <div class="welcome-name">Bienvenue, <em id="buyerWelcomeName">${escapeHtml(document.getElementById('buyerSidebarName')?.textContent || 'Acheteur')}</em> 👋</div>
        <div class="welcome-desc">Vos indicateurs sont maintenant chargés depuis les vraies commandes, livraisons et produits disponibles sur la plateforme.</div>
      </div>
      <div class="welcome-actions">
        <button class="btn-glass" onclick="navigate('produits')">📦 Nouvelle commande</button>
        <button class="btn-gold" onclick="navigate('commandes')">📋 Mes commandes</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Total Commandes</div><div class="stat-value">${totalOrders}</div><div class="stat-change">${pendingOrders} en attente</div><div class="stat-icon">📋</div></div>
      <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Commandes livrées</div><div class="stat-value">${deliveredOrders}</div><div class="stat-change">${totalOrders ? Math.round((deliveredOrders / totalOrders) * 100) : 0}% du total</div><div class="stat-icon">✅</div></div>
      <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">En livraison</div><div class="stat-value">${activeOrders}</div><div class="stat-change">Suivi en temps réel</div><div class="stat-icon">🚛</div></div>
      <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Total dépensé</div><div class="stat-value">${buyerMoney(totalSpent)}</div><div class="stat-change">Commandes confirmées et livrées</div><div class="stat-icon">💰</div></div>
    </div>

    <div class="quick-actions">
      <div class="quick-action-btn" onclick="navigate('produits')"><div class="quick-action-icon">🛒</div><div class="quick-action-label">Passer une commande</div><div class="quick-action-sub">${buyerProducts.filter((item) => Number(item.quantite || 0) > 0).length} offres actives</div></div>
      <div class="quick-action-btn" onclick="navigate('livraison')"><div class="quick-action-icon">📍</div><div class="quick-action-label">Suivre ma livraison</div><div class="quick-action-sub">${activeOrders} commande(s) en transit</div></div>
      <div class="quick-action-btn" onclick="navigate('notifications')"><div class="quick-action-icon">🔔</div><div class="quick-action-label">Notifications</div><div class="quick-action-sub">${notificationsCount} signal(s) utiles</div></div>
    </div>

    <div class="grid-3">
      <div class="card">
        <div class="card-header"><div><div class="card-title">Dépenses mensuelles</div><div class="card-subtitle">Basé sur vos commandes réelles</div></div></div>
        <div class="chart-bars" id="chart">${buildBuyerChart(monthlyValues)}</div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;">${monthlyLabels.map((label) => `<span style="font-size:11px;color:var(--text-muted)">${label}</span>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Activité récente</div><div class="card-subtitle">Synchronisée avec vos commandes</div></div></div>
        <div class="activity-list">${activities.length ? activities.map((item) => `<div class="activity-item"><div class="activity-dot order">${item.icon}</div><div class="activity-info"><div class="activity-title">${escapeHtml(item.title)}</div><div class="activity-time">${escapeHtml(item.subtitle)}</div></div><div class="activity-amount">${escapeHtml(item.amount)}</div></div>`).join('') : '<div class="activity-item"><div class="activity-info"><div class="activity-title">Aucune activité</div><div class="activity-time">Passez votre première commande depuis le catalogue.</div></div></div>'}</div>
      </div>
    </div>
  `;
}

/* ── Cartes de livraison masquées localement ─────────────────────────── */
const BUYER_DISMISSED_CARDS_KEY = 'agrigovDismissedDeliveryCards';
function getBuyerDismissedCards() {
  try { return JSON.parse(localStorage.getItem(BUYER_DISMISSED_CARDS_KEY) || '[]'); }
  catch { return []; }
}
function dismissDeliveryCard(orderId) {
  if (!confirm(`Masquer la carte de livraison CMD-${orderId} ?\nElle ne sera plus affichée dans ce suivi.`)) return;
  const dismissed = getBuyerDismissedCards();
  if (!dismissed.includes(orderId)) {
    dismissed.push(orderId);
    localStorage.setItem(BUYER_DISMISSED_CARDS_KEY, JSON.stringify(dismissed));
  }
  renderBuyerLogisticsSection();
  updateBuyerNavBadges();
  showBuyerToast(`Carte CMD-${orderId} supprimée du suivi.`, 'info');
}
window.dismissDeliveryCard = dismissDeliveryCard;

function renderBuyerLogisticsSection() {
  const section = document.getElementById('sec-livraison');
  if (!section) return;
  const dismissed = getBuyerDismissedCards();
  const activeOrders = buyerOrders.filter((order) =>
    ['confirmee','en_preparation','expediee','livree'].includes(order.statut) &&
    !dismissed.includes(order.id)
  );
  
  if (!activeOrders.length) {
    const hasDismissed = buyerOrders.some(o =>
      ['confirmee','en_preparation','expediee','livree'].includes(o.statut) &&
      dismissed.includes(o.id)
    );
    section.innerHTML = `
      <div class="page-header">
        <div class="page-title">Suivi Livraison</div>
        <div class="page-desc">Vos cartes de livraison pour chaque commande active.</div>
      </div>
      <div class="card" style="padding:28px;text-align:center;color:var(--text-muted)">
        <div style="font-size:2rem;margin-bottom:10px">🚛</div>
        <p>Aucune livraison en cours.<br><small>Vos commandes confirmées apparaîtront ici.</small></p>
        ${hasDismissed ? `<button onclick="restoreAllDeliveryCards()" style="margin-top:14px;padding:8px 18px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text-primary);cursor:pointer;font-size:13px;">🔄 Restaurer les cartes masquées</button>` : ''}
      </div>`;
    return;
  }

  const cards = activeOrders.map(order => {
    const meta = buyerStatusMeta(order.statut);
    const transporteur = buyerTransporterInfo(order);
    const depart = order.livraison?.lieu_depart || 'Ferme';
    const dest = order.livraison?.lieu_destination || order.adresse_livraison || 'Destination';
    return `
      <div class="card delivery-card-rich" style="margin-bottom:0;position:relative">
        <button onclick="dismissDeliveryCard(${order.id})" title="Supprimer cette carte"
          style="position:absolute;top:12px;right:12px;background:transparent;border:none;cursor:pointer;font-size:18px;color:var(--text-muted);line-height:1;padding:4px;border-radius:6px;transition:background .15s"
          onmouseover="this.style.background='rgba(185,28,28,.1)';this.style.color='#b91c1c'"
          onmouseout="this.style.background='transparent';this.style.color='var(--text-muted)'">✕</button>
        <div class="card-header" style="padding-right:36px">
          <div>
            <div class="card-title">CMD-${order.id}</div>
            <div class="card-subtitle">${escapeHtml((order.lignes||[]).map(l=>l.produit_nom).join(', ')||'Commande')}</div>
          </div>
          <span class="badge ${meta.cls}">${meta.label}</span>
        </div>
        <div class="map-placeholder" style="min-height:90px">
          <div class="map-pin">📍</div>
          <span style="z-index:1;font-size:13px;font-weight:500">${escapeHtml(depart)} → ${escapeHtml(dest)}</span>
        </div>
        <div class="delivery-info-grid" style="margin-top:12px">
          <div><span>Agriculteur</span><strong>${escapeHtml(order.agriculteur||'—')}</strong></div>
          <div><span>Montant</span><strong>${buyerMoney(order.total)}</strong></div>
          <div><span>Transporteur</span><strong>${escapeHtml(transporteur.nom||'Non assigné')}</strong></div>
          <div><span>Contact</span><strong>${escapeHtml(transporteur.telephone||'—')}</strong></div>
        </div>
        ${order.statut==='livree' ? `
        <div style="padding:10px 0 0;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-add-wide btn-evaluate" onclick="openBuyerEvaluationModal(${order.id})" style="flex:1">⭐ Évaluer</button>
        </div>` : `
        <div style="padding:10px 0 0;display:flex;gap:8px;flex-wrap:wrap">
          ${transporteur.telephone ? `<button class="btn-outline-green" onclick="contactTransporter(${order.id})" style="flex:1">📞 Contacter livreur</button>` : ''}
          <button class="btn-outline-gold" onclick="openBuyerProblemModal(${order.id})" style="flex:1">⚠️ Problème</button>
        </div>`}
      </div>`;
  }).join('');

  const dismissedCount = buyerOrders.filter(o =>
    ['confirmee','en_preparation','expediee','livree'].includes(o.statut) &&
    dismissed.includes(o.id)
  ).length;

  section.innerHTML = `
    <div class="page-header">
      <div class="page-title">Suivi Livraison</div>
      <div class="page-desc">${activeOrders.length} livraison(s) affichée(s)${dismissedCount ? ` · <span style="cursor:pointer;color:var(--gold,#b8860b);text-decoration:underline" onclick="restoreAllDeliveryCards()">${dismissedCount} masquée(s) — restaurer</span>` : ''}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
      ${cards}
    </div>`;
}

function restoreAllDeliveryCards() {
  localStorage.removeItem(BUYER_DISMISSED_CARDS_KEY);
  renderBuyerLogisticsSection();
  updateBuyerNavBadges();
  showBuyerToast('Toutes les cartes ont été restaurées.', 'info');
}
window.restoreAllDeliveryCards = restoreAllDeliveryCards;



function renderBuyerNotificationsSection() {
  const section = document.getElementById('sec-notifications');
  if (!section) return;
  const notifications = [];
  buyerOrders.slice(0, 5).forEach((order, index) => {
    const meta = buyerStatusMeta(order.statut);
    notifications.push({
      unread: index < 3 && order.statut !== 'livree',
      icon: order.statut === 'livree' ? '✅' : order.statut === 'expediee' ? '🚛' : '📦',
      title: `Commande CMD-${order.id} · ${meta.label}`,
      desc: `${order.agriculteur} · ${escapeHtml((order.lignes || []).map((line) => line.produit_nom).join(', ') || 'Sans détail')}`,
      time: new Date(order.date_creation).toLocaleDateString('fr-FR'),
      variant: order.statut === 'livree' ? 'order' : 'farm',
    });
  });
  if (buyerProducts.length) {
    notifications.push({
      unread: notifications.length < 3,
      icon: '🌾',
      title: `${buyerProducts.filter((item) => Number(item.quantite || 0) > 0).length} offre(s) disponible(s)`,
      desc: 'Le catalogue a été synchronisé depuis les annonces agriculteurs disponibles.',
      time: 'Aujourd’hui',
      variant: 'farm',
    });
  }
  section.innerHTML = `
    <div class="page-header">
      <div class="page-title">Notifications</div>
      <div class="page-desc">Flux construit à partir de vos commandes et des offres actuellement disponibles.</div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Toutes les notifications</div><span style="font-size:13px;color:var(--text-muted);">${notifications.filter((item) => item.unread).length} non lue(s)</span></div>
      ${notifications.length ? notifications.map((item) => `<div class="notif-item ${item.unread ? 'unread' : ''}"><div class="notif-icon ${item.variant}">${item.icon}</div><div><div class="notif-title">${escapeHtml(item.title)}</div><div class="notif-desc">${escapeHtml(item.desc)}</div></div><div class="notif-time">${escapeHtml(item.time)}</div>${item.unread ? '<div class="unread-dot"></div>' : ''}</div>`).join('') : '<div class="card" style="padding:20px;">Aucune notification pour le moment.</div>'}
    </div>
  `;
}

function updateBuyerNavBadges() {
  const navItems = Array.from(document.querySelectorAll('.sidebar-nav .nav-item'));
  navItems.forEach((item) => {
    const text = item.textContent || '';
    const badge = item.querySelector('.nav-badge');
    if (text.includes('Mes Commandes')) {
      if (badge) badge.textContent = String(buyerOrders.length);
    }
    if (text.includes('Suivi Livraison')) {
      if (badge) badge.textContent = String(buyerOrders.filter((order) => ['confirmee','en_preparation','expediee'].includes(order.statut)).length);
    }
    if (text.includes('Notifications')) {
      if (badge) badge.textContent = String(Math.max(0, buyerOrders.filter((order) => order.statut !== 'livree' && order.statut !== 'annulee').length));
    }
  });
}

function initBuyerSections() {
  const produits = document.getElementById('sec-produits');
  if (produits) {
    produits.innerHTML = `
      <div class="page-header">
        <div class="page-title">Catalogue Produits</div>
        <div class="page-desc">Ajoutez les produits au panier puis confirmez votre commande dans une fenêtre dédiée.</div>
      </div>
      <div class="buyer-toolbar card" style="margin-bottom:24px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <input id="buyerProductSearch" type="text" placeholder="🔍 Rechercher un produit..." style="flex:1;min-width:220px;padding:11px 16px;background:var(--input-bg);border:1.5px solid var(--border-strong);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text-primary);outline:none;">
          <select id="buyerCategoryFilter" style="padding:11px 16px;background:var(--input-bg);border:1.5px solid var(--border-strong);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text-primary);outline:none;cursor:pointer;">
            <option value="all">Toutes les catégories</option>
            <option value="Legume">Légumes</option>
            <option value="Fruit">Fruits</option>
            <option value="Animal">Animal</option>
            <option value="Cereale">Céréale</option>
          </select>
          <button class="cart-open-btn" onclick="toggleBuyerCart(true)">🛒 Panier <span id="buyerCartBadge">0</span></button>
        </div>
      </div>
      <div id="buyerProductsGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;"></div>
    `;
  }

  const commandes = document.getElementById('sec-commandes');
  if (commandes) {
    commandes.innerHTML = `
      <div class="page-header">
        <div class="page-title">Mes Commandes</div>
        <div class="page-desc">Suivez vos commandes créées depuis la plateforme.</div>
      </div>
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Total</div><div class="stat-value" id="buyerOrdersTotal">0</div><div class="stat-icon">📋</div></div>
        <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">En attente</div><div class="stat-value" id="buyerOrdersNew">0</div><div class="stat-icon">🆕</div></div>
        <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">En cours</div><div class="stat-value" id="buyerOrdersProgress">0</div><div class="stat-icon">🚛</div></div>
        <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Livrées</div><div class="stat-value" id="buyerOrdersDelivered">0</div><div class="stat-icon">✅</div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Liste des Commandes</div>
          <button onclick="navigate('produits')" style="padding:10px 20px;background:var(--green-deep);color:white;border:none;border-radius:11px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:500;font-size:13px;transition:all 0.2s">+ Nouvelle commande</button>
        </div>
        <div class="filter-tabs">
          <button class="filter-tab active" onclick="filterOrders(this,'all')">Tous</button>
          <button class="filter-tab" onclick="filterOrders(this,'new')">En attente</button>
          <button class="filter-tab" onclick="filterOrders(this,'progress')">En cours</button>
          <button class="filter-tab" onclick="filterOrders(this,'done')">Livrées</button>
          <button class="filter-tab" onclick="filterOrders(this,'refused')">Refusées / annulées</button>
        </div>
        <div id="orders-list"></div>
      </div>
    `;
  }

  if (!document.getElementById('buyerCartDrawer')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="buyerCartOverlay" class="drawer-overlay" onclick="toggleBuyerCart(false)"></div>
      <aside id="buyerCartDrawer" class="cart-drawer">
        <div class="cart-drawer-header">
          <div>
            <div class="cart-drawer-title">Panier acheteur</div>
            <div class="cart-drawer-sub" id="buyerCartFarmer">Panier vide</div>
          </div>
          <button class="drawer-close" onclick="toggleBuyerCart(false)">×</button>
        </div>
        <div class="cart-drawer-body">
          <div id="buyerCartEmpty" class="cart-empty">Ajoutez des produits depuis le catalogue pour préparer votre commande.</div>
          <div id="buyerCartItems" class="cart-items"></div>
        </div>
        <div class="cart-drawer-footer">
          <div class="cart-summary-row"><span>Total quantité</span><strong id="buyerCartSummaryQty">0 kg</strong></div>
          <div class="cart-summary-row total"><span>Total estimé</span><strong id="buyerCartSummaryTotal">0 DA</strong></div>
          <div class="cart-summary-mini"><span id="buyerCartCount">0 kg</span><span id="buyerCartTotal">0 DA</span></div>
          <div class="cart-footer-actions">
            <button id="buyerClearCartBtn" class="btn-soft btn-soft-danger" onclick="clearBuyerCart()">Vider</button>
            <button id="buyerCheckoutBtn" class="btn-add-wide" onclick="openCheckoutModal()">Valider</button>
          </div>
        </div>
      </aside>
      <div id="buyerCheckoutModal" class="modal-shell">
        <div class="modal-card">
          <div class="modal-head">
            <div>
              <div class="modal-title">Confirmer la commande</div>
              <div class="modal-subtitle">Revoyez les lignes, l'adresse et la note avant l'envoi.</div>
            </div>
            <button class="drawer-close" onclick="closeCheckoutModal()">×</button>
          </div>
          <div class="modal-body">
            <div id="buyerCheckoutItems" class="checkout-lines"></div>
            <div class="form-group"><label>Adresse de livraison</label><input id="buyerCheckoutAddress" type="text" placeholder="Ex: Constantine, Zone industrielle..." /></div>
            <div class="form-group"><label>Note</label><textarea id="buyerCheckoutNote" rows="4" placeholder="Informations complémentaires..."></textarea></div>
          </div>
          <div class="modal-foot">
            <div class="cart-summary-row total"><span>Total commande</span><strong id="buyerCheckoutTotal">0 DA</strong></div>
            <button id="buyerCheckoutSubmit" class="btn-add-wide" onclick="submitCheckout()">Confirmer la commande</button>
          </div>
        </div>
      </div>
    `);
  }

  document.getElementById('buyerProductSearch')?.addEventListener('input', renderBuyerProducts);
  document.getElementById('buyerCategoryFilter')?.addEventListener('change', renderBuyerProducts);
  renderBuyerCart();
}


if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) toggleDark();
window.addToCart = addToCart;
window.changeCartQty = changeCartQty;
window.removeCartItem = removeCartItem;
window.clearBuyerCart = clearBuyerCart;
window.toggleBuyerCart = toggleBuyerCart;
window.quickOrderFromProduct = quickOrderFromProduct;
window.submitCheckout = submitCheckout;
window.closeCheckoutModal = closeCheckoutModal;
window.cancelBuyerOrder = cancelBuyerOrder;
window.navigate = navigate;
window.toggleDark = toggleDark;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.filterOrders = filterOrders;

restoreCart();

document.addEventListener('DOMContentLoaded', async () => {
  await initBuyerProfile();
  if (!(await buyerEnsureSessionRole())) return;
  initBuyerSections();
  renderBuyerCart();
  await loadCatalogueProduits();
  await loadBuyerOrders();
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) await buyerEnsureSessionRole();
  });
});

async function initBuyerProfile() {
  if (!window.AgriGovProfileApi) return;
  try {
    const profile = await window.AgriGovProfileApi.getProfile();
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
    set('buyerFirstName', profile.first_name);
    set('buyerLastName', profile.last_name);
    set('buyerEmail', profile.email);
    set('buyerPhone', profile.phone);
    set('buyerCity', profile.city);
    set('buyerWorkplace', profile.workplace);
    set('buyerEstablishment', profile.establishment_name);
    const fullName = profile.full_name || '';
    const initials = (profile.first_name?.[0] || profile.last_name?.[0] || 'A').toUpperCase();
    const name = document.getElementById('buyerProfileNameDisplay');
    if (name) name.textContent = fullName;
    const sidebarName = document.getElementById('buyerSidebarName');
    if (sidebarName) sidebarName.textContent = fullName;
    const welcomeName = document.getElementById('buyerWelcomeName');
    if (welcomeName) welcomeName.textContent = fullName;
    const avatar = document.getElementById('buyerProfileAvatar');
    if (avatar) avatar.textContent = initials;
    const sidebarAvatar = document.getElementById('buyerSidebarAvatar');
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
  } catch (error) {
    showBuyerToast(error.message || 'Erreur profil', 'error');
  }

  document.getElementById('buyerSaveProfileBtn')?.addEventListener('click', async () => {
    try {
      const profile = await window.AgriGovProfileApi.saveProfile({
        first_name: document.getElementById('buyerFirstName')?.value || '',
        last_name: document.getElementById('buyerLastName')?.value || '',
        email: document.getElementById('buyerEmail')?.value || '',
        phone: document.getElementById('buyerPhone')?.value || '',
        city: document.getElementById('buyerCity')?.value || '',
        workplace: document.getElementById('buyerWorkplace')?.value || '',
        establishment_name: document.getElementById('buyerEstablishment')?.value || ''
      });
      const fullName = profile.full_name || '';
      const initials = (profile.first_name?.[0] || profile.last_name?.[0] || 'A').toUpperCase();
      const name = document.getElementById('buyerProfileNameDisplay');
      if (name) name.textContent = fullName;
      const sidebarName = document.getElementById('buyerSidebarName');
      if (sidebarName) sidebarName.textContent = fullName;
      const welcomeName = document.getElementById('buyerWelcomeName');
      if (welcomeName) welcomeName.textContent = fullName;
      const avatar = document.getElementById('buyerProfileAvatar');
      if (avatar) avatar.textContent = initials;
      const sidebarAvatar = document.getElementById('buyerSidebarAvatar');
      if (sidebarAvatar) sidebarAvatar.textContent = initials;
      showBuyerToast('Profil mis à jour');
    } catch (error) {
      showBuyerToast(error.message || 'Erreur sauvegarde profil', 'error');
    }
  });

  document.getElementById('buyerChangePasswordBtn')?.addEventListener('click', async () => {
    try {
      await window.AgriGovProfileApi.changePassword(
        document.getElementById('buyerPasswordCurrent')?.value || '',
        document.getElementById('buyerPasswordNew')?.value || '',
        document.getElementById('buyerPasswordConfirm')?.value || ''
      );
      ['buyerPasswordCurrent','buyerPasswordNew','buyerPasswordConfirm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      showBuyerToast('Mot de passe modifié');
    } catch (error) {
      showBuyerToast(error.message || 'Erreur mot de passe', 'error');
    }
  });
}

/* === PATCH UI ACHETEUR: filtres commandes + panier/formulaire + scroll === */
let buyerActiveOrderFilterPatch = 'all';
let buyerOrderSearchPatch = '';
function scrollBuyerPage(direction){const top=direction==='top'?0:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);window.scrollTo({top,behavior:'smooth'});}
function applyBuyerOrderFilters(){const list=document.getElementById('orders-list');if(!list)return;const query=(buyerOrderSearchPatch||'').toLowerCase().trim();let visible=0;list.querySelectorAll('.order-card').forEach(card=>{const statusOk=buyerActiveOrderFilterPatch==='all'||card.dataset.status===buyerActiveOrderFilterPatch;const searchText=(card.dataset.search||card.textContent||'').toLowerCase();const searchOk=!query||searchText.includes(query);const show=statusOk&&searchOk;card.style.display=show?'':'none';if(show)visible+=1;});const empty=document.getElementById('ordersFilterEmpty');if(empty)empty.style.display=visible?'none':'block';}
function filterOrders(btn,status){buyerActiveOrderFilterPatch=status||'all';document.querySelectorAll('#sec-commandes .filter-tab').forEach(tab=>tab.classList.remove('active'));btn?.classList.add('active');applyBuyerOrderFilters();}
function handleOrderSearch(value){buyerOrderSearchPatch=value||'';applyBuyerOrderFilters();}
function setFieldError(inputId,message){const input=document.getElementById(inputId);if(!input)return;input.classList.toggle('field-error',Boolean(message));let hint=input.parentElement?.querySelector('.field-error-text');if(!hint&&input.parentElement){hint=document.createElement('div');hint.className='field-error-text';input.parentElement.appendChild(hint);}if(hint)hint.textContent=message||'';}
function validateCheckoutForm(){const address=(document.getElementById('buyerCheckoutAddress')?.value||'').trim();const note=(document.getElementById('buyerCheckoutNote')?.value||'').trim();let ok=true;setFieldError('buyerCheckoutAddress','');setFieldError('buyerCheckoutNote','');if(address.length<8){setFieldError('buyerCheckoutAddress','Adresse obligatoire, minimum 8 caracteres.');ok=false;}if(note.length>300){setFieldError('buyerCheckoutNote','La note ne doit pas depasser 300 caracteres.');ok=false;}if(!buyerCart.length)ok=false;buyerCart.forEach(item=>{const qty=Number(item.quantite||0);const max=Number(item.stock_max||0);if(qty<=0||qty>max)ok=false;});return ok;}
function openCheckoutModal(){if(!buyerCart.length){showBuyerToast('Le panier est vide.','error');return;}currentOrderDraft={adresse:document.getElementById('buyerCheckoutAddress')?.value||'',note:document.getElementById('buyerCheckoutNote')?.value||''};const addressInput=document.getElementById('buyerCheckoutAddress');const noteInput=document.getElementById('buyerCheckoutNote');if(addressInput)addressInput.value=currentOrderDraft.adresse;if(noteInput)noteInput.value=currentOrderDraft.note;const items=document.getElementById('buyerCheckoutItems');if(items){items.innerHTML=buyerCart.map(item=>`<div class="checkout-line"><span>${escapeHtml(item.nom)} · ${Number(item.quantite)} kg</span><strong>${buyerMoney(Number(item.prix)*Number(item.quantite))}</strong></div>`).join('');}const total=document.getElementById('buyerCheckoutTotal');if(total)total.textContent=buyerMoney(getCartStats().totalPrice);document.getElementById('buyerCheckoutModal')?.classList.add('visible');toggleBuyerCart(false);setTimeout(()=>addressInput?.focus(),120);}
async function submitCheckout(){const address=(document.getElementById('buyerCheckoutAddress')?.value||'').trim();const note=(document.getElementById('buyerCheckoutNote')?.value||'').trim();const submitBtn=document.getElementById('buyerCheckoutSubmit');if(!validateCheckoutForm()){showBuyerToast('Corrige le formulaire avant validation.','error');return;}if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='Validation...';}try{const response=await fetch('/api/produits/commandes/creer/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adresse_livraison:address,note,items:buyerCart.map(item=>({listing_id:item.listing_id,quantite:item.quantite}))})});const data=await response.json();if(!response.ok||!data.success){showBuyerToast(data.error||'Impossible de creer la commande.','error');if(response.status===401||response.status===403)await buyerEnsureSessionRole();return;}closeCheckoutModal();clearBuyerCart();await loadCatalogueProduits();await loadBuyerOrders();showBuyerToast(`Commande #${data.commande.id} creee avec succes.`);navigate('commandes');}catch(error){console.error(error);showBuyerToast('Erreur reseau lors de la creation de la commande.','error');}finally{if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='Confirmer la commande';}}}
function renderBuyerOrders(){const list=document.getElementById('orders-list');if(!list)return;const totalEl=document.getElementById('buyerOrdersTotal');const newEl=document.getElementById('buyerOrdersNew');const progressEl=document.getElementById('buyerOrdersProgress');const deliveredEl=document.getElementById('buyerOrdersDelivered');if(totalEl)totalEl.textContent=buyerOrders.length;if(newEl)newEl.textContent=buyerOrders.filter(o=>o.statut==='en_attente').length;if(progressEl)progressEl.textContent=buyerOrders.filter(o=>['confirmee','en_preparation','expediee'].includes(o.statut)).length;if(deliveredEl)deliveredEl.textContent=buyerOrders.filter(o=>o.statut==='livree').length;if(!buyerOrders.length){list.innerHTML='<div class="empty-filter-state">Aucune commande pour le moment. Cliquez sur + Nouvelle commande pour commencer.</div>';return;}list.innerHTML=buyerOrders.map(order=>{const meta=buyerStatusMeta(order.statut);const firstLine=order.lignes?.[0];const linesText=(order.lignes||[]).map(l=>`${l.produit_nom} (${l.quantite} kg)`).join(', ');const searchText=`CMD-${order.id} ${order.agriculteur||''} ${linesText||''} ${order.adresse_livraison||''} ${meta.label||''}`;const cancelBtn=order.statut==='en_attente'?`<button class="btn-outline-green" onclick="cancelBuyerOrder(${order.id})">Annuler</button>`:'';return `<div class="order-card" data-status="${meta.filter}" data-search="${escapeHtml(searchText)}"><div class="order-card-top"><div><div class="order-id">CMD-${order.id}</div><div class="order-farm">${escapeHtml(order.agriculteur)}</div></div><div style="text-align:right"><span class="badge ${meta.cls}">${meta.label}</span><div class="order-date">${new Date(order.date_creation).toLocaleString('fr-FR')}</div></div></div><div class="order-card-body"><div><div class="order-field-label">Produit</div><div class="order-field-val">${escapeHtml(firstLine?firstLine.produit_nom:'-')}</div></div><div><div class="order-field-label">Lignes</div><div class="order-field-val">${order.lignes.length}</div></div><div><div class="order-field-label">Montant</div><div class="order-field-val">${buyerMoney(order.total)}</div></div></div><div style="padding:0 20px 16px;color:var(--text-muted);font-size:13px;line-height:1.7">📦 ${escapeHtml(linesText||'Aucune ligne')}<br>📍 ${escapeHtml(order.adresse_livraison)}</div><div class="order-card-footer"><span style="font-size:13px;color:var(--text-muted)">${escapeHtml(order.note||'Sans note particuliere')}</span><div style="display:flex;gap:9px">${cancelBtn}</div></div></div>`;}).join('')+'<div id="ordersFilterEmpty" class="empty-filter-state" style="display:none;">Aucune commande ne correspond a ce filtre.</div>';applyBuyerOrderFilters();}
function initBuyerSections(){const produits=document.getElementById('sec-produits');if(produits){produits.innerHTML=`<div class="page-header"><div class="page-title">Catalogue Produits</div><div class="page-desc">Ajoutez les produits au panier puis confirmez votre commande dans une fenetre dediee.</div></div><div class="buyer-toolbar card enhanced-toolbar" style="margin-bottom:24px;"><div class="toolbar-grid"><input id="buyerProductSearch" type="text" placeholder="🔍 Rechercher produit, agriculteur, wilaya..."><select id="buyerCategoryFilter"><option value="all">Toutes les categories</option><option value="Legume">Legumes</option><option value="Fruit">Fruits</option><option value="Animal">Animal</option><option value="Cereale">Cereale</option></select><button class="cart-open-btn" onclick="toggleBuyerCart(true)">🛒 Panier <span id="buyerCartBadge">0</span></button></div></div><div id="buyerProductsGrid" class="products-grid-clean"></div>`;}const commandes=document.getElementById('sec-commandes');if(commandes){commandes.innerHTML=`<div class="page-header"><div class="page-title">Mes Commandes</div><div class="page-desc">Suivez vos commandes creees depuis la plateforme.</div></div><div class="stats-grid" style="margin-bottom:24px"><div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Total</div><div class="stat-value" id="buyerOrdersTotal">0</div><div class="stat-icon">📋</div></div><div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">En attente</div><div class="stat-value" id="buyerOrdersNew">0</div><div class="stat-icon">🆕</div></div><div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">En cours</div><div class="stat-value" id="buyerOrdersProgress">0</div><div class="stat-icon">🚛</div></div><div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Livrees</div><div class="stat-value" id="buyerOrdersDelivered">0</div><div class="stat-icon">✅</div></div></div><div class="card orders-card-clean"><div class="card-header orders-card-header"><div><div class="card-title">Liste des Commandes</div><div class="card-subtitle">Filtrez par statut ou cherchez par produit, agriculteur, adresse.</div></div><button onclick="navigate('produits')" class="btn-add-wide">+ Nouvelle commande</button></div><div class="orders-toolbar"><input id="buyerOrderSearchInput" type="text" placeholder="🔎 Rechercher commande, produit, agriculteur, adresse..." oninput="handleOrderSearch(this.value)"></div><div class="filter-tabs"><button class="filter-tab active" onclick="filterOrders(this,'all')">Tous</button><button class="filter-tab" onclick="filterOrders(this,'new')">En attente</button><button class="filter-tab" onclick="filterOrders(this,'progress')">En cours</button><button class="filter-tab" onclick="filterOrders(this,'done')">Livrees</button><button class="filter-tab" onclick="filterOrders(this,'refused')">Refusees / annulees</button></div><div id="orders-list"></div></div>`;}if(!document.getElementById('buyerCartDrawer')){document.body.insertAdjacentHTML('beforeend',`<div id="buyerCartOverlay" class="drawer-overlay" onclick="toggleBuyerCart(false)"></div><aside id="buyerCartDrawer" class="cart-drawer"><div class="cart-drawer-header"><div><div class="cart-drawer-title">Panier acheteur</div><div class="cart-drawer-sub" id="buyerCartFarmer">Panier vide</div></div><button class="drawer-close" onclick="toggleBuyerCart(false)">×</button></div><div class="cart-drawer-body"><div id="buyerCartEmpty" class="cart-empty">Ajoutez des produits depuis le catalogue pour preparer votre commande.</div><div id="buyerCartItems" class="cart-items"></div></div><div class="cart-drawer-footer"><div class="cart-summary-row"><span>Total quantite</span><strong id="buyerCartSummaryQty">0 kg</strong></div><div class="cart-summary-row total"><span>Total estime</span><strong id="buyerCartSummaryTotal">0 DA</strong></div><div class="cart-summary-mini"><span id="buyerCartCount">0 kg</span><span id="buyerCartTotal">0 DA</span></div><div class="cart-footer-actions"><button id="buyerClearCartBtn" class="btn-soft btn-soft-danger" onclick="clearBuyerCart()">Vider</button><button id="buyerCheckoutBtn" class="btn-add-wide" onclick="openCheckoutModal()">Valider</button></div></div></aside><div id="buyerCheckoutModal" class="modal-shell"><div class="modal-card"><div class="modal-head"><div><div class="modal-title">Confirmer la commande</div><div class="modal-subtitle">Revoyez les lignes, l'adresse et la note avant l'envoi.</div></div><button class="drawer-close" onclick="closeCheckoutModal()">×</button></div><div class="modal-body"><div id="buyerCheckoutItems" class="checkout-lines"></div><div class="form-group"><label>Adresse de livraison</label><input id="buyerCheckoutAddress" type="text" placeholder="Ex: Constantine, Zone industrielle..." /></div><div class="form-group"><label>Note</label><textarea id="buyerCheckoutNote" rows="4" maxlength="300" placeholder="Informations complementaires..."></textarea></div></div><div class="modal-foot"><div class="cart-summary-row total"><span>Total commande</span><strong id="buyerCheckoutTotal">0 DA</strong></div><button id="buyerCheckoutSubmit" class="btn-add-wide" onclick="submitCheckout()">Confirmer la commande</button></div></div></div>`);}if(!document.getElementById('buyerScrollTools')){document.body.insertAdjacentHTML('beforeend',`<div id="buyerScrollTools" class="scroll-tools"><button title="Monter" onclick="scrollBuyerPage('top')">↑</button><button title="Descendre" onclick="scrollBuyerPage('bottom')">↓</button></div>`);}document.getElementById('buyerProductSearch')?.addEventListener('input',renderBuyerProducts);document.getElementById('buyerCategoryFilter')?.addEventListener('change',renderBuyerProducts);renderBuyerCart();}
window.filterOrders=filterOrders;window.handleOrderSearch=handleOrderSearch;window.scrollBuyerPage=scrollBuyerPage;window.submitCheckout=submitCheckout;window.openCheckoutModal=openCheckoutModal;

/* === PATCH EVALUATIONS ACHETEUR: notification apres livraison + avis visibles === */
let buyerEvalOrderId = null;
let buyerSelectedFarmerStars = 0;
let buyerSelectedProductStars = 0;
const BUYER_EVAL_STORAGE_KEY = 'agrigovBuyerEvaluationsV1';

function buyerReadEvaluations() {
  try {
    const raw = localStorage.getItem(BUYER_EVAL_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Impossible de lire les evaluations', error);
    return [];
  }
}

function buyerSaveEvaluations(evaluations) {
  try {
    localStorage.setItem(BUYER_EVAL_STORAGE_KEY, JSON.stringify(Array.isArray(evaluations) ? evaluations : []));
  } catch (error) {
    console.warn('Impossible de sauvegarder les evaluations', error);
  }
}

function buyerOrderEvaluation(orderId) {
  return buyerReadEvaluations().find((item) => String(item.orderId) === String(orderId));
}

function buyerDeliveredUnratedOrders() {
  return buyerOrders.filter((order) => order.statut === 'livree' && !buyerOrderEvaluation(order.id));
}

function buyerStarsText(value) {
  const stars = Math.max(0, Math.min(5, Number(value || 0)));
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

function buyerAverageFor(type, key) {
  const cleanKey = String(key || '').trim().toLowerCase();
  const rows = buyerReadEvaluations().filter((review) => {
    if (type === 'farmer') return String(review.farmerName || '').trim().toLowerCase() === cleanKey;
    return (review.products || []).some((name) => String(name || '').trim().toLowerCase() === cleanKey);
  });
  if (!rows.length) return { average: 0, count: 0, rows: [] };
  const total = rows.reduce((sum, review) => sum + Number(type === 'farmer' ? review.farmerStars : review.productStars || 0), 0);
  return { average: Number((total / rows.length).toFixed(1)), count: rows.length, rows };
}

function buyerCurrentName() {
  return document.getElementById('buyerSidebarName')?.textContent?.trim()
    || document.getElementById('buyerProfileNameDisplay')?.textContent?.trim()
    || 'Acheteur';
}

function initBuyerEvaluationUi() {
  if (document.getElementById('buyerEvaluationModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="buyerEvaluationModal" class="modal-shell evaluation-modal-shell">
      <div class="modal-card evaluation-modal-card">
        <div class="modal-head">
          <div>
            <div class="modal-title">Evaluer votre commande</div>
            <div class="modal-subtitle" id="buyerEvalSubtitle">Votre avis aide les autres acheteurs.</div>
          </div>
          <button class="drawer-close" type="button" onclick="closeBuyerEvaluationModal()">×</button>
        </div>
        <div class="modal-body evaluation-body">
          <div class="evaluation-target" id="buyerEvalTarget"></div>
          <div class="evaluation-row">
            <div>
              <label>Note agriculteur</label>
              <p>Service, communication, respect de la livraison.</p>
            </div>
            <div class="rating-stars" id="buyerFarmerStars"></div>
          </div>
          <div class="evaluation-row">
            <div>
              <label>Note produit</label>
              <p>Qualite, fraicheur, prix et conformite.</p>
            </div>
            <div class="rating-stars" id="buyerProductStars"></div>
          </div>
          <div class="form-group">
            <label>Commentaire</label>
            <textarea id="buyerEvaluationComment" rows="4" maxlength="280" placeholder="Ex: livraison rapide, produit frais..."></textarea>
          </div>
        </div>
        <div class="modal-foot evaluation-foot">
          <button class="btn-soft" type="button" onclick="closeBuyerEvaluationModal()">Annuler</button>
          <button class="btn-add-wide" type="button" onclick="submitBuyerEvaluation()">Envoyer evaluation</button>
        </div>
      </div>
    </div>
  `);
  renderBuyerStarPicker('buyerFarmerStars', 'farmer');
  renderBuyerStarPicker('buyerProductStars', 'product');
}

function renderBuyerStarPicker(containerId, kind) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array.from({ length: 5 }, (_, index) => {
    const value = index + 1;
    return `<button type="button" class="star-btn" onclick="selectBuyerStars('${kind}', ${value})">★</button>`;
  }).join('');
}

function selectBuyerStars(kind, value) {
  if (kind === 'farmer') buyerSelectedFarmerStars = value;
  if (kind === 'product') buyerSelectedProductStars = value;
  updateBuyerStarPickers();
}

function updateBuyerStarPickers() {
  document.querySelectorAll('#buyerFarmerStars .star-btn').forEach((btn, index) => btn.classList.toggle('active', index < buyerSelectedFarmerStars));
  document.querySelectorAll('#buyerProductStars .star-btn').forEach((btn, index) => btn.classList.toggle('active', index < buyerSelectedProductStars));
}

function openBuyerEvaluationModal(orderId) {
  initBuyerEvaluationUi();
  const order = buyerOrders.find((item) => String(item.id) === String(orderId));
  if (!order) {
    showBuyerToast('Commande introuvable.', 'error');
    return;
  }
  if (order.statut !== 'livree') {
    showBuyerToast('Evaluation disponible seulement apres livraison.', 'error');
    return;
  }
  if (buyerOrderEvaluation(order.id)) {
    showBuyerToast('Cette commande est deja evaluee.', 'error');
    return;
  }
  buyerEvalOrderId = order.id;
  buyerSelectedFarmerStars = 0;
  buyerSelectedProductStars = 0;
  const products = (order.lignes || []).map((line) => line.produit_nom).filter(Boolean).join(', ') || 'Produit';
  const target = document.getElementById('buyerEvalTarget');
  if (target) {
    target.innerHTML = `<strong>Commande CMD-${escapeHtml(order.id)}</strong><span>${escapeHtml(order.agriculteur || 'Agriculteur')} · ${escapeHtml(products)}</span>`;
  }
  const comment = document.getElementById('buyerEvaluationComment');
  if (comment) comment.value = '';
  updateBuyerStarPickers();
  document.getElementById('buyerEvaluationModal')?.classList.add('visible');
}

function closeBuyerEvaluationModal() {
  document.getElementById('buyerEvaluationModal')?.classList.remove('visible');
  buyerEvalOrderId = null;
}

function submitBuyerEvaluation() {
  const order = buyerOrders.find((item) => String(item.id) === String(buyerEvalOrderId));
  if (!order) {
    showBuyerToast('Commande introuvable.', 'error');
    return;
  }
  if (order.statut !== 'livree') {
    showBuyerToast('Evaluation disponible seulement apres livraison.', 'error');
    return;
  }
  if (buyerOrderEvaluation(order.id)) {
    showBuyerToast('Cette commande est deja evaluee.', 'error');
    closeBuyerEvaluationModal();
    renderBuyerNotificationsSection();
    renderBuyerOrders();
    return;
  }
  if (!buyerSelectedFarmerStars || !buyerSelectedProductStars) {
    showBuyerToast('Choisis une note pour l agriculteur et le produit.', 'error');
    return;
  }
  const comment = (document.getElementById('buyerEvaluationComment')?.value || '').trim();
  const products = (order.lignes || []).map((line) => line.produit_nom).filter(Boolean);
  const evaluations = buyerReadEvaluations();
  evaluations.push({
    id: Date.now(),
    orderId: order.id,
    buyerName: buyerCurrentName(),
    farmerName: order.agriculteur || 'Agriculteur',
    farmerStars: buyerSelectedFarmerStars,
    productStars: buyerSelectedProductStars,
    products,
    comment,
    date: new Date().toISOString().split('T')[0]
  });
  buyerSaveEvaluations(evaluations);
  showBuyerToast('Merci, evaluation enregistree.');
  closeBuyerEvaluationModal();
  renderBuyerOrders();
  renderBuyerProducts();
  renderBuyerNotificationsSection();
  renderBuyerDashboard();
  updateBuyerNavBadges();
}

function renderBuyerOrders() {
  const list = document.getElementById('orders-list');
  if (!list) return;
  const totalEl = document.getElementById('buyerOrdersTotal');
  const newEl = document.getElementById('buyerOrdersNew');
  const progressEl = document.getElementById('buyerOrdersProgress');
  const deliveredEl = document.getElementById('buyerOrdersDelivered');
  if (totalEl) totalEl.textContent = buyerOrders.length;
  if (newEl) newEl.textContent = buyerOrders.filter(o => o.statut === 'en_attente').length;
  if (progressEl) progressEl.textContent = buyerOrders.filter(o => ['confirmee', 'en_preparation', 'expediee'].includes(o.statut)).length;
  if (deliveredEl) deliveredEl.textContent = buyerOrders.filter(o => o.statut === 'livree').length;
  if (!buyerOrders.length) {
    list.innerHTML = '<div class="empty-filter-state">Aucune commande pour le moment. Cliquez sur + Nouvelle commande pour commencer.</div>';
    return;
  }
  list.innerHTML = buyerOrders.map(order => {
    const meta = buyerStatusMeta(order.statut);
    const firstLine = order.lignes?.[0];
    const linesText = (order.lignes || []).map(l => `${l.produit_nom} (${l.quantite} kg)`).join(', ');
    const searchText = `CMD-${order.id} ${order.agriculteur || ''} ${linesText || ''} ${order.adresse_livraison || ''} ${meta.label || ''}`;
    const cancelBtn = order.statut === 'en_attente' ? `<button class="btn-outline-green" onclick="cancelBuyerOrder(${order.id})">Annuler</button>` : '';
    const evaluation = buyerOrderEvaluation(order.id);
    const evalBtn = order.statut === 'livree'
      ? (evaluation
        ? `<span class="evaluation-done">${buyerStarsText(evaluation.farmerStars)} Deja evaluee</span>`
        : `<button class="btn-add-wide btn-evaluate" onclick="openBuyerEvaluationModal(${order.id})">⭐ Evaluer</button>`)
      : '';
    return `<div class="order-card" data-status="${meta.filter}" data-search="${escapeHtml(searchText)}">
      <div class="order-card-top">
        <div><div class="order-id">CMD-${order.id}</div><div class="order-farm">${escapeHtml(order.agriculteur)}</div></div>
        <div style="text-align:right"><span class="badge ${meta.cls}">${meta.label}</span><div class="order-date">${new Date(order.date_creation).toLocaleString('fr-FR')}</div></div>
      </div>
      <div class="order-card-body">
        <div><div class="order-field-label">Produit</div><div class="order-field-val">${escapeHtml(firstLine ? firstLine.produit_nom : '-')}</div></div>
        <div><div class="order-field-label">Lignes</div><div class="order-field-val">${(order.lignes || []).length}</div></div>
        <div><div class="order-field-label">Montant</div><div class="order-field-val">${buyerMoney(order.total)}</div></div>
      </div>
      <div style="padding:0 20px 16px;color:var(--text-muted);font-size:13px;line-height:1.7">📦 ${escapeHtml(linesText || 'Aucune ligne')}<br>📍 ${escapeHtml(order.adresse_livraison)}</div>
      <div class="order-card-footer"><span style="font-size:13px;color:var(--text-muted)">${escapeHtml(order.note || 'Sans note particuliere')}</span><div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">${evalBtn}${cancelBtn}</div></div>
    </div>`;
  }).join('') + '<div id="ordersFilterEmpty" class="empty-filter-state" style="display:none;">Aucune commande ne correspond a ce filtre.</div>';
  applyBuyerOrderFilters();
}

function renderBuyerNotificationsSection() {
  const section = document.getElementById('sec-notifications');
  if (!section) return;
  const pendingEvaluations = buyerDeliveredUnratedOrders().map((order) => {
    const products = (order.lignes || []).map((line) => line.produit_nom).join(', ') || 'produit';
    return {
      unread: true,
      icon: '⭐',
      title: `Evaluation demandee · CMD-${order.id}`,
      desc: `${order.agriculteur || 'Agriculteur'} · ${products} est livree. Donnez votre avis.`,
      time: new Date(order.date_creation).toLocaleDateString('fr-FR'),
      variant: 'order',
      action: `<button class="btn-add-wide btn-evaluate" onclick="openBuyerEvaluationModal(${order.id})">Evaluer maintenant</button>`
    };
  });
  const statusNotifications = [];
  buyerOrders.slice(0, 5).forEach((order, index) => {
    const meta = buyerStatusMeta(order.statut);
    statusNotifications.push({
      unread: index < 2 && order.statut !== 'livree',
      icon: order.statut === 'livree' ? '✅' : order.statut === 'expediee' ? '🚛' : '📦',
      title: `Commande CMD-${order.id} · ${meta.label}`,
      desc: `${order.agriculteur || 'Agriculteur'} · ${(order.lignes || []).map((line) => line.produit_nom).join(', ') || 'Sans detail'}`,
      time: new Date(order.date_creation).toLocaleDateString('fr-FR'),
      variant: order.statut === 'livree' ? 'order' : 'farm',
      action: ''
    });
  });
  const notifications = [...pendingEvaluations, ...statusNotifications];
  section.innerHTML = `
    <div class="page-header"><div class="page-title">Notifications</div><div class="page-desc">Quand une commande devient livree, une notification d evaluation apparait ici.</div></div>
    <div class="card">
      <div class="card-header"><div class="card-title">Toutes les notifications</div><span style="font-size:13px;color:var(--text-muted);">${notifications.filter((item) => item.unread).length} non lue(s)</span></div>
      ${notifications.length ? notifications.map((item) => `<div class="notif-item ${item.unread ? 'unread' : ''}"><div class="notif-icon ${item.variant}">${item.icon}</div><div style="flex:1"><div class="notif-title">${escapeHtml(item.title)}</div><div class="notif-desc">${escapeHtml(item.desc)}</div>${item.action || ''}</div><div class="notif-time">${escapeHtml(item.time)}</div>${item.unread ? '<div class="unread-dot"></div>' : ''}</div>`).join('') : '<div class="card" style="padding:20px;">Aucune notification pour le moment.</div>'}
    </div>
  `;
}

function renderBuyerProducts() {
  const grid = document.getElementById('buyerProductsGrid');
  if (!grid) return;
  const search = (document.getElementById('buyerProductSearch')?.value || '').toLowerCase().trim();
  const category = document.getElementById('buyerCategoryFilter')?.value || 'all';
  const rows = buyerProducts.filter((item) => {
    const matchSearch = !search || `${item.nom} ${item.description || ''} ${item.vendeur_nom || ''}`.toLowerCase().includes(search);
    const matchCategory = category === 'all' || item.categorie === category;
    return matchSearch && matchCategory;
  });
  if (!rows.length) {
    grid.innerHTML = '<div class="card" style="padding:20px;">Aucun produit disponible pour le moment.</div>';
    return;
  }
  grid.innerHTML = rows.map((product) => {
    const listingId = Number(product.db_id || 0);
    const inCart = buyerCart.find((item) => Number(item.listing_id) === listingId);
    const sellerConflict = cartFarmerId && Number(cartFarmerId) !== Number(product.agriculteur_id);
    const disabled = !listingId || sellerConflict || Number(product.quantite || 0) <= 0;
    const productRating = buyerAverageFor('product', product.nom);
    const farmerRating = buyerAverageFor('farmer', product.vendeur_nom);
    const ratingLine = productRating.count
      ? `<span>⭐ ${productRating.average}/5 produit · ${productRating.count} avis</span>`
      : '<span>⭐ Aucun avis produit</span>';
    const farmerLine = farmerRating.count
      ? `<span>👨‍🌾 ${farmerRating.average}/5 agriculteur · ${farmerRating.count} avis</span>`
      : '<span>👨‍🌾 Agriculteur non evalue</span>';
    return `
      <div class="product-card product-card-rich ${disabled ? 'is-disabled' : ''}">
        <div class="product-image-wrap"><img class="product-image" src="${escapeHtml(product.photo || 'https://via.placeholder.com/400x240?text=Produit')}" alt="${escapeHtml(product.nom)}"></div>
        <div class="product-body">
          <div class="product-header-row"><div><div class="product-name">${escapeHtml(product.nom)}</div><div class="product-origin">${escapeHtml(product.vendeur_nom || 'Agriculteur')} · ${escapeHtml(product.categorie)}</div></div><span class="badge ${Number(product.quantite || 0) > 0 ? 'badge-progress' : 'badge-refused'}">${escapeHtml(product.statut || 'Disponible')}</span></div>
          <div class="public-rating-line">${ratingLine}${farmerLine}</div>
          <div class="product-desc">${escapeHtml(product.description || 'Produit agricole disponible.')}</div>
          <div class="product-meta product-meta-rich"><span>📦 ${Number(product.quantite || 0)} kg</span><span>🧾 Ref. ${escapeHtml(product.id)}</span></div>
          <div class="product-price-row product-price-actions"><div><div class="product-price">${escapeHtml(product.prix)}<span> DA/kg</span></div><div class="product-range">Fourchette officielle: ${escapeHtml(product.prix_min)} - ${escapeHtml(product.prix_max)} DA</div></div><div class="product-actions-stack"><button class="btn-soft" ${disabled ? 'disabled' : ''} onclick="addToCart(${listingId})">${inCart ? 'Ajouter encore' : 'Panier'}</button><button class="btn-add-wide" ${disabled ? 'disabled' : ''} onclick="quickOrderFromProduct(${listingId})">Commander</button></div></div>
          ${sellerConflict ? '<div class="product-warning">Votre panier contient deja les produits d un autre agriculteur.</div>' : ''}
          ${inCart ? `<div class="product-in-cart">Deja dans le panier : ${Number(inCart.quantite)} kg</div>` : ''}
        </div>
      </div>`;
  }).join('');
}



function updateBuyerNavBadges() {
  const pendingEvalCount = buyerDeliveredUnratedOrders().length;
  const navItems = Array.from(document.querySelectorAll('.sidebar-nav .nav-item'));
  navItems.forEach((item) => {
    const text = item.textContent || '';
    const badge = item.querySelector('.nav-badge');
    if (text.includes('Mes Commandes') && badge) badge.textContent = String(buyerOrders.length);
    if (text.includes('Suivi Livraison') && badge) badge.textContent = String(buyerOrders.filter((order) => ['confirmee','en_preparation','expediee'].includes(order.statut)).length);
    if (text.includes('Notifications') && badge) badge.textContent = String(pendingEvalCount + buyerOrders.filter((order) => order.statut !== 'livree' && order.statut !== 'annulee').length);
  });
}

window.openBuyerEvaluationModal = openBuyerEvaluationModal;
window.closeBuyerEvaluationModal = closeBuyerEvaluationModal;
window.submitBuyerEvaluation = submitBuyerEvaluation;
window.selectBuyerStars = selectBuyerStars;

/* === FLOW LIVRAISON ACHETEUR: suivi, contact, confirmation, probleme, evaluation === */
const AGRIGOV_PROBLEMS_KEY = 'agrigovBuyerProblemReportsV1';

function buyerReadProblems() {
  try { return JSON.parse(localStorage.getItem(AGRIGOV_PROBLEMS_KEY) || '[]'); }
  catch (_) { return []; }
}

function buyerSaveProblems(items) {
  localStorage.setItem(AGRIGOV_PROBLEMS_KEY, JSON.stringify(items || []));
}

function buyerProblemForOrder(orderId) {
  return buyerReadProblems().find((item) => Number(item.orderId) === Number(orderId));
}

function buyerTransporterInfo(order) {
  const info = order?.transporteur_info || {};
  return {
    nom: info.nom && info.nom !== 'Non assigné' ? info.nom : 'Transporteur non assigné',
    email: info.email && info.email !== '—' ? info.email : '',
    telephone: info.telephone && info.telephone !== '—' ? info.telephone : '',
    role: info.role || 'transporteur'
  };
}

function buyerDeliveryFlowStep(order) {
  if (!order) return 1;
  if (order.statut === 'livree') return 4;
  if (order.statut === 'expediee') return 3;
  if (['confirmee', 'en_preparation', 'en_attente_transporteur'].includes(order.statut)) return 2;
  return 1;
}

function buyerDeliveryTimeline(order) {
  const current = buyerDeliveryFlowStep(order);
  const steps = [
    ['Commande confirmée', 'Commande acceptée par l’agriculteur.'],
    ['Préparation / transporteur', 'La commande est préparée puis confiée à un transporteur.'],
    ['En livraison', 'Le transporteur a marqué la commande comme en route.'],
    ['Livrée', 'L’acheteur confirme, évalue ou signale un problème.']
  ];
  return `<div class="delivery-flow">${steps.map((step, index) => {
    const done = index + 1 <= current;
    return `<div class="delivery-flow-step ${done ? 'done' : ''}"><div class="delivery-flow-dot">${done ? '✓' : index + 1}</div><div><strong>${step[0]}</strong><span>${step[1]}</span></div></div>`;
  }).join('')}</div>`;
}

function contactTransporter(orderId) {
  const order = buyerOrders.find((item) => Number(item.id) === Number(orderId));
  const transporteur = buyerTransporterInfo(order);
  if (transporteur.telephone) {
    window.location.href = `tel:${transporteur.telephone}`;
    return;
  }
  if (transporteur.email) {
    window.location.href = `mailto:${transporteur.email}`;
    return;
  }
  showBuyerToast('Aucun contact transporteur disponible pour cette commande.', 'error');
}

async function buyerConfirmDelivered(orderId) {
  const order = buyerOrders.find((item) => Number(item.id) === Number(orderId));
  if (!order) return;
  if (order.statut !== 'livree') {
    try {
      const response = await fetch(`/api/produits/commandes/${orderId}/statut/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getBuyerCSRFToken() },
        body: JSON.stringify({ statut: 'livree' })
      });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.error || 'Mise à jour impossible.');
      order.statut = 'livree';
    } catch (error) {
      showBuyerToast(error.message || 'Impossible de confirmer la livraison.', 'error');
      return;
    }
  }
  showBuyerToast('Livraison confirmée. Vous pouvez maintenant évaluer la commande.');
  await loadBuyerOrders();
  navigate('notifications');
  setTimeout(() => openBuyerEvaluationModal(orderId), 300);
}

function openBuyerProblemModal(orderId) {
  const order = buyerOrders.find((item) => Number(item.id) === Number(orderId));
  if (!order) return;
  let modal = document.getElementById('buyerProblemModal');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="buyerProblemModal" class="modal-shell">
        <div class="modal-card">
          <div class="modal-head"><div><div class="modal-title">Signaler un problème</div><div class="modal-subtitle" id="buyerProblemSubtitle">Décrivez le problème de livraison.</div></div><button class="drawer-close" onclick="closeBuyerProblemModal()">×</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Message envoyé à l’agriculteur</label><textarea id="buyerProblemMessage" rows="5" maxlength="600" placeholder="Exemple : produit abîmé, quantité manquante, retard, problème avec la livraison..."></textarea></div>
          </div>
          <div class="modal-foot"><button class="btn-add-wide" onclick="submitBuyerProblemReport()">Envoyer le signalement</button></div>
        </div>
      </div>`);
  }
  modal.dataset.orderId = String(orderId);
  document.getElementById('buyerProblemSubtitle').textContent = `Commande CMD-${orderId} · ${order.agriculteur || 'Agriculteur'}`;
  document.getElementById('buyerProblemMessage').value = buyerProblemForOrder(orderId)?.message || '';
  modal.classList.add('show');
}

function closeBuyerProblemModal() {
  document.getElementById('buyerProblemModal')?.classList.remove('show');
}

function submitBuyerProblemReport() {
  const modal = document.getElementById('buyerProblemModal');
  const orderId = Number(modal?.dataset.orderId || 0);
  const order = buyerOrders.find((item) => Number(item.id) === orderId);
  const message = (document.getElementById('buyerProblemMessage')?.value || '').trim();
  if (!order || !message) {
    showBuyerToast('Écrivez un message pour expliquer le problème.', 'error');
    return;
  }
  const problems = buyerReadProblems().filter((item) => Number(item.orderId) !== orderId);
  problems.push({
    id: Date.now(),
    orderId,
    buyerName: buyerCurrentName ? buyerCurrentName() : 'Acheteur',
    farmerName: order.agriculteur || 'Agriculteur',
    products: (order.lignes || []).map((line) => line.produit_nom).filter(Boolean),
    message,
    date: new Date().toISOString(),
    status: 'envoye'
  });
  buyerSaveProblems(problems);
  closeBuyerProblemModal();
  showBuyerToast('Problème envoyé à l’agriculteur.');
  renderBuyerLogisticsSection();
  renderBuyerNotificationsSection();
}

/* Override supprimé — voir PATCH FINAL ci-dessous */
const buyerOriginalRenderLogisticsSection = renderBuyerLogisticsSection;

const buyerOriginalRenderNotificationsSectionFlow = renderBuyerNotificationsSection;
renderBuyerNotificationsSection = function renderBuyerNotificationsSection() {
  const section = document.getElementById('sec-notifications');
  if (!section) return;
  const problems = buyerReadProblems().slice().reverse().map((report) => ({
    unread: false,
    icon: '⚠️',
    title: `Problème signalé · CMD-${report.orderId}`,
    desc: `Message envoyé à ${report.farmerName || 'l’agriculteur'} : ${report.message}`,
    time: new Date(report.date).toLocaleDateString('fr-FR'),
    variant: 'alert',
    action: ''
  }));
  const deliveredAlerts = buyerOrders.filter((order) => order.statut === 'livree').slice(0, 5).map((order) => ({
    unread: !buyerOrderEvaluation(order.id),
    icon: '✅',
    title: `Commande livrée · CMD-${order.id}`,
    desc: 'Le transporteur a marqué la commande comme livrée. Confirmez la réception puis laissez une évaluation.',
    time: new Date(order.date_modification || order.date_creation).toLocaleDateString('fr-FR'),
    variant: 'order',
    action: buyerOrderEvaluation(order.id) ? '<span class="evaluation-done">Déjà évaluée</span>' : `<button class="btn-add-wide btn-evaluate" onclick="openBuyerEvaluationModal(${order.id})">Évaluer</button>`
  }));
  const pendingEvaluations = buyerDeliveredUnratedOrders().map((order) => ({
    unread: true,
    icon: '⭐',
    title: `Évaluation demandée · CMD-${order.id}`,
    desc: `${order.agriculteur || 'Agriculteur'} · donnez une note à l’agriculteur, au transporteur et au produit.`,
    time: new Date(order.date_creation).toLocaleDateString('fr-FR'),
    variant: 'farm',
    action: `<button class="btn-add-wide btn-evaluate" onclick="openBuyerEvaluationModal(${order.id})">Évaluer maintenant</button>`
  }));
  const statusNotifications = buyerOrders.filter((order) => order.statut !== 'livree').slice(0, 5).map((order, index) => {
    const meta = buyerStatusMeta(order.statut);
    return {
      unread: index < 2,
      icon: order.statut === 'expediee' ? '🚛' : '📦',
      title: `Commande CMD-${order.id} · ${meta.label}`,
      desc: `${order.agriculteur || 'Agriculteur'} · ${(order.lignes || []).map((line) => line.produit_nom).join(', ') || 'Sans détail'}`,
      time: new Date(order.date_creation).toLocaleDateString('fr-FR'),
      variant: order.statut === 'expediee' ? 'farm' : 'order',
      action: order.statut === 'expediee' ? `<button class="btn-outline-gold" onclick="navigate('livraison')">Voir la livraison</button>` : ''
    };
  });
  const notifications = [...pendingEvaluations, ...deliveredAlerts, ...problems, ...statusNotifications];
  section.innerHTML = `
    <div class="page-header"><div class="page-title">Notifications</div><div class="page-desc">Livraison, confirmation, signalement de problème et évaluation après réception.</div></div>
    <div class="card">
      <div class="card-header"><div class="card-title">Toutes les notifications</div><span style="font-size:13px;color:var(--text-muted);">${notifications.filter((item) => item.unread).length} non lue(s)</span></div>
      ${notifications.length ? notifications.map((item) => `<div class="notif-item ${item.unread ? 'unread' : ''}"><div class="notif-icon ${item.variant}">${item.icon}</div><div style="flex:1"><div class="notif-title">${escapeHtml(item.title)}</div><div class="notif-desc">${escapeHtml(item.desc)}</div>${item.action || ''}</div><div class="notif-time">${escapeHtml(item.time)}</div>${item.unread ? '<div class="unread-dot"></div>' : ''}</div>`).join('') : '<div class="card" style="padding:20px;">Aucune notification pour le moment.</div>'}
    </div>`;
};

window.contactTransporter = contactTransporter;
window.buyerConfirmDelivered = buyerConfirmDelivered;
window.openBuyerProblemModal = openBuyerProblemModal;
window.closeBuyerProblemModal = closeBuyerProblemModal;
window.submitBuyerProblemReport = submitBuyerProblemReport;

/* === COMPLEMENT EVALUATION: ajouter la note transporteur === */
let buyerSelectedTransportStars = 0;
const buyerOldInitEvaluationUi = initBuyerEvaluationUi;
initBuyerEvaluationUi = function initBuyerEvaluationUi() {
  buyerOldInitEvaluationUi();
  if (!document.getElementById('buyerTransportStars')) {
    const productRow = document.getElementById('buyerProductStars')?.closest('.evaluation-row');
    productRow?.insertAdjacentHTML('afterend', `
      <div class="evaluation-row">
        <div><label>Note transporteur</label><p>Ponctualite, contact et etat de la livraison.</p></div>
        <div class="rating-stars" id="buyerTransportStars"></div>
      </div>`);
  }
  renderBuyerStarPicker('buyerTransportStars', 'transport');
};
const buyerOldSelectStars = selectBuyerStars;
selectBuyerStars = function selectBuyerStars(kind, value) {
  if (kind === 'transport') buyerSelectedTransportStars = value;
  else buyerOldSelectStars(kind, value);
  updateBuyerStarPickers();
};
const buyerOldUpdateStars = updateBuyerStarPickers;
updateBuyerStarPickers = function updateBuyerStarPickers() {
  buyerOldUpdateStars();
  document.querySelectorAll('#buyerTransportStars .star-btn').forEach((btn, index) => btn.classList.toggle('active', index < buyerSelectedTransportStars));
};
const buyerOldOpenEvaluationModal = openBuyerEvaluationModal;
openBuyerEvaluationModal = function openBuyerEvaluationModal(orderId) {
  buyerSelectedTransportStars = 0;
  buyerOldOpenEvaluationModal(orderId);
  updateBuyerStarPickers();
};
submitBuyerEvaluation = function submitBuyerEvaluation() {
  const order = buyerOrders.find((item) => String(item.id) === String(buyerEvalOrderId));
  if (!order) { showBuyerToast('Commande introuvable.', 'error'); return; }
  if (order.statut !== 'livree') { showBuyerToast('Evaluation disponible seulement apres livraison.', 'error'); return; }
  if (buyerOrderEvaluation(order.id)) {
    showBuyerToast('Cette commande est deja evaluee.', 'error');
    closeBuyerEvaluationModal();
    renderBuyerNotificationsSection();
    renderBuyerOrders();
    return;
  }
  if (!buyerSelectedFarmerStars || !buyerSelectedProductStars || !buyerSelectedTransportStars) {
    showBuyerToast('Choisis une note pour l agriculteur, le transporteur et le produit.', 'error');
    return;
  }
  const comment = (document.getElementById('buyerEvaluationComment')?.value || '').trim();
  const products = (order.lignes || []).map((line) => line.produit_nom).filter(Boolean);
  const evaluations = buyerReadEvaluations();
  evaluations.push({
    id: Date.now(),
    orderId: order.id,
    buyerName: buyerCurrentName(),
    farmerName: order.agriculteur || 'Agriculteur',
    transporterName: buyerTransporterInfo(order).nom,
    farmerStars: buyerSelectedFarmerStars,
    transportStars: buyerSelectedTransportStars,
    productStars: buyerSelectedProductStars,
    products,
    comment,
    date: new Date().toISOString().split('T')[0]
  });
  buyerSaveEvaluations(evaluations);
  showBuyerToast('Merci, evaluation enregistree.');
  closeBuyerEvaluationModal();
  renderBuyerOrders();
  renderBuyerProducts();
  renderBuyerNotificationsSection();
  renderBuyerDashboard();
  updateBuyerNavBadges();
};
window.openBuyerEvaluationModal = openBuyerEvaluationModal;
window.submitBuyerEvaluation = submitBuyerEvaluation;
window.selectBuyerStars = selectBuyerStars;

/* === PATCH FINAL DEMANDE: suivi livraison + tableau commandes + problème + messages propres === */
(function () {
  const deliveryStatuses = ['confirmee', 'en_preparation', 'en_attente_transporteur', 'expediee', 'livree'];

  function lineQty(order) {
    return (order.lignes || []).reduce((sum, line) => sum + Number(line.quantite || 0), 0);
  }
  function lineNames(order) {
    return (order.lignes || []).map(line => `${line.produit_nom} (${line.quantite} kg)`).join(', ') || 'Aucun produit';
  }
  function safeDate(value) {
    try { return new Date(value).toLocaleDateString('fr-FR'); } catch (_) { return '—'; }
  }
  function systemOk(message) { showBuyerToast(message || 'Opération effectuée avec succès.'); }
  function systemError(message) { showBuyerToast(message || 'Une erreur est survenue. Veuillez réessayer.', 'error'); }

  // ── Problème modal ────────────────────────────────────────────────────────
  const oldOpenProblem = window.openBuyerProblemModal || openBuyerProblemModal;
  window.openBuyerProblemModal = openBuyerProblemModal = function (orderId) {
    const order = buyerOrders.find((item) => Number(item.id) === Number(orderId));
    if (!order) { systemError('Commande introuvable.'); return; }
    oldOpenProblem(orderId);
    const modal = document.getElementById('buyerProblemModal');
    modal?.classList.remove('show');
    modal?.classList.add('visible');
  };

  window.closeBuyerProblemModal = closeBuyerProblemModal = function () {
    const modal = document.getElementById('buyerProblemModal');
    modal?.classList.remove('show');
    modal?.classList.remove('visible');
  };

  window.submitBuyerProblemReport = submitBuyerProblemReport = function () {
    const modal = document.getElementById('buyerProblemModal');
    const orderId = Number(modal?.dataset.orderId || 0);
    const order = buyerOrders.find((item) => Number(item.id) === orderId);
    const message = (document.getElementById('buyerProblemMessage')?.value || '').trim();
    if (!order) { systemError('Commande introuvable.'); return; }
    if (message.length < 8) { systemError('Veuillez écrire un message clair, minimum 8 caractères.'); return; }
    const problems = buyerReadProblems().filter((item) => Number(item.orderId) !== orderId);
    problems.push({
      id: Date.now(), orderId,
      buyerName: buyerCurrentName ? buyerCurrentName() : 'Acheteur',
      farmerName: order.agriculteur || 'Agriculteur',
      products: (order.lignes || []).map((line) => line.produit_nom).filter(Boolean),
      quantity: lineQty(order), total: order.total || 0,
      message, date: new Date().toISOString(), status: 'envoye'
    });
    buyerSaveProblems(problems);
    closeBuyerProblemModal();
    systemOk('Votre signalement a été envoyé à l\'agriculteur.');
    renderBuyerLogisticsSection();
    renderBuyerNotificationsSection();
  };

  // ── renderBuyerOrders ────────────────────────────────────────────────────
  window.renderBuyerOrders = renderBuyerOrders = function () {
    const list = document.getElementById('orders-list');
    if (!list) return;
    const totalEl = document.getElementById('buyerOrdersTotal');
    const newEl = document.getElementById('buyerOrdersNew');
    const progressEl = document.getElementById('buyerOrdersProgress');
    const deliveredEl = document.getElementById('buyerOrdersDelivered');
    if (totalEl) totalEl.textContent = buyerOrders.length;
    if (newEl) newEl.textContent = buyerOrders.filter(o => o.statut === 'en_attente').length;
    if (progressEl) progressEl.textContent = buyerOrders.filter(o =>
      ['confirmee', 'en_preparation', 'en_attente_transporteur', 'expediee'].includes(o.statut)).length;
    if (deliveredEl) deliveredEl.textContent = buyerOrders.filter(o => o.statut === 'livree').length;
    if (!buyerOrders.length) {
      list.innerHTML = '<div class="empty-filter-state">Aucune commande pour le moment. Cliquez sur + Nouvelle commande pour commencer.</div>';
      return;
    }
    list.innerHTML = buyerOrders.map(order => {
      const meta = buyerStatusMeta(order.statut);
      const firstLine = order.lignes?.[0];
      const qty = lineQty(order);
      const products = lineNames(order);
      const problem = buyerProblemForOrder(order.id);
      const searchText = `CMD-${order.id} ${order.agriculteur || ''} ${products} ${order.adresse_livraison || ''} ${meta.label || ''} ${qty} ${order.total || 0}`;
      const cancelBtn = order.statut === 'en_attente'
        ? `<button class="btn-outline-green" onclick="cancelBuyerOrder(${order.id})">Annuler</button>` : '';
      const deliveryBtn = deliveryStatuses.includes(order.statut)
        ? `<button class="btn-outline-gold" onclick="navigate('livraison')">Suivre livraison</button>` : '';
      const problemBtn = deliveryStatuses.includes(order.statut)
        ? `<button class="btn-soft btn-soft-danger" onclick="openBuyerProblemModal(${order.id})">Signaler problème</button>` : '';
      return `<div class="order-card accessible-card" tabindex="0" role="article" aria-label="Commande CMD-${order.id}" data-status="${meta.filter}" data-search="${escapeHtml(searchText)}">
        <div class="order-card-top">
          <div><div class="order-id">CMD-${order.id}</div><div class="order-farm">${escapeHtml(order.agriculteur || 'Agriculteur')}</div></div>
          <div style="text-align:right"><span class="badge ${meta.cls}">${meta.label}</span><div class="order-date">${new Date(order.date_creation).toLocaleString('fr-FR')}</div></div>
        </div>
        <div class="order-card-body">
          <div><div class="order-field-label">Produit</div><div class="order-field-val">${escapeHtml(firstLine ? firstLine.produit_nom : '-')}</div></div>
          <div><div class="order-field-label">Quantité totale</div><div class="order-field-val">${qty} kg</div></div>
          <div><div class="order-field-label">Prix total</div><div class="order-field-val">${buyerMoney(order.total)}</div></div>
        </div>
        <div class="buyer-order-table-mini"><table><thead><tr><th>Commande</th><th>Produits</th><th>Quantité</th><th>État</th><th>Prix</th></tr></thead><tbody>
          <tr><td>CMD-${order.id}</td><td>${escapeHtml(products)}</td><td>${qty} kg</td><td>${meta.label}</td><td>${buyerMoney(order.total)}</td></tr>
        </tbody></table></div>
        <div style="padding:0 20px 16px;color:var(--text-muted);font-size:13px;line-height:1.7">
          📍 ${escapeHtml(order.adresse_livraison || 'Adresse non renseignée')}
          ${problem ? `<br>⚠️ Problème signalé : ${escapeHtml(problem.message)}` : ''}
        </div>
        <div class="order-card-footer">
          <span style="font-size:13px;color:var(--text-muted)">${escapeHtml(order.note || 'Aucune note particulière')}</span>
          <div style="display:flex;gap:9px;flex-wrap:wrap">${deliveryBtn}${problemBtn}${cancelBtn}</div>
        </div>
      </div>`;
    }).join('') + '<div id="ordersFilterEmpty" class="empty-filter-state" style="display:none;">Aucune commande ne correspond à ce filtre.</div>';
    applyBuyerOrderFilters();
  };

  // ── renderBuyerLogisticsSection — VERSION CORRIGÉE ───────────────────────
  window.renderBuyerLogisticsSection = renderBuyerLogisticsSection = function () {
    const section = document.getElementById('sec-livraison');
    if (!section) return;

    const dismissed = getBuyerDismissedCards();

    // FIX: include ALL active statuses, not just 'livree'
    const allDeliveryOrders = buyerOrders.filter(order =>
      ['confirmee', 'en_preparation', 'en_attente_transporteur', 'expediee', 'livree'].includes(order.statut)
    );
    const deliveryOrders = allDeliveryOrders.filter(order => !dismissed.includes(order.id));
    const dismissedCount = allDeliveryOrders.length - deliveryOrders.length;

    console.log('[renderBuyerLogisticsSection] buyerOrders total:', buyerOrders.length);
    console.log('[renderBuyerLogisticsSection] deliveryOrders:', deliveryOrders.length,
      deliveryOrders.map(o => `CMD-${o.id}(${o.statut})`));

    if (!deliveryOrders.length) {
      section.innerHTML = `
        <div class="page-header">
          <div class="page-title">Suivi Livraison</div>
          <div class="page-desc">Suivez vos livraisons sous forme de cartes avec tableau récapitulatif des commandes, prix, état et quantité.</div>
        </div>
        <div class="card" style="padding:28px;text-align:center;color:var(--text-muted)">
          <div style="font-size:2rem;margin-bottom:10px">🚛</div>
          <p>Aucune livraison en cours.<br><small>Vos commandes confirmées apparaîtront ici.</small></p>
          ${dismissedCount ? `<button onclick="restoreAllDeliveryCards()" style="margin-top:14px;padding:8px 18px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text-primary);cursor:pointer;font-size:13px;">🔄 Restaurer ${dismissedCount} carte(s) masquée(s)</button>` : ''}
        </div>`;
      return;
    }

    // Tableau récapitulatif — toutes commandes visibles
    const rows = deliveryOrders.map(order => {
      const meta = buyerStatusMeta(order.statut);
      return `<tr>
        <td><strong>CMD-${order.id}</strong></td>
        <td>${escapeHtml(lineNames(order))}</td>
        <td>${lineQty(order)} kg</td>
        <td><span class="badge ${meta.cls}">${meta.label}</span></td>
        <td>${buyerMoney(order.total)}</td>
        <td>${safeDate(order.date_creation)}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-outline-gold" onclick="openBuyerProblemModal(${order.id})">Signaler</button>
          <button onclick="dismissDeliveryCard(${order.id})" title="Masquer cette carte"
            style="padding:4px 10px;border-radius:8px;border:1px solid #fca5a5;background:transparent;color:#b91c1c;cursor:pointer;font-size:12px;font-weight:600">
            🗑 Supprimer
          </button>
        </td>
      </tr>`;
    }).join('');

    // FIX: each order gets its own clearly separated card block
    const allCards = deliveryOrders.map(order => {
      const tp = buyerTransporterInfo(order);
      // FIX: don't rely on order.livraison (not returned by API) — use top-level fields
      const dest = order.adresse_livraison || 'Destination non renseignée';
      const pb = buyerProblemForOrder(order.id);
      const mt = buyerStatusMeta(order.statut);
      const alertLabel = order.statut === 'livree'
        ? '✅ Commande livrée'
        : order.statut === 'expediee'
          ? '🚚 Livraison en route'
          : '📦 Livraison en préparation';

      return `
        <div class="delivery-alert-card" style="margin-top:22px;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div>
            <strong>${alertLabel}</strong>
            <span>CMD-${order.id} · ${buyerMoney(order.total)}</span>
          </div>
          <button onclick="dismissDeliveryCard(${order.id})" title="Supprimer cette carte de livraison"
            style="display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:10px;border:1px solid #fca5a5;background:transparent;color:#b91c1c;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:background .15s"
            onmouseover="this.style.background='rgba(185,28,28,.08)'"
            onmouseout="this.style.background='transparent'">
            🗑 Supprimer la carte
          </button>
        </div>
        <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
          <div class="card delivery-card-rich">
            <div class="card-header">
              <div>
                <div class="card-title">Carte de livraison</div>
                <div class="card-subtitle">CMD-${order.id}</div>
              </div>
              <span class="badge ${mt.cls}">${mt.label}</span>
            </div>
            ${buyerDeliveryTimeline(order)}
            <div class="delivery-info-grid">
              <div><span>Commande</span><strong>CMD-${order.id}</strong></div>
              <div><span>État</span><strong>${mt.label}</strong></div>
              <div><span>Quantité</span><strong>${lineQty(order)} kg</strong></div>
              <div><span>Prix</span><strong>${buyerMoney(order.total)}</strong></div>
            </div>
            <div class="delivery-actions" style="display:flex;gap:8px;flex-wrap:wrap;padding:10px 0 0">
              ${tp.telephone ? `<button class="btn-filled-green" onclick="contactTransporter(${order.id})">Contacter le livreur</button>` : ''}
              ${order.statut !== 'livree' ? `<button class="btn-outline-green" onclick="buyerConfirmDelivered(${order.id})">Marquer comme livré</button>` : ''}
              ${order.statut === 'livree' ? `<button class="btn-add-wide btn-evaluate" onclick="openBuyerEvaluationModal(${order.id})">⭐ Évaluer</button>` : ''}
              <button class="btn-outline-gold" onclick="openBuyerProblemModal(${order.id})">Signaler un problème</button>
            </div>
            ${pb ? `<div class="problem-sent-card"><strong>Problème signalé</strong><p>${escapeHtml(pb.message)}</p><small>Message envoyé.</small></div>` : ''}
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Informations du transporteur</div></div>
            <div class="activity-list">
              <div class="activity-item"><div class="activity-dot delivery">🚛</div><div class="activity-info"><div class="activity-title">Nom</div><div class="activity-time">${escapeHtml(tp.nom)}</div></div></div>
              <div class="activity-item"><div class="activity-dot payment">📞</div><div class="activity-info"><div class="activity-title">Téléphone</div><div class="activity-time">${escapeHtml(tp.telephone || 'Non renseigné')}</div></div></div>
              <div class="activity-item"><div class="activity-dot payment">✉️</div><div class="activity-info"><div class="activity-title">Email</div><div class="activity-time">${escapeHtml(tp.email || 'Non renseigné')}</div></div></div>
              <div class="activity-item"><div class="activity-dot delivery">📦</div><div class="activity-info"><div class="activity-title">Produits</div><div class="activity-time">${escapeHtml(lineNames(order))}</div></div></div>
              <div class="activity-item"><div class="activity-dot delivery">📍</div><div class="activity-info"><div class="activity-title">Destination</div><div class="activity-time">${escapeHtml(dest)}</div></div></div>
            </div>
          </div>
        </div>`;
    }).join('');

    const restoreLink = dismissedCount
      ? `<span style="cursor:pointer;color:var(--gold,#b8860b);text-decoration:underline;font-size:13px" onclick="restoreAllDeliveryCards()">🔄 Restaurer ${dismissedCount} carte(s) masquée(s)</span>`
      : '';

    section.innerHTML = `
      <div class="page-header">
        <div class="page-title">Suivi Livraison</div>
        <div class="page-desc" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span>Suivez vos livraisons sous forme de cartes avec tableau récapitulatif des commandes, prix, état et quantité.</span>
          ${restoreLink}
        </div>
      </div>
      <div class="card orders-delivery-table">
        <div class="card-header">
          <div>
            <div class="card-title">Tableau des commandes suivies</div>
            <div class="card-subtitle">Prix, quantité et état de chaque commande.</div>
          </div>
        </div>
        <div class="responsive-table">
          <table>
            <thead><tr><th>Commande</th><th>Produits</th><th>Quantité</th><th>État</th><th>Prix</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7">Aucune commande à suivre.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      ${allCards || '<div class="empty-filter-state">Aucune livraison active.</div>'}`;
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.stat-card,.quick-action-btn,.card').forEach((card) => {
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
      if (!card.hasAttribute('role')) card.setAttribute('role', 'region');
    });
  });
})();
