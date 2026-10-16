"""Gerar homologação C3 isolada a partir da página C2; não toca no site original."""
from pathlib import Path
import hashlib,subprocess
src=Path("homologacao-cloudflare-c2/index.html")
dst=Path("homologacao-cloudflare-c3/index.html")
s=src.read_text(encoding="utf-8")
assert s.startswith("<!DOCTYPE html>")
changes={
 "__BL2_C2_STAGING_20261016__:":"__BL2_C3_STAGING_20261016__:",
 "bl2-c2-staging-catalog-v03":"bl2-c3-staging-catalog-v03",
 "BL2_C2_STAGING_BACKUP_":"BL2_C3_STAGING_BACKUP_",
 "BL2_C2_STAGING_ASSET_":"BL2_C3_STAGING_ASSET_",
 '<script src="./cloudflare-c2.js" defer></script>':'<script src="./cloudflare-c3.js" defer></script>',
 'C2 · CLOUDFLARE / TESTE ISOLADO':'C3 · ADMIN GOOGLE / TESTE ISOLADO',
}
for old,new in changes.items():
 count=s.count(old)
 assert count>0,(old,count)
 s=s.replace(old,new)
assert "window.__BL2_STAGING_LOCAL__" in s
assert "bl2-c2-staging-catalog-v03" not in s
assert "BL2_C2_STAGING_BACKUP_" not in s
assert s.count("./cloudflare-c3.js")==1
dst.parent.mkdir(exist_ok=True)
dst.write_text(s,encoding="utf-8")
js=Path("homologacao-cloudflare-c3/cloudflare-c3.js")
subprocess.run(["node","--check",str(js)],check=True)
print("OK: copia da Biblioteca gerada, dados locais e Drive isolados.")
print("Arquivo C3 SHA256",hashlib.sha256(dst.read_bytes()).hexdigest())
print("Tamanho da copia",dst.stat().st_size)
