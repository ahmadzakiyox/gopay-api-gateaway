const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFilters, getAnalytics, getTransactions } = require('../transactionReports');
test('report period uses inclusive WIB dates and exclusive UTC end', () => {
 const f = parseFilters({from:'2026-11-01',to:'2026-11-02'});
 assert.equal(f.start,'2026-10-31 17:00:00.000'); assert.equal(f.end,'2026-11-02 17:00:00.000');
});
test('rejects malformed dates, statuses, pages and excessive ranges', () => {
 for (const q of [{from:'2026-02-30'},{status:'failed'},{page:'1.5'},{search:['x']},{from:'2020-01-01',to:'2026-01-01'}]) assert.throws(()=>parseFilters(q),{statusCode:400});
});
test('analytics reads only tenant data and fills missing days', async () => {
 const calls=[];
 const db={execute:async(sql,params)=>{calls.push({sql,params});return sql.includes('GROUP BY')?[[{day:'2026-11-02',amount:'1050',count:'1'}]]:[[{paid:'1',pending:'2',expired:'3',amount:'1050'}]];}};
 const result=await getAnalytics(db,42,parseFilters({from:'2026-11-01',to:'2026-11-02'}));
 assert.equal(result.series.length,2); assert.equal(result.series[0].amount,0);assert.equal(result.series[1].amount,1050);assert.equal(result.summary.paid,1);
 for(const c of calls){assert.match(c.sql,/^SELECT/);assert.match(c.sql,/user_id=\?/);assert.equal(c.params[0],42);}
});
test('log paginates and searches IDs literally without exposing QR payload',async()=>{
 const calls=[];const db={execute:async(sql,params)=>{calls.push({sql,params});return sql.includes('COUNT(*)')?[[{total:21}]]:[[{id:'trx',status:'pending',base_amount:'1000',surcharge:35,payable_amount:'1035'}]];}};
 const result=await getTransactions(db,9,parseFilters({status:'pending',search:'a%',page:'2'}));
 assert.equal(result.total,21);assert.equal(result.items[0].payableAmount,1035);assert.equal(result.items[0].qris,undefined);
 assert.match(calls[1].sql,/ORDER BY created_at DESC, id DESC/);assert.ok(calls[1].params.includes('a%'));
});
