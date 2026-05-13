(function(){
  const state = { benefits: [], requests: [], activeBenefit: null };
  const $ = (id) => document.getElementById(id);
  const csrf = () => (document.cookie.split('; ').find(x => x.startsWith('csrftoken=')) || '').split('=')[1] || '';
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const statusClass = (s) => s === 'accepted' ? 'accepted' : (s === 'rejected' ? 'rejected' : 'pending');
  const statusLabel = (s) => s === 'accepted' ? 'Acceptée' : (s === 'rejected' ? 'Refusée' : 'En attente');

  function toast(msg,type){ if(window.agriShowToast) agriShowToast(msg,type||'success'); else alert(msg); }
  async function readJson(res){ const raw = await res.text(); try{return raw?JSON.parse(raw):{};}catch(e){return {success:false,error:raw||'Erreur serveur'};} }

  function renderBenefits(items){
    const grid = $('agriBenefitsGrid'); if(!grid) return;
    if(!items.length){
      grid.innerHTML = '<div class="agri-panel agri-glass agri-empty-state"><strong>Aucun avantage disponible</strong><span>L’administration ajoutera bientôt des avantages.</span></div>';
      return;
    }
    grid.innerHTML = items.map(b => `
      <article class="agri-panel agri-glass agri-benefit-card" data-open-benefit="${b.id}">
        <div class="agri-benefit-photo-wrap">
          <img class="agri-benefit-image" src="${esc(b.image_url)}" alt="${esc(b.title)}">
        </div>
        <div class="agri-benefit-content">
          <span class="agri-benefit-badge">Avantage agricole</span>
          <h3>${esc(b.title)}</h3>
          <p>${esc(b.description)}</p>
          <button class="agri-btn agri-btn-primary agri-benefit-request-btn" type="button" data-request-benefit="${b.id}">Demander</button>
        </div>
      </article>`).join('');

    grid.querySelectorAll('[data-request-benefit]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openRequest(Number(btn.dataset.requestBenefit)); });
    });
    grid.querySelectorAll('[data-open-benefit]').forEach(card => {
      card.addEventListener('click', () => openRequest(Number(card.dataset.openBenefit)));
    });
  }

  function renderRequests(){
    const body = $('agriMyBenefitRequestsBody'); if(!body) return;
    if(!state.requests.length){ body.innerHTML = '<tr><td colspan="4">Aucune demande pour le moment.</td></tr>'; return; }
    body.innerHTML = state.requests.map(r => `<tr><td><strong>${esc(r.benefit_title)}</strong></td><td>${esc(r.created_at)}</td><td><span class="benefit-status ${statusClass(r.status)}">${statusLabel(r.status)}</span></td><td>${esc(r.admin_note || '-')}</td></tr>`).join('');
  }

  async function loadBenefits(){
    const res = await fetch('/api/benefits/'); const data = await readJson(res);
    if(!data.success) throw new Error(data.error || 'Impossible de charger les avantages');
    state.benefits = data.benefits || [];
    renderBenefits(state.benefits);
  }
  async function loadRequests(){
    const res = await fetch('/api/benefits/my-requests/'); const data = await readJson(res);
    if(data.success){ state.requests = data.requests || []; renderRequests(); window.dispatchEvent(new CustomEvent('agri:benefit-request-updated', { detail: state.requests })); }
  }


  function autofillFarmerInfo(){
    const firstFarm = (window.farmerFarms && window.farmerFarms.length) ? window.farmerFarms[0] : null;
    const meta = firstFarm && window.agriParseFarmMeta ? window.agriParseFarmMeta(firstFarm) : {};
    const name = $('agriBenefitFullName');
    const phone = $('agriBenefitPhone');
    const wilaya = $('agriBenefitWilaya');
    const project = $('agriBenefitProject');
    if(name && !name.value) name.value = document.querySelector('.agri-global-name')?.textContent?.trim() || '';
    if(phone && !phone.value) phone.value = document.querySelector('#agriProfilePhone, [name="phone"], input[type="tel"]')?.value || '';
    if(wilaya && !wilaya.value) wilaya.value = meta.wilaya || '';
    if(project && !project.value){
      const pieces = [];
      if(firstFarm?.name) pieces.push(`Ferme: ${firstFarm.name}`);
      if(meta.culture) pieces.push(`Culture: ${meta.culture}`);
      if(firstFarm?.surface) pieces.push(`Surface: ${firstFarm.surface} ha`);
      if(meta.commune || meta.wilaya) pieces.push(`Localisation: ${[meta.commune, meta.wilaya].filter(Boolean).join(', ')}`);
      project.value = pieces.join(' | ');
    }
  }

  function openRequest(id){
    const b = state.benefits.find(x => Number(x.id) === Number(id)); if(!b) return;
    state.activeBenefit = b;
    $('agriBenefitId').value = b.id;
    $('agriBenefitModalTitle').textContent = b.title;
    $('agriBenefitModalDescription').textContent = b.description;
    $('agriBenefitModalConditions').textContent = b.conditions || 'Aucune condition spéciale.';
    $('agriBenefitModalDocs').textContent = b.documents_required || 'Document justificatif selon le dossier.';
    autofillFarmerInfo();
    const modal = $('agriBenefitRequestModal');
    if(modal){ modal.classList.add('active'); modal.classList.add('show'); }
  }
  function closeRequest(){
    const modal=$('agriBenefitRequestModal');
    if(modal){ modal.classList.remove('active'); modal.classList.remove('show'); }
    const form=$('agriBenefitRequestForm'); if(form) form.reset();
    const n=$('agriBenefitFullName'); if(n && !n.value) n.value = document.querySelector('.agri-global-name')?.textContent || '';
  }

  async function submitRequest(e){
    e.preventDefault();
    const id = $('agriBenefitId').value;
    const fd = new FormData();
    fd.append('full_name', $('agriBenefitFullName').value);
    fd.append('phone', $('agriBenefitPhone').value);
    fd.append('wilaya', $('agriBenefitWilaya').value);
    fd.append('project_description', $('agriBenefitProject').value);
    const file = $('agriBenefitDocument').files[0]; if(file) fd.append('document', file);
    const res = await fetch(`/api/benefits/${id}/request/`, { method:'POST', headers:{'X-CSRFToken': csrf()}, body: fd });
    const data = await readJson(res);
    if(!data.success){ toast(data.error || 'Erreur lors de l’envoi', 'error'); return; }
    toast('Demande envoyée avec succès ✅');
    closeRequest();
    await loadRequests();
    window.dispatchEvent(new CustomEvent('agri:benefit-request-updated'));
  }

  function init(){
    const refresh = $('agriRefreshBenefitsBtn'); if(refresh) refresh.addEventListener('click', () => { loadBenefits().catch(e=>toast(e.message,'error')); loadRequests(); });
    const mine = $('agriMyRequestsBtn'); if(mine) mine.addEventListener('click', () => document.querySelector('.agri-requests-panel')?.scrollIntoView({behavior:'smooth'}));
    const search = $('agriBenefitSearch'); if(search) search.addEventListener('input', () => { const q=search.value.toLowerCase(); renderBenefits(state.benefits.filter(b => `${b.title} ${b.description}`.toLowerCase().includes(q))); });
    $('agriCloseBenefitModalBtn')?.addEventListener('click', closeRequest);
    $('agriCancelBenefitRequestBtn')?.addEventListener('click', closeRequest);
    $('agriBenefitRequestModal')?.addEventListener('click', (e)=>{ if(e.target.id === 'agriBenefitRequestModal') closeRequest(); });
    $('agriBenefitRequestForm')?.addEventListener('submit', submitRequest);
    loadBenefits().catch(e => toast(e.message,'error')); loadRequests();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
