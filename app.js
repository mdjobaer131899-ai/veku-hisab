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
var NF0=new Intl.NumberFormat('bn-BD',{maximumFractionDigits:0});
var NF1=new Intl.NumberFormat('bn-BD',{maximumFractionDigits:1});
var NF2=new Intl.NumberFormat('bn-BD',{maximumFractionDigits:2});
var NFI=new Intl.NumberFormat('bn-BD',{useGrouping:false,maximumFractionDigits:2});
function DIG(n){return NFI.format(n);}
function tk(n){n=Math.round(+n||0);return (n<0?'−':'')+'৳'+NF0.format(Math.abs(n));}
function amt(n){n=Math.round(+n||0);return (n<0?'−':'')+NF0.format(Math.abs(n));}
function q1(n){return NF1.format(+n||0);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return String(n).padStart(2,'0');}
var MONTHS=[];for(var i=0;i<12;i++){MONTHS.push(new Intl.DateTimeFormat('bn-BD',{month:'long'}).format(new Date(2026,i,1)));}
var DF=new Intl.DateTimeFormat('bn-BD',{day:'numeric',month:'short'});
var DFY=new Intl.DateTimeFormat('bn-BD',{day:'numeric',month:'short',year:'numeric'});
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
function bnPhone(p){return String(p||'').replace(/\d/g,function(d){return BN.charAt(+d);});}

/* ---------- settings ---------- */
function normVekus(v){v=v||{};return {v1:{name:(v.v1&&v.v1.name)||'ভেকু ১'},v2:{name:(v.v2&&v.v2.name)||'ভেকু ২'}};}
function normShops(a){return Array.isArray(a)?a.map(function(x){return String(x||'').trim();}).filter(Boolean):[];}
function defaultOwners(){return [1,2,3,4,5].map(function(i){return {name:'মালিক '+DIG(i),s1:20,s2:20};});}
function normSettings(s){
  s=s||{};
  return {vekus:normVekus(s.vekus),
    owners:(Array.isArray(s.owners)&&s.owners.length)?s.owners.map(function(o){return {name:String(o.name||''),s1:+o.s1||0,s2:+o.s2||0};}):defaultOwners(),
    diesel_rate:+s.diesel_rate||0,shops:normShops(s.shops)};
}

/* ---------- supabase ---------- */
var sb=null;
try{if(window.supabase&&CFG.url&&CFG.key)sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'veku-hisab-auth'}});}catch(e){sb=null;}
async function q(p){var r=await p;if(r&&r.error)throw r.error;return r?r.data:null;}
async function fetchAll(make){var out=[],from=0;for(;;){var d=await q(make().range(from,from+999));d=d||[];out=out.concat(d);if(d.length<1000)break;from+=1000;}return out;}
function errText(e){
  var m=String((e&&(e.message||e.error_description||e.msg))||e||'');
  if(/Failed to fetch|NetworkError|network|Load failed|fetch/i.test(m))return 'ইন্টারনেট সংযোগ নেই। সংযোগ দেখে আবার চেষ্টা করুন।';
  if(/JWT|expired|refresh token/i.test(m))return 'লগইনের মেয়াদ শেষ। বের হয়ে আবার লগইন করুন।';
  if((e&&e.code==='42501')||/row-level security|not allowed|permission/i.test(m))return 'এই কাজের অনুমতি নেই।';
  return 'কাজটি হয়নি। আবার চেষ্টা করুন।';
}
var FNERR={bad_code:'চালু করার কোড ঠিক নেই।',owner_exists:'মালিকের অ্যাকাউন্ট আগেই খোলা হয়েছে। লগইন করুন।',bad_phone:'মোবাইল নম্বর ঠিক নেই। ১১ সংখ্যার নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮।',
  short_password:'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',phone_taken:'এই মোবাইল নম্বরে আগেই একটি লগইন আছে।',not_owner:'এই কাজের অনুমতি শুধু মালিকের।',has_login:'এই ড্রাইভারের লগইন আগেই আছে।',no_login:'এই ড্রাইভারের কোনো লগইন নেই।'};
async function fn(body){
  var r=await sb.functions.invoke('users',{body:body});
  if(r.error){
    var info=null;try{info=await r.error.context.json();}catch(e){}
    var err=new Error((info&&(info.message||info.error))||r.error.message||'error');err.code=(info&&info.error)||'';throw err;
  }
  return r.data;
}
function fnErrText(e){return FNERR[e&&e.code]||errText(e);}

/* ---------- state ---------- */
var S={phase:'boot',role:null,user:null,needSetup:false,tab:'sum',veku:'v1',year:now.getFullYear(),month:now.getMonth()+1,
  settings:normSettings(null),drivers:[],entries:[],repairs:[],pending:[],dbal:{},sbal:[],
  openDriver:null,openShop:null,stmt:{},shopStmt:{},
  acct:null,pub:{vekus:normVekus(),shops:[]},mine:[],openMine:false,
  loadErr:'',ownersDraft:null,ownersDirty:false,shown:''};
function resetData(){
  S.settings=normSettings(null);S.drivers=[];S.entries=[];S.repairs=[];S.pending=[];S.dbal={};S.sbal=[];S.stmt={};S.shopStmt={};
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
async function loadOwner(){
  var r=await Promise.all([qSettings(),qDrivers(),qEntries(),qRepairs(),qPending(),q(sb.rpc('driver_balances')),q(sb.rpc('shop_balances'))]);
  S.settings=normSettings(r[0]);S.drivers=r[1]||[];S.entries=r[2];S.repairs=r[3];S.pending=r[4]||[];setDbal(r[5]);S.sbal=r[6]||[];
}
async function reloadYear(){var r=await Promise.all([qEntries(),qRepairs()]);S.entries=r[0];S.repairs=r[1];}
async function reloadBal(){var r=await Promise.all([q(sb.rpc('driver_balances')),q(sb.rpc('shop_balances'))]);setDbal(r[0]);S.sbal=r[1]||[];S.stmt={};S.shopStmt={};}
async function reloadDrivers(){S.drivers=await qDrivers()||[];}
async function reloadSettings(){S.settings=normSettings(await qSettings());}
async function loadDriver(){
  var r=await Promise.all([q(sb.rpc('my_account')),q(sb.rpc('pub_info')),q(sb.from('submissions').select('*').order('created_at',{ascending:false}).limit(40))]);
  S.acct=r[0];S.pub={vekus:normVekus(r[1]&&r[1].vekus),shops:normShops(r[1]&&r[1].shops)};S.mine=r[2]||[];
}

/* ---------- boot & auth ---------- */
async function boot(){
  setupPeriod();
  if(!sb){S.phase='nolib';render();return;}
  sb.auth.onAuthStateChange(function(ev){
    if(ev==='SIGNED_OUT'){resetData();S.user=null;S.role=null;S.phase='login';render();checkSetup();}
  });
  var session=null;
  try{var r=await sb.auth.getSession();session=r&&r.data&&r.data.session;}catch(e){}
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
async function logout(){try{await sb.auth.signOut();}catch(e){resetData();S.phase='login';render();}}
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
  e.forEach(function(x){t.hours+=+x.hours||0;t.litres+=+x.litres||0;t.fuel+=+x.fuel_cost||0;t.deposit+=+x.deposit||0;t.driver+=+x.driver_wage||0;if((+x.hours||0)>0)days[x.date]=1;});
  r.forEach(function(x){t.repair+=+x.amount||0;});
  t.days=Object.keys(days).length;t.cost=t.fuel+t.driver+t.repair;t.net=t.deposit-t.cost;t.lph=t.hours?t.litres/t.hours:0;
  return t;
}
function periodLabel(){return S.month?MONTHS[S.month-1]+' '+DIG(S.year):DIG(S.year)+' সাল (সব মাস)';}
function pIn(){return S.month?MONTHS[S.month-1]+' '+DIG(S.year)+'-এ':DIG(S.year)+' সালে';}
function pOf(){return S.month?MONTHS[S.month-1]+' '+DIG(S.year)+'-এর':DIG(S.year)+' সালের';}
function vName(v){var src=S.role==='driver'?S.pub.vekus:S.settings.vekus;return (src[v]&&src[v].name)||('ভেকু '+PLATE[v]);}
function plate(v){return '<span class="plate '+v+'" aria-hidden="true">'+PLATE[v]+'</span>';}
function lastSite(v){var all=S.entries.filter(function(r){return r.veku===v&&r.site;}).sort(byDate);return all.length?all[all.length-1].site:'';}
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
      main.innerHTML=({sum:sumHTML,approve:approveHTML,daily:ledgerHTML,repair:repairHTML,drivers:driversHTML,diesel:dieselHTML,owners:ownersHTML})[S.tab]();S.shown=S.tab;
    }
  }else{
    top.innerHTML='';
    if(S.phase==='nolib')main.innerHTML=msgHTML('পাতাটি পুরোপুরি খোলেনি','ইন্টারনেট সংযোগ দেখে পাতাটি আবার খুলুন।','<button type="button" class="btn primary" data-act="reload">আবার খুলুন</button>');
    else if(S.phase==='norole')main.innerHTML=msgHTML('আপনার অ্যাকাউন্ট চালু নেই','এই মোবাইল নম্বর দিয়ে কোনো ড্রাইভার বা মালিক যুক্ত নেই। মালিকের সঙ্গে কথা বলুন।','<button type="button" class="btn" data-act="logout">বের হন</button>');
    else if(S.phase==='error')main.innerHTML=msgHTML('খাতা খোলা যায়নি',S.loadErr,'<button type="button" class="btn primary" data-act="retry">আবার চেষ্টা করুন</button>');
    else{main.innerHTML=loadingHTML();}
    S.shown='';
  }
  var fab=$('#fab');
  fab.hidden=!isOwnerApp()||['sum','daily','repair'].indexOf(S.tab)<0;
  $('#fabLabel').textContent=S.tab==='repair'?'খরচ লিখুন':'হিসাব লিখুন';
}
function loadingHTML(){return '<div class="loading">'+EXC+'<p>খাতা খোলা হচ্ছে…</p></div>';}
function msgHTML(h,p,act){return '<section class="empty">'+EXC+'<h2>'+esc(h)+'</h2><p>'+esc(p)+'</p><div class="actions">'+(act||'')+'</div></section>';}

/* ----- owner: summary ----- */
function emptyHTML(what){
  return '<section class="empty">'+EXC+'<h2>'+pIn()+' '+what+'</h2>'+
    '<p>প্রতিদিনের ঘণ্টা, ডিজেল, জমা আর ড্রাইভারের মজুরি লিখুন। নিজে লিখতে পারেন, অথবা ড্রাইভারের পাঠানো হিসাব অনুমোদন করতে পারেন। মেরামত বা যন্ত্রাংশের খরচ আলাদা লিখুন। লাভ আর মালিকদের ভাগ এখানে নিজে থেকেই হিসাব হবে।</p>'+
    '<div class="actions"><button type="button" class="btn primary" data-add="entry">দৈনিক হিসাব লিখুন</button><button type="button" class="btn" data-add="repair">মেরামত খরচ লিখুন</button></div></section>';
}
function barHTML(t){
  var tot=Math.max(t.deposit,t.cost);
  if(!tot)return '<div class="bar" aria-hidden="true"></div>';
  function seg(val,cls){return val>0?'<span class="seg '+cls+'" style="width:'+(val/tot*100).toFixed(2)+'%"></span>':'';}
  return '<div class="bar" role="img" aria-label="জমা '+tk(t.deposit)+'; ডিজেল '+tk(t.fuel)+', ড্রাইভার '+tk(t.driver)+', মেরামত '+tk(t.repair)+'">'+
    seg(t.fuel,'fuel')+seg(t.driver,'driver')+seg(t.repair,'repair')+(t.net>0?seg(t.net,'profit'):'')+
    (t.net<0&&t.deposit>0?'<span class="mark" style="left:calc('+(t.deposit/tot*100).toFixed(2)+'% - 1px)"></span>':'')+'</div>';
}
var LEGEND='<ul class="legend"><li><i style="background:var(--seg-fuel)"></i>ডিজেল</li><li><i style="background:var(--seg-driver)"></i>ড্রাইভার</li><li><i style="background:var(--seg-repair)"></i>মেরামত</li><li><i style="background:var(--seg-profit)"></i>লাভ</li></ul>';
function vcardHTML(v,t){
  return '<article class="vcard">'+
    '<div class="vhead">'+plate(v)+'<h3>'+esc(vName(v))+'</h3><span class="days">'+DIG(t.days)+' দিন কাজ</span></div>'+
    '<div class="kv3"><div><span>জমা</span><b>'+tk(t.deposit)+'</b></div><div><span>মোট খরচ</span><b>'+tk(t.cost)+'</b></div><div><span>'+(t.net<0?'লোকসান':'নিট লাভ')+'</span><b class="'+(t.net<0?'neg':t.net>0?'pos':'')+'">'+tk(t.net)+'</b></div></div>'+
    '<div class="barbox">'+barHTML(t)+LEGEND+(t.net<0&&t.deposit>0?'<p class="hint">কালো দাগ পর্যন্ত জমা। খরচ জমার চেয়ে '+tk(-t.net)+' বেশি।</p>':'')+'</div>'+
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
  var h='<section class="panel"><div class="panel-head"><h2>মালিকদের ভাগ</h2><p class="hint">'+pOf()+' নিট লাভ, প্রত্যেকের অংশ অনুযায়ী</p></div><ul class="olist">';
  own.forEach(function(o,i){
    var a1=t.v1.net*o.s1/100,a2=t.v2.net*o.s2/100;
    h+='<li><span class="oname">'+esc(o.name||('মালিক '+DIG(i+1)))+'</span><span class="oamt '+(a1+a2<0?'neg':'')+'">'+tk(a1+a2)+'</span>'+
      '<span class="odetail">'+esc(vName('v1'))+': '+tk(a1)+' ('+DIG(o.s1)+'%) · '+esc(vName('v2'))+': '+tk(a2)+' ('+DIG(o.s2)+'%)</span></li>';
  });
  h+='</ul>';
  var w=[];
  if(Math.abs(s1-100)>0.01)w.push(esc(vName('v1'))+'-এর মোট অংশ '+DIG(s1)+'%');
  if(Math.abs(s2-100)>0.01)w.push(esc(vName('v2'))+'-এর মোট অংশ '+DIG(s2)+'%');
  if(w.length)h+='<p class="warn">'+w.join(', ')+'। মোট ১০০% হওয়া দরকার। "মালিক ও সেটিংস" পাতায় ঠিক করুন।</p>';
  return h+'</section>';
}
function duesPanelHTML(){
  var dr=0,sh=0;
  activeDrivers().forEach(function(d){var b=dBal(d.id).bal;if(b>0)dr+=b;});
  shopNames().forEach(function(s){var b=shopBal(s).bal;if(b>0)sh+=b;});
  return '<section class="panel"><div class="panel-head"><h2>পাওনা-দেনা</h2><p class="hint">আজ পর্যন্ত মোট, সব মাস মিলিয়ে</p></div>'+
    '<dl class="facts"><div><dt>ড্রাইভারদের পাওনা বাকি</dt><dd>'+tk(dr)+'</dd></div><div><dt>ডিজেলের দোকানে বাকি</dt><dd>'+tk(sh)+'</dd></div></dl>'+
    '<div class="actions"><button type="button" class="btn small" data-go="drivers">ড্রাইভারের হিসাব</button><button type="button" class="btn small" data-go="diesel">দোকানের বাকি</button></div></section>';
}
function monthTableHTML(){
  var rows='',any=false,T={h:0,d:0,c:0,n:0};
  for(var m=1;m<=12;m++){
    var a=totals('v1',m),b=totals('v2',m);
    if(!a.n&&!b.n)continue;any=true;
    var h=a.hours+b.hours,d=a.deposit+b.deposit,c=a.cost+b.cost,n=a.net+b.net;
    T.h+=h;T.d+=d;T.c+=c;T.n+=n;
    rows+='<tr class="click" data-month="'+m+'"><td class="c1">'+MONTHS[m-1]+'</td><td class="n">'+q1(h)+'</td><td class="n">'+amt(d)+'</td><td class="n">'+amt(c)+'</td><td class="n '+(n<0?'neg':'')+'">'+amt(n)+'</td></tr>';
  }
  if(!any)return '';
  return '<section class="panel"><div class="panel-head"><h2>মাসভিত্তিক হিসাব</h2><p class="hint">দুই ভেকু মিলে। কোনো মাসে চাপ দিলে সেই মাসের বিস্তারিত দেখাবে।</p></div>'+
    '<div class="tbl-wrap"><table class="khata narrow"><thead><tr><th class="c1">মাস</th><th class="n">সময় (ঘণ্টা)</th><th class="n">জমা (৳)</th><th class="n">খরচ (৳)</th><th class="n">নিট (৳)</th></tr></thead><tbody>'+rows+
    '</tbody><tfoot><tr><td class="c1">মোট</td><td class="n">'+q1(T.h)+'</td><td class="n">'+amt(T.d)+'</td><td class="n">'+amt(T.c)+'</td><td class="n">'+amt(T.n)+'</td></tr></tfoot></table></div></section>';
}
function sumHTML(){
  var t={v1:totals('v1'),v2:totals('v2')};
  var dep=t.v1.deposit+t.v2.deposit,cost=t.v1.cost+t.v2.cost,net=dep-cost;
  var h='<section class="hero"><p class="eyebrow">'+periodLabel()+' · দুই ভেকু মিলে '+(net<0?'নিট লোকসান':'নিট লাভ')+'</p>'+
    '<p class="big '+(net<0?'neg':net>0?'pos':'zero')+'">'+tk(net)+'</p>'+
    '<p class="hero-sub"><span>মোট জমা <b>'+tk(dep)+'</b></span><span>মোট খরচ <b>'+tk(cost)+'</b></span></p></section>';
  if(!(t.v1.n+t.v2.n))h+=emptyHTML('এখনও কোনো হিসাব খাতায় ওঠেনি');
  h+='<div class="vgrid">'+vcardHTML('v1',t.v1)+vcardHTML('v2',t.v2)+'</div>';
  h+=ownersShareHTML(t)+duesPanelHTML();
  if(S.month===0)h+=monthTableHTML();
  return h;
}

/* ----- owner: approvals ----- */
function fuelLine(x){
  if(!(+x.litres>0)&&!x.fuel_src)return '';
  return '<p class="fuelline">ডিজেল: '+q1(x.litres)+' লিটার'+(x.fuel_src?' · '+esc(x.fuel_src):'')+(+x.fuel_cost?' · '+tk(x.fuel_cost):'')+(x.fuel_pay?' <span class="st '+x.fuel_pay+'">'+PAYL[x.fuel_pay]+'</span>':'')+'</p>';
}
function approveHTML(){
  var list=S.pending.slice().sort(byDate);
  var h='<div class="panel-head"><p class="eyebrow">ড্রাইভারদের পাঠানো হিসাব</p><h2>অনুমোদনের অপেক্ষায়: '+DIG(list.length)+'টি</h2><p class="hint">সাইট থেকে কত টাকা জমা হয়েছে লিখে অনুমোদন করলে হিসাবটি দৈনিক খাতায় উঠবে। ড্রাইভারের মজুরি তার হার অনুযায়ী নিজে বসে যাবে।</p></div>';
  if(!list.length){
    h+='<section class="empty">'+EXC+'<h2>এখন অনুমোদনের অপেক্ষায় কোনো হিসাব নেই</h2><p>লগইন আছে এমন ড্রাইভার ঘণ্টা আর ডিজেল পাঠালে এখানে দেখাবে। ড্রাইভারকে লগইন দিতে "ড্রাইভার" পাতায় যান।</p><div class="actions"><button type="button" class="btn" data-go="drivers">ড্রাইভার পাতা</button><button type="button" class="btn ghost" data-act="refresh">নতুন করে দেখুন</button></div></section>';
    return h;
  }
  return h+'<div class="plist">'+list.map(function(p){
    return '<article class="pcard"><div class="phead">'+plate(p.veku)+'<b>'+esc(vName(p.veku))+'</b><span class="muted">'+fullDate(p.date)+'</span></div>'+
      '<div class="pnums"><span>চালিয়েছে<b>'+q1(p.hours)+' ঘণ্টা</b></span>'+(+p.litres>0?'<span>ডিজেল নিয়েছে<b>'+q1(p.litres)+' লিটার</b></span>':'')+'</div>'+
      fuelLine(p)+
      '<p class="hint">পাঠিয়েছেন: '+esc(driverName(p.driver_id))+(p.remarks?' · '+esc(p.remarks):'')+'</p>'+
      '<button type="button" class="btn primary" data-approve="'+esc(p.id)+'">জমা লিখে অনুমোদন করুন</button>'+
    '</article>';
  }).join('')+'</div>';
}

/* ----- owner: ledgers ----- */
function vswitchHTML(){
  return '<div class="vswitch" role="tablist" aria-label="ভেকু বাছুন">'+VK.map(function(v){
    return '<button type="button" role="tab" class="'+v+'" data-veku="'+v+'" aria-selected="'+(S.veku===v)+'">'+plate(v)+'<span>'+esc(vName(v))+'</span></button>';
  }).join('')+'</div>';
}
function ledgerHead(title,rows,daily){
  var sites={};rows.forEach(function(r){if(r.site)sites[r.site]=1;});
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
  var multiSite=Object.keys(rows.reduce(function(a,r){if(r.site)a[r.site]=1;return a;},{})).length>1;
  var body=rows.map(function(r,i){
    t.hours+=+r.hours||0;t.litres+=+r.litres||0;t.fuel+=+r.fuel_cost||0;t.deposit+=+r.deposit||0;t.driver+=+r.driver_wage||0;
    var extra=(r.fuel_src?'<span class="by">ডিজেল: '+esc(r.fuel_src)+(r.fuel_pay?' ('+PAYL[r.fuel_pay]+')':'')+'</span>':'')+(r.driver_id?'<span class="by">ড্রাইভার: '+esc(driverName(r.driver_id))+'</span>':'');
    return '<tr class="click" tabindex="0" data-col="entries" data-id="'+esc(r.id)+'">'+dateCell(r,i,WF.format(toDate(r.date))+(multiSite&&r.site?'<br>'+esc(r.site):''))+
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
    text:r.kind==='paid'?('বাকি শোধ'+(r.note?' · '+esc(r.note):'')):(esc(vName(r.veku))+' · '+q1(r.litres)+' লিটার')};});
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
  var h='<section class="hero"><p class="eyebrow">ডিজেলের দোকান ও পাম্প · আজ পর্যন্ত</p><p class="big '+(total>0?'neg':'zero')+'">'+tk(total)+'</p><p class="hero-sub"><span>দোকানগুলোতে মোট বাকি। দৈনিক হিসাবে "বাকি" বাছা ডিজেল এখানে যোগ হয়।</span></p></section>';
  if(!shops.length)return h+'<section class="empty">'+EXC+'<h2>এখনও কোনো দোকান বা পাম্প নেই</h2><p>যেসব দোকান বা পাম্প থেকে ডিজেল আনা হয়, সেগুলোর নাম যোগ করুন। ড্রাইভার আর আপনি হিসাব লেখার সময় তালিকা থেকে বাছতে পারবেন।</p><div class="actions"><button type="button" class="btn primary" data-act="add-shop">দোকান বা পাম্প যোগ করুন</button></div></section>';
  h+='<div class="plist">'+shops.map(function(s){
    var open=S.openShop===s.name,inList=S.settings.shops.indexOf(s.name)>=0;
    return '<article class="pcard'+(open?' wide':'')+'"><div class="phead"><b>'+esc(s.name)+'</b></div>'+
      '<div class="kv3"><div><span>বাকিতে নেওয়া</span><b>'+tk(s.b.due)+'</b></div><div><span>শোধ করেছেন</span><b>'+tk(s.b.paid)+'</b></div><div><span>বাকি আছে</span><b class="'+(s.b.bal>0?'neg':'')+'">'+tk(s.b.bal)+'</b></div></div>'+
      '<div class="actions"><button type="button" class="btn primary small" data-spaynew="'+esc(s.name)+'">বাকি শোধ লিখুন</button><button type="button" class="btn small" data-sopen="'+esc(s.name)+'">'+(open?'হিসাব লুকান':'হিসাব দেখুন')+'</button>'+
      (inList&&Math.abs(s.b.bal)<1&&!s.b.due&&!s.b.paid?'<button type="button" class="btn ghost small" data-sremove="'+esc(s.name)+'">তালিকা থেকে সরান</button>':'')+'</div>'+
      (open?stmtTable(shopStmtRows(S.shopStmt[s.name]),['বাকিতে (৳)','শোধ (৳)'],'data-spay'):'')+'</article>';
  }).join('')+'</div>';
  return h+'<div class="actions"><button type="button" class="btn" data-act="add-shop">+ দোকান বা পাম্প যোগ করুন</button></div>';
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
    '<div class="actions"><button type="button" class="btn" data-act="my-password">পাসওয়ার্ড বদলান</button><button type="button" class="btn ghost" data-act="logout">বের হন</button></div></section>';
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
  S.settings=normSettings(body);
}

/* ----- driver side ----- */
var STL={pending:'অপেক্ষায়',approved:'অনুমোদিত ✓',rejected:'নাকচ হয়েছে'};
function driverTopHTML(){
  var a=S.acct;if(!a)return '';
  var d=a.driver||{},earned=+a.earned||0,paid=+a.paid||0,bal=earned-paid,open=S.openMine;
  return '<section class="panel"><div class="panel-head"><p class="eyebrow">'+esc(d.name||'')+' · আপনার টাকার হিসাব</p><h2>'+(bal<0?'বেশি নিয়েছেন ':'বাকি পাবেন ')+'<span class="'+(bal<0?'neg':'pos')+'">'+tk(Math.abs(bal))+'</span></h2><p class="hint">'+wageText(d)+'। আজ পর্যন্ত সব মিলিয়ে।</p></div>'+
    '<div class="kv3"><div><span>মজুরি হয়েছে</span><b>'+tk(earned)+'</b></div><div><span>নিয়েছেন</span><b>'+tk(paid)+'</b></div><div><span>'+(bal<0?'বেশি নিয়েছেন':'বাকি পাবেন')+'</span><b>'+tk(Math.abs(bal))+'</b></div></div>'+
    '<button type="button" class="linkbtn" data-act="my-stmt">'+(open?'লেনদেন লুকান':'সব লেনদেন দেখুন')+'</button>'+
    (open?stmtTable(driverStmtRows(a.statement||[]),['মজুরি (৳)','নিয়েছেন (৳)'],null):'')+
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
      '<div><div class="dd">'+fullDate(r.date)+'</div><div class="df">'+q1(r.hours)+' ঘণ্টা'+(+r.litres>0?' · ডিজেল '+q1(r.litres)+' লিটার'+(r.fuel_src?' ('+esc(r.fuel_src)+(r.fuel_pay?', '+PAYL[r.fuel_pay]:'')+')':''):'')+(r.remarks?' · '+esc(r.remarks):'')+'</div></div>'+
      '<span class="st '+st+'">'+(STL[st]||st)+'</span></li>';
  }).join('')+'</ul>';
  return h+'<button type="button" class="linkbtn" data-act="refresh">নতুন করে দেখুন</button></section>';
}
function drvVekuSeg(){
  $('#dVekuSeg').innerHTML=VK.map(function(x){return '<button type="button" class="'+x+'" data-dv="'+x+'" aria-pressed="'+(x===D.veku)+'">'+plate(x)+'<span>'+esc(vName(x))+'</span></button>';}).join('');
}
function setDPay(p){D.pay=p;document.querySelectorAll('#dPaySeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.pay===p));});}
function resetDrv(rec){
  D.id=rec?rec.id:null;D.delArmed=false;
  D.veku=rec?rec.veku:((S.mine[0]&&S.mine[0].veku)||D.veku||'v1');
  drvVekuSeg();
  $('#dDate').value=rec?rec.date:todayISO();
  $('#dHours').value=rec?shown(rec.hours):'';
  $('#dLitres').value=rec?shown(rec.litres):'';
  $('#dFuel').value=rec?shown(rec.fuel_cost):'';
  $('#dSrc').value=rec?(rec.fuel_src||''):'';
  setDPay(rec?(rec.fuel_pay||''):'');
  $('#dRemarks').value=rec?(rec.remarks||''):'';
  $('#drvTitle').textContent=rec?'পাঠানো হিসাব বদলান':'আজকের কাজ লিখুন';
  $('#dSave').textContent=rec?'বদলে পাঠান':'পাঠিয়ে দিন';
  var del=$('#dDel');del.hidden=!rec;del.textContent='মুছে ফেলুন';del.classList.remove('armed');
  $('#dCancel').hidden=!rec;$('#dErr').hidden=true;
}
function dErr(m){var e=$('#dErr');e.textContent=m;e.hidden=false;}
async function submitDrv(ev){
  ev.preventDefault();
  var date=$('#dDate').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return dErr('তারিখ দিন।');
  var hours=num($('#dHours').value),litres=num($('#dLitres').value),fuel=num($('#dFuel').value),src=$('#dSrc').value.trim();
  if(!(hours>0)&&!(litres>0))return dErr('কত ঘণ্টা চালিয়েছেন, অথবা কত লিটার ডিজেল নিয়েছেন লিখুন।');
  if(litres>0&&!src)return dErr('কোন দোকান বা পাম্প থেকে ডিজেল নিয়েছেন লিখুন।');
  if(litres>0&&!D.pay)return dErr('ডিজেলের টাকা নগদ দিয়েছেন, না বাকিতে নিয়েছেন বাছুন।');
  var data={veku:D.veku,date:date,hours:hours,litres:litres,fuel_cost:litres>0?fuel:0,fuel_src:litres>0?src:'',fuel_pay:litres>0?D.pay:'',remarks:$('#dRemarks').value.trim()};
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
var F={type:'entry',id:null,veku:'v1',kind:'মেরামত',pay:'',fuelTouched:false,wageTouched:false,delArmed:false,siteAuto:'',approve:null};
var sheet=$('#sheet');
function setType(t){
  F.type=t;
  document.querySelectorAll('#typeSeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.type===t));});
  document.querySelectorAll('#sheetForm [data-group]').forEach(function(el){el.hidden=el.dataset.group!==t;});
}
function setVeku(v){
  F.veku=v;
  $('#vekuSeg').innerHTML=VK.map(function(x){return '<button type="button" class="'+x+'" data-sv="'+x+'" aria-pressed="'+(x===v)+'">'+plate(x)+'<span>'+esc(vName(x))+'</span></button>';}).join('');
  var s=$('#fSite');if(s.value===F.siteAuto){F.siteAuto=lastSite(v);s.value=F.siteAuto;}
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
function openSheet(type,rec,ap){
  F.approve=ap||null;
  if(ap){type='entry';rec=null;}
  F.id=rec?rec.id:null;F.delArmed=false;
  setType(type);
  $('#typeSeg').hidden=!!(rec||ap);
  $('#sheetTitle').textContent=ap?'জমা লিখে অনুমোদন করুন':rec?(type==='entry'?'দৈনিক হিসাব বদলান':'খরচ বদলান'):'নতুন হিসাব লিখুন';
  var fl=$('#fromLine');fl.hidden=!ap;fl.textContent=ap?('পাঠিয়েছেন: '+driverName(ap.driver_id)+(ap.remarks?' · "'+ap.remarks+'"':'')):'';
  var src=ap||rec;
  F.siteAuto='';$('#fSite').value='';
  setVeku(src?src.veku:S.veku);
  $('#fDate').value=src?src.date:defaultDate();
  $('#fSite').value=rec?(rec.site||''):lastSite(F.veku);F.siteAuto=rec?'':$('#fSite').value;
  var isE=type==='entry';
  $('#fHours').value=src&&isE?shown(src.hours):'';
  $('#fLitres').value=src&&isE?shown(src.litres):'';
  $('#fFuel').value=src&&isE?shown(src.fuel_cost):'';
  $('#fSrc').value=src&&isE?(src.fuel_src||''):'';
  setFPay(src&&isE?(src.fuel_pay||''):'');
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
    data={veku:F.veku,date:date,site:$('#fSite').value.trim(),hours:num($('#fHours').value),litres:num($('#fLitres').value),fuel_cost:num($('#fFuel').value),fuel_src:$('#fSrc').value.trim(),fuel_pay:F.pay,
      deposit:num($('#fDeposit').value),driver_wage:num($('#fDriver').value),driver_id:$('#fDrvSel').value||null,remarks:$('#fRemarks').value.trim()};
    if(ap&&$('#fDeposit').value.trim()==='')return showErr('সাইট থেকে কত টাকা জমা হয়েছে লিখুন। কিছু না পেলে ০ লিখুন।');
    if(!(data.hours||data.litres||data.fuel_cost||data.deposit||data.driver_wage))return showErr('অন্তত একটি ঘর পূরণ করুন: ঘণ্টা, ডিজেল, জমা বা ড্রাইভারের মজুরি।');
    if(data.fuel_pay==='due'&&!data.fuel_src)return showErr('কোন দোকান থেকে বাকিতে ডিজেল নেওয়া হয়েছে লিখুন।');
    if(data.fuel_pay==='due'&&!(data.fuel_cost>0))return showErr('বাকিতে নেওয়া ডিজেলের টাকা লিখুন, তা না হলে দোকানের বাকি হিসাব হবে না।');
    if(data.driver_wage>0&&!data.driver_id)return showErr('মজুরি কোন ড্রাইভারের, বেছে নিন। তালিকায় না থাকলে "ড্রাইভার" পাতায় আগে যোগ করুন।');
    col='entries';
  }else{
    data={veku:F.veku,date:date,kind:F.kind,description:$('#fDesc').value.trim(),amount:num($('#fAmount').value),remarks:$('#fRemarks').value.trim()};
    if(!data.description)return showErr('খরচের বিবরণ লিখুন, যেমন: হাইড্রোলিক পাইপ বদল।');
    if(!(data.amount>0))return showErr('কত টাকা খরচ হয়েছে লিখুন।');
    col='repairs';
  }
  var btn=$('#saveBtn'),label=btn.textContent;btn.disabled=true;btn.textContent='সংরক্ষণ হচ্ছে…';
  try{
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
    var jobs=[reloadYear()];if(col==='entries')jobs.push(reloadBal());if(ap)jobs.push(qPending().then(function(r){S.pending=r||[];}));
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
    title=M.shop+'-এ বাকি শোধ';
    body='<p class="from">এখন বাকি আছে: '+tk(shopBal(M.shop).bal)+'</p>'+payFields(o.rec);M.rec=o.rec||null;if(o.rec)del='মুছে ফেলুন';
  }else if(mode==='shop-new'){
    title='দোকান বা পাম্প যোগ করুন';
    body='<label class="field"><span>দোকান বা পাম্পের নাম</span><input type="text" id="mName" autocomplete="off"></label>';
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
      if(mode==='pay-driver'&&S.openDriver===M.id)loadDriverStmt(M.id);
      if(mode==='pay-shop'&&S.openShop===M.shop)loadShopStmt(M.shop);
      toast('সংরক্ষিত হয়েছে');
    }else if(mode==='shop-new'){
      var nm=$('#mName').value.trim();if(!nm)return mErr('দোকান বা পাম্পের নাম লিখুন।');
      if(shopNames().indexOf(nm)>=0)return mErr('এই নাম আগেই তালিকায় আছে।');
      busy();var s=clone(S.settings);s.shops.push(nm);await saveSettings(s);toast('তালিকায় যোগ হয়েছে');
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
    if(M.mode==='driver-edit'){await q(sb.from('drivers').update({active:false}).eq('id',M.driver.id));await reloadDrivers();toast('তালিকা থেকে সরানো হয়েছে');}
    else if(M.mode==='pay-driver'){await q(sb.from('driver_payments').delete().eq('id',M.rec.id));await reloadBal();if(S.openDriver===M.id)loadDriverStmt(M.id);toast('মুছে ফেলা হয়েছে');}
    else if(M.mode==='pay-shop'){await q(sb.from('shop_payments').delete().eq('id',M.rec.id));await reloadBal();if(S.openShop===M.shop)loadShopStmt(M.shop);toast('মুছে ফেলা হয়েছে');}
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
    L.push(['ক্রমিক নং','তারিখ','সাইটের নাম','সময় (ঘণ্টা)','ডিজেল (লিটার)','ডিজেলের খরচ (৳)','ডিজেল কোথা থেকে','নগদ/বাকি','জমার পরিমাণ (৳)','ভেকুর ড্রাইভার (৳)','ড্রাইভার','মন্তব্য'].map(qq));
    var t=[0,0,0,0,0];
    rows.forEach(function(r,i){L.push([i+1,r.date,qq(r.site),+r.hours||0,+r.litres||0,+r.fuel_cost||0,qq(r.fuel_src),qq(PAYL[r.fuel_pay]||''),+r.deposit||0,+r.driver_wage||0,qq(r.driver_id?driverName(r.driver_id):''),qq(r.remarks)]);
      t[0]+=+r.hours||0;t[1]+=+r.litres||0;t[2]+=+r.fuel_cost||0;t[3]+=+r.deposit||0;t[4]+=+r.driver_wage||0;});
    L.push(['',qq('মোট'),'',t[0],t[1],t[2],'','',t[3],t[4],'','']);
  }else{
    L.push(['ক্রমিক নং','তারিখ','ধরন','খরচের বিবরণ','টাকা (৳)','মন্তব্য'].map(qq));
    var tot=0;rows.forEach(function(r,i){tot+=+r.amount||0;L.push([i+1,r.date,qq(r.kind),qq(r.description),+r.amount||0,qq(r.remarks)]);});
    L.push(['',qq('মোট'),'','',tot,'']);
  }
  var text='﻿'+L.map(function(l){return l.join(',');}).join('\r\n');
  var fname=(col==='entries'?'daily':'repair')+'-veku'+(v==='v1'?'1':'2')+'-'+S.year+(S.month?'-'+pad(S.month):'')+'.csv';
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
    var r=await sb.auth.signInWithPassword({email:phoneEmail(ph),password:pw});
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
function mineOpen(li){var rec=S.mine.filter(function(x){return x.id===li.dataset.mine;})[0];if(rec&&(rec.status||'pending')==='pending'){resetDrv(rec);window.scrollTo(0,0);$('#dHours').focus();}}
function dpayOpen(el){var id=S.openDriver,rec=(S.stmt[id]||[]).filter(function(x){return x.id===el.dataset.dpay&&x.kind==='paid';})[0];if(rec)openMini('pay-driver',{id:id,rec:rec});}
function spayOpen(el){var nm=S.openShop,rec=(S.shopStmt[nm]||[]).filter(function(x){return x.id===el.dataset.spay&&x.kind==='paid';})[0];if(rec)openMini('pay-shop',{shop:nm,rec:rec});}
document.addEventListener('click',function(e){
  var t=e.target,x;
  if(t.closest('#sheet'))return;
  if((x=t.closest('#mini [data-w]'))){M.wage=x.dataset.w;document.querySelectorAll('#mWageSeg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.w===M.wage));});var rw=$('#mRateWrap');if(rw){rw.hidden=M.wage==='manual';$('#mRateLbl').textContent=M.wage==='day'?'প্রতি দিন কত টাকা':'প্রতি ঘণ্টা কত টাকা';}return;}
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
    else if(act==='add-owner'){S.ownersDraft.owners.push({name:'',s1:0,s2:0});S.ownersDirty=true;renderOwnersPanel();var n=$('#o-name-'+(S.ownersDraft.owners.length-1));if(n)n.focus();}
    else if(act==='reset-owners'){S.ownersDraft=null;S.ownersDirty=false;render();}
    else if(act==='save-owners')saveOwners(a);
    else if(act==='add-driver')openMini('driver-new',{});
    else if(act==='add-shop')openMini('shop-new',{});
    else if(act==='my-password')openMini('my-password',{});
    else if(act==='my-stmt'){S.openMine=!S.openMine;render();}
    return;
  }
  if((x=t.closest('[data-copy]'))){var el=document.getElementById(x.dataset.copy);if(el)copyText(el.textContent,el);return;}
  if((x=t.closest('[data-rm]'))){S.ownersDraft.owners.splice(+x.dataset.rm,1);S.ownersDirty=true;renderOwnersPanel();return;}
  if((x=t.closest('[data-approve]'))){var pr=S.pending.filter(function(y){return y.id===x.dataset.approve;})[0];if(pr)openSheet('entry',null,pr);return;}
  if((x=t.closest('[data-add]'))){openSheet(x.dataset.add,null);return;}
  if((x=t.closest('[data-go]'))){S.tab=x.dataset.go;if(x.dataset.veku)S.veku=x.dataset.veku;render();window.scrollTo(0,0);return;}
  if((x=t.closest('.vswitch [data-veku]'))){S.veku=x.dataset.veku;render();return;}
  if((x=t.closest('[data-csv]'))){downloadCSV(x.dataset.csv);return;}
  if((x=t.closest('[data-dpaynew]'))){openMini('pay-driver',{id:x.dataset.dpaynew});return;}
  if((x=t.closest('[data-dopen]'))){var did=x.dataset.dopen;S.openDriver=S.openDriver===did?null:did;render();if(S.openDriver&&!S.stmt[did])loadDriverStmt(did);return;}
  if((x=t.closest('[data-dedit]'))){openMini('driver-edit',{driver:driverBy(x.dataset.dedit)});return;}
  if((x=t.closest('[data-drestore]'))){q(sb.from('drivers').update({active:true}).eq('id',x.dataset.drestore)).then(reloadDrivers).then(function(){toast('ফিরিয়ে আনা হয়েছে');render();},function(err){toast(errText(err));});return;}
  if((x=t.closest('[data-spaynew]'))){openMini('pay-shop',{shop:x.dataset.spaynew});return;}
  if((x=t.closest('[data-sopen]'))){var sn=x.dataset.sopen;S.openShop=S.openShop===sn?null:sn;render();if(S.openShop&&!S.shopStmt[sn])loadShopStmt(sn);return;}
  if((x=t.closest('[data-sremove]'))){var s=clone(S.settings),nm=x.dataset.sremove;s.shops=s.shops.filter(function(z){return z!==nm;});saveSettings(s).then(function(){toast('তালিকা থেকে সরানো হয়েছে');render();},function(err){toast(errText(err));});return;}
  if((x=t.closest('tr[data-month]'))){S.month=+x.dataset.month;render();window.scrollTo(0,0);return;}
  if((x=t.closest('tr[data-id]'))){rowOpen(x);return;}
  if((x=t.closest('tr[data-dpay]'))){dpayOpen(x);return;}
  if((x=t.closest('tr[data-spay]'))){spayOpen(x);return;}
  if((x=t.closest('[data-mine]'))){mineOpen(x);return;}
});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='mLogin'){$('#mPwWrap').hidden=!e.target.checked;if(e.target.checked&&!$('#mPass').value)$('#mPass').value=genPw();}});
document.addEventListener('keydown',function(e){
  if(!(e.key==='Enter'||e.key===' ')||!e.target.matches)return;
  var t=e.target;
  if(t.matches('tr[data-id]')){e.preventDefault();rowOpen(t);}
  else if(t.matches('[data-mine]')){e.preventDefault();mineOpen(t);}
  else if(t.matches('tr[data-dpay]')){e.preventDefault();dpayOpen(t);}
  else if(t.matches('tr[data-spay]')){e.preventDefault();spayOpen(t);}
  else if(t.matches('tr[data-month]')){e.preventDefault();S.month=+t.dataset.month;render();}
});
$('#main').addEventListener('input',function(e){
  var el=e.target,d=S.ownersDraft;if(!d||S.tab!=='owners')return;
  if(el.dataset.k){var o=d.owners[+el.dataset.i];if(!o)return;o[el.dataset.k]=el.dataset.k==='name'?el.value:num(el.value);markOwnersDirty();}
  else if(el.dataset.vn){d.vekus[el.dataset.vn].name=el.value;markOwnersDirty();}
  else if(el.dataset.rate){d.diesel_rate=num(el.value);markOwnersDirty();}
});
async function saveOwners(btn){
  var d=clone(S.ownersDraft);
  d.owners=d.owners.map(function(o,i){return {name:(o.name||'').trim()||('মালিক '+DIG(i+1)),s1:+o.s1||0,s2:+o.s2||0};});
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
$('#dVekuSeg').addEventListener('click',function(e){var b=e.target.closest('[data-dv]');if(b){D.veku=b.dataset.dv;drvVekuSeg();}});
$('#dPaySeg').addEventListener('click',function(e){var b=e.target.closest('[data-pay]');if(b)setDPay(D.pay===b.dataset.pay?'':b.dataset.pay);});
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
