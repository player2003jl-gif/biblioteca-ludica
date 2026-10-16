/** Biblioteca Lúdica II · prova C2. Dados exclusivamente ficticios em D1 isolado. */
const ROOT='https://player2003jl-gif.github.io';
const DEMO='c1-estante';
function result(req,status,body){
 const h=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});
 if(req.headers.get('Origin')===ROOT){h.set('Access-Control-Allow-Origin',ROOT);h.set('Access-Control-Allow-Headers','Authorization, Content-Type');h.set('Access-Control-Allow-Methods','GET, PATCH, OPTIONS');}
 return new Response(JSON.stringify(body),{status,headers:h});
}
async function digest(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
async function authorized(req,env){
 const hdr=req.headers.get('Authorization')||'';
 const token=hdr.startsWith('Bearer ')?hdr.slice(7):'';
 const secret=env.C2_ADMIN_TOKEN;
 if(typeof secret!=='string'||secret.length<40||token.length<40||token.length>512)return false;
 const [a,b]=await Promise.all([digest(token),digest(secret)]);
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),p=url.pathname,m=request.method;
  if(m==='OPTIONS'){if(request.headers.get('Origin')!==ROOT)return result(request,403,{error:'Origem nao autorizada'});return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ROOT,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, PATCH, OPTIONS','Vary':'Origin'}});}
  if(p!=='/api/health'&&p!=='/api/shelf')return result(request,404,{error:'Rota inexistente'});
  if(!env.DB || typeof env.DB.prepare!=='function')return result(request,503,{error:'Banco indisponivel'});
  if(p==='/api/health'&&m==='GET'){
    try{const d=await env.DB.prepare('SELECT 1 AS ok').first();return result(request,d?.ok===1?200:503,{status:d?.ok===1?'ok':'unavailable',service:'bl2-c2-estante',d1:d?.ok===1?'ok':'unavailable',r2:'not-configured',production:false});}
    catch{return result(request,503,{error:'Indisponivel'});}
  }
  if(p==='/api/shelf'&&m==='GET'){
    try{const shelf=await env.DB.prepare('SELECT id,title,version,updated_at FROM shelves WHERE id = ?').bind(DEMO).first();return shelf?result(request,200,{shelf}):result(request,404,{error:'Estante de teste ausente'});}
    catch{return result(request,503,{error:'Indisponivel'});}
  }
  if(p==='/api/shelf'&&m==='PATCH'){
    const origin=request.headers.get('Origin');if(origin&&origin!==ROOT)return result(request,403,{error:'Origem nao autorizada'});
    if(!(await authorized(request,env)))return result(request,401,{error:'Token de teste necessario'});
    const raw=await request.text();if(new TextEncoder().encode(raw).length>2048)return result(request,413,{error:'Requisicao muito grande'});
    let obj;try{obj=JSON.parse(raw);}catch{return result(request,400,{error:'JSON invalido'});}
    if(!obj||typeof obj.title!=='string'||!Number.isSafeInteger(obj.expectedVersion)||obj.expectedVersion<1)return result(request,400,{error:'Nome ou revisao invalidos'});
    const title=obj.title.trim().replace(/\s+/g,' ');if(!title||title.length>80)return result(request,400,{error:'Nome da estante invalido'});
    try{
      const shelf=await env.DB.prepare('UPDATE shelves SET title = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ? RETURNING id,title,version,updated_at').bind(title,DEMO,obj.expectedVersion).first();
      return shelf?result(request,200,{shelf}):result(request,409,{error:'Revisao desatualizada'});
    }catch{return result(request,503,{error:'Indisponivel'});}
  }
  return result(request,405,{error:'Metodo nao permitido'});
 }
};
