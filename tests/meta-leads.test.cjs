const {test}=require('node:test');
const assert=require('node:assert/strict');
const {summarize,monday}=require('../meta-leads.js');
const row=(id,date,leads,partial=false)=>({workspace_id:id,record_date:date,leads,meta_spend:100,is_partial:partial,synced_at:'2026-10-26T10:00:00-03:00',source:'meta_messaging_conversation_started_7d'});
test('Jaragua is consolidated before calculating cost and conversion',()=>{
 const s=summarize([row('jaragua','2026-10-25',317)],[{workspace_id:'jaragua',record_date:'2026-10-25',orders:10}],['jaragua'],'2026-10-01','2026-10-31');
 assert.equal(s.count,317);assert.equal(s.matchedOrders,10);assert.equal(s.conversion,10/317*100);
});
test('Missing operation cannot silently reduce consolidated leads',()=>{
 const s=summarize([row('a','2026-10-25',10)],[],['a','b'],'2026-10-25','2026-10-25');assert.equal(s.days,0);assert.equal(s.conversion,null);
});
test('Zero conversations are available data, but no conversion denominator',()=>{
 const s=summarize([row('a','2026-10-25',0)],[{workspace_id:'a',record_date:'2026-10-25',orders:2}],['a'],'2026-10-25','2026-10-25');assert.equal(s.days,1);assert.equal(s.count,0);assert.equal(s.cost,null);assert.equal(s.conversion,null);
});
test('Conversion excludes partial days and dates without commercial entries',()=>{
 const s=summarize([row('a','2026-10-24',20),row('a','2026-10-25',100),row('a','2026-10-26',200,true)],[{workspace_id:'a',record_date:'2026-10-24',orders:2},{workspace_id:'a',record_date:'2026-10-26',orders:8}],['a'],'2026-10-01','2026-10-31');assert.equal(s.count,320);assert.equal(s.matchedLeads,20);assert.equal(s.matchedOrders,2);assert.equal(s.conversion,10);assert.equal(s.partial,true);
});
test('Consolidated conversion requires sales rows for every selected store',()=>{
 const s=summarize([row('a','2026-10-24',20),row('b','2026-10-24',30)],[{workspace_id:'a',record_date:'2026-10-24',orders:2}],['a','b'],'2026-10-01','2026-10-31');assert.equal(s.count,50);assert.equal(s.conversion,null);
});
test('Permissions scope excludes another operation even if data were supplied',()=>{
 const s=summarize([row('a','2026-10-25',10),row('b','2026-10-25',500)],[],['a'],'2026-10-25','2026-10-25');assert.equal(s.count,10);
});
test('Weeks begin on Monday across month and year boundaries',()=>{
 assert.equal(monday('2026-10-25'),'2026-10-19');assert.equal(monday('2026-10-26'),'2026-10-26');assert.equal(monday('2027-01-01'),'2026-12-28');
});
