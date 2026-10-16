"""Configura o C3 somente com o UUID de D1 experimental já criado."""
import os,json,re,sys,urllib.request,urllib.error
account=os.environ.get("CLOUDFLARE_ACCOUNT_ID","")
token=os.environ.get("CLOUDFLARE_API_TOKEN","")
if not re.fullmatch(r"[a-fA-F0-9]{32}",account) or len(token)<20:sys.exit("Credenciais Cloudflare invalidas")
req=urllib.request.Request(
 "https://api.cloudflare.com/client/v4/accounts/"+account+"/d1/database?name=bl2-c1-teste-d1&per_page=100",
 headers={"Authorization":"Bearer "+token,"Accept":"application/json"})
try:
 with urllib.request.urlopen(req,timeout=25) as r:response=json.load(r)
except urllib.error.HTTPError as e:sys.exit("Falha API D1 HTTP "+str(e.code))
if not response.get("success"):sys.exit("API D1 negou acesso")
matches=[x for x in response.get("result",[]) if x.get("name")=="bl2-c1-teste-d1"]
if len(matches)!=1:sys.exit("D1 de homologacao ausente ou ambiguo")
uuid=matches[0].get("uuid","")
if not re.fullmatch(r"[a-fA-F0-9-]{36}",uuid):sys.exit("UUID D1 inesperado")
from pathlib import Path
p=Path("wrangler.jsonc")
c=p.read_text()
if c.count("SUBSTITUIR_PELO_UUID_D1")!=1 or '"database_name": "bl2-c1-teste-d1"' not in c:sys.exit("Config do Worker divergente")
p.write_text(c.replace("SUBSTITUIR_PELO_UUID_D1",uuid))
print("OK: C3 aponta somente para o banco D1 experimental preexistente")
