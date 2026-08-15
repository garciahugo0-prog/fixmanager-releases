/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, X, Image as ImageIcon, Upload, AlertCircle, FileText, Settings } from 'lucide-react';
import { QuoteCatalogItem, InsumoCatalogItem, WorkshopConfig } from '../types';

interface CatalogoViewProps {
  quoteCatalog: QuoteCatalogItem[];
  insumosCatalog: InsumoCatalogItem[];
  config: WorkshopConfig;
  onAddQuoteCatalogItem: (item: QuoteCatalogItem) => void;
  onUpdateQuoteCatalogItem: (item: QuoteCatalogItem) => void;
  onDeleteQuoteCatalogItem: (id: string) => void;
  onAddInsumoCatalogItem: (item: InsumoCatalogItem) => void;
  onUpdateInsumoCatalogItem: (item: InsumoCatalogItem) => void;
  onDeleteInsumoCatalogItem: (id: string) => void;
}

export default function CatalogoView({
  quoteCatalog,
  insumosCatalog,
  config,
  onAddQuoteCatalogItem,
  onUpdateQuoteCatalogItem,
  onDeleteQuoteCatalogItem,
  onAddInsumoCatalogItem,
  onUpdateInsumoCatalogItem,
  onDeleteInsumoCatalogItem,
}: CatalogoViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const [activeTab, setActiveTab] = useState<'products' | 'insumos'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<QuoteCatalogItem | InsumoCatalogItem | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | string>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filtered items
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return quoteCatalog;
    return quoteCatalog.filter(item => 
      item.description.toLowerCase().includes(q)
    );
  }, [searchTerm, quoteCatalog]);

  const filteredInsumos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return insumosCatalog;
    return insumosCatalog.filter(item => 
      item.description.toLowerCase().includes(q)
    );
  }, [searchTerm, insumosCatalog]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDescription('');
    setPrice(0);
    setImageUrl('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: QuoteCatalogItem | InsumoCatalogItem) => {
    setEditingItem(item);
    setDescription(item.description);
    setPrice(item.price);
    setImageUrl((item as QuoteCatalogItem).imageUrl || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    const term = activeTab === 'products' ? 'producto' : 'insumo/mano de obra';
    if (window.confirm(`¿Está seguro de eliminar este ${term} del catálogo?`)) {
      if (activeTab === 'products') {
        onDeleteQuoteCatalogItem(id);
      } else {
        onDeleteInsumoCatalogItem(id);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('La descripción es obligatoria.');
      return;
    }
    const cost = parseFloat(price as string) || 0;
    if (cost < 0) {
      setErrorMsg('El precio no puede ser negativo.');
      return;
    }

    if (activeTab === 'products') {
      if (editingItem) {
        onUpdateQuoteCatalogItem({
          id: editingItem.id,
          description: description.toUpperCase().trim(),
          price: cost,
          imageUrl: imageUrl.trim(),
        });
      } else {
        const exists = quoteCatalog.some(
          item => item.description.toUpperCase() === description.toUpperCase().trim()
        );
        if (exists) {
          setErrorMsg('Ya existe un producto con esta descripción en el catálogo.');
          return;
        }

        onAddQuoteCatalogItem({
          id: 'quote_item_' + Date.now(),
          description: description.toUpperCase().trim(),
          price: cost,
          imageUrl: imageUrl.trim(),
        });
      }
    } else {
      if (editingItem) {
        onUpdateInsumoCatalogItem({
          id: editingItem.id,
          description: description.toUpperCase().trim(),
          price: cost,
        });
      } else {
        const exists = insumosCatalog.some(
          item => item.description.toUpperCase() === description.toUpperCase().trim()
        );
        if (exists) {
          setErrorMsg('Ya existe este concepto en el catálogo de insumos.');
          return;
        }

        onAddInsumoCatalogItem({
          id: 'insumo_item_' + Date.now(),
          description: description.toUpperCase().trim(),
          price: cost,
        });
      }
    }

    setShowModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setImageUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${isLight ? 'bg-zinc-50' : 'bg-[#0f111a]'} overflow-hidden`}>
      {/* View Header */}
      <div className={`p-4 md:px-6 md:py-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0 ${
        isRetro ? 'bg-[#d4d0c8] border-zinc-500 text-black' : isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-[#151822] border-zinc-800 text-white'
      }`}>
        <div>
          <h1 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" /> Catálogos del Cotizador
          </h1>
          <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">
            Administra tus catálogos de equipos, mano de obra y materiales secundarios.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className={`flex items-center gap-1.5 px-4 py-2 font-black text-xs transition-colors cursor-pointer border ${
            isRetro
              ? 'bg-[#dfdfdf] text-zinc-900 border-2 border-t-white border-l-white border-r-zinc-700 border-b-zinc-700 hover:bg-zinc-200 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white rounded-none shadow-sm'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent rounded shadow-sm'
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> {activeTab === 'products' ? 'Agregar Producto' : 'Agregar Insumo'}
        </button>
      </div>

      {/* Sub-tab Selection */}
      <div className={`px-4 md:px-6 py-2 border-b flex gap-2 shrink-0 ${
        isRetro ? 'bg-[#d4d0c8] border-zinc-500' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#12141c] border-zinc-800'
      }`}>
        <button
          type="button"
          onClick={() => { setActiveTab('products'); setSearchTerm(''); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all border cursor-pointer ${
            activeTab === 'products'
              ? (isRetro ? 'bg-[#000080] text-white retro-white-text border-blue-900' : 'bg-indigo-600 text-white border-transparent shadow-sm')
              : (isRetro ? 'bg-zinc-200 text-zinc-700 border-zinc-350 hover:bg-zinc-300' : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-655 hover:bg-zinc-150')
          }`}
        >
          Productos principales
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('insumos'); setSearchTerm(''); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all border cursor-pointer ${
            activeTab === 'insumos'
              ? (isRetro ? 'bg-[#000080] text-white retro-white-text border-blue-900' : 'bg-indigo-600 text-white border-transparent shadow-sm')
              : (isRetro ? 'bg-zinc-200 text-zinc-700 border-zinc-350 hover:bg-zinc-300' : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-655 hover:bg-zinc-150')
          }`}
        >
          Mano de obra e Insumos
        </button>
      </div>

      {/* Subbar with Search */}
      <div className={`p-4 shrink-0 border-b flex items-center gap-2 ${
        isRetro ? 'bg-[#d4d0c8] border-zinc-500' : isLight ? 'bg-white border-zinc-200' : 'bg-[#13151f] border-[#1f2335]'
      }`}>
        <div className="capsule-search-container max-w-md">
          <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
          <input
            type="text"
            className="premium-search-input"
            placeholder={activeTab === 'products' ? "BUSCAR EN EL CATÁLOGO DE PRODUCTOS..." : "BUSCAR EN EL CATÁLOGO DE INSUMOS..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {activeTab === 'products' ? (
          filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(item => (
                <div
                  key={item.id}
                  className={`flex flex-col border rounded-xl overflow-hidden shadow-sm transition-all group ${
                    isLight ? 'bg-white border-zinc-200 hover:shadow-md' : 'bg-[#161824] border-[#252838] hover:border-zinc-700'
                  }`}
                >
                  {/* Image Section */}
                  <div className={`h-40 relative flex items-center justify-center border-b p-2 bg-zinc-50 ${isLight ? 'border-zinc-100' : 'border-[#252838]'}`}>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.description}
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-400 gap-1.5 uppercase select-none">
                        <ImageIcon className="w-8 h-8 opacity-40 text-zinc-400" />
                        <span className="text-[9px] font-black text-zinc-400">Sin Imagen</span>
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-150 uppercase tracking-wide">
                        PRODUCTO PRINCIPAL
                      </span>
                      <h3 className={`text-xs font-black uppercase leading-relaxed line-clamp-3 ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                        {item.description}
                      </h3>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-dashed mt-3 border-zinc-200">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase">Precio</span>
                      <span className="text-sm font-black text-indigo-600">
                        {config.currencySymbol || '$'}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className={`px-3 py-2 border-t flex justify-end gap-1.5 shrink-0 ${isLight ? 'bg-zinc-50 border-zinc-150' : 'bg-[#181a28] border-[#252838]'}`}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-zinc-500 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-colors cursor-pointer border-none"
                      title="Editar producto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer border-none"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
              <ImageIcon className="w-12 h-12 text-zinc-300 mb-2 opacity-50" />
              <h3 className={`text-sm font-black uppercase ${isLight ? 'text-zinc-650' : 'text-zinc-450'}`}>Catálogo Vacío</h3>
              <p className="text-[11px] text-zinc-400 font-bold uppercase mt-1">
                {searchTerm.trim() 
                  ? 'No se encontraron productos que coincidan con la búsqueda.'
                  : 'Aún no tienes productos registrados. Agrégalos para crear cotizaciones rápidas.'}
              </p>
            </div>
          )
        ) : (
          filteredInsumos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredInsumos.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 border rounded-xl shadow-sm transition-all hover:shadow-md ${
                    isLight ? 'bg-white border-zinc-200' : 'bg-[#161824] border-[#252838] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-150 uppercase tracking-wide">
                        Insumo / Mano de Obra
                      </span>
                    </div>
                    <h3 className={`text-xs font-black uppercase truncate ${isLight ? 'text-zinc-800' : 'text-zinc-250'}`} title={item.description}>
                      {item.description}
                    </h3>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase">Costo:</span>
                      <span className="text-xs font-black text-indigo-650">
                        {config.currencySymbol || '$'}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className={`p-1.5 rounded hover:bg-indigo-50 hover:text-indigo-650 transition-colors cursor-pointer border-none ${
                        isLight ? 'text-zinc-500' : 'text-zinc-400 hover:bg-indigo-950/30'
                      }`}
                      title="Editar concepto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className={`p-1.5 rounded hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer border-none ${
                        isLight ? 'text-zinc-500' : 'text-zinc-400 hover:bg-rose-950/30'
                      }`}
                      title="Eliminar concepto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
              <FileText className="w-12 h-12 text-zinc-300 mb-2 opacity-50" />
              <h3 className={`text-sm font-black uppercase ${isLight ? 'text-zinc-650' : 'text-zinc-450'}`}>Catálogo Vacío</h3>
              <p className="text-[11px] text-zinc-400 font-bold uppercase mt-1">
                {searchTerm.trim() 
                  ? 'No se encontraron insumos que coincidan con la búsqueda.'
                  : 'Aún no tienes conceptos de mano de obra o insumos en el catálogo. Se añadirán solos con el tiempo.'}
              </p>
            </div>
          )
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSave}
            className={`flex flex-col rounded-xl shadow-2xl overflow-hidden max-h-[90vh] w-full max-w-md border ${
              isRetro ? 'bg-[#d4d0c8] border-zinc-500' : isLight ? 'bg-white border-zinc-200' : 'bg-[#1a1c29] border-[#2a2e45]'
            }`}
          >
            {/* Modal Header */}
            <div className={`modal-dark-header px-4 py-3 border-b flex justify-between items-center shrink-0 ${
              isRetro ? 'bg-[#000080] text-white border-zinc-500' : isLight ? 'bg-zinc-50 border-zinc-250 text-zinc-800' : 'bg-[#1f2235] border-[#2a2e45] text-white'
            }`}>
              <span className="font-black text-xs uppercase tracking-wider text-white retro-white-text">
                {editingItem 
                  ? (activeTab === 'products' ? 'Editar Producto del Catálogo' : 'Editar Insumo del Catálogo')
                  : (activeTab === 'products' ? 'Agregar Producto al Catálogo' : 'Agregar Insumo al Catálogo')}
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`p-0.5 rounded-full border-none cursor-pointer transition-colors text-white retro-white-text ${
                  isRetro ? 'bg-zinc-350 hover:bg-zinc-400' : 'text-zinc-450 hover:text-zinc-650'
                }`}
              >
                <X className="w-4 h-4 text-white retro-white-text" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2 font-bold uppercase text-[10px]">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  {errorMsg}
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-zinc-500">
                  {activeTab === 'products' ? 'Descripción del Producto' : 'Mano de Obra / Concepto Secundario'}
                </label>
                <textarea
                  rows={3}
                  className="bg-white border border-zinc-300 rounded-lg p-2.5 text-xs text-black focus:outline-none focus:border-indigo-500 uppercase font-black w-full resize-none placeholder-zinc-300"
                  placeholder={activeTab === 'products' ? "EJ: CÁMARA SEGURIDAD DAHUA 1080P..." : "EJ: INSTALACIÓN Y CONFIGURACIÓN DE EQUIPOS..."}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* Price */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-zinc-500">
                  {activeTab === 'products' ? 'Precio de Venta' : 'Costo del Concepto'}
                </label>
                <div className="flex items-center gap-1.5 border border-zinc-300 rounded-lg px-2.5 py-1.5 bg-white focus-within:border-indigo-500">
                  <span className="text-sm font-bold text-zinc-500">{config.currencySymbol || '$'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border-none focus:outline-none focus:ring-0 p-0 text-xs font-black text-black placeholder-zinc-300"
                    placeholder="0.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Image Section (Only for products catalog) */}
              {activeTab === 'products' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-zinc-500">Imagen del Producto</label>
                  <div className="flex gap-3 items-center">
                    {imageUrl ? (
                      <div className="relative w-16 h-16 border rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                        <img src={imageUrl} className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="absolute top-0 right-0 bg-rose-600 text-white p-0.5 rounded-bl hover:bg-rose-700 border-none cursor-pointer"
                          title="Eliminar imagen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-16 h-16 border border-dashed border-zinc-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 shrink-0 bg-white">
                        <Upload className="w-4 h-4 text-zinc-400" />
                        <span className="text-[7.5px] font-bold text-zinc-400 mt-1 uppercase">Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    )}

                    <div className="flex-1">
                      <input
                        type="text"
                        className="bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-indigo-500 w-full placeholder-zinc-300 font-bold"
                        placeholder="O pegar URL de imagen..."
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className={`flex gap-2 px-4 py-3 border-t shrink-0 ${
              isRetro ? 'bg-[#d4d0c8] border-zinc-500' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#151822] border-zinc-800'
            }`}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all border ${
                  isRetro ? 'bg-zinc-200 border-zinc-400 text-zinc-700 hover:bg-zinc-300'
                  : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`flex-1 py-2 text-xs font-black rounded-lg cursor-pointer transition-all border border-transparent ${
                  isRetro ? 'bg-[#000080] text-white retro-white-text hover:bg-blue-800'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {editingItem ? 'Guardar Cambios' : 'Crear Concepto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
