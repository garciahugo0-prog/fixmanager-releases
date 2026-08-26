import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  CreditCard, 
  ChevronRight, 
  User, 
  Plus, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Package,
  Trash2,
  ShoppingBag
} from 'lucide-react';
import { 
  CreditAccount, 
  CreditSaleEntry, 
  CreditPayment, 
  WorkshopConfig, 
  AppUser, 
  ApartadoEntry, 
  ApartadoPayment,
  InventoryItem,
  RefaccionItem,
  Client
} from '../../types';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

interface MobileFiadosViewProps {
  accounts: CreditAccount[];
  apartados: ApartadoEntry[];
  inventory: InventoryItem[];
  refacciones: RefaccionItem[];
  clients: Client[];
  config: WorkshopConfig;
  currentUser: AppUser | null;
  isLight: boolean;
  onClose: () => void;
  onAddEntry: (accountId: string, entry: CreditSaleEntry) => void;
  onAddPayment: (accountId: string, payment: CreditPayment) => void;
  onDeleteAccount: (accountId: string) => void;
  onCreateCreditAccount: (account: CreditAccount) => void;
  onCreateApartado: (a: ApartadoEntry) => void;
  onAddApartadoPayment: (apartadoId: string, payment: ApartadoPayment) => void;
  onUpdateApartadoStatus: (apartadoId: string, status: ApartadoEntry['status']) => void;
}

export default function MobileFiadosView({
  accounts = [],
  apartados = [],
  inventory = [],
  refacciones = [],
  clients = [],
  config,
  currentUser,
  isLight,
  onClose,
  onAddEntry,
  onAddPayment,
  onDeleteAccount,
  onCreateCreditAccount,
  onCreateApartado,
  onAddApartadoPayment,
  onUpdateApartadoStatus
}: MobileFiadosViewProps) {
  const sym = config.currencySymbol || '$';

  const [activeTab, setActiveTab] = useState<'fiados' | 'apartados'>('fiados');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de Detalle / Transacciones
  const [selectedAccount, setSelectedAccount] = useState<CreditAccount | null>(null);
  const [selectedApartado, setSelectedApartado] = useState<ApartadoEntry | null>(null);

  // Estados de Formularios Manuales
  const [showAddCargoModal, setShowAddCargoModal] = useState(false);
  const [cargoConcept, setCargoConcept] = useState('');
  const [cargoAmount, setCargoAmount] = useState('');

  const [showAddAbonoModal, setShowAddAbonoModal] = useState(false);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoMethod, setAbonoMethod] = useState<'Efectivo' | 'Tarjeta/Transfer' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [abonoNotes, setAbonoNotes] = useState('');
  const [abonoTargetEntryId, setAbonoTargetEntryId] = useState<string | null>(null);
  const [abonoTargetItemId, setAbonoTargetItemId] = useState<string | null>(null);

  const [showAddApartadoAbonoModal, setShowAddApartadoAbonoModal] = useState(false);
  const [aptAbonoAmount, setAptAbonoAmount] = useState('');
  const [aptAbonoMethod, setAptAbonoMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [aptAbonoNotes, setAptAbonoNotes] = useState('');

  // Estados para Crear Nueva Cuenta de Fiado
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');

  // Estados para Agregar Artículos a Cuenta de Fiado
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [itemsToAdd, setItemsToAdd] = useState<{ itemId?: string; name: string; qty: number; price: number }[]>([]);
  const [addItemSearchQuery, setAddItemSearchQuery] = useState('');

  // Estados para Crear Nuevo Apartado
  const [showCreateApartadoModal, setShowCreateApartadoModal] = useState(false);
  const [newAptClientName, setNewAptClientName] = useState('');
  const [newAptClientPhone, setNewAptClientPhone] = useState('');
  const [newAptDueDate, setNewAptDueDate] = useState('');
  const [newAptNotes, setNewAptNotes] = useState('');
  const [newAptItems, setNewAptItems] = useState<{ itemId?: string; name: string; quantity: number; price: number }[]>([]);
  const [newAptInitialAmount, setNewAptInitialAmount] = useState('');
  const [newAptInitialMethod, setNewAptInitialMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [aptItemSearchQuery, setAptItemSearchQuery] = useState('');

  // ─── Helpers de Fiados ───────────────────────────────────────────────────────
  const getBalance = (a: CreditAccount) => {
    const debt = a.entries.reduce((s, e) => s + e.subtotal, 0);
    const paid = a.payments.reduce((s, p) => s + p.amount, 0);
    return Math.max(0, debt - paid);
  };

  const getDebtTotal = (a: CreditAccount) => {
    return a.entries.reduce((s, e) => s + e.subtotal, 0);
  };

  const getPaidTotal = (a: CreditAccount) => {
    return a.payments.reduce((s, p) => s + p.amount, 0);
  };

  // Filtrado de Fiados
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter(a => !a.deletedAt)
      .filter(a => {
        const query = searchQuery.toLowerCase().trim();
        return (
          a.clientName.toLowerCase().includes(query) ||
          (a.clientPhone || '').includes(query)
        );
      });
  }, [accounts, searchQuery]);

  // ─── Helpers de Apartados ────────────────────────────────────────────────────
  const getAptBalance = (a: ApartadoEntry) => {
    const paid = a.payments.reduce((s, p) => s + p.amount, 0);
    return Math.max(0, a.totalValue - paid);
  };

  const getAptPaid = (a: ApartadoEntry) => {
    return a.payments.reduce((s, p) => s + p.amount, 0);
  };

  // Filtrado de Apartados
  const filteredApartados = useMemo(() => {
    return apartados.filter(a => {
      const query = searchQuery.toLowerCase().trim();
      return (
        a.clientName.toLowerCase().includes(query) ||
        (a.clientPhone || '').includes(query) ||
        a.id.toLowerCase().includes(query)
      );
    });
  }, [apartados, searchQuery]);

  const genId = () => `FD-${Date.now().toString(36).toUpperCase()}`;
  const genAptId = () => `APT-${Date.now().toString(36).toUpperCase()}`;

  const combinedItems = useMemo(() => {
    const activeRef = refacciones.filter(r => r.active !== false);
    const surrogateRef: InventoryItem[] = activeRef.map(r => ({
      id: r.id,
      code: r.code || '',
      name: `[REFACCIÓN] ${r.name.toUpperCase()} (${(r.deviceBrand || '').toUpperCase()} ${(r.deviceModel || '').toUpperCase()})`,
      brand: r.brand,
      category: r.category || 'Refacciones',
      stock: r.stock,
      minStock: r.minStock || 0,
      price: r.price,
      wholesalePrice: r.wholesalePrice,
      cost: r.cost || 0,
      imageUrl: r.imageUrl,
      extraImages: r.extraImages,
      favorite: !!r.favorite,
      reservedQty: 0,
      manageStock: r.manageStock !== false,
      warehouseStock: r.warehouseStock,
      isChip: false,
    }));
    return [...inventory, ...surrogateRef];
  }, [inventory, refacciones]);

  // Filtrado de inventario para Agregar Artículos a Fiado
  const filteredCombinedItems = useMemo(() => {
    if (!addItemSearchQuery.trim()) return [];
    const query = addItemSearchQuery.toLowerCase().trim();
    return combinedItems.filter(i => {
      return i.name.toLowerCase().includes(query) || (i.code && i.code.toLowerCase().includes(query));
    }).slice(0, 10);
  }, [combinedItems, addItemSearchQuery]);

  // Filtrado de inventario para Crear Nuevo Apartado
  const filteredAptCombinedItems = useMemo(() => {
    if (!aptItemSearchQuery.trim()) return [];
    const query = aptItemSearchQuery.toLowerCase().trim();
    return combinedItems.filter(i => {
      return i.name.toLowerCase().includes(query) || (i.code && i.code.toLowerCase().includes(query));
    }).slice(0, 10);
  }, [combinedItems, aptItemSearchQuery]);
  const handleConfirmAbonoFiado = () => {
    if (!selectedAccount) return;
    const amt = parseFloat(abonoAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('⚠️ Por favor ingrese un monto de abono válido.');
      return;
    }
    const currentBalance = getBalance(selectedAccount);
    if (amt > currentBalance) {
      alert(`⚠️ El abono no puede superar el saldo deudor actual de ${sym}${currentBalance.toFixed(2)}.`);
      return;
    }

    const newPayment: CreditPayment = {
      id: `PAY-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      amount: amt,
      method: abonoMethod,
      note: abonoNotes.trim() || undefined,
      entryId: abonoTargetEntryId || undefined,
      itemId: abonoTargetItemId || undefined
    };

    onAddPayment(selectedAccount.id, newPayment);

    // Actualizar cuenta localmente para que se vea reflejado en la pantalla de detalles
    setSelectedAccount(prev => {
      if (!prev) return null;
      return {
        ...prev,
        payments: [...prev.payments, newPayment]
      };
    });

    // Resetear formulario
    setAbonoAmount('');
    setAbonoNotes('');
    setAbonoMethod('Efectivo');
    setAbonoTargetEntryId(null);
    setAbonoTargetItemId(null);
    setShowAddAbonoModal(false);
  };

  // Manejar cargos en cuenta de fiado
  const handleConfirmCargoFiado = () => {
    if (!selectedAccount) return;
    const concept = cargoConcept.trim();
    if (!concept) {
      alert('⚠️ Por favor ingrese un concepto para el cargo.');
      return;
    }
    const amt = parseFloat(cargoAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('⚠️ Por favor ingrese un monto válido para el cargo.');
      return;
    }

    const newEntry: CreditSaleEntry = {
      id: `ENT-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      note: concept,
      subtotal: amt,
      items: [{ itemId: 'manual', name: concept, quantity: 1, price: amt }]
    };

    onAddEntry(selectedAccount.id, newEntry);

    // Actualizar cuenta localmente para reflejar en pantalla
    setSelectedAccount(prev => {
      if (!prev) return null;
      return {
        ...prev,
        entries: [...prev.entries, newEntry]
      };
    });

    // Resetear formulario
    setCargoConcept('');
    setCargoAmount('');
    setShowAddCargoModal(false);
  };

  // Handler para crear cuenta de fiado
  const handleConfirmCreateAccount = () => {
    if (!newClientName.trim()) {
      alert('⚠️ Por favor ingresa el nombre del cliente.');
      return;
    }
    const limit = parseFloat(newCreditLimit);
    const newAccount: CreditAccount = {
      id: genId(),
      clientName: newClientName.trim().toUpperCase(),
      clientPhone: newClientPhone.trim(),
      creditLimit: isNaN(limit) ? undefined : limit,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      entries: [],
      payments: [],
      isClosed: false
    };
    onCreateCreditAccount(newAccount);
    setShowCreateAccountModal(false);
    // Auto-seleccionar la nueva cuenta creada para que puedan agregarle artículos directamente
    setSelectedAccount(newAccount);
  };

  // Handler para agregar artículos al fiado seleccionado
  const handleConfirmAgregarItems = () => {
    if (!selectedAccount || itemsToAdd.length === 0) return;
    const subtotal = itemsToAdd.reduce((s, i) => s + i.qty * i.price, 0);
    const entry: CreditSaleEntry = {
      id: genId(),
      createdAt: new Date().toISOString(),
      items: itemsToAdd.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.qty, price: i.price })),
      subtotal,
    };
    onAddEntry(selectedAccount.id, entry);
    // Actualizar cuenta localmente para que se vea reflejado en la pantalla de detalles
    setSelectedAccount(prev => {
      if (!prev) return null;
      return {
        ...prev,
        entries: [entry, ...prev.entries],
        lastActivityAt: entry.createdAt
      };
    });
    setItemsToAdd([]);
    setAddItemSearchQuery('');
    setShowAddItemsModal(false);
  };

  // Handler para crear nuevo apartado
  const handleConfirmCreateApartado = () => {
    if (!newAptClientName.trim()) {
      alert('⚠️ Por favor ingresa el nombre del cliente.');
      return;
    }
    const items = newAptItems.filter(i => i.name.trim() && i.price > 0 && i.quantity > 0);
    if (items.length === 0) {
      alert('⚠️ Por favor agrega al menos un artículo válido al apartado.');
      return;
    }
    const initialAmt = parseFloat(newAptInitialAmount);
    if (isNaN(initialAmt) || initialAmt < 0) {
      alert('⚠️ Por favor ingresa un monto inicial válido.');
      return;
    }
    const totalValue = items.reduce((s, i) => s + i.price * i.quantity, 0);
    if (initialAmt > totalValue) {
      alert(`⚠️ El pago inicial no puede ser mayor al valor total del apartado (${sym}${totalValue.toFixed(2)}).`);
      return;
    }
    const firstPayment: ApartadoPayment = {
      id: `APT-PAY-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toISOString(),
      amount: initialAmt,
      method: newAptInitialMethod,
    };
    const newStatus: ApartadoEntry['status'] = initialAmt >= totalValue ? 'Listo' : 'Activo';
    const newApt: ApartadoEntry = {
      id: genAptId(),
      clientName: newAptClientName.trim().toUpperCase(),
      clientPhone: newAptClientPhone.trim() || undefined,
      items: items.map(i => ({ itemId: i.itemId, name: i.name.trim(), price: i.price, quantity: i.quantity })),
      totalValue,
      payments: [firstPayment],
      status: newStatus,
      createdAt: new Date().toISOString(),
      dueDate: newAptDueDate || undefined,
      notes: newAptNotes.trim() || undefined,
    };
    onCreateApartado(newApt);
    setShowCreateApartadoModal(false);
  };

  // Eliminar cuenta de fiado
  const handleDeleteAccountConfirm = () => {
    if (!selectedAccount) return;
    const balance = getBalance(selectedAccount);
    if (balance > 0) {
      if (!confirm(`⚠️ Esta cuenta tiene un saldo deudor activo de ${sym}${balance.toFixed(2)}.\n\n¿Estás seguro de que deseas eliminarla? Todos los registros se perderán.`)) {
        return;
      }
    } else {
      if (!confirm(`¿Deseas eliminar la cuenta de fiado de ${selectedAccount.clientName}?`)) {
        return;
      }
    }

    onDeleteAccount(selectedAccount.id);
    setSelectedAccount(null);
    alert('✅ Cuenta de fiado eliminada.');
  };

  // Manejar abonos en apartado
  const handleConfirmAbonoApartado = () => {
    if (!selectedApartado) return;
    const amt = parseFloat(aptAbonoAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('⚠️ Por favor ingrese un monto de abono válido.');
      return;
    }
    const balance = getAptBalance(selectedApartado);
    if (amt > balance) {
      alert(`⚠️ El abono no puede superar el saldo pendiente de ${sym}${balance.toFixed(2)}.`);
      return;
    }

    const newPayment: ApartadoPayment = {
      id: `PAY-APT-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toISOString(),
      amount: amt,
      method: aptAbonoMethod,
      note: aptAbonoNotes.trim() || undefined
    };

    onAddApartadoPayment(selectedApartado.id, newPayment);

    // Actualizar apartado local
    const updatedPayments = [...selectedApartado.payments, newPayment];
    const newPaid = updatedPayments.reduce((s, p) => s + p.amount, 0);
    const newStatus: ApartadoEntry['status'] = newPaid >= selectedApartado.totalValue ? 'Listo' : 'Activo';

    setSelectedApartado(prev => {
      if (!prev) return null;
      return {
        ...prev,
        payments: updatedPayments,
        status: prev.status === 'Entregado' ? 'Entregado' : newStatus
      };
    });

    // Resetear formulario
    setAptAbonoAmount('');
    setAptAbonoNotes('');
    setAptAbonoMethod('Efectivo');
    setShowAddApartadoAbonoModal(false);
  };

  // Entregar apartado
  const handleDeliverApartado = () => {
    if (!selectedApartado) return;
    const balance = getAptBalance(selectedApartado);
    if (balance > 0) {
      alert(`⚠️ No se puede entregar este apartado porque aún tiene un saldo pendiente de ${sym}${balance.toFixed(2)}.\n\nPor favor, liquide el apartado primero.`);
      return;
    }

    onUpdateApartadoStatus(selectedApartado.id, 'Entregado');

    setSelectedApartado(prev => {
      if (!prev) return null;
      return {
        ...prev,
        status: 'Entregado'
      };
    });

    alert('✅ El apartado ha sido marcado como ENTREGADO con éxito.');
  };

  return (
    <div 
      className={`fixed inset-0 z-[999999] flex flex-col select-none ${
        isLight ? 'bg-white text-slate-800' : 'bg-[#0c1224] text-white'
      }`}
    >
      {/* ── HEADER SUPERIOR COHESIVO E INTEGRADO (ESTILO iOS PREMIUM) ─────────── */}
      <header 
        style={{ paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))' }}
        className={`px-5 pb-4 shrink-0 flex flex-col gap-4 ${
          isLight ? 'bg-white' : 'bg-[#0c1224]'
        }`}
      >
        {/* Fila del Título y Regreso */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700' 
                  : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight leading-none">Créditos y Apartados</h2>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1 block">Gestión de Cobro</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'fiados') {
                setNewClientName('');
                setNewClientPhone('');
                setNewCreditLimit('');
                setShowCreateAccountModal(true);
              } else {
                setNewAptClientName('');
                setNewAptClientPhone('');
                setNewAptDueDate('');
                setNewAptNotes('');
                setNewAptItems([]);
                setNewAptInitialAmount('');
                setNewAptInitialMethod('Efectivo');
                setShowCreateApartadoModal(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-650 text-white rounded-2xl shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'fiados' ? 'Nuevo' : 'Nuevo'}</span>
          </button>
        </div>

        {/* Pestañas estilo Segmented Control (iOS Nativo con Color y Alma) */}
        <div className={`p-1 rounded-2xl flex gap-1 ${
          isLight ? 'bg-slate-100' : 'bg-zinc-900/60'
        }`}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('fiados');
              setSearchQuery('');
            }}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'fiados'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 scale-100'
                : isLight
                  ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Fiados</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('apartados');
              setSearchQuery('');
            }}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'apartados'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20 scale-100'
                : isLight
                  ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Apartados</span>
          </button>
        </div>

        {/* Buscador Estilo POS (Píldora Limpia) */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'fiados' ? 'Buscar cliente o teléfono de fiado...' : 'Buscar cliente, teléfono o ID de apartado...'}
            className={`w-full h-11 pl-10 pr-10 text-xs font-bold rounded-2xl focus:outline-none border ${
              isLight 
                ? 'bg-white border-slate-300 text-slate-800 focus:border-blue-500' 
                : 'bg-zinc-900 border-zinc-700 text-white focus:border-violet-500'
            }`}
          />
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── LISTADO PRINCIPAL (FIADOS U APARTADOS) ─────────────────────────── */}
      <section className={`flex-1 overflow-y-auto p-5 space-y-3.5 ${
        isLight ? 'bg-white' : 'bg-[#0c1224]'
      }`}>
        {activeTab === 'fiados' ? (
          <>
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl block">💳</span>
                <span className="text-xs font-bold text-zinc-500 mt-2 block">No se encontraron cuentas de fiados activas.</span>
              </div>
            ) : (
              filteredAccounts.map(account => {
                const balance = getBalance(account);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedAccount(account)}
                    className={`w-full p-4 rounded-3xl border flex items-center justify-between text-left active:scale-98 transition-all cursor-pointer ${
                      isLight 
                        ? 'bg-white border-slate-200 hover:bg-slate-50 shadow-xs' 
                        : 'bg-zinc-900 border-zinc-850 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                        balance > 0
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black uppercase tracking-wide leading-none truncate">{account.clientName}</h4>
                        <span className="text-[10px] font-black text-zinc-500 mt-1 block">
                          {account.clientPhone ? formatPhoneNumber(account.clientPhone) : 'Sin teléfono'}
                          {' • '}
                          <span className="text-amber-500 font-bold">
                            Límite: {(() => {
                              const clientMatch = clients?.find(c => c.phone === account.clientPhone || c.name.toLowerCase().trim() === account.clientName.toLowerCase().trim());
                              const limit = clientMatch?.creditLimit ?? account.creditLimit;
                              return limit !== undefined && limit > 0 ? `${sym}${limit.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : 'Sin límite';
                            })()}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <span className={`text-xs font-black font-mono block ${
                          balance > 0 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {sym}{balance.toFixed(2)}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500 block mt-0.5">
                          {balance > 0 ? 'Saldo Deudor' : 'Al Corriente'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    </div>
                  </button>
                );
              })
            )}
          </>
        ) : (
          <>
            {filteredApartados.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl block">📦</span>
                <span className="text-xs font-bold text-zinc-500 mt-2 block">No se encontraron apartados activos.</span>
              </div>
            ) : (
              filteredApartados.map(apt => {
                const balance = getAptBalance(apt);
                const statusColor = 
                  apt.status === 'Entregado' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
                  apt.status === 'Listo' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  'bg-purple-500/10 text-purple-500 border-purple-500/20';

                return (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => setSelectedApartado(apt)}
                    className={`w-full p-4 rounded-3xl border flex items-center justify-between text-left active:scale-98 transition-all cursor-pointer ${
                      isLight 
                        ? 'bg-white border-slate-200 hover:bg-slate-50 shadow-xs' 
                        : 'bg-zinc-900 border-zinc-850 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${statusColor} border`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-xs font-black uppercase tracking-wide leading-none truncate">{apt.clientName}</h4>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${statusColor} shrink-0`}>
                            {apt.status}
                          </span>
                        </div>
                        <span className="text-[9px] font-black font-mono text-zinc-500 mt-1 block">
                          ID: {apt.id} • {apt.clientPhone ? formatPhoneNumber(apt.clientPhone) : 'Sin teléfono'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <span className="text-xs font-black font-mono block text-purple-500">
                          {sym}{balance.toFixed(2)}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500 block mt-0.5">
                          Resta de {sym}{apt.totalValue.toFixed(2)}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    </div>
                  </button>
                );
              })
            )}
          </>
        )}
      </section>

      {/* ─── MODAL DETALLE DE CUENTA FIADO ───────────────────────────────────── */}
      {selectedAccount && (
        <div 
          style={{ position: 'fixed' }}
          className={`inset-0 z-[99992] flex flex-col ${
            isLight ? 'bg-slate-50' : 'bg-[#0c1224]'
          }`}
        >
          {/* Header */}
          <div 
            style={{ paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))' }}
            className={`px-5 pb-3 shrink-0 flex items-center justify-between ${
              isLight ? 'bg-slate-50' : 'bg-[#0c1224]'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700' 
                    : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wide leading-none">{selectedAccount.clientName}</h2>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-1 block">
                  {selectedAccount.clientPhone ? formatPhoneNumber(selectedAccount.clientPhone) : 'Sin teléfono'}
                  {' • '}
                  <span className="text-amber-500">
                    Límite: {(() => {
                      const clientMatch = clients?.find(c => c.phone === selectedAccount.clientPhone || c.name.toLowerCase().trim() === selectedAccount.clientName.toLowerCase().trim());
                      const limit = clientMatch?.creditLimit ?? selectedAccount.creditLimit;
                      return limit !== undefined && limit > 0 ? `${sym}${limit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Sin límite';
                    })()}
                  </span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDeleteAccountConfirm}
              className="p-2 rounded-xl border border-red-500/20 text-red-500 bg-red-500/10 hover:bg-red-500/20 cursor-pointer active:scale-95 transition-all"
            >
              🗑️
            </button>
          </div>

          {/* Resumen del Saldo */}
          <div className="px-5 py-4 shrink-0 grid grid-cols-3 gap-2.5 text-center bg-transparent">
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25">
              <span className="text-[8px] font-black uppercase tracking-wider text-red-500 block">Total Cargos</span>
              <span className="text-xs font-black font-mono mt-1 block text-red-500">{sym}{getDebtTotal(selectedAccount).toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 block">Total Abonos</span>
              <span className="text-xs font-black font-mono mt-1 block text-emerald-500">{sym}{getPaidTotal(selectedAccount).toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <span className="text-[8px] font-black uppercase tracking-wider text-amber-500 block">Saldo Restante</span>
              <span className="text-xs font-black font-mono mt-1 block text-amber-500">{sym}{getBalance(selectedAccount).toFixed(2)}</span>
            </div>
          </div>

          {/* Historial de transacciones */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Cargos / Artículos Fiados */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Artículos Fiados (Cargos)</span>
              </h4>

              {selectedAccount.entries.length === 0 ? (
                <div className={`p-4 text-center rounded-2xl border border-dashed text-xs font-bold ${
                  isLight ? 'border-slate-200 text-slate-400 bg-white' : 'border-zinc-800 text-zinc-500 bg-zinc-900/20'
                }`}>
                  No hay cargos registrados en esta cuenta.
                </div>
              ) : (
                <div className="space-y-3">
                  {[...selectedAccount.entries]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((entry) => {
                      const entryPayments = selectedAccount.payments.filter(p => p.entryId === entry.id);
                      const totalPaidForEntry = entryPayments.reduce((s, p) => s + p.amount, 0);
                      const entryRemaining = Math.max(0, entry.subtotal - totalPaidForEntry);
                      const isEntryFullyPaid = totalPaidForEntry >= entry.subtotal;
                      const isEntryPartiallyPaid = totalPaidForEntry > 0 && totalPaidForEntry < entry.subtotal;

                      return (
                        <div
                          key={entry.id}
                          className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all ${
                            isLight
                              ? 'bg-white border-slate-200/80 shadow-xs'
                              : 'bg-zinc-900/60 border-zinc-850'
                          }`}
                        >
                          {/* Header de la tarjeta */}
                          <div className="flex justify-between items-start gap-2 border-b pb-2 border-zinc-150 dark:border-zinc-800">
                            <span className="text-[9px] font-black text-zinc-450 uppercase tracking-tight block">
                              {new Date(entry.createdAt).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>

                            {isEntryFullyPaid ? (
                              <span className="text-[8.5px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                                ✓ Liquidado
                              </span>
                            ) : isEntryPartiallyPaid ? (
                              <span className="text-[8.5px] font-black uppercase px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-lg border border-orange-500/20">
                                Abonado: {sym}{totalPaidForEntry.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-black uppercase px-2 py-0.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
                                Pendiente
                              </span>
                            )}
                          </div>

                           {/* Lista de productos fiados en este cargo */}
                          <div className="space-y-1.5">
                            {entry.items.map((it, idx) => {
                              const itemPayments = selectedAccount.payments.filter(p => p.entryId === entry.id && p.itemId === it.itemId);
                              const totalPaidForItem = itemPayments.reduce((s, p) => s + p.amount, 0);
                              const itemTotal = it.price * it.quantity;
                              const isItemFullyPaid = totalPaidForItem >= itemTotal;
                              const isItemPartiallyPaid = totalPaidForItem > 0 && totalPaidForItem < itemTotal;

                              const showItemBadges = entry.items.length > 1 || it.quantity > 1;
                              const showPayItemButton = showItemBadges && !isItemFullyPaid && !isEntryFullyPaid;

                              const amtToPay = (it.quantity > 1 && totalPaidForItem === 0) ? it.price : (itemTotal - totalPaidForItem);
                              const defaultNote = (it.quantity > 1 && totalPaidForItem === 0) ? `Pago de: 1x ${it.name}` : `Pago de: ${it.quantity}x ${it.name}`;

                              return (
                                <div key={idx} className="flex justify-between items-center text-xs py-1 border-b last:border-0 border-zinc-100 dark:border-zinc-800/40">
                                  <div className="flex-1 min-w-0 pr-2 flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-zinc-100'}`}>
                                      {it.name}
                                    </span>
                                    {it.quantity > 1 && (
                                      <span className="text-[10px] font-mono font-black text-zinc-450">
                                        ×{it.quantity}
                                      </span>
                                    )}
                                    {showItemBadges && isItemFullyPaid && (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 shrink-0">✓ Pagado</span>
                                    )}
                                    {showItemBadges && isItemPartiallyPaid && (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20 shrink-0">Abonado: {sym}{totalPaidForItem.toFixed(2)}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {showPayItemButton && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAbonoAmount(amtToPay.toFixed(2));
                                          setAbonoTargetEntryId(entry.id);
                                          setAbonoTargetItemId(it.itemId);
                                          setAbonoNotes(defaultNote);
                                          setShowAddAbonoModal(true);
                                        }}
                                        className="px-1.5 py-0.5 text-[8.5px] font-black uppercase bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg border border-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                                      >
                                        Pagar Art.
                                      </button>
                                    )}
                                    <span className={`font-black font-mono shrink-0 ${isLight ? 'text-slate-650' : 'text-zinc-350'}`}>
                                      {sym}{itemTotal.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Footer de la tarjeta con precio y acción */}
                          <div className="flex justify-between items-center pt-2 mt-1 border-t border-dashed border-zinc-150 dark:border-zinc-800">
                            <div>
                              <span className="text-[8px] font-black uppercase text-zinc-450 tracking-wider block">Monto del Cargo</span>
                              <span className="text-sm font-black font-mono text-red-500">
                                {sym}{entry.subtotal.toFixed(2)}
                              </span>
                            </div>

                            {!isEntryFullyPaid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAbonoAmount(entryRemaining.toFixed(2));
                                  setAbonoTargetEntryId(entry.id);
                                  setAbonoNotes(`Liquidación de cargo: ${entry.id}`);
                                  setShowAddAbonoModal(true);
                                }}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
                              >
                                💵 {isEntryPartiallyPaid ? 'Liquidar Resto' : 'Liquidar Cargo'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Abonos Registrados */}
            <div className="pt-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                <span>Abonos Registrados</span>
              </h4>

              {selectedAccount.payments.length === 0 ? (
                <div className={`p-4 text-center rounded-2xl border border-dashed text-xs font-bold ${
                  isLight ? 'border-slate-200 text-slate-400 bg-white' : 'border-zinc-800 text-zinc-500 bg-zinc-900/20'
                }`}>
                  No hay abonos registrados en esta cuenta.
                </div>
              ) : (
                <div className="space-y-2">
                  {[...selectedAccount.payments]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((p) => {
                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                            isLight
                              ? 'bg-emerald-500/5 border-emerald-500/15 text-slate-800 shadow-xs'
                              : 'bg-emerald-950/10 border-emerald-900/20 text-zinc-150'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🟢</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black uppercase tracking-tight">
                                  Abono Registrado
                                </span>
                                <span className="text-[8.5px] font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 rounded">
                                  {p.method}
                                </span>
                              </div>
                              <span className="text-[9px] font-black text-zinc-450 mt-0.5 block">
                                {new Date(p.createdAt).toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                              {p.note && (
                                <span className="text-[9.5px] font-bold text-zinc-500 dark:text-zinc-400 mt-1 block">
                                  Nota: {p.note}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-xs font-black font-mono text-emerald-500">
                            -{sym}{p.amount.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción inferiores */}
          <div 
            style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
            className={`px-5 pt-4 shrink-0 flex flex-col gap-2.5 ${
              isLight ? 'bg-slate-50' : 'bg-[#0c1224]'
            }`}
          >
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddCargoModal(true)}
                className={`flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                Cargo Manual
              </button>
              <button
                type="button"
                onClick={() => {
                  setItemsToAdd([]);
                  setAddItemSearchQuery('');
                  setShowAddItemsModal(true);
                }}
                className={`flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                Agregar Artículos
              </button>
            </div>
            <button
              type="button"
              disabled={getBalance(selectedAccount) === 0}
              onClick={() => setShowAddAbonoModal(true)}
              className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Registrar Abono
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL DETALLE DE APARTADO ───────────────────────────────────────── */}
      {selectedApartado && (
        <div 
          style={{ position: 'fixed' }}
          className={`inset-0 z-[99992] flex flex-col ${
            isLight ? 'bg-slate-50' : 'bg-[#0c1224]'
          }`}
        >
          {/* Header */}
          <div 
            style={{ paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))' }}
            className={`px-5 pb-3 shrink-0 flex items-center justify-between ${
              isLight ? 'bg-slate-50' : 'bg-[#0c1224]'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedApartado(null)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700' 
                    : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wide leading-none">{selectedApartado.clientName}</h2>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-1 block font-mono">
                  Apartado {selectedApartado.id}
                </span>
              </div>
            </div>

            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
              selectedApartado.status === 'Entregado' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
              selectedApartado.status === 'Listo' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
              'bg-purple-500/10 text-purple-500 border-purple-500/20'
            }`}>
              {selectedApartado.status}
            </span>
          </div>

          {/* Resumen del Saldo */}
          <div className="px-5 py-4 shrink-0 grid grid-cols-3 gap-2.5 text-center bg-transparent">
            <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-150' : 'bg-zinc-900/50 border-zinc-800'}`}>
              <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block">Total Apartado</span>
              <span className="text-xs font-black font-mono mt-1 block">{sym}{selectedApartado.totalValue.toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 block">Abonado</span>
              <span className="text-xs font-black font-mono mt-1 block text-emerald-500">{sym}{getAptPaid(selectedApartado).toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25">
              <span className="text-[8px] font-black uppercase tracking-wider text-purple-500 block">Pendiente</span>
              <span className="text-xs font-black font-mono mt-1 block text-purple-500">{sym}{getAptBalance(selectedApartado).toFixed(2)}</span>
            </div>
          </div>

          {/* Detalles del Apartado */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Info de Entrega/Vencimiento */}
            <div className={`p-4 rounded-2xl border ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-850'
            }`}>
              <div className="space-y-2">
                {selectedApartado.dueDate && (
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>Fecha límite: {new Date(selectedApartado.dueDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
                {selectedApartado.notes && (
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span>Notas: {selectedApartado.notes}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>Teléfono: {selectedApartado.clientPhone ? formatPhoneNumber(selectedApartado.clientPhone) : 'Sin teléfono'}</span>
                </div>
              </div>
            </div>

            {/* Artículos Apartados */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Artículos en Apartado</h4>
              <div className="space-y-2">
                {selectedApartado.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-850'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-xs font-black uppercase tracking-tight block break-all whitespace-normal">{item.name}</span>
                      <span className="text-[8px] font-black text-zinc-500 mt-0.5 block">Cantidad: {item.quantity}</span>
                    </div>
                    <span className="text-xs font-black font-mono">
                      {sym}{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagos / Abonos */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Historial de Abonos</h4>
              <div className="space-y-2">
                {selectedApartado.payments.map((pay, idx) => (
                  <div 
                    key={pay.id || idx}
                    className="p-3.5 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-black uppercase tracking-tight block">Abono {pay.note ? `(${pay.note})` : ''}</span>
                      <span className="text-[8px] font-black text-zinc-500 mt-0.5 block">
                        {new Date(pay.date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • {pay.method}
                      </span>
                    </div>
                    <span className="text-xs font-black font-mono text-emerald-500">
                      -{sym}{pay.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botones de acción de Apartado */}
          {selectedApartado.status !== 'Entregado' && (
            <div 
              style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
              className={`px-5 pt-4 shrink-0 flex gap-2.5 ${
                isLight ? 'bg-slate-50' : 'bg-[#0c1224]'
              }`}
            >
              <button
                type="button"
                disabled={getAptBalance(selectedApartado) === 0}
                onClick={() => setShowAddApartadoAbonoModal(true)}
                className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Abonar a Apartado
              </button>
              <button
                type="button"
                onClick={handleDeliverApartado}
                className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg cursor-pointer text-center active:scale-95 transition-all ${
                  getAptBalance(selectedApartado) === 0
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                }`}
              >
                {getAptBalance(selectedApartado) === 0 ? 'Entregar Producto' : 'Liquidar y Entregar'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL AGREGAR CARGO MANUAL A FIADO ──────────────────────────────── */}
      {showAddCargoModal && (
        <div className="fixed inset-0 z-[99995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4 ${
            isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 border border-zinc-800 text-white'
          }`}>
            <h3 className="text-base font-black uppercase tracking-tight">Agregar Cargo Manual</h3>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Concepto / Descripción:</label>
              <input
                type="text"
                value={cargoConcept}
                onChange={e => setCargoConcept(e.target.value)}
                placeholder="Ej. Mica de Privacidad, Reparación de pantalla..."
                className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Monto del Cargo ({sym}):</label>
              <input
                type="number"
                value={cargoAmount}
                onChange={e => setCargoAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setCargoConcept('');
                  setCargoAmount('');
                  setShowAddCargoModal(false);
                }}
                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-650 hover:bg-slate-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCargoFiado}
                className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 transition-all text-center"
              >
                Agregar Cargo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL REGISTRAR ABONO A FIADO ──────────────────────────────────── */}
      {showAddAbonoModal && selectedAccount && (
        <div className="fixed inset-0 z-[99995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4 ${
            isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 border border-zinc-800 text-white'
          }`}>
            <h3 className="text-base font-black uppercase tracking-tight">Registrar Abono</h3>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Monto a Abonar ({sym}):</label>
              <input
                type="number"
                value={abonoAmount}
                onChange={e => setAbonoAmount(e.target.value)}
                placeholder={`Máx. ${getBalance(selectedAccount).toFixed(2)}`}
                className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Método de Pago:</label>
              <div className="grid grid-cols-2 gap-2">
                {['Efectivo', 'Tarjeta/Transfer'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setAbonoMethod(method as any)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                      abonoMethod === method
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                        : isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Notas o Comentario (Opcional):</label>
              <input
                type="text"
                value={abonoNotes}
                onChange={e => setAbonoNotes(e.target.value)}
                placeholder="Comentarios adicionales..."
                className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setAbonoAmount('');
                  setAbonoNotes('');
                  setAbonoMethod('Efectivo');
                  setAbonoTargetEntryId(null);
                  setAbonoTargetItemId(null);
                  setShowAddAbonoModal(false);
                }}
                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-650 hover:bg-slate-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAbonoFiado}
                className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-95 transition-all text-center"
              >
                Confirmar Abono
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL REGISTRAR ABONO A APARTADO ────────────────────────────────── */}
      {showAddApartadoAbonoModal && selectedApartado && (
        <div className="fixed inset-0 z-[99995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4 ${
            isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 border border-zinc-800 text-white'
          }`}>
            <h3 className="text-base font-black uppercase tracking-tight">Abonar a Apartado</h3>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Monto a Abonar ({sym}):</label>
              <input
                type="number"
                value={aptAbonoAmount}
                onChange={e => setAptAbonoAmount(e.target.value)}
                placeholder={`Restante: ${getAptBalance(selectedApartado).toFixed(2)}`}
                className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Método de Pago del Abono:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['Efectivo', 'Tarjeta', 'Transferencia'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setAptAbonoMethod(method as any)}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                      aptAbonoMethod === method
                        ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                        : isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-650 hover:bg-slate-200'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-450 hover:bg-zinc-800'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Notas o Comentario (Opcional):</label>
              <input
                type="text"
                value={aptAbonoNotes}
                onChange={e => setAptAbonoNotes(e.target.value)}
                placeholder="Comentarios adicionales..."
                className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setAptAbonoAmount('');
                  setAptAbonoNotes('');
                  setAptAbonoMethod('Efectivo');
                  setShowAddApartadoAbonoModal(false);
                }}
                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-650 hover:bg-slate-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAbonoApartado}
                className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white cursor-pointer active:scale-95 transition-all text-center"
              >
                Abonar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR NUEVA CUENTA DE FIADO ────────────────────────────────── */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 z-[99995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4 ${
            isLight ? 'bg-white text-slate-900 shadow-2xl' : 'bg-zinc-900 border border-zinc-800 text-white shadow-2xl'
          }`}>
            <h3 className="text-base font-black uppercase tracking-tight">Crear Cuenta de Fiado</h3>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-450 block">Nombre del Cliente *:</label>
              <input
                type="text"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                placeholder="Nombre completo..."
                className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-455 block">Teléfono (Opcional):</label>
              <input
                type="text"
                value={newClientPhone}
                onChange={e => setNewClientPhone(e.target.value)}
                placeholder="Ej. 1234567890..."
                className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-455 block">Límite de Crédito (Opcional):</label>
              <input
                type="number"
                value={newCreditLimit}
                onChange={e => setNewCreditLimit(e.target.value)}
                placeholder={`Ej: ${config.defaultCreditLimit ?? 1000}`}
                className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                }`}
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowCreateAccountModal(false)}
                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-650 hover:bg-slate-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateAccount}
                className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 transition-all text-center"
              >
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL AGREGAR ARTÍCULOS A FIADO ─────────────────────────────────── */}
      {showAddItemsModal && selectedAccount && (
        <div className="fixed inset-0 z-[99995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-3xl p-5 flex flex-col gap-4 max-h-[85vh] ${
            isLight ? 'bg-white text-slate-900 shadow-2xl' : 'bg-zinc-900 border border-zinc-800 text-white shadow-2xl'
          }`}>
            <div className="flex justify-between items-center border-b pb-2 border-zinc-150 dark:border-zinc-800">
              <h3 className="text-sm font-black uppercase tracking-tight">Agregar Artículos</h3>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">{selectedAccount.clientName}</span>
            </div>

            {/* Buscador de artículos */}
            <div className="relative">
              <div className="flex items-center relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3" />
                <input
                  type="text"
                  value={addItemSearchQuery}
                  onChange={e => setAddItemSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className={`w-full h-10 pl-9 pr-8 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                  }`}
                />
                {addItemSearchQuery && (
                  <button
                    onClick={() => setAddItemSearchQuery('')}
                    className="absolute right-3 text-zinc-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Resultados de búsqueda */}
              {addItemSearchQuery.trim() && (
                <div className={`absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-lg ${
                  isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}>
                  {filteredCombinedItems.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500 font-bold">Sin resultados</div>
                  ) : (
                    filteredCombinedItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const exists = itemsToAdd.find(it => it.itemId === item.id);
                          if (exists) {
                            setItemsToAdd(prev => prev.map(it => it.itemId === item.id ? { ...it, qty: it.qty + 1 } : it));
                          } else {
                            setItemsToAdd(prev => [...prev, { itemId: item.id, name: item.name, qty: 1, price: item.price }]);
                          }
                          setAddItemSearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 border-b last:border-b-0 text-xs font-bold flex justify-between items-center ${
                          isLight ? 'hover:bg-slate-50 border-slate-100' : 'hover:bg-zinc-900 border-zinc-900'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="truncate">{item.name}</div>
                          <div className="text-[9px] text-zinc-500 font-black">Stock: {item.stock}</div>
                        </div>
                        <span className="shrink-0 text-blue-500 font-mono">{sym}{item.price.toFixed(2)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Lista de artículos en el carrito */}
            <div className="flex-1 overflow-y-auto min-h-[100px] max-h-[35vh] space-y-2 pr-1">
              {itemsToAdd.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-6 text-center text-zinc-400">
                  <ShoppingBag className="w-8 h-8 stroke-1 text-zinc-400" />
                  <span className="text-[10px] font-bold uppercase mt-2">Busca y selecciona artículos arriba</span>
                </div>
              ) : (
                itemsToAdd.map((it, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
                      isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-zinc-950 border-zinc-900'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate leading-snug">{it.name}</div>
                      <div className="text-[10px] text-zinc-505 font-mono mt-0.5">{sym}{it.price.toFixed(2)} x {it.qty} = {sym}{(it.price * it.qty).toFixed(2)}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (it.qty > 1) {
                            setItemsToAdd(prev => prev.map((item, i) => i === idx ? { ...item, qty: item.qty - 1 } : item));
                          } else {
                            setItemsToAdd(prev => prev.filter((_, i) => i !== idx));
                          }
                        }}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold active:scale-90 border-zinc-300 dark:border-zinc-800 hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-black w-4 text-center">{it.qty}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setItemsToAdd(prev => prev.map((item, i) => i === idx ? { ...item, qty: item.qty + 1 } : item));
                        }}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold active:scale-90 border-zinc-300 dark:border-zinc-800 cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItemsToAdd(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold text-red-500 active:scale-90 border-red-500/25 bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total Subtotal */}
            {itemsToAdd.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 shrink-0">
                <span className="text-xs font-black uppercase text-zinc-550">Total Cargo:</span>
                <span className="text-sm font-black font-mono text-blue-500">
                  {sym}{itemsToAdd.reduce((s, i) => s + i.qty * i.price, 0).toFixed(2)}
                </span>
              </div>
            )}

            {/* Botones de confirmar/cancelar */}
            <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setItemsToAdd([]);
                  setAddItemSearchQuery('');
                  setShowAddItemsModal(false);
                }}
                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-650 hover:bg-slate-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={itemsToAdd.length === 0}
                onClick={handleConfirmAgregarItems}
                className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-blue-650 hover:bg-blue-700 text-white cursor-pointer active:scale-95 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Cargo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR NUEVO APARTADO ──────────────────────────────────────── */}
      {showCreateApartadoModal && (
        <div className="fixed inset-0 z-[99995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-3xl p-5 flex flex-col gap-4 max-h-[90vh] ${
            isLight ? 'bg-white text-slate-900 shadow-2xl' : 'bg-zinc-900 border border-zinc-800 text-white shadow-2xl'
          }`}>
            <div className="flex justify-between items-center border-b pb-2 border-zinc-150 dark:border-zinc-800">
              <h3 className="text-sm font-black uppercase tracking-tight">Crear Nuevo Apartado</h3>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Fórmula</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Nombre de cliente */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-450 block">Nombre del Cliente *:</label>
                <input
                  type="text"
                  value={newAptClientName}
                  onChange={e => setNewAptClientName(e.target.value)}
                  placeholder="Nombre completo..."
                  className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                  }`}
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-455 block">Teléfono (Opcional):</label>
                <input
                  type="text"
                  value={newAptClientPhone}
                  onChange={e => setNewAptClientPhone(e.target.value)}
                  placeholder="Ej. 1234567890..."
                  className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                  }`}
                />
              </div>

              {/* Fecha de vencimiento */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-455 block">Fecha Límite / Vencimiento:</label>
                <input
                  type="date"
                  value={newAptDueDate}
                  onChange={e => setNewAptDueDate(e.target.value)}
                  className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                  }`}
                />
              </div>

              {/* Buscador de artículos */}
              <div className="space-y-1.5 relative">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-455 block">Buscar Artículos *:</label>
                <div className="flex items-center relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3" />
                  <input
                    type="text"
                    value={aptItemSearchQuery}
                    onChange={e => setAptItemSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o código..."
                    className={`w-full h-10 pl-9 pr-8 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                    }`}
                  />
                  {aptItemSearchQuery && (
                    <button
                      onClick={() => setAptItemSearchQuery('')}
                      className="absolute right-3 text-zinc-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Resultados de búsqueda */}
                {aptItemSearchQuery.trim() && (
                  <div className={`absolute z-10 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-xl border shadow-lg ${
                    isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
                  }`}>
                    {filteredAptCombinedItems.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-500 font-bold">Sin resultados</div>
                    ) : (
                      filteredAptCombinedItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            const exists = newAptItems.find(it => it.itemId === item.id);
                            if (exists) {
                              setNewAptItems(prev => prev.map(it => it.itemId === item.id ? { ...it, quantity: it.quantity + 1 } : it));
                            } else {
                              setNewAptItems(prev => [...prev, { itemId: item.id, name: item.name, quantity: 1, price: item.price }]);
                            }
                            setAptItemSearchQuery('');
                          }}
                          className={`w-full text-left px-3 py-2 border-b last:border-b-0 text-xs font-bold flex justify-between items-center ${
                            isLight ? 'hover:bg-slate-50 border-slate-100' : 'hover:bg-zinc-900 border-zinc-900'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="truncate">{item.name}</div>
                            <div className="text-[9px] text-zinc-500 font-black">Stock: {item.stock}</div>
                          </div>
                          <span className="shrink-0 text-blue-500 font-mono">{sym}{item.price.toFixed(2)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Lista de artículos del apartado */}
              {newAptItems.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-zinc-405 block">Artículos Seleccionados:</span>
                  {newAptItems.map((it, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
                        isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-zinc-950 border-zinc-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate leading-snug">{it.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{sym}{it.price.toFixed(2)} x {it.quantity} = {sym}{(it.price * it.quantity).toFixed(2)}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (it.quantity > 1) {
                              setNewAptItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity - 1 } : item));
                            } else {
                              setNewAptItems(prev => prev.filter((_, i) => i !== idx));
                            }
                          }}
                          className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold active:scale-90 border-zinc-300 dark:border-zinc-800 hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-black w-4 text-center">{it.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewAptItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item));
                          }}
                          className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold active:scale-90 border-zinc-300 dark:border-zinc-800 cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewAptItems(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold text-red-500 active:scale-90 border-red-500/25 bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Monto inicial */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-450 block">Monto Inicial de Pago / Abono *:</label>
                <input
                  type="number"
                  value={newAptInitialAmount}
                  onChange={e => setNewAptInitialAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                  }`}
                />
              </div>

              {/* Método de pago inicial */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-450 block">Método de Pago:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Efectivo', 'Tarjeta', 'Transferencia'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setNewAptInitialMethod(method as any)}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                        newAptInitialMethod === method
                          ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                          : isLight
                            ? 'bg-slate-100 border-slate-200 text-slate-650 hover:bg-slate-200'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-455 hover:bg-zinc-800'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-455 block">Notas o Comentarios (Opcional):</label>
                <textarea
                  value={newAptNotes}
                  onChange={e => setNewAptNotes(e.target.value)}
                  placeholder="Instrucciones adicionales..."
                  rows={2}
                  className={`w-full p-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-880 text-white'
                  }`}
                />
              </div>
            </div>

            {/* Total Subtotal */}
            {newAptItems.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 shrink-0">
                <span className="text-xs font-black uppercase text-zinc-550">Total Apartado:</span>
                <span className="text-sm font-black font-mono text-purple-600">
                  {sym}{newAptItems.reduce((s, i) => s + i.quantity * i.price, 0).toFixed(2)}
                </span>
              </div>
            )}

            {/* Botones de confirmar/cancelar */}
            <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCreateApartadoModal(false);
                }}
                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-650 hover:bg-slate-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!newAptClientName.trim() || newAptItems.length === 0}
                onClick={handleConfirmCreateApartado}
                className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white cursor-pointer active:scale-95 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Apartado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
