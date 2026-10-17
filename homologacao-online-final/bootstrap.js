/* BL2 final-online isolated bootstrap: patches pinned public HTML in memory only. */
(async()=>{'use strict';
const root=document.getElementById('sync-boot');
const fail=e=>{root.textContent='Homologação online não iniciada: '+e.message+'. A versão pública permanece intacta.';root.style.color='#ffbcb8';};
try{
 const r=await fetch('../index.html',{cache:'no-store'});if(!r.ok)throw Error('HTML original indisponível (HTTP '+r.status+')');
 let s=await r.text(),bytes=new TextEncoder().encode(s);
 const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(actual!=='0e13853af539fc097729b46a1977fe0dcfea9535aa6d8c6542f6201fa851cd94')throw Error('HTML original mudou; integração suspensa para preservar integridade.');
 function one(old,now){const a=s.indexOf(old);if(a<0||s.indexOf(old,a+old.length)>=0)throw Error('Âncora ausente ou duplicada: '+old.slice(0,55));s=s.slice(0,a)+now+s.slice(a+old.length);}
 const oldSave="function save(){try{localStorage.setItem(K,JSON.stringify(bundle()));dirty=false;\n    msg('Layout, dimensões e posições das portas salvos neste navegador. Exporte JSON como backup.');app.note('EDITOR_SAVE','Layout salvo');window.dispatchEvent(new CustomEvent('bl2:admin-changed',{detail:{type:'layout'}}));}\n    catch(e){msg('Armazenamento indisponível. Exporte o JSON para não perder o layout.',true);}}";
 const newSave="function save(){if(window.__BL2_D1_BRIDGE__?.saveFromEditor){void window.__BL2_D1_BRIDGE__.saveFromEditor();return;}msg('D1 indisponível. Exporte JSON de segurança.',true);}\nfunction commitConfirmed(){localStorage.setItem(K,JSON.stringify(bundle()));dirty=false;msg('Revisão Cloudflare D1 confirmada.');app.note('EDITOR_SAVE','D1 confirmado');}";
 one(oldSave,newSave);
 one('get isEditing(){return inEdit;},','commitConfirmed,get dirty(){return dirty;},get isEditing(){return inEdit;},get isBusyGesture(){return !!dragging||!!placingScene;},');
 one('Nome da estante atualizado e salvo.','Nome alterado. Aguarde confirmação no D1.');
 const a=s.indexOf('<script>\n/* Biblioteca Lúdica II — ADM-003.1');if(a<0)throw Error('Sincronizador Drive legado não identificado');
 const b=s.indexOf('</script>',a);if(b<0)throw Error('Fechamento Drive não identificado');
 s=s.slice(0,a)+'<!-- Google Drive ADM-003 desativado nesta candidata Cloudflare. -->'+s.slice(b+9);
 one('<section class="admin-backup-section" aria-label="Sincronização privada do Google Drive">',
 '<section class="admin-backup-section" aria-label="Sincronização Cloudflare D1"></section>\n<section class="admin-backup-section" hidden style="display:none!important" aria-label="Sincronização privada do Google Drive">');
 one('// Reaproveita capas reais já existentes nos EPUBs. Não modifica os arquivos importados.',
 "async function ensureRemoteFile(book){if(book.file instanceof Blob&&book.file.size)return book;if(!book.assetSha256||!window.__BL2_CATALOG_SYNC__?.fetchAsset)throw new Error('Arquivo EPUB ainda não disponível neste navegador.');book.file=await window.__BL2_CATALOG_SYNC__.fetchAsset(book.assetSha256,book.mediaType||'application/epub+zip');await putItem(book);return book;}\n// Reaproveita capas reais já existentes nos EPUBs. Não modifica os arquivos importados.");
 one("async function coverForBook(book){\n if(coverCache.has(book.id))return coverCache.get(book.id);",
 "async function coverForBook(book){\n if((!book.file||!book.file.size)&&book.assetSha256)await ensureRemoteFile(book);\n if(coverCache.has(book.id))return coverCache.get(book.id);");
 one(" if(window.BL2PremiumReader){",
 " try{await ensureRemoteFile(b);}catch(error){report('EPUB online não abriu: '+error.message,true);return false;}\n if(window.BL2PremiumReader){");
 const end=s.lastIndexOf('</body>');if(end<0)throw Error('HTML sem corpo final');
 const inject='<div role="note" style="position:fixed;left:0;right:0;bottom:0;z-index:2147483600;color:#f5dfbf;background:#443327;border-top:1px solid #ba9157;text-align:center;font:12px/1.4 system-ui;padding:5px;pointer-events:none">HOMOLOGAÇÃO ONLINE · D1 + R2 · biblioteca pública intacta</div><script src="./d1-sync.js" defer><\/script><script src="./catalog-sync.js" defer><\/script>';
 s=s.slice(0,end)+inject+s.slice(end);document.open();document.write(s);document.close();
}catch(e){fail(e);}
})();