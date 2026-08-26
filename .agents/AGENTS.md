# Reglas de Comportamiento del Workspace / Workspace Behavior Rules

## ⚠️ Aislamiento de Perfiles de Impresora / Printer Profile Isolation (¡CRÍTICO / CRITICAL!)

Los perfiles de impresora térmica en `PRINTER_PRESETS_DATABASE` (en [SecondaryViews.tsx](file:///Users/hugogarciasanchez/Desktop/Fixmanager-electron_v1.65.0/src/components/SecondaryViews.tsx)) y la lógica de impresión en [main.js](file:///Users/hugogarciasanchez/Desktop/Fixmanager-electron_v1.65.0/electron/main.js) y [ticketBuilder.ts](file:///Users/hugogarciasanchez/Desktop/Fixmanager-electron_v1.65.0/src/utils/ticketBuilder.ts) están calibrados para modelos específicos. 

### Reglas obligatorias:
1. **No Generalizar Cambios**: NUNCA modifiques las reglas de normalización física o márgenes de forma general en `main.js` para corregir la alineación o comportamiento de una impresora en particular. Cualquier cambio general de 80mm o 58mm puede descalibrar otras marcas.
2. **Aislamiento por ID**: Si una impresora específica (como la `star-tsp100` o la `xprinter-xp-n160ii`) requiere un comportamiento especial en el driver físico o en el lienzo digital, debes aislar la lógica estrictamente utilizando su identificador único de perfil (`selectedPrinterProfileId`).
3. **No Reducir Lienzo HTML**: Mantener los lienzos de renderizado en `80mm` siempre que sea posible para permitir el escalado automático de Chromium hacia los drivers físicos, a menos que el perfil indique explícitamente lo contrario.
4. **Verificación**: Siempre realiza un análisis detallado del impacto en otros perfiles antes de modificar archivos de impresión.

---

The thermal printer profiles in `PRINTER_PRESETS_DATABASE` and the printing logic in `main.js` and `ticketBuilder.ts` are calibrated for specific hardware models.

### Mandatory Rules:
1. **No Generalized Changes**: NEVER modify general page size normalization or margins in `main.js` to fix the behavior of a single printer model. General changes to 80mm or 58mm can break calibration for other brands.
2. **Isolate by ID**: If a specific printer (such as `star-tsp100` or `xprinter-xp-n160ii`) requires custom physical sizes or margins, isolate this logic strictly using its unique profile identifier (`selectedPrinterProfileId`).
3. **Keep HTML Canvas at 80mm**: Keep the HTML rendering canvas at `80mm` for standard receipts, letting Chromium scale it down automatically to the physical driver limits, unless the profile explicitly requires a different layout width.
4. **Verification**: Always run a thorough impact analysis on other printer profiles before modifying printing files.
