/* C2 · Integração visual experimental da Biblioteca Lúdica II com D1.
   SOMENTE LEITURA. Não pede nem grava tokens; não modifica a planta,
   os livros, os empréstimos, as notas ou as cópias administrativas. */
(() => {
  'use strict';
  const ROOT = 'https://bl2-c2-estante-verificacao.chatgptset26.workers.dev/api/shelf';
  if (document.getElementById('c2-d1-observer')) return;
  let current = null, last = null, linkedId = null, activeShelf = null, inFlight = false;
  const panel = document.createElement('section');
  panel.id = 'c2-d1-observer';
  panel.setAttribute('aria-label', 'Cloudflare D1 — estante conectada de demonstração');
  panel.style.cssText = 'position:fixed;z-index:2147483610;right:12px;top:12px;width:min(295px,calc(100vw - 24px));background:#171d22f2;color:#eee2cd;border:2px solid #d3ac65;border-radius:9px;box-shadow:0 8px 30px #0009;padding:13px;font:13px/1.5 system-ui,sans-serif;';
  panel.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px"><strong style="color:#f2c882">C2 · Estante no D1</strong><button id="c2-toggle" type="button" aria-label="Recolher" style="background:#373d40;color:#fff;border:1px solid #a88d60;border-radius:4px">−</button></div><div id="c2-body"><div style="font-size:11px;color:#b8b0a4;margin:8px 0">CÓPIA ISOLADA · SOMENTE LEITURA</div><div id="c2-title" style="font-weight:bold;overflow-wrap:anywhere">Conectando ao servidor…</div><div>Revisão oficial: <strong id="c2-version">—</strong></div><div>Estante física: <span id="c2-linked">Procurando…</span></div><div id="c2-status" role="status" aria-live="polite" style="margin:8px 0;color:#f0cf97">Aguardando consulta.</div><button id="c2-refresh" type="button" style="padding:6px 8px;background:#503923;border:1px solid #cfab6a;color:white;border-radius:5px;cursor:pointer">Conferir agora</button><div style="font-size:11px;color:#afa99b;margin-top:8px">Consulta automática a cada 12 segundos. Edição do administrador ainda bloqueada.</div></div>';
  document.body.appendChild(panel);
  const el = id => document.getElementById('c2-' + id);
  const say = (s, ok = true) => {el('status').textContent = s; el('status').style.color = ok ? '#b7dfb1' : '#ed9d9d';};
  el('toggle').addEventListener('click', () => {
    const hidden = !el('body').hidden;
    el('body').hidden = hidden;
    el('toggle').textContent = hidden ? '+' : '−';
    el('toggle').setAttribute('aria-label', hidden ? 'Expandir' : 'Recolher');
  });
  function showInShelf() {
    const heading = document.getElementById('catalog-shelf-name');
    if (!heading) return;
    let badge = document.getElementById('c2-shelf-badge');
    if (!badge) {
      badge = document.createElement('small');
      badge.id = 'c2-shelf-badge';
      badge.style.cssText = 'display:block;color:#e4b875;font:12px/1.5 system-ui;margin:4px 0';
      heading.insertAdjacentElement('afterend', badge);
    }
    badge.hidden = !linkedId || activeShelf !== linkedId;
    if (!badge.hidden) badge.textContent = current ? 'D1 · ' + current.title + ' · revisão ' + current.version + ' · somente leitura' : 'D1 · aguardando conexão';
  }
  function linkShelf() {
    try {
      const objects = window.__BL2_EDITOR__?.bundle?.()?.rooms?.archive;
      const shelves = Array.isArray(objects) ? objects.filter(o => o?.kind === 'shelf') : [];
      const shelf = shelves.find(o => o.id === 'a-shelf-1') || shelves[0];
      linkedId = shelf?.id || null;
      el('linked').textContent = shelf ? (shelf.shelfName || shelf.id) : 'Não encontrada';
      const library = window.LibraryCatalog;
      if (library && typeof library.openShelf === 'function' && !library.openShelf.__c2Wrapped) {
        const old = library.openShelf;
        library.openShelf = async function(id, ...rest) {
          activeShelf = id;
          const value = await old.call(this, id, ...rest);
          showInShelf();
          return value;
        };
        library.openShelf.__c2Wrapped = true;
      }
    } catch (_) {el('linked').textContent = 'Indisponível';}
  }
  async function load(force) {
    if (inFlight || (document.hidden && !force)) return;
    inFlight = true;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 8500);
    try {
      const r = await fetch(ROOT, {method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal:abort.signal});
      if (!r.ok) throw Error('HTTP ' + r.status);
      const s = (await r.json())?.shelf;
      if (s?.id !== 'c1-estante' || typeof s.title !== 'string' || !Number.isSafeInteger(s.version) || s.version < 1) throw Error('Resposta inválida');
      current = {title:s.title, version:s.version};
      el('title').textContent = current.title; el('version').textContent = String(current.version);
      say(last != null && last !== current.version ? 'Nova revisão recebida sem recarregar a página.' : 'Conectado · consulta automática ativa.');
      last = current.version;
      showInShelf();
    } catch(err) { say('Falha de consulta: ' + (err.name === 'AbortError' ? 'tempo esgotado' : String(err.message || 'rede')), false); }
    finally {clearTimeout(timer); inFlight = false;}
  }
  function start() {
    // Drive desabilitado nesta cópia experimental para evitar misturar arquiteturas.
    const field = document.getElementById('adm002-client-id');
    if (field) {field.value = ''; field.disabled = true; field.placeholder = 'Desativado nesta homologação C2';}
    for (const id of ['adm002-connect','adm002-restore','adm002-save','adm002-overwrite','adm003-reconcile','adm002-auto']) {
      const e = document.getElementById(id);
      if (e) {e.disabled = true; e.title = 'Drive desabilitado no teste C2';}
    }
    linkShelf();
    if (!linkedId) setTimeout(linkShelf, 1000);
    el('refresh').addEventListener('click', () => {void load(true);});
    void load(true);
    const interval = setInterval(() => {void load(false);}, 12000);
    document.addEventListener('visibilitychange', () => {if (!document.hidden) void load(true);});
    window.addEventListener('pagehide', () => clearInterval(interval));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
