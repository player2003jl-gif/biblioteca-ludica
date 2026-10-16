"""Resolve somente banco D1 experimental ja existente; nao cria nem altera recursos."""
import os,json,re,sys,urllib.request,urllib.error
from pathlib import Path
account=os.environ.get('CLOUDFLARE_ACCOUNT_ID','')
token=os.environ.get('CLOUDFLARE_API_TOKEN','')
if not re.fullmatch(r'[a-fA-F0-9]{32}',account) or len(token)<20:sys.exit('Credenciais Cloudflare ausentes')
req=urllib.request.Request('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database?name=bl2-c1-teste-d1&per_page=100',headers={'Authorization':'Bearer '+token,'Accept':'application/json'})
try:
 with urllib.request.urlopen(req,timeout=25) as r: data=json.load(r)
except urllib.error.HTTPError as e:sys.exit('Cloudflare recusou listar o D1: HTTP '+str(e.code))
if not data.get('success'):sys.exit('D1 indisponivel')
matches=[x for x in data.get('result',[]) if x.get('name')=='bl2-c1-teste-d1']
if len(matches)!=1:sys.exit('Banco D1 de teste ausente ou ambiguo; operacao cancelada')
uuid=matches[0].get('uuid','')
if not re.fullmatch(r'[0-9a-fA-F-]{36}',uuid):sys.exit('UUID invalido')
p=Path('wrangler.jsonc')
txt=p.read_text()
if txt.count('SUBSTITUIR_PELO_UUID_D1')!=1 or '"database_name": "bl2-c1-teste-d1"' not in txt:sys.exit('Config D1 inesperada')
p.write_text(txt.replace('SUBSTITUIR_PELO_UUID_D1',uuid))
print('OK: configurado Worker C2 para banco D1 somente de teste.')
