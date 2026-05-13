(function(){
  const state = { benefits: [], requests: [], editing: null, loading: false };
  const $ = (id) => document.getElementById(id);
  const csrf = () => (document.cookie.split('; ').find(x => x.startsWith('csrftoken=')) || '').split('=')[1] || '';
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const statusClass = (s) => s === 'accepted' ? 'accepted' : (s === 'rejected' ? 'rejected' : 'pending');
  const statusLabel = (s) => s === 'accepted' ? 'Acceptée' : (s === 'rejected' ? 'Refusée' : 'En attente');
  function notify(msg,type){
    if(window.adminNotify) window.adminNotify(msg,type);
    else if(window.adminShowToast) window.adminShowToast(msg,type);
    else alert(msg);
  }
  async function readJson(res){
    const raw=await res.text();
    let data={};
    try{ data=raw?JSON.parse(raw):{}; }catch(e){ data={success:false,error:raw||'Erreur serveur'}; }
    if(!res.ok && !data.error) data.error='Erreur serveur ('+res.status+')';
    return data;
  }

  function updateStats(){
    const pending = state.requests.filter(r=>r.status==='pending').length;
    const accepted = state.requests.filter(r=>r.status==='accepted').length;
    const rejected = state.requests.filter(r=>r.status==='rejected').length;
    if($('adminBenefitsCount')) $('adminBenefitsCount').textContent = state.benefits.length;
    if($('adminBenefitPendingCount')) $('adminBenefitPendingCount').textContent = pending;
    if($('adminBenefitAcceptedCount')) $('adminBenefitAcceptedCount').textContent = accepted;
    if($('adminBenefitRejectedCount')) $('adminBenefitRejectedCount').textContent = rejected;
    window.adminBenefitsState = { benefits: state.benefits.slice(), requests: state.requests.slice() };
    document.dispatchEvent(new CustomEvent('admin:benefits-updated', { detail: window.adminBenefitsState }));
    if(window.adminRefreshNotifications) window.adminRefreshNotifications();
  }

  function renderBenefits(){
    const root=$('adminBenefitsList'); if(!root) return;
    if(!state.benefits.length){root.innerHTML='<div class="admin-empty-state compact">Aucun avantage publié pour le moment.</div>'; return;}
    root.innerHTML=state.benefits.map(b=>`
      <article class="admin-benefit-card-pro">
        <img src="${esc(b.image_url)}" alt="${esc(b.title)}">
        <div class="admin-benefit-card-body">
          <span class="admin-benefit-pill">Publié</span>
          <h4>${esc(b.title)}</h4>
          <p>${esc(b.description)}</p>
        </div>
        <div class="admin-benefit-actions">
          <button class="benefit-edit" type="button" data-edit="${b.id}">Modifier</button>
          <button class="benefit-delete" type="button" data-delete="${b.id}">Supprimer</button>
        </div>
      </article>`).join('');
    root.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>openModal(Number(btn.dataset.edit))));
    root.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>deleteBenefit(Number(btn.dataset.delete))));
  }


  function readonlyField(label, value, wide) {
    return '<label class="admin-print-field '+(wide ? 'wide' : '')+'"><span>'+esc(label)+'</span><input value="'+esc(value || '—')+'" readonly aria-readonly="true" tabindex="-1"></label>';
  }
  function printBenefitRequest(id){
    const r = state.requests.find(x => Number(x.id) === Number(id));
    if(!r) return notify('Demande introuvable','error');
    const body = '<section class="admin-print-sheet" aria-label="Formulaire demande avantage">'
      + '<div class="admin-print-brand"><strong>AgriGov</strong><span>Formulaire officiel de demande d’avantage</span></div>'
      + '<div class="admin-print-grid">'
      + readonlyField('Référence demande', 'AV-' + r.id)
      + readonlyField('Date demande', r.created_at || '—')
      + readonlyField('Statut', statusLabel(r.status))
      + readonlyField('Avantage demandé', r.benefit_title || '—')
      + readonlyField('Agriculteur', r.full_name || r.username || '—')
      + readonlyField('Téléphone', r.phone || '—')
      + readonlyField('Wilaya', r.wilaya || '—')
      + readonlyField('Note admin', r.admin_note || '—', true)
      + '</div>'
      + '<div class="admin-print-readonly-note">Ce formulaire est généré automatiquement depuis la demande agriculteur. Les informations sont en lecture seule.</div>'
      + '<div class="admin-print-signatures"><span>Signature Admin</span><span>Signature Agriculteur</span><span>Cachet</span></div>'
      + '</section>';
    if(window.adminPrintAdminForm) window.adminPrintAdminForm('Formulaire avantage AV-' + r.id, 'Données auto-remplies et verrouillées.', body);
    else { const w=window.open('', '_blank'); w.document.write(body); w.print(); }
  }

  function renderRequests(){
    const body=$('adminBenefitRequestsBody'); if(!body) return;
    if(!state.requests.length){body.innerHTML='<tr><td colspan="5"><div class="admin-empty-state compact">Aucune demande agriculteur.</div></td></tr>'; return;}
    body.innerHTML=state.requests.map(r=>`<tr>
      <td data-label="Agriculteur"><strong>${esc(r.full_name||r.username)}</strong><br><small>${esc(r.phone||'')}</small></td>
      <td data-label="Avantage">${esc(r.benefit_title)}</td>
      <td data-label="Wilaya">${esc(r.wilaya||'-')}</td>
      <td data-label="Statut"><span class="benefit-status ${statusClass(r.status)}">${statusLabel(r.status)}</span></td>
      <td data-label="Actions" class="request-actions"><button class="request-print" type="button" data-print-benefit-request="${r.id}">Imprimer</button>${r.status==='pending'?`<button class="request-accept" type="button" data-accept="${r.id}">Accepter</button><button class="request-reject" type="button" data-reject="${r.id}">Refuser</button>`:''}</td>
    </tr>`).join('');
    body.querySelectorAll('[data-accept]').forEach(btn=>btn.addEventListener('click',()=>updateRequest(Number(btn.dataset.accept),'accepted')));
    body.querySelectorAll('[data-reject]').forEach(btn=>btn.addEventListener('click',()=>updateRequest(Number(btn.dataset.reject),'rejected')));
    body.querySelectorAll('[data-print-benefit-request]').forEach(btn=>btn.addEventListener('click',()=>printBenefitRequest(Number(btn.dataset.printBenefitRequest))));
  }

  async function loadAll(){
    if(state.loading) return;
    state.loading=true;
    try{
      const [bres, rres] = await Promise.all([fetch('/api/benefits/'), fetch('/api/admin/benefit-requests/')]);
      const bdata=await readJson(bres); if(bdata.success) state.benefits=bdata.benefits||[]; else notify(bdata.error||'Impossible de charger les avantages','error');
      const rdata=await readJson(rres); if(rdata.success) state.requests=rdata.requests||[]; else notify(rdata.error||'Impossible de charger les demandes','error');
      renderBenefits(); renderRequests(); updateStats();
    }catch(e){ notify('Connexion impossible avec le serveur','error'); }
    finally{ state.loading=false; }
  }

  function openModal(id){
    const b = id ? state.benefits.find(x=>Number(x.id)===Number(id)) : null;
    state.editing=b||null;
    $('adminBenefitModalTitle').textContent = b ? 'Modifier un avantage' : 'Ajouter un avantage';
    $('adminBenefitEditingId').value = b ? b.id : '';
    $('adminBenefitTitleInput').value = b ? b.title : '';
    $('adminBenefitDescriptionInput').value = b ? b.description : '';
    $('adminBenefitConditionsInput').value = b ? (b.conditions||'') : '';
    $('adminBenefitDocsInput').value = b ? (b.documents_required||'') : '';
    $('adminBenefitImageInput').value = '';
    const modal=$('adminBenefitModal'); if(modal){ modal.style.display='flex'; modal.classList.add('active'); modal.setAttribute('aria-hidden','false'); }
    setTimeout(() => $('adminBenefitTitleInput')?.focus(), 80);
  }
  function closeModal(){
    const modal=$('adminBenefitModal');
    if(modal){ modal.style.display='none'; modal.classList.remove('active'); modal.setAttribute('aria-hidden','true'); }
    $('adminBenefitForm')?.reset(); state.editing=null;
  }

  async function saveBenefit(e){
    e.preventDefault();
    const title = ($('adminBenefitTitleInput')?.value || '').trim();
    const description = ($('adminBenefitDescriptionInput')?.value || '').trim();
    if(!title || !description){ notify('Titre et description obligatoires','warning'); return; }
    const submit = $('adminBenefitForm')?.querySelector('button[type="submit"]');
    if(submit){ submit.disabled=true; submit.textContent='Enregistrement...'; }
    const id=$('adminBenefitEditingId').value;
    const fd=new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('conditions', $('adminBenefitConditionsInput').value || '');
    fd.append('documents_required', $('adminBenefitDocsInput').value || '');
    const img=$('adminBenefitImageInput').files[0]; if(img) fd.append('image',img);
    const url=id?`/api/admin/benefits/${id}/update/`:'/api/admin/benefits/create/';
    try{
      const res=await fetch(url,{method:'POST',headers:{'X-CSRFToken':csrf()},body:fd});
      const data=await readJson(res);
      if(!data.success){notify(data.error||'Erreur lors de l’enregistrement','error');return;}
      notify(id ? 'Avantage modifié ✅' : 'Avantage ajouté ✅');
      closeModal(); await loadAll();
    }catch(err){ notify('Erreur réseau pendant l’enregistrement','error'); }
    finally{ if(submit){ submit.disabled=false; submit.textContent='Enregistrer'; } }
  }

  async function deleteBenefit(id){
    if(!confirm('Supprimer cet avantage ?')) return;
    const res=await fetch(`/api/admin/benefits/${id}/delete/`,{method:'POST',headers:{'X-CSRFToken':csrf()}}); const data=await readJson(res);
    if(!data.success){notify(data.error||'Erreur','error');return;} notify('Avantage supprimé'); await loadAll();
  }
  async function updateRequest(id,status){
    const res=await fetch(`/api/admin/benefit-requests/${id}/${status}/`,{method:'POST',headers:{'X-CSRFToken':csrf()}}); const data=await readJson(res);
    if(!data.success){notify(data.error||'Erreur','error');return;} notify(status==='accepted'?'Demande acceptée ✅':'Demande refusée ❌'); await loadAll();
  }
  function init(){
    if(!$('adminBenefitsPage')) return;
    $('adminOpenBenefitModalBtn')?.addEventListener('click',()=>openModal());
    $('adminRefreshBenefitsBtn')?.addEventListener('click',loadAll);
    $('adminCloseBenefitModalBtn')?.addEventListener('click',closeModal);
    $('adminCancelBenefitModalBtn')?.addEventListener('click',closeModal);
    $('adminBenefitModal')?.addEventListener('click',(e)=>{ if(e.target.id==='adminBenefitModal') closeModal(); });
    document.addEventListener('keydown',(e)=>{ if(e.key==='Escape' && $('adminBenefitModal')?.classList.contains('active')) closeModal(); });
    $('adminBenefitForm')?.addEventListener('submit',saveBenefit);
    document.addEventListener("admin:benefits-page-opened", loadAll);
    loadAll();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
