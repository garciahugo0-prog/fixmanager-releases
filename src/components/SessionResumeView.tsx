/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Play, LogOut, Scissors } from 'lucide-react';
import { WorkshopConfig, AppUser } from '../types';

interface SessionResumeViewProps {
  config: WorkshopConfig;
  onResume: () => void;
  onGoToCorte: () => void;
  onResetSetup?: () => void;
  currentUser?: AppUser | null;
}

export default function SessionResumeView({ config, onResume, onGoToCorte, onResetSetup, currentUser }: SessionResumeViewProps) {
  const isLight = config.themeMode === 'light';
  const isRetro = config.theme === 'retro-window';

  if (isRetro) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f0f2f5]/60 backdrop-blur-2xl select-none">
        <div className="w-full max-w-sm bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#800000] to-[#c04040] px-2 py-1.5 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="text-white font-bold text-xs flex-1">Sesión Activa Detectada</span>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="font-black text-sm text-zinc-900">{config.storeName || 'Taller'}</div>
            </div>

            {/* Info block */}
            <div className="bg-[#fffbe6] border-2 border-t-[#ffd700] border-l-[#ffd700] border-b-[#a08000] border-r-[#a08000] p-3 space-y-1.5 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-base">⚠️</span>
                <span className="font-black text-xs text-zinc-900">Cierre inesperado detectado</span>
              </div>
              <p className="text-[10px] text-zinc-700 leading-relaxed font-sans">
                La sesión anterior fue cerrada sin realizar un corte de caja. Seleccione una opción para continuar:
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={onResume}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#dfdfdf] hover:bg-zinc-300 text-black border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white font-bold text-xs uppercase cursor-pointer transition-all select-none"
              >
                <Play className="w-3.5 h-3.5" />
                Continuar Sesión en Curso
              </button>

              {(!currentUser || currentUser.role === 'admin') && (
                <button
                  type="button"
                  onClick={onGoToCorte}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#000080] hover:bg-[#0000aa] text-white border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a] active:border-t-[#00004a] active:border-l-[#00004a] active:border-b-white active:border-r-white font-bold text-xs uppercase cursor-pointer transition-all select-none"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Realizar Corte de Caja
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center select-none ${
      isLight ? 'bg-white/20 backdrop-blur-2xl' : 'bg-[#0d121f]/60 backdrop-blur-2xl'
    }`}>

      <div className={`relative w-full max-w-xs mx-4 rounded-2xl shadow-2xl border overflow-hidden ${
        isLight
          ? 'bg-white border-zinc-200/80'
          : 'bg-zinc-900/90 border-zinc-800 backdrop-blur-xl'
      }`}>

        {/* Header warning bar */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-4 flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className={`text-sm font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>
              Sesión Activa Detectada
            </div>
            <div className={`text-[10px] font-semibold mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {config.storeName || 'Sistema de Taller'}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Info block */}
          <div className={`rounded-xl border p-3.5 text-xs leading-relaxed ${
            isLight
              ? 'bg-amber-50/60 border-amber-200/80 text-zinc-600'
              : 'bg-amber-950/20 border-amber-800/30 text-zinc-400'
          }`}>
            La aplicación fue cerrada sin realizar un corte de caja. Existe una sesión comercial activa con movimientos pendientes de cierre formal.
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button type="button" onClick={onResume}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border font-black text-xs uppercase transition-all active:scale-95 cursor-pointer ${
                isLight ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              }`}>
              <Play className="w-4 h-4 shrink-0 fill-white" />
              <div className="text-left">
                <div>Continuar sesión en curso</div>
                <div className={`text-[9px] font-bold normal-case mt-0.5 ${isLight ? 'text-emerald-100' : 'text-emerald-200/70'}`}>Retomar donde se quedó</div>
              </div>
            </button>

            {(!currentUser || currentUser.role === 'admin') && (
            <button type="button" onClick={onGoToCorte}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border font-black text-xs uppercase transition-all active:scale-95 cursor-pointer ${
                isLight ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-sm'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
              }`}>
              <Scissors className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div>Realizar corte de caja</div>
                <div className={`text-[9px] font-bold normal-case mt-0.5 ${isLight ? 'text-indigo-100' : 'text-indigo-200/70'}`}>Cerrar la sesión correctamente</div>
              </div>
            </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
