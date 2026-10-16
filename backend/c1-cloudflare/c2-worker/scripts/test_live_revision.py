"""Atualizacao UNICA de estante de demonstracao C2 via D1 da Cloudflare.

Nao altera catalogo, EPUB, layout real, OAuth ou secrets de Worker.
Apenas nome e revisao da linha c1-estante no banco bl2-c1-teste-d1.
"""
import json,os,re,sys,time,urllib.error,urllib.request,urllib.parse
from pathlib import Path

ACCOUNT=os.environ.get("CLOUDFLARE_ACCOUNT_ID","")
TOKEN=os.environ.get("CLOUDFLARE_API_TOKEN","")
if not re.fullmatch(r"[0-9a-fA-F]{32}",ACCOUNT) or len(TOKEN)<20:
    sys.exit("FALHA: credenciais de implantacao invalidas")
API=f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}"
NAME="bl2-c1-teste-d1"
NEW_TITLE="Estante C2 - atualizacao ao vivo A/B - 16-10"

def call(method,path,data=None):
    req=urllib.request.Request(API+path,
        data=json.dumps(data,ensure_ascii=False).encode("utf-8") if data is not None else None,
        method=method,headers={"Authorization":"Bearer "+TOKEN,"Accept":"application/json","Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=25) as res: obj=json.load(res)
    except urllib.error.HTTPError as e:
        sys.exit(f"FALHA: API Cloudflare HTTP {e.code} ao {method} (sem gravar segredos nos logs)")
    except Exception as e:
        sys.exit(f"FALHA: acesso API Cloudflare: {type(e).__name__}")
    if not obj.get("success"):sys.exit("FALHA: API D1 recusou operacao, nenhuma confirmacao de escrita")
    return obj.get("result")

def read_public():
    url="https://bl2-c2-estante-verificacao.chatgptset26.workers.dev/api/shelf"
    for i in range(6):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"curl/8.0","Accept":"application/json"})
            with urllib.request.urlopen(req,timeout=12) as res: row=json.load(res)["shelf"]
            if row.get("id")!="c1-estante" or not isinstance(row.get("version"),int):
                sys.exit("FALHA: identificador ou revisao inesperados")
            return row
        except urllib.error.HTTPError as e:
            if e.code==403: break  # algumas assinaturas Python recebem bloqueio 1010
        except Exception:pass
        time.sleep(2)
    return None

# A API Cloudflare é usada tanto para buscar identificador quanto para ler a revisão
# de referência e comprovar a gravação sem depender do user-agent de um navegador.
found=call("GET","/d1/database?name=bl2-c1-teste-d1&per_page=100")
if not isinstance(found,list):sys.exit("FALHA: listagem D1 em formato inesperado")
dbs=[x for x in found if isinstance(x,dict) and x.get("name")==NAME]
if len(dbs)!=1:sys.exit("FALHA: banco de homologacao ausente ou ambiguo")
uuid=dbs[0].get("uuid","")
if not re.fullmatch(r"[0-9a-fA-F-]{36}",uuid):sys.exit("FALHA: UUID D1 invalido")
PATH=f"/d1/database/{uuid}/query"
def sql(query,params=None):
    response=call("POST",PATH,{"sql":query,"params":params or []})
    if not isinstance(response,list) or len(response)!=1 or not response[0].get("success"):
        sys.exit("FALHA: operacao D1 sem confirmacao univoca")
    return response[0].get("results",[])

before=sql("SELECT id, title, version FROM shelves WHERE id = ?",["c1-estante"])
if len(before)!=1 or not isinstance(before[0].get("version"),int):
    sys.exit("FALHA: estante ficticia ou revisao ausente")
original=before[0]
print("OK: estante de teste identificada, revisao atual:",original["version"])
updated=sql(
    "UPDATE shelves SET title = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ? RETURNING id, title, version",
    [NEW_TITLE,"c1-estante",original["version"]])
if len(updated)!=1 or updated[0].get("id")!="c1-estante" or updated[0].get("version")!=original["version"]+1:
    sys.exit("FALHA: atualizacao concorrente ou inesperada, conferir estado antes de repetir")
print("OK: nova revisao registrada no D1:",updated[0]["version"])
print("NOVO NOME:",updated[0]["title"])
after=sql("SELECT id,title,version FROM shelves WHERE id = ?",["c1-estante"])
if len(after)!=1 or after[0].get("version")!=updated[0]["version"] or after[0].get("title")!=NEW_TITLE:
    sys.exit("FALHA: leitura independente nao corresponde ao salvamento")
print("OK: segunda consulta independente ao D1 confirmou os dados oficiais.")
print("Agora conferir os painéis C2 abertos nos dois navegadores SEM atualizar as paginas.")
