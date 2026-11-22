const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname,'../..');
test('existing backend is unchanged except read-only reporting registration',()=>{
 const original=execFileSync('git',['show','eb6ad2c:platform/server.js'],{cwd:root,encoding:'utf8'});
 const current=fs.readFileSync(path.join(root,'platform/server.js'),'utf8');
 assert.equal(current.replace("require('./transactionReports').registerTransactionReports(app, pool, requireUser);\n\n",''),original);
});
test('management handlers and simulation polling remain byte-identical',()=>{
 const before=execFileSync('git',['show','eb6ad2c:web/src/main.jsx'],{cwd:root,encoding:'utf8'});
 const after=fs.readFileSync(path.join(root,'web/src/main.jsx'),'utf8');
 assert.equal(after.split('function SimulateCard')[1].split('function GoPayManagement')[0],before.split('function SimulateCard')[1].split('function Dashboard')[0]);
 assert.equal(after.split('function GoPayManagement() {')[1].split('return <div className="app-shell">')[0],before.split('function Dashboard() {')[1].split('return <div className="app-shell">')[0]);
});
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
