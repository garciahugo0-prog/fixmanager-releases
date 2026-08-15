/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Smartphone, Search, PlusCircle, AlertTriangle, CheckCircle, Trash2, Edit, X, Wrench, Coins, Cpu, Info, Check, Plus, ArrowLeft, Image as ImageIcon, Upload, Loader
} from 'lucide-react';
import { DonorDevice, DonorPart, WorkshopConfig, RepairOrder, Expense } from '../../types';

interface MobileDonorsViewProps {
  donors: DonorDevice[];
  onSetDonors: (donors: DonorDevice[]) => void;
  onAddExpense?: (expense: Expense) => void;
  config: WorkshopConfig;
  orders: RepairOrder[];
  isLight: boolean;
  sessionId?: number;
  onClose: () => void;
}

const DEFAULT_CATEGORIES = [
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

export default function MobileDonorsView({
  donors = [],
  onSetDonors,
  onAddExpense,
  config,
  orders,
  isLight,
  sessionId,
  onClose
}: MobileDonorsViewProps) {
  const sym = config.currencySymbol || '$';

  // ─── ESTADOS DE LA VISTA ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Disponible' | 'Agotado' | 'Desechado'>('Todos');

  // Modales y Hojas deslizables
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDonor, setEditingDonor] = useState<DonorDevice | null>(null);
  const [viewingDonorDetails, setViewingDonorDetails] = useState<DonorDevice | null>(null);

  // Formulario de Dispositivo
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formModelNumber, setFormModelNumber] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formSerialOrImei, setFormSerialOrImei] = useState('');
  const [formCost, setFormCost] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'Disponible' | 'Agotado' | 'Desechado'>('Disponible');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [registerAsExpense, setRegisterAsExpense] = useState(true);

  // Despiece/Partes
  const [customPartName, setCustomPartName] = useState('');
  const [showCommonParts, setShowCommonParts] = useState(false);
  const [isSearchingImage, setIsSearchingImage] = useState(false);

  // Mensajes de Alerta/Feedback internos
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Ajuste dinámico de teclado virtual en Capacitor
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleKeyboardShow = (e: any) => {
      if (e.detail && e.detail.keyboardHeight) {
        setKeyboardHeight(e.detail.keyboardHeight);
      } else {
        setKeyboardHeight(280); // Altura estimada para el teclado en pantallas comunes
      }
    };
    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    window.addEventListener('keyboardWillShow', handleKeyboardShow);
    window.addEventListener('keyboardWillHide', handleKeyboardHide);
    window.addEventListener('ionKeyboardDidShow', handleKeyboardShow);
    window.addEventListener('ionKeyboardDidHide', handleKeyboardHide);

    return () => {
      window.removeEventListener('keyboardWillShow', handleKeyboardShow);
      window.removeEventListener('keyboardWillHide', handleKeyboardHide);
      window.removeEventListener('ionKeyboardDidShow', handleKeyboardShow);
      window.removeEventListener('ionKeyboardDidHide', handleKeyboardHide);
    };
  }, []);

  // Autofeedback timer
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // ─── RESETEAR FORMULARIO ─────────────────────────────────────────────────
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

  const handleOpenAdd = () => {
    resetForm(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (donor: DonorDevice, e: React.MouseEvent) => {
    e.stopPropagation();
    resetForm(donor);
    setShowFormModal(true);
  };

  // ─── BUSCAR IMAGEN DE DISPOSITIVO (WIKIPEDIA / COMMONS) ──────────────────────
  const handleImageSearch = async () => {
    if (!formBrand.trim() || !formModel.trim()) {
      setFeedback({ type: 'error', text: 'Ingresa Marca y Modelo para buscar.' });
      return;
    }
    setIsSearchingImage(true);

    const brandLower = formBrand.toLowerCase().trim();
    const modelLower = formModel.toLowerCase().trim();
    const colorLower = formColor ? formColor.toLowerCase().trim() : '';

    // Normalización de marcas para Wikimedia
    let brandNorm = formBrand.toUpperCase().trim();
    if (brandLower === 'apple' || brandLower === 'iphone') {
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

    let colorEng = '';
    if (colorLower) {
      if (colorLower.includes('roj') || colorLower.includes('red')) colorEng = 'red';
      else if (colorLower.includes('azul') || colorLower.includes('blue')) colorEng = 'blue';
      else if (colorLower.includes('negr') || colorLower.includes('black')) colorEng = 'black';
      else if (colorLower.includes('blanc') || colorLower.includes('white')) colorEng = 'white';
      else if (colorLower.includes('verd') || colorLower.includes('green')) colorEng = 'green';
      else if (colorLower.includes('amarill') || colorLower.includes('yellow')) colorEng = 'yellow';
      else if (colorLower.includes('ros') || colorLower.includes('pink')) colorEng = 'pink';
      else if (colorLower.includes('dorad') || colorLower.includes('gold')) colorEng = 'gold';
      else if (colorLower.includes('plata') || colorLower.includes('silver')) colorEng = 'silver';
      else if (colorLower.includes('gris') || colorLower.includes('grey') || colorLower.includes('gray')) colorEng = 'grey';
      else if (colorLower.includes('morad') || colorLower.includes('purpura')) colorEng = 'purple';
      else colorEng = colorLower;
    }

    const modelNorm = formModel.trim();
    const queryBase = `${brandNorm} ${modelNorm}`.trim();
    const queryDetailed = `${queryBase} back ${colorEng}`.trim();
    const queryBackOnly = `${queryBase} back`.trim();

    const fetchCommonsUrl = async (searchQuery: string, brandKey: string, modelKey: string): Promise<string | null> => {
      try {
        const url = `https://commons.wikimedia.org/w/api.php?action=query&origin=*&format=json&generator=search&gsrnamespace=6&gsrlimit=5&gsrsearch=${encodeURIComponent(searchQuery)}&prop=imageinfo&iiprop=url`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const pages = data.query?.pages;
          if (pages) {
            for (const key of Object.keys(pages)) {
              const page = pages[key];
              const titleLower = page.title.toLowerCase();
              const imageUrl = page.imageinfo?.[0]?.url;
              if (imageUrl) {
                const brandWord = brandKey.toLowerCase().replace('galaxy', '').replace('redmi', '').trim();
                const modelWord = modelKey.toLowerCase().trim();
                if (titleLower.includes(modelWord) && (titleLower.includes(brandWord) || titleLower.includes('phone') || titleLower.includes('back'))) {
                  return imageUrl;
                }
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
      if (colorEng) {
        const urlDetailed = await fetchCommonsUrl(queryDetailed, brandNorm || formBrand, modelNorm);
        if (urlDetailed) {
          setFormImageUrl(urlDetailed);
          setFeedback({ type: 'success', text: 'Imagen encontrada con éxito.' });
          return;
        }
      }

      const urlBackOnly = await fetchCommonsUrl(queryBackOnly, brandNorm || formBrand, modelNorm);
      if (urlBackOnly) {
        setFormImageUrl(urlBackOnly);
        setFeedback({ type: 'success', text: 'Imagen encontrada con éxito.' });
        return;
      }

      const urlWikiEn = await fetchWikipediaPageImage(queryBase, 'en');
      if (urlWikiEn) {
        setFormImageUrl(urlWikiEn);
        setFeedback({ type: 'success', text: 'Imagen encontrada en Wikipedia.' });
        return;
      }

      const urlWikiEs = await fetchWikipediaPageImage(queryBase, 'es');
      if (urlWikiEs) {
        setFormImageUrl(urlWikiEs);
        setFeedback({ type: 'success', text: 'Imagen encontrada en Wikipedia.' });
        return;
      }

      setFeedback({ type: 'error', text: 'No se encontraron imágenes en internet.' });
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error al buscar imagen.' });
    } finally {
      setIsSearchingImage(false);
    }
  };

  // Selector de imagen de la biblioteca local
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setFormImageUrl(ev.target?.result as string);
        setFeedback({ type: 'success', text: 'Imagen cargada localmente.' });
      };
      reader.readAsDataURL(file);
    }
  };

  // ─── ACCIONES DE GUARDAR / BORRAR DONANTE ──────────────────────────────────
  const handleSaveDonor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBrand.trim() || !formModel.trim()) {
      setFeedback({ type: 'error', text: 'Por favor ingresa Marca y Modelo.' });
      return;
    }

    const costNum = Math.max(0, parseFloat(formCost) || 0);

    if (editingDonor) {
      // Editar Donante
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
      setFeedback({ type: 'success', text: 'Equipo actualizado.' });
      setShowFormModal(false);
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
        parts: [], // Inicia vacío
        imageUrl: formImageUrl
      };

      if (registerAsExpense && costNum > 0 && onAddExpense) {
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
      setFeedback({ type: 'success', text: 'Equipo donante registrado.' });
      setShowFormModal(false);
    }
  };

  const handleDeleteDonor = (donorId: string) => {
    onSetDonors(donors.filter(d => d.id !== donorId));
    if (viewingDonorDetails?.id === donorId) {
      setViewingDonorDetails(null);
    }
    setFeedback({ type: 'success', text: 'Equipo eliminado.' });
    setDeleteConfirmId(null);
  };

  // ─── ACCIONES DE DESPIECE / PIEZAS ──────────────────────────────────────────
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
      status: 'Disponible'
    };

    onSetDonors(donors.map(d => d.id === viewingDonorDetails.id ? updatedDonor : d));
    setViewingDonorDetails(updatedDonor);
    setCustomPartName('');
    setFeedback({ type: 'success', text: 'Pieza agregada con éxito.' });
  };

  const handleDeletePart = (partId: string) => {
    if (!viewingDonorDetails) return;
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
    setFeedback({ type: 'success', text: 'Pieza eliminada.' });
  };

  // ─── FILTRADO Y BÚSQUEDA DE DATOS ──────────────────────────────────────────
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

  // Colores de los estados
  const getStatusBadge = (status: 'Disponible' | 'Agotado' | 'Desechado') => {
    if (status === 'Disponible') return 'bg-emerald-500 text-white';
    if (status === 'Agotado') return 'bg-slate-400 text-white';
    return 'bg-rose-500 text-white';
  };

  const getStatusLabel = (status: 'Disponible' | 'Agotado' | 'Desechado') => {
    if (status === 'Disponible') return 'DISPONIBLE';
    if (status === 'Agotado') return 'AGOTADO';
    return 'DESECHADO';
  };

  return (
    <div className={`fixed inset-0 z-[999999] flex flex-col transition-all duration-200 ${
      isLight ? 'bg-white text-slate-800' : 'bg-[#0c1224] text-white'
    }`}>
      {/* 🟢 HEADER DE LA CABECERA (UNIFICADO) */}
      <header 
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 24px))' }}
        className={`shrink-0 border-b ${
          isLight ? 'bg-white border-slate-100' : 'bg-[#0c1224] border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isLight ? 'bg-slate-100 text-slate-700' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 text-center font-bold tracking-tight text-base flex items-center justify-center gap-2">
            <Smartphone className="w-5 h-5 text-violet-500" />
            <span>EQUIPOS DONANTES</span>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-full bg-violet-600 active:scale-95 transition-transform text-white font-black text-xs tracking-wider flex items-center gap-1 cursor-pointer shadow-sm hover:bg-violet-500"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>NUEVO</span>
          </button>
        </div>

        {/* 🔍 BARRA DE BÚSQUEDA PÍLDORA INTEGRADA EN EL HEADER */}
        <div className="px-4 pb-3">
          <div className="relative flex items-center">
            <Search className={`absolute left-4 w-4 h-4 ${
              isLight ? 'text-slate-400' : 'text-zinc-500'
            }`} />
            <input
              type="text"
              placeholder="Buscar por marca, modelo, imei..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                borderRadius: '9999px',
                border: isLight ? '1px solid #e2e8f0' : '1px solid #27272a',
                paddingLeft: '2.75rem',
                paddingRight: searchQuery ? '2.5rem' : '1rem'
              }}
              className={`w-full py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all font-medium ${
                isLight ? 'bg-slate-50 text-slate-800 placeholder-slate-400' : 'bg-[#0f172a] text-white placeholder-zinc-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 🎚️ PESTAÑAS SEGMENTED CONTROL DE ESTADOS */}
        <div className="px-4 pb-3 flex overflow-x-auto gap-1.5 scrollbar-none">
          {(['Todos', 'Disponible', 'Agotado', 'Desechado'] as const).map(tab => {
            const isSelected = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wider transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? isLight
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-violet-500 text-white shadow-md'
                    : isLight
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {tab === 'Todos' ? 'TODOS' : tab.toUpperCase()}
              </button>
            );
          })}
        </div>
      </header>

      {/* 📥 MENSAJE FLOTANTE DE NOTIFICACIONES */}
      {feedback && (
        <div className="absolute top-24 left-4 right-4 z-[9999] p-3 rounded-2xl flex items-center gap-2 shadow-lg animate-bounce text-xs font-bold text-white bg-slate-800 border border-slate-700">
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 📜 LISTADO DE TARJETAS DE DONANTES */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredDonors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <Smartphone className="w-12 h-12 mb-3 stroke-[1.5]" />
            <p className="text-sm font-semibold">No se encontraron equipos donantes</p>
            <p className="text-xs mt-1">Registra un donante con el botón + NUEVO arriba</p>
          </div>
        ) : (
          filteredDonors.map(donor => {
            const totalParts = donor.parts?.length || 0;
            const availableParts = donor.parts?.filter(p => p.status === 'Disponible').length || 0;
            
            return (
              <div
                key={donor.id}
                onClick={() => setViewingDonorDetails(donor)}
                className={`p-4 rounded-3xl border flex flex-col gap-3 relative transition-all active:scale-[0.99] cursor-pointer ${
                  isLight 
                    ? 'bg-white border-slate-100 shadow-sm hover:shadow-md' 
                    : 'bg-[#0f172a]/80 border-zinc-850 shadow-xs hover:border-zinc-800'
                }`}
              >
                <div className="flex gap-4">
                  {/* Foto miniatura del donante */}
                  {donor.imageUrl ? (
                    <div className={`w-16 h-16 rounded-2xl border overflow-hidden shrink-0 flex items-center justify-center ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                    }`}>
                      <img src={donor.imageUrl} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                      isLight ? 'bg-slate-100 text-slate-400' : 'bg-zinc-900 text-zinc-500'
                    }`}>
                      <Smartphone className="w-8 h-8 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Datos del equipo */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-wide ${getStatusBadge(donor.status)}`}>
                        {getStatusLabel(donor.status)}
                      </span>
                      <span className="text-[10px] opacity-45 font-bold tracking-tight">{donor.id}</span>
                    </div>

                    <h3 className="text-sm font-black truncate mt-1">
                      {donor.brand} {donor.model}
                    </h3>

                    {donor.serialOrImei && (
                      <span className="text-[10px] font-mono opacity-65 truncate mt-0.5">
                        IMEI: {donor.serialOrImei}
                      </span>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                      <span className="font-bold text-amber-500">
                        Costo: {sym}{donor.cost.toLocaleString('es-MX')}
                      </span>
                      <span className="opacity-50">•</span>
                      <span className="opacity-70 font-semibold flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-violet-400" />
                        Piezas: {availableParts}/{totalParts}
                      </span>
                    </div>
                  </div>

                  {/* Acciones de Edición/Eliminar rápidas (chillones) */}
                  <div className="flex flex-col gap-1.5 justify-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(donor, e)}
                      className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-90 transition-transform flex items-center justify-center text-white"
                    >
                      <Edit className="w-4.5 h-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(donor.id);
                      }}
                      className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-400 active:scale-90 transition-transform flex items-center justify-center text-white"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {donor.notes && (
                  <p className={`text-xs italic truncate px-3 py-1.5 rounded-xl border shrink-0 ${
                    isLight ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-zinc-950/40 border-zinc-900 text-zinc-400'
                  }`}>
                    Obs: {donor.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* 🔴 DIÁLOGO DE CONFIRMACIÓN DE ELIMINAR DONANTE */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center px-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm p-6 rounded-3xl border flex flex-col gap-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="text-center">
              <h3 className="font-black text-lg">¿Eliminar Equipo Donante?</h3>
              <p className="text-xs opacity-75 mt-1">
                Se perderá el registro del desguace y sus {donors.find(d => d.id === deleteConfirmId)?.parts?.length || 0} piezas asociadas de forma irreversible.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-2xl border ${
                  isLight ? 'bg-slate-100 border-slate-200 hover:bg-slate-250' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750'
                }`}
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDonor(deleteConfirmId)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-2xl bg-red-500 hover:bg-red-400 text-white"
              >
                ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📋 DETALLE DE DESPIECE / BITÁCORA DE PIEZAS (SLIDE-UP SHEET) */}
      {viewingDonorDetails && (
        <div className="fixed inset-0 z-[999999] flex flex-col bg-black/50 justify-end">
          {/* Backdrop click */}
          <div className="absolute inset-0 -z-10" onClick={() => setViewingDonorDetails(null)} />

          <div className={`w-full max-h-[85vh] rounded-t-[2.5rem] flex flex-col border-t overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-zinc-850'
          }`}>
            {/* Cabecera del Panel Detalle */}
            <div className={`p-4 border-b shrink-0 flex items-center justify-between ${
              isLight ? 'bg-slate-50' : 'bg-zinc-950/40'
            }`}>
              <div className="min-w-0">
                <span className="text-[10px] font-black tracking-wide opacity-50 block uppercase">
                  Detalles y Despiece • {viewingDonorDetails.id}
                </span>
                <h3 className="font-black text-base truncate">
                  {viewingDonorDetails.brand} {viewingDonorDetails.model}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingDonorDetails(null)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isLight ? 'bg-slate-200 text-slate-700' : 'bg-zinc-850 text-zinc-300'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content del panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Resumen del equipo */}
              <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-850'
              }`}>
                {viewingDonorDetails.imageUrl && (
                  <div className="w-full h-32 rounded-xl overflow-hidden border flex items-center justify-center bg-zinc-950 border-zinc-800">
                    <img src={viewingDonorDetails.imageUrl} className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <span className="opacity-50 block text-[10px]">MODELO DE TARJETA:</span>
                    <span className="font-mono font-bold">{viewingDonorDetails.modelNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="opacity-50 block text-[10px]">COLOR:</span>
                    <span className="font-bold">{viewingDonorDetails.color || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="opacity-50 block text-[10px]">IMEI / SERIAL:</span>
                    <span className="font-mono font-bold">{viewingDonorDetails.serialOrImei || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="opacity-50 block text-[10px]">COSTO COMPRA:</span>
                    <span className="font-bold text-amber-500">{sym}{viewingDonorDetails.cost.toLocaleString('es-MX')}</span>
                  </div>
                </div>

                {viewingDonorDetails.notes && (
                  <div className="pt-2 border-t border-zinc-800/10">
                    <span className="opacity-50 block text-[10px]">OBSERVACIONES:</span>
                    <p className="italic mt-0.5">{viewingDonorDetails.notes}</p>
                  </div>
                )}
              </div>

              {/* Sugerencias de piezas comunes (Colapsable) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCommonParts(!showCommonParts)}
                  className={`w-full p-3 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all active:scale-[0.99] ${
                    isLight 
                      ? 'bg-violet-50/50 border-violet-100 text-violet-700' 
                      : 'bg-violet-950/20 border-violet-900/30 text-violet-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    <span>+ SELECCIONAR PIEZAS COMUNES</span>
                  </span>
                  <span className="text-[10px] tracking-widest">{showCommonParts ? 'OCULTAR' : 'VER OPCIONES'}</span>
                </button>

                {showCommonParts && (
                  <div className={`p-4 rounded-2xl border space-y-4 ${
                    isLight ? 'bg-white border-slate-200 shadow-inner' : 'bg-zinc-950 border-zinc-850'
                  }`}>
                    {DEFAULT_CATEGORIES.map(cat => {
                      const list = viewingDonorDetails.parts || [];
                      const unaddedItems = cat.items.filter(
                        item => !list.some(p => p.name.toLowerCase() === item.name.toLowerCase())
                      );

                      if (unaddedItems.length === 0) return null;

                      return (
                        <div key={cat.title} className="space-y-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider block opacity-40">
                            {cat.title}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
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
                                className={`text-[10px] px-2.5 py-1 rounded-xl border font-bold cursor-pointer active:scale-95 transition-all ${
                                  isLight
                                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-violet-950/20 hover:border-violet-900 hover:text-violet-400'
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
                )}
              </div>

              {/* Agregar pieza personalizada */}
              <form onSubmit={handleAddCustomPart} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Agregar pieza personalizada..."
                  value={customPartName}
                  onChange={e => setCustomPartName(e.target.value)}
                  className={`flex-1 text-xs px-3.5 py-2.5 focus:outline-none rounded-2xl border ${
                    isLight ? 'bg-white border-slate-350 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!customPartName.trim()}
                  className="px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs disabled:opacity-40 cursor-pointer active:scale-95 transition-transform flex items-center justify-center"
                >
                  METER
                </button>
              </form>

              {/* Listado de componentes actuales */}
              <div className="space-y-2">
                <span className="text-[10px] font-black tracking-wider uppercase opacity-55 block">
                  Bitácora de Componentes ({viewingDonorDetails.parts?.length || 0})
                </span>

                {viewingDonorDetails.parts?.length === 0 ? (
                  <div className="text-center py-10 opacity-40 italic text-xs">
                    No se han indicado piezas funcionales aún. Agrega repuestos de la lista común de arriba o escribe una personalizada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {viewingDonorDetails.parts.map(part => {
                      return (
                        <div 
                          key={part.id}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                            isLight ? 'bg-white border-slate-100 shadow-2xs' : 'bg-zinc-950 border-zinc-850'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">{part.name}</span>
                            {part.status === 'Usado' && (
                              <span className="text-[9px] opacity-60 flex items-center gap-1 font-mono mt-0.5">
                                🛠️ Usado el: {part.usedDate}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Toggle badge status táctil */}
                            <button
                              type="button"
                              onClick={() => handleTogglePartStatus(part.id, part.status)}
                              className={`text-[9px] font-black px-2.5 py-1 rounded-full cursor-pointer active:scale-95 transition-all ${
                                part.status === 'Disponible'
                                  ? 'bg-emerald-500 text-white'
                                  : part.status === 'Dañado'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-400 text-white'
                              }`}
                            >
                              {part.status.toUpperCase()}
                            </button>

                            {/* Eliminar parte */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Quitar pieza "${part.name}" del donante?`)) {
                                  handleDeletePart(part.id);
                                }
                              }}
                              className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-all active:scale-90"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📝 FORMULARIO MODAL REGISTRAR / EDITAR DONANTE (SLIDE-UP SHEET) */}
      {showFormModal && (
        <div className="fixed inset-0 z-[999999] flex flex-col bg-black/50 justify-end">
          {/* Backdrop click */}
          <div className="absolute inset-0 -z-10" onClick={() => setShowFormModal(false)} />

          <div 
            style={{ 
              bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
              transition: 'bottom 0.22s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
            className={`w-full max-h-[90vh] rounded-t-[2.5rem] flex flex-col border-t overflow-hidden absolute left-0 right-0 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-zinc-850'
            }`}
          >
            {/* Cabecera Formulario */}
            <div className={`p-4 border-b shrink-0 flex items-center justify-between ${
              isLight ? 'bg-slate-50' : 'bg-zinc-950/40'
            }`}>
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-violet-500" />
                <span>{editingDonor ? 'MODIFICAR EQUIPO DONANTE' : 'REGISTRAR EQUIPO DONANTE'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isLight ? 'bg-slate-200 text-slate-700' : 'bg-zinc-850 text-zinc-300'
                }`}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Campos del Formulario */}
            <form onSubmit={handleSaveDonor} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Marca */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-60">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Apple, Samsung"
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-2xl border ${
                      isLight ? 'bg-white border-slate-350 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                    }`}
                  />
                </div>

                {/* Modelo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-60">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. iPhone 11, Galaxy S20"
                    value={formModel}
                    onChange={e => setFormModel(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-2xl border ${
                      isLight ? 'bg-white border-slate-350 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* IMEI o Serial */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-60">IMEI o Serial (opcional)</label>
                  <input
                    type="text"
                    placeholder="Número físico o IMEI"
                    value={formSerialOrImei}
                    onChange={e => setFormSerialOrImei(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-2xl border ${
                      isLight ? 'bg-white border-slate-350 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                    }`}
                  />
                </div>

                {/* Costo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-60">Costo ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="0"
                    value={formCost}
                    onChange={e => setFormCost(e.target.value)}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className={`w-full text-xs px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-2xl border ${
                      isLight ? 'bg-white border-slate-350 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Modelo de Tarjeta */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-60">Modelo de Tarjeta</label>
                  <input
                    type="text"
                    placeholder="Ej. A2894, SM-G991B"
                    value={formModelNumber}
                    onChange={e => setFormModelNumber(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-2xl border ${
                      isLight ? 'bg-white border-slate-350 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                    }`}
                  />
                </div>

                {/* Color */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-60">Color</label>
                  <input
                    type="text"
                    placeholder="Ej. Negro, Azul, Blanco"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-2xl border ${
                      isLight ? 'bg-white border-slate-350 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Imagen del Dispositivo */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-60 block">Imagen del Dispositivo</label>
                <div className="flex gap-2 items-center">
                  {formImageUrl ? (
                    <div className={`w-12 h-12 rounded-xl overflow-hidden border shrink-0 flex items-center justify-center relative ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f172a] border-zinc-800'
                    }`}>
                      <img src={formImageUrl} className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="absolute inset-0 bg-black/60 text-white opacity-0 hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-all"
                      >
                        QUITAR
                      </button>
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 text-slate-400 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-850'
                    }`}>
                      <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Acciones de carga de imagen */}
                  <div className="flex-1 flex gap-1.5">
                    {/* Botón Subir Foto local (Cámara/Fotos) */}
                    <label className={`flex-1 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform ${
                      isLight 
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-250 text-slate-700' 
                        : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
                    }`}>
                      <Upload className="w-3.5 h-3.5" />
                      <span>FOTO</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>

                    {/* Botón Buscar en internet */}
                    <button
                      type="button"
                      disabled={isSearchingImage}
                      onClick={handleImageSearch}
                      className={`flex-1 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-55 cursor-pointer ${
                        isLight 
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-250 text-slate-700' 
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
                      }`}
                    >
                      {isSearchingImage ? (
                        <Loader className="w-3.5 h-3.5 animate-spin text-violet-500" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>WEB</span>
                    </button>
                  </div>
                </div>
                
                {/* Input de URL de Imagen manual */}
                <input
                  type="text"
                  placeholder="O pega el enlace (URL) de la imagen..."
                  value={formImageUrl}
                  onChange={e => setFormImageUrl(e.target.value)}
                  className={`w-full text-[10px] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-xl border mt-1 font-mono ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-850 text-white'
                  }`}
                />
              </div>

              {/* Fallas u Observaciones Generales */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-60">Fallas u Observaciones Generales</label>
                <textarea
                  placeholder="Ej: Pantalla rota, tarjeta mojada, cámaras y batería funcionales..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  className={`w-full text-xs px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-2xl border resize-none ${
                    isLight ? 'bg-white border-slate-350 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                  }`}
                />
              </div>

              {/* Estado al Editar */}
              {editingDonor && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-60">Estado de Disponibilidad del Equipo</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className={`w-full text-xs px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-2xl border ${
                      isLight ? 'bg-white border-slate-350 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                    }`}
                  >
                    <option value="Disponible">DISPONIBLE</option>
                    <option value="Agotado">AGOTADO (SIN PIEZAS)</option>
                    <option value="Desechado">DESECHADO</option>
                  </select>
                </div>
              )}

              {/* Registrar Egreso Automático (Solo si es nuevo y tiene costo) */}
              {!editingDonor && parseFloat(formCost) > 0 && onAddExpense && (
                <div className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-100' : 'bg-zinc-950 border-zinc-850'
                }`}>
                  <div className="min-w-0">
                    <span className="text-xs font-black block">Registrar egreso automático</span>
                    <span className="text-[10px] opacity-65 block mt-0.5">
                      Crea una salida de efectivo en la caja chica por el costo de adquisición.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={registerAsExpense}
                    onChange={e => setRegisterAsExpense(e.target.checked)}
                    className="w-5 h-5 accent-violet-600 shrink-0 cursor-pointer"
                  />
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-2xl border ${
                    isLight ? 'bg-slate-150 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                  }`}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-2xl bg-teal-600 hover:bg-teal-500 text-white"
                >
                  GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
