(function(){
  const storageKey='moises-workspace';
  const safeStorage={get(){try{return localStorage.getItem(storageKey)}catch(e){return null}},set(value){try{localStorage.setItem(storageKey,value)}catch(e){}}};
  function workspaceOf(member){return member?.moises_workspaces||member?.workspace||null}
  function routeFor(role){return role==='admin'?'painel.html':role==='traffic_manager'?'gestor.html':'apresentacao.html'}
  async function memberships(db,userId){
    const {data,error}=await db.from('moises_workspace_members').select('workspace_id,role,moises_workspaces(id,name,slug,brand_name,accent_color,secondary_color,description,is_active)').eq('user_id',userId);
    if(error)throw error;
    return (data||[]).filter(m=>workspaceOf(m)?.is_active!==false);
  }
  function requested(){const p=new URLSearchParams(location.search);return p.get('workspace')||safeStorage.get()}
  function choose(items){
    const wanted=requested();
    const chosen=items.find(m=>m.workspace_id===wanted||workspaceOf(m)?.slug===wanted)||items[0]||null;
    if(chosen)safeStorage.set(chosen.workspace_id);
    return chosen;
  }
  async function resolve(db,userId){const items=await memberships(db,userId),membership=choose(items);return{memberships:items,membership,workspace:workspaceOf(membership)}}
  function applyBrand(workspace){
    if(!workspace)return;
    const root=document.documentElement,accent=workspace.accent_color||'#f4589b',secondary=workspace.secondary_color||'#6d2ccf';
    root.style.setProperty('--brand-accent',accent);root.style.setProperty('--brand-secondary',secondary);root.style.setProperty('--pink',accent);root.style.setProperty('--purple',secondary);
    root.dataset.workspace=workspace.slug||'';
    document.querySelectorAll('[data-workspace-brand]').forEach(n=>n.textContent=workspace.brand_name||workspace.name);
    document.querySelectorAll('[data-workspace-name]').forEach(n=>n.textContent=workspace.name||workspace.brand_name);
  }
  function workspaceUrl(path,id){const url=new URL(path,location.href);url.searchParams.set('workspace',id);return url.pathname.split('/').pop()+url.search}
  function wireSelector(node,items,current){
    if(!node)return;
    node.innerHTML=items.map(m=>{const w=workspaceOf(m);return `<option value="${m.workspace_id}">${w?.brand_name||w?.name||'Operação'}</option>`}).join('');
    node.value=current.workspace_id;
    node.addEventListener('change',()=>{safeStorage.set(node.value);location.assign(workspaceUrl(location.pathname,node.value))});
  }
  function wireLinks(id){document.querySelectorAll('a[data-workspace-link]').forEach(a=>a.href=workspaceUrl(a.getAttribute('href'),id))}
  window.MoisesWorkspace={memberships,resolve,choose,workspaceOf,routeFor,applyBrand,wireSelector,wireLinks,workspaceUrl,safeStorage};
})();
