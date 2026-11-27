const DAY = 86400000;
function invalid() { const e = new Error('Filter transaksi tidak valid. Gunakan rentang maksimal 366 hari.'); e.statusCode = 400; throw e; }
function parseFilters(query, now = new Date()) {
  const today = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const to = query.to || today;
  const from = query.from || new Date(Date.parse(`${today}T00:00:00Z`) - 29 * DAY).toISOString().slice(0, 10);
  const validDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  if (!validDate(from) || !validDate(to)) invalid();
  const days = (Date.parse(to) - Date.parse(from)) / DAY + 1;
  const status = query.status || 'all';
  const provider = query.provider || 'all';
  const search = query.search || '';
  const page = Number(query.page || 1);
  if (days < 1 || days > 366 || !['all','pending','paid','expired','cancelled'].includes(status) || !['all','gopay','shopeepay'].includes(provider) || typeof search !== 'string' || search.length > 128 || !Number.isSafeInteger(page) || page < 1 || page > 100000) invalid();
  const sqlDate = (ms) => new Date(ms).toISOString().slice(0, 23).replace('T', ' ');
  return { from, to, days, status, provider, search: search.trim(), page, pageSize: 20, start: sqlDate(Date.parse(`${from}T00:00:00+07:00`)), end: sqlDate(Date.parse(`${to}T00:00:00+07:00`) + DAY) };
}
async function getAnalytics(pool, userId, f) {
  let where = 'user_id=? AND created_at>=? AND created_at<?';
  let paidWhere = "user_id=? AND status='paid' AND paid_at>=? AND paid_at<?";
  const params = [userId, f.start, f.end];
  const paidParams = [userId, f.start, f.end];

  if (f.provider && f.provider !== 'all') {
    where += ' AND provider=?';
    params.push(f.provider);
    paidWhere += ' AND provider=?';
    paidParams.push(f.provider);
  }

  // paid_at is persisted as UTC by toMysqlDateTime; convert only for WIB buckets.
  const [[summary]] = await pool.execute(`SELECT
    SUM(status='paid') AS paid, SUM(status='pending') AS pending,
    SUM(status='expired') AS expired, SUM(status='cancelled') AS cancelled
    FROM payments WHERE ${where}`, params);
  const [rows] = await pool.execute(`SELECT DATE_FORMAT(DATE_ADD(paid_at, INTERVAL 7 HOUR),'%Y-%m-%d') AS day,
    SUM(payable_amount) AS amount, COUNT(*) AS count FROM payments
    WHERE ${paidWhere} GROUP BY day ORDER BY day`, paidParams);
  const byDay = new Map(rows.map(r=>[r.day,r]));
  const series = Array.from({length:f.days},(_,i)=>{
    const day=new Date(Date.parse(f.from)+i*DAY).toISOString().slice(0,10);
    const r=byDay.get(day);return {day,amount:Number(r?.amount||0),count:Number(r?.count||0)};
  });
  return {summary:{paid:Number(summary.paid||0),pending:Number(summary.pending||0),expired:Number(summary.expired||0),cancelled:Number(summary.cancelled||0),amount:series.reduce((sum,r)=>sum+r.amount,0)},series,timezone:'Asia/Jakarta'};
}
async function getTransactions(pool,userId,f) {
  let where='user_id=? AND created_at>=? AND created_at<?';
  const params=[userId,f.start,f.end];
  if(f.status!=='all'){where+=' AND status=?';params.push(f.status);}
  if(f.provider && f.provider!=='all'){where+=' AND provider=?';params.push(f.provider);}
  if(f.search){where+=' AND (LOCATE(?,id)>0 OR LOCATE(?,order_id)>0)';params.push(f.search,f.search);}
  const [[count]]=await pool.execute(`SELECT COUNT(*) AS total FROM payments WHERE ${where}`,params);
  const [rows]=await pool.execute(`SELECT id,order_id,status,provider,base_amount,surcharge,payable_amount,
    DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%s.000Z') AS created_at,
    DATE_FORMAT(paid_at,'%Y-%m-%dT%H:%i:%s.000Z') AS paid_at,
    DATE_FORMAT(expires_at,'%Y-%m-%dT%H:%i:%s.000Z') AS expires_at,
    provider_transaction_id,provider_issuer FROM payments WHERE ${where}
    ORDER BY created_at DESC, id DESC LIMIT ${f.pageSize} OFFSET ${(f.page-1)*f.pageSize}`,params);
  return {items:rows.map(r=>({id:r.id,orderId:r.order_id,status:r.status,provider:r.provider||'gopay',baseAmount:Number(r.base_amount),surcharge:Number(r.surcharge),payableAmount:Number(r.payable_amount),createdAt:r.created_at,paidAt:r.paid_at,expiresAt:r.expires_at,providerId:r.provider_transaction_id,issuer:r.provider_issuer})),total:Number(count.total),page:f.page,pageSize:f.pageSize};
}
function registerTransactionReports(app, pool, requireUser) {
  for(const [path,read] of [['/api/dashboard/analytics',getAnalytics],['/api/dashboard/transactions',getTransactions]]) {
    app.get(path,requireUser,async(req,res)=>{
      res.set('Cache-Control','no-store');
      try {const filters=parseFilters(req.query);res.json({success:true,...await read(pool,req.user.id,filters)});}
      catch(error){res.status(error.statusCode||500).json({success:false,error:error.statusCode?error.message:'Gagal memuat data transaksi'});}
    });
  }
}
module.exports = { parseFilters, getAnalytics, getTransactions, registerTransactionReports };
