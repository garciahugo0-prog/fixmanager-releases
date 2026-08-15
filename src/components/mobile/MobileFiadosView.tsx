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
  Package
} from 'lucide-react';
import { 
  CreditAccount, 
  CreditSaleEntry, 
  CreditPayment, 
  WorkshopConfig, 
  AppUser, 
  ApartadoEntry, 
  ApartadoPayment 
} from '../../types';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

interface MobileFiadosViewProps {
  accounts: CreditAccount[];
  apartados: ApartadoEntry[];
  config: WorkshopConfig;
  currentUser: AppUser | null;
  isLight: boolean;
  onClose: () => void;
  onAddEntry: (accountId: string, entry: CreditSaleEntry) => void;
  onAddPayment: (accountId: string, payment: CreditPayment) => void;
  onDeleteAccount: (accountId: string) => void;
  onCreateApartado: (a: ApartadoEntry) => void;
  onAddApartadoPayment: (apartadoId: string, payment: ApartadoPayment) => void;
  onUpdateApartadoStatus: (apartadoId: string, status: ApartadoEntry['status']) => void;
}

export default function MobileFiadosView({
  accounts = [],
  apartados = [],
  config,
  currentUser,
  isLight,
  onClose,
  onAddEntry,
  onAddPayment,
  onDeleteAccount,
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

  const [showAddApartadoAbonoModal, setShowAddApartadoAbonoModal] = useState(false);
  const [aptAbonoAmount, setAptAbonoAmount] = useState('');
  const [aptAbonoMethod, setAptAbonoMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [aptAbonoNotes, setAptAbonoNotes] = useState('');

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

  // Manejar abonos en cuenta de fiado
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
      note: abonoNotes.trim() || undefined
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
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-650/20 scale-100'
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
        <div className={`fixed inset-0 z-[99992] flex flex-col ${
          isLight ? 'bg-slate-50' : 'bg-zinc-950'
        }`}>
          {/* Header */}
          <div 
            style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
            className={`px-5 pb-3 border-b shrink-0 flex items-center justify-between ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0c1224] border-zinc-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700' 
                    : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wide leading-none">{selectedAccount.clientName}</h2>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-1 block">
                  {selectedAccount.clientPhone ? formatPhoneNumber(selectedAccount.clientPhone) : 'Sin teléfono'}
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
          <div className={`p-5 border-b shrink-0 grid grid-cols-3 gap-2.5 text-center ${
            isLight ? 'bg-white border-slate-100' : 'bg-[#0a0f1d] border-zinc-900'
          }`}>
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-red-500 block">Total Cargos</span>
              <span className="text-xs font-black font-mono mt-1 block text-red-500">{sym}{getDebtTotal(selectedAccount).toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 block">Total Abonos</span>
              <span className="text-xs font-black font-mono mt-1 block text-emerald-500">{sym}{getPaidTotal(selectedAccount).toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-amber-500 block">Saldo Restante</span>
              <span className="text-xs font-black font-mono mt-1 block text-amber-500">{sym}{getBalance(selectedAccount).toFixed(2)}</span>
            </div>
          </div>

          {/* Historial de transacciones */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Historial de Transacciones</h4>

            {/* Listar transacciones */}
            {(() => {
              const allTx = [
                ...selectedAccount.entries.map(e => ({ ...e, txType: 'cargo' })),
                ...selectedAccount.payments.map(p => ({ ...p, txType: 'abono' }))
              ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              if (allTx.length === 0) {
                return (
                  <div className="text-center py-6 text-xs text-zinc-500 font-bold">
                    No hay transacciones registradas en esta cuenta.
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  {allTx.map((tx, idx) => {
                    const isCargo = tx.txType === 'cargo';
                    return (
                      <div
                        key={tx.id || idx}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                          isCargo
                            ? 'border-red-500/15 bg-red-500/5'
                            : 'border-emerald-500/15 bg-emerald-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {isCargo ? '🔺' : '🟢'}
                          </span>
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="text-xs font-black uppercase tracking-tight block break-all whitespace-normal">
                              {isCargo ? (tx as any).description || 'CARGO DE VENTA' : 'ABONO REGISTRADO'}
                            </span>
                            <span className="text-[8px] font-black text-zinc-500 mt-0.5 block">
                              {new Date(tx.date).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {!(isCargo) && (tx as any).note ? ` • ${(tx as any).note}` : ''}
                            </span>
                          </div>
                        </div>

                        <span className={`text-xs font-black font-mono ${
                          isCargo ? 'text-red-500' : 'text-emerald-500'
                        }`}>
                          {isCargo ? '+' : '-'}{sym}{(isCargo ? (tx as any).subtotal : (tx as any).amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Botones de acción inferiores */}
          <div className={`p-5 border-t shrink-0 flex gap-2.5 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0c1224] border-zinc-900'
          }`}>
            <button
              type="button"
              onClick={() => setShowAddCargoModal(true)}
              className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Nuevo Cargo
            </button>
            <button
              type="button"
              disabled={getBalance(selectedAccount) === 0}
              onClick={() => setShowAddAbonoModal(true)}
              className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Registrar Abono
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL DETALLE DE APARTADO ───────────────────────────────────────── */}
      {selectedApartado && (
        <div className={`fixed inset-0 z-[99992] flex flex-col ${
          isLight ? 'bg-slate-50' : 'bg-zinc-950'
        }`}>
          {/* Header */}
          <div 
            style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
            className={`px-5 pb-3 border-b shrink-0 flex items-center justify-between ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0c1224] border-zinc-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedApartado(null)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700' 
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
          <div className={`p-5 border-b shrink-0 grid grid-cols-3 gap-2.5 text-center ${
            isLight ? 'bg-white border-slate-100' : 'bg-[#0a0f1d] border-zinc-900'
          }`}>
            <div className={`p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-150' : 'bg-zinc-900/50 border-zinc-850'}`}>
              <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block">Total Apartado</span>
              <span className="text-xs font-black font-mono mt-1 block">{sym}{selectedApartado.totalValue.toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 block">Abonado</span>
              <span className="text-xs font-black font-mono mt-1 block text-emerald-500">{sym}{getAptPaid(selectedApartado).toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
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
            <div className={`p-5 border-t shrink-0 flex gap-2.5 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0c1224] border-zinc-900'
            }`}>
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
                className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-purple-650 hover:bg-purple-700 text-white cursor-pointer active:scale-95 transition-all text-center"
              >
                Abonar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
