/* BL2 official administrative layout bridge — isolated D1 staging, no EPUBs/visitor state. */
const ORIGIN='https://player2003jl-gif.github.io';
const enc=new TextEncoder();
const b64url=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),x=>x.charCodeAt(0));
const part=s=>JSON.parse(new TextDecoder().decode(b64url(s)));
let cachedKeys=null,expiry=0;
function cors(req) {
 const h=new Headers({'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'});
 if(req.headers.get('Origin')===ORIGIN){
  h.set('Access-Control-Allow-Origin',ORIGIN);
  h.set('Access-Control-Allow-Headers','Authorization, Content-Type');
  h.set('Access-Control-Allow-Methods','GET, PUT, OPTIONS');
 }
 return h;
}
function reply(req,status,data) {
 const h=cors(req);h.set('Content-Type','application/json; charset=utf-8');
 return new Response(JSON.stringify(data),{status,headers:h});
}
const fail=(req,status,message)=>reply(req,status,{error:message});
async function auth(req,env) {
 const hdr=req.headers.get('Authorization')||'';
 if(!hdr.startsWith('Bearer ')||!env.C3_ADMIN_GOOGLE_SUB||!env.GOOGLE_CLIENT_ID)return false;
 try{
  const bits=hdr.slice(7).split('.');
  if(bits.length!==3||bits.some(s=>!s||s.length>14000))return false;
  const head=part(bits[0]), claims=part(bits[1]), now=Math.floor(Date.now()/1000);
  if(head.alg!=='RS256'||typeof head.kid!=='string'||claims.aud!==env.GOOGLE_CLIENT_ID||
     !['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||
     claims.sub!==env.C3_ADMIN_GOOGLE_SUB||typeof claims.exp!=='number'||claims.exp<=now||
     typeof claims.iat!=='number'||claims.iat>now+60)return false;
  if(!cachedKeys||Date.now()>expiry){
   const resp=await fetch('https://www.googleapis.com/oauth2/v3/certs');
   if(!resp.ok)return false;
   const body=await resp.json();if(!Array.isArray(body.keys))return false;
   cachedKeys=body.keys;expiry=Date.now()+300000;
  }
  const jwk=cachedKeys.find(k=>k.kid===head.kid&&k.kty==='RSA');
  if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64url(bits[2]),enc.encode(bits[0]+'.'+bits[1]));
 }catch{return false;}
}
function isLayout(d) {
 if(!d||typeof d!=='object'||![6,7].includes(d.version)||d.architecture!=='reception-library-virtual-reading'||
    !d.rooms||!d.roomSizes||!d.doors||!d.npcs||!d.scene||typeof d.interactionModes!=='object')return false;
 const used=new Set();
 for(const id of ['hall','archive']){
  const objs=d.rooms[id], size=d.roomSizes[id],doors=d.doors[id],scenes=d.scene[id];
  if(!Array.isArray(objs)||objs.length>80||!size||!Number.isInteger(size.tilesW)||!Number.isInteger(size.tilesH)||
     size.tilesW<12||size.tilesH<12||size.tilesW>96||size.tilesH>96||
     !Array.isArray(doors)||doors.length>20||!Array.isArray(scenes)||scenes.length>256)return false;
  for(const o of objs){
   if(!o||typeof o.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(o.id)||used.has(o.id)||
      !['shelf','table','counter'].includes(o.kind)||![o.x,o.y,o.w,o.h].every(Number.isFinite)||
      o.w<8||o.h<8||o.w>440||o.h>320||
      (o.shelfName!==undefined&&(typeof o.shelfName!=='string'||o.shelfName.length>80)))return false;
   used.add(o.id);
  }
  for(const o of doors){
   if(!o||typeof o.id!=='string'||!['west','east','north','south'].includes(o.side)||
      ![o.x,o.y,o.width].every(Number.isFinite)||o.width<8||o.width>400)return false;
  }
  for(const o of scenes){
   if(!o||typeof o.id!=='string'||!/^scene-[a-zA-Z0-9-]{1,100}$/.test(o.id)||
      used.has(o.id)||typeof o.assetKey!=='string'||o.assetKey.length>100||
      !Number.isInteger(o.x)||!Number.isInteger(o.y))return false;
   used.add(o.id);
  }
  const n=d.npcs[id];if(n!=null&&(typeof n.id!=='string'||![n.x,n.y].every(Number.isFinite)))return false;
 }
 return Object.keys(d.interactionModes).length<=400&&Object.values(d.interactionModes).every(x=>['both','highlight','indicator','none'].includes(x));
}
async function sha(data){
 const bytes=await crypto.subtle.digest('SHA-256',enc.encode(data));
 return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
export default {async fetch(req,env){
 const path=new URL(req.url).pathname.replace(/\/$/,'');
 if(req.method==='OPTIONS')return req.headers.get('Origin')===ORIGIN?new Response(null,{status:204,headers:cors(req)}):fail(req,403,'origin');
 if(path!=='/api/v1/layout'&&path!=='/api/v1/admin/layout')return fail(req,404,'not found');
 try{
  if(path==='/api/v1/layout'&&req.method==='GET'){
   const row=await env.DB.prepare('SELECT revision,json,sha256,updated_at FROM bl2_published_layout WHERE id=?').bind('official').first();
   if(!row||!row.json)return fail(req,503,'not initialized');
   return reply(req,200,{revision:row.revision,layout:JSON.parse(row.json),sha256:row.sha256,updatedAt:row.updated_at});
  }
  if(path==='/api/v1/admin/layout'&&req.method==='PUT'){
   if(req.headers.get('Origin')!==ORIGIN)return fail(req,403,'origin');
   if(!(await auth(req,env)))return fail(req,401,'unauthorized');
   if(!/application\/json/.test(req.headers.get('Content-Type')||''))return fail(req,415,'JSON required');
   if(Number(req.headers.get('Content-Length')||0)>800000)return fail(req,413,'too large');
   const raw=await req.text();
   if(enc.encode(raw).length>800000)return fail(req,413,'too large');
   let body;try{body=JSON.parse(raw)}catch{return fail(req,400,'invalid JSON');}
   if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0||!isLayout(body.layout))return fail(req,400,'invalid layout');
   const serialized=JSON.stringify(body.layout),hash=await sha(serialized);
   const row=await env.DB.prepare("UPDATE bl2_published_layout SET revision=revision+1,json=?,sha256=?,updated_at=CURRENT_TIMESTAMP WHERE id='official' AND revision=? RETURNING revision,sha256,updated_at")
    .bind(serialized,hash,body.expectedRevision).first();
   if(!row)return fail(req,409,'revision conflict');
   return reply(req,200,{revision:row.revision,sha256:row.sha256,updatedAt:row.updated_at});
  }
  return fail(req,405,'method');
 }catch{return fail(req,503,'backend unavailable; local layout preserved');}
}};
