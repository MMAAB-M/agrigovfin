/* ═══════════════════════════════════════════════════════════════
   AIDE-AGRICULTEUR.JS — AgriGov
   Page "Aide chez l'agriculteur" — Vétérinaire + Organisateur des plantes
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Helpers ────────────────────────────────────────────────────── */
function aideGetCsrf() {
  const c = document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith('csrftoken='));
  return c ? c.split('=')[1] : '';
}

async function aideApiGet(url) {
  const r = await fetch(url, { credentials: 'same-origin' });
  if (!r.ok) {
    let msg = 'Erreur HTTP ' + r.status;
    try { const d = await r.json(); if (d.error) msg = d.error; } catch (_) {}
    throw new Error(msg);
  }
  return r.json();
}

async function aideApiPost(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': aideGetCsrf() },
    body: JSON.stringify(body),
  });
  let json;
  try { json = await r.json(); } catch (_) { json = {}; }
  if (!r.ok) throw new Error(json.error || ('Erreur HTTP ' + r.status));
  return json;
}

function aideEsc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function aideShowToast(msg, isError = false) {
  let t = document.getElementById('aideToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'aideToast';
    t.style.cssText = 'position:fixed;bottom:28px;right:28px;padding:13px 22px;border-radius:12px;font-size:0.9rem;font-weight:600;z-index:99999;transition:opacity 0.4s;opacity:0;pointer-events:none;max-width:400px;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.25);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = isError ? '#d45952' : '#3a8b4b';
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 4000);
}

const AIDE_WILAYAS = [
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
function aideGetWilaya(code) {
  const found = AIDE_WILAYAS.find(w => w[0] === String(code));
  return found ? found[1] : (code || '—');
}

/* ══════════════════════════════════════════════════
   ONGLET NAVIGATION
══════════════════════════════════════════════════ */
let aideActiveTab = 'vet';

function aideSwitchTab(tab) {
  aideActiveTab = tab;
  document.querySelectorAll('.aide-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.aide-tab-section').forEach(s => {
    s.style.display = s.dataset.section === tab ? 'block' : 'none';
  });
  if (tab === 'vet') {
    aideLoadVets();
    aideLoadMesRdvs();
    aideLoadVetTournees();
  } else {
    aideLoadPlantesTournees();
  }
}

/* ══════════════════════════════════════════════════
   A) VÉTÉRINAIRES DISPONIBLES
══════════════════════════════════════════════════ */
async function aideLoadVets() {
  const el = document.getElementById('aideVetsGrid');
  if (!el) return;
  el.innerHTML = '<div class="aide-loading">⏳ Chargement des vétérinaires...</div>';
  try {
    const data = await aideApiGet('/api/agri/veterinaires/');
    const vets = data.veterinaires || [];
    if (!vets.length) {
      el.innerHTML = '<div class="aide-empty" style="padding:32px;text-align:center;">👨‍⚕️ Aucun vétérinaire disponible pour le moment.</div>';
      return;
    }
    el.innerHTML = vets.map(v => {
      const nomSafe = aideEsc(v.nom || '');
      const wilayaNom = aideEsc(v.wilaya_nom || aideGetWilaya(v.wilaya) || '—');
      const specialite = aideEsc(v.specialite || 'Médecine vétérinaire');
      const tarifHtml = (v.tarif !== null && v.tarif !== undefined)
        ? `<strong class="aide-tarif">${Number(v.tarif).toLocaleString('fr-DZ')} DA</strong>`
        : `<span style="font-size:0.82rem;color:var(--agri-muted);font-style:italic;">Tarif à définir</span>`;
      const dispoBadge = v.disponible
        ? `<span class="aide-meta-badge aide-meta-green">✅ Disponible</span>`
        : `<span class="aide-meta-badge aide-meta-red">⏸️ Indisponible</span>`;
      const noteText = (v.note && v.note > 0) ? `⭐ ${Number(v.note).toFixed(1)}/5` : 'Pas encore évalué';
      // Escape name for use in onclick attribute
      const nomForAttr = nomSafe.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return `
      <article class="aide-vet-card agri-panel agri-glass">
        <div class="aide-vet-avatar">👨‍⚕️</div>
        <div class="aide-vet-info">
          <h4>Dr. ${nomSafe}</h4>
          <p class="aide-vet-spec">🔬 ${specialite}</p>
          <p class="aide-vet-loc">📍 ${wilayaNom}</p>
          ${v.experience > 0 ? `<p style="font-size:0.82rem;color:var(--agri-muted);">🎓 ${v.experience} an${v.experience > 1 ? 's' : ''} d'expérience</p>` : ''}
          ${v.bio ? `<p style="font-size:0.8rem;color:var(--agri-muted);margin-top:4px;line-height:1.5;">${aideEsc(String(v.bio).slice(0, 120))}${String(v.bio).length > 120 ? '…' : ''}</p>` : ''}
          <div class="aide-vet-meta">
            <span class="aide-meta-badge aide-meta-green">${noteText}</span>
            <span class="aide-meta-badge aide-meta-blue">🩺 ${v.consultations || 0} consultations</span>
            ${dispoBadge}
          </div>
          <div class="aide-vet-footer">
            ${tarifHtml}
            <button
              class="agri-btn agri-btn-primary aide-rdv-btn"
              onclick="aideOuvrirRdvModal(${v.id}, '${nomForAttr}')"
              ${!v.disponible ? 'disabled title="Ce vétérinaire est indisponible"' : ''}>
              📅 Rendez-vous
            </button>
          </div>
        </div>
      </article>`;
    }).join('');
  } catch (e) {
    console.error('[aideLoadVets]', e);
    el.innerHTML = `<div class="aide-empty aide-error" style="padding:32px;text-align:center;">
      ❌ Erreur : ${aideEsc(e.message)}<br>
      <button class="agri-btn agri-btn-light" style="margin-top:12px" onclick="aideLoadVets()">🔄 Réessayer</button>
    </div>`;
  }
}

/* ══════════════════════════════════════════════════
   B) MES RENDEZ-VOUS (acceptés, en attente, rejetés)
══════════════════════════════════════════════════ */
async function aideLoadMesRdvs() {
  const el = document.getElementById('aideMesRdvsBody');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="6" class="aide-table-empty">⏳ Chargement de vos rendez-vous...</td></tr>';
  try {
    const data = await aideApiGet('/api/agri/mes-rdvs/');
    const rdvs = data.rdvs || [];
    if (!rdvs.length) {
      el.innerHTML = '<tr><td colspan="6" class="aide-table-empty">Vous n\'avez aucun rendez-vous pour le moment.</td></tr>';
      return;
    }
    const sMap = {
      en_attente: { label: '⏳ En attente',  color: '#d89a31', bg: '#fef9ec' },
      confirme:   { label: '✅ Confirmé',    color: '#3a8b4b', bg: '#f0faf0' },
      refuse:     { label: '❌ Refusé',      color: '#d45952', bg: '#fef0ef' },
      termine:    { label: '🏥 Terminé',     color: '#6b7280', bg: '#f3f4f6' },
      annule:     { label: '🚫 Annulé',      color: '#d45952', bg: '#fef0ef' },
    };
    el.innerHTML = rdvs.map(r => {
      const s = sMap[r.statut] || { label: aideEsc(r.statut_label || r.statut), color: '#888', bg: '#f9f9f9' };
      return `
      <tr>
        <td><strong>Dr. ${aideEsc(r.veterinaire_nom || '—')}</strong></td>
        <td>${aideEsc(r.type_label || r.type_visite || '—')}</td>
        <td>${aideEsc(r.date_rdv || '—')} <small style="color:var(--agri-muted)">à ${aideEsc((r.heure_rdv || '').slice(0,5))}</small></td>
        <td>${aideEsc(r.lieu || '—')}</td>
        <td>
          <span class="aide-statut-pill" style="background:${s.bg};color:${s.color};border:1px solid ${s.color}33;font-weight:600;">
            ${s.label}
          </span>
        </td>
        <td style="font-size:0.8rem;color:var(--agri-muted);">
          ${r.diagnostic ? `<span>📋 Diagnostic disponible</span>` : (r.statut === 'refuse' && r.note_veterinaire ? `<span style="color:#d45952;">💬 ${aideEsc(r.note_veterinaire.slice(0,60))}</span>` : '—')}
        </td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('[aideLoadMesRdvs]', e);
    el.innerHTML = `<tr><td colspan="6" class="aide-table-empty aide-error">
      ❌ ${aideEsc(e.message)}
      <button class="agri-btn agri-btn-light" style="margin-left:12px" onclick="aideLoadMesRdvs()">🔄 Réessayer</button>
    </td></tr>`;
  }
}

/* ══════════════════════════════════════════════════
   C) TOURNÉES VÉTÉRINAIRES À VENIR
══════════════════════════════════════════════════ */
async function aideLoadVetTournees() {
  const el = document.getElementById('aideVetTourneesContainer');
  if (!el) return;
  el.innerHTML = '<div class="aide-loading">⏳ Chargement des tournées vétérinaires...</div>';
  try {
    const data = await aideApiGet('/api/agri/tournees/');
    const tournees = data.tournees || [];
    if (!tournees.length) {
      el.innerHTML = '<div class="aide-empty" style="padding:32px;text-align:center;">🚗 Aucune tournée vétérinaire annoncée pour le moment.</div>';
      return;
    }
    el.innerHTML = tournees.map(t => {
      const wilayas = (t.wilayas_noms || []).join(', ') || 'Toutes les wilayas';
      const nomForAttr = aideEsc(t.veterinaire_nom || '').replace(/'/g, "\\'");
      const statutBadge = t.statut === 'en_cours'
        ? `<span class="aide-meta-badge aide-meta-green">🟢 En cours</span>`
        : `<span class="aide-meta-badge aide-meta-blue">📅 Planifiée</span>`;
      return `
      <div class="aide-tournee-card">
        <div class="aide-tournee-header">
          <div>
            <h4 class="aide-tournee-titre">🚗 ${aideEsc(t.titre)}</h4>
            <p class="aide-tournee-vet">
              👨‍⚕️ <strong>Dr. ${aideEsc(t.veterinaire_nom || '—')}</strong>
              ${t.veterinaire_specialite ? `<span style="color:var(--agri-muted);font-size:0.82rem"> · ${aideEsc(t.veterinaire_specialite)}</span>` : ''}
            </p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            ${statutBadge}
            ${t.tarif ? `<span class="aide-meta-badge aide-meta-green">💰 ${t.tarif} DA</span>` : ''}
          </div>
        </div>
        <div class="aide-tournee-details">
          <span>📍 ${aideEsc(wilayas)}</span>
          <span>📅 Du <strong>${aideEsc(t.date_debut)}</strong> au <strong>${aideEsc(t.date_fin)}</strong></span>
          ${t.services ? `<span>🏥 ${aideEsc(t.services)}</span>` : ''}
          ${t.veterinaire_wilaya ? `<span>🗺️ Vétérinaire basé à : ${aideEsc(t.veterinaire_wilaya)}</span>` : ''}
        </div>
        ${t.description ? `<p class="aide-tournee-desc">${aideEsc(t.description)}</p>` : ''}
        ${t.alerte_admin ? `<p style="font-size:0.75rem;color:#f59e0b;font-weight:600;margin-top:8px;">📢 Organisée en réponse à une alerte admin</p>` : ''}
        <div class="aide-tournee-actions">
          <button class="agri-btn agri-btn-primary" style="font-size:0.82rem;padding:8px 18px;"
            onclick="aideOuvrirRdvModal(${t.veterinaire_id || 'null'}, '${nomForAttr}')">
            📅 Demander un RDV
          </button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('[aideLoadVetTournees]', e);
    el.innerHTML = `<div class="aide-empty aide-error" style="padding:32px;text-align:center;">
      ❌ ${aideEsc(e.message)}<br>
      <button class="agri-btn agri-btn-light" style="margin-top:12px" onclick="aideLoadVetTournees()">🔄 Réessayer</button>
    </div>`;
  }
}

/* ══════════════════════════════════════════════════
   MODAL RDV — ouvrir, fermer, soumettre
══════════════════════════════════════════════════ */
function aideOuvrirRdvModal(vetId, vetNom) {
  if (vetId === null || vetId === undefined || vetId === 'null') {
    aideShowToast('⚠️ Ce vétérinaire n\'est pas disponible pour un RDV.', true);
    return;
  }
  // Sélectionner dans le select si possible
  const sel = document.getElementById('aideRdvVetSelect');
  if (sel) {
    Array.from(sel.options).forEach(o => { o.selected = parseInt(o.value) === parseInt(vetId); });
  }
  // Nom dans le modal
  const titleEl = document.getElementById('aideRdvModalVetNom');
  if (titleEl) titleEl.textContent = vetNom ? 'Dr. ' + vetNom : 'Sélectionnez un vétérinaire';
  // ID caché
  const h = document.getElementById('aideRdvVetId');
  if (h) h.value = vetId;
  // Ouvrir
  const modal = document.getElementById('aideRdvModal');
  if (modal) modal.classList.add('active');
}

function aideFermerRdvModal() {
  const modal = document.getElementById('aideRdvModal');
  if (modal) modal.classList.remove('active');
}

async function aidePopulateVetSelect() {
  const sel = document.getElementById('aideRdvVetSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Chargement...</option>';
  try {
    const data = await aideApiGet('/api/agri/veterinaires/');
    const vets = data.veterinaires || [];
    if (vets.length) {
      sel.innerHTML = '<option value="">-- Sélectionner un vétérinaire --</option>' +
        vets.map(v => `<option value="${v.id}">Dr. ${aideEsc(v.nom)} — ${aideEsc(v.wilaya_nom || aideGetWilaya(v.wilaya) || '—')}</option>`).join('');
    } else {
      sel.innerHTML = '<option value="">Aucun vétérinaire disponible</option>';
    }
  } catch (err) {
    sel.innerHTML = '<option value="">Erreur de chargement</option>';
  }
}

async function aideSoumettreRdv() {
  const vetIdEl = document.getElementById('aideRdvVetId');
  const vetSelEl = document.getElementById('aideRdvVetSelect');
  const vetId = (vetIdEl?.value) || (vetSelEl?.value) || '';
  const rdvDate = document.getElementById('aideRdvDate')?.value || '';
  const heure   = document.getElementById('aideRdvHeure')?.value || '';

  if (!vetId)   { aideShowToast('⚠️ Veuillez sélectionner un vétérinaire.', true); return; }
  if (!rdvDate) { aideShowToast('⚠️ Veuillez choisir une date.', true); return; }
  if (!heure)   { aideShowToast('⚠️ Veuillez choisir une heure.', true); return; }

  const btn = document.getElementById('aideRdvSendBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Envoi en cours...'; }

  try {
    const res = await aideApiPost('/api/agri/prendre-rdv/', {
      veterinaire_id: parseInt(vetId, 10),
      type_visite:    document.getElementById('aideRdvType')?.value    || 'consultation',
      date_rdv:       rdvDate,
      heure_rdv:      heure,
      wilaya:         document.getElementById('aideRdvWilaya')?.value   || '',
      lieu:           document.getElementById('aideRdvLieu')?.value     || '',
      animaux:        document.getElementById('aideRdvAnimaux')?.value  || '',
      nombre_animaux: parseInt(document.getElementById('aideRdvNbAnimaux')?.value || '1', 10),
      description:    document.getElementById('aideRdvDesc')?.value     || '',
    });
    // res.ok est le champ JSON renvoyé par le backend { ok: true }
    if (res && res.ok) {
      aideFermerRdvModal();
      aideShowToast('✅ Demande de RDV envoyée ! Le vétérinaire vous contactera pour confirmer.');
      aideLoadMesRdvs();
      // Réinitialiser les champs du formulaire
      ['aideRdvDate','aideRdvHeure','aideRdvLieu','aideRdvAnimaux','aideRdvDesc'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      const nbEl = document.getElementById('aideRdvNbAnimaux'); if (nbEl) nbEl.value = '1';
      if (vetIdEl) vetIdEl.value = '';
      if (vetSelEl) vetSelEl.selectedIndex = 0;
      const titleEl = document.getElementById('aideRdvModalVetNom');
      if (titleEl) titleEl.textContent = 'Sélectionnez un vétérinaire';
    } else {
      aideShowToast('❌ La demande n\'a pas pu être enregistrée. Veuillez réessayer.', true);
    }
  } catch (e) {
    console.error('[aideSoumettreRdv]', e);
    aideShowToast('❌ ' + (e.message || 'Erreur lors de l\'envoi.'), true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✅ Envoyer la demande'; }
  }
}

/* ══════════════════════════════════════════════════
   E) TOURNÉES ORGANISATEUR DES PLANTES
══════════════════════════════════════════════════ */
async function aideLoadPlantesTournees() {
  const el = document.getElementById('aidePlantesTourneesContainer');
  if (!el) return;
  el.innerHTML = '<div class="aide-loading">⏳ Chargement des tournées organisateur...</div>';
  try {
    const data = await aideApiGet('/api/org/tournees-publiques/');
    const tournees = data.tournees || [];
    if (!tournees.length) {
      el.innerHTML = '<div class="aide-empty" style="padding:32px;text-align:center;">🌿 Aucune tournée planifiée par un organisateur pour le moment.</div>';
      return;
    }
    el.innerHTML = tournees.map(t => `
      <div class="aide-tournee-card aide-tournee-plante">
        <div class="aide-tournee-header">
          <div>
            <h4 class="aide-tournee-titre">🌿 ${aideEsc(t.nom || t.titre || '—')}</h4>
            <p class="aide-tournee-vet" style="color:var(--agri-muted);">
              📋 Organisé par <strong>${aideEsc(t.organisateur_nom || 'Organisateur')}</strong>
            </p>
          </div>
          <span class="aide-meta-badge aide-meta-green">${aideEsc(t.statut_label || 'Planifiée')}</span>
        </div>
        <div class="aide-tournee-details">
          <span>📍 ${aideEsc(t.wilaya_nom || 'Toutes les wilayas')}</span>
          <span>📅 Du <strong>${aideEsc(t.date_debut)}</strong> au <strong>${aideEsc(t.date_fin)}</strong></span>
        </div>
        ${t.description ? `<p class="aide-tournee-desc">${aideEsc(t.description)}</p>` : ''}
      </div>
    `).join('');
  } catch (e) {
    console.error('[aideLoadPlantesTournees]', e);
    el.innerHTML = `<div class="aide-empty aide-error" style="padding:32px;text-align:center;">
      ❌ ${aideEsc(e.message)}<br>
      <button class="agri-btn agri-btn-light" style="margin-top:12px" onclick="aideLoadPlantesTournees()">🔄 Réessayer</button>
    </div>`;
  }
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Peupler le select vétérinaire dans le modal RDV
  aidePopulateVetSelect();

  // Si la page aide est déjà active au chargement, charger les données
  // (cas où l'URL contient directement #agriAidePage)
  setTimeout(function() {
    const aidePage = document.getElementById('agriAidePage');
    if (aidePage && aidePage.classList.contains('active')) {
      aideLoadVets();
      aideLoadMesRdvs();
      aideLoadVetTournees();
    }
  }, 600);

  // Fermer modal en cliquant à l'extérieur
  const overlay = document.getElementById('aideRdvModal');
  if (overlay) {
    overlay.addEventListener('click', e => { if (e.target === overlay) aideFermerRdvModal(); });
  }

  // Synchro select ↔ ID caché
  const sel = document.getElementById('aideRdvVetSelect');
  if (sel) {
    sel.addEventListener('change', () => {
      const h = document.getElementById('aideRdvVetId');
      if (h) h.value = sel.value;
      const opt = sel.options[sel.selectedIndex];
      const titleEl = document.getElementById('aideRdvModalVetNom');
      if (titleEl && opt && opt.value) {
        const nom = opt.text.replace(/^Dr\. /, '').split(' — ')[0];
        titleEl.textContent = 'Dr. ' + nom;
      }
    });
  }
});
