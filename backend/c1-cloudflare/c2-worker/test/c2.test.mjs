import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
let shelf={id:'c1-estante',title:'Estante ficticia',version:1,updated_at:'test'};
const db={prepare(sql){let args=[];return {bind(...a){args=a;return this;},async first(){
 if(sql==='SELECT 1 AS ok')return {ok:1};
 if(sql.startsWith('SELECT id,title'))return {...shelf};
 if(sql.startsWith('UPDATE shelves')){if(args[2]!==shelf.version)return null;shelf={...shelf,title:args[0],version:shelf.version+1};return {...shelf};}
 throw Error('Consulta desconhecida');
}};}};
const secret='c2_admin_test_secret_with_at_least_forty_bytes_1234567890';
const url='https://c2.invalid/api/shelf';
async function call(method,body,token){const headers={};if(token)headers.Authorization='Bearer '+token;return worker.fetch(new Request(url,{method,headers,body:body?JSON.stringify(body):undefined}),{DB:db,C2_ADMIN_TOKEN:secret});}
test('primeira sessao le revisao 1',async()=>{const r=await call('GET');assert.equal((await r.json()).shelf.version,1);});
test('sem senha nao grava',async()=>{const r=await call('PATCH',{title:'A',expectedVersion:1});assert.equal(r.status,401);});
test('token errado nao grava',async()=>{const r=await call('PATCH',{title:'A',expectedVersion:1},secret.slice(0,-1)+'X');assert.equal(r.status,401);});
test('sessao A grava revisao 2',async()=>{const r=await call('PATCH',{title:'Nome atualizado no A',expectedVersion:1},secret);assert.equal(r.status,200);assert.equal((await r.json()).shelf.version,2);});
test('sessao B le o estado oficial de A',async()=>{const r=await call('GET');assert.equal((await r.json()).shelf.title,'Nome atualizado no A');});
test('sessao B com versao antiga recebe conflito',async()=>{const r=await call('PATCH',{title:'Alteracao antiga',expectedVersion:1},secret);assert.equal(r.status,409);});
test('escrita sem validacao de revisao falha',async()=>{const r=await call('PATCH',{title:'Sem revisao'},secret);assert.equal(r.status,400);});
test('origem externa e recusada mesmo com senha',async()=>{const r=await worker.fetch(new Request(url,{method:'PATCH',headers:{Origin:'https://evil.invalid',Authorization:'Bearer '+secret},body:JSON.stringify({title:'h',expectedVersion:2})}),{DB:db,C2_ADMIN_TOKEN:secret});assert.equal(r.status,403);});
test('CORS valido para GitHub Pages',async()=>{const r=await worker.fetch(new Request(url,{headers:{Origin:'https://player2003jl-gif.github.io'}}),{DB:db,C2_ADMIN_TOKEN:secret});assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://player2003jl-gif.github.io');});
test('sem D1 retorna 503',async()=>{const r=await worker.fetch(new Request(url),{});assert.equal(r.status,503);});
