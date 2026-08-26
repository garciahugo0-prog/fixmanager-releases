/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Package, Search, PlusCircle, AlertTriangle, CheckCircle, RefreshCw, XCircle, 
  Coins, TrendingUp, Layers, Edit, Trash2, Plus, X, Barcode, Star, Upload, Check, 
  Download, FileSpreadsheet, ChevronLeft, ChevronRight, Cpu, Hammer, Wrench,
  Eye, EyeOff, Sparkles, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { RefaccionItem, InventoryItem, WorkshopConfig, AppUser, Warehouse } from '../types';
import { buildProductLabelHtml } from '../utils/ticketBuilder';
import { DEFAULT_OFFLINE_MODELS } from '../data';
import { PosItemThumbnail } from './pos/PosItemThumbnail';
import { BatchPhotoAssignerModal } from './BatchPhotoAssignerModal';

interface RefaccionesViewProps {
  refacciones: RefaccionItem[];
  inventory?: InventoryItem[];
  onSetRefacciones: (refacciones: RefaccionItem[]) => void;
  onSetInventory?: (inventory: InventoryItem[]) => void;
  config: WorkshopConfig;
  currentUser?: AppUser | null;
  onCreateOrder?: (item: RefaccionItem) => void;
  warehouses?: Warehouse[];
}

const RefaccionMiniature: React.FC<{ imageUrl?: string; extraImages?: string[]; name: string; code?: string; category?: string; price?: number; currencySymbol?: string; isRetro?: boolean }> = ({ imageUrl, extraImages, name, code, category, price, currencySymbol = '$' }) => {
  return (
    <PosItemThumbnail
      imageUrl={imageUrl}
      extraImages={extraImages}
      name={name}
      code={code}
      category={category || 'Refacción'}
      price={price}
      currencySymbol={currencySymbol}
      size={34}
    />
  );
};

const CATEGORIES = [
  'PANTALLAS',
  'BATERIAS',
  'CENTROS DE CARGA',
  'TAPAS',
  'FLEXORES',
  'CAMARAS',
  'BOTONES',
  'BOCINAS / ALTAVOCES',
  'OTROS'
];

const inferCategory = (name: string): string => {
  const norm = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (norm.includes('pantalla') || norm.includes('display') || norm.includes('modulo') || norm.includes('touch') || norm.includes('tactil') || norm.includes('glass') && norm.includes('pantalla')) return 'PANTALLAS';
  if (norm.includes('bateria') || norm.includes('pila')) return 'BATERIAS';
  if (norm.includes('centro de carga') || norm.includes('pin de carga') || norm.includes('centro carga') || norm.includes('conector de carga') || norm.includes('pin carga')) return 'CENTROS DE CARGA';
  if (norm.includes('tapa') || norm.includes('back glass') || norm.includes('cristal trasero') || norm.includes('cristal tapa')) return 'TAPAS';
  if (norm.includes('flex') || norm.includes('flexor')) return 'FLEXORES';
  if (norm.includes('camara') || norm.includes('lente')) return 'CAMARAS';
  if (norm.includes('boton') || norm.includes('encendido') || norm.includes('volumen') || norm.includes('home')) return 'BOTONES';
  if (norm.includes('bocina') || norm.includes('altavoz') || norm.includes('auricular') || norm.includes('buzzer') || norm.includes('parlante')) return 'BOCINAS / ALTAVOCES';

  return 'OTROS';
};

const MAPPABLE_FIELDS = [
  { key: 'code', label: 'Código', synonyms: ['codigo', 'code', 'barcode', 'codigodebarras', 'ean', 'upc', 'clave', 'ref', 'sku', 'id'] },
  { key: 'name', label: 'Refacción *', synonyms: ['refaccion', 'nombre', 'name', 'articulo', 'pieza', 'descripcion', 'descarticulo', 'nomref', 'detalles'] },
  { key: 'category', label: 'Categoría', synonyms: ['categoria', 'category', 'clasificacion', 'tipo', 'linea'] },
  { key: 'brand', label: 'Marca Pieza', synonyms: ['marcapieza', 'marca', 'brand', 'marcaref', 'marcarefaccion', 'fabricante'] },
  { key: 'deviceBrand', label: 'Marca Celular', synonyms: ['marcacelular', 'marcadispositivo', 'devicebrand', 'celularmarca', 'marcaequipo', 'marca_dispositivo'] },
  { key: 'deviceModel', label: 'Modelo Celular', synonyms: ['modelocelular', 'modelodispositivo', 'devicemodel', 'modelo', 'compatibilidad', 'modeloequipo', 'modelo_dispositivo'] },
  { key: 'cost', label: 'Costo', synonyms: ['costo', 'cost', 'compra', 'preciodecompra', 'costounitario', 'preciocompra', 'costounidad', 'inversion'] },
  { key: 'price', label: 'Público / Instalado', synonyms: ['precio', 'price', 'venta', 'preciodeventa', 'preciopublico', 'preciolista', 'pvp', 'publico', 'precio_reparacion', 'reparacion_precio', 'preciorep', 'precio_rep', 'publico_instalado', 'precio_instalado', 'instalado', 'precio_publico_instalado'] },
  { key: 'wholesalePrice', label: 'Mayoreo', synonyms: ['mayoreo', 'preciomayoreo', 'wholesaleprice', 'distribuidor', 'wholesale', 'preciomayorista', 'mayorista', 'mayoreounitario'] },
  { key: 'stock', label: 'Stock', synonyms: ['stock', 'cantidad', 'inventario', 'cant', 'unidades', 'existencia', 'existencias', 'cantdisp', 'disponible'] },
  { key: 'minStock', label: 'Mínimo', synonyms: ['minimo', 'minimoalert', 'stockminimo', 'minstock', 'cantminima', 'stock_minimo'] },
  { key: 'favorite', label: 'Favorito', synonyms: ['favorito', 'favorite', 'destacado', 'fav', 'esfavorito'] },
];

const cleanHeader = (s: string) => s.toLowerCase().trim().replace(/[\s_:.\-\/]+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeText = (text: string): string => {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};

const autoMapHeaders = (headers: string[]): Record<string, string> => {
  const mapping: Record<string, string> = {};
  MAPPABLE_FIELDS.forEach(field => {
    let match = headers.find(h => {
      const cleanedH = cleanHeader(h);
      return field.synonyms.some(syn => cleanedH === cleanHeader(syn));
    });
    if (match) {
      mapping[field.key] = match;
    }
  });
  return mapping;
};

export default function RefaccionesView({ refacciones, inventory = [], onSetRefacciones, onSetInventory, config, currentUser, onCreateOrder, warehouses = [] }: RefaccionesViewProps) {
  console.log('[RefaccionesView Render] refacciones count:', refacciones.length);
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';
  const sym = config.currencySymbol || '$';

  // ─── ESTADOS ───────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'favoritos' | 'agotados' | 'bajoStock'>('todos');
  const [showInactive, setShowInactive] = useState(false);
  const [restockAmount, setRestockAmount] = useState<Record<string, string>>({});
  const [confirmRestockId, setConfirmRestockId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // ─── Dropdown custom de filtro de categoría (barra de filtros) ─────────────
  const [filterCatOpen, setFilterCatOpen] = useState(false);
  const filterCatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filterCatOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterCatRef.current && !filterCatRef.current.contains(e.target as Node)) setFilterCatOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterCatOpen]);

  // Categorías realmente presentes en el inventario visible de refacciones
  const activeCategoriesForFilter = useMemo(() => {
    const cats = new Set<string>();
    (refacciones || []).forEach(item => {
      const isVisible = showInactive || (item.active !== false && !item.deletedAt);
      if (isVisible && item.category) {
        const trimmed = item.category.trim();
        if (trimmed) cats.add(trimmed);
      }
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'es'));
  }, [refacciones, showInactive]);

  // Si la categoría seleccionada ya no existe en el inventario, resetear a TODAS
  useEffect(() => {
    if (selectedCategory !== 'TODAS' && !activeCategoriesForFilter.includes(selectedCategory)) {
      setSelectedCategory('TODAS');
    }
  }, [activeCategoriesForFilter, selectedCategory]);
  
  // Modales
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RefaccionItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isBatchPhotoModalOpen, setIsBatchPhotoModalOpen] = useState(false);

  // Impresión de Etiquetas
  const [printingItem, setPrintingItem] = useState<RefaccionItem | null>(null);
  const [printCopies, setPrintCopies] = useState<number>(1);

  // Formulario Add/Edit
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('GENERICO');
  const [formDeviceBrand, setFormDeviceBrand] = useState('');
  const [formDeviceModel, setFormDeviceModel] = useState('');
  const [formCategory, setFormCategory] = useState('OTROS');
  const [formStock, setFormStock] = useState('0');
  const [formMinStock, setFormMinStock] = useState('0');
  const [formCost, setFormCost] = useState('0');
  const [formPrice, setFormPrice] = useState('0');
  const [formWholesalePrice, setFormWholesalePrice] = useState('0');
  const [formFavorite, setFormFavorite] = useState(false);
  const [formManageStock, setFormManageStock] = useState(true);
  const [formIsGlobal, setFormIsGlobal] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPreviewUrl, setFormPreviewUrl] = useState('');
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [imageQrCodeUrl, setImageQrCodeUrl] = useState('');
  const [uploadSessionId, setUploadSessionId] = useState('');
  const [localIp, setLocalIp] = useState('');
  const [localPort, setLocalPort] = useState(5055);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onProductImageUploaded) {
      api.onProductImageUploaded((data: { sessionId: string; image: string }) => {
        if (data && data.sessionId === uploadSessionId) {
          setFormImageUrl(data.image);
          setShowImageSourceModal(false);
        }
      });
    }
  }, [uploadSessionId]);

  useEffect(() => {
    if (!formImageUrl) {
      setFormPreviewUrl('');
    } else if (formImageUrl.startsWith('data:image/') || formImageUrl.startsWith('http')) {
      setFormPreviewUrl(formImageUrl);
    } else {
      const api = (window as any).electronAPI;
      if (api?.readProductImage) {
        const cleanImg = formImageUrl.split('?')[0];
        api.readProductImage(cleanImg).then((base64: string) => {
          if (base64) setFormPreviewUrl(base64);
        });
      }
    }
  }, [formImageUrl]);

  const processImageBlobToSquareBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 300;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = img.width;
            let sourceHeight = img.height;

            if (img.width > img.height) {
              sourceWidth = img.height;
              sourceX = (img.width - img.height) / 2;
            } else if (img.height > img.width) {
              sourceHeight = img.width;
              sourceY = (img.height - img.width) / 2;
            }

            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve(base64);
          } else {
            reject(new Error('Canvas context error'));
          }
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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
      try {
        const base64 = await processImageBlobToSquareBase64(file);
        setFormImageUrl(base64);
        if (showImageSourceModal) setShowImageSourceModal(false);
      } catch (err) {
        console.error('Error processing dropped image in refacciones:', err);
      }
    }
  };

  useEffect(() => {
    if (!showAddEditModal) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            try {
              const base64 = await processImageBlobToSquareBase64(blob);
              setFormImageUrl(base64);
              if (showImageSourceModal) setShowImageSourceModal(false);
            } catch (err) {
              console.error('Error pasting image in refacciones:', err);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showAddEditModal, showImageSourceModal]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageBlobToSquareBase64(file).then(base64 => {
      setFormImageUrl(base64);
    }).catch(err => console.error(err));
  };

  const handleOpenImageSourceModal = () => {
    const sessId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    setUploadSessionId(sessId);
    setShowImageSourceModal(true);
    
    const api = (window as any).electronAPI;
    if (api?.startLocalServer) {
      api.startLocalServer().then((res: any) => {
        if (res.success) {
          setLocalIp(res.ip);
          setLocalPort(res.port);
          const link = `http://${res.ip}:${res.port}/product-upload?sessionId=${sessId}`;
          QRCode.toDataURL(link, { width: 180, margin: 1 }).then(url => {
            setImageQrCodeUrl(url);
          }).catch(err => {
            console.error('Error generating QR code:', err);
          });
        }
      });
    }
  };

  // Importación Excel
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({});
  const [importError, setImportError] = useState('');
  const [importReplaceMode, setImportReplaceMode] = useState(false); // false = append, true = replace
  const [tempImportedItems, setTempImportedItems] = useState<RefaccionItem[]>([]);
  const [isDetailedPreviewOpen, setIsDetailedPreviewOpen] = useState(false);
  const [previewSearchTerm, setPreviewSearchTerm] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const previewRowsPerPage = 25;

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // ─── PERMISOS ─────────────────────────────────────────────────────────────
  const canEdit = useMemo(() => {
    if (!currentUser) return true;
    return currentUser.permissions.canEditStock ?? true;
  }, [currentUser]);

  // Reset form when modal opens/closes
  const resetForm = (item: RefaccionItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormCode(item.code || '');
      setFormName(item.name || '');
      setFormBrand(item.brand || 'GENERICO');
      setFormDeviceBrand(item.deviceBrand || '');
      setFormDeviceModel(item.deviceModel || '');
      setFormCategory(item.category || 'OTROS');
      setFormStock(String(item.stock));
      setFormMinStock(String(item.minStock ?? 0));
      setFormCost(String(item.cost));
      setFormPrice(String(item.price));
      setFormWholesalePrice(String(item.wholesalePrice !== undefined ? item.wholesalePrice : item.price));
      setFormFavorite(!!item.favorite);
      setFormManageStock(item.manageStock !== undefined ? !!item.manageStock : (item.stock > 0 || item.minStock > 0));
      setFormImageUrl(item.imageUrl || '');
      
      const db = (item.deviceBrand || '').toUpperCase().trim();
      const dm = (item.deviceModel || '').toUpperCase().trim();
      const isGlobal = (db === 'GENERICO' || db === 'UNIVERSAL' || db === 'TODOS' || !db) &&
                      (dm === 'TODOS' || dm === 'UNIVERSAL' || dm === 'GENERICO' || !dm);
      setFormIsGlobal(isGlobal);
    } else {
      setEditingItem(null);
      setFormCode(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
      setFormName('');
      setFormBrand('GENERICO');
      setFormDeviceBrand('');
      setFormDeviceModel('');
      setFormCategory('OTROS');
      setFormStock('0');
      setFormMinStock('0');
      setFormCost('0');
      setFormPrice('0');
      setFormWholesalePrice('0');
      setFormFavorite(false);
      setFormManageStock(true);
      setFormIsGlobal(false);
      setFormImageUrl('');
    }
  };

  const handleOpenAddModal = () => {
    resetForm(null);
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (item: RefaccionItem) => {
    resetForm(item);
    setShowAddEditModal(true);
  };

  const handleNameChange = (nameVal: string) => {
    setFormName(nameVal);

    const norm = nameVal.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // 1. Inferir Categoría
    const cat = inferCategory(nameVal);
    if (cat !== 'OTROS') {
      setFormCategory(cat);
    }

    // 2. Verificar si contiene palabras clave universales/globales
    const isGlobalKeyword = norm.includes('universal') || norm.includes('global') || norm.includes('multimarca') || norm.includes('todos');
    if (isGlobalKeyword) {
      setFormIsGlobal(true);
      return;
    }

    // 3. Buscar coincidencia exacta de marca y modelo
    const sortedModels = [...DEFAULT_OFFLINE_MODELS].sort((a, b) => b.model.length - a.model.length);
    const foundModel = sortedModels.find(m => 
      norm.includes(m.model.toLowerCase()) || 
      (m.modelNumber && norm.includes(m.modelNumber.toLowerCase()))
    );

    if (foundModel) {
      setFormDeviceBrand(foundModel.brand);
      setFormDeviceModel(foundModel.model);
      setFormIsGlobal(false);
    } else {
      // Intentar inferir solo la marca si no se halló modelo específico
      if (norm.includes('iphone') || norm.includes('apple') || norm.includes('ipad') || norm.includes('iwatch')) {
        setFormDeviceBrand('APPLE');
        setFormIsGlobal(false);
      } else if (norm.includes('samsung') || norm.includes('galaxy')) {
        setFormDeviceBrand('SAMSUNG');
        setFormIsGlobal(false);
      } else if (norm.includes('xiaomi') || norm.includes('redmi') || norm.includes('poco')) {
        setFormDeviceBrand('XIAOMI');
        setFormIsGlobal(false);
      } else if (norm.includes('motorola') || norm.includes('moto ')) {
        setFormDeviceBrand('MOTOROLA');
        setFormIsGlobal(false);
      } else if (norm.includes('huawei') || norm.includes('honor')) {
        setFormDeviceBrand('HUAWEI');
        setFormIsGlobal(false);
      } else if (norm.includes('oppo')) {
        setFormDeviceBrand('OPPO');
        setFormIsGlobal(false);
      }
    }
  };

  // ─── ACCIONES CRUD ──────────────────────────────────────────────────────────
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalDeviceBrand = formIsGlobal ? 'GENERICO' : formDeviceBrand.trim().toUpperCase();
    const finalDeviceModel = formIsGlobal ? 'TODOS' : formDeviceModel.trim().toUpperCase();

    if (!formName.trim() || (!formIsGlobal && (!formDeviceBrand.trim() || !formDeviceModel.trim()))) {
      alert('Nombre, Marca Celular y Modelo Celular son requeridos.');
      return;
    }

    const stockNum = Math.max(0, parseInt(formStock) || 0);
    const minStockNum = Math.max(0, parseInt(formMinStock) || 0);
    const costNum = Math.max(0, parseFloat(formCost) || 0);
    const priceNum = Math.max(0, parseFloat(formPrice) || 0);
    const wholesalePriceNum = Math.max(0, parseFloat(formWholesalePrice) || 0);

    const updatedList = [...refacciones];
    const api = (window as any).electronAPI;
    const targetId = editingItem ? editingItem.id : ('REF-' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase());
    let finalImageUrl = editingItem ? (editingItem.imageUrl || '') : '';
    let finalExtraImages: string[] = editingItem?.extraImages ? [...editingItem.extraImages] : [];

    if (formImageUrl.startsWith('data:image/')) {
      let supabaseUrl: string | null = null;
      try {
        const { uploadProductImageToSupabase } = await import('../utils/evidenceUpload');
        supabaseUrl = await uploadProductImageToSupabase('refaccion', targetId, formImageUrl);
      } catch (err) {
        console.error('Error uploading spare part image to Supabase:', err);
      }

      if (supabaseUrl) {
        finalImageUrl = supabaseUrl + '?v=' + Date.now();
      } else {
        // Fallback local
        const fileName = `ref_${targetId}.jpg`;
        const cleanFileName = fileName.split('?')[0];
        if (api?.saveProductImage) {
          await api.saveProductImage(cleanFileName, formImageUrl);
        }
        finalImageUrl = cleanFileName + '?v=' + Date.now();
      }
    } else if (!formImageUrl) {
      if (editingItem && editingItem.imageUrl) {
        if (editingItem.imageUrl.startsWith('http')) {
          try {
            const { deleteProductImageFromSupabase } = await import('../utils/evidenceUpload');
            await deleteProductImageFromSupabase(editingItem.imageUrl);
          } catch (err) {
            console.error('Error deleting spare part image from Supabase:', err);
          }
        } else {
          if (api?.deleteProductImage) {
            await api.deleteProductImage(editingItem.imageUrl.split('?')[0]);
          }
        }
      }
      finalImageUrl = '';
    }

    if (editingItem) {
      // Editar
      const idx = updatedList.findIndex(x => x.id === editingItem.id);
      if (idx !== -1) {
        updatedList[idx] = {
          ...editingItem,
          code: formCode.trim() || '—',
          name: formName.trim().toUpperCase(),
          brand: formBrand.trim().toUpperCase(),
          deviceBrand: finalDeviceBrand,
          deviceModel: finalDeviceModel,
          category: formCategory,
          stock: stockNum,
          minStock: minStockNum,
          cost: costNum,
          price: priceNum,
          wholesalePrice: wholesalePriceNum || priceNum,
          favorite: formFavorite,
          manageStock: formManageStock,
          imageUrl: finalImageUrl,
          extraImages: finalExtraImages
        };
      }
    } else {
      // Agregar nuevo
      const newItem: RefaccionItem = {
        id: targetId,
        code: formCode.trim() || '—',
        name: formName.trim().toUpperCase(),
        brand: formBrand.trim().toUpperCase(),
        deviceBrand: finalDeviceBrand,
        deviceModel: finalDeviceModel,
        category: formCategory,
        stock: stockNum,
        minStock: minStockNum,
        cost: costNum,
        price: priceNum,
        wholesalePrice: wholesalePriceNum || priceNum,
        favorite: formFavorite,
        manageStock: formManageStock,
        imageUrl: finalImageUrl,
        extraImages: finalExtraImages
      };
      updatedList.unshift(newItem);
    }

    onSetRefacciones(updatedList);
    setShowAddEditModal(false);
  };

  const handleDeleteItem = async (id: string) => {
    const itemToDelete = refacciones.find(x => x.id === id);
    if (!window.confirm('¿Está seguro de eliminar esta refacción del catálogo?')) return;
    
    if (itemToDelete && itemToDelete.imageUrl) {
      if (itemToDelete.imageUrl.startsWith('http')) {
        try {
          const { deleteProductImageFromSupabase } = await import('../utils/evidenceUpload');
          await deleteProductImageFromSupabase(itemToDelete.imageUrl);
        } catch (err) {
          console.error('Error deleting spare part image from Supabase:', err);
        }
      } else {
        const api = (window as any).electronAPI;
        if (api?.deleteProductImage) {
          await api.deleteProductImage(itemToDelete.imageUrl.split('?')[0]);
        }
      }
    }
    
    const filtered = refacciones.filter(x => x.id !== id);
    onSetRefacciones(filtered);
  };

  const handleToggleActive = (id: string) => {
    const updated = refacciones.map(item => {
      if (item.id === id) {
        return { ...item, active: item.active === false ? true : false };
      }
      return item;
    });
    onSetRefacciones(updated);
  };

  const handleQuickStockAdjustment = (id: string, delta: number) => {
    const updated = refacciones.map(item => {
      if (item.id === id) {
        const next = Math.max(0, item.stock + delta);
        return { ...item, stock: next };
      }
      return item;
    });
    onSetRefacciones(updated);
  };

  const handleQuickRestock = (id: string, name: string) => {
    const amountStr = restockAmount[id] !== undefined ? restockAmount[id] : '10';
    const amount = Math.max(0, parseInt(amountStr) || 0);
    if (amount <= 0) return;
    
    const updated = refacciones.map(item => {
      if (item.id === id) {
        const next = item.stock + amount;
        return { ...item, stock: next };
      }
      return item;
    });
    onSetRefacciones(updated);
    
    setFeedback(`¡Se añadieron +${amount} unidades a "${name}" exitosamente!`);
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleToggleFavorite = (id: string) => {
    const updated = refacciones.map(item => {
      if (item.id === id) {
        return { ...item, favorite: !item.favorite };
      }
      return item;
    });
    onSetRefacciones(updated);
  };

  // ─── EXCEL IMPORT / EXPORT ──────────────────────────────────────────────────
  const handleExportExcel = () => {
    const dataToExport = refacciones.map(item => ({
      'Código': item.code,
      'Refacción': item.name,
      'Categoría': item.category,
      'Marca Pieza': item.brand,
      'Marca Celular': item.deviceBrand,
      'Modelo Celular': item.deviceModel,
      'Costo': item.cost,
      'Público / Instalado': item.price,
      'Mayoreo': item.wholesalePrice || 0,
      'Stock': item.stock,
      'Mínimo': item.minStock,
      'Favorito': item.favorite ? 'SI' : 'NO',
      'Inversión Total': item.stock * item.cost,
      'Valor Estimado': item.stock * item.price,
      'Ganancia Estimada': item.stock * (item.price - item.cost)
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Refacciones');
    XLSX.writeFile(wb, `Inventario_Refacciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const headers = "Código,Refacción,Categoría,Marca Pieza,Marca Celular,Modelo Celular,Costo,Público / Instalado,Mayoreo,Stock,Mínimo,Favorito\n";
    const row1 = "REF-IPH11-PAN,PANTALLA INCELL,PANTALLAS,GENERICO,APPLE,IPHONE 11,450.00,1200.00,1050.00,5,2,SI\n";
    const row2 = "REF-IPH11-BAT,BATERIA PREMIUM,BATERIAS,OEM,SAMSUNG,GALAXY S20,250.00,800.00,700.00,3,1,NO\n";
    const csvContent = "\uFEFF" + headers + row1 + row2;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_inventario_refacciones.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setImportFile(file);
    setImportError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length === 0) {
          setImportError('El archivo Excel está vacío.');
          return;
        }

        const headers = (data[0] as string[]).map(h => String(h || '').trim());
        setImportHeaders(headers);
        
        // Mapear automáticamente
        const automap = autoMapHeaders(headers);
        setHeaderMapping(automap);

        // Filas útiles
        const rows = data.slice(1).filter((r: any) => r.length > 0 && r.some((val: any) => val !== null && val !== ''));
        setImportRows(rows);
      } catch (err) {
        setImportError('Error leyendo el archivo de Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Efecto para parsear filas reactivamente cuando cambian filas o mapeo
  useEffect(() => {
    if (importRows.length === 0) {
      setTempImportedItems([]);
      return;
    }
    const headers = importHeaders;
    const parsed: RefaccionItem[] = [];

    importRows.forEach((row, rIdx) => {
      const getVal = (key: string): any => {
        const headerName = headerMapping[key];
        if (!headerName) return undefined;
        const hIdx = headers.indexOf(headerName);
        if (hIdx === -1) return undefined;
        return row[hIdx];
      };

      const name = String(getVal('name') || '').trim();
      const deviceBrand = String(getVal('deviceBrand') || '').trim();
      const deviceModel = String(getVal('deviceModel') || '').trim();

      if (!name || !deviceBrand || !deviceModel) return;

      const code = String(getVal('code') || '').trim() || '—';
      const brand = String(getVal('brand') || 'GENERICO').trim().toUpperCase();
      const categoryRaw = String(getVal('category') || '').trim().toUpperCase();
      const category = CATEGORIES.includes(categoryRaw) ? categoryRaw : inferCategory(name);

      const rawStock = getVal('stock');
      const manageStock = rawStock !== undefined && rawStock !== null && String(rawStock).trim() !== '';
      const stock = manageStock ? Math.max(0, parseInt(String(rawStock)) || 0) : 0;
      const minStock = Math.max(0, parseInt(getVal('minStock')) || 0);
      const cost = Math.max(0, parseFloat(getVal('cost')) || 0);
      const price = Math.max(0, parseFloat(getVal('price')) || 0);
      const rawWholesalePrice = getVal('wholesalePrice');
      const wholesalePrice = rawWholesalePrice !== undefined && rawWholesalePrice !== null && String(rawWholesalePrice).trim() !== ''
        ? Math.max(0, parseFloat(String(rawWholesalePrice)) || 0)
        : price;
      const favRaw = String(getVal('favorite') || '').toLowerCase().trim();
      const favorite = favRaw === 'true' || favRaw === 'si' || favRaw === 'yes' || favRaw === 's' || favRaw === 'y' || getVal('favorite') === 1;

      parsed.push({
        id: 'REF-IMP-' + rIdx + '-' + Math.random().toString(36).substr(2,4).toUpperCase(),
        code,
        name: name.toUpperCase(),
        brand,
        deviceBrand: deviceBrand.toUpperCase(),
        deviceModel: deviceModel.toUpperCase(),
        category,
        stock,
        minStock,
        cost,
        price,
        wholesalePrice: wholesalePrice || price,
        favorite,
        manageStock
      });
    });

    setTempImportedItems(parsed);
  }, [importRows, headerMapping, importHeaders]);

  // Filtrar en base al término de búsqueda para la previsualización completa
  const filteredPreviewItems = useMemo(() => {
    if (!previewSearchTerm.trim()) return tempImportedItems;
    const normSearch = normalizeText(previewSearchTerm);
    return tempImportedItems.filter(it =>
      normalizeText(it.name).includes(normSearch) ||
      normalizeText(it.code).includes(normSearch) ||
      normalizeText(it.brand).includes(normSearch) ||
      normalizeText(it.deviceBrand).includes(normSearch) ||
      normalizeText(it.deviceModel).includes(normSearch) ||
      normalizeText(it.category || '').includes(normSearch)
    );
  }, [tempImportedItems, previewSearchTerm]);

  useEffect(() => {
    setPreviewPage(1);
  }, [previewSearchTerm]);

  const totalPreviewPages = Math.ceil(filteredPreviewItems.length / previewRowsPerPage) || 1;
  const paginatedPreviewItems = useMemo(() => {
    const startIdx = (previewPage - 1) * previewRowsPerPage;
    return filteredPreviewItems.slice(startIdx, startIdx + previewRowsPerPage);
  }, [filteredPreviewItems, previewPage]);

  const handleConfirmImport = () => {
    const hasName = !!headerMapping['name'];
    const hasBrand = !!headerMapping['deviceBrand'];
    const hasModel = !!headerMapping['deviceModel'];

    if (!hasName || !hasBrand || !hasModel) {
      alert('Debes mapear obligatoriamente la Refacción, Marca Celular y Modelo Celular.');
      return;
    }

    if (tempImportedItems.length === 0) {
      alert('No se importó ninguna fila válida. Asegúrese de mapear los campos obligatorios correctamente.');
      return;
    }

    if (importReplaceMode) {
      onSetRefacciones(tempImportedItems);
    } else {
      const merged = [...tempImportedItems, ...refacciones];
      onSetRefacciones(merged);
    }
    setShowImportModal(false);
    setIsDetailedPreviewOpen(false);
    setImportFile(null);
    setImportHeaders([]);
    setImportRows([]);
    setHeaderMapping({});
    setTempImportedItems([]);
    
    if (importReplaceMode) {
      alert(`Importación finalizada. Se REEMPLAZÓ el catálogo con ${tempImportedItems.length} refacciones correctamente.`);
    } else {
      alert(`Importación finalizada. Se AÑADIERON ${tempImportedItems.length} refacciones al catálogo existente.`);
    }
  };

  // ─── FILTROS Y BÚSQUEDA ─────────────────────────────────────────────────────
  const filteredList = useMemo(() => {
    return refacciones.filter(item => {
      if (!showInactive && item.active === false) return false;

      if (selectedCategory !== 'TODAS' && item.category !== selectedCategory) return false;

      if (selectedStatus === 'favoritos' && !item.favorite) return false;
      if (selectedStatus === 'agotados' && item.stock > 0) return false;
      if (selectedStatus === 'bajoStock' && (item.manageStock === false || (item.minStock <= 0 && item.stock > 0) || item.stock > item.minStock)) return false;

      if (searchQuery.trim() !== '') {
        const normSearch = normalizeText(searchQuery);
        const matchesName = normalizeText(item.name).includes(normSearch);
        const matchesCode = normalizeText(item.code).includes(normSearch);
        const matchesBrand = normalizeText(item.brand).includes(normSearch);
        const matchesDeviceBrand = normalizeText(item.deviceBrand).includes(normSearch);
        const matchesDeviceModel = normalizeText(item.deviceModel).includes(normSearch);
        return matchesName || matchesCode || matchesBrand || matchesDeviceBrand || matchesDeviceModel;
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [refacciones, selectedCategory, selectedStatus, searchQuery, showInactive]);

  const stats = useMemo(() => {
    let inversion = 0;
    let valorEstimado = 0;
    let piezasCriticas = 0;
    
    refacciones.forEach(item => {
      if (item.active !== false) {
        const stockNum = Number(item.stock) || 0;
        const costNum = Number(item.cost) || 0;
        const priceNum = Number(item.price) || 0;
        const minStockNum = Number(item.minStock) || 0;

        if (stockNum > 0) {
          inversion += (stockNum * costNum);
          valorEstimado += (stockNum * priceNum);
        }
        if (item.manageStock !== false && ((minStockNum > 0 && stockNum <= minStockNum) || stockNum === 0)) {
          piezasCriticas++;
        }
      }
    });

    return {
      inversion,
      valorEstimado,
      ganancia: valorEstimado - inversion,
      piezasCriticas,
      totalCatalog: refacciones.filter(x => x.active !== false).length
    };
  }, [refacciones]);

  const paginatedList = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredList, currentPage]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedStatus, searchQuery]);

  const renderBarcodeLines = (code: string) => {
    const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '') || '750912300';
    const bars: React.ReactNode[] = [];
    for (let i = 0; i < 36; i++) {
      const charCode = cleanCode.charCodeAt(i % cleanCode.length) || 68;
      const w1 = (charCode % 3) + 1;
      const w2 = ((charCode + i) % 2) + 1;
      bars.push(<div key={`b-${i}`} className="bg-black shrink-0" style={{ width: `${w1}px`, height: '100%' }} />);
      bars.push(<div key={`s-${i}`} className="bg-transparent shrink-0" style={{ width: `${w2}px`, height: '100%' }} />);
    }
    return <div className="flex h-10 items-stretch justify-center bg-white w-full select-none">{bars}</div>;
  };

  const themeCardCls = isRetro 
    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 text-black shadow'
    : isLight
    ? 'bg-white border border-zinc-200 text-zinc-800 shadow-md'
    : 'bg-[#121316] border border-[#1c1d22] text-zinc-100 shadow-xl';

  const themeInputCls = isRetro
    ? 'bg-white border-2 border-t-zinc-400 border-l-zinc-400 border-b-white border-r-white text-black font-mono focus:outline-none text-xs px-2.5 py-1.5'
    : isLight
    ? 'bg-white border border-zinc-300 rounded-lg text-zinc-850 focus:border-cyan-500 focus:outline-none text-xs px-3 py-2'
    : 'bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-cyan-500 focus:outline-none text-xs px-3 py-2';

  const themeBtnCls = isRetro
    ? 'bg-zinc-200 border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 font-bold active:scale-[0.98] text-black px-3 py-1.5 cursor-pointer text-xs'
    : 'bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-4 py-2 transition-transform active:scale-[0.97] cursor-pointer text-xs font-bold shadow-md';

  const themeTableHeadCls = isRetro
    ? 'bg-[#000080] text-white border-b-2 border-zinc-400 font-bold text-xs uppercase px-3 py-2 select-none'
    : isLight
    ? 'bg-slate-100/80 text-slate-700 font-bold text-xs uppercase px-3.5 py-2 border-b border-zinc-200 select-none'
    : 'bg-[#0f1013] text-zinc-450 font-bold text-xs uppercase px-3.5 py-2.5 border-b border-zinc-800 select-none';

  const themeTableRowCls = (idx: number) => {
    if (isRetro) return 'hover:bg-zinc-100/50 border-b border-zinc-300 text-xs font-mono';
    const isEven = idx % 2 === 0;
    const base = isLight ? 'border-b border-zinc-100 hover:bg-zinc-50/70 text-xs' : 'border-b border-[#1c1d22] hover:bg-[#16171c]/60 text-xs';
    return isEven ? base : base + (isLight ? ' bg-zinc-50/20' : ' bg-zinc-950/[0.15]');
  };

  const themeTableCellCls = 'px-3.5 py-2.5 vertical-align-middle';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 space-y-4 md:space-y-6">
      
      {/* ─── Encabezado Principal ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className={`text-xl md:text-2xl font-black uppercase tracking-wider ${isRetro ? 'font-mono text-black' : isLight ? 'text-zinc-800' : 'text-white'}`}>
            🛠️ Catálogo e Inventario de Refacciones
          </h1>
          <p className={`text-[10.5px] font-medium font-mono uppercase tracking-widest ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Taller de Reparación & Soporte Técnico
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button 
              onClick={handleOpenAddModal} 
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] font-display font-semibold uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar Refacción
            </button>
          )}
          {canEdit && (
            <button 
              onClick={() => { setShowImportModal(true); setImportError(''); }}
              className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(147,51,234,0.2)] font-display font-semibold uppercase tracking-wider text-left"
            >
              <Upload className="w-3.5 h-3.5" /> Importar Excel
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setIsBatchPhotoModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-md font-display uppercase tracking-wider"
              title="Asignación rápida de fotos en lote desde celular con QR o matriz en PC"
            >
              <Sparkles className="w-3.5 h-3.5" /> ⚡ Cargar Fotos en Lote
            </button>
          )}
          <button 
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(249,115,22,0.2)] font-display font-semibold uppercase tracking-wider"
          >
            <Download className="w-3.5 h-3.5" /> Exportar a Excel
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded-md shadow-lg animate-fadeIn shrink-0">
          {feedback}
        </div>
      )}

      {/* ─── Tarjetas de Resumen Financiero ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 shrink-0">
        
        <div className={`p-3.5 rounded-xl ${themeCardCls} flex flex-col justify-between`}>
          <span className={`text-[10px] uppercase font-black tracking-wider ${isRetro ? 'text-zinc-500' : 'text-zinc-450'}`}>Inversión Stock</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg md:text-xl font-black font-mono">
              {sym}{stats.inversion.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <Coins className="w-5 h-5 opacity-40 text-cyan-500" />
          </div>
        </div>

        <div className={`p-3.5 rounded-xl ${themeCardCls} flex flex-col justify-between`}>
          <span className={`text-[10px] uppercase font-black tracking-wider ${isRetro ? 'text-zinc-500' : 'text-zinc-450'}`}>Valor Estimado</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg md:text-xl font-black font-mono">
              {sym}{stats.valorEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <TrendingUp className="w-5 h-5 opacity-40 text-emerald-500" />
          </div>
        </div>

        <div className={`p-3.5 rounded-xl ${themeCardCls} flex flex-col justify-between`}>
          <span className={`text-[10px] uppercase font-black tracking-wider ${isRetro ? 'text-zinc-500' : 'text-zinc-450'}`}>Ganancia Estimada</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg md:text-xl font-black font-mono text-emerald-500">
              {sym}{stats.ganancia.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <CheckCircle className="w-5 h-5 opacity-40 text-emerald-500" />
          </div>
        </div>

        <div className={`p-3.5 rounded-xl ${themeCardCls} flex flex-col justify-between`}>
          <span className={`text-[10px] uppercase font-black tracking-wider ${isRetro ? 'text-zinc-500' : 'text-zinc-450'}`}>Refacciones Críticas</span>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-lg md:text-xl font-black font-mono ${stats.piezasCriticas > 0 ? 'text-rose-500 animate-pulse' : ''}`}>
              {stats.piezasCriticas}
            </span>
            <AlertTriangle className={`w-5 h-5 opacity-40 ${stats.piezasCriticas > 0 ? 'text-rose-500' : 'text-zinc-400'}`} />
          </div>
        </div>

        <div className={`p-3.5 rounded-xl ${themeCardCls} flex flex-col justify-between col-span-2 lg:col-span-1`}>
          <span className={`text-[10px] uppercase font-black tracking-wider ${isRetro ? 'text-zinc-500' : 'text-zinc-450'}`}>Modelos en Catálogo</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg md:text-xl font-black font-mono">
              {stats.totalCatalog}
            </span>
            <Layers className="w-5 h-5 opacity-40 text-violet-500" />
          </div>
        </div>

      </div>

      {/* ─── Filtros y Buscador ─── */}
      <div className={`p-4 rounded-xl shrink-0 ${themeCardCls} flex flex-col md:flex-row md:flex-wrap gap-3 items-stretch md:items-center`}>
        
        {/* Buscador en cápsula */}
        <div className="premium-search-container flex-1 shrink-0 select-none flex items-center">
          <div className="flex items-center text-zinc-400 shrink-0">
            <Search className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="w-[1px] h-4 bg-zinc-700/50 mx-3 shrink-0"></div>
          <div className="relative flex-1 flex items-center h-full">
            <input
              type="text"
              placeholder="Buscar por código, nombre, marca de pieza, marca/modelo de celular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="premium-search-input pr-6"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 dark:hover:text-white transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categoría */}
        <div className="w-full md:w-56 relative" ref={filterCatRef}>
          <button
            type="button"
            onClick={() => setFilterCatOpen(!filterCatOpen)}
            className={`w-full flex items-center justify-between text-xs font-bold px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer ${
              isRetro
                ? 'bg-white border-2 border-t-zinc-400 border-l-zinc-400 border-b-white border-r-white text-black font-mono'
                : isLight
                  ? 'bg-white border-zinc-300 text-zinc-800 hover:border-zinc-400'
                  : 'bg-zinc-900 border-zinc-700 text-white hover:border-zinc-500'
            } ${filterCatOpen ? (isLight ? 'border-cyan-400 ring-1 ring-cyan-400/30' : 'border-cyan-500 ring-1 ring-cyan-500/20') : ''}`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <span>📁</span>
              <span className="truncate">{selectedCategory === 'TODAS' ? 'TODAS LAS CATEGORÍAS' : selectedCategory}</span>
            </span>
            <span className={`text-[10px] shrink-0 transition-transform ${filterCatOpen ? 'rotate-180' : ''} ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>▾</span>
          </button>

          {filterCatOpen && (
            <div className={`absolute z-50 top-full mt-1 w-full min-w-[180px] rounded-lg shadow-2xl border overflow-hidden ${
              isRetro
                ? 'bg-[#ece9d8] border-zinc-500 text-black'
                : isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-zinc-900 border-zinc-700 text-white shadow-black/80'
            }`}>
              <div className="max-h-52 overflow-y-auto">
                {/* Opción TODOS */}
                <div
                  onClick={() => { setSelectedCategory('TODAS'); setFilterCatOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs font-semibold transition-colors ${
                    selectedCategory === 'TODAS'
                      ? (isRetro ? 'bg-blue-800 text-white' : 'bg-blue-600 text-white')
                      : (isRetro ? 'hover:bg-blue-100 text-black' : isLight ? 'hover:bg-zinc-100 text-zinc-800' : 'hover:bg-zinc-800 text-zinc-200')
                  }`}
                >
                  {selectedCategory === 'TODAS' && <span className="text-[10px]">✓</span>}
                  <span className={selectedCategory !== 'TODAS' ? 'ml-3.5' : ''}>📁 TODAS LAS CATEGORÍAS</span>
                </div>
                {/* Divisor */}
                <div className={`h-px mx-2 ${isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`} />
                {/* Categorías — solo las que existen en el inventario */}
                {activeCategoriesForFilter.map(cat => (
                  <div
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setFilterCatOpen(false); }}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? (isRetro ? 'bg-blue-800 text-white' : 'bg-blue-600 text-white')
                        : (isRetro ? 'hover:bg-blue-100 text-black' : isLight ? 'hover:bg-zinc-100 text-zinc-800' : 'hover:bg-zinc-800 text-zinc-200')
                    }`}
                  >
                    {selectedCategory === cat && <span className="text-[10px]">✓</span>}
                    <span className={selectedCategory !== cat ? 'ml-3.5' : ''}>{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Estado del Stock */}
        <div className="overflow-x-auto shrink-0 max-w-full">
        <div className="flex items-center gap-1 bg-zinc-950/[0.25] p-1 border border-zinc-800 rounded-lg min-w-max">
          {(['todos', 'favoritos', 'agotados', 'bajoStock'] as const).map(status => {
            const isActive = selectedStatus === status;
            const labels = { todos: 'Todos', favoritos: '⭐ Favoritos', agotados: 'Agotados', bajoStock: 'Stock Bajo' };
            const activeStyle = isRetro
              ? 'bg-[#000080] text-white font-mono px-3 py-1 text-[11px] font-bold'
              : 'bg-cyan-600/25 border border-cyan-500/40 text-cyan-405 font-bold px-3 py-1.5 rounded-md text-xs';
            const inactiveStyle = isRetro
              ? 'text-zinc-600 hover:bg-zinc-200/50 font-mono px-3 py-1 text-[11px]'
              : 'text-zinc-400 hover:text-white px-3 py-1.5 rounded-md text-xs transition-colors';
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`cursor-pointer ${isActive ? activeStyle : inactiveStyle}`}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>
        </div>

        {/* Mostrar Inactivos */}
        <label className={`flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-black uppercase shrink-0 ${isRetro ? 'text-black font-mono' : 'text-zinc-400 hover:text-zinc-200'} transition-colors`}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
          />
          <span>Mostrar Inactivos</span>
        </label>

      </div>

      {/* ─── Tabla del Inventario ─── */}
      <div className={`flex-1 min-h-0 overflow-hidden rounded-xl border flex flex-col ${
        isRetro ? 'bg-white border-zinc-350 shadow' 
        : isLight ? 'bg-white border-zinc-200' 
        : 'bg-[#0f1013] border-[#1b1c21]'
      }`}>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={themeTableHeadCls}>Código</th>
                <th className={themeTableHeadCls}>Refacción</th>
                <th className={themeTableHeadCls}>Categoría</th>
                <th className={themeTableHeadCls}>Marca Pieza</th>
                <th className={themeTableHeadCls}>Marca Celular</th>
                <th className={themeTableHeadCls}>Modelo Celular</th>
                <th className={`${themeTableHeadCls} text-right`}>Costo</th>
                <th className={`${themeTableHeadCls} text-right`}>Público / Instalado</th>
                <th className={`${themeTableHeadCls} text-right`}>Mayoreo</th>
                <th className={`${themeTableHeadCls} text-center`}>Stock</th>
                <th className={`${themeTableHeadCls} text-center`}>Mínimo</th>
                <th className={`${themeTableHeadCls} text-center`}>Estado</th>
                <th className={`${themeTableHeadCls} text-center`}>Favorito</th>
                {canEdit && <th className={`${themeTableHeadCls} text-center`}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={11} className={`text-center py-16 text-sm font-semibold opacity-40 ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No se encontraron refacciones con los filtros activos.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => {
                  const controlsStock = item.manageStock !== false;
                  const isAgotado = controlsStock && item.stock === 0;
                  const isBajoStock = controlsStock && ((item.minStock > 0 && item.stock <= item.minStock) || item.stock === 0);
                  const isInactive = item.active === false;

                  const whStock = Object.values(item.warehouseStock || {}).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number;
                  const totalStock = item.stock + whStock;
                  const breakdown = `Tienda: ${item.stock}${Object.entries(item.warehouseStock || {})
                      .filter(([_, qty]) => (qty as number) > 0)
                      .map(([whId, qty]) => {
                        const whName = warehouses.find(w => w.id === whId)?.name || 'Bodega';
                        return ` | ${whName}: ${qty}`;
                      })
                      .join('')
                    } · Total: ${totalStock}`;

                  return (
                    <tr key={item.id} className={`${themeTableRowCls(idx)} ${isInactive ? 'opacity-45 bg-rose-950/5' : ''}`}>
                      <td className={`${themeTableCellCls} font-mono font-bold text-zinc-500`}>
                        {item.code || '—'}
                      </td>
                      <td className={`${themeTableCellCls} font-bold ${isLight ? 'text-zinc-800' : 'text-white'} max-w-[280px]`}>
                        <div className="flex items-center gap-2.5 break-words whitespace-normal">
                          <RefaccionMiniature imageUrl={item.imageUrl} extraImages={item.extraImages} name={item.name} code={item.code} category={item.category} price={item.price} currencySymbol={config.currencySymbol} isRetro={isRetro} />
                          <span className="break-all whitespace-normal">{item.name}</span>
                        </div>
                      </td>
                      <td className={`${themeTableCellCls} opacity-80 text-[11px]`}>
                        {item.category}
                      </td>
                      <td className={themeTableCellCls}>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wide ${
                          isRetro ? 'bg-zinc-200 text-black border border-zinc-400'
                          : isLight ? 'bg-slate-100 text-slate-700'
                          : 'bg-zinc-800/60 text-zinc-300'
                        }`}>
                          {item.brand}
                        </span>
                      </td>
                      <td className={`${themeTableCellCls} font-mono font-bold max-w-[140px] break-all whitespace-normal ${isLight ? 'text-indigo-800' : 'text-cyan-400'}`}>
                        {item.deviceBrand || '—'}
                      </td>
                      <td className={`${themeTableCellCls} font-mono font-bold max-w-[160px] break-all whitespace-normal ${isLight ? 'text-indigo-700' : 'text-cyan-300'}`}>
                        {item.deviceModel || '—'}
                      </td>
                      <td className={`${themeTableCellCls} text-right font-mono font-bold text-zinc-400`}>
                        {sym}{item.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`${themeTableCellCls} text-right font-mono font-bold`}>
                        <span className={isLight ? 'text-emerald-800' : 'text-emerald-450'}>
                          {sym}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className={`${themeTableCellCls} text-right font-mono font-bold`}>
                        <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>
                          {sym}{(item.wholesalePrice !== undefined ? item.wholesalePrice : item.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className={`${themeTableCellCls} text-center`} title={config.enableWarehouses === true ? breakdown : undefined}>
                        <div className="flex flex-col items-center justify-center cursor-help">
                          {item.manageStock === false ? (
                            <span className="bg-indigo-950/40 text-indigo-400 px-2.5 py-1 text-[10px] font-bold uppercase rounded border border-indigo-800/45 flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5" /> ILIMITADO
                            </span>
                          ) : isAgotado ? (
                            <span className="bg-rose-950/40 text-rose-500 px-2.5 py-1 text-[10px] font-bold uppercase rounded border border-rose-800/45 flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" /> AGOTADO {config.enableWarehouses === true && whStock > 0 && <span className="text-[9px] bg-amber-500 text-black px-1 rounded ml-1 font-extrabold">+{whStock} en bodega</span>}
                            </span>
                          ) : isBajoStock ? (
                            <span className="bg-amber-950/40 text-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase rounded border border-amber-800/45 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> CRÍTICO ({item.stock}) {config.enableWarehouses === true && whStock > 0 && <span className="text-[9px] bg-amber-500 text-black px-1 rounded ml-1 font-extrabold">+{whStock}</span>}
                            </span>
                          ) : (
                            <span className="bg-emerald-950/40 text-emerald-400 px-2.5 py-1 text-[10px] font-bold uppercase rounded border border-emerald-800/45 flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" /> OK ({item.stock}) {config.enableWarehouses === true && whStock > 0 && <span className="text-[9px] bg-amber-500 text-black px-1 rounded ml-1 font-extrabold">+{whStock}</span>}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${themeTableCellCls} text-center font-mono text-[11px] ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                        {item.manageStock === false ? '—' : `${item.minStock ?? 0} pz`}
                      </td>
                      <td className={`${themeTableCellCls} text-center`}>
                        {!controlsStock ? (
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                            isRetro ? 'bg-zinc-200 border-zinc-400 text-[#000080] border'
                            : isLight ? 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                            : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                          }`}>
                            Bajo Pedido
                          </span>
                        ) : isAgotado ? (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse">
                            Agotado
                          </span>
                        ) : isBajoStock ? (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                            Bajo Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                            En Stock
                          </span>
                        )}
                      </td>
                      {/* Favorito */}
                      <td className={`${themeTableCellCls} text-center`}>
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(item.id)}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            item.favorite
                              ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                              : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40'
                          }`}
                          title={item.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                        >
                          <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-500 text-amber-500' : 'fill-transparent text-zinc-500'}`} />
                        </button>
                      </td>
                      {canEdit && (
                        <td className={`${themeTableCellCls} text-center`}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Acción Rápida: Surtir / Reabastecer */}
                            {controlsStock ? (
                              <div className={`flex items-center rounded overflow-hidden border ${isRetro
                                  ? 'border-zinc-300'
                                  : isLight
                                    ? 'border-zinc-200 text-zinc-700'
                                    : 'border-zinc-800'
                                }`}>
                                <input
                                  type="number"
                                  placeholder="Cant"
                                  value={restockAmount[item.id] !== undefined ? restockAmount[item.id] : '10'}
                                  onChange={(e) => setRestockAmount(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  className={`w-11 text-center text-xs font-mono font-bold py-1 focus:outline-none border-r ${isRetro
                                      ? 'bg-white text-zinc-900 border-r-zinc-300'
                                      : isLight
                                        ? 'bg-white text-zinc-900 border-r-zinc-200'
                                        : 'bg-transparent text-emerald-450 border-r-zinc-700'
                                    }`}
                                  style={{
                                    MozAppearance: 'textfield',
                                    WebkitAppearance: 'none'
                                  }}
                                />
                                <button
                                  onClick={() => confirmRestockId === item.id ? (handleQuickRestock(item.id, item.name), setConfirmRestockId(null)) : setConfirmRestockId(item.id)}
                                  className={`px-3 py-1 font-sans font-black uppercase text-[10px] tracking-wider transition-all select-none cursor-pointer ${confirmRestockId === item.id
                                      ? 'bg-emerald-600 text-white'
                                      : isRetro
                                        ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-850'
                                        : isLight
                                          ? 'bg-zinc-105 hover:bg-zinc-200 text-zinc-700'
                                          : 'bg-zinc-900 text-emerald-500 hover:bg-zinc-700 hover:text-white'
                                     }`}
                                  title="Reabastecer rápidamente"
                                >
                                  {confirmRestockId === item.id ? '✓ Confirmar' : 'Surtir'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-550 font-mono italic opacity-60">
                                Bajo Pedido
                              </span>
                            )}
                            {onCreateOrder && (
                              <button
                                onClick={() => onCreateOrder(item)}
                                title="Crear Orden de Reparación"
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  isRetro ? 'bg-zinc-200 border border-zinc-400 text-black hover:bg-zinc-150'
                                  : 'bg-zinc-800/60 hover:bg-emerald-500/10 text-emerald-450 hover:text-emerald-350'
                                }`}
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Editar"
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                isRetro ? 'bg-zinc-200 border border-zinc-400 text-black hover:bg-zinc-150'
                                : 'bg-zinc-800/60 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300'
                              }`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Imprimir Etiqueta */}
                            <button
                              onClick={() => setPrintingItem(item)}
                              title="Imprimir etiqueta de código de barras"
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                isRetro ? 'bg-zinc-200 border border-zinc-400 text-black hover:bg-zinc-150'
                                : 'bg-zinc-800/60 hover:bg-sky-500/10 text-sky-400 hover:text-sky-300'
                              }`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(item.id)}
                              title={isInactive ? "Activar refacción" : "Desactivar refacción"}
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                isRetro ? 'bg-zinc-200 border border-zinc-400 text-black hover:bg-zinc-150'
                                : isInactive
                                  ? 'bg-zinc-800/60 hover:bg-emerald-500/10 text-emerald-450 hover:text-emerald-350'
                                  : 'bg-zinc-800/60 hover:bg-amber-500/10 text-amber-500 hover:text-amber-450'
                              }`}
                            >
                              {isInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              title="Eliminar"
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                isRetro ? 'bg-zinc-200 border border-zinc-400 text-black hover:bg-zinc-150'
                                : 'bg-zinc-800/60 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Paginación ─── */}
        <div className={`px-4 py-3 shrink-0 flex items-center justify-between border-t ${
          isRetro ? 'bg-[#dfdfdf] border-t-zinc-400 text-black font-mono'
          : isLight ? 'bg-slate-50 border-zinc-200 text-slate-600'
          : 'bg-[#0b0c0f] border-zinc-800/80 text-zinc-400'
        }`}>
          <div className="text-xs">
            Mostrando <strong className="font-bold">{paginatedList.length}</strong> de <strong className="font-bold">{filteredList.length}</strong> registros
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isRetro ? 'border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 bg-zinc-200'
                : 'hover:bg-zinc-800 border border-zinc-800 bg-zinc-900/40'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold">
              Pág. {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isRetro ? 'border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 bg-zinc-200'
                : 'hover:bg-zinc-800 border border-zinc-800 bg-zinc-900/40'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ─── MODAL ADD/EDIT REFACCIÓN ─── */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-xl flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-scaleUp ${themeCardCls}`}>
            
            {/* Cabecera Modal */}
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isRetro ? 'bg-[#000080] border-b-zinc-400'
              : isLight ? 'bg-slate-50 border-zinc-200'
              : 'bg-[#0f1013] border-zinc-800'
            }`}>
              <h3 className={`font-extrabold uppercase text-sm tracking-wider flex items-center gap-1.5 ${isRetro ? '!text-white' : ''}`}>
                <Cpu className={`w-4 h-4 ${isRetro ? '!text-white' : ''}`} />
                {editingItem ? 'Editar Refacción del Catálogo' : 'Registrar Nueva Refacción'}
              </h3>
              <button 
                onClick={() => setShowAddEditModal(false)}
                className={`p-1 rounded-md transition-colors ${
                  isRetro ? 'hover:bg-red-800 !text-white' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveItem} className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              
              {/* Sección 1: Datos Principales */}
              <div className="space-y-3">
                <div className={`text-[10px] uppercase font-black tracking-widest border-b pb-1 ${
                  isRetro ? 'border-zinc-400 text-[#000080]'
                  : isLight ? 'border-zinc-200 text-zinc-600'
                  : 'border-zinc-800 text-zinc-400'
                }`}>
                  📋 Detalles de la Refacción
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Imagen de la Refacción (Múltiples Ángulos) */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropImage}
                    className={`flex flex-col gap-2 p-3 border rounded-xl col-span-2 transition-all relative overflow-hidden ${
                      isDraggingImage
                        ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/50 scale-[1.01]'
                        : 'bg-zinc-950/20 dark:bg-zinc-900/30 border-zinc-200/5 dark:border-zinc-800/50'
                    }`}
                  >
                    {isDraggingImage && (
                      <div className="pointer-events-none absolute inset-0 bg-blue-600/20 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-blue-400 font-black text-xs uppercase tracking-wider gap-1 animate-pulse">
                        <span className="text-2xl">📥</span>
                        <span>¡Suelta la imagen aquí!</span>
                      </div>
                    )}
                    <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Imágenes de la Refacción (Clic o Arrastra para cambiar)</label>
                    <div className="flex items-center gap-4 flex-wrap">
                      <input
                        type="file"
                        accept="image/*"
                        id="ref-image-upload"
                        className="hidden"
                        onChange={handleImageChange}
                      />

                      {/* Recuadro Foto Única */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-extrabold uppercase text-blue-500">Fotografía Principal</span>
                        {formPreviewUrl ? (
                          <div className="relative w-20 h-20 rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden group select-none shrink-0 shadow-md">
                            <div 
                              onClick={() => handleOpenImageSourceModal()}
                              className="w-full h-full block cursor-pointer"
                            >
                              <img src={formPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[9px] font-black uppercase tracking-wider">
                                📷 Cambiar
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFormImageUrl('');
                              }}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
                              title="Eliminar imagen"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => handleOpenImageSourceModal()} 
                            className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 shrink-0 select-none cursor-pointer transition-all ${
                              isDraggingImage
                                ? 'border-blue-500 bg-blue-500/20 text-blue-400 scale-105'
                                : isRetro ? 'bg-zinc-200 border-zinc-400 text-black hover:bg-zinc-300'
                                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950/40 hover:border-blue-500 dark:hover:border-blue-400 text-zinc-550 dark:text-zinc-450'
                            }`}
                          >
                            <span className="text-[18px]">{isDraggingImage ? '📥' : '📷'}</span>
                            <span className="text-[9px] text-center font-black uppercase tracking-wider">{isDraggingImage ? 'Soltar' : 'Subir'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-[140px] text-[11px] leading-relaxed text-zinc-550 dark:text-zinc-400">
                        <p className="font-bold">Fotografía de la Refacción</p>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-555 mt-0.5">Asigna una imagen clara de la pieza para fácil identificación en el taller.</p>
                        <p className="text-[10px] text-blue-500 dark:text-blue-400 font-bold mt-1 flex flex-col gap-0.5">
                          <span className="flex items-center gap-1">
                            <span>📋</span>
                            <span>Presiona <kbd className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-mono text-[9px]">Ctrl + V</kbd> para pegar desde el portapapeles</span>
                          </span>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <span>🖱️</span>
                            <span>O arrastra y suelta una imagen directamente aquí (Drag & Drop).</span>
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Código / SKU */}
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Código (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. REF-IP11-SCR"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      className={themeInputCls}
                    />
                  </div>

                  {/* Nombre de Refacción */}
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Refacción *</label>
                    <input
                      type="text"
                      placeholder="Ej. PANTALLA INCELL COMPLETADA"
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className={themeInputCls}
                      required
                    />
                  </div>

                  {/* Categoría */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Categoría</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className={themeInputCls}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Marca Refacción */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Marca Pieza</label>
                    <input
                      type="text"
                      placeholder="Ej. OEM, GENERICO, ORIGINAL"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className={themeInputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Compatibilidad de Dispositivo */}
              <div className="space-y-3">
                <div className={`text-[10px] uppercase font-black tracking-widest border-b pb-1 ${
                  isRetro ? 'border-zinc-400 text-[#000080]'
                  : isLight ? 'border-zinc-200 text-zinc-600'
                  : 'border-zinc-800 text-zinc-400'
                }`}>
                  📱 Compatibilidad de Celular
                </div>
                <div className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    id="refaccion-is-global"
                    checked={formIsGlobal}
                    onChange={(e) => setFormIsGlobal(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                  />
                  <label htmlFor="refaccion-is-global" className="text-xs font-bold cursor-pointer select-none">
                    📦 Esta refacción es Universal / Global (para todas las marcas y modelos)
                  </label>
                </div>

                {formIsGlobal ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-semibold flex items-center gap-2">
                    <span>✨ Compatible de manera universal con todos los teléfonos recibidos en el taller (se registrará como GENERICO - TODOS).</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    {/* Marca Celular */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Marca Celular *</label>
                      <input
                        type="text"
                        placeholder="Ej. APPLE, SAMSUNG"
                        value={formDeviceBrand}
                        onChange={(e) => setFormDeviceBrand(e.target.value)}
                        className={themeInputCls}
                        required={!formIsGlobal}
                      />
                    </div>

                    {/* Modelo Celular */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Modelo Celular *</label>
                      <input
                        type="text"
                        placeholder="Ej. IPHONE 11, GALAXY S20"
                        value={formDeviceModel}
                        onChange={(e) => setFormDeviceModel(e.target.value)}
                        className={themeInputCls}
                        required={!formIsGlobal}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 3: Precios, Inventario y Código */}
              <div className="space-y-3">
                <div className={`text-[10px] uppercase font-black tracking-widest border-b pb-1 ${
                  isRetro ? 'border-zinc-400 text-[#000080]'
                  : isLight ? 'border-zinc-200 text-zinc-600'
                  : 'border-zinc-800 text-zinc-400'
                }`}>
                  💰 Costos e Inventario
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Precios: Costo, Público y Mayoreo */}
                  <div className="col-span-2 grid grid-cols-3 gap-4">
                    {/* Costo */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Costo ({sym}) *</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={formCost}
                        onChange={(e) => setFormCost(e.target.value)}
                        className={themeInputCls}
                        required
                      />
                    </div>

                    {/* Precio Reparación */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Público / Instalado ({sym}) *</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className={themeInputCls}
                        required
                      />
                    </div>

                    {/* Precio Mayoreo */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Precio Mayoreo ({sym}) *</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={formWholesalePrice}
                        onChange={(e) => setFormWholesalePrice(e.target.value)}
                        className={themeInputCls}
                        required
                      />
                    </div>
                  </div>

                  {/* Marcar como Favorito checkbox */}
                  <div className="col-span-2 flex items-center gap-2 py-1 select-none">
                    <input
                      type="checkbox"
                      id="formFavorite"
                      checked={formFavorite}
                      onChange={(e) => setFormFavorite(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer accent-amber-500"
                    />
                    <label htmlFor="formFavorite" className="text-xs font-bold cursor-pointer opacity-90 flex items-center gap-1.5">
                      <Star className={`w-3.5 h-3.5 ${formFavorite ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'}`} />
                      Marcar como "Favorito" (Destacado en el catálogo y creación de órdenes)
                    </label>
                  </div>

                  {/* Control de Inventario checkbox */}
                  <div className="col-span-2 flex items-center gap-2 py-1 select-none">
                    <input
                      type="checkbox"
                      id="formManageStock"
                      checked={formManageStock}
                      onChange={(e) => {
                        setFormManageStock(e.target.checked);
                        if (!e.target.checked) {
                          setFormStock('0');
                          setFormMinStock('0');
                        }
                      }}
                      className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="formManageStock" className="text-xs font-bold cursor-pointer opacity-90">
                      Manejar existencias / stock físico en el taller
                    </label>
                  </div>

                  {formManageStock ? (
                    <>
                      {/* Stock */}
                      <div className="flex flex-col gap-1.5 animate-fadeIn">
                        <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Stock *</label>
                        <input
                          type="number"
                          placeholder="Ej. 5"
                          value={formStock}
                          onChange={(e) => setFormStock(e.target.value)}
                          className={themeInputCls}
                          min="0"
                        />
                      </div>

                      {/* Stock Mínimo */}
                      <div className="flex flex-col gap-1.5 animate-fadeIn">
                        <label className="text-[10px] uppercase font-black tracking-wider opacity-75">Mínimo</label>
                        <input
                          type="number"
                          placeholder="Ej. 1"
                          value={formMinStock}
                          onChange={(e) => setFormMinStock(e.target.value)}
                          className={themeInputCls}
                          min="0"
                        />
                      </div>
                    </>
                  ) : (
                    <div className={`col-span-2 p-3 rounded-lg text-xs font-medium leading-relaxed ${
                      isRetro ? 'bg-zinc-300 border border-zinc-400 text-zinc-800'
                      : isLight ? 'bg-slate-50 border border-slate-200 text-slate-650'
                      : 'bg-zinc-950/45 border border-zinc-850/60 text-zinc-450'
                    }`}>
                      ℹ️ <strong>Bajo pedido (Sin inventario):</strong> La refacción no controlará existencias físicas. Se asume que no requiere stock en almacén y se surtirá al momento de realizar la reparación.
                    </div>
                  )}

                 </div>
               </div>

              {/* Botones de Acción */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className={isRetro
                    ? 'border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 bg-zinc-200 px-4 py-1.5 text-xs text-black font-bold'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg px-4 py-2 text-xs font-bold'
                  }
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={themeBtnCls}
                >
                  Guardar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal para elegir método de subida de imagen (Computadora o Celular QR) */}
      {showImageSourceModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in font-sans text-left">
          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border flex flex-col ${
            isRetro ? 'bg-[#dfdfdf] border-zinc-500 rounded-none' 
            : isLight ? 'bg-white border-zinc-200 text-slate-800' 
            : 'bg-[#181d28] border-slate-800 text-white'
          }`}>
            {/* Header */}
            <div className={`px-5 py-4 border-b flex justify-between items-center ${
              isRetro ? 'bg-[#000080] text-white border-b-2' 
              : isLight ? 'bg-slate-50 border-zinc-200' 
              : 'bg-slate-900/50 border-slate-800'
            }`}>
              <h3 className="font-extrabold uppercase text-xs tracking-wider flex items-center gap-2">
                📷 Método de Carga de Imagen
              </h3>
              <button
                type="button"
                onClick={() => setShowImageSourceModal(false)}
                className={`p-1 rounded-md transition-colors ${
                  isRetro ? 'hover:bg-red-800 !text-white' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              
              {/* Opción 1: Desde la computadora */}
              <div 
                onClick={() => {
                  setShowImageSourceModal(false);
                  setTimeout(() => {
                    document.getElementById('ref-image-upload')?.click();
                  }, 100);
                }}
                className={`p-4 rounded-2xl border border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isRetro 
                    ? 'bg-zinc-200 border-zinc-400 hover:bg-zinc-300 text-black' 
                    : 'bg-slate-100/10 hover:bg-slate-100/20 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400'
                }`}
              >
                <span className="text-2xl">💻</span>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider">Subir desde esta Computadora</h4>
                  <p className="text-[10px] text-zinc-400">Selecciona una imagen guardada en tu disco local.</p>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-250 dark:border-zinc-800"></div>
                <span className="flex-shrink mx-4 text-[10px] text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider">O también</span>
                <div className="flex-grow border-t border-zinc-250 dark:border-zinc-800"></div>
              </div>

              {/* Opción 2: Escanear QR con Celular */}
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl mb-1">📱</span>
                <h4 className="text-xs font-black uppercase tracking-wider">Escanear con tu Celular</h4>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
                  Escanea el código QR desde tu celular (debe estar en la misma red Wi-Fi) para tomar la foto directamente con la cámara del celular.
                </p>

                <div className="mt-4 p-3 bg-white rounded-2xl border border-zinc-200 shadow-lg select-none">
                  {imageQrCodeUrl ? (
                    <img src={imageQrCodeUrl} alt="QR Code Link" className="w-36 h-36" />
                  ) : (
                    <div className="animate-pulse w-36 h-36 bg-zinc-100 dark:bg-zinc-850 rounded-xl" />
                  )}
                </div>

                <span className="text-[9px] font-mono mt-3 px-2 py-1.5 rounded-lg border select-all shadow-inner bg-zinc-100/60 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800 break-all text-zinc-600 dark:text-zinc-400 max-w-xs text-center block w-full">
                  http://{localIp}:{localPort}/product-upload?sessionId={uploadSessionId}
                </span>
              </div>

            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex justify-end gap-2 ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-slate-900/50 border-slate-800'
            }`}>
              <button
                type="button"
                onClick={() => setShowImageSourceModal(false)}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-700' 
                    : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white'
                }`}
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL IMPORTAR EXCEL ─── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-scaleUp ${themeCardCls}`}>
            
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isRetro ? 'bg-[#000080] border-b-zinc-400 modal-dark-header'
              : isLight ? 'bg-slate-50 border-zinc-200'
              : 'bg-[#0f1013] border-zinc-800'
            }`}>
              <h3 className={`font-extrabold uppercase text-sm tracking-wider flex items-center gap-1.5 ${isRetro ? '!text-white' : ''}`}>
                <FileSpreadsheet className={`w-4 h-4 ${isRetro ? '!text-white' : 'text-emerald-500'}`} />
                Asistente de Importación de Excel
              </h3>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportHeaders([]);
                  setImportRows([]);
                  setImportError(null);
                }}
                className={`p-1 rounded-md transition-colors ${
                  isRetro ? 'hover:bg-red-800 !text-white' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] text-left">
              
              {/* Estructura de Columnas Soportada (TOP) */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isRetro ? 'bg-white border-zinc-400 text-black'
                : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                : 'bg-[#18191e] border-zinc-850 text-zinc-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Estructura de Columnas Soportada</h4>
                    <p className={`text-[11px] ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                      El importador reconoce de forma inteligente los siguientes encabezados (inglés o español):
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] hover:bg-[#eaeef3]'
                      : isLight ? 'bg-white border-indigo-350 text-indigo-700 hover:bg-indigo-50'
                      : 'bg-[#1f2025] hover:bg-zinc-800 text-indigo-400 border-indigo-950/40'
                    }`}
                  >
                    <Download className="w-3 h-3" /> Descargar Plantilla CSV
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[9.5px] font-mono select-all">
                  {['Código', 'Refacción', 'Categoría', 'Marca Pieza', 'Marca Celular', 'Modelo Celular', 'Costo', 'Público / Instalado', 'Mayoreo', 'Stock', 'Mínimo', 'Favorito'].map(col => {
                    let badgeClass = isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900 border-zinc-800 text-zinc-200';
                    if (col === 'Refacción') {
                      badgeClass = isLight ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold' : 'bg-zinc-900 border-zinc-800 text-amber-500 font-bold';
                    } else if (col === 'Marca Celular' || col === 'Modelo Celular') {
                      badgeClass = isLight ? 'bg-blue-50 border-blue-350 text-blue-700 font-bold' : 'bg-zinc-900 border-zinc-800 text-blue-400 font-bold';
                    } else if (col === 'Categoría') {
                      badgeClass = isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-900 border-zinc-800 text-emerald-400';
                    } else if (col === 'Favorito') {
                      badgeClass = isLight ? 'bg-amber-50 border-amber-300 text-amber-600 font-bold' : 'bg-zinc-900 border-zinc-800 text-amber-400 font-bold';
                    }
                    const isReq = col === 'Refacción';
                    return (
                      <span key={col} className={`border px-2 py-0.5 rounded ${badgeClass}`}>
                        {col}{isReq ? ' *' : ''}
                      </span>
                    );
                  })}
                </div>
                <p className={`text-[10px] italic ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  💡 Requerido: <span className="text-amber-500 font-bold">Refacción *</span>, <span className="text-blue-500 font-bold">Marca Celular *</span> y <span className="text-blue-500 font-bold">Modelo Celular *</span>.
                </p>
              </div>

              {/* Selector de modo de importación (Añadir vs Reemplazar) (MIDDLE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 select-none">
                <label
                  onClick={() => setImportReplaceMode(false)}
                  className={`p-3 rounded-lg border flex flex-col justify-between cursor-pointer transition-all ${
                    !importReplaceMode
                      ? isRetro
                        ? (isLight ? 'border-[#000080] bg-blue-50' : 'border-blue-500/80 bg-blue-950/20')
                        : isLight ? 'border-indigo-400 bg-indigo-50/50' : 'border-indigo-500/50 bg-indigo-950/10'
                      : isRetro
                        ? (isLight ? 'border-zinc-400 bg-[#eaeef3] hover:bg-zinc-200' : 'border-[#383c48] bg-[#121316] hover:bg-[#282b35]')
                        : isLight ? 'border-zinc-200 bg-white hover:bg-zinc-50' : 'border-[#2d2f36] bg-[#1c1e24]/45 hover:bg-[#1c1e24]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="ref-import-mode"
                      checked={!importReplaceMode}
                      onChange={() => setImportReplaceMode(false)}
                      className="text-indigo-600 cursor-pointer"
                    />
                    <span className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>Adicionar al Almacén</span>
                  </div>
                  <p className={`text-[10px] mt-1 pl-5 ${isLight ? 'text-zinc-650' : 'text-zinc-450'}`}>
                    Se sumarán las refacciones del Excel a la lista actual de refacciones.
                  </p>
                </label>

                <label
                  onClick={() => setImportReplaceMode(true)}
                  className={`p-3 rounded-lg border flex flex-col justify-between cursor-pointer transition-all ${
                    importReplaceMode
                      ? isRetro
                        ? (isLight ? 'border-red-600 bg-red-50' : 'border-rose-500/80 bg-rose-950/20')
                        : isLight ? 'border-rose-450 bg-rose-50' : 'border-rose-950/80 bg-rose-950/10'
                      : isRetro
                        ? (isLight ? 'border-zinc-400 bg-[#eaeef3] hover:bg-zinc-200' : 'border-[#383c48] bg-[#121316] hover:bg-[#282b35]')
                        : isLight ? 'border-zinc-200 bg-white hover:bg-zinc-50' : 'border-[#2d2f36] bg-[#1c1e24]/45 hover:bg-[#1c1e24]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="ref-import-mode"
                      checked={importReplaceMode}
                      onChange={() => setImportReplaceMode(true)}
                      className="text-rose-500 cursor-pointer"
                    />
                    <span className={`text-xs font-bold ${isRetro ? (isLight ? 'text-red-800' : 'text-red-300') : isLight ? 'text-rose-700' : 'text-rose-400'}`}>Reemplazar Inventario</span>
                  </div>
                  <p className={`text-[10px] mt-1 pl-5 ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                    ¡Cuidado! Se eliminarán todas las refacciones existentes para cargar únicamente las del Excel.
                  </p>
                </label>
              </div>

              {/* Drag and Drop Zone (BOTTOM) */}
              <div className={`relative group border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isRetro ? 'border-zinc-500 hover:border-[#000080] bg-white'
                : isLight ? 'border-zinc-300 hover:border-indigo-400 bg-zinc-50'
                : 'border-[#2d2f36] hover:border-indigo-500/50 bg-[#17181d]/50'
              }`}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full p-0"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className={`p-3 rounded-full group-hover:scale-105 transition-transform ${
                    isRetro ? 'bg-blue-100 border border-[#000080] text-[#000080]'
                    : isLight ? 'bg-indigo-100 border border-indigo-350 text-indigo-600'
                    : 'bg-indigo-950/30 border border-indigo-500/20 text-indigo-400'
                  }`}>
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className={`text-xs font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                      Arrastre o haga clic para seleccionar su archivo .xlsx, .xls o .csv
                    </p>
                    <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      Soporta libros de Excel antiguos, modernos, y archivos CSV
                    </p>
                  </div>
                </div>
              </div>

              {/* Seccion de Mapeo y Confirmacion que se despliega hacia abajo */}
              {importFile && (
                <div className="space-y-4 text-left pt-2">
                  <div className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-450" />
                      <span className="text-xs font-bold font-mono">{importFile.name}</span>
                    </div>
                    <button 
                      onClick={() => { setImportFile(null); setImportHeaders([]); setImportRows([]); setImportError(null); }}
                      className="text-rose-450 hover:text-rose-400 text-xs font-bold cursor-pointer"
                    >
                      Remover archivo
                    </button>
                  </div>

                  {importError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-semibold">
                      ❌ {importError}
                    </div>
                  )}

                  {importHeaders.length > 0 && (
                    <div className="space-y-4 font-mono">
                      {/* PANEL DE MAPEADOR DE COLUMNAS INTERACTIVO */}
                      <div className={`p-4 border rounded-xl space-y-3 text-left ${
                        isRetro ? 'bg-[#dfdfdf] border-[#808080] text-black'
                        : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-850'
                        : 'bg-[#141519] border-zinc-800 text-zinc-200'
                      }`}>
                        <div className="flex items-center gap-2 border-b pb-2 border-zinc-800/10">
                          <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-zinc-800 font-extrabold' : 'text-amber-400'}`}>⚙️ Mapeo de Columnas Detectadas</span>
                        </div>
                        <p className={`text-[10.5px] font-sans ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                          FixManager asoció automáticamente los campos de tu Excel. Si deseas corregir o reasignar alguna columna, puedes hacerlo a continuación:
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {MAPPABLE_FIELDS.map(field => {
                            const value = headerMapping[field.key] || '';
                            return (
                              <div key={field.key} className="flex flex-col gap-1">
                                <label className={`text-[9.5px] font-mono font-bold uppercase ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                                  {field.label}
                                </label>
                                <select
                                  value={value}
                                  onChange={(e) => setHeaderMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                  className={`text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer ${
                                    isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900'
                                    : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900'
                                    : 'bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-250'
                                  }`}
                                >
                                  <option value="">-- Ignorar o Inferencia --</option>
                                  {importHeaders.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Caja de validación/previsualización idéntica a Almacén */}
                      <div className={`p-4 border rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left ${
                        isRetro ? 'bg-[#dfdfdf] border-[#808080] text-black'
                        : isLight ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900'
                        : 'bg-[#181a1f] border-zinc-800/80 text-zinc-200'
                      }`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <CheckCircle className={`w-4 h-4 ${isRetro ? 'text-zinc-800' : 'text-emerald-500'}`} />
                            <span>Se procesaron {tempImportedItems.length} registros con éxito</span>
                          </div>
                          <p className={`text-[10.5px] font-sans ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                            Para garantizar una importación fiel y segura, debes revisar el listado completo y verificar los datos mapeados antes de confirmar.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={tempImportedItems.length === 0}
                          onClick={() => setIsDetailedPreviewOpen(true)}
                          className={`shrink-0 px-4 py-2 text-xs font-black rounded border flex items-center gap-1.5 transition-colors cursor-pointer ${
                            tempImportedItems.length === 0
                              ? 'opacity-40 cursor-not-allowed bg-zinc-600 text-zinc-400'
                              : isRetro
                                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] hover:bg-[#eaeef3]'
                                : isLight
                                  ? 'bg-purple-655/10 hover:bg-purple-100 text-purple-700 border-purple-200'
                                  : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20'
                          }`}
                        >
                          <Search className="w-3.5 h-3.5" /> Ver Listado Completo ({tempImportedItems.length} art.)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer estático idéntico a Almacén */}
            <div className={`p-4 border-t flex justify-end gap-2 ${
              isRetro ? 'bg-[#dfdfdf] border-zinc-500'
              : isLight ? 'bg-zinc-50 border-zinc-200'
              : 'bg-[#0e0f12] border-[#1c1d22]'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportHeaders([]);
                  setImportRows([]);
                  setImportError(null);
                  setTempImportedItems([]);
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                  isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
                  : isLight ? 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  : 'text-gray-400 hover:text-white border border-zinc-800 bg-transparent'
                }`}
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={!importFile || tempImportedItems.length === 0}
                onClick={handleConfirmImport}
                className={`px-5 py-1.5 text-xs font-black rounded flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  (!importFile || tempImportedItems.length === 0)
                    ? 'opacity-40 cursor-not-allowed bg-zinc-650 text-zinc-400'
                    : isRetro
                      ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-900 border-r-zinc-900'
                      : isLight
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> CONFIRMAR E IMPORTAR ({tempImportedItems.length} ARTÍCULOS)
              </button>
            </div>

          </div>
        </div>
      )}

      {isDetailedPreviewOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
          <div className={`rounded-lg max-w-7xl w-full overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh] ${
            isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans'
            : isLight ? 'bg-white border border-zinc-200 text-zinc-900'
            : 'bg-[#121316] border border-[#2d2f36] text-zinc-100'
          }`}>
            {/* Cabecera del Modal */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
              isRetro ? 'bg-[#000080] border-[#808080] text-white'
              : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
              : 'bg-[#0e0f12] border-[#1c1d22] text-white'
            }`}>
              <div className="flex items-center gap-2">
                <Search className={`w-4 h-4 ${isRetro ? 'text-white' : 'text-amber-500'}`} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isRetro ? 'text-white' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                  🔍 Previsualización Detallada de Importación ({tempImportedItems.length} Refacciones)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider font-mono ${
                  importReplaceMode
                    ? 'bg-rose-950/30 text-rose-450 border-rose-900/50'
                    : 'bg-emerald-950/30 text-emerald-450 border-emerald-900/50'
                }`}>
                  Modo: {importReplaceMode ? 'Reemplazar todo' : 'Adicionar al almacén'}
                </span>
                <button
                  onClick={() => setIsDetailedPreviewOpen(false)}
                  className={`p-1 rounded-full cursor-pointer ${
                    isRetro ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                    : isLight ? 'text-zinc-500 hover:text-zinc-900 bg-zinc-100 border border-zinc-300'
                    : 'text-gray-400 hover:text-white bg-zinc-900 border border-zinc-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal */}
            <div className={`p-6 space-y-4 overflow-y-auto flex-1 text-left ${
              isRetro ? 'bg-[#eaeef3]' : isLight ? 'bg-white' : 'bg-[#121316]'
            }`}>
              {/* Buscador e info rápida */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar por refacción, código o marca en la lista..."
                    value={previewSearchTerm}
                    onChange={(e) => setPreviewSearchTerm(e.target.value)}
                    className={`pl-9 pr-8 py-1.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                      isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900'
                      : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900'
                      : 'bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-250'
                    }`}
                  />
                  {previewSearchTerm && (
                    <button
                      onClick={() => setPreviewSearchTerm('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className={`text-xs px-3 py-1.5 border rounded-lg font-mono flex items-center gap-2 ${
                  isRetro ? 'bg-blue-50 border-[#000080] text-[#000080]'
                  : isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-755'
                  : 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400'
                }`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Filtro: <strong>{filteredPreviewItems.length}</strong> de <strong>{tempImportedItems.length}</strong>
                  </span>
                </div>
              </div>

              {/* Tabla de Artículos */}
              <div className={`border rounded-xl overflow-hidden shadow-sm ${
                isRetro ? 'border-zinc-400 bg-white'
                : isLight ? 'border-zinc-200 bg-white'
                : 'border-zinc-800 bg-[#17181d]'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b ${
                        isRetro ? 'bg-[#000080] text-white border-zinc-400'
                        : isLight ? 'bg-zinc-50 text-zinc-650 border-zinc-200'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}>
                        <th className="p-3 font-bold">Código</th>
                        <th className="p-3 font-bold">Refacción</th>
                        <th className="p-3 font-bold text-center">Categoría</th>
                        <th className="p-3 font-bold">Marca Pieza</th>
                        <th className="p-3 font-bold">Marca Celular</th>
                        <th className="p-3 font-bold">Modelo Celular</th>
                        <th className="p-3 font-bold text-right">Costo</th>
                        <th className="p-3 font-bold text-right">Público / Instalado</th>
                        <th className="p-3 font-bold text-right">Mayoreo</th>
                        <th className="p-3 font-bold text-center">Stock</th>
                        <th className="p-3 font-bold text-center">Mínimo</th>
                        <th className="p-3 font-bold text-center">Favorito</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono ${
                      isRetro ? 'divide-zinc-200 text-zinc-900 bg-white'
                      : isLight ? 'divide-zinc-200 text-zinc-800 bg-white'
                      : 'divide-zinc-800/50 text-zinc-350 bg-[#121316]/20'
                    }`}>
                      {paginatedPreviewItems.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-zinc-500 font-sans">
                            No se encontraron refacciones que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        paginatedPreviewItems.map((it, idx) => {
                          const isBajo = it.manageStock !== false && it.minStock > 0 && it.stock <= it.minStock;
                          return (
                            <tr key={idx} className="hover:bg-zinc-500/5 transition-colors">
                              <td className="p-3 text-[11px] max-w-[120px] truncate text-zinc-500 font-mono">
                                {it.code}
                              </td>
                              <td className="p-3 font-sans font-bold max-w-[240px] truncate text-zinc-150">
                                {it.name}
                              </td>
                              <td className="p-3 text-center font-sans">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-wide uppercase ${
                                  it.category === 'PANTALLAS' ? 'bg-sky-950/40 text-sky-400 border-sky-900/30'
                                  : it.category === 'BATERIAS' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                                }`}>
                                  {it.category}
                                </span>
                              </td>
                              <td className="p-3 font-sans">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black tracking-wide ${
                                  isRetro ? 'bg-zinc-200 text-black border border-zinc-400'
                                  : isLight ? 'bg-slate-100 text-slate-700'
                                  : 'bg-zinc-800/60 text-zinc-300'
                                }`}>
                                  {it.brand}
                                </span>
                              </td>
                              <td className="p-3 font-sans">
                                {it.deviceBrand}
                              </td>
                              <td className="p-3 font-sans">
                                {it.deviceModel}
                              </td>
                              <td className="p-3 text-right text-zinc-400">
                                {sym}{it.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-400">
                                {sym}{it.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right text-zinc-350">
                                {sym}{(it.wholesalePrice !== undefined ? it.wholesalePrice : it.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`p-3 text-center font-bold ${it.manageStock === false ? 'text-zinc-500' : 'text-sky-400'}`}>
                                {it.manageStock === false ? '∞' : it.stock}
                              </td>
                              <td className={`p-3 text-center font-bold ${isBajo ? 'text-amber-500' : 'text-zinc-500'}`}>
                                {it.manageStock === false ? '∞' : it.minStock}
                              </td>
                              <td className="p-3 text-center">
                                {it.favorite ? (
                                  <div className="flex items-center justify-center gap-1 text-amber-500 font-bold mx-auto">
                                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                                    <span className="text-[10px]">Sí</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-zinc-500">No</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginación de la previsualización */}
              {filteredPreviewItems.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 shrink-0">
                  <div className={`text-[11px] ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                    Mostrando registros <strong>{Math.min(filteredPreviewItems.length, (previewPage - 1) * previewRowsPerPage + 1)}</strong> a{' '}
                    <strong>{Math.min(filteredPreviewItems.length, previewPage * previewRowsPerPage)}</strong> de{' '}
                    <strong>{filteredPreviewItems.length}</strong> (Página <strong>{previewPage}</strong> de <strong>{totalPreviewPages}</strong>)
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={previewPage === 1}
                      onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        previewPage === 1
                          ? 'opacity-40 cursor-not-allowed border-zinc-800 text-zinc-500'
                          : isLight ? 'hover:bg-zinc-100 text-zinc-700 bg-white border-zinc-300' : 'hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={previewPage === totalPreviewPages}
                      onClick={() => setPreviewPage(prev => Math.min(totalPreviewPages, prev + 1))}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        previewPage === totalPreviewPages
                          ? 'opacity-40 cursor-not-allowed border-zinc-800 text-zinc-500'
                          : isLight ? 'hover:bg-zinc-100 text-zinc-700 bg-white border-zinc-300' : 'hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className={`p-4 border-t flex justify-end gap-2 shrink-0 ${
              isRetro ? 'bg-[#dfdfdf] border-zinc-500'
              : isLight ? 'bg-zinc-50 border-zinc-200'
              : 'bg-[#0e0f12] border-[#1c1d22]'
            }`}>
              <button
                type="button"
                onClick={() => setIsDetailedPreviewOpen(false)}
                className={`px-4 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                  isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
                  : isLight ? 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  : 'text-gray-400 hover:text-white border border-zinc-800 bg-transparent'
                }`}
              >
                Regresar al Mapeo
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className={`px-5 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isRetro ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700'
                  : isLight ? 'bg-indigo-650 hover:bg-indigo-700 text-white shadow'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Confirmar e Importar Ahora
              </button>
            </div>
          </div>
        </div>
      )}


       {/* MODAL: IMPRESIÓN DE ETIQUETA ADHESIVA */}
      {printingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <style>{`
            @media print {
              /* Ocultar el resto del sitio */
              body * {
                visibility: hidden;
              }
              /* Hacer visible solo el contenedor real de impresión */
              #print-job-container, #print-job-container * {
                visibility: visible;
              }
              #print-job-container {
                position: fixed;
                left: 0 !important;
                top: 0 !important;
                width: 58mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              .printable-sticker-copy {
                width: 58mm !important;
                height: 32mm !important;
                page-break-after: always;
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 3mm !important;
                background: white !important;
                color: black !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-sizing: border-box !important;
              }
            }
          `}</style>
          
          <div 
            className={`w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden ${
              isRetro 
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-black font-mono shadow-2xl' 
                : isLight 
                  ? 'bg-white rounded-2xl border border-zinc-200 text-zinc-800 shadow-2xl' 
                  : 'bg-[#181920] rounded-2xl border border-[#202127] text-white shadow-2xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={isRetro ? 'bg-[#000080] p-2 flex justify-between items-center text-white shrink-0' : 'p-4 border-b border-zinc-200 dark:border-zinc-900 flex justify-between items-center shrink-0'}>
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-sky-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Imprimir Etiqueta Adhesiva</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPrintingItem(null);
                  setPrintCopies(1);
                }}
                className={isRetro ? 'bg-[#dfdfdf] text-black px-1.5 py-0.5 border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 font-black text-xs active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white' : 'p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-700 transition-colors'}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              <div className="space-y-1 select-none">
                <h4 className={`text-sm font-sans font-black uppercase ${isLight ? 'text-zinc-900' : 'text-white'}`}>{printingItem.name}</h4>
                <p className={`text-[10px] font-mono uppercase tracking-wide ${isLight ? 'text-zinc-500 font-bold' : 'text-zinc-400'}`}>
                  Ref/SKU: {printingItem.id} • SKU Proveedor: {printingItem.code}
                </p>
              </div>

              {/* BANDEJA DE PREVIEW */}
              <div className={`relative w-full py-6 px-4 border flex flex-col items-center justify-center overflow-hidden ${
                isRetro 
                  ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' 
                  : isLight 
                    ? 'bg-zinc-150 border-zinc-200 rounded-xl' 
                    : 'bg-[#14151a] border-[#202125] rounded-xl'
              }`}>
                {/* Patrón de rodillo térmico de fondo */}
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                {/* Preview idéntico al HTML impreso — iframe con srcDoc */}
                {(() => {
                  const previewHtml = buildProductLabelHtml(
                    { name: printingItem.name, price: printingItem.price, sku: printingItem.code, brand: printingItem.brand },
                    config
                  );
                  const mmToPx = 3.78;
                  const sizeKey = config.labelPaperSize || '51x25mm';
                  const [mmW, mmH] = sizeKey.replace('mm','').split('x').map(Number);
                  const scale = 2.5;
                  const realW = Math.round(mmW * mmToPx);
                  const realH = Math.round(mmH * mmToPx);
                  return (
                    <div style={{ width: `${realW * scale}px`, height: `${realH * scale}px`, overflow: 'hidden', borderRadius: '4px', border: '1px solid #ccc', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)', flexShrink: 0 }}>
                      <iframe
                        key={printingItem.id + sizeKey}
                        srcDoc={previewHtml}
                        scrolling="no"
                        style={{ width: `${realW}px`, height: `${realH}px`, border: 'none', background: 'white', display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left' }}
                        title="Vista previa etiqueta"
                      />
                    </div>
                  );
                })()}

                {/* Sombra de despegue y slots del rodillo */}
                <div className="w-2/3 h-1.5 bg-black/45 blur-md rounded-full mt-2"></div>
                <div className={`text-[9px] font-mono uppercase tracking-widest mt-1.5 flex items-center gap-1.5 ${isLight ? 'text-zinc-500 font-bold' : 'text-zinc-500'}`}>
                  <span>← {config.labelPaperSize || '51x25mm'} →</span>
                </div>
              </div>

              {/* OPCIONES DE IMPRESIÓN */}
              <div className={`p-4 ${
                isRetro 
                  ? 'space-y-4 bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' 
                  : isLight 
                    ? 'space-y-4 bg-zinc-50 border border-zinc-200 rounded-xl' 
                    : 'space-y-4 bg-[#14161d] border border-zinc-900 rounded-xl'
              }`}>
                <span className={`text-[9px] uppercase font-mono tracking-widest font-bold block border-b pb-1.5 ${
                  isRetro 
                    ? 'text-[#000080] border-b-zinc-400' 
                    : isLight 
                      ? 'text-amber-600 border-b-zinc-200' 
                      : 'text-[#56bcff] border-b-zinc-700'
                }`}>
                  🎛️ AJUSTES DE IMPRESIÓN
                </span>
                
                {/* Selector de copias */}
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label className={`text-xs font-bold block ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>Copias de Etiqueta</label>
                    <span className={`text-[10px] block ${isLight ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>Cantidad total de pegatinas</span>
                  </div>
                  <div className={`flex items-center rounded-lg p-0.5 border ${
                    isRetro 
                      ? 'bg-white border-t-[#808080] border-l-[#808080] border-b-white border-r-white' 
                      : isLight 
                        ? 'bg-white border-zinc-300' 
                        : 'bg-[#1c1d22] border-zinc-800'
                  }`}>
                    <button 
                      type="button"
                      onClick={() => setPrintCopies(c => Math.max(1, c - 1))}
                      className={`w-8 h-8 rounded hover:bg-zinc-200 flex items-center justify-center font-bold active:scale-90 select-none cursor-pointer ${
                        isLight ? 'text-zinc-700' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      min={1}
                      max={50}
                      value={printCopies}
                      onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-12 text-center bg-transparent text-xs border-none font-mono focus:outline-none ${
                        isLight ? 'text-zinc-900 font-extrabold' : 'text-white'
                      }`}
                    />
                    <button 
                      type="button"
                      onClick={() => setPrintCopies(c => Math.max(1, c + 1))}
                      className={`w-8 h-8 rounded hover:bg-zinc-200 flex items-center justify-center font-bold active:scale-90 select-none cursor-pointer ${
                        isLight ? 'text-zinc-700' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Info de Configuración de Impresora */}
                <div className={`border-t pt-3 flex flex-col space-y-1 text-[11px] font-mono ${
                  isRetro
                    ? 'border-t-zinc-400 text-zinc-700'
                    : isLight
                      ? 'border-t-zinc-200 text-zinc-500'
                      : 'border-t-zinc-700 text-[#c5cdd6]'
                }`}>
                  {config.labelPrinterBrand ? (
                    <>
                      <div className="flex justify-between">
                        <span>Impresora de etiquetas:</span>
                        <span className={isLight ? 'text-[#000080] font-bold uppercase' : 'text-sky-400 font-bold uppercase'}>{config.labelPrinterBrand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Puerto/Conector:</span>
                        <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold'}>{config.labelPrinterInterface || 'USB'}</span>
                      </div>
                      {config.labelPrinterInterface === 'Ethernet' && config.labelPrinterIpAddress && (
                        <div className="flex justify-between">
                          <span>Dirección IP:</span>
                          <span className={isLight ? 'text-zinc-700 font-bold' : 'text-zinc-300 font-bold'}>{config.labelPrinterIpAddress}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`flex flex-col gap-2 pt-1 rounded-lg p-2 ${
                      isRetro ? 'bg-amber-50 border border-amber-300' : isLight ? 'bg-amber-50 border border-amber-200' : 'bg-amber-950/30 border border-amber-800/40'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-500 text-base leading-none">⚠️</span>
                        <span className={`text-[10px] leading-tight ${isLight ? 'text-amber-800 font-bold' : 'text-amber-300 font-semibold'}`}>
                          No hay impresora de etiquetas configurada. Agrégala en Configuración para poder imprimir.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* INSTRUCCIONES RÁPIDAS */}
              <div className={`p-3 text-[10.5px] space-y-1 font-mono border ${
                isRetro 
                  ? 'bg-white border-zinc-300 text-zinc-700 font-sans' 
                  : isLight 
                    ? 'bg-amber-500/5 border-amber-500/25 text-zinc-600' 
                    : 'bg-[#1b120c]/40 border-amber-950/20 text-[#bfb2a8]'
              }`}>
                <span className="font-bold text-amber-500 block uppercase">⚙️ Notas de automatización:</span>
                {config.labelPrinterBrand ? (
                  <p>• Los bytes crudos RAW de la etiqueta serán despachados mediante el puerto preconfigurado ({config.labelPrinterInterface || 'USB'}) de forma directa sin demoras.</p>
                ) : (
                  <p>• Configura una impresora de etiquetas en <strong>Configuración → Impresoras</strong> para habilitar la impresión automática.</p>
                )}
              </div>

            </div>

            {/* Pie del modal con acciones */}
            <div className={isRetro ? 'bg-[#dfdfdf] p-4 border-t-2 border-[#808080] flex justify-end gap-2.5 shrink-0' : isLight ? 'bg-zinc-50 p-4 border-t border-zinc-200 flex justify-end gap-2.5 shrink-0' : 'bg-[#13151a] p-4 border-t border-zinc-900 flex justify-end gap-2.5 shrink-0'}>
              <button
                type="button"
                onClick={() => {
                  setPrintingItem(null);
                  setPrintCopies(1);
                }}
                className={isRetro ? 'px-4 py-1.5 text-xs text-black font-sans font-bold bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white cursor-pointer' : isLight ? 'px-4 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-50 rounded transition-colors cursor-pointer' : 'px-4 py-1.5 text-xs text-gray-400 hover:text-white rounded transition-colors bg-transparent border border-zinc-800 cursor-pointer'}
              >
                Cerrar consulta
              </button>
              
              <button
                onClick={() => {
                  // Play dynamic subtle physical audio
                  try {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, ctx.currentTime);
                    gain.gain.setValueAtTime(0.06, ctx.currentTime);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.1);
                  } catch (e) {}

                  const eAPI = (window as any).electronAPI;

                  // Construir HTML de etiqueta usando la función centralizada
                  const buildLabelHtml = () => {
                    const singleLabel = buildProductLabelHtml(
                      { name: printingItem.name, price: printingItem.price, sku: printingItem.code, brand: printingItem.brand },
                      config
                    );
                    if (printCopies <= 1) return singleLabel;
                    // Para múltiples copias, repetir el body con page-break
                    const bodyMatch = singleLabel.match(/<body>([\s\S]*?)<\/body>/);
                    const headMatch = singleLabel.match(/<head>([\s\S]*?)<\/head>/);
                    const bodyContent = bodyMatch ? bodyMatch[1] : '';
                    const headContent = headMatch ? headMatch[1] : '';
                    const copies = Array.from({ length: printCopies }, (_, i) =>
                      i < printCopies - 1
                        ? bodyContent.replace('class="label" style="', 'class="label" style="page-break-after:always; ')
                        : bodyContent
                    ).join('');
                    return `<!DOCTYPE html><html><head>${headContent}</head><body>${copies}</body></html>`;
                  };

                  const dispatchPrintEvent = () => {
                    window.dispatchEvent(new CustomEvent('automated-print', {
                      detail: {
                        type: 'label',
                        id: printingItem.id,
                        name: `Etiqueta de Refacción`,
                        copies: printCopies,
                        brand: config.labelPrinterBrand || 'Zebra ZD220',
                        port: config.labelPrinterInterface || 'USB',
                        details: `${printingItem.brand || ''} ${printingItem.name} [Código ${printingItem.code}]`
                      }
                    }));
                  };

                  const closePrinterModal = () => {
                    setPrintingItem(null);
                    setPrintCopies(1);
                  };

                  // Etiqueta adhesiva — isLabel:true
                  const sizeKey = config.labelPaperSize || '51x25mm';
                  const [widthMm, heightMm] = sizeKey.replace('mm', '').split('x').map(Number);
                  const paperWidthMicrons = widthMm * 1000;
                  const paperHeightMicrons = heightMm * 1000;

                  window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: {
                    html: buildLabelHtml(),
                    deviceName: config.labelPrinterBrand || '',
                    copies: 1,
                    isLabel: true,
                    paperWidthMicrons,
                    paperHeightMicrons
                  }}));
                  dispatchPrintEvent();
                  closePrinterModal();
                }}
                style={isRetro ? { color: '#ffffff' } : undefined}
                className={isRetro
                  ? 'px-5 py-2 text-xs font-sans font-extrabold uppercase bg-[#000080] hover:bg-blue-800 border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 active:border-t-zinc-600 active:border-l-zinc-600 active:border-b-white active:border-r-white cursor-pointer select-none flex items-center gap-1.5'
                  : 'px-5 py-2 text-xs font-black uppercase tracking-wide bg-sky-500 hover:bg-sky-450 text-[#090b0e] hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all rounded-xl cursor-pointer select-none active:scale-95 flex items-center gap-1.5'
                }
              >
                <Printer className="w-3.5 h-3.5" /> EMPEZAR IMPRESIÓN ({printCopies})
              </button>
            </div>
          </div>

          {/* CONTENEDOR OCULTO EN CLIENTE, PERO EXCLUSIVO PARA IMPRESIONES (Admite multiples copias repetidas) */}
          <div id="print-job-container" className="hidden">
            {Array.from({ length: printCopies }).map((_, idx) => (
              <div key={idx} className="printable-sticker-copy font-mono">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: '7.5px', fontWeight: 'bold' }}>
                        {(config.storeName || 'TALLER FIXMANAGER').toUpperCase()}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>
                        {config.currencySymbol}{printingItem.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: 'sans-serif', textTransform: 'uppercase', padding: '1mm 0' }}>
                        {printingItem.name}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ fontSize: '6.5px', color: '#444', textTransform: 'uppercase' }}>
                        Marca: {printingItem.brand || 'Gral'} • ID: {printingItem.id}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', paddingTop: '1.5mm' }}>
                        {renderBarcodeLines(printingItem.code)}
                        <div style={{ fontSize: '7px', fontWeight: 'bold', letterSpacing: '1.5px', marginTop: '0.5mm' }}>
                          {printingItem.code}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

        </div>
      )}

      <BatchPhotoAssignerModal
        isOpen={isBatchPhotoModalOpen}
        onClose={() => setIsBatchPhotoModalOpen(false)}
        refacciones={refacciones}
        inventory={inventory || []}
        onSetRefacciones={onSetRefacciones}
        onSetInventory={onSetInventory}
        config={config}
      />

    </div>
  );
}
