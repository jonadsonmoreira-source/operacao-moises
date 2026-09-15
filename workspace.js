(function(){
  const storageKey='moises-workspace';
  const safeStorage={get(){try{return localStorage.getItem(storageKey)}catch(e){return null}},set(value){try{localStorage.setItem(storageKey,value)}catch(e){}}};
  function workspaceOf(member){return member?.moises_workspaces||member?.workspace||null}
  function routeFor(role){return role==='admin'?'painel.html?v=20260915-compact2':role==='traffic_manager'?'gestor.html':'apresentacao.html'}
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
    ensureWorkspaceTheme();
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

  function ensureWorkspaceTheme(){
    if(document.getElementById('moises-workspace-theme'))return;
    const style=document.createElement('style');
    style.id='moises-workspace-theme';
    style.textContent=`
html[data-workspace="beira-rio"]{
  --ink:#15323a;--muted:#627c82;--pink:#2f91a5;--purple:#164c63;--line:#cfe1e4;
}
html[data-workspace="beira-rio"] body{
  background:radial-gradient(circle at 90% 0,#d9f1f3,transparent 28%),linear-gradient(145deg,#fff,#f2faf9);
}
html[data-workspace="beira-rio"] body:before{background:radial-gradient(circle,#9edce2,transparent 68%)}
html[data-workspace="beira-rio"] body:after{background:radial-gradient(circle,#8bbac8,transparent 68%)}
html[data-workspace="beira-rio"] .brand h1{
  background-image:linear-gradient(110deg,var(--ink),#237b8e,#42afbf);
}
html[data-workspace="beira-rio"] .hero{
  background:linear-gradient(125deg,#3195a8,#1e697e 60%,#123f55);
  box-shadow:0 24px 70px #164c6330;
}
html[data-workspace="beira-rio"] .metric strong,
html[data-workspace="beira-rio"] .mini strong{color:#185f72}
html[data-workspace="beira-rio"] .presentation-button{
  background:linear-gradient(110deg,#3195a8,#164c63);
}
html[data-workspace="beira-rio"] .presentation{background:#071519}
html[data-workspace="beira-rio"] .presentation-bg{
  background:radial-gradient(circle at 76% 20%,#2d91a45c,transparent 31%),radial-gradient(circle at 15% 83%,#1f718542,transparent 28%),linear-gradient(145deg,#061216,#0d2d36 57%,#07191f);
}
html[data-workspace="beira-rio"][data-theme="dark"]{
  --ink:#f1fbfc;--muted:#aac2c7;--pink:#45b3c5;--purple:#278aa0;--line:#294953;
}
html[data-workspace="beira-rio"][data-theme="dark"] body{
  background:radial-gradient(circle at 92% 0,#164c63 0,transparent 32%),radial-gradient(circle at 4% 74%,#0d3843 0,transparent 30%),linear-gradient(145deg,#071216,#10232a 55%,#09191e);
}
html[data-workspace="beira-rio"][data-theme="dark"] body:before{background:radial-gradient(circle,#23798b,transparent 68%)}
html[data-workspace="beira-rio"][data-theme="dark"] body:after{background:radial-gradient(circle,#22586a,transparent 68%)}
html[data-workspace="beira-rio"][data-theme="dark"] .brand h1{
  background-image:linear-gradient(110deg,#fff,#a8e3e8,#4fb6c8);
}
html[data-workspace="beira-rio"][data-theme="dark"] .metric,
html[data-workspace="beira-rio"][data-theme="dark"] .card{
  background:#10242bdd;border-color:#294953;box-shadow:0 18px 48px #0005;
}
html[data-workspace="beira-rio"][data-theme="dark"] .metric:hover,
html[data-workspace="beira-rio"][data-theme="dark"] .card:hover{
  border-color:#397181;box-shadow:0 26px 65px #0007;
}
html[data-workspace="beira-rio"][data-theme="dark"] .metric strong,
html[data-workspace="beira-rio"][data-theme="dark"] .mini strong{color:#9edee6}
html[data-workspace="beira-rio"][data-theme="dark"] .mini{background:#153039;border-color:#315560}
html[data-workspace="beira-rio"][data-theme="dark"] .mini:hover{background:#193943}
html[data-workspace="beira-rio"][data-theme="dark"] .next-step{background:#0f252c;border-color:#294953}
html[data-workspace="beira-rio"][data-theme="dark"] .chart{
  background:repeating-linear-gradient(to top,transparent 0,transparent 40px,#76ced912 41px);
  border-color:#294953;
}
html[data-workspace="beira-rio"][data-theme="dark"] th,
html[data-workspace="beira-rio"][data-theme="dark"] td{border-color:#294953}
html[data-workspace="beira-rio"][data-theme="dark"] tbody tr:hover{background:#18343d}
html[data-workspace="beira-rio"][data-theme="dark"] .insight{
  background:linear-gradient(145deg,#15313a,#10262d);border-color:#294953;
}
html[data-workspace="beira-rio"][data-theme="dark"] .insight-empty{background:#132b33;color:#aac2c7}
html[data-workspace="beira-rio"][data-theme="dark"] .summary-section-title{color:#8ed9e2}
html[data-workspace="beira-rio"][data-theme="dark"] .actions a,
html[data-workspace="beira-rio"][data-theme="dark"] .theme-toggle,
html[data-workspace="beira-rio"][data-theme="dark"] .month-control{
  background:#102a32!important;color:#d7f4f6!important;border-color:#315560!important;
}
`;
    document.head.appendChild(style);
  }
  window.MoisesWorkspace={memberships,resolve,choose,workspaceOf,routeFor,applyBrand,wireSelector,wireLinks,workspaceUrl,safeStorage};
})();
