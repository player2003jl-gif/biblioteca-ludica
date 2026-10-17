/* BL2 catalog/R2 sync candidate. Admin metadata central; reader progress stays local. */
(()=>{'use strict';
const API='https://bl2-api.chatgptset26.workers.dev';
const DB='bl2-catalog-v03',DB_VERSION=2,META='BL2_D1_CATALOG_META_V1',PENDING='BL2_D1_CATALOG_PENDING_V1';
const $=id=>document.getElementById(id);
const S={token:null,remote:null,meta:null,busy:false,reading:false,pending:localStorage.getItem(PENDING)==='1',conflict:false,ready:false};
const clone=x=>JSON.parse(JSON.stringify(x));
const enc=new TextEncoder();
const hashBytes=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
const hashText=async s=>hashBytes(enc.encode(s));
function msg(t,bad=false){const n=$('d1-catalog-status');if(n){n.textContent=t;n.style.color=bad?'#ffc2b6':'#d5edc6';}}
function update(){const n=$('d1-catalog-revision');if(n)n.textContent='Catálogo D1 '+(S.remote?'r'+S.remote.revision:'—')+(S.pending?' · alteração local em fila':'');const b=$('d1-catalog-sync');if(b)b.disabled=S.busy||!S.token||!S.pending||S.conflict;}
function readMeta(){try{const x=JSON.parse(localStorage.getItem(META)||'null');return x&&Number.isSafeInteger(x.revision)&&/^[a-f0-9]{64}$/.test(x.sha256)?x:null}catch{return null}}
function setMeta(r,h){S.meta={revision:r,sha256:h};localStorage.setItem(META,JSON.stringify(S.meta));}
function setPending(v){S.pending=!!v;if(v)localStorage.setItem(PENDING,'1');else localStorage.removeItem(PENDING);update();}
function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,DB_VERSION);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);q.onupgradeneeded=()=>{};});}
function req(q){return new Promise((resolve,reject)=>{q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
async function allBooks(){const db=await openDb();try{return await req(db.transaction('books','readonly').objectStore('books').getAll())}finally{db.close();}}
async function replaceBooks(remoteBooks){const db=await openDb();try{
 const tx=db.transaction('books','readwrite'),store=tx.objectStore('books'),locals=await req(store.getAll()),lm=new Map(locals.map(x=>[x.id,x])),seen=new Set();
 for(const r of remoteBooks){seen.add(r.id);const l=lm.get(r.id),same=l?.assetSha256===r.assetSha256;
  const item={...r,favorite:l?.favorite||false,notes:l?.notes||'',progress:l?.progress||{},readerSettings:l?.readerSettings||{},file:same&&l?.file instanceof Blob?l.file:undefined};
  store.put(item);
 }
 for(const l of locals)if(!seen.has(l.id))store.delete(l.id);
 await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('catalog transaction aborted'));tx.onerror=()=>{};});
 }finally{db.close();}}
async function putLocal(book){const db=await openDb();try{const tx=db.transaction('books','readwrite');tx.objectStore('books').put(book);await new Promise((r,j)=>{tx.oncomplete=r;tx.onabort=()=>j(tx.error||new Error('write aborted'));tx.onerror=()=>{};});}finally{db.close();}}
function publicBook(b){return {id:String(b.id),title:String(b.title||'').slice(0,240),author:String(b.author||'').slice(0,240),kind:'epub',shelf:String(b.shelf||'geral').slice(0,80),shelfId:String(b.shelfId||'').slice(0,120),bibliographic:(b.bibliographic&&typeof b.bibliographic==='object')?clone(b.bibliographic):{},originalName:String(b.originalName||'').slice(0,240),importedAt:Number(b.importedAt)||Date.now(),assetSha256:b.assetSha256,size:b.assetSize,mediaType:'application/epub+zip'};}
async function getRemote(){const r=await fetch(API+'/api/v1/catalog',{cache:'no-store',credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();if(!Number.isSafeInteger(d.revision)||!d.catalog||d.catalog.version!==1||!Array.isArray(d.catalog.books)||!/^[a-f0-9]{64}$/.test(d.sha256))throw Error('invalid catalog response');if(await hashText(JSON.stringify(d.catalog))!==d.sha256)throw Error('catalog hash mismatch');return d;}
async function assetExists(sha){const r=await fetch(API+'/api/v1/assets/'+sha,{method:'HEAD',cache:'no-store',credentials:'omit'});if(r.status===404)return false;if(!r.ok)throw Error('asset HEAD '+r.status);return true;}
async function uploadAsset(book){if(!(book.file instanceof Blob)||!book.file.size)throw Error('Arquivo local ausente para '+book.title);const buf=await book.file.arrayBuffer(),sha=await hashBytes(buf);book.assetSha256=sha;book.assetSize=book.file.size;book.mediaType='application/epub+zip';await putLocal(book);if(await assetExists(sha))return;
 const r=await fetch(API+'/api/v1/admin/assets/'+sha,{method:'PUT',credentials:'omit',headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/epub+zip','X-BL2-File-Name':String(book.originalName||book.title||'livro.epub').slice(0,240)},body:buf});
 if(r.status===401||r.status===403){S.token=null;throw Error('autorização administrativa expirada');}if(!r.ok)throw Error('upload EPUB HTTP '+r.status);const a=await r.json();if(a.sha256!==sha||a.size!==book.file.size)throw Error('upload EPUB não confirmado');}
async function publish(){if(S.busy||!S.token||S.conflict)return;S.busy=true;update();try{
 const live=await getRemote();S.remote=live;if(S.meta&&live.revision!==S.meta.revision){S.conflict=true;msg('Catálogo remoto avançou em outro navegador. Dados locais foram preservados; reconciliação necessária.',true);return;}
 const books=(await allBooks()).filter(b=>b.kind==='epub');if(!books.length&&live.revision===0){msg('Nenhum EPUB local para migrar.');setPending(false);return;}
 for(const b of books)await uploadAsset(b);
 const refreshed=await allBooks(),catalog={version:1,books:refreshed.filter(b=>b.kind==='epub').map(publicBook)};
 const expected=S.meta?.revision??live.revision;
 const r=await fetch(API+'/api/v1/admin/catalog',{method:'PUT',cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:expected,catalog})});
 if(r.status===409){S.conflict=true;msg('Conflito de catálogo: outro navegador publicou antes. Catálogo local preservado.',true);return;}
 if(r.status===401||r.status===403){S.token=null;msg('Login expirado. Catálogo local permanece em fila.',true);return;}
 if(!r.ok)throw Error('catalog PUT '+r.status);const ack=await r.json();const h=await hashText(JSON.stringify(catalog));if(ack.revision!==expected+1||ack.sha256!==h)throw Error('catalog confirmation invalid');
 const checked=await getRemote();if(checked.revision!==ack.revision||checked.sha256!==h)throw Error('catalog readback mismatch');
 S.remote=checked;setMeta(checked.revision,checked.sha256);setPending(false);S.conflict=false;S.ready=true;msg('Catálogo e EPUBs sincronizados no Cloudflare · r'+checked.revision+'.');
 }catch(e){setPending(true);msg('Sincronização do acervo pendente: '+e.message,true);}finally{S.busy=false;update();}}
async function refresh(force=false){if(S.reading||S.busy||(document.hidden&&!force))return;S.reading=true;try{
 const d=await getRemote();S.remote=d;S.meta=readMeta();
 if(d.revision===0){S.ready=true;msg('Catálogo central ainda vazio. No login administrativo, os EPUBs locais serão migrados automaticamente.');if(S.token&&(await allBooks()).some(b=>b.kind==='epub')){setPending(true);void publish();}return;}
 if(S.pending){if(S.meta&&d.revision!==S.meta.revision){S.conflict=true;msg('Nova revisão do catálogo detectada enquanto há alterações locais. Nada foi sobrescrito.',true);}return;}
 if(!S.meta||d.revision!==S.meta.revision||d.sha256!==S.meta.sha256){await replaceBooks(d.catalog.books);setMeta(d.revision,d.sha256);await window.LibraryCatalog?.refresh?.();msg('Catálogo D1 r'+d.revision+' carregado. EPUBs serão baixados apenas quando necessários.');}
 else msg('Catálogo D1 sincronizado · r'+d.revision+'.');S.ready=true;
 }catch(e){msg('Catálogo online indisponível; usando cópia local: '+e.message,true);}finally{S.reading=false;update();}}
async function fetchAsset(sha,type='application/epub+zip'){if(!/^[a-f0-9]{64}$/.test(sha))throw Error('asset id inválido');const r=await fetch(API+'/api/v1/assets/'+sha,{cache:'force-cache',credentials:'omit'});if(!r.ok)throw Error('EPUB remoto HTTP '+r.status);const b=await r.blob();const h=await hashBytes(await b.arrayBuffer());if(h!==sha)throw Error('EPUB remoto falhou na verificação SHA-256');return new Blob([b],{type:type||'application/epub+zip'});}
function panel(){const anchor=document.querySelector('[aria-label="Sincronização Cloudflare D1"]');if(!anchor)return;const sec=document.createElement('section');sec.className='admin-backup-section';sec.setAttribute('aria-label','Sincronização do acervo Cloudflare R2');sec.innerHTML='<h3>Acervo online · Cloudflare R2</h3><p>EPUBs publicados ficam no R2 por SHA-256; metadados e associações de estante ficam versionados no D1. Progresso, favoritos e notas pessoais permanecem locais.</p><p id="d1-catalog-status" role="status" aria-live="polite">Inicializando catálogo online…</p><p id="d1-catalog-revision">Catálogo D1 —</p><div class="admin-backup-controls"><button id="d1-catalog-sync" type="button">Sincronizar acervo agora</button><button id="d1-catalog-refresh" type="button">Conferir catálogo</button></div>';anchor.insertAdjacentElement('afterend',sec);$('d1-catalog-sync').onclick=()=>void publish();$('d1-catalog-refresh').onclick=()=>void refresh(true);}
panel();S.meta=readMeta();
window.addEventListener('bl2:admin-auth',e=>{S.token=e.detail?.token||null;if(S.token&&S.pending)void publish();else if(S.token&&S.remote?.revision===0)void refresh(true);update();});
window.addEventListener('bl2:admin-changed',e=>{if(e.detail?.type==='catalog'){setPending(true);if(S.token)void publish();else msg('Alteração do acervo preservada localmente. Entre com Google para enviar ao R2.',true);}});
window.addEventListener('online',()=>void refresh(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh(true);});
window.addEventListener('beforeunload',e=>{if(S.pending){e.preventDefault();e.returnValue='';}});
window.__BL2_CATALOG_SYNC__={fetchAsset,refresh,publish,get state(){return{revision:S.remote?.revision??S.meta?.revision??null,pending:S.pending,conflict:S.conflict,authenticated:!!S.token}}};
void refresh(true);setInterval(()=>{if(!document.hidden)void refresh();},30000);update();
})();