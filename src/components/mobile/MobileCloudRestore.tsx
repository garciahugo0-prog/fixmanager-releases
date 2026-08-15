import React from 'react';

interface MobileCloudRestoreProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  loading: boolean;
  error: string;
  user: any;
  backups: any[];
  fetchingBackups: boolean;
  onLogin: (e: React.FormEvent) => void;
  onBack: () => void;
  onApply: (backupRecord: any) => void;
}

export default function MobileCloudRestore({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  error,
  user,
  backups,
  fetchingBackups,
  onLogin,
  onBack,
  onApply,
}: MobileCloudRestoreProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0f1d] text-white px-6 py-10 overflow-hidden font-sans relative">
      {/* Background Neon Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[300px] h-[300px] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[300px] h-[300px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 mb-8 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all cursor-pointer shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-black tracking-tight text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-300">
            Nube FixManager
          </h2>
          <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
            Sincronización y Respaldos
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto max-w-sm w-full mx-auto flex flex-col justify-center">
        {!user ? (
          /* Login View */
          <div className="w-full animate-fadeIn">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Ingresar a tu cuenta</h3>
              <p className="text-xs text-zinc-400 leading-relaxed px-4">
                Introduce el correo de administrador de tu taller para listar tus copias de seguridad en la nube.
              </p>
            </div>

            <form onSubmit={onLogin} className="flex flex-col gap-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed animate-shake">
                  ⚠️ {error}
                </div>
              )}

              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Correo Electrónico
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="ejemplo@taller.com"
                    className="w-full h-12 pl-4 pr-10 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                  <span className="absolute right-3.5 text-zinc-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Contraseña
                </label>
                <div className="relative flex items-center">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="••••••••"
                    className="w-full h-12 pl-4 pr-10 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                  <span className="absolute right-3.5 text-zinc-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0V10.5m-3.75 3h15a2.25 2.25 0 012.25 2.25v5.25a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V15.75a2.25 2.25 0 012.25-2.25z" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 border border-violet-500/30 text-sm font-bold text-white hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-violet-900/20 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Conectando...</span>
                  </>
                ) : (
                  <span>Iniciar Sesión</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Backups List View */
          <div className="w-full flex-1 flex flex-col justify-start gap-4 py-4 animate-fadeIn">
            <div className="text-center mb-2">
              <p className="text-xs text-zinc-400">Sesión activa como:</p>
              <p className="text-sm font-black text-indigo-400 mt-0.5">{user.email}</p>
            </div>

            <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
              Respaldos disponibles
            </p>

            {fetchingBackups ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                <svg className="animate-spin h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-xs font-medium">Buscando en la nube...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12 px-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-zinc-500">
                <p className="text-sm font-medium">⚠️ No se encontraron respaldos.</p>
                <p className="text-xs mt-1.5">Asegúrate de haber guardado al menos una copia desde tu versión de escritorio.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {backups.map((item, idx) => {
                  const fecha = new Date(item.created_at).toLocaleString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onApply(item)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-violet-500/40 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{fecha}</span>
                          {idx === 0 && (
                            <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-violet-600 text-white font-bold uppercase tracking-wider leading-none">
                              Reciente
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          Dispositivo: <span className="font-semibold text-zinc-300">{item.client_info || 'Desconocido'}</span>
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-violet-600/20 flex items-center justify-center shrink-0 transition-colors">
                        <svg className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Version note footer */}
      <div className="relative z-10 text-center shrink-0 mt-6 text-[10px] text-zinc-600">
        Conexión directa SSL con Supabase
      </div>
    </div>
  );
}
