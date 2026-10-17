const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const {IDBFactory}=require('fake-indexeddb');
const code=fs.readFileSync('homologacao-online-final/catalog-sync.js','utf8');
const DB='bl2-catalog-v03';
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function seed(idb,book){
 const q=idb.open(DB,2);await new Promise((res,rej)=>{q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('books')){const s=q.result.createObjectStore('books',{keyPath:'id'});s.createIndex('shelf','shelf',{unique:false});}if(!q.result.objectStoreNames.contains('settings'))q.result.createObjectStore('settings',{keyPath:'key'});};q.onsuccess=res;q.onerror=()=>rej(q.error)});
 const db=q.result,tx=db.transaction('books','readwrite');tx.objectStore('books').put(book);await new Promise((res,rej)=>{tx.oncomplete=res;tx.onabort=()=>rej(tx.error)});db.close();
}
async function all(idb){const q=idb.open(DB,2);await new Promise((r,j)=>{q.onsuccess=r;q.onerror=()=>j(q.error)});const db=q.result,tx=db.transaction('books','readonly'),req=tx.objectStore('books').getAll();const v=await new Promise((r,j)=>{req.onsuccess=()=>r(req.result);req.onerror=()=>j(req.error)});db.close();return v;}
let revision=0,catalog={version:1,books:[]},assets=new Map();
const catalogSha=()=>digest(JSON.stringify(catalog));
async function fetchMock(url,opts={}){
 const method=opts.method||'GET';
 if(url.endsWith('/api/v1/catalog')&&method==='GET')return{ok:true,status:200,json:async()=>({revision,catalog:JSON.parse(JSON.stringify(catalog)),sha256:catalogSha()})};
 let m=url.match(/\/api\/v1\/assets\/([a-f0-9]{64})$/);
 if(m&&method==='HEAD')return assets.has(m[1])?{ok:true,status:200}:{ok:false,status:404};
 if(m&&method==='GET'){if(!assets.has(m[1]))return{ok:false,status:404};return{ok:true,status:200,blob:async()=>new Blob([assets.get(m[1])],{type:'application/epub+zip'})};}
 m=url.match(/\/api\/v1\/admin\/assets\/([a-f0-9]{64})$/);
 if(m&&method==='PUT'){assert(String(opts.headers.Authorization||'').startsWith('Bearer '));const buf=Buffer.from(opts.body);assert.equal(digest(buf),m[1]);assets.set(m[1],buf);return{ok:true,status:200,json:async()=>({sha256:m[1],size:buf.length,stored:true})};}
 if(url.endsWith('/api/v1/admin/catalog')&&method==='PUT'){assert(String(opts.headers.Authorization||'').startsWith('Bearer '));const b=JSON.parse(opts.body);if(b.expectedRevision!==revision)return{ok:false,status:409};for(const x of b.catalog.books)assert(assets.has(x.assetSha256));catalog=JSON.parse(JSON.stringify(b.catalog));revision++;return{ok:true,status:200,json:async()=>({revision,sha256:catalogSha()})};}
 throw new Error('Unexpected fetch '+method+' '+url);
}
function make(idb){
 const disk=new Map(),nodes={},events={};
 const node=id=>nodes[id]||(nodes[id]={textContent:'',style:{},disabled:false,onclick:null});
 const anchor={insertAdjacentElement(){}};
 const doc={hidden:false,getElementById:node,querySelector:q=>q.includes('Sincronização Cloudflare D1')?anchor:null,createElement:()=>({className:'',setAttribute(){},innerHTML:'',insertAdjacentElement(){}}),addEventListener(t,f){events['doc:'+t]=f}};
 const win={LibraryCatalog:{refresh:async()=>{}},addEventListener(t,f){events[t]=f},__BL2_D1_BRIDGE__:{token:null}};
 const store={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,String(v)),removeItem:k=>disk.delete(k)};
 const ctx={window:win,document:doc,localStorage:store,indexedDB:idb,fetch:fetchMock,crypto:crypto.webcrypto,TextEncoder,Blob,console,setInterval(){return 0},clearInterval(){},setTimeout,clearTimeout};
 vm.runInNewContext(code,ctx);
 return{win,disk,events,node,auth(token){events['bl2:admin-auth']?.({detail:{token}})},changed(){events['bl2:admin-changed']?.({detail:{type:'catalog'}})}};
}
(async()=>{
 const idbA=new IDBFactory(),file=new Blob([Buffer.from('PK\x03\x04synthetic-epub-test')],{type:'application/epub+zip'});
 await seed(idbA,{id:'book-1',title:'Livro teste',author:'Autor',kind:'epub',shelf:'geral',shelfId:'user-mv9ym902-2',bibliographic:{language:'pt'},file,originalName:'teste.epub',importedAt:1,favorite:false,notes:'',progress:{}});
 const a=make(idbA);await wait(120);a.auth('valid-test-token');await wait(500);
 assert.equal(revision,1,'first admin login should publish initial catalog');
 assert.equal(assets.size,1,'EPUB should be uploaded once');
 assert.equal(a.win.__BL2_CATALOG_SYNC__.state.pending,false,'pending flag should clear after confirmation');
 const booksA=await all(idbA);assert(/^[a-f0-9]{64}$/.test(booksA[0].assetSha256),'local book should gain asset hash');

 const idbB=new IDBFactory(),b=make(idbB);await wait(300);
 const booksB=await all(idbB);assert.equal(booksB.length,1,'fresh browser should hydrate catalog metadata');assert.equal(booksB[0].title,'Livro teste');assert(!booksB[0].file,'fresh browser should not pre-download EPUB');
 const blob=await b.win.__BL2_CATALOG_SYNC__.fetchAsset(booksB[0].assetSha256);assert.equal(blob.size,file.size,'lazy R2 download should return verified EPUB');
 console.log('PASS catalog: admin auto-migration to R2+D1, metadata hydration, lazy verified EPUB download.');
})().catch(e=>{console.error(e);process.exitCode=1});