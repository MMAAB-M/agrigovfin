(function(){
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function go(pageId){
    const link = document.querySelector(`.admin-menu-link[data-page="${pageId}"]`);
    if(link) link.click();
    closePanel();
  }
  function closePanel(){ const p=$('adminNotificationPanel'); if(p){ p.classList.remove('active'); p.setAttribute('aria-hidden','true'); } }
  function openPanel(){ const p=$('adminNotificationPanel'); if(p){ p.classList.toggle('active'); p.setAttribute('aria-hidden', p.classList.contains('active') ? 'false' : 'true'); } }
  async function getBenefitRequests(){
    try{
      const res = await fetch('/api/admin/benefit-requests/');
      const data = await res.json();
      return data.success ? (data.requests || []) : [];
    }catch(e){ return []; }
  }
  function getPendingUsersCount(){
    const body = $('adminPendingUsersBody');
    if(!body) return 0;
    return body.querySelectorAll('tr.admin-user-row[data-status="pending"]').length;
  }
  function render(items){
    const list = $('adminNotificationList');
    if(!list) return;
    if(!items.length){
      list.innerHTML = '<div class="admin-notification-empty">Aucune notification pour le moment.</div>';
    }else{
      list.innerHTML = items.map((n, i) => `
        <button type="button" class="admin-notification-item ${esc(n.type)}" data-index="${i}">
          <span>${esc(n.icon)}</span>
          <div><strong>${esc(n.title)}</strong><small>${esc(n.text)}</small></div>
        </button>`).join('');
      list.querySelectorAll('[data-index]').forEach(btn => btn.addEventListener('click', () => {
        const n = items[Number(btn.dataset.index)];
        if(n && n.page) go(n.page);
      }));
    }
    const count = items.filter(n => n.important !== false).length;
    document.querySelectorAll('.admin-notification-badge').forEach(badge => {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = count === 0;
    });
  }
  async function refresh(){
    const requests = await getBenefitRequests();
    const pendingBenefits = requests.filter(r => r.status === 'pending');
    const today = new Date().toISOString().slice(0,10);
    const recentDone = requests.filter(r => r.status !== 'pending' && String(r.created_at || '').slice(0,10) === today).slice(0,3);
    const pendingUsers = getPendingUsersCount();
    const items = [];
    if(pendingBenefits.length){
      items.push({icon:'🎁', type:'warning', title:`${pendingBenefits.length} demande(s) d’avantage`, text:'Des agriculteurs attendent validation.', page:'adminBenefitsPage'});
    }
    if(pendingUsers){
      items.push({icon:'👤', type:'info', title:`${pendingUsers} compte(s) en attente`, text:'Comptes à valider dans Gestion des Utilisateurs.', page:'adminUsersPage'});
    }
    recentDone.forEach(r => items.push({icon:r.status==='accepted'?'✅':'❌', type:r.status==='accepted'?'success':'error', title:`Demande ${r.status==='accepted'?'acceptée':'refusée'}`, text:`${r.full_name || r.username || 'Agriculteur'} · ${r.benefit_title || 'Avantage'}`, page:'adminBenefitsPage', important:false}));
    render(items);
  }
  function init(){
    document.querySelectorAll('.admin-notification-btn').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); openPanel(); refresh(); }));
    $('adminCloseNotificationsBtn')?.addEventListener('click', closePanel);
    document.addEventListener('click', (e) => {
      const panel = $('adminNotificationPanel');
      if(!panel || !panel.classList.contains('active')) return;
      if(panel.contains(e.target) || e.target.closest('.admin-notification-btn')) return;
      closePanel();
    });
    document.addEventListener('admin:benefits-updated', refresh);
    window.adminRefreshNotifications = refresh;
    refresh();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
