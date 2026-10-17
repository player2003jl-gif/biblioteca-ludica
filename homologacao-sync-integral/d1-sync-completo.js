/* BL2 D1 sync candidate — layout v7 only. EPUBs/catalog are excluded. */
(()=>{'use strict';
const API='https://bl2-layout-homologacao-a-b-20261016.chatgptset26.workers.dev';
const GOOGLE='605685743440-8hcd7v8jfmcg0j5oso5lrfh30uvnhnm9.apps.googleusercontent.com';
const KEY='BL2_layout_044_TWO_ROOMS',META='BL2_D1_LAYOUT_META_V2',DRAFT='BL2_D1_LAYOUT_RASCUNHO_V2';
const $=id=>document.getElementById(id),core=window.__BL2_EDITOR__;
if(!core?.bundle||!core?.applyLayout||!core?.commitConfirmed)return;
const S={remote:null,base:null,token:null,busy:false,reading:false,conflict:false,ready:false,backed:false,first:true};
const clone=x=>JSON.parse(JSON.stringify(x)),decode=s=>{try{return JSON.parse(s)}catch{return null}};
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v),equal=(a,b)=>canonical(a)===canonical(b);
const bytes=new TextEncoder(),hash=async obj=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.encode(JSON.stringify(obj)))),x=>x.toString(16).padStart(2,'0')).join('');
const pending=()=>!!core.dirty||!!localStorage.getItem(DRAFT)||S.conflict;
function message(t,bad=false){const n=$('d1-sync-status');if(n){n.textContent=t;n.style.color=bad?'#ffc2b6':'#d5edc6';}}
function update(){const r=$('d1-sync-revision');if(r)r.textContent='D1 '+(S.remote?'r'+S.remote.revision:'—')+(S.base?' · local r'+S.base.revision:'');
if($('d1-sync-save'))$('d1-sync-save').disabled=!S.token||!S.ready||!S.base||!pending()||S.conflict||S.busy;
if($('d1-sync-adopt'))$('d1-sync-adopt').disabled=!S.remote||S.busy;
}
function base(){const m=decode(localStorage.getItem(META));return m&&Number.isSafeInteger(m.revision)&&/^[a-f0-9]{64}$/.test(m.sha256)?m:null;}
function mark(rev,sha){localStorage.setItem(META,JSON.stringify({revision:rev,sha256:sha}));S.base={revision:rev,sha256:sha};}
function draft(){try{localStorage.setItem(DRAFT,JSON.stringify({savedAt:new Date().toISOString(),revision:S.base?.revision??null,layout:core.bundle()}));}
catch(e){message('Falha em salvar rascunho: exporte um JSON!',true);throw e;}}
function archiveDraft(raw,reason){
 try{
  const key='BL2_D1_LAYOUT_ARCHIVE_V1_'+Date.now();
  localStorage.setItem(key,JSON.stringify({archivedAt:new Date().toISOString(),reason,raw}));
  localStorage.removeItem(DRAFT);
  return true;
 }catch{return false;}
}
async function classifyDraft(remote){
 const raw=localStorage.getItem(DRAFT);if(!raw)return {kind:'none'};
 const d=decode(raw);if(!d?.layout)return {kind:'unknown'};
 let h;try{h=await hash(d.layout)}catch{return {kind:'unknown'};}
 if(h===remote.sha256)return {kind:'known',revision:remote.revision,current:true,raw};
 const known=await historyMatch(h).catch(()=>null);
 return known?{kind:'known',revision:known.revision,current:!!known.current,raw}:{kind:'unknown'};
}
async function read(){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);try{
const r=await fetch(API+'/api/v1/layout',{cache:'no-store',credentials:'omit',signal:ctrl.signal});if(!r.ok)throw Error('HTTP '+r.status);
const d=await r.json();if(!Number.isSafeInteger(d.revision)||d.revision<1||!d.layout||!/^[a-f0-9]{64}$/.test(d.sha256))throw Error('Resposta incompleta');
if(await hash(d.layout)!==d.sha256)throw Error('Hash remoto inválido');return d;
}finally{clearTimeout(timer);}}
function apply(d){const original=clone(core.bundle()),old=localStorage.getItem(KEY),prior=S.base;
try{core.applyLayout(d.layout);localStorage.setItem(KEY,JSON.stringify(core.bundle()));mark(d.revision,d.sha256);S.ready=true;S.conflict=false;}
catch(e){try{core.applyLayout(original)}catch{};try{old===null?localStorage.removeItem(KEY):localStorage.setItem(KEY,old)}catch{};S.base=prior;throw e;}}
async function refresh(force=false){if(S.busy||S.reading||(document.hidden&&!force))return;S.reading=true;
try{const d=await read(),changed=!S.remote||S.remote.revision!==d.revision||S.remote.sha256!==d.sha256;S.remote=d;
const current=await hash(core.bundle()),m=base();
if(S.first){S.first=false;
if(localStorage.getItem(DRAFT)){
 const ds=await classifyDraft(d);
 if(ds.kind==='known'){
  if(!archiveDraft(ds.raw,'Rascunho reconhecido como revisão publicada r'+ds.revision)){
   S.conflict=true;message('Rascunho antigo reconhecido, mas não foi possível arquivá-lo com segurança. Exporte JSON antes de continuar.',true);return;
  }
  message('Rascunho antigo reconhecido como revisão publicada r'+ds.revision+' e arquivado localmente. Retomando sincronização.');
 }else{
  S.conflict=true;message('Rascunho local inédito detectado: exporte e concilie antes de substituir.',true);return;
 }
}
if(m&&m.revision===d.revision&&m.sha256===d.sha256&&equal(core.bundle(),d.layout)){S.base=m;S.ready=true;}
else if(equal(core.bundle(),d.layout)){mark(d.revision,d.sha256);S.ready=true;message('Layout igual ao D1, sincronizado.');return;}
else if(localStorage.getItem(KEY)!==null){S.conflict=true;message('Layout local antigo difere do D1: faça backup antes de optar pelo central.',true);return;}
else if(!core.dirty){apply(d);message('Layout D1 r'+d.revision+' carregado automaticamente.');return;}}
if(S.conflict){message('Conflito ou rascunho local: sincronização adiada; exporte JSON.',true);return;}
if(S.base?.revision===d.revision&&S.base.sha256===d.sha256){
 if(equal(core.bundle(),d.layout)){if(force)message('D1 sincronizado · r'+d.revision);return;}
 if(core.isBusyGesture){message('Metadados r'+d.revision+' atualizados, mas o editor ainda está em gesto. Reaplicação adiada.');return;}
 if(pending()){S.conflict=true;draft();message('Metadados apontam para r'+d.revision+', mas há edição local diferente. Trabalho preservado; concilie antes de substituir.',true);return;}
 apply(d);message('Revisão r'+d.revision+' reaplicada: metadados estavam atualizados, mas o layout visual estava divergente.');return;
}
if(core.isBusyGesture){message('Revisão remota r'+d.revision+' aguardando fim do arraste.');return;}
if(pending()||(S.base&&current!==S.base.sha256)){S.conflict=true;draft();message('Mudança local preservada. Concilie antes de sincronizar.',true);return;}
if(!changed&&S.ready)return;
apply(d);message('Revisão D1 r'+d.revision+' aplicada automaticamente, sem F5.');
}catch(e){message('D1 indisponível ('+e.message+'). Planta local preservada.',true);}
finally{S.reading=false;update();}}
async function save(){if(S.busy||S.reading){message('Aguarde a verificação do D1.');return false;}
if(!S.token){draft();message('Login Google obrigatório para salvar; rascunho protegido.',true);update();return false;}
if(!S.ready||S.conflict||!S.base){draft();message('Conciliação pendente: gravação bloqueada.',true);update();return false;}
const local=clone(core.bundle()),localHash=await hash(local);
if(localHash===S.base.sha256&&!localStorage.getItem(DRAFT)){message('Nada para publicar.');return true;}
draft();S.busy=true;update();message('Conferindo revisão e salvando no D1…');
try{const live=await read();S.remote=live;
if(live.revision!==S.base.revision||live.sha256!==S.base.sha256){S.conflict=true;message('Outra revisão foi publicada; trabalho local preservado.',true);return false;}
const r=await fetch(API+'/api/v1/admin/layout',{method:'PUT',cache:'no-store',credentials:'omit',
headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:S.base.revision,layout:local})});
if(r.status===409){S.conflict=true;message('Conflito 409: mantenha o JSON antes de reconciliar.',true);return false;}
if(r.status===401||r.status===403){S.token=null;message('Conta não autorizada ou sessão expirada.',true);return false;}
if(!r.ok)throw Error('HTTP '+r.status);
const ack=await r.json();if(ack.revision!==S.base.revision+1||ack.sha256!==localHash)throw Error('Confirmação não verificável');
const verified=await read();if(verified.revision!==ack.revision||verified.sha256!==localHash)throw Error('Leitura D1 divergente: não repita a gravação');
localStorage.setItem(KEY,JSON.stringify(local));mark(ack.revision,ack.sha256);S.remote=verified;
localStorage.removeItem(DRAFT);core.commitConfirmed();S.conflict=false;S.ready=true;
message('D1 confirmou revisão r'+ack.revision+'; outros navegadores serão atualizados.');return true;
}catch(e){message('Falha ou resultado incerto: '+e.message+'; rascunho preservado.',true);return false;}
finally{S.busy=false;update();}}
function backup(which){const data=which==='remote'?S.remote:{revision:S.base?.revision??null,layout:core.bundle()};
if(!data){message('Não há remoto para exportar.',true);return;}
const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
a.href=url;a.download='BL2_LAYOUT_'+(which==='remote'?'D1':'LOCAL')+'_'+Date.now()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);S.backed=true;message('Backup preparado. Confirme que o arquivo foi salvo.');}
function adopt(){if(!S.remote||S.busy)return;if(!S.backed){message('Primeiro faça backup JSON local.',true);return;}
if(!confirm('Aplicar o layout central D1? Sua versão local deve estar guardada em backup.'))return;
try{if(pending())draft();apply(S.remote);localStorage.removeItem(DRAFT);message('Revisão central aplicada r'+S.remote.revision);}catch(e){message('Falha: '+e.message,true);}update();}
function recover(){const d=decode(localStorage.getItem(DRAFT));if(!d?.layout)return message('Nenhum rascunho local.');
if(!confirm('Abrir o rascunho salvo? Sua publicação continuará bloqueada até conciliar.'))return;
try{core.applyLayout(d.layout);S.conflict=true;S.ready=false;message('Rascunho restaurado; exporte JSON antes de reconciliar.',true);}catch(e){message(e.message,true);}update();}
const section=document.querySelector('[aria-label="Sincronização Cloudflare D1"]');
if(section)section.innerHTML='<h3>Sincronização administrativa · Cloudflare D1</h3><p>Layout de salas, portas, móveis, NPCs e interações. O catálogo e os EPUBs não foram migrados. Edições locais e revisões são protegidas.</p>'+
'<p id="d1-sync-status" role="status" aria-live="polite">Conectando ao D1…</p><p id="d1-sync-revision">D1 —</p><div id="d1-sync-login"></div>'+
'<div class="admin-backup-controls"><button id="d1-sync-backup" type="button">Baixar JSON local</button><button id="d1-sync-remote-backup" type="button">Baixar D1</button><button id="d1-sync-adopt" type="button">Usar revisão D1</button><button id="d1-sync-draft" type="button">Recuperar rascunho</button><button id="d1-sync-refresh" type="button">Conferir</button><button id="d1-sync-save" type="button">Salvar no D1</button></div>';
if($('d1-sync-backup'))$('d1-sync-backup').onclick=()=>backup('local');
if($('d1-sync-remote-backup'))$('d1-sync-remote-backup').onclick=()=>backup('remote');
if($('d1-sync-adopt'))$('d1-sync-adopt').onclick=adopt;
if($('d1-sync-draft'))$('d1-sync-draft').onclick=recover;
if($('d1-sync-refresh'))$('d1-sync-refresh').onclick=()=>void refresh(true);
if($('d1-sync-save'))$('d1-sync-save').onclick=()=>void save();
function login(){const node=$('d1-sync-login');if(!node)return;
const start=()=>{if(!window.google?.accounts?.id){message('Google indisponível.',true);return;}
google.accounts.id.initialize({client_id:GOOGLE,auto_select:false,callback:r=>{S.token=typeof r?.credential==='string'?r.credential:null;message(S.token?'Google conectado; autorização será verificada pelo Worker.':'Login não concluído.',!S.token);update();}});
google.accounts.id.renderButton(node,{theme:'outline',size:'medium',text:'signin_with'});};
if(window.google?.accounts?.id)start();else{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=start;s.onerror=()=>message('Google indisponível.',true);document.head.appendChild(s);}}
window.__BL2_D1_BRIDGE__={saveFromEditor:save,refresh,backup,get status(){return{active:S.ready,revision:S.base?.revision,remoteRevision:S.remote?.revision,conflict:S.conflict};}};
login();void refresh(true);update();
const timer=setInterval(()=>{if(!document.hidden)void refresh();},12000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh(true);});
window.addEventListener('pagehide',()=>{clearInterval(timer);if(core.dirty){try{draft()}catch{}}},{once:true});
})();