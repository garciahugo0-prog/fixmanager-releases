#!/bin/bash

clear

# ─── Colores ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       ${BOLD}FIXMANAGER — INSTALADOR v1.3${NC}${CYAN}           ║${NC}"
echo -e "${CYAN}║         Bienvenido al asistente de           ║${NC}"
echo -e "${CYAN}║           instalación automática             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Detectar arquitectura y elegir el .dmg correcto ───────
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  ARCH_LABEL="Apple Silicon (M1 / M2 / M3)"
  DMG_FILE=$(find "$SCRIPT_DIR" -maxdepth 1 -name "*arm64*.dmg" | head -1)
  [ -z "$DMG_FILE" ] && DMG_FILE=$(find "$SCRIPT_DIR" -maxdepth 1 -name "*.dmg" | head -1)
else
  ARCH_LABEL="Intel (x86_64)"
  DMG_FILE=$(find "$SCRIPT_DIR" -maxdepth 1 -name "*.dmg" ! -name "*arm64*" | head -1)
  [ -z "$DMG_FILE" ] && DMG_FILE=$(find "$SCRIPT_DIR" -maxdepth 1 -name "*.dmg" | head -1)
fi

echo -e "  ${BLUE}🖥  Procesador detectado:${NC} $ARCH_LABEL"
echo ""

# ─── Verificar que existe el .dmg ──────────────────────────
if [ -z "$DMG_FILE" ]; then
  echo -e "  ${RED}❌ ERROR: No se encontró ningún archivo .dmg en esta carpeta.${NC}"
  echo ""
  echo "     Asegúrate de que el paquete instalador esté completo"
  echo "     y que el archivo .dmg esté junto a este script."
  echo ""
  echo "  Presiona Enter para cerrar..."
  read
  exit 1
fi

echo -e "  ${GREEN}✅ Instalador encontrado:${NC} $(basename "$DMG_FILE")"
echo ""

# ─── Solicitar permisos de administrador ───────────────────
echo -e "  ${YELLOW}🔑 Se requieren permisos de administrador.${NC}"
echo "     Ingresa tu contraseña cuando se solicite."
echo ""
sudo -v 2>/dev/null
if [ $? -ne 0 ]; then
  echo ""
  echo -e "  ${RED}❌ No se pudieron obtener los permisos necesarios.${NC}"
  echo "     Asegúrate de tener derechos de administrador."
  echo ""
  echo "  Presiona Enter para cerrar..."
  read
  exit 1
fi

# ─── Montar el .dmg ────────────────────────────────────────
echo -e "  ${BLUE}📦 Montando imagen de disco...${NC}"
MOUNT_POINT="/tmp/fixmanager_installer_mount"

hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null

hdiutil attach "$DMG_FILE" -nobrowse -mountpoint "$MOUNT_POINT" -quiet 2>/dev/null
if [ $? -ne 0 ]; then
  echo ""
  echo -e "  ${RED}❌ No se pudo montar el instalador.${NC}"
  echo "     El archivo .dmg puede estar dañado o incompleto."
  echo ""
  echo "  Presiona Enter para cerrar..."
  read
  exit 1
fi

# ─── Encontrar la app dentro del .dmg ──────────────────────
APP_FILE=$(find "$MOUNT_POINT" -maxdepth 1 -name "*.app" | head -1)
if [ -z "$APP_FILE" ]; then
  echo ""
  echo -e "  ${RED}❌ No se encontró la aplicación dentro del instalador.${NC}"
  hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
  echo ""
  echo "  Presiona Enter para cerrar..."
  read
  exit 1
fi

APP_NAME=$(basename "$APP_FILE")
echo -e "  ${GREEN}✅ Aplicación:${NC} $APP_NAME"
echo ""

# ─── Verificar instalación existente ───────────────────────
if [ -d "/Applications/$APP_NAME" ]; then
  echo -e "  ${YELLOW}⚠️  Ya existe una versión instalada de $APP_NAME.${NC}"
  read -p "  ¿Deseas reemplazarla con esta nueva versión? (s/n): " CONFIRM
  echo ""
  if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]]; then
    echo "  Instalación cancelada por el usuario."
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
    echo ""
    echo "  Presiona Enter para cerrar..."
    read
    exit 0
  fi
  echo -e "  ${BLUE}🗑  Eliminando versión anterior...${NC}"
  sudo rm -rf "/Applications/$APP_NAME"
fi

# ─── Copiar la app a /Applications ─────────────────────────
echo -e "  ${BLUE}📂 Copiando aplicación a /Applications...${NC}"
sudo cp -R "$APP_FILE" /Applications/
if [ $? -ne 0 ]; then
  echo ""
  echo -e "  ${RED}❌ Error al copiar la aplicación.${NC}"
  echo "     Verifica que tienes espacio disponible y permisos correctos."
  hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
  echo ""
  echo "  Presiona Enter para cerrar..."
  read
  exit 1
fi

# ─── Aplicar permisos y quitar cuarentena de Gatekeeper ────
echo -e "  ${BLUE}🔓 Aplicando permisos y firma de seguridad...${NC}"
sudo xattr -cr "/Applications/$APP_NAME"
sudo chmod -R 755 "/Applications/$APP_NAME"

# ─── Desmontar imagen ──────────────────────────────────────
echo -e "  ${BLUE}💿 Desmontando imagen de disco...${NC}"
hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null

# ─── Instalación completada ────────────────────────────────
echo ""
echo -e "  ${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "  ${GREEN}║       ✅  ¡INSTALACIÓN COMPLETADA!           ║${NC}"
echo -e "  ${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}FixManager${NC} está listo en tu carpeta de Aplicaciones."
echo ""
read -p "  ¿Abrir FixManager ahora? (s/n): " OPEN_APP
if [[ "$OPEN_APP" == "s" || "$OPEN_APP" == "S" ]]; then
  open "/Applications/$APP_NAME"
fi
echo ""
echo "  Presiona Enter para cerrar..."
read
