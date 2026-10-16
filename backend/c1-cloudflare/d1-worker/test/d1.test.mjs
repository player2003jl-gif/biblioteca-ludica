import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
const db={
  prepare(sql){
    return {
      async first(){
        if(sql.includes('SELECT 1 AS ok'))return {ok:1};
        return {id:'c1-estante',title:'Estante de demonstração C1',version:1,updated_at:'2026-10-16 00:00:00'};
      },
      bind(...args){ assert.deepEqual(args,['c1-estante']);return this; }
    };
  }
};
test('responde status D1 e informa R2 nao configurado',async()=>{
  const r=await worker.fetch(new Request('https://c1.example/api/health'),{DB:db});
  assert.equal(r.status,200);const x=await r.json();
  assert.equal(x.d1,'ok');assert.equal(x.r2,'not-configured');assert.equal(x.production,false);
});
test('le estante e revisao de demonstracao',async()=>{
  const r=await worker.fetch(new Request('https://c1.example/api/shelf'),{DB:db});
  assert.equal(r.status,200);const x=await r.json();
  assert.equal(x.shelf.title,'Estante de demonstração C1');assert.equal(x.shelf.version,1);
});
test('nenhuma escrita e autorizada nesta etapa',async()=>{
  const r=await worker.fetch(new Request('https://c1.example/api/shelf',{method:'PATCH'}),{DB:db});
  assert.equal(r.status,405);
});
test('sem binding D1 retorna indisponivel sem vazar dados',async()=>{
  const r=await worker.fetch(new Request('https://c1.example/api/health'),{});
  assert.equal(r.status,503);
});
test('CORS nao libera origens desconhecidas',async()=>{
  const r=await worker.fetch(new Request('https://c1.example/api/shelf',{headers:{Origin:'https://invalid.example'}}),{DB:db});
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
});
test('CORS permite GitHub Pages oficial',async()=>{
  const r=await worker.fetch(new Request('https://c1.example/api/shelf',{headers:{Origin:'https://player2003jl-gif.github.io'}}),{DB:db});
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://player2003jl-gif.github.io');
});
