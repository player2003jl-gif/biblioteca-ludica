/* Biblioteca Lúdica II — homologacao isolada D1 do editor grafico. Sem Drive, EPUBs ou dados de visitantes. */
(()=>{'use strict';
const API='https://bl2-layout-homologacao-a-b-20261016.chatgptset26.workers.dev';
const CLIENT='605685743440-8hcd7v8jfmcg0j5oso5lrfh30uvnhnm9.apps.googleusercontent.com';
const $=id=>document.getElementById(id), editor=window.__BL2_EDITOR__;
if(!editor?.applyLayout||!editor?.bundle||!editor?.commitConfirmed){document.getElementById('bl2-d1-status').textContent='Editor incompatível: nenhuma alteração aplicada.';return;}
const S={remote:null,active:false,revision:null,baseline:null,backup:false,token:null,busy:false,fetching:false,conflict:false,correction:null};
const controls={backup:$('bl2-d1-backup'),activate:$('bl2-d1-activate'),repair:$('bl2-d1-repair'),save:$('bl2-d1-save')};
const clone=x=>JSON.parse(JSON.stringify(x)),json=x=>JSON.stringify(x);
const dirty=()=>!!editor.dirty||(S.active&&json(editor.bundle())!==S.baseline);
function message(t,err=false){const el=$('bl2-d1-status');el.textContent=t;el.style.color=err?'#ffbdb1':'#e4ceaa';}
function controlsUpdate(){
 controls.backup.disabled=!S.remote||S.busy;
 controls.activate.disabled=!S.remote||!S.backup||S.active||S.busy||!!S.correction;
 controls.repair.disabled=!S.remote||!S.backup||S.active||S.busy||!S.correction;
 controls.save.disabled=!S.active||!S.token||S.busy||!dirty()||S.conflict;
 $('bl2-d1-revision').textContent=S.remote?'r'+S.remote.revision:'—';
 $('bl2-d1-mode').textContent=S.active?'Editor conectado ao D1':'Sem aplicação de estado remoto';
}
function shape(d){
 if(!d||d.version!==7||d.architecture!=='reception-library-virtual-reading'||
 !Array.isArray(d.rooms?.hall)||!Array.isArray(d.rooms?.archive)||!d.roomSizes?.hall||
 !Array.isArray(d.doors?.hall)||!Array.isArray(d.doors?.archive)||
 !d.rooms.hall.some(x=>x.id==='user-mv9ym902-2'))throw Error('Formato de layout incompatível');
}
function correction(layout){
 try{
 shape(layout);const invalid=[];
 for(const room of ['hall','archive']){
  const size=layout.roomSizes[room];
  for(const o of layout.rooms[room])if(o.x<44||o.y<44||o.x+o.w>size.tilesW*32-44||o.y+o.h>size.tilesH*32-44)
    invalid.push({room,o,size});
 }
 if(!invalid.length)return null;
 if(invalid.length!==1||invalid[0].room!=='hall'||invalid[0].o.id!=='user-mv9ym902-2')return null;
 const {o,size}=invalid[0],next=clone(layout),item=next.rooms.hall.find(x=>x.id===o.id);
 item.x=Math.min(Math.max(44,o.x),size.tilesW*32-44-o.w);
 item.y=Math.min(Math.max(44,o.y),size.tilesH*32-44-o.h);
 return {layout:next,from:{x:o.x,y:o.y},to:{x:item.x,y:item.y}};
 }catch{return null;}
}
async function load(force=false){
 if(S.busy||S.fetching||(document.hidden&&!force))return;
 S.fetching=true;
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
  let res;try{res=await fetch(API+'/api/v1/layout',{cache:'no-store',credentials:'omit',signal:ctrl.signal});}finally{clearTimeout(timer);}
  if(!res.ok)throw Error('HTTP '+res.status);
  const d=await res.json();
  if(!Number.isSafeInteger(d.revision)||d.revision<1||!/^[0-9a-f]{64}$/.test(d.sha256))throw Error('Resposta D1 invalida');
  shape(d.layout);const changed=!S.remote||S.remote.revision!==d.revision;
  S.remote=d;S.correction=correction(d.layout);
  // A revisao pode ter sido consultada sem ser aplicada durante um gesto de edicao.
  // So marcar sincronizado quando o layout realmente chegou ao editor.
  const needsApply=S.active&&S.revision!==d.revision;
  if(!changed&&!needsApply){if(force)message('D1 confirmou revisão '+d.revision);return;}
  if(!S.active){
   const c=S.correction;
   message('Revisão r'+d.revision+' consultada, mas ainda não aplicada. '+(c?
    'Estante fora da área permitida ('+c.from.x+','+c.from.y+'). Proposta: ('+c.to.x+','+c.to.y+'). Nada será alterado sem aprovação.':
    'Baixe primeiro um JSON local de segurança.'),!!c);return;
  }
  if(S.conflict||dirty()){
   S.conflict=true;message('Revisão nova detectada. Edição local não substituída. Exporte JSON, encerre a edição e reconcilie.',true);return;
  }
  if(editor.isBusyGesture){
   message('Revisão r'+d.revision+' recebida durante arraste ou posicionamento. Aplicação adiada sem conflito; tentarei novamente.');
   return;
  }
  if(S.correction){
   S.conflict=true;message('Revisão remota inválida para colisões do editor: não aplicada.',true);return;
  }
  try{
    editor.applyLayout(d.layout);S.revision=d.revision;S.baseline=json(editor.bundle());
    message('Revisão r'+d.revision+' aplicada automaticamente no editor gráfico.');
  }catch(e){S.conflict=true;message('Recepção bloqueada: '+e.message,true);}
 }catch(e){message('Consulta D1 falhou: '+e.message+'. Planta local preservada.',true);}
 finally{S.fetching=false;controlsUpdate();}
}
function activate(adjust=false){
 if(!S.remote||!S.backup||S.active||S.busy)return;
 if(S.correction&&!adjust){message('O layout exige ajuste explícito de posição.',true);return;}
 if(adjust&&!S.correction)return;
 try{
  editor.applyLayout(adjust?S.correction.layout:S.remote.layout);
  S.active=true;S.conflict=false;S.revision=S.remote.revision;
  S.baseline=adjust?json(S.remote.layout):json(editor.bundle());
  const c=S.correction;
  message(adjust?'Ajuste local aplicado: ('+c.from.x+','+c.from.y+') → ('+c.to.x+','+c.to.y+'). NÃO publicado. Faça login e salve no D1.':
    'Editor carregado da revisão r'+S.revision+'. Nada foi publicado.');
 }catch(e){message('Editor recusou layout remoto: '+e.message+'. Layout anterior preservado.',true);}
 controlsUpdate();
}
async function save(){
 if(S.busy)return false;
 if(!S.active){message('Ative a cópia D1 depois de exportar JSON de segurança.',true);return false;}
 if(!S.token){message('Entre com Google para publicar. O JSON ainda pode ser exportado.',true);return false;}
 if(S.conflict||!S.remote||S.remote.revision!==S.revision){
  message('Conflito detectado; exporte JSON antes de escolher uma revisão.',true);return false;
 }
 if(!dirty()){message('Sem alterações para publicar.');return false;}
 const layout=editor.bundle();try{shape(layout);}catch(e){message(e.message,true);return false;}
 S.busy=true;controlsUpdate();message('Gravando revisão autenticada no Cloudflare D1…');
 try{
  const res=await fetch(API+'/api/v1/admin/layout',{
    method:'PUT',cache:'no-store',credentials:'omit',
    headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/json'},
    body:JSON.stringify({expectedRevision:S.revision,layout})
  });
  if(res.status===409){S.conflict=true;message('Conflito 409: outra janela já publicou. Edição local preservada; exporte JSON.',true);return false;}
  if(res.status===401||res.status===403){S.token=null;message('Login expirado ou não autorizado. Entre novamente com Google.',true);return false;}
  if(!res.ok)throw Error('HTTP '+res.status);
  const out=await res.json();
  if(out.revision!==S.revision+1||!/^[0-9a-f]{64}$/.test(out.sha256))
    throw Error('Gravação não confirmada; não reenvie antes de conferir a revisão');
  editor.commitConfirmed();
  S.remote={revision:out.revision,sha256:out.sha256,layout};
  S.revision=out.revision;S.baseline=json(editor.bundle());S.correction=null;S.conflict=false;
  message('D1 confirmou revisão r'+out.revision+'. Outro navegador receberá automaticamente.');return true;
 }catch(e){message('Não confirmada a gravação: '+e.message+'. Exporte seu JSON.',true);return false;}
 finally{S.busy=false;controlsUpdate();}
}
controls.backup.addEventListener('click',()=>{
 try{
  const blob=new Blob([JSON.stringify(editor.bundle(),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='BL2_LAYOUT_LOCAL_ANTES_D1_'+Date.now()+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000);
  S.backup=true;message('JSON local exportado. Escolha ativar o layout D1 ou confirmar a proposta de ajuste.');
 }catch(e){message('Exportação falhou: '+e.message,true);}controlsUpdate();
});
controls.activate.addEventListener('click',()=>activate(false));
controls.repair.addEventListener('click',()=>activate(true));
controls.save.addEventListener('click',()=>void save());
$('bl2-d1-refresh').addEventListener('click',()=>void load(true));
$('bl2-d1-reconcile').addEventListener('click',()=>{
 if(!S.active||!S.remote)return;
 if(dirty()||editor.isEditing){message('Exporte JSON e encerre edição antes de atualizar a revisão.',true);return;}
 S.active=false;S.conflict=false;S.backup=false;S.revision=null;
 message('Desconectado: atualize, faça backup e escolha nova revisão.');void load(true);controlsUpdate();
});
window.__BL2_D1_BRIDGE__={saveFromEditor:save,get status(){return {active:S.active,revision:S.revision,remoteRevision:S.remote?.revision,conflict:S.conflict};}};
$('admin-backup-import').disabled=true;
$('admin-backup-import').title='Restaurar ZIP desabilitado nesta homologação; exporte backup e use cópia pública para restauração.';
document.querySelector('[aria-label="Sincronização privada do Google Drive"]')?.setAttribute('hidden','');
function startGoogle(){
 const go=()=>{
  if(!window.google?.accounts?.id){message('Google Identity indisponível. D1 permanece somente leitura.',true);return;}
  window.google.accounts.id.initialize({client_id:CLIENT,auto_select:false,callback:r=>{
    S.token=typeof r?.credential==='string'?r.credential:null;
    message(S.token?'Login Google recebido. Autorização será verificada pelo Worker ao salvar.':'Login não concluído.',!S.token);controlsUpdate();
  }});
  window.google.accounts.id.renderButton($('bl2-d1-google'),{theme:'outline',size:'medium',text:'signin_with'});
 };
 if(window.google?.accounts?.id)go();
 else{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=go;s.onerror=()=>message('Google indisponível.',true);document.head.appendChild(s);}
}
startGoogle();void load(true);controlsUpdate();
const timer=setInterval(()=>{if(!document.hidden)void load();},12000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load(true);});
window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();