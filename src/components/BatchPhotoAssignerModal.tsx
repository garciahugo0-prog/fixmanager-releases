import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Check, ChevronRight, ChevronLeft, Upload, Search, Image as ImageIcon, Smartphone, Monitor, Trash2, CheckCircle2, History } from 'lucide-react';
import QRCode from 'qrcode';
import { InventoryItem, RefaccionItem, WorkshopConfig } from '../types';
import { showUiToast } from '../utils/whatsapp';

interface BatchPhotoItem {
  id: string;
  sourceType: 'inventory' | 'refaccion';
  code: string;
  name: string;
  category: string;
  imageUrl?: string;
  extraImages?: string[];
  itemRef: InventoryItem | RefaccionItem;
}

interface CompletedPhotoRecord {
  id: string;
  name: string;
  code: string;
  category: string;
  imageUrl: string;
  timestamp: string;
  sourceType: 'inventory' | 'refaccion';
}

interface BatchPhotoAssignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  refacciones: RefaccionItem[];
  onSetInventory?: (inv: InventoryItem[]) => void;
  onSetRefacciones?: (ref: RefaccionItem[]) => void;
  config: WorkshopConfig;
}

const compressBase64ToSquare = (base64: string, maxDim = 600, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = maxDim;
      canvas.height = maxDim;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }

      let sX = 0, sY = 0, sW = img.width, sH = img.height;
      if (img.width > img.height) {
        sW = img.height;
        sX = (img.width - img.height) / 2;
      } else if (img.height > img.width) {
        sH = img.width;
        sY = (img.height - img.width) / 2;
      }
      ctx.drawImage(img, sX, sY, sW, sH, 0, 0, maxDim, maxDim);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
};

export const BatchPhotoAssignerModal: React.FC<BatchPhotoAssignerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  refacciones,
  onSetInventory,
  onSetRefacciones,
  config
}) => {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const [activeTab, setActiveTab] = useState<'mobileQr' | 'pcGrid'>('mobileQr');
  const [filterMode, setFilterMode] = useState<'noPhoto' | 'all'>('noPhoto');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'inventory' | 'refacciones'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);
  const [completedHistory, setCompletedHistory] = useState<CompletedPhotoRecord[]>([]);

  const [uploadSessionId, setUploadSessionId] = useState('');
  const [imageQrCodeUrl, setImageQrCodeUrl] = useState('');
  const [localIp, setLocalIp] = useState('');
  const [localPort, setLocalPort] = useState(5055);

  // Unified item list
  const allItems: BatchPhotoItem[] = useMemo(() => {
    const list: BatchPhotoItem[] = [];

    if (sourceFilter === 'all' || sourceFilter === 'inventory') {
      inventory.forEach(inv => {
        list.push({
          id: inv.id,
          sourceType: 'inventory',
          code: inv.code || '—',
          name: inv.name,
          category: inv.category || 'Producto',
          imageUrl: inv.imageUrl,
          extraImages: inv.extraImages,
          itemRef: inv
        });
      });
    }

    if (sourceFilter === 'all' || sourceFilter === 'refacciones') {
      refacciones.forEach(ref => {
        list.push({
          id: ref.id,
          sourceType: 'refaccion',
          code: ref.code || '—',
          name: `[REFACCIÓN] ${ref.name} (${ref.deviceBrand || ''} ${ref.deviceModel || ''})`.trim(),
          category: ref.category || 'Refacciones',
          imageUrl: ref.imageUrl,
          extraImages: ref.extraImages,
          itemRef: ref
        });
      });
    }

    return list;
  }, [inventory, refacciones, sourceFilter]);

  // Dynamic unique category options
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [allItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const hasPhoto = Boolean(item.imageUrl && item.imageUrl.trim() !== '');
      if (filterMode === 'noPhoto' && hasPhoto) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCat) return false;
      }
      return true;
    });
  }, [allItems, filterMode, selectedCategory, searchQuery]);

  const totalWithoutPhoto = useMemo(() => {
    return allItems.filter(i => !i.imageUrl || i.imageUrl.trim() === '').length;
  }, [allItems]);

  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingCard(true);
    }
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDraggingCard(false);
  };

  const handleCardDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCard(false);
    const itemTarget = allItems.filter(item => {
      const hasPhoto = Boolean(item.imageUrl && item.imageUrl.trim() !== '');
      if (filterMode === 'noPhoto' && hasPhoto) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCat) return false;
      }
      return true;
    })[currentIndex];

    if (!itemTarget) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = (Array.from(files) as File[]).find(f => f.type.startsWith('image/'));
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          await saveImageToItem(itemTarget, base64, 'main');
          if (currentIndex < filteredItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Keep index within bounds
  useEffect(() => {
    if (currentIndex >= filteredItems.length && filteredItems.length > 0) {
      setCurrentIndex(filteredItems.length - 1);
    }
  }, [filteredItems.length, currentIndex]);

  const currentItem = filteredItems[currentIndex] || null;

  // Setup QR Session
  useEffect(() => {
    if (!isOpen) return;
    const sessId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    setUploadSessionId(sessId);

    const api = (window as any).electronAPI;
    if (api?.startLocalServer) {
      api.startLocalServer().then((res: any) => {
        if (res.success) {
          setLocalIp(res.ip);
          setLocalPort(res.port);
          const link = `http://${res.ip}:${res.port}/product-upload?sessionId=${sessId}`;
          QRCode.toDataURL(link, { width: 200, margin: 1 }).then(url => {
            setImageQrCodeUrl(url);
          }).catch(err => console.error(err));
        }
      });
    }
  }, [isOpen]);

  // Push active session item details to local HTTP server so the smartphone displays live info
  useEffect(() => {
    if (!isOpen || !uploadSessionId || !localIp) return;
    try {
      fetch(`http://${localIp}:${localPort}/update-batch-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: uploadSessionId,
          itemName: currentItem?.name || '',
          itemCode: currentItem?.code || '',
          itemCategory: currentItem?.category || '',
          currentIndex,
          totalItems: filteredItems.length,
          slotTarget: 'main'
        })
      }).catch(err => console.error(err));
    } catch(err) {
      console.error(err);
    }
  }, [isOpen, uploadSessionId, localIp, localPort, currentItem, currentIndex, filteredItems.length]);

  // Save image to specific item with compression and smooth animation
  const saveImageToItem = async (targetItem: BatchPhotoItem, imageData: string, slot: 'main' | 'extra' = 'main') => {
    setShowSuccessPulse(true);
    setTimeout(() => setShowSuccessPulse(false), 1200);

    const api = (window as any).electronAPI;
    const isBase64 = imageData.startsWith('data:image/');
    let finalImageData = imageData;

    if (isBase64) {
      finalImageData = await compressBase64ToSquare(imageData, 600, 0.85);
    }

    let finalFileName = finalImageData;

    if (isBase64 && api?.saveProductImage) {
      const prefix = targetItem.sourceType === 'inventory' ? 'prod' : 'ref';
      finalFileName = `${prefix}_${targetItem.id}.jpg`;
      await api.saveProductImage(finalFileName, finalImageData);
    }

    if (targetItem.sourceType === 'inventory' && onSetInventory) {
      const updatedInv = inventory.map(item => {
        if (item.id === targetItem.id) {
          return { ...item, imageUrl: finalFileName };
        }
        return item;
      });
      onSetInventory(updatedInv);
    } else if (targetItem.sourceType === 'refaccion' && onSetRefacciones) {
      const updatedRef = refacciones.map(item => {
        if (item.id === targetItem.id) {
          return { ...item, imageUrl: finalFileName };
        }
        return item;
      });
      onSetRefacciones(updatedRef);
    }

    // Agregar al Historial en Vivo
    setCompletedHistory(prev => [
      {
        id: targetItem.id,
        name: targetItem.name,
        code: targetItem.code,
        category: targetItem.category,
        imageUrl: finalImageData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceType: targetItem.sourceType
      },
      ...prev.filter(x => x.id !== targetItem.id)
    ]);

    showUiToast(`Foto asignada a ${targetItem.name.substring(0, 25)}... 🚀`, 'success');
  };

  // Delete image from item
  const deleteImageFromItem = (targetItem: BatchPhotoItem) => {
    if (targetItem.sourceType === 'inventory' && onSetInventory) {
      const updatedInv = inventory.map(item => {
        if (item.id === targetItem.id) {
          return { ...item, imageUrl: '' };
        }
        return item;
      });
      onSetInventory(updatedInv);
    } else if (targetItem.sourceType === 'refaccion' && onSetRefacciones) {
      const updatedRef = refacciones.map(item => {
        if (item.id === targetItem.id) {
          return { ...item, imageUrl: '' };
        }
        return item;
      });
      onSetRefacciones(updatedRef);
    }

    setCompletedHistory(prev => prev.filter(x => x.id !== targetItem.id));
    showUiToast(`Foto eliminada de ${targetItem.name.substring(0, 25)}...`, 'info');
  };

  // Mobile upload listener
  useEffect(() => {
    if (!isOpen) return;
    const api = (window as any).electronAPI;
    if (api?.onProductImageUploaded) {
      api.onProductImageUploaded(async (data: { sessionId: string; image: string }) => {
        if (data && data.sessionId === uploadSessionId && currentItem) {
          await saveImageToItem(currentItem, data.image, 'main');
          if (currentIndex < filteredItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
          }
        }
      });
    }
  }, [isOpen, uploadSessionId, currentItem, currentIndex, filteredItems.length]);

  // Handle Clipboard Paste on Grid
  useEffect(() => {
    if (!isOpen || activeTab !== 'pcGrid') return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (!file || !currentItem) return;

          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
              await saveImageToItem(currentItem, base64, 'main');
              if (currentIndex < filteredItems.length - 1) {
                setCurrentIndex(prev => prev + 1);
              }
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, activeTab, currentItem, currentIndex, filteredItems.length]);

  // Keyboard navigation Arrow Left / Up / Right / Down
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(filteredItems.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems.length]);

  if (!isOpen) return null;

  // Dynamic Theme Styling Classes
  const modalContainerBg = isRetro
    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black rounded-none'
    : isLight
      ? 'bg-white border border-zinc-200 text-zinc-900 rounded-3xl'
      : 'bg-[#121620] border border-zinc-800 text-zinc-100 rounded-3xl';

  const modalHeaderBg = isRetro
    ? 'bg-[#000080] text-white border-b-2 border-[#808080]'
    : isLight
      ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white border-b border-blue-800'
      : 'bg-gradient-to-r from-blue-950 to-indigo-950 text-white border-b border-zinc-800';

  const toolbarBg = isRetro
    ? 'bg-[#c0c0c0] border-b-2 border-[#808080] text-black'
    : isLight
      ? 'bg-zinc-100 border-b border-zinc-200 text-zinc-900'
      : 'bg-[#181c26] border-b border-zinc-800 text-zinc-100';

  const tabContainerBg = isRetro
    ? 'bg-[#dfdfdf] p-1 border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white'
    : isLight
      ? 'bg-zinc-200/90 p-1 rounded-xl'
      : 'bg-zinc-900 p-1 rounded-xl';

  const inputClass = isRetro
    ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black text-xs font-mono py-1.5 px-3 focus:outline-none'
    : isLight
      ? 'bg-white border border-zinc-300 text-zinc-900 text-xs font-medium py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm'
      : 'bg-[#1c212d] border border-zinc-700 text-zinc-100 text-xs font-medium py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm';

  const qrLeftColBg = isRetro
    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black p-4'
    : isLight
      ? 'bg-white border border-zinc-200 text-zinc-900 p-4 shadow-sm rounded-2xl'
      : 'bg-[#181c26] border border-zinc-800 text-zinc-100 p-4 shadow-sm rounded-2xl';

  const qrRightColBg = isRetro
    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black p-5'
    : isLight
      ? 'bg-zinc-50 border border-zinc-200 text-zinc-900 p-5 shadow-sm rounded-2xl relative overflow-hidden flex flex-col justify-between'
      : 'bg-[#181c26] border border-zinc-800 text-zinc-100 p-5 shadow-sm rounded-2xl relative overflow-hidden flex flex-col justify-between';

  const itemCardBg = isRetro
    ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black p-4 rounded-none relative transition-all duration-300'
    : isLight
      ? 'bg-white border border-zinc-200 text-zinc-900 shadow-md p-4 rounded-2xl relative transition-all duration-300'
      : 'bg-[#0e1017] border border-zinc-800 text-zinc-100 shadow-md p-4 rounded-2xl relative transition-all duration-300';

  const tableOuterBg = isRetro
    ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none'
    : isLight
      ? 'bg-white border border-zinc-200 rounded-2xl'
      : 'bg-[#0e1017] border border-zinc-800 rounded-2xl';

  const tableHeaderBg = isRetro
    ? 'bg-[#000080] text-white'
    : isLight
      ? 'bg-zinc-100 text-zinc-800 border-b border-zinc-300 font-black'
      : 'bg-[#181c26] text-zinc-300 border-b border-zinc-800 font-black';

  const tableFooterBg = isRetro
    ? 'bg-[#dfdfdf] border-t-2 border-[#808080] text-black font-bold'
    : isLight
      ? 'bg-zinc-100 border-t border-zinc-200 text-zinc-700 font-medium'
      : 'bg-[#141722] border-t border-zinc-800 text-zinc-300 font-medium';

  const modalFooterBg = isRetro
    ? 'bg-[#dfdfdf] border-t-2 border-[#808080]'
    : isLight
      ? 'bg-zinc-100 border-t border-zinc-200'
      : 'bg-[#141722] border-t border-zinc-800';

  const kbdClass = isRetro
    ? 'bg-white border border-zinc-400 text-black px-2 py-0.5 font-bold font-mono text-[10px] rounded'
    : isLight
      ? 'bg-zinc-200 border border-zinc-300 text-zinc-900 px-2 py-0.5 font-bold font-mono text-[10px] rounded'
      : 'bg-zinc-800 border border-zinc-700 text-zinc-200 px-2 py-0.5 font-bold font-mono text-[10px] rounded';

  const progressPercent = Math.min(100, Math.round(((currentIndex + 1) / (filteredItems.length || 1)) * 100));

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md font-sans text-left">
      <div className={`w-full max-w-5xl h-[82vh] overflow-hidden shadow-2xl flex flex-col ${modalContainerBg}`}>
        
        {/* Header Modal */}
        <div className={`px-6 py-3.5 flex justify-between items-center ${modalHeaderBg}`}>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-extrabold uppercase text-sm tracking-wider flex items-center gap-2">
                ⚡ Asistente de Carga Masiva de Fotografías
              </h2>
              <p className="text-[11px] opacity-90">
                Fotografía cientos de artículos rápidamente desde el celular o con accesos de PC.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar de Filtros & Pestañas */}
        <div className={`px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 ${toolbarBg}`}>
          {/* Pestañas de Modo */}
          <div className={`flex items-center gap-1.5 ${tabContainerBg}`}>
            <button
              type="button"
              onClick={() => setActiveTab('mobileQr')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'mobileQr'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : isRetro
                    ? 'text-black hover:bg-zinc-300'
                    : isLight
                      ? 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-300/50'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>1. Escáner Continuo Celular (QR)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pcGrid')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'pcGrid'
                  ? 'bg-blue-600 text-white shadow-md'
                  : isRetro
                    ? 'text-black hover:bg-zinc-300'
                    : isLight
                      ? 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-300/50'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>2. Matriz / Tabla Rápida PC</span>
            </button>
          </div>

          {/* Filtros de Artículos */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isLight || isRetro ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 w-40 ${inputClass}`}
              />
            </div>

            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className={inputClass}
            >
              <option value="noPhoto">📷 Solo Sin Foto ({totalWithoutPhoto})</option>
              <option value="all">📦 Todos los Artículos ({allItems.length})</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className={inputClass}
            >
              <option value="all">🌐 Inventario + Refacciones</option>
              <option value="inventory">📦 Solo Inventario Stock</option>
              <option value="refacciones">🛠️ Solo Refacciones Taller</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={inputClass}
            >
              <option value="all">🏷️ Categorías ({categoryOptions.length})</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de Progreso Superior en PC */}
        {filteredItems.length > 0 && (
          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Cuerpo Principal del Modo Seleccionado */}
        <div className="flex-1 overflow-hidden p-5">
          {activeTab === 'mobileQr' ? (
            /* ──────────────── PESTAÑA 1: MODO CELULAR QR CONTINUO ──────────────── */
            <div className="h-full grid grid-cols-12 gap-5">
              
              {/* Columna Izquierda: Código QR de Conexión */}
              <div className={`col-span-5 flex flex-col items-center justify-center text-center ${qrLeftColBg}`}>
                <div className="p-2 bg-white rounded-2xl border border-zinc-300 shadow-lg mb-2">
                  {imageQrCodeUrl ? (
                    <img src={imageQrCodeUrl} alt="QR Code Lote" className="w-40 h-40 rounded-xl object-contain" />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-xs text-zinc-400 font-bold">Generando QR...</div>
                  )}
                </div>

                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Escanea con tu Celular</span>
                </h3>
                <p className={`text-[11px] mt-1 max-w-xs leading-relaxed ${
                  isRetro ? 'text-zinc-800' : isLight ? 'text-zinc-600' : 'text-zinc-300'
                }`}>
                  Al tomar la foto en el cel, <strong className="text-emerald-600 dark:text-emerald-400">FixManager la asigna al instante y salta al siguiente artículo</strong>.
                </p>

                {localIp && (
                  <div className={`mt-2.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isRetro
                      ? 'bg-emerald-200 border border-emerald-500 text-emerald-900'
                      : isLight
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xs'
                        : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  }`}>
                    🌐 http://{localIp}:{localPort}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Tarjeta Activa + Historial de fotos listas */}
              <div className={`col-span-7 flex flex-col justify-between ${qrRightColBg}`}>
                
                {/* Pulse Flash Animation cuando se asigna foto */}
                {showSuccessPulse && (
                  <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn transition-all">
                    <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 animate-bounce">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>¡Foto Asignada con Éxito! 🚀</span>
                    </div>
                  </div>
                )}

                {/* Header de Progreso */}
                <div className={`flex items-center justify-between border-b pb-2.5 ${
                  isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'
                }`}>
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-widest block ${
                      isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-zinc-400'
                    }`}>PRODUCTO EN TURNO</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">
                      Artículo #{currentIndex + 1} de {filteredItems.length} ({progressPercent}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      className={`p-1.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm ${
                        isRetro
                          ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black active:border-t-zinc-700 active:border-l-zinc-700'
                          : isLight
                            ? 'bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-100'
                            : 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700'
                      }`}
                      title="Anterior (← o ↑)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentIndex >= filteredItems.length - 1}
                      onClick={() => setCurrentIndex(prev => Math.min(filteredItems.length - 1, prev + 1))}
                      className="p-1.5 rounded-xl bg-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-500 transition-all cursor-pointer shadow-md"
                      title="Siguiente (→ o ↓)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tarjeta del Producto Actual */}
                {currentItem ? (
                  <div 
                    key={currentItem.id} 
                    onDragOver={handleCardDragOver}
                    onDragLeave={handleCardDragLeave}
                    onDrop={handleCardDrop}
                    className={`my-1 flex items-center justify-between gap-4 relative overflow-hidden transition-all ${itemCardBg} ${
                      isDraggingCard ? 'ring-2 ring-blue-500 bg-blue-500/10 scale-[1.01]' : ''
                    }`}
                  >
                    {isDraggingCard && (
                      <div className="pointer-events-none absolute inset-0 bg-blue-600/25 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-blue-300 font-black text-xs uppercase tracking-wider gap-1 animate-pulse">
                        <span className="text-3xl">📥</span>
                        <span>¡Suelta la imagen para asignarla a este artículo!</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[11px] font-black px-2 py-0.5 rounded border ${
                          isRetro
                            ? 'bg-[#dfdfdf] border-zinc-400 text-black'
                            : isLight
                              ? 'bg-zinc-100 border-zinc-300 text-zinc-800'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-200'
                        }`}>
                          SKU: {currentItem.code}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          isRetro
                            ? 'bg-blue-100 border-blue-400 text-blue-900'
                            : isLight
                              ? 'bg-blue-50 border-blue-200 text-blue-800'
                              : 'bg-blue-950/70 border-blue-800 text-blue-300'
                        }`}>
                          {currentItem.category}
                        </span>
                      </div>

                      <h2 className={`text-base font-extrabold uppercase leading-snug ${
                        isRetro ? 'text-black' : isLight ? 'text-zinc-900' : 'text-white'
                      }`}>
                        {currentItem.name}
                      </h2>

                      <div className="pt-0.5 flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir desde PC</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async (ev) => {
                                const base64 = ev.target?.result as string;
                                if (base64) {
                                  await saveImageToItem(currentItem, base64, 'main');
                                  if (currentIndex < filteredItems.length - 1) {
                                    setCurrentIndex(prev => prev + 1);
                                  }
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>

                        <span className="px-2.5 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-mono text-[10px] font-extrabold flex items-center gap-1" title="Presiona Ctrl + V en tu teclado para pegarle la imagen copiada">
                          📋 Ctrl + V
                        </span>

                        <span className="px-2.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-extrabold flex items-center gap-1" title="Arrastra y suelta un archivo de imagen directamente aquí">
                          🖱️ Drag & Drop
                        </span>
                      </div>
                    </div>

                    {/* Previsualización única compacta */}
                    <div className="flex flex-col items-center gap-1 shrink-0 relative group">
                      <span className={`text-[8px] font-bold uppercase ${
                        isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-zinc-400'
                      }`}>Fotografía</span>
                      {currentItem.imageUrl ? (
                        <div className="relative">
                          <img src={currentItem.imageUrl} alt="Foto" className="w-24 h-24 object-cover rounded-xl border-2 border-emerald-500 shadow-md bg-white" />
                          <button
                            type="button"
                            onClick={() => deleteImageFromItem(currentItem)}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-transform hover:scale-110 cursor-pointer"
                            title="Eliminar Foto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                          isDraggingCard
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400 scale-105'
                            : isRetro ? 'border-zinc-400 bg-zinc-100 text-zinc-400' : isLight ? 'border-zinc-300 bg-zinc-50 text-zinc-400' : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                        }`}>
                          <ImageIcon className="w-6 h-6 opacity-50" />
                          <span className="text-[8px] font-bold uppercase text-zinc-400">{isDraggingCard ? 'Soltar' : 'Sin Foto'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="my-auto text-center py-6">
                    <Check className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    <h3 className={`text-sm font-extrabold ${
                      isRetro ? 'text-black' : isLight ? 'text-zinc-900' : 'text-white'
                    }`}>¡Todos los productos tienen fotografía! 🎉</h3>
                  </div>
                )}

                {/* 📋 HISTORIAL EN VIVO DE FOTOGRAFÍAS COMPLETADAS */}
                <div className={`p-2.5 rounded-2xl border flex flex-col gap-1.5 ${
                  isRetro
                    ? 'bg-white border-zinc-400 text-black'
                    : isLight
                      ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
                      : 'bg-[#11141d] border-zinc-800 text-zinc-100 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between border-b pb-1">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-emerald-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-wider">
                        Historial en Vivo ({completedHistory.length} Listas)
                      </h4>
                    </div>
                    {completedHistory.length > 0 && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        ✨ {completedHistory.length} asignadas
                      </span>
                    )}
                  </div>

                  {completedHistory.length === 0 ? (
                    <div className="py-3 text-center text-[11px] text-zinc-400 font-medium">
                      📱 Las fotos tomadas con el celular o la PC aparecerán aquí acumuladas en tiempo real.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-0.5 pt-0.5 scrollbar-thin">
                      {completedHistory.map((rec) => (
                        <div 
                          key={rec.id} 
                          className={`shrink-0 w-28 p-1.5 rounded-xl border flex flex-col gap-1 transition-all hover:scale-105 shadow-sm ${
                            isRetro
                              ? 'bg-zinc-100 border-zinc-300 text-black'
                              : isLight
                                ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                                : 'bg-[#1a1e29] border-zinc-800 text-zinc-100'
                          }`}
                        >
                          <div className="relative w-full h-16 rounded-lg overflow-hidden border border-emerald-500/40 bg-white">
                            <img src={rec.imageUrl} alt={rec.name} className="w-full h-full object-cover" />
                            <span className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-md">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          </div>
                          <div className="truncate text-[9px] font-extrabold uppercase leading-tight" title={rec.name}>
                            {rec.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Informativo */}
                <div className={`text-[10px] flex items-center justify-between border-t pt-2 mt-1 ${
                  isRetro ? 'border-zinc-400 text-zinc-800' : isLight ? 'border-zinc-200 text-zinc-600' : 'border-zinc-800 text-zinc-400'
                }`}>
                  <span>💡 Tip: Usa las flechas <kbd className={kbdClass}>↑</kbd> <kbd className={kbdClass}>↓</kbd> <kbd className={kbdClass}>←</kbd> <kbd className={kbdClass}>→</kbd> para navegar, <kbd className={kbdClass}>Ctrl + V</kbd> para pegar o <b>arrastra y suelta</b> la imagen sobre la tarjeta (Drag & Drop).</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Auto-Avance Activado</span>
                </div>
              </div>

            </div>
          ) : (
            /* ──────────────── PESTAÑA 2: MATRIZ DE TABLA RÁPIDA (PC) ──────────────── */
            <div className={`h-full flex flex-col overflow-hidden ${tableOuterBg}`}>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`sticky top-0 z-10 uppercase text-[10px] tracking-wider ${tableHeaderBg}`}>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-32">SKU / Código</th>
                      <th className="p-3">Nombre del Producto / Refacción</th>
                      <th className="p-3 w-32">Categoría</th>
                      <th className="p-3 w-32 text-center">Estado Foto</th>
                      <th className="p-3 w-48 text-center">Acción Rápida PC</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isRetro ? 'divide-zinc-300' : isLight ? 'divide-zinc-200' : 'divide-zinc-800'
                  }`}>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <p className={`text-sm font-extrabold ${isRetro ? 'text-black' : isLight ? 'text-zinc-900' : 'text-white'}`}>
                            No hay artículos pendientes de foto.
                          </p>
                          <p className={`text-xs mt-1 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Selecciona "Todos los Artículos" en la barra superior para ver la lista completa.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const isSelected = idx === currentIndex;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setCurrentIndex(idx)}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentIndex(idx);
                              const files = e.dataTransfer.files;
                              if (!files || files.length === 0) return;
                              const file = (Array.from(files) as File[]).find(f => f.type.startsWith('image/'));
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const base64 = ev.target?.result as string;
                                  if (base64) await saveImageToItem(item, base64, 'main');
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? isRetro
                                  ? 'bg-[#000080]/15 border-l-4 border-l-[#000080]'
                                  : isLight
                                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                                    : 'bg-blue-950/50 border-l-4 border-l-blue-500'
                                : isRetro
                                  ? 'hover:bg-zinc-200'
                                  : isLight
                                    ? 'hover:bg-zinc-50'
                                    : 'hover:bg-zinc-800/50'
                            }`}
                          >
                            <td className={`p-3 text-center font-mono font-bold ${
                              isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-zinc-400'
                            }`}>{idx + 1}</td>
                            <td className={`p-3 font-mono font-bold ${
                              isRetro ? 'text-black' : isLight ? 'text-zinc-900' : 'text-zinc-200'
                            }`}>{item.code}</td>
                            <td className={`p-3 font-bold uppercase ${
                              isRetro ? 'text-black' : isLight ? 'text-zinc-900' : 'text-white'
                            }`}>{item.name}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                isRetro
                                  ? 'bg-[#dfdfdf] border-zinc-400 text-black'
                                  : isLight
                                    ? 'bg-zinc-100 border-zinc-300 text-zinc-800'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-200'
                              }`}>
                                {item.category}
                              </span>
                            </td>

                            {/* Previsualización */}
                            <td className="p-3 text-center">
                              {item.imageUrl ? (
                                <div className="inline-flex items-center gap-1">
                                  <img src={item.imageUrl} alt="Foto" className="w-8 h-8 rounded-lg object-cover border-2 border-emerald-500 bg-white" />
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); deleteImageFromItem(item); }}
                                    className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                                    title="Eliminar foto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-500">Sin foto</span>
                              )}
                            </td>

                            {/* Acciones */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <label className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shadow-xs" title="Subir Foto">
                                  📷 Subir Foto
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const reader = new FileReader();
                                      reader.onload = async (ev) => {
                                        const base64 = ev.target?.result as string;
                                        if (base64) await saveImageToItem(item, base64, 'main');
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                  />
                                </label>

                                <span className={kbdClass} title="Haz clic en la fila y presiona Ctrl + V o arrastra la foto sobre la fila">
                                  Ctrl+V / Arrastrar
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className={`p-3 flex items-center justify-between text-xs ${tableFooterBg}`}>
                <span>Selecciona cualquier fila con click o flechas <kbd className={kbdClass}>↑</kbd> <kbd className={kbdClass}>↓</kbd> y presiona <kbd className={kbdClass}>Ctrl + V</kbd> o <b>arrastra y suelta</b> la imagen sobre la fila (Drag & Drop).</span>
                <span className="font-extrabold">Total listados: {filteredItems.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className={`px-6 py-3 flex justify-end ${modalFooterBg}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-2 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-md ${
              isRetro
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black active:border-t-zinc-700 active:border-l-zinc-700'
                : isLight
                  ? 'bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl'
            }`}
          >
            Listo / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
