#!/bin/bash
# ──────────────────────────────────────────────────────────────
#  FixManager — Script de publicación en GitHub
#  Uso: bash scripts/publish-release.sh
# ──────────────────────────────────────────────────────────────

set -e

if [ "$GITHUB_TOKEN" = "github_pat_antigravitydummytoken" ]; then
  unset GITHUB_TOKEN
fi

C_RESET='\033[0m'
C_GREEN='\033[32m'
C_CYAN='\033[36m'
C_YELLOW='\033[33m'
C_RED='\033[31m'
C_BOLD='\033[1m'

log()  { echo -e "${2}${1}${C_RESET}"; }
ok()   { log "✅ $1" "$C_GREEN"; }
info() { log "ℹ️  $1" "$C_CYAN"; }
warn() { log "⚠️  $1" "$C_YELLOW"; }
err()  { log "❌ $1" "$C_RED"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$ROOT/release"
PKG="$ROOT/package.json"

echo ""
log "──────────────────────────────────────────────" "$C_CYAN$C_BOLD"
log "   FIXMANAGER — Publicar Release en GitHub   " "$C_CYAN$C_BOLD"
log "──────────────────────────────────────────────" "$C_CYAN$C_BOLD"
echo ""

# ── Leer versión ──────────────────────────────────────────────
VERSION=$(python3 -c "import json; print(json.load(open('$PKG'))['version'])")
info "Versión: $VERSION"

REPO="garciahugo0-prog/fixmanager-releases"
GIST_ID="e801bfd70835c912715916dc5e172fdb"
DMG="$RELEASE_DIR/FixManager-${VERSION}-universal.dmg"
EXE="$RELEASE_DIR/FixManager Setup ${VERSION}.exe"
ZIP="$RELEASE_DIR/FixManager-mac-installer.zip"

# ── Verificar archivos y Crear ZIP Mac ────────────────────────
[ -f "$DMG" ] || err "No se encontró $DMG — compila primero con: npm run build:mac"

if [ -f "$EXE" ]; then
  ok "Instalador Windows encontrado: $EXE"
else
  warn "No se encontró $EXE. Se procederá a publicar el release de Mac."
fi

info "Creando ZIP de la carpeta de instalación para Mac..."
cd "$RELEASE_DIR"
rm -f "FixManager-mac-installer.zip"
zip -q -r "FixManager-mac-installer.zip" "FixManager-Installer"
cd "$ROOT"
[ -f "$ZIP" ] || err "No se pudo crear $ZIP"

ok "Archivos e instalador ZIP listos"
echo ""

# ── Pedir token ───────────────────────────────────────────────
# Intentar obtener el token de gh CLI, si no, usar GITHUB_TOKEN
TOKEN=$(gh auth token 2>/dev/null || true)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "github_pat_antigravitydummytoken" ]; then
  if [ -n "$GITHUB_TOKEN" ] && [ "$GITHUB_TOKEN" != "github_pat_antigravitydummytoken" ]; then
    TOKEN="$GITHUB_TOKEN"
  else
    warn "Necesitas un Personal Access Token de GitHub con permisos: repo + gist"
    warn "Créalo en: github.com → Settings → Developer settings → Personal access tokens"
    warn "REVÓCALO inmediatamente después de que termine este script."
    echo ""
    read -s -p "🔑 Pega tu token y presiona Enter: " TOKEN
    echo ""
    echo ""
  fi
fi

[ -z "$TOKEN" ] && err "Token vacío."

# ── Verificar token ───────────────────────────────────────────
USER=$(curl -sf -H "Authorization: token $TOKEN" https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin).get('login',''))" 2>/dev/null)
[ -z "$USER" ] && err "Token inválido o sin acceso."
ok "Token válido — usuario: $USER"
echo ""

# ── Generar notas automáticas desde bump-version ──────────────
NOTES_FILE="$ROOT/.release-notes"
if [ -f "$NOTES_FILE" ]; then
  NOTES=$(cat "$NOTES_FILE")
  ok "Notas del release cargadas automáticamente"
  echo "  → $NOTES"
  echo ""
else
  info "No se encontraron notas automáticas."
  read -r -p "📝 Escribe las notas del release: " NOTES
  [ -z "$NOTES" ] && NOTES="FixManager v${VERSION}"
fi

JSON_PAYLOAD=$(python3 -c "
import json, sys
notes = sys.argv[1]
version = sys.argv[2]
data = {
    'tag_name': 'v' + version,
    'name': 'FixManager v' + version,
    'body': notes,
    'draft': False,
    'prerelease': False
}
print(json.dumps(data))
" "$NOTES" "$VERSION")

RELEASE=$(curl -sf -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/${REPO}/releases \
  -d "$JSON_PAYLOAD")

RELEASE_ID=$(echo "$RELEASE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
[ -z "$RELEASE_ID" ] && err "No se pudo crear el release. ¿Ya existe v${VERSION}?"
ok "Release creado (ID: $RELEASE_ID)"
echo ""

UPLOAD_BASE="https://uploads.github.com/repos/${REPO}/releases/${RELEASE_ID}/assets"

# ── Subir DMG ─────────────────────────────────────────────────
info "Subiendo DMG universal (Mac)..."
curl -sf -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  -T "$DMG" \
  "${UPLOAD_BASE}?name=FixManager-mac-universal.dmg" | python3 -c "import sys,json; r=json.load(sys.stdin); print('  →', r.get('state',''), r.get('browser_download_url',''))"
ok "DMG subido"
echo ""

# ── Subir ZIP ─────────────────────────────────────────────────
info "Subiendo ZIP del Instalador (Mac)..."
curl -sf -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  -T "$ZIP" \
  "${UPLOAD_BASE}?name=FixManager-mac-installer.zip" | python3 -c "import sys,json; r=json.load(sys.stdin); print('  →', r.get('state',''), r.get('browser_download_url',''))"
ok "ZIP del Instalador subido"
echo ""

# ── Subir EXE (si existe) ──────────────────────────────────────
if [ -f "$EXE" ]; then
  info "Subiendo instalador Windows..."
  curl -sf -X POST \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/octet-stream" \
    -T "$EXE" \
    "${UPLOAD_BASE}?name=FixManager-windows.exe" | python3 -c "import sys,json; r=json.load(sys.stdin); print('  →', r.get('state',''), r.get('browser_download_url',''))"
  ok "EXE subido"
  echo ""
fi

# ── Actualizar Gist ───────────────────────────────────────────
info "Actualizando version.json en Gist..."
TOKEN="$TOKEN" GIST_ID="$GIST_ID" VERSION="$VERSION" REPO="$REPO" NOTES="$NOTES" python3 -c "
import urllib.request, json, os, sys
token = os.environ['TOKEN']
gist_id = os.environ['GIST_ID']
version = os.environ['VERSION']
repo = os.environ['REPO']
notes = os.environ['NOTES']
gist_content = {
    'version': version,
    'notes': notes,
    'dmgUrl': f'https://github.com/{repo}/releases/latest/download/FixManager-mac-installer.zip',
    'downloads': {
        'mac-universal': f'https://github.com/{repo}/releases/latest/download/FixManager-mac-installer.zip',
        'win': f'https://github.com/{repo}/releases/latest/download/FixManager-windows.exe'
    }
}
payload = {
    'files': {
        'version.json': {
            'content': json.dumps(gist_content, indent=2, ensure_ascii=False)
        }
    }
}
req = urllib.request.Request(
    f'https://api.github.com/gists/{gist_id}',
    data=json.dumps(payload).encode('utf-8'),
    headers={
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Python-urllib'
    },
    method='PATCH'
)
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        print('  → Actualizado:', data.get('updated_at',''))
except Exception as e:
    print('Error updating Gist:', e)
    sys.exit(1)
"
ok "Gist actualizado"
echo ""

# ── Actualizar version.json local ─────────────────────────────
cat > "$RELEASE_DIR/version.json" << EOF
{
  "version": "${VERSION}",
  "notes": "${NOTES}",
  "dmgUrl": "https://github.com/${REPO}/releases/latest/download/FixManager-mac-installer.zip",
  "downloads": {
    "mac-universal": "https://github.com/${REPO}/releases/latest/download/FixManager-mac-installer.zip",
    "win": "https://github.com/${REPO}/releases/latest/download/FixManager-windows.exe"
  }
}
EOF
ok "version.json local actualizado"
echo ""

# ── Limpiar token y notas temporales ─────────────────────────
unset TOKEN
[ -f "$ROOT/.release-notes" ] && rm "$ROOT/.release-notes"

log "──────────────────────────────────────────────" "$C_CYAN$C_BOLD"
ok "${C_BOLD}¡Release v${VERSION} publicado exitosamente!"
info "URL: https://github.com/${REPO}/releases/tag/v${VERSION}"
echo ""
warn "IMPORTANTE: Revoca tu token en github.com → Settings → Developer settings"
log "──────────────────────────────────────────────" "$C_CYAN$C_BOLD"
echo ""
