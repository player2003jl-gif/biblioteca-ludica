"""C1: create only the named empty R2 Standard test bucket, idempotently."""
import json,os,re,sys,urllib.request,urllib.error
name="bl2-c1-teste-r2"
account=os.environ.get("CLOUDFLARE_ACCOUNT_ID","")
token=os.environ.get("CLOUDFLARE_API_TOKEN","")
if not re.fullmatch(r"[0-9a-fA-F]{32}",account) or len(token)<20:
    sys.exit("FALHA: credenciais Cloudflare ausentes")
endpoint="https://api.cloudflare.com/client/v4/accounts/"+account+"/r2/buckets"
def call(method,url,body=None):
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(url,method=method,data=data,headers={
        "Authorization":"Bearer "+token,"Content-Type":"application/json","Accept":"application/json",
        "User-Agent":"Biblioteca-Ludica-C1-R2-Setup/1.0"
    })
    try:
        with urllib.request.urlopen(req,timeout=25) as res:r=json.load(res)
    except urllib.error.HTTPError as e:sys.exit("FALHA: Cloudflare R2 HTTP "+str(e.code))
    except Exception as e:sys.exit("FALHA: consulta Cloudflare: "+type(e).__name__)
    if not r.get("success"):sys.exit("FALHA: API R2 recusou a operacao")
    return r["result"]
results=call("GET",endpoint+"?name_contains=bl2-c1-teste-r2&per_page=20")
if not isinstance(results,dict) or not isinstance(results.get("buckets"),list):
    sys.exit("FALHA: resposta R2 inesperada")
matches=[b for b in results["buckets"] if b.get("name")==name]
if len(matches)>1:sys.exit("FALHA: multiplos buckets com nome esperado")
if matches:
    b=matches[0];print("OK: bucket de homologacao ja existe; nenhum bucket criado.")
else:
    b=call("POST",endpoint,{"name":name,"storageClass":"Standard"})
    if b.get("name")!=name:sys.exit("FALHA: nome inesperado de bucket criado")
    print("OK: bucket experimental Standard criado:",name)
if b.get("storage_class") not in ("Standard",None):
    sys.exit("FALHA: bucket com classe inesperada; interrompendo")
print("OK: somente bucket de teste selecionado.")
