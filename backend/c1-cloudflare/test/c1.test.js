import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../src/index.js';

const ORIGIN = 'https://player2003jl-gif.github.io';
const SECRET = 'test-secret-only-not-for-deploy-0000000000000000';
function setup() {
  const state = { id: 'c1-estante', title: 'Estante de demonstração C1', version: 1, updated_at: '2026-10-16' };
  const objects = new Map();
  const env = {
    C1_ADMIN_TOKEN: SECRET,
    DB: { prepare(sql) { let args = []; return {
      bind(...v) { args = v; return this; },
      async first() {
        if (sql.includes('SELECT 1 AS ok')) return { ok: 1 };
        if (sql.startsWith('SELECT id')) return { ...state };
        if (sql.startsWith('UPDATE shelves')) {
          if (state.version !== args[2]) return null;
          state.title = args[0]; state.version++; return { ...state };
        }
        throw new Error('SQL inesperado no teste');
      }
    }; } },
    BOOKS: {
      async list() { return { objects: [...objects].map(([key]) => ({ key })) }; },
      async put(key, bytes) { objects.set(key, bytes); },
      async get(key) { const v = objects.get(key); return v ? { body: v } : null; }
    }
  };
  async function req(path, method = 'GET', { json, token, origin } = {}) {
    const h = new Headers();
    if (origin !== null) h.set('Origin', origin || ORIGIN);
    if (token) h.set('Authorization', `Bearer ${token}`);
    if (json !== undefined) h.set('Content-Type', 'application/json');
    return handler.fetch(new Request(`https://bl2-c1-homologacao.example.test${path}`, {
      method, headers: h, ...(json !== undefined ? {body: JSON.stringify(json)} : {})
    }), env);
  }
  return { env, state, objects, req };
}

test('infra: checks D1 and R2 in a safe public health route', async () => {
  const x=setup(),r=await x.req('/api/health');
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{status:'ok',environment:'c1-test',d1:'ok',r2:'ok'});
});
test('public reader can see shelf but cannot edit without a token',async()=>{
  const x=setup(),a=await x.req('/api/shelf'),b=await x.req('/api/admin/shelf','PATCH',{json:{title:'Invadida',expectedVersion:1}});
  assert.equal(a.status,200);assert.equal((await a.json()).shelf.version,1);
  assert.equal(b.status,401);assert.equal(x.state.title,'Estante de demonstração C1');
});
test('valid admin update increments revision and supports another browser reading it',async()=>{
  const x=setup();const r=await x.req('/api/admin/shelf','PATCH',{token:SECRET,json:{title:'  Estante   atualizada  ',expectedVersion:1}});
  assert.equal(r.status,200);assert.deepEqual((await r.json()).shelf.title,'Estante atualizada');
  const other=await x.req('/api/shelf');assert.equal((await other.json()).shelf.version,2);
  assert.equal(x.state.title,'Estante atualizada');
});
test('concurrent write using an outdated revision returns 409 without overwriting',async()=>{
  const x=setup();await x.req('/api/admin/shelf','PATCH',{token:SECRET,json:{title:'Navegador A',expectedVersion:1}});
  const r=await x.req('/api/admin/shelf','PATCH',{token:SECRET,json:{title:'Navegador B',expectedVersion:1}});
  assert.equal(r.status,409);assert.equal(x.state.title,'Navegador A');
});
test('invalid writes and oversized title are rejected',async()=>{
  const x=setup();for(const json of [{title:'',expectedVersion:1},{title:'A'.repeat(81),expectedVersion:1},{title:'Livro',expectedVersion:0},{title:1,expectedVersion:1}]){
    const r=await x.req('/api/admin/shelf','PATCH',{token:SECRET,json});assert.equal(r.status,400);
  }assert.equal(x.state.version,1);
});
test('CORS is only granted to the approved GitHub Pages origin',async()=>{
  const x=setup(),a=await x.req('/api/shelf','GET',{origin:'https://evil.example'}),b=await x.req('/api/admin/shelf','PATCH',{token:SECRET,json:{title:'X',expectedVersion:1},origin:'https://evil.example'});
  assert.equal(a.headers.get('Access-Control-Allow-Origin'),null);assert.equal(b.status,403);assert.equal(x.state.version,1);
  const good=await x.req('/api/shelf');assert.equal(good.headers.get('Access-Control-Allow-Origin'),ORIGIN);
});
test('R2 fictitious book requires token to create and is readable afterward',async()=>{
  const x=setup();let r=await x.req('/api/demo-book');assert.equal(r.status,404);
  r=await x.req('/api/admin/demo-book','POST');assert.equal(r.status,401);
  r=await x.req('/api/admin/demo-book','POST',{token:SECRET});assert.equal(r.status,201);
  assert.equal(x.objects.size,1);
  r=await x.req('/api/demo-book');assert.equal(r.status,200);assert.match(await r.text(),/livro fictício/);
});
test('bad or unconfigured tokens do not allow changes',async()=>{
  const x=setup();x.env.C1_ADMIN_TOKEN='short';let r=await x.req('/api/admin/shelf','PATCH',{token:SECRET,json:{title:'X',expectedVersion:1}});
  assert.equal(r.status,401);x.env.C1_ADMIN_TOKEN=SECRET;
  r=await x.req('/api/admin/shelf','PATCH',{token:'wrong',json:{title:'X',expectedVersion:1}});
  assert.equal(r.status,401);assert.equal(x.state.version,1);
});
test('OPTIONS preflight blocks foreign origins',async()=>{
  const x=setup();let r=await x.req('/api/shelf','OPTIONS',{origin:'https://evil.example'});assert.equal(r.status,403);
  r=await x.req('/api/shelf','OPTIONS');assert.equal(r.status,204);
});
test('internal database failure returns generic 503 and hides details',async()=>{
  const x=setup();x.env.DB.prepare=()=>{throw new Error('TOP_SECRET_SQL');};
  const r=await x.req('/api/shelf');assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/TOP_SECRET_SQL/);
});
