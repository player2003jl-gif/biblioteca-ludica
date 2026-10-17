/* Biblioteca Lúdica II — API final Cloudflare: layout D1 + catálogo D1 + EPUB/PDF R2. */
const ORIGIN='https://player2003jl-gif.github.io';
const enc=new TextEncoder();
const dec=new TextDecoder();
const b64url=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),x=>x.charCodeAt(0));
const part=s=>JSON.parse(dec.decode(b64url(s)));
let cachedKeys=null,expiry=0;

function cors(req,cache='no-store'){
 const h=new Headers({'Cache-Control':cache,'Vary':'Origin','X-Content-Type-Options':'nosniff'});
 if(req.headers.get('Origin')===ORIGIN){
  h.set('Access-Control-Allow-Origin',ORIGIN);
  h.set('Access-Control-Allow-Headers','Authorization, Content-Type, X-BL2-File-Name');
  h.set('Access-Control-Allow-Methods','GET, HEAD, PUT, OPTIONS');
 }
 return h;
}
function json(req,status,data){const h=cors(req);h.set('Content-Type','application/json; charset=utf-8');return new Response(JSON.stringify(data),{status,headers:h});}
const fail=(req,status,message)=>json(req,status,{error:message});

async function auth(req,env){
 const hdr=req.headers.get('Authorization')||'';
 if(!hdr.startsWith('Bearer ')||!env.C3_ADMIN_GOOGLE_SUB||!env.GOOGLE_CLIENT_ID)return false;
 try{
  const bits=hdr.slice(7).split('.');
  if(bits.length!==3||bits.some(s=>!s||s.length>14000))return false;
  const head=part(bits[0]),claims=part(bits[1]),now=Math.floor(Date.now()/1000);
  if(head.alg!=='RS256'||typeof head.kid!=='string'||claims.aud!==env.GOOGLE_CLIENT_ID||
    !['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||
    claims.sub!==env.C3_ADMIN_GOOGLE_SUB||typeof claims.exp!=='number'||claims.exp<=now||
    typeof claims.iat!=='number'||claims.iat>now+60)return false;
  if(!cachedKeys||Date.now()>expiry){
   const r=await fetch('https://www.googleapis.com/oauth2/v3/certs');if(!r.ok)return false;
   const b=await r.json();if(!Array.isArray(b.keys))return false;cachedKeys=b.keys;expiry=Date.now()+300000;
  }
  const jwk=cachedKeys.find(k=>k.kid===head.kid&&k.kty==='RSA');if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64url(bits[2]),enc.encode(bits[0]+'.'+bits[1]));
 }catch{return false;}
}
async function shaText(s){const b=await crypto.subtle.digest('SHA-256',enc.encode(s));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');}
async function shaBytes(b){const d=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('');}

function isLayout(d){
 if(!d||typeof d!=='object'||![6,7].includes(d.version)||d.architecture!=='reception-library-virtual-reading'||
    !d.rooms||!d.roomSizes||!d.doors||!d.npcs||!d.scene||typeof d.interactionModes!=='object')return false;
 const used=new Set();
 for(const id of ['hall','archive']){
  const objs=d.rooms[id],size=d.roomSizes[id],doors=d.doors[id],scenes=d.scene[id];
  if(!Array.isArray(objs)||objs.length>80||!size||!Number.isInteger(size.tilesW)||!Number.isInteger(size.tilesH)||
    size.tilesW<12||size.tilesH<12||size.tilesW>96||size.tilesH>96||!Array.isArray(doors)||doors.length>20||!Array.isArray(scenes)||scenes.length>256)return false;
  for(const o of objs){
   if(!o||typeof o.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(o.id)||used.has(o.id)||!['shelf','table','counter'].includes(o.kind)||
     ![o.x,o.y,o.w,o.h].every(Number.isFinite)||o.w<8||o.h<8||o.w>440||o.h>320||
     (o.shelfName!==undefined&&(typeof o.shelfName!=='string'||o.shelfName.length>80)))return false;used.add(o.id);
  }
  for(const o of doors)if(!o||typeof o.id!=='string'||!['west','east','north','south'].includes(o.side)||![o.x,o.y,o.width].every(Number.isFinite)||o.width<8||o.width>400)return false;
  for(const o of scenes){if(!o||typeof o.id!=='string'||!/^scene-[a-zA-Z0-9-]{1,100}$/.test(o.id)||used.has(o.id)||typeof o.assetKey!=='string'||o.assetKey.length>100||!Number.isInteger(o.x)||!Number.isInteger(o.y))return false;used.add(o.id);}
  const n=d.npcs[id];if(n!=null&&(typeof n.id!=='string'||![n.x,n.y].every(Number.isFinite)))return false;
 }
 return Object.keys(d.interactionModes).length<=400&&Object.values(d.interactionModes).every(x=>['both','highlight','indicator','none'].includes(x));
}
function short(v,n){return typeof v==='string'&&v.length<=n;}
function isCatalog(c){
 if(!c||c.version!==1||!Array.isArray(c.books)||c.books.length>1000)return false;
 const ids=new Set();
 for(const b of c.books){
  if(!b||!short(b.id,120)||ids.has(b.id)||!short(b.title,240)||!short(b.author||'',240)||b.kind!=='epub'||
    !short(b.shelf||'geral',80)||!short(b.shelfId||'',120)||!short(b.assetSha256,64)||!/^[a-f0-9]{64}$/.test(b.assetSha256)||
    !Number.isSafeInteger(b.size)||b.size<1||b.size>60*1024*1024||!short(b.mediaType,100)||b.mediaType!=='application/epub+zip'||
    !short(b.originalName||'',240)||!Number.isFinite(b.importedAt||0)||!b.bibliographic||typeof b.bibliographic!=='object'||Array.isArray(b.bibliographic)||
    JSON.stringify(b.bibliographic).length>16000)return false;
  ids.add(b.id);
 }
 return true;
}
async function assetsExist(env,catalog){
 const set=[...new Set(catalog.books.map(b=>b.assetSha256))];
 for(let i=0;i<set.length;i+=20){
  const batch=set.slice(i,i+20),heads=await Promise.all(batch.map(s=>env.BOOKS.head('assets/'+s)));
  if(heads.some(x=>!x))return false;
 }
 return true;
}

export default {async fetch(req,env){
 const u=new URL(req.url),path=u.pathname.replace(/\/$/,'');
 if(req.method==='OPTIONS')return req.headers.get('Origin')===ORIGIN?new Response(null,{status:204,headers:cors(req)}):fail(req,403,'origin');
 try{
  if(path==='/api/v1/health'&&req.method==='GET')return json(req,200,{ok:true,service:'bl2-api',layout:true,catalog:true,r2:true});

  if(path==='/api/v1/layout'&&req.method==='GET'){
   const row=await env.DB.prepare("SELECT revision,json,sha256,updated_at FROM bl2_published_layout WHERE id='official'").first();
   if(!row?.json)return fail(req,503,'layout not initialized');
   return json(req,200,{revision:row.revision,layout:JSON.parse(row.json),sha256:row.sha256,updatedAt:row.updated_at});
  }
  if(path==='/api/v1/admin/layout'&&req.method==='PUT'){
   if(req.headers.get('Origin')!==ORIGIN)return fail(req,403,'origin');
   if(!(await auth(req,env)))return fail(req,401,'unauthorized');
   if(!/application\/json/.test(req.headers.get('Content-Type')||''))return fail(req,415,'JSON required');
   if(Number(req.headers.get('Content-Length')||0)>800000)return fail(req,413,'too large');
   const raw=await req.text();if(enc.encode(raw).length>800000)return fail(req,413,'too large');
   let b;try{b=JSON.parse(raw)}catch{return fail(req,400,'invalid JSON');}
   if(!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0||!isLayout(b.layout))return fail(req,400,'invalid layout');
   const serialized=JSON.stringify(b.layout),hash=await shaText(serialized);
   const row=await env.DB.prepare("UPDATE bl2_published_layout SET revision=revision+1,json=?,sha256=?,updated_at=CURRENT_TIMESTAMP WHERE id='official' AND revision=? RETURNING revision,sha256,updated_at").bind(serialized,hash,b.expectedRevision).first();
   if(!row)return fail(req,409,'revision conflict');
   return json(req,200,{revision:row.revision,sha256:row.sha256,updatedAt:row.updated_at});
  }

  if(path==='/api/v1/catalog'&&req.method==='GET'){
   const row=await env.DB.prepare("SELECT revision,json,sha256,updated_at FROM bl2_catalog_state WHERE id='official'").first();
   if(!row?.json)return fail(req,503,'catalog not initialized');
   return json(req,200,{revision:row.revision,catalog:JSON.parse(row.json),sha256:row.sha256,updatedAt:row.updated_at});
  }
  if(path==='/api/v1/admin/catalog'&&req.method==='PUT'){
   if(req.headers.get('Origin')!==ORIGIN)return fail(req,403,'origin');
   if(!(await auth(req,env)))return fail(req,401,'unauthorized');
   if(!/application\/json/.test(req.headers.get('Content-Type')||''))return fail(req,415,'JSON required');
   if(Number(req.headers.get('Content-Length')||0)>2000000)return fail(req,413,'too large');
   const raw=await req.text();if(enc.encode(raw).length>2000000)return fail(req,413,'too large');
   let b;try{b=JSON.parse(raw)}catch{return fail(req,400,'invalid JSON');}
   if(!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0||!isCatalog(b.catalog))return fail(req,400,'invalid catalog');
   if(!(await assetsExist(env,b.catalog)))return fail(req,409,'catalog references missing asset');
   const serialized=JSON.stringify(b.catalog),hash=await shaText(serialized);
   const row=await env.DB.prepare("UPDATE bl2_catalog_state SET revision=revision+1,json=?,sha256=?,updated_at=CURRENT_TIMESTAMP WHERE id='official' AND revision=? RETURNING revision,sha256,updated_at").bind(serialized,hash,b.expectedRevision).first();
   if(!row)return fail(req,409,'revision conflict');
   return json(req,200,{revision:row.revision,sha256:row.sha256,updatedAt:row.updated_at});
  }

  let m=path.match(/^\/api\/v1\/assets\/([a-f0-9]{64})$/);
  if(m&&(req.method==='GET'||req.method==='HEAD')){
   const obj=req.method==='HEAD'?await env.BOOKS.head('assets/'+m[1]):await env.BOOKS.get('assets/'+m[1]);
   if(!obj)return fail(req,404,'asset not found');
   const h=cors(req,'public, max-age=31536000, immutable');h.set('ETag',m[1]);h.set('Content-Type',obj.httpMetadata?.contentType||'application/epub+zip');h.set('Content-Length',String(obj.size));
   return new Response(req.method==='HEAD'?null:obj.body,{status:200,headers:h});
  }
  m=path.match(/^\/api\/v1\/admin\/assets\/([a-f0-9]{64})$/);
  if(m&&req.method==='PUT'){
   if(req.headers.get('Origin')!==ORIGIN)return fail(req,403,'origin');
   if(!(await auth(req,env)))return fail(req,401,'unauthorized');
   const type=(req.headers.get('Content-Type')||'').split(';')[0].trim();
   if(type!=='application/epub+zip')return fail(req,415,'EPUB required');
   const len=Number(req.headers.get('Content-Length')||0);if(!Number.isFinite(len)||len<1||len>60*1024*1024)return fail(req,413,'invalid size');
   const bytes=await req.arrayBuffer();if(bytes.byteLength!==len)return fail(req,400,'size mismatch');
   const hash=await shaBytes(bytes);if(hash!==m[1])return fail(req,400,'sha256 mismatch');
   const name=(req.headers.get('X-BL2-File-Name')||'').replace(/[\r\n]/g,' ').slice(0,240);
   await env.BOOKS.put('assets/'+hash,bytes,{httpMetadata:{contentType:type},customMetadata:{originalName:name}});
   await env.DB.prepare("INSERT OR IGNORE INTO bl2_assets(sha256,size,media_type,original_name) VALUES(?,?,?,?)").bind(hash,bytes.byteLength,type,name).run();
   return json(req,200,{sha256:hash,size:bytes.byteLength,stored:true});
  }
  return fail(req,404,'not found');
 }catch(e){console.error('BL2 API error',e?.message||e);return fail(req,503,'backend unavailable; local data preserved');}
}};