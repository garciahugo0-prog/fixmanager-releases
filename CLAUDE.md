# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server + Electron (HMR activo)
npm run build        # Build Vite para producción
npm run build:mac    # Build + empaqueta .dmg universal para macOS
npm run build:win    # Build + empaqueta .exe instalador para Windows
npm run lint         # tsc --noEmit (verificación de tipos, sin emitir archivos)
```

No hay suite de tests. La verificación de correctitud se hace con `npx tsc --noEmit`.

## Arquitectura

**App Electron desktop-only** — sin soporte móvil. Todo el layout es fijo para pantalla de escritorio. No usar clases responsivas (`sm:`, `md:`, `lg:`).

### Capas

```
electron/main.js      — Proceso principal: ventana, licencias, IPC handlers, impresión silenciosa
electron/preload.js   — Bridge contextBridge → expone window.electronAPI al renderer
src/App.tsx           — Raíz React: todo el estado global, handlers, persistencia
src/components/       — Vistas y modales
src/hooks/            — usePosLogic.ts (toda la lógica del POS)
src/types.ts          — Todos los tipos compartidos
src/utils/            — ticketBuilder, telegram, phoneFormatter
```

### Persistencia

Todo se guarda en `localStorage` con el prefijo `fixmanager_`. No hay base de datos ni backend. Las claves principales son:

- `fixmanager_orders` — órdenes de reparación
- `fixmanager_config` — WorkshopConfig
- `fixmanager_users` — AppUser[]
- `fixmanager_sales`, `fixmanager_expenses`, `fixmanager_services`, `fixmanager_inventory`
- `fixmanager_is_caja_open` — estado de sesión de caja

### Flujo de datos

`App.tsx` mantiene todo el estado con `useState`. Los componentes hijos reciben handlers como props (`onUpdateOrder`, `onDeliverOrder`, etc.). No hay Context ni Redux.

### IPC Electron

El renderer accede a funciones nativas vía `window.electronAPI` (definido en preload.js). Las más usadas:

- `silentPrintHtml({ html, deviceName, paperWidthMicrons })` — impresión silenciosa sin diálogo
- `getMachineId()` / `getLicense()` / `activateLicense()` — sistema de licencias HMAC
- `sendTelegram(url, body)` — notificaciones Telegram

### Sistema de temas

`WorkshopConfig.theme` controla el tema visual: `'modern'` (dark), `'retro-window'`, `'fluent'` (light). Los componentes usan tres booleanos derivados:

```tsx
const isRetro = config.theme === 'retro-window';
const isLight = config.theme === 'fluent';
// dark = !isRetro && !isLight
```

Los headers de modales usan siempre azul unificado:
- Retro: `bg-[#000080]`
- Light: `bg-[#1a3a6b]`  
- Dark: `bg-[#11131e]`

### Órdenes de reparación

El tipo `RepairOrder.status` admite: `'En Reparación' | 'Listo' | 'Entregado' | 'Entregado y Pagado' | 'Fallido' | 'Cancelado'`

Los estados `'Pendiente'` y `'Diagnóstico'` están en proceso de eliminación — no crear código nuevo que los use.

Las órdenes grupales usan `batchId` (formato `BATCH-{timestamp}`) para agrupar múltiples equipos del mismo cliente. Funciones clave en `OrdenesView.tsx`: `getBatchStatus`, `getBatchSaldo`, `getBatchStatusBreakdown`.

### Pagos mixtos

El tipo `PaymentAmounts = Partial<Record<'Efectivo'|'Tarjeta'|'Transferencia', string>>` permite cobros con múltiples métodos simultáneos. El componente `MixedPaymentSelector` (al final de `OrdenesView.tsx`) maneja la UI de cobro — mimifica el estilo del POS.

### Impresión de tickets

Los tickets se generan como HTML string inline y se envían a `silentPrintHtml`. El ancho del papel viene de `config.ticketPaperWidth` (`'58mm'` | `'80mm'`). El helper `buildTicketHtml` en `src/utils/ticketBuilder.ts` genera tickets individuales; los tickets grupales y de entrega se generan inline en `OrdenesView.tsx`.

### POS

La lógica completa del POS vive en `src/hooks/usePosLogic.ts`. Los tres temas de POS (`PosModern`, `PosRetro`, `PosFluent`) importan el mismo hook y solo difieren en UI.

### Roles y permisos

`AppUser.role` es `'admin' | 'employee'`. Los permisos granulares están en `UserPermissions` y se verifican vía `currentUser.permissions.canManageOrders`, etc. El campo `canManage` en `OrdenesView` es `!currentUser || currentUser.permissions.canManageOrders`.

### Configuración del taller

`WorkshopConfig` en `types.ts` es la fuente de verdad de toda la configuración. Se está agregando `workshopMode: 'personal' | 'team'` para distinguir talleres con un solo técnico (dueño) vs múltiples técnicos.
