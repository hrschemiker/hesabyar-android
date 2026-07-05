'use strict';
// Captures mobile screenshots of the SAME web app that runs inside the Android WebView.
// Requires the web preview server (tools/serve.js) running on 127.0.0.1:4611.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:4611';

const SEED = `(function(){
  var CORE=window.HPA_CORE, DB=window.HPA_DB, U=window.HPA_U;
  if(!CORE||!DB) return 'notready';
  function act(a,p){CORE.setContext({}, 'x'); return CORE.handleAction(a, p, {});}
  if(DB.scalar('SELECT COUNT(*) c FROM hpa_accounts')>0) return 'seeded';
  var tj=U.today_jalali(), ym=tj.slice(0,8);
  act('hpa_save_rate',{rate_key:'usd',price:'58200',jalali_date:tj});
  act('hpa_save_rate',{rate_key:'gold18',price:'3620000',jalali_date:tj});
  act('hpa_save_account',{name:'کارت بانک ملت',person_key:'hamidreza',type:'bank',currency:'toman',opening_balance:'48500000',icon:'💳',color:'#dbeafe',is_active:'1'});
  act('hpa_save_account',{name:'کیف پول',person_key:'joint',type:'cash',currency:'toman',opening_balance:'3200000',icon:'👛',color:'#fef9c3',is_active:'1'});
  act('hpa_save_account',{name:'بلو',person_key:'samira',type:'bank',currency:'toman',opening_balance:'493808',icon:'💳',color:'#e0f2fe',is_active:'1'});
  act('hpa_save_transaction',{person_key:'hamidreza',type:'income',account_id:'1',category_id:'19',amount:'92000000',currency:'toman',jalali_date:ym+'03',description:'حقوق',status:'done',hpa_items:'[]'});
  for(var i=0;i<7;i++) act('hpa_save_transaction',{person_key:'joint',type:'expense',account_id:'1',category_id:String(1+(i%6)),amount:String(600000+i*220000),currency:'toman',jalali_date:ym+(i<9?'0'+(i+1):'10'),transaction_place:'فروشگاه '+(i+1),tags:'ضروری,خانه',status:'done',hpa_items:'[{"name":"شیر","amount":450000},{"name":"نان","amount":180000}]'});
  act('hpa_save_debt',{person_name:'آقای رضایی',amount:'12000000',paid_amount:'4000000',currency:'toman',account_id:'1',jalali_date:ym+'02',due_jalali_date:ym+'25',status:'partial'});
  act('hpa_save_loan',{title:'وام خودرو',person_key:'hamidreza',lender:'صادرات',principal_amount:'300000000',currency:'toman',account_id:'1',received_jalali_date:'1403/01/10',first_due_jalali_date:'1403/02/10',last_due_jalali_date:'1404/01/10',paid_installments:'3',status:'open'});
  act('hpa_save_asset',{title:'سکه',person_key:'hamidreza',asset_group:'gold',purity:'18',weight:'40',unit:'گرم',purchase_price:'130000000',currency:'toman',jalali_date:'1403/02/15',funding_source:'personal',is_active:'1'});
  DB.save();
  return 'ok';
})()`;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
async function ready(win) { for (let i = 0; i < 40; i++) { const r = await win.webContents.executeJavaScript('!!(window.HPA_CORE&&window.HPA_DB)').catch(() => false); if (r) return true; await wait(250); } return false; }

async function run() {
  const win = new BrowserWindow({ width: 390, height: 844, show: false, webPreferences: { contextIsolation: false } });
  await win.loadURL(BASE + '/index.html?hpa_tab=dashboard');
  await ready(win);
  await win.webContents.executeJavaScript(SEED);
  const shots = [['dashboard', 'screenshot-mobile-dashboard'], ['transactions', 'screenshot-mobile-transactions'], ['reports', 'screenshot-mobile-reports'], ['debt', 'screenshot-mobile-debt'], ['assets', 'screenshot-mobile-assets']];
  for (const [tab, name] of shots) {
    await win.loadURL(BASE + '/index.html?hpa_tab=' + tab);
    await ready(win);
    await wait(1300);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(OUT, name + '.png'), img.toPNG());
    console.log('captured', name);
  }
  app.quit();
}
app.disableHardwareAcceleration();
app.whenReady().then(() => run().catch(e => { console.error('CAPTURE FAIL', e && e.stack ? e.stack : e); app.exit(1); }));
