/* ═══════════════════════════════════════════════════════════════
   AGRICULTEUR-VET.JS — AgriGov
   Aide Vétérinaire + Notifications pour le dashboard agriculteur
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function agriGetCsrf() {
  const c = document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith('csrftoken='));
  return c ? c.split('=')[1] : '';
}

async function agriApiGet(url) {
  const r = await fetch(url, { credentials: 'same-origin' });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

async function agriApiPost(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': agriGetCsrf() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

/* ── Wilayas ───────────────────────────────────────── */
const AGRI_WILAYAS = [
  ['01','Adrar'],['02','Chlef'],['03','Laghouat'],['04','Oum El Bouaghi'],['05','Batna'],
  ['06','Béjaïa'],['07','Biskra'],['08','Béchar'],['09','Blida'],['10','Bouïra'],
  ['11','Tamanrasset'],['12','Tébessa'],['13','Tlemcen'],['14','Tiaret'],['15','Tizi Ouzou'],
  ['16','Alger'],['17','Djelfa'],['18','Jijel'],['19','Sétif'],['20','Saïda'],
  ['21','Skikda'],['22','Sidi Bel Abbès'],['23','Annaba'],['24','Guelma'],['25','Constantine'],
  ['26','Médéa'],['27','Mostaganem'],['28',"M'Sila"],['29','Mascara'],['30','Ouargla'],
  ['31','Oran'],['32','El Bayadh'],['33','Illizi'],['34','Bordj Bou Arréridj'],['35','Boumerdès'],
  ['36','El Tarf'],['37','Tindouf'],['38','Tissemsilt'],['39','El Oued'],['40','Khenchela'],
  ['41','Souk Ahras'],['42','Tipaza'],['43','Mila'],['44','Aïn Defla'],['45','Naâma'],
  ['46','Aïn Témouchent'],['47','Ghardaïa'],['48','Relizane'],['49',"El M'Ghair"],['50','El Meniaa'],
  ['51','Ouled Djellal'],['52','Bordj Baji Mokhtar'],['53','Béni Abbès'],['54','Timimoun'],
  ['55','Touggourt'],['56','Djanet'],['57','In Salah'],['58','In Guezzam'],
];
function agriGetWilaya(code) {
  const w = AGRI_WILAYAS.find(w => w[0] === code);
  return w ? w[1] : code;
}

/* ── Render Tournées / Annonces ────────────────────── */
async function agriLoadTournees() {
  const el = document.getElementById('agriTourneesContainer');
  if (!el) return;
  try {
    const data = await agriApiGet('/api/agri/tournees/');
    const tournees = data.tournees || [];
    if (!tournees.length) {
      el.innerHTML = '<div style="padding:24px;text-align:center;color:#888">Aucune tournée annoncée pour le moment.</div>';
      return;
    }
    el.innerHTML = tournees.map(t => `
      <div style="border:1px solid rgba(0,0,0,0.08);border-radius:10px;padding:16px;margin-bottom:12px;background:rgba(255,255,255,0.6)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px">🚗 ${escAgri(t.titre)}</div>
            <div style="font-size:0.82rem;color:#555;margin-bottom:6px">👨‍⚕️ Dr. ${escAgri(t.veterinaire_nom)}</div>
            <div style="font-size:0.82rem;color:#555">📍 ${escAgri((t.wilayas_noms || []).join(', ') || 'Toutes les wilayas')}</div>
            <div style="font-size:0.82rem;color:#555;margin-top:2px">📅 Du ${t.date_debut} au ${t.date_fin}</div>
            ${t.services ? `<div style="font-size:0.8rem;color:#777;margin-top:4px">🏥 ${escAgri(t.services)}</div>` : ''}
            ${t.description ? `<div style="font-size:0.82rem;margin-top:8px">${escAgri(t.description)}</div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            ${t.tarif ? `<div style="font-weight:700;color:var(--agri-primary,#2d7a2d);font-size:0.9rem">${t.tarif} DA</div>` : '<div style="font-size:0.8rem;color:#888">Tarif normal</div>'}
            <button onclick="agriDemanderRdvFromTournee(${t.veterinaire_id},'${escAgri(t.veterinaire_nom)}',${t.tarif || null})" style="margin-top:8px;background:var(--agri-primary,#2d7a2d);color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:0.8rem;cursor:pointer">
              Demander RDV
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = '<div style="padding:16px;color:#e55;font-size:0.85rem">Impossible de charger les tournées.</div>';
  }
}

/* ── Render Vétérinaires disponibles ───────────────── */
async function agriLoadVets() {
  const el = document.getElementById('agriVetsContainer');
  if (!el) return;
  try {
    const data = await agriApiGet('/api/agri/veterinaires/');
    const vets = data.veterinaires || [];
    if (!vets.length) {
      el.innerHTML = '<div style="padding:24px;text-align:center;color:#888">Aucun vétérinaire disponible pour le moment.</div>';
      return;
    }
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">` +
      vets.map(v => `
        <div style="border:1px solid rgba(0,0,0,0.09);border-radius:12px;padding:16px;background:rgba(255,255,255,0.65)">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px">👨‍⚕️ Dr. ${escAgri(v.nom)}</div>
          <div style="font-size:0.8rem;color:#555;margin-bottom:2px">🔬 ${escAgri(v.specialite || 'Médecine vétérinaire')}</div>
          <div style="font-size:0.8rem;color:#555;margin-bottom:2px">📍 ${agriGetWilaya(v.wilaya)}</div>
          <div style="font-size:0.8rem;color:#555;margin-bottom:8px">⭐ ${v.note}/5 · ${v.consultations} consultations</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            ${v.tarif_defini
              ? `<span style="font-weight:700;color:var(--agri-primary,#2d7a2d);font-size:0.85rem">💰 ${v.tarif.toLocaleString()} DA</span>`
              : `<span style="font-size:0.78rem;color:#b45309;font-weight:600;background:#fff8e1;border-radius:6px;padding:2px 8px">Tarif non défini</span>`
            }
            <button
              onclick="${v.tarif_defini ? `agriDemanderRdv(${v.id},'${escAgri(v.nom)}',${v.tarif})` : `agriShowToast('Ce vétérinaire n\\'a pas encore défini son tarif. La prise de RDV est temporairement indisponible.',true)`}"
              style="background:${v.tarif_defini ? 'var(--agri-primary,#2d7a2d)' : '#9ca3af'};color:#fff;border:none;border-radius:7px;padding:6px 12px;font-size:0.78rem;cursor:${v.tarif_defini ? 'pointer' : 'not-allowed'};opacity:${v.tarif_defini ? '1' : '0.7'}">
              ${v.tarif_defini ? 'Demander RDV' : 'Indisponible'}
            </button>
          </div>
        </div>
      `).join('') + '</div>';
  } catch (e) {
    el.innerHTML = '<div style="padding:16px;color:#e55;font-size:0.85rem">Impossible de charger les vétérinaires.</div>';
  }
}

/* ── Render mes RDVs ───────────────────────────────── */
async function agriLoadMesRdvs() {
  const el = document.getElementById('agriMesRdvsContainer');
  if (!el) return;
  try {
    const data = await agriApiGet('/api/agri/mes-rdvs/');
    const rdvs = data.rdvs || [];
    if (!rdvs.length) {
      el.innerHTML = '<div style="padding:24px;text-align:center;color:#888">Aucun rendez-vous vétérinaire pour le moment.</div>';
      return;
    }
    const statutColors = { en_attente: '#f59e0b', confirme: '#22c55e', refuse: '#ef4444', termine: '#6b7280', annule: '#ef4444' };
    el.innerHTML = rdvs.map(r => `
      <div style="border:1px solid rgba(0,0,0,0.08);border-radius:10px;padding:14px;margin-bottom:10px;background:rgba(255,255,255,0.6)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:700;font-size:0.9rem">Dr. ${escAgri(r.veterinaire_nom)}</div>
            <div style="font-size:0.8rem;color:#555">📅 ${r.date_rdv} à ${r.heure_rdv} · ${escAgri(r.type_label)}</div>
            <div style="font-size:0.8rem;color:#555">📍 ${escAgri(r.lieu || '—')}</div>
          </div>
          <span style="background:${statutColors[r.statut] || '#888'}22;color:${statutColors[r.statut] || '#888'};border-radius:6px;padding:3px 10px;font-size:0.78rem;font-weight:600">${escAgri(r.statut_label)}</span>
        </div>
        ${r.diagnostic ? `<div style="margin-top:10px;padding:10px;background:rgba(34,197,94,0.08);border-radius:8px;font-size:0.82rem"><strong>Diagnostic:</strong> ${escAgri(r.diagnostic)}</div>` : ''}
        ${r.traitement ? `<div style="margin-top:6px;padding:10px;background:rgba(59,130,246,0.08);border-radius:8px;font-size:0.82rem"><strong>Traitement:</strong> ${escAgri(r.traitement)}</div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = '<div style="padding:16px;color:#e55;font-size:0.85rem">Impossible de charger vos rendez-vous.</div>';
  }
}

/* ── Demander un RDV (modal) ───────────────────────── */
function agriDemanderRdv(vetId, vetNom, tarif) {
  agriDemanderRdvFromTournee(vetId, vetNom, tarif);
}

function agriDemanderRdvFromTournee(vetId, vetNom, tarif) {
  // Create a modal overlay
  const existing = document.getElementById('agriRdvModal');
  if (existing) existing.remove();

  const wilayaOptions = AGRI_WILAYAS.map(w => `<option value="${w[0]}">${w[0]} — ${w[1]}</option>`).join('');
  const today = new Date().toISOString().split('T')[0];

  const modal = document.createElement('div');
  modal.id = 'agriRdvModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto;position:relative">
      <h3 style="margin:0 0 4px;font-size:1.05rem">📅 Demande de rendez-vous</h3>
      <p style="margin:0 0 12px;font-size:0.85rem;color:#666">Dr. ${escAgri(vetNom)}</p>

      ${tarif != null ? `
      <div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
        <span style="font-size:1.2rem">💰</span>
        <div>
          <div style="font-weight:700;font-size:0.92rem;color:#166534">Tarif de consultation : ${Number(tarif).toLocaleString()} DA</div>
          <div style="font-size:0.78rem;color:#555;margin-top:1px">Ce montant vous sera demandé lors de la consultation.</div>
        </div>
      </div>` : ''}

      <div style="display:grid;gap:12px">
        <div>
          <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Type de visite</label>
          <select id="rdvType" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem">
            <option value="consultation">Consultation</option>
            <option value="vaccination">Vaccination</option>
            <option value="urgence">Urgence</option>
            <option value="suivi">Suivi</option>
            <option value="chirurgie">Chirurgie</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Date souhaitée</label>
            <input type="date" id="rdvDate" min="${today}" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Heure</label>
            <input type="time" id="rdvHeure" value="09:00" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem;box-sizing:border-box">
          </div>
        </div>
        <div>
          <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Wilaya</label>
          <select id="rdvWilaya" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem">${wilayaOptions}</select>
        </div>
        <div>
          <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Lieu / Adresse de la ferme</label>
          <input type="text" id="rdvLieu" placeholder="Ex: Ferme El Khir, Route de Batna" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem;box-sizing:border-box">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Animaux concernés</label>
            <input type="text" id="rdvAnimaux" placeholder="Ex: Bovins, Ovins..." style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Nombre d'animaux</label>
            <input type="number" id="rdvNbAnimaux" value="1" min="1" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem;box-sizing:border-box">
          </div>
        </div>
        <div>
          <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">Description du problème</label>
          <textarea id="rdvDesc" placeholder="Décrivez les symptômes ou la raison de la visite..." style="width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:0.88rem;min-height:80px;resize:vertical;box-sizing:border-box"></textarea>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button onclick="document.getElementById('agriRdvModal').remove()" style="background:#f5f5f5;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:0.88rem">Annuler</button>
        <button onclick="agriSoumettreRdv(${vetId},'${escAgri(vetNom)}')" style="background:var(--agri-primary,#2d7a2d);color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:0.88rem;font-weight:600">✓ Envoyer la demande</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

async function agriSoumettreRdv(vetId, vetNom) {
  const date = document.getElementById('rdvDate')?.value;
  const heure = document.getElementById('rdvHeure')?.value;
  if (!date || !heure) {
    alert('Veuillez renseigner la date et l\'heure.');
    return;
  }
  const body = {
    veterinaire_id: vetId,
    type_visite: document.getElementById('rdvType')?.value || 'consultation',
    date_rdv: date,
    heure_rdv: heure,
    wilaya: document.getElementById('rdvWilaya')?.value || '',
    lieu: document.getElementById('rdvLieu')?.value || '',
    animaux: document.getElementById('rdvAnimaux')?.value || '',
    nombre_animaux: parseInt(document.getElementById('rdvNbAnimaux')?.value || '1'),
    description: document.getElementById('rdvDesc')?.value || '',
  };
  try {
    const r = await fetch('/api/agri/prendre-rdv/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': agriGetCsrf() },
      body: JSON.stringify(body),
    });
    const res = await r.json();
    if (r.ok && res.ok) {
      document.getElementById('agriRdvModal')?.remove();
      agriShowToast(`✅ Demande de RDV envoyée à Dr. ${vetNom} — En attente de confirmation`);
      agriLoadMesRdvs();
      agriLoadNotifications();
    } else if (res.code === 'tarif_manquant') {
      agriShowToast('❌ Ce vétérinaire n\'a pas encore défini son tarif. La prise de RDV est temporairement indisponible.', true);
    } else {
      agriShowToast('❌ ' + (res.error || 'Erreur lors de l\'envoi.'), true);
    }
  } catch (e) {
    agriShowToast('❌ Erreur lors de l\'envoi. Vérifiez votre connexion.', true);
  }
}

/* ── Notifications ─────────────────────────────────── */
async function agriLoadNotifications() {
  const el = document.getElementById('agriNotificationsContainer');
  if (!el) return;
  try {
    const data = await agriApiGet('/api/agri/notifications/');
    const notifs = data.notifications || [];

    // Update badge
    const badge = document.getElementById('agriNotifNavBadge');
    if (badge) {
      if (notifs.length) {
        badge.textContent = notifs.length > 9 ? '9+' : notifs.length;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }

    if (!notifs.length) {
      el.innerHTML = '<div style="padding:32px;text-align:center;color:#888">Aucune notification pour le moment.</div>';
      return;
    }

    const typeColors = { rdv: '#22c55e', alerte: '#f59e0b', annonce: '#3b82f6' };
    const typeBg = { rdv: '#f0fdf4', alerte: '#fffbeb', annonce: '#eff6ff' };

    el.innerHTML = notifs.map(n => `
      <div style="display:flex;gap:14px;padding:14px;border:1px solid rgba(0,0,0,0.07);border-radius:10px;margin-bottom:10px;background:${typeBg[n.type] || '#fff'}">
        <div style="font-size:1.4rem;flex-shrink:0;margin-top:2px">${n.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:3px">${escAgri(n.titre)}</div>
          <div style="font-size:0.82rem;color:#555;margin-bottom:4px">${escAgri(n.desc)}</div>
          <div style="font-size:0.75rem;color:#999">${escAgri(n.date)}</div>
        </div>
        <span style="flex-shrink:0;font-size:0.72rem;font-weight:600;color:${typeColors[n.type]||'#888'};background:${typeColors[n.type]||'#888'}18;padding:3px 8px;border-radius:6px;height:fit-content">
          ${n.type === 'rdv' ? 'RDV' : n.type === 'alerte' ? 'ALERTE' : 'ANNONCE'}
        </span>
      </div>
    `).join('');
  } catch (e) {
    const el2 = document.getElementById('agriNotificationsContainer');
    if (el2) el2.innerHTML = '<div style="padding:16px;color:#e55;font-size:0.85rem">Impossible de charger les notifications.</div>';
  }
  // Also update the dashboard notification badge count
  updateAgriNotifBadge();
}

function updateAgriNotifBadge() {
  // Update notification badge on bell buttons
  fetch('/api/agri/notifications/', { credentials: 'same-origin' })
    .then(r => r.json())
    .then(data => {
      const total = (data.notifications || []).filter(n => !n.lu).length;
      document.querySelectorAll('.agri-notification-count').forEach(el => {
        el.textContent = total > 0 ? total : '0';
        el.style.display = total > 0 ? '' : 'none';
      });
    })
    .catch(() => {});
}

/* ── Toast helper ──────────────────────────────────── */
function agriShowToast(msg, isError = false) {
  // Try to use existing agri toast or create one
  let t = document.getElementById('agriVetToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'agriVetToast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#333;color:#fff;padding:12px 20px;border-radius:10px;font-size:0.88rem;z-index:99999;transition:opacity 0.3s;opacity:0;pointer-events:none;max-width:360px';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = isError ? '#ef4444' : '#2d7a2d';
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

/* ── Escape helper ─────────────────────────────────── */
function escAgri(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Page navigation hook ──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Load notifications to update badge on page load
  updateAgriNotifBadge();
  // Also prefetch notifications data for quick display
  agriLoadNotifications();
});
