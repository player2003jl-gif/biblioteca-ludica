/* BL2 — E5 conciliation from approved three-way audit. NEVER writes on load. */
(()=>{'use strict';
const API='https://bl2-layout-homologacao-a-b-20261016.chatgptset26.workers.dev';
const CLIENT='605685743440-8hcd7v8jfmcg0j5oso5lrfh30uvnhnm9.apps.googleusercontent.com';
const EXPECTED_REV=13;
const EXPECTED_REMOTE_SHA='ac85c1f3d8394ef89a94d6be43c25ac76f0994c82ae649031b55d5291a5162db';
const EXPECTED_MERGED_SHA='c9f9a3bc44d072c500d2c838f29a39ac488624e33903e3a9972693ace22d3035';
const SHELF_ID='user-mv9ym902-2';
const $=id=>document.getElementById(id);
const S={snapshot:null,token:null,downloaded:false,publishing:false,finished:false,remoteUncertain:false};
const enc=new TextEncoder();
const hex=buf=>Array.from(new Uint8Array(buf),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));
function status(message,kind=''){
 const node=$('status');node.textContent=message;node.dataset.kind=kind;
}
const copy=o=>JSON.parse(JSON.stringify(o));
function shelf(layout){return layout?.rooms?.hall?.find(o=>o.id===SHELF_ID);}
function table(layout){return layout?.rooms?.hall?.find(o=>o.id==='h-table');}
function safeRemote(r){
 const a=r?.layout&&shelf(r.layout),b=r?.layout&&table(r.layout);
 return r?.revision===EXPECTED_REV && r?.sha256===EXPECTED_REMOTE_SHA &&
  r.layout.version===7 && r.layout.architecture==='reception-library-virtual-reading' &&
  a && a.x===144 && a.y===368 && a.w===136 && a.h===64 && a.shelfName==='teste2026' &&
  b && b.x===64 && b.y===480 && b.w===204 && b.h===58;
}
function controls(){
 const ready=!!S.snapshot&&safeRemote(S.snapshot)&&!S.remoteUncertain&&!S.finished;
 $('download').disabled=!ready||S.publishing;
 $('approve').disabled=!ready||S.publishing;
 $('publish').disabled=!ready||!S.downloaded||!S.token||!$('approve').checked||S.publishing;
 $('refresh').disabled=S.publishing;
 $('revision').textContent=S.snapshot?'r'+S.snapshot.revision:'—';
 $('remote-sha').textContent=S.snapshot?S.snapshot.sha256.slice(0,16)+'…':'—';
}
async function fetchLive(){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const res=await fetch(API+'/api/v1/layout',{cache:'no-store',credentials:'omit',signal:controller.signal});
  if(!res.ok)throw Error('GET retornou HTTP '+res.status);
  const v=await res.json();
  if(!v||!Number.isSafeInteger(v.revision)||typeof v.sha256!=='string'||!v.layout)
   throw Error('A resposta do D1 é inválida');
  return v;
 }finally{clearTimeout(timer);}
}
async function validateSha(snapshot){
 const actual=await digest(JSON.stringify(snapshot.layout));
 if(actual!==snapshot.sha256)throw Error('O conteúdo remoto não corresponde ao hash anunciado; publicação bloqueada');
}
async function check(){
 if(S.publishing||S.finished)return;
 try{
  const v=await fetchLive();
  await validateSha(v);
  S.snapshot=v;S.remoteUncertain=false;
  if(safeRemote(v)){
   status('Revisão r13 intacta e verificada. Exporte o backup remoto, faça login Google e confirme o layout antes de publicar.','ok');
  }else if(v.sha256===EXPECTED_MERGED_SHA && v.revision>=14){
   S.finished=true;
   status('O estado conciliado já está publicado no D1, na revisão r'+v.revision+'. Nenhuma nova publicação será feita.','ok');
  }else{
   S.downloaded=false;$('approve').checked=false;
   status('BLOQUEADO: revisão/hash/posições remotas divergentes (recebida r'+v.revision+'). Não é seguro aplicar a conciliação aprovada. Será necessária nova auditoria.','error');
  }
 }catch(e){
  S.remoteUncertain=true;S.snapshot=null;S.downloaded=false;
  $('approve').checked=false;
  status('Não foi possível verificar o estado atual do D1: '+e.message+'. Nenhuma gravação será permitida.','error');
 }finally{controls();}
}
function prepareMerged(snapshot){
 if(!safeRemote(snapshot))throw Error('Revisão de origem mudou.');
 const result=copy(snapshot.layout);
 const target=shelf(result);
 target.x=544;
 // Preserve every other field from the exact checked remote state.
 if(table(result).y!==480||target.y!==368)throw Error('Posições inesperadas.');
 // Check basic hall geometry without silently changing any objects.
 const items=result.rooms.hall,dim=result.roomSizes.hall;
 if(!items.every(o=>o.x>=44&&o.y>=44&&o.x+o.w<=dim.tilesW*32-44&&o.y+o.h<=dim.tilesH*32-44))
  throw Error('Móvel fora dos limites da Recepção.');
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j];
  if(a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h)
   throw Error('Móveis sobrepostos: '+a.id+', '+b.id);
 }
 return result;
}
$('download').addEventListener('click',()=>{
 if(!S.snapshot||!safeRemote(S.snapshot)||S.publishing)return;
 const data=JSON.stringify(S.snapshot,null,2);
 const file=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(file);
 const a=document.createElement('a');a.href=url;
 a.download='BL2_D1_ANTES_DA_CONCILIACAO_E5_r13.json';
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
 S.downloaded=true;status('Backup r13 preparado para download. Confira o arquivo no computador e marque sua aprovação.','ok');controls();
});
$('approve').addEventListener('change',controls);
$('refresh').addEventListener('click',()=>void check());
$('publish').addEventListener('click',async()=>{
 if(S.publishing||!S.snapshot||!safeRemote(S.snapshot)||!S.downloaded||!S.token||!$('approve').checked){
  status('Publicação bloqueada: falta backup, login, conferência ou a revisão não é mais a esperada.','error');return;
 }
 if(!window.confirm('Confirmar publicação E5 no Cloudflare D1? A mesa do B ficará (64,480) e a estante do A ficará (544,368). Esta ação criará uma nova revisão se a r13 ainda estiver atual.'))return;
 S.publishing=true;controls();status('Conferindo o D1 novamente imediatamente antes da gravação…');
 try{
  const actual=await fetchLive();
  await validateSha(actual);
  if(!safeRemote(actual))throw Error('A revisão atual não corresponde à r13 auditada. Operação cancelada.');
  const merged=prepareMerged(actual);
  const candidateSha=await digest(JSON.stringify(merged));
  if(candidateSha!==EXPECTED_MERGED_SHA)
   throw Error('O hash da conciliação não coincide com o relatório aprovado. Operação cancelada.');
  status('Hash conciliado confirmado. Publicando com controle de revisão r13 → r14…');
  const r=await fetch(API+'/api/v1/admin/layout',{
   method:'PUT',cache:'no-store',credentials:'omit',
   headers:{'Authorization':'Bearer '+S.token,'Content-Type':'application/json'},
   body:JSON.stringify({expectedRevision:EXPECTED_REV,layout:merged})
  });
  if(r.status===409)throw Error('Conflito 409: outra janela publicou antes. A conciliação não foi aplicada; reaudite.');
  if(r.status===401||r.status===403)throw Error('Conta não autorizada ou sessão expirada; entre novamente.');
  if(!r.ok)throw Error('Servidor respondeu HTTP '+r.status+'. Confira o D1 antes de tentar de novo.');
  const ack=await r.json();
  if(ack.revision!==14||ack.sha256!==EXPECTED_MERGED_SHA)
   throw Error('Confirmação inesperada. NÃO repita o envio antes de conferir a revisão remota.');
  const confirmed=await fetchLive();await validateSha(confirmed);
  if(confirmed.revision!==14||confirmed.sha256!==EXPECTED_MERGED_SHA)
   throw Error('Gravação confirmada, mas leitura posterior divergiu; inspecione o D1.');
  S.snapshot=confirmed;S.finished=true;
  $('approve').checked=false;
  status('PUBLICADO E VALIDADO: revisão r14 contém a mesa do navegador B e a estante do navegador A. O histórico anterior foi preservado.','ok');
 }catch(e){
  S.remoteUncertain=true;
  status('Nenhuma nova tentativa automática. '+e.message,'error');
 }finally{S.publishing=false;controls();}
});
function googleLogin(){
 const s=document.createElement('script');
 s.src='https://accounts.google.com/gsi/client';s.async=true;
 s.onload=()=>{
  try{
   google.accounts.id.initialize({client_id:CLIENT,auto_select:false,callback:r=>{
    S.token=typeof r?.credential==='string'?r.credential:null;
    status(S.token?'Conta Google reconhecida. A autorização será verificada novamente pelo Worker na gravação.':'Falha no login.',S.token?'ok':'error');
    controls();
   }});
   google.accounts.id.renderButton($('google-login'),{theme:'outline',size:'large',text:'signin_with'});
  }catch(e){status('Erro no login Google: '+e.message,'error');}
 };
 s.onerror=()=>status('Não foi possível carregar o login Google.','error');
 document.head.appendChild(s);
}
googleLogin();void check();
setInterval(()=>{if(!document.hidden&&!S.publishing&&!S.finished)void check();},12000);
})();
