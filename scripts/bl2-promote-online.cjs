const fs=require('fs'),crypto=require('crypto');
const input=process.argv[2]||'index.html', output=process.argv[3];
if(!output)throw Error('usage: node scripts/bl2-promote-online.cjs <input> <output>');
let s=fs.readFileSync(input,'utf8');
const sha=crypto.createHash('sha256').update(s).digest('hex');
if(sha!=='0e13853af539fc097729b46a1977fe0dcfea9535aa6d8c6542f6201fa851cd94')throw Error('source index SHA-256 mismatch: '+sha);
function one(old,now){
 const a=s.indexOf(old);if(a<0||s.indexOf(old,a+old.length)>=0)throw Error('anchor missing/duplicate: '+old.slice(0,70));
 s=s.slice(0,a)+now+s.slice(a+old.length);
}
const oldSave="function save(){try{localStorage.setItem(K,JSON.stringify(bundle()));dirty=false;\n    msg('Layout, dimensões e posições das portas salvos neste navegador. Exporte JSON como backup.');app.note('EDITOR_SAVE','Layout salvo');window.dispatchEvent(new CustomEvent('bl2:admin-changed',{detail:{type:'layout'}}));}\n    catch(e){msg('Armazenamento indisponível. Exporte o JSON para não perder o layout.',true);}}";
const newSave="function save(){if(window.__BL2_D1_BRIDGE__?.saveFromEditor){void window.__BL2_D1_BRIDGE__.saveFromEditor();return;}msg('Cloudflare D1 indisponível. Exporte JSON de segurança.',true);}\nfunction commitConfirmed(){localStorage.setItem(K,JSON.stringify(bundle()));dirty=false;msg('Revisão Cloudflare D1 confirmada.');app.note('EDITOR_SAVE','D1 confirmado');}";
one(oldSave,newSave);
one('get isEditing(){return inEdit;},','commitConfirmed,get dirty(){return dirty;},get isEditing(){return inEdit;},get isBusyGesture(){return !!dragging||!!placingScene;},');
one('Nome da estante atualizado e salvo.','Nome alterado. Aguarde confirmação no D1.');
const a=s.indexOf('<script>\n/* Biblioteca Lúdica II — ADM-003.1');
if(a<0)throw Error('legacy Drive script not found');
const b=s.indexOf('</script>',a);if(b<0)throw Error('legacy Drive script closing tag missing');
s=s.slice(0,a)+'<!-- ADM-003 Google Drive removido: administração central agora usa Cloudflare D1/R2. -->'+s.slice(b+9);
one('<section class="admin-backup-section" aria-label="Sincronização privada do Google Drive">',
 '<section class="admin-backup-section" aria-label="Sincronização Cloudflare D1"></section>\n<section class="admin-backup-section" hidden style="display:none!important" aria-label="Sincronização privada do Google Drive">');
one('// Reaproveita capas reais já existentes nos EPUBs. Não modifica os arquivos importados.',
 "async function ensureRemoteFile(book){if(book.file instanceof Blob&&book.file.size)return book;if(!book.assetSha256||!window.__BL2_CATALOG_SYNC__?.fetchAsset)throw new Error('Arquivo EPUB ainda não disponível neste navegador.');book.file=await window.__BL2_CATALOG_SYNC__.fetchAsset(book.assetSha256,book.mediaType||'application/epub+zip');await putItem(book);return book;}\n// Reaproveita capas reais já existentes nos EPUBs. Não modifica os arquivos importados.");
one("async function coverForBook(book){\n if(coverCache.has(book.id))return coverCache.get(book.id);",
 "async function coverForBook(book){\n if((!book.file||!book.file.size)&&book.assetSha256)await ensureRemoteFile(book);\n if(coverCache.has(book.id))return coverCache.get(book.id);");
one(" if(window.BL2PremiumReader){",
 " try{await ensureRemoteFile(b);}catch(error){report('EPUB online não abriu: '+error.message,true);return false;}\n if(window.BL2PremiumReader){");
const end=s.lastIndexOf('</body>');if(end<0)throw Error('body closing tag missing');
const inject='<script src="./online/d1-sync.js" defer></script><script src="./online/catalog-sync.js" defer></script>';
s=s.slice(0,end)+inject+s.slice(end);
if(s.includes('ADM-003.1 v0.5.19.2 experimental'))throw Error('legacy Drive code remains');
for(const needle of ['./online/d1-sync.js','./online/catalog-sync.js','async function ensureRemoteFile(book)','function commitConfirmed()'])if(!s.includes(needle))throw Error('missing final integration: '+needle);
fs.writeFileSync(output,s);
console.log('PROMOTION_BUILD_OK source_sha256='+sha+' target_sha256='+crypto.createHash('sha256').update(s).digest('hex')+' bytes='+Buffer.byteLength(s));
