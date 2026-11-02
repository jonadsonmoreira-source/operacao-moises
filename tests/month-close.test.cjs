const {test}=require('node:test');
const assert=require('node:assert/strict');
const {summarize,brasiliaMonth}=require('../month-close.js');
const dates=Array.from({length:31},(_,i)=>'2026-10-'+String(i+1).padStart(2,'0'));
const sales=dates.map(record_date=>({record_date,sales:0,orders:0}));
const leads=dates.map(record_date=>({record_date,leads:0,meta_spend:0,is_partial:false,source:'meta_messaging_conversation_started_7d'}));
const base={month:'2026-10',now:new Date('2026-11-02T12:00:00Z'),sales,leads};
test('Closed calendar requires every date including zero Sundays',()=>{
 const s=summarize(base);assert.equal(s.closed,true);assert.equal(s.complete,true);assert.equal(s.covered,31);assert.equal(s.cpl,null);
 const missing=summarize({...base,sales:sales.filter(r=>r.record_date!=='2026-10-04')});assert.equal(missing.complete,false);assert.deepEqual(missing.missing,['2026-10-04']);
});
test('Partial or wrong-source leads never certify a close',()=>{
 for(const replacement of [{is_partial:true},{source:'other'}]){const s=summarize({...base,leads:leads.map((r,i)=>i? r:{...r,...replacement})});assert.equal(s.complete,false);assert.equal(s.cpl,null);assert.equal(s.orderLeadRatio,null);}
});
test('Meta spend takes precedence; exact source totals and safe denominators',()=>{
 const s=summarize({...base,sales:sales.map((r,i)=>i?r:{...r,sales:1000,orders:2}),leads:leads.map((r,i)=>i?r:{...r,leads:10,meta_spend:100}),media:[{record_date:dates[0],media_spend:900}]});
 assert.equal(s.spend,100);assert.equal(s.ticket,500);assert.equal(s.cpl,10);assert.equal(s.orderLeadRatio,20);assert.equal(s.roas,10);
});
test('Month switches at midnight Brasilia across year boundary',()=>{
 assert.equal(brasiliaMonth(new Date('2027-01-01T02:59:59Z')),'2026-12');assert.equal(brasiliaMonth(new Date('2027-01-01T03:00:00Z')),'2027-01');assert.equal(summarize({...base,now:new Date('2026-11-01T02:59:59Z')}).closed,false);
});
test('Leap February and empty historical data retain pending status',()=>{
 const s=summarize({month:'2024-02',now:base.now});assert.equal(s.days,29);assert.equal(s.complete,false);assert.equal(s.roas,null);
});
