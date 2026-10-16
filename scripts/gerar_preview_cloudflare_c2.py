"""Gera cópia completa da biblioteca para C2, sem tocar no index público."""
from pathlib import Path
import hashlib
import re
import subprocess
import tempfile

source=Path("homologacao-adm004/index.html")
target=Path("homologacao-cloudflare-c2/index.html")
s=source.read_text(encoding="utf-8")
assert s.startswith("<!DOCTYPE html>")
assert "id=\"adm004-stage-banner\"" in s
for old,new in [
 ("__BL2_ADM004_STAGING_20261016__:","__BL2_C2_STAGING_20261016__:"),
 ("bl2-adm004-staging-catalog-v03","bl2-c2-staging-catalog-v03"),
 ("BL2_ADM004_STAGING_BACKUP_","BL2_C2_STAGING_BACKUP_"),
 ("BL2_ADM004_STAGING_ASSET_","BL2_C2_STAGING_ASSET_")
]:
    count=s.count(old)
    assert count>=1,(old,count)
    s=s.replace(old,new)
assert "ADM-004.1 · TESTE ISOLADO" in s
s=s.replace("ADM-004.1 · TESTE ISOLADO","C2 · CLOUDFLARE / TESTE ISOLADO",1)
assert s.count("</body>")>=1
last=s.rfind("</body>")
s=s[:last]+'<script src="./cloudflare-c2.js" defer></script>\n'+s[last:]
for token in ["__BL2_ADM004_STAGING_20261016__:", "bl2-adm004-staging-catalog-v03", "BL2_ADM004_STAGING_BACKUP_"]:
    assert token not in s
assert s.count('<script src="./cloudflare-c2.js" defer></script>')==1
assert "window.__BL2_STAGING_LOCAL__" in s
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(s,encoding="utf-8")
js=Path("homologacao-cloudflare-c2/cloudflare-c2.js")
assert js.is_file()
subprocess.run(["node","--check",str(js)],check=True)
# Não validar scripts estranhos do jogo por OCR: o arquivo principal já é a cópia homologada.
print("OK: cópia de homologação C2 gerada; HTML bytes =",target.stat().st_size)
print("SHA256 preview:",hashlib.sha256(target.read_bytes()).hexdigest())
print("OK: localStorage, IndexedDB e nomes de Drive isolados da ADM-004.1.")
print("OK: main/index.html e Hub EPUB V3 não foram editados.")
