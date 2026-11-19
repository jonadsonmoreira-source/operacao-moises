(function (root) {
  'use strict';
  const source = 'meta_messaging_conversation_started_7d';
  const money = value => value == null ? '—' : value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const percent = value => value == null ? '—' : value.toLocaleString('pt-BR', {maximumFractionDigits: 1, signDisplay: 'always'}) + '%';
  const change = (value, base) => base > 0 ? (value / base - 1) * 100 : null;
  function today(now) {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now);
    const part = type => parts.find(p => p.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function analyze({month, sales = [], leads = [], insights = [], now = new Date()}) {
    const date = today(now), closed = month < date.slice(0, 7);
    const days = key => {const [y, m] = key.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate();};
    const [year, m] = month.split('-').map(Number);
    const previous = new Date(Date.UTC(year, m - 2, 1)).toISOString().slice(0, 7);
    const limit = closed ? days(month) : month === date.slice(0, 7) ? Number(date.slice(-2)) - 1 : 0;
    const validLeads = leads.filter(r => r.source === source && !r.is_partial);
    const salesMap = new Map(sales.map(r => [r.record_date, r]));
    const leadsMap = new Map(validLeads.map(r => [r.record_date, r]));
    const key = (period, day) => `${period}-${String(day).padStart(2, '0')}`;
    const complete = (period, day) => salesMap.has(key(period, day)) && leadsMap.has(key(period, day));
    let cutoff = limit;
    while (cutoff > 0 && !complete(month, cutoff)) cutoff--;
    function totals(period, end) {
      const result = {sales: 0, orders: 0, spend: 0, leads: 0, missing: []};
      for (let day = 1; day <= end; day++) {
        const d = key(period, day), s = salesMap.get(d), l = leadsMap.get(d);
        if (!complete(period, day)) result.missing.push(d);
        result.sales += Number(s?.sales || 0);
        result.orders += Number(s?.orders || 0);
        result.spend += Number(l?.meta_spend || 0);
        result.leads += Number(l?.leads || 0);
      }
      result.ticket = result.orders > 0 ? result.sales / result.orders : null;
      result.cpl = !result.missing.length && result.leads > 0 ? result.spend / result.leads : null;
      return result;
    }
    const end = closed ? limit : cutoff, current = totals(month, end);
    const baseEnd = closed ? days(previous) : Math.min(end, days(previous));
    const base = totals(previous, baseEnd);
    const comparable = end > 0 && !current.missing.length && !base.missing.length && (closed || end === baseEnd);
    const delta = field => comparable ? change(current[field], base[field]) : null;
    const revenue = delta('sales'), orders = delta('orders'), spend = delta('spend');
    const ticket = comparable && current.ticket != null ? change(current.ticket, base.ticket) : null;
    const cpl = comparable && current.cpl != null ? change(current.cpl, base.cpl) : null;
    const through = end ? key(month, end) : null;
    const editorial = insights.filter(r => r.published !== false && r.period_start >= month + '-01' && r.period_end <= through && r.period_end >= r.period_start)
      .sort((a, b) => b.period_end.localeCompare(a.period_end) || String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0] || null;
    const facts = [`${money(current.sales)} em vendas e ${current.orders.toLocaleString('pt-BR')} pedidos.`, `${money(current.spend)} na Meta e ${current.leads.toLocaleString('pt-BR')} conversas.`, `Ticket médio ${money(current.ticket)}; custo por conversa ${money(current.cpl)}.`];
    if (comparable) facts.push(`Contra ${closed ? 'o mês anterior' : 'os mesmos dias do mês anterior'}: vendas ${percent(revenue)}, pedidos ${percent(orders)} e mídia ${percent(spend)}.`);
    let headline = 'Resultado em acompanhamento';
    if (!end || current.missing.length) headline = 'Base de dados em conferência';
    else if (revenue != null) headline = revenue > 0 ? 'Vendas acima do período anterior' : revenue < 0 ? 'Vendas abaixo do período anterior' : 'Vendas no nível do período anterior';
    const attention = [];
    if (ticket != null && ticket < -0.1) attention.push(`O ticket médio caiu ${percent(Math.abs(ticket)).replace('+', '')}. Conferir mix, descontos e margem.`);
    if (cpl != null && cpl > 0.1) attention.push(`O custo por conversa subiu ${percent(cpl).replace('+', '')}.`);
    if (orders != null && orders < -0.1) attention.push(`O número de pedidos caiu ${percent(Math.abs(orders)).replace('+', '')}.`);
    if (!comparable) attention.push('A comparação aguarda registros completos nos dois períodos.');
    if (end < limit || current.missing.length) attention.push(`Há dias pendentes até ${key(month, limit)}.`);
    return {month, previous, closed, end, through, limit, current, base, comparable, revenue, ticket, cpl, headline, facts: facts.join(' '), attention: attention.join(' '), editorial};
  }
  function mount(context) {
    const text = (id, value) => {const el = document.getElementById(id); if (el) {cancelAnimationFrame(el._counterFrame); el.textContent = value;}};
    const slideText = (slide, selector, value) => {const el = slide?.querySelector(selector); if (el) el.textContent = value;};
    function render(deck = false) {
      const c = context(), s = analyze(c), period = s.through ? `01/${c.month.slice(5)} a ${s.through.slice(8)}/${c.month.slice(5)}/${c.month.slice(0, 4)}` : 'Aguardando dias encerrados';
      text('heroTitle', `${c.monthLabel} · ${s.headline.toLowerCase()}`);
      text('heroText', `${period}. ${s.facts} ${s.attention}`);
      text('readingTitle', s.headline);
      text('readingText', `${s.facts} ${s.attention}`);
      const reading = document.getElementById('reading');
      if (reading) reading.className = 'reading' + (s.attention ? ' warn' : '');
      const weekly = document.getElementById('jonadsonInsights');
      if (weekly) {
        weekly.textContent = '';
        const article = document.createElement('article');
        article.className = 'insight';
        const title = document.createElement('h4'), body = document.createElement('p');
        title.textContent = s.editorial?.title || 'Análise da gestão';
        body.textContent = s.editorial ? `${s.editorial.period_start.split('-').reverse().join('/')} a ${s.editorial.period_end.split('-').reverse().join('/')}\n${s.editorial.summary}` : 'A análise da gestão para o mês selecionado ainda não foi publicada.';
        article.append(title, body); weekly.append(article);
      }
      if (!deck) return;
      const slides = [...document.querySelectorAll('.deck-slide')];
      slideText(slides[0], '.deck-kicker', `${c.brand} · ${s.closed ? 'Fechamento' : 'Cenário atual'}`);
      slideText(slides[0], 'h2', `${c.monthLabel} · ${s.headline.toLowerCase()}`);
      text('deckSales', money(s.current.sales));
      text('deckOpening', `${period}. ${s.current.orders} pedidos e ${s.current.leads} conversas. ${s.attention}`);
      slides[1].hidden = !s.comparable;
      slideText(slides[1], '.deck-kicker', s.closed ? 'Comparação entre meses encerrados' : 'Comparação dos mesmos dias');
      slideText(slides[1], 'h2', `${c.monthLabel} x ${c.previousLabel}`);
      const labels = slides[1].querySelectorAll('.deck-row > span');
      if (labels[0]) labels[0].textContent = c.previousLabel;
      if (labels[1]) labels[1].textContent = c.monthLabel;
      text('deckBaseSales', money(s.base.sales)); text('deckCurrentSales', money(s.current.sales));
      const max = Math.max(s.base.sales, s.current.sales, 1);
      document.getElementById('deckBaseBar').style.setProperty('--width', s.base.sales / max * 100 + '%');
      document.getElementById('deckCurrentBar').style.setProperty('--width', s.current.sales / max * 100 + '%');
      text('deckSalesDelta', `Vendas ${percent(s.revenue)} · ${period}`);
      const ratio = s.comparable && s.base.sales > 0 ? s.current.sales / s.base.sales * 100 : 0;
      text('deckGoalPercent', s.comparable ? ratio.toLocaleString('pt-BR', {maximumFractionDigits: 1}) + '%' : '—');
      document.getElementById('deckRing').style.setProperty('--value', Math.min(ratio, 100));
      slideText(slides[2], '.deck-kicker', 'Investimento e geração de conversas');
      slideText(slides[2], 'h2', 'O custo de gerar oportunidades');
      const stats = slides[2].querySelectorAll('.deck-stat');
      ['Investimento na Meta', 'Ticket médio', 'Custo por conversa'].forEach((label, i) => slideText(stats[i], 'small', label));
      text('deckMedia', money(s.current.spend)); text('deckRoas', money(s.current.ticket)); text('deckEfficiency', money(s.current.cpl));
      text('deckMediaText', `Contas vinculadas · ${period}`);
      slideText(stats[1], 'p', s.ticket == null ? 'Vendas ÷ pedidos' : `${percent(s.ticket)} contra o período anterior`);
      text('deckEfficiencyText', s.cpl == null ? 'Investimento Meta ÷ conversas' : `${percent(s.cpl)} contra o período anterior`);
      slideText(slides[3], '.deck-kicker', 'Evolução diária');
      slideText(slides[3], 'h2', 'Vendas registradas no período');
      const daily = new Map(c.sales.filter(r => r.record_date.startsWith(c.month + '-') && r.record_date <= s.through).map(r => [r.record_date, Number(r.sales)]));
      const peak = Math.max(1, ...daily.values()), height = 270;
      let path = '', segment = false;
      for (let day = 1; day <= s.end; day++) {
        const date = `${c.month}-${String(day).padStart(2, '0')}`;
        if (!daily.has(date)) {segment = false; continue;}
        const x = s.end > 1 ? (day - 1) / (s.end - 1) * 1000 : 0;
        const y = height - daily.get(date) / peak * (height - 24);
        path += `${segment ? ' L ' : ' M '}${x} ${y}`; segment = true;
      }
      document.getElementById('deckLine').setAttribute('d', path);
      document.getElementById('deckArea').setAttribute('d', '');
      document.getElementById('deckDots').textContent = '';
      text('deckChartStart', s.end ? `01/${c.month.slice(5)}` : '—');
      text('deckChartMiddle', s.end ? `${String(Math.ceil(s.end / 2)).padStart(2, '0')}/${c.month.slice(5)}` : '—');
      text('deckChartEnd', s.through ? `${s.through.slice(8)}/${c.month.slice(5)}` : '—');
      // Projections are withheld until this presentation has a validated forecasting model.
      document.getElementById('deckProjectionSlide').hidden = true;
      slideText(slides.at(-1), '.deck-kicker', s.editorial ? 'Análise publicada pela gestão' : 'Leitura dos indicadores');
      text('deckConclusion', s.editorial?.title || (s.attention ? 'Pontos para acompanhar' : s.headline));
      const summary = String(s.editorial?.summary || '');
      const note = s.editorial ? `${s.editorial.period_start.split('-').reverse().join('/')} a ${s.editorial.period_end.split('-').reverse().join('/')} · ${summary.slice(0, 600)}${summary.length > 600 ? '… Resumo completo no painel.' : ''}` : `${s.facts} ${s.attention} A análise da gestão para este período ainda não foi publicada.`;
      text('deckConclusionText', note);
      text('deckPointSales', money(s.current.sales) + ' em vendas');
      text('deckPointMedia', 'Ticket ' + money(s.current.ticket));
      text('deckPointOrders', s.current.orders + ' pedidos · ' + s.current.leads + ' conversas');
    }
    return {render};
  }
  const api = {analyze, mount};
  if (typeof module !== 'undefined') module.exports = api; else root.MoisesScenario = api;
})(typeof window === 'undefined' ? globalThis : window);

