import React, { useState } from 'react';
import { Mail, Lock, Wrench, FileDown, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

interface MobileWelcomeChoiceProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  loading: boolean;
  error: string;
  onLogin: (e: React.FormEvent) => void;
  onSetup: () => void;
  onRestoreLocal: () => void;
}

export default function MobileWelcomeChoice({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  error,
  onLogin,
  onSetup,
  onRestoreLocal,
}: MobileWelcomeChoiceProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="welcome-choice-root flex flex-col justify-between h-screen w-full bg-[#0a0f1d] text-white px-6 py-10 overflow-hidden font-sans relative">
      <style>{`
        /* --- MODO OSCURO (POR DEFECTO) --- */
        .welcome-choice-root {
          background-color: #0a0f1d !important;
          color: #ffffff !important;
        }

        .welcome-choice-root h1 {
          background-clip: text !important;
          -webkit-background-clip: text !important;
          color: transparent !important;
          background-image: linear-gradient(to right, #ffffff, #e4e4e7, #a1a1aa) !important;
        }

        .welcome-choice-root .text-white,
        .welcome-choice-root h3.text-white,
        .welcome-choice-root h3.text-zinc-100 {
          color: #ffffff !important;
        }

        .welcome-choice-root .text-zinc-400,
        .welcome-choice-root p.text-zinc-400 {
          color: #a1a1aa !important;
        }

        .welcome-choice-root .text-zinc-500,
        .welcome-choice-root button.text-zinc-500 {
          color: #71717a !important;
        }

        .welcome-choice-root .text-zinc-600,
        .welcome-choice-root p.text-zinc-600 {
          color: #52525b !important;
        }

        .welcome-choice-root .bg-zinc-900\\/60 {
          background-color: rgba(24, 24, 27, 0.6) !important;
        }

        .welcome-choice-root .border-zinc-800 {
          border-color: #27272a !important;
        }

        /* --- MODO CLARO (THEME MODERN LIGHT) --- */
        .theme-modern.mode-light .welcome-choice-root {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }

        .theme-modern.mode-light .welcome-choice-root h1 {
          background-image: linear-gradient(to right, #1e293b, #334155, #64748b) !important;
        }

        .theme-modern.mode-light .welcome-choice-root .text-white,
        .theme-modern.mode-light .welcome-choice-root h3.text-white,
        .theme-modern.mode-light .welcome-choice-root h3.text-zinc-100 {
          color: #0f172a !important;
        }

        .theme-modern.mode-light .welcome-choice-root p.text-zinc-400,
        .theme-modern.mode-light .welcome-choice-root .text-zinc-400 {
          color: #475569 !important;
        }

        .theme-modern.mode-light .welcome-choice-root .text-zinc-500,
        .theme-modern.mode-light .welcome-choice-root button.text-zinc-500 {
          color: #64748b !important;
        }

        .theme-modern.mode-light .welcome-choice-root .text-zinc-600,
        .theme-modern.mode-light .welcome-choice-root p.text-zinc-600 {
          color: #94a3b8 !important;
        }

        .theme-modern.mode-light .welcome-choice-root .bg-zinc-900\\/60 {
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
        }

        .theme-modern.mode-light .welcome-choice-root .bg-zinc-900\\/60 h3 {
          color: #0f172a !important;
        }

        .theme-modern.mode-light .welcome-choice-root .bg-zinc-900\\/60 p {
          color: #475569 !important;
        }

        /* Botón de gradiente principal (Iniciar Sesión) */
        .theme-modern.mode-light .welcome-choice-root .bg-gradient-to-r {
          background-image: linear-gradient(to right, #4f46e5, #6366f1) !important;
          box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2) !important;
        }
        .theme-modern.mode-light .welcome-choice-root .bg-gradient-to-r span {
          color: #ffffff !important;
        }

        .theme-modern.mode-light .welcome-choice-root .bg-violet-600\\/20,
        .theme-modern.mode-light .welcome-choice-root .bg-blue-600\\/15 {
          opacity: 0.2 !important;
        }
      `}</style>

      {/* Background Neon Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-violet-600/20 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] left-[-15%] w-[250px] h-[250px] bg-blue-600/15 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* Header / Brand Logo */}
      <div className="relative z-10 flex flex-col items-center text-center mt-4 shrink-0">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-3 border border-violet-400/20 animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.653-4.655m5.37-2.806a3.998 3.998 0 00-.553-4.853 4 4 0 00-5.657 0" />
          </svg>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
          FixManager
        </h1>
        <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1 uppercase">
          Taller de Reparación Inteligente
        </p>
      </div>

      {/* Main Auth Portal Interface */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-sm w-full mx-auto my-auto py-4">
        
        {/* Tab Selector Buttons */}
        <div className="flex bg-zinc-950/40 border border-zinc-800 rounded-xl p-1 mb-6 shrink-0 theme-light-tab-bar">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-violet-600/90 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-violet-600/90 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Nuevo Taller
          </button>
        </div>

        {/* Tab 1: Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={onLogin} className="flex flex-col gap-4 animate-fadeIn">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            {/* Email Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Correo del Administrador
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="ejemplo@taller.com"
                  className="w-full h-12 pl-4 pr-10 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-all theme-light-input"
                />
                <span className="absolute right-3.5 text-zinc-500">
                  <Mail className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Contraseña de Licencia
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full h-12 pl-4 pr-12 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-all theme-light-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-zinc-500 hover:text-white p-1 rounded cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 border border-violet-500/30 text-sm font-bold text-white hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-violet-900/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                  <span>Iniciando Sesión...</span>
                </>
              ) : (
                <span>Ingresar</span>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: New Workshop Sign Up trigger */}
        {activeTab === 'signup' && (
          <div className="flex flex-col gap-4 text-center animate-fadeIn">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Comenzar un taller de cero</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Si no tienes una cuenta de FixManager o quieres configurar un taller nuevo localmente, inicia nuestro asistente de configuración móvil.
              </p>
            </div>

            <button
              type="button"
              onClick={onSetup}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 border border-violet-500/30 text-sm font-bold text-white hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-violet-900/20 cursor-pointer"
            >
              <span>Crear Nuevo Taller</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* Footer Secondary Actions */}
      <div className="relative z-10 flex flex-col items-center mt-4 shrink-0">
        <button
          type="button"
          onClick={onRestoreLocal}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-violet-400 active:scale-95 transition-all py-2 cursor-pointer uppercase tracking-wider"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Importar Respaldo Local (.json)</span>
        </button>
        <p className="text-[9px] text-zinc-600 mt-2">
          FixManager v1.15.10 • Experimento Móvil
        </p>
      </div>
    </div>
  );
}
