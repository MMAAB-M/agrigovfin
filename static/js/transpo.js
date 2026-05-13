document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEYS = {
    activePage: 'transport_active_page',
    theme: 'transport_theme'
  };

  const state = {
    profile: null,
    completion: 0,
    missions: [],
    livraisons: [],
    historique: [],
    notifications: [],
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pages = $$('.transport-page');
  const navLinks = $$('.transport-menu-link');
  const themeToggle = $('#transportThemeToggle');
  const notificationBtn = $('.transport-notification-btn');
  const dashboardSearch = $('.transport-search-box input');
  const dashboardWilayaInput = $('.transport-filter-input input');
  const dashboardWilayaSelect = $('.transport-filter-bar select');

  // ─── UTILITAIRES ──────────────────────────────────────────────────────────

  function getCsrfToken() {
    const match = document.cookie.split('; ').find((row) => row.startsWith('csrftoken='));
    return match ? decodeURIComponent(match.split('=')[1]) : '';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function showNotification(message, type = 'success') {
    let wrap = document.getElementById('transportToastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'transportToastWrap';
      wrap.style.cssText = 'position:fixed;top:18px;right:18px;z-index:3000;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(wrap);
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `padding:12px 16px;border-radius:14px;color:#fff;font-weight:600;box-shadow:0 18px 40px rgba(0,0,0,.18);max-width:340px;${type === 'error' ? 'background:#dc2626;' : type === 'info' ? 'background:#2563eb;' : 'background:#16a34a;'}`;
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        ...(options.method && options.method !== 'GET' ? { 'X-CSRFToken': getCsrfToken() } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { success: false, error: raw || 'Réponse serveur invalide.' }; }
    return { ok: response.ok, status: response.status, data };
  }

  async function ensureSessionRole() {
    try {
      const { ok, data } = await apiFetch('/api/session-info/');
      if (!ok) { window.location.href = '/login/'; return false; }
      if (data.role !== 'transporteur') {
        showNotification(`Session: ${data.role || 'inconnue'}. Redirection...`, 'error');
        setTimeout(() => { window.location.href = data.dashboard_url || '/login/'; }, 800);
        return false;
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  // ─── NAVIGATION / THÈME ───────────────────────────────────────────────────

  function setActivePage(pageId) {
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('data-page') === pageId));
    pages.forEach((page) => page.classList.toggle('active', page.id === pageId));
    localStorage.setItem(STORAGE_KEYS.activePage, pageId);

    // Charger les données à la demande
    if (pageId === 'transportMissionsPage') loadMissions();
    if (pageId === 'transportLivraisonsPage') loadLivraisons();
    if (pageId === 'transportPlanningPage') loadPlanningLivraisons();
    if (pageId === 'transportNotificationsPage') loadNotifications();
    if (pageId === 'transportHistoriquePage') loadHistorique();
  }

  function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode nuit');
    }
    if (state.profile) applyProfileToUi(state.profile);
  }

  // ─── PROFIL ───────────────────────────────────────────────────────────────

  function profileCompletion(profile) {
    const fields = [
      profile?.full_name, profile?.email, profile?.phone,
      profile?.wilaya || profile?.city,
      profile?.vehicle_name, profile?.plate, profile?.capacity, profile?.condition,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }

  function applyProfileToUi(profile) {
    state.profile = profile;
    state.completion = profile?.stats?.profile_completion || profileCompletion(profile);
    const fullName = profile?.full_name || 'Transporteur';
    const initials = (profile?.first_name?.[0] || profile?.last_name?.[0] || fullName[0] || 'T').toUpperCase();
    const inlineAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%25" height="100%25" fill="%23e7eef4"/><text x="50%25" y="54%25" dominant-baseline="middle" text-anchor="middle" font-size="42" fill="%231f5f8b">${initials}</text></svg>`;
    const avatar = $('#transportDashboardAvatar');
    if (avatar) avatar.src = profile?.profile_photo_url || inlineAvatar;
    const nameEl = $('#transportDashboardName');
    if (nameEl) nameEl.textContent = fullName;
    const roleEl = $('#transportDashboardRole');
    if (roleEl) roleEl.textContent = 'Transporteur vérifié';
    const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
    setValue('transportFullName', fullName);
    setValue('transportEmail', profile?.email);
    setValue('transportPhone', profile?.phone);
    setValue('transportWilaya', profile?.wilaya || profile?.city);
    setValue('transportVehicleType', profile?.vehicle_name);
    setValue('transportPlate', profile?.plate);
    setValue('transportCapacity', profile?.capacity);
    setValue('transportCondition', profile?.condition);
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────

  async function renderDashboard(profile) {
    const statsCards = $$('#transportDashboardPage .transport-stat-card');
    const completion = state.completion;

    // Charger les stats livraison depuis le backend
    let missions_dispo = 0, en_cours = 0, livrees_count = 0;
    try {
      const { ok, data } = await apiFetch('/livraison/stats/');
      if (ok && data.success) {
        missions_dispo = data.stats.missions_disponibles || 0;
        en_cours = data.stats.en_cours || 0;
        livrees_count = data.stats.livrees || 0;
      }
    } catch (_) {}

    const statValues = [
      ['Missions', missions_dispo, missions_dispo ? `${missions_dispo} commande(s) disponible(s)` : 'Aucune mission disponible'],
      ['En cours', en_cours, en_cours ? `${en_cours} livraison(s) en route` : 'Aucune livraison en cours'],
      ['Livrées', livrees_count, `${livrees_count} commande(s) livrée(s)`],
      ['Profil', `${completion}%`, completion >= 75 ? 'Profil bien complété' : 'Informations encore manquantes'],
    ];

    statsCards.slice(0, 4).forEach((card, index) => {
      const title = $('h3', card);
      const value = $('h2', card);
      const help = $('span', card);
      if (title) title.textContent = statValues[index][0];
      if (value) value.textContent = statValues[index][1];
      if (help) help.textContent = statValues[index][2];
    });

    const bars = $$('#transportDashboardPage .transport-chart-placeholder .transport-bar');
    const maxBar = Math.max(missions_dispo, en_cours, livrees_count, 1);
    const barValues = [
      Math.max(18, Math.round((missions_dispo / maxBar) * 90)),
      Math.max(18, Math.round((en_cours / maxBar) * 90)),
      Math.max(18, Math.round((livrees_count / maxBar) * 90)),
      Math.max(18, completion),
    ];
    bars.forEach((bar, index) => { bar.style.height = `${barValues[index] || 20}%`; });

    // Aperçu planning dynamique (remplace l'ancien suivi GPS)
    const mapPlaceholder = $('#transportDashboardPage .transport-map-placeholder');
    if (mapPlaceholder) {
      const nextDeliveries = buildPlanningItems().slice(0, 3);
      mapPlaceholder.innerHTML = nextDeliveries.length ? `
        <div style="padding:18px;display:flex;flex-direction:column;gap:10px;height:100%;justify-content:center;">
          <div style="font-weight:800;font-size:18px;">Prochaines livraisons</div>
          ${nextDeliveries.map((item) => `
            <div style="padding:10px 12px;border-radius:14px;background:var(--surface-soft);display:grid;gap:4px;">
              <strong>${escapeHtml(item.time)} · Commande #${escapeHtml(String(item.id))}</strong>
              <span style="font-size:13px;color:var(--muted);">${escapeHtml(item.from)} → ${escapeHtml(item.to)}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="padding:22px;display:flex;flex-direction:column;gap:12px;height:100%;justify-content:center;">
          <div style="font-weight:700;font-size:18px;">Planning vide</div>
          <div style="font-size:15px;color:var(--transport-text-muted,#64748b);">Les missions acceptées apparaîtront ici automatiquement.</div>
          <div style="padding:12px 14px;border-radius:14px;background:var(--surface-soft);">Zone: <strong>${escapeHtml(profile?.wilaya || profile?.city || 'Non renseignée')}</strong></div>
          <div style="padding:12px 14px;border-radius:14px;background:var(--surface-soft);">Véhicule: <strong>${escapeHtml(profile?.vehicle_name || 'Non renseigné')}</strong></div>
        </div>
      `;
    }

    // Tableau récapitulatif
    const tableBody = $('#transportDashboardPage tbody');
    if (tableBody && state.missions.length > 0) {
      const rows = state.missions.slice(0, 4).map(cmd => [
        `#${cmd.id}`, cmd.acheteur || '—', cmd.lieu_destination || '—',
        cmd.statut === 'confirmee' ? 'Disponible' : cmd.statut === 'expediee' ? 'En cours' : cmd.statut
      ]);
      tableBody.innerHTML = rows.map((row) => `
        <tr>
          <td>${escapeHtml(row[0])}</td>
          <td>${escapeHtml(row[1])}</td>
          <td>${escapeHtml(row[2])}</td>
          <td><span class="transport-badge ${row[3] === 'Disponible' ? 'orange' : 'blue'}">${escapeHtml(row[3])}</span></td>
        </tr>
      `).join('');
    } else if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">Aucune commande récente</td></tr>`;
    }

    const summaryRows = $$('#transportDashboardPage .transport-summary-row');
    const summaryValues = [
      ['Missions disponibles', String(missions_dispo)],
      ['Livraisons en cours', String(en_cours)],
      ['Commandes livrées', String(livrees_count)],
      ['Zone principale', profile?.wilaya || profile?.city || 'Non renseignée'],
    ];
    summaryRows.forEach((row, index) => {
      const cells = row.children;
      if (cells[0]) cells[0].textContent = summaryValues[index][0];
      if (cells[1]) cells[1].textContent = summaryValues[index][1];
    });
  }

  // ─── MISSIONS DISPONIBLES ─────────────────────────────────────────────────

  function badgeStatut(statut) {
    const map = {
      confirmee: ['orange', 'Confirmée'],
      en_preparation: ['blue', 'En préparation'],
      expediee: ['blue', 'Expédiée'],
      livree: ['green', 'Livrée'],
      refusee: ['red', 'Refusée'],
      annulee: ['red', 'Annulée'],
      en_attente: ['orange', 'En attente'],
    };
    const [cls, label] = map[statut] || ['blue', statut];
    return `<span class="transport-badge ${cls}">${escapeHtml(label)}</span>`;
  }

  function buildLignesHtml(lignes) {
    if (!lignes || lignes.length === 0) return '<em style="color:var(--muted);font-size:13px;">Aucun produit</em>';
    return lignes.map(l =>
      `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border,#e2e8f0);">
        🌿 <strong>${escapeHtml(l.produit)}</strong> — ${escapeHtml(String(l.quantite))} unité(s) × ${escapeHtml(String(l.prix_unitaire))} DA
      </div>`
    ).join('');
  }

  async function loadMissions() {
    const page = document.getElementById('transportMissionsPage');
    if (!page) return;

    page.innerHTML = `
      <header class="transport-page-header">
        <h1>Missions Disponibles</h1>
        <p>Commandes confirmées par les agriculteurs, en attente d'un transporteur.</p>
      </header>
      <div class="transport-cards-list" id="missionsContainer">
        <div class="transport-panel" style="padding:24px;text-align:center;color:var(--muted);">
          <i class="fa-solid fa-spinner fa-spin"></i> Chargement...
        </div>
      </div>
    `;

    try {
      const { ok, data } = await apiFetch('/livraison/missions/');
      if (!ok || !data.success) throw new Error(data.error || 'Erreur de chargement.');

      state.missions = data.commandes || [];
      const container = document.getElementById('missionsContainer');

      if (state.missions.length === 0) {
        container.innerHTML = `
          <div class="transport-panel" style="padding:32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">📦</div>
            <h3>Aucune mission disponible</h3>
            <p style="color:var(--muted);">Revenez plus tard, les commandes confirmées apparaîtront ici.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = state.missions.map(cmd => `
        <div class="transport-mission-card" data-id="${cmd.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;">Commande #${escapeHtml(String(cmd.id))}</h3>
            ${badgeStatut(cmd.statut)}
          </div>
          <div style="margin:10px 0;display:grid;gap:6px;">
            <p style="margin:0;">🚩 <strong>Départ :</strong> ${escapeHtml(cmd.lieu_depart)}</p>
            <p style="margin:0;">📍 <strong>Destination :</strong> ${escapeHtml(cmd.lieu_destination)}</p>
            <p style="margin:0;">👤 <strong>Acheteur :</strong> ${escapeHtml(cmd.acheteur)}</p>
            <p style="margin:0;">🌾 <strong>Agriculteur :</strong> ${escapeHtml(cmd.agriculteur)}</p>
            <p style="margin:0;">💰 <strong>Total :</strong> ${escapeHtml(String(cmd.total))} DA</p>
            <p style="margin:0;font-size:12px;color:var(--muted);">📅 ${escapeHtml(cmd.date_creation)}</p>
          </div>
          <div style="margin-top:8px;">${buildLignesHtml(cmd.lignes)}</div>
          ${cmd.note ? `<p style="margin-top:8px;font-size:13px;font-style:italic;color:var(--muted);">📝 ${escapeHtml(cmd.note)}</p>` : ''}
          <div class="transport-actions-row" style="margin-top:14px;">
            <button class="btn-accepter-mission transport-btn-primary" data-id="${cmd.id}">
              <i class="fa-solid fa-check"></i> Accepter la mission
            </button>
          </div>
        </div>
      `).join('');

      // Listeners accepter
      container.querySelectorAll('.btn-accepter-mission').forEach(btn => {
        btn.addEventListener('click', () => accepterMission(Number(btn.dataset.id), btn));
      });

    } catch (error) {
      document.getElementById('missionsContainer').innerHTML = `
        <div class="transport-panel" style="padding:24px;text-align:center;color:#dc2626;">
          <i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(error.message)}
        </div>
      `;
    }
  }

  async function accepterMission(commandeId, btn) {
    if (!commandeId || !btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traitement...';
    try {
      const { ok, data } = await apiFetch(`/livraison/missions/${commandeId}/accepter/`, { method: 'POST', body: '{}' });
      if (!ok || !data.success) throw new Error(data.error || 'Erreur lors de l\'acceptation.');
      showNotification('Mission acceptée ! La commande est maintenant expédiée.', 'success');
      // Rafraîchir les deux sections
      await loadMissions();
      // Recharger stats dashboard en arrière-plan
      if (state.profile) renderDashboard(state.profile);
      refreshNotificationSources().then(updateNotificationBadge);
      refreshNotificationSources().then(updateNotificationBadge);
    } catch (error) {
      showNotification(error.message || 'Erreur', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Accepter la mission';
    }
  }

  // ─── MES LIVRAISONS ───────────────────────────────────────────────────────

  async function loadLivraisons() {
    const page = document.getElementById('transportLivraisonsPage');
    if (!page) return;

    page.innerHTML = `
      <header class="transport-page-header">
        <h1>Mes Livraisons</h1>
        <p>Commandes expédiées en cours de livraison.</p>
      </header>
      <div class="transport-cards-list" id="livraisonsContainer">
        <div class="transport-panel" style="padding:24px;text-align:center;color:var(--muted);">
          <i class="fa-solid fa-spinner fa-spin"></i> Chargement...
        </div>
      </div>
    `;

    try {
      const { ok, data } = await apiFetch('/livraison/livraisons/');
      if (!ok || !data.success) throw new Error(data.error || 'Erreur de chargement.');

      state.livraisons = data.commandes || [];
      const container = document.getElementById('livraisonsContainer');

      if (state.livraisons.length === 0) {
        container.innerHTML = `
          <div class="transport-panel" style="padding:32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🛣️</div>
            <h3>Aucune livraison en cours</h3>
            <p style="color:var(--muted);">Acceptez une mission pour démarrer une livraison.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = state.livraisons.map(cmd => `
        <div class="transport-delivery-card" data-id="${cmd.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;">Commande #${escapeHtml(String(cmd.id))}</h3>
            ${badgeStatut(cmd.statut)}
          </div>
          <div style="margin:10px 0;display:grid;gap:6px;">
            <p style="margin:0;">🚩 <strong>De :</strong> ${escapeHtml(cmd.lieu_depart)}</p>
            <p style="margin:0;">📍 <strong>Vers :</strong> ${escapeHtml(cmd.lieu_destination)}</p>
            <p style="margin:0;">👤 <strong>Client :</strong> ${escapeHtml(cmd.acheteur)}</p>
            <p style="margin:0;">💰 <strong>Total :</strong> ${escapeHtml(String(cmd.total))} DA</p>
          </div>
          <div style="margin-top:8px;">${buildLignesHtml(cmd.lignes)}</div>
          <div class="transport-progress-box" style="margin-top:14px;">
            <div class="transport-progress-text">
              <span>Progression</span>
              <span>En route 🚚</span>
            </div>
            <div class="transport-progress-bar">
              <div class="transport-progress-fill" style="width:60%"></div>
            </div>
          </div>
          <div class="transport-actions-row" style="margin-top:14px;">
            <button class="btn-livree transport-btn-primary" data-id="${cmd.id}" style="background:#16a34a;">
              <i class="fa-solid fa-circle-check"></i> Marquer comme livrée
            </button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.btn-livree').forEach(btn => {
        btn.addEventListener('click', () => marquerLivree(Number(btn.dataset.id), btn));
      });

    } catch (error) {
      document.getElementById('livraisonsContainer').innerHTML = `
        <div class="transport-panel" style="padding:24px;text-align:center;color:#dc2626;">
          <i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(error.message)}
        </div>
      `;
    }
  }

  async function marquerLivree(commandeId, btn) {
    if (!commandeId || !btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirmation...';
    try {
      const { ok, data } = await apiFetch(`/livraison/livraisons/${commandeId}/livree/`, { method: 'POST', body: '{}' });
      if (!ok || !data.success) throw new Error(data.error || 'Erreur lors de la confirmation.');
      showNotification('Livraison confirmée ! Commande marquée comme livrée.', 'success');
      await loadLivraisons();
      if (state.profile) renderDashboard(state.profile);
      refreshNotificationSources().then(updateNotificationBadge);
      refreshNotificationSources().then(updateNotificationBadge);
    } catch (error) {
      showNotification(error.message || 'Erreur', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Marquer comme livrée';
    }
  }


  // ─── PLANNING LIVRAISONS DYNAMIQUE ───────────────────────────────────────

  function parsePlanningDate(value, fallbackOffsetHours = 0) {
    const source = value || new Date().toISOString();
    const date = new Date(source);
    if (Number.isNaN(date.getTime())) {
      const fallback = new Date();
      fallback.setHours(fallback.getHours() + fallbackOffsetHours, 0, 0, 0);
      return fallback;
    }
    if (fallbackOffsetHours) date.setHours(date.getHours() + fallbackOffsetHours);
    return date;
  }

  function planningDateLabel(date) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const sameDay = (a, b) => a.toDateString() === b.toDateString();
    if (sameDay(date, today)) return 'Aujourd\'hui';
    if (sameDay(date, tomorrow)) return 'Demain';
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  function planningTimeLabel(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function buildPlanningItems() {
    const items = [];
    (state.livraisons || []).forEach((cmd, index) => {
      const start = parsePlanningDate(cmd.date_livraison || cmd.date_creation, index * 2);
      items.push({
        id: cmd.id,
        type: 'Livraison en cours',
        icon: '🚚',
        badge: 'blue',
        status: cmd.statut || 'expediee',
        date: start,
        dateLabel: planningDateLabel(start),
        time: planningTimeLabel(start),
        from: cmd.lieu_depart || 'Départ non renseigné',
        to: cmd.lieu_destination || 'Destination non renseignée',
        acheteur: cmd.acheteur || 'Client non renseigné',
        agriculteur: cmd.agriculteur || 'Agriculteur non renseigné',
        total: cmd.total || 0,
        lignes: cmd.lignes || [],
        action: 'À livrer'
      });
    });

    (state.missions || []).forEach((cmd, index) => {
      const start = parsePlanningDate(cmd.date_creation, 4 + index * 2);
      items.push({
        id: cmd.id,
        type: 'Mission disponible',
        icon: '📦',
        badge: 'orange',
        status: cmd.statut || 'confirmee',
        date: start,
        dateLabel: planningDateLabel(start),
        time: planningTimeLabel(start),
        from: cmd.lieu_depart || 'Départ non renseigné',
        to: cmd.lieu_destination || 'Destination non renseignée',
        acheteur: cmd.acheteur || 'Client non renseigné',
        agriculteur: cmd.agriculteur || 'Agriculteur non renseigné',
        total: cmd.total || 0,
        lignes: cmd.lignes || [],
        action: 'À accepter'
      });
    });

    return items.sort((a, b) => a.date - b.date);
  }

  async function loadPlanningLivraisons() {
    const page = document.getElementById('transportPlanningPage');
    if (!page) return;
    page.innerHTML = `
      <header class="transport-page-header">
        <h1>Planning Livraisons</h1>
        <p>Agenda dynamique construit automatiquement depuis vos missions disponibles et livraisons en cours.</p>
      </header>
      <section class="transport-filter-bar" style="margin-bottom:18px;">
        <div class="transport-filter-input">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="transportPlanningSearch" placeholder="Rechercher client, wilaya, produit..." />
        </div>
        <select id="transportPlanningFilter">
          <option value="all">Toutes les tâches</option>
          <option value="livraison">Livraisons en cours</option>
          <option value="mission">Missions disponibles</option>
        </select>
      </section>
      <div class="transport-cards-list" id="transportPlanningContainer">
        <div class="transport-panel" style="padding:24px;text-align:center;color:var(--muted);">
          <i class="fa-solid fa-spinner fa-spin"></i> Chargement du planning...
        </div>
      </div>
    `;

    await refreshNotificationSources();
    updateNotificationBadge();

    const container = document.getElementById('transportPlanningContainer');
    const searchInput = document.getElementById('transportPlanningSearch');
    const filterSelect = document.getElementById('transportPlanningFilter');

    const renderPlanning = () => {
      const query = String(searchInput?.value || '').toLowerCase().trim();
      const filter = String(filterSelect?.value || 'all');
      const items = buildPlanningItems().filter((item) => {
        const text = `${item.type} ${item.from} ${item.to} ${item.acheteur} ${item.agriculteur} ${item.action}`.toLowerCase();
        const matchesQuery = !query || text.includes(query);
        const matchesFilter = filter === 'all'
          || (filter === 'livraison' && item.type.toLowerCase().includes('livraison'))
          || (filter === 'mission' && item.type.toLowerCase().includes('mission'));
        return matchesQuery && matchesFilter;
      });

      if (!items.length) {
        container.innerHTML = `
          <div class="transport-panel" style="padding:32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">📅</div>
            <h3>Planning vide</h3>
            <p style="color:var(--muted);">Aucune mission ne correspond au filtre choisi.</p>
          </div>
        `;
        return;
      }

      const groups = items.reduce((acc, item) => {
        acc[item.dateLabel] = acc[item.dateLabel] || [];
        acc[item.dateLabel].push(item);
        return acc;
      }, {});

      container.innerHTML = Object.entries(groups).map(([label, group]) => `
        <div class="transport-panel" style="padding:18px;">
          <div class="transport-panel-header" style="margin-bottom:12px;">
            <h3>${escapeHtml(label)}</h3>
            <span>${group.length} tâche(s)</span>
          </div>
          <div style="display:grid;gap:12px;">
            ${group.map((item) => `
              <div class="transport-delivery-card" style="border-left:5px solid ${item.badge === 'orange' ? '#f59e0b' : '#2563eb'};">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
                  <div>
                    <h3 style="margin:0;">${item.icon} ${escapeHtml(item.time)} · Commande #${escapeHtml(String(item.id))}</h3>
                    <p style="margin:5px 0 0;color:var(--muted);">${escapeHtml(item.type)} · ${escapeHtml(item.action)}</p>
                  </div>
                  ${badgeStatut(item.status)}
                </div>
                <div style="margin:12px 0;display:grid;gap:6px;">
                  <p style="margin:0;">🚩 <strong>Départ :</strong> ${escapeHtml(item.from)}</p>
                  <p style="margin:0;">📍 <strong>Destination :</strong> ${escapeHtml(item.to)}</p>
                  <p style="margin:0;">👤 <strong>Acheteur :</strong> ${escapeHtml(item.acheteur)}</p>
                  <p style="margin:0;">🌾 <strong>Agriculteur :</strong> ${escapeHtml(item.agriculteur)}</p>
                  <p style="margin:0;">💰 <strong>Total :</strong> ${escapeHtml(String(item.total))} DA</p>
                </div>
                <div>${buildLignesHtml(item.lignes)}</div>
                <div class="transport-actions-row" style="margin-top:14px;">
                  <button class="transport-btn-primary btn-planning-open" data-target="${item.type.toLowerCase().includes('mission') ? 'transportMissionsPage' : 'transportLivraisonsPage'}">
                    <i class="fa-solid fa-arrow-right"></i> Ouvrir la section
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.btn-planning-open').forEach((btn) => {
        btn.addEventListener('click', () => setActivePage(btn.dataset.target || 'transportLivraisonsPage'));
      });
    };

    renderPlanning();
    searchInput?.addEventListener('input', renderPlanning);
    filterSelect?.addEventListener('change', renderPlanning);
  }

  // ─── HISTORIQUE ───────────────────────────────────────────────────────────

  async function loadHistorique() {
    const page = document.getElementById('transportHistoriquePage');
    if (!page) return;

    page.innerHTML = `
      <header class="transport-page-header">
        <h1>Historique</h1>
        <p>Toutes les commandes livrées ou annulées.</p>
      </header>
      <div class="transport-cards-list" id="historiqueContainer">
        <div class="transport-panel" style="padding:24px;text-align:center;color:var(--muted);">
          <i class="fa-solid fa-spinner fa-spin"></i> Chargement...
        </div>
      </div>
    `;

    try {
      const { ok, data } = await apiFetch('/livraison/historique/');
      if (!ok || !data.success) throw new Error(data.error || 'Erreur de chargement.');

      state.historique = data.commandes || [];
      const container = document.getElementById('historiqueContainer');

      if (state.historique.length === 0) {
        container.innerHTML = `
          <div class="transport-panel" style="padding:32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🕓</div>
            <h3>Aucun historique</h3>
            <p style="color:var(--muted);">Les livraisons complètes apparaîtront ici.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = state.historique.map(cmd => `
        <div class="transport-history-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;">Commande #${escapeHtml(String(cmd.id))}</h3>
            ${badgeStatut(cmd.statut)}
          </div>
          <div style="margin:10px 0;display:grid;gap:4px;">
            <p style="margin:0;">🚩 ${escapeHtml(cmd.lieu_depart)} → 📍 ${escapeHtml(cmd.lieu_destination)}</p>
            <p style="margin:0;">👤 ${escapeHtml(cmd.acheteur)} · 🌾 ${escapeHtml(cmd.agriculteur)}</p>
            <p style="margin:0;font-size:13px;color:var(--muted);">📅 ${escapeHtml(cmd.date_creation)}</p>
          </div>
          <div class="transport-mission-meta">
            <span>💰 ${escapeHtml(String(cmd.total))} DA</span>
            <span>${cmd.lignes ? cmd.lignes.length : 0} produit(s)</span>
          </div>
        </div>
      `).join('');

    } catch (error) {
      document.getElementById('historiqueContainer').innerHTML = `
        <div class="transport-panel" style="padding:24px;text-align:center;color:#dc2626;">
          <i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(error.message)}
        </div>
      `;
    }
  }


  // ─── NOTIFICATIONS TRANSPORTEUR ──────────────────────────────────────────

  function formatShortDate(value) {
    if (!value) return 'Maintenant';
    return String(value).replace('T', ' ').slice(0, 16);
  }

  async function fetchTransportList(url) {
    try {
      const { ok, data } = await apiFetch(url);
      if (ok && data.success) return data.commandes || [];
    } catch (error) {
      console.warn('Notification source indisponible:', url, error);
    }
    return [];
  }

  async function refreshNotificationSources() {
    const [missions, livraisons, historique] = await Promise.all([
      fetchTransportList('/livraison/missions/'),
      fetchTransportList('/livraison/livraisons/'),
      fetchTransportList('/livraison/historique/'),
    ]);
    state.missions = missions;
    state.livraisons = livraisons;
    state.historique = historique;
  }

  function buildNotifications() {
    const notices = [];
    (state.missions || []).slice(0, 6).forEach((cmd, index) => {
      notices.push({
        unread: index < 3,
        icon: '📦',
        variant: 'orange',
        title: `Nouvelle mission disponible #${cmd.id}`,
        desc: `${cmd.lieu_depart || 'Départ non renseigné'} → ${cmd.lieu_destination || 'Destination non renseignée'} · client: ${cmd.acheteur || '—'}`,
        time: formatShortDate(cmd.date_creation),
        target: 'transportMissionsPage'
      });
    });
    (state.livraisons || []).slice(0, 6).forEach((cmd, index) => {
      notices.push({
        unread: index < 2,
        icon: '🚚',
        variant: 'blue',
        title: `Livraison en cours #${cmd.id}`,
        desc: `${cmd.lieu_depart || 'Départ'} → ${cmd.lieu_destination || 'Destination'}. Marquez-la livrée après confirmation.`,
        time: formatShortDate(cmd.date_creation),
        target: 'transportLivraisonsPage'
      });
    });
    buildPlanningItems().slice(0, 3).forEach((item, index) => {
      notices.push({
        unread: index === 0,
        icon: '📅',
        variant: 'blue',
        title: `Planning: ${item.time} · Commande #${item.id}`,
        desc: `${item.from} → ${item.to} · ${item.action}`,
        time: item.dateLabel,
        target: 'transportPlanningPage'
      });
    });
    if (state.profile && state.completion < 75) {
      notices.push({
        unread: true,
        icon: '👤',
        variant: 'red',
        title: 'Profil transporteur incomplet',
        desc: 'Complétez les informations du véhicule pour améliorer la validation des missions.',
        time: 'Aujourd\'hui',
        target: 'transportProfilPage'
      });
    }
    (state.historique || []).slice(0, 3).forEach((cmd) => {
      notices.push({
        unread: false,
        icon: '✅',
        variant: 'green',
        title: `Livraison terminée #${cmd.id}`,
        desc: `Commande livrée ou clôturée pour ${cmd.acheteur || 'client'}.`,
        time: formatShortDate(cmd.date_creation),
        target: 'transportHistoriquePage'
      });
    });
    state.notifications = notices;
    return notices;
  }

  function updateNotificationBadge() {
    const notices = buildNotifications();
    const unread = notices.filter((item) => item.unread).length;
    $$('.transport-notification-count').forEach((badge) => {
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.style.display = unread ? 'grid' : 'none';
    });
  }

  async function loadNotifications() {
    const page = document.getElementById('transportNotificationsPage');
    if (!page) return;
    page.innerHTML = `
      <header class="transport-page-header">
        <h1>Notifications</h1>
        <p>Alertes liées aux missions, livraisons et profil transporteur.</p>
      </header>
      <div class="transport-cards-list" id="transportNotificationsContainer">
        <div class="transport-panel" style="padding:24px;text-align:center;color:var(--muted);">
          <i class="fa-solid fa-spinner fa-spin"></i> Chargement...
        </div>
      </div>
    `;
    await refreshNotificationSources();
    updateNotificationBadge();
    const notices = state.notifications || [];
    const container = document.getElementById('transportNotificationsContainer');
    if (!container) return;
    if (!notices.length) {
      container.innerHTML = `
        <div class="transport-panel" style="padding:32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🔔</div>
          <h3>Aucune notification</h3>
          <p style="color:var(--muted);">Les nouvelles missions et livraisons apparaîtront ici.</p>
        </div>
      `;
      return;
    }
    container.innerHTML = notices.map((item) => `
      <button class="transport-notification-item ${item.unread ? 'unread' : ''}" type="button" data-target="${escapeHtml(item.target)}">
        <span class="transport-notification-icon ${escapeHtml(item.variant)}">${escapeHtml(item.icon)}</span>
        <span class="transport-notification-content">
          <strong>${escapeHtml(item.title)}</strong>
          <em>${escapeHtml(item.desc)}</em>
        </span>
        <span class="transport-notification-time">${escapeHtml(item.time)}</span>
      </button>
    `).join('');
    container.querySelectorAll('[data-target]').forEach((item) => {
      item.addEventListener('click', () => setActivePage(item.dataset.target || 'transportDashboardPage'));
    });
  }

  // ─── PROFIL SAVE / PASSWORD ───────────────────────────────────────────────

  async function loadProfile() {
    const { ok, data } = await apiFetch('/api/profile/');
    if (!ok || !data.success) throw new Error(data.error || 'Impossible de charger le profil.');
    applyProfileToUi(data.profile);
    await renderDashboard(data.profile);
  }

  async function saveProfile() {
    const fullName = document.getElementById('transportFullName')?.value || '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const first_name = parts.shift() || '';
    const last_name = parts.join(' ');
    const payload = {
      first_name,
      last_name,
      email: document.getElementById('transportEmail')?.value || '',
      phone: document.getElementById('transportPhone')?.value || '',
      wilaya: document.getElementById('transportWilaya')?.value || '',
      vehicle_name: document.getElementById('transportVehicleType')?.value || '',
      plate: document.getElementById('transportPlate')?.value || '',
      capacity: document.getElementById('transportCapacity')?.value || '',
      condition: document.getElementById('transportCondition')?.value || '',
    };
    const { ok, data } = await apiFetch('/api/profile/', { method: 'POST', body: JSON.stringify(payload) });
    if (!ok || !data.success) throw new Error(data.error || 'Impossible de sauvegarder le profil.');
    applyProfileToUi(data.profile);
    await renderDashboard(data.profile);
    showNotification('Profil transporteur mis à jour.');
  }

  async function changePassword() {
    const { ok, data } = await apiFetch('/api/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        current_password: document.getElementById('transportPasswordCurrent')?.value || '',
        new_password: document.getElementById('transportPasswordNew')?.value || '',
        confirm_password: document.getElementById('transportPasswordConfirm')?.value || '',
      })
    });
    if (!ok || !data.success) throw new Error(data.error || 'Impossible de changer le mot de passe.');
    ['transportPasswordCurrent', 'transportPasswordNew', 'transportPasswordConfirm'].forEach((id) => {
      const field = document.getElementById(id); if (field) field.value = '';
    });
    showNotification('Mot de passe modifié avec succès.');
  }

  // ─── FILTRES DASHBOARD ────────────────────────────────────────────────────

  function filterDashboardRows() {
    const query = String(dashboardWilayaInput?.value || '').toLowerCase().trim();
    const selected = String(dashboardWilayaSelect?.value || '').toLowerCase().trim();
    $$('#transportDashboardPage tbody tr').forEach((row) => {
      const text = row.textContent.toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const matchesSelect = !selected || selected === 'toutes les wilayas' || text.includes(selected);
      row.style.display = matchesQuery && matchesSelect ? '' : 'none';
    });
  }

  // ─── EVENTS ───────────────────────────────────────────────────────────────

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setActivePage(link.getAttribute('data-page'));
    });
  });

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
      applyTheme(nextTheme);
      localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
    });
  }

  dashboardSearch?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const query = String(dashboardSearch.value || '').trim().toLowerCase();
    if (!query) return;
    const match = pages.find((page) => page.textContent.toLowerCase().includes(query));
    if (match) { setActivePage(match.id); showNotification('Section trouvée.', 'info'); }
    else showNotification('Aucun résultat trouvé.', 'error');
  });

  dashboardWilayaInput?.addEventListener('input', filterDashboardRows);
  dashboardWilayaSelect?.addEventListener('change', filterDashboardRows);

  notificationBtn?.addEventListener('click', () => setActivePage('transportNotificationsPage'));

  document.getElementById('transportSaveProfileBtn')?.addEventListener('click', async () => {
    try { await saveProfile(); } catch (error) { showNotification(error.message || 'Erreur profil', 'error'); }
  });

  document.getElementById('transportChangePasswordBtn')?.addEventListener('click', async () => {
    try { await changePassword(); } catch (error) { showNotification(error.message || 'Erreur mot de passe', 'error'); }
  });

  // ─── INITIALISATION ───────────────────────────────────────────────────────

  (async () => {
    if (!(await ensureSessionRole())) return;
    applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || 'light');
    let savedPage = localStorage.getItem(STORAGE_KEYS.activePage) || 'transportDashboardPage';
    if (!document.getElementById(savedPage)) savedPage = 'transportDashboardPage';
    setActivePage(savedPage);
    try {
      await loadProfile();
      // Si on est sur missions/livraisons/historique au chargement, charger les données
      if (savedPage === 'transportMissionsPage') await loadMissions();
      if (savedPage === 'transportLivraisonsPage') await loadLivraisons();
      if (savedPage === 'transportPlanningPage') await loadPlanningLivraisons();
      if (savedPage === 'transportNotificationsPage') await loadNotifications();
      if (savedPage === 'transportHistoriquePage') await loadHistorique();
      refreshNotificationSources().then(updateNotificationBadge);
    } catch (error) {
      console.error(error);
      showNotification(error.message || 'Erreur de chargement.', 'error');
    }
  })();
});