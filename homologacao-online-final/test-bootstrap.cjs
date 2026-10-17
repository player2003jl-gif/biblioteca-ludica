const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
const source=fs.readFileSync('index.html','utf8'),code=fs.readFileSync('homologacao-online-final/bootstrap.js','utf8');
const root={textContent:'',style:{}},doc={getElementById:id=>id==='sync-boot'?root:null,open(){},write(s){this.output=s},close(){}};
const ctx={document:doc,fetch:async()=>({ok:true,status:200,text:async()=>source}),crypto:crypto.webcrypto,TextEncoder,console,setTimeout,clearTimeout};
vm.runInNewContext(code,ctx);
setTimeout(()=>{
 try{
  const out=doc.output||'';
  assert(out.length>19000000,'patched full HTML not emitted');
  assert(out.includes('homologacao-online-final')===false,'unexpected self reference');
  assert(out.includes('./d1-sync.js')&&out.includes('./catalog-sync.js'),'D1/R2 scripts missing');
  assert(!out.includes('ADM-003.1 v0.5.19.2 experimental'),'legacy Drive script still active');
  assert(out.includes('function commitConfirmed()'),'D1 save patch missing');
  assert(out.includes('async function ensureRemoteFile(book)'),'lazy R2 EPUB hook missing');
  assert(out.includes('get isBusyGesture(){return !!dragging||!!placingScene;}'),'editor gesture safety getter missing');
  console.log('PASS bootstrap: pinned source, Drive disabled, D1 save patch, lazy R2 hook, scripts injected.');
 }catch(e){console.error(e);process.exitCode=1;}
},300);
