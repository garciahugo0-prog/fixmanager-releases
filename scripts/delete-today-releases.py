import sys
import json
import urllib.request

if len(sys.argv) < 2:
    print("Uso: python3 scripts/delete-today-releases.py <GITHUB_TOKEN>")
    sys.exit(1)

token = sys.argv[1]
repo = "garciahugo0-prog/fixmanager-releases"
gist_id = "e801bfd70835c912715916dc5e172fdb"

# 1. Obtener releases desde la API
url = f"https://api.github.com/repos/{repo}/releases"
req = urllib.request.Request(url, headers={"Authorization": f"token {token}", "User-Agent": "FixManagerCleaner"})

try:
    with urllib.request.urlopen(req) as resp:
        releases = json.loads(resp.read().decode("utf-8"))
except Exception as e:
    print(f"Error consultando releases: {e}")
    sys.exit(1)

print(f"Encontrados {len(releases)} releases.")

# Releases a eliminar: todas las creadas hoy con versión > v1.15.5
to_delete = [r for r in releases if r['tag_name'] in [
    "v1.15.22", "v1.15.21", "v1.15.20", "v1.15.19", "v1.15.18", "v1.15.17",
    "v1.15.16", "v1.15.15", "v1.15.14", "v1.15.12", "v1.15.11", "v1.15.10",
    "v1.15.9", "v1.15.8", "v1.15.7", "v1.15.6"
]]

print(f"Eliminando {len(to_delete)} releases de hoy (v1.15.6 - v1.15.22)...")

for r in to_delete:
    rel_id = r['id']
    tag = r['tag_name']
    del_url = f"https://api.github.com/repos/{repo}/releases/{rel_id}"
    del_req = urllib.request.Request(del_url, headers={"Authorization": f"token {token}", "User-Agent": "FixManagerCleaner"}, method="DELETE")
    try:
        with urllib.request.urlopen(del_req) as del_resp:
            print(f"  ✅ Eliminado release {tag} (ID: {rel_id})")
    except Exception as e:
        print(f"  ❌ Error eliminando {tag}: {e}")

# 2. Actualizar Gist version.json a 1.15.5
print("Actualizando Gist de versión oficial a 1.15.5...")
gist_url = f"https://api.github.com/gists/{gist_id}"
gist_payload = {
    "files": {
        "version.json": {
            "content": json.dumps({
                "version": "1.15.5",
                "notes": "FixManager v1.15.5 — Versión oficial estable",
                "dmgUrl": "https://github.com/garciahugo0-prog/fixmanager-releases/releases/download/v1.15.5/FixManager-1.15.5-universal.dmg",
                "exeUrl": "https://github.com/garciahugo0-prog/fixmanager-releases/releases/download/v1.15.5/FixManager.Setup.1.15.5.exe"
            }, indent=2)
        }
    }
}
gist_req = urllib.request.Request(
    gist_url,
    data=json.dumps(gist_payload).encode("utf-8"),
    headers={
        "Authorization": f"token {token}",
        "Content-Type": "application/json",
        "User-Agent": "FixManagerCleaner"
    },
    method="PATCH"
)

try:
    with urllib.request.urlopen(gist_req) as g_resp:
        print("✅ Gist actualizado exitosamente a la versión oficial v1.15.5.")
except Exception as e:
    print(f"❌ Error actualizando Gist: {e}")
