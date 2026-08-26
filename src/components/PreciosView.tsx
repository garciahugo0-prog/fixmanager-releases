/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Tags, DollarSign, Search, Plus, Edit, Trash2, Printer, X,
  Smartphone, Laptop, Tablet, Monitor, HelpCircle, CheckCircle, RefreshCw,
  FileDown, Upload, Calendar, ArrowRight, ShieldCheck, Tag, Info, AlertTriangle
} from 'lucide-react';
import {
  ServicePrice, WorkshopConfig, RepairOrder, ActiveTab
} from '../types';
import { DEFAULT_OFFLINE_MODELS } from '../data';
import { buildA4ReportHtml, printA4Report, showToast, notifyDone } from '../utils/a4Reports';
import * as XLSX from 'xlsx';

const formatDateToDMY = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDate.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/* ==========================================================
   1. PRECIOS VIEW
   ========================================================== */
export interface PreciosViewProps {
  services: ServicePrice[];
  config: WorkshopConfig;
  orders?: import('../types').RepairOrder[];
  onAddService: (service: ServicePrice) => void;
  onUpdateService: (service: ServicePrice) => void;
  onDeleteService: (id: string) => void;
  onUpdateConfig?: (c: WorkshopConfig) => void;
  setActiveTab: (tab: ActiveTab) => void;
  initialTab?: 'services' | 'devices';
}
export function PreciosView({ services, config, orders = [], onAddService, onUpdateService, onDeleteService, onUpdateConfig, setActiveTab, initialTab = 'services' }: PreciosViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  // ── Tab switcher ──────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<'services' | 'devices'>(initialTab);

  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [price, setPrice] = useState<number | string>(0);
  const [cost, setCost] = useState<number | string>(0);
  const [duration, setDuration] = useState<number>(30);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingSvcId, setEditingSvcId] = useState<string | null>(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const svcPriceRef = useRef<HTMLInputElement>(null);
  const svcCostRef = useRef<HTMLInputElement>(null);
  const svcDurationRef = useRef<HTMLInputElement>(null);
  const devModelRef = useRef<HTMLInputElement>(null);
  const devCodeRef = useRef<HTMLInputElement>(null);
  const devTypeRef = useRef<HTMLSelectElement>(null);

  // ── Device models state ───────────────────────────────────────────
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
  const [devBrand, setDevBrand] = useState('');
  const [devModel, setDevModel] = useState('');
  const [devModelNumber, setDevModelNumber] = useState('');
  const [devType, setDevType] = useState<'Phone' | 'Tablet' | 'Laptop' | 'Desktop' | 'Other'>('Phone');
  const [editingDevIdx, setEditingDevIdx] = useState<number | null>(null);
  const [deviceFeedback, setDeviceFeedback] = useState<string | null>(null);
  const [originalDevToEdit, setOriginalDevToEdit] = useState<{ brand: string; model: string } | null>(null);
  const [isImportingTop100, setIsImportingTop100] = useState(false);

  // Unified device list: historical from orders + custom catalog + system offline catalog (excluded entries hidden)
  const deviceCatalog = React.useMemo(() => {
    const allCustom = config.customDeviceModels || [];
    const excluded = new Set(
      allCustom.filter((d: any) => d._excluded).map((d: any) => `${d.brand}|${d.model}`)
    );
    const custom: { brand: string; model: string; type: string; source: 'custom' | 'system' | 'history'; idx: number | null }[] =
      allCustom
        .map((d, i) => ({ ...d, source: 'custom' as const, idx: i }))
        .filter((d: any) => !d._excluded);

    const systemRaw = (DEFAULT_OFFLINE_MODELS || []).map(m => ({
      brand: m.brand,
      model: m.model,
      modelNumber: m.modelNumber,
      type: m.type,
      source: 'system' as const,
      idx: null
    }));

    const historicalRaw = orders
      .filter(o => o.deviceBrand && o.deviceModel)
      .map(o => ({ brand: o.deviceBrand, model: o.deviceModel, modelNumber: o.deviceModelNumber, type: o.deviceType || 'Phone', source: 'history' as const, idx: null }));

    const customKeys = new Set(custom.map(d => `${d.brand}|${d.model}`));

    // Deduplicate system models against custom and excluded models
    const uniqueSystem = systemRaw.filter(d => !customKeys.has(`${d.brand}|${d.model}`) && !excluded.has(`${d.brand}|${d.model}`));
    const systemKeys = new Set(uniqueSystem.map(d => `${d.brand}|${d.model}`));

    // Deduplicate history entries against custom, system, and excluded models
    const history = historicalRaw.filter(d =>
      !customKeys.has(`${d.brand}|${d.model}`) &&
      !systemKeys.has(`${d.brand}|${d.model}`) &&
      !excluded.has(`${d.brand}|${d.model}`)
    );

    const seenHistory = new Set<string>();
    const uniqueHistory = history.filter(d => {
      const key = `${d.brand}|${d.model}`;
      if (seenHistory.has(key)) return false;
      seenHistory.add(key);
      return true;
    });

    return [...custom, ...uniqueSystem, ...uniqueHistory];
  }, [config.customDeviceModels, orders]);

  const filteredDevices = React.useMemo(() =>
    deviceCatalog.filter(d =>
      d.brand.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
      d.model.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
      d.type.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
      ((d as any).modelNumber || '').toLowerCase().includes(deviceSearchTerm.toLowerCase())
    ), [deviceCatalog, deviceSearchTerm]);

  const handleSaveDevice = () => {
    if (!devBrand.trim() || !devModel.trim()) return;
    const current = (config.customDeviceModels ? [...config.customDeviceModels] : []) as any[];
    const normalizedBrand = devBrand.trim().toLowerCase();
    const normalizedModel = devModel.trim().toLowerCase();

    if (editingDevIdx !== null) {
      // Editing an existing custom entry by index
      current[editingDevIdx] = { brand: devBrand.trim(), model: devModel.trim(), modelNumber: devModelNumber.trim() || undefined, type: devType };
      
      // Remove any other matching _excluded records to prevent duplicate database pollution
      const cleaned = current.filter((d: any, idx: number) => {
        if (idx === editingDevIdx) return true;
        const matchesNewName = d.brand.toLowerCase() === normalizedBrand && d.model.toLowerCase() === normalizedModel;
        if (matchesNewName && d._excluded) return false;
        return true;
      });
      onUpdateConfig?.({ ...config, customDeviceModels: cleaned });
      setDeviceFeedback(`Modelo "${devModel}" actualizado.`);
    } else {
      if (originalDevToEdit) {
        // Exclude the original model and add the newly edited custom model
        // Filter out any existing excluded marker for the new name first to prevent duplicates
        const nextList = current.filter((d: any) => !(d._excluded && d.brand.toLowerCase() === normalizedBrand && d.model.toLowerCase() === normalizedModel));
        nextList.push({ brand: originalDevToEdit.brand, model: originalDevToEdit.model, type: devType, _excluded: true });
        nextList.push({ brand: devBrand.trim(), model: devModel.trim(), modelNumber: devModelNumber.trim() || undefined, type: devType });
        onUpdateConfig?.({ ...config, customDeviceModels: nextList });
        setDeviceFeedback(`Modelo "${devModel}" actualizado.`);
      } else {
        // Adding new entry
        // First check if there is a matching excluded entry to restore it
        const excludedIdx = current.findIndex((d: any) => d._excluded && d.brand.toLowerCase() === normalizedBrand && d.model.toLowerCase() === normalizedModel);
        if (excludedIdx !== -1) {
          current[excludedIdx] = { brand: devBrand.trim(), model: devModel.trim(), modelNumber: devModelNumber.trim() || undefined, type: devType };
          onUpdateConfig?.({ ...config, customDeviceModels: current });
          setDeviceFeedback(`"${devBrand} ${devModel}" guardado en el catálogo.`);
        } else {
          const dup = current.find((d: any) => !d._excluded && d.brand.toLowerCase() === normalizedBrand && d.model.toLowerCase() === normalizedModel);
          if (dup) { setDeviceFeedback(`Ya existe "${devBrand} ${devModel}" en el catálogo.`); return; }
          current.push({ brand: devBrand.trim(), model: devModel.trim(), modelNumber: devModelNumber.trim() || undefined, type: devType });
          onUpdateConfig?.({ ...config, customDeviceModels: current });
          setDeviceFeedback(`"${devBrand} ${devModel}" guardado en el catálogo.`);
        }
      }
    }
    setDevBrand(''); setDevModel(''); setDevModelNumber(''); setDevType('Phone'); setEditingDevIdx(null); setOriginalDevToEdit(null);
    setShowDeviceModal(false);
    setTimeout(() => setDeviceFeedback(null), 3000);
  };

  const handleStartEditDevice = (brand: string, model: string, type: string, idx: number | null, modelNumber?: string) => {
    setDevBrand(brand); setDevModel(model);
    setDevModelNumber(modelNumber || '');
    setDevType(type as any); setEditingDevIdx(idx);
    setOriginalDevToEdit(idx === null ? { brand, model } : null);
    setShowDeviceModal(true);
  };

  const handleDeleteDevice = (idx: number | null, label: string, brand: string, model: string) => {
    setModalDialog({
      type: 'confirm',
      title: 'Eliminar Modelo',
      message: idx !== null
        ? `¿Eliminar "${label}" del catálogo? Esta acción no puede deshacerse.`
        : `"${label}" es un modelo predeterminado o del historial. Si lo eliminas del catálogo de sugerencias se guardará como excluido, pero las órdenes existentes no se modifican. ¿Continuar?`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        if (idx !== null) {
          // Custom entry — remove from array
          const current = [...(config.customDeviceModels || [])];
          current.splice(idx, 1);
          onUpdateConfig?.({ ...config, customDeviceModels: current });
          if (editingDevIdx === idx) { setDevBrand(''); setDevModel(''); setDevType('Phone'); setEditingDevIdx(null); }
        } else {
          // History entry — add as "excluded" marker so it no longer auto-suggests
          const current = [...(config.customDeviceModels || [])];
          // Add with special flag so historyRaw deduplication removes it from display
          current.push({ brand, model, type: devType, _excluded: true } as any);
          onUpdateConfig?.({ ...config, customDeviceModels: current });
        }
        setDeviceFeedback('Modelo eliminado del catálogo.');
        setTimeout(() => setDeviceFeedback(null), 3000);
        setModalDialog(null);
      }
    });
  };
  const handleImportTop100 = async () => {
    console.log('[handleImportTop100] Button clicked, setting isImporting = true');
    setIsImportingTop100(true);
    try {
      const api = (window as any).electronAPI;
      console.log('[handleImportTop100] electronAPI status:', !!api, 'getTopDevices status:', !!api?.getTopDevices);
      if (api?.getTopDevices) {
        const topDevices = await api.getTopDevices();
        console.log('[handleImportTop100] getTopDevices returned:', topDevices?.length, 'items');
        if (Array.isArray(topDevices) && topDevices.length > 0) {
          const current = (config.customDeviceModels ? [...config.customDeviceModels] : []) as any[];
          console.log('[handleImportTop100] Current catalog count:', current.length);
          
          let addedCount = 0;
          topDevices.forEach((device: any) => {
            const brandNorm = device.brand.trim().toLowerCase();
            const modelNorm = device.model.trim().toLowerCase();
            
            const exists = current.some((d: any) => d.brand.toLowerCase() === brandNorm && d.model.toLowerCase() === modelNorm);
            if (!exists) {
              current.push({
                brand: device.brand.trim().toUpperCase(),
                model: device.model.trim().toUpperCase(),
                modelNumber: device.modelNumber ? device.modelNumber.trim().toUpperCase() : undefined,
                type: device.type || 'Phone'
              });
              addedCount++;
            }
          });
          
          console.log('[handleImportTop100] addedCount:', addedCount, 'updating config customDeviceModels...');
          onUpdateConfig?.({ ...config, customDeviceModels: current });
          setDeviceFeedback(`Se importaron ${addedCount} nuevos modelos al catálogo.`);
          notifyDone(`✅ Catálogo nutrido con ${addedCount} modelos nuevos.`);
        } else {
          console.log('[handleImportTop100] topDevices is empty or not an array:', topDevices);
          showToast('⚠️ No se pudo obtener la lista de modelos.');
        }
      } else {
        console.log('[handleImportTop100] api.getTopDevices is missing');
        showToast('⚠️ API no disponible en esta plataforma.');
      }
    } catch (err) {
      console.error('[handleImportTop100] Caught error:', err);
      showToast('⚠️ Error al descargar el catálogo.');
    } finally {
      console.log('[handleImportTop100] finally block running, setting isImporting = false');
      setIsImportingTop100(false);
      setTimeout(() => setDeviceFeedback(null), 3000);
    }
  };

  // General custom themed dialog/alert state to replace native browser window.confirm & alert
  const [modalDialog, setModalDialog] = useState<{
    type: 'error' | 'warning' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  } | null>(null);

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartEdit = (svc: ServicePrice) => {
    setEditingSvcId(svc.id);
    setName(svc.name);
    setCategory(svc.category);
    setPrice(svc.price);
    setCost(svc.cost || 0);
    setDuration(svc.durationMinutes);
    setShowServiceModal(true);
  };

  const handleCancelEdit = () => {
    setEditingSvcId(null);
    setName('');
    setCategory('Pantalla');
    setPrice(0);
    setCost(0);
    setDuration(30);
    setShowServiceModal(false);
  };

  const handleDelete = (id: string, svcName: string) => {
    setModalDialog({
      type: 'confirm',
      title: 'Eliminar Tarifa',
      message: `¿Está absolutamente seguro de que desea eliminar la tarifa para "${svcName}"? Esta acción se aplicará inmediatamente y no se puede deshacer.`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        onDeleteService(id);
        setFeedback(`¡Servicio "${svcName}" eliminado con éxito!`);
        if (editingSvcId === id) {
          handleCancelEdit();
        }
        setTimeout(() => setFeedback(null), 3005);
      }
    });
  };

  const executeSave = (isEdit: boolean, svcId: string | null, sName: string, sCategory: string, sPrice: number, sCost: number, sDuration: number) => {
    if (isEdit && svcId) {
      const updatedSvc: ServicePrice = {
        id: svcId,
        name: sName,
        category: sCategory,
        price: sPrice,
        cost: sCost,
        durationMinutes: sDuration,
        popularity: services.find(s => s.id === svcId)?.popularity || 5
      };
      onUpdateService(updatedSvc);
      setFeedback(`¡Tarifa de "${sName}" actualizada con éxito!`);
      handleCancelEdit();
    } else {
      const newSvc: ServicePrice = {
        id: `S${services.length + 1}-${Date.now()}`,
        name: sName,
        category: sCategory,
        price: sPrice,
        cost: sCost,
        durationMinutes: sDuration,
        popularity: 5
      };
      onAddService(newSvc);
      setFeedback(`¡Servicio "${sName}" registrado exitosamente!`);
      setName('');
      setPrice(0);
      setCost(0);
      setDuration(30);
    }
    setTimeout(() => setFeedback(null), 3000);
    setModalDialog(null);
    setShowServiceModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(price);
    const numericCost = Number(cost) || 0;
    if (!name || isNaN(numericPrice) || numericPrice < 0 || isNaN(numericCost) || numericCost < 0) return;

    const lowercaseName = name.toLowerCase().trim();
    
    // 1. Exact duplicate name check
    const exactMatch = services.find(s => 
      s.id !== editingSvcId && s.name.toLowerCase().trim() === lowercaseName
    );
    if (exactMatch) {
      setModalDialog({
        type: 'error',
        title: 'Error de Duplicación',
        message: `No se puede registrar este servicio.\n\nYa existe una tarifa exactamente igual registrada como "${exactMatch.name}" con un precio de ${config.currencySymbol}${exactMatch.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.\n\nPara evitar redundancia de catálogo, por favor cambie el nombre del servicio o edite la tarifa existente.`
      });
      return;
    }

    // 2. Similar/partial duplicate name check
    const similarMatch = services.find(s => {
      if (s.id === editingSvcId) return false;
      const sName = s.name.toLowerCase().trim();
      return sName.includes(lowercaseName) || lowercaseName.includes(sName);
    });
    if (similarMatch) {
      setModalDialog({
        type: 'warning',
        title: 'Advertencia de Similitud',
        message: `¡Atención! Se detectó un servicio con nombre parecido ya registrado en su catálogo:\n\n• Existente: "${similarMatch.name}"_ (${config.currencySymbol}${similarMatch.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n• Nuevo: "${name}"_ (${config.currencySymbol}${numericPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n\n¿Está de acuerdo en registrar este nuevo servicio a pesar de la similitud?`,
        confirmText: 'Sí, Registrar',
        cancelText: 'No, Cancelar',
        onConfirm: () => executeSave(!!editingSvcId, editingSvcId, name, category, numericPrice, numericCost, duration)
      });
      return;
    }

    // No exact or similar match, proceed instantly
    executeSave(!!editingSvcId, editingSvcId, name, category, numericPrice, numericCost, duration);
  };

  const deviceTypeIcon = (t: string) => ({ Phone: '📱', Tablet: '📟', Laptop: '💻', Desktop: '🖥️', Other: '🔧' }[t] || '🔧');

  return (
    <div 
      className={`flex-1 p-4 md:p-6 overflow-y-auto space-y-6 select-none ${
        isRetro
          ? 'bg-[#eaeef3] text-black font-sans'
          : isLight
            ? 'bg-[#eaeef3] text-zinc-900 font-sans'
            : 'bg-[#0c0c0e] text-gray-200'
      }`}
      style={isLight ? { backgroundColor: '#eaeef3' } : undefined}
    >
      {/* ── Header + Tab switcher ─────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
        isRetro ? 'border-b-[#808080]' : isLight ? 'border-b-zinc-200' : 'border-b-[#1c1d22]'
      }`}>
        <h3 className={`text-sm font-black tracking-wider flex items-center gap-2 ${
          isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-800' : 'text-amber-500 font-display'
        }`}>
          {mainTab === 'services'
            ? <><Tags className="w-5 h-5" /> CATÁLOGO DE PRECIOS</>
            : <><Smartphone className="w-5 h-5" /> HISTORIAL DE EQUIPOS</>
          }
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón imprimir reporte */}
          <button
            type="button"
            title="Imprimir un reporte en formato A4 de los registros actuales"
            onClick={() => {
              const sym = config.currencySymbol || '$';
              if (mainTab === 'services') {
                if (filtered.length === 0) { showToast('⚠️ No hay servicios en el catálogo para imprimir'); return; }
                const thead = `<thead><tr><th>ID</th><th>Nombre del Servicio</th><th>Duración</th><th>Popularidad</th><th style="text-align:right">Precio</th></tr></thead>`;
                const tbody = `<tbody>${filtered.map(s => `<tr>
                  <td style="font-family:monospace">${s.id}</td>
                  <td>${s.name}</td>
                  <td>${s.durationMinutes} min</td>
                  <td>${'★'.repeat(Math.round((s.popularity || 0) / 2))}${'☆'.repeat(5 - Math.round((s.popularity || 0) / 2))}</td>
                  <td>${sym}${s.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>`).join('')}</tbody>`;
                const avgPrice = filtered.reduce((s, x) => s + x.price, 0) / filtered.length;
                const summary = `
                  <div class="summary-item"><label>Total servicios</label><span>${filtered.length}</span></div>
                  <div class="summary-item"><label>Precio promedio</label><span>${sym}${avgPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div class="summary-item"><label>Precio mínimo</label><span>${sym}${Math.min(...filtered.map(s => s.price)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div class="summary-item"><label>Precio máximo</label><span>${sym}${Math.max(...filtered.map(s => s.price)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                `;
                const html = buildA4ReportHtml('Catálogo de Precios', `${filtered.length} servicio(s) registrados · Filtro: "${searchTerm || 'ninguno'}"`, config.storeName || 'TALLER', thead + tbody, summary);
                printA4Report(html, config.reportPrinterName);
              } else {
                if (filteredDevices.length === 0) { showToast('⚠️ No hay equipos en el catálogo para imprimir'); return; }
                const thead = `<thead><tr><th>Marca</th><th>Modelo</th><th>Número de Modelo</th><th>Tipo</th><th>Origen</th></tr></thead>`;
                const tbody = `<tbody>${filteredDevices.map(d => `<tr>
                  <td>${d.brand}</td>
                  <td>${d.model}</td>
                  <td>${(d as any).modelNumber || '—'}</td>
                  <td>${d.type}</td>
                  <td>${d.source === 'custom' ? 'Catálogo manual' : d.source === 'system' ? 'Base precargada' : 'Historial de órdenes'}</td>
                </tr>`).join('')}</tbody>`;
                const summary = `
                  <div class="summary-item"><label>Total equipos</label><span>${filteredDevices.length}</span></div>
                  <div class="summary-item"><label>Del catálogo</label><span>${filteredDevices.filter(d => d.source === 'custom').length}</span></div>
                  <div class="summary-item"><label>Precargados</label><span>${filteredDevices.filter(d => d.source === 'system').length}</span></div>
                  <div class="summary-item"><label>Del historial</label><span>${filteredDevices.filter(d => d.source === 'history').length}</span></div>
                `;
                const html = buildA4ReportHtml('Historial de Equipos', `${filteredDevices.length} equipo(s) registrados · Filtro: "${deviceSearchTerm || 'ninguno'}"`, config.storeName || 'TALLER', thead + tbody, summary);
                printA4Report(html, config.reportPrinterName);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase transition-all select-none active:scale-95 cursor-pointer ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800'
              : isLight ? 'bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg'
              : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Reporte
          </button>

          {/* Tab pills — solo visibles cuando no viene de la barra lateral separada */}
          {initialTab === undefined && <div className={`flex items-center gap-1 p-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider ${
          isRetro ? 'bg-[#dfdfdf] border border-zinc-400' : isLight ? 'bg-zinc-100 border border-zinc-200' : 'bg-zinc-900 border border-zinc-800'
        }`}>
          {([['services', '🏷️ Servicios'], ['devices', '📱 Modelos de Equipos']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              title={`Ver el listado de ${label}`}
              className={`px-3 py-1 rounded cursor-pointer transition-all ${
                mainTab === key
                  ? isRetro
                    ? 'bg-[#000080] text-white border border-[#000080]'
                    : isLight
                      ? 'bg-white text-amber-700 border border-amber-300 shadow-sm'
                      : 'bg-amber-500 text-black'
                  : isRetro
                    ? 'text-zinc-700 hover:bg-zinc-200'
                    : isLight
                      ? 'text-zinc-500 hover:text-zinc-800'
                      : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>}
        </div>{/* end flex items-center gap-2 */}
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB: SERVICIOS
         ════════════════════════════════════════════════════════════ */}
      {mainTab === 'services' && (<>

      {/* ── Legend card ─────────────────────────────────────────────── */}
      <div className={`p-4 rounded-lg border flex gap-4 items-start ${
        isRetro ? 'bg-[#fffbe6] border-[#c8a000] text-[#5a4000]'
          : isLight ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
      }`}>
        <span className="text-2xl shrink-0 select-none">🏷️</span>
        <div className="space-y-1">
          <p className={`text-[11px] font-black uppercase tracking-wider ${isRetro ? 'text-[#5a4000]' : isLight ? 'text-amber-800' : 'text-amber-400'}`}>
            ¿Para qué sirve este catálogo?
          </p>
          <p className={`text-[11px] leading-relaxed ${isRetro ? 'text-[#6b4f00]' : isLight ? 'text-amber-700' : 'text-amber-200/80'}`}>
            Aquí registras los <strong>precios de tus reparaciones</strong>. Cada tarifa tiene nombre y precio sugerido. Al crear una nueva orden estos precios aparecen como sugerencias en <strong>Nueva Orden → Buscar Servicio</strong>.
          </p>
          <p className={`text-[10px] mt-1 ${isRetro ? 'text-[#8a6500]' : isLight ? 'text-amber-600' : 'text-amber-400/70'}`}>
            💡 Puedes editar o eliminar cualquier tarifa. Los precios no afectan órdenes ya creadas, solo son referencia al capturar nuevas.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 text-xs rounded border ${
          isRetro
            ? 'bg-[#eafaea] border-[#22c55e] text-emerald-950 font-bold'
            : isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400'
        }`}>
          {feedback}
        </div>
      )}

      <div className="space-y-4">
        <div className={
          isRetro
            ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-4 font-sans'
            : isLight
              ? 'bg-[#ffffff] border border-zinc-200 p-4 rounded text-zinc-600 font-sans'
              : 'bg-[#121316] border border-[#1b1c21] p-4 rounded space-y-3'
        }>
          <div className="flex items-center gap-3 mb-3">
            <div className="premium-search-container w-full select-none flex items-center flex-1">
              <div className="flex items-center text-zinc-400 shrink-0">
                <Search className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="w-[1px] h-4 bg-zinc-700/50 mx-3 shrink-0"></div>
              <div className="relative flex-1 flex items-center h-full">
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar tarifa de reparación..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="premium-search-input"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => { handleCancelEdit(); setShowServiceModal(true); }}
              title="Registrar una nueva tarifa de servicio en el catálogo"
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 font-black text-[11px] tracking-wider uppercase cursor-pointer transition-all ${
                isRetro
                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black'
                  : isLight
                    ? 'bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow'
                    : 'bg-amber-500 hover:bg-amber-400 text-black rounded-lg'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Tarifa
            </button>
          </div>

          <div className="flex items-center justify-between px-1 mb-2 select-none">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${
              isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              {searchTerm ? (
                <>Mostrando {filtered.length} de {services.length} servicios</>
              ) : (
                <>Total: {services.length} servicios registrados</>
              )}
            </span>
          </div>

            <div className={`overflow-x-auto rounded border ${
              isRetro 
                ? 'border-[#808080] bg-white'
                : isLight
                  ? 'border-zinc-200 bg-white shadow-sm'
                  : 'border-zinc-900'
            } overflow-y-auto max-h-[500px]`}>
              <table className="w-full text-left text-xs bg-transparent border-collapse">
                <thead className={`sticky top-0 z-10 ${
                  isRetro 
                    ? 'bg-[#000080] text-white font-black uppercase tracking-wider text-[11px] border-b-2 border-b-[#808080]' 
                    : isLight 
                      ? 'bg-zinc-100 border-b border-zinc-200 text-zinc-600 font-bold' 
                      : 'bg-[#101114] text-[10px] text-zinc-400 font-mono'
                }`}>
                  <tr>
                    <th className="p-2.5 pl-4">Servicio</th>
                    <th className="p-2.5 text-right">Costo</th>
                    <th className="p-2.5 text-right">Tarifa</th>
                    <th className="p-2.5 text-right">Ganancia Est.</th>
                    <th className="p-2.5 text-center">Duración</th>
                    <th className="p-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isRetro ? 'divide-zinc-300' : isLight ? 'divide-zinc-200' : 'divide-zinc-700/60'}`}>
                  {filtered.map(x => (
                    <tr key={x.id} className={`transition-all ${
                      isRetro 
                        ? 'hover:bg-[#eaeef3]' 
                        : isLight 
                          ? 'hover:bg-zinc-50' 
                          : 'hover:bg-[#16171d]/50'
                    }`}>
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full opacity-60 ${isRetro ? 'bg-[#000080]' : 'bg-amber-500'}`}></div>
                          <span className={`font-sans font-black text-[12.5px] tracking-wide ${
                            isLight ? 'text-zinc-900' : 'text-white'
                          }`}>{x.name}</span>
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono text-zinc-400 text-sm">
                        {config.currencySymbol}{(x.cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-[#22c55e] text-sm">
                        {config.currencySymbol}{x.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-blue-500 text-sm">
                        {config.currencySymbol}{(x.price - (x.cost || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] ${
                          isRetro 
                            ? 'bg-[#dfdfdf] border border-zinc-400 text-zinc-800' 
                            : isLight 
                              ? 'bg-zinc-50 border border-zinc-200 text-zinc-500'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                        }`}>
                          {x.durationMinutes} min
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(x)}
                            className={`p-1 transition-all cursor-pointer active:scale-95 ${
                              isRetro
                                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black hover:bg-zinc-200 rounded-none'
                                : isLight
                                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 rounded'
                                  : 'rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            }`}
                            title="Modificar precio y duración de este servicio"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(x.id, x.name)}
                            className={`p-1 transition-all cursor-pointer active:scale-95 ${
                              isRetro
                                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-red-700 hover:bg-red-100 rounded-none'
                                : isLight
                                  ? 'bg-red-50 hover:bg-red-105 text-red-650 border border-red-200 rounded'
                                  : 'rounded bg-red-950/20 hover:bg-red-950/65 text-red-100 border border-red-500/10 hover:border-red-500/25'
                            }`}
                            title="Eliminar esta tarifa de servicio de manera definitiva"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {/* ── Modal: Registrar / Editar Tarifa ── */}
      {showServiceModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => handleCancelEdit()}>
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
          <form
            onSubmit={handleSubmit}
            className={`relative z-10 w-full max-w-sm p-6 space-y-4 ${
              isRetro
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,0.4)]'
                : isLight
                  ? 'bg-slate-200/90 border border-slate-300 text-zinc-900 rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.3)] backdrop-blur-md'
                  : 'bg-[#121316]/90 border border-[#2a2b32] rounded-2xl shadow-2xl backdrop-blur-md'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                isRetro ? 'text-blue-900' : isLight ? 'text-amber-700' : 'text-amber-400'
              }`}>
                {editingSvcId ? <><Edit className="w-4 h-4" /> Editar Tarifa</> : <><Plus className="w-4 h-4" /> Registrar Tarifa</>}
              </h4>
              <button type="button" onClick={() => handleCancelEdit()} title="Cerrar esta ventana" className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>Nombre de Reparación</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Cambio de pantalla, Batería..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); svcCostRef.current?.focus(); svcCostRef.current?.select(); } }}
                className={`w-full focus:outline-none px-2.5 py-2 text-xs ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black rounded-none font-mono font-bold' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 rounded-lg focus:border-amber-500' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 rounded-lg text-white font-mono'}`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>Costo / Compra ({config.currencySymbol})</label>
              <input
                ref={svcCostRef}
                type="number"
                min={0}
                value={cost === 0 ? 0 : (cost || '')}
                onFocus={e => e.target.select()}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); svcPriceRef.current?.focus(); svcPriceRef.current?.select(); } }}
                onChange={e => setCost(e.target.value === '' ? '' : (Number(e.target.value) || 0))}
                placeholder="Costo de refacción o insumo"
                className={`w-full focus:outline-none px-2.5 py-2 text-xs font-mono font-bold ${
                  Number(cost) < 0
                    ? isRetro ? 'bg-white border-2 border-red-400 text-red-600 rounded-none' : isLight ? 'bg-white border border-red-300 text-red-600 rounded-lg focus:border-red-500' : 'bg-[#08080a] border border-red-900/60 focus:border-red-500 rounded-lg text-red-500'
                    : isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' : isLight ? 'bg-white border border-zinc-300 text-amber-700 rounded-lg focus:border-amber-500' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 rounded-lg text-amber-500'
                }`}
              />
              {Number(cost) < 0 && (
                <p className="text-[9px] text-red-500 font-bold mt-0.5">⚠ El costo no puede ser negativo</p>
              )}
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>Tarifa ({config.currencySymbol})</label>
              <input
                ref={svcPriceRef}
                type="number"
                min={0}
                value={price === 0 ? 0 : (price || '')}
                onFocus={e => e.target.select()}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); svcDurationRef.current?.focus(); svcDurationRef.current?.select(); } }}
                onChange={e => setPrice(e.target.value === '' ? '' : (Number(e.target.value) || 0))}
                className={`w-full focus:outline-none px-2.5 py-2 text-xs font-mono font-bold ${
                  Number(price) < 0
                    ? isRetro ? 'bg-white border-2 border-red-400 text-red-600 rounded-none' : isLight ? 'bg-white border border-red-300 text-red-600 rounded-lg focus:border-red-500' : 'bg-[#08080a] border border-red-900/60 focus:border-red-500 rounded-lg text-red-500'
                    : isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' : isLight ? 'bg-white border border-zinc-300 text-emerald-700 rounded-lg focus:border-amber-500' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 rounded-lg text-[#22c55e]'
                }`}
              />
              {Number(price) < 0 && (
                <p className="text-[9px] text-red-500 font-bold mt-0.5">⚠ La tarifa no puede ser negativa</p>
              )}
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>Duración (minutos)</label>
              <input
                ref={svcDurationRef}
                type="number"
                min={1}
                value={duration === 0 ? '' : duration}
                onFocus={e => e.target.select()}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).closest('form')?.requestSubmit(); } }}
                onChange={e => setDuration(e.target.value === '' ? 0 : (Number(e.target.value) || 0))}
                placeholder="Ej. 30, 45, 60..."
                className={`w-full focus:outline-none px-2.5 py-2 text-xs font-mono font-bold ${
                  duration <= 0
                    ? isRetro ? 'bg-white border-2 border-red-400 text-red-600 rounded-none' : isLight ? 'bg-white border border-red-300 text-red-600 rounded-lg focus:border-red-500' : 'bg-[#08080a] border border-red-900/60 focus:border-red-500 rounded-lg text-red-500'
                    : isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' : isLight ? 'bg-white border border-zinc-300 text-zinc-700 rounded-lg focus:border-amber-500' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 rounded-lg text-zinc-300'
                }`}
              />
              {duration <= 0 && (
                <p className="text-[9px] text-red-500 font-bold mt-0.5">⚠ La duración debe ser mayor a 0 minutos</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                title="Confirmar y guardar los cambios del servicio en el catálogo"
                disabled={!name.trim() || Number(price) < 0 || Number(cost) < 0 || Number(duration) <= 0}
                className={`flex-1 py-2.5 font-black text-[11px] tracking-wider uppercase transition-all ${
                  !name.trim() || Number(price) < 0 || Number(cost) < 0 || Number(duration) <= 0
                    ? 'opacity-40 cursor-not-allowed bg-zinc-400 border-2 border-zinc-500 text-zinc-600 rounded-none'
                    : isRetro
                      ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white cursor-pointer'
                      : 'bg-amber-500 hover:bg-amber-400 text-black rounded-lg cursor-pointer'
                }`}
              >
                {editingSvcId ? 'Guardar Cambios ✓' : 'Añadir al Listado +'}
              </button>
              <button
                type="button"
                onClick={() => handleCancelEdit()}
                title="Cancelar y descartar cambios"
                className={`px-4 py-2.5 font-bold text-[11px] tracking-wide uppercase cursor-pointer transition-all ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-600'
                    : isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg'
                }`}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      , document.body)}

      </>)}

      {/* ════════════════════════════════════════════════════════════
          TAB: MODELOS DE EQUIPOS
         ════════════════════════════════════════════════════════════ */}
      {mainTab === 'devices' && (<>

      {/* ── Legend card ─────────────────────────────────────────────── */}
      <div className={`p-4 rounded-lg border flex gap-4 items-start ${
        isRetro ? 'bg-[#fffbe6] border-[#c8a000] text-[#5a4000]'
          : isLight ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
      }`}>
        <span className="text-2xl shrink-0 select-none">📋</span>
        <div className="space-y-1">
          <p className={`text-[11px] font-black uppercase tracking-wider ${isRetro ? 'text-[#5a4000]' : isLight ? 'text-amber-800' : 'text-amber-400'}`}>
            ¿Para qué sirve este catálogo?
          </p>
          <p className={`text-[11px] leading-relaxed ${isRetro ? 'text-[#6b4f00]' : isLight ? 'text-amber-700' : 'text-amber-200/80'}`}>
            Aquí se administran todos los <strong>modelos de equipos</strong> que tu taller acepta. Los modelos del historial se generan automáticamente cada vez que creas una orden de servicio. Los que añades manualmente también aparecerán como sugerencias al capturar nuevas órdenes en <strong>Nueva Orden → Buscar Equipo</strong>.
          </p>
          <p className={`text-[10px] mt-1 ${isRetro ? 'text-[#8a6500]' : isLight ? 'text-amber-600' : 'text-amber-400/70'}`}>
            💡 Puedes editar o eliminar cualquier modelo. El <em>Código del Modelo</em> (ej. SM-S928B, A3116) ayuda a identificar variantes de un mismo equipo.
          </p>
        </div>
      </div>

      {deviceFeedback && (
        <div className={`p-3 text-xs rounded border ${
          isRetro ? 'bg-[#eafaea] border-[#22c55e] text-emerald-950 font-bold'
            : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400'
        }`}>
          {deviceFeedback}
        </div>
      )}

      <div className="space-y-3">
        <div className={`${
          isRetro ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-4'
            : isLight ? 'bg-white border border-zinc-200 p-4 rounded'
            : 'bg-[#121316] border border-[#1b1c21] p-4 rounded space-y-3'
        }`}>
          {/* Search + button row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="premium-search-container w-full select-none flex items-center flex-1">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="w-[1px] h-4 bg-zinc-700/50 mx-3 shrink-0"></div>
              <input
                autoFocus
                type="text"
                placeholder="Buscar marca o modelo..."
                value={deviceSearchTerm}
                onChange={e => setDeviceSearchTerm(e.target.value)}
                className="premium-search-input"
              />
            </div>
            <button
              type="button"
              onClick={handleImportTop100}
              disabled={isImportingTop100}
              title="Descarga e incorpora al catálogo los 100 modelos de equipos más populares de la actualidad"
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 font-black text-[11px] tracking-wider uppercase cursor-pointer transition-all active:scale-95 ${
                isRetro
                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black'
                  : isLight
                    ? 'bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow'
                    : 'bg-amber-600 hover:bg-amber-500 text-white rounded-lg'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" /> {isImportingTop100 ? 'Descargando...' : 'Descargar Top 100'}
            </button>
            <button
              type="button"
              onClick={() => { setDevBrand(''); setDevModel(''); setDevModelNumber(''); setDevType('Phone'); setEditingDevIdx(null); setShowDeviceModal(true); }}
              title="Registrar un nuevo modelo de equipo en el catálogo"
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 font-black text-[11px] tracking-wider uppercase cursor-pointer transition-all ${
                isRetro
                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black'
                  : isLight
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg shadow'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>

            {/* Info notice */}
            <div className={`text-[10px] px-2 py-1.5 rounded flex items-center gap-2 mb-2 ${
              isRetro 
                ? isLight ? 'bg-blue-100 border border-blue-300 text-blue-900' : 'bg-blue-950/30 border border-blue-900/50 text-blue-300 font-medium'
                : isLight ? 'bg-blue-50 border border-blue-200 text-blue-700'
                : 'bg-blue-950/20 border border-blue-900/40 text-blue-400'
            }`}>
              <span>ℹ️</span>
              <span>Todos los modelos del catálogo son completamente editables y eliminables. Los del historial y sistema se guardarán de forma automática como personalizados al editarlos, o excluidos al eliminarlos.</span>
            </div>

            <div className="flex items-center justify-between px-1 mb-2 select-none">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                {deviceSearchTerm ? (
                  <>Mostrando {filteredDevices.length} de {deviceCatalog.length} modelos</>
                ) : (
                  <>Total: {deviceCatalog.length} modelos de equipos</>
                )}
              </span>
            </div>

            {/* Table */}
            <div className={`overflow-x-auto rounded border overflow-y-auto max-h-[480px] ${
              isRetro ? 'border-[#808080] bg-white' : isLight ? 'border-zinc-200 bg-white shadow-sm' : 'border-zinc-900'
            }`}>
              <table className="w-full text-left text-xs bg-transparent border-collapse">
                <thead className={`sticky top-0 z-10 ${
                  isRetro ? 'bg-[#000080] text-white font-black uppercase tracking-wider text-[11px]'
                    : isLight ? 'bg-zinc-100 border-b border-zinc-200 text-zinc-600 font-bold'
                    : 'bg-[#101114] text-[10px] text-zinc-400 font-mono'
                }`}>
                  <tr>
                    <th className="p-2.5 pl-4">Marca / Modelo</th>
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5 text-center">Origen</th>
                    <th className="p-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isRetro ? 'divide-zinc-300' : isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`p-6 text-center text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        {orders.length === 0 && (config.customDeviceModels || []).length === 0
                          ? 'No hay modelos registrados aún. Crea tu primera orden de servicio o añade modelos manualmente.'
                          : 'Sin resultados para esa búsqueda.'}
                      </td>
                    </tr>
                  ) : filteredDevices.map((d, i) => (
                    <tr key={`${d.brand}|${d.model}|${i}`} className={`transition-all ${
                      isRetro ? 'hover:bg-[#eaeef3]' : isLight ? 'hover:bg-zinc-50' : 'hover:bg-[#16171d]/50'
                    }`}>
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{deviceTypeIcon(d.type)}</span>
                          <div>
                            <div className={`font-black text-[12px] ${isLight ? 'text-zinc-900' : 'text-white'}`}>{d.brand}</div>
                            <div className={`text-[10px] font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{d.model}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {(d as any).modelNumber ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            isRetro ? 'bg-white border-zinc-400 text-zinc-700'
                              : isLight ? 'bg-zinc-50 border-zinc-300 text-zinc-600'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                          }`}>{(d as any).modelNumber}</span>
                        ) : (
                          <span className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-700'}`}>—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          isRetro ? 'bg-[#dfdfdf] border-zinc-400 text-zinc-800'
                            : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                        }`}>{d.type}</span>
                      </td>
                      <td className="p-3 text-center">
                        {d.source === 'custom' ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isRetro ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                              : isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-emerald-900/20 border-emerald-700/40 text-emerald-400'
                          }`}>Manual</span>
                        ) : d.source === 'system' ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isRetro ? 'bg-blue-105 border-blue-300 text-[#000080]'
                              : isLight ? 'bg-blue-50 border-blue-200 text-blue-750'
                              : 'bg-blue-900/20 border-blue-800/40 text-blue-400'
                          }`}>Sistema</span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isRetro ? 'bg-zinc-100 border-zinc-300 text-zinc-505'
                              : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-400'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                          }`}>Historial</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEditDevice(d.brand, d.model, d.type, d.idx, (d as any).modelNumber)}
                            title="Modificar los datos de este modelo de equipo"
                            className={`p-1 transition-all cursor-pointer active:scale-95 ${
                              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black hover:bg-zinc-200 rounded-none'
                                : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 rounded'
                                : 'rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            }`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(d.idx, `${d.brand} ${d.model}`, d.brand, d.model)}
                            className={`p-1 transition-all cursor-pointer active:scale-95 ${
                              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-red-700 hover:bg-red-100 rounded-none'
                                : isLight ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded'
                                : 'rounded bg-red-950/20 hover:bg-red-950/65 text-red-400 border border-red-500/10 hover:border-red-500/25'
                            }`}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {/* ── Modal: Agregar / Editar Equipo ── */}
      {showDeviceModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => { setShowDeviceModal(false); setEditingDevIdx(null); }}>
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
          <div
            className={`relative z-10 w-full max-w-md p-6 space-y-4 ${
              isRetro
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,0.4)]'
                : isLight
                  ? 'bg-slate-200/90 border border-slate-300 text-zinc-900 rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.3)] backdrop-blur-md'
                  : 'bg-[#121316]/90 border border-[#2a2b32] rounded-2xl shadow-2xl backdrop-blur-md'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                isRetro ? 'text-blue-900' : isLight ? 'text-cyan-700' : 'text-cyan-400'
              }`}>
                {editingDevIdx !== null ? <><Edit className="w-4 h-4" /> Editar Modelo</> : <><Plus className="w-4 h-4" /> Agregar Modelo</>}
              </h4>
              <button type="button" onClick={() => { setShowDeviceModal(false); setEditingDevIdx(null); }} title="Cerrar esta ventana" className="text-zinc-400 hover:text-zinc-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>Marca</label>
              <input
                type="text"
                autoFocus
                placeholder="Ej. Samsung, Apple, Motorola..."
                value={devBrand}
                onChange={e => setDevBrand(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); devModelRef.current?.focus(); } }}
                className={`w-full focus:outline-none px-2.5 py-2 text-xs ${
                  isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black rounded-none font-mono font-bold'
                    : isLight ? 'bg-white border border-zinc-300 text-zinc-900 rounded-lg focus:border-cyan-500'
                    : 'bg-[#08080a] border border-[#2d2f36] focus:border-cyan-500 rounded-lg text-white font-mono'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>Modelo</label>
              <input
                ref={devModelRef}
                type="text"
                placeholder="Ej. Galaxy S24 Ultra, iPhone 15 Pro..."
                value={devModel}
                onChange={e => setDevModel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); devCodeRef.current?.focus(); } }}
                className={`w-full focus:outline-none px-2.5 py-2 text-xs ${
                  isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black rounded-none font-mono font-bold'
                    : isLight ? 'bg-white border border-zinc-300 text-zinc-900 rounded-lg focus:border-cyan-500'
                    : 'bg-[#08080a] border border-[#2d2f36] focus:border-cyan-500 rounded-lg text-white font-mono'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>
                Código del Modelo <span className={`normal-case font-normal ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>(opcional)</span>
              </label>
              <input
                ref={devCodeRef}
                type="text"
                placeholder="Ej. SM-S928B, A3116, XT2343-1..."
                value={devModelNumber}
                onChange={e => setDevModelNumber(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); devTypeRef.current?.focus(); } }}
                className={`w-full focus:outline-none px-2.5 py-2 text-xs ${
                  isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black rounded-none font-mono font-bold'
                    : isLight ? 'bg-white border border-zinc-300 text-zinc-900 rounded-lg focus:border-cyan-500'
                    : 'bg-[#08080a] border border-[#2d2f36] focus:border-cyan-500 rounded-lg text-white font-mono'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>Tipo de Dispositivo</label>
              <select
                ref={devTypeRef}
                value={devType}
                onChange={e => setDevType(e.target.value as any)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (devBrand.trim() && devModel.trim()) handleSaveDevice(); } }}
                className={`w-full focus:outline-none px-2.5 py-2 text-xs ${
                  isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black rounded-none font-sans font-bold'
                    : isLight ? 'bg-white border border-zinc-300 text-zinc-900 rounded-lg focus:border-cyan-500'
                    : 'bg-[#08080a] border border-[#2d2f36] focus:border-cyan-500 rounded-lg text-white font-sans'
                }`}
              >
                <option value="Phone">📱 Teléfono</option>
                <option value="Tablet">📟 Tablet</option>
                <option value="Laptop">💻 Laptop</option>
                <option value="Desktop">🖥️ Desktop / PC</option>
                <option value="Other">🔧 Otro</option>
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveDevice}
                disabled={!devBrand.trim() || !devModel.trim()}
                title="Confirmar y guardar los cambios del modelo en el catálogo"
                className={`flex-1 py-2.5 font-black text-[11px] tracking-wider uppercase cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg'
                }`}
              >
                {editingDevIdx !== null ? 'Guardar Cambios ✓' : 'Agregar al Catálogo +'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeviceModal(false); setEditingDevIdx(null); }}
                title="Cancelar y descartar cambios"
                className={`px-4 py-2.5 font-bold text-[11px] tracking-wide uppercase cursor-pointer transition-all ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-600'
                    : isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg'
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      </>)}

      {/* DIÁLOGO INTERACTIVO PERSONALIZADO PARA ALERTAS/CONFIRMACIONES */}
      {modalDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`${
            isRetro
              ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 w-full max-w-md shadow-[6px_6px_15px_rgba(0,0,0,0.6)] text-black font-sans'
              : isLight
                ? 'bg-white border border-zinc-200 w-full max-w-md rounded-2xl shadow-2xl text-zinc-950 font-sans'
                : 'bg-[#121316] border border-[#1b1c21] w-full max-w-md rounded-2xl shadow-2xl text-zinc-100'
          } flex flex-col overflow-hidden`}>
            
            {/* Cabecera / Barra estilo OS */}
            <div className={`${
              isRetro
                ? 'bg-[#000080] p-2 text-white flex items-center justify-between'
                : modalDialog.type === 'error'
                  ? 'bg-red-950/40 text-red-450 p-4 rounded-t-2xl border-b border-red-900/30'
                  : 'bg-zinc-800 text-white p-4 rounded-t-2xl'
            } flex items-center justify-between gap-2`}>
              <div className="flex items-center gap-1.5 font-bold">
                {isRetro && (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider bg-white/20 px-1.5 py-0.5 rounded retro-white-text">
                    {modalDialog.type === 'error' ? 'ERROR' : modalDialog.type === 'warning' ? 'AVISO' : 'CONFIRMAR'}
                  </span>
                )}
                <span className={`text-xs font-black uppercase ${isRetro ? 'retro-white-text' : ''}`}>
                  {modalDialog.title}
                </span>
              </div>
              {isRetro && (
                <button
                  type="button"
                  onClick={() => setModalDialog(null)}
                  className="px-1.5 py-0.5 bg-[#dfdfdf] border-1.5 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-black text-[10px] hover:bg-zinc-300 cursor-pointer"
                >
                  X
                </button>
              )}
            </div>

            {/* Contenido */}
            <div className={`p-5 text-xs space-y-3 ${isRetro ? 'bg-[#eaeef3] text-black' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 select-none">
                  {modalDialog.type === 'error' ? '❌' : modalDialog.type === 'warning' ? '⚠️' : '❓'}
                </span>
                <div className="space-y-1 font-medium whitespace-pre-line leading-relaxed">
                  {modalDialog.message}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className={`p-3.5 flex justify-end gap-2 border-t ${
              isRetro ? 'bg-[#cbd6e2] border-t-[#808080]' : isLight ? 'bg-zinc-50 border-t-zinc-200' : 'bg-[#121316]/50 border-t-zinc-800'
            }`}>
              {modalDialog.onConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      modalDialog.onConfirm?.();
                      setModalDialog(null);
                    }}
                    className={`px-4 py-1.5 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${
                      isRetro
                        ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] hover:bg-[#eaeef3] rounded-none'
                        : 'bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg'
                    }`}
                  >
                    {modalDialog.confirmText || 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalDialog(null)}
                    className={`px-4 py-1.5 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${
                      isRetro
                        ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black hover:bg-zinc-300 rounded-none'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg'
                    }`}
                  >
                    {modalDialog.cancelText || 'Cancelar'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalDialog(null)}
                  className={`px-4 py-1.5 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${
                    isRetro
                      ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black hover:bg-zinc-300 rounded-none'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg'
                  }`}
                >
                  Entendido
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}


export default PreciosView;
