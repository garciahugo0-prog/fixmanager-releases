/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * FixManager — Modal de Configuración Internacional para Usuarios Existentes
 */

import React, { useState } from 'react';
import { Globe, CheckCircle2, Sparkles, Coins, Smartphone } from 'lucide-react';
import { WorkshopConfig } from '../types';
import { COUNTRY_LIST, COMMON_CURRENCIES, getCountryByCode, getCountryByName } from '../utils/countries';

interface Props {
  config: WorkshopConfig;
  onSave: (updates: Partial<WorkshopConfig>) => void;
  onClose: () => void;
  isRetro?: boolean;
  themeMode?: 'light' | 'dark';
}

export default function InternationalUpdateModal({
  config,
  onSave,
  onClose,
  isRetro = false,
  themeMode = 'dark'
}: Props) {
  const isLight = themeMode === 'light';

  // Detect current or default country
  const initialCountry = getCountryByCode(config.phoneCountryCode) || getCountryByName(config.countryName) || getCountryByName(config.addressCountry) || COUNTRY_LIST.find(c => c.code === '+52') || COUNTRY_LIST[0];

  const [selectedCountryName, setSelectedCountryName] = useState(initialCountry.name);
  const [selectedPhoneCode, setSelectedPhoneCode] = useState(config.phoneCountryCode || initialCountry.code);
  const [selectedCurrency, setSelectedCurrency] = useState(config.currencySymbol || initialCountry.currencySymbol);
  const [selectedTaxRate, setSelectedTaxRate] = useState(config.taxRate !== undefined ? config.taxRate : initialCountry.defaultTaxRate);
  const [selectedWhatsappCode, setSelectedWhatsappCode] = useState(config.whatsappDefaultCountryCode || initialCountry.dialCode);

  const currentCountry = COUNTRY_LIST.find(c => c.name === selectedCountryName) || initialCountry;

  const handleCountryChange = (countryName: string) => {
    const found = COUNTRY_LIST.find(c => c.name === countryName);
    if (found) {
      setSelectedCountryName(found.name);
      setSelectedPhoneCode(found.code);
      setSelectedCurrency(found.currencySymbol);
      setSelectedTaxRate(found.defaultTaxRate);
      setSelectedWhatsappCode(found.dialCode);
    }
  };

  const handleConfirm = () => {
    localStorage.setItem('fixmanager_country_configured_v2', 'true');
    onSave({
      phoneCountryCode: selectedPhoneCode,
      countryName: selectedCountryName,
      addressCountry: selectedCountryName,
      currencySymbol: selectedCurrency,
      taxRate: selectedTaxRate,
      whatsappDefaultCountryCode: selectedWhatsappCode
    });
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('fixmanager_country_configured_v2', 'true');
    onClose();
  };

  if (isRetro) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 font-sans select-none animate-in fade-in duration-200">
        <div className="w-full max-w-lg bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-zinc-800 border-r-zinc-800 shadow-2xl overflow-hidden">
          {/* Retro Title Bar */}
          <div className="bg-[#000080] px-3 py-1.5 flex items-center justify-between font-bold select-none text-white">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-300" />
              <span className="text-xs uppercase tracking-wide">Configuración Internacional del Taller</span>
            </div>
            <button
              onClick={handleSkip}
              className="bg-[#c0c0c0] text-black px-2 py-0.5 border border-white hover:bg-zinc-300 text-xs active:border-zinc-700 font-mono font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-4 text-zinc-900">
            <div className="bg-white p-3 border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white flex items-start gap-3">
              <div className="text-2xl">🌍</div>
              <div>
                <h3 className="font-bold text-xs uppercase text-[#000080]">¡Bienvenido a FixManager Internacional!</h3>
                <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
                  Para calibrar automáticamente las divisas, tickets, formato de WhatsApp y prefijos de tu país, confirma la ubicación de tu taller:
                </p>
              </div>
            </div>

            {/* Selectores */}
            <div className="space-y-3 bg-[#dfdfdf] p-3 border border-zinc-400">
              <div>
                <label className="text-[11px] font-bold text-zinc-700 uppercase block mb-1">
                  1. País de tu Taller / Negocio:
                </label>
                <select
                  value={selectedCountryName}
                  onChange={e => handleCountryChange(e.target.value)}
                  className="w-full bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                >
                  {COUNTRY_LIST.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.flag} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 uppercase block mb-1">
                    2. Símbolo de Moneda:
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={e => setSelectedCurrency(e.target.value)}
                    className="w-full bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                  >
                    {COMMON_CURRENCIES.map(curr => (
                      <option key={curr.value} value={curr.value}>
                        {curr.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-700 uppercase block mb-1">
                    3. Clave WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={selectedWhatsappCode}
                    onChange={e => setSelectedWhatsappCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white px-2 py-1 text-xs font-bold outline-none"
                    placeholder="54"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs font-bold cursor-pointer hover:bg-zinc-300 active:border-zinc-700"
              >
                Omitir
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-1.5 bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-900 border-r-zinc-900 text-xs font-bold cursor-pointer hover:bg-[#0000a0] active:border-zinc-900 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Guardar y Aplicar al Sistema
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modern / Fluent Style Modal
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in zoom-in-95 duration-200">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
        isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-[#0f121d] border-zinc-800/90 text-white'
      }`}>
        {/* Header decoration */}
        <div className="relative px-6 pt-6 pb-4 text-center border-b border-zinc-200/50 dark:border-zinc-800/50">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-500/30 shadow-inner">
            <span className="text-3xl filter drop-shadow">{currentCountry.flag || '🌍'}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black tracking-widest uppercase mb-1">
            <Sparkles className="w-3 h-3" />
            Nueva Actualización
          </div>
          <h2 className="text-lg font-black tracking-tight">
            Configuración de País y Moneda
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
            FixManager ahora cuenta con soporte global. Selecciona tu país para ajustar automáticamente divisas, tickets y WhatsApp.
          </p>
        </div>

        {/* Body inputs */}
        <div className="p-6 space-y-4">
          {/* Country selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              País de tu Negocio / Taller
            </label>
            <div className="relative">
              <select
                value={selectedCountryName}
                onChange={e => handleCountryChange(e.target.value)}
                className={`w-full text-sm font-semibold rounded-xl px-3.5 py-2.5 outline-none border transition-all cursor-pointer appearance-none ${
                  isLight
                    ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-indigo-500 focus:bg-white'
                    : 'bg-zinc-900/90 border-zinc-700 text-white focus:border-indigo-500 focus:bg-zinc-900'
                }`}
              >
                {COUNTRY_LIST.map(c => (
                  <option key={c.name} value={c.name} className="py-1">
                    {c.flag} {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                ▼
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Currency symbol */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                Moneda
              </label>
              <select
                value={selectedCurrency}
                onChange={e => setSelectedCurrency(e.target.value)}
                className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-indigo-500'
                    : 'bg-zinc-900/90 border-zinc-700 text-white focus:border-indigo-500'
                }`}
              >
                {COMMON_CURRENCIES.map(curr => (
                  <option key={curr.value} value={curr.value}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>

            {/* WhatsApp country prefix */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                Prefijo WhatsApp
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono font-bold text-zinc-400 px-2.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
                  +
                </span>
                <input
                  type="text"
                  value={selectedWhatsappCode}
                  onChange={e => setSelectedWhatsappCode(e.target.value.replace(/\D/g, ''))}
                  className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2 outline-none border transition-all ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-indigo-500'
                      : 'bg-zinc-900/90 border-zinc-700 text-white focus:border-indigo-500'
                  }`}
                  placeholder="54"
                />
              </div>
            </div>
          </div>

          {/* Quick summary pill */}
          <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
            isLight ? 'bg-indigo-50/70 border-indigo-100 text-indigo-900' : 'bg-indigo-950/30 border-indigo-900/50 text-indigo-300'
          }`}>
            <span className="font-medium">Formato de WhatsApp:</span>
            <span className="font-mono font-bold">
              {currentCountry.iso === 'AR' ? '54 9 (Área) XXXXXXXX' : `+${selectedWhatsappCode} (Número)`}
            </span>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirm}
              className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white shadow-lg shadow-indigo-500/25 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Guardar y Configurar Taller
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Mantener configuración actual (Omitir)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
