/* ═══════════════════════════════════════════════════════════════
   AgriGov Transporteur — JS Avancé v2.0
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  /* ── Helpers ─────────────────────────────────────────────── */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => `${Number(v || 0).toLocaleString('fr-DZ')} DA`;
  const fmt = v => v ? String(v).replace('T',' ').slice(0,16) : '—';

  function getCsrf() {
    const m = document.cookie.split('; ').find(r => r.startsWith('csrftoken='));
    return m ? decodeURIComponent(m.split('=')[1]) : '';
  }

  async function api(url, opts = {}) {
    const r = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        ...(opts.method && opts.method !== 'GET' ? { 'X-CSRFToken': getCsrf() } : {}),
        ...(opts.headers || {})
      }, ...opts
    });
    let data;
    try { data = await r.json(); } catch { data = { success: false, error: 'Réponse invalide' }; }
    return { ok: r.ok, status: r.status, data };
  }

  function toast(msg, type = 'success') {
    const wrap = document.getElementById('tpToastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'tp-toast';
    el.style.background = type === 'error' ? '#dc2626' : type === 'info' ? '#2563eb' : '#16a34a';
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; setTimeout(() => el.remove(), 300); }, 2800);
  }

  function badge(statut) {
    const MAP = {
      confirmee: ['orange', '📦 Confirmée'],
      en_preparation: ['blue', '⚙️ En préparation'],
      expediee: ['blue', '🚚 Expédiée'],
      livree: ['green', '✅ Livrée'],
      annulee: ['red', '❌ Annulée'],
      en_attente: ['orange', '⏳ En attente'],
    };
    const [cls, label] = MAP[statut] || ['gray', esc(statut)];
    return `<span class="tp-badge tp-badge-${cls}">${label}</span>`;
  }

  function loadingState(containerId, msg = 'Chargement...') {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="tp-loading-state"><i class="fa-solid fa-spinner fa-spin"></i> ${msg}</div>`;
  }

  function emptyState(containerId, icon, title, subtitle = '') {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="tp-empty-state"><i class="fa-solid fa-${icon}"></i><p><strong>${title}</strong>${subtitle ? `<br><span style="font-size:.82rem">${subtitle}</span>` : ''}</p></div>`;
  }

  /* ── State ──────────────────────────────────────────────── */
  const state = {
    profile: null,
    missions: [],
    livraisons: [],
    historique: [],
    notifications: [],
    completion: 0,
    mapInstance: null,
    mapMarkers: [],
    chartInstance: null,
  };
  window._tpState = state;  // expose for GPS real-time tracking

  /* ── Session check ──────────────────────────────────────── */
  async function checkSession() {
    try {
      const { ok, data } = await api('/api/session-info/');
      if (!ok || data.role !== 'transporteur') {
        toast('Session expirée. Redirection...', 'error');
        setTimeout(() => window.location.href = data?.dashboard_url || '/login/', 800);
        return false;
      }
      return true;
    } catch { return false; }
  }

  /* ── Navigation ─────────────────────────────────────────── */
  const PAGE_TITLES = {
    tpDashboardPage: ['Tableau de bord', "Bienvenue dans votre espace transporteur AgriGov"],
    tpMissionsPage: ['Missions disponibles', "Commandes confirmées en attente d'un transporteur"],
    tpLivraisonsPage: ['Mes livraisons', "Commandes que vous êtes en train de livrer"],
    tpPlanningPage: ['Planning livraisons', "Agenda dynamique de vos missions et livraisons"],
    tpCartePage: ['Carte en temps réel', "Visualisez vos trajets sur la carte interactive"],
    tpNotificationsPage: ['Notifications', "Alertes missions, livraisons et profil"],
    tpHistoriquePage: ['Historique', "Toutes vos livraisons passées"],
    tpProfilPage: ['Mon profil', "Informations personnelles et véhicule"],
  };

  function setPage(pageId) {
    $$('.tp-page').forEach(p => { p.classList.toggle('active', p.id === pageId); });
    $$('.tp-nav-link').forEach(l => { l.classList.toggle('active', l.getAttribute('data-page') === pageId); });

    const [title, subtitle] = PAGE_TITLES[pageId] || ['—', ''];
    const t = document.getElementById('tpPageTitle');
    const s = document.getElementById('tpPageSubtitle');
    if (t) t.textContent = title;
    if (s) s.textContent = subtitle;

    if (window.location.hash !== '#' + pageId) history.replaceState(null, '', '#' + pageId);

    // Load on demand
    if (pageId === 'tpMissionsPage') loadMissions();
    if (pageId === 'tpLivraisonsPage') loadLivraisons();
    if (pageId === 'tpPlanningPage') loadPlanning();
    if (pageId === 'tpCartePage') loadCarte();
    if (pageId === 'tpNotificationsPage') loadNotifications();
    if (pageId === 'tpHistoriquePage') loadHistorique();

    // Close sidebar on mobile
    if (window.innerWidth < 900) document.getElementById('tpSidebar')?.classList.remove('open');
  }

  // Sidebar toggle
  document.getElementById('tpHamburger')?.addEventListener('click', () => document.getElementById('tpSidebar')?.classList.toggle('open'));
  document.getElementById('tpSidebarClose')?.addEventListener('click', () => document.getElementById('tpSidebar')?.classList.remove('open'));

  // Nav links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.tp-nav-link[data-page]');
    if (link) { e.preventDefault(); setPage(link.getAttribute('data-page')); return; }
    const gotoBtn = e.target.closest('[data-goto]');
    if (gotoBtn) { setPage(gotoBtn.getAttribute('data-goto')); }
  }, true);

  window.addEventListener('hashchange', () => {
    const pg = (window.location.hash || '').replace('#', '');
    if (pg && document.getElementById(pg)) setPage(pg);
  });

  /* ── Theme ──────────────────────────────────────────────── */
  function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    const icon = document.getElementById('tpThemeIcon');
    if (icon) { icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'; }
    localStorage.setItem('tp_theme', theme);
  }

  document.getElementById('tpThemeBtn')?.addEventListener('click', () => {
    applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
  });

  /* ── Profile ────────────────────────────────────────────── */
  function calcCompletion(p) {
    const fields = [p?.full_name, p?.email, p?.phone, p?.wilaya || p?.city, p?.vehicle_name, p?.plate, p?.capacity, p?.condition];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }

  function applyProfileToUI(p) {
    state.profile = p;
    state.completion = calcCompletion(p);
    const name = p?.full_name || 'Transporteur';
    const initials = name[0]?.toUpperCase() || 'T';
    const inlineSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%231f6f43"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="42" fill="%23fff">${initials}</text></svg>`;
    const avatarSrc = p?.profile_photo_url || inlineSvg;

    ['tpSidebarAvatar','tpTopbarAvatar','tpProfilAvatar'].forEach(id => { const el = document.getElementById(id); if (el) el.src = avatarSrc; });
    ['tpSidebarName','tpTopbarName','tpProfilName'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = name; });
    const sideRole = document.getElementById('tpSidebarRole'); if (sideRole) sideRole.textContent = 'Transporteur vérifié';

    // Completion bars
    const pct = state.completion + '%';
    const fill1 = document.getElementById('tpCompletionFill'); if (fill1) fill1.style.width = pct;
    const fill2 = document.getElementById('tpProfilProgressFill'); if (fill2) fill2.style.width = pct;
    const lbl1 = document.getElementById('tpCompletionLabel'); if (lbl1) lbl1.textContent = `Profil : ${pct}`;
    const lbl2 = document.getElementById('tpProfilCompletion'); if (lbl2) lbl2.textContent = pct;

    // Profil form
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('transportFullName', name);
    set('transportEmail', p?.email);
    set('transportPhone', p?.phone);
    set('transportWilaya', p?.wilaya || p?.city);
    set('transportVehicleType', p?.vehicle_name);
    set('transportPlate', p?.plate);
    set('transportCapacity', p?.capacity);
    const cond = document.getElementById('transportCondition');
    if (cond && p?.condition) cond.value = p.condition;
  }

  async function loadProfile() {
    const { ok, data } = await api('/api/profile/');
    if (!ok || !data.success) throw new Error(data.error || 'Erreur profil');
    applyProfileToUI(data.profile);
  }

  /* ── Dashboard ──────────────────────────────────────────── */
  async function loadDashboard() {
    // KPIs from livraison stats
    let missions = 0, enCours = 0, livrees = 0;
    try {
      const { ok, data } = await api('/livraison/stats/');
      if (ok && data.success) {
        missions = data.stats.missions_disponibles || 0;
        enCours = data.stats.en_cours || 0;
        livrees = data.stats.livrees || 0;
      }
    } catch (_) {}

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('kpiMissions', missions);
    set('kpiMissionsLabel', missions ? `${missions} commande(s) disponible(s)` : 'Aucune mission disponible');
    set('kpiEnCours', enCours);
    set('kpiEnCoursLabel', enCours ? `${enCours} livraison(s) en route` : 'Aucune en cours');
    set('kpiLivrees', livrees);
    set('kpiLivreesLabel', `Total cumulé`);
    set('kpiProfil', state.completion + '%');
    set('kpiProfilLabel', state.completion >= 75 ? 'Profil bien complété ✓' : 'À compléter');

    // Summary
    set('sumMissions', missions);
    set('sumEnCours', enCours);
    set('sumLivrees', livrees);
    set('sumVehicle', state.profile?.vehicle_name || '—');
    set('sumZone', state.profile?.wilaya || state.profile?.city || '—');
    set('sumProfil', state.completion + '%');

    // Profil stats
    set('profStatMissions', missions);
    set('profStatLivrees', livrees);
    set('profStatEncours', enCours);

    // Badge missions nav
    const mb = document.getElementById('tpMissionsBadge');
    if (mb) { mb.textContent = missions; mb.style.display = missions ? 'inline-flex' : 'none'; }
    const lb = document.getElementById('tpLivraisonsBadge');
    if (lb) { lb.textContent = enCours; lb.style.display = enCours ? 'inline-flex' : 'none'; }

    // Dashboard table
    await renderDashTable();

    // Planning preview
    renderDashPlanning();

    // Chart
    renderActivityChart();
  }

  async function renderDashTable() {
    const tbody = document.getElementById('tpDashTable');
    if (!tbody) return;
    try {
      const { ok, data } = await api('/livraison/historique/');
      const items = (ok && data.success) ? (data.commandes || []).slice(0, 5) : [];
      if (!items.length) { tbody.innerHTML = `<tr><td colspan="5" class="tp-table-empty">Aucune commande récente</td></tr>`; return; }
      tbody.innerHTML = items.map(c => `
        <tr>
          <td><strong>#${esc(String(c.id))}</strong></td>
          <td>${esc(c.acheteur || '—')}</td>
          <td>${esc(c.lieu_destination || '—')}</td>
          <td>${badge(c.statut)}</td>
          <td>${money(c.prix_course || c.prix_estime || 0)}</td>
        </tr>
      `).join('');
    } catch { tbody.innerHTML = `<tr><td colspan="5" class="tp-table-empty">Erreur de chargement</td></tr>`; }
  }

  function renderDashPlanning() {
    const container = document.getElementById('tpDashPlanning');
    if (!container) return;
    const items = buildPlanningItems().slice(0, 4);
    if (!items.length) {
      container.innerHTML = `<div class="tp-empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>Aucune livraison planifiée</p></div>`;
      return;
    }
    container.innerHTML = items.map(item => `
      <div class="tp-dash-plan-item">
        <span class="tp-dash-plan-time">${item.timeStr}</span>
        <div class="tp-dash-plan-info">
          <strong>${item.icon} Cde #${esc(String(item.id))}</strong>
          <span>${esc(item.from)} → ${esc(item.to)}</span>
        </div>
        ${badge(item.status)}
      </div>
    `).join('');
  }

  function renderActivityChart() {
    const canvas = document.getElementById('tpActivityChart');
    if (!canvas || !window.Chart) return;
    if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }

    const dark = document.body.classList.contains('dark-mode');
    const textColor = dark ? '#94a3b8' : '#64748b';
    const gridColor = dark ? 'rgba(148,163,184,.1)' : 'rgba(0,0,0,.06)';

    const days = 7;
    const labels = [];
    const dataMissions = [];
    const dataLivrees = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
      // Simulated data based on real state
      const missionBase = state.missions.length;
      const livraisonsBase = state.livraisons.length;
      dataMissions.push(Math.max(0, missionBase + Math.round((Math.random() - 0.4) * 3)));
      dataLivrees.push(Math.max(0, livraisonsBase + Math.round((Math.random() - 0.3) * 2)));
    }

    state.chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Missions', data: dataMissions, backgroundColor: 'rgba(245,158,11,.7)', borderRadius: 6, borderSkipped: false },
          { label: 'Livrées', data: dataLivrees, backgroundColor: 'rgba(34,197,94,.7)', borderRadius: 6, borderSkipped: false },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor, font: { size: 12 } } } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: textColor, precision: 0 }, grid: { color: gridColor } }
        }
      }
    });
  }

  // Chart tabs
  document.getElementById('tpChartTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-range]');
    if (!btn) return;
    $$('#tpChartTabs button').forEach(b => b.classList.toggle('active', b === btn));
    if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }
    renderActivityChart();
  });
  document.getElementById('tpRefreshPlanning')?.addEventListener('click', renderDashPlanning);

  /* ── Missions ───────────────────────────────────────────── */
  async function loadMissions() {
    loadingState('tpMissionsGrid', 'Chargement des missions...');
    try {
      const { ok, data } = await api('/livraison/missions/');
      if (!ok || !data.success) throw new Error(data.error || 'Erreur');
      state.missions = data.commandes || [];
      renderMissions();
      // populate wilaya filter
      const wilayas = [...new Set(state.missions.map(c => c.lieu_depart || '').filter(Boolean))];
      const sel = document.getElementById('tpMissionsWilayaFilter');
      if (sel) {
        sel.innerHTML = `<option value="">Toutes les wilayas</option>` + wilayas.map(w => `<option value="${esc(w)}">${esc(w)}</option>`).join('');
      }
    } catch (err) {
      document.getElementById('tpMissionsGrid').innerHTML = `<div class="tp-empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Erreur : ${esc(err.message)}</p></div>`;
    }
  }

  function renderMissions() {
    const grid = document.getElementById('tpMissionsGrid');
    if (!grid) return;
    const q = (document.getElementById('tpMissionsSearch')?.value || '').toLowerCase();
    const wilaya = document.getElementById('tpMissionsWilayaFilter')?.value || '';
    const items = state.missions.filter(c => {
      const txt = `${c.acheteur} ${c.agriculteur} ${c.lieu_depart} ${c.lieu_destination}`.toLowerCase();
      return (!q || txt.includes(q)) && (!wilaya || c.lieu_depart === wilaya);
    });

    if (!items.length) { grid.innerHTML = `<div class="tp-empty-state" style="grid-column:1/-1"><i class="fa-solid fa-box-open"></i><p><strong>Aucune mission disponible</strong><br><span>Revenez plus tard</span></p></div>`; return; }

    grid.innerHTML = items.map(c => {
      const prixCourse = c.prix_course || c.prix_estime || 0;
      return `
      <div class="tp-mission-card">
        <div class="tp-card-head">
          <h3>📦 Mission #${esc(String(c.id))}</h3>
          ${badge(c.statut)}
        </div>

        <!-- PRIX DE COURSE mis en avant -->
        <div style="background:linear-gradient(135deg,#0d3b1e,#1a5c30);border-radius:12px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
          <span style="color:rgba(255,255,255,0.8);font-size:.82rem;font-weight:600;">💰 Prix de course</span>
          <strong style="color:#4ade80;font-size:1.15rem;">${money(prixCourse)}</strong>
        </div>

        <div class="tp-card-info">
          <p><i class="fa-solid fa-location-dot"></i><span><strong>Départ :</strong> ${esc(c.lieu_depart || '—')}</span></p>
          <p><i class="fa-solid fa-flag-checkered"></i><span><strong>Destination :</strong> ${esc(c.lieu_destination || '—')}</span></p>
          ${c.distance_km ? `<p><i class="fa-solid fa-road"></i><span><strong>Distance :</strong> ${c.distance_km} km</span></p>` : ''}
        </div>

        <!-- Contacts -->
        <div style="border-top:1px solid var(--tp-border);padding-top:10px;margin-top:4px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:var(--tp-surface2,rgba(0,0,0,.05));border-radius:10px;padding:10px 12px;">
            <div style="font-size:.72rem;color:var(--tp-muted);margin-bottom:3px;">🧑‍🌾 Agriculteur</div>
            <div style="font-size:.85rem;font-weight:600;color:var(--tp-text)">${esc(c.agriculteur || '—')}</div>
            ${c.agriculteur_phone ? `<a href="tel:${esc(c.agriculteur_phone)}" style="font-size:.78rem;color:#16a34a;font-weight:600;text-decoration:none;">📞 ${esc(c.agriculteur_phone)}</a>` : ''}
          </div>
          <div style="background:var(--tp-surface2,rgba(0,0,0,.05));border-radius:10px;padding:10px 12px;">
            <div style="font-size:.72rem;color:var(--tp-muted);margin-bottom:3px;">🛒 Acheteur</div>
            <div style="font-size:.85rem;font-weight:600;color:var(--tp-text)">${esc(c.acheteur || '—')}</div>
            ${c.acheteur_phone ? `<a href="tel:${esc(c.acheteur_phone)}" style="font-size:.78rem;color:#2563eb;font-weight:600;text-decoration:none;">📞 ${esc(c.acheteur_phone)}</a>` : ''}
          </div>
        </div>

        ${c.lignes?.length ? `<div class="tp-card-products" style="margin-top:10px">${c.lignes.map(l => `<div class="tp-product-line"><span>🌿 ${esc(l.produit)}</span><span>${l.quantite} kg</span></div>`).join('')}</div>` : ''}
        ${c.note ? `<p style="font-size:.82rem;font-style:italic;color:var(--tp-muted);margin-top:6px;">📝 ${esc(c.note)}</p>` : ''}

        <div class="tp-card-actions" style="margin-top:12px">
          <button class="tp-btn tp-btn-primary btn-accepter" data-id="${c.id}" style="flex:1"><i class="fa-solid fa-check"></i> Accepter — ${money(prixCourse)}</button>
          <button class="tp-btn tp-btn-outline btn-voir-detail" data-id="${c.id}" title="Voir le détail"><i class="fa-solid fa-eye"></i></button>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.btn-accepter').forEach(btn => btn.addEventListener('click', () => accepterMission(Number(btn.dataset.id), btn)));
    grid.querySelectorAll('.btn-voir-detail').forEach(btn => btn.addEventListener('click', () => openOrderModal(Number(btn.dataset.id), state.missions)));
  }

  async function accepterMission(id, btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traitement...';
    try {
      const { ok, data } = await api(`/livraison/missions/${id}/accepter/`, { method: 'POST', body: '{}' });
      if (!ok || !data.success) throw new Error(data.error || 'Erreur');
      toast('✅ Mission acceptée ! La commande est expédiée.', 'success');
      await loadMissions();
      await loadDashboard();
      buildAndShowNotifBadge();
    } catch (err) {
      toast(err.message || 'Erreur', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Accepter la mission';
    }
  }

  document.getElementById('tpMissionsSearch')?.addEventListener('input', renderMissions);
  document.getElementById('tpMissionsWilayaFilter')?.addEventListener('change', renderMissions);
  document.getElementById('tpRefreshMissions')?.addEventListener('click', loadMissions);

  /* ── Livraisons ─────────────────────────────────────────── */
  async function loadLivraisons() {
    loadingState('tpLivraisonsGrid', 'Chargement des livraisons...');
    try {
      const { ok, data } = await api('/livraison/livraisons/');
      if (!ok || !data.success) throw new Error(data.error || 'Erreur');
      state.livraisons = data.commandes || [];
      renderLivraisons();
    } catch (err) {
      document.getElementById('tpLivraisonsGrid').innerHTML = `<div class="tp-empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${esc(err.message)}</p></div>`;
    }
  }

  function renderLivraisons() {
    const grid = document.getElementById('tpLivraisonsGrid');
    if (!grid) return;
    const filter = document.getElementById('tpLivraisonsFilter')?.value || 'all';
    const items = state.livraisons.filter(c => filter === 'all' || c.statut === filter);

    if (!items.length) { grid.innerHTML = `<div class="tp-empty-state" style="grid-column:1/-1"><i class="fa-solid fa-truck-fast"></i><p><strong>Aucune livraison en cours</strong><br><span>Acceptez une mission pour démarrer</span></p></div>`; return; }

    grid.innerHTML = items.map(c => {
      const prixCourse = c.prix_course || c.prix_estime || 0;
      const progress = c.statut === 'livree' ? 100 : c.statut === 'expediee' ? 60 : 30;
      return `
        <div class="tp-livraison-card">
          <div class="tp-card-head">
            <h3>🚚 Livraison #${esc(String(c.id))}</h3>
            ${badge(c.statut)}
          </div>

          <!-- PRIX DE COURSE mis en avant -->
          <div style="background:linear-gradient(135deg,#0d3b1e,#1a5c30);border-radius:12px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
            <span style="color:rgba(255,255,255,0.8);font-size:.8rem;font-weight:600;">💰 Votre rémunération</span>
            <strong style="color:#4ade80;font-size:1.1rem;">${money(prixCourse)}</strong>
          </div>

          <div class="tp-card-info">
            <p><i class="fa-solid fa-location-dot"></i><span><strong>De :</strong> ${esc(c.lieu_depart || '—')}</span></p>
            <p><i class="fa-solid fa-flag-checkered"></i><span><strong>Vers :</strong> ${esc(c.lieu_destination || '—')}</span></p>
            ${c.distance_km ? `<p><i class="fa-solid fa-road"></i><span><strong>Distance :</strong> ${c.distance_km} km</span></p>` : ''}
          </div>

          <!-- Contacts -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;">
            <div style="background:var(--tp-surface2,rgba(0,0,0,.05));border-radius:10px;padding:9px 11px;">
              <div style="font-size:.7rem;color:var(--tp-muted);margin-bottom:2px;">🧑‍🌾 Agriculteur</div>
              <div style="font-size:.84rem;font-weight:600;color:var(--tp-text)">${esc(c.agriculteur || '—')}</div>
              ${c.agriculteur_phone ? `<a href="tel:${esc(c.agriculteur_phone)}" style="font-size:.76rem;color:#16a34a;font-weight:600;text-decoration:none;">📞 ${esc(c.agriculteur_phone)}</a>` : ''}
            </div>
            <div style="background:var(--tp-surface2,rgba(0,0,0,.05));border-radius:10px;padding:9px 11px;">
              <div style="font-size:.7rem;color:var(--tp-muted);margin-bottom:2px;">🛒 Acheteur</div>
              <div style="font-size:.84rem;font-weight:600;color:var(--tp-text)">${esc(c.acheteur || '—')}</div>
              ${c.acheteur_phone ? `<a href="tel:${esc(c.acheteur_phone)}" style="font-size:.76rem;color:#2563eb;font-weight:600;text-decoration:none;">📞 ${esc(c.acheteur_phone)}</a>` : ''}
            </div>
          </div>

          ${c.lignes?.length ? `<div class="tp-card-products">${c.lignes.map(l => `<div class="tp-product-line"><span>🌿 ${esc(l.produit)}</span><span>${l.quantite} kg</span></div>`).join('')}</div>` : ''}
          <div class="tp-progress-section">
            <div class="tp-progress-label"><span>Progression livraison</span><span>${progress}%</span></div>
            <div class="tp-progress-bar"><div class="tp-progress-fill" style="width:${progress}%"></div></div>
          </div>
          <div class="tp-card-actions" style="margin-top:10px">
            ${c.statut !== 'livree'
              ? `<button class="tp-btn tp-btn-primary btn-livree" data-id="${c.id}" style="flex:1"><i class="fa-solid fa-circle-check"></i> Marquer livrée</button>`
              : `<span class="tp-badge tp-badge-green">✅ Déjà livrée</span>`}
            <button class="tp-btn tp-btn-outline btn-voir-detail" data-id="${c.id}" title="Voir détail"><i class="fa-solid fa-eye"></i></button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-livree').forEach(btn => btn.addEventListener('click', () => marquerLivree(Number(btn.dataset.id), btn)));
    grid.querySelectorAll('.btn-voir-detail').forEach(btn => btn.addEventListener('click', () => openOrderModal(Number(btn.dataset.id), state.livraisons)));
  }

  async function marquerLivree(id, btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirmation...';
    try {
      const { ok, data } = await api(`/livraison/livraisons/${id}/livree/`, { method: 'POST', body: '{}' });
      if (!ok || !data.success) throw new Error(data.error || 'Erreur');
      toast('✅ Livraison confirmée !', 'success');
      await loadLivraisons();
      await loadDashboard();
      buildAndShowNotifBadge();
    } catch (err) {
      toast(err.message || 'Erreur', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Marquer comme livrée';
    }
  }

  document.getElementById('tpLivraisonsFilter')?.addEventListener('change', renderLivraisons);
  document.getElementById('tpRefreshLivraisons')?.addEventListener('click', loadLivraisons);

  /* ── Planning ───────────────────────────────────────────── */
  function toDate(val, offsetH = 0) {
    const d = val ? new Date(String(val).replace(' ', 'T')) : new Date();
    if (isNaN(d.getTime())) return new Date();
    if (offsetH) d.setHours(d.getHours() + offsetH);
    return d;
  }

  function dateLabel(d) {
    const today = new Date();
    const tom = new Date(); tom.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === tom.toDateString()) return 'Demain';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  function buildPlanningItems() {
    const items = [];
    (state.livraisons || []).forEach((c, i) => {
      const d = toDate(c.date_livraison || c.date_creation, i * 2);
      items.push({ id: c.id, type: 'livraison', icon: '🚚', status: c.statut, date: d, dateLabel: dateLabel(d), timeStr: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), from: c.lieu_depart || '—', to: c.lieu_destination || '—', acheteur: c.acheteur || '—', agriculteur: c.agriculteur || '—', total: c.total, prixCourse: c.prix_course || c.prix_estime || 0, lignes: c.lignes || [] });
    });
    (state.missions || []).forEach((c, i) => {
      const d = toDate(c.date_creation, 4 + i * 2);
      items.push({ id: c.id, type: 'mission', icon: '📦', status: c.statut, date: d, dateLabel: dateLabel(d), timeStr: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), from: c.lieu_depart || '—', to: c.lieu_destination || '—', acheteur: c.acheteur || '—', agriculteur: c.agriculteur || '—', total: c.total, prixCourse: c.prix_course || c.prix_estime || 0, lignes: c.lignes || [] });
    });
    return items.sort((a, b) => a.date - b.date);
  }

  async function loadPlanning() {
    const container = document.getElementById('tpPlanningTimeline');
    if (!container) return;
    container.innerHTML = `<div class="tp-loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Construction du planning...</div>`;

    if (!state.missions.length && !state.livraisons.length) {
      await Promise.all([loadMissions(), loadLivraisons()]).catch(() => {});
    }

    renderPlanning();

    document.getElementById('tpPlanningSearch')?.addEventListener('input', renderPlanning);
    document.getElementById('tpPlanningFilter')?.addEventListener('change', renderPlanning);
  }

  function renderPlanning() {
    const container = document.getElementById('tpPlanningTimeline');
    if (!container) return;
    const q = (document.getElementById('tpPlanningSearch')?.value || '').toLowerCase();
    const filter = document.getElementById('tpPlanningFilter')?.value || 'all';

    const items = buildPlanningItems().filter(item => {
      const txt = `${item.from} ${item.to} ${item.acheteur} ${item.agriculteur}`.toLowerCase();
      return (!q || txt.includes(q)) && (filter === 'all' || item.type === filter);
    });

    if (!items.length) {
      container.innerHTML = `<div class="tp-empty-state"><i class="fa-solid fa-calendar-xmark"></i><p><strong>Aucun élément dans le planning</strong><br><span>Acceptez des missions pour les voir ici</span></p></div>`;
      return;
    }

    const groups = {};
    items.forEach(item => { (groups[item.dateLabel] = groups[item.dateLabel] || []).push(item); });

    container.innerHTML = Object.entries(groups).map(([label, group]) => `
      <div class="tp-timeline-day">
        <h4>${esc(label)} <span class="tp-badge tp-badge-gray">${group.length} tâche(s)</span></h4>
        <div class="tp-timeline-items">
          ${group.map(item => `
            <div class="tp-timeline-item ${item.type === 'mission' ? 'tp-tl-orange' : 'tp-tl-blue'}">
              <span class="tp-tl-time">${esc(item.timeStr)}</span>
              <div class="tp-tl-content">
                <strong>${item.icon} Commande #${esc(String(item.id))} · ${item.type === 'mission' ? 'Mission disponible' : 'Livraison en cours'}</strong>
                <p>🚩 ${esc(item.from)} → 📍 ${esc(item.to)}</p>
                <p>👤 ${esc(item.acheteur)} · 💰 Course: ${money(item.prixCourse)}</p>
                <div class="tp-tl-actions">
                  <button class="tp-btn tp-btn-outline" style="padding:6px 12px;font-size:.8rem" data-goto="${item.type === 'mission' ? 'tpMissionsPage' : 'tpLivraisonsPage'}">
                    <i class="fa-solid fa-arrow-right"></i> Ouvrir la section
                  </button>
                  <button class="tp-btn tp-btn-outline btn-voir-detail" data-id="${item.id}" data-type="${item.type}" style="padding:6px 12px;font-size:.8rem">
                    <i class="fa-solid fa-eye"></i> Détails
                  </button>
                </div>
              </div>
              ${badge(item.status)}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-voir-detail').forEach(btn => {
      btn.addEventListener('click', () => openOrderModal(Number(btn.dataset.id), btn.dataset.type === 'mission' ? state.missions : state.livraisons));
    });
  }

  /* ── Carte Leaflet ──────────────────────────────────────── */
  async function loadCarte() {
    if (!state.missions.length && !state.livraisons.length) {
      await Promise.all([loadMissions(), loadLivraisons()]).catch(() => {});
    }
    renderCarte();
    document.getElementById('tpCarteFilter')?.addEventListener('change', renderCarte);
    document.getElementById('tpCarteRefresh')?.addEventListener('click', async () => {
      await Promise.all([loadMissions(), loadLivraisons()]);
      renderCarte();
    });
  }

  const ALGERIA_COORDS = {
    'Alger': [36.737, 3.086], 'Oran': [35.696, -0.633], 'Constantine': [36.365, 6.614],
    'Annaba': [36.897, 7.765], 'Blida': [36.47, 2.827], 'Sétif': [36.191, 5.415],
    'Batna': [35.556, 6.174], 'Béjaïa': [36.752, 5.056], 'Tlemcen': [34.878, -1.314],
    'Biskra': [34.85, 5.728], 'Djelfa': [34.671, 3.263], 'Jijel': [36.82, 5.766],
    'Skikda': [36.878, 6.906], 'Sidi Bel Abbès': [35.189, -0.636], 'Tiaret': [35.37, 1.321],
    'Médéa': [36.264, 2.75], 'Mostaganem': [35.928, 0.089], 'M\'Sila': [35.704, 4.538],
    'Mascara': [35.4, 0.14], 'Ouargla': [31.949, 5.325], 'Tizi Ouzou': [36.712, 4.045],
  };

  function getCoords(placeName) {
    if (!placeName) return null;
    const key = Object.keys(ALGERIA_COORDS).find(k => placeName.toLowerCase().includes(k.toLowerCase()));
    return key ? ALGERIA_COORDS[key] : null;
  }

  function renderCarte() {
    if (!window.L) return;
    const mapEl = document.getElementById('tpLeafletMap');
    if (!mapEl) return;
    const filter = document.getElementById('tpCarteFilter')?.value || 'all';

    if (!state.mapInstance) {
      state.mapInstance = L.map('tpLeafletMap', { center: [36.5, 3], zoom: 6 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(state.mapInstance);
    } else {
      state.mapMarkers.forEach(m => m.remove());
      state.mapMarkers = [];
    }

    const allItems = [];
    if (filter !== 'livraison') state.missions.forEach(c => allItems.push({ ...c, _type: 'mission' }));
    if (filter !== 'mission') state.livraisons.forEach(c => allItems.push({ ...c, _type: 'livraison' }));

    const greenIcon = L.divIcon({ className: '', html: '<div style="background:#1f6f43;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.25)">🚩</div>', iconSize: [28,28], iconAnchor: [14,14] });
    const orangeIcon = L.divIcon({ className: '', html: '<div style="background:#f59e0b;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.25)">📍</div>', iconSize: [28,28], iconAnchor: [14,14] });
    const gpsIcon = L.divIcon({ className: '', html: '<div style="background:#2563eb;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 10px rgba(37,99,235,.5);border:2px solid #fff">📡</div>', iconSize: [32,32], iconAnchor: [16,16] });

    const carteList = document.getElementById('tpCarteList');
    if (carteList) carteList.innerHTML = '';

    allItems.forEach(c => {
      const fromCoords = getCoords(c.lieu_depart);
      const toCoords = getCoords(c.lieu_destination);
      const prixCourse = money(c.prix_course || c.prix_estime || 0);

      if (fromCoords) {
        const m1 = L.marker(fromCoords, { icon: greenIcon })
          .bindPopup(`<strong>🚩 Départ</strong><br>Cde #${c.id}<br>${c.lieu_depart}<br>🧑‍🌾 ${c.agriculteur || ''}${c.agriculteur_phone ? '<br>📞 ' + c.agriculteur_phone : ''}`)
          .addTo(state.mapInstance);
        state.mapMarkers.push(m1);
      }
      if (toCoords) {
        const m2 = L.marker(toCoords, { icon: orangeIcon })
          .bindPopup(`<strong>📍 Destination</strong><br>Cde #${c.id}<br>${c.lieu_destination}<br>🛒 ${c.acheteur || ''}${c.acheteur_phone ? '<br>📞 ' + c.acheteur_phone : ''}<br><strong style="color:#16a34a">💰 ${prixCourse}</strong>`)
          .addTo(state.mapInstance);
        state.mapMarkers.push(m2);
      }
      if (fromCoords && toCoords) {
        const line = L.polyline([fromCoords, toCoords], {
          color: c._type === 'mission' ? '#f59e0b' : '#2563eb',
          weight: 3, dashArray: c._type === 'mission' ? '8,6' : null, opacity: 0.7
        }).addTo(state.mapInstance);
        state.mapMarkers.push(line);
      }
      if (carteList) {
        const item = document.createElement('div');
        item.className = 'tp-carte-item';
        item.innerHTML = `<strong>${c._type === 'mission' ? '📦' : '🚚'} Cde #${c.id}</strong><span>${c.lieu_depart || '—'} → ${c.lieu_destination || '—'}</span><small style="color:#16a34a;font-weight:600">${prixCourse}</small>`;
        item.addEventListener('click', () => {
          const coords = fromCoords || toCoords;
          if (coords) state.mapInstance.setView(coords, 10);
        });
        carteList.appendChild(item);
      }
    });

    if (!allItems.length && carteList) {
      carteList.innerHTML = `<div class="tp-empty-state"><i class="fa-solid fa-map-pin"></i><p>Aucun trajet actif</p></div>`;
    }
    if (state.mapMarkers.length) {
      const latlngs = state.mapMarkers.filter(m => m.getLatLng).map(m => m.getLatLng());
      if (latlngs.length) state.mapInstance.fitBounds(latlngs, { padding: [40, 40], maxZoom: 10 });
    }

    // ── GPS: position actuelle + tracé de route vers destination active ──
    if (navigator.geolocation && state.mapInstance) {
      navigator.geolocation.getCurrentPosition(pos => {
        const userLatLng = [pos.coords.latitude, pos.coords.longitude];
        if (state._gpsMarker) { state._gpsMarker.remove(); state._gpsMarker = null; }
        if (state._gpsRoute) { state._gpsRoute.remove(); state._gpsRoute = null; }
        state._gpsMarker = L.marker(userLatLng, { icon: gpsIcon })
          .bindPopup('<strong>📡 Votre position actuelle</strong>').addTo(state.mapInstance);
        const firstActive = allItems.find(c => c._type === 'livraison' && getCoords(c.lieu_destination));
        const firstAny = firstActive || allItems.find(c => getCoords(c.lieu_depart) || getCoords(c.lieu_destination));
        if (firstAny) {
          const dest = getCoords(firstAny.lieu_destination) || getCoords(firstAny.lieu_depart);
          if (dest) {
            state._gpsRoute = L.polyline([userLatLng, dest], { color: '#16a34a', weight: 4, opacity: 0.85, dashArray: '4,8' }).addTo(state.mapInstance);
            state.mapInstance.fitBounds([userLatLng, dest], { padding: [50, 50], maxZoom: 10 });
          }
        }
      }, () => {}, { timeout: 6000 });
    }
  }

  // Tracé de route depuis modal vers destination spécifique
  window._tpTraceRouteTo = function(cmd) {
    if (!state.mapInstance) return;
    const destCoords = getCoords(cmd.lieu_destination);
    if (!destCoords) return;
    const doTrace = (userLatLng) => {
      const gpsIc = L.divIcon({ className: '', html: '<div style="background:#2563eb;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 10px rgba(37,99,235,.5);border:2px solid #fff">📡</div>', iconSize: [32,32], iconAnchor: [16,16] });
      if (state._gpsMarker) state._gpsMarker.remove();
      if (state._gpsRoute) state._gpsRoute.remove();
      state._gpsMarker = L.marker(userLatLng, { icon: gpsIc }).bindPopup('<strong>📡 Votre position</strong>').addTo(state.mapInstance);
      state._gpsRoute = L.polyline([userLatLng, destCoords], { color: '#16a34a', weight: 5, opacity: 0.9, dashArray: '6,8' }).addTo(state.mapInstance);
      state.mapInstance.fitBounds([userLatLng, destCoords], { padding: [60, 60], maxZoom: 11 });
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => doTrace([pos.coords.latitude, pos.coords.longitude]), () => state.mapInstance.setView(destCoords, 10), { timeout: 6000 });
    } else {
      state.mapInstance.setView(destCoords, 10);
    }
  };


  /* ── Notifications ──────────────────────────────────────── */
  function buildNotifications() {
    const notices = [];

    // ── Évaluations reçues de l'acheteur ──
    try {
      const raw = localStorage.getItem('agrigovBuyerEvaluationsV1');
      const evals = raw ? JSON.parse(raw) : [];
      const shownKey = 'agrigov_tp_shown_evals';
      const shown = JSON.parse(localStorage.getItem(shownKey) || '[]');
      evals.forEach(ev => {
        const isNew = !shown.includes(String(ev.orderId));
        notices.push({
          unread: isNew,
          icon: '⭐',
          variant: 'green',
          title: `Évaluation reçue · CMD-${ev.orderId}`,
          desc: `L'acheteur vous a noté : ${ev.transporterRating || ev.farmerRating || '?'}/5 ⭐${ev.comment ? ' · "' + String(ev.comment).slice(0, 60) + '"' : ''}`,
          time: ev.date ? new Date(ev.date).toLocaleDateString('fr-FR') : 'Récemment',
          target: 'tpHistoriquePage'
        });
      });
    } catch (_) {}

    (state.missions || []).slice(0, 5).forEach((c, i) => {
      notices.push({ unread: i < 3, icon: '📦', variant: 'orange', title: `Nouvelle mission #${c.id}`, desc: `${c.lieu_depart || '—'} → ${c.lieu_destination || '—'} · ${c.acheteur || ''} · 💰 ${money(c.prix_course || c.prix_estime || 0)}`, time: fmt(c.date_creation), target: 'tpMissionsPage' });
    });
    (state.livraisons || []).slice(0, 4).forEach((c, i) => {
      notices.push({ unread: i < 2, icon: '🚚', variant: 'blue', title: `Livraison en cours #${c.id}`, desc: `${c.lieu_depart || '—'} → ${c.lieu_destination || '—'} · Marquez-la livrée après confirmation.`, time: fmt(c.date_creation), target: 'tpLivraisonsPage' });
    });
    if (state.profile && state.completion < 75) {
      notices.push({ unread: true, icon: '👤', variant: 'red', title: 'Profil incomplet', desc: 'Complétez les infos véhicule pour valider plus facilement les missions.', time: "Aujourd'hui", target: 'tpProfilPage' });
    }
    (state.historique || []).slice(0, 3).forEach(c => {
      notices.push({ unread: false, icon: '✅', variant: 'green', title: `Livraison terminée #${c.id}`, desc: `Commande livrée pour ${c.acheteur || '—'}.`, time: fmt(c.date_creation), target: 'tpHistoriquePage' });
    });
    state.notifications = notices;
    return notices;
  }

  function buildAndShowNotifBadge() {
    const notices = buildNotifications();
    const unread = notices.filter(n => n.unread).length;
    ['tpNotifBadge', 'tpTopbarNotifBadge'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = unread > 9 ? '9+' : String(unread);
      el.style.display = unread ? 'flex' : 'none';
    });
  }

  async function loadNotifications() {
    const container = document.getElementById('tpNotificationsContainer');
    if (!container) return;
    container.innerHTML = `<div class="tp-loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Chargement...</div>`;

    if (!state.missions.length && !state.livraisons.length) {
      const [m, l, h] = await Promise.all([
        api('/livraison/missions/').then(r => r.data?.commandes || []).catch(() => []),
        api('/livraison/livraisons/').then(r => r.data?.commandes || []).catch(() => []),
        api('/livraison/historique/').then(r => r.data?.commandes || []).catch(() => []),
      ]);
      state.missions = m; state.livraisons = l; state.historique = h;
    }

    const notices = buildNotifications();
    buildAndShowNotifBadge();

    if (!notices.length) {
      container.innerHTML = `<div class="tp-empty-state"><i class="fa-regular fa-bell-slash"></i><p><strong>Aucune notification</strong></p></div>`;
      return;
    }

    container.innerHTML = notices.map(n => `
      <button class="tp-notif-item ${n.unread ? 'unread' : ''}" data-target="${esc(n.target)}" type="button">
        <span class="tp-notif-icon ${esc(n.variant)}">${esc(n.icon)}</span>
        <span class="tp-notif-content">
          <strong>${esc(n.title)}</strong>
          <em>${esc(n.desc)}</em>
        </span>
        <span class="tp-notif-time">${esc(n.time)}</span>
      </button>
    `).join('');

    container.querySelectorAll('[data-target]').forEach(el => {
      el.addEventListener('click', () => setPage(el.dataset.target));
    });
  }

  document.getElementById('tpNotifBtn')?.addEventListener('click', () => setPage('tpNotificationsPage'));
  document.getElementById('tpMarkAllRead')?.addEventListener('click', () => {
    state.notifications.forEach(n => n.unread = false);
    buildAndShowNotifBadge();
    $$('.tp-notif-item.unread').forEach(el => el.classList.remove('unread'));
    toast('Toutes les notifications sont marquées comme lues.', 'info');
  });
  document.getElementById('tpRefreshNotifs')?.addEventListener('click', loadNotifications);

  /* ── Historique ─────────────────────────────────────────── */
  async function loadHistorique() {
    loadingState('tpHistoriqueGrid', 'Chargement de l\'historique...');
    try {
      const { ok, data } = await api('/livraison/historique/');
      if (!ok || !data.success) throw new Error(data.error || 'Erreur');
      state.historique = data.commandes || [];
      renderHistorique();
    } catch (err) {
      document.getElementById('tpHistoriqueGrid').innerHTML = `<div class="tp-empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${esc(err.message)}</p></div>`;
    }
  }

  function renderHistorique() {
    const grid = document.getElementById('tpHistoriqueGrid');
    if (!grid) return;
    const q = (document.getElementById('tpHistSearch')?.value || '').toLowerCase();
    const filter = document.getElementById('tpHistFilter')?.value || 'all';
    const items = state.historique.filter(c => {
      const txt = `${c.acheteur} ${c.agriculteur} ${c.lieu_depart} ${c.lieu_destination}`.toLowerCase();
      return (!q || txt.includes(q)) && (filter === 'all' || c.statut === filter);
    });

    // Stats
    const livrees = state.historique.filter(c => c.statut === 'livree').length;
    const annulees = state.historique.filter(c => c.statut === 'annulee').length;
    const revenu = state.historique.filter(c => c.statut === 'livree').reduce((s, c) => s + (Number(c.prix_course || c.prix_estime || 0)), 0);
    ['histTotal','histLivrees','histAnnulees','histRevenu'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.textContent = [state.historique.length, livrees, annulees, money(revenu)][i];
    });

    if (!items.length) { grid.innerHTML = `<div class="tp-empty-state" style="grid-column:1/-1"><i class="fa-solid fa-clock-rotate-left"></i><p><strong>Aucun historique</strong></p></div>`; return; }

    grid.innerHTML = items.map(c => `
      <div class="tp-history-card">
        <div class="tp-card-head">
          <h3>📋 Commande #${esc(String(c.id))}</h3>
          ${badge(c.statut)}
        </div>
        <div class="tp-card-info">
          <p><i class="fa-solid fa-location-dot"></i><span>${esc(c.lieu_depart || '—')} → ${esc(c.lieu_destination || '—')}</span></p>
          <p><i class="fa-solid fa-user"></i><span>${esc(c.acheteur || '—')} · 🌾 ${esc(c.agriculteur || '—')}</span></p>
          <p><i class="fa-regular fa-calendar"></i><span>${fmt(c.date_creation)}</span></p>
          <p><i class="fa-solid fa-money-bill-wave"></i><span>💰 Course : ${money(c.prix_course || c.prix_estime || 0)} · ${c.lignes?.length || 0} produit(s)</span></p>
        </div>
        <div class="tp-card-actions">
          <button class="tp-btn tp-btn-outline btn-voir-detail" data-id="${c.id}" style="flex:1"><i class="fa-solid fa-eye"></i> Voir détails</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-voir-detail').forEach(btn => btn.addEventListener('click', () => openOrderModal(Number(btn.dataset.id), state.historique)));
  }

  document.getElementById('tpHistSearch')?.addEventListener('input', renderHistorique);
  document.getElementById('tpHistFilter')?.addEventListener('change', renderHistorique);

  /* ── Modal détail commande ──────────────────────────────── */
  function openOrderModal(id, list) {
    const cmd = list.find(c => c.id === id);
    if (!cmd) return;
    const overlay = document.getElementById('tpOrderModal');
    const body = document.getElementById('tpModalBody');
    const foot = document.getElementById('tpModalFoot');
    const title = document.getElementById('tpModalTitle');
    if (!overlay || !body || !foot || !title) return;

    title.textContent = `Commande #${cmd.id}`;
    const prixCourse = cmd.prix_course || cmd.prix_estime || 0;
    body.innerHTML = `
      <div class="tp-modal-section">
        <h4>Statut & Course</h4>
        <div class="tp-modal-row"><span>Statut</span>${badge(cmd.statut)}</div>
        <div class="tp-modal-row"><span>💰 Prix de course</span><strong style="color:#16a34a;font-size:1.05em">${money(prixCourse)}</strong></div>
        <div class="tp-modal-row"><span>Date</span><span>${fmt(cmd.date_creation)}</span></div>
      </div>
      <div class="tp-modal-section">
        <h4>Trajet</h4>
        <div class="tp-modal-row"><span>Départ</span><strong>${esc(cmd.lieu_depart || '—')}</strong></div>
        <div class="tp-modal-row"><span>Destination</span><strong>${esc(cmd.lieu_destination || '—')}</strong></div>
        ${cmd.distance_km ? `<div class="tp-modal-row"><span>Distance</span><span>${cmd.distance_km} km</span></div>` : ''}
        ${cmd.note ? `<div class="tp-modal-row"><span>Note</span><em>${esc(cmd.note)}</em></div>` : ''}
      </div>
      <div class="tp-modal-section">
        <h4>Contacts</h4>
        <div class="tp-modal-row"><span>🧑‍🌾 Agriculteur</span><strong>${esc(cmd.agriculteur || '—')}</strong></div>
        ${cmd.agriculteur_phone ? `<div class="tp-modal-row"><span>📞 Tel. Agriculteur</span><a href="tel:${esc(cmd.agriculteur_phone)}" style="color:#16a34a;font-weight:600">${esc(cmd.agriculteur_phone)}</a></div>` : ''}
        ${cmd.agriculteur_email ? `<div class="tp-modal-row"><span>✉️ Email Agriculteur</span><a href="mailto:${esc(cmd.agriculteur_email)}" style="color:#16a34a">${esc(cmd.agriculteur_email)}</a></div>` : ''}
        <div class="tp-modal-row" style="margin-top:8px"><span>🛒 Acheteur</span><strong>${esc(cmd.acheteur || '—')}</strong></div>
        ${cmd.acheteur_phone ? `<div class="tp-modal-row"><span>📞 Tel. Acheteur</span><a href="tel:${esc(cmd.acheteur_phone)}" style="color:#2563eb;font-weight:600">${esc(cmd.acheteur_phone)}</a></div>` : ''}
        ${cmd.acheteur_email ? `<div class="tp-modal-row"><span>✉️ Email Acheteur</span><a href="mailto:${esc(cmd.acheteur_email)}" style="color:#2563eb">${esc(cmd.acheteur_email)}</a></div>` : ''}
      </div>
      ${cmd.lignes?.length ? `
      <div class="tp-modal-section">
        <h4>Produits (${cmd.lignes.length})</h4>
        <div class="tp-card-products">
          ${cmd.lignes.map(l => `<div class="tp-product-line"><span>🌿 ${esc(l.produit)}</span><span>${l.quantite} × ${money(l.prix_unitaire)} = <strong>${money(l.sous_total || l.quantite * l.prix_unitaire)}</strong></span></div>`).join('')}
        </div>
      </div>` : ''}
    `;

    foot.innerHTML = '';
    if (cmd.statut === 'confirmee' || cmd.statut === 'en_preparation') {
      const btn = document.createElement('button');
      btn.className = 'tp-btn tp-btn-primary';
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Accepter la mission';
      btn.addEventListener('click', async () => { closeModal(); await accepterMission(cmd.id, btn); });
      foot.appendChild(btn);
    }
    if (cmd.statut === 'expediee') {
      const btn = document.createElement('button');
      btn.className = 'tp-btn tp-btn-primary';
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Marquer comme livrée';
      btn.addEventListener('click', async () => { closeModal(); await marquerLivree(cmd.id, btn); });
      foot.appendChild(btn);
    }
    // Navigate on map button
    if (cmd.lieu_destination) {
      const mapBtn = document.createElement('button');
      mapBtn.className = 'tp-btn tp-btn-outline';
      mapBtn.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> Voir sur la carte';
      mapBtn.addEventListener('click', () => {
        closeModal();
        // Switch to carte page and highlight route
        document.querySelectorAll('.tp-page').forEach(p => p.classList.remove('active'));
        const cartePage = document.getElementById('tpCartePage');
        if (cartePage) cartePage.classList.add('active');
        // Trigger GPS route to destination
        if (window._tpTraceRouteTo) window._tpTraceRouteTo(cmd);
      });
      foot.appendChild(mapBtn);
    }
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tp-btn tp-btn-outline';
    closeBtn.textContent = 'Fermer';
    closeBtn.addEventListener('click', closeModal);
    foot.appendChild(closeBtn);

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const overlay = document.getElementById('tpOrderModal');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  document.getElementById('tpModalClose')?.addEventListener('click', closeModal);
  document.getElementById('tpOrderModal')?.addEventListener('click', (e) => { if (e.target.id === 'tpOrderModal') closeModal(); });

  /* ── Profil Save / Password ─────────────────────────────── */
  // Photo file input preview
  document.getElementById('tpPhotoFileInput')?.addEventListener('change', function() {
    const file = this.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      ['tpProfilAvatar','tpSidebarAvatar','tpTopbarAvatar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = e.target.result;
      });
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('transportSaveProfileBtn')?.addEventListener('click', async () => {
    try {
      const name = document.getElementById('transportFullName')?.value || '';
      const parts = name.trim().split(/\s+/).filter(Boolean);
      const photoFile = document.getElementById('tpPhotoFileInput')?.files?.[0];

      let ok, data;
      if (photoFile) {
        // Use FormData to support file upload
        const fd = new FormData();
        fd.append('first_name', parts[0] || '');
        fd.append('last_name', parts.slice(1).join(' '));
        fd.append('email', document.getElementById('transportEmail')?.value || '');
        fd.append('phone', document.getElementById('transportPhone')?.value || '');
        fd.append('wilaya', document.getElementById('transportWilaya')?.value || '');
        fd.append('vehicle_name', document.getElementById('transportVehicleType')?.value || '');
        fd.append('plate', document.getElementById('transportPlate')?.value || '');
        fd.append('capacity', document.getElementById('transportCapacity')?.value || '');
        fd.append('condition', document.getElementById('transportCondition')?.value || '');
        fd.append('profile_photo', photoFile);
        const r = await fetch('/api/profile/', { method: 'POST', headers: { 'X-CSRFToken': getCsrf(), 'X-Requested-With': 'XMLHttpRequest' }, body: fd, credentials: 'same-origin' });
        data = await r.json();
        ok = r.ok;
      } else {
        const res = await api('/api/profile/', {
          method: 'POST',
          body: JSON.stringify({
            first_name: parts[0] || '',
            last_name: parts.slice(1).join(' '),
            email: document.getElementById('transportEmail')?.value || '',
            phone: document.getElementById('transportPhone')?.value || '',
            wilaya: document.getElementById('transportWilaya')?.value || '',
            vehicle_name: document.getElementById('transportVehicleType')?.value || '',
            plate: document.getElementById('transportPlate')?.value || '',
            capacity: document.getElementById('transportCapacity')?.value || '',
            condition: document.getElementById('transportCondition')?.value || '',
          })
        });
        ok = res.ok; data = res.data;
      }
      if (!ok || !data.success) throw new Error(data.error || 'Erreur');
      applyProfileToUI(data.profile);
      if (data.profile?.profile_photo_url) {
        ['tpProfilAvatar','tpSidebarAvatar','tpTopbarAvatar'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.src = data.profile.profile_photo_url;
        });
      }
      toast('✅ Profil mis à jour avec succès.', 'success');
    } catch (err) { toast(err.message || 'Erreur profil', 'error'); }
  });

  document.getElementById('transportChangePasswordBtn')?.addEventListener('click', async () => {
    const cur = document.getElementById('transportPasswordCurrent')?.value;
    const nw = document.getElementById('transportPasswordNew')?.value;
    const confirm = document.getElementById('transportPasswordConfirm')?.value;
    if (!cur || !nw || !confirm) { toast('Remplissez tous les champs.', 'error'); return; }
    if (nw !== confirm) { toast('Les mots de passe ne correspondent pas.', 'error'); return; }
    try {
      const { ok, data } = await api('/api/change-password/', { method: 'POST', body: JSON.stringify({ current_password: cur, new_password: nw, confirm_password: confirm }) });
      if (!ok || !data.success) throw new Error(data.error || 'Erreur');
      ['transportPasswordCurrent','transportPasswordNew','transportPasswordConfirm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('tpPasswordStrength').style.display = 'none';
      toast('✅ Mot de passe modifié.', 'success');
    } catch (err) { toast(err.message || 'Erreur', 'error'); }
  });

  // Password strength meter
  document.getElementById('transportPasswordNew')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const strength = document.getElementById('tpPasswordStrength');
    const fill = document.getElementById('tpPwdFill');
    const lbl = document.getElementById('tpPwdLabel');
    if (!strength || !fill || !lbl) return;
    if (!val) { strength.style.display = 'none'; return; }
    strength.style.display = 'block';
    const score = [val.length >= 8, /[A-Z]/.test(val), /[0-9]/.test(val), /[^a-zA-Z0-9]/.test(val)].filter(Boolean).length;
    const colors = ['#ef4444','#f59e0b','#22c55e','#16a34a'];
    const labels = ['Faible','Moyen','Bon','Excellent'];
    fill.style.width = (score * 25) + '%';
    fill.style.background = colors[score - 1] || '#ef4444';
    lbl.textContent = 'Force : ' + (labels[score - 1] || 'Très faible');
  });

  // Eye toggle
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tp-eye-btn');
    if (!btn) return;
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.querySelector('i').className = isText ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
  });

  /* ── Global search ──────────────────────────────────────── */
  document.getElementById('tpGlobalSearch')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    const pageMap = [
      { kw: ['mission','commande','livr'], page: 'tpMissionsPage' },
      { kw: ['histor','terminé','livré'], page: 'tpHistoriquePage' },
      { kw: ['notif','alerte'], page: 'tpNotificationsPage' },
      { kw: ['planning','agenda'], page: 'tpPlanningPage' },
      { kw: ['carte','map','trajet'], page: 'tpCartePage' },
      { kw: ['profil','véhicule','motpass'], page: 'tpProfilPage' },
    ];
    const match = pageMap.find(p => p.kw.some(k => q.includes(k)));
    if (match) { setPage(match.page); toast(`Navigation vers : ${PAGE_TITLES[match.page]?.[0]}`, 'info'); }
    else toast('Aucun résultat pour : ' + q, 'error');
    e.target.value = '';
  });

  /* ── INIT ───────────────────────────────────────────────── */
  if (!(await checkSession())) return;

  applyTheme(localStorage.getItem('tp_theme') || 'light');

  // Restore page from hash or localStorage
  const hashPage = (window.location.hash || '').replace('#', '');
  const savedPage = hashPage && document.getElementById(hashPage) ? hashPage : (localStorage.getItem('tp_active_page') || 'tpDashboardPage');

  try {
    await loadProfile();
  } catch (err) {
    console.warn('Profil unavailable:', err);
  }

  setPage(savedPage);
  await loadDashboard();

  // Preload data
  const [m, l, h] = await Promise.all([
    api('/livraison/missions/').then(r => r.data?.commandes || []).catch(() => []),
    api('/livraison/livraisons/').then(r => r.data?.commandes || []).catch(() => []),
    api('/livraison/historique/').then(r => r.data?.commandes || []).catch(() => []),
  ]);
  state.missions = m; state.livraisons = l; state.historique = h;
  buildAndShowNotifBadge();

  // Save page on change
  const origSetPage = setPage;
  window.__tpSetPage = (id) => { localStorage.setItem('tp_active_page', id); origSetPage(id); };

});
