/** C1 R2: demonstração isolada; nenhuma escrita HTTP nem acervo real. */
const ORIGIN="https://player2003jl-gif.github.io";
const DEMO_KEY="c1/livro-ficticio.txt";
function response(req,status,data,ctype="application/json; charset=utf-8"){
  const headers=new Headers({"Content-Type":ctype,"Cache-Control":"no-store","Vary":"Origin","X-Content-Type-Options":"nosniff"});
  if(req.headers.get("Origin")===ORIGIN)headers.set("Access-Control-Allow-Origin",ORIGIN);
  return new Response(ctype.startsWith("application/json")?JSON.stringify(data):data,{status,headers});
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method!=="GET")return response(request,405,{error:"Metodo nao permitido"});
    if(url.pathname!=="/api/health"&&url.pathname!=="/api/demo-book")return response(request,404,{error:"Rota inexistente"});
    try{
      if(!env.BOOKS || typeof env.BOOKS.get!=="function")return response(request,503,{error:"R2 indisponivel"});
      if(url.pathname==="/api/health"){
        const item=await env.BOOKS.head(DEMO_KEY);
        return response(request,item?200:503,{status:item?"ok":"incomplete",service:"biblioteca-ludica-c1-r2",r2:item?"ok":"demo-object-missing",bucket:"bl2-c1-teste-r2",production:false});
      }
      const item=await env.BOOKS.get(DEMO_KEY);
      if(!item)return response(request,404,{error:"Objeto ficticio ainda nao existe"});
      const content=await item.text();
      if(!content.startsWith("Biblioteca Ludica II: C1 R2 demo, nenhum livro real."))return response(request,503,{error:"Objeto de teste inesperado"});
      return response(request,200,content,"text/plain; charset=utf-8");
    }catch{return response(request,503,{error:"Armazenamento de demonstracao indisponivel"});}
  }
};
