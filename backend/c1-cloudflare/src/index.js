/**
 * Biblioteca Lúdica II — C1, prova isolada de infraestrutura.
 * NÃO utiliza catálogo, EPUBs ou a planta da Biblioteca pública.
 * Escrita exige um segredo separado, configurado no Cloudflare Worker.
 */

const DEMO_ID = 'c1-estante';
const DEMO_OBJECT_KEY = 'c1/livro-ficticio.txt';
const DEMO_TEXT = 'Biblioteca Lúdica II — livro fictício para homologação C1. Nenhuma obra real foi publicada.\n';
const MAX_BODY_BYTES = 2048;
const ALLOWED_ORIGIN = 'https://player2003jl-gif.github.io';

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const h = new Headers({ 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (origin === ALLOWED_ORIGIN) {
    h.set('Access-Control-Allow-Origin', origin);
    h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    h.set('Access-Control-Allow-Methods', 'GET, PATCH, POST, OPTIONS');
    h.set('Access-Control-Max-Age', '600');
  }
  return h;
}

function respond(request, payload, status = 200) {
  const headers = corsHeaders(request);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(payload), { status, headers });
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

async function isAuthorized(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const secret = env.C1_ADMIN_TOKEN;
  if (typeof secret !== 'string' || secret.length < 32 || token.length < 32 || token.length > 512) return false;
  const [left, right] = await Promise.all([sha256(token), sha256(secret)]);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function parseSmallJson(request) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const jsonError = (req, code, message) => respond(req, { error: message }, code);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
      if (request.headers.get('Origin') !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (!pathname.startsWith('/api/')) return jsonError(request, 404, 'Rota inexistente');

    // Não permitir operações de escrita antes de autenticar e validar a origem.
    if (pathname.startsWith('/api/admin/')) {
      const origin = request.headers.get('Origin');
      if (origin && origin !== ALLOWED_ORIGIN) return jsonError(request, 403, 'Origem não autorizada');
      if (!(await isAuthorized(request, env))) return jsonError(request, 401, 'Autorização administrativa necessária');
    }

    try {
      if (pathname === '/api/health' && method === 'GET') {
        const db = await env.DB.prepare('SELECT 1 AS ok').first();
        const files = await env.BOOKS.list({ limit: 1 });
        if (db?.ok !== 1 || !Array.isArray(files.objects)) return jsonError(request, 503, 'Infraestrutura indisponível');
        return respond(request, { status: 'ok', environment: 'c1-test', d1: 'ok', r2: 'ok' });
      }

      if (pathname === '/api/shelf' && method === 'GET') {
        const shelf = await env.DB.prepare('SELECT id, title, version, updated_at FROM shelves WHERE id = ?')
          .bind(DEMO_ID).first();
        return shelf ? respond(request, { shelf }) : jsonError(request, 404, 'Estante não encontrada');
      }

      if (pathname === '/api/admin/shelf' && method === 'PATCH') {
        const input = await parseSmallJson(request);
        if (!input || typeof input.title !== 'string' || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) {
          return jsonError(request, 400, 'Informe title e expectedVersion válidos');
        }
        const title = input.title.trim().replace(/\s+/g, ' ');
        if (!title || title.length > 80) return jsonError(request, 400, 'Título deve ter de 1 a 80 caracteres');
        const shelf = await env.DB.prepare(`UPDATE shelves
          SET title = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND version = ? RETURNING id, title, version, updated_at`)
          .bind(title, DEMO_ID, input.expectedVersion).first();
        if (!shelf) return jsonError(request, 409, 'Revisão desatualizada; consulte a estante antes de salvar');
        return respond(request, { shelf });
      }

      if (pathname === '/api/admin/demo-book' && method === 'POST') {
        const content = new TextEncoder().encode(DEMO_TEXT);
        await env.BOOKS.put(DEMO_OBJECT_KEY, content, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } });
        return respond(request, { stored: true, key: DEMO_OBJECT_KEY, bytes: content.byteLength }, 201);
      }

      if (pathname === '/api/demo-book' && method === 'GET') {
        const object = await env.BOOKS.get(DEMO_OBJECT_KEY);
        if (!object) return jsonError(request, 404, 'Livro fictício ainda não cadastrado');
        const headers = corsHeaders(request);
        headers.set('Content-Type', 'text/plain; charset=utf-8');
        return new Response(object.body, { status: 200, headers });
      }

      return jsonError(request, 404, 'Rota inexistente');
    } catch {
      // Não expor detalhes de ambiente, SQL, dados ou credenciais ao visitante.
      return jsonError(request, 503, 'Serviço de demonstração indisponível');
    }
  }
};
