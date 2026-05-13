/* ═══════════════════════════════════════════════════════════════
   VETERINAIRE.JS — AgriGov Dashboard Vétérinaire
   Full dynamic frontend — All data from Django REST API
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   ALGERIAN WILAYAS
────────────────────────────────────────── */
const WILAYAS = [
  ['01','Adrar'],['02','Chlef'],['03','Laghouat'],['04','Oum El Bouaghi'],['05','Batna'],
  ['06','Béjaïa'],['07','Biskra'],['08','Béchar'],['09','Blida'],['10','Bouïra'],
  ['11','Tamanrasset'],['12','Tébessa'],['13','Tlemcen'],['14','Tiaret'],['15','Tizi Ouzou'],
  ['16','Alger'],['17','Djelfa'],['18','Jijel'],['19','Sétif'],['20','Saïda'],
  ['21','Skikda'],['22','Sidi Bel Abbès'],['23','Annaba'],['24','Guelma'],['25','Constantine'],
  ['26','Médéa'],['27','Mostaganem'],["28","M'Sila"],['29','Mascara'],['30','Ouargla'],
  ['31','Oran'],['32','El Bayadh'],['33','Illizi'],['34','Bordj Bou Arréridj'],['35','Boumerdès'],
  ['36','El Tarf'],['37','Tindouf'],['38','Tissemsilt'],['39','El Oued'],['40','Khenchela'],
  ['41','Souk Ahras'],['42','Tipaza'],['43','Mila'],["44","Aïn Defla"],["45","Naâma"],
  ["46","Aïn Témouchent"],["47","Ghardaïa"],['48','Relizane'],["49","El M'Ghair"],['50','El Meniaa'],
  ['51','Ouled Djellal'],['52','Bordj Baji Mokhtar'],["53","Béni Abbès"],['54','Timimoun'],
  ['55','Touggourt'],['56','Djanet'],['57','In Salah'],['58','In Guezzam'],
];
function getWilaya(code){ const w=WILAYAS.find(w=>w[0]===code); return w?w[1]:code; }

/* ──────────────────────────────────────────
   STATE (simule le backend / localStorage)
────────────────────────────────────────── */
const STATE = {
  vet: {
    id: 1,
    prenom: 'Mohamed', nom: 'Salah',
    specialite: 'Chirurgie bovine',
    ordre: 'VET-19-2024-0042',
    wilaya: '19',
    exp: 12,
    tarif: 2500,
    bio: 'Vétérinaire spécialisé en chirurgie bovine et soins des animaux d\'élevage avec 12 ans d\'expérience dans la wilaya de Sétif.',
    disponible: true,
    note: 4.7,
    total_consultations: 148,
  },
  disponibilites: {
    // key: 'YYYY-MM-DD' => 'available' | 'rdv' | 'tournee'
    '2026-05-05': 'available',
    '2026-05-06': 'available',
    '2026-05-07': 'available',
    '2026-05-10': 'available',
    '2026-05-11': 'available',
    '2026-05-12': 'rdv',
    '2026-05-14': 'available',
    '2026-05-15': 'tournee',
    '2026-05-16': 'tournee',
    '2026-05-17': 'tournee',
    '2026-05-19': 'available',
    '2026-05-20': 'available',
    '2026-05-21': 'available',
  },
  creneaux: {
    // key: 'YYYY-MM-DD' => ['08:00','09:00',...]
    '2026-05-05': ['08:00','09:00','10:00','14:00','15:00'],
    '2026-05-06': ['08:00','09:00','10:00','11:00','14:00','15:00','16:00'],
    '2026-05-07': ['08:00','09:00','10:00'],
  },
  rdvs: [
    { id:1, agriculteur:'Ali Benkhelifa', wilaya:'19', date:'2026-05-12', heure:'09:00', type:'consultation', statut:'confirme', animaux:'Bovins', nb:4, desc:'Contrôle sanitaire annuel du troupeau.' },
    { id:2, agriculteur:'Karim Meziani', wilaya:'19', date:'2026-05-14', heure:'10:00', type:'vaccination', statut:'confirme', animaux:'Ovins', nb:20, desc:'Campagne de vaccination brucellose.' },
    { id:3, agriculteur:'Samir Belkacem', wilaya:'05', date:'2026-05-15', heure:'08:00', type:'urgence', statut:'en_attente', animaux:'Camelins', nb:1, desc:'Blessure grave au membre antérieur.' },
    { id:4, agriculteur:'Hamid Ouali', wilaya:'19', date:'2026-05-08', heure:'14:00', type:'suivi', statut:'termine', animaux:'Bovins', nb:2, desc:'Suivi post-opératoire césarienne.', diagnostic:'Récupération satisfaisante', traitement:'Antibiotiques 5j' },
    { id:5, agriculteur:'Fatima Boudja', wilaya:'26', date:'2026-05-20', heure:'09:00', type:'chirurgie', statut:'en_attente', animaux:'Équidés', nb:1, desc:'Opération hernie inguinale.' },
    { id:6, agriculteur:'Youcef Boualem', wilaya:'19', date:'2026-04-28', heure:'11:00', type:'consultation', statut:'termine', animaux:'Caprins', nb:8, desc:'Diagnostic pneumonie caprine.', diagnostic:'Pasteurellose', traitement:'Oxytétracycline + anti-inflammatoires' },
    { id:7, agriculteur:'Rachid Tahir', wilaya:'35', date:'2026-05-22', heure:'15:00', type:'vaccination', statut:'refuse', animaux:'Avicoles', nb:200, desc:'Vaccination Newcastle.' },
  ],
  demandes: [
    { id:10, agriculteur:'Nour Hadjadj', wilaya:'19', date:'2026-05-25', heure:'09:00', type:'consultation', animaux:'Bovins laitiers', nb:5, desc:'Problème de production de lait. Plusieurs vaches montrent des signes de mammite.', tel:'0551 234 567', statut:'en_attente', timestamp: '2026-05-02T08:30:00' },
    { id:11, agriculteur:'Akram Chihab', wilaya:'19', date:'2026-05-27', heure:'14:00', type:'urgence', animaux:'Ovins', nb:12, desc:'Plusieurs brebis présentent des diarrhées sévères depuis 2 jours.', tel:'0665 987 321', statut:'en_attente', timestamp: '2026-05-02T11:15:00' },
    { id:12, agriculteur:'Leila Rouabah', wilaya:'05', date:'2026-05-10', heure:'08:00', type:'vaccination', animaux:'Bovins', nb:15, desc:'Vaccination FMD obligatoire.', tel:'0555 111 222', statut:'accepte', timestamp: '2026-05-01T09:00:00' },
    { id:13, agriculteur:'Omar Benyoucef', wilaya:'19', date:'2026-05-09', heure:'10:00', type:'suivi', animaux:'Équidés', nb:2, desc:'Suivi post-vaccination.', tel:'0770 333 444', statut:'refuse', timestamp: '2026-04-30T14:00:00', motifRefus: 'Date non disponible, veuillez choisir une autre date.' },
  ],
  notifications: [
    { id:1, type:'alerte', titre:'⚠️ Alerte stock — Bovins Sétif', desc:'L\'administrateur signale une chute des ventes bovines de 35% dans votre wilaya. Une tournée est recommandée.', time:'Il y a 2h', lu:false },
    { id:2, type:'rdv', titre:'📅 Nouveau RDV confirmé', desc:'Karim Meziani a confirmé son rendez-vous du 14 mai pour vaccination ovins (20 têtes).', time:'Il y a 3h', lu:false },
    { id:3, type:'msg', titre:'💬 Message d\'Ali Benkhelifa', desc:'Bonjour docteur, est-ce que vous pouvez venir une heure plus tôt le 12 mai ?', time:'Il y a 5h', lu:false },
    { id:4, type:'eval', titre:'⭐ Nouvelle évaluation reçue', desc:'Youcef Boualem vous a donné 5 étoiles après sa consultation du 28 avril.', time:'Il y a 1 jour', lu:true },
    { id:5, type:'rdv', titre:'📅 Rappel RDV demain', desc:'Vous avez un rendez-vous avec Ali Benkhelifa demain à 09:00 — 4 bovins, consultation annuelle.', time:'Il y a 1 jour', lu:true },
    { id:6, type:'alerte', titre:'⚠️ Alerte épidémie — Batna', desc:'Risque épidémique détecté dans les élevages caprins de Batna. Vaccination FMD urgente recommandée.', time:'Il y a 2 jours', lu:true },
  ],
  alertesAdmin: [
    { id:1, type:'stock_faible', titre:'Chute ventes bovines — Sétif (19)', message:'Les ventes de bovins ont chuté de 35% ce mois dans la wilaya de Sétif. Cette baisse peut indiquer un problème sanitaire non diagnostiqué. Une intervention vétérinaire de masse est recommandée pour les élevages bovins.', wilayas:['19'], date:'2026-05-01', active:true },
    { id:2, type:'epidemie', titre:'Risque épidémie caprine — Batna & Oum El Bouaghi', message:'Plusieurs signalements de diarrhées sévères dans les élevages caprins des wilayas 04 et 05. Une campagne de vaccination et dépistage est urgente.', wilayas:['04','05'], date:'2026-04-30', active:true },
    { id:3, type:'campagne', titre:'Campagne nationale FMD 2026', message:'Campagne nationale de vaccination contre la fièvre aphteuse (FMD) lancée par le Ministère de l\'Agriculture. Tous les vétérinaires sont mobilisés pour couvrir leurs wilayas.', wilayas:['all'], date:'2026-04-25', active:true },
    { id:4, type:'stock_faible', titre:'Faible activité avicole — M\'Sila', message:'Les ventes de volaille ont diminué de 50% dans la wilaya 28. Un suivi vétérinaire des fermes avicoles est fortement conseillé.', wilayas:['28'], date:'2026-04-20', active:false },
  ],
  tournees: [
    { id:1, titre:'Campagne bovine Sétif — Mai 2026', desc:'Vaccination et contrôle sanitaire des élevages bovins dans 3 communes de la wilaya de Sétif suite à l\'alerte de baisse des ventes.', wilayas:['19'], date_debut:'2026-05-15', date_fin:'2026-05-17', services:'Vaccination FMD, Contrôle tuberculose, Dépistage brucellose', tarif:1500, statut:'planifiee', from_alerte:1 },
    { id:2, titre:'Tournée ovine Batna', desc:'Intervention dans les élevages ovins suite à signalement d\'épidémie caprine.', wilayas:['04','05'], date_debut:'2026-06-01', date_fin:'2026-06-03', services:'Dépistage, Vaccination', tarif:1800, statut:'planifiee', from_alerte:2 },
  ],
  messages: {
    conversations: [
      { id:1, agriculteur:'Ali Benkhelifa', wilaya:'19', avatar:'👨‍🌾', lu:false, lastMsg:'Bonjour docteur, est-ce que vous pouvez venir une heure plus tôt ?', lastTime:'11:15' },
      { id:2, agriculteur:'Karim Meziani', wilaya:'19', avatar:'👨‍🌾', lu:true, lastMsg:'Merci pour votre intervention, les bêtes vont mieux.', lastTime:'Hier' },
      { id:3, agriculteur:'Samir Belkacem', wilaya:'05', avatar:'👩‍🌾', lu:true, lastMsg:'D\'accord, à bientôt.', lastTime:'Mer' },
    ],
    chats: {
      1: [
        { from:'vet', text:'Bonjour Ali, comment vont vos bovins depuis la dernière visite ?', time:'10:00' },
        { from:'agri', text:'Bonjour docteur, ça va mieux. Mais est-ce que vous pouvez venir une heure plus tôt le 12 mai ?', time:'11:15' },
      ],
      2: [
        { from:'agri', text:'Bonjour docteur, la vaccination est terminée.', time:'Hier 09:00' },
        { from:'vet', text:'Très bien, donnez-leur les rappels dans 21 jours comme convenu.', time:'Hier 09:30' },
        { from:'agri', text:'Merci pour votre intervention, les bêtes vont mieux.', time:'Hier 14:00' },
      ],
      3: [
        { from:'agri', text:'Docteur, mon chameau est blessé à la jambe, c\'est urgent !', time:'Mer 08:00' },
        { from:'vet', text:'Je serai chez vous le 15 mai. En attendant, nettoyez la plaie avec du sérum physiologique.', time:'Mer 08:30' },
        { from:'agri', text:'D\'accord, à bientôt.', time:'Mer 08:45' },
      ],
    }
  },
  evaluations: [
    { agriculteur:'Youcef Boualem', note:5, commentaire:'Docteur très compétent et disponible. Diagnostic rapide et traitement efficace.', date:'28 Avr' },
    { agriculteur:'Hamid Ouali', note:4, commentaire:'Bon suivi post-opératoire, bonne communication.', date:'8 Mai' },
    { agriculteur:'Ali Benkhelifa', note:5, commentaire:'Excellent vétérinaire, très professionnel.', date:'2 Mar' },
  ],
  cabinet: {
    nom: 'Cabinet Dr. Salah',
    wilaya: '19',
    adresse: '12 Rue des Agriculteurs, Sétif',
    tel: '0555 123 456',
    email: 'dr.salah@gmail.com',
    ouvert: true,
    services: [
      { icon:'💉', name:'Vaccination' },
      { icon:'🔬', name:'Diagnostic' },
      { icon:'🩺', name:'Consultation' },
      { icon:'🏥', name:'Chirurgie' },
      { icon:'💊', name:'Pharmacie vét.' },
      { icon:'🐄', name:'Bovins' },
    ],
    horaires: [
      { jour:'Dim', open:false, debut:'', fin:'' },
      { jour:'Lun', open:true,  debut:'08:00', fin:'17:00' },
      { jour:'Mar', open:true,  debut:'08:00', fin:'17:00' },
      { jour:'Mer', open:true,  debut:'08:00', fin:'17:00' },
      { jour:'Jeu', open:true,  debut:'08:00', fin:'17:00' },
      { jour:'Ven', open:true,  debut:'08:00', fin:'12:00' },
      { jour:'Sam', open:false, debut:'', fin:'' },
    ]
  }
};

/* ──────────────────────────────────────────
   CALENDRIER STATE
────────────────────────────────────────── */
let calCurrentMonth = new Date(2026, 4, 1); // Mai 2026
let selectedDay = null;

/* ──────────────────────────────────────────
   CURRENT CONVERSATION
────────────────────────────────────────── */
let currentConvId = null;

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initWilayaSelects();
  renderDashboard();
  renderDispoStats();
  renderCalendar();
  renderNotifications();
  renderAdminAlertes();
  renderCabinet();
  renderRdvList();
  renderDemandes();
  renderTournees();
  renderProfil();
  renderConversations();
  updateDashDate();
  initRevealObserver();
  checkFarmerAlerte();
  updateBadges();
});

/* ──────────────────────────────────────────
   PAGE NAVIGATION
────────────────────────────────────────── */
function showPage(pageId, btn) {
  document.querySelectorAll('.vet-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.vet-nav-link').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  if (btn) btn.classList.add('active');
  window.scrollTo(0, 0);
  // Reload dynamic data for specific pages
  if (pageId === 'alertes' || pageId === 'annonces') {
    if (typeof loadVetAnnonces === 'function') loadVetAnnonces();
  }
}

/* ──────────────────────────────────────────
   TOAST
────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, type = 'green') {
  const t = document.getElementById('vetToast');
  t.textContent = msg;
  t.className = 'vet-toast' + (type === 'error' ? ' error' : type === 'amber' ? ' amber' : '') + ' show';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ──────────────────────────────────────────
   MODAL
────────────────────────────────────────── */
function openModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  document.getElementById('vetModal').classList.add('open');
}
function closeModal() {
  document.getElementById('vetModal').classList.remove('open');
}
document.getElementById('vetModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/* ──────────────────────────────────────────
   WILAYAS
────────────────────────────────────────── */
function initWilayaSelects() {
  const opts = WILAYAS.map(w => `<option value="${w[0]}">${w[0]} — ${w[1]}</option>`).join('');
  ['cabinetWilaya','profilWilaya'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = opts;
      if (id === 'cabinetWilaya') el.value = STATE.cabinet.wilaya;
      if (id === 'profilWilaya') el.value = STATE.vet.wilaya;
    }
  });
}

/* ──────────────────────────────────────────
   BADGES
────────────────────────────────────────── */
function updateBadges() {
  const unreadNotif = STATE.notifications.filter(n => !n.lu).length;
  const unreadAlerts = STATE.alertesAdmin.filter(a => a.active).length;
  const pendingRdv = STATE.rdvs.filter(r => r.statut === 'en_attente').length;
  const pendingDemandes = STATE.demandes.filter(d => d.statut === 'en_attente').length;
  const unreadMsg = STATE.messages.conversations.filter(c => !c.lu).length;

  setbadge('notifBadge', unreadNotif);
  setBadge('alertBadge', unreadAlerts);
  setbadge('rdvBadge', pendingRdv);
  setbadge('demandeBadge', pendingDemandes);
  setbadge('msgBadge', unreadMsg);
  setbadge('topNotifCount', unreadNotif);
  setbadge('dashDemBadge', pendingDemandes);

  function setbadge(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.style.display = val > 0 ? '' : 'none';
  }
  function setbadge(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.style.display = val > 0 ? '' : 'none';
  }
  function setbadge(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.style.display = val > 0 ? '' : 'none';
  }
}
// Fix badge update (merged)
function setBadge(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  el.style.display = val > 0 ? '' : 'none';
}
function updateBadges() {
  const unreadNotif = STATE.notifications.filter(n => !n.lu).length;
  const unreadAlerts = STATE.alertesAdmin.filter(a => a.active).length;
  const pendingRdv = STATE.rdvs.filter(r => r.statut === 'en_attente').length;
  const pendingDemandes = STATE.demandes.filter(d => d.statut === 'en_attente').length;
  const unreadMsg = STATE.messages.conversations.filter(c => !c.lu).length;

  setBadge('notifBadge', unreadNotif);
  setBadge('alertBadge', unreadAlerts);
  setBadge('rdvBadge', pendingRdv);
  setBadge('demandeBadge', pendingDemandes);
  setBadge('msgBadge', unreadMsg);
  setBadge('topNotifCount', unreadNotif);
  setBadge('dashDemBadge', pendingDemandes);
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
function updateDashDate() {
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  const el = document.getElementById('dashDate');
  if (el) el.textContent = now.toLocaleDateString('fr-DZ', opts);
}

function renderDashboard() {
  // Stats
  const statsEl = document.getElementById('dashStats');
  const confirmed = STATE.rdvs.filter(r => r.statut === 'confirme').length;
  const pending = STATE.rdvs.filter(r => r.statut === 'en_attente').length;
  const done = STATE.rdvs.filter(r => r.statut === 'termine').length;
  const demandes = STATE.demandes.filter(d => d.statut === 'en_attente').length;

  if (statsEl) statsEl.innerHTML = `
    ${statCard('📅', confirmed, 'RDV confirmés', '')}
    ${statCard('⏳', pending + demandes, 'En attente', 'amber')}
    ${statCard('✅', done, 'Terminés', '')}
    ${statCard('⚠️', STATE.alertesAdmin.filter(a=>a.active).length, 'Alertes actives', 'red')}
    ${statCard('🚗', STATE.tournees.length, 'Tournées', 'blue')}
    ${statCard('⭐', STATE.vet.note, 'Note moyenne', '')}
  `;

  // Prochains RDV (3 max)
  const rdvEl = document.getElementById('dashRdvList');
  const upcoming = STATE.rdvs.filter(r => ['confirme','en_attente'].includes(r.statut)).slice(0, 3);
  if (rdvEl) rdvEl.innerHTML = upcoming.length
    ? upcoming.map(r => rdvMiniCard(r)).join('')
    : emptyState('📅', 'Aucun RDV à venir');

  // Alertes (2 max)
  const alertesEl = document.getElementById('dashAlertesList');
  const activeAlertes = STATE.alertesAdmin.filter(a => a.active).slice(0, 2);
  if (alertesEl) alertesEl.innerHTML = activeAlertes.length
    ? activeAlertes.map(a => alerteMiniCard(a)).join('')
    : emptyState('✅', 'Aucune alerte active');

  // Demandes (2 max)
  const demEl = document.getElementById('dashDemandesList');
  const pendingDem = STATE.demandes.filter(d => d.statut === 'en_attente').slice(0, 2);
  if (demEl) demEl.innerHTML = pendingDem.length
    ? pendingDem.map(d => demandeMiniCard(d)).join('')
    : emptyState('✅', 'Aucune demande en attente');

  // Tournées
  const tourEl = document.getElementById('dashTourneesList');
  if (tourEl) tourEl.innerHTML = STATE.tournees.slice(0,2).map(t => `
    <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer" onclick="showPage('tournees',document.querySelector('[data-page=tournees]'))">
      <div style="font-weight:600;font-size:0.875rem;margin-bottom:4px">${t.titre}</div>
      <div style="font-size:0.78rem;color:var(--amber)">${formatDate(t.date_debut)} → ${formatDate(t.date_fin)}</div>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">${t.wilayas.map(w => getWilaya(w)).join(', ')}</div>
    </div>
  `).join('') || emptyState('🚗', 'Aucune tournée planifiée');
}

function statCard(icon, val, label, variant) {
  return `<div class="vet-stat-card ${variant}">
    <div class="vet-stat-icon">${icon}</div>
    <div class="vet-stat-value">${val}</div>
    <div class="vet-stat-label">${label}</div>
  </div>`;
}

function rdvMiniCard(r) {
  const colors = { consultation:'var(--green-light)', vaccination:'var(--blue)', urgence:'var(--red)', suivi:'var(--amber)', chirurgie:'var(--text-primary)' };
  return `<div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer" onclick="showPage('rendez-vous',document.querySelector('[data-page=rendez-vous]'))">
    <div style="width:36px;height:36px;background:rgba(74,161,90,0.12);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${rdvTypeIcon(r.type)}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:0.85rem;font-weight:600">${r.agriculteur}</div>
      <div style="font-size:0.78rem;color:var(--text-secondary)">${formatDate(r.date)} · ${r.heure} · ${r.animaux}</div>
    </div>
    <span style="font-size:0.7rem;padding:3px 8px;border-radius:99px;background:rgba(74,161,90,0.1);color:${colors[r.type]||'var(--text-secondary)'}">${rdvTypeName(r.type)}</span>
  </div>`;
}

function alerteMiniCard(a) {
  const colors = { stock_faible:'var(--amber)', epidemie:'var(--red)', campagne:'var(--blue)', urgent:'var(--red)' };
  return `<div style="padding:12px 14px;border:1px solid var(--border);border-left:3px solid ${colors[a.type]};border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer" onclick="showPage('alertes',document.querySelector('[data-page=alertes]'))">
    <div style="font-size:0.85rem;font-weight:600;margin-bottom:4px">${a.titre}</div>
    <div style="font-size:0.78rem;color:var(--text-secondary)">${a.message.slice(0,100)}...</div>
  </div>`;
}

function demandeMiniCard(d) {
  return `<div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px">
    <div style="flex:1;min-width:0">
      <div style="font-size:0.85rem;font-weight:600">${d.agriculteur}</div>
      <div style="font-size:0.78rem;color:var(--text-secondary)">${formatDate(d.date)} · ${d.heure} · ${d.animaux}</div>
    </div>
    <div style="display:flex;gap:6px">
      <button class="btn btn-sm" style="background:rgba(74,161,90,0.15);color:var(--green-light)" onclick="accepterDemande(${d.id})">✓</button>
      <button class="btn btn-sm" style="background:rgba(224,89,89,0.1);color:var(--red)" onclick="refuserDemandeModal(${d.id})">✕</button>
    </div>
  </div>`;
}

function emptyState(icon, txt) {
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-text">${txt}</div></div>`;
}

/* ══════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════ */
function renderNotifications() {
  const filter = document.getElementById('notifFilter')?.value || 'all';
  const list = document.getElementById('notifList');
  if (!list) return;
  const filtered = filter === 'all' ? STATE.notifications : STATE.notifications.filter(n => n.type === filter);

  if (!filtered.length) { list.innerHTML = emptyState('🔔', 'Aucune notification'); return; }

  const typeIcon = { rdv:'📅', alerte:'⚠️', msg:'💬', eval:'⭐' };
  list.innerHTML = filtered.map(n => `
    <div class="notif-item ${n.lu ? '' : 'unread'} reveal" onclick="markNotifRead(${n.id},this)">
      <div class="notif-icon ${n.type}">${typeIcon[n.type]||'🔔'}</div>
      <div class="notif-text">
        <div class="notif-title">${n.titre}</div>
        <div class="notif-desc">${n.desc}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `).join('');
}

function markNotifRead(id, el) {
  const n = STATE.notifications.find(n => n.id === id);
  if (n) { n.lu = true; el.classList.remove('unread'); updateBadges(); }
}

function markAllNotifRead() {
  STATE.notifications.forEach(n => n.lu = true);
  renderNotifications();
  updateBadges();
  showToast('Toutes les notifications marquées comme lues');
}

function checkFarmerAlerte() {
  // Simule une alerte urgente reçue d'un agriculteur
  const banner = document.getElementById('farmerAlerteBanner');
  const title = document.getElementById('farmerAlerteTitle');
  const desc = document.getElementById('farmerAlerteDesc');
  if (banner) {
    banner.style.display = '';
    if (title) title.textContent = '🚨 Urgence — Akram Chihab (Sétif)';
    if (desc) desc.textContent = 'Plusieurs brebis présentent des diarrhées sévères depuis 2 jours. Intervention urgente demandée.';
  }
}

function respondToFarmerAlerte() {
  openModal('Répondre à l\'urgence', `
    <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:16px">Agriculteur: <strong style="color:var(--text-primary)">Akram Chihab</strong> — Sétif</p>
    <div class="form-group">
      <label class="form-label">Votre réponse</label>
      <textarea class="form-textarea" id="alerteResponse" placeholder="Je serai chez vous le...">Je serai disponible le 27 mai à 14h comme prévu. En attendant, isolez les animaux malades et assurez-vous qu\'ils ont accès à l\'eau propre.</textarea>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">Confirmer le RDV urgent</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="date" class="form-input" id="alerteDate" value="2026-05-27" style="flex:1">
        <input type="time" class="form-input" id="alerteHeure" value="14:00" style="flex:1">
      </div>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="confirmAlertResponse()">✓ Confirmer & Répondre</button>
  `);
}

function confirmAlertResponse() {
  accepterDemande(11);
  closeModal();
  showToast('Réponse envoyée à Akram Chihab — RDV confirmé');
  document.getElementById('farmerAlerteBanner').style.display = 'none';
}

/* ══════════════════════════════════════════
   ALERTES ADMIN
══════════════════════════════════════════ */
function renderAdminAlertes() {
  const list = document.getElementById('adminAlertesList');
  if (!list) return;
  if (!STATE.alertesAdmin.length) { list.innerHTML = emptyState('✅', 'Aucune alerte'); return; }

  const typeColors = { stock_faible:'amber', epidemie:'epidemie', campagne:'campagne', urgent:'urgent' };
  const typeLabels = { stock_faible:'Stock Faible', epidemie:'Épidémie', campagne:'Campagne', urgent:'Urgent' };

  list.innerHTML = STATE.alertesAdmin.map(a => `
    <div class="alerte-card ${typeColors[a.type]} reveal ${a.active?'':'inactive'}" style="${a.active?'':'opacity:0.5'}">
      <div style="font-size:1.6rem">${alerteIcon(a.type)}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
          <span class="alerte-badge ${typeColors[a.type]}" style="background:${alerteColor(a.type,'bg')};color:${alerteColor(a.type,'text')}">${typeLabels[a.type]}</span>
          ${a.active ? '<span style="font-size:0.7rem;color:var(--green-light);font-weight:600">ACTIVE</span>' : '<span style="font-size:0.7rem;color:var(--text-muted)">RÉSOLUE</span>'}
          <span style="font-size:0.72rem;color:var(--text-muted);margin-left:auto">${formatDate(a.date)}</span>
        </div>
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:6px">${a.titre}</div>
        <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:10px">${a.message}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px">
          Wilayas ciblées: <strong style="color:var(--text-secondary)">${a.wilayas[0]==='all' ? 'Toutes les wilayas' : a.wilayas.map(w=>getWilaya(w)).join(', ')}</strong>
        </div>
        ${a.active ? `<div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="openTourneeFromAlerte(${a.id})">🚗 Créer une tournée</button>
          <button class="btn btn-sm" onclick="openModal('Répondre à l\'alerte','<p style=\\'font-size:0.875rem;color:var(--text-secondary)\\'>Entrez vos commentaires sur cette alerte:</p><textarea class=\\'form-textarea\\' style=\\'width:100%\\'>Je prends en charge cette alerte et organiserai une intervention dans les 72h.</textarea>','<button class=\\'btn\\' onclick=\\'closeModal()\\'>Annuler</button><button class=\\'btn btn-primary\\' onclick=\\'showToast(\"Réponse envoyée à l\\'admin\");closeModal()\\'>Envoyer</button>')">💬 Répondre à l'admin</button>
        </div>` : ''}
      </div>
    </div>
  `).join('');
}

function alerteIcon(type) {
  const icons = { stock_faible:'📉', epidemie:'🦠', campagne:'📢', urgent:'🚨' };
  return icons[type] || '⚠️';
}
function alerteColor(type, part) {
  const map = {
    stock_faible: { bg:'rgba(232,168,66,0.15)', text:'var(--amber)' },
    epidemie:     { bg:'rgba(224,89,89,0.15)',  text:'var(--red)' },
    campagne:     { bg:'rgba(79,159,232,0.15)', text:'var(--blue)' },
    urgent:       { bg:'rgba(224,89,89,0.15)',  text:'var(--red)' },
  };
  return map[type]?.[part] || 'var(--text-secondary)';
}

function openTourneeFromAlerte(alerteId) {
  const alerte = alerteId ? STATE.alertesAdmin.find(a => a.id === alerteId) : null;
  const defaultWilayas = alerte ? alerte.wilayas.filter(w=>w!=='all').join(',') : '';

  openModal('🚗 Créer une tournée vétérinaire', `
    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px">
      ${alerte ? `Cette tournée est créée en réponse à l'alerte: <strong style="color:var(--amber)">${alerte.titre}</strong>` : 'Planifiez une nouvelle tournée vétérinaire dans plusieurs wilayas.'}
    </p>
    <div class="profil-form-grid">
      <div class="form-group full">
        <label class="form-label">Titre de la tournée</label>
        <input class="form-input" id="tNom" value="${alerte ? 'Tournée réponse — ' + alerte.titre.split('—')[0].trim() : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Date début</label>
        <input class="form-input" id="tDebut" type="date" value="2026-06-01">
      </div>
      <div class="form-group">
        <label class="form-label">Date fin</label>
        <input class="form-input" id="tFin" type="date" value="2026-06-03">
      </div>
      <div class="form-group full">
        <label class="form-label">Wilayas (séparer par virgule ex: 19,05,26)</label>
        <input class="form-input" id="tWilayas" placeholder="19,05" value="${defaultWilayas}">
      </div>
      <div class="form-group full">
        <label class="form-label">Services proposés</label>
        <input class="form-input" id="tServices" placeholder="Vaccination, Dépistage, Contrôle sanitaire">
      </div>
      <div class="form-group full">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="tDesc" placeholder="Décrivez l'objectif de cette tournée..."></textarea>
      </div>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveTournee(${alerteId||0})">✓ Créer la tournée</button>
  `);
}

function saveTournee(alerteId) {
  const nom = document.getElementById('tNom')?.value.trim();
  if (!nom) { showToast('Veuillez entrer un titre', 'error'); return; }
  const tournee = {
    id: Date.now(),
    titre: nom,
    desc: document.getElementById('tDesc')?.value || '',
    wilayas: (document.getElementById('tWilayas')?.value || '').split(',').map(w=>w.trim()).filter(Boolean),
    date_debut: document.getElementById('tDebut')?.value || '',
    date_fin: document.getElementById('tFin')?.value || '',
    services: document.getElementById('tServices')?.value || '',
    statut: 'planifiee',
    from_alerte: alerteId || null,
  };
  STATE.tournees.unshift(tournee);
  closeModal();
  renderTournees();
  showToast('Tournée créée avec succès ! Les agriculteurs seront notifiés.');
}

/* ══════════════════════════════════════════
   CABINET
══════════════════════════════════════════ */
function renderCabinet() {
  // Services
  const sg = document.getElementById('servicesGrid');
  if (sg) sg.innerHTML = STATE.cabinet.services.map((s,i) => `
    <div class="cabinet-service-item">
      <span class="cabinet-service-icon">${s.icon}</span>
      <span class="cabinet-service-name">${s.name}</span>
      <button onclick="removeService(${i})" style="margin-left:auto;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.75rem;padding:2px 5px" title="Supprimer">✕</button>
    </div>
  `).join('');

  // Horaires
  const hg = document.getElementById('horairesGrid');
  if (hg) {
    hg.innerHTML = '<div class="cal-dow">Dim</div><div class="cal-dow">Lun</div><div class="cal-dow">Mar</div><div class="cal-dow">Mer</div><div class="cal-dow">Jeu</div><div class="cal-dow">Ven</div><div class="cal-dow">Sam</div>' +
      STATE.cabinet.horaires.map((h,i) => `
        <div class="horaire-day ${h.open ? 'active' : ''}" onclick="toggleHoraire(${i})">
          <div class="horaire-day-name">${h.jour}</div>
          <div class="horaire-day-hours">${h.open ? h.debut+'–'+h.fin : 'Fermé'}</div>
        </div>
      `).join('');
  }
}

function toggleHoraire(i) {
  STATE.cabinet.horaires[i].open = !STATE.cabinet.horaires[i].open;
  renderCabinet();
}

function toggleCabinetOpen(el) {
  el.classList.toggle('on');
  STATE.cabinet.ouvert = el.classList.contains('on');
  showToast(STATE.cabinet.ouvert ? 'Cabinet marqué ouvert' : 'Cabinet marqué fermé');
}

function removeService(i) {
  STATE.cabinet.services.splice(i, 1);
  renderCabinet();
}

function openAddServiceModal() {
  const SERVICES = [
    {icon:'💉',name:'Vaccination'},{icon:'🔬',name:'Diagnostic'},{icon:'🩺',name:'Consultation'},
    {icon:'🏥',name:'Chirurgie'},{icon:'💊',name:'Pharmacie vét.'},{icon:'🐄',name:'Bovins'},
    {icon:'🐑',name:'Ovins/Caprins'},{icon:'🐓',name:'Avicoles'},{icon:'🐪',name:'Camelins'},
    {icon:'🐎',name:'Équidés'},{icon:'🧪',name:'Analyses lab'},{icon:'🌡️',name:'Suivi sanitaire'},
  ];
  openModal('Ajouter un service', `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${SERVICES.map(s => `
        <div onclick="addService('${s.icon}','${s.name}')" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);text-align:center;cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor='var(--green-primary)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="font-size:1.5rem;margin-bottom:4px">${s.icon}</div>
          <div style="font-size:0.75rem">${s.name}</div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:12px;display:flex;gap:8px">
      <input class="form-input" id="customServiceIcon" placeholder="🏥" style="width:60px">
      <input class="form-input" id="customServiceName" placeholder="Nom du service" style="flex:1">
      <button class="btn btn-primary btn-sm" onclick="addCustomService()">Ajouter</button>
    </div>
  `, '<button class="btn" onclick="closeModal()">Fermer</button>');
}

function addService(icon, name) {
  STATE.cabinet.services.push({ icon, name });
  renderCabinet();
  closeModal();
  showToast(`Service "${name}" ajouté`);
}

function addCustomService() {
  const icon = document.getElementById('customServiceIcon')?.value.trim() || '⚕️';
  const name = document.getElementById('customServiceName')?.value.trim();
  if (!name) { showToast('Entrez un nom de service', 'error'); return; }
  addService(icon, name);
}

function saveCabinet() {
  STATE.cabinet.nom = document.getElementById('cabinetNom')?.value || STATE.cabinet.nom;
  STATE.cabinet.wilaya = document.getElementById('cabinetWilaya')?.value || STATE.cabinet.wilaya;
  STATE.cabinet.adresse = document.getElementById('cabinetAdresse')?.value || STATE.cabinet.adresse;
  STATE.cabinet.tel = document.getElementById('cabinetTel')?.value || STATE.cabinet.tel;
  STATE.cabinet.email = document.getElementById('cabinetEmail')?.value || STATE.cabinet.email;
  showToast('Cabinet sauvegardé avec succès ! ✓');
}

/* ══════════════════════════════════════════
   CALENDRIER DES DISPONIBILITÉS
══════════════════════════════════════════ */
function renderCalendar() {
  const grid = document.getElementById('calGrid');
  const monthEl = document.getElementById('calMonth');
  if (!grid) return;

  const year = calCurrentMonth.getFullYear();
  const month = calCurrentMonth.getMonth();
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  if (monthEl) monthEl.textContent = `${months[month]} ${year}`;

  const dows = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');

  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1; // 0=Lun
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  for (let i = 0; i < startDow; i++) html += '<div></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const type = STATE.disponibilites[dateStr];
    let cls = 'cal-day';
    if (type === 'available') cls += ' available';
    else if (type === 'rdv') cls += ' has-rdv';
    else if (type === 'tournee') cls += ' has-rdv';
    if (dateStr === todayStr) cls += ' today';
    if (selectedDay === dateStr) cls += ' today';

    const rdvOnDay = STATE.rdvs.filter(r => r.date === dateStr).length;
    html += `<div class="${cls}" onclick="selectDay('${dateStr}')" title="${dateStr}">${d}${rdvOnDay > 0 ? '<div class="cal-day-dot"></div>' : ''}</div>`;
  }

  grid.innerHTML = html;
}

function changeMonth(dir) {
  calCurrentMonth = new Date(calCurrentMonth.getFullYear(), calCurrentMonth.getMonth() + dir, 1);
  renderCalendar();
}

function selectDay(dateStr) {
  selectedDay = dateStr;
  renderCalendar();
  renderCreneaux(dateStr);
}

function renderCreneaux(dateStr) {
  const title = document.getElementById('selectedDayTitle');
  const container = document.getElementById('creneauxContainer');
  if (!title || !container) return;

  title.textContent = `📅 ${formatDate(dateStr)}`;
  const creneaux = STATE.creneaux[dateStr] || [];
  const type = STATE.disponibilites[dateStr];
  const rdvs = STATE.rdvs.filter(r => r.date === dateStr);

  let html = `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
    <button class="btn btn-sm ${type === 'available' ? 'btn-primary' : ''}" onclick="setDayType('${dateStr}','available')">✅ Disponible</button>
    <button class="btn btn-sm" style="${type==='rdv'?'background:rgba(232,168,66,0.2);color:var(--amber);border-color:var(--amber)':''}" onclick="setDayType('${dateStr}','rdv')">📅 RDV</button>
    <button class="btn btn-sm" style="background:rgba(224,89,89,0.1);color:var(--red)" onclick="setDayType('${dateStr}',null)">✕ Indisponible</button>
  </div>`;

  if (rdvs.length) {
    html += `<div style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">RDV ce jour</div>`;
    html += rdvs.map(r => `<div style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:0.82rem;margin-bottom:6px"><span style="color:var(--amber)">${r.heure}</span> · <strong>${r.agriculteur}</strong> · ${r.animaux}</div>`).join('');
  }

  if (creneaux.length) {
    html += `<div style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin:12px 0 8px">Créneaux disponibles</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px">` +
      creneaux.map(c => `<span style="padding:5px 12px;border:1px solid var(--border-active);border-radius:99px;font-size:0.8rem;color:var(--green-light);cursor:pointer" onclick="removeCreneaux('${dateStr}','${c}',this)">${c} ✕</span>`).join('') +
      `</div>`;
  }

  html += `<div style="display:flex;gap:8px;margin-top:12px">
    <input type="time" class="form-input" id="newCreneau" value="08:00" style="flex:1">
    <button class="btn btn-primary btn-sm" onclick="addCreneau('${dateStr}')">+ Ajouter</button>
  </div>`;

  container.innerHTML = html;
}

function setDayType(dateStr, type) {
  if (type === null) delete STATE.disponibilites[dateStr];
  else STATE.disponibilites[dateStr] = type;
  renderCalendar();
  renderCreneaux(dateStr);
}

function addCreneau(dateStr) {
  const val = document.getElementById('newCreneau')?.value;
  if (!val) return;
  if (!STATE.creneaux[dateStr]) STATE.creneaux[dateStr] = [];
  if (!STATE.creneaux[dateStr].includes(val)) {
    STATE.creneaux[dateStr].push(val);
    STATE.creneaux[dateStr].sort();
    if (!STATE.disponibilites[dateStr]) STATE.disponibilites[dateStr] = 'available';
    renderCalendar();
    renderCreneaux(dateStr);
    showToast(`Créneau ${val} ajouté`);
  }
}

function removeCreneaux(dateStr, creneau, el) {
  STATE.creneaux[dateStr] = STATE.creneaux[dateStr].filter(c => c !== creneau);
  el.remove();
}

function saveDisponibilites() {
  showToast('Disponibilités sauvegardées ✓ — Les agriculteurs peuvent voir vos créneaux.');
  // TODO: POST /api/veterinaire/disponibilites/
}

function toggleDispo(el) {
  el.classList.toggle('on');
  STATE.vet.disponible = el.classList.contains('on');
  const dot = document.getElementById('disponibleDot');
  if (dot) dot.title = STATE.vet.disponible ? 'Disponible' : 'Non disponible';
  showToast(STATE.vet.disponible ? '✅ Vous êtes maintenant disponible' : '🔴 Vous êtes indisponible');
}

function renderDispoStats() {
  const el = document.getElementById('dispoStats');
  if (!el) return;
  const nbDispo = Object.values(STATE.disponibilites).filter(v=>v==='available').length;
  const nbRdv = Object.values(STATE.disponibilites).filter(v=>v==='rdv').length;
  const nbTournee = Object.values(STATE.disponibilites).filter(v=>v==='tournee').length;
  el.innerHTML = `
    ${statCard('✅', nbDispo, 'Jours disponibles', '')}
    ${statCard('📅', nbRdv, 'Jours avec RDV', 'amber')}
    ${statCard('🚗', nbTournee, 'Jours de tournée', 'blue')}
    ${statCard('📊', nbDispo+nbRdv+nbTournee, 'Jours total planifiés', '')}
  `;
}

/* ══════════════════════════════════════════
   RENDEZ-VOUS LIST
══════════════════════════════════════════ */
function renderRdvList() {
  const container = document.getElementById('rdvListContainer');
  if (!container) return;

  const filterS = document.getElementById('rdvFilterStatut')?.value || 'all';
  const filterT = document.getElementById('rdvFilterType')?.value || 'all';

  let rdvs = STATE.rdvs;
  if (filterS !== 'all') rdvs = rdvs.filter(r => r.statut === filterS);
  if (filterT !== 'all') rdvs = rdvs.filter(r => r.type === filterT);

  if (!rdvs.length) { container.innerHTML = emptyState('📅', 'Aucun rendez-vous trouvé'); return; }

  // Group by date
  const groups = {};
  rdvs.forEach(r => { if (!groups[r.date]) groups[r.date] = []; groups[r.date].push(r); });

  container.innerHTML = Object.entries(groups).sort((a,b) => b[0].localeCompare(a[0])).map(([date, list]) => `
    <div style="margin-bottom:20px">
      <div class="vet-section-title" style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px">${formatDate(date)}</div>
      ${list.map(r => rdvFullCard(r)).join('')}
    </div>
  `).join('');
}

function rdvFullCard(r) {
  const statutColors = { confirme:'var(--green-light)', en_attente:'var(--amber)', termine:'var(--text-muted)', refuse:'var(--red)', annule:'var(--text-muted)' };
  const statutLabels = { confirme:'Confirmé', en_attente:'En attente', termine:'Terminé', refuse:'Refusé', annule:'Annulé' };
  return `
    <div class="vet-card reveal" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 20px;flex-wrap:wrap">
        <div style="width:44px;height:44px;background:rgba(74,161,90,0.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${rdvTypeIcon(r.type)}</div>
        <div style="flex:1;min-width:180px">
          <div style="font-weight:700;font-size:0.95rem">${r.agriculteur}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px">${r.heure} · ${r.animaux} (${r.nb}) · Wilaya ${getWilaya(r.wilaya)}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:3px">${r.desc}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span style="font-size:0.72rem;padding:3px 10px;border-radius:99px;background:${statutColors[r.statut]}20;color:${statutColors[r.statut]};font-weight:700">${statutLabels[r.statut]}</span>
          <span style="font-size:0.72rem;color:var(--text-muted)">${rdvTypeName(r.type)}</span>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          ${r.statut === 'confirme' ? `<button class="btn btn-sm" onclick="openDiagModal(${r.id})">📋 Diagnostic</button>` : ''}
          ${r.statut === 'en_attente' ? `
            <button class="btn btn-sm" style="color:var(--green-light)" onclick="changeRdvStatut(${r.id},'confirme')">✓ Confirmer</button>
            <button class="btn btn-sm" style="color:var(--red)" onclick="changeRdvStatut(${r.id},'refuse')">✕ Refuser</button>
          ` : ''}
          ${r.statut === 'confirme' ? `<button class="btn btn-sm" style="color:var(--green-light)" onclick="changeRdvStatut(${r.id},'termine')">✓ Terminé</button>` : ''}
          <button class="btn btn-sm" onclick="openRdvDetailModal(${r.id})">👁 Détails</button>
        </div>
      </div>
      ${r.diagnostic ? `<div style="padding:10px 20px 14px;border-top:1px solid var(--border);font-size:0.82rem">
        <span style="color:var(--green-light);font-weight:600">Diagnostic:</span> <span style="color:var(--text-secondary)">${r.diagnostic}</span>
        ${r.traitement ? ` · <span style="color:var(--amber);font-weight:600">Traitement:</span> <span style="color:var(--text-secondary)">${r.traitement}</span>` : ''}
      </div>` : ''}
    </div>
  `;
}

function rdvTypeIcon(type) {
  const m = { consultation:'🩺', vaccination:'💉', urgence:'🚨', suivi:'📋', chirurgie:'🏥' };
  return m[type] || '📅';
}
function rdvTypeName(type) {
  const m = { consultation:'Consultation', vaccination:'Vaccination', urgence:'Urgence', suivi:'Suivi', chirurgie:'Chirurgie' };
  return m[type] || type;
}

function changeRdvStatut(id, newStatut) {
  const rdv = STATE.rdvs.find(r => r.id === id);
  if (rdv) { rdv.statut = newStatut; renderRdvList(); renderDashboard(); updateBadges(); showToast(`RDV #${id} — statut mis à jour: ${newStatut}`); }
}

function openDiagModal(id) {
  const rdv = STATE.rdvs.find(r => r.id === id);
  if (!rdv) return;
  openModal(`📋 Diagnostic — ${rdv.agriculteur}`, `
    <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px">${formatDate(rdv.date)} · ${rdv.heure} · ${rdv.animaux} (${rdv.nb})</div>
    <div class="form-group" style="margin-bottom:12px">
      <label class="form-label">Description du problème</label>
      <textarea class="form-textarea" readonly style="opacity:0.7">${rdv.desc}</textarea>
    </div>
    <div class="form-group" style="margin-bottom:12px">
      <label class="form-label">Diagnostic</label>
      <textarea class="form-textarea" id="diagInput" placeholder="Entrez votre diagnostic...">${rdv.diagnostic||''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Traitement prescrit</label>
      <textarea class="form-textarea" id="traitInput" placeholder="Médicaments, posologie...">${rdv.traitement||''}</textarea>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Fermer</button>
    <button class="btn btn-primary" onclick="saveDiag(${id})">💾 Sauvegarder</button>
  `);
}

function saveDiag(id) {
  const rdv = STATE.rdvs.find(r => r.id === id);
  if (rdv) {
    rdv.diagnostic = document.getElementById('diagInput')?.value || '';
    rdv.traitement = document.getElementById('traitInput')?.value || '';
    closeModal();
    renderRdvList();
    showToast('Diagnostic sauvegardé ✓');
  }
}

function openRdvDetailModal(id) {
  const rdv = STATE.rdvs.find(r => r.id === id);
  if (!rdv) return;
  openModal(`👁 Détails RDV #${id}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.85rem">
      <div><span style="color:var(--text-muted)">Agriculteur</span><div style="font-weight:600;margin-top:2px">${rdv.agriculteur}</div></div>
      <div><span style="color:var(--text-muted)">Wilaya</span><div style="font-weight:600;margin-top:2px">${getWilaya(rdv.wilaya)}</div></div>
      <div><span style="color:var(--text-muted)">Date</span><div style="font-weight:600;margin-top:2px">${formatDate(rdv.date)} · ${rdv.heure}</div></div>
      <div><span style="color:var(--text-muted)">Type</span><div style="font-weight:600;margin-top:2px">${rdvTypeName(rdv.type)}</div></div>
      <div><span style="color:var(--text-muted)">Animaux</span><div style="font-weight:600;margin-top:2px">${rdv.animaux} — ${rdv.nb} têtes</div></div>
      <div><span style="color:var(--text-muted)">Statut</span><div style="font-weight:600;margin-top:2px">${rdv.statut}</div></div>
      <div style="grid-column:1/-1"><span style="color:var(--text-muted)">Description</span><div style="margin-top:4px;color:var(--text-secondary);line-height:1.5">${rdv.desc}</div></div>
      ${rdv.diagnostic ? `<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Diagnostic</span><div style="margin-top:4px;color:var(--green-light)">${rdv.diagnostic}</div></div>` : ''}
      ${rdv.traitement ? `<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Traitement</span><div style="margin-top:4px;color:var(--amber)">${rdv.traitement}</div></div>` : ''}
    </div>
  `, '<button class="btn btn-primary" onclick="closeModal()">Fermer</button>');
}

function openRdvModal() {
  openModal('+ Nouveau Rendez-vous', `
    <div class="profil-form-grid">
      <div class="form-group full">
        <label class="form-label">Agriculteur / Éleveur</label>
        <input class="form-input" id="newRdvAgri" placeholder="Nom de l'agriculteur">
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" class="form-input" id="newRdvDate">
      </div>
      <div class="form-group">
        <label class="form-label">Heure</label>
        <input type="time" class="form-input" id="newRdvHeure" value="09:00">
      </div>
      <div class="form-group">
        <label class="form-label">Type de visite</label>
        <select class="form-select" id="newRdvType">
          <option value="consultation">Consultation</option>
          <option value="vaccination">Vaccination</option>
          <option value="urgence">Urgence</option>
          <option value="suivi">Suivi</option>
          <option value="chirurgie">Chirurgie</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Wilaya</label>
        <select class="form-select" id="newRdvWilaya">${WILAYAS.map(w=>`<option value="${w[0]}">${w[0]}—${w[1]}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Animaux concernés</label>
        <input class="form-input" id="newRdvAnimaux" placeholder="Bovins, Ovins...">
      </div>
      <div class="form-group">
        <label class="form-label">Nombre de têtes</label>
        <input type="number" class="form-input" id="newRdvNb" min="1" value="1">
      </div>
      <div class="form-group full">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="newRdvDesc" placeholder="Motif de la consultation..."></textarea>
      </div>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveNewRdv()">+ Créer le RDV</button>
  `);
}

function saveNewRdv() {
  const agri = document.getElementById('newRdvAgri')?.value.trim();
  const date = document.getElementById('newRdvDate')?.value;
  if (!agri || !date) { showToast('Veuillez remplir les champs requis', 'error'); return; }
  const rdv = {
    id: Date.now(),
    agriculteur: agri,
    wilaya: document.getElementById('newRdvWilaya')?.value || '19',
    date, heure: document.getElementById('newRdvHeure')?.value || '09:00',
    type: document.getElementById('newRdvType')?.value || 'consultation',
    statut: 'confirme',
    animaux: document.getElementById('newRdvAnimaux')?.value || 'N/A',
    nb: parseInt(document.getElementById('newRdvNb')?.value) || 1,
    desc: document.getElementById('newRdvDesc')?.value || '',
  };
  STATE.rdvs.unshift(rdv);
  if (!STATE.disponibilites[date]) STATE.disponibilites[date] = 'rdv';
  closeModal();
  renderRdvList();
  renderCalendar();
  renderDashboard();
  updateBadges();
  showToast(`RDV avec ${agri} créé pour le ${formatDate(date)} ✓`);
}

/* ══════════════════════════════════════════
   DEMANDES
══════════════════════════════════════════ */
function renderDemandes() {
  const attente = document.getElementById('demandesEnAttente');
  const traitees = document.getElementById('demandesTraitees');
  if (!attente || !traitees) return;

  const pending = STATE.demandes.filter(d => d.statut === 'en_attente');
  const done = STATE.demandes.filter(d => d.statut !== 'en_attente');

  attente.innerHTML = pending.length
    ? pending.map(d => demandeCard(d, true)).join('')
    : emptyState('✅', 'Aucune demande en attente');

  traitees.innerHTML = done.length
    ? done.map(d => demandeCard(d, false)).join('')
    : emptyState('📜', 'Aucune demande traitée récemment');
}

function demandeCard(d, showActions) {
  const urgence = d.type === 'urgence';
  return `
    <div class="vet-card reveal ${urgence ? 'alerte-card urgent' : ''}" style="margin-bottom:12px;border:1px solid ${urgence?'var(--red)':'var(--border)'}">
      <div style="display:flex;align-items:flex-start;gap:14px;padding:18px 20px;flex-wrap:wrap">
        <div style="width:44px;height:44px;background:${urgence?'rgba(224,89,89,0.15)':'rgba(74,161,90,0.1)'};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${rdvTypeIcon(d.type)}</div>
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-weight:700;font-size:0.95rem">${d.agriculteur}</span>
            ${urgence ? '<span style="font-size:0.7rem;padding:2px 8px;background:rgba(224,89,89,0.15);color:var(--red);border-radius:99px;font-weight:700">URGENCE</span>' : ''}
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">📅 ${formatDate(d.date)} · ${d.heure} · 📍 ${getWilaya(d.wilaya)}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">🐾 ${d.animaux} — ${d.nb} têtes · 📞 ${d.tel}</div>
          <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5;padding:8px 12px;background:var(--bg-deep);border-radius:6px;margin-top:6px">"${d.desc}"</div>
          ${d.motifRefus ? `<div style="font-size:0.78rem;color:var(--red);margin-top:6px">❌ Motif de refus: ${d.motifRefus}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
          <span style="font-size:0.7rem;color:var(--text-muted)">${new Date(d.timestamp).toLocaleString('fr-DZ')}</span>
          ${showActions ? `
            <div style="display:flex;gap:8px;margin-top:4px">
              <button class="btn btn-primary btn-sm" onclick="accepterDemande(${d.id})">✓ Accepter</button>
              <button class="btn btn-sm" style="background:rgba(224,89,89,0.1);color:var(--red)" onclick="refuserDemandeModal(${d.id})">✕ Refuser</button>
            </div>
            <button class="btn btn-sm" onclick="openMessageToFarmer(${d.id})">💬 Contacter</button>
          ` : `
            <span style="font-size:0.75rem;padding:4px 10px;border-radius:99px;background:${d.statut==='accepte'?'rgba(74,161,90,0.15)':'rgba(224,89,89,0.1)'};color:${d.statut==='accepte'?'var(--green-light)':'var(--red)'};font-weight:600">
              ${d.statut === 'accepte' ? '✓ Acceptée' : '✕ Refusée'}
            </span>
          `}
        </div>
      </div>
    </div>
  `;
}

function accepterDemande(id) {
  const d = STATE.demandes.find(d => d.id === id);
  if (!d) return;
  d.statut = 'accepte';
  // Créer un RDV automatiquement
  const rdv = { id: Date.now(), agriculteur: d.agriculteur, wilaya: d.wilaya, date: d.date, heure: d.heure, type: d.type, statut: 'confirme', animaux: d.animaux, nb: d.nb, desc: d.desc };
  STATE.rdvs.unshift(rdv);
  if (!STATE.disponibilites[d.date]) STATE.disponibilites[d.date] = 'rdv';
  renderDemandes();
  renderRdvList();
  renderCalendar();
  renderDashboard();
  updateBadges();
  showToast(`Demande de ${d.agriculteur} acceptée — RDV ajouté ✓`);
}

function refuserDemandeModal(id) {
  const d = STATE.demandes.find(d => d.id === id);
  openModal(`Refuser la demande de ${d?.agriculteur}`, `
    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px">Indiquez la raison du refus (sera envoyée à l'agriculteur) :</p>
    <textarea class="form-textarea" id="motifRefus" placeholder="Ex: Date non disponible, veuillez choisir une autre date." style="width:100%"></textarea>
  `, `
    <button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn btn-sm" style="background:rgba(224,89,89,0.15);color:var(--red)" onclick="refuserDemande(${id})">✕ Confirmer le refus</button>
  `);
}

function refuserDemande(id) {
  const d = STATE.demandes.find(d => d.id === id);
  if (!d) return;
  d.statut = 'refuse';
  d.motifRefus = document.getElementById('motifRefus')?.value || 'Non disponible';
  closeModal();
  renderDemandes();
  updateBadges();
  showToast(`Demande de ${d.agriculteur} refusée`);
}

function accepterTousDemandes() {
  const pending = STATE.demandes.filter(d => d.statut === 'en_attente');
  pending.forEach(d => accepterDemande(d.id));
  showToast(`${pending.length} demande(s) acceptée(s) ✓`);
}

function openMessageToFarmer(id) {
  const d = STATE.demandes.find(d => d.id === id);
  openModal(`💬 Contacter ${d?.agriculteur}`, `
    <textarea class="form-textarea" id="msgToFarmer" style="width:100%;min-height:120px" placeholder="Votre message...">Bonjour, concernant votre demande de rendez-vous du ${d?formatDate(d.date):''}, voici ma réponse :</textarea>
  `, `
    <button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="showToast('Message envoyé à ${d?.agriculteur} ✓');closeModal()">📤 Envoyer</button>
  `);
}

/* ══════════════════════════════════════════
   TOURNÉES
══════════════════════════════════════════ */
function renderTournees() {
  const grid = document.getElementById('tourneeGrid');
  if (!grid) return;
  if (!STATE.tournees.length) { grid.innerHTML = emptyState('🚗', 'Aucune tournée planifiée'); return; }

  const statutColors = { planifiee:'var(--amber)', en_cours:'var(--green-light)', terminee:'var(--text-muted)', annulee:'var(--red)' };
  const statutLabels = { planifiee:'Planifiée', en_cours:'En cours', terminee:'Terminée', annulee:'Annulée' };

  grid.innerHTML = STATE.tournees.map(t => `
    <div class="tournee-card reveal">
      ${t.from_alerte ? '<div style="font-size:0.68rem;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">📢 Réponse à alerte admin</div>' : ''}
      <div class="tournee-title" style="cursor:pointer;color:var(--green-primary);text-decoration:underline;" onclick="openTourneeDetailModal(${t.id})">${t.titre}</div>
      <div class="tournee-desc">${t.desc || ''}</div>
      <div class="tournee-dates">📅 ${formatDate(t.date_debut)} → ${formatDate(t.date_fin)}</div>
      <div class="tournee-wilayas">${(t.wilayas||[]).map(w=>`<span class="tournee-wilaya">Wilaya ${getWilaya(w)}</span>`).join('')}</div>
      ${t.services ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:10px">🔧 ${t.services}</div>` : ''}
      ${t.tarif ? `<div style="font-size:0.78rem;color:var(--green-light);margin-bottom:10px">💰 Tarif spécial: ${(+t.tarif).toLocaleString()} DA</div>` : ''}
      <div class="tournee-footer">
        <span style="font-size:0.72rem;padding:3px 9px;border-radius:99px;background:${statutColors[t.statut]||'var(--amber)'}20;color:${statutColors[t.statut]||'var(--amber)'};font-weight:700">${statutLabels[t.statut]||t.statut}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="openTourneeDetailModal(${t.id})">👁 Détails</button>
          <button class="btn btn-sm" onclick="changeTourneeStatut(${t.id})">▶ Démarrer</button>
          <button class="btn btn-sm" style="color:var(--red)" onclick="deleteTournee(${t.id})">✕</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openTourneeDetailModal(id) {
  const t = STATE.tournees.find(t => t.id === id);
  if (!t) return;
  const statutColors = { planifiee:'var(--amber)', en_cours:'var(--green-light)', terminee:'var(--text-muted)', annulee:'var(--red)' };
  const statutLabels = { planifiee:'Planifiée', en_cours:'En cours', terminee:'Terminée', annulee:'Annulée' };
  const vetNom = STATE.vet ? `Dr. ${STATE.vet.prenom} ${STATE.vet.nom}` : '';
  const vetSpec = STATE.vet ? STATE.vet.specialite : '';
  const vetWilaya = STATE.vet ? getWilaya(STATE.vet.wilaya) : '';
  const wilayasNoms = (t.wilayas||[]).map(w => getWilaya(w)).join(', ') || '—';
  openModal(`🚗 Détails de la Tournée`, `
    <div style="display:flex;flex-direction:column;gap:14px;font-size:0.9rem">
      <div style="padding:14px;background:rgba(74,161,90,0.07);border-radius:var(--radius-sm);border-left:3px solid var(--green-primary)">
        <div style="font-weight:700;font-size:1.05rem;margin-bottom:4px">${t.titre}</div>
        ${t.from_alerte ? '<div style="font-size:0.72rem;color:var(--amber);font-weight:600">📢 Créée en réponse à une alerte admin</div>' : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px">VÉTÉRINAIRE</div>
          <div style="font-weight:600">${vetNom}</div>
          ${vetSpec ? `<div style="font-size:0.78rem;color:var(--text-secondary)">${vetSpec}</div>` : ''}
          ${vetWilaya ? `<div style="font-size:0.78rem;color:var(--text-secondary)">📍 ${vetWilaya}</div>` : ''}
        </div>
        <div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px">STATUT</div>
          <span style="font-size:0.82rem;padding:4px 12px;border-radius:99px;background:${(statutColors[t.statut]||'var(--amber)')}20;color:${statutColors[t.statut]||'var(--amber)'};font-weight:700">${statutLabels[t.statut]||t.statut}</span>
        </div>
      </div>
      <div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px">PÉRIODE</div>
        <div style="font-weight:600">📅 ${formatDate(t.date_debut)} → ${formatDate(t.date_fin)}</div>
      </div>
      <div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px">WILAYAS CIBLÉES</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${(t.wilayas||[]).map(w=>`<span style="background:rgba(74,161,90,0.12);color:var(--green-primary);padding:3px 10px;border-radius:99px;font-size:0.78rem;font-weight:600">📍 ${getWilaya(w)}</span>`).join('') || '—'}</div>
      </div>
      ${t.desc ? `<div><div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px">DESCRIPTION</div><div style="color:var(--text-secondary)">${t.desc}</div></div>` : ''}
      ${t.services ? `<div><div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px">SERVICES OFFERTS</div><div style="color:var(--text-secondary)">🔧 ${t.services}</div></div>` : ''}
      ${t.tarif ? `<div><div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px">TARIF SPÉCIAL</div><div style="font-weight:700;color:var(--green-light)">💰 ${(+t.tarif).toLocaleString()} DA</div></div>` : ''}
    </div>
  `, `<button class="btn" onclick="closeModal()">Fermer</button>`);
}

function openTourneeModal() { openTourneeFromAlerte(0); }

function changeTourneeStatut(id) {
  const t = STATE.tournees.find(t => t.id === id);
  if (!t) return;
  const flow = { planifiee:'en_cours', en_cours:'terminee', terminee:'planifiee' };
  t.statut = flow[t.statut] || 'planifiee';
  renderTournees();
  showToast(`Tournée "${t.titre}" — statut: ${t.statut}`);
}

function deleteTournee(id) {
  STATE.tournees = STATE.tournees.filter(t => t.id !== id);
  renderTournees();
  showToast('Tournée supprimée');
}

/* ══════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════ */
function renderConversations() {
  const list = document.getElementById('conversationsList');
  if (!list) return;
  list.innerHTML = STATE.messages.conversations.map(c => `
    <div onclick="openConversation(${c.id},this)" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;${currentConvId===c.id?'background:rgba(74,161,90,0.1);':''}border:1px solid transparent;margin-bottom:4px" onmouseover="if(${currentConvId}!==${c.id})this.style.background='var(--bg-card-hover)'" onmouseout="if(${currentConvId}!==${c.id})this.style.background=''">
      <div style="width:38px;height:38px;background:linear-gradient(135deg,var(--green-primary),var(--amber));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;position:relative">
        ${c.avatar}
        ${!c.lu ? '<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:var(--red);border-radius:50%;border:2px solid var(--bg-panel)"></div>' : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.875rem;font-weight:${c.lu?'500':'700'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.agriculteur}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.lastMsg}</div>
      </div>
      <div style="font-size:0.68rem;color:var(--text-muted);flex-shrink:0">${c.lastTime}</div>
    </div>
  `).join('');
}

function openConversation(id) {
  currentConvId = id;
  const conv = STATE.messages.conversations.find(c => c.id === id);
  if (!conv) return;
  conv.lu = true;
  renderConversations();
  updateBadges();

  const header = document.getElementById('msgHeader');
  if (header) header.innerHTML = `<span class="vet-card-title">${conv.avatar} ${conv.agriculteur} — <span style="font-size:0.75rem;color:var(--text-secondary)">${getWilaya(conv.wilaya)}</span></span>`;

  const body = document.getElementById('msgBody');
  const chats = STATE.messages.chats[id] || [];
  if (body) body.innerHTML = chats.map(m => `
    <div style="display:flex;justify-content:${m.from==='vet'?'flex-end':'flex-start'}">
      <div style="max-width:75%;padding:10px 14px;border-radius:${m.from==='vet'?'14px 14px 4px 14px':'14px 14px 14px 4px'};background:${m.from==='vet'?'var(--green-primary)':'var(--bg-card)'};color:${m.from==='vet'?'#fff':'var(--text-primary)'};font-size:0.875rem;line-height:1.4">
        ${m.text}
        <div style="font-size:0.65rem;opacity:0.7;margin-top:4px;text-align:right">${m.time}</div>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-text">Commencer la conversation</div></div>';
  if (body) body.scrollTop = body.scrollHeight;

  const inputArea = document.getElementById('msgInput');
  if (inputArea) inputArea.style.display = '';
}

function sendMessage() {
  if (!currentConvId) return;
  const input = document.getElementById('msgText');
  const text = input?.value.trim();
  if (!text) return;
  if (!STATE.messages.chats[currentConvId]) STATE.messages.chats[currentConvId] = [];
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  STATE.messages.chats[currentConvId].push({ from:'vet', text, time });
  const conv = STATE.messages.conversations.find(c => c.id === currentConvId);
  if (conv) { conv.lastMsg = text; conv.lastTime = time; }
  if (input) input.value = '';
  openConversation(currentConvId);
  showToast('Message envoyé ✓');
}

function filterConversations(q) {
  const items = document.querySelectorAll('#conversationsList > div');
  items.forEach(el => el.style.display = el.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none');
}

/* ══════════════════════════════════════════
   PROFIL
══════════════════════════════════════════ */
function renderProfil() {
  const evalEl = document.getElementById('evalsList');
  if (evalEl) evalEl.innerHTML = STATE.evaluations.map(e => `
    <div style="padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:0.875rem;font-weight:600">${e.agriculteur}</span>
        <span style="font-size:0.8rem">${'⭐'.repeat(e.note)}</span>
      </div>
      <div style="font-size:0.8rem;color:var(--text-secondary)">${e.commentaire}</div>
      <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">${e.date}</div>
    </div>
  `).join('');
}

function saveProfil() {
  STATE.vet.prenom = document.getElementById('profilPrenom')?.value || STATE.vet.prenom;
  STATE.vet.nom = document.getElementById('profilNom')?.value || STATE.vet.nom;
  STATE.vet.specialite = document.getElementById('profilSpecialite')?.value || STATE.vet.specialite;
  STATE.vet.wilaya = document.getElementById('profilWilaya')?.value || STATE.vet.wilaya;
  const fullName = `Dr. ${STATE.vet.prenom} ${STATE.vet.nom}`;
  document.getElementById('sidebarVetName').textContent = fullName;
  document.getElementById('sidebarVetSpec').textContent = STATE.vet.specialite;
  document.getElementById('profilFullName').textContent = fullName;
  document.getElementById('profilSpec').textContent = `${STATE.vet.specialite} · ${getWilaya(STATE.vet.wilaya)}`;
  showToast('Profil sauvegardé avec succès ✓');
}

function toggleProfilDispo(el) {
  el.classList.toggle('on');
  STATE.vet.disponible = el.classList.contains('on');
  const mainToggle = document.getElementById('dispoToggle');
  if (mainToggle) {
    mainToggle.classList.toggle('on', STATE.vet.disponible);
  }
  const dot = document.getElementById('disponibleDot');
  if (dot) dot.title = STATE.vet.disponible ? 'Disponible' : 'Non disponible';
  showToast(STATE.vet.disponible ? '✅ Vous acceptez de nouveaux RDV' : '🔴 Vous n\'acceptez plus de nouveaux RDV');
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-DZ', { day:'numeric', month:'long', year:'numeric' });
}

/* ──────────────────────────────────────────
   SCROLL REVEAL
────────────────────────────────────────── */
function initRevealObserver() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  // Re-observe on page change
  window._observeReveal = function() {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => io.observe(el));
  };
}

// Re-run reveal when showing pages
const _origShowPage = window.showPage;
/* ── Override showPage to also reveal cards in newly-shown page ───── */
(function () {
  const origShowPage = window.showPage;
  if (typeof origShowPage !== 'function') return;
  window.showPage = function (pageId, btn) {
    origShowPage(pageId, btn);
    // Mark all .reveal inside the now-active page as visible immediately,
    // so cards rendered dynamically inside hidden pages are seen on switch.
    requestAnimationFrame(function () {
      document.querySelectorAll('.vet-page.active .reveal').forEach(function (el) {
        el.classList.add('visible');
      });
      if (typeof window._observeReveal === 'function') window._observeReveal();
    });
  };
})();

/* ── Patch render functions to flag freshly-rendered cards visible ─── */
(function () {
  const wrapped = ['renderRdvList', 'renderDemandes', 'renderTournees', 'renderProfil', 'renderCabinet', 'renderAdminAlertes', 'renderNotifications', 'renderConversations', 'renderDashboard', 'renderCalendar'];
  wrapped.forEach(function (fnName) {
    const orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = function () {
      const r = orig.apply(this, arguments);
      requestAnimationFrame(function () {
        document.querySelectorAll('.vet-page.active .reveal').forEach(function (el) {
          el.classList.add('visible');
        });
      });
      return r;
    };
  });
})();
