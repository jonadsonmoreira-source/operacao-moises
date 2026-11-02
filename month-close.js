(function(root){
  'use strict';
  const source='meta_messaging_conversation_started_7d';
  const sum=(rows,key)=>rows.reduce((a,r)=>a+Number(r[key]||0),0);
  function brasiliaMonth(now=new Date()){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(now);
    return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value;
  }
  function summarize({month,sales=[],media=[],leads=[],now=new Date()}){
    const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate();
    const dates=Array.from({length:days},(_,i)=>month+'-'+String(i+1).padStart(2,'0'));
    const pick=list=>list.filter(r=>dates.includes(r.record_date));
    const s=pick(sales),l=pick(leads).filter(r=>r.source===source&&!r.is_partial);
    const daily=new Map(pick(media).map(r=>[r.record_date,Number(r.media_spend||0)]));
    l.forEach(r=>daily.set(r.record_date,Number(r.meta_spend||0)));
    const missing=dates.filter(d=>!s.some(r=>r.record_date===d)||!l.some(r=>r.record_date===d));
    const revenue=sum(s,'sales'),orders=sum(s,'orders'),spend=[...daily.values()].reduce((a,b)=>a+b,0),count=sum(l,'leads');
    const complete=missing.length===0;
    return {closed:month<brasiliaMonth(now),days,covered:days-missing.length,missing,complete,revenue,orders,spend,leads:count,
      ticket:orders>0?revenue/orders:null,cpl:complete&&count>0?spend/count:null,
      orderLeadRatio:complete&&count>0?orders/count*100:null,roas:complete&&spend>0?revenue/spend:null};
  }
  const money=n=>n==null?'—':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const number=n=>n.toLocaleString('pt-BR');
  const pct=n=>n==null?'—':n.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount(context){
    const section=document.createElement('section');section.id='monthClose';section.className='month-close';section.hidden=true;
    document.querySelector('.hero').after(section);
    const text=(id,value)=>{const el=document.getElementById(id);if(el){cancelAnimationFrame(el._counterFrame);el.textContent=value;}};
    const originals=new Map();
    function remember(selector){document.querySelectorAll(selector).forEach(el=>{if(!originals.has(el))originals.set(el,el.innerHTML);});}
    remember('#goalPath h3,#goalPath .goal-now small,#goalPath .goal-reading small,.history thead,.deck-slide h2,.deck-slide .deck-kicker,.deck-stat small,.deck-stat p,#deckConclusionText,#deckEfficiencyText,#deckMediaText,#deckSalesDelta,#deckPointSales,#deckPointMedia,#deckPointOrders');
    const originalButton=document.getElementById('startPresentation').innerHTML;
    function restore(){originals.forEach((html,el)=>el.innerHTML=html);document.querySelectorAll('.deck-slide')[1].hidden=false;document.getElementById('startPresentation').innerHTML=originalButton;}
    function render(){
      const c=context(),s=summarize(c);document.body.classList.toggle('closing-mode',s.closed);section.hidden=!s.closed;
      if(!s.closed){restore();return;}
      const name=c.monthLabel,status=s.complete?'Base diária completa':'Dados pendentes';
      text('heroTitle',name+' · fechamento');
      text('heroText',s.complete?`${money(s.revenue)} em vendas, ${number(s.orders)} pedidos e ${number(s.leads)} leads. Resultado dos ${s.days} dias do mês.`:`Mês encerrado. Vendas e leads completos em ${s.covered} de ${s.days} dias; os totais disponíveis ainda podem mudar.`);
      document.querySelector('.hero .badge').textContent=status;
      const metric=(label,value,note)=>`<article class="close-metric"><small>${label}</small><strong>${value}</strong><span>${note}</span></article>`;
      const previous=summarize({...c,month:c.previousMonth});
      const delta=(value,base)=>base>0?pct((value/base-1)*100):'—';
      const comparison=previous.complete&&s.complete?`Vendas: ${delta(s.revenue,previous.revenue)}; pedidos: ${delta(s.orders,previous.orders)}; mídia: ${delta(s.spend,previous.spend)}; leads: ${delta(s.leads,previous.leads)} contra ${c.previousLabel.toLowerCase()}.`:'Comparação mensal indisponível: é necessário ter todos os dias de vendas e leads nos dois meses.';
      const target=c.target,goal=Number(target?.goal||0),gap=s.revenue-goal;
      const goalText=goal>0?`${pct(s.revenue/goal*100)} da meta de ${money(goal)}. Resultado ${money(Math.abs(gap))} ${gap>=0?'acima':'abaixo'} da meta${s.complete?'':', com dados pendentes'}.`:'Nenhuma meta comercial cadastrada para este mês.';
      const cost=c.cost;
      const costNote=cost.source==='invoice'?'Custo confirmado pelas notas fiscais':cost.source==='estimate'?'Custo estimado com tributos; notas pendentes':'Base fiscal pendente; gasto da Meta sem acréscimo';
      const costRoas=s.complete&&cost.total>0?s.revenue/cost.total:null;
      section.innerHTML=`<header class="close-head"><div><small>Relatório mensal</small><h2>Os números do fechamento</h2></div><span>${s.covered}/${s.days} dias · ${status}</span></header><div class="close-metrics">${metric('Vendas registradas',money(s.revenue),`${number(s.orders)} pedidos`)}${metric('Investimento na Meta',money(s.spend),'Gasto das contas vinculadas')}${metric('Leads da Meta',number(s.leads),'Conversas atribuídas')}${metric('Ticket médio',money(s.ticket),'Vendas ÷ pedidos')}${metric('Custo por lead',money(s.cpl),'Investimento Meta ÷ leads')}${metric('Pedidos por 100 leads',pct(s.orderLeadRatio),'Relação de volumes do mês')}${metric('Custo da mídia com tributos',money(cost.total),costNote)}${metric('Vendas / custo da mídia',costRoas==null?'—':costRoas.toFixed(2).replace('.',',')+'x',costNote)}</div><div class="close-analysis"><article><small>Resultado comercial</small><h3>${goal>0?(gap>=0?'Meta alcançada':'Resultado abaixo da meta'):'Resultado do mês'}</h3><p>${escape(goalText)}</p></article><article><small>Comparação mensal</small><h3>${escape(c.previousLabel)}</h3><p>${escape(comparison)}</p></article><article><small>Qualidade da base</small><h3>${status}</h3><p>${s.complete?'Há registros de vendas e leads para todos os dias, inclusive domingos e dias com zero.':`Faltam registros completos em: ${s.missing.map(d=>d.slice(-2)).join(', ')}. Indicadores que cruzam as bases ficam indisponíveis.`}</p></article></div><p class="close-footnote">Leads são conversas atribuídas pela Meta, não pessoas únicas. A relação entre pedidos e leads não mede conversão individual. Vendas / mídia é uma relação entre os totais da loja, sem atribuição de todas as vendas aos anúncios.</p>`;
      const goalBox=document.getElementById('goalPath');if(goalBox){goalBox.querySelector('h3').textContent='Resultado das metas';goalBox.querySelector('.goal-now small').textContent='Vendas do mês';const labels=goalBox.querySelectorAll('.goal-reading small');labels[0].textContent='Resultado final';labels[1].textContent='Balanço da meta';}
      text('goalMessage',goalText);text('goalAction',target?`Plus: ${money(Number(target.goal_plus))} · Power: ${money(Number(target.goal_power))}`:'Meta não cadastrada.');text('goalNote',target?.note||'');
      document.querySelector('.history thead').innerHTML='<tr><th>Data</th><th>Vendas</th><th>Pedidos</th><th>Mídia Meta</th><th>Leads</th><th>Custo por lead</th></tr>';
      document.getElementById('history').innerHTML=Array.from({length:s.days},(_,i)=>{
        const date=c.month+'-'+String(s.days-i).padStart(2,'0'),sale=c.sales.find(r=>r.record_date===date),lead=c.leads.find(r=>r.record_date===date&&r.source===source&&!r.is_partial),manual=c.media.find(r=>r.record_date===date),spend=lead?Number(lead.meta_spend):manual?Number(manual.media_spend):null;
        return `<tr><td>${date.split('-').reverse().join('/')}</td><td>${sale?money(Number(sale.sales)):'Pendente'}</td><td>${sale?number(Number(sale.orders)):'Pendente'}</td><td>${money(spend)}</td><td>${lead?number(Number(lead.leads)):'Pendente'}</td><td>${money(lead&&Number(lead.leads)>0?spend/Number(lead.leads):null)}</td></tr>`;
      }).join('');
      document.getElementById('startPresentation').textContent='Apresentar fechamento';
    }
    function deck(){
      const c=context(),s=summarize(c);if(!s.closed)return;
      const slides=[...document.querySelectorAll('.deck-slide')];
      slides[0].querySelector('.deck-kicker').textContent=s.complete?'Fechamento mensal · base diária completa':'Mês encerrado · dados pendentes';
      slides[0].querySelector('h2').textContent=c.monthLabel+' · resultado do mês';
      text('deckSales',money(s.revenue));text('deckOpening',`${number(s.orders)} pedidos · ${number(s.leads)} leads · ${money(s.spend)} investidos na Meta. ${s.covered}/${s.days} dias completos.`);
      const prev=summarize({...c,month:c.previousMonth}),comparable=s.complete&&prev.complete&&prev.revenue>0;
      slides[1].hidden=!comparable;
      if(comparable){slides[1].querySelector('h2').textContent='Resultado contra o mês anterior';text('deckSalesDelta',`${pct(Math.abs(s.revenue/prev.revenue-1)*100)} ${s.revenue>=prev.revenue?'acima':'abaixo'} de ${c.previousLabel.toLowerCase()}`);}
      slides[2].querySelector('h2').textContent='Investimento e retorno do mês';
      text('deckMedia',money(s.spend));text('deckMediaText','Gasto registrado na Meta');
      const stats=slides[2].querySelectorAll('.deck-stat');
      stats[1].querySelector('small').textContent='Vendas / custo da mídia';
      stats[1].querySelector('p').textContent=c.cost.source==='invoice'?'Custo confirmado pelas notas':c.cost.source==='estimate'?'Tributos estimados; notas pendentes':'Gasto Meta; base fiscal pendente';
      stats[2].querySelector('small').textContent='Custo por lead';
      text('deckEfficiencyText',s.complete?'Investimento Meta ÷ conversas atribuídas':'Indicador indisponível: há dias pendentes');
      text('deckRoas',s.complete&&c.cost.total>0?(s.revenue/c.cost.total).toFixed(2).replace('.',',')+'x':'—');
      text('deckEfficiency',money(s.cpl));
      slides[3].querySelector('h2').textContent='Vendas registradas ao longo do mês';
      document.getElementById('deckProjectionSlide').hidden=true;
      text('deckConclusion',s.complete?'Balanço do fechamento':'Fechamento com pendências');
      text('deckConclusionText',`${money(s.revenue)} em vendas, ticket médio de ${money(s.ticket)} e custo por lead de ${money(s.cpl)}. ${s.complete?'Todos os dias possuem registros de vendas e leads.':'Há dias pendentes; a análise final depende de completar a base.'}`);
      text('deckPointSales',money(s.revenue)+' em vendas');text('deckPointMedia',money(s.spend)+' na Meta');text('deckPointOrders',number(s.leads)+' leads · '+number(s.orders)+' pedidos');
    }
    return {render,deck,restore};
  }
  const api={summarize,brasiliaMonth,mount};if(typeof module!=='undefined')module.exports=api;else root.MoisesMonthClose=api;
})(typeof window==='undefined'?globalThis:window);
