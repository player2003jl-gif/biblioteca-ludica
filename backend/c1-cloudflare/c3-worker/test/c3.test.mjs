import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const cryptoObj=globalThis.crypto;
const originalFetch=globalThis.fetch;
const CLIENT_ID='605685743440-8hcd7v8jfmcg0j5oso5lrfh30uvnhnm9.apps.googleusercontent.com';
const SUB='107753204925300000001';
const WRONG_SUB='107753204925300000002';
const KEY_ID='c3-test-rsa';
const pair=await cryptoObj.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await cryptoObj.subtle.exportKey('jwk',pair.publicKey);
globalThis.fetch=async url=>{
 assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs');
 return new Response(JSON.stringify({keys:[{kty:'RSA',use:'sig',alg:'RS256',kid:KEY_ID,n:jwk.n,e:jwk.e}]}),{status:200});
};
const base64=b=>Buffer.from(b).toString('base64url');
async function idToken(overrides={}){
 const now=Math.floor(Date.now()/1000);
 const h=base64(JSON.stringify({alg:'RS256',typ:'JWT',kid:KEY_ID}));
 const p=base64(JSON.stringify({iss:'https://accounts.google.com',aud:CLIENT_ID,sub:SUB,
   iat:now-30,exp:now+600,...overrides}));
 const body=h+'.'+p;
 const sig=await cryptoObj.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(body));
 return body+'.'+base64(new Uint8Array(sig));
}
let data={id:'c1-estante',title:'Estante C3 de teste',version:5,updated_at:'2026-10-16'};
const DB={prepare(sql){let args=[];return {
 bind(...a){args=a;return this;},
 async first(){
  if(sql.startsWith('SELECT 1'))return {ok:1};
  if(sql.startsWith('SELECT id,title'))return {...data};
  if(sql.startsWith('UPDATE shelves')){
    if(args[2]!==data.version)return null;
    data={...data,title:args[0],version:data.version+1};
    return {...data};
  }
  throw Error('Unexpected SQL');
 }
};}};
const env={DB,GOOGLE_CLIENT_ID:CLIENT_ID,C3_ADMIN_GOOGLE_SUB:SUB};
const BASE='https://bl2-c3-d1-test.workers.dev';
const req=(path,method='GET',token=null,body=null,origin='https://player2003jl-gif.github.io')=>
 new Request(BASE+path,{method,
  headers:{...(token?{'Authorization':'Bearer '+token}:{}),...(origin?{Origin:origin}:{}),'Content-Type':'application/json'},
  ...(body?{body:JSON.stringify(body)}:{})});
test('public health says admin configured and no production',async()=>{
 const r=await worker.fetch(req('/api/health'),env);
 assert.equal(r.status,200);const b=await r.json();assert.equal(b.production,false);assert.equal(b.adminAuth,'google-rs256');
});
test('anonymous read of remote shelf',async()=>{
 const r=await worker.fetch(req('/api/shelf'),env);
 assert.equal(r.status,200);assert.equal((await r.json()).shelf.version,5);
});
test('admin without token denied',async()=>{
 const r=await worker.fetch(req('/api/admin/shelf','PATCH',null,{title:'try',expectedVersion:5}),env);
 assert.equal(r.status,401);
});
test('valid signed ID Token but wrong user denied',async()=>{
 const r=await worker.fetch(req('/api/admin/shelf','PATCH',await idToken({sub:WRONG_SUB}),{title:'try',expectedVersion:5}),env);
 assert.equal(r.status,403);
});
test('missing allowlist denies valid admin',async()=>{
 const r=await worker.fetch(req('/api/session','POST',await idToken()),{DB,GOOGLE_CLIENT_ID:CLIENT_ID});
 assert.equal(r.status,403);
});
test('changed JWT payload rejected cryptographically',async()=>{
 const valid=await idToken();
 const parts=valid.split('.');
 parts[1]=base64(JSON.stringify({iss:'https://accounts.google.com',aud:CLIENT_ID,sub:SUB,iat:0,exp:9999999999}));
 assert.equal((await worker.fetch(req('/api/session','POST',parts.join('.')),env)).status,401);
});
test('wrong audience rejected',async()=>{
 const r=await worker.fetch(req('/api/session','POST',await idToken({aud:'someone-else.apps.googleusercontent.com'})),env);
 assert.equal(r.status,401);
});
test('expired ID token rejected',async()=>{
 const r=await worker.fetch(req('/api/session','POST',await idToken({exp:Math.floor(Date.now()/1000)-10})),env);
 assert.equal(r.status,401);
});
test('Google login with correct identity accepted',async()=>{
 const r=await worker.fetch(req('/api/session','POST',await idToken()),env);
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{admin:true});
});
test('correct administrator saves shelf with version check',async()=>{
 const r=await worker.fetch(req('/api/admin/shelf','PATCH',await idToken(),{title:'Estante C3 atualizada',expectedVersion:5}),env);
 assert.equal(r.status,200);const b=await r.json();assert.equal(b.shelf.version,6);
 assert.equal(b.shelf.title,'Estante C3 atualizada');
});
test('stale revision cannot overwrite',async()=>{
 const r=await worker.fetch(req('/api/admin/shelf','PATCH',await idToken(),{title:'versao antiga',expectedVersion:5}),env);
 assert.equal(r.status,409);
});
test('external origin forbidden even for valid administrator',async()=>{
 const r=await worker.fetch(req('/api/admin/shelf','PATCH',await idToken(),{title:'X',expectedVersion:6},'https://evil.example'),env);
 assert.equal(r.status,403);
});
test('long shelf name rejected',async()=>{
 const r=await worker.fetch(req('/api/admin/shelf','PATCH',await idToken(),{title:'a'.repeat(81),expectedVersion:6}),env);
 assert.equal(r.status,400);
});
test('no other methods or write routes',async()=>{
 const r=await worker.fetch(req('/api/shelf','DELETE',await idToken()),env);
 assert.equal(r.status,405);
 const r2=await worker.fetch(req('/api/upload','POST',await idToken()),env);
 assert.equal(r2.status,404);
});
test('OPTIONS permits only official GitHub origin',async()=>{
 const r=await worker.fetch(req('/api/admin/shelf','OPTIONS'),env);
 assert.equal(r.status,204);
 const r2=await worker.fetch(req('/api/admin/shelf','OPTIONS',null,null,'https://evil.example'),env);
 assert.equal(r2.status,403);
});
process.on('exit',()=>{globalThis.fetch=originalFetch;});
