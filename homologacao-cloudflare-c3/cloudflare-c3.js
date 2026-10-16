/* Biblioteca Lúdica II — C3 experimental. D1 central, login Google, uma estante.
 * Nenhum token é armazenado no localStorage, enviado ao Github ou mostrado na tela.
 * Nenhuma outra planta, livro, sala ou estante é alterada no servidor.
 */
(()=>{
 'use strict';
 const API='https://bl2-c3-admin-verificacao.chatgptset26.workers.dev';
 const CLIENT_ID='605685743440-8hcd7v8jfmcg0j5oso5lrfh30uvnhnm9.apps.googleusercontent.com';
 const SHELF_ID='a-shelf-1';
 const key='c3-admin-visual';
 if(document.getElementById(key))return;
 let official=null, lastRevision=null, googleToken=null, googleSub=null, permitted=false, loading=false;
 const el=id=>document.getElementById('c3-'+id);
 const panel=document.createElement('section');
 panel.id=key;
 panel.setAttribute('aria-label','Biblioteca Lúdica — administração Cloudflare C3');
 panel.style.cssText='position:fixed;z-index:2147483612;right:12px;top:12px;width:min(335px,calc(100vw - 24px));background:#171e22f5;color:#f2e2c7;border:2px solid #d4ad69;border-radius:9px;padding:13px;box-shadow:0 8px 30px #0009;font:13px/1.45 system-ui,sans-serif';
 panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><strong style="color:#f4c986">C3 · Estante central no D1</strong><button id="c3-toggle" aria-label="Recolher" type="button" style="color:white;background:#343b41;border:1px solid #a69378;border-radius:4px;cursor:pointer">−</button></div><div id="c3-body"><div style="font-size:11px;color:#b6b0a7;margin:8px 0">HOMOLOGAÇÃO ISOLADA · UMA ESTANTE DE TESTE</div><div id="c3-name" style="font-weight:bold;margin:5px 0;overflow-wrap:anywhere">Consultando D1…</div><div>Revisão oficial: <b id="c3-version">—</b></div><div>Estante física: <span id="c3-physical">Procurando…</span></div><div id="c3-status" role="status" aria-live="polite" style="margin:9px 0;color:#eac991">Aguardando consulta.</div><button id="c3-refresh" type="button" style="padding:6px;background:#50402c;color:#fff;border:1px solid #cba968;border-radius:5px;cursor:pointer">Conferir agora</button><hr style="border:0;border-top:1px solid #6a5540;margin:12px 0"><strong>Administração protegida</strong><div id="c3-google-login" style="margin:8px 0"></div><div id="c3-login-status" style="font-size:12px;color:#c4bcb0">Faça login com a conta Google do administrador.</div><button id="c3-copy-sub" type="button" hidden style="margin-top:7px;padding:5px;color:#fff;background:#43372e;border:1px solid #caad81;border-radius:5px;cursor:pointer">Copiar identificador Google</button><div style="font-size:11px;color:#c3b19c;margin-top:8px">Selecione a Estante Frontal no editor. O botão “Salvar nome” nesta cópia enviará somente o nome ao D1, após autorização.</div><div style="font-size:11px;color:#a9a7a2;margin-top:8px">Atualização automática a cada 12 s. Autenticação restrita ao administrador indicado no Worker.</div></div>';
 document.body.appendChild(panel);
 const announce=(msg,ok=true)=>{el('status').textContent=msg;el('status').style.color=ok?'#bce3ac':'#eda8a0';};
 const loginMsg=(msg,ok=false)=>{el('login-status').textContent=msg;el('login-status').style.color=ok?'#bce3ac':'#e7bc9c';};
 const editor=()=>window.__BL2_EDITOR__;
 const shelfObj=()=>window.__BL2_EDITOR_CORE__?.ROOMS?.archive?.objects?.find(o=>o.id===SHELF_ID&&o.kind==='shelf');
 const selected=()=>editor()?.isEditing&&editor()?.selected===SHELF_ID;
 function applyToPhysical(s){
   const o=shelfObj();
   if(!o){el('physical').textContent='Estante frontal não encontrada';return;}
   el('physical').textContent=o.id;
   if(selected())return; // não apagar o nome que o administrador estiver digitando
   if(o.shelfName!==s.title)o.shelfName=s.title;
 }
 async function fetchState(force=false){
   if(loading||(document.hidden&&!force))return;
   loading=true;
   const controller=new AbortController();
   const limit=setTimeout(()=>controller.abort(),9000);
   try{
     const res=await fetch(API+'/api/shelf',{method:'GET',credentials:'omit',cache:'no-store',signal:controller.signal});
     if(!res.ok)throw Error('HTTP '+res.status);
     const s=(await res.json())?.shelf;
     if(s?.id!=='c1-estante'||typeof s.title!=='string'||!Number.isSafeInteger(s.version)||s.version<1)throw Error('Resposta inesperada');
     official={title:s.title,version:s.version};
     el('name').textContent=s.title;
     el('version').textContent=String(s.version);
     applyToPhysical(s);
     announce(lastRevision!==null&&lastRevision!==s.version?
       'Nova revisão recebida automaticamente.':
       'Conectado ao D1 · consulta automática ativa.');
     lastRevision=s.version;
   }catch(err){announce(err.name==='AbortError'?'Tempo limite na consulta.':'Falha: '+String(err.message||'rede'),false);}
   finally{clearTimeout(limit);loading=false;}
 }
 function jwtClaims(token){
   try{
     const p=token.split('.')[1];
     const s=atob(p.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-p.length%4)%4));
     return JSON.parse(s);
   }catch{return null;}
 }
 async function onGoogleCredential(msg){
   googleToken=typeof msg?.credential==='string'?msg.credential:null;
   googleSub=googleToken?jwtClaims(googleToken)?.sub:null;
   permitted=false;
   el('copy-sub').hidden=true;
   if(!googleToken){loginMsg('Não foi possível obter a identidade Google.');return;}
   loginMsg('Verificando permissão no servidor…');
   try{
     const res=await fetch(API+'/api/session',{
       method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
       headers:{'Authorization':'Bearer '+googleToken}
     });
     if(res.status===200){
       const body=await res.json();
       if(body.admin!==true)throw Error('resposta de autorização inválida');
       permitted=true;
       loginMsg('Administrador autorizado pelo Worker. Pode salvar a estante frontal no D1.',true);
     }else if(res.status===403){
       loginMsg('Conta autenticada, mas ainda não cadastrada como administradora. Cadastre o identificador no segredo GitHub C3_ADMIN_GOOGLE_SUB.');
       if(/^[0-9]{12,40}$/.test(googleSub||''))el('copy-sub').hidden=false;
     }else{
       googleToken=null;
       loginMsg('Login não validado; código '+res.status+'. Tente entrar novamente.');
     }
   }catch(_){googleToken=null;loginMsg('Não foi possível consultar a autorização no Cloudflare.');}
 }
 async function loadGoogleButton(){
   const script=document.createElement('script');
   script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
   script.onload=()=>{
     if(!window.google?.accounts?.id){loginMsg('Google Identity indisponível.');return;}
     try{
       window.google.accounts.id.initialize({client_id:CLIENT_ID,callback:onGoogleCredential,auto_select:false});
       window.google.accounts.id.renderButton(el('google-login'),{theme:'outline',size:'medium',text:'signin_with',shape:'rectangular'});
     }catch(_){loginMsg('Não foi possível iniciar o login Google.');}
   };
   script.onerror=()=>loginMsg('Não foi possível carregar o botão de login Google.');
   document.head.appendChild(script);
 }
 async function saveSelectedToD1(){
   if(!selected()){announce('No editor, selecione a Estante Frontal de teste antes de salvar.',false);return;}
   if(!permitted||!googleToken){announce('Acesso administrativo não autorizado. Entre com Google primeiro.',false);return;}
   if(!official){announce('Revisão central não disponível; confira a conexão.',false);return;}
   const input=document.getElementById('editor-shelf-name');
   const name=(input?.value||'').trim().replace(/\s+/g,' ');
   if(!name||name.length>80){announce('O nome deve ter entre 1 e 80 caracteres.',false);return;}
   const before=official.version;
   announce('Salvando no D1…');
   try{
     const res=await fetch(API+'/api/admin/shelf',{
       method:'PATCH',mode:'cors',credentials:'omit',cache:'no-store',
       headers:{'Authorization':'Bearer '+googleToken,'Content-Type':'application/json'},
       body:JSON.stringify({title:name,expectedVersion:before})
     });
     if(res.status===409){
       await fetchState(true);
       announce('Conflito: outra revisão já foi publicada. O nome digitado foi preservado; confira e tente novamente.',false);
       return;
     }
     if(res.status===401||res.status===403){
       permitted=false;loginMsg('Sessão expirada ou não autorizada; entre com Google novamente.');
       announce('Gravação recusada pela autenticação.',false);return;
     }
     if(!res.ok)throw Error('HTTP '+res.status);
     const s=(await res.json())?.shelf;
     if(s?.id!=='c1-estante'||s.title!==name||s.version!==before+1)throw Error('Resposta não confirmou a revisão');
     official={title:s.title,version:s.version};lastRevision=s.version;
     el('name').textContent=s.title;el('version').textContent=String(s.version);
     const obj=shelfObj();if(obj)obj.shelfName=s.title;
     if(input)input.value=s.title;
     announce('Salvo no D1. Outro navegador receberá a revisão automaticamente.');
   }catch(err){announce('Falha ao salvar: '+String(err.message||'rede'),false);}
 }
 function interceptNameSave(){
   const button=document.getElementById('editor-shelf-save-name');
   if(!button)return;
   button.title='C3: salva nome apenas da Estante Frontal no Cloudflare D1';
   // Em homologação, esse mesmo botão usa o D1; impede o salvamento local antigo.
   button.addEventListener('click',event=>{
     event.preventDefault();event.stopImmediatePropagation();
     void saveSelectedToD1();
   },true);
   const note=document.createElement('small');
   note.style.cssText='display:block;color:#d8b97d;margin:4px 0';
   note.textContent='C3: este botão salva o nome da estante frontal no Cloudflare D1; demais opções ainda são locais.';
   button.insertAdjacentElement('afterend',note);
 }
 function disableDriveInPreview(){
   const ids=['adm002-connect','adm002-restore','adm002-save','adm002-overwrite','adm003-reconcile','adm002-auto'];
   for(const id of ids){const node=document.getElementById(id);if(node){node.disabled=true;node.title='Google Drive desativado somente nesta homologação C3';}}
   const client=document.getElementById('adm002-client-id');
   if(client){client.value='';client.disabled=true;client.placeholder='Drive desativado na homologação C3';}
 }
 function start(){
   disableDriveInPreview();
   interceptNameSave();
   el('toggle').addEventListener('click',()=>{el('body').hidden=!el('body').hidden;el('toggle').textContent=el('body').hidden?'+':'−';});
   el('refresh').addEventListener('click',()=>void fetchState(true));
   el('copy-sub').addEventListener('click',async()=>{
     if(!googleSub)return;
     try{await navigator.clipboard.writeText(googleSub);loginMsg('Identificador copiado. Cole como VALOR do segredo C3_ADMIN_GOOGLE_SUB no GitHub. Não o envie na conversa.');}
     catch(_){loginMsg('Não foi possível copiar. Autorize a área de transferência no navegador.');}
   });
   void loadGoogleButton();
   void fetchState(true);
   const polling=setInterval(()=>void fetchState(false),12000);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)void fetchState(true);});
   window.addEventListener('pagehide',()=>clearInterval(polling));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
