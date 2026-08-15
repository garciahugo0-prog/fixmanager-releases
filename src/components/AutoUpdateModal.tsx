import React, { useState, useEffect } from 'react';
import { Sparkles, Download, CheckCircle, RefreshCw, X, AlertCircle } from 'lucide-react';

interface AutoUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  force?: boolean;
}

export const AutoUpdateModal: React.FC<AutoUpdateModalProps> = ({ isOpen, onClose, currentVersion, force }) => {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleCheckUpdate();
    }
  }, [isOpen]);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onUpdateProgress) {
      api.onUpdateProgress((data: { percent: number }) => {
        if (data && typeof data.percent === 'number') {
          setProgress(data.percent);
        }
      });
    }
  }, []);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setErrorMsg('');
    try {
      const api = (window as any).electronAPI;
      if (!api?.checkAppUpdate) {
        setChecking(false);
        return;
      }
      const res = await api.checkAppUpdate();
      setChecking(false);

      if (res && (res.hasUpdate || force)) {
        setUpdateInfo(res);
        handleStartDownload(res.downloadUrl);
      } else {
        setUpdateInfo(res || { hasUpdate: false });
      }
    } catch (err: any) {
      setChecking(false);
      setErrorMsg(err.message || 'Error al conectar con GitHub Releases');
    }
  };

  const handleStartDownload = async (customUrl?: string) => {
    const targetUrl = customUrl || updateInfo?.downloadUrl;
    if (!targetUrl) return;
    setDownloading(true);
    setProgress(0);
    setErrorMsg('');

    try {
      const api = (window as any).electronAPI;
      if (api?.downloadAndInstallUpdate) {
        const res = await api.downloadAndInstallUpdate(targetUrl);
        if (res && res.success) {
          setSuccess(true);
          return;
        }
      }
      // Respaldo si no hay handler IPC o si falla
      if (api?.openExternal) {
        api.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank');
      }
      setSuccess(true);
    } catch (err: any) {
      console.warn('[AutoUpdateModal Fallback] Abriendo descarga en navegador:', err);
      const api = (window as any).electronAPI;
      if (api?.openExternal) {
        api.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank');
      }
      setSuccess(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[12000] p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              Auto-Actualización en Caliente
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                GitHub Releases
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Versión actual instalada: v{currentVersion}</p>
          </div>
        </div>

        {checking && (
          <div className="py-8 text-center text-zinc-400 text-xs font-mono flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
            <span>Consultando GitHub Releases...</span>
          </div>
        )}

        {!checking && errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!checking && !updateInfo?.hasUpdate && !downloading && !success && (
          <div className="py-6 text-center text-zinc-300 text-xs space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-bold">¡Tienes la versión más reciente instalada!</p>
            <p className="text-[11px] text-zinc-500 font-mono">FixManager v{currentVersion} está al día.</p>
          </div>
        )}

        {!checking && updateInfo?.hasUpdate && !downloading && !success && (
          <div className="space-y-3 bg-zinc-900 border border-zinc-700 p-4 rounded-xl text-xs text-white">
            <div className="flex items-center justify-between font-mono">
              <span className="text-zinc-300 font-bold">Nueva versión disponible:</span>
              <span className="text-emerald-400 font-black text-sm">v{updateInfo.latestVersion}</span>
            </div>
            <div className="border-t border-zinc-800 pt-2 space-y-1.5">
              <div className="font-black text-white text-[11px] uppercase tracking-wider">Notas de la versión:</div>
              <div className="text-zinc-100 text-xs font-sans max-h-28 overflow-y-auto whitespace-pre-line bg-black/80 p-3 rounded-lg border border-zinc-700 leading-relaxed shadow-inner">
                {updateInfo.releaseNotes}
              </div>
            </div>
          </div>
        )}

        {downloading && (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
              <span>Descargando de GitHub Releases...</span>
              <span className="font-bold text-amber-400">{progress}%</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden border border-zinc-800">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-zinc-500 text-center font-mono">
              La instalación silenciosa iniciará al completar el 100%. La app se reiniciará automáticamente.
            </p>
          </div>
        )}

        {success && (
          <div className="py-6 text-center text-emerald-400 text-xs space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto animate-bounce" />
            <p className="font-bold">¡Descarga e instalación silenciosa iniciada!</p>
            <p className="text-[11px] text-zinc-400 font-mono">Reiniciando FixManager en unos segundos...</p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3 mt-2">
          {!downloading && !success && (
            <div className="flex justify-between w-full">
              <div>
                {!checking && !updateInfo?.hasUpdate && updateInfo?.downloadUrl && (
                  <button
                    onClick={() => handleStartDownload(updateInfo.downloadUrl)}
                    className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 hover:text-amber-300 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Forzar Reinstalación de Prueba
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {!checking && updateInfo?.hasUpdate && !downloading && !success && (
            <button
              onClick={handleStartDownload}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Actualizar en Caliente Ahora</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
