/* Biblioteca Lúdica II: isolated A/B D1 homologation only. No editor/Drive/EPUB access. */
(()=>{'use strict';
const API='https://bl2-layout-homologacao-a-b-20261016.chatgptset26.workers.dev';
const CLIENT='605685743440-8hcd7v8jfmcg0j5oso5lrfh30uvnhnm9.apps.googleusercontent.com';
const ID='user-mv9ym902-2', SIZE=768, POLL=12000;
const $=id=>document.getElementById(id);
let latest=null,token=null,draftFrom=null,dirty=false,busy=false,dragging=null;
function tell(s,kind=''){
 const p=$('status');p.textContent=s;p.className='status'+(kind?' '+kind:'');
}
function shelf(data){return data?.rooms?.hall?.find(x=>x.id===ID&&x.kind==='shelf');}
function currentShelf(){return shelf(latest?.layout);}
function enabled(){
 const logged=!!token;
 for(const id of ['name','x','y'])$(id).disabled=!logged||!latest;
 $('save').disabled=!logged||!dirty||busy||!latest;
 $('discard').disabled=!dirty||busy;
}
const number=(value,min,max)=>Math.max(min,Math.min(max,Math.round(Number(value)||0)));
function draw(){
 const floor=$('floor');floor.querySelectorAll('.object').forEach(e=>e.remove());
 if(!latest?.layout)return;
 for(const object of latest.layout.rooms.hall){
  if(!object?.kind||!['shelf','table','counter'].includes(object.kind))continue;
  const active=object.id===ID;
  const x=active?number($('x').value,0,SIZE-object.w):object.x;
  const y=active?number($('y').value,0,SIZE-object.h):object.y;
  const e=document.createElement('div');
  e.className='object '+object.kind;
  e.textContent=active?($('name').value||object.shelfName||'Estante'):object.kind==='counter'?'Balcão':'Mesa';
  e.style.left=(x/SIZE*100)+'%';e.style.top=(y/SIZE*100)+'%';
  e.style.width=(object.w/SIZE*100)+'%';e.style.height=(object.h/SIZE*100)+'%';
  e.title=active?'Arraste a estante para mudar de posição':object.kind;
  if(active&&token)e.addEventListener('pointerdown',startDrag);
  floor.appendChild(e);
 }
}
function refreshForm(){
 const s=currentShelf();
 if(!s)throw Error('Estante personalizada não encontrada na revisão publicada.');
 $('name').value=s.shelfName||'';
 $('x').value=s.x;$('y').value=s.y;
 $('revision').textContent='r'+latest.revision;
 $('connection').textContent='Conectado';
 draftFrom=latest.revision;dirty=false;enabled();draw();
}
async function read(force=false){
 if(busy&&!force)return;
 try{
  const res=await fetch(API+'/api/v1/layout',{cache:'no-store',credentials:'omit'});
  if(!res.ok)throw Error('HTTP '+res.status);
  const body=await res.json();
  if(!Number.isSafeInteger(body.revision)||!body.layout||!shelf(body.layout)||!/^[a-f0-9]{64}$/.test(body.sha256))
   throw Error('Resposta incompleta do banco.');
  if(latest&&latest.revision===body.revision){if(!dirty&&force)tell('D1 sincronizado · revisão '+body.revision,'success');return;}
  latest=body;
  $('revision').textContent='r'+body.revision;$('connection').textContent='Conectado';
  if(dirty){
   tell('Chegou uma nova revisão do D1 durante sua edição. Descarte a edição local para recebê-la; nada foi substituído.','error');
  }else{
   refreshForm();
   tell('Revisão '+body.revision+' recebida do D1 automaticamente.','success');
  }
 }catch(e){
  $('connection').textContent='Indisponível';
  tell('Não foi possível consultar o D1: '+e.message,'error');
 }
}
function markDraft(){
 if(!latest)return;
 const s=currentShelf();
 dirty=($('name').value!==s.shelfName||Number($('x').value)!==s.x||Number($('y').value)!==s.y);
 enabled();draw();
 if(dirty)tell('Alteração local ainda não publicada. Clique em “Salvar no D1” após conferir.','');
}
function startDrag(e){
 if(!token||busy||!latest||e.button!==0)return;
 e.preventDefault();
 const r=e.currentTarget.getBoundingClientRect();
 dragging={offsetX:e.clientX-r.left,offsetY:e.clientY-r.top};
 window.addEventListener('pointermove',moveDrag);
 window.addEventListener('pointerup',endDrag,{once:true});
 window.addEventListener('pointercancel',endDrag,{once:true});
}
function moveDrag(e){
 if(!dragging||!latest)return;
 const rect=$('floor').getBoundingClientRect();
 const s=currentShelf();if(!s)return;
 const x=(e.clientX-rect.left-dragging.offsetX)*SIZE/rect.width;
 const y=(e.clientY-rect.top-dragging.offsetY)*SIZE/rect.height;
 $('x').value=number(x,0,SIZE-s.w);
 $('y').value=number(y,0,SIZE-s.h);
 markDraft();
}
function endDrag(){
 dragging=null;window.removeEventListener('pointermove',moveDrag);
}
async function write(){
 if(busy||!latest||!token){tell('Entre com a conta Google autorizada para publicar.','error');return;}
 if(!dirty){tell('Não há modificações pendentes.');return;}
 if(latest.revision!==draftFrom){tell('Conflito: chegou outra revisão. Descarte as alterações antes de editar novamente.','error');return;}
 const s=currentShelf();const name=$('name').value.trim().replace(/\s+/g,' ');
 const x=Number($('x').value),y=Number($('y').value);
 if(!name||name.length>80||!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||
    x<0||y<0||x>SIZE-s.w||y>SIZE-s.h){tell('Nome ou coordenadas inválidos.','error');return;}
 busy=true;enabled();tell('Enviando revisão autenticada ao D1…');
 try{
  const layout=JSON.parse(JSON.stringify(latest.layout));
  const copy=shelf(layout);copy.shelfName=name;copy.x=x;copy.y=y;
  const res=await fetch(API+'/api/v1/admin/layout',{
   method:'PUT',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify({expectedRevision:draftFrom,layout})
  });
  if(res.status===409){tell('Conflito de revisão 409: outro navegador publicou antes. Descarte a edição e carregue o estado atual.','error');return;}
  if(res.status===401||res.status===403){token=null;enabled();tell('Conta não autorizada ou sessão expirada. Entre novamente com Google.','error');return;}
  if(!res.ok)throw Error('HTTP '+res.status);
  const result=await res.json();
  if(result.revision!==draftFrom+1||!/^[a-f0-9]{64}$/.test(result.sha256))throw Error('confirmação incompleta');
  latest={revision:result.revision,sha256:result.sha256,layout};
  refreshForm();tell('Alteração gravada no D1 · revisão '+result.revision+'. Aguarde até 12 segundos no navegador B.','success');
 }catch(e){tell('Falha no envio: '+e.message+'. A revisão antiga não foi substituída localmente.','error');}
 finally{busy=false;enabled();}
}
function initLogin(){
 const script=document.createElement('script');
 script.src='https://accounts.google.com/gsi/client';
 script.async=true;script.defer=true;
 script.onload=()=>{
  try{
   if(!window.google?.accounts?.id)throw Error('Google Identity indisponível');
   google.accounts.id.initialize({client_id:CLIENT,auto_select:false,callback:resp=>{
    token=typeof resp?.credential==='string'?resp.credential:null;
    enabled();
    tell(token?'Conta Google reconhecida. A autorização será validada pelo Worker ao salvar.':'Login Google não concluído.',token?'':'error');
    draw();
   }});
   google.accounts.id.renderButton($('google-login'),{theme:'outline',size:'medium',text:'signin_with',shape:'rectangular'});
  }catch(e){tell('Não foi possível iniciar autenticação Google: '+e.message,'error');}
 };
 script.onerror=()=>tell('Não foi possível carregar o login Google.','error');
 document.head.appendChild(script);
}
$('name').addEventListener('input',markDraft);
for(const id of ['x','y'])$(id).addEventListener('input',markDraft);
$('save').addEventListener('click',()=>void write());
$('discard').addEventListener('click',()=>{
 if(!latest)return;
 refreshForm();
 tell('Edição descartada. Mostrando a revisão '+latest.revision+' do D1.','success');
});
$('refresh').addEventListener('click',()=>void read(true));
initLogin();void read(true);
const timer=setInterval(()=>{if(!document.hidden&&!busy)void read();},POLL);
window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();