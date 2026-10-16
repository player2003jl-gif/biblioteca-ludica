import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
const content="Biblioteca Ludica II: C1 R2 demo, nenhum livro real.\n";
const BOOKS={head:async key=>key==="c1/livro-ficticio.txt"?{size:content.length}:null,get:async key=>key==="c1/livro-ficticio.txt"?{text:async()=>content}:null};
test('R2 responde health sem editar objetos',async()=>{
  const r=await worker.fetch(new Request('https://r2.test/api/health'),{BOOKS});
  assert.equal(r.status,200);const b=await r.json();assert.equal(b.r2,'ok');assert.equal(b.production,false);
});
test('arquivo ficticio via Worker',async()=>{
  const r=await worker.fetch(new Request('https://r2.test/api/demo-book'),{BOOKS});
  assert.equal(r.status,200);assert.match(await r.text(),/nenhum livro real/);
});
test('nao aceita uploads HTTP',async()=>{
  const r=await worker.fetch(new Request('https://r2.test/api/demo-book',{method:'POST'}),{BOOKS});
  assert.equal(r.status,405);
});
test('sem binding R2 retorna erro',async()=>{
  const r=await worker.fetch(new Request('https://r2.test/api/health'),{});
  assert.equal(r.status,503);
});
test('origem externa nao tem CORS',async()=>{
  const r=await worker.fetch(new Request('https://r2.test/api/health',{headers:{Origin:'https://other.invalid'}}),{BOOKS});
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
});
