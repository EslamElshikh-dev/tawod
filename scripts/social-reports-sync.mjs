import fs from 'node:fs/promises';
// Server-side transport for verified account-period reports. Credentials never enter the browser.
// Source adapters must supply account-period totals, not sums of daily reach or lifetime post metrics.
const path=process.argv[2];
const syncKey=process.env.TAWOD_SOCIAL_SYNC_KEY;
if(!path || !syncKey || syncKey.length<32 || syncKey.length>200){
  console.error('Usage: TAWOD_SOCIAL_SYNC_KEY=<private server key> node scripts/social-reports-sync.mjs reports.json');process.exit(1);
}
const stat=await fs.stat(path);
if(stat.size>1024*1024)throw new Error('Report file exceeds 1 MB.');
const rows=JSON.parse(await fs.readFile(path,'utf8'));
if(!Array.isArray(rows)||!rows.length||rows.length>200)throw new Error('Expected 1–200 account-period reports.');
const response=await fetch('https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'social_reports_sync',syncKey,rows}),signal:AbortSignal.timeout(30000)
});
const result=await response.json();
if(!response.ok)throw new Error('Social report sync rejected: '+(result.error||response.status));
console.log(JSON.stringify({ok:result.ok,saved:result.saved,submitted:result.submitted}));
