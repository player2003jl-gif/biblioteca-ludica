/**
 * Biblioteca Lúdica II · C3 experimental: estante fictícia no D1.
 * Login Google verificado por RS256/JWKS; edição só para o subject
 * preautorizado pelo proprietário em C3_ADMIN_GOOGLE_SUB.
 * NUNCA acede aos EPUBs, planta oficial ou backups Google Drive.
 */
const ORIGIN='https://player2003jl-gif.github.io';
const GOOGLE_JWKS='https://www.googleapis.com/oauth2/v3/certs';
const DEMO='c1-estante';
let jwksCache={until:0,keys:[]};

function json(req,status,data){
 const h=new Headers({'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',
  'Referrer-Policy':'no-referrer'});
 if(req.headers.get('Origin')===ORIGIN){
   h.set('Access-Control-Allow-Origin',ORIGIN);
   h.set('Access-Control-Allow-Headers','Authorization,Content-Type');
   h.set('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');
 }
 return new Response(JSON.stringify(data),{status,headers:h});
}
function decoded(s){
 if(typeof s!=='string'||s.length>16384||!/^[A-Za-z0-9_-]+$/.test(s))throw Error('invalid b64');
 const pad=s.replace(/-/g,'+').replace(/_/g,'/');
 const bytes=atob(pad+'='.repeat((4-pad.length%4)%4));
 return Uint8Array.from(bytes,c=>c.charCodeAt(0));
}
function parseJwtPart(s){
 const raw=decoded(s);
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
}
async function publicKeys(){
 if(jwksCache.until>Date.now() && jwksCache.keys.length)return jwksCache.keys;
 const res=await fetch(GOOGLE_JWKS,{method:'GET',headers:{Accept:'application/json'}});
 if(!res.ok)throw Error('jwks unavailable');
 const obj=await res.json();
 if(!Array.isArray(obj.keys)||obj.keys.length>30)throw Error('jwks malformed');
 const keys=obj.keys.filter(k=>k.kty==='RSA'&&k.use==='sig'&&k.alg==='RS256'&&
  typeof k.kid==='string'&&typeof k.n==='string'&&typeof k.e==='string');
 if(!keys.length)throw Error('jwks empty');
 jwksCache={keys,until:Date.now()+15*60*1000};
 return keys;
}
async function verifyGoogleJwt(token,env){
 if(typeof token!=='string'||token.length<100||token.length>8192)return null;
 const parts=token.split('.');
 if(parts.length!==3)return null;
 try{
   const header=parseJwtPart(parts[0]);
   if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>256||header.typ&&header.typ!=='JWT')return null;
   let keys=await publicKeys();
   let jwk=keys.find(k=>k.kid===header.kid);
   if(!jwk){
     jwksCache.until=0;
     keys=await publicKeys();
     jwk=keys.find(k=>k.kid===header.kid);
     if(!jwk)return null;
   }
   const key=await crypto.subtle.importKey('jwk',{kty:'RSA',n:jwk.n,e:jwk.e,alg:'RS256',ext:true},
     {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
   const data=new TextEncoder().encode(parts[0]+'.'+parts[1]);
   const signature=decoded(parts[2]);
   if(!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,signature,data)))return null;
   const claims=parseJwtPart(parts[1]);
   const now=Math.floor(Date.now()/1000);
   if(!claims||typeof claims!=='object')return null;
   if(!['accounts.google.com','https://accounts.google.com'].includes(claims.iss))return null;
   if(typeof env.GOOGLE_CLIENT_ID!=='string'||claims.aud!==env.GOOGLE_CLIENT_ID)return null;
   if(claims.azp&&claims.azp!==env.GOOGLE_CLIENT_ID)return null;
   if(!Number.isSafeInteger(claims.exp)||claims.exp<=now)return null;
   if(!Number.isSafeInteger(claims.iat)||claims.iat>now+60||claims.iat<now-3700)return null;
   if(claims.nbf!=null&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>now+60))return null;
   if(typeof claims.sub!=='string'||!/^[0-9]{12,40}$/.test(claims.sub))return null;
   return {sub:claims.sub};
 }catch{return null;}
}
async function adminIdentity(req,env){
 const h=req.headers.get('Authorization')||'';
 if(!h.startsWith('Bearer '))return {status:401};
 const identity=await verifyGoogleJwt(h.slice(7),env);
 if(!identity)return {status:401};
 // Configuração ausente = NEGAR toda escrita. ID não é segredo, mas a
 // allowlist é controlada pelo responsável via Secrets do GitHub.
 if(typeof env.C3_ADMIN_GOOGLE_SUB!=='string'||!(/^[0-9]{12,40}$/.test(env.C3_ADMIN_GOOGLE_SUB)))return {status:403};
 if(identity.sub!==env.C3_ADMIN_GOOGLE_SUB)return {status:403};
 return {status:200};
}
function originAllowed(req){
 const origin=req.headers.get('Origin');
 return origin===null || origin===ORIGIN;
}
export default {
 async fetch(request,env){
  const p=new URL(request.url).pathname.replace(/\/$/,'')||'/';
  const method=request.method.toUpperCase();
  if(method==='OPTIONS'){
   if(request.headers.get('Origin')!==ORIGIN)return json(request,403,{error:'Origem nao autorizada'});
   const h=new Headers({'Access-Control-Allow-Origin':ORIGIN,
     'Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS',
     'Access-Control-Allow-Headers':'Authorization,Content-Type',
     'Access-Control-Max-Age':'300','Vary':'Origin'});
   return new Response(null,{status:204,headers:h});
  }
  if(!['/api/health','/api/shelf','/api/session','/api/admin/shelf'].includes(p))return json(request,404,{error:'Rota nao encontrada'});
  if((p==='/api/session'||p==='/api/admin/shelf')&&!originAllowed(request))return json(request,403,{error:'Origem nao autorizada'});
  if(p==='/api/session'&&method==='POST'){
   const auth=await adminIdentity(request,env);
   return auth.status===200?json(request,200,{admin:true}):
     json(request,auth.status,{admin:false,error:auth.status===403?'Conta Google nao autorizada':'Login Google invalido ou expirado'});
  }
  if(p==='/api/admin/shelf'&&method==='PATCH'){
   const auth=await adminIdentity(request,env);
   if(auth.status!==200)return json(request,auth.status,{error:'Administrador nao autorizado'});
   if(!env.DB||typeof env.DB.prepare!=='function')return json(request,503,{error:'D1 indisponivel'});
   const body=await request.text();
   if(new TextEncoder().encode(body).length>2048)return json(request,413,{error:'Requisicao excede o limite'});
   let obj;try{obj=JSON.parse(body);}catch{return json(request,400,{error:'JSON invalido'});}
   if(!obj||typeof obj.title!=='string'||!Number.isSafeInteger(obj.expectedVersion)||obj.expectedVersion<1)return json(request,400,{error:'Titulo ou revisao invalidos'});
   const title=obj.title.replace(/\s+/g,' ').trim();
   if(!title||title.length>80)return json(request,400,{error:'Titulo deve ter de 1 a 80 caracteres'});
   try{
    const shelf=await env.DB.prepare('UPDATE shelves SET title = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ? RETURNING id,title,version,updated_at')
     .bind(title,DEMO,obj.expectedVersion).first();
    return shelf?json(request,200,{shelf}):json(request,409,{error:'Revisao antiga; recarregue o nome antes de salvar'});
   }catch{return json(request,503,{error:'Erro na gravacao de demonstracao'});}
  }
  if(method!=='GET')return json(request,405,{error:'Metodo nao permitido'});
  if(!env.DB||typeof env.DB.prepare!=='function')return json(request,503,{error:'D1 indisponivel'});
  try{
   if(p==='/api/health'){
    const d=await env.DB.prepare('SELECT 1 AS ok').first();
    return d?.ok===1?json(request,200,{status:'ok',service:'bl2-c3-google-d1',adminAuth:'google-rs256',adminConfigured:!!env.C3_ADMIN_GOOGLE_SUB,production:false}):json(request,503,{error:'D1 indisponivel'});
   }
   if(p==='/api/shelf'){
    const s=await env.DB.prepare('SELECT id,title,version,updated_at FROM shelves WHERE id = ?').bind(DEMO).first();
    return s?json(request,200,{shelf:s}):json(request,404,{error:'Estante ficticia ausente'});
   }
   return json(request,405,{error:'Metodo nao permitido'});
  }catch{return json(request,503,{error:'Consulta D1 indisponivel'});}
 }
};
