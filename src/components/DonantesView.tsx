/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Smartphone, Search, PlusCircle, AlertTriangle, CheckCircle, Trash2, Edit, X, Wrench, Coins, Cpu, Info, Check, Plus, ArrowLeft, Image as ImageIcon, Upload, Loader, LayoutGrid, List
} from 'lucide-react';
import { DonorDevice, DonorPart, WorkshopConfig, AppUser, Expense, RepairOrder } from '../types';

interface DonantesViewProps {
  donors: DonorDevice[];
  onSetDonors: (donors: DonorDevice[]) => void;
  onAddExpense: (expense: Expense) => void;
  config: WorkshopConfig;
  currentUser?: AppUser | null;
  orders: RepairOrder[];
  sessionId?: number;
}

const DEFAULT_PARTS_LIST = [
  { id: 'pantalla', name: 'Pantalla' },
  { id: 'bateria', name: 'Batería' },
  { id: 'centro_carga', name: 'Centro de Carga' },
  { id: 'camara_trasera', name: 'Cámara Trasera' },
  { id: 'camara_frontal', name: 'Cámara Frontal' },
  { id: 'placa_madre', name: 'Placa Madre / Lógica' },
  { id: 'tapa_chasis', name: 'Tapa Trasera / Chasis' },
  { id: 'flexores', name: 'Flexores' },
  { id: 'bocinas', name: 'Bocinas / Altavoces' },
  { id: 'botones', name: 'Botones / Otros' }
];

export default function DonantesView({ 
  donors = [], onSetDonors, onAddExpense, config, currentUser, orders, sessionId 
}: DonantesViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';
  const sym = config.currencySymbol || '$';

  // ─── ESTADOS ───────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>(() => {
    return (localStorage.getItem('fixmanager_donors_viewmode') as 'grid' | 'compact') || 'compact';
  });
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Disponible' | 'Agotado' | 'Desechado'>('Todos');
  const [formStatus, setFormStatus] = useState<'Disponible' | 'Agotado' | 'Desechado'>('Disponible');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  
  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDonor, setEditingDonor] = useState<DonorDevice | null>(null);
  const [viewingDonorDetails, setViewingDonorDetails] = useState<DonorDevice | null>(null);

  // Formulario
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formModelNumber, setFormModelNumber] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formSerialOrImei, setFormSerialOrImei] = useState('');
  const [formCost, setFormCost] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [registerAsExpense, setRegisterAsExpense] = useState(true);

  // Parte personalizada en detalle
  const [customPartName, setCustomPartName] = useState('');

  // ─── PERMISOS ─────────────────────────────────────────────────────────────
  const canEdit = useMemo(() => {
    if (!currentUser) return true;
    return currentUser.permissions.canEditStock ?? true;
  }, [currentUser]);

  const handleKeyDownNext = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, nextId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextEl = document.getElementById(nextId);
      if (nextEl) {
        nextEl.focus();
        if (nextEl instanceof HTMLInputElement && (nextEl.type === 'text' || nextEl.type === 'number')) {
          nextEl.select();
        }
      }
    }
  };

  // ─── RESET FORMULARIO ──────────────────────────────────────────────────────
  const resetForm = (donor: DonorDevice | null = null) => {
    if (donor) {
      setEditingDonor(donor);
      setFormBrand(donor.brand || '');
      setFormModel(donor.model || '');
      setFormModelNumber(donor.modelNumber || '');
      setFormColor(donor.color || '');
      setFormSerialOrImei(donor.serialOrImei || '');
      setFormCost(String(donor.cost || 0));
      setFormNotes(donor.notes || '');
      setFormStatus(donor.status || 'Disponible');
      setFormImageUrl(donor.imageUrl || '');
      setRegisterAsExpense(false); // No registrar gasto al editar
    } else {
      setEditingDonor(null);
      setFormBrand('');
      setFormModel('');
      setFormModelNumber('');
      setFormColor('');
      setFormSerialOrImei('');
      setFormCost('0');
      setFormNotes('');
      setFormStatus('Disponible');
      setFormImageUrl('');
      setRegisterAsExpense(true);
    }
  };

  const handleOpenAddModal = () => {
    resetForm(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (donor: DonorDevice, e: React.MouseEvent) => {
    e.stopPropagation();
    resetForm(donor);
    setShowAddModal(true);
  };

  // ─── ACCIONES ──────────────────────────────────────────────────────────────
  const handleSaveDonor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBrand.trim() || !formModel.trim()) {
      alert('Por favor ingresa Marca y Modelo del equipo.');
      return;
    }

    const costNum = Math.max(0, parseFloat(formCost) || 0);

    if (editingDonor) {
      // Modificar existente
      const updatedDonor: DonorDevice = {
        ...editingDonor,
        brand: formBrand.toUpperCase().trim(),
        model: formModel.toUpperCase().trim(),
        modelNumber: formModelNumber.toUpperCase().trim(),
        color: formColor.toUpperCase().trim(),
        serialOrImei: formSerialOrImei.trim(),
        cost: costNum,
        status: formStatus,
        notes: formNotes.trim(),
        imageUrl: formImageUrl
      };

      onSetDonors(donors.map(d => d.id === editingDonor.id ? updatedDonor : d));
      if (viewingDonorDetails?.id === editingDonor.id) {
        setViewingDonorDetails(updatedDonor);
      }
      setShowAddModal(false);
    } else {
      // Nuevo Donante
      const donorId = `DON-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newDonor: DonorDevice = {
        id: donorId,
        brand: formBrand.toUpperCase().trim(),
        model: formModel.toUpperCase().trim(),
        modelNumber: formModelNumber.toUpperCase().trim(),
        color: formColor.toUpperCase().trim(),
        serialOrImei: formSerialOrImei.trim(),
        cost: costNum,
        status: 'Disponible',
        createdAt: new Date().toISOString(),
        notes: formNotes.trim(),
        parts: [], // inicia vacío
        imageUrl: formImageUrl
      };

      // Si se solicita registrar como gasto
      if (registerAsExpense && costNum > 0) {
        const expenseId = `EXP-${Date.now()}`;
        const newExpense: Expense = {
          id: expenseId,
          description: `Compra de donante: ${newDonor.brand} ${newDonor.model} (${newDonor.id})`,
          category: 'Repuestos',
          amount: costNum,
          createdAt: new Date().toISOString(),
          type: 'salida',
          sessionId: sessionId,
          paymentMethod: 'Efectivo'
        };
        newDonor.expenseId = expenseId;
        onAddExpense(newExpense);
      }

      onSetDonors([newDonor, ...donors]);
      setShowAddModal(false);
    }
  };

  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingImage(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDraggingImage(false);
  };

  const handleDropImage = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = (Array.from(files) as File[]).find(f => f.type.startsWith('image/'));
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setFormImageUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!showAddModal) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = ev => {
              setFormImageUrl(ev.target?.result as string);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showAddModal]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setFormImageUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSearch = async () => {
    if (!formBrand.trim() || !formModel.trim()) {
      alert('Por favor ingresa la Marca y el Modelo para buscar la imagen.');
      return;
    }
    setIsSearchingImage(true);

    const brandLower = formBrand.toLowerCase().trim();
    const modelLower = formModel.toLowerCase().trim();
    const colorLower = formColor ? formColor.toLowerCase().trim() : '';

    // Traducir colores estándar al inglés para mejores resultados en bases de datos globales de Wikimedia
    let colorEng = '';
    if (colorLower) {
      if (colorLower.includes('roj') || colorLower.includes('red')) colorEng = 'red';
      else if (colorLower.includes('azul') || colorLower.includes('blue')) colorEng = 'blue';
      else if (colorLower.includes('negr') || colorLower.includes('black') || colorLower.includes('oscuro')) colorEng = 'black';
      else if (colorLower.includes('blanc') || colorLower.includes('white')) colorEng = 'white';
      else if (colorLower.includes('verd') || colorLower.includes('green')) colorEng = 'green';
      else if (colorLower.includes('amarill') || colorLower.includes('yellow')) colorEng = 'yellow';
      else if (colorLower.includes('ros') || colorLower.includes('pink')) colorEng = 'pink';
      else if (colorLower.includes('dorad') || colorLower.includes('oro') || colorLower.includes('gold')) colorEng = 'gold';
      else if (colorLower.includes('plata') || colorLower.includes('silver')) colorEng = 'silver';
      else if (colorLower.includes('gris') || colorLower.includes('grey') || colorLower.includes('gray')) colorEng = 'grey';
      else if (colorLower.includes('morad') || colorLower.includes('purpura') || colorLower.includes('purple')) colorEng = 'purple';
      else colorEng = colorLower;
    }

    let brandNorm = formBrand.trim();
    let modelNorm = formModel.trim();

    if (brandLower === 'apple') {
      if (!modelLower.includes('iphone') && 
          !modelLower.includes('ipad') && 
          !modelLower.includes('ipod') && 
          !modelLower.includes('mac') &&
          !modelLower.includes('watch')) {
        brandNorm = 'iPhone';
      } else {
        brandNorm = '';
      }
    } else if (brandLower === 'samsung') {
      if (!modelLower.includes('galaxy')) {
        brandNorm = 'Samsung Galaxy';
      }
    } else if (brandLower === 'xiaomi') {
      if (!modelLower.includes('redmi') && !modelLower.includes('mi') && !modelLower.includes('poco')) {
        brandNorm = 'Xiaomi Redmi';
      }
    } else if (brandLower === 'motorola') {
      if (!modelLower.includes('moto')) {
        brandNorm = 'Moto';
      }
    }

    // Intentar obtener la API Key de Gemini
    let apiKey = '';
    try {
      const eAPI = (window as any).electronAPI;
      if (eAPI?.getApiKey) {
        apiKey = await eAPI.getApiKey();
      }
    } catch (e) {
      console.warn("No se pudo obtener la clave de Gemini:", e);
    }

    // Helper para pedirle a Gemini que seleccione la mejor coincidencia
    const callGeminiFilter = async (candidates: { title: string; url: string }[]): Promise<string | null> => {
      if (!apiKey) return null;
      try {
        const prompt = `Eres un asistente experto en identificar dispositivos. Se solicita encontrar la imagen de la parte trasera de este dispositivo móvil:
Marca: ${formBrand.trim()}
Modelo: ${formModel.trim()}
Color: ${formColor.trim() || 'Cualquiera'}

A continuación, tienes una lista de candidatos obtenidos de Wikimedia Commons:
${JSON.stringify(candidates, null, 2)}

Selecciona el candidato que corresponde EXACTAMENTE a la parte trasera del dispositivo solicitado en el color solicitado. Evita logotipos corporativos, partes delanteras con pantalla apagada (a menos que se vea claramente el diseño trasero), fundas, autos, u otros dispositivos de marcas distintas.
Responde estrictamente en formato JSON válido con la siguiente estructura:
{
  "url": "URL_DE_LA_IMAGEN_SELECCIONADA"
}
Si ningún candidato coincide con el dispositivo solicitado, responde con {"url": ""}.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (response.ok) {
          const resData = await response.json();
          const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text.trim());
            if (parsed.url) {
              return parsed.url;
            }
          }
        }
      } catch (err) {
        console.error("Error al filtrar con Gemini:", err);
      }
      return null;
    };

    // Armar búsquedas
    const queryBase = `${brandNorm} ${modelNorm}`.trim();
    const queryDetailed = `${queryBase} back ${colorEng}`.trim();
    const queryBackOnly = `${queryBase} back`.trim();

    const fetchCommonsUrl = async (searchQuery: string, brandKey: string, modelKey: string): Promise<string | null> => {
      try {
        // Obtenemos candidatos de Commons
        const url = `https://commons.wikimedia.org/w/api.php?action=query&origin=*&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(searchQuery)}&prop=imageinfo&iiprop=url`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const pages = data.query?.pages;
          if (pages) {
            const candidates: { title: string; url: string }[] = [];
            for (const key of Object.keys(pages)) {
              const page = pages[key];
              const title = page.title.toLowerCase();
              const imageUrl = page.imageinfo?.[0]?.url;
              if (imageUrl) {
                candidates.push({ title: page.title, url: imageUrl });
              }
            }

            // Si hay API Key de Gemini activa, dejamos que decida de forma súper precisa
            if (apiKey && candidates.length > 0) {
              const geminiUrl = await callGeminiFilter(candidates);
              if (geminiUrl) return geminiUrl;
            }

            // Fallback de matching local estricto
            for (const c of candidates) {
              const titleLower = c.title.toLowerCase();
              const brandWord = brandKey.toLowerCase().replace('galaxy', '').replace('redmi', '').trim();
              const modelWord = modelKey.toLowerCase().trim();

              // Debe contener el modelo específico (ej. "13") y hacer referencia a la marca, teléfono o trasera
              if (titleLower.includes(modelWord) && 
                  (titleLower.includes(brandWord) || titleLower.includes('phone') || titleLower.includes('smartphone') || titleLower.includes('back') || titleLower.includes('rear'))) {
                return c.url;
              }
            }
          }
        }
      } catch {}
      return null;
    };

    const fetchWikipediaPageImage = async (searchQuery: string, lang = 'en'): Promise<string | null> => {
      try {
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&origin=*&format=json&generator=search&gsrnamespace=0&gsrlimit=1&gsrsearch=${encodeURIComponent(searchQuery)}&prop=pageimages&piprop=thumbnail&pithumbsize=500`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const pages = data.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            return pages[pageId]?.thumbnail?.source || null;
          }
        }
      } catch {}
      return null;
    };

    try {
      // Paso 1: Intentar Commons con color y parte trasera (ej. "iPhone 13 back red")
      if (colorEng) {
        const urlDetailed = await fetchCommonsUrl(queryDetailed, brandNorm || formBrand, modelNorm);
        if (urlDetailed) {
          setFormImageUrl(urlDetailed);
          setIsSearchingImage(false);
          return;
        }
      }

      // Paso 2: Intentar Commons solo parte trasera (ej. "iPhone 13 back")
      const urlBackOnly = await fetchCommonsUrl(queryBackOnly, brandNorm || formBrand, modelNorm);
      if (urlBackOnly) {
        setFormImageUrl(urlBackOnly);
        setIsSearchingImage(false);
        return;
      }

      // Paso 3: Fallback a Wikipedia en Inglés (Portada del artículo)
      const urlWikiEn = await fetchWikipediaPageImage(queryBase, 'en');
      if (urlWikiEn) {
        setFormImageUrl(urlWikiEn);
        setIsSearchingImage(false);
        return;
      }

      // Paso 4: Fallback a Wikipedia en Español (Portada del artículo)
      const urlWikiEs = await fetchWikipediaPageImage(queryBase, 'es');
      if (urlWikiEs) {
        setFormImageUrl(urlWikiEs);
        setIsSearchingImage(false);
        return;
      }

      alert('No se encontró una imagen de la parte trasera o del color específico. Se mantuvo la mejor coincidencia.');
    } catch (e) {
      console.error("Error al buscar imagen:", e);
      alert('Error de red al buscar la imagen.');
    } finally {
      setIsSearchingImage(false);
    }
  };

  const handleDeleteDonor = (donorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Está seguro de eliminar este equipo donante? Se perderá el registro de sus piezas.')) {
      onSetDonors(donors.filter(d => d.id !== donorId));
      if (viewingDonorDetails?.id === donorId) {
        setViewingDonorDetails(null);
      }
    }
  };

  const handleTogglePartStatus = (partId: string, currentStatus: 'Disponible' | 'Dañado' | 'Usado') => {
    if (!viewingDonorDetails) return;
    
    let nextStatus: 'Disponible' | 'Dañado' | 'Usado' = 'Disponible';
    if (currentStatus === 'Disponible') {
      nextStatus = 'Dañado';
    } else if (currentStatus === 'Dañado') {
      nextStatus = 'Usado';
    } else {
      nextStatus = 'Disponible';
    }

    const updatedParts = viewingDonorDetails.parts.map(p => {
      if (p.id === partId) {
        const updated = { ...p, status: nextStatus };
        if (nextStatus === 'Usado') {
          updated.usedDate = new Date().toISOString().split('T')[0];
        } else {
          delete updated.usedInOrderId;
          delete updated.usedDate;
        }
        return updated;
      }
      return p;
    });

    // Calcular si el equipo ya no tiene piezas disponibles
    const hasAvailable = updatedParts.some(p => p.status === 'Disponible');
    const nextDonorStatus: 'Disponible' | 'Agotado' = hasAvailable ? 'Disponible' : 'Agotado';

    const updatedDonor: DonorDevice = {
      ...viewingDonorDetails,
      status: nextDonorStatus,
      parts: updatedParts
    };

    onSetDonors(donors.map(d => d.id === viewingDonorDetails.id ? updatedDonor : d));
    setViewingDonorDetails(updatedDonor);
  };

  const handleAddCustomPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingDonorDetails || !customPartName.trim()) return;

    const partId = `custom-${Date.now()}`;
    const newPart: DonorPart = {
      id: partId,
      name: customPartName.trim(),
      status: 'Disponible'
    };

    const updatedDonor: DonorDevice = {
      ...viewingDonorDetails,
      parts: [...viewingDonorDetails.parts, newPart],
      status: 'Disponible' // Al agregar una pieza disponible, el equipo vuelve a estar disponible
    };

    onSetDonors(donors.map(d => d.id === viewingDonorDetails.id ? updatedDonor : d));
    setViewingDonorDetails(updatedDonor);
    setCustomPartName('');
  };

  const handleDeletePart = (partId: string) => {
    if (!viewingDonorDetails) return;
    if (window.confirm('¿Está seguro de eliminar esta pieza de este equipo?')) {
      const updatedParts = viewingDonorDetails.parts.filter(p => p.id !== partId);
      const hasAvailable = updatedParts.some(p => p.status === 'Disponible');
      const nextDonorStatus = hasAvailable ? 'Disponible' : 'Agotado';

      const updatedDonor: DonorDevice = {
        ...viewingDonorDetails,
        status: nextDonorStatus as any,
        parts: updatedParts
      };

      onSetDonors(donors.map(d => d.id === viewingDonorDetails.id ? updatedDonor : d));
      setViewingDonorDetails(updatedDonor);
    }
  };

  // ─── FILTRADO DE DATOS ─────────────────────────────────────────────────────
  const filteredDonors = useMemo(() => {
    const list = Array.isArray(donors) ? donors : [];
    return list.filter(d => {
      const brandModel = `${d.brand} ${d.model}`.toLowerCase();
      const serialImei = (d.serialOrImei || '').toLowerCase();
      const notes = (d.notes || '').toLowerCase();
      const id = d.id.toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = brandModel.includes(query) || 
                            serialImei.includes(query) || 
                            notes.includes(query) ||
                            id.includes(query);

      if (statusFilter === 'Todos') return matchesSearch;
      return matchesSearch && d.status === statusFilter;
    });
  }, [donors, searchQuery, statusFilter]);

  return (
    <div className={`p-4 h-full flex flex-col font-sans ${isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>
      
      {/* HEADER / VISTA DETALLE O GENERAL */}
      {viewingDonorDetails ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Cabecera Detalle */}
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <button
              onClick={() => setViewingDonorDetails(null)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isLight ? 'bg-white border-zinc-200 hover:bg-zinc-50' : 'bg-zinc-900 border-zinc-850 hover:bg-zinc-850'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide">
                Despiece: {viewingDonorDetails.brand} {viewingDonorDetails.model}
              </h2>
              <p className="text-xs opacity-60">ID: {viewingDonorDetails.id} | Registrado: {new Date(viewingDonorDetails.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                viewingDonorDetails.status === 'Disponible' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : viewingDonorDetails.status === 'Agotado'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-zinc-500/20 text-zinc-400'
              }`}>
                {viewingDonorDetails.status}
              </span>
              <button
                onClick={(e) => handleOpenEditModal(viewingDonorDetails, e)}
                className="px-3 py-1 text-xs rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
              >
                <Edit className="w-3.5 h-3.5" /> Editar
              </button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
            {/* Ficha técnica del donante */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between overflow-y-auto ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-850'
            }`}>
              <div>
                {viewingDonorDetails.imageUrl && (
                  <div className={`w-full h-36 rounded-xl overflow-hidden border mb-4 flex items-center justify-center p-2 bg-white ${
                    isLight ? 'border-zinc-200' : 'border-zinc-800 bg-zinc-950/20'
                  }`}>
                    <img src={viewingDonorDetails.imageUrl} className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <h3 className="text-xs font-black tracking-wider uppercase opacity-55 mb-3">Información del Dispositivo</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-800/10">
                    <span className="opacity-60">Marca:</span>
                    <span className="font-bold">{viewingDonorDetails.brand}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/10">
                    <span className="opacity-60">Modelo:</span>
                    <span className="font-bold">{viewingDonorDetails.model}</span>
                  </div>
                  {viewingDonorDetails.modelNumber && (
                    <div className="flex justify-between py-1 border-b border-zinc-800/10">
                      <span className="opacity-60 font-mono">Modelo No:</span>
                      <span className="font-bold font-mono">{viewingDonorDetails.modelNumber}</span>
                    </div>
                  )}
                  {viewingDonorDetails.color && (
                    <div className="flex justify-between py-1 border-b border-zinc-800/10">
                      <span className="opacity-60">Color:</span>
                      <span className="font-bold">{viewingDonorDetails.color}</span>
                    </div>
                  )}
                  {viewingDonorDetails.serialOrImei && (
                    <div className="flex justify-between py-1 border-b border-zinc-800/10">
                      <span className="opacity-60 font-mono">IMEI/Serial:</span>
                      <span className="font-bold font-mono">{viewingDonorDetails.serialOrImei}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-zinc-800/10">
                    <span className="opacity-60">Costo Adquisición:</span>
                    <span className="font-bold text-amber-500">{sym}{viewingDonorDetails.cost.toLocaleString('es-MX')}</span>
                  </div>
                </div>

                {viewingDonorDetails.notes && (
                  <div className="mt-4">
                    <span className="text-[10px] font-black tracking-wider uppercase opacity-55">Fallas / Observaciones</span>
                    <div className={`p-2.5 rounded-lg text-xs mt-1 border ${
                      isLight ? 'bg-white border-zinc-200 text-zinc-700' : 'bg-zinc-950 border-zinc-850 text-zinc-300'
                    }`}>
                      {viewingDonorDetails.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Agregar pieza personalizada */}
              <form onSubmit={handleAddCustomPart} className="mt-4 pt-4 border-t border-zinc-800/10">
                <span className="text-[10px] font-black tracking-wider uppercase opacity-55 block mb-1.5">Agregar Pieza Personalizada</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: Bandeja SIM..."
                    value={customPartName}
                    onChange={e => setCustomPartName(e.target.value)}
                    className={`flex-1 text-xs px-2.5 py-1.5 focus:outline-none rounded-lg border ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!customPartName.trim()}
                    className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Listado de piezas de despiece */}
            <div className={`md:col-span-2 p-4 rounded-2xl border flex flex-col overflow-hidden ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-850'
            }`}>
              <h3 className="text-xs font-black tracking-wider uppercase opacity-55 mb-3 shrink-0">Componentes y Estados</h3>
              
              {/* Sugerencias de piezas comunes */}
              {(() => {
                const categories = [
                  {
                    title: '🎛️ Tarjeta y Chasis',
                    items: [
                      { id: 'placa_madre', name: 'Placa Madre / Lógica' },
                      { id: 'tapa_chasis', name: 'Tapa Trasera / Chasis' },
                      { id: 'bandeja_sim', name: 'Bandeja SIM' }
                    ]
                  },
                  {
                    title: '📺 Pantalla y Energía',
                    items: [
                      { id: 'pantalla', name: 'Pantalla' },
                      { id: 'bateria', name: 'Batería' },
                      { id: 'flex_nfc', name: 'Flex Carga Inalámbrica/NFC' }
                    ]
                  },
                  {
                    title: '📷 Cámaras',
                    items: [
                      { id: 'camara_trasera_p', name: 'Cámara Trasera Pral.' },
                      { id: 'camara_trasera_s', name: 'Cámara Trasera Sec.' },
                      { id: 'camara_frontal', name: 'Cámara Frontal' },
                      { id: 'cristal_camara', name: 'Cristal de Cámaras' }
                    ]
                  },
                  {
                    title: '🔌 Puertos y Conexión',
                    items: [
                      { id: 'centro_carga_pin', name: 'Centro de Carga (Pin)' },
                      { id: 'flex_carga', name: 'Flex de Centro de Carga' },
                      { id: 'flex_main', name: 'Flex de Interconexión (Main)' }
                    ]
                  },
                  {
                    title: '⚡ Botones y Sensores',
                    items: [
                      { id: 'flex_encendido', name: 'Flex de Encendido' },
                      { id: 'flex_volumen', name: 'Flex de Volumen' },
                      { id: 'flex_sensor', name: 'Flex Proximidad/Sensor' },
                      { id: 'botones_fisicos', name: 'Botones Físicos' }
                    ]
                  },
                  {
                    title: '🔊 Audio y Periféricos',
                    items: [
                      { id: 'bocina_auricular', name: 'Bocina Auricular' },
                      { id: 'altavoces_buzzer', name: 'Altavoz (Buzzer)' },
                      { id: 'vibrador', name: 'Vibrador / Taptic Engine' }
                    ]
                  }
                ];

                const list = viewingDonorDetails.parts || [];
                const hasAnyUnadded = categories.some(cat => 
                  cat.items.some(item => !list.some(p => p.name.toLowerCase() === item.name.toLowerCase()))
                );

                if (!hasAnyUnadded) return null;

                return (
                  <div className={`mb-4 p-3.5 rounded-xl border shrink-0 space-y-3 ${
                    isLight ? 'bg-white border-zinc-200 shadow-xs' : 'bg-zinc-950 border-zinc-850 shadow-sm'
                  }`}>
                    <span className="text-[9px] font-black uppercase tracking-wider block opacity-50">
                      + Seleccionar piezas funcionales útiles (Refacciones comunes)
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categories.map(cat => {
                        const unaddedItems = cat.items.filter(
                          item => !list.some(p => p.name.toLowerCase() === item.name.toLowerCase())
                        );

                        if (unaddedItems.length === 0) return null;

                        return (
                          <div key={cat.title} className="space-y-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider block opacity-40">
                              {cat.title}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {unaddedItems.map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    const newPart = {
                                      id: `${s.id}-${Date.now()}`,
                                      name: s.name,
                                      status: 'Disponible' as const
                                    };
                                    const updatedParts = [...list, newPart];
                                    const nextStatus = updatedParts.some(p => p.status === 'Disponible') ? 'Disponible' : 'Agotado';
                                    onSetDonors(donors.map(d => d.id === viewingDonorDetails.id ? { ...d, parts: updatedParts, status: nextStatus } : d));
                                    setViewingDonorDetails({ ...viewingDonorDetails, parts: updatedParts, status: nextStatus });
                                  }}
                                  className={`text-[9px] px-2 py-0.5 rounded-lg border font-semibold cursor-pointer active:scale-95 transition-all ${
                                    isLight
                                      ? 'bg-zinc-50 hover:bg-teal-50 border-zinc-200 hover:border-teal-300 text-zinc-700 hover:text-teal-700'
                                      : 'bg-zinc-900 hover:bg-teal-950/20 border-zinc-800 hover:border-teal-900 text-zinc-300 hover:text-teal-400'
                                  }`}
                                >
                                  + {s.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="flex-1 overflow-y-auto space-y-2">
                {viewingDonorDetails.parts.length === 0 ? (
                  <div className="text-center py-12 opacity-50 italic text-xs">
                    No se han indicado piezas funcionales aún. Selecciona refacciones comunes arriba o agrega una personalizada en el panel izquierdo.
                  </div>
                ) : (
                  viewingDonorDetails.parts.map(part => {
                    return (
                      <div 
                        key={part.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isLight ? 'bg-white border-zinc-200 hover:border-zinc-300' : 'bg-zinc-950 border-zinc-850 hover:border-zinc-800'
                        }`}
                      >
                        <div className="truncate">
                          <span className="text-xs font-bold block">{part.name}</span>
                          {part.status === 'Usado' && (
                            <span className="text-[10px] opacity-60 flex items-center gap-1 font-mono">
                              🛠️ Usado: {part.usedDate} {part.usedInOrderId && `(Orden: ${part.usedInOrderId})`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Selector de estado circular/badge clickeable */}
                          <button
                            onClick={() => handleTogglePartStatus(part.id, part.status)}
                            className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full cursor-pointer transition-all border ${
                              part.status === 'Disponible'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : part.status === 'Dañado'
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-450 hover:bg-rose-500/20'
                                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                            }`}
                            title="Haz clic para cambiar el estado de la pieza"
                          >
                            {part.status}
                          </button>
                          
                          <button
                            onClick={() => handleDeletePart(part.id)}
                            className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Eliminar pieza del checklist"
                          >
                            <Trash2 className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // VISTA LISTA PRINCIPAL
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TOP BAR: Buscar y Agregar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔩</span>
              <div>
                <h1 className="text-lg font-black uppercase tracking-wider">Equipos Donantes</h1>
                <p className="text-xs opacity-65">Inventario de equipos desmantelados y sus componentes rescatables</p>
              </div>
            </div>
            
            {canEdit && (
              <button
                onClick={handleOpenAddModal}
                className="w-full sm:w-auto px-4 py-2 text-xs rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-transform"
              >
                <PlusCircle className="w-4 h-4" /> Registrar Donante
              </button>
            )}
          </div>

          {/* FILTROS */}
          <div className="flex flex-col md:flex-row gap-2.5 mb-4 shrink-0 items-center justify-between">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                placeholder="BUSCAR POR MARCA, MODELO, IMEI, NOTAS..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full text-xs pl-9 pr-3 py-2.5 focus:outline-none rounded-xl border ${
                  isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-zinc-900 border-zinc-850 text-zinc-100'
                }`}
              />
              <Search className="w-4 h-4 absolute left-3 top-3 opacity-40" />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-between md:justify-start">
              <div className="flex gap-1.5 overflow-x-auto">
                {(['Todos', 'Disponible', 'Agotado', 'Desechado'] as const).map(f => {
                  const isActive = statusFilter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`text-xs px-3.5 py-2 rounded-xl font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                        isActive 
                          ? 'bg-teal-600 text-white'
                          : (isLight ? 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400')
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>

              <div className={`flex gap-0.5 border rounded-xl overflow-hidden shrink-0 ${
                isLight ? 'border-zinc-200 bg-zinc-100' : 'border-zinc-800 bg-zinc-900'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('compact');
                    localStorage.setItem('fixmanager_donors_viewmode', 'compact');
                  }}
                  className={`p-2 transition-colors cursor-pointer ${
                    viewMode === 'compact'
                      ? 'bg-teal-600 text-white'
                      : isLight ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                  title="Vista Lista Compacta"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('grid');
                    localStorage.setItem('fixmanager_donors_viewmode', 'grid');
                  }}
                  className={`p-2 transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-teal-600 text-white'
                      : isLight ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                  title="Vista Cuadrícula de Tarjetas"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* TABLA O GRILLA DE DONANTES */}
          <div className="flex-1 overflow-y-auto">
            {filteredDonors.length > 0 ? (
              viewMode === 'compact' ? (
                <div className={`overflow-x-auto rounded-xl border ${
                  isLight ? 'border-zinc-200 bg-white shadow-xs' : 'border-zinc-850 bg-zinc-900/20 shadow-sm'
                }`}>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b font-black uppercase text-[10px] tracking-wider ${
                        isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : 'bg-[#11131e]/50 border-zinc-850 text-zinc-400'
                      }`}>
                        <th className="py-2.5 px-3 w-16">ID</th>
                        <th className="py-2.5 px-3">Dispositivo</th>
                        <th className="py-2.5 px-3">IMEI / Serial</th>
                        <th className="py-2.5 px-3 text-center">Piezas Útiles</th>
                        <th className="py-2.5 px-3">Costo</th>
                        <th className="py-2.5 px-3 w-28">Estado</th>
                        <th className="py-2.5 px-3 w-20 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonors.map(donor => {
                        const totalParts = donor.parts.length;
                        const availableParts = donor.parts.filter(p => p.status === 'Disponible').length;
                        return (
                          <tr
                            key={donor.id}
                            onClick={() => setViewingDonorDetails(donor)}
                            className={`border-b transition-colors cursor-pointer group ${
                              isLight ? 'hover:bg-zinc-50/80 border-zinc-150' : 'hover:bg-zinc-900/50 border-zinc-850'
                            }`}
                          >
                            <td className="py-2 px-3 font-mono font-bold text-[10px] text-zinc-450">{donor.id}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {donor.imageUrl ? (
                                  <img src={donor.imageUrl} className="w-6 h-6 object-contain rounded-md border bg-white border-zinc-200" />
                                ) : (
                                  <Smartphone className="w-4 h-4 opacity-40 text-zinc-450" />
                                )}
                                <div>
                                  <span className="font-black uppercase text-xs block">{donor.brand} {donor.model}</span>
                                  {donor.color && <span className="text-[10px] opacity-50 block -mt-0.5">Color: {donor.color}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] opacity-70 truncate max-w-[120px]" title={donor.serialOrImei || '-'}>
                              {donor.serialOrImei || '-'}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-bold text-[11px]">
                                  {availableParts} / {totalParts}
                                </span>
                                <div className="w-16 h-1 bg-zinc-800/10 rounded-full overflow-hidden mt-0.5">
                                  <div 
                                    className="bg-teal-500 h-full rounded-full"
                                    style={{ width: `${totalParts > 0 ? (availableParts / totalParts) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 font-bold text-amber-500 font-mono">
                              {sym}{donor.cost.toLocaleString('es-MX')}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                                donor.status === 'Disponible'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : donor.status === 'Agotado'
                                    ? 'bg-amber-500/20 text-amber-500'
                                    : 'bg-zinc-500/20 text-zinc-400'
                              }`}>
                                {donor.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => handleOpenEditModal(donor, e)}
                                  className={`p-1 rounded hover:text-sky-500 transition-colors cursor-pointer ${
                                    isLight ? 'text-zinc-500' : 'text-zinc-450'
                                  }`}
                                  title="Editar donante"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteDonor(donor.id, e)}
                                  className={`p-1 rounded hover:text-rose-500 transition-colors cursor-pointer ${
                                    isLight ? 'text-zinc-500' : 'text-zinc-450'
                                  }`}
                                  title="Eliminar donante"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                  {filteredDonors.map(donor => {
                    const totalParts = donor.parts.length;
                    const availableParts = donor.parts.filter(p => p.status === 'Disponible').length;
                    
                    return (
                      <div
                        key={donor.id}
                        onClick={() => setViewingDonorDetails(donor)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer select-none relative group flex flex-col justify-between h-full ${
                          isLight 
                            ? 'bg-zinc-50 hover:bg-white border-zinc-200 hover:shadow-md' 
                            : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-850 hover:border-zinc-800 hover:shadow-lg'
                        }`}
                      >
                        {/* Imagen superior centrada (más visual) */}
                        <div className={`w-full h-20 rounded-md border overflow-hidden flex items-center justify-center p-1 bg-white mb-1.5 ${
                          isLight ? 'border-zinc-200' : 'border-zinc-800'
                        }`}>
                          {donor.imageUrl ? (
                            <img src={donor.imageUrl} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <Smartphone className="w-5 h-5 opacity-20 text-zinc-400" />
                          )}
                        </div>

                        {/* Detalles */}
                        <div className="flex-1 min-w-0 mb-1">
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="text-[11px] font-black uppercase line-clamp-1 leading-tight" title={`${donor.brand} ${donor.model}`}>
                              {donor.brand} {donor.model}
                            </h3>
                            <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded-sm shrink-0 ${
                              donor.status === 'Disponible'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : donor.status === 'Agotado'
                                  ? 'bg-amber-500/20 text-amber-500'
                                  : 'bg-zinc-500/20 text-zinc-400'
                            }`}>
                              {donor.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] opacity-60 mt-0.5">
                            <span className="font-semibold text-[8px]">{donor.id}</span>
                            {donor.color && <span className="truncate max-w-[65px]" title={donor.color}>{donor.color}</span>}
                          </div>
                          {donor.serialOrImei && (
                            <div className="text-[8.5px] font-mono opacity-50 truncate mt-0.5" title={donor.serialOrImei}>
                              S/N: {donor.serialOrImei}
                            </div>
                          )}
                        </div>

                        {/* Piezas útiles */}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[9px] font-bold shrink-0">
                            {availableParts}/{totalParts} útiles
                          </span>
                          <div className="flex-1 h-1 bg-zinc-800/10 rounded-full overflow-hidden">
                            <div 
                              className="bg-teal-500 h-full rounded-full"
                              style={{ width: `${totalParts > 0 ? (availableParts / totalParts) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Pie de tarjeta */}
                        <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-zinc-800/10">
                          <span className="text-[11px] font-bold text-amber-500 font-mono">
                            {sym}{donor.cost.toLocaleString('es-MX')}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleOpenEditModal(donor, e)}
                              className={`p-0.5 rounded hover:text-sky-500 transition-colors cursor-pointer ${
                                isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-850'
                              }`}
                              title="Editar donante"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteDonor(donor.id, e)}
                              className={`p-0.5 rounded hover:text-rose-500 transition-colors cursor-pointer ${
                                isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-850'
                              }`}
                              title="Eliminar donante"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className={`p-10 text-center rounded-2xl border border-dashed ${
                isLight ? 'border-zinc-300' : 'border-zinc-800'
              }`}>
                <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <h3 className="text-sm font-bold opacity-70">No se encontraron equipos donantes</h3>
                <p className="text-xs opacity-50 mt-1">Prueba cambiando tu búsqueda o registra un nuevo dispositivo.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL REGISTRO / EDICIÓN */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
            isRetro ? 'bg-zinc-100 border-zinc-400 font-mono' : isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#15161b] border-zinc-850 text-zinc-100'
          }`}>
            {/* Header */}
            <div className={`modal-dark-header flex items-center justify-between px-4 py-3 border-b rounded-t-xl ${
              isRetro ? 'bg-[#000080] border-[#00006a]' : isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-[#11131e] border-zinc-700'
            }`}>
              <div className="flex items-center gap-2 text-white">
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">
                  {editingDonor ? 'Editar Equipo Donante' : 'Registrar Equipo Donante'}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="text-white opacity-70 hover:opacity-100 transition-opacity cursor-pointer p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDonor} className="flex-1 overflow-y-auto p-4 space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-70">Marca *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    id="donor-brand-input"
                    placeholder="EJ: APPLE, SAMSUNG"
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    onKeyDown={e => handleKeyDownNext(e, 'donor-model-input')}
                    className={`w-full text-xs px-3 py-2 focus:outline-none rounded-lg border ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-70">Modelo *</label>
                  <input
                    type="text"
                    required
                    id="donor-model-input"
                    placeholder="EJ: IPHONE 11, GALAXY S20"
                    value={formModel}
                    onChange={e => setFormModel(e.target.value)}
                    onKeyDown={e => handleKeyDownNext(e, 'donor-serial-input')}
                    className={`w-full text-xs px-3 py-2 focus:outline-none rounded-lg border ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-70">IMEI o Serial (Opcional)</label>
                  <input
                    type="text"
                    id="donor-serial-input"
                    placeholder="NÚMERO FÍSICO O IMEI"
                    value={formSerialOrImei}
                    onChange={e => setFormSerialOrImei(e.target.value)}
                    onKeyDown={e => handleKeyDownNext(e, 'donor-cost-input')}
                    className={`w-full text-xs px-3 py-2 focus:outline-none rounded-lg border ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-70">Costo ($) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    id="donor-cost-input"
                    placeholder="0"
                    value={formCost}
                    onChange={e => setFormCost(e.target.value)}
                    onKeyDown={e => handleKeyDownNext(e, 'donor-card-input')}
                    className={`w-full text-xs px-3 py-2 focus:outline-none rounded-lg border font-mono ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-70">Modelo de Tarjeta (Opcional)</label>
                  <input
                    type="text"
                    id="donor-card-input"
                    placeholder="EJ: A2894, SM-G991B"
                    value={formModelNumber}
                    onChange={e => setFormModelNumber(e.target.value)}
                    onKeyDown={e => handleKeyDownNext(e, 'donor-color-input')}
                    className={`w-full text-xs px-3 py-2 focus:outline-none rounded-lg border font-mono ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-70">Color (Opcional)</label>
                  <input
                    type="text"
                    id="donor-color-input"
                    placeholder="EJ: NEGRO, AZUL, BLANCO"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    onKeyDown={e => handleKeyDownNext(e, 'donor-img-url-input')}
                    className={`w-full text-xs px-3 py-2 focus:outline-none rounded-lg border ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              {/* Imagen del Dispositivo */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropImage}
                className={`space-y-2 p-3 border rounded-xl transition-all relative overflow-hidden ${
                  isDraggingImage
                    ? 'bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/50 scale-[1.01]'
                    : isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-800 bg-zinc-900/30'
                }`}
              >
                {isDraggingImage && (
                  <div className="pointer-events-none absolute inset-0 bg-teal-600/20 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-teal-400 font-black text-xs uppercase tracking-wider gap-1 animate-pulse">
                    <span className="text-xl">📥</span>
                    <span>¡Suelta la imagen aquí!</span>
                  </div>
                )}
                <label className="block text-[10px] font-black uppercase tracking-wider opacity-70">Imagen del Dispositivo (Clic, Pegar Ctrl+V o Arrastrar)</label>
                <div className="flex items-center gap-3">
                  {formImageUrl ? (
                    <div className={`w-16 h-16 rounded-xl border overflow-hidden relative group shrink-0 p-1 bg-white ${
                      isLight ? 'border-zinc-200' : 'border-zinc-800'
                    }`}>
                      <img src={formImageUrl} className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer text-xs"
                        title="Eliminar imagen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className={`w-16 h-16 rounded-xl border border-dashed flex flex-col items-center justify-center shrink-0 ${
                      isDraggingImage ? 'border-teal-500 bg-teal-500/20 text-teal-400' : isLight ? 'border-zinc-355 bg-zinc-50' : 'border-zinc-800 bg-zinc-950/40'
                    }`}>
                      <ImageIcon className="w-6 h-6 opacity-30 text-zinc-400" />
                      <span className="text-[8px] font-bold text-zinc-400 mt-1">{isDraggingImage ? 'Soltar' : 'Sin Imagen'}</span>
                    </div>
                  )}
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="donor-img-file-input"
                      />
                      <label
                        htmlFor="donor-img-file-input"
                        className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg text-center cursor-pointer active:scale-95 transition-transform flex items-center gap-1 border ${
                          isLight ? 'bg-zinc-150 hover:bg-zinc-200 border-zinc-300 text-zinc-700' : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" /> Subir
                      </label>
                      <button
                        type="button"
                        disabled={isSearchingImage}
                        onClick={handleImageSearch}
                        className="px-3 py-1.5 text-[10px] font-black uppercase bg-teal-600 hover:bg-teal-500 text-white rounded-lg active:scale-95 transition-transform disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      >
                        {isSearchingImage ? (
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        Buscar Internet
                      </button>
                    </div>
                    <input
                      type="text"
                      id="donor-img-url-input"
                      placeholder="O pegar URL de imagen / Ctrl+V / Arrastrar..."
                      value={formImageUrl}
                      onChange={e => setFormImageUrl(e.target.value)}
                      onKeyDown={e => handleKeyDownNext(e, 'donor-notes-input')}
                      className={`w-full text-xs px-3 py-1.5 focus:outline-none rounded-lg border ${
                        isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Notas de Fallas */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-70">Observaciones Generales o Fallas</label>
                <textarea
                  rows={2}
                  id="donor-notes-input"
                  placeholder="Ej: Pantalla rota, tarjeta mojada, cámaras y batería buenas..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  onKeyDown={e => handleKeyDownNext(e, editingDonor ? 'donor-status-input' : 'donor-expense-checkbox')}
                  className={`w-full text-xs px-3 py-2 focus:outline-none rounded-lg border resize-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                  }`}
                />
              </div>

              {editingDonor && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-70">Estado del Dispositivo</label>
                  <select
                    id="donor-status-input"
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className={`w-full text-xs px-3 py-2 focus:outline-none rounded-lg border ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                    }`}
                  >
                    <option value="Disponible">🟢 DISPONIBLE</option>
                    <option value="Agotado">🟡 AGOTADO</option>
                    <option value="Desechado">⚪ DESECHADO</option>
                  </select>
                </div>
              )}



              {/* Registro Automático de Egreso */}
              {!editingDonor && (
                <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-teal-50/50 border-teal-200' : 'bg-teal-950/10 border-teal-900/30'
                }`}>
                  <input
                    type="checkbox"
                    id="donor-expense-checkbox"
                    checked={registerAsExpense}
                    onChange={e => setRegisterAsExpense(e.target.checked)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('donor-save-button')?.focus();
                      }
                    }}
                    className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                  />
                  <label htmlFor="donor-expense-checkbox" className="text-xs cursor-pointer select-none">
                    <strong className="block text-teal-400">Registrar egreso automático</strong>
                    <span className="opacity-70 text-[10px]">Crea una salida de efectivo en la caja chica por el costo de adquisición.</span>
                  </label>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-2.5 pt-2 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 text-xs rounded-xl font-bold uppercase cursor-pointer border ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100' : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="donor-save-button"
                  className="px-4 py-2 text-xs rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black uppercase active:scale-95 transition-transform"
                >
                  Guardar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
