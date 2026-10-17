/* BL2 isolated integration bootstrap. Fetches public index.html, pins SHA, patches in memory only. */
(async()=>{
'use strict';
const root=document.getElementById('sync-boot');
const fail=e=>{root.textContent='Cópia de homologação não iniciada: '+e.message+'. A versão pública permanece intacta.';root.style.color='#ffbcb8';};
try{
 const r=await fetch('../index.html',{cache:'no-store'});
 if(!r.ok)throw Error('HTML original indisponível (HTTP '+r.status+')');
 let s=await r.text();
 const bytes=new TextEncoder().encode(s);
 const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(actual!=='0e13853af539fc097729b46a1977fe0dcfea9535aa6d8c6542f6201fa851cd94')throw Error('HTML original mudou; atualização suspensa para preservar integridade.');
 function one(old,now){
  const a=s.indexOf(old);if(a<0||s.indexOf(old,a+old.length)>=0)throw Error('Âncora de compatibilidade ausente ou duplicada: '+old.slice(0,40));
  s=s.slice(0,a)+now+s.slice(a+old.length);
 }
 const oldSave="function save(){try{localStorage.setItem(K,JSON.stringify(bundle()));dirty=false;\n    msg('Layout, dimensões e posições das portas salvos neste navegador. Exporte JSON como backup.');app.note('EDITOR_SAVE','Layout salvo');window.dispatchEvent(new CustomEvent('bl2:admin-changed',{detail:{type:'layout'}}));}\n    catch(e){msg('Armazenamento indisponível. Exporte o JSON para não perder o layout.',true);}}";
 const newSave="function save(){if(window.__BL2_D1_BRIDGE__?.saveFromEditor){void window.__BL2_D1_BRIDGE__.saveFromEditor();return;}msg('D1 indisponível. Exporte JSON de segurança.',true);}\nfunction commitConfirmed(){localStorage.setItem(K,JSON.stringify(bundle()));dirty=false;msg('Revisão Cloudflare D1 confirmada.');app.note('EDITOR_SAVE','D1 confirmado');}";
 one(oldSave,newSave);
 one('get isEditing(){return inEdit;},','commitConfirmed,get dirty(){return dirty;},get isEditing(){return inEdit;},get isBusyGesture(){return !!dragging||!!placingScene;},');
 one('Nome da estante atualizado e salvo.','Nome alterado. Aguarde confirmação no D1.');
 const a=s.indexOf('<script>\n/* Biblioteca Lúdica II — ADM-003.1');
 if(a<0)throw Error('Sincronizador legado não identificado');
 const b=s.indexOf('</script>',a);
 if(b<0)throw Error('Fechamento do script legado não identificado');
 s=s.slice(0,a)+'<!-- Sincronizador legado do Drive desativado somente nesta homologação. -->'+s.slice(b+9);
 one('<section class="admin-backup-section" aria-label="Sincronização privada do Google Drive">',
 '<section class="admin-backup-section" aria-label="Sincronização Cloudflare D1"></section>\n<section class="admin-backup-section" hidden style="display:none!important" aria-label="Sincronização privada do Google Drive">');
 const end=s.lastIndexOf('</body>');if(end<0)throw Error('HTML sem corpo final');
 const inject='<div role="note" style="position:fixed;left:0;right:0;bottom:0;z-index:2147483600;color:#f5dfbf;background:#443327;border-top:1px solid #ba9157;text-align:center;font:12px/1.4 system-ui;padding:5px;pointer-events:none">HOMOLOGAÇÃO · sincronização D1 · acervo EPUB não migrado</div><script src="./d1-sync-completo.js" defer></script>';
 s=s.slice(0,end)+inject+s.slice(end);
 document.open();document.write(s);document.close();
}catch(e){fail(e);}
})();