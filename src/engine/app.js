
export function mountApp(root, ctx){
'use strict';
const supabase=ctx.supabase; const user=ctx.user;
/* ---------- helpers ---------- */
const $=(s,r=root)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const DAYS=['Vasárnap','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat'];
const MONTHS=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
const isoDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayISO=()=>isoDate(new Date());
const nowLocalISO=()=>{const d=new Date();return `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
function parseLocal(s){ if(!s) return null; const [dp,tp='00:00']=s.split('T'); const [y,m,d]=dp.split('-').map(Number); const [hh,mm]=tp.split(':').map(Number); return new Date(y,m-1,d,hh||0,mm||0,0,0); }
function addDays(iso,n){ const d=parseLocal(iso); d.setDate(d.getDate()+n); return isoDate(d); }
function fmtDate(iso){ if(!iso) return '–'; const d=parseLocal(iso); return `${d.getFullYear()}. ${pad(d.getMonth()+1)}. ${pad(d.getDate())}.`; }
function fmtDT(iso){ if(!iso) return '–'; const d=parseLocal(iso); return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtTime(iso){ if(!iso||!iso.includes('T')) return ''; const d=parseLocal(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtLong(d){ return `${DAYS[d.getDay()]}, ${d.getFullYear()}. ${MONTHS[d.getMonth()]} ${d.getDate()}.`; }
function dayDiff(iso){ const a=parseLocal(todayISO()); const b=parseLocal(iso.split('T')[0]); return Math.round((b-a)/86400000); }
function relLabel(iso){ const n=dayDiff(iso); if(n===0) return {t:'Ma',c:'today'}; if(n===1) return {t:'Holnap',c:'soon'}; if(n<0) return {t:(-n)+' napja lejárt',c:'over'}; if(n<=7) return {t:n+' nap múlva',c:'soon'}; return {t:n+' nap múlva',c:'ok'}; }
const fmtFt=n=>(Number(n)||0).toLocaleString('hu-HU')+' Ft';
function titleCase(s){ return String(s||'').trim().replace(/\s+/g,' ').split(' ').map(w=>w? w.split('-').map(p=>p.charAt(0).toLocaleUpperCase('hu-HU')+p.slice(1).toLocaleLowerCase('hu-HU')).join('-'):w).join(' '); }
function plateFmt(s){ let v=String(s||'').toLocaleUpperCase('hu-HU').trim().replace(/\s+/g,' ').replace(/[^A-Z0-9ÁÉÍÓÖŐÚÜŰ \-]/g,''); const c=v.replace(/[\s-]/g,'');
  if(/^[A-Z]{3}[0-9]{3}$/.test(c)) return c.slice(0,3)+'-'+c.slice(3);           // ABC-123
  if(/^[A-Z]{4}[0-9]{3}$/.test(c)) return c.slice(0,2)+' '+c.slice(2,4)+'-'+c.slice(4); // AA BB-123 (új formátum)
  return v; }
function companyFmt(s){ const v=String(s||'').trim().replace(/\s+/g,' '); return v===v.toLocaleLowerCase('hu-HU')?titleCase(v):v; }
function sortBy(arr,f){ return arr.slice().sort((a,b)=>f(a)<f(b)?-1:f(a)>f(b)?1:0); }

/* ---------- icons ---------- */
const I={
  home:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  bell:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  file:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  db:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
  truck:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  card:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.6 1.7-2.3 3-2.3s2.4.7 3 2.3M14 10h4M14 13.5h4"/></svg>',
  grad:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.5M21.5 9.5V15"/></svg>',
  inv:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  plus:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chev:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  pen:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.5 6.5l3 3"/></svg>',
  trash:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>',
  gear:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
  check:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  info:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  building:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 10h5a1 1 0 0 1 1 1v10M3 21h18"/><path d="M7.5 8h2M7.5 12h2M7.5 16h2M17 14h1M17 18h1"/></svg>',
  user:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.2-3.5 4-5 7.5-5s6.3 1.5 7.5 5"/></svg>',
  clock:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  dl:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  x:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  refresh:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/></svg>',
  phone:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  pin:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/></svg>',
};
const TYPES={
  vu:{name:'Fedélzeti egység letöltés',short:'Fedélzeti egység',icon:I.truck,cls:'t-vu',cycle:90,desc:'Tachográf fedélzeti egység (VU) adatletöltés.'},
  card:{name:'Vezetői kártya letöltés',short:'Vezetői kártya',icon:I.card,cls:'t-card',cycle:28,desc:'Gépkocsivezetői kártya adatletöltés.'},
  training:{name:'Oktatás',short:'Oktatás',icon:I.grad,cls:'t-training',desc:'Helyszíni oktatás, kapcsolattartóval és címmel.'},
  invoice:{name:'Számla fizetési határidő',short:'Számla',icon:I.inv,cls:'t-invoice',desc:'Kiállított számla, 30 napos fizetési határidővel.'},
};

/* ---------- state & storage (Supabase + local cache) ---------- */
const S={companies:[],drivers:[],vehicles:[],items:[]};
const COLLS=['companies','drivers','vehicles','items'];
const LS_KEY='benade.'+(user?user.id:'anon');
let route={screen:'todo',params:{}};
let stack=[];
let ui={todoFilter:'open',dataTab:'companies',dataCompany:'',search:'',invFilter:'open',loaded:false,offline:false};
try{ const u=JSON.parse(localStorage.getItem(LS_KEY+'.ui')||'{}'); ui={...ui,...u,loaded:false}; }catch(e){}
function saveUI(){ try{ localStorage.setItem(LS_KEY+'.ui',JSON.stringify({dataTab:ui.dataTab,dataCompany:ui.dataCompany,todoFilter:ui.todoFilter})); }catch(e){} }
function loadLocal(){ try{ const d=JSON.parse(localStorage.getItem(LS_KEY)||'null'); if(d) COLLS.forEach(c=>S[c]=Array.isArray(d[c])?d[c]:[]); return !!d; }catch(e){ return false; } }
function saveLocal(){ try{ localStorage.setItem(LS_KEY,JSON.stringify({companies:S.companies,drivers:S.drivers,vehicles:S.vehicles,items:S.items,savedAt:new Date().toISOString()})); }catch(e){} }

const pending=new Map(); // id -> timestamp of our own write, to ignore the realtime echo
let put=function(coll,obj){
  const arr=S[coll]; const i=arr.findIndex(x=>x.id===obj.id);
  if(i>=0) arr[i]=obj; else arr.push(obj);
  saveLocal(); pending.set(obj.id,Date.now());
  supabase.from(coll).upsert({id:obj.id,user_id:user.id,data:obj},{onConflict:'id'}).then(({error})=>{ if(error){ console.warn(error); toast('Mentés nem sikerült – nincs kapcsolat? Újra próbáljuk.','err'); queueRetry(coll,obj.id); } });
}
let remove=function(coll,id){
  S[coll]=S[coll].filter(x=>x.id!==id);
  saveLocal(); pending.set(id,Date.now());
  supabase.from(coll).delete().eq('id',id).then(({error})=>{ if(error){ console.warn(error); toast('Törlés nem sikerült – nincs kapcsolat?','err'); } });
}
const retry=[]; let retryT;
function queueRetry(coll,id){ retry.push([coll,id]); clearTimeout(retryT); retryT=setTimeout(flushRetry,5000); }
function flushRetry(){ const todo=retry.splice(0); todo.forEach(([coll,id])=>{ const o=S[coll].find(x=>x.id===id); if(o) put(coll,o); }); }

let channel=null;
async function initStorage(){
  loadLocal(); render();
  try{
    const res=await Promise.all(COLLS.map(c=>supabase.from(c).select('data').eq('user_id',user.id)));
    const err=res.find(r=>r.error); if(err) throw err.error;
    COLLS.forEach((c,i)=>S[c]=res[i].data.map(r=>r.data));
    ui.offline=false; saveLocal();
  }catch(e){ console.warn('load failed, using cached copy',e); ui.offline=true; }
  ui.loaded=true; render();
  // live updates from other devices
  try{
    channel=supabase.channel('benade-'+user.id);
    COLLS.forEach(c=>channel.on('postgres_changes',{event:'*',schema:'public',table:c,filter:'user_id=eq.'+user.id},payload=>{
      const id=(payload.new&&payload.new.id)||(payload.old&&payload.old.id); if(!id) return;
      const ts=pending.get(id); if(ts&&Date.now()-ts<15000) return; // our own write echoing back
      if(payload.eventType==='DELETE'){ S[c]=S[c].filter(x=>x.id!==id); }
      else { const obj=payload.new.data; const i=S[c].findIndex(x=>x.id===id); if(i>=0) S[c][i]=obj; else S[c].push(obj); }
      saveLocal();
      if(route.screen==='form'||route.screen==='invform'||$('#overlay').firstChild){ renderTabs(); return; }
      render();
    }));
    channel.subscribe();
  }catch(e){ console.warn('realtime unavailable',e); }
  scheduleNative();
}
/* ---------- sample data ---------- */
function seedSamples(){
  const t=todayISO();
  const c1={id:'smp-c1',name:'Példa Kft.',taxId:'12345678-2-42',sample:true,createdAt:Date.now()};
  const c2={id:'smp-c2',name:'Szállítmányozás Zrt.',taxId:'87654321-2-41',sample:true,createdAt:Date.now()};
  const d1={id:'smp-d1',companyId:'smp-c1',name:'Példa Péter',sample:true};
  const d2={id:'smp-d2',companyId:'smp-c1',name:'Kovács János',sample:true};
  const d3={id:'smp-d3',companyId:'smp-c2',name:'Nagy Sándor',sample:true};
  const v1={id:'smp-v1',companyId:'smp-c1',plate:'ABC-123',sample:true};
  const v2={id:'smp-v2',companyId:'smp-c1',plate:'DEF-456',sample:true};
  const v3={id:'smp-v3',companyId:'smp-c2',plate:'GHI-789',sample:true};
  const dl1=addDays(t,-83), dl2=addDays(t,-20), dl3=addDays(t,-95);
  const items=[
    {id:'smp-i1',type:'vu',companyId:'smp-c1',vehicleId:'smp-v1',downloadDate:dl1,nextDownload:addDays(dl1,90),remindAt:addDays(t,5)+'T08:00',note:'Telephelyen letölteni',sample:true,createdAt:Date.now()},
    {id:'smp-i2',type:'card',companyId:'smp-c1',driverId:'smp-d1',downloadDate:dl2,nextDownload:addDays(dl2,28),remindAt:addDays(t,6)+'T09:00',note:'',sample:true,createdAt:Date.now()},
    {id:'smp-i3',type:'training',companyId:'smp-c1',contactName:'Kovács Anna',contactPhone:'+36 30 123 4567',address:'Budapest, Fő utca 1.',trainingAt:addDays(t,12)+'T10:00',note:'Parkolás a hátsó udvarban.',sample:true,createdAt:Date.now()},
    {id:'smp-i4',type:'invoice',companyId:'smp-c1',invoiceNo:'2026/001',issueDate:addDays(t,-32),amount:35700,dueDate:addDays(t,-2),paidDate:'',sample:true,createdAt:Date.now()},
    {id:'smp-i5',type:'vu',companyId:'smp-c2',vehicleId:'smp-v3',downloadDate:dl3,nextDownload:addDays(dl3,90),remindAt:t+'T08:00',note:'',sample:true,createdAt:Date.now()},
  ];
  [c1,c2].forEach(o=>put('companies',o)); [d1,d2,d3].forEach(o=>put('drivers',o)); [v1,v2,v3].forEach(o=>put('vehicles',o)); items.forEach(o=>put('items',o));
  try{ localStorage.setItem(LS_KEY+'.seeded','1'); }catch(e){}
}
function hasSamples(){ return COLLS.some(c=>S[c].some(x=>x.sample)); }
function clearSamples(){ COLLS.forEach(c=>S[c].filter(x=>x.sample).forEach(x=>remove(c,x.id))); toast('Mintaadatok törölve','ok'); render(); }

/* ---------- derived ---------- */
const company=id=>S.companies.find(c=>c.id===id);
const driver=id=>S.drivers.find(c=>c.id===id);
const vehicle=id=>S.vehicles.find(c=>c.id===id);
const cName=id=>(company(id)||{}).name||'Ismeretlen cég';
function itemWhen(it){ if(it.type==='training') return it.trainingAt; if(it.type==='invoice') return it.dueDate+'T23:59'; return it.remindAt; }
function isDone(it){ return it.type==='invoice'? !!it.paidDate : !!it.done; }
function itemTitle(it){ return TYPES[it.type].name; }
function itemSub(it){
  if(it.type==='vu') return (vehicle(it.vehicleId)||{}).plate||'–';
  if(it.type==='card') return (driver(it.driverId)||{}).name||'–';
  if(it.type==='training') return it.address||'';
  return `${it.invoiceNo||''} · ${fmtFt(it.amount)}`;
}
function notifyAt(it){ if(it.type==='training') return it.trainingAt.split('T')[0]+'T06:00'; if(it.type==='invoice') return it.dueDate+'T06:00'; return it.remindAt; }
function openItems(){ return S.items.filter(it=>!isDone(it)); }
function dueCount(){ const n=nowLocalISO(); return openItems().filter(it=>itemWhen(it).split('T')[0]<=todayISO()).length; }

/* ---------- navigation ---------- */
function go(screen,params={},push=true){ if(push) stack.push(route); route={screen,params}; closeOverlay(); render(); $('main')&&($('main').scrollTop=0); }
function back(){ const r=stack.pop(); route=r||{screen:'todo',params:{}}; closeOverlay(); render(); }
function tab(screen){ stack=[]; route={screen,params:{}}; closeOverlay(); render(); }

/* ---------- render ---------- */
function render(){
  const root=$('#screen');
  const map={todo:renderTodo,remind:renderRemind,invoice:renderInvoice,data:renderData,form:renderForm,detail:renderDetail,notif:renderNotif,settings:renderSettings,invform:renderInvoiceForm};
  root.innerHTML=(map[route.screen]||renderTodo)();
  renderTabs();
  bindCommon(root);
  const after=afterHooks[route.screen]; if(after) after(root);
}
function renderTabs(){
  const cur=route.screen==='invform'?'invoice':route.screen==='form'?(route.params.from||'remind'):route.screen==='detail'?(route.params.from||'todo'):route.screen;
  const due=dueCount();
  const t=[['todo','Teendő',I.home],['remind','Emlékeztető',I.bell],['invoice','Számla',I.file],['data','Adatbank',I.db]];
  $('#tabs').innerHTML=t.map(([k,l,ic])=>`<button data-tab="${k}" ${cur===k?'aria-current="page"':''}><span class="ic">${ic}</span>${l}${k==='todo'&&due?`<span class="cnt num">${due}</span>`:''}</button>`).join('');
  $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
}
function hdr(title,sub,opts={}){
  const left=opts.back?`<button class="ibtn" data-act="back" aria-label="Vissza">${I.back}</button>`:'';
  const due=dueCount();
  const right=opts.right??`<button class="ibtn" data-act="notif" aria-label="Értesítések">${I.bell}${due?`<span class="dot">${due}</span>`:''}</button><button class="ibtn" data-act="settings" aria-label="Beállítások">${I.gear}</button>`;
  return `<header class="hdr">${left}<div class="ttl"><h1>${esc(title)}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div>${right}</header>`;
}
function brandHdr(inner){
  const due=dueCount();
  return `<header class="band"><div class="band-top"><div class="brand"><div class="mark">${I.truck}</div><div><div class="w">Ben<b>Ade</b></div><div class="s">Tachográf emlékeztető</div></div></div>
  <div style="display:flex;gap:4px"><button class="ibtn light" data-act="notif" aria-label="Értesítések">${I.bell}${due?`<span class="dot num">${due}</span>`:''}</button><button class="ibtn light" data-act="settings" aria-label="Beállítások">${I.gear}</button></div></div>${inner||''}</header>`;
}
function bindCommon(root){
  root.querySelectorAll('[data-act="back"]').forEach(b=>b.onclick=back);
  root.querySelectorAll('[data-act="notif"]').forEach(b=>b.onclick=()=>go('notif'));
  root.querySelectorAll('[data-act="settings"]').forEach(b=>b.onclick=()=>go('settings'));
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>go('detail',{id:b.dataset.open,from:route.screen==='detail'?route.params.from:route.screen}));
  root.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>go('form',{type:b.dataset.new,from:route.screen}));
}
const afterHooks={};

/* ---------- TEENDŐ ---------- */
function todoCard(it){
  const T=TYPES[it.type]; const when=itemWhen(it); const rel=relLabel(when); const done=isDone(it);
  const time=it.type==='invoice'?'':fmtTime(when);
  const dateTxt=fmtDate(when);
  const extra=it.type==='invoice'&&!done?`<span class="tag danger">Nincs kifizetve</span>`:it.type==='invoice'&&done?`<span class="tag ok">Kifizetve</span>`:'';
  return `<button class="todo ${T.cls} ${done?'done':''}" data-open="${it.id}">
    <span class="bar"></span><span class="ico">${T.icon}</span>
    <span class="body">
      <span class="when"><span class="num">${dateTxt}</span>${time?`<span class="t">${time}</span>`:''}</span>
      <span class="name">${esc(T.name)}</span>
      <span class="meta">${esc(cName(it.companyId))} · ${esc(itemSub(it))}</span>
      ${it.note?`<span class="note">Megj.: ${esc(it.note)}</span>`:''}
    </span>
    <span class="right">${done?'<span class="rel ok">Kész</span>':`<span class="rel ${rel.c}">${rel.t}</span>`}${extra}</span>
  </button>`;
}
function renderTodo(){
  const now=new Date(); const t=todayISO();
  const open=sortBy(openItems(),itemWhen);
  const over=open.filter(it=>itemWhen(it).split('T')[0]<t);
  const today=open.filter(it=>itemWhen(it).split('T')[0]===t);
  const week=open.filter(it=>{const d=dayDiff(itemWhen(it));return d>0&&d<=7});
  const done=sortBy(S.items.filter(isDone),it=>itemWhen(it)).reverse();
  let list;
  switch(ui.todoFilter){case 'over':list=over;break;case 'today':list=today;break;case 'week':list=week;break;case 'done':list=done;break;default:list=open;}
  const chips=[['open','Összes',open.length],['over','Lejárt',over.length],['today','Ma',today.length],['week','7 nap',week.length],['done','Elvégzett',done.length]];
  const emptyMsg={open:['Nincs teendő','Rögzítsen emlékeztetőt az Emlékeztető fülön, és itt jelenik meg időrendben.'],over:['Nincs lejárt tétel','Minden határidő rendben van.'],today:['Ma nincs teendő','Pihenőnap a határidőknek.'],week:['A következő 7 napban nincs teendő',''],done:['Még nincs elvégzett tétel','Egy teendőt a részleteiben jelölhet elvégzettnek.']}[ui.todoFilter];
  const onboarding=!S.companies.length&&!S.items.length&&ui.loaded;
  return brandHdr(`<div class="band-body">
      <div class="band-date">${esc(fmtLong(now))}</div>
      <h1 class="band-title">Következő teendők</h1>
      <div class="stats">
        <button class="stat danger" data-filter="over"><div class="v num">${over.length}</div><div class="l">Lejárt</div></button>
        <button class="stat warn" data-filter="today"><div class="v num">${today.length}</div><div class="l">Ma esedékes</div></button>
        <button class="stat brand" data-filter="week"><div class="v num">${week.length}</div><div class="l">7 napon belül</div></button>
      </div></div>`)+`<main>
    ${!ui.loaded?`<div class="info">${I.refresh}<span>Adatok betöltése…</span></div>`:''}
    ${ui.offline?`<div class="banner sample">${I.info}<span class="grow">Nincs kapcsolat. Az eszközön mentett másolatot látja; a módosítások kapcsolat után szinkronizálódnak.</span></div>`:''}
    ${onboarding?`<div class="panel onboard"><div class="pad">
        <div class="ob-h">Kezdjük el három lépésben</div>
        <ol class="ob-steps">
          <li><b>Cég rögzítése</b><span>Név és adószám az Adatbankban.</span></li>
          <li><b>Sofőrök és járművek</b><span>A céghez tartozó nevek és rendszámok.</span></li>
          <li><b>Első emlékeztető</b><span>Letöltés, oktatás vagy számla – az app számolja a határidőt.</span></li>
        </ol>
        <div class="actions"><button class="btn primary" data-go-data="companies">${I.plus} Első cég rögzítése</button><button class="btn ghost" data-act="load-samples">Mintaadatok kipróbáláshoz</button></div>
      </div></div>`:''}
    ${hasSamples()?`<div class="banner sample"><span class="grow">Mintaadatok vannak betöltve, hogy lássa, hogyan működik az app. Éles használat előtt törölje őket.</span><button class="btn sm ghost" data-act="clear-samples">Törlés</button></div>`:''}
    ${over.length&&ui.todoFilter!=='over'?`<div class="banner danger">${I.info}<span class="grow">${over.length} tétel határideje lejárt.</span><button class="btn sm danger" data-filter="over">Mutasd</button></div>`:''}
    <div class="chips" role="tablist">${chips.map(([k,l,n])=>`<button class="chip" role="tab" aria-pressed="${ui.todoFilter===k}" data-filter="${k}">${l}<span class="k">${n}</span></button>`).join('')}</div>
    ${list.length?`<div class="list">${list.map(todoCard).join('')}</div>`:(!ui.loaded||onboarding)?'':`<div class="empty"><div class="ico">${I.home}</div><h3>${emptyMsg[0]}</h3><p>${emptyMsg[1]}</p>${ui.todoFilter==='open'?`<button class="btn primary sm" data-go="remind">${I.plus} Új emlékeztető</button>`:''}</div>`}
  </main>`;
}
afterHooks.todo=root=>{
  root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{ui.todoFilter=b.dataset.filter;saveUI();render();});
  root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>tab(b.dataset.go));
  root.querySelectorAll('[data-go-data]').forEach(b=>b.onclick=()=>{ui.dataTab=b.dataset.goData;saveUI();tab('data');});
  const ls=root.querySelector('[data-act="load-samples"]'); if(ls) ls.onclick=()=>{ seedSamples(); toast('Mintaadatok betöltve'); render(); };
  const cs=root.querySelector('[data-act="clear-samples"]'); if(cs) cs.onclick=async()=>{ if(await confirmSheet('Mintaadatok törlése','Minden „minta” jelölésű cég, sofőr, jármű és teendő törlődik. A saját adatai megmaradnak.','Törlés',true)) clearSamples(); };
};

/* ---------- EMLÉKEZTETŐ MENU ---------- */
function renderRemind(){
  const cnt=k=>openItems().filter(i=>i.type===k).length;
  return hdr('Emlékeztető','Válassza ki, mit szeretne rögzíteni')+`<main>
    <div class="menu">
      <button class="mcard t-vu" data-new="vu"><span class="ico">${I.truck}</span><span><div class="h">Fedélzeti egység letöltés</div><div class="d">Következő letöltés automatikusan +90 naptári nap.</div><span class="rule">${cnt('vu')} aktív</span></span><span class="chev">${I.chev}</span></button>
      <button class="mcard t-card" data-new="card"><span class="ico">${I.card}</span><span><div class="h">Vezetői kártya letöltés</div><div class="d">Következő letöltés automatikusan +28 naptári nap.</div><span class="rule">${cnt('card')} aktív</span></span><span class="chev">${I.chev}</span></button>
      <button class="mcard t-training" data-new="training"><span class="ico">${I.grad}</span><span><div class="h">Oktatás</div><div class="d">Értesítés az oktatás napján 06:00-kor, automatikusan.</div><span class="rule">${cnt('training')} aktív</span></span><span class="chev">${I.chev}</span></button>
    </div>
    <div class="info">${I.info}<span>Az emlékeztetőnél először a céget választja ki, ezután csak az adott céghez tartozó járművek vagy gépkocsivezetők jelennek meg. A cégeket az <b>Adatbank</b> fülön kezelheti.</span></div>
    <div class="sec-h"><h2>Legutóbb rögzítve</h2></div>
    ${(()=>{const l=sortBy(S.items.filter(i=>i.type!=='invoice'),i=>-(i.createdAt||0)).slice(0,5);return l.length?`<div class="list">${l.map(todoCard).join('')}</div>`:`<div class="empty"><h3>Még nincs emlékeztető</h3><p>Válasszon fent egy típust a rögzítéshez.</p></div>`})()}
  </main>`;
}

/* ---------- FORM (vu / card / training) ---------- */
function selCompanies(sel){ return `<option value="">Válasszon céget…</option>`+sortBy(S.companies,c=>c.name.toLocaleLowerCase('hu')).map(c=>`<option value="${c.id}" ${c.id===sel?'selected':''}>${esc(c.name)}</option>`).join(''); }
function renderForm(){
  const type=route.params.type; const T=TYPES[type]; const edit=route.params.id?S.items.find(i=>i.id===route.params.id):null;
  const pre=route.params.prefill||{};
  const it=edit||{companyId:pre.companyId||'',vehicleId:pre.vehicleId||'',driverId:pre.driverId||'',downloadDate:todayISO(),remindAt:'',note:'',contactName:'',contactPhone:'',address:'',trainingAt:''};
  const cycle=T.cycle;
  const next=cycle?addDays(it.downloadDate||todayISO(),cycle):'';
  const remind=it.remindAt||(next?next+'T08:00':'');
  const [rd,rt]=remind?remind.split('T'):['',''];
  const [td,tt]=it.trainingAt?it.trainingAt.split('T'):['',''];
  const noCompanies=!S.companies.length;
  return hdr(edit?'Emlékeztető szerkesztése':'Emlékeztető rögzítése','',{back:true,right:''})+`<main>
    <div class="hero ${T.cls}"><span class="ico">${T.icon}</span><div><div class="h">${esc(T.name)}</div><div class="d">${edit?'Meglévő emlékeztető módosítása':'Új emlékeztető'}</div></div></div>
    ${noCompanies?`<div class="banner danger">${I.info}<span class="grow">Még nincs rögzített cég. Előbb vegye fel az Adatbankban.</span><button class="btn sm danger" data-go-data="companies">Adatbank</button></div>`:''}
    <form class="form" id="f" novalidate>
      <div class="fgroup">
        <div class="field"><label for="f-company">Cég <span class="req">*</span></label><div class="selwrap"><select class="ctl" id="f-company" name="companyId">${selCompanies(it.companyId)}</select></div></div>
        ${type==='vu'?`<div class="field"><label for="f-vehicle">Rendszám <span class="req">*</span></label><div class="selwrap"><select class="ctl" id="f-vehicle" name="vehicleId"></select></div><div class="hint" id="f-vehicle-hint"></div></div>`:''}
        ${type==='card'?`<div class="field"><label for="f-driver">Gépkocsivezető <span class="req">*</span></label><div class="selwrap"><select class="ctl" id="f-driver" name="driverId"></select></div><div class="hint" id="f-driver-hint"></div></div>`:''}
      </div>
      ${cycle?`<div class="fgroup">
        <div class="field"><label for="f-dl">Letöltés ideje</label><input class="ctl num" type="date" id="f-dl" name="downloadDate" value="${it.downloadDate||todayISO()}"><div class="hint">Automatikusan a mai dátum. Szükség esetén módosítható.</div></div>
        <div class="auto"><span>Következő letöltés ideje<br><span style="font-weight:600;opacity:.8">automatikusan +${cycle} naptári nap</span></span><span class="big" id="f-next">${fmtDate(next)}</span></div>
        <div class="field"><label>Emlékeztető <span class="req">*</span></label>
          <div class="row2"><input class="ctl num" type="date" id="f-rd" name="rd" value="${rd}" aria-label="Emlékeztető dátuma"><input class="ctl num" type="time" id="f-rt" name="rt" value="${rt}" aria-label="Emlékeztető időpontja"></div>
          <div class="hint">Ekkor kell felvenni a kapcsolatot a céggel. Dátum és óra:perc pontossággal.</div></div>
      </div>`:''}
      ${type==='training'?`<div class="fgroup">
        <div class="field"><label for="f-cn">Kapcsolattartó neve</label><input class="ctl" id="f-cn" name="contactName" value="${esc(it.contactName)}" placeholder="Pl. Kovács Anna" autocomplete="off"></div>
        <div class="field"><label for="f-cp">Kapcsolattartó telefonszáma</label><input class="ctl num" id="f-cp" name="contactPhone" type="tel" value="${esc(it.contactPhone)}" placeholder="+36 30 123 4567"></div>
        <div class="field"><label for="f-addr">Cím <span class="req">*</span></label><input class="ctl" id="f-addr" name="address" value="${esc(it.address)}" placeholder="Pl. Budapest, Fő utca 1."></div>
        <div class="field"><label>Oktatás ideje <span class="req">*</span></label>
          <div class="row2"><input class="ctl num" type="date" id="f-td" name="td" value="${td}" aria-label="Oktatás dátuma"><input class="ctl num" type="time" id="f-tt" name="tt" value="${tt}" aria-label="Oktatás időpontja"></div></div>
        <div class="info">${I.clock}<span>Az értesítés automatikusan az <b>oktatás napján 06:00-kor</b> érkezik, a cég nevével, az időponttal, a címmel és a kapcsolattartó adataival. Nem kell külön beállítani.</span></div>
      </div>`:''}
      <div class="fgroup"><div class="field"><label for="f-note">Megjegyzés <span style="font-weight:600;color:var(--faint)">(opcionális)</span></label><textarea class="ctl" id="f-note" name="note" placeholder="Pl. telephelyen letölteni">${esc(it.note)}</textarea><div class="hint">A Teendő listában a tétel alatt kisebb, szürke szövegként jelenik meg.</div></div></div>
      <div class="ferr" id="f-err" hidden></div>
      <div class="actions"><button type="button" class="btn ghost" data-act="back">Mégse</button><button type="submit" class="btn primary" ${noCompanies?'disabled':''}>${I.check} Mentés</button></div>
    </form>
  </main>`;
}
afterHooks.form=root=>{
  const type=route.params.type; const T=TYPES[type]; const edit=route.params.id?S.items.find(i=>i.id===route.params.id):null;
  const f=$('#f',root); const comp=$('#f-company',root);
  root.querySelectorAll('[data-go-data]').forEach(b=>b.onclick=()=>{ui.dataTab=b.dataset.goData;saveUI();tab('data');});
  function fillChildren(){
    const cid=comp.value;
    if(type==='vu'){ const sel=$('#f-vehicle',root); const list=sortBy(S.vehicles.filter(v=>v.companyId===cid),v=>v.plate); const cur=sel.value||(edit?edit.vehicleId:(route.params.prefill||{}).vehicleId)||'';
      sel.innerHTML=`<option value="">${cid?(list.length?'Válasszon rendszámot…':'Nincs jármű ehhez a céghez'):'Előbb válasszon céget'}</option>`+list.map(v=>`<option value="${v.id}" ${v.id===cur?'selected':''}>${esc(v.plate)}</option>`).join('');
      $('#f-vehicle-hint',root).innerHTML=cid&&!list.length?'Járművet az Adatbank → Járművek fülön rögzíthet ehhez a céghez.':'Csak a kiválasztott cég járművei jelennek meg.'; }
    if(type==='card'){ const sel=$('#f-driver',root); const list=sortBy(S.drivers.filter(v=>v.companyId===cid),v=>v.name); const cur=sel.value||(edit?edit.driverId:(route.params.prefill||{}).driverId)||'';
      sel.innerHTML=`<option value="">${cid?(list.length?'Válasszon gépkocsivezetőt…':'Nincs sofőr ehhez a céghez'):'Előbb válasszon céget'}</option>`+list.map(v=>`<option value="${v.id}" ${v.id===cur?'selected':''}>${esc(v.name)}</option>`).join('');
      $('#f-driver-hint',root).innerHTML=cid&&!list.length?'Gépkocsivezetőt az Adatbank → Gépkocsivezetők fülön rögzíthet ehhez a céghez.':'Csak a kiválasztott cég sofőrjei jelennek meg.'; }
  }
  comp.onchange=()=>{ if(type==='vu') $('#f-vehicle',root).value=''; if(type==='card') $('#f-driver',root).value=''; fillChildren(); };
  fillChildren();
  if(T.cycle){ const dl=$('#f-dl',root); dl.onchange=()=>{ if(!dl.value) return; const n=addDays(dl.value,T.cycle); $('#f-next',root).textContent=fmtDate(n); const rd=$('#f-rd',root); if(!edit||!rd.dataset.touched) rd.value=n; }; $('#f-rd',root).oninput=e=>e.target.dataset.touched='1'; }
  const cn=$('#f-cn',root); if(cn) cn.onblur=()=>cn.value=titleCase(cn.value);
  f.onsubmit=e=>{
    e.preventDefault(); const err=$('#f-err',root); err.hidden=true; root.querySelectorAll('.ctl.err').forEach(x=>x.classList.remove('err'));
    const fd=Object.fromEntries(new FormData(f).entries());
    const bad=(id,msg)=>{ $('#'+id,root).classList.add('err'); err.textContent=msg; err.hidden=false; $('#'+id,root).focus(); };
    if(!fd.companyId) return bad('f-company','Válassza ki a céget.');
    const base=edit?{...edit}:{id:uid(),type,createdAt:Date.now()};
    base.companyId=fd.companyId; base.note=(fd.note||'').trim(); delete base.sample;
    if(type==='vu'){ if(!fd.vehicleId) return bad('f-vehicle','Válassza ki a rendszámot.'); base.vehicleId=fd.vehicleId; }
    if(type==='card'){ if(!fd.driverId) return bad('f-driver','Válassza ki a gépkocsivezetőt.'); base.driverId=fd.driverId; }
    if(T.cycle){ if(!fd.downloadDate) return bad('f-dl','Adja meg a letöltés idejét.'); base.downloadDate=fd.downloadDate; base.nextDownload=addDays(fd.downloadDate,T.cycle);
      if(!fd.rd) return bad('f-rd','Adja meg az emlékeztető dátumát.'); if(!fd.rt) return bad('f-rt','Adja meg az emlékeztető időpontját (óra:perc).'); base.remindAt=fd.rd+'T'+fd.rt; }
    if(type==='training'){ base.contactName=titleCase(fd.contactName); base.contactPhone=(fd.contactPhone||'').trim(); base.address=(fd.address||'').trim();
      if(!base.address) return bad('f-addr','Adja meg az oktatás címét.'); if(!fd.td) return bad('f-td','Adja meg az oktatás dátumát.'); if(!fd.tt) return bad('f-tt','Adja meg az oktatás időpontját.'); base.trainingAt=fd.td+'T'+fd.tt; }
    if(!edit){ base.done=false; base.notifiedAt=''; }
    put('items',base); toast(edit?'Emlékeztető módosítva':'Emlékeztető mentve. Megjelenik a Teendő listában.','ok');
    stack=[]; route={screen:'todo',params:{}}; ui.todoFilter='open'; render();
  };
};

/* ---------- DETAIL ---------- */
function renderDetail(){
  const it=S.items.find(i=>i.id===route.params.id); if(!it) return hdr('Nem található','',{back:true,right:''})+`<main><div class="empty"><h3>Ez a tétel már nem létezik.</h3></div></main>`;
  const T=TYPES[it.type]; const when=itemWhen(it); const rel=relLabel(when); const done=isDone(it);
  const rows=[['Típus',T.name],['Cég',cName(it.companyId)]];
  const c=company(it.companyId); if(c&&c.taxId) rows.push(['Adószám',c.taxId]);
  if(it.type==='vu') rows.push(['Rendszám',`<span class="plate-pill">${esc((vehicle(it.vehicleId)||{}).plate||'–')}</span>`],['Letöltés ideje',fmtDate(it.downloadDate)],['Következő letöltés',fmtDate(it.nextDownload)+' <span class="pill">+90 nap</span>'],['Emlékeztető',fmtDT(it.remindAt)]);
  if(it.type==='card') rows.push(['Gépkocsivezető',esc((driver(it.driverId)||{}).name||'–')],['Letöltés ideje',fmtDate(it.downloadDate)],['Következő letöltés',fmtDate(it.nextDownload)+' <span class="pill">+28 nap</span>'],['Emlékeztető',fmtDT(it.remindAt)]);
  if(it.type==='training') rows.push(['Oktatás ideje',fmtDT(it.trainingAt)],['Cím',esc(it.address)],['Kapcsolattartó',esc(it.contactName||'–')],['Telefon',it.contactPhone?`<span class="num" style="user-select:all">${esc(it.contactPhone)}</span>`:'–'],['Értesítés','Az oktatás napján 06:00']);
  if(it.type==='invoice') rows.push(['Számla száma',esc(it.invoiceNo)],['Kiállítás dátuma',fmtDate(it.issueDate)],['Összeg',`<span class="total">${fmtFt(it.amount)}</span>`],['Fizetési határidő',fmtDate(it.dueDate)+' <span class="pill">+30 nap</span>'],['Kifizetés dátuma',it.paidDate?fmtDate(it.paidDate):'<span class="tag danger">Nincs kifizetve</span>']);
  if(it.note) rows.push(['Megjegyzés',esc(it.note)]);
  const safe=rows.map(([k,v],i)=>[k,i<2?esc(v):v]);
  const canCycle=(it.type==='vu'||it.type==='card');
  return hdr('Részletek','',{back:true,right:`<button class="ibtn" data-act="edit" aria-label="Szerkesztés">${I.pen}</button>`})+`<main>
    <div class="hero ${T.cls}"><span class="ico">${T.icon}</span><div style="min-width:0"><div class="h">${esc(T.name)}</div><div class="d num">${fmtDT(when).replace(' 23:59','')} · ${done?'Elvégezve':rel.t}</div></div></div>
    <div class="panel"><div class="pad"><dl class="dl">${safe.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl></div></div>
    <div class="actions">
      ${it.type==='invoice'?(done?`<button class="btn secondary" data-act="unpay">${I.refresh} Mégsem fizetve</button>`:`<button class="btn ok" data-act="pay">${I.check} Kifizetve (ma)</button>`)
        :(done?`<button class="btn secondary" data-act="undone">${I.refresh} Visszaállítás nyitottra</button>`:`<button class="btn ok" data-act="done">${I.check} Elvégezve</button>`)}
      <button class="btn secondary" data-act="edit">${I.pen} Szerkesztés</button>
    </div>
    ${canCycle?`<button class="btn primary block" data-act="cycle">${I.refresh} Új letöltés rögzítése ehhez a ${it.type==='vu'?'járműhöz':'sofőrhöz'}</button><div class="hint" style="text-align:center;font-size:12.5px;color:var(--faint)">Lezárja ezt a tételt, és új ciklust nyit a mai letöltési dátummal (+${T.cycle} nap).</div>`:''}
    <button class="btn danger block" data-act="del">${I.trash} Törlés</button>
  </main>`;
}
afterHooks.detail=root=>{
  const it=S.items.find(i=>i.id===route.params.id); if(!it) return;
  const on=(a,fn)=>root.querySelectorAll(`[data-act="${a}"]`).forEach(b=>b.onclick=fn);
  on('edit',()=>go(it.type==='invoice'?'invform':'form',{type:it.type,id:it.id,from:route.params.from}));
  on('done',()=>{ put('items',{...it,done:true,doneAt:todayISO()}); toast('Elvégezve','ok'); render(); });
  on('undone',()=>{ put('items',{...it,done:false,doneAt:''}); render(); });
  on('pay',()=>{ put('items',{...it,paidDate:todayISO()}); toast('Számla kifizetve','ok'); render(); });
  on('unpay',()=>{ put('items',{...it,paidDate:''}); render(); });
  on('cycle',async()=>{ if(!it.done){ put('items',{...it,done:true,doneAt:todayISO()}); } go('form',{type:it.type,from:'remind',prefill:{companyId:it.companyId,vehicleId:it.vehicleId,driverId:it.driverId}}); toast('Előző ciklus lezárva. Rögzítse az új letöltést.'); });
  on('del',async()=>{ if(await confirmSheet('Tétel törlése',`${TYPES[it.type].name} – ${cName(it.companyId)}. A törlés nem vonható vissza.`,'Törlés',true)){ remove('items',it.id); toast('Törölve'); back(); } });
};

/* ---------- SZÁMLA ---------- */
function renderInvoice(){
  const all=sortBy(S.items.filter(i=>i.type==='invoice'),i=>i.dueDate);
  const t=todayISO();
  const unpaid=all.filter(i=>!i.paidDate), over=unpaid.filter(i=>i.dueDate<t), paid=all.filter(i=>i.paidDate);
  const list={open:unpaid,over,paid,all}[ui.invFilter]||unpaid;
  const sum=a=>a.reduce((s,i)=>s+(Number(i.amount)||0),0);
  return hdr('Számla','Fizetési határidők követése')+`<main>
    <button class="btn primary block" data-act="newinv">${I.plus} Új számla rögzítése</button>
    <div class="sum">
      <div class="stat"><div class="v num" style="color:var(--inv)">${fmtFt(sum(over))}</div><div class="l">Lejárt, kifizetetlen · ${over.length} db</div></div>
      <div class="stat"><div class="v num">${fmtFt(sum(unpaid))}</div><div class="l">Összes kintlévőség · ${unpaid.length} db</div></div>
    </div>
    <div class="segs">${[['open','Kifizetetlen'],['over','Lejárt'],['paid','Kifizetett'],['all','Összes']].map(([k,l])=>`<button aria-pressed="${ui.invFilter===k}" data-inv="${k}">${l}</button>`).join('')}</div>
    ${list.length?`<div class="list">${list.map(todoCard).join('')}</div>`:`<div class="empty"><div class="ico">${I.inv}</div><h3>Nincs számla ebben a nézetben</h3><p>A fizetési határidő a kiállítás dátumától számított 30 naptári nap, automatikusan kitöltve.</p></div>`}
    <div class="info">${I.info}<span>Ha a fizetési határidő lejár és nincs megadva a kifizetés dátuma, az alkalmazás értesítést küld, és a tétel pirossal, „Nincs kifizetve” jelöléssel marad a Teendő listában.</span></div>
  </main>`;
}
afterHooks.invoice=root=>{
  root.querySelectorAll('[data-inv]').forEach(b=>b.onclick=()=>{ui.invFilter=b.dataset.inv;render();});
  $('[data-act="newinv"]',root).onclick=()=>go('invform',{from:'invoice'});
};
function renderInvoiceForm(){
  const edit=route.params.id?S.items.find(i=>i.id===route.params.id):null;
  const it=edit||{companyId:'',invoiceNo:'',issueDate:todayISO(),amount:'',dueDate:addDays(todayISO(),30),paidDate:'',note:''};
  const noCompanies=!S.companies.length;
  return hdr(edit?'Számla szerkesztése':'Új számla','',{back:true,right:''})+`<main>
    <div class="hero t-invoice"><span class="ico">${I.inv}</span><div><div class="h">Számla</div><div class="d">Fizetési határidő automatikusan +30 nap</div></div></div>
    ${noCompanies?`<div class="banner danger">${I.info}<span class="grow">Még nincs rögzített cég. Előbb vegye fel az Adatbankban.</span><button class="btn sm danger" data-go-data="companies">Adatbank</button></div>`:''}
    <form class="form" id="f" novalidate>
      <div class="fgroup">
        <div class="field"><label for="i-company">Cég neve <span class="req">*</span></label><div class="selwrap"><select class="ctl" id="i-company" name="companyId">${selCompanies(it.companyId)}</select></div></div>
        <div class="field"><label for="i-no">Számla száma <span class="req">*</span></label><input class="ctl num" id="i-no" name="invoiceNo" value="${esc(it.invoiceNo)}" placeholder="Pl. 2026/001" autocomplete="off"></div>
        <div class="row2">
          <div class="field"><label for="i-issue">Kiállítás dátuma</label><input class="ctl num" type="date" id="i-issue" name="issueDate" value="${it.issueDate}"></div>
          <div class="field"><label for="i-amount">Összeg (Ft) <span class="req">*</span></label><input class="ctl num" type="number" inputmode="numeric" min="0" step="1" id="i-amount" name="amount" value="${esc(it.amount)}" placeholder="35 700"></div>
        </div>
        <div class="field"><label for="i-due">Fizetési határidő</label><input class="ctl num" type="date" id="i-due" name="dueDate" value="${it.dueDate}"><div class="hint" id="i-due-hint">Automatikusan +30 naptári nap a kiállítástól. Szükség esetén átírható.</div></div>
        <div class="field"><label for="i-paid">Kifizetés dátuma <span style="font-weight:600;color:var(--faint)">(ha már kifizették)</span></label><input class="ctl num" type="date" id="i-paid" name="paidDate" value="${it.paidDate||''}"></div>
        <div class="field"><label for="i-note">Megjegyzés</label><textarea class="ctl" id="i-note" name="note" placeholder="Opcionális">${esc(it.note||'')}</textarea></div>
      </div>
      <div class="ferr" id="f-err" hidden></div>
      <div class="actions"><button type="button" class="btn ghost" data-act="back">Mégse</button><button type="submit" class="btn primary" ${noCompanies?'disabled':''}>${I.check} Mentés</button></div>
    </form></main>`;
}
afterHooks.invform=root=>{
  const edit=route.params.id?S.items.find(i=>i.id===route.params.id):null;
  const f=$('#f',root); const issue=$('#i-issue',root), due=$('#i-due',root);
  root.querySelectorAll('[data-go-data]').forEach(b=>b.onclick=()=>{ui.dataTab=b.dataset.goData;saveUI();tab('data');});
  issue.onchange=()=>{ if(issue.value&&!due.dataset.touched) due.value=addDays(issue.value,30); };
  due.oninput=()=>due.dataset.touched='1';
  f.onsubmit=e=>{
    e.preventDefault(); const err=$('#f-err',root); err.hidden=true; root.querySelectorAll('.ctl.err').forEach(x=>x.classList.remove('err'));
    const fd=Object.fromEntries(new FormData(f).entries());
    const bad=(id,msg)=>{ $('#'+id,root).classList.add('err'); err.textContent=msg; err.hidden=false; $('#'+id,root).focus(); };
    if(!fd.companyId) return bad('i-company','Válassza ki a céget.');
    if(!fd.invoiceNo.trim()) return bad('i-no','Adja meg a számla számát.');
    if(!fd.issueDate) return bad('i-issue','Adja meg a kiállítás dátumát.');
    if(fd.amount===''||Number(fd.amount)<0) return bad('i-amount','Adja meg az összeget.');
    if(!fd.dueDate) return bad('i-due','Adja meg a fizetési határidőt.');
    const base=edit?{...edit}:{id:uid(),type:'invoice',createdAt:Date.now(),notifiedAt:''};
    Object.assign(base,{companyId:fd.companyId,invoiceNo:fd.invoiceNo.trim(),issueDate:fd.issueDate,amount:Math.round(Number(fd.amount)),dueDate:fd.dueDate,paidDate:fd.paidDate||'',note:(fd.note||'').trim()}); delete base.sample;
    put('items',base); toast(edit?'Számla módosítva':'Számla mentve','ok'); stack=[]; route={screen:'invoice',params:{}}; render();
  };
};

/* ---------- ADATBANK ---------- */
function renderData(){
  const tabs=[['companies','Cégek'],['drivers','Gépkocsivezetők'],['vehicles','Járművek']];
  let body='';
  if(ui.dataTab==='companies'){
    const q=ui.search.trim().toLocaleLowerCase('hu');
    const list=sortBy(S.companies.filter(c=>!q||c.name.toLocaleLowerCase('hu').includes(q)||(c.taxId||'').includes(q)),c=>c.name.toLocaleLowerCase('hu'));
    body=`<form class="fgroup" id="cf" novalidate>
        <div class="gh"><span class="ico" style="--cs:var(--brand-soft);--c:var(--brand)">${I.building}</span><div><h2>Új cég rögzítése</h2><div class="d">Név és adószám</div></div></div>
        <div class="field"><label for="c-name">Cég neve <span class="req">*</span></label><input class="ctl" id="c-name" name="name" placeholder="Pl. Példa Kft." autocomplete="off"></div>
        <div class="field"><label for="c-tax">Adószám</label><input class="ctl num" id="c-tax" name="taxId" placeholder="12345678-2-42" inputmode="numeric" autocomplete="off"></div>
        <div class="ferr" id="c-err" hidden></div>
        <button class="btn primary block" type="submit">${I.plus} Cég rögzítése</button>
      </form>
      <div class="search"><input class="ctl" id="c-search" placeholder="Keresés a cégek között…" value="${esc(ui.search)}" autocomplete="off">${I.search}</div>
      <div class="sec-h"><h2>Rögzített cégek</h2><span class="n num">${list.length} db</span></div>
      ${list.length?`<div class="panel"><div class="rows" style="padding:0 12px">${list.map(c=>{const nd=S.drivers.filter(d=>d.companyId===c.id).length,nv=S.vehicles.filter(v=>v.companyId===c.id).length,ni=S.items.filter(i=>i.companyId===c.id&&!isDone(i)).length;
        return `<div class="rowi"><span class="av">${esc(c.name.slice(0,2).toLocaleUpperCase('hu'))}</span><div style="min-width:0"><div class="n">${esc(c.name)}${c.sample?' <span class="tag neutral">minta</span>':''}</div><div class="m">${c.taxId?`Adószám: <span class="num">${esc(c.taxId)}</span> · `:''}${nd} sofőr · ${nv} jármű · ${ni} teendő</div></div>
        <div class="ops"><button data-edit-c="${c.id}" aria-label="Szerkesztés">${I.pen}</button><button class="del" data-del-c="${c.id}" aria-label="Törlés">${I.trash}</button></div></div>`}).join('')}</div></div>`
      :`<div class="empty"><div class="ico">${I.building}</div><h3>${q?'Nincs találat':'Még nincs rögzített cég'}</h3><p>${q?'Próbáljon más keresőszót.':'A cégekhez külön sofőr- és járműlista tartozik. Rögzítse az első céget fent.'}</p></div>`}`;
  } else {
    const isD=ui.dataTab==='drivers'; const coll=isD?S.drivers:S.vehicles;
    if(!S.companies.some(c=>c.id===ui.dataCompany)) ui.dataCompany=(S.companies[0]||{}).id||'';
    const list=sortBy(coll.filter(x=>x.companyId===ui.dataCompany),x=>isD?x.name:x.plate);
    body=`<form class="fgroup" id="xf" novalidate>
        <div class="gh"><span class="ico" style="--cs:${isD?'var(--card-soft)':'var(--vu-soft)'};--c:${isD?'var(--card)':'var(--vu)'}">${isD?I.user:I.truck}</span><div><h2>${isD?'Gépkocsivezető rögzítése':'Jármű rögzítése'}</h2><div class="d">${isD?'Sofőr az adott céghez':'Jármű az adott céghez'}</div></div></div>
        <div class="field"><label for="x-company">Cég kiválasztása <span class="req">*</span></label><div class="selwrap"><select class="ctl" id="x-company">${S.companies.length?sortBy(S.companies,c=>c.name.toLocaleLowerCase('hu')).map(c=>`<option value="${c.id}" ${c.id===ui.dataCompany?'selected':''}>${esc(c.name)}</option>`).join(''):'<option value="">Előbb rögzítsen céget</option>'}</select></div></div>
        ${isD?`<div class="field"><label for="x-val">Gépkocsivezető neve <span class="req">*</span></label><input class="ctl" id="x-val" placeholder="Pl. Kovács János" autocomplete="off" autocapitalize="words"><div class="hint">Minden szó nagybetűvel kezdődik – az app automatikusan javítja.</div></div>`
             :`<div class="field"><label for="x-val">Rendszám <span class="req">*</span></label><input class="ctl num" id="x-val" placeholder="Pl. ABC-123" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.06em"><div class="hint">Mindig nagybetűvel kerül rögzítésre.</div></div>`}
        <div class="ferr" id="x-err" hidden></div>
        <button class="btn primary block" type="submit" ${S.companies.length?'':'disabled'}>${I.plus} ${isD?'Gépkocsivezető rögzítése':'Jármű rögzítése'}</button>
      </form>
      <div class="sec-h"><h2>${isD?'Rögzített gépkocsivezetők':'Rögzített járművek'}</h2><span class="n">${esc(cName(ui.dataCompany))} · ${list.length} db</span></div>
      ${list.length?`<div class="panel"><div class="rows" style="padding:0 12px">${list.map(x=>`<div class="rowi"><span class="av ${isD?'':'plate'}">${isD?esc(x.name.split(' ').map(w=>w[0]).join('').slice(0,2)):I.truck}</span><div style="min-width:0"><div class="n">${isD?esc(x.name):`<span class="plate-pill">${esc(x.plate)}</span>`}${x.sample?' <span class="tag neutral">minta</span>':''}</div><div class="m">${S.items.filter(i=>!isDone(i)&&(isD?i.driverId===x.id:i.vehicleId===x.id)).length} aktív emlékeztető</div></div>
        <div class="ops"><button data-edit-x="${x.id}" aria-label="Szerkesztés">${I.pen}</button><button class="del" data-del-x="${x.id}" aria-label="Törlés">${I.trash}</button></div></div>`).join('')}</div></div>`
      :`<div class="empty"><div class="ico">${isD?I.user:I.truck}</div><h3>${S.companies.length?`Ehhez a céghez még nincs ${isD?'sofőr':'jármű'}`:'Előbb rögzítsen céget'}</h3><p>${S.companies.length?'Rögzítse fent, és az emlékeztetőknél azonnal választható lesz.':'A Cégek fülön vegye fel az első céget.'}</p></div>`}`;
  }
  return hdr('Adatbank','Cégek, gépkocsivezetők és járművek')+`<main>
    <div class="segs">${tabs.map(([k,l])=>`<button aria-pressed="${ui.dataTab===k}" data-dtab="${k}">${l}</button>`).join('')}</div>
    ${body}
  </main>`;
}
afterHooks.data=root=>{
  root.querySelectorAll('[data-dtab]').forEach(b=>b.onclick=()=>{ui.dataTab=b.dataset.dtab;ui.search='';saveUI();render();});
  const cf=$('#cf',root);
  if(cf){
    cf.onsubmit=e=>{ e.preventDefault(); const name=companyFmt($('#c-name',root).value); const tax=$('#c-tax',root).value.trim(); const err=$('#c-err',root);
      if(!name){ err.textContent='Adja meg a cég nevét.'; err.hidden=false; $('#c-name',root).focus(); return; }
      if(S.companies.some(c=>c.name.toLocaleLowerCase('hu')===name.toLocaleLowerCase('hu'))){ err.textContent='Ilyen nevű cég már szerepel.'; err.hidden=false; return; }
      const c={id:uid(),name,taxId:tax,createdAt:Date.now()}; put('companies',c); ui.dataCompany=c.id; saveUI(); toast('Cég rögzítve','ok'); render(); };
    const s=$('#c-search',root); s.oninput=()=>{ ui.search=s.value; const pos=s.selectionStart; render(); const n=$('#c-search'); n.focus(); n.setSelectionRange(pos,pos); };
    root.querySelectorAll('[data-edit-c]').forEach(b=>b.onclick=()=>editCompany(b.dataset.editC));
    root.querySelectorAll('[data-del-c]').forEach(b=>b.onclick=async()=>{ const c=company(b.dataset.delC); const nd=S.drivers.filter(d=>d.companyId===c.id).length,nv=S.vehicles.filter(v=>v.companyId===c.id).length,ni=S.items.filter(i=>i.companyId===c.id).length;
      const extra=(nd||nv||ni)?` Vele együtt törlődik ${nd} sofőr, ${nv} jármű és ${ni} teendő/számla.`:'';
      if(await confirmSheet('Cég törlése',`${c.name}.${extra} A törlés nem vonható vissza.`,'Törlés',true)){ S.items.filter(i=>i.companyId===c.id).forEach(i=>remove('items',i.id)); S.drivers.filter(d=>d.companyId===c.id).forEach(d=>remove('drivers',d.id)); S.vehicles.filter(v=>v.companyId===c.id).forEach(v=>remove('vehicles',v.id)); remove('companies',c.id); toast('Cég törölve'); render(); } });
  }
  const xf=$('#xf',root);
  if(xf){
    const isD=ui.dataTab==='drivers'; const sel=$('#x-company',root); const val=$('#x-val',root);
    sel.onchange=()=>{ ui.dataCompany=sel.value; saveUI(); render(); };
    val.onblur=()=>{ val.value=isD?titleCase(val.value):plateFmt(val.value); };
    xf.onsubmit=e=>{ e.preventDefault(); const err=$('#x-err',root); const cid=sel.value; const v=isD?titleCase(val.value):plateFmt(val.value);
      if(!cid){ err.textContent='Válasszon céget.'; err.hidden=false; return; }
      if(!v){ err.textContent=isD?'Adja meg a gépkocsivezető nevét.':'Adja meg a rendszámot.'; err.hidden=false; val.focus(); return; }
      const coll=isD?'drivers':'vehicles'; if(S[coll].some(x=>x.companyId===cid&&(isD?x.name:x.plate)===v)){ err.textContent=isD?'Ez a sofőr már szerepel ennél a cégnél.':'Ez a rendszám már szerepel ennél a cégnél.'; err.hidden=false; return; }
      put(coll,isD?{id:uid(),companyId:cid,name:v}:{id:uid(),companyId:cid,plate:v}); toast(isD?'Gépkocsivezető rögzítve':'Jármű rögzítve','ok'); render(); $('#x-val').focus(); };
    root.querySelectorAll('[data-edit-x]').forEach(b=>b.onclick=()=>editChild(isD,b.dataset.editX));
    root.querySelectorAll('[data-del-x]').forEach(b=>b.onclick=async()=>{ const coll=isD?'drivers':'vehicles'; const x=S[coll].find(y=>y.id===b.dataset.delX); const n=S.items.filter(i=>isD?i.driverId===x.id:i.vehicleId===x.id).length;
      if(await confirmSheet(isD?'Gépkocsivezető törlése':'Jármű törlése',`${isD?x.name:x.plate}.${n?` A hozzá tartozó ${n} emlékeztető is törlődik.`:''}`,'Törlés',true)){ S.items.filter(i=>isD?i.driverId===x.id:i.vehicleId===x.id).forEach(i=>remove('items',i.id)); remove(coll,x.id); toast('Törölve'); render(); } });
  }
};
function editCompany(id){
  const c=company(id);
  sheet(`<h3>Cég szerkesztése</h3><form class="form" id="sf"><div class="field"><label for="s-name">Cég neve</label><input class="ctl" id="s-name" value="${esc(c.name)}"></div><div class="field"><label for="s-tax">Adószám</label><input class="ctl num" id="s-tax" value="${esc(c.taxId||'')}"></div><div class="actions"><button type="button" class="btn ghost" data-close>Mégse</button><button class="btn primary" type="submit">Mentés</button></div></form>`,
  el=>{ $('#sf',el).onsubmit=e=>{ e.preventDefault(); const name=companyFmt($('#s-name',el).value); if(!name) return; const o={...c,name,taxId:$('#s-tax',el).value.trim()}; delete o.sample; put('companies',o); closeOverlay(); toast('Mentve','ok'); render(); }; });
}
function editChild(isD,id){
  const coll=isD?'drivers':'vehicles'; const x=S[coll].find(y=>y.id===id);
  sheet(`<h3>${isD?'Gépkocsivezető szerkesztése':'Jármű szerkesztése'}</h3><form class="form" id="sf"><div class="field"><label for="s-company">Cég</label><div class="selwrap"><select class="ctl" id="s-company">${sortBy(S.companies,c=>c.name).map(c=>`<option value="${c.id}" ${c.id===x.companyId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div></div><div class="field"><label for="s-val">${isD?'Név':'Rendszám'}</label><input class="ctl" id="s-val" value="${esc(isD?x.name:x.plate)}"></div><div class="actions"><button type="button" class="btn ghost" data-close>Mégse</button><button class="btn primary" type="submit">Mentés</button></div></form>`,
  el=>{ $('#sf',el).onsubmit=e=>{ e.preventDefault(); const v=isD?titleCase($('#s-val',el).value):plateFmt($('#s-val',el).value); if(!v) return; const o={...x,companyId:$('#s-company',el).value}; delete o.sample; if(isD) o.name=v; else o.plate=v; put(coll,o);
      // keep reminders consistent with the new company
      S.items.filter(i=>isD?i.driverId===x.id:i.vehicleId===x.id).forEach(i=>{ if(i.companyId!==o.companyId) put('items',{...i,companyId:o.companyId}); });
      closeOverlay(); toast('Mentve','ok'); render(); }; });
}

/* ---------- ÉRTESÍTÉSEK ---------- */
function renderNotif(){
  const t=todayISO(); const open=sortBy(openItems(),itemWhen);
  const groups=[['Lejárt',open.filter(i=>itemWhen(i).split('T')[0]<t)],['Ma',open.filter(i=>itemWhen(i).split('T')[0]===t)],['Következő 7 nap',open.filter(i=>{const d=dayDiff(itemWhen(i));return d>0&&d<=7})]];
  const perm=('Notification' in window)?Notification.permission:'unsupported';
  const nitem=i=>{const T=TYPES[i.type];const w=itemWhen(i);const txt=i.type==='training'?`Oktatás – ${cName(i.companyId)} · ${fmtDT(w)} · ${i.address}${i.contactName?` · ${i.contactName}`:''}${i.contactPhone?` · ${i.contactPhone}`:''}`
    :i.type==='invoice'?`${i.dueDate<t?'Lejárt a számla határideje':'Számla esedékes'} – ${cName(i.companyId)} / ${i.invoiceNo} / ${fmtFt(i.amount)}`
    :`${T.name} – ${cName(i.companyId)} · ${itemSub(i)} · ${fmtDT(w)}`;
    return `<button class="nitem ${T.cls}" data-open="${i.id}"><span class="ico">${T.icon}</span><span><div class="h">${esc(txt)}</div><div class="d">${relLabel(w).t}</div></span></button>`;};
  return hdr('Értesítések','',{back:true,right:''})+`<main>
    <div class="panel"><div class="pad" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:200px"><div style="font-weight:800">Böngésző-értesítések</div><div class="hint" style="font-size:12.5px;color:var(--muted)">${perm==='granted'?'Bekapcsolva. Amíg az app nyitva van, felugró értesítést kap az esedékes tételekről.':perm==='denied'?'Letiltva a böngészőben. A böngésző oldalbeállításaiban engedélyezheti újra.':perm==='unsupported'?'Ez a böngésző nem támogatja.':'Kapcsolja be, hogy felugró értesítést kapjon az esedékes tételekről.'}</div></div>${perm==='default'?`<button class="btn sm primary" data-act="askperm">Bekapcsolás</button>`:''}</div></div>
    ${groups.every(g=>!g[1].length)?`<div class="empty"><div class="ico">${I.bell}</div><h3>Nincs esedékes értesítés</h3><p>A következő 7 napban nincs lejáró vagy esedékes tétel.</p></div>`:groups.filter(g=>g[1].length).map(([h,l])=>`<div class="sec-h"><h2>${h}</h2><span class="n num">${l.length}</span></div><div class="panel"><div class="pad" style="padding-block:4px">${l.map(nitem).join('')}</div></div>`).join('')}
    <div class="info">${I.info}<span><b>Mikor szól az app?</b><br>• Letöltéseknél: a megadott emlékeztető dátum + óra:perc időpontban.<br>• Oktatásnál: az oktatás napján 06:00-kor.<br>• Számlánál: a határidő lejártakor, ha nincs kifizetve.</span></div>
  </main>`;
}
afterHooks.notif=root=>{ const b=$('[data-act="askperm"]',root); if(b) b.onclick=async()=>{ try{ await Notification.requestPermission(); }catch(e){} render(); checkNotifications(); }; };

/* ---------- BEÁLLÍTÁSOK ---------- */
function renderSettings(){
  const cnt=`${S.companies.length} cég · ${S.drivers.length} sofőr · ${S.vehicles.length} jármű · ${S.items.length} tétel`;
  const perm=('Notification' in window)?Notification.permission:'unsupported';
  return hdr('Beállítások','',{back:true,right:''})+`<main>
    <div class="sec-h"><h2>Fiók</h2></div>
    <div class="panel"><div class="pad" style="padding-block:4px">
      <div class="kv"><div><div class="k">${esc(user.user_metadata&&user.user_metadata.full_name||'Felhasználó')}</div><div class="d">${esc(user.email||'')}</div></div><span class="pill ok">Bejelentkezve</span></div>
      <div class="kv"><div><div class="k">Adatszinkron</div><div class="d">${ui.offline?'Nincs kapcsolat – az eszközön mentett másolatot látja. Kapcsolat után minden szinkronizálódik.':'Felhőben, a fiókjához kötve. Telefonon és gépen ugyanazt látja.'}</div></div><span class="pill ${ui.offline?'warn':'ok'}">${ui.offline?'Offline':'Szinkronizált'}</span></div>
      <div class="kv"><div><div class="k">Adatállomány</div><div class="d">${cnt}</div></div></div>
    </div></div>
    <div class="panel"><div class="pad" style="display:flex;flex-direction:column;gap:10px">
      <button class="btn secondary block" data-act="pw">${I.pen} Jelszó módosítása</button>
      <button class="btn ghost block" data-act="signout">Kijelentkezés</button>
    </div></div>
    <div class="sec-h"><h2>Értesítések</h2></div>
    <div class="panel"><div class="pad" style="padding-block:4px">
      <div class="kv"><div><div class="k">${isNative()?'Push-értesítések a telefonon':'Böngésző-értesítések'}</div><div class="d">${isNative()?'Az app a telefon értesítési rendszerén keresztül szól az esedékes tételekről, zárt app mellett is.':perm==='granted'?'Bekapcsolva. Amíg az app nyitva van, felugró értesítést kap.':perm==='denied'?'Letiltva a böngészőben. A böngésző oldalbeállításaiban engedélyezheti újra.':perm==='unsupported'?'Ez a böngésző nem támogatja.':'Kapcsolja be, hogy felugró értesítést kapjon az esedékes tételekről.'}</div></div>${(!isNative()&&perm==='default')?`<button class="btn sm primary" data-act="askperm">Bekapcsolás</button>`:''}</div>
    </div></div>
    <div class="sec-h"><h2>Adatok</h2></div>
    <div class="panel"><div class="pad" style="display:flex;flex-direction:column;gap:10px">
      <button class="btn secondary block" data-act="export">${I.dl} Biztonsági mentés (JSON)</button>
      <button class="btn secondary block" data-act="export-csv">${I.dl} Teendők exportálása Excelbe (CSV)</button>
      <label class="btn ghost block" style="cursor:pointer">${I.refresh} Visszaállítás mentésből<input type="file" id="imp" accept="application/json,.json" hidden></label>
      ${hasSamples()?`<button class="btn danger block" data-act="clear-samples">${I.trash} Mintaadatok törlése</button>`:`<button class="btn ghost block" data-act="load-samples">Mintaadatok betöltése (kipróbáláshoz)</button>`}
    </div></div>
    <div class="sec-h"><h2>Működési szabályok</h2></div>
    <div class="panel"><div class="pad" style="padding-block:4px">
      ${[['Fedélzeti egység','Következő letöltés: letöltés ideje + 90 naptári nap.'],['Vezetői kártya','Következő letöltés: letöltés ideje + 28 naptári nap.'],['Számla','Fizetési határidő: kiállítás + 30 naptári nap. Lejárt és kifizetetlen → értesítés.'],['Oktatás','Értesítés az oktatás napján 06:00-kor.'],['Nevek','A gépkocsivezető nevében minden szó nagybetűvel kezdődik.'],['Rendszámok','Mindig nagybetűvel kerülnek rögzítésre.'],['Teendő lista','Minden tétel dátum és idő szerint, időrendben.']].map(([k,d])=>`<div class="kv"><div><div class="k">${k}</div><div class="d">${d}</div></div></div>`).join('')}
    </div></div>
    <div class="sec-h"><h2>Jogi</h2></div>
    <div class="panel"><div class="pad" style="padding-block:4px">
      <a class="kv" href="/terms" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><div class="k">Felhasználási feltételek</div>${I.chev}</a>
      <a class="kv" href="/privacy" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><div class="k">Adatkezelési tájékoztató</div>${I.chev}</a>
    </div></div>
    <button class="btn danger block" data-act="delacc">${I.trash} Fiók végleges törlése</button>
    <div style="text-align:center;color:var(--faint);font-size:12px;font-weight:600;padding:8px">BenAde – Tachográf Emlékeztető · v1.0 · Időben. Biztonságban.</div>
  </main>`;
}
afterHooks.settings=root=>{
  const on=(a,fn)=>{const b=$(`[data-act="${a}"]`,root); if(b) b.onclick=fn;};
  on('askperm',async()=>{ try{ await Notification.requestPermission(); }catch(e){} render(); checkNotifications(); });
  on('signout',async()=>{ if(await confirmSheet('Kijelentkezés','Az adatai a fiókjában maradnak, legközelebb bejelentkezés után újra látja őket.','Kijelentkezés')) ctx.signOut(); });
  on('pw',()=>sheet(`<h3>Jelszó módosítása</h3><form class="form" id="sf"><div class="field"><label for="s-p1">Új jelszó</label><input class="ctl" type="password" id="s-p1" minlength="8" autocomplete="new-password" placeholder="Legalább 8 karakter"></div><div class="field"><label for="s-p2">Új jelszó még egyszer</label><input class="ctl" type="password" id="s-p2" autocomplete="new-password"></div><div class="ferr" id="s-err" hidden></div><div class="actions"><button type="button" class="btn ghost" data-close>Mégse</button><button class="btn primary" type="submit">Mentés</button></div></form>`,
    el=>{ $('#sf',el).onsubmit=async e=>{ e.preventDefault(); const p1=$('#s-p1',el).value,p2=$('#s-p2',el).value,err=$('#s-err',el); if(p1.length<8){err.textContent='A jelszó legalább 8 karakter legyen.';err.hidden=false;return;} if(p1!==p2){err.textContent='A két jelszó nem egyezik.';err.hidden=false;return;}
      const r=await ctx.changePassword(p1); if(r){ err.textContent=r; err.hidden=false; return; } closeOverlay(); toast('Jelszó módosítva','ok'); }; }));
  on('delacc',()=>sheet(`<h3>Fiók végleges törlése</h3><p>Minden cég, sofőr, jármű, emlékeztető és számla törlődik, és a fiók megszűnik. Ez nem vonható vissza. Megerősítésként írja be: <b>TÖRLÉS</b></p><form class="form" id="sf"><input class="ctl" id="s-conf" autocomplete="off" placeholder="TÖRLÉS"><div class="ferr" id="s-err" hidden></div><div class="actions"><button type="button" class="btn ghost" data-close>Mégse</button><button class="btn danger" type="submit">Fiók törlése</button></div></form>`,
    el=>{ $('#sf',el).onsubmit=async e=>{ e.preventDefault(); const err=$('#s-err',el); if($('#s-conf',el).value.trim().toUpperCase()!=='TÖRLÉS'){ err.textContent='Írja be pontosan: TÖRLÉS'; err.hidden=false; return; } const r=await ctx.deleteAccount(); if(r){ err.textContent=r; err.hidden=false; } }; }));
  on('export',()=>saveFile(`benade-mentes-${todayISO()}.json`,JSON.stringify({app:'BenAde',version:1,exportedAt:new Date().toISOString(),companies:S.companies,drivers:S.drivers,vehicles:S.vehicles,items:S.items},null,2),'application/json'));
  on('export-csv',()=>{ const rows=[['Dátum','Idő','Típus','Cég','Kapcsolódó adat','Letöltés ideje','Következő letöltés','Összeg','Fizetési határidő','Kifizetve','Megjegyzés','Állapot']];
    sortBy(S.items,itemWhen).forEach(i=>{const w=itemWhen(i);rows.push([fmtDate(w),i.type==='invoice'?'':fmtTime(w),TYPES[i.type].name,cName(i.companyId),itemSub(i),i.downloadDate?fmtDate(i.downloadDate):'',i.nextDownload?fmtDate(i.nextDownload):'',i.amount??'',i.dueDate?fmtDate(i.dueDate):'',i.paidDate?fmtDate(i.paidDate):'',i.note||'',isDone(i)?'Elvégezve':'Nyitott']);});
    const csv='﻿'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\r\n'); saveFile(`benade-teendok-${todayISO()}.csv`,csv,'text/csv'); });
  on('clear-samples',async()=>{ if(await confirmSheet('Mintaadatok törlése','Minden „minta” jelölésű adat törlődik.','Törlés',true)){ clearSamples(); } });
  on('load-samples',()=>{ seedSamples(); toast('Mintaadatok betöltve'); render(); });
  const imp=$('#imp',root); imp.onchange=()=>{ const f=imp.files[0]; if(!f) return; const r=new FileReader(); r.onload=async()=>{ try{ const d=JSON.parse(r.result); if(!d||!Array.isArray(d.items)) throw 0; const n=COLLS.reduce((s,c)=>s+(Array.isArray(d[c])?d[c].length:0),0);
      if(await confirmSheet('Visszaállítás',`${n} tétel kerül betöltésre a mentésből. A meglévő adatok megmaradnak.`,'Betöltés')){ COLLS.forEach(c=>(d[c]||[]).forEach(o=>{ if(o&&o.id) put(c,o); })); toast('Visszaállítva','ok'); render(); } }catch(e){ toast('Ez nem BenAde mentésfájl','err'); } }; r.readAsText(f); };
};
function saveFile(filename,data,mime){
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:mime})); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },2000); }catch(e){}
  if(isNative()||/iPhone|iPad/.test(navigator.userAgent)){
    sheet(`<h3>Mentés másolással</h3><p>Ha a letöltés nem indult el, másolja ki a tartalmat és illessze be egy jegyzetbe vagy e-mailbe <b>${esc(filename)}</b> néven.</p><textarea class="ctl" id="cp" style="min-height:160px;font-size:12px;font-family:ui-monospace,monospace" readonly>${esc(data)}</textarea><div class="actions" style="margin-top:12px"><button class="btn ghost" data-close>Bezárás</button><button class="btn primary" id="cpb">Másolás</button></div>`,
      el=>{ $('#cpb',el).onclick=async()=>{ try{ await navigator.clipboard.writeText(data); toast('Vágólapra másolva','ok'); }catch(e){ $('#cp',el).select(); toast('Jelölje ki és másolja'); } }; });
  } else toast('Letöltés elindítva','ok');
}
/* ---------- overlay: sheet, confirm, toast ---------- */
function sheet(html,onMount){
  const o=$('#overlay'); o.innerHTML=`<div class="scrim"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const scrim=$('.scrim',o); scrim.onclick=e=>{ if(e.target===scrim) closeOverlay(); };
  o.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeOverlay);
  if(onMount) onMount(o); const first=o.querySelector('input,select,textarea,button'); if(first) first.focus();
}
function closeOverlay(){ $('#overlay').innerHTML=''; }
function confirmSheet(title,msg,ok='Rendben',danger=false){ return new Promise(res=>{ sheet(`<h3>${esc(title)}</h3><p>${esc(msg)}</p><div class="actions"><button class="btn ghost" data-close>Mégse</button><button class="btn ${danger?'danger':'primary'}" id="okb">${esc(ok)}</button></div>`,el=>{ $('#okb',el).onclick=()=>{ closeOverlay(); res(true); }; el.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{ closeOverlay(); res(false); }); const s=$('.scrim',el); s.onclick=e=>{ if(e.target===s){ closeOverlay(); res(false);} }; }); }); }
let toastT; function toast(msg,kind=''){ let t=$('.toast'); if(t) t.remove(); t=document.createElement('div'); t.className='toast '+kind; t.textContent=msg; root.appendChild(t); clearTimeout(toastT); toastT=setTimeout(()=>t.remove(),2600); }

/* ---------- notifications (browser + native) ---------- */
function isNative(){ try{ return !!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()); }catch(e){ return false; } }
function notifBody(it){
  if(it.type==='training') return `${cName(it.companyId)} · ${fmtDT(it.trainingAt)} · ${it.address}${it.contactName?` · ${it.contactName}`:''}${it.contactPhone?` · ${it.contactPhone}`:''}`;
  if(it.type==='invoice') return `Lejárt a számla határideje – ${cName(it.companyId)} / ${it.invoiceNo} / ${fmtFt(it.amount)}`;
  return `${cName(it.companyId)} · ${itemSub(it)} · következő letöltés: ${fmtDate(it.nextDownload)}`;
}
function checkNotifications(){
  if(isNative()) return;
  if(!('Notification' in window)||Notification.permission!=='granted') return;
  const now=nowLocalISO();
  openItems().forEach(it=>{
    const at=notifyAt(it); if(!at||at>now||it.notifiedAt) return;
    const T=TYPES[it.type];
    try{ const n=new Notification('BenAde – '+T.name,{body:notifBody(it),tag:it.id}); n.onclick=()=>{ window.focus(); go('detail',{id:it.id,from:'todo'}); }; }catch(e){}
    put('items',{...it,notifiedAt:now});
  });
}
let hash=(s)=>{ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h)%2000000000; };
let nativeT;
async function scheduleNative(){
  if(!isNative()) return;
  clearTimeout(nativeT);
  nativeT=setTimeout(async()=>{
    try{
      const LN=window.Capacitor.Plugins.LocalNotifications; if(!LN) return;
      let p=await LN.checkPermissions(); if(p.display!=='granted'){ p=await LN.requestPermissions(); } if(p.display!=='granted') return;
      const pend=await LN.getPending(); if(pend&&pend.notifications&&pend.notifications.length) await LN.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});
      const now=new Date();
      const list=sortBy(openItems().map(it=>({it,at:parseLocal(notifyAt(it))})).filter(x=>x.at&&x.at>now),x=>x.at.getTime()).slice(0,60);
      if(!list.length) return;
      await LN.schedule({notifications:list.map(({it,at})=>({id:hash(it.id),title:'BenAde – '+TYPES[it.type].name,body:notifBody(it),schedule:{at,allowWhileIdle:true},extra:{id:it.id},smallIcon:'ic_stat_benade',iconColor:'#1E5EFF'}))});
    }catch(e){ console.warn('native schedule failed',e); }
  },800);
}
if(isNative()){ try{ window.Capacitor.Plugins.LocalNotifications.addListener('localNotificationActionPerformed',ev=>{ const id=ev&&ev.notification&&ev.notification.extra&&ev.notification.extra.id; if(id) go('detail',{id,from:'todo'}); }); }catch(e){} }
const _put=put; put=function(coll,obj){ _put(coll,obj); if(coll==='items') scheduleNative(); };
const _remove=remove; remove=function(coll,id){ _remove(coll,id); if(coll==='items') scheduleNative(); };
const tick=setInterval(()=>{ checkNotifications(); if(route.screen==='todo') renderTabs(); },30000);
const onVis=()=>{ if(!document.hidden){ checkNotifications(); render(); } };
document.addEventListener('visibilitychange',onVis);

/* ---------- boot ---------- */
render();
initStorage().then(()=>setTimeout(checkNotifications,1500));
return { destroy(){ clearInterval(tick); document.removeEventListener('visibilitychange',onVis); if(channel){ try{ supabase.removeChannel(channel); }catch(e){} } } };
}
