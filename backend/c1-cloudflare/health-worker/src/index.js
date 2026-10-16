// C1: Worker experimental, sem acesso a dados ou ao acervo real.
const ORIGIN = "https://player2003jl-gif.github.io";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Methods": "GET",
      "Vary": "Origin"
    });
    if (request.headers.get("Origin") === ORIGIN) {
      headers.set("Access-Control-Allow-Origin", ORIGIN);
    }
    if (request.method !== "GET") {
      return new Response(JSON.stringify({error:"Metodo nao permitido"}), {status:405,headers});
    }
    if (url.pathname !== "/api/health" && url.pathname !== "/") {
      return new Response(JSON.stringify({error:"Nao encontrado"}), {status:404,headers});
    }
    return new Response(JSON.stringify({
      service:"biblioteca-ludica-c1",
      status:"ok",
      phase:"worker-verification",
      database:"not-configured",
      storage:"not-configured",
      production:false
    }), {status:200,headers});
  }
};
