(function(root){
  'use strict';
  const source='meta_messaging_conversation_started_7d';
  const integer=n=>Number(n).toLocaleString('pt-BR');
  const money=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dateKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  function monday(key){const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10)}
  function summarize(leads,sales,ids,start,end){
    const selected=leads.filter(r=>ids.includes(r.workspace_id)&&r.source===source&&r.record_date>=start&&r.record_date<=end);
    const completeDates=[...new Set(selected.map(r=>r.record_date))].filter(date=>ids.every(id=>selected.some(r=>r.workspace_id===id&&r.record_date===date)));
    const rows=selected.filter(r=>completeDates.includes(r.record_date));
    const matchedDates=completeDates.filter(date=>ids.every(id=>rows.some(r=>r.workspace_id===id&&r.record_date===date&&!r.is_partial)&&sales.some(r=>r.workspace_id===id&&r.record_date===date)));
    const matchedLeads=rows.filter(r=>matchedDates.includes(r.record_date)).reduce((sum,r)=>sum+Number(r.leads),0);
    const matchedOrders=sales.filter(r=>ids.includes(r.workspace_id)&&matchedDates.includes(r.record_date)).reduce((sum,r)=>sum+Number(r.orders||0),0);
    const count=rows.reduce((sum,r)=>sum+Number(r.leads),0),spend=rows.reduce((sum,r)=>sum+Number(r.meta_spend),0);
    return {count,spend,cost:count>0?spend/count:null,days:completeDates.length,matchedDays:matchedDates.length,matchedOrders,matchedLeads,conversion:matchedLeads>0?matchedOrders/matchedLeads*100:null,partial:rows.some(r=>r.is_partial),updated:rows.map(r=>r.synced_at).sort().at(-1)||null};
  }
  async function mount({db,group=false,anchor}){
    if(typeof document==='undefined')return;
    if(document.body.classList.contains('auth-pending')){
      const observer=new MutationObserver(()=>{if(!document.body.classList.contains('auth-pending')){observer.disconnect();mount({db,group,anchor})}});
      observer.observe(document.body,{attributes:true,attributeFilter:['class']});return;
    }
    const {data:{session}}=await db.auth.getSession();if(!session)return;
    const memberships=await root.MoisesWorkspace.memberships(db,session.user.id);
    const chosen=group?memberships:[root.MoisesWorkspace.choose(memberships)].filter(Boolean);
    const allowed=chosen.filter(m=>['admin','viewer'].includes(m.role));if(!allowed.length)return;
    const ids=allowed.map(m=>m.workspace_id),names=new Map(allowed.map(m=>[m.workspace_id,root.MoisesWorkspace.workspaceOf(m).brand_name||root.MoisesWorkspace.workspaceOf(m).name]));
    const section=document.createElement('section');section.className='meta-leads-panel';section.id='metaLeads';section.setAttribute('aria-label','Leads diários da Meta');
    const target=document.querySelector(anchor);if(!target)return;target.after(section);
    let cachedLeads=[],cachedSales=[],error=false,loadVersion=0;
    function render(){
      const today=dateKey(),month=document.querySelector('#monthSelector')?.value||today.slice(0,7),start=month+'-01';
      const end=month===today.slice(0,7)?today:new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
      const latest=cachedLeads.filter(r=>r.record_date>=start&&r.record_date<=end).map(r=>r.record_date).sort().at(-1);
      const day=month===today.slice(0,7)?today:latest||end;
      const lastWeek=monday(day),weekStart=lastWeek>start?lastWeek:start;
      const periods=[['Dia',day,day],['Semana',weekStart,day],['Mês',start,end]];
      const jaragua=allowed.some(m=>root.MoisesWorkspace.workspaceOf(m).slug==='jaragua');
      const panels=periods.map(([label,a,b])=>{const s=summarize(cachedLeads,cachedSales,ids,a,b);return `<article class="ml-card"><small>${label} · ${a.slice(8)}/${a.slice(5,7)}${a===b?'':` a ${b.slice(8)}/${b.slice(5,7)}`}</small><strong>${s.days?integer(s.count):'—'}</strong><span>conversas atribuídas${s.partial?' · parcial':''}</span><dl><div><dt>Custo por lead</dt><dd>${s.cost===null?'—':money(s.cost)}</dd></div><div><dt>Conversão aparente</dt><dd>${s.conversion===null?'—':s.conversion.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'}</dd></div></dl><p>${s.matchedDays?`${integer(s.matchedOrders)} pedidos / ${integer(s.matchedLeads)} leads em ${s.matchedDays} dia(s) com vendas e leads completos.`:'Aguardando vendas e leads completos nas mesmas datas.'}</p></article>`}).join('');
      const days=[...new Set(cachedLeads.filter(r=>r.record_date>=start&&r.record_date<=end).map(r=>r.record_date))].sort().reverse();
      const history=days.map(date=>{const s=summarize(cachedLeads,cachedSales,ids,date,date);return `<tr><td>${date.split('-').reverse().join('/')}${s.partial?' · parcial':''}</td><td>${s.days?integer(s.count):'—'}</td><td>${s.matchedDays?integer(s.matchedOrders):'—'}</td><td>${s.cost===null?'—':money(s.cost)}</td><td>${s.conversion===null?'—':s.conversion.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'}</td></tr>`}).join('');
      const monthly=summarize(cachedLeads,cachedSales,ids,start,end);
      const byStore=group?`<div class="ml-stores">${ids.map(id=>{const s=summarize(cachedLeads,cachedSales,[id],start,end);return `<div><b>${escape(names.get(id))}</b><span>${s.days?integer(s.count):'—'} leads · ${s.cost===null?'custo indisponível':money(s.cost)+'/lead'}</span></div>`}).join('')}</div>`:'';
      section.innerHTML=`<header><div><small>Da conversa à venda</small><h3>Leads diários da Meta</h3><p>Conversas iniciadas atribuídas aos anúncios.${jaragua?' Jaraguá reúne Escritório SC + Joinville.':''}</p></div><button type="button" class="ml-refresh">Atualizar</button></header>${error?'<p class="ml-alert" role="alert">Não foi possível atualizar os leads. Os valores abaixo são da última consulta disponível.</p>':''}<div class="ml-grid">${panels}</div>${byStore}<details><summary>Histórico diário do mês</summary><div class="ml-table"><table><thead><tr><th>Data</th><th>Leads</th><th>Pedidos</th><th>Custo/lead</th><th>Conversão aparente</th></tr></thead><tbody>${history||'<tr><td colspan="5">Ainda não há consulta da Meta para este mês.</td></tr>'}</tbody></table></div></details><p class="ml-note">Leads não são necessariamente contatos novos ou exclusivos do WhatsApp. Conversão aparente = pedidos registrados ÷ conversas nas mesmas datas; não comprova a origem das vendas. Dias sem consulta aparecem como indisponíveis; o dia atual é parcial.</p><p class="ml-note">${monthly.updated?'Última consulta da Meta: '+escape(new Date(monthly.updated).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))+' (Brasília).':'Aguardando sincronização do computador.'} ${monthly.days} dia(s) com cobertura completa das contas no período.</p>`;
      section.querySelector('.ml-refresh').onclick=load;
    }
    async function load(){
      const version=++loadVersion;
      const month=document.querySelector('#monthSelector')?.value||dateKey().slice(0,7);
      if(!/^\d{4}-\d{2}$/.test(month))return;
      const start=month+'-01',end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
      const [a,b]=await Promise.all([db.from('moises_meta_leads_daily').select('*').in('workspace_id',ids).gte('record_date',start).lte('record_date',end).order('record_date').limit(1000),db.from('moises_commercial_daily').select('workspace_id,record_date,orders').in('workspace_id',ids).gte('record_date',start).lte('record_date',end).order('record_date').limit(1000)]);
      if(version!==loadVersion)return;
      error=!!(a.error||b.error);if(!error){cachedLeads=a.data||[];cachedSales=b.data||[]}render();
    }
    document.querySelector('#monthSelector')?.addEventListener('change',load);
    await load();
    let refreshTimer;const refresh=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(load,500)};
    const channel=db.channel('meta-leads-'+ids.join('-'));
    for(const id of ids){for(const table of ['moises_meta_leads_daily','moises_commercial_daily'])channel.on('postgres_changes',{event:'*',schema:'public',table,filter:'workspace_id=eq.'+id},refresh)}
    channel.subscribe();setInterval(load,60000);
  }
  root.MoisesLeads={summarize,monday,mount};
  if(typeof module!=='undefined')module.exports=root.MoisesLeads;
})(typeof window!=='undefined'?window:globalThis);
