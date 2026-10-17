/* Biblioteca Lúdica II — E8, somente homologação. Cache confirmado e rascunhos separados. */
(()=>{'use strict';
const API='https://bl2-layout-homologacao-a-b-20261016.chatgptset26.workers.dev';
const CLIENT='605685743440-8hcd7v8jfmcg0j5oso5lrfh30uvnhnm9.apps.googleusercontent.com';
const LEGACY='BL2_STAGING_D1_EDITOR_LAYOUT_20261016',CACHE='BL2_D1_E8_CONFIRMED_V1';
const PREFIX='BL2_D1_E8_DRAFT_V1_',OWN=PREFIX+crypto.randomUUID();
const $=id=>document.getElementById(id),editor=window.__BL2_EDITOR__;
if(!editor?.applyLayout||!editor?.bundle||!editor?.commitConfirmed){$('bl2-d1-status').textContent='Editor incompatível: nenhuma alteração aplicada.';return;}
const clone=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const equal=(a,b)=>canonical(a)===canonical(b);
const digest=async x=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x)))),b=>b.toString(16).padStart(2,'0')).join('');
const initial=clone(editor.bundle());
const S={remote:null,active:false,revision:null,baseline:initial,baselineRemote:null,backup:null,token:null,busy:false,fetching:false,
 conflict:false,correction:null,online:false,storageError:false,localGuard:false,invalidLocal:false,manual:false,initialized:false,uncertain:null,lastDraft:null,drafts:[]};
const controls={backup:$('bl2-d1-backup'),activate:$('bl2-d1-activate'),repair:$('bl2-d1-repair'),save:$('bl2-d1-save'),recover:$('bl2-d1-recover'),archive:$('bl2-d1-archive')};
const dirty=()=>!equal(editor.bundle(),S.baseline)||(!S.active&&!!editor.dirty);
function message(t,err=false){$('bl2-d1-status').textContent=t;$('bl2-d1-status').style.color=err?'#ffbdb1':'#e4ceaa';}
function storageFailure(){S.storageError=true;$('bl2-d1-local-status').textContent='Armazenamento local indisponível. Baixe a segurança local antes de fechar; gravação D1 bloqueada até a recuperação do armazenamento.';}
function read(key){try{return localStorage.getItem(key);}catch{storageFailure();return null;}}
function write(key,value){try{localStorage.setItem(key,value);S.storageError=false;return true;}catch{storageFailure();return false;}}
function shape(d){
 if(!d||d.version!==7||d.architecture!=='reception-library-virtual-reading'||!Array.isArray(d.rooms?.hall)||!Array.isArray(d.rooms?.archive)||
 !d.roomSizes?.hall||!d.roomSizes?.archive||!Array.isArray(d.doors?.hall)||!Array.isArray(d.doors?.archive))throw Error('Formato de layout incompatível');
}
async function validateSnapshot(d){
 if(!Number.isSafeInteger(d?.revision)||d.revision<1||!/^[0-9a-f]{64}$/.test(d.sha256))throw Error('Resposta D1 inválida');
 shape(d.layout);if(await digest(d.layout)!==d.sha256)throw Error('Hash do layout D1 não confere');return d;
}
function correction(layout){
 try{
  shape(layout);const invalid=[];
  for(const room of ['hall','archive']){const size=layout.roomSizes[room];for(const o of layout.rooms[room])
   if(o.x<44||o.y<44||o.x+o.w>size.tilesW*32-44||o.y+o.h>size.tilesH*32-44)invalid.push({room,o,size});}
  if(invalid.length!==1||invalid[0].room!=='hall'||invalid[0].o.id!=='user-mv9ym902-2')return null;
  const {o,size}=invalid[0],next=clone(layout),item=next.rooms.hall.find(x=>x.id===o.id);
  item.x=Math.min(Math.max(44,o.x),size.tilesW*32-44-o.w);item.y=Math.min(Math.max(44,o.y),size.tilesH*32-44-o.h);
  return {layout:next,from:{x:o.x,y:o.y},to:{x:item.x,y:item.y}};
 }catch{return null;}
}
function scanDrafts(){
 const selected=$('bl2-d1-drafts').value,entries=[];
 try{for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);if(!key?.startsWith(PREFIX))continue;
  const raw=localStorage.getItem(key);let record;
  try{record=JSON.parse(raw);if(record.schema!==1)throw Error();shape(record.layout);
   if(record.baseline)shape(record.baseline);
   if(record.baseRevision!==null&&(!Number.isSafeInteger(record.baseRevision)||record.baseRevision<1))throw Error();
  }catch{entries.push({key,raw,invalid:true});continue;}
  if(record.state!=='archived')entries.push({key,raw,record});
 }}catch{storageFailure();}
 S.drafts=entries;
 const select=$('bl2-d1-drafts');select.replaceChildren();
 for(const item of entries){const option=document.createElement('option');option.value=item.key;
  option.textContent=item.invalid?'Registro local ilegível — exporte para análise':`${item.record.updatedAt} · base ${item.record.baseRevision?'r'+item.record.baseRevision:'não confirmada'}${item.key===OWN?' · esta sessão':''}`;
  select.appendChild(option);}
 if(entries.some(x=>x.key===selected))select.value=selected;
 if(!S.storageError)$('bl2-d1-local-status').textContent=entries.length?`${entries.length} rascunho(s) preservado(s) neste navegador. Recuperar não publica no D1.`:'Nenhum rascunho pendente. A cópia confirmada pode ser recuperada sem conexão.';
}
function controlsUpdate(){
 controls.backup.disabled=S.busy;
 controls.activate.disabled=!S.remote||S.busy||!!S.correction||!!S.uncertain;
 controls.repair.disabled=!S.remote||S.busy||!S.correction||!!S.uncertain;
 controls.save.disabled=!S.active||!S.token||!S.online||S.busy||S.fetching||!dirty()||S.conflict||!!S.uncertain||S.storageError;
 const selected=S.drafts.find(x=>x.key===$('bl2-d1-drafts').value);
 controls.recover.disabled=!selected||selected.invalid||S.busy||editor.isBusyGesture||!!S.uncertain;
 controls.archive.disabled=!selected||selected.invalid||S.busy||!!S.uncertain;
 $('bl2-d1-revision').textContent=S.remote?'r'+S.remote.revision:'—';
 $('bl2-d1-mode').textContent=S.active?`${S.online?'Conectado ao D1':'Cópia local · sem confirmação online'} · aplicada r${S.revision}${dirty()?' · edição pendente':''}`:'Estado local preservado · aguardando escolha';
}
function draftRecord(){return {schema:1,state:'pending',updatedAt:new Date().toISOString(),baseRevision:S.revision,
 baseline:clone(S.baseline),baselineRemote:S.baselineRemote,layout:clone(editor.bundle()),uncertain:S.uncertain};}
function persistDraft(){
 if(!dirty()&&!S.uncertain){
  const raw=read(OWN);if(raw){try{if(JSON.parse(raw).state==='pending')archiveOwn();}catch{storageFailure();}}
  return true;
 }
 const record=draftRecord(),signature=canonical({...record,updatedAt:null});
 if(signature===S.lastDraft&&!S.storageError&&read(OWN))return true;
 if(!write(OWN,JSON.stringify(record)))return false;
 S.lastDraft=signature;scanDrafts();return true;
}
function archiveOwn(){
 const raw=read(OWN);if(!raw)return;
 try{const d=JSON.parse(raw);d.state='archived';d.archivedAt=new Date().toISOString();write(OWN,JSON.stringify(d));}catch{storageFailure();}
 S.lastDraft=null;scanDrafts();
}
function saveCache(d,normalized){return write(CACHE,JSON.stringify({schema:1,snapshot:d,editorLayout:normalized}));}
function accept(d,apply=true){
 if(apply)editor.applyLayout(d.layout);
 S.active=true;S.revision=d.revision;S.baseline=clone(apply?editor.bundle():d.layout);S.baselineRemote=clone(d);
 S.conflict=false;S.localGuard=false;S.invalidLocal=false;S.manual=false;S.uncertain=null;
 saveCache(d,S.baseline);write(LEGACY,JSON.stringify(S.baseline));editor.commitConfirmed(S.baseline);
 if(dirty())persistDraft();else archiveOwn();
}
function backupPayload(){
 const records={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k===LEGACY||k===CACHE||k?.startsWith(PREFIX))records[k]=localStorage.getItem(k);}}catch{storageFailure();}
 // Mantém o formato importável do editor; informações de recuperação ficam em um campo adicional.
 return {...clone(editor.bundle()),_d1Recovery:{schema:1,revision:S.revision,uncertain:S.uncertain,records}};
}
function backup(){
 persistDraft();const payload=backupPayload(),a=document.createElement('a');
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 a.href=url;a.download='BL2_E8_SEGURANCA_LOCAL_'+Date.now()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000);
 S.backup=canonical(payload);message('Segurança local exportada, incluindo rascunhos e cópia confirmada. Nada foi publicado.');controlsUpdate();
}
function requireBackup(){
 if(S.backup!==canonical(backupPayload())){message('Baixe a segurança local atualizada antes de substituir ou arquivar um estado local.',true);return false;}return true;
}
function activate(adjust=false){
 if(!S.remote||S.busy||S.uncertain||editor.isBusyGesture)return;
 if(!requireBackup())return;
 if(!!S.correction!==adjust)return;
 try{
  // O backup foi gerado antes desta troca; todos os registros anteriores continuam guardados.
  const previous=clone(editor.bundle());
  if(adjust){editor.applyLayout(S.correction.layout);S.active=true;S.revision=S.remote.revision;S.baseline=clone(S.remote.layout);S.baselineRemote=clone(S.remote);S.conflict=false;S.localGuard=false;S.manual=false;persistDraft();}
  else{editor.applyLayout(S.remote.layout);accept(S.remote,false);S.baseline=clone(editor.bundle());saveCache(S.remote,S.baseline);editor.commitConfirmed(S.baseline);archiveOwn();}
  // A chave legada foi exportada e arquivada no JSON; espelha a escolha explícita para não bloquear toda abertura.
  if(!equal(previous,editor.bundle())||read(LEGACY))write(LEGACY,JSON.stringify(editor.bundle()));
  message(adjust?'Ajuste recuperado apenas no editor. Faça login e salve para publicar.':'Revisão r'+S.revision+' carregada. Nada foi publicado.');
 }catch(e){message('Layout recusado: '+e.message+'. Estado anterior preservado.',true);}controlsUpdate();
}
function recover(){
 if(S.busy||S.uncertain||editor.isBusyGesture)return;
 const item=S.drafts.find(x=>x.key===$('bl2-d1-drafts').value);if(!item||item.invalid)return;
 if(dirty()&&!requireBackup())return;
 const d=item.record;
 try{
  if(dirty()&&item.key!==OWN){const previous=read(OWN);if(previous&&!write(PREFIX+crypto.randomUUID(),previous))return;}
  editor.applyLayout(d.layout);S.baseline=clone(d.baseline||initial);S.revision=d.baseRevision;S.baselineRemote=d.baselineRemote||null;
  S.active=Number.isSafeInteger(S.revision);S.uncertain=d.uncertain||null;S.localGuard=!S.active;S.manual=false;
  S.conflict=!!S.remote&&S.remote.revision!==S.revision;
  // Primeiro criar a cópia da sessão atual; só depois arquivar a origem inalterada.
  S.lastDraft=null;
  if(persistDraft()&&item.key!==OWN&&read(item.key)===item.raw)write(item.key,JSON.stringify({...d,state:'archived',archivedAt:new Date().toISOString()}));
  scanDrafts();message('Rascunho recuperado sem publicação.'+(S.conflict?' A revisão D1 mudou: conciliação necessária.':' Confira o ambiente antes de salvar.'),S.conflict);
 }catch(e){message('Rascunho recusado: '+e.message+'. Registro original preservado.',true);}controlsUpdate();
}
async function request(path,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{return await fetch(API+path,{cache:'no-store',credentials:'omit',...options,signal:controller.signal});}finally{clearTimeout(timer);}
}
async function load(){
 if(!S.initialized||S.busy||S.fetching)return;
 S.fetching=true;
 try{
  const res=await request('/api/v1/layout');if(!res.ok)throw Error('HTTP '+res.status);
  const d=await validateSnapshot(await res.json());
  if(S.revision&&d.revision<S.revision)throw Error('Revisão remota inferior à cópia aplicada; recuperação automática bloqueada');
  if(S.baselineRemote&&d.revision===S.revision&&d.sha256!==S.baselineRemote.sha256)throw Error('Mesma revisão com hash diferente; estado local preservado');
  S.remote=d;S.online=true;S.correction=correction(d.layout);scanDrafts();
  if(S.uncertain){
   const u=S.uncertain;
   if(d.sha256===u.sha256&&d.revision>u.baseRevision){accept(d,false);message('Publicação antes incerta confirmada na r'+d.revision+'. Edições posteriores preservadas.');return;}
   if(d.revision===u.baseRevision){S.uncertain=null;persistDraft();message('D1 continua na revisão anterior. Rascunho preservado; nenhum reenvio automático.');return;}
   S.conflict=true;message('Publicação sem confirmação e D1 já avançou. Exporte a segurança local e concilie; nenhum reenvio automático.',true);return;
  }
  if(!S.active){
   const legacy=read(LEGACY);let legacyMatches=!legacy;
   try{if(legacy)legacyMatches=equal(JSON.parse(legacy),d.layout);}catch{}
   if(S.manual||S.invalidLocal||S.storageError||S.localGuard&&!legacyMatches||dirty()||S.drafts.length){
    persistDraft();message('Revisão r'+d.revision+' disponível. Estado local preservado: recupere um rascunho ou baixe a segurança local e escolha usar o D1.');return;
   }
   if(editor.isBusyGesture){message('D1 disponível; aguardando o término do gesto no editor.');return;}
   if(S.correction){message('Revisão exige ajuste geométrico explícito; nada foi substituído.',true);return;}
   accept(d);message('Revisão r'+d.revision+' carregada automaticamente do D1.');return;
  }
  if(d.revision===S.revision){message('D1 confirmou r'+d.revision+(dirty()?'. Edição local preservada, ainda não publicada.':'. Layout sincronizado.'));return;}
  if(S.conflict||dirty()){
   persistDraft();S.conflict=true;message('Revisão nova detectada. Edição local não substituída. Exporte a segurança local e concilie.',true);return;
  }
  if(editor.isBusyGesture){message('Revisão recebida durante gesto. Aplicação adiada; tentarei novamente.');return;}
  if(S.correction){S.conflict=true;message('Revisão remota exige ajuste geométrico explícito.',true);return;}
  accept(d);message('Revisão r'+d.revision+' aplicada automaticamente no editor gráfico.');
 }catch(e){S.online=false;message('Consulta D1 falhou: '+e.message+'. Estado local preservado; nova tentativa automática.',true);}
 finally{S.fetching=false;controlsUpdate();}
}
async function save(){
 if(S.busy||S.fetching)return false;
 if(!S.active||!S.online){message('Aguarde a confirmação da revisão D1 antes de publicar. Rascunho preservado.',true);return false;}
 if(!S.token){message('Entre com Google para publicar. O rascunho fica neste navegador.',true);return false;}
 if(S.conflict||S.uncertain||S.remote?.revision!==S.revision){message('Publicação bloqueada até conferir ou conciliar a revisão.',true);return false;}
 if(!dirty()){message('Sem alterações para publicar.');return false;}
 if(!persistDraft())return false;
 S.busy=true;controlsUpdate();
 const layout=clone(editor.bundle()),baseRevision=S.revision;let sent=false;
 try{
  shape(layout);const sha256=await digest(layout);
  S.uncertain={baseRevision,sha256,layout};S.lastDraft=null;
  if(!persistDraft())throw Error('Rascunho não protegido no armazenamento local');
  message('Gravando revisão autenticada no Cloudflare D1…');sent=true;
  const res=await request('/api/v1/admin/layout',{method:'PUT',headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:baseRevision,layout})});
  if(res.status===409){S.uncertain=null;S.conflict=true;message('Conflito 409: outra janela publicou. Rascunho preservado; concilie.',true);return false;}
  if(res.status===401||res.status===403){S.uncertain=null;S.token=null;message('Login expirado ou não autorizado. Rascunho preservado; entre novamente com Google.',true);return false;}
  if(!res.ok)throw Error('HTTP '+res.status);
  const out=await res.json();if(out.revision!==baseRevision+1||out.sha256!==sha256)throw Error('Resposta de gravação inválida');
  const d={revision:out.revision,sha256:out.sha256,layout};S.remote=d;accept(d,false);
  message('D1 confirmou r'+d.revision+(dirty()?'. Edições feitas durante o envio continuam como rascunho.':'. Outro navegador receberá automaticamente.'));return true;
 }catch(e){if(!sent)S.uncertain=null;message('Gravação não confirmada: '+e.message+'. Rascunho preservado; conferindo o D1 antes de qualquer reenvio.',true);return false;}
 finally{S.busy=false;persistDraft();controlsUpdate();if(sent)void load();}
}
async function initialize(){
 scanDrafts();const legacy=read(LEGACY),raw=read(CACHE);S.localGuard=!!legacy;
 if(raw)try{
  const c=JSON.parse(raw);if(c.schema!==1)throw Error('Versão de cache inválida');await validateSnapshot(c.snapshot);shape(c.editorLayout);
  let compatible=!legacy;try{if(legacy)compatible=equal(JSON.parse(legacy),c.editorLayout)||equal(JSON.parse(legacy),c.snapshot.layout);}catch{}
  if(compatible&&!S.drafts.length&&!dirty()&&!editor.isBusyGesture&&!S.storageError){
   editor.applyLayout(c.snapshot.layout);S.active=true;S.revision=c.snapshot.revision;S.baseline=clone(editor.bundle());S.baselineRemote=c.snapshot;S.localGuard=false;
   message('Cópia confirmada r'+S.revision+' recuperada; consultando D1.');
  }
 }catch(e){S.localGuard=true;S.invalidLocal=true;message('Cópia local não validada: '+e.message+'. Registro preservado; exporte a segurança local.',true);}
 S.initialized=true;controlsUpdate();void load();
}
controls.backup.addEventListener('click',backup);
controls.activate.addEventListener('click',()=>activate(false));controls.repair.addEventListener('click',()=>activate(true));
controls.save.addEventListener('click',()=>void save());controls.recover.addEventListener('click',recover);
controls.archive.addEventListener('click',()=>{
 if(S.busy||S.uncertain||!requireBackup())return;
 const item=S.drafts.find(x=>x.key===$('bl2-d1-drafts').value);if(!item||item.invalid)return;
 if(item.key===OWN&&dirty()){message('O rascunho desta sessão ainda está no editor. Escolha o D1 após backup antes de arquivá-lo.',true);return;}
 if(read(item.key)!==item.raw){scanDrafts();message('Rascunho mudou em outra janela. Exporte novamente.',true);return;}
 write(item.key,JSON.stringify({...item.record,state:'archived',archivedAt:new Date().toISOString()}));scanDrafts();controlsUpdate();message('Rascunho arquivado e conservado no backup local.');
});
$('bl2-d1-drafts').addEventListener('change',controlsUpdate);
$('bl2-d1-refresh').addEventListener('click',()=>void load());
$('bl2-d1-reconcile').addEventListener('click',()=>{
 if(S.busy||S.uncertain)return;persistDraft();S.active=false;S.manual=true;S.localGuard=true;S.backup=null;
 message('Estado local preservado. Exporte a segurança local antes de escolher a revisão D1.');controlsUpdate();
});
window.__BL2_D1_BRIDGE__={saveFromEditor:save,get status(){return {active:S.active,revision:S.revision,remoteRevision:S.remote?.revision,conflict:S.conflict,online:S.online,pending:dirty(),uncertain:!!S.uncertain};}};
$('admin-backup-import').disabled=true;$('admin-backup-import').title='Restauração ZIP desabilitada nesta homologação.';
document.querySelector('[aria-label="Sincronização privada do Google Drive"]')?.setAttribute('hidden','');
function startGoogle(){const go=()=>{
 if(!window.google?.accounts?.id)return;
 window.google.accounts.id.initialize({client_id:CLIENT,auto_select:false,callback:r=>{S.token=typeof r?.credential==='string'?r.credential:null;
  message(S.token?'Login recebido. O Worker verificará a autorização ao salvar.':'Login não concluído.',!S.token);controlsUpdate();}});
 window.google.accounts.id.renderButton($('bl2-d1-google'),{theme:'outline',size:'medium',text:'signin_with'});
 };if(window.google?.accounts?.id)go();else{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=go;s.onerror=()=>{$('bl2-d1-google').textContent='Login Google indisponível; consulta D1 e recuperação local continuam disponíveis.';};document.head.appendChild(s);}}
function checkpoint(){if(S.initialized){persistDraft();controlsUpdate();}}
startGoogle();void initialize();
let poll,journal;
function startTimers(){poll=setInterval(()=>{if(!document.hidden)void load();},12000);journal=setInterval(checkpoint,750);}
startTimers();
for(const event of ['pointerup','pointercancel','keyup','change','click'])window.addEventListener(event,()=>queueMicrotask(checkpoint));
document.addEventListener('visibilitychange',()=>{checkpoint();if(!document.hidden)void load();});
window.addEventListener('online',()=>void load());
window.addEventListener('offline',()=>{S.online=false;checkpoint();message('Sem conexão. Edição preservada neste navegador; nada será enviado automaticamente.',true);});
window.addEventListener('storage',e=>{if(e.key?.startsWith(PREFIX)){scanDrafts();controlsUpdate();}});
window.addEventListener('beforeunload',e=>{checkpoint();if(dirty()||S.uncertain){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',()=>{checkpoint();clearInterval(poll);clearInterval(journal);});
window.addEventListener('pageshow',e=>{if(e.persisted){startTimers();checkpoint();void load();}});
})();
