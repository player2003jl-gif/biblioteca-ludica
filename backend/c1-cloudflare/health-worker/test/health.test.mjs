import assert from 'node:assert/strict';
import {test} from 'node:test';
import worker from '../src/index.js';
test('saude funciona em GET sem dados sensiveis',async()=>{
  const response=await worker.fetch(new Request('https://dummy.workers.dev/api/health'));
  assert.equal(response.status,200);
  const json=await response.json();
  assert.equal(json.status,'ok');
  assert.equal(json.production,false);
  assert.equal(json.database,'not-configured');
});
test('nega qualquer escrita',async()=>{
  const response=await worker.fetch(new Request('https://dummy.workers.dev/api/health',{method:'POST'}));
  assert.equal(response.status,405);
});
test('rota desconhecida retorna 404',async()=>{
  const response=await worker.fetch(new Request('https://dummy.workers.dev/secreto'));
  assert.equal(response.status,404);
});
test('CORS restrito a origem conhecida',async()=>{
  const good=await worker.fetch(new Request('https://dummy.workers.dev/',{headers:{Origin:'https://player2003jl-gif.github.io'}}));
  const bad=await worker.fetch(new Request('https://dummy.workers.dev/',{headers:{Origin:'https://example.com'}}));
  assert.equal(good.headers.get('Access-Control-Allow-Origin'),'https://player2003jl-gif.github.io');
  assert.equal(bad.headers.get('Access-Control-Allow-Origin'),null);
});
