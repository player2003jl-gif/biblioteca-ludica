"""C1: ensure an isolated test database and inject its UUID into local Wrangler config."""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

NAME = "bl2-c1-teste-d1"
token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
if len(token) < 20 or not re.fullmatch(r"[0-9a-fA-F]{32}", account):
    sys.exit("FALHA: credenciais Cloudflare ou Account ID invalidos")

url = "https://api.cloudflare.com/client/v4/accounts/" + account + "/d1/database"

def api(method, endpoint, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        endpoint, data=data, method=method, headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            body = json.load(response)
    except urllib.error.HTTPError as exc:
        sys.exit("FALHA: API D1 retornou HTTP " + str(exc.code) +
                 "; confira permissao D1 Write do token")
    except Exception as exc:
        sys.exit("FALHA: erro de rede na API D1: " + type(exc).__name__)
    if not body.get("success"):
        sys.exit("FALHA: API D1 recusou a operacao")
    return body

query = urllib.parse.urlencode({"name": NAME, "per_page": "100", "page": "1"})
listed = api("GET", url + "?" + query)
matches = [row for row in listed.get("result", []) if row.get("name") == NAME]
if len(matches) > 1:
    sys.exit("FALHA: nomes de D1 ambiguos")
if matches:
    database = matches[0]
    print("OK: banco de teste existente encontrado; nao criar duplicata.")
else:
    database = api("POST", url, {"name": NAME}).get("result", {})
    if database.get("name") != NAME:
        sys.exit("FALHA: banco criado com nome inesperado")
    print("OK: criado somente D1 bl2-c1-teste-d1")

uuid = database.get("uuid", "")
if not re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", uuid):
    sys.exit("FALHA: UUID do banco invalido")
config = Path("wrangler.jsonc")
txt = config.read_text(encoding="utf-8")
if txt.count("SUBSTITUIR_PELO_UUID_D1") != 1 or '"database_name": "bl2-c1-teste-d1"' not in txt:
    sys.exit("FALHA: Wrangler nao aponta para o banco experimental")
config.write_text(txt.replace("SUBSTITUIR_PELO_UUID_D1", uuid), encoding="utf-8")
print("OK: configuracao experimental pronta; nenhum segredo gravado em arquivos.")
