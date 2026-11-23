const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname,'../..');
// Regression scope guard for reporting routes
test('both reporting routes require existing session middleware before handler',async()=>{
 const routes=[];const guard=()=>{};
 require('../transactionReports').registerTransactionReports({get:(...args)=>routes.push(args)}, {},guard);
 assert.equal(routes.length,2);
 for(const [url,middleware,handler] of routes){
  assert.ok(url.startsWith('/api/dashboard/'));assert.equal(middleware,guard);
  const res={set(){},status(code){this.code=code;return this;},json(body){this.body=body;}};
  await handler({query:{status:'bogus'},user:{id:1}},res);
  assert.equal(res.code,400);
 }
});
