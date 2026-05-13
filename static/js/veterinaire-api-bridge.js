/* ═══════════════════════════════════════════════════════════════
   VETERINAIRE-API-BRIDGE.JS — AgriGov
   Connects the veterinaire dashboard to the real Django backend.
   Loaded AFTER veterinaire.js — patches STATE & action functions.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── CSRF helper ────────────────────────────────────────── */
function getCsrf() {
  const cookie = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('csrftoken='));
  return cookie ? cookie.split('=')[1] : (window.CSRF_TOKEN || '');
}

async function apiGet(url) {
  const r = await fetch(url, { credentials: 'same-origin' });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return r.json();
}

async function apiPost(url, body = {}) {
  const r = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${url} → ${r.status}`);
  return r.json();
}

/* ── Map RDV status from backend to STATE format ───────── */
function mapRdvStatut(s) {
  return s; // same format
}

/* ── Init STATE from Django context immediately (sync) ─── */
(function initStateFromDjango() {
  if (!window.VET_PROFILE) return;
  const p = window.VET_PROFILE;
  STATE.vet.prenom = p.prenom || STATE.vet.prenom;
  STATE.vet.nom = p.nom || STATE.vet.nom;
  STATE.vet.specialite = p.specialite || STATE.vet.specialite;
  STATE.vet.wilaya = p.wilaya || STATE.vet.wilaya;
  STATE.vet.exp = p.experience || STATE.vet.exp;
  STATE.vet.tarif = p.tarif || STATE.vet.tarif;
  STATE.vet.bio = p.bio || STATE.vet.bio;
  STATE.vet.disponible = p.disponible !== undefined ? p.disponible : STATE.vet.disponible;
  STATE.vet.note = p.note || STATE.vet.note;
  STATE.vet.total_consultations = p.total_consultations || STATE.vet.total_consultations;
  STATE.vet.ordre = p.numero_ordre || STATE.vet.ordre;

  // Load conversations from Django context
  if (window.VET_CONVERSATIONS && window.VET_CONVERSATIONS.length > 0) {
    STATE.messages.conversations = window.VET_CONVERSATIONS.map(c => ({
      id: c.id,
      agriculteur: c.agriculteur,
      wilaya: c.wilaya || '',
      avatar: c.avatar || '👨‍🌾',
      lu: c.lu,
      lastMsg: c.lastMsg,
      lastTime: c.lastTime,
    }));
    // Initialize empty chats (will be loaded on open)
    STATE.messages.chats = {};
  }
})();

/* ── Load real data from API into STATE ─────────────────── */
async function loadBackendData() {
  try {
    // 1) RDVs (all statuses)
    const rdvData = await apiGet('/api/vet/rdvs/');
    if (rdvData.rdvs) {
      STATE.rdvs = rdvData.rdvs.map(r => ({
        id: r.id,
        agriculteur: r.agriculteur_nom,
        agriculteur_id: r.agriculteur_id,
        wilaya: r.wilaya,
        date: r.date_rdv,
        heure: r.heure_rdv,
        type: r.type_visite,
        statut: mapRdvStatut(r.statut),
        animaux: r.animaux,
        nb: r.nombre_animaux,
        desc: r.description,
        diagnostic: r.diagnostic || '',
        traitement: r.traitement || '',
        note_vet: r.note_vet || '',
      }));
      // Demandes = en_attente RDVs
      STATE.demandes = STATE.rdvs
        .filter(r => r.statut === 'en_attente')
        .map(r => ({ ...r, tel: '', timestamp: r.date + 'T08:00:00', motifRefus: '' }));
    }

    // 2) Alertes admin
    const alertData = await apiGet('/api/vet/alertes/');
    if (alertData.alertes) {
      STATE.alertesAdmin = alertData.alertes.map(a => ({
        id: a.id,
        type: a.type_alerte,
        titre: a.titre,
        message: a.message,
        wilayas: a.wilayas,
        date: a.date,
        active: true,
      }));
    }

    // 3) Tournées
    const tourData = await apiGet('/api/vet/tournees/');
    if (tourData.tournees) {
      STATE.tournees = tourData.tournees.map(t => ({
        id: t.id,
        titre: t.titre,
        desc: t.description,
        wilayas: t.wilayas,
        date_debut: t.date_debut,
        date_fin: t.date_fin,
        services: t.services,
        tarif: t.tarif ? parseFloat(t.tarif) : null,
        statut: t.statut,
        from_alerte: t.alerte_admin ? 1 : 0,
      }));
    }

    // 4) Notifications — build from RDVs + alertes
    STATE.notifications = [];
    STATE.alertesAdmin.slice(0, 3).forEach((a, i) => {
      STATE.notifications.push({
        id: 100 + i,
        type: 'alerte',
        titre: `⚠️ ${a.titre}`,
        desc: a.message.slice(0, 120),
        time: a.date,
        lu: false,
      });
    });
    STATE.rdvs.filter(r => r.statut === 'confirme').slice(0, 3).forEach((r, i) => {
      STATE.notifications.push({
        id: 200 + i,
        type: 'rdv',
        titre: `📅 RDV confirmé — ${r.agriculteur}`,
        desc: `${r.date} à ${r.heure} · ${r.animaux}`,
        time: r.date,
        lu: false,
      });
    });

    // 5) Re-render everything with real data
    renderDashboard();
    renderNotifications();
    renderAdminAlertes();
    renderRdvList();
    renderDemandes();
    renderTournees();
    renderProfil();
    updateBadges();

    // Sidebar name/spec
    const fullName = `Dr. ${STATE.vet.prenom} ${STATE.vet.nom}`;
    const nameEl = document.getElementById('sidebarVetName');
    const specEl = document.getElementById('sidebarVetSpec');
    if (nameEl) nameEl.textContent = fullName;
    if (specEl) specEl.textContent = STATE.vet.specialite;

    // Profile header
    const pfFullName = document.getElementById('profilFullName');
    const pfSpec = document.getElementById('profilSpec');
    const pfOrder = document.getElementById('profilOrder');
    const pfRingVal = document.getElementById('ringVal');
    const pfTotalConsults = document.getElementById('totalConsults');
    if (pfFullName) pfFullName.textContent = fullName;
    if (pfSpec) pfSpec.textContent = `${STATE.vet.specialite} · ${getWilaya(STATE.vet.wilaya)}`;
    if (pfOrder) pfOrder.textContent = `N° Ordre: ${STATE.vet.ordre}`;
    if (pfRingVal) pfRingVal.textContent = STATE.vet.note;
    if (pfTotalConsults) pfTotalConsults.textContent = STATE.vet.total_consultations;

    // Profile form fields
    const pfNom = document.getElementById('profilNom');
    const pfPrenom = document.getElementById('profilPrenom');
    const pfSpecIn = document.getElementById('profilSpecialite');
    const pfOrdre = document.getElementById('profilOrdre');
    const pfTarif = document.getElementById('profilTarif');
    const pfWilaya = document.getElementById('profilWilaya');
    const pfExp = document.getElementById('profilExp');
    const pfBio = document.getElementById('profilBio');
    if (pfNom) pfNom.value = STATE.vet.nom;
    if (pfPrenom) pfPrenom.value = STATE.vet.prenom;
    if (pfSpecIn) pfSpecIn.value = STATE.vet.specialite;
    if (pfOrdre) pfOrdre.value = STATE.vet.ordre;
    if (pfTarif) pfTarif.value = STATE.vet.tarif;
    if (pfWilaya) pfWilaya.value = STATE.vet.wilaya;
    if (pfExp) pfExp.value = STATE.vet.exp;
    if (pfBio) pfBio.value = STATE.vet.bio;

    const dispoToggle = document.getElementById('profilDispoToggle');
    if (dispoToggle) {
      dispoToggle.classList.toggle('on', STATE.vet.disponible);
    }

    console.log('[VetAPI] Données chargées depuis le backend ✓');
    // Also refresh the alertes page and annonces
    if (typeof loadVetAnnonces === 'function') loadVetAnnonces();
  } catch (err) {
    console.warn('[VetAPI] Erreur chargement backend, données de démonstration utilisées:', err.message);
  }
}

/* ── Patch action functions to call real APIs ───────────── */

/* RDV — Confirmer */
const _origChangeStatut = window.changeRdvStatut;
window.changeRdvStatut = async function(id, newStatut) {
  try {
    if (newStatut === 'confirme') {
      await apiPost(`/api/vet/rdv/${id}/confirmer/`);
    } else if (newStatut === 'refuse') {
      await apiPost(`/api/vet/rdv/${id}/refuser/`, { raison: '' });
    } else if (newStatut === 'termine') {
      // Handled via saveDiag
    }
    // Update STATE locally
    const rdv = STATE.rdvs.find(r => r.id === id);
    if (rdv) { rdv.statut = newStatut; }
    renderRdvList(); renderDashboard(); updateBadges();
    showToast(`RDV #${id} — statut mis à jour: ${newStatut} ✓`);
  } catch (e) {
    showToast('Erreur mise à jour RDV', 'error');
  }
};

/* RDV — Accepter une demande */
const _origAccepterDemande = window.accepterDemande;
window.accepterDemande = async function(id) {
  try {
    await apiPost(`/api/vet/rdv/${id}/confirmer/`);
    const d = STATE.demandes.find(d => d.id === id);
    if (d) { d.statut = 'accepte'; }
    const rdv = STATE.rdvs.find(r => r.id === id);
    if (rdv) { rdv.statut = 'confirme'; }
    renderDemandes(); renderRdvList(); renderDashboard(); updateBadges();
    showToast(`Demande acceptée — RDV confirmé ✓`);
  } catch (e) {
    // Fallback to original if id isn't a real backend ID
    if (_origAccepterDemande) _origAccepterDemande(id);
  }
};

/* RDV — Refuser une demande */
const _origRefuserDemande = window.refuserDemande;
window.refuserDemande = async function(id) {
  const motif = document.getElementById('motifRefus')?.value || 'Non disponible';
  try {
    await apiPost(`/api/vet/rdv/${id}/refuser/`, { raison: motif });
    const d = STATE.demandes.find(d => d.id === id);
    if (d) { d.statut = 'refuse'; d.motifRefus = motif; }
    const rdv = STATE.rdvs.find(r => r.id === id);
    if (rdv) { rdv.statut = 'refuse'; }
    closeModal();
    renderDemandes(); renderRdvList(); updateBadges();
    showToast('Demande refusée');
  } catch (e) {
    if (_origRefuserDemande) _origRefuserDemande(id);
  }
};

/* RDV — Sauvegarder diagnostic (termine) */
const _origSaveDiag = window.saveDiag;
window.saveDiag = async function(id) {
  const diagnostic = document.getElementById('diagInput')?.value || '';
  const traitement = document.getElementById('traitInput')?.value || '';
  try {
    await apiPost(`/api/vet/rdv/${id}/terminer/`, { diagnostic, traitement, notes: '' });
    const rdv = STATE.rdvs.find(r => r.id === id);
    if (rdv) { rdv.diagnostic = diagnostic; rdv.traitement = traitement; rdv.statut = 'termine'; }
    closeModal(); renderRdvList(); showToast('Diagnostic sauvegardé ✓');
  } catch (e) {
    if (_origSaveDiag) _origSaveDiag(id);
  }
};

/* Tournée — Sauvegarder */
const _origSaveTournee = window.saveTournee;
window.saveTournee = async function(alerteId) {
  // Support both input ID conventions used across the UI
  const titre = (document.getElementById('tourneeTitre') || document.getElementById('tNom'))?.value?.trim();
  if (!titre) { showToast('Le titre est requis', 'error'); return; }
  // Wilayas: checkboxes OR comma-separated text input
  let wilayas = Array.from(document.querySelectorAll('.wilaya-cb:checked')).map(cb => cb.value);
  if (!wilayas.length) {
    const wilayaText = (document.getElementById('tourneeWilayas') || document.getElementById('tWilayas'))?.value || '';
    wilayas = wilayaText.split(',').map(w => w.trim()).filter(Boolean);
  }
  const body = {
    titre,
    description: (document.getElementById('tourneeDesc') || document.getElementById('tDesc'))?.value || '',
    wilayas,
    date_debut: (document.getElementById('tourneeDebut') || document.getElementById('tDebut'))?.value,
    date_fin: (document.getElementById('tourneeFin') || document.getElementById('tFin'))?.value,
    services: (document.getElementById('tourneeServices') || document.getElementById('tServices'))?.value || '',
    tarif: (document.getElementById('tourneeTarif') || document.getElementById('tTarif'))?.value || null,
    alerte_id: alerteId || null,
  };
  try {
    const res = await apiPost('/api/vet/tournees/creer/', body);
    if (res.ok) {
      STATE.tournees.unshift({
        id: res.id, titre: res.titre,
        desc: body.description, wilayas: body.wilayas,
        date_debut: body.date_debut, date_fin: body.date_fin,
        services: body.services,
        tarif: body.tarif ? parseFloat(body.tarif) : null,
        statut: 'planifiee', from_alerte: alerteId,
      });
      closeModal(); renderTournees(); renderDashboard(); updateBadges();
      showToast(`Tournée "${res.titre}" créée ✓`);
    }
  } catch (e) {
    if (_origSaveTournee) _origSaveTournee(alerteId);
  }
};

/* Profil — Sauvegarder */
const _origSaveProfil = window.saveProfil;
window.saveProfil = async function() {
  const body = {
    specialite: document.getElementById('profilSpecialite')?.value || '',
    wilaya: document.getElementById('profilWilaya')?.value || '',
    experience: document.getElementById('profilExp')?.value || STATE.vet.exp,
    tarif: document.getElementById('profilTarif')?.value || STATE.vet.tarif,
    disponible: STATE.vet.disponible,
    bio: document.getElementById('profilBio')?.value || STATE.vet.bio,
  };
  try {
    await apiPost('/api/vet/profil/update/', body);
    STATE.vet.specialite = body.specialite;
    STATE.vet.wilaya = body.wilaya;
    const fullName = `Dr. ${STATE.vet.prenom} ${STATE.vet.nom}`;
    document.getElementById('sidebarVetName').textContent = fullName;
    document.getElementById('sidebarVetSpec').textContent = STATE.vet.specialite;
    showToast('Profil sauvegardé avec succès ✓');
  } catch (e) {
    if (_origSaveProfil) _origSaveProfil();
  }
};

/* Messages — charger une conversation */
const _origOpenConversation = window.openConversation;
window.openConversation = async function(agriId) {
  try {
    const data = await apiGet(`/api/vet/messages/${agriId}/`);
    // Map to STATE format
    const mappedMessages = data.messages.map(m => ({
      from: m.est_moi ? 'vet' : 'agri',
      text: m.contenu,
      time: m.date_envoi,
    }));
    // Update or create STATE chat
    STATE.messages.chats[agriId] = mappedMessages;
    // Mark conversation as read
    const conv = STATE.messages.conversations.find(c => c.id === agriId);
    if (conv) { conv.lu = true; conv.non_lus = 0; }
    updateBadges();
  } catch (e) {
    console.warn('[VetAPI] openConversation error:', e.message);
  }
  // Always call original to render
  if (_origOpenConversation) _origOpenConversation(agriId);
};

/* Messages — envoyer */
const _origSendMessage = window.sendMessage;
window.sendMessage = async function() {
  const input = document.getElementById('msgText');
  const text = input?.value?.trim();
  if (!text || !currentConvId) return;
  try {
    await apiPost('/api/vet/messages/envoyer/', {
      destinataire_id: currentConvId,
      contenu: text,
    });
    // Update STATE locally so original render works
    if (!STATE.messages.chats[currentConvId]) STATE.messages.chats[currentConvId] = [];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    STATE.messages.chats[currentConvId].push({ from: 'vet', text, time });
    const conv = STATE.messages.conversations.find(c => c.id === currentConvId);
    if (conv) { conv.lastMsg = text; conv.lastTime = time; }
    if (input) input.value = '';
    // Re-render conversation using original function
    openConversation(currentConvId);
    showToast('Message envoyé ✓');
  } catch (e) {
    showToast('Erreur envoi message', 'error');
    if (_origSendMessage) _origSendMessage();
  }
};

/* ── Boot: load real data after DOM ready ─────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(loadBackendData, 100));
} else {
  setTimeout(loadBackendData, 100);
}

/* ── Annonces page ─────────────────────────────────────────── */
window.loadVetAnnonces = async function() {
  // Support both legacy IDs (vetAnnoncesGrid/vetAlertesGrid) and actual template IDs
  const anGrid = document.getElementById('vetAnnoncesGrid');
  const alGrid = document.getElementById('vetAlertesGrid');
  // Also target actual template elements
  const adminAlertesListEl = document.getElementById('adminAlertesList');

  // Load my tournées/annonces
  if (anGrid) {
    try {
      const data = await apiGet('/api/vet/tournees/');
      const tournees = data.tournees || [];
      if (!tournees.length) {
        anGrid.innerHTML = '<div class="vet-empty-state">Vous n\'avez pas encore publié d\'annonces. Cliquez sur "+ Publier une annonce" pour commencer.</div>';
      } else {
        const statutColors = { planifiee: '#22c55e', en_cours: '#3b82f6', terminee: '#6b7280', annulee: '#ef4444' };
        anGrid.innerHTML = tournees.map(t => `
          <div style="border:1px solid var(--border);border-radius:var(--radius);padding:18px;background:var(--bg-card)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <span style="font-weight:700;font-size:0.9rem">${t.titre}</span>
              <span style="font-size:0.72rem;padding:2px 8px;border-radius:5px;background:${(statutColors[t.statut]||'#888')}20;color:${statutColors[t.statut]||'#888'};font-weight:600">${t.statut_label||t.statut}</span>
            </div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:6px">📅 ${t.date_debut} → ${t.date_fin}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:6px">📍 ${(t.wilayas_noms||[]).join(', ')||'Toutes les wilayas'}</div>
            ${t.services ? `<div style="font-size:0.78rem;color:var(--text-muted)">🏥 ${t.services}</div>` : ''}
            ${t.description ? `<div style="font-size:0.8rem;margin-top:8px">${t.description}</div>` : ''}
            ${t.tarif ? `<div style="font-size:0.85rem;font-weight:700;color:var(--green);margin-top:8px">${t.tarif} DA</div>` : ''}
          </div>
        `).join('');
      }
    } catch (e) {
      if (anGrid) anGrid.innerHTML = '<div class="vet-empty-state">Erreur de chargement.</div>';
    }
  }

  // Load admin alerts
  try {
    const data = await apiGet('/api/vet/alertes/');
    const alertes = data.alertes || [];
    const typeColors = { stock_faible: '#f59e0b', epidemie: '#ef4444', campagne: '#3b82f6', urgent: '#ef4444' };

    const alertesHtml = alertes.length ? alertes.map(a => `
      <div style="border:1px solid var(--border,#e5e7eb);border-left:3px solid ${typeColors[a.type_alerte]||'#f59e0b'};border-radius:var(--radius,8px);padding:18px;background:var(--bg-card,#fff);margin-bottom:12px">
        <div style="font-weight:700;font-size:0.88rem;margin-bottom:6px">⚠️ ${a.titre}</div>
        <div style="font-size:0.8rem;color:var(--text-secondary,#555);margin-bottom:8px">${a.message.slice(0, 150)}${a.message.length > 150 ? '...' : ''}</div>
        <div style="font-size:0.75rem;color:var(--text-muted,#999);margin-bottom:12px">📅 ${a.date} · ${(a.wilayas_noms||[]).join(', ')||'Toutes les wilayas'}</div>
        <button class="btn btn-sm btn-primary" style="font-size:0.78rem" onclick="openTourneeFromAlerte(${a.id})">
          🚗 Répondre par une tournée
        </button>
      </div>
    `).join('') : '<div style="padding:20px;text-align:center;color:#999">Aucune alerte admin active pour le moment.</div>';

    // Update legacy grid if it exists
    if (alGrid) alGrid.innerHTML = alertesHtml;

    // Update actual template element: adminAlertesList
    if (adminAlertesListEl) adminAlertesListEl.innerHTML = alertesHtml;

    // Also update STATE and re-render native renderAdminAlertes if available
    if (window.STATE && data.alertes) {
      STATE.alertesAdmin = data.alertes.map(a => ({
        id: a.id, type: a.type_alerte, titre: a.titre,
        message: a.message, wilayas: a.wilayas, date: a.date, active: true,
      }));
      if (typeof renderAdminAlertes === 'function') renderAdminAlertes();
      // Update alert badge
      const badge = document.getElementById('alertBadge');
      if (badge) badge.textContent = data.alertes.length;
    }
  } catch (e) {
    if (alGrid) alGrid.innerHTML = '<div class="vet-empty-state">Erreur de chargement des alertes.</div>';
    if (adminAlertesListEl) adminAlertesListEl.innerHTML = '<div style="padding:20px;text-align:center;color:#e55">Erreur de chargement.</div>';
  }
};

/* ══════════════════════════════════════════════════════════════
   TARIF CONSULTATION — Section Rendez-vous
   ══════════════════════════════════════════════════════════════ */

/**
 * Sauvegarde le tarif de consultation depuis la section Rendez-vous.
 * Si le montant est vide ou 0, le tarif est effacé (null côté backend),
 * ce qui bloque les agriculteurs de prendre RDV.
 */
window.vetSauvegarderTarif = async function () {
  const input = document.getElementById('rdvTarifInput');
  if (!input) return;
  const valeur = input.value.trim();
  const montant = valeur === '' ? null : parseFloat(valeur);

  if (montant !== null && (isNaN(montant) || montant < 0)) {
    showToast('❌ Montant invalide. Entrez un nombre positif.', 'error');
    return;
  }

  try {
    const res = await apiPost('/api/vet/profil/tarif/', { tarif_consultation: montant });
    if (res.ok) {
      // Mettre à jour STATE
      STATE.vet.tarif = res.tarif_consultation;

      // Mettre à jour le champ profil s'il existe
      const profilInput = document.getElementById('profilTarif');
      if (profilInput) profilInput.value = res.tarif_consultation ?? '';

      // Mettre à jour le bandeau visuel
      const banner = document.getElementById('rdvTarifBanner');
      if (banner) {
        if (res.tarif_consultation === null || res.tarif_consultation === undefined) {
          banner.style.background = '#fff8e1';
          banner.style.border = '1.5px solid #f59e0b';
          const title = banner.querySelector('[data-tarif-title]');
          if (title) {
            title.style.color = '#b45309';
            title.textContent = '⚠️ Tarif de consultation non défini';
          }
          const desc = banner.querySelector('[data-tarif-desc]');
          if (desc) desc.textContent = 'Vous devez définir un montant pour permettre aux agriculteurs de prendre rendez-vous.';
          showToast('⚠️ Tarif effacé — les agriculteurs ne peuvent plus prendre RDV.', 'error');
        } else {
          banner.style.background = '#f0fdf4';
          banner.style.border = '1.5px solid #22c55e';
          const title = banner.querySelector('[data-tarif-title]');
          if (title) {
            title.style.color = '#166534';
            title.textContent = '💰 Tarif de consultation défini';
          }
          const desc = banner.querySelector('[data-tarif-desc]');
          if (desc) desc.textContent = 'Les agriculteurs voient ce montant avant de demander un rendez-vous.';
          showToast(`✅ Tarif enregistré : ${res.tarif_consultation.toLocaleString()} DA`);
        }
      }
    }
  } catch (e) {
    showToast('❌ Erreur lors de la sauvegarde du tarif.', 'error');
  }
};
