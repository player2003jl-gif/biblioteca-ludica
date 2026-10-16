/**
 * Biblioteca Lúdica II · C1 D1 · teste isolado e somente leitura.
 * Não acessa o catálogo real, o Google Drive ou objetos R2.
 */
const DEMO_ID = 'c1-estante';
const ORIGIN = 'https://player2003jl-gif.github.io';

function reply(request, status, body) {
  const h = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin'
  });
  if (request.headers.get('Origin') === ORIGIN) {
    h.set('Access-Control-Allow-Origin', ORIGIN);
  }
  return new Response(JSON.stringify(body), {status, headers:h});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return reply(request,405,{error:'Metodo nao permitido'});
    if (url.pathname !== '/api/health' && url.pathname !== '/api/shelf') {
      return reply(request,404,{error:'Rota nao encontrada'});
    }
    try {
      if (!env.DB || typeof env.DB.prepare !== 'function') {
        return reply(request,503,{error:'Banco de dados indisponivel'});
      }
      if (url.pathname === '/api/health') {
        const test = await env.DB.prepare('SELECT 1 AS ok').first();
        if (test?.ok !== 1) return reply(request,503,{error:'Banco de dados indisponivel'});
        return reply(request,200,{
          status:'ok',
          service:'biblioteca-ludica-c1-d1',
          phase:'d1-verification',
          d1:'ok',
          r2:'not-configured',
          production:false
        });
      }
      const shelf = await env.DB.prepare(
        'SELECT id, title, version, updated_at FROM shelves WHERE id = ?'
      ).bind(DEMO_ID).first();
      return shelf ? reply(request,200,{shelf}) : reply(request,404,{error:'Estante de teste nao encontrada'});
    } catch (_error) {
      return reply(request,503,{error:'Consulta experimental indisponivel'});
    }
  }
};
