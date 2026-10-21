(function(){
'use strict';
var CFG=window.VEKU_CONFIG||{};
var $=function(s){return document.querySelector(s);};
var VK=['v1','v2'];
var PLATE={v1:'১',v2:'২'};
var BN='০১২৩৪৫৬৭৮৯';
var EXC='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="23" width="17" height="6" rx="3"/><path d="M5 23v-6h9.5l1.5 3v3"/><path d="M6.5 17v-5.5h5l2 5.5"/><path d="M15 19l6-10.5 6.5 6"/><path d="M27.5 14.5l1 5.5h-5l1.5-3.5"/></svg>';

/* ---------- formatting ---------- */
function toEn(s){return String(s==null?'':s).replace(/[০-৯]/g,function(d){return String(BN.indexOf(d));}).replace(/[,\s৳]/g,'');}
function num(s){var v=parseFloat(toEn(s));return isFinite(v)?v:0;}
var LATN=false;try{LATN=localStorage.getItem('veku-digits')==='latn';}catch(e){}
var NF0,NF1,NF2,NFI,DF,DFY;
function mkFmt(){
  var L=LATN?'bn-BD-u-nu-latn':'bn-BD';
  NF0=new Intl.NumberFormat(L,{maximumFractionDigits:0});NF1=new Intl.NumberFormat(L,{maximumFractionDigits:1});
  NF2=new Intl.NumberFormat(L,{maximumFractionDigits:2});NFI=new Intl.NumberFormat(L,{useGrouping:false,maximumFractionDigits:2});
  DF=new Intl.DateTimeFormat(L,{day:'numeric',month:'short'});DFY=new Intl.DateTimeFormat(L,{day:'numeric',month:'short',year:'numeric'});
}
mkFmt();
function DIG(n){return NFI.format(n);}
function tk(n){n=Math.round(+n||0);return (n<0?'−':'')+'৳'+NF0.format(Math.abs(n));}
function amt(n){n=Math.round(+n||0);return (n<0?'−':'')+NF0.format(Math.abs(n));}
function q1(n){return NF1.format(+n||0);}
function tka(n){return tk(Math.abs(+n||0));}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return String(n).padStart(2,'0');}
var MONTHS=[];for(var i=0;i<12;i++){MONTHS.push(new Intl.DateTimeFormat('bn-BD',{month:'long'}).format(new Date(2026,i,1)));}
var WF=new Intl.DateTimeFormat('bn-BD',{weekday:'long'});
function toDate(iso){var p=String(iso||'2000-01-01').slice(0,10).split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);}
function todayISO(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function clone(o){return JSON.parse(JSON.stringify(o));}
function shown(n){return +n?NFI.format(+n):'';}
function sum(arr,f){return arr.reduce(function(a,x){return a+(+f(x)||0);},0);}
function dY(r){return +String(r.date).slice(0,4);}
function dM(r){return +String(r.date).slice(5,7);}
var now=new Date();
function sdate(iso){var d=toDate(iso);return d.getFullYear()===now.getFullYear()?DF.format(d):DFY.format(d);}
function fullDate(iso){return DF.format(toDate(iso))+', '+WF.format(toDate(iso));}
var PAYL={cash:'নগদ',due:'বাকি'};
function normPhone(p){var s=toEn(p).replace(/\D/g,'');if(s.indexOf('880')===0)s=s.slice(2);if(s.length===10&&s.charAt(0)==='1')s='0'+s;return /^01\d{9}$/.test(s)?s:null;}
function phoneEmail(p){return p+'@'+(CFG.emailDomain||'phone.veku-hisab.app');}
function bnPhone(p){return LATN?String(p||''):String(p||'').replace(/\d/g,function(d){return BN.charAt(+d);});}
function setDigits(latn){LATN=!!latn;try{localStorage.setItem('veku-digits',LATN?'latn':'beng');}catch(e){}mkFmt();setupPeriod();render();}
function digitsHTML(){return '<div class="seg2" role="group" aria-label="সংখ্যা দেখানো"><button type="button" data-digits="beng" aria-pressed="'+(!LATN)+'">বাংলা ১২৩</button><button type="button" data-digits="latn" aria-pressed="'+LATN+'">English 123</button></div>';}

/* ---------- settings ---------- */
function normVekus(v){v=v||{};return {v1:{name:(v.v1&&v.v1.name)||'ভেকু ১'},v2:{name:(v.v2&&v.v2.name)||'ভেকু ২'}};}
function normShops(a){return Array.isArray(a)?a.map(function(x){return String(x||'').trim();}).filter(Boolean):[];}
function uid(){try{return crypto.randomUUID();}catch(e){return 'o'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}}
function defaultOwners(){return [1,2,3,4,5].map(function(i){return {id:uid(),name:'মালিক '+DIG(i),s1:20,s2:20};});}
function normSettings(s){
  s=s||{};
  return {vekus:normVekus(s.vekus),
    owners:(Array.isArray(s.owners)&&s.owners.length)?s.owners.map(function(o){return {id:o.id||'',name:String(o.name||''),s1:+o.s1||0,s2:+o.s2||0};}):defaultOwners(),
    diesel_rate:+s.diesel_rate||0,shops:normShops(s.shops),season_start:s.season_start||null};
}

/* ---------- supabase ---------- */
var sb=null;
try{if(window.supabase&&CFG.url&&CFG.key)sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'veku-hisab-auth',lock:function(name,timeout,fn){return fn();}}});}catch(e){sb=null;}
function withTimeout(p,ms){return Promise.race([p,new Promise(function(_,rej){setTimeout(function(){var e=new Error('timeout');e.code='timeout';rej(e);},ms||20000);})]);}
async function q(p){var r=await withTimeout(p,25000);if(r&&r.error)throw r.error;return r?r.data:null;}
async function fetchAll(make){var out=[],from=0;for(;;){var d=await q(make().range(from,from+999));d=d||[];out=out.concat(d);if(d.length<1000)break;from+=1000;}return out;}
function errText(e){
  var m=String((e&&(e.message||e.error_description||e.msg))||e||'');
  if(e&&e.code==='timeout')return 'সার্ভার সাড়া দিচ্ছে না। ইন্টারনেট দেখে আবার চেষ্টা করুন।';
  if(/Failed to fetch|NetworkError|network|Load failed|fetch/i.test(m))return 'ইন্টারনেট সংযোগ নেই। সংযোগ দেখে আবার চেষ্টা করুন।';
  if(/JWT|expired|refresh token/i.test(m))return 'লগইনের মেয়াদ শেষ। বের হয়ে আবার লগইন করুন।';
  if((e&&e.code==='42501')||/row-level security|not allowed|permission/i.test(m))return 'এই কাজের অনুমতি নেই।';
  return 'কাজটি হয়নি। আবার চেষ্টা করুন।';
}
var FNERR={bad_code:'চালু করার কোড ঠিক নেই।',owner_exists:'মালিকের অ্যাকাউন্ট আগেই খোলা হয়েছে। লগইন করুন।',bad_phone:'মোবাইল নম্বর ঠিক নেই। ১১ সংখ্যার নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮।',
  short_password:'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',phone_taken:'এই মোবাইল নম্বরে আগেই একটি লগইন আছে।',not_owner:'এই কাজের অনুমতি শুধু মালিকের।',has_login:'এই ড্রাইভারের লগইন আগেই আছে।',no_login:'এই ড্রাইভারের কোনো লগইন নেই।'};
async function fn(body){
  var r=await withTimeout(sb.functions.invoke('users',{body:body}),30000);
  if(r.error){
    var info=null;try{info=await r.error.context.json();}catch(e){}
    var err=new Error((info&&(info.message||info.error))||r.error.message||'error');err.code=(info&&info.error)||'';throw err;
  }
  return r.data;
}
function fnErrText(e){return FNERR[e&&e.code]||errText(e);}

/* ---------- state ---------- */
var S={phase:'boot',role:null,user:null,needSetup:false,tab:'sum',veku:'v1',year:now.getFullYear(),month:now.getMonth()+1,
  settings:normSettings(null),drivers:[],entries:[],repairs:[],pending:[],dbal:{},sbal:[],sites:[],ssum:{},sitePays:[],ownerTx:[],cash:null,season:null,seasonFrom:'',seasonTo:'',
  openDriver:null,openShop:null,openSite:null,stmt:{},shopStmt:{},siteStmt:{},
  acct:null,pub:{vekus:normVekus(),shops:[],sites:[]},mine:[],openMine:false,apDep:{},
  loadErr:'',ownersDraft:null,ownersDirty:false,shown:''};
function resetData(){
  S.settings=normSettings(null);S.drivers=[];S.entries=[];S.repairs=[];S.pending=[];S.dbal={};S.sbal=[];S.stmt={};S.shopStmt={};
  S.sites=[];S.ssum={};S.siteStmt={};S.openSite=null;S.sitePays=[];S.ownerTx=[];S.cash=null;S.season=null;S.seasonFrom='';S.seasonTo='';S.apDep={};
  S.acct=null;S.mine=[];S.ownersDraft=null;S.ownersDirty=false;S.tab='sum';S.openDriver=null;S.openShop=null;
}

/* ---------- loading ---------- */
function yRange(){return [S.year+'-01-01',S.year+'-12-31'];}
function setDbal(rows){var m={};(rows||[]).forEach(function(r){m[r.driver_id]={earned:+r.earned||0,paid:+r.paid||0};});S.dbal=m;}
function qEntries(){var yr=yRange();return fetchAll(function(){return sb.from('entries').select('*').gte('date',yr[0]).lte('date',yr[1]).order('date').order('created_at');});}
function qRepairs(){var yr=yRange();return fetchAll(function(){return sb.from('repairs').select('*').gte('date',yr[0]).lte('date',yr[1]).order('date').order('created_at');});}
function qPending(){return q(sb.from('submissions').select('*').eq('status','pending').order('date').order('created_at'));}
function qDrivers(){return q(sb.from('drivers').select('*').order('created_at'));}
function qSettings(){return q(sb.from('settings').select('*').eq('id',1).maybeSingle());}
function qSites(){return q(sb.from('sites').select('*').order('created_at'));}
function setSsum(rows){var m={};(rows||[]).forEach(function(r){m[r.site_id]=r;});S.ssum=m;}
async function loadOwner(){
  var r=await Promise.all([qSettings(),qDrivers(),qEntries(),qRepairs(),qPending(),q(sb.rpc('driver_balances')),q(sb.rpc('shop_balances')),qSites(),q(sb.rpc('site_totals')),qSitePays(),qOwnerTx()]);
  S.settings=normSettings(r[0]);S.drivers=r[1]||[];S.entries=r[2];S.repairs=r[3];S.pending=r[4]||[];setDbal(r[5]);S.sbal=r[6]||[];S.sites=r[7]||[];setSsum(r[8]);S.sitePays=r[9]||[];S.ownerTx=r[10]||[];
  if(S.settings.owners.some(function(o){return !o.id;})){var st=clone(S.settings);st.owners.forEach(function(o){if(!o.id)o.id=uid();});saveSettings(st).catch(function(){});}
}
function qSitePays(){return fetchAll(function(){return sb.from('site_payments').select('*').order('date').order('created_at');});}
function qOwnerTx(){return fetchAll(function(){return sb.from('owner_tx').select('*').order('date').order('created_at');});}
async function reloadSitePays(){S.sitePays=await qSitePays();S.cash=null;}
async function reloadOwnerTx(){S.ownerTx=await qOwnerTx();S.cash=null;}
async function reloadYear(){var r=await Promise.all([qEntries(),qRepairs()]);S.entries=r[0];S.repairs=r[1];S.cash=null;}
async function reloadBal(){var r=await Promise.all([q(sb.rpc('driver_balances')),q(sb.rpc('shop_balances')),q(sb.rpc('site_totals'))]);setDbal(r[0]);S.sbal=r[1]||[];setSsum(r[2]);S.stmt={};S.shopStmt={};S.siteStmt={};S.cash=null;}
async function reloadSites(){S.sites=await qSites()||[];}
async function reloadDrivers(){S.drivers=await qDrivers()||[];}
async function reloadSettings(){S.settings=normSettings(await qSettings());}
async function loadDriver(){
  var r=await Promise.all([q(sb.rpc('my_account')),q(sb.rpc('pub_info')),q(sb.from('submissions').select('*').order('created_at',{ascending:false}).limit(40))]);
  S.acct=r[0];S.pub={vekus:normVekus(r[1]&&r[1].vekus),shops:normShops(r[1]&&r[1].shops),diesel_rate:+(r[1]&&r[1].diesel_rate)||0,sites:(r[1]&&Array.isArray(r[1].sites))?r[1].sites:[]};S.mine=r[2]||[];
}

/* ---------- boot & auth ---------- */
async function boot(){
  setupPeriod();
  if(!sb){S.phase='nolib';render();return;}
  sb.auth.onAuthStateChange(function(ev,session){
    setTimeout(function(){
      if(ev==='SIGNED_OUT'&&S.phase!=='login'){location.replace(location.pathname);}
      else if(ev==='SIGNED_IN'&&S.user&&session&&session.user&&session.user.id!==S.user.id){location.replace(location.pathname);}
    },0);
  });
  var session=null;
  try{var r=await withTimeout(sb.auth.getSession(),15000);session=r&&r.data&&r.data.session;}catch(e){}
  if(session){S.user=session.user;await enter();}
  else{S.phase='login';render();checkSetup();}
}
async function checkSetup(){
  try{var has=await q(sb.rpc('has_owner'));S.needSetup=has===false;}catch(e){S.needSetup=false;}
  if(S.phase==='login')render();
}
async function enter(){
  S.phase='loading';render();
  try{
    var w=await q(sb.rpc('whoami'));
    if(w&&w.owner){S.role='owner';await loadOwner();S.phase='app';startPoll();}
    else if(w&&w.driver){S.role='driver';await loadDriver();S.phase=S.acct?'app':'norole';}
    else{S.role='none';S.phase='norole';}
  }catch(e){S.phase='error';S.loadErr=errText(e);}
  render();
}
async function logout(){
  clearInterval(pollT);S.phase='login';
  try{await withTimeout(sb.auth.signOut({scope:'local'}),8000);}catch(e){}
  try{localStorage.removeItem('veku-hisab-auth');}catch(e){}
  location.replace(location.pathname);
}
var pollT=null;
function startPoll(){clearInterval(pollT);pollT=setInterval(function(){if(document.visibilityState==='visible'&&S.role==='owner'&&S.phase==='app')refreshPending();},60000);}
async function refreshPending(){try{var n=S.pending.length;S.pending=await qPending()||[];if(S.pending.length!==n&&!sheetOpen())render();else renderCab();}catch(e){}}
function sheetOpen(){return $('#sheet').open||$('#mini').open;}
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState!=='visible'||S.phase!=='app')return;
  if(S.role==='owner')refreshPending();
  else if(S.role==='driver')loadDriver().then(render).catch(function(){});
});

/* ---------- derived ---------- */
function inPeriod(r,m){return dY(r)===S.year&&(m?dM(r)===m:(S.month===0||dM(r)===S.month));}
function byDate(a,b){return a.date<b.date?-1:a.date>b.date?1:(a.created_at<b.created_at?-1:a.created_at>b.created_at?1:0);}
function rowsE(v,m){return S.entries.filter(function(r){return r.veku===v&&inPeriod(r,m);}).sort(byDate);}
function rowsR(v,m){return S.repairs.filter(function(r){return r.veku===v&&inPeriod(r,m);}).sort(byDate);}
function totals(v,m){
  var e=rowsE(v,m),r=rowsR(v,m),t={hours:0,litres:0,fuel:0,deposit:0,driver:0,repair:0,days:0,n:e.length+r.length},days={};
  t.income=0;t.unratedHours=0;
  e.forEach(function(x){t.hours+=+x.hours||0;t.litres+=+x.litres||0;t.fuel+=+x.fuel_cost||0;t.deposit+=+x.deposit||0;t.driver+=+x.driver_wage||0;if((+x.hours||0)>0)days[x.date]=1;
    t.income+=entryIncome(x);if(+x.hours>0&&!sitePriced(x.site_id?siteBy(x.site_id):null))t.unratedHours+=+x.hours;});
  S.sitePays.forEach(function(p){if(inPeriod(p,m))t.income+=unpricedPayShare(p,v);});
  r.forEach(function(x){t.repair+=+x.amount||0;});
  t.days=Object.keys(days).length;t.cost=t.fuel+t.driver+t.repair;t.net=t.income-t.cost;t.lph=t.hours?t.litres/t.hours:0;
  return t;
}
function siteRate(id){var x=id?siteBy(id):null;return x?(+x.rate||0):0;}
function sitesDueTotal(){var d=0;S.sites.forEach(function(x){if(sitePriced(x)){var v=siteDue(x);if(v>0)d+=v;}});return d;}
function periodLabel(){return S.month?MONTHS[S.month-1]+' '+DIG(S.year):DIG(S.year)+' সাল (সব মাস)';}
function pIn(){return S.month?MONTHS[S.month-1]+' '+DIG(S.year)+'-এ':DIG(S.year)+' সালে';}
function pOf(){return S.month?MONTHS[S.month-1]+' '+DIG(S.year)+'-এর':DIG(S.year)+' সালের';}
function vName(v){var src=S.role==='driver'?S.pub.vekus:S.settings.vekus;return (src[v]&&src[v].name)||('ভেকু '+PLATE[v]);}
function plate(v){return '<span class="plate '+v+'" aria-hidden="true">'+PLATE[v]+'</span>';}
function siteBy(id){if(!id)return null;var list=S.role==='driver'?S.pub.sites:S.sites;return list.filter(function(s){return s.id===id;})[0]||null;}
function siteName(r){var s=siteBy(r.site_id);return s?s.name:(r.site||r.site_name||'');}
function activeSites(){return S.sites.filter(function(s){return s.status!=='done';});}
function siteByName(name){var k=String(name||'').trim().toLowerCase();return S.sites.filter(function(s){return s.name.trim().toLowerCase()===k;})[0]||null;}
function lastSiteId(v){var all=S.entries.filter(function(r){return r.veku===v&&r.site_id;}).sort(byDate);var id=all.length?all[all.length-1].site_id:'';var s=siteBy(id);return s&&s.status!=='done'?id:'';}
function siteSum(id){var r=S.ssum[id]||{};var h1=+r.hours_v1||0,h2=+r.hours_v2||0;return {h1:h1,h2:h2,hours:h1+h2,deposit:+r.deposit||0,paid:+r.paid||0,billed:+r.billed||0,days:+r.days||0,first:r.first_date||null,last:r.last_date||null,n:+r.n||0};}
function siteGross(s){return s.bill_type==='contract'?(+s.contract_amount||0):siteSum(s.id).billed;}
function sitePriced(s){return !!s&&(s.bill_type==='contract'?+s.contract_amount>0:(+s.rate>0||siteSum(s.id).billed>0));}
function siteNetBill(s){return Math.max(0,siteGross(s)-(+s.discount||0));}
function siteReceived(s){var a=siteSum(s.id);return a.deposit+a.paid;}
function siteDue(s){return siteNetBill(s)-siteReceived(s);}
function entryRate(e,s){return +e.rate>0?+e.rate:(+(s&&s.rate)||0);}
function entryIncome(e){
  var s=e.site_id?siteBy(e.site_id):null;
  if(!sitePriced(s))return +e.deposit||0;
  var gross=siteGross(s),f=gross>0?siteNetBill(s)/gross:1,base;
  if(s.bill_type==='contract'){var H=siteSum(s.id).hours;base=H>0?(+e.hours||0)*gross/H:0;}
  else base=(+e.hours||0)*entryRate(e,s);
  return base*f;
}
function unpricedPayShare(p,v){
  var s=siteBy(p.site_id);if(!s||sitePriced(s))return 0;
  var a=siteSum(p.site_id),H=a.h1+a.h2,sh=H>0?(v==='v1'?a.h1:a.h2)/H:0.5;return (+p.amount||0)*sh;
}
function lastDriverFor(v){var all=S.entries.filter(function(r){return r.veku===v&&r.driver_id;}).sort(byDate);return all.length?all[all.length-1].driver_id:'';}
function driverBy(id){return S.drivers.filter(function(d){return d.id===id;})[0]||null;}
function driverName(id){var d=driverBy(id);return d?(d.name||'ড্রাইভার'):'ড্রাইভার';}
function activeDrivers(){return S.drivers.filter(function(d){return d.active!==false;});}
function dBal(id){var b=S.dbal[id]||{earned:0,paid:0};return {earned:b.earned,paid:b.paid,bal:b.earned-b.paid};}
function shopNames(){
  var s={};
  (S.role==='driver'?S.pub.shops:S.settings.shops).forEach(function(x){s[x]=1;});
  if(S.role==='owner')S.sbal.forEach(function(x){if(x.shop)s[x.shop]=1;});
  return Object.keys(s);
}
function shopBal(name){var r=S.sbal.filter(function(x){return x.shop===name;})[0]||{due:0,paid:0};return {due:+r.due||0,paid:+r.paid||0,bal:(+r.due||0)-(+r.paid||0)};}
function wageFor(id,hours){
  var d=driverBy(id);if(!d||!(+d.rate>0))return null;
  if(d.rate_type==='hour')return Math.round((+hours||0)*d.rate);
  if(d.rate_type==='day')return (+hours||0)>0?+d.rate:0;
  return null;
}
function wageText(d){
  if(!d)return '';
  if(d.rate_type==='hour'&&+d.rate)return 'প্রতি ঘণ্টা '+tk(d.rate);
  if(d.rate_type==='day'&&+d.rate)return 'প্রতি দিন '+tk(d.rate);
  return 'মজুরি প্রতিবার লেখা হয়';
}

/* ---------- render ---------- */
function setupPeriod(){
  var ms=$('#selMonth'),ys=$('#selYear');
  ms.innerHTML='<option value="0">সব মাস</option>'+MONTHS.map(function(n,i){return '<option value="'+(i+1)+'">'+n+'</option>';}).join('');
  var cy=now.getFullYear(),years=[];for(var y=cy-3;y<=cy+1;y++)years.push(y);
  ys.innerHTML=years.map(function(y){return '<option value="'+y+'">'+DIG(y)+'</option>';}).join('');
}
function isOwnerApp(){return S.phase==='app'&&S.role==='owner';}
function renderCab(){
  var oc=isOwnerApp();
  $('#period').hidden=!oc;$('#tabs').hidden=!oc;$('#cabInner').classList.toggle('solo',!oc);
  $('#drvLogout').hidden=!((S.phase==='app'&&S.role==='driver')||S.phase==='norole'||S.phase==='error');
  $('#selMonth').value=String(S.month);$('#selYear').value=String(S.year);
  document.querySelectorAll('#tabs button').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.tab===S.tab));});
  var n=S.pending.length,bd=$('#pendBadge');bd.hidden=!n;bd.textContent=DIG(n);
  var sub='';
  if(oc)sub=DIG(2)+'টি ভেকু · '+DIG(S.settings.owners.length)+' জন মালিক';
  else if(S.phase==='app'&&S.role==='driver')sub=(S.acct&&S.acct.driver&&S.acct.driver.name?S.acct.driver.name+' · ':'')+'ড্রাইভারের পাতা';
  $('#brandSub').textContent=sub;
  var dl=$('#shopList'),sh=shopNames();
  if(dl.dataset.k!==sh.join('|')){dl.dataset.k=sh.join('|');dl.innerHTML=sh.map(function(s){return '<option value="'+esc(s)+'"></option>';}).join('');}
}
function bannerHTML(){
  if(isOwnerApp()&&S.pending.length&&S.tab!=='approve')return '<div class="banner wait"><p><b>'+DIG(S.pending.length)+'টি হিসাব অনুমোদনের অপেক্ষায়।</b> অনুমোদন না করা পর্যন্ত এগুলো লাভের হিসাবে যোগ হয় না।</p><button type="button" class="btn small" data-go="approve">দেখুন</button></div>';
  return '';
}
var D={id:null,veku:'v1',pay:'',delArmed:false,init:false};
function render(){
  renderCab();
  $('#banner').innerHTML=bannerHTML();
  var main=$('#main'),top=$('#top'),auth=$('#auth');
  auth.hidden=S.phase!=='login';
  if(S.phase==='login'){
    $('#loginForm').hidden=S.needSetup;$('#setupForm').hidden=!S.needSetup;
    top.innerHTML='';main.innerHTML='';$('#drv').hidden=true;$('#fab').hidden=true;return;
  }
  var drvApp=S.phase==='app'&&S.role==='driver';
  $('#drv').hidden=true;
  if(drvApp){
    var a=S.acct,active=a&&a.driver&&a.driver.active!==false;
    $('#drv').hidden=!active;
    if(active){if(!D.init){D.init=true;resetDrv(null);}else drvVekuSeg();}
    top.innerHTML=driverTopHTML();main.innerHTML=driverListHTML();S.shown='drv';
  }else if(isOwnerApp()){
    top.innerHTML='';
    if(!(S.tab==='owners'&&S.ownersDirty&&S.shown==='owners')){
      main.innerHTML=({sum:sumHTML,approve:approveHTML,daily:ledgerHTML,repair:repairHTML,sites:sitesHTML,drivers:driversHTML,diesel:dieselHTML,cash:cashHTML,owners:ownersHTML})[S.tab]();S.shown=S.tab;
    }
  }else{
    top.innerHTML='';
    if(S.phase==='nolib')main.innerHTML=msgHTML('পাতাটি পুরোপুরি খোলেনি','ইন্টারনেট সংযোগ দেখে পাতাটি আবার খুলুন।','<button type="button" class="btn primary" data-act="reload">আবার খুলুন</button>');
    else if(S.phase==='norole')main.innerHTML=msgHTML('আপনার অ্যাকাউন্ট চালু নেই','এই মোবাইল নম্বর দিয়ে কোনো ড্রাইভার বা মালিক যুক্ত নেই। মালিকের সঙ্গে কথা বলুন।','<button type="button" class="btn" data-act="logout">বের হন</button>');
    else if(S.phase==='error')main.innerHTML=msgHTML('খাতা খোলা যায়নি',S.loadErr,'<button type="button" class="btn primary" data-act="retry">আবার চেষ্টা করুন</button><button type="button" class="btn ghost" data-act="logout">বের হয়ে আবার লগইন করুন</button>');
    else{main.innerHTML=loadingHTML();}
    S.shown='';
  }
  var fab=$('#fab');
  fab.hidden=!isOwnerApp()||['sum','daily','repair'].indexOf(S.tab)<0;
  $('#fabLabel').textContent=S.tab==='repair'?'খরচ লিখুন':'হিসাব লিখুন';
  setTimeout(ensureStmts,0);
}
var stmtLoading={};
function ensureStmts(){
  if(!isOwnerApp())return;
  function go(key,fnc){if(stmtLoading[key])return;stmtLoading[key]=1;fnc().then(function(){delete stmtLoading[key];},function(){delete stmtLoading[key];});}
  var d=S.openDriver,sh=S.openShop,si=S.openSite;
  if(S.tab==='drivers'&&d&&!S.stmt[d])go('d'+d,function(){return loadDriverStmt(d);});
  if(S.tab==='diesel'&&sh&&!S.shopStmt[sh])go('s'+sh,function(){return loadShopStmt(sh);});
  if(S.tab==='sites'&&si&&!S.siteStmt[si])go('t'+si,function(){return loadSiteStmt(si);});
  if(S.tab==='cash'&&(!S.cash||S.cash.key!==cashKey()))go('c'+cashKey(),loadCash);
}
function loadingHTML(){return '<div class="loading">'+EXC+'<p>খাতা খোলা হচ্ছে…</p></div>';}
function msgHTML(h,p,act){return '<section class="empty">'+EXC+'<h2>'+esc(h)+'</h2><p>'+esc(p)+'</p><div class="actions">'+(act||'')+'</div></section>';}

/* ----- owner: summary ----- */
function emptyHTML(what){
  return '<section class="empty">'+EXC+'<h2>'+pIn()+' '+what+'</h2>'+
    '<p>প্রতিদিনের ঘণ্টা, ডিজেল, জমা আর ড্রাইভারের মজুরি লিখুন। নিজে লিখতে পারেন, অথবা ড্রাইভারের পাঠানো হিসাব অনুমোদন করতে পারেন। মেরামত বা যন্ত্রাংশের খরচ আলাদা লিখুন। লাভ আর মালিকদের ভাগ এখানে নিজে থেকেই হিসাব হবে।</p>'+
    '<div class="actions"><button type="button" class="btn primary" data-add="entry">দৈনিক হিসাব লিখুন</button><button type="button" class="btn" data-add="repair">মেরামত খরচ লিখুন</button></div></section>';
}
function netWord(n){return n<0?'লোকসান':'লাভ';}
function barHTML(t){
  var tot=Math.max(t.income,t.cost);
  if(!tot)return '<div class="bar" aria-hidden="true"></div>';
  function seg(val,cls){return val>0?'<span class="seg '+cls+'" style="width:'+(val/tot*100).toFixed(2)+'%"></span>':'';}
  return '<div class="bar" role="img" aria-label="আয় '+tk(t.income)+'; ডিজেল '+tk(t.fuel)+', ড্রাইভার '+tk(t.driver)+', মেরামত '+tk(t.repair)+'">'+
    seg(t.fuel,'fuel')+seg(t.driver,'driver')+seg(t.repair,'repair')+(t.net>0?seg(t.net,'profit'):'')+
    (t.net<0&&t.income>0?'<span class="mark" style="left:calc('+(t.income/tot*100).toFixed(2)+'% - 1px)"></span>':'')+'</div>';
}
var LEGEND='<ul class="legend"><li><i style="background:var(--seg-fuel)"></i>ডিজেল</li><li><i style="background:var(--seg-driver)"></i>ড্রাইভার</li><li><i style="background:var(--seg-repair)"></i>মেরামত</li><li><i style="background:var(--seg-profit)"></i>লাভ</li></ul>';
function vcardHTML(v,t){
  return '<article class="vcard">'+
    '<div class="vhead">'+plate(v)+'<h3>'+esc(vName(v))+'</h3><span class="days">'+DIG(t.days)+' দিন কাজ</span></div>'+
    '<div class="kv3"><div><span>কাজের আয়</span><b>'+tk(t.income)+'</b></div><div><span>মোট খরচ</span><b>'+tk(t.cost)+'</b></div><div><span>'+netWord(t.net)+'</span><b class="'+(t.net<0?'neg':t.net>0?'pos':'')+'">'+tka(t.net)+'</b></div></div>'+
    '<div class="barbox">'+barHTML(t)+LEGEND+(t.net<0&&t.income>0?'<p class="hint">কালো দাগ পর্যন্ত আয়। খরচ আয়ের চেয়ে '+tka(t.net)+' বেশি।</p>':'')+'</div>'+
    '<dl class="facts">'+
      '<div><dt>ভেকু চলেছে</dt><dd>'+q1(t.hours)+' ঘণ্টা</dd></div>'+
      '<div><dt>ডিজেল নেওয়া হয়েছে</dt><dd>'+q1(t.litres)+' লিটার</dd></div>'+
      '<div><dt>গড়ে প্রতি ঘণ্টায় ডিজেল</dt><dd>'+(t.hours&&t.litres?NF1.format(t.lph)+' লিটার':'—')+'</dd></div>'+
      '<div><dt>ডিজেলের খরচ</dt><dd>'+tk(t.fuel)+'</dd></div>'+
      '<div><dt>ড্রাইভারের মজুরি</dt><dd>'+tk(t.driver)+'</dd></div>'+
      '<div><dt>মেরামত ও অন্যান্য</dt><dd>'+tk(t.repair)+'</dd></div>'+
    '</dl>'+
    '<button type="button" class="linkbtn" data-go="daily" data-veku="'+v+'">'+esc(vName(v))+'-এর দৈনিক খাতা দেখুন →</button>'+
  '</article>';
}
function ownersShareHTML(t){
  var own=S.settings.owners,s1=0,s2=0;
  own.forEach(function(o){s1+=o.s1;s2+=o.s2;});
  var h='<section class="panel"><div class="panel-head"><h2>মালিকদের ভাগ</h2><p class="hint">'+pOf()+' লাভ (কাজের আয় থেকে খরচ বাদ দিয়ে), প্রত্যেকের অংশ অনুযায়ী</p></div><ul class="olist">';
  own.forEach(function(o,i){
    var a1=t.v1.net*o.s1/100,a2=t.v2.net*o.s2/100,tot=a1+a2;
    h+='<li><span class="oname">'+esc(o.name||('মালিক '+DIG(i+1)))+'</span><span class="oamt '+(tot<0?'neg':'')+'">'+(tot<0?'লোকসান ':'')+tka(tot)+'</span>'+
      '<span class="odetail">'+esc(vName('v1'))+': '+(a1<0?'লোকসান ':'')+tka(a1)+' ('+DIG(o.s1)+'%) · '+esc(vName('v2'))+': '+(a2<0?'লোকসান ':'')+tka(a2)+' ('+DIG(o.s2)+'%)</span></li>';
  });
  h+='</ul>';
  var w=[];
  if(Math.abs(s1-100)>0.01)w.push(esc(vName('v1'))+'-এর মোট অংশ '+DIG(s1)+'%');
  if(Math.abs(s2-100)>0.01)w.push(esc(vName('v2'))+'-এর মোট অংশ '+DIG(s2)+'%');
  if(w.length)h+='<p class="warn">'+w.join(', ')+'। মোট ১০০% হওয়া দরকার। "সেটিংস" পাতায় ঠিক করুন।</p>';
  return h+'</section>';
}
function duesPanelHTML(){
  var dr=0,sh=0,st=sitesDueTotal();
  activeDrivers().forEach(function(d){var b=dBal(d.id).bal;if(b>0)dr+=b;});
  shopNames().forEach(function(s){var b=shopBal(s).bal;if(b>0)sh+=b;});
  return '<section class="panel"><div class="panel-head"><h2>পাওনা-দেনা</h2><p class="hint">আজ পর্যন্ত মোট, সব মাস মিলিয়ে</p></div>'+
    '<dl class="facts"><div><dt>সাইটগুলোর কাছে আপনার পাওনা</dt><dd class="pos">'+tk(st)+'</dd></div><div><dt>ড্রাইভারদের পাওনা বাকি</dt><dd>'+tk(dr)+'</dd></div><div><dt>ডিজেলের দোকানে বাকি</dt><dd>'+tk(sh)+'</dd></div></dl>'+
    '<div class="actions"><button type="button" class="btn small" data-go="sites">সাইটের হিসাব</button><button type="button" class="btn small" data-go="drivers">ড্রাইভারের হিসাব</button><button type="button" class="btn small" data-go="diesel">দোকানের বাকি</button></div></section>';
}
function monthTableHTML(){
  var rows='',any=false,T={h:0,i:0,c:0,n:0};
  for(var m=1;m<=12;m++){
    var a=totals('v1',m),b=totals('v2',m);
    if(!a.n&&!b.n)continue;any=true;
    var h=a.hours+b.hours,inc=a.income+b.income,c=a.cost+b.cost,n=a.net+b.net;
    T.h+=h;T.i+=inc;T.c+=c;T.n+=n;
    rows+='<tr class="click" data-month="'+m+'"><td class="c1">'+MONTHS[m-1]+'</td><td class="n">'+q1(h)+'</td><td class="n">'+amt(inc)+'</td><td class="n">'+amt(c)+'</td><td class="n '+(n<0?'neg':'pos')+'">'+amt(Math.abs(n))+'</td></tr>';
  }
  if(!any)return '';
  return '<section class="panel"><div class="panel-head"><h2>মাসভিত্তিক হিসাব</h2><p class="hint">দুই ভেকু মিলে। সবুজ মানে লাভ, লাল মানে লোকসান। কোনো মাসে চাপ দিলে সেই মাসের বিস্তারিত দেখাবে।</p></div>'+
    '<div class="tbl-wrap"><table class="khata narrow"><thead><tr><th class="c1">মাস</th><th class="n">সময় (ঘণ্টা)</th><th class="n">আয় (৳)</th><th class="n">খরচ (৳)</th><th class="n">লাভ/লোকসান (৳)</th></tr></thead><tbody>'+rows+
    '</tbody><tfoot><tr><td class="c1">মোট</td><td class="n">'+q1(T.h)+'</td><td class="n">'+amt(T.i)+'</td><td class="n">'+amt(T.c)+'</td><td class="n '+(T.n<0?'neg':'pos')+'">'+amt(Math.abs(T.n))+'</td></tr></tfoot></table></div></section>';
}
function sumHTML(){
  var t={v1:totals('v1'),v2:totals('v2')};
  var inc=t.v1.income+t.v2.income,dep=t.v1.deposit+t.v2.deposit+sum(S.sitePays.filter(function(p){return inPeriod(p);}),function(p){return p.amount;}),cost=t.v1.cost+t.v2.cost,net=inc-cost,un=t.v1.unratedHours+t.v2.unratedHours,due=sitesDueTotal();
  var h='<section class="hero"><p class="eyebrow">'+periodLabel()+' · দুই ভেকু মিলে নিট '+netWord(net)+'</p>'+
    '<p class="big '+(net<0?'neg':net>0?'pos':'zero')+'">'+tka(net)+'</p>'+
    '<p class="hero-sub"><span>কাজের আয় <b>'+tk(inc)+'</b></span><span>মোট খরচ <b>'+tk(cost)+'</b></span></p>'+
    '<p class="hero-sub2"><span>এই সময়ে জমা পেয়েছেন <b>'+tk(dep)+'</b></span><span class="due">সাইটগুলোর কাছে মোট বাকি <b>'+tk(due)+'</b></span></p>'+
    (un>0?'<p class="hint" style="margin-top:6px">'+q1(un)+' ঘণ্টার কাজ এমন সাইটে, যার ঘণ্টার রেট বা চুক্তির টাকা দেওয়া নেই। সেখানে শুধু পাওয়া টাকাকে আয় ধরা হয়েছে। "সাইট" পাতায় রেট দিন।</p>':'')+
    '</section>';
  if(!(t.v1.n+t.v2.n))h+=emptyHTML('এখনও কোনো হিসাব খাতায় ওঠেনি');
  h+='<div class="vgrid">'+vcardHTML('v1',t.v1)+vcardHTML('v2',t.v2)+'</div>';
  h+=sitePeriodHTML()+ownersShareHTML(t)+duesPanelHTML();
  if(S.month===0)h+=monthTableHTML();
  return h;
}

/* ----- owner: approvals ----- */
function fuelLine(x){
  if(!(+x.litres>0)&&!x.fuel_src)return '';
  var rate=+x.litres>0&&+x.fuel_cost>0?Math.round(x.fuel_cost/x.litres*100)/100:0;
  return '<p class="fuelline">ডিজেল'+(x.fuel_src?' ('+esc(x.fuel_src)+')':'')+': '+q1(x.litres)+' লিটার'+(rate?' × '+tk(rate)+' = <b>'+tk(x.fuel_cost)+'</b>':(+x.fuel_cost?' · '+tk(x.fuel_cost):''))+(x.fuel_pay?' <span class="st '+x.fuel_pay+'">'+PAYL[x.fuel_pay]+'</span>':' <span class="st pending">নগদ না বাকি, আপনি বাছবেন</span>')+'</p>';
}
function apEntry(p){
  var w=wageFor(p.driver_id,p.hours),cost=+p.fuel_cost||0;
  return {veku:p.veku,date:p.date,site_id:p.site_id||null,site:siteName(p),rate:siteRate(p.site_id),hours:+p.hours||0,litres:+p.litres||0,fuel_cost:cost,fuel_src:p.fuel_src||'',
    fuel_pay:cost>0?(p.fuel_src?'due':'cash'):'',deposit:0,driver_wage:w==null?0:w,driver_id:p.driver_id||null,remarks:p.remarks||''};
}
function approveHTML(){
  var list=S.pending.slice().sort(byDate);
  var h='<div class="panel-head"><p class="eyebrow">ড্রাইভারদের পাঠানো হিসাব</p><h2>অনুমোদনের অপেক্ষায়: '+DIG(list.length)+'টি</h2><p class="hint">দেখে নিয়ে সাইট থেকে পাওয়া টাকা লিখুন, তারপর "কনফার্ম" চাপুন। ডিজেলের টাকা নিজে থেকে দোকানের নামে বাকি হিসেবে উঠবে, আর ড্রাইভারের মজুরি তার হার অনুযায়ী বসবে।</p></div>';
  if(!list.length){
    h+='<section class="empty">'+EXC+'<h2>এখন অনুমোদনের অপেক্ষায় কোনো হিসাব নেই</h2><p>লগইন আছে এমন ড্রাইভার ঘণ্টা আর ডিজেল পাঠালে এখানে দেখাবে। ড্রাইভারকে লগইন দিতে "ড্রাইভার" পাতায় যান।</p><div class="actions"><button type="button" class="btn" data-go="drivers">ড্রাইভার পাতা</button><button type="button" class="btn ghost" data-act="refresh">নতুন করে দেখুন</button></div></section>';
    return h;
  }
  return h+'<div class="plist">'+list.map(function(p){
    var e=apEntry(p),d=driverBy(p.driver_id),rate=e.litres>0&&e.fuel_cost>0?Math.round(e.fuel_cost/e.litres*100)/100:0;
    var wageLine=wageFor(p.driver_id,p.hours)==null?'<p class="warn">'+esc(driverName(p.driver_id))+'-এর মজুরি প্রতিবার লেখা হয়। "বদলে কনফার্ম" চেপে মজুরি লিখুন।</p>':
      '<dl class="facts">'+(e.fuel_cost>0?'<div><dt>ডিজেল'+(e.fuel_src?' ('+esc(e.fuel_src)+')':'')+'</dt><dd>'+q1(e.litres)+' লি.'+(rate?' × '+tk(rate):'')+' = '+tk(e.fuel_cost)+'</dd></div>':'')+
      '<div><dt>মজুরি ('+esc(driverName(p.driver_id))+')</dt><dd>'+(d&&d.rate_type==='hour'?q1(p.hours)+' × '+tk(d.rate)+' = ':'')+tk(e.driver_wage)+'</dd></div></dl>';
    var newSite=!p.site_id&&p.site_name&&!siteByName(p.site_name);
    return '<article class="pcard"><div class="phead">'+plate(p.veku)+'<b>'+esc(vName(p.veku))+'</b><span class="muted">'+fullDate(p.date)+'</span></div>'+
      '<div class="pnums"><span>চালিয়েছে<b>'+q1(p.hours)+' ঘণ্টা</b></span>'+(e.litres>0?'<span>ডিজেল<b>'+q1(e.litres)+' লিটার</b></span>':'')+'</div>'+
      (siteName(p)?'<p class="fuelline">সাইট: <b>'+esc(siteName(p))+'</b>'+(newSite?' <span class="st pending">নতুন, তালিকায় যোগ হবে</span>':'')+'</p>':'<p class="warn">কোনো সাইট বাছাই করা নেই। "বদলে কনফার্ম" চেপে সাইট বেছে দিন।</p>')+
      wageLine+
      (e.fuel_cost>0&&e.fuel_src?'<p class="hint">কনফার্ম করলে '+esc(e.fuel_src)+'-এর নামে '+tk(e.fuel_cost)+' বাকি উঠবে।</p>':'')+
      (p.remarks?'<p class="hint">মন্তব্য: '+esc(p.remarks)+'</p>':'')+
      '<label class="field"><span>সাইট থেকে পেলেন (৳) <em>না পেলে খালি রাখুন</em></span><input type="text" class="num key" inputmode="decimal" autocomplete="off" placeholder="০" id="apd-'+esc(p.id)+'" data-apdep="'+esc(p.id)+'" value="'+esc(S.apDep[p.id]||'')+'"></label>'+
      '<button type="button" class="btn primary wide" data-apgo="'+esc(p.id)+'">কনফার্ম</button>'+
      '<div class="actions"><button type="button" class="btn ghost small" data-approve="'+esc(p.id)+'">বদলে কনফার্ম</button></div>'+
    '</article>';
  }).join('')+'</div>';
}
async function quickApprove(id,btn){
  var p=S.pending.filter(function(x){return x.id===id;})[0];if(!p)return;
  var e=apEntry(p);
  if(wageFor(p.driver_id,p.hours)==null){openSheet('entry',null,p);return;}
  if(!e.site_id&&!p.site_name){openSheet('entry',null,p);return;}
  e.deposit=num(S.apDep[id]||'');
  btn.disabled=true;btn.textContent='কনফার্ম হচ্ছে…';
  try{
    var created=false;
    if(!e.site_id&&p.site_name){var ex=siteByName(p.site_name);if(ex){e.site_id=ex.id;e.site=ex.name;e.rate=siteRate(ex.id);}else{var ns=await q(sb.from('sites').insert({name:p.site_name.trim()}).select('id').single());e.site_id=ns.id;e.site=p.site_name.trim();created=true;}}
    await q(sb.rpc('approve_submission',{p_id:id,p_entry:e}));
    delete S.apDep[id];
    toast('কনফার্ম হয়েছে'+(e.fuel_pay==='due'?' · '+e.fuel_src+'-এর বাকিতে '+tk(e.fuel_cost)+' উঠেছে':''));
    await addShopIfNew(e.fuel_src);
    var jobs=[reloadYear(),reloadBal(),qPending().then(function(r){S.pending=r||[];})];if(created)jobs.push(reloadSites());
    await Promise.all(jobs);
    render();
  }catch(err){btn.disabled=false;btn.textContent='কনফার্ম';toast(errText(err));}
}

/* ----- owner: ledgers ----- */
function vswitchHTML(){
  return '<div class="vswitch" role="tablist" aria-label="ভেকু বাছুন">'+VK.map(function(v){
    return '<button type="button" role="tab" class="'+v+'" data-veku="'+v+'" aria-selected="'+(S.veku===v)+'">'+plate(v)+'<span>'+esc(vName(v))+'</span></button>';
  }).join('')+'</div>';
}
function ledgerHead(title,rows,daily){
  var sites={};rows.forEach(function(r){var n=siteName(r);if(n)sites[n]=1;});
  var sl=Object.keys(sites);
  return '<div class="ledger-head"><div><p class="eyebrow">'+title+'</p><h2>'+esc(vName(S.veku))+' · '+periodLabel()+'</h2></div>'+
    '<dl class="meta">'+(daily?'<div><dt>সাইটের নাম</dt><dd>'+(sl.length?sl.map(esc).join(', '):'—')+'</dd></div>':'')+'<div><dt>বছর</dt><dd>'+DIG(S.year)+'</dd></div></dl></div>';
}
function dateCell(r,i,sub){
  return '<td class="c1"><span class="sl">'+DIG(i+1)+'</span>'+DF.format(toDate(r.date))+'<span class="dsub">'+(sub!=null?sub:WF.format(toDate(r.date)))+'</span></td>';
}
function csvBtn(col){return '<button type="button" class="btn small" data-csv="'+col+'">Excel-এর জন্য ফাইল নামান (CSV)</button>';}
function ledgerHTML(){
  var v=S.veku,rows=rowsE(v),t={hours:0,litres:0,fuel:0,deposit:0,driver:0};
  var h=vswitchHTML()+ledgerHead('ভেকুর দৈনিক হিসাব খাতা',rows,true);
  if(!rows.length)return h+'<section class="empty">'+EXC+'<h2>'+pIn()+' '+esc(vName(v))+'-এর কোনো দৈনিক হিসাব নেই</h2><p>নিজে লিখুন, অথবা ড্রাইভারের পাঠানো হিসাব অনুমোদন করলে এখানে উঠবে।</p><div class="actions"><button type="button" class="btn primary" data-add="entry">দৈনিক হিসাব লিখুন</button></div></section>';
  var multiSite=Object.keys(rows.reduce(function(a,r){var n=siteName(r);if(n)a[n]=1;return a;},{})).length>1;
  var body=rows.map(function(r,i){
    t.hours+=+r.hours||0;t.litres+=+r.litres||0;t.fuel+=+r.fuel_cost||0;t.deposit+=+r.deposit||0;t.driver+=+r.driver_wage||0;
    var extra=(r.fuel_src?'<span class="by">ডিজেল: '+esc(r.fuel_src)+(r.fuel_pay?' ('+PAYL[r.fuel_pay]+')':'')+'</span>':'')+(r.driver_id?'<span class="by">ড্রাইভার: '+esc(driverName(r.driver_id))+'</span>':'');
    return '<tr class="click" tabindex="0" data-col="entries" data-id="'+esc(r.id)+'">'+dateCell(r,i,WF.format(toDate(r.date))+(multiSite&&siteName(r)?'<br>'+esc(siteName(r)):''))+
      '<td class="n">'+(+r.hours?q1(r.hours):'—')+'</td><td class="n">'+(+r.litres?q1(r.litres):'—')+'</td><td class="n">'+(+r.fuel_cost?amt(r.fuel_cost):'—')+'</td><td class="n">'+(+r.deposit?amt(r.deposit):'—')+'</td><td class="n">'+(+r.driver_wage?amt(r.driver_wage):'—')+'</td>'+
      '<td class="rm">'+esc(r.remarks||'')+extra+'</td></tr>';
  }).join('');
  h+='<div class="tbl-wrap"><table class="khata"><thead><tr>'+
    '<th class="c1">ক্রমিক · তারিখ<small>SL · Date</small></th><th class="n">সময় (ঘণ্টা)<small>Time</small></th><th class="n">ডিজেল (লিটার)<small>Fuel in Litres</small></th><th class="n">ডিজেলের খরচ (৳)<small>Fuel Cost</small></th><th class="n">জমার পরিমাণ (৳)<small>Deposit Amount</small></th><th class="n">ভেকুর ড্রাইভার (৳)<small>Driver of Excavator</small></th><th>মন্তব্য<small>Remarks</small></th>'+
    '</tr></thead><tbody>'+body+'</tbody><tfoot><tr><td class="c1">মোট</td><td class="n">'+q1(t.hours)+'</td><td class="n">'+q1(t.litres)+'</td><td class="n">'+amt(t.fuel)+'</td><td class="n">'+amt(t.deposit)+'</td><td class="n">'+amt(t.driver)+'</td><td></td></tr></tfoot></table></div>';
  return h+'<div class="below"><p class="hint">কোনো সারিতে চাপ দিলে সেটি বদলানো বা মুছে ফেলা যাবে।</p>'+csvBtn('entries')+'</div>';
}
function repairHTML(){
  var v=S.veku,rows=rowsR(v),tot=0;
  var h=vswitchHTML()+ledgerHead('অন্যান্য ও মেরামত খরচ',rows,false);
  if(!rows.length)return h+'<section class="empty">'+EXC+'<h2>'+pIn()+' '+esc(vName(v))+'-এর কোনো মেরামত খরচ নেই</h2><p>মেরামত, যন্ত্রাংশ কেনা, মবিল-ফিল্টার বা অন্য যেকোনো খরচ এখানে লিখুন। এগুলো লাভ থেকে বাদ যাবে।</p><div class="actions"><button type="button" class="btn primary" data-add="repair">খরচ লিখুন</button></div></section>';
  var body=rows.map(function(r,i){
    tot+=+r.amount||0;
    return '<tr class="click" tabindex="0" data-col="repairs" data-id="'+esc(r.id)+'">'+dateCell(r,i)+
      '<td class="desc"><span class="chip">'+esc(r.kind||'অন্যান্য')+'</span>'+esc(r.description||'')+'</td><td class="n">'+amt(r.amount)+'</td><td class="rm">'+esc(r.remarks||'')+'</td></tr>';
  }).join('');
  h+='<div class="tbl-wrap"><table class="khata narrow"><thead><tr><th class="c1">ক্রমিক · তারিখ<small>SL · Date</small></th><th>খরচের বিবরণ (মেরামত / যন্ত্রাংশ / অন্যান্য)<small>Description</small></th><th class="n">টাকা (৳)<small>Amount</small></th><th>মন্তব্য<small>Remarks</small></th></tr></thead><tbody>'+body+
    '</tbody><tfoot><tr><td class="c1">মোট</td><td></td><td class="n">'+amt(tot)+'</td><td></td></tr></tfoot></table></div>';
  return h+'<div class="below"><p class="hint">কোনো সারিতে চাপ দিলে সেটি বদলানো বা মুছে ফেলা যাবে।</p>'+csvBtn('repairs')+'</div>';
}

/* ----- statements ----- */
function stmtTable(rows,heads,clickAttr){
  if(!rows)return '<p class="muted">লোড হচ্ছে…</p>';
  if(!rows.length)return '<p class="muted">এখনও কোনো লেনদেন নেই।</p>';
  return '<div class="tbl-wrap"><table class="khata stmt"><thead><tr><th>তারিখ</th><th>বিবরণ</th><th class="n">'+heads[0]+'</th><th class="n">'+heads[1]+'</th></tr></thead><tbody>'+
    rows.map(function(r){var ck=clickAttr&&r.kind==='paid';
      return '<tr'+(ck?' class="click" tabindex="0" '+clickAttr+'="'+esc(r.id)+'"':'')+'><td class="sd">'+sdate(r.date)+'</td><td>'+r.text+'</td><td class="n">'+(r.kind!=='paid'?amt(r.amount):'')+'</td><td class="n">'+(r.kind==='paid'?amt(r.amount):'')+'</td></tr>';}).join('')+
    '</tbody></table></div>'+(rows.length>=300?'<p class="hint">শেষ ৩০০টি লেনদেন দেখানো হচ্ছে।</p>':'');
}
function driverStmtRows(list){
  if(!list)return null;
  return list.map(function(r){return {kind:r.kind,id:r.id,date:r.date,amount:+r.amount||0,
    text:r.kind==='paid'?('টাকা নিয়েছেন'+(r.note?' · '+esc(r.note):'')):(esc(vName(r.veku))+' · '+q1(r.hours)+' ঘণ্টা')};});
}
function shopStmtRows(list){
  if(!list)return null;
  return list.map(function(r){return {kind:r.kind,id:r.id,date:r.date,amount:+r.amount||0,
    text:r.kind==='paid'?('টাকা দিয়েছি'+(r.note?' · '+esc(r.note):'')):(esc(vName(r.veku))+' · '+q1(r.litres)+' লিটার')};});
}
async function loadDriverStmt(id){try{S.stmt[id]=await q(sb.rpc('driver_statement',{p_driver:id}))||[];}catch(e){S.stmt[id]=[];toast(errText(e));}render();}
async function loadShopStmt(name){try{S.shopStmt[name]=await q(sb.rpc('shop_statement',{p_shop:name}))||[];}catch(e){S.shopStmt[name]=[];toast(errText(e));}render();}

/* ----- owner: drivers ----- */
function driversHTML(){
  var h='<div class="panel-head"><p class="eyebrow">মজুরি, অগ্রিম আর বাকি</p><h2>ড্রাইভারদের হিসাব</h2><p class="hint">মজুরি জমা হয় দৈনিক হিসাব থেকে। ড্রাইভারকে টাকা দিলে এখানে লিখুন, বাকি নিজে হিসাব হবে।</p></div>';
  var list=activeDrivers();
  if(!list.length){
    h+='<section class="empty">'+EXC+'<h2>এখনও কোনো ড্রাইভার যোগ করা হয়নি</h2><p>ড্রাইভারের নাম, মোবাইল আর মজুরির হার দিন। চাইলে তাকে লগইন দিন, তাহলে সে নিজের ফোন থেকে কাজের হিসাব পাঠাতে আর নিজের টাকার হিসাব দেখতে পারবে।</p><div class="actions"><button type="button" class="btn primary" data-act="add-driver">ড্রাইভার যোগ করুন</button></div></section>';
  }else{
    h+='<div class="plist">'+list.map(function(d){
      var b=dBal(d.id),open=S.openDriver===d.id;
      return '<article class="pcard'+(open?' wide':'')+'"><div class="phead"><b>'+esc(d.name)+'</b><span class="st '+(d.user_id?'on':'plain')+'">'+(d.user_id?'লগইন আছে':'লগইন নেই')+'</span>'+(d.phone?'<span class="muted">'+esc(bnPhone(d.phone))+'</span>':'')+'</div>'+
        '<p class="hint">'+wageText(d)+'</p>'+
        '<div class="kv3"><div><span>মজুরি হয়েছে</span><b>'+tk(b.earned)+'</b></div><div><span>নিয়েছে</span><b>'+tk(b.paid)+'</b></div><div><span>'+(b.bal<0?'বেশি নিয়েছে':'বাকি পাবে')+'</span><b class="'+(b.bal<0?'neg':b.bal>0?'pos':'')+'">'+tk(Math.abs(b.bal))+'</b></div></div>'+
        '<div class="actions"><button type="button" class="btn primary small" data-dpaynew="'+esc(d.id)+'">টাকা দিলেন লিখুন</button><button type="button" class="btn small" data-dopen="'+esc(d.id)+'">'+(open?'হিসাব লুকান':'হিসাব দেখুন')+'</button><button type="button" class="btn ghost small" data-dedit="'+esc(d.id)+'">বদলান / লগইন</button></div>'+
        (open?stmtTable(driverStmtRows(S.stmt[d.id]),['মজুরি (৳)','নিয়েছেন (৳)'],'data-dpay')+(S.stmt[d.id]&&S.stmt[d.id].length?'<p class="hint">"নিয়েছেন" সারিতে চাপ দিলে বদলানো বা মুছে ফেলা যাবে।</p>':''):'')+
      '</article>';
    }).join('')+'</div><div class="actions"><button type="button" class="btn" data-act="add-driver">+ ড্রাইভার যোগ করুন</button></div>';
  }
  var gone=S.drivers.filter(function(d){return d.active===false;});
  if(gone.length)h+='<section class="panel"><div class="panel-head"><h2>সরানো ড্রাইভার</h2></div><ul class="dlist">'+gone.map(function(d){var b=dBal(d.id);return '<li class="ditem"><span></span><div><div class="dd">'+esc(d.name)+'</div><div class="df">বাকি: '+tk(b.bal)+'</div></div><button type="button" class="btn small" data-drestore="'+esc(d.id)+'">ফিরিয়ে আনুন</button></li>';}).join('')+'</ul></section>';
  h+='<section class="panel"><div class="panel-head"><h2>ড্রাইভার কীভাবে লগইন করবে</h2></div><ol class="steps">'+
    '<li>ড্রাইভারের কার্ডে "বদলান / লগইন" চাপুন, তারপর "লগইন দিন"। তার মোবাইল নম্বর আর একটি পাসওয়ার্ড দিন।</li>'+
    '<li>ড্রাইভারকে এই সাইটের লিংক, তার মোবাইল নম্বর আর পাসওয়ার্ড জানান।</li>'+
    '<li>সে ফোনে লিংক খুলে লগইন করবে। শুধু নিজের টাকার হিসাব আর হিসাব পাঠানোর ঘর দেখবে, অন্য কিছু দেখবে না।</li></ol>'+
    '<div class="cred"><span>সাইটের লিংক</span><b id="siteLink">'+esc(siteUrl())+'</b></div><div class="actions"><button type="button" class="btn small" data-copy="siteLink">লিংক কপি করুন</button></div></section>';
  return h;
}
function siteUrl(){return location.origin+location.pathname.replace(/index\.html$/,'');}

/* ----- owner: diesel shops ----- */
function dieselHTML(){
  var shops=shopNames().map(function(s){return {name:s,b:shopBal(s)};}).sort(function(a,b){return b.b.bal-a.b.bal;});
  var total=sum(shops,function(s){return s.b.bal>0?s.b.bal:0;});
  var h='<section class="hero"><p class="eyebrow">ডিজেলের দোকান ও পাম্প · আজ পর্যন্ত</p><p class="big '+(total>0?'neg':'zero')+'">'+tk(total)+'</p><p class="hero-sub"><span>দোকানগুলোতে মোট বাকি। ড্রাইভারের ডিজেল কনফার্ম করলে দোকানের নামে এখানে যোগ হয়, টাকা দিলে কমে।</span></p></section>';
  if(!shops.length)return h+'<section class="empty">'+EXC+'<h2>এখনও কোনো দোকান বা পাম্প নেই</h2><p>যেসব দোকান বা পাম্প থেকে ডিজেল আনা হয়, সেগুলোর নাম যোগ করুন। ড্রাইভার আর আপনি হিসাব লেখার সময় তালিকা থেকে বাছতে পারবেন।</p><div class="actions"><button type="button" class="btn primary" data-act="add-shop">দোকান বা পাম্প যোগ করুন</button></div></section>';
  h+='<div class="plist">'+shops.map(function(s){
    var open=S.openShop===s.name,inList=S.settings.shops.indexOf(s.name)>=0;
    return '<article class="pcard'+(open?' wide':'')+'"><div class="phead"><b>'+esc(s.name)+'</b></div>'+
      '<div class="kv3"><div><span>বাকিতে নেওয়া</span><b>'+tk(s.b.due)+'</b></div><div><span>টাকা দিয়েছেন</span><b>'+tk(s.b.paid)+'</b></div><div><span>'+(s.b.bal<0?'বেশি দিয়েছেন':'বাকি আছে')+'</span><b class="'+(s.b.bal>0?'neg':'')+'">'+tka(s.b.bal)+'</b></div></div>'+
      '<div class="actions"><button type="button" class="btn primary small" data-spaynew="'+esc(s.name)+'">টাকা দিলাম লিখুন</button><button type="button" class="btn small" data-sopen="'+esc(s.name)+'">'+(open?'হিসাব লুকান':'হিসাব দেখুন')+'</button>'+
      (inList&&Math.abs(s.b.bal)<1&&!s.b.due&&!s.b.paid?'<button type="button" class="btn ghost small" data-sremove="'+esc(s.name)+'">তালিকা থেকে সরান</button>':'')+'</div>'+
      (open?stmtTable(shopStmtRows(S.shopStmt[s.name]),['ডিজেল নেওয়া (৳)','টাকা দিয়েছি (৳)'],'data-spay'):'')+'</article>';
  }).join('')+'</div>';
  return h+'<div class="actions"><button type="button" class="btn" data-act="add-shop">+ দোকান বা পাম্প যোগ করুন</button></div>';
}

/* ----- owner: sites ----- */
function periodBySite(){
  var m={};
  function g(k){return m[k]||(m[k]={h1:0,h2:0,deposit:0});}
  S.entries.forEach(function(e){if(!inPeriod(e))return;var x=g(e.site_id||'');if(e.veku==='v1')x.h1+=+e.hours||0;else x.h2+=+e.hours||0;x.deposit+=+e.deposit||0;});
  S.sitePays.forEach(function(p){if(!inPeriod(p))return;g(p.site_id).deposit+=+p.amount||0;});
  return m;
}
function pShort(){return S.month?MONTHS[S.month-1]+'-এ':DIG(S.year)+' সালে';}
function sitePeriodHTML(){
  var m=periodBySite(),keys=Object.keys(m).filter(function(k){return m[k].h1+m[k].h2+m[k].deposit>0;});
  if(!keys.length)return '';
  keys.sort(function(a,b){return (m[b].h1+m[b].h2)-(m[a].h1+m[a].h2);});
  var T={h1:0,h2:0,d:0};
  var rows=keys.map(function(k){var x=m[k],s=siteBy(k);T.h1+=x.h1;T.h2+=x.h2;T.d+=x.deposit;
    return '<tr'+(k?' class="click" tabindex="0" data-sitego="'+esc(k)+'"':'')+'><td>'+(s?esc(s.name):'<span class="muted">সাইট বাছাই করা নেই</span>')+'</td><td class="n">'+q1(x.h1)+'</td><td class="n">'+q1(x.h2)+'</td><td class="n"><b>'+q1(x.h1+x.h2)+'</b></td><td class="n">'+amt(x.deposit)+'</td></tr>';}).join('');
  return '<section class="panel"><div class="panel-head"><h2>সাইট অনুযায়ী কাজ</h2><p class="hint">'+pOf()+' হিসাব। "পেয়েছেন" মানে এই সময়ে সাইট থেকে হাতে পাওয়া টাকা। কোনো সাইটে চাপ দিলে তার পুরো হিসাব দেখাবে।</p></div>'+
    '<div class="tbl-wrap"><table class="khata stmt"><thead><tr><th>সাইট</th><th class="n" title="'+esc(vName('v1'))+'">'+plate('v1')+'<small>ঘণ্টা</small></th><th class="n" title="'+esc(vName('v2'))+'">'+plate('v2')+'<small>ঘণ্টা</small></th><th class="n">মোট<small>ঘণ্টা</small></th><th class="n">পেয়েছেন<small>৳</small></th></tr></thead><tbody>'+rows+
    '</tbody><tfoot><tr><td>মোট</td><td class="n">'+q1(T.h1)+'</td><td class="n">'+q1(T.h2)+'</td><td class="n">'+q1(T.h1+T.h2)+'</td><td class="n">'+amt(T.d)+'</td></tr></tfoot></table></div></section>';
}
function siteBasis(s){
  if(s.bill_type==='contract')return +s.contract_amount>0?'চুক্তি '+tk(s.contract_amount):'চুক্তির টাকা দেওয়া নেই';
  return +s.rate>0?'প্রতি ঘণ্টা '+tk(s.rate):'ঘণ্টার রেট দেওয়া নেই';
}
function siteCardHTML(s,pm){
  var a=siteSum(s.id),p=pm[s.id]||{h1:0,h2:0},open=S.openSite===s.id,done=s.status==='done',priced=sitePriced(s);
  var info=[siteBasis(s),s.client,s.phone?bnPhone(s.phone):'',s.address].filter(Boolean).map(esc).join(' · ');
  var rec=siteReceived(s),due=siteDue(s);
  var span=a.first?(sdate(a.first)+(a.last&&a.last!==a.first?' থেকে '+sdate(a.last):'')):'';
  var money=priced?'<dl class="facts">'+
      '<div><dt>'+(s.bill_type==='contract'?'চুক্তির টাকা':'বিল ('+q1(a.hours)+' ঘণ্টা)')+'</dt><dd>'+tk(siteGross(s))+'</dd></div>'+
      (+s.discount>0?'<div><dt>ছাড় দিয়েছেন</dt><dd>'+tk(s.discount)+'</dd></div>':'')+
      '<div><dt>পেয়েছেন</dt><dd>'+tk(rec)+'</dd></div>'+
      '<div><dt>'+(due<0?'বেশি পেয়েছেন':'বাকি')+'</dt><dd class="'+(due>0?'neg':'pos')+'">'+tka(due)+'</dd></div></dl>':
    '<p class="note">ঘণ্টার রেট বা চুক্তির টাকা দেওয়া নেই, তাই বিল আর বাকি হিসাব হচ্ছে না। এ পর্যন্ত পেয়েছেন '+tk(rec)+'। "বদলান" চেপে রেট দিন।</p>';
  return '<article class="pcard'+(open?' wide':'')+'"><div class="phead"><b>'+esc(s.name)+'</b><span class="st '+(done?'plain':'on')+'">'+(done?'শেষ':'চলমান')+'</span></div>'+
    '<p class="hint">'+info+'</p>'+
    '<div class="kv3"><div><span>'+pShort()+'</span><b>'+q1(p.h1+p.h2)+' ঘণ্টা</b></div><div><span>মোট ঘণ্টা</span><b>'+q1(a.hours)+'</b></div><div><span>'+(priced?(due<0?'বেশি পেয়েছেন':'বাকি'):'পেয়েছেন')+'</span><b class="'+(priced&&due>0?'neg':'')+'">'+(priced?tka(due):tk(rec))+'</b></div></div>'+
    '<p class="hint">'+esc(vName('v1'))+': '+q1(a.h1)+' ঘণ্টা · '+esc(vName('v2'))+': '+q1(a.h2)+' ঘণ্টা · '+DIG(a.days)+' দিন কাজ'+(span?' · '+span:'')+'</p>'+
    money+
    '<div class="actions"><button type="button" class="btn primary small" data-sitepay="'+esc(s.id)+'">টাকা পেলাম</button>'+(done?'':'<button type="button" class="btn small" data-siteadd="'+esc(s.id)+'">+ হিসাব লিখুন</button>')+
      '<button type="button" class="btn small" data-siteopen="'+esc(s.id)+'">'+(open?'হিসাব লুকান':'হিসাব দেখুন')+'</button><button type="button" class="btn ghost small" data-siteedit="'+esc(s.id)+'">বদলান</button>'+
      (priced&&due>0?'<button type="button" class="btn ghost small" data-sitesettle="'+esc(s.id)+'">হিসাব মেটান</button>':'')+'</div>'+
    (open?siteStmtHTML(s):'')+
  '</article>';
}
function siteRows(s){
  var rows=S.siteStmt[s.id];if(!rows)return null;
  return rows.map(function(r){return {k:'e',r:r,date:r.date,created_at:r.created_at};})
    .concat(S.sitePays.filter(function(p){return p.site_id===s.id;}).map(function(p){return {k:'p',r:p,date:p.date,created_at:p.created_at};}))
    .sort(byDate);
}
function siteStmtHTML(s){
  var all=siteRows(s);
  if(!all)return '<p class="muted">লোড হচ্ছে…</p>';
  if(!all.length)return '<p class="muted">এই সাইটে এখনও কোনো হিসাব লেখা হয়নি।</p>';
  var T={h:0,d:0};
  var body=all.map(function(x){var r=x.r;
    if(x.k==='p'){T.d+=+r.amount||0;return '<tr class="click" tabindex="0" data-spx="'+esc(r.id)+'"><td class="sd">'+sdate(r.date)+'</td><td colspan="2">টাকা পেলাম'+(r.note?' · '+esc(r.note):'')+'</td><td class="n">'+amt(r.amount)+'</td></tr>';}
    T.h+=+r.hours||0;T.d+=+r.deposit||0;
    return '<tr class="click" tabindex="0" data-sentry="'+esc(r.id)+'"><td class="sd">'+sdate(r.date)+'</td><td>'+plate(r.veku)+(r.driver_id?' '+esc(driverName(r.driver_id)):'')+'</td><td class="n">'+(+r.hours?q1(r.hours):'—')+'</td><td class="n">'+(+r.deposit?amt(r.deposit):'—')+'</td></tr>';}).join('');
  return '<div class="tbl-wrap"><table class="khata stmt"><thead><tr><th>তারিখ</th><th>ভেকু · ড্রাইভার</th><th class="n">ঘণ্টা</th><th class="n">পেয়েছেন (৳)</th></tr></thead><tbody>'+body+
    '</tbody><tfoot><tr><td>মোট</td><td></td><td class="n">'+q1(T.h)+'</td><td class="n">'+amt(T.d)+'</td></tr></tfoot></table></div>'+
    '<div class="below"><p class="hint">কোনো সারিতে চাপ দিলে সেটি বদলানো যাবে।</p><button type="button" class="btn small" data-sitecsv="'+esc(s.id)+'">Excel-এর জন্য ফাইল নামান (CSV)</button></div>';
}
async function loadSiteStmt(id){
  try{S.siteStmt[id]=await fetchAll(function(){return sb.from('entries').select('*').eq('site_id',id).order('date').order('created_at');});}
  catch(e){S.siteStmt[id]=[];toast(errText(e));}
  render();
}
function sitesHTML(){
  var pm=periodBySite();
  var h='<div class="panel-head"><p class="eyebrow">কোন সাইটে কত ঘণ্টা, কত বিল, কত বাকি</p><h2>সাইটের হিসাব</h2><p class="hint">ঘণ্টা হিসাবের সাইটে প্রতিদিনের কাজ সেদিনের রেটে হিসাব হয়, পরে রেট বদলালেও আগের কাজের দাম বদলায় না। চুক্তির সাইটে চুক্তির টাকা কাজের ঘণ্টা অনুযায়ী ভাগ হয়ে আয়ে ওঠে।</p></div>';
  var un=pm['']||null;
  if(un&&(un.h1+un.h2)>0)h+='<p class="note">'+pShort()+' '+q1(un.h1+un.h2)+' ঘণ্টার কাজে কোনো সাইট বাছাই করা নেই। দৈনিক খাতায় সেই সারিতে চাপ দিয়ে সাইট বেছে দিন।</p>';
  var act=S.sites.filter(function(s){return s.status!=='done';}).sort(function(a,b){var x=siteSum(a.id).last||a.created_at,y=siteSum(b.id).last||b.created_at;return x<y?1:x>y?-1:0;});
  if(!S.sites.length){
    return h+'<section class="empty">'+EXC+'<h2>এখনও কোনো সাইট যোগ করা হয়নি</h2><p>যেখানে ভেকু কাজ করছে, সেই সাইটের নাম যোগ করুন। ঘণ্টা হিসাবে হলে রেট, চুক্তিতে হলে চুক্তির টাকা দিন।</p><div class="actions"><button type="button" class="btn primary" data-act="add-site">সাইট যোগ করুন</button></div></section>';
  }
  h+=act.length?'<div class="plist">'+act.map(function(s){return siteCardHTML(s,pm);}).join('')+'</div>':'<p class="muted">এখন কোনো চলমান সাইট নেই।</p>';
  h+='<div class="actions"><button type="button" class="btn" data-act="add-site">+ নতুন সাইট যোগ করুন</button></div>';
  var done=S.sites.filter(function(s){return s.status==='done';});
  if(done.length)h+='<section class="panel"><div class="panel-head"><h2>শেষ হওয়া সাইট</h2></div><div class="plist">'+done.map(function(s){return siteCardHTML(s,pm);}).join('')+'</div></section>';
  return h;
}
function downloadSiteCSV(id){
  var s=siteBy(id),all=siteRows(s||{id:id})||[];if(!s)return;
  function qq(x){return '"'+String(x==null?'':x).replace(/"/g,'""')+'"';}
  var L=[[qq(s.name),qq(s.client||''),qq(s.phone||''),qq(siteBasis(s))],['তারিখ','বিবরণ','ঘণ্টা','রেট (৳)','পেয়েছেন (৳)','মন্তব্য'].map(qq)];
  var h=0,d=0;
  all.forEach(function(x){var r=x.r;
    if(x.k==='p'){d+=+r.amount||0;L.push([r.date,qq('টাকা পেলাম'),'','',+r.amount||0,qq(r.note)]);return;}
    h+=+r.hours||0;d+=+r.deposit||0;L.push([r.date,qq(vName(r.veku)+(r.driver_id?' · '+driverName(r.driver_id):'')),+r.hours||0,s.bill_type==='contract'?'':entryRate(r,s),+r.deposit||0,qq(r.remarks)]);});
  L.push([qq('মোট'),'',h,'',d,'']);
  if(sitePriced(s)){
    L.push([qq(s.bill_type==='contract'?'চুক্তির টাকা':'বিল'),'','','',siteGross(s),'']);
    if(+s.discount>0)L.push([qq('ছাড়'),'','','',+s.discount,'']);
    L.push([qq('বাকি'),'','','',siteDue(s),'']);
  }
  saveFile('site-'+s.name.replace(/[^\wঀ-৿]+/g,'-')+'.csv','﻿'+L.map(function(l){return l.join(',');}).join('\r\n'));
}

/* ----- owner: cash & owners ----- */
function periodRange(){
  if(S.month){var last=new Date(S.year,S.month,0).getDate();return [S.year+'-'+pad(S.month)+'-01',S.year+'-'+pad(S.month)+'-'+pad(last)];}
  return [S.year+'-01-01',S.year+'-12-31'];
}
function cashKey(){return periodRange().join('_');}
function cashIn(c){return (+c.site_in||0)+(+c.owner_give||0);}
function cashOut(c){return (+c.diesel_cash||0)+(+c.shop_paid||0)+(+c.driver_paid||0)+(+c.repairs||0)+(+c.owner_take||0);}
async function loadCash(){
  var key=cashKey(),r=periodRange();
  try{var d=await q(sb.rpc('cash_book',{p_from:r[0],p_to:r[1]}));S.cash={key:key,all:d.all,period:d.period};}
  catch(e){S.cash={key:key,err:errText(e)};}
  render();
}
function ownerName(id){var o=S.settings.owners.filter(function(x){return x.id===id;})[0];return o?(o.name||'মালিক'):'মালিক';}
function ownerTxSum(id,from,to){var t=0,g=0;S.ownerTx.forEach(function(x){if(x.owner_id!==id)return;if(from&&x.date<from)return;if(to&&x.date>to)return;if(x.kind==='take')t+=+x.amount||0;else g+=+x.amount||0;});return {take:t,give:g};}
function fact(label,v,cls){return '<div><dt>'+label+'</dt><dd'+(cls?' class="'+cls+'"':'')+'>'+tk(v)+'</dd></div>';}
function cashHTML(){
  var c=S.cash&&S.cash.key===cashKey()?S.cash:null;
  var h='<div class="panel-head"><p class="eyebrow">সাইটের সব টাকা আপনার হাতে আসে ধরে</p><h2>ক্যাশ ও মালিক</h2></div>';
  if(!c)return h+'<p class="muted">লোড হচ্ছে…</p>';
  if(c.err)return h+'<p class="warn">'+esc(c.err)+'</p>';
  var bal=cashIn(c.all)-cashOut(c.all),p=c.period;
  h+='<section class="hero"><p class="eyebrow">আজ পর্যন্ত আপনার হাতে থাকার কথা</p><p class="big '+(bal<0?'neg':'pos')+'">'+tka(bal)+'</p>'+
    (bal<0?'<p class="hint">খরচ আর মালিকদের নেওয়া টাকা সাইট থেকে পাওয়া টাকার চেয়ে '+tka(bal)+' বেশি। এই টাকা কেউ নিজের পকেট থেকে দিয়েছেন। সেটা নিচে "টাকা দিলেন" হিসেবে লিখে রাখুন।</p>':
      '<p class="hint">হাতের টাকা গুনে এর সঙ্গে মিলিয়ে দেখুন। না মিললে কোনো খরচ বা টাকা পাওয়া লেখা বাকি আছে।</p>')+'</section>';
  h+='<section class="panel"><div class="panel-head"><h2>'+pOf()+' টাকা আসা-যাওয়া</h2></div>'+
    '<dl class="facts">'+fact('সাইট থেকে পেয়েছেন',p.site_in,'pos')+fact('মালিকরা ব্যবসায় দিয়েছেন',p.owner_give,'pos')+'</dl>'+
    '<dl class="facts">'+fact('ডিজেল নগদে কেনা',p.diesel_cash)+fact('ডিজেলের দোকানে দিয়েছেন',p.shop_paid)+fact('ড্রাইভারকে দিয়েছেন',p.driver_paid)+fact('মেরামত ও অন্যান্য',p.repairs)+fact('মালিকরা নিয়েছেন',p.owner_take)+'</dl>'+
    '<dl class="facts"><div><dt><b>মোট এসেছে</b></dt><dd class="pos">'+tk(cashIn(p))+'</dd></div><div><dt><b>মোট গেছে</b></dt><dd>'+tk(cashOut(p))+'</dd></div></dl></section>';
  h+=ownersMoneyHTML()+seasonHTML(bal);
  return h;
}
function ownersMoneyHTML(){
  var h='<section class="panel"><div class="panel-head"><h2>মালিকদের নেওয়া-দেওয়া</h2><p class="hint">কোনো মালিক ব্যবসা থেকে টাকা নিলে বা ব্যবসায় টাকা দিলে এখানে লিখুন। আজ পর্যন্ত সব মিলিয়ে।</p></div><ul class="olist">';
  S.settings.owners.forEach(function(o){
    var x=ownerTxSum(o.id);
    h+='<li><span class="oname">'+esc(o.name||'মালিক')+'</span><span class="oamt">'+tk(x.take)+'</span>'+
      '<span class="odetail">নিয়েছেন '+tk(x.take)+(x.give?' · দিয়েছেন '+tk(x.give):'')+'</span>'+
      '<span class="odetail actions" style="margin-top:6px"><button type="button" class="btn small" data-otx="'+esc(o.id)+'" data-kind="take">টাকা নিলেন</button><button type="button" class="btn ghost small" data-otx="'+esc(o.id)+'" data-kind="give">টাকা দিলেন</button></span></li>';
  });
  h+='</ul>';
  var recent=S.ownerTx.slice().sort(function(a,b){return -byDate(a,b);}).slice(0,15);
  if(recent.length)h+='<div class="tbl-wrap"><table class="khata stmt"><thead><tr><th>তারিখ</th><th>মালিক</th><th class="n">নিলেন (৳)</th><th class="n">দিলেন (৳)</th></tr></thead><tbody>'+
    recent.map(function(x){return '<tr class="click" tabindex="0" data-otxe="'+esc(x.id)+'"><td class="sd">'+sdate(x.date)+'</td><td>'+esc(ownerName(x.owner_id))+(x.note?'<span class="by">'+esc(x.note)+'</span>':'')+'</td><td class="n">'+(x.kind==='take'?amt(x.amount):'')+'</td><td class="n">'+(x.kind==='give'?amt(x.amount):'')+'</td></tr>';}).join('')+
    '</tbody></table></div><p class="hint">কোনো সারিতে চাপ দিলে বদলানো বা মুছে ফেলা যাবে।</p>';
  return h+'</section>';
}
function addDays(iso,n){var d=toDate(iso);d.setDate(d.getDate()+n);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function seasonDefaults(){
  var from=S.settings.season_start;
  if(!from){var first=S.entries.slice().sort(byDate)[0];from=first?first.date:S.year+'-01-01';}
  return [S.seasonFrom||from,S.seasonTo||todayISO()];
}
async function calcSeason(){
  var r=seasonDefaults(),from=r[0],to=r[1];
  if(from>to){toast('শুরুর তারিখ শেষের তারিখের আগে হতে হবে');return;}
  S.season={from:from,to:to,loading:true};render();
  try{
    var res=await Promise.all([
      fetchAll(function(){return sb.from('entries').select('*').gte('date',from).lte('date',to).order('date');}),
      fetchAll(function(){return sb.from('repairs').select('*').gte('date',from).lte('date',to).order('date');})]);
    var t={};VK.forEach(function(v){t[v]={income:0,fuel:0,driver:0,repair:0,hours:0};});
    res[0].forEach(function(e){var x=t[e.veku];if(!x)return;x.income+=entryIncome(e);x.fuel+=+e.fuel_cost||0;x.driver+=+e.driver_wage||0;x.hours+=+e.hours||0;});
    S.sitePays.forEach(function(p){if(p.date<from||p.date>to)return;VK.forEach(function(v){t[v].income+=unpricedPayShare(p,v);});});
    res[1].forEach(function(x){if(t[x.veku])t[x.veku].repair+=+x.amount||0;});
    VK.forEach(function(v){var x=t[v];x.cost=x.fuel+x.driver+x.repair;x.net=x.income-x.cost;});
    S.season={from:from,to:to,t:t};
  }catch(e){S.season=null;toast(errText(e));}
  render();
}
function seasonHTML(cashBal){
  var r=seasonDefaults();
  var h='<section class="panel"><div class="panel-head"><h2>সিজনের হিসাব ও মালিকদের ভাগ</h2><p class="hint">কাজ বা সিজন শেষে কে কত পাবেন। তারিখ বেছে "হিসাব করুন" চাপুন।</p></div>'+
    '<div class="grid2"><label class="field"><span>শুরু</span><input type="date" id="seaFrom" data-sea="from" value="'+esc(r[0])+'"></label><label class="field"><span>শেষ</span><input type="date" id="seaTo" data-sea="to" value="'+esc(r[1])+'"></label></div>'+
    '<div class="actions"><button type="button" class="btn primary" data-act="season-calc">হিসাব করুন</button></div>';
  var s=S.season;
  if(s&&s.loading)return h+'<p class="muted">হিসাব হচ্ছে…</p></section>';
  if(!s||!s.t||s.from!==r[0]||s.to!==r[1])return h+'</section>';
  var t=s.t,net=t.v1.net+t.v2.net;
  h+='<p class="eyebrow">'+DFY.format(toDate(s.from))+' থেকে '+DFY.format(toDate(s.to))+'</p>'+
    '<dl class="facts">'+VK.map(function(v){return '<div><dt>'+esc(vName(v))+' · আয় '+tk(t[v].income)+', খরচ '+tk(t[v].cost)+'</dt><dd class="'+(t[v].net<0?'neg':'pos')+'">'+(t[v].net<0?'লোকসান ':'লাভ ')+tka(t[v].net)+'</dd></div>';}).join('')+
    '<div><dt><b>মোট '+netWord(net)+'</b></dt><dd class="'+(net<0?'neg':'pos')+'"><b>'+tka(net)+'</b></dd></div></dl>';
  var rows='',totRemain=0;
  S.settings.owners.forEach(function(o){
    var share=t.v1.net*o.s1/100+t.v2.net*o.s2/100,x=ownerTxSum(o.id,s.from,s.to),taken=x.take-x.give,remain=share-taken;totRemain+=remain;
    rows+='<tr><td>'+esc(o.name||'মালিক')+'<span class="by">'+DIG(o.s1)+'% · '+DIG(o.s2)+'%</span></td><td class="n '+(share<0?'neg':'')+'">'+amt(Math.abs(share))+'</td><td class="n">'+amt(taken)+'</td><td class="n '+(remain<0?'neg':'pos')+'"><b>'+amt(Math.abs(remain))+'</b>'+(remain<0?'<span class="by">বেশি নিয়েছেন</span>':'')+'</td>'+
      '<td>'+(remain>0?'<button type="button" class="btn small" data-seapay="'+esc(o.id)+'" data-amt="'+Math.round(remain)+'">দিলাম</button>':'')+'</td></tr>';
  });
  h+='<div class="tbl-wrap"><table class="khata stmt"><thead><tr><th>মালিক</th><th class="n">ভাগ (৳)</th><th class="n">নিয়েছেন (৳)</th><th class="n">বাকি পাবেন (৳)</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<p class="hint">"নিয়েছেন" মানে এই তারিখের মধ্যে লেখা "টাকা নিলেন" থেকে "টাকা দিলেন" বাদ দিয়ে। "দিলাম" চাপলে সেই মালিকের নামে টাকা নেওয়া লেখা হবে।</p>';
  var siteDueAll=sitesDueTotal(),shopDue=0,drvDue=0;
  shopNames().forEach(function(n){var b=shopBal(n).bal;if(b>0)shopDue+=b;});
  activeDrivers().forEach(function(d){var b=dBal(d.id).bal;if(b>0)drvDue+=b;});
  var after=cashBal+siteDueAll-shopDue-drvDue;
  h+='<dl class="facts">'+fact('এখন হাতে আছে',cashBal)+fact('সাইটগুলো থেকে আরও পাবেন',siteDueAll,'pos')+fact('দোকানে শোধ করতে হবে',shopDue)+fact('ড্রাইভারদের দিতে হবে',drvDue)+
    '<div><dt><b>সব আদায় আর শোধের পর হাতে থাকবে</b></dt><dd class="'+(after<0?'neg':'pos')+'"><b>'+tka(after)+'</b></dd></div>'+
    '<div><dt>মালিকদের মোট বাকি ভাগ</dt><dd>'+tka(totRemain)+'</dd></div></dl>'+
    '<p class="hint">মালিকদের ভাগ দেওয়ার আগে সাইটের বাকি টাকা আদায় হয়েছে কি না দেখে নিন। হাতে না থাকলে আদায় হওয়ার পর দিন।</p>'+
    '<div class="actions"><button type="button" class="btn ghost" data-act="season-close" id="seaClose">এই সিজন শেষ, পরের সিজন '+DFY.format(toDate(addDays(s.to,1)))+' থেকে</button></div>';
  return h+'</section>';
}

/* ----- owner: owners & settings ----- */
function ownersHTML(){
  if(!S.ownersDraft)S.ownersDraft=clone(S.settings);
  var d=S.ownersDraft;
  var h='<section class="panel"><div class="panel-head"><h2>ভেকুর নাম</h2><p class="hint">রেজিস্ট্রেশন নম্বর বা মডেল দিয়ে চিনতে চাইলে এখানে লিখুন। ড্রাইভাররাও এই নাম দেখবে।</p></div><div class="grid2">'+
    VK.map(function(v){return '<label class="field"><span>'+plate(v)+' নম্বর ভেকু</span><input type="text" id="vn-'+v+'" data-vn="'+v+'" value="'+esc(d.vekus[v].name)+'"></label>';}).join('')+'</div></section>';
  h+='<section class="panel"><div class="panel-head"><h2>মালিক ও অংশ</h2><p class="hint">প্রতিটি ভেকুতে কার কত শতাংশ অংশ। কেউ কোনো ভেকুর মালিক না হলে সেখানে ০ লিখুন।</p></div><div class="orows">'+
    d.owners.map(function(o,i){
      return '<div class="orow"><label class="field o-name"><span>মালিক '+DIG(i+1)+'-এর নাম</span><input type="text" id="o-name-'+i+'" data-i="'+i+'" data-k="name" value="'+esc(o.name)+'"></label>'+
        '<label class="field"><span>'+plate('v1')+' অংশ %</span><input type="text" class="num" inputmode="decimal" id="o-s1-'+i+'" data-i="'+i+'" data-k="s1" value="'+DIG(o.s1)+'"></label>'+
        '<label class="field"><span>'+plate('v2')+' অংশ %</span><input type="text" class="num" inputmode="decimal" id="o-s2-'+i+'" data-i="'+i+'" data-k="s2" value="'+DIG(o.s2)+'"></label>'+
        (d.owners.length>1?'<button type="button" class="icon-btn" data-rm="'+i+'" aria-label="'+esc(o.name||'এই মালিক')+' বাদ দিন">✕</button>':'<span></span>')+'</div>';
    }).join('')+'</div><div class="osum" id="osum">'+osumHTML()+'</div><div class="actions"><button type="button" class="btn small" data-act="add-owner">+ মালিক যোগ করুন</button></div></section>';
  h+='<section class="panel"><div class="panel-head"><h2>ডিজেলের দাম</h2><p class="hint">মেমোর টাকা না লেখা থাকলে লিটার অনুযায়ী এই দাম ধরে খরচ বসে যাবে। দাম বদলালে এখানে বদলে দিন।</p></div>'+
    '<label class="field" style="max-width:240px"><span>প্রতি লিটার (৳)</span><input type="text" class="num" inputmode="decimal" id="dieselRate" data-rate="1" value="'+(d.diesel_rate?DIG(d.diesel_rate):'')+'" placeholder="যেমন ১০৫"></label></section>';
  h+='<div class="actions"><button type="button" class="btn primary" data-act="save-owners" id="ownSave"'+(S.ownersDirty?'':' disabled')+'>সংরক্ষণ করুন</button><button type="button" class="btn ghost" data-act="reset-owners" id="ownReset"'+(S.ownersDirty?'':' disabled')+'>বাতিল</button></div>';
  var ph=S.user&&S.user.email?S.user.email.split('@')[0]:'';
  h+='<section class="panel"><div class="panel-head"><h2>আপনার অ্যাকাউন্ট</h2><p class="hint">লগইনের মোবাইল নম্বর: '+esc(bnPhone(ph))+'</p></div>'+
    '<div class="field"><span>সংখ্যা কীভাবে দেখাবে <em>শুধু এই ফোনে</em></span>'+digitsHTML()+'</div>'+'<div class="actions"><button type="button" class="btn" data-act="my-password">পাসওয়ার্ড বদলান</button><button type="button" class="btn ghost" data-act="logout">বের হন</button></div></section>';
  return h;
}
function osumHTML(){
  var d=S.ownersDraft||S.settings,s1=0,s2=0;d.owners.forEach(function(o){s1+=+o.s1||0;s2+=+o.s2||0;});
  function part(v,s){var ok=Math.abs(s-100)<0.01;return '<span>'+esc(d.vekus[v].name||vName(v))+': মোট <span class="'+(ok?'ok':'bad')+'">'+DIG(s)+'%'+(ok?' ✓':' (১০০% হওয়া দরকার)')+'</span></span>';}
  return part('v1',s1)+part('v2',s2);
}
function renderOwnersPanel(){$('#main').innerHTML=ownersHTML();S.shown='owners';}
function markOwnersDirty(){
  S.ownersDirty=true;
  var a=$('#ownSave'),b=$('#ownReset');if(a)a.disabled=false;if(b)b.disabled=false;
  var o=$('#osum');if(o)o.innerHTML=osumHTML();
}
async function saveSettings(s){
  var body={vekus:s.vekus,owners:s.owners,diesel_rate:+s.diesel_rate||0,shops:s.shops};
  await q(sb.from('settings').update(body).eq('id',1));
  body.season_start=S.settings.season_start;S.settings=normSettings(body);
}

/* ----- driver side ----- */
var STL={pending:'অপেক্ষায়',approved:'অনুমোদিত ✓',rejected:'নাকচ হয়েছে'};
function driverTopHTML(){
  var a=S.acct;if(!a)return '';
  var d=a.driver||{},earned=+a.earned||0,paid=+a.paid||0,bal=earned-paid,open=S.openMine;
  return '<section class="panel"><div class="panel-head"><p class="dname">'+esc(d.name||'')+'</p><p class="eyebrow">আপনার টাকার হিসাব · '+wageText(d)+'</p><h2 class="dbal">'+(bal<0?'বেশি নিয়েছেন ':'বাকি পাবেন ')+'<span class="'+(bal<0?'neg':'pos')+'">'+tk(Math.abs(bal))+'</span></h2><p class="hint">আজ পর্যন্ত সব মিলিয়ে।</p></div>'+
    '<div class="kv3"><div><span>মজুরি হয়েছে</span><b>'+tk(earned)+'</b></div><div><span>নিয়েছেন</span><b>'+tk(paid)+'</b></div><div><span>মোট কাজ</span><b>'+q1(a.hours)+' ঘণ্টা</b></div></div>'+
    '<button type="button" class="linkbtn" data-act="my-stmt">'+(open?'লেনদেন লুকান':'সব লেনদেন দেখুন')+'</button>'+
    (open?stmtTable(driverStmtRows(a.statement||[]),['মজুরি (৳)','নিয়েছেন (৳)'],null):'')+
    '<div class="field"><span>সংখ্যা কীভাবে দেখাবে</span>'+digitsHTML()+'</div>'+
    (d.active===false?'<p class="note">মালিক আপনাকে ড্রাইভারের তালিকা থেকে সরিয়েছেন, তাই নতুন হিসাব পাঠানো যাবে না।</p>':'')+
  '</section>';
}
function driverListHTML(){
  var a=S.acct;if(!a)return '';
  var h='<section class="panel"><div class="panel-head"><h2>আপনার পাঠানো হিসাব</h2><p class="hint">"অপেক্ষায়" থাকা হিসাবে চাপ দিলে বদলানো বা মুছে ফেলা যাবে। অনুমোদন হয়ে গেলে আর বদলানো যাবে না।</p></div>';
  if(!S.mine.length)h+='<p class="muted">এখনও কোনো হিসাব পাঠাননি। ওপরের ঘরগুলো পূরণ করে "পাঠিয়ে দিন" চাপুন।</p>';
  else h+='<ul class="dlist">'+S.mine.map(function(r){
    var st=r.status||'pending',ck=st==='pending'&&a.driver&&a.driver.active!==false;
    return '<li class="ditem'+(ck?' click':'')+'"'+(ck?' tabindex="0" data-mine="'+esc(r.id)+'"':'')+'>'+plate(r.veku)+
      '<div><div class="dd">'+fullDate(r.date)+'</div><div class="df">'+(siteName(r)?esc(siteName(r))+' · ':'')+q1(r.hours)+' ঘণ্টা'+(+r.litres>0?' · ডিজেল '+q1(r.litres)+' লিটার'+(+r.fuel_cost?' = '+tk(r.fuel_cost):'')+(r.fuel_src?' ('+esc(r.fuel_src)+')':''):'')+(r.remarks?' · '+esc(r.remarks):'')+'</div></div>'+
      '<span class="st '+st+'">'+(STL[st]||st)+'</span></li>';
  }).join('')+'</ul>';
  return h+'<button type="button" class="linkbtn" data-act="refresh">নতুন করে দেখুন</button></section>';
}
function drvVekuSeg(){
  $('#dVekuSeg').innerHTML=VK.map(function(x){return '<button type="button" class="'+x+'" data-dv="'+x+'" aria-pressed="'+(x===D.veku)+'">'+plate(x)+'<span>'+esc(vName(x))+'</span></button>';}).join('');
}
function dFuelCalc(){
  var l=num($('#dLitres').value),r=num($('#dRate').value);
  if(l>0&&r>0)$('#dFuelAmt').value=shown(Math.round(l*r));
}
function lastDRate(){
  for(var i=0;i<S.mine.length;i++){var m=S.mine[i];if(+m.litres>0&&+m.fuel_cost>0)return Math.round(m.fuel_cost/m.litres*100)/100;}
  return +S.pub.diesel_rate||0;
}
function resetDrv(rec){
  D.id=rec?rec.id:null;D.delArmed=false;
  D.veku=rec?rec.veku:((S.mine[0]&&S.mine[0].veku)||D.veku||'v1');
  drvVekuSeg();
  var lastSid=rec?(rec.site_id||''):((S.mine[0]&&S.mine[0].site_id)||'');
  fillDSite(lastSid&&siteBy(lastSid)?lastSid:'',rec&&!rec.site_id?(rec.site_name||''):'');
  $('#dDate').value=rec?rec.date:todayISO();
  $('#dHours').value=rec?shown(rec.hours):'';
  $('#dLitres').value=rec?shown(rec.litres):'';
  $('#dSrc').value=rec?(rec.fuel_src||''):'';
  var rr=rec&&+rec.litres>0&&+rec.fuel_cost>0?Math.round(rec.fuel_cost/rec.litres*100)/100:lastDRate();
  $('#dRate').value=rr?shown(rr):'';$('#dFuelAmt').value=rec?shown(rec.fuel_cost):'';
  $('#dRemarks').value=rec?(rec.remarks||''):'';
  $('#drvTitle').textContent=rec?'পাঠানো হিসাব বদলান':'আজকের কাজ লিখুন';
  $('#dSave').textContent=rec?'বদলে পাঠান':'পাঠিয়ে দিন';
  var del=$('#dDel');del.hidden=!rec;del.textContent='মুছে ফেলুন';del.classList.remove('armed');
  $('#dCancel').hidden=!rec;$('#dErr').hidden=true;
}
function fillDSite(sel,newName){
  var el=$('#dSiteSel');
  el.innerHTML='<option value="">— সাইট বাছুন —</option>'+S.pub.sites.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>';}).join('')+'<option value="__new">তালিকায় নেই, নাম লিখব</option>';
  el.value=newName?'__new':(sel||'');
  $('#dSiteNew').value=newName||'';$('#dSiteNewWrap').hidden=el.value!=='__new';
}
function dErr(m){var e=$('#dErr');e.textContent=m;e.hidden=false;}
async function submitDrv(ev){
  ev.preventDefault();
  var date=$('#dDate').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return dErr('তারিখ দিন।');
  var hours=num($('#dHours').value),litres=num($('#dLitres').value),fuel=0,src=$('#dSrc').value.trim();
  if(!(hours>0)&&!(litres>0))return dErr('কত ঘণ্টা চালিয়েছেন, অথবা কত লিটার ডিজেল নিয়েছেন লিখুন।');
  if(litres>0&&!src)return dErr('কোন দোকান বা পাম্প থেকে ডিজেল নিয়েছেন লিখুন।');
  fuel=litres>0?num($('#dFuelAmt').value):0;
  if(litres>0&&!(fuel>0))return dErr('ডিজেলের মোট টাকা লিখুন, অথবা দর দিন।');
  var dsel=$('#dSiteSel').value,dnew=$('#dSiteNew').value.trim();
  if(dsel==='__new'&&!dnew)return dErr('সাইটের নাম লিখুন।');
  if(hours>0&&!dsel)return dErr('কোন সাইটে কাজ করেছেন বাছুন। তালিকায় না থাকলে "তালিকায় নেই" বেছে নাম লিখুন।');
  var data={veku:D.veku,date:date,site_id:dsel&&dsel!=='__new'?dsel:null,site_name:dsel==='__new'?dnew:'',hours:hours,litres:litres,fuel_cost:fuel,fuel_src:litres>0?src:'',fuel_pay:'',remarks:$('#dRemarks').value.trim()};
  var b=$('#dSave'),wasEdit=!!D.id;b.disabled=true;b.textContent='পাঠানো হচ্ছে…';
  try{
    if(D.id){
      var rows=await q(sb.from('submissions').update(data).eq('id',D.id).select('id'));
      if(!rows||!rows.length){resetDrv(null);await loadDriver();render();return dErr('এই হিসাব মালিক এরই মধ্যে দেখে ফেলেছেন, তাই আর বদলানো যাবে না।');}
    }else{
      await q(sb.from('submissions').insert(data));
    }
    resetDrv(null);
    toast(wasEdit?'বদলানো হিসাব পাঠানো হয়েছে':'হিসাব পাঠানো হয়েছে। মালিক দেখে অনুমোদন করবেন।');
    await loadDriver();render();
  }catch(e){dErr(errText(e));}
  finally{b.disabled=false;b.textContent=D.id?'বদলে পাঠান':'পাঠিয়ে দিন';}
}

/* ---------- toast ---------- */
var toastT=null;
function toast(msg){var t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true;},2800);}

/* ---------- owner entry sheet ---------- */
var F={type:'entry',id:null,veku:'v1',kind:'মেরামত',pay:'',fuelTouched:false,wageTouched:false,delArmed:false,siteLock:false,siteTouched:false,approve:null};
var sheet=$('#sheet');
function setType(t){
  F.type=t;
  document.querySelectorAll('#typeSeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.type===t));});
  document.querySelectorAll('#sheetForm [data-group]').forEach(function(el){el.hidden=el.dataset.group!==t;});
}
function setVeku(v){
  F.veku=v;
  $('#vekuSeg').innerHTML=VK.map(function(x){return '<button type="button" class="'+x+'" data-sv="'+x+'" aria-pressed="'+(x===v)+'">'+plate(x)+'<span>'+esc(vName(x))+'</span></button>';}).join('');
  if(!F.siteLock&&!F.siteTouched)fillSiteSel(lastSiteId(v),'');
}
function fillSiteSel(sel,newName){
  var el=$('#fSiteSel'),list=activeSites().slice().sort(function(a,b){return a.name.localeCompare(b.name,'bn');}),cur=sel?siteBy(sel):null;
  el.innerHTML='<option value="">— সাইট বাছুন —</option>'+list.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>';}).join('')+
    (cur&&cur.status==='done'?'<option value="'+esc(cur.id)+'">'+esc(cur.name)+' (শেষ)</option>':'')+'<option value="__new">+ নতুন সাইট</option>';
  el.value=newName?'__new':(cur?cur.id:'');
  $('#fSiteNew').value=newName||'';$('#fSiteNewWrap').hidden=el.value!=='__new';
}
function setKind(k){F.kind=k;document.querySelectorAll('#kindSeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.kind===k));});}
function setFPay(p){F.pay=p;document.querySelectorAll('#fPaySeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.pay===p));});}
function autoFuel(){var r=S.settings.diesel_rate;if(r&&!F.fuelTouched){var l=num($('#fLitres').value);$('#fFuel').value=l?shown(Math.round(l*r)):'';}}
function autoWage(){
  var id=$('#fDrvSel').value,d=driverBy(id);
  $('#wageHint').textContent=d?wageText(d):'';
  if(F.wageTouched)return;
  var w=wageFor(id,num($('#fHours').value));
  if(w!=null)$('#fDriver').value=shown(w);
}
function fuelHint(){var r=S.settings.diesel_rate;$('#fuelHint').textContent=r?('মেমোর টাকা না থাকলে লিটার × ৳'+NF2.format(r)+' ধরা হবে'):'মেমোর টাকা লিখুন';}
function fillDrvSel(sel){
  var list=activeDrivers(),d=sel?driverBy(sel):null;
  var opts='<option value="">— বাছুন —</option>'+list.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>';}).join('');
  if(d&&d.active===false)opts+='<option value="'+esc(d.id)+'">'+esc(d.name)+' (সরানো)</option>';
  $('#fDrvSel').innerHTML=opts;$('#fDrvSel').value=d?d.id:'';
}
function defaultDate(){
  var t=todayISO(),p=t.split('-').map(Number);
  if(p[0]===S.year&&(S.month===0||S.month===p[1]))return t;
  return S.year+'-'+pad(S.month||1)+'-01';
}
function openSheet(type,rec,ap,opts){
  opts=opts||{};
  F.approve=ap||null;F.rec=rec||null;
  if(ap){type='entry';rec=null;}
  F.id=rec?rec.id:null;F.delArmed=false;
  setType(type);
  $('#typeSeg').hidden=!!(rec||ap);
  $('#sheetTitle').textContent=ap?'জমা লিখে অনুমোদন করুন':rec?(type==='entry'?'দৈনিক হিসাব বদলান':'খরচ বদলান'):'নতুন হিসাব লিখুন';
  var fl=$('#fromLine');fl.hidden=!ap;fl.textContent=ap?('পাঠিয়েছেন: '+driverName(ap.driver_id)+(ap.remarks?' · "'+ap.remarks+'"':'')):'';
  var src=ap||rec;
  F.siteLock=!!(rec||ap||opts.siteId);F.siteTouched=false;
  setVeku(src?src.veku:S.veku);
  $('#fDate').value=src?src.date:defaultDate();
  if(rec)fillSiteSel(rec.site_id||'',rec.site_id?'':(rec.site||''));
  else if(ap){var mt=ap.site_id?null:siteByName(ap.site_name);fillSiteSel(ap.site_id||(mt?mt.id:''),ap.site_id||mt?'':(ap.site_name||''));}
  else if(opts.siteId)fillSiteSel(opts.siteId,'');
  else fillSiteSel(lastSiteId(F.veku),'');
  var isE=type==='entry';
  $('#fHours').value=src&&isE?shown(src.hours):'';
  $('#fLitres').value=src&&isE?shown(src.litres):'';
  $('#fFuel').value=src&&isE?shown(src.fuel_cost):'';
  $('#fSrc').value=src&&isE?(src.fuel_src||''):'';
  setFPay(ap?(+ap.fuel_cost>0?(ap.fuel_src?'due':'cash'):''):(src&&isE?(src.fuel_pay||''):''));
  $('#fDeposit').value=rec&&isE?shown(rec.deposit):'';
  $('#fDeposit').classList.toggle('key',!!ap);
  fillDrvSel(ap?ap.driver_id:rec?(rec.driver_id||''):lastDriverFor(F.veku));
  $('#fDriver').value=rec&&isE?shown(rec.driver_wage):'';
  F.fuelTouched=!!rec||!!(ap&&+ap.fuel_cost>0);
  F.wageTouched=!!rec;
  $('#fDesc').value=rec&&!isE?(rec.description||''):'';
  $('#fAmount').value=rec&&!isE?shown(rec.amount):'';
  setKind(rec&&!isE?(rec.kind||'অন্যান্য'):'মেরামত');
  $('#fRemarks').value=src?(src.remarks||''):'';
  fuelHint();autoFuel();autoWage();
  var del=$('#delBtn');del.hidden=!(rec||ap);del.textContent=ap?'নাকচ করুন':'মুছে ফেলুন';del.classList.remove('armed');
  $('#formErr').hidden=true;
  var sb_=$('#saveBtn');sb_.disabled=false;sb_.textContent=ap?'অনুমোদন করুন':'সংরক্ষণ করুন';
  try{sheet.showModal();}catch(e){sheet.setAttribute('open','');}
  if(ap)setTimeout(function(){try{$('#fDeposit').focus();}catch(e){}},60);
}
function closeSheet(){try{sheet.close();}catch(e){sheet.removeAttribute('open');}}
function showErr(m){var e=$('#formErr');e.textContent=m;e.hidden=false;}
async function addShopIfNew(name){
  if(!name||S.settings.shops.indexOf(name)>=0)return;
  var s=clone(S.settings);s.shops.push(name);try{await saveSettings(s);}catch(e){}
}
async function submitSheet(ev){
  ev.preventDefault();
  var date=$('#fDate').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return showErr('তারিখ দিন।');
  var data,col,ap=F.approve;
  if(F.type==='entry'){
    data={veku:F.veku,date:date,site:'',site_id:null,hours:num($('#fHours').value),litres:num($('#fLitres').value),fuel_cost:num($('#fFuel').value),fuel_src:$('#fSrc').value.trim(),fuel_pay:F.pay,
      deposit:num($('#fDeposit').value),driver_wage:num($('#fDriver').value),driver_id:$('#fDrvSel').value||null,remarks:$('#fRemarks').value.trim()};
    if(ap&&$('#fDeposit').value.trim()==='')return showErr('সাইট থেকে কত টাকা জমা হয়েছে লিখুন। কিছু না পেলে ০ লিখুন।');
    if(!(data.hours||data.litres||data.fuel_cost||data.deposit||data.driver_wage))return showErr('অন্তত একটি ঘর পূরণ করুন: ঘণ্টা, ডিজেল, জমা বা ড্রাইভারের মজুরি।');
    if(data.fuel_cost>0&&!data.fuel_pay)data.fuel_pay=data.fuel_src?'due':'cash';
    if(data.fuel_pay==='due'&&!data.fuel_src)return showErr('কোন দোকান থেকে বাকিতে ডিজেল নেওয়া হয়েছে লিখুন।');
    if(data.fuel_pay==='due'&&!(data.fuel_cost>0))return showErr('বাকিতে নেওয়া ডিজেলের টাকা লিখুন, তা না হলে দোকানের বাকি হিসাব হবে না।');
    if(data.driver_wage>0&&!data.driver_id)return showErr('মজুরি কোন ড্রাইভারের, বেছে নিন। তালিকায় না থাকলে "ড্রাইভার" পাতায় আগে যোগ করুন।');
    var siteSel=$('#fSiteSel').value,newSite='';
    if(siteSel==='__new'){newSite=$('#fSiteNew').value.trim();if(!newSite)return showErr('নতুন সাইটের নাম লিখুন, অথবা তালিকা থেকে সাইট বাছুন।');var ex=siteByName(newSite);if(ex){data.site_id=ex.id;data.site=ex.name;newSite='';}else data.site=newSite;}
    else if(siteSel){data.site_id=siteSel;data.site=(siteBy(siteSel)||{}).name||'';}
    col='entries';
  }else{
    data={veku:F.veku,date:date,kind:F.kind,description:$('#fDesc').value.trim(),amount:num($('#fAmount').value),remarks:$('#fRemarks').value.trim()};
    if(!data.description)return showErr('খরচের বিবরণ লিখুন, যেমন: হাইড্রোলিক পাইপ বদল।');
    if(!(data.amount>0))return showErr('কত টাকা খরচ হয়েছে লিখুন।');
    col='repairs';
  }
  var btn=$('#saveBtn'),label=btn.textContent;btn.disabled=true;btn.textContent='সংরক্ষণ হচ্ছে…';
  try{
    var created=false;
    if(col==='entries'&&newSite){var ns=await q(sb.from('sites').insert({name:newSite}).select('id').single());data.site_id=ns.id;created=true;}
    if(col==='entries'){var rs=data.site_id?siteBy(data.site_id):null,orec=F.rec;data.rate=(orec&&orec.site_id===data.site_id&&+orec.rate>0)?+orec.rate:(rs&&rs.bill_type!=='contract'?(+rs.rate||0):0);}
    if(ap)await q(sb.rpc('approve_submission',{p_id:ap.id,p_entry:data}));
    else if(F.id)await q(sb.from(col).update(data).eq('id',F.id));
    else await q(sb.from(col).insert(data));
    closeSheet();
    var y=+date.slice(0,4),m=+date.slice(5,7);
    S.veku=F.veku;
    if(S.month&&m!==S.month)S.month=m;
    if(y!==S.year)S.year=y;
    if(S.tab==='daily'&&col==='repairs')S.tab='repair';
    if(S.tab==='repair'&&col==='entries')S.tab='daily';
    toast(ap?'অনুমোদন হয়েছে, খাতায় উঠেছে':F.id?'হিসাব বদলানো হয়েছে':'হিসাব সংরক্ষিত হয়েছে');
    if(col==='entries')await addShopIfNew(data.fuel_src);
    var jobs=[reloadYear()];if(col==='entries')jobs.push(reloadBal());if(created)jobs.push(reloadSites());if(ap)jobs.push(qPending().then(function(r){S.pending=r||[];}));
    await Promise.all(jobs);
    render();
  }catch(e){showErr(errText(e));}
  finally{btn.disabled=false;btn.textContent=label;}
}

/* ---------- mini sheet ---------- */
var M={mode:'',id:'',shop:'',wage:'hour',login:false,delArmed:false,delText:''};
var mini=$('#mini');
function wageSeg(w){
  return '<fieldset class="field"><legend>মজুরি কীভাবে</legend><div class="seg2" id="mWageSeg">'+
    [['hour','ঘণ্টা প্রতি'],['day','দিন প্রতি'],['manual','প্রতিবার লিখব']].map(function(x){return '<button type="button" data-w="'+x[0]+'" aria-pressed="'+(w===x[0])+'">'+x[1]+'</button>';}).join('')+'</div></fieldset>'+
    '<label class="field" id="mRateWrap"'+(w==='manual'?' hidden':'')+'><span id="mRateLbl">'+(w==='day'?'প্রতি দিন কত টাকা':'প্রতি ঘণ্টা কত টাকা')+'</span><input type="text" class="num" id="mRate" inputmode="decimal" autocomplete="off" placeholder="৳"></label>';
}
function pwField(id,label){return '<label class="field"><span>'+label+' <em>কমপক্ষে ৬ অক্ষর</em></span><span class="pw"><input type="text" id="'+id+'" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" data-genpw="'+id+'">বানিয়ে দিন</button></span></label>';}
function genPw(){var c='abcdefghjkmnpqrstuvwxyz23456789',s='';var a=new Uint32Array(8);try{crypto.getRandomValues(a);}catch(e){for(var i=0;i<8;i++)a[i]=Math.floor(Math.random()*1e9);}for(var j=0;j<8;j++)s+=c.charAt(a[j]%c.length);return s;}
function payFields(rec){
  return '<div class="grid2"><label class="field"><span>তারিখ</span><input type="date" id="mDate" value="'+esc(rec?rec.date:todayISO())+'"></label><label class="field"><span>কত টাকা</span><input type="text" class="num" id="mAmount" inputmode="decimal" autocomplete="off" placeholder="৳" value="'+esc(rec?shown(rec.amount):'')+'"></label></div>'+
    '<label class="field"><span>নোট <em>ইচ্ছা হলে</em></span><input type="text" id="mNote" autocomplete="off" value="'+esc(rec?rec.note||'':'')+'"></label>';
}
function openMini(mode,o){
  o=o||{};M={mode:mode,id:o.id||'',shop:o.shop||'',wage:'hour',login:false,delArmed:false,delText:''};
  var title='',body='',save='সংরক্ষণ করুন',del='';
  var d=o.driver||null;
  if(mode==='driver-new'){
    title='ড্রাইভার যোগ করুন';
    body='<label class="field"><span>নাম</span><input type="text" id="mName" autocomplete="off"></label>'+
      '<label class="field"><span>মোবাইল নম্বর</span><input type="tel" id="mPhone" inputmode="tel" autocomplete="off" placeholder="০১XXXXXXXXX"></label>'+
      wageSeg('hour')+
      '<label class="check"><input type="checkbox" id="mLogin"> <span>লগইন দিন: ড্রাইভার নিজের ফোন থেকে কাজের হিসাব পাঠাবে আর নিজের টাকার হিসাব দেখবে</span></label>'+
      '<div id="mPwWrap" hidden>'+pwField('mPass','পাসওয়ার্ড')+'</div>';
  }else if(mode==='driver-edit'){
    title='ড্রাইভারের তথ্য বদলান';M.wage=d.rate_type||'hour';
    body='<label class="field"><span>নাম</span><input type="text" id="mName" autocomplete="off" value="'+esc(d.name)+'"></label>'+
      '<label class="field"><span>মোবাইল নম্বর'+(d.user_id?' <em>লগইনের নম্বর, বদলানো যাবে না</em>':'')+'</span><input type="tel" id="mPhone" inputmode="tel" autocomplete="off" value="'+esc(d.phone||'')+'"'+(d.user_id?' disabled':'')+'></label>'+
      wageSeg(M.wage)+
      '<fieldset class="field sub"><legend>লগইন</legend>'+(d.user_id?
        '<p class="hint">এই ড্রাইভার '+esc(bnPhone(d.phone))+' নম্বর দিয়ে লগইন করে।</p><div class="actions"><button type="button" class="btn small" data-mgo="login-reset">নতুন পাসওয়ার্ড দিন</button><button type="button" class="btn ghost small" data-mgo="login-remove">লগইন বন্ধ করুন</button></div>':
        '<p class="hint">এখন লগইন নেই। লগইন দিলে ড্রাইভার নিজের ফোন থেকে হিসাব পাঠাতে পারবে।</p><div class="actions"><button type="button" class="btn small" data-mgo="login-give">লগইন দিন</button></div>')+'</fieldset>';
    del='তালিকা থেকে সরান';
  }else if(mode==='login-give'){
    title=d.name+'-কে লগইন দিন';save='লগইন দিন';
    body='<label class="field"><span>মোবাইল নম্বর</span><input type="tel" id="mPhone" inputmode="tel" autocomplete="off" value="'+esc(d.phone||'')+'"></label>'+pwField('mPass','পাসওয়ার্ড');
  }else if(mode==='login-reset'){
    title=d.name+'-এর নতুন পাসওয়ার্ড';save='পাসওয়ার্ড বদলান';
    body='<p class="from">মোবাইল: '+esc(bnPhone(d.phone))+'</p>'+pwField('mPass','নতুন পাসওয়ার্ড');
  }else if(mode==='login-remove'){
    title=d.name+'-এর লগইন বন্ধ করবেন?';save='লগইন বন্ধ করুন';
    body='<p>এরপর এই ড্রাইভার আর লগইন করতে পারবে না। তার আগের হিসাব আর টাকার হিসাব যেমন আছে তেমনই থাকবে। পরে আবার লগইন দেওয়া যাবে।</p>';
  }else if(mode==='login-done'){
    title='লগইন তৈরি হয়েছে';save='ঠিক আছে';
    body='<p>ড্রাইভারকে এই তিনটি জিনিস জানান:</p><div class="cred" id="credBox"><span>সাইট</span><b>'+esc(siteUrl())+'</b><span>মোবাইল নম্বর</span><b>'+esc(o.phone)+'</b><span>পাসওয়ার্ড</span><b>'+esc(o.password)+'</b></div>'+
      '<div class="actions"><button type="button" class="btn small" data-copycred="1">সব কপি করুন</button></div><p class="hint">পাসওয়ার্ডটি এখনই লিখে রাখুন বা পাঠিয়ে দিন। পরে আর দেখা যাবে না, তবে নতুন পাসওয়ার্ড দেওয়া যাবে।</p>';
    M.cred='সাইট: '+siteUrl()+'\nমোবাইল: '+o.phone+'\nপাসওয়ার্ড: '+o.password;
  }else if(mode==='pay-driver'){
    title=driverName(M.id)+'-কে টাকা দিলেন';
    body='<p class="from">এখন বাকি পাবে: '+tk(dBal(M.id).bal)+'</p>'+payFields(o.rec);M.rec=o.rec||null;if(o.rec)del='মুছে ফেলুন';
  }else if(mode==='pay-shop'){
    title=M.shop+'-কে টাকা দিলাম';
    body='<p class="from">এখন বাকি আছে: '+tk(shopBal(M.shop).bal)+'</p>'+payFields(o.rec);M.rec=o.rec||null;if(o.rec)del='মুছে ফেলুন';
  }else if(mode==='shop-new'){
    title='দোকান বা পাম্প যোগ করুন';
    body='<label class="field"><span>দোকান বা পাম্পের নাম</span><input type="text" id="mName" autocomplete="off"></label>';
  }else if(mode==='site-new'||mode==='site-edit'){
    var st=o.site||{};M.site=o.site||null;M.sstatus=st.status||'active';M.btype=st.bill_type||'hour';
    title=mode==='site-new'?'নতুন সাইট যোগ করুন':'সাইটের তথ্য বদলান';
    body='<label class="field"><span>সাইটের নাম</span><input type="text" id="mName" autocomplete="off" placeholder="যেমন: রহমানের পুকুর খনন" value="'+esc(st.name||'')+'"></label>'+
      '<div class="grid2"><label class="field"><span>মালিকপক্ষ <em>ইচ্ছা হলে</em></span><input type="text" id="mClient" autocomplete="off" value="'+esc(st.client||'')+'"></label>'+
      '<label class="field"><span>ফোন <em>ইচ্ছা হলে</em></span><input type="tel" id="mPhone" inputmode="tel" autocomplete="off" value="'+esc(st.phone||'')+'"></label></div>'+
      '<label class="field"><span>ঠিকানা বা জায়গা <em>ইচ্ছা হলে</em></span><input type="text" id="mAddr" autocomplete="off" value="'+esc(st.address||'')+'"></label>'+
      '<fieldset class="field"><legend>কাজের হিসাব কীভাবে</legend><div class="seg2" id="mBillSeg"><button type="button" data-bt="hour" aria-pressed="'+(M.btype!=='contract')+'">ঘণ্টা হিসাবে</button><button type="button" data-bt="contract" aria-pressed="'+(M.btype==='contract')+'">চুক্তিতে (মোট টাকা)</button></div></fieldset>'+
      '<div id="mHourWrap"'+(M.btype==='contract'?' hidden':'')+' class="grp"><label class="field"><span>প্রতি ঘণ্টার রেট (৳)</span><input type="text" class="num" id="mRate" inputmode="decimal" autocomplete="off" placeholder="যেমন ১৬০০" value="'+esc(st.rate?shown(st.rate):'')+'"></label>'+
        (mode==='site-edit'&&+st.rate>0?'<label class="check"><input type="checkbox" id="mApplyOld"> <span>রেট বদলালে আগের কাজেও নতুন রেট ধরুন। টিক না দিলে আগের কাজ আগের রেটেই থাকবে।</span></label>':'')+'</div>'+
      '<label class="field" id="mContractWrap"'+(M.btype==='contract'?'':' hidden')+'><span>চুক্তির মোট টাকা (৳)</span><input type="text" class="num" id="mContract" inputmode="decimal" autocomplete="off" value="'+esc(st.contract_amount?shown(st.contract_amount):'')+'"></label>'+
      (mode==='site-edit'?'<label class="field"><span>ছাড় দিয়েছেন (৳) <em>শেষে কম নিলে</em></span><input type="text" class="num" id="mDisc" inputmode="decimal" autocomplete="off" value="'+esc(st.discount?shown(st.discount):'')+'"></label>'+
        '<fieldset class="field"><legend>কাজের অবস্থা</legend><div class="seg2" id="mStSeg"><button type="button" data-sst="active" aria-pressed="'+(M.sstatus!=='done')+'">চলমান</button><button type="button" data-sst="done" aria-pressed="'+(M.sstatus==='done')+'">শেষ হয়েছে</button></div><p class="hint">শেষ হওয়া সাইট হিসাব লেখার তালিকায় আর আসবে না, তবে তার হিসাব থেকে যাবে।</p></fieldset>':'')+
      '<label class="field"><span>নোট <em>ইচ্ছা হলে</em></span><input type="text" id="mNote" autocomplete="off" value="'+esc(st.notes||'')+'"></label>';
    if(mode==='site-edit'&&!siteSum(st.id).n)del='সাইট মুছে ফেলুন';
  }else if(mode==='site-pay'){
    var sp=o.site;M.site=sp;M.rec=o.rec||null;
    title=sp.name+' থেকে টাকা পেলাম';
    body=(sitePriced(sp)?'<p class="from">এখন বাকি: '+tka(siteDue(sp))+'</p>':'')+payFields(o.rec)+'<p class="hint">কোনো ভেকুর দৈনিক হিসাবের সঙ্গে না লিখে সরাসরি সাইটের নামে টাকা পাওয়া লিখুন। টাকাটা "ক্যাশ ও মালিক" পাতায় আপনার হাতে যোগ হবে।</p>';
    if(o.rec)del='মুছে ফেলুন';
  }else if(mode==='site-settle'){
    var ss=o.site;M.site=ss;var dd=siteDue(ss);
    title=ss.name+'-এর হিসাব মেটান';save='হিসাব মেটান';
    body='<dl class="facts">'+fact(ss.bill_type==='contract'?'চুক্তির টাকা':'বিল',siteGross(ss))+(+ss.discount>0?fact('আগে ছাড়',+ss.discount):'')+fact('পেয়েছেন',siteReceived(ss))+fact('বাকি',dd,'neg')+'</dl>'+
      '<label class="field"><span>কত টাকা ছাড় দিলেন (৳)</span><input type="text" class="num key" id="mAmount" inputmode="decimal" autocomplete="off" value="'+esc(shown(Math.round(dd)))+'"></label>'+
      '<label class="check"><input type="checkbox" id="mDone" checked> <span>সাইটের কাজ শেষ, তালিকা থেকে সরিয়ে রাখুন</span></label>'+
      '<p class="hint">বাকি টাকা আর পাবেন না, এমন হলে এখানে ছাড় লিখুন। ছাড় লাভ থেকে বাদ যাবে, আর সাইটের বাকি শূন্য হবে।</p>';
  }else if(mode==='owner-tx'){
    var ox=o.rec||null;M.rec=ox;M.okind=ox?ox.kind:(o.kind||'take');M.oid=ox?ox.owner_id:o.ownerId;
    title=ownerName(M.oid)+(ox?' · লেনদেন বদলান':'');
    body='<fieldset class="field"><legend>কী হলো</legend><div class="seg2" id="mOkSeg"><button type="button" data-okind="take" aria-pressed="'+(M.okind==='take')+'">ব্যবসা থেকে টাকা নিলেন</button><button type="button" data-okind="give" aria-pressed="'+(M.okind==='give')+'">ব্যবসায় টাকা দিলেন</button></div></fieldset>'+
      '<div class="grid2"><label class="field"><span>তারিখ</span><input type="date" id="mDate" value="'+esc(ox?ox.date:todayISO())+'"></label><label class="field"><span>কত টাকা</span><input type="text" class="num key" id="mAmount" inputmode="decimal" autocomplete="off" placeholder="৳" value="'+esc(ox?shown(ox.amount):(o.amount?shown(o.amount):''))+'"></label></div>'+
      '<label class="field"><span>নোট <em>ইচ্ছা হলে</em></span><input type="text" id="mNote" autocomplete="off" value="'+esc(ox?ox.note||'':(o.note||''))+'"></label>';
    if(ox)del='মুছে ফেলুন';
  }else if(mode==='my-password'){
    title='আপনার পাসওয়ার্ড বদলান';save='বদলান';
    body='<label class="field"><span>নতুন পাসওয়ার্ড <em>কমপক্ষে ৬ অক্ষর</em></span><span class="pw"><input type="password" id="mPass" autocomplete="new-password"><button type="button" data-pw="mPass">দেখুন</button></span></label>';
  }
  M.driver=d;
  $('#miniTitle').textContent=title;$('#miniBody').innerHTML=body;
  if(d&&$('#mRate'))$('#mRate').value=d.rate?shown(d.rate):'';
  var db_=$('#mDel');db_.hidden=!del;db_.textContent=del;db_.classList.remove('armed');M.delText=del;
  $('#mCancel').hidden=mode==='login-done';
  $('#mErr').hidden=true;var s=$('#mSave');s.disabled=false;s.textContent=save;
  if(!mini.open){try{mini.showModal();}catch(e){mini.setAttribute('open','');}}
}
function closeMini(){try{mini.close();}catch(e){mini.removeAttribute('open');}}
function mErr(t){var e=$('#mErr');e.textContent=t;e.hidden=false;}
function readWage(){
  var rate=num(($('#mRate')||{}).value);
  if(M.wage!=='manual'&&!(rate>0))return {err:M.wage==='hour'?'প্রতি ঘণ্টা কত টাকা মজুরি, লিখুন।':'প্রতি দিন কত টাকা মজুরি, লিখুন।'};
  return {rate_type:M.wage,rate:M.wage==='manual'?0:rate};
}
async function submitMini(ev){
  ev.preventDefault();
  var b=$('#mSave'),label=b.textContent,mode=M.mode;
  function busy(){b.disabled=true;b.textContent='অপেক্ষা করুন…';}
  try{
    if(mode==='login-done'){closeMini();return;}
    if(mode==='driver-new'||mode==='driver-edit'){
      var name=$('#mName').value.trim();if(!name)return mErr('ড্রাইভারের নাম লিখুন।');
      var w=readWage();if(w.err)return mErr(w.err);
      var phRaw=$('#mPhone').value.trim(),ph=normPhone(phRaw);
      if(mode==='driver-new'){
        var login=$('#mLogin').checked;
        if(login){
          if(!ph)return mErr('লগইনের জন্য ঠিক মোবাইল নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮।');
          var pw=$('#mPass').value.trim();if(pw.length<6)return mErr('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।');
          busy();
          await fn({action:'create_login',name:name,phone:ph,password:pw,rate_type:w.rate_type,rate:w.rate});
          await reloadDrivers();render();
          openMini('login-done',{phone:bnPhone(ph),password:pw});return;
        }
        busy();
        await q(sb.from('drivers').insert({name:name,phone:ph||phRaw,rate_type:w.rate_type,rate:w.rate}));
        toast('ড্রাইভার যোগ হয়েছে');
      }else{
        busy();
        var upd={name:name,rate_type:w.rate_type,rate:w.rate};if(!M.driver.user_id)upd.phone=ph||phRaw;
        await q(sb.from('drivers').update(upd).eq('id',M.driver.id));
        toast('ড্রাইভারের তথ্য বদলানো হয়েছে');
      }
      await reloadDrivers();
    }else if(mode==='login-give'){
      var ph2=normPhone($('#mPhone').value);if(!ph2)return mErr('ঠিক মোবাইল নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮।');
      var pw2=$('#mPass').value.trim();if(pw2.length<6)return mErr('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।');
      busy();
      await fn({action:'create_login',driver_id:M.driver.id,phone:ph2,password:pw2});
      await reloadDrivers();render();
      openMini('login-done',{phone:bnPhone(ph2),password:pw2});return;
    }else if(mode==='login-reset'){
      var pw3=$('#mPass').value.trim();if(pw3.length<6)return mErr('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।');
      busy();
      await fn({action:'set_password',driver_id:M.driver.id,password:pw3});
      openMini('login-done',{phone:bnPhone(M.driver.phone),password:pw3});return;
    }else if(mode==='login-remove'){
      busy();await fn({action:'remove_login',driver_id:M.driver.id});await reloadDrivers();toast('লগইন বন্ধ করা হয়েছে');
    }else if(mode==='pay-driver'||mode==='pay-shop'){
      var date=$('#mDate').value,amount=num($('#mAmount').value);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return mErr('তারিখ দিন।');
      if(!(amount>0))return mErr('কত টাকা, লিখুন।');
      var rec={date:date,amount:amount,note:$('#mNote').value.trim()};
      busy();
      var table=mode==='pay-driver'?'driver_payments':'shop_payments';
      if(M.rec)await q(sb.from(table).update(rec).eq('id',M.rec.id));
      else{if(mode==='pay-driver')rec.driver_id=M.id;else rec.shop=M.shop;await q(sb.from(table).insert(rec));}
      await reloadBal();
      toast('সংরক্ষিত হয়েছে');
    }else if(mode==='shop-new'){
      var nm=$('#mName').value.trim();if(!nm)return mErr('দোকান বা পাম্পের নাম লিখুন।');
      if(shopNames().indexOf(nm)>=0)return mErr('এই নাম আগেই তালিকায় আছে।');
      busy();var s=clone(S.settings);s.shops.push(nm);await saveSettings(s);toast('তালিকায় যোগ হয়েছে');
    }else if(mode==='site-new'||mode==='site-edit'){
      var sn=$('#mName').value.trim();if(!sn)return mErr('সাইটের নাম লিখুন।');
      var dup=siteByName(sn);if(dup&&(!M.site||dup.id!==M.site.id))return mErr('এই নামে আগেই একটি সাইট আছে।');
      var old=M.site||{},bt=M.btype;
      var rec2={name:sn,client:$('#mClient').value.trim(),phone:$('#mPhone').value.trim(),address:$('#mAddr').value.trim(),notes:$('#mNote').value.trim(),bill_type:bt,
        rate:bt==='hour'?num($('#mRate').value):(+old.rate||0),contract_amount:bt==='contract'?num($('#mContract').value):(+old.contract_amount||0)};
      if(bt==='contract'&&!(rec2.contract_amount>0))return mErr('চুক্তির মোট টাকা লিখুন।');
      if(mode==='site-edit'){rec2.status=M.sstatus;rec2.discount=num($('#mDisc').value);}
      busy();
      if(mode==='site-new')await q(sb.from('sites').insert(rec2));
      else{
        var oldRate=+old.rate||0;
        if(bt==='hour'&&rec2.rate!==oldRate){
          var ap=$('#mApplyOld');
          if(ap&&ap.checked)await q(sb.from('entries').update({rate:rec2.rate}).eq('site_id',old.id));
          else if(oldRate>0)await q(sb.from('entries').update({rate:oldRate}).eq('site_id',old.id).eq('rate',0));
        }
        await q(sb.from('sites').update(rec2).eq('id',old.id));
      }
      await Promise.all([reloadSites(),reloadBal(),reloadYear()]);toast(mode==='site-new'?'সাইট যোগ হয়েছে':'সাইটের তথ্য বদলানো হয়েছে');
    }else if(mode==='site-pay'){
      var pd=$('#mDate').value,pa=num($('#mAmount').value);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(pd))return mErr('তারিখ দিন।');
      if(!(pa>0))return mErr('কত টাকা পেলেন, লিখুন।');
      busy();
      var pr={date:pd,amount:pa,note:$('#mNote').value.trim()};
      if(M.rec)await q(sb.from('site_payments').update(pr).eq('id',M.rec.id));else{pr.site_id=M.site.id;await q(sb.from('site_payments').insert(pr));}
      await Promise.all([reloadSitePays(),reloadBal()]);toast('টাকা পাওয়া লেখা হয়েছে');
    }else if(mode==='site-settle'){
      var da=num($('#mAmount').value);if(da<0)return mErr('ছাড়ের টাকা ঠিক নেই।');
      busy();
      var up={discount:(+M.site.discount||0)+da};if($('#mDone').checked)up.status='done';
      await q(sb.from('sites').update(up).eq('id',M.site.id));
      await Promise.all([reloadSites(),reloadBal()]);toast('হিসাব মেটানো হয়েছে');
    }else if(mode==='owner-tx'){
      var od=$('#mDate').value,oa=num($('#mAmount').value);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(od))return mErr('তারিখ দিন।');
      if(!(oa>0))return mErr('কত টাকা, লিখুন।');
      busy();
      var orc={date:od,amount:oa,kind:M.okind,note:$('#mNote').value.trim()};
      if(M.rec)await q(sb.from('owner_tx').update(orc).eq('id',M.rec.id));else{orc.owner_id=M.oid;await q(sb.from('owner_tx').insert(orc));}
      await reloadOwnerTx();toast(M.okind==='take'?'টাকা নেওয়া লেখা হয়েছে':'টাকা দেওয়া লেখা হয়েছে');
    }else if(mode==='my-password'){
      var pw4=$('#mPass').value;if(pw4.length<6)return mErr('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।');
      busy();var r=await sb.auth.updateUser({password:pw4});if(r.error)throw r.error;toast('পাসওয়ার্ড বদলানো হয়েছে');
    }
    closeMini();render();
  }catch(e){mErr(e&&e.code&&FNERR[e.code]?FNERR[e.code]:(mode.indexOf('login')===0||mode==='driver-new'?fnErrText(e):errText(e)));}
  finally{b.disabled=false;if(M.mode===mode)b.textContent=label;}
}
async function delMini(){
  var b=$('#mDel');
  if(!M.delArmed){M.delArmed=true;b.textContent='নিশ্চিত? '+M.delText;b.classList.add('armed');setTimeout(function(){if(M.delArmed){M.delArmed=false;b.textContent=M.delText;b.classList.remove('armed');}},4000);return;}
  b.disabled=true;
  try{
    if(M.mode==='site-pay'){await q(sb.from('site_payments').delete().eq('id',M.rec.id));await Promise.all([reloadSitePays(),reloadBal()]);toast('মুছে ফেলা হয়েছে');}
    else if(M.mode==='owner-tx'){await q(sb.from('owner_tx').delete().eq('id',M.rec.id));await reloadOwnerTx();toast('মুছে ফেলা হয়েছে');}
    else if(M.mode==='site-edit'){await q(sb.from('sites').delete().eq('id',M.site.id));await reloadSites();if(S.openSite===M.site.id)S.openSite=null;toast('সাইট মুছে ফেলা হয়েছে');}
    else if(M.mode==='driver-edit'){await q(sb.from('drivers').update({active:false}).eq('id',M.driver.id));await reloadDrivers();toast('তালিকা থেকে সরানো হয়েছে');}
    else if(M.mode==='pay-driver'){await q(sb.from('driver_payments').delete().eq('id',M.rec.id));await reloadBal();toast('মুছে ফেলা হয়েছে');}
    else if(M.mode==='pay-shop'){await q(sb.from('shop_payments').delete().eq('id',M.rec.id));await reloadBal();toast('মুছে ফেলা হয়েছে');}
    closeMini();render();
  }catch(e){mErr(errText(e));}
  finally{b.disabled=false;}
}

/* ---------- CSV ---------- */
function downloadCSV(col){
  var v=S.veku,rows=col==='entries'?rowsE(v):rowsR(v);
  function qq(s){return '"'+String(s==null?'':s).replace(/"/g,'""')+'"';}
  var L=[[qq(vName(v)),qq(col==='entries'?'ভেকুর দৈনিক হিসাব':'অন্যান্য ও মেরামত খরচ'),qq((S.month?MONTHS[S.month-1]+' ':'')+S.year)]];
  if(col==='entries'){
    L.push(['ক্রমিক নং','তারিখ','সাইট','সময় (ঘণ্টা)','ডিজেল (লিটার)','ডিজেলের খরচ (৳)','ডিজেল কোথা থেকে','নগদ/বাকি','জমার পরিমাণ (৳)','ভেকুর ড্রাইভার (৳)','ড্রাইভার','মন্তব্য'].map(qq));
    var t=[0,0,0,0,0];
    rows.forEach(function(r,i){L.push([i+1,r.date,qq(siteName(r)),+r.hours||0,+r.litres||0,+r.fuel_cost||0,qq(r.fuel_src),qq(PAYL[r.fuel_pay]||''),+r.deposit||0,+r.driver_wage||0,qq(r.driver_id?driverName(r.driver_id):''),qq(r.remarks)]);
      t[0]+=+r.hours||0;t[1]+=+r.litres||0;t[2]+=+r.fuel_cost||0;t[3]+=+r.deposit||0;t[4]+=+r.driver_wage||0;});
    L.push(['',qq('মোট'),'',t[0],t[1],t[2],'','',t[3],t[4],'','']);
  }else{
    L.push(['ক্রমিক নং','তারিখ','ধরন','খরচের বিবরণ','টাকা (৳)','মন্তব্য'].map(qq));
    var tot=0;rows.forEach(function(r,i){tot+=+r.amount||0;L.push([i+1,r.date,qq(r.kind),qq(r.description),+r.amount||0,qq(r.remarks)]);});
    L.push(['',qq('মোট'),'','',tot,'']);
  }
  var text='﻿'+L.map(function(l){return l.join(',');}).join('\r\n');
  saveFile((col==='entries'?'daily':'repair')+'-veku'+(v==='v1'?'1':'2')+'-'+S.year+(S.month?'-'+pad(S.month):'')+'.csv',text);
}
function saveFile(fname,text){
  try{
    var url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
    var a=document.createElement('a');a.href=url;a.download=fname;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(url);a.remove();},1000);
  }catch(e){toast('ফাইল নামানো যায়নি');}
}

/* ---------- copy ---------- */
function copyText(txt,el){
  function sel(){if(!el)return;try{var r=document.createRange();r.selectNodeContents(el);var s=window.getSelection();s.removeAllRanges();s.addRange(r);toast('বেছে নেওয়া হয়েছে, কপি করুন');}catch(e){}}
  try{navigator.clipboard.writeText(txt).then(function(){toast('কপি হয়েছে');},sel);}catch(e){sel();}
}

/* ---------- events: auth ---------- */
document.addEventListener('click',function(e){var b=e.target.closest('[data-pw]');if(!b)return;var i=document.getElementById(b.dataset.pw);if(!i)return;var show=i.type==='password';i.type=show?'text':'password';b.textContent=show?'লুকান':'দেখুন';});
$('#loginForm').addEventListener('submit',async function(ev){
  ev.preventDefault();
  var err=$('#lErr');err.hidden=true;
  var ph=normPhone($('#lPhone').value),pw=$('#lPass').value;
  if(!ph){err.textContent='ঠিক মোবাইল নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮।';err.hidden=false;return;}
  if(!pw){err.textContent='পাসওয়ার্ড দিন।';err.hidden=false;return;}
  var b=$('#lBtn');b.disabled=true;b.textContent='লগইন হচ্ছে…';
  try{
    var r=await withTimeout(sb.auth.signInWithPassword({email:phoneEmail(ph),password:pw}),20000);
    if(r.error){var m=String(r.error.message||'');err.textContent=/invalid|credentials/i.test(m)?'মোবাইল নম্বর বা পাসওয়ার্ড ভুল।':errText(r.error);err.hidden=false;return;}
    S.user=r.data.user;$('#lPass').value='';await enter();
  }catch(e2){err.textContent=errText(e2);err.hidden=false;}
  finally{b.disabled=false;b.textContent='লগইন';}
});
$('#setupForm').addEventListener('submit',async function(ev){
  ev.preventDefault();
  var err=$('#sErr');err.hidden=true;
  var name=$('#sName').value.trim(),ph=normPhone($('#sPhone').value),pw=$('#sPass').value,code=$('#sCode').value.trim();
  function bad(m){err.textContent=m;err.hidden=false;}
  if(!name)return bad('আপনার নাম লিখুন।');
  if(!ph)return bad('ঠিক মোবাইল নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮।');
  if(pw.length<6)return bad('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।');
  if(!code)return bad('চালু করার কোড দিন।');
  var b=$('#sBtn');b.disabled=true;b.textContent='অপেক্ষা করুন…';
  try{
    await fn({action:'setup',name:name,phone:ph,password:pw,code:code});
    var r=await sb.auth.signInWithPassword({email:phoneEmail(ph),password:pw});
    if(r.error)throw r.error;
    S.user=r.data.user;S.needSetup=false;await enter();
    if(S.role==='owner'){S.tab='owners';render();toast('অ্যাকাউন্ট খোলা হয়েছে। প্রথমে মালিকদের নাম আর অংশ ঠিক করুন।');}
  }catch(e2){if(e2&&e2.code==='owner_exists'){S.needSetup=false;render();}bad(fnErrText(e2));}
  finally{b.disabled=false;b.textContent='অ্যাকাউন্ট খুলুন';}
});
$('#drvLogout').addEventListener('click',logout);

/* ---------- events: owner ---------- */
$('#selMonth').addEventListener('change',function(e){S.month=+e.target.value;render();});
$('#selYear').addEventListener('change',async function(e){S.year=+e.target.value;$('#main').innerHTML=loadingHTML();try{await reloadYear();}catch(err){toast(errText(err));}render();});
$('#tabs').addEventListener('click',function(e){
  var b=e.target.closest('button[data-tab]');if(!b)return;
  if(S.tab==='owners'&&S.ownersDirty&&b.dataset.tab!=='owners')toast('সেটিংস এখনও সংরক্ষণ হয়নি');
  S.tab=b.dataset.tab;if(S.tab==='owners'&&!S.ownersDirty)S.ownersDraft=null;
  if(S.tab==='approve')refreshPending();
  render();window.scrollTo(0,0);
  try{b.scrollIntoView({inline:'nearest',block:'nearest'});}catch(err){}
});
$('#fab').addEventListener('click',function(){openSheet(S.tab==='repair'?'repair':'entry',null);});
function rowOpen(tr){var col=tr.dataset.col,id=tr.dataset.id;var rec=S[col].filter(function(x){return x.id===id;})[0];if(rec)openSheet(col==='entries'?'entry':'repair',rec);}
function siteGo(id){S.tab='sites';S.openSite=id;render();window.scrollTo(0,0);}
function sentryOpen(tr){var rec=(S.siteStmt[S.openSite]||[]).filter(function(r){return r.id===tr.dataset.sentry;})[0];if(rec)openSheet('entry',rec);}
function mineOpen(li){var rec=S.mine.filter(function(x){return x.id===li.dataset.mine;})[0];if(rec&&(rec.status||'pending')==='pending'){resetDrv(rec);window.scrollTo(0,0);$('#dHours').focus();}}
function dpayOpen(el){var id=S.openDriver,rec=(S.stmt[id]||[]).filter(function(x){return x.id===el.dataset.dpay&&x.kind==='paid';})[0];if(rec)openMini('pay-driver',{id:id,rec:rec});}
function spayOpen(el){var nm=S.openShop,rec=(S.shopStmt[nm]||[]).filter(function(x){return x.id===el.dataset.spay&&x.kind==='paid';})[0];if(rec)openMini('pay-shop',{shop:nm,rec:rec});}
document.addEventListener('click',function(e){
  var t=e.target,x;
  if(t.closest('#sheet'))return;
  if((x=t.closest('#mini [data-w]'))){M.wage=x.dataset.w;document.querySelectorAll('#mWageSeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.w===M.wage));});var rw=$('#mRateWrap');if(rw){rw.hidden=M.wage==='manual';$('#mRateLbl').textContent=M.wage==='day'?'প্রতি দিন কত টাকা':'প্রতি ঘণ্টা কত টাকা';}return;}
  if((x=t.closest('#mini [data-bt]'))){M.btype=x.dataset.bt;document.querySelectorAll('#mBillSeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.bt===M.btype));});$('#mHourWrap').hidden=M.btype==='contract';$('#mContractWrap').hidden=M.btype!=='contract';return;}
  if((x=t.closest('#mini [data-okind]'))){M.okind=x.dataset.okind;document.querySelectorAll('#mOkSeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.okind===M.okind));});return;}
  if((x=t.closest('#mini [data-sst]'))){M.sstatus=x.dataset.sst;document.querySelectorAll('#mStSeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.sst===M.sstatus));});return;}
  if((x=t.closest('#mini [data-genpw]'))){var inp=document.getElementById(x.dataset.genpw);if(inp)inp.value=genPw();return;}
  if((x=t.closest('#mini [data-mgo]'))){openMini(x.dataset.mgo,{driver:M.driver});return;}
  if((x=t.closest('#mini [data-copycred]'))){copyText(M.cred,$('#credBox'));return;}
  if(t.closest('#mini'))return;
  var a=t.closest('[data-act]');
  if(a){
    var act=a.dataset.act;
    if(act==='logout')logout();
    else if(act==='reload')location.reload();
    else if(act==='retry')enter();
    else if(act==='refresh'){if(S.role==='owner')refreshPending().then(render);else loadDriver().then(render).catch(function(err){toast(errText(err));});}
    else if(act==='add-owner'){S.ownersDraft.owners.push({id:uid(),name:'',s1:0,s2:0});S.ownersDirty=true;renderOwnersPanel();var n=$('#o-name-'+(S.ownersDraft.owners.length-1));if(n)n.focus();}
    else if(act==='reset-owners'){S.ownersDraft=null;S.ownersDirty=false;render();}
    else if(act==='save-owners')saveOwners(a);
    else if(act==='add-driver')openMini('driver-new',{});
    else if(act==='add-shop')openMini('shop-new',{});
    else if(act==='add-site')openMini('site-new',{});
    else if(act==='season-calc')calcSeason();
    else if(act==='season-close')closeSeason(a);
    else if(act==='my-password')openMini('my-password',{});
    else if(act==='my-stmt'){S.openMine=!S.openMine;render();}
    return;
  }
  if((x=t.closest('[data-sitepay]'))){openMini('site-pay',{site:siteBy(x.dataset.sitepay)});return;}
  if((x=t.closest('[data-sitesettle]'))){openMini('site-settle',{site:siteBy(x.dataset.sitesettle)});return;}
  if((x=t.closest('tr[data-spx]'))){var spr=S.sitePays.filter(function(y){return y.id===x.dataset.spx;})[0];if(spr)openMini('site-pay',{site:siteBy(spr.site_id),rec:spr});return;}
  if((x=t.closest('[data-otx]'))){openMini('owner-tx',{ownerId:x.dataset.otx,kind:x.dataset.kind});return;}
  if((x=t.closest('tr[data-otxe]'))){var otr=S.ownerTx.filter(function(y){return y.id===x.dataset.otxe;})[0];if(otr)openMini('owner-tx',{rec:otr});return;}
  if((x=t.closest('[data-seapay]'))){openMini('owner-tx',{ownerId:x.dataset.seapay,kind:'take',amount:+x.dataset.amt,note:'সিজনের ভাগ'});return;}
  if((x=t.closest('[data-siteopen]'))){var sid=x.dataset.siteopen;S.openSite=S.openSite===sid?null:sid;render();return;}
  if((x=t.closest('[data-siteadd]'))){openSheet('entry',null,null,{siteId:x.dataset.siteadd});return;}
  if((x=t.closest('[data-siteedit]'))){openMini('site-edit',{site:siteBy(x.dataset.siteedit)});return;}
  if((x=t.closest('[data-sitecsv]'))){downloadSiteCSV(x.dataset.sitecsv);return;}
  if((x=t.closest('tr[data-sitego]'))){siteGo(x.dataset.sitego);return;}
  if((x=t.closest('tr[data-sentry]'))){sentryOpen(x);return;}
  if((x=t.closest('[data-digits]'))){setDigits(x.dataset.digits==='latn');return;}
  if((x=t.closest('[data-copy]'))){var el=document.getElementById(x.dataset.copy);if(el)copyText(el.textContent,el);return;}
  if((x=t.closest('[data-rm]'))){S.ownersDraft.owners.splice(+x.dataset.rm,1);S.ownersDirty=true;renderOwnersPanel();return;}
  if((x=t.closest('[data-apgo]'))){quickApprove(x.dataset.apgo,x);return;}
  if((x=t.closest('[data-approve]'))){var pr=S.pending.filter(function(y){return y.id===x.dataset.approve;})[0];if(pr)openSheet('entry',null,pr);return;}
  if((x=t.closest('[data-add]'))){openSheet(x.dataset.add,null);return;}
  if((x=t.closest('[data-go]'))){S.tab=x.dataset.go;if(x.dataset.veku)S.veku=x.dataset.veku;render();window.scrollTo(0,0);return;}
  if((x=t.closest('.vswitch [data-veku]'))){S.veku=x.dataset.veku;render();return;}
  if((x=t.closest('[data-csv]'))){downloadCSV(x.dataset.csv);return;}
  if((x=t.closest('[data-dpaynew]'))){openMini('pay-driver',{id:x.dataset.dpaynew});return;}
  if((x=t.closest('[data-dopen]'))){var did=x.dataset.dopen;S.openDriver=S.openDriver===did?null:did;render();return;}
  if((x=t.closest('[data-dedit]'))){openMini('driver-edit',{driver:driverBy(x.dataset.dedit)});return;}
  if((x=t.closest('[data-drestore]'))){q(sb.from('drivers').update({active:true}).eq('id',x.dataset.drestore)).then(reloadDrivers).then(function(){toast('ফিরিয়ে আনা হয়েছে');render();},function(err){toast(errText(err));});return;}
  if((x=t.closest('[data-spaynew]'))){openMini('pay-shop',{shop:x.dataset.spaynew});return;}
  if((x=t.closest('[data-sopen]'))){var sn=x.dataset.sopen;S.openShop=S.openShop===sn?null:sn;render();return;}
  if((x=t.closest('[data-sremove]'))){var s=clone(S.settings),nm=x.dataset.sremove;s.shops=s.shops.filter(function(z){return z!==nm;});saveSettings(s).then(function(){toast('তালিকা থেকে সরানো হয়েছে');render();},function(err){toast(errText(err));});return;}
  if((x=t.closest('tr[data-month]'))){S.month=+x.dataset.month;render();window.scrollTo(0,0);return;}
  if((x=t.closest('tr[data-id]'))){rowOpen(x);return;}
  if((x=t.closest('tr[data-dpay]'))){dpayOpen(x);return;}
  if((x=t.closest('tr[data-spay]'))){spayOpen(x);return;}
  if((x=t.closest('[data-mine]'))){mineOpen(x);return;}
});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='mLogin'){$('#mPwWrap').hidden=!e.target.checked;if(e.target.checked&&!$('#mPass').value)$('#mPass').value=genPw();}});
document.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&e.target&&e.target.dataset&&e.target.dataset.apdep){e.preventDefault();var bt=document.querySelector('[data-apgo="'+e.target.dataset.apdep+'"]');if(bt)quickApprove(e.target.dataset.apdep,bt);return;}
  if(!(e.key==='Enter'||e.key===' ')||!e.target.matches)return;
  var t=e.target;
  if(t.matches('tr[data-id]')){e.preventDefault();rowOpen(t);}
  else if(t.matches('[data-mine]')){e.preventDefault();mineOpen(t);}
  else if(t.matches('tr[data-dpay]')){e.preventDefault();dpayOpen(t);}
  else if(t.matches('tr[data-spay]')){e.preventDefault();spayOpen(t);}
  else if(t.matches('tr[data-month]')){e.preventDefault();S.month=+t.dataset.month;render();}
  else if(t.matches('tr[data-sitego]')){e.preventDefault();siteGo(t.dataset.sitego);}
  else if(t.matches('tr[data-sentry]')){e.preventDefault();sentryOpen(t);}
  else if(t.matches('tr[data-spx],tr[data-otxe]')){e.preventDefault();t.click();}
});
$('#main').addEventListener('input',function(e){if(e.target&&e.target.dataset&&e.target.dataset.apdep)S.apDep[e.target.dataset.apdep]=e.target.value;});
$('#main').addEventListener('change',function(e){var d=e.target&&e.target.dataset&&e.target.dataset.sea;if(d==='from')S.seasonFrom=e.target.value;else if(d==='to')S.seasonTo=e.target.value;});
$('#main').addEventListener('input',function(e){
  var el=e.target,d=S.ownersDraft;if(!d||S.tab!=='owners')return;
  if(el.dataset.k){var o=d.owners[+el.dataset.i];if(!o)return;o[el.dataset.k]=el.dataset.k==='name'?el.value:num(el.value);markOwnersDirty();}
  else if(el.dataset.vn){d.vekus[el.dataset.vn].name=el.value;markOwnersDirty();}
  else if(el.dataset.rate){d.diesel_rate=num(el.value);markOwnersDirty();}
});
async function closeSeason(btn){
  if(!S.season||!S.season.to)return;
  if(!btn.classList.contains('armed')){btn.classList.add('armed');btn.dataset.t=btn.textContent;btn.textContent='নিশ্চিত? সিজন শেষ করুন';setTimeout(function(){if(btn.isConnected){btn.classList.remove('armed');btn.textContent=btn.dataset.t;}},4000);return;}
  var next=addDays(S.season.to,1);btn.disabled=true;
  try{await q(sb.from('settings').update({season_start:next}).eq('id',1));S.settings.season_start=next;S.seasonFrom='';S.seasonTo='';S.season=null;toast('নতুন সিজন '+DFY.format(toDate(next))+' থেকে শুরু');render();}
  catch(e){btn.disabled=false;toast(errText(e));}
}
async function saveOwners(btn){
  var d=clone(S.ownersDraft);
  d.owners=d.owners.map(function(o,i){return {id:o.id||uid(),name:(o.name||'').trim()||('মালিক '+DIG(i+1)),s1:+o.s1||0,s2:+o.s2||0};});
  VK.forEach(function(v){d.vekus[v].name=(d.vekus[v].name||'').trim()||('ভেকু '+PLATE[v]);});
  d.shops=S.settings.shops.slice();
  btn.disabled=true;btn.textContent='সংরক্ষণ হচ্ছে…';
  try{await saveSettings(d);S.ownersDirty=false;S.ownersDraft=null;toast('সংরক্ষিত হয়েছে');render();}
  catch(e){btn.disabled=false;btn.textContent='সংরক্ষণ করুন';toast(errText(e));}
}

/* sheet events */
$('#typeSeg').addEventListener('click',function(e){var b=e.target.closest('[data-type]');if(b)setType(b.dataset.type);});
$('#vekuSeg').addEventListener('click',function(e){var b=e.target.closest('[data-sv]');if(b)setVeku(b.dataset.sv);});
$('#kindSeg').addEventListener('click',function(e){var b=e.target.closest('[data-kind]');if(b)setKind(b.dataset.kind);});
$('#fPaySeg').addEventListener('click',function(e){var b=e.target.closest('[data-pay]');if(b)setFPay(F.pay===b.dataset.pay?'':b.dataset.pay);});
$('#fSiteSel').addEventListener('change',function(){F.siteTouched=true;var isNew=this.value==='__new';$('#fSiteNewWrap').hidden=!isNew;if(isNew)setTimeout(function(){$('#fSiteNew').focus();},30);});
$('#fLitres').addEventListener('input',autoFuel);
$('#fFuel').addEventListener('input',function(){F.fuelTouched=$('#fFuel').value.trim()!=='';});
$('#fHours').addEventListener('input',autoWage);
$('#fDrvSel').addEventListener('change',function(){F.wageTouched=false;autoWage();});
$('#fDriver').addEventListener('input',function(){F.wageTouched=$('#fDriver').value.trim()!=='';});
$('#sheetForm').addEventListener('submit',submitSheet);
$('#sheetClose').addEventListener('click',closeSheet);
$('#cancelBtn').addEventListener('click',closeSheet);
$('#delBtn').addEventListener('click',async function(){
  var b=$('#delBtn'),ap=F.approve;
  if(!F.delArmed){F.delArmed=true;b.textContent=ap?'নিশ্চিত? নাকচ করুন':'নিশ্চিত? মুছে ফেলুন';b.classList.add('armed');setTimeout(function(){if(F.delArmed){F.delArmed=false;b.textContent=ap?'নাকচ করুন':'মুছে ফেলুন';b.classList.remove('armed');}},4000);return;}
  b.disabled=true;
  try{
    if(ap){
      await q(sb.from('submissions').update({status:'rejected',decided_at:new Date().toISOString()}).eq('id',ap.id));
      S.pending=await qPending()||[];closeSheet();toast('হিসাবটি নাকচ করা হয়েছে');
    }else{
      var col=F.type==='entry'?'entries':'repairs';
      await q(sb.from(col).delete().eq('id',F.id));
      closeSheet();toast('হিসাব মুছে ফেলা হয়েছে');
      var jobs=[reloadYear()];if(col==='entries')jobs.push(reloadBal());await Promise.all(jobs);
    }
    render();
  }catch(e){showErr(errText(e));}
  finally{b.disabled=false;}
});
$('#miniForm').addEventListener('submit',submitMini);
$('#miniClose').addEventListener('click',closeMini);
$('#mCancel').addEventListener('click',closeMini);
$('#mDel').addEventListener('click',delMini);

/* driver form events */
$('#dSiteSel').addEventListener('change',function(){var isNew=this.value==='__new';$('#dSiteNewWrap').hidden=!isNew;if(isNew)setTimeout(function(){$('#dSiteNew').focus();},30);});
$('#dVekuSeg').addEventListener('click',function(e){var b=e.target.closest('[data-dv]');if(b){D.veku=b.dataset.dv;drvVekuSeg();}});
$('#dLitres').addEventListener('input',dFuelCalc);
$('#dRate').addEventListener('input',dFuelCalc);
$('#drvForm').addEventListener('submit',submitDrv);
$('#dCancel').addEventListener('click',function(){resetDrv(null);});
$('#dDel').addEventListener('click',async function(){
  var b=$('#dDel');
  if(!D.delArmed){D.delArmed=true;b.textContent='নিশ্চিত? মুছে ফেলুন';b.classList.add('armed');setTimeout(function(){if(D.delArmed){D.delArmed=false;b.textContent='মুছে ফেলুন';b.classList.remove('armed');}},4000);return;}
  b.disabled=true;
  try{
    var rows=await q(sb.from('submissions').delete().eq('id',D.id).select('id'));
    resetDrv(null);await loadDriver();render();
    toast(rows&&rows.length?'হিসাব মুছে ফেলা হয়েছে':'মালিক এরই মধ্যে দেখে ফেলেছেন, তাই মোছা যায়নি');
  }catch(e){dErr(errText(e));}
  finally{b.disabled=false;}
});

boot();
})();
