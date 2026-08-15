/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ClipboardList, Search, MessageSquareCode, Printer, CheckCircle, Flame, Eye, EyeOff, Edit3, X, Landmark, Check, Coins, Receipt, CreditCard, AlertTriangle, Clock, RefreshCw, Trash2, Plus, Calendar, User, Phone, Shield, ChevronRight, ChevronLeft, ArrowLeft, Wrench, Camera, Video, Smartphone, Image, FileText, Folder, Ban, PiggyBank } from 'lucide-react';
import { RepairOrder, ActiveTab, WorkshopConfig, AppUser, Expense, InventoryItem, RefaccionItem, DonorDevice, DonorPart, OrderEvidence } from '../types';
import { DEFAULT_OFFLINE_MODELS } from '../data';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { buildTicketHtml, buildServiceLabelHtml, buildWarrantyLabelHtml, buildConsolidatedTicketHtml, buildEntryTicketHtml, buildTicketHeaderHtml, CODE128_RESPONSIVE, getBarcodeScript, formatCustomerPhoneWithCountryCode } from '../utils/ticketBuilder';
import { sendWhatsappNotification, buildWhatsappOrderStatusMessage, showUiToast, formatPhoneForWhatsapp, openWhatsappChat } from '../utils/whatsapp';
import { handleCaretPreservingChange } from '../utils/domHelpers';
import { generateNextOrderId } from '../utils/folioUtils';
import { PosItemThumbnail } from './pos/PosItemThumbnail';
import QRCode from 'qrcode';
import { uploadEvidenceToSupabase } from '../utils/evidenceUpload';

const ACCESSORY_OPTIONS = [
  'CHIP / SIM',
  'MEMORIA SD',
  'FUNDA / PROTECTOR',
  'CARGADOR',
  'BANDEJA SIM',
  'LÁPIZ / STYLUS',
  'CABLE USB',
  'CAJA',
  'AUDÍFONOS'
];

const EvidenceMiniature: React.FC<{ ev: OrderEvidence }> = ({ ev }) => {
  const rawPath = ev.path || (ev as any).url || (ev as any).base64 || '';
  if (!rawPath) return null;
  const src = (rawPath.startsWith('data:') || rawPath.startsWith('http')) 
    ? rawPath 
    : `fm-media://${rawPath.replace(/\\/g, '/')}`;
  return (
    <img
      src={src}
      alt={ev.name}
      className="w-full h-full object-contain"
      style={{ display: 'block' }}
    />
  );
};

const VideoPlayer: React.FC<{ ev: OrderEvidence }> = ({ ev }) => {
  const rawPath = ev.path || (ev as any).url || (ev as any).base64 || '';
  if (!rawPath) return null;
  const src = (rawPath.startsWith('data:') || rawPath.startsWith('http'))
    ? rawPath
    : `fm-media://${rawPath.replace(/\\/g, '/')}`;
  return (
    <video
      src={src}
      controls
      className="w-full h-full object-contain bg-black"
    />
  );
};

const generateEvidenceReportHtml = async (order: RepairOrder, config: WorkshopConfig) => {
  const sym = config.currencySymbol || '$';
  const api = (window as any).electronAPI;
  const cleanFaultText = (s: string) => s ? s.replace(/\[(?:ACCESO|NO\.\s*MODELO)[^\]]*\]\s*/gi, '').trim() : '';
  
  const imgElements: string[] = [];
  const videoElements: any[] = [];
  if (order.evidence && order.evidence.length > 0) {
    for (const ev of order.evidence) {
      if (ev.type === 'image') {
        let base64 = '';
        if (api?.readFileBase64) {
          base64 = await api.readFileBase64(ev.path) || '';
        }
        if (base64) {
          imgElements.push(`
            <div class="gallery-item">
              <img src="${base64}" />
              <div class="gallery-caption">
                <strong>📸 ${ev.name}</strong><br/>
                <span>${ev.timestamp}</span>
              </div>
            </div>
          `);
        }
      } else if (ev.type === 'video') {
        videoElements.push(ev);
      }
    }
  }

  const logoHtml = config.mediaCartaLogoUrl 
    ? `<img src="${await api?.readFileBase64(config.mediaCartaLogoUrl) || ''}" style="max-height:50px; object-fit:contain;" />`
    : `<h2 style="margin:0; color:#3b82f6;">${config.storeName || 'Fixmanager'}</h2>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Evidencia de Recepción - ${order.id}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 20px;
      color: #1f2937;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    .info-table td {
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
    }
    .info-table td.label {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8.5px;
      letter-spacing: 0.5px;
      background: #f9fafb;
      color: #4b5563;
      width: 15%;
    }
    .gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 10px;
    }
    .gallery-item {
      width: calc(33.333% - 8px);
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 6px;
      background: #f9fafb;
      box-sizing: border-box;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .gallery-item img {
      max-width: 100%;
      height: 140px;
      object-fit: contain;
      border-radius: 6px;
      display: block;
    }
    .gallery-caption {
      margin-top: 6px;
      font-size: 7.5px;
      color: #4b5563;
      text-align: center;
      line-height: 1.3;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width:50%; vertical-align:middle;">
        ${logoHtml}
      </td>
      <td style="width:50%; text-align:right; vertical-align:middle;">
        <h1 style="margin:0; font-size:18px; text-transform:uppercase; color:#1e3a8a; letter-spacing:0.5px;">Evidencia de Recepción</h1>
        <p style="margin:4px 0 0 0; font-size:11px; font-weight:bold; color:#4b5563;">Folio de Orden: ${order.id}</p>
      </td>
    </tr>
  </table>

  <table class="info-table">
    <tr>
      <td class="label">Cliente</td>
      <td style="width:35%;">${order.customerName}</td>
      <td class="label">Equipo</td>
      <td style="width:35%;">${order.deviceBrand} ${order.deviceModel} ${order.deviceModelNumber ? `(${order.deviceModelNumber})` : ''}</td>
    </tr>
    <tr>
      <td class="label">Técnico</td>
      <td>${order.assignedTechnician || 'Sin asignar'}</td>
      <td class="label">Fecha Recepción</td>
      <td>${new Date(order.createdAt).toLocaleString('es-MX')}</td>
    </tr>
    <tr>
      <td class="label">Falla Reportada</td>
      <td colspan="3">${cleanFaultText(order.faultDescription)}</td>
    </tr>
  </table>

  <div style="font-size:11px; font-weight:bold; margin-bottom:10px; text-transform:uppercase; border-bottom:1px solid #e5e7eb; padding-bottom:4px; color:#1e3a8a;">
    Archivos de Evidencia (${imgElements.length} fotos)
  </div>

  <div class="gallery" style="margin-bottom:20px;">
    ${imgElements.join('')}
  </div>

  ${videoElements.length > 0 ? `
  <div style="font-size:11px; font-weight:bold; margin-top:25px; margin-bottom:10px; text-transform:uppercase; border-bottom:1px solid #e5e7eb; padding-bottom:4px; color:#1e3a8a; break-inside: avoid;">
    Videos de Evidencia Registrados (${videoElements.length} videos)
  </div>
  <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:20px; break-inside: avoid;">
    <thead>
      <tr style="background:#f3f4f6; text-align:left;">
        <th style="padding:6px 10px; border:1px solid #e5e7eb; font-weight:bold; width: 60%;">Nombre del Archivo</th>
        <th style="padding:6px 10px; border:1px solid #e5e7eb; font-weight:bold; width: 40%;">Fecha de Grabación</th>
      </tr>
    </thead>
    <tbody>
      ${videoElements.map(v => `
        <tr>
          <td style="padding:6px 10px; border:1px solid #e5e7eb; color:#374151;">🎥 ${v.name}</td>
          <td style="padding:6px 10px; border:1px solid #e5e7eb; color:#374151;">${v.timestamp}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div style="margin-top:40px; font-size:8.5px; color:#9ca3af; text-align:center; border-top:1px solid #f3f4f6; padding-top:10px;">
    Documento oficial de soporte técnico generado en Fixmanager. Copia física de resguardo local.
  </div>
</body>
</html>
  `;
};

interface EvidenceModalProps {
  order: RepairOrder;
  config: WorkshopConfig;
  onClose: () => void;
  onUpdateOrder: (order: RepairOrder) => void;
}

const EvidenceModal: React.FC<EvidenceModalProps> = ({ order, config, onClose, onUpdateOrder }) => {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';
  const labelCls = `text-[9px] font-black uppercase tracking-widest mb-1.5 block ${
    isRetro ? 'text-zinc-500 font-mono' : isLight ? 'text-zinc-450' : 'text-zinc-500'
  }`;
  const evidenceList = order.evidence || [];

  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'gallery' | 'upload' | 'camera' | 'mobile'>('gallery');
  const [localIp, setLocalIp] = useState<string>('');
  const [localPort, setLocalPort] = useState<number>(3011);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Webcam functions
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }, 
        audio: false 
      });
      setCamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      // Intentar fallback si falla 1080p
      try {
        const streamFallback = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        setCamStream(streamFallback);
        if (videoRef.current) {
          videoRef.current.srcObject = streamFallback;
        }
      } catch (err2) {
        console.warn('No webcam access:', err2);
      }
    }
  };

  const stopWebcam = () => {
    if (camStream) {
      camStream.getTracks().forEach(t => t.stop());
      setCamStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg', 0.95);
      saveEvidence(dataUri, 'camara_evidencia.jpg');
    }
  };

  const startRecording = () => {
    if (!camStream) return;
    recordedChunks.current = [];
    const options = { 
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000 
    };
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(camStream, options);
    } catch (e) {
      try {
        recorder = new MediaRecorder(camStream, { videoBitsPerSecond: 2500000 });
      } catch (err) {
        recorder = new MediaRecorder(camStream);
      }
    }
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.current.push(e.data);
      }
    };
    recorder.onstop = async () => {
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        saveEvidence(base64data, 'video_evidencia.webm');
      };
      reader.readAsDataURL(blob);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        saveEvidence(base64Data, file.name);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteEvidence = async (evId: string, filePath: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta evidencia permanentemente?')) return;
    const api = (window as any).electronAPI;
    if (api?.deleteEvidenceMedia) {
      const res = await api.deleteEvidenceMedia(filePath);
      if (res.success) {
        const currentEv = order.evidence || [];
        const updatedOrder = {
          ...order,
          evidence: currentEv.filter(x => x.id !== evId)
        };
        onUpdateOrder(updatedOrder);
        if (typeof showUiToast === 'function') {
          showUiToast('🗑️ Evidencia eliminada físicamente', 'success');
        }
      } else {
        alert('Error al eliminar evidencia: ' + (res.error || 'Desconocido'));
      }
    }
  };

  const saveEvidence = async (base64Data: string, originalName: string) => {
    const api = (window as any).electronAPI;
    if (api?.saveEvidenceMedia) {
      // Intentar subir a Supabase Storage primero
      let cloudUrl: string | null = null;
      try {
        cloudUrl = await uploadEvidenceToSupabase(order.id, originalName, base64Data);
      } catch (err) {
        console.error('[EvidenceUpload] Falló la subida de evidencia a Supabase Storage:', err);
      }

      const res = await api.saveEvidenceMedia(order.id, originalName, base64Data);
      if (res.success && res.fileMeta) {
        const currentEv = order.evidence || [];
        
        // Reemplazar la ruta local con la URL pública si la subida fue exitosa
        const finalMeta = {
          ...res.fileMeta,
          path: cloudUrl || res.fileMeta.path
        };

        const updatedOrder = {
          ...order,
          evidence: [...currentEv, finalMeta]
        };
        onUpdateOrder(updatedOrder);
        if (typeof showUiToast === 'function') {
          showUiToast(
            cloudUrl ? '✅ Evidencia guardada en la nube' : '✅ Evidencia guardada localmente (modo offline)', 
            'success'
          );
        }
      } else {
        alert('Error al guardar evidencia: ' + (res.error || 'Desconocido'));
      }
    }
  };

  const handleTabChange = (tab: 'gallery' | 'upload' | 'camera' | 'mobile') => {
    setActiveEvidenceTab(tab);
    if (tab === 'camera') {
      startWebcam();
    } else {
      stopWebcam();
    }
  };

  const handleClose = () => {
    stopWebcam();
    onClose();
  };

  const handlePrintEvidenceReport = async (saveAsPdf: boolean) => {
    setIsGeneratingPdf(true);
    try {
      const htmlReport = await generateEvidenceReportHtml(order, config);
      const api = (window as any).electronAPI;
      if (saveAsPdf && api?.printToPdf) {
        await api.printToPdf({
          html: htmlReport,
          filename: `evidencia_${order.id}.pdf`
        });
        if (typeof showUiToast === 'function') {
          showUiToast('✅ PDF de evidencias generado correctamente', 'success');
        }
      } else if (api?.silentPrintHtml) {
        await api.silentPrintHtml({
          html: htmlReport,
          deviceName: config.reportPrinterName || ''
        });
        if (typeof showUiToast === 'function') {
          showUiToast('🖨️ Reporte enviado a la impresora', 'success');
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Error al generar el reporte: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // QR Code generation on modal load
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.startLocalServer) {
      api.startLocalServer().then((res: any) => {
        if (res.success) {
          setLocalIp(res.ip);
          setLocalPort(res.port);
          const link = `http://${res.ip}:${res.port}/evidence?orderId=${order.id}`;
          QRCode.toDataURL(link, { width: 180, margin: 1 }).then(url => {
            setQrCodeUrl(url);
          }).catch(err => {
            console.error('Error generating QR code:', err);
          });
        }
      });
    }
    return () => {
      // Clean up webcam tracks on unmount
      if (camStream) {
        camStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [order.id, camStream]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in font-sans">
      <div className={`w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border flex flex-col max-h-[85vh] ${
        isRetro ? 'bg-[#dfdfdf] border-zinc-500 rounded-none' 
        : isLight ? 'bg-white border-zinc-200 text-slate-800' 
        : 'bg-[#181d28] border-slate-800 text-white'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${
          isRetro ? 'bg-[#000080] text-white border-b-2' 
          : isLight ? 'bg-slate-50 border-slate-200' 
          : 'bg-slate-900/50 border-slate-800'
        }`}>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-sky-500">
              <Camera className="w-5 h-5" /> Evidencias Multimedia — Orden {order.id}
            </h3>
            <div 
              className="text-[10px] mt-0.5" 
              style={{ color: isRetro ? '#ffffff' : isLight ? '#475569' : '#94a3b8' }}
            >
              Cliente: <span className="font-extrabold">{order.customerName}</span> | Equipo: <span className="font-extrabold">{order.deviceBrand} {order.deviceModel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={`text-sm font-bold p-1 rounded hover:bg-slate-800/20 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className={`px-6 py-2 border-b flex gap-2 shrink-0 ${
          isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-900/20 border-slate-800'
        }`}>
          {[
            { id: 'gallery' as const, label: '📂 Galería', active: activeEvidenceTab === 'gallery' },
            { id: 'camera' as const, label: '📷 Cámara PC', active: activeEvidenceTab === 'camera' },
            { id: 'upload' as const, label: '📤 Cargar archivos', active: activeEvidenceTab === 'upload' },
            { id: 'mobile' as const, label: '📱 Enlace Celular (QR)', active: activeEvidenceTab === 'mobile' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                t.active 
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' 
                  : isLight ? 'bg-slate-10 border border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-slate-800 text-zinc-300 hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {activeEvidenceTab === 'gallery' && (
            <div className="space-y-4">
              {evidenceList.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 italic">
                  No hay evidencias tomadas todavía. Usa la cámara, sube archivos o vincula tu celular.
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-zinc-400">
                      {isGeneratingPdf ? (
                        <span className="text-sky-500 font-bold animate-pulse flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping inline-block" />
                          Generando documento de evidencias...
                        </span>
                      ) : (
                        `Total: ${evidenceList.length} archivos`
                      )}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const api = (window as any).electronAPI;
                          if (api?.openEvidenceFolder) {
                            await api.openEvidenceFolder(order.id);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isLight
                            ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                        }`}
                        title="Abrir la carpeta física donde se guardan los archivos en la computadora"
                      >
                        <Folder className="w-3.5 h-3.5" /> Carpeta
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={() => handlePrintEvidenceReport(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isGeneratingPdf 
                            ? 'bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed' 
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 cursor-pointer'
                        }`}
                      >
                        {isGeneratingPdf ? (
                          <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        PDF
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={() => handlePrintEvidenceReport(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isGeneratingPdf 
                            ? 'bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed' 
                            : 'bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 cursor-pointer'
                        }`}
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {evidenceList.map(ev => (
                      <div
                        key={ev.id}
                        className={`rounded-2xl border p-3 flex flex-col bg-slate-900/15 ${
                          isLight ? 'border-slate-200' : 'border-slate-800'
                        }`}
                      >
                        <div className="aspect-video rounded-lg overflow-hidden bg-black/40 flex items-center justify-center relative group">
                          {ev.type === 'video' ? (
                            <VideoPlayer ev={ev} />
                          ) : (
                            <div 
                              className="w-full h-full cursor-zoom-in flex items-center justify-center"
                              onClick={() => {
                                setLightboxImage(`fm-media://${ev.path.replace(/\\/g, '/')}`);
                              }}
                              title="Haz clic para ampliar la imagen"
                            >
                              <EvidenceMiniature ev={ev} />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteEvidence(ev.id, ev.path)}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-750 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="mt-2.5">
                          <p className="text-[10px] font-bold truncate text-zinc-300" title={ev.name}>{ev.name}</p>
                          <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{ev.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeEvidenceTab === 'camera' && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative aspect-video w-full max-w-lg rounded-2xl overflow-hidden bg-black border border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {isRecording && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white block" /> GRABANDO VIDEO
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {!isRecording ? (
                  <>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-5 py-2 rounded-xl bg-sky-500 text-slate-950 font-black text-xs uppercase hover:bg-sky-400 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" /> Tomar Foto
                    </button>
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-5 py-2 rounded-xl bg-red-600 text-white font-black text-xs uppercase hover:bg-red-500 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Video className="w-4 h-4" /> Grabar Video
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-5 py-2 rounded-xl bg-zinc-750 text-white font-black text-xs uppercase hover:bg-zinc-650 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    ⏹️ Detener Grabación
                  </button>
                )}
              </div>
            </div>
          )}

          {activeEvidenceTab === 'upload' && (
            <div className="flex flex-col items-center justify-center py-10">
              <label className={`w-full max-w-md border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all hover:bg-sky-500/5 ${
                isLight ? 'border-slate-300 hover:border-sky-500' : 'border-slate-800 hover:border-sky-500'
              }`}>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Smartphone className="w-12 h-12 text-sky-500 mx-auto mb-4" />
                <p className="text-xs font-bold">Arrastra tus archivos aquí o haz clic para buscar</p>
                <p className="text-[10px] text-zinc-500 mt-1.5">Soporta fotos (.jpg, .png) y videos (.mp4, .mov)</p>
              </label>
            </div>
          )}

          {activeEvidenceTab === 'mobile' && (
            <div className="flex flex-col items-center text-center max-w-md mx-auto py-4">
              <Smartphone className="w-12 h-12 text-sky-500 mb-3" />
              <h4 className="text-sm font-black">Carga desde tu Teléfono Celular</h4>
              <p className="text-xs text-zinc-400 mt-1 mb-6">
                Asegúrate de que tu celular esté conectado a la misma red Wi-Fi que esta computadora. Escanea el código QR para abrir el cargador de cámara web móvil.
              </p>
              {qrCodeUrl ? (
                <div className="p-4 bg-white rounded-2xl shadow-xl mb-4 border border-slate-200">
                  <img src={qrCodeUrl} alt="QR Code Link" className="w-44 h-44" />
                </div>
              ) : (
                <div className="animate-pulse w-44 h-44 bg-zinc-800 rounded-2xl mb-4" />
              )}
              <span 
                className="text-[11px] font-mono px-3 py-2 rounded-xl border select-all shadow-inner break-all text-center block w-full max-w-sm"
                style={{
                  backgroundColor: isLight ? '#f4f4f5' : '#090d16',
                  borderColor: isLight ? '#e4e4e7' : '#1e293b',
                  color: isLight ? '#1f2937' : '#34d399'
                }}
              >
                http://{localIp}:{localPort}/evidence?orderId={order.id}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-end shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
        }`}>
          <button
            type="button"
            onClick={handleClose}
            className={`py-2 px-5 text-xs font-black uppercase rounded-xl border cursor-pointer ${
              isLight 
                ? 'bg-white border-slate-350 text-slate-700 hover:bg-slate-100' 
                : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white'
            }`}
          >
            Cerrar
          </button>
        </div>

      </div>

      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100005] flex flex-col items-center justify-center animate-fade-in cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            type="button" 
            className="absolute top-6 right-6 text-white hover:text-zinc-300 font-black text-lg p-2 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-all"
            onClick={() => setLightboxImage(null)}
          >
            ✕
          </button>
          <img 
            src={lightboxImage} 
            alt="Evidencia Ampliada" 
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl transition-all"
            style={{ border: '2px solid #334155' }}
          />
          <div 
            className="text-[10px] font-mono mt-4 px-4 py-2 rounded-full border tracking-wider shadow-md font-bold"
            style={{ color: '#ffffff', backgroundColor: '#1e293b', borderColor: '#334155' }}
          >
            CLIC EN CUALQUIER PARTE PARA CERRAR
          </div>
        </div>
      )}

    </div>
  );
};

interface OrdenesViewProps {
  orders: RepairOrder[];
  onUpdateStatus: (id: string, state: RepairOrder['status']) => void;
  onUpdateDiagnose: (id: string, note: string) => void;
  onUpdateOrder: (order: RepairOrder) => void;
  onDeliverOrder: (id: string, cashPaid?: number, cardPaid?: number) => void;
  onDeleteOrder: (id: string, options?: { refundAdvance?: boolean }) => void;
  onAddOrder?: (order: RepairOrder) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedOrderId: (id: string | null) => void;
  selectedOrderId?: string | null;
  initialFilterStatus: string;
  setOrderFilter?: (filter: string) => void;
  config: WorkshopConfig;
  currentUser?: AppUser | null;
  users?: AppUser[];
  onAddExpense?: (exp: Expense) => void;
  refacciones?: RefaccionItem[];
  onSetRefacciones?: (refacciones: RefaccionItem[]) => void;
  donors?: DonorDevice[];
  onSetDonors?: (donors: DonorDevice[]) => void;
}

export default function OrdenesView({
  orders,
  onUpdateStatus,
  onUpdateDiagnose,
  onUpdateOrder,
  onDeliverOrder,
  onDeleteOrder,
  onAddOrder,
  setActiveTab,
  setSelectedOrderId,
  selectedOrderId,
  initialFilterStatus,
  setOrderFilter,
  config,
  currentUser,
  users = [],
  onAddExpense,
  refacciones = [],
  onSetRefacciones,
  donors = [],
  onSetDonors,
}: OrdenesViewProps) {
  const [searchTerm, setSearchTermRaw] = useState('');
  const setSearchTerm = (val: string) => {
    setSearchTermRaw(val.replace(/,(?!\s)/g, '-'));
  };
  const [hideDelivered, setHideDelivered] = useState(() => localStorage.getItem('fm_hide_delivered') !== 'false');
  const [activeFilter, setActiveFilter] = useState<string>(initialFilterStatus || 'todos');
  const [editingOrder, setEditingOrder] = useState<RepairOrder | null>(null);
  const [diagnosticsDraft, setDiagnosticsDraft] = useState('');
  const [previewOrderForModal, setPreviewOrderForModal] = useState<RepairOrder | null>(null);
  const [previewTicketType, setPreviewTicketType] = useState<'service' | 'delivery'>('service');
  const [previewChoiceOrder, setPreviewChoiceOrder] = useState<RepairOrder | null>(null);

  const hasCustomNote = (note?: string) => {
    if (!note) return false;
    const normalized = note.trim().toUpperCase();
    return normalized !== '' &&
           normalized !== 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' &&
           normalized !== 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' &&
           normalized !== 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' &&
           normalized !== 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  };

  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';
  const isFluent = config.theme === 'fluent';
  const canManage = !currentUser || currentUser.permissions.canManageOrders;
  const [waConnected, setWaConnected] = useState<boolean>(false);
  const [verifiedNumbers, setVerifiedNumbers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('fixmanager_wa_verified_numbers');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fixmanager_wa_verified_numbers', JSON.stringify(verifiedNumbers));
    } catch (e) {}
  }, [verifiedNumbers]);

  useEffect(() => {
    const handleStatus = (e: Event) => {
      setWaConnected((e as CustomEvent).detail);
    };
    window.addEventListener('whatsapp-status-update', handleStatus);

    const api = (window as any).electronAPI;
    if (api && api.whatsappGetStatus) {
      api.whatsappGetStatus().then((info: any) => {
        const isConnected = info && info.status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        setWaConnected(isConnected);
      }).catch(() => {});
    }

    if (api && api.onWhatsappStatusChange) {
      api.onWhatsappStatusChange((info: any) => {
        const isConnected = info && info.status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        setWaConnected(isConnected);
      });
    }

    return () => {
      window.removeEventListener('whatsapp-status-update', handleStatus);
    };
  }, []);

  const isWaIntegratedOffline = config.whatsappMode === 'integrated' && !waConnected;

  const getFormattedPhone = (phone: string, countryCode?: string) => {
    const cc = countryCode ? countryCode.replace(/\D/g, '') : '52';
    return formatPhoneForWhatsapp(phone, cc);
  };

  useEffect(() => {
    if (!waConnected) return;

    const api = (window as any).electronAPI;
    if (!api || !api.whatsappCheckNumber) return;

    // Collect all phone numbers and country codes from the orders that are NOT in verifiedNumbers yet
    const pendingItems = orders
      .map(o => ({ phone: o.customerPhone, cc: o.customerCountryCode }))
      .filter(item => item.phone && item.phone.trim() !== '');

    // Map to formatted phone numbers and deduplicate
    const pendingFormatted = Array.from(
      new Set(
        pendingItems.map(item => getFormattedPhone(item.phone, item.cc))
      )
    ).filter(formatted => verifiedNumbers[formatted] === undefined);

    if (pendingFormatted.length === 0) return;

    let active = true;
    const processQueue = async () => {
      for (const formatted of pendingFormatted) {
        if (!active || !waConnected) break;
        try {
          const res = await api.whatsappCheckNumber(formatted);
          if (res && res.success) {
            setVerifiedNumbers(prev => ({
              ...prev,
              [formatted]: res.exists
            }));
            
            // Sincronizar el resultado en las órdenes de reparación para que se guarden en base de datos y viajen a móvil
            const targetPhone = formatted.replace(/^521|^52/, '');
            const matchedOrders = orders.filter(o => {
              const cleanO = (o.customerPhone || '').replace(/\D/g, '');
              return cleanO === targetPhone || cleanO.endsWith(targetPhone);
            });
            for (const o of matchedOrders) {
              if (o.customerHasWhatsApp !== res.exists) {
                onUpdateOrder({
                  ...o,
                  customerHasWhatsApp: res.exists
                });
              }
            }
          }
        } catch (e) {
          console.error('[WhatsApp Check Hook] Error checking phone:', formatted, e);
        }
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    };

    processQueue();

    return () => {
      active = false;
    };
  }, [orders, waConnected, verifiedNumbers]);

  const handlePhoneClick = async (phone: string, countryCode?: string, order?: RepairOrder) => {
    if (!phone) return;
    const formatted = getFormattedPhone(phone, countryCode);
    let isVerified = verifiedNumbers[formatted];

    const api = (window as any).electronAPI;

    // Si el número no está verificado aún en caché, intentar verificación rápida al hacer clic
    if (isVerified !== true && api && api.whatsappCheckNumber && waConnected) {
      try {
        const checkRes = await api.whatsappCheckNumber(formatted);
        if (checkRes && checkRes.success && checkRes.exists) {
          isVerified = true;
          setVerifiedNumbers(prev => ({ ...prev, [formatted]: true }));
        }
      } catch (err) {
        console.warn('[handlePhoneClick] Error verificando número al clic:', err);
      }
    }

    const hour = new Date().getHours();
    let greeting = 'Buenos días';
    if (hour >= 12 && hour < 19) {
      greeting = 'Buenas tardes';
    } else if (hour >= 19 || hour < 5) {
      greeting = 'Buenas noches';
    }
    const storeName = config.storeName || '';
    const businessPart = storeName ? ` de ${storeName}` : '';
    let defaultText = '';

    if (order) {
      const orderId = order.id;
      const device = `${order.deviceBrand || ''} ${order.deviceModel || ''}`.trim() || 'su equipo';
      const service = order.serviceType ? ` - ${order.serviceType}` : '';
      defaultText = `${greeting}, me comunico${businessPart} en relación a su orden ${orderId} (${device}${service}). `;
    } else {
      defaultText = `${greeting}, me comunico${businessPart}. `;
    }

    let openedInApp = false;

    let isConnected = waConnected;
    if (!isConnected && api && api.whatsappGetStatus) {
      try {
        const statusInfo = await api.whatsappGetStatus();
        if (statusInfo && statusInfo.status === 'CONNECTED') {
          isConnected = true;
          setWaConnected(true);
        }
      } catch (e) {}
    }

    if (api && api.whatsappOpenChat && (config.whatsappMode === 'integrated' || isConnected || config.whatsappMode !== 'disabled')) {
      try {
        const res = await api.whatsappOpenChat(formatted, defaultText);
        if (res && res.success) {
          openedInApp = true;
          window.dispatchEvent(new CustomEvent('open-whatsapp-chat'));
        }
      } catch (err) {
        console.error('[WhatsApp Open Chat] Error:', err);
      }
    }

    if (!openedInApp) {
      openWhatsappChat(phone, defaultText, countryCode || config.whatsappDefaultCountryCode || '52');
    }
  };

  const renderClickablePhone = (phone: string, countryCode?: string, order?: RepairOrder, textStyle: string = '') => {
    if (!phone) return '—';
    const formatted = getFormattedPhone(phone, countryCode);
    const isVerified = verifiedNumbers[formatted];
    const formattedDisplay = formatCustomerPhoneWithCountryCode(phone, countryCode);

    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          handlePhoneClick(phone, countryCode, order);
        }}
        title={isVerified ? "WhatsApp verificado - Clic para abrir chat" : "Clic para verificar y abrir chat de WhatsApp"}
        className={`cursor-pointer transition-all hover:underline ${
          isVerified 
            ? (isRetro 
                ? 'text-[#000080] font-black' 
                : isLight 
                ? 'text-emerald-700 hover:text-emerald-800 font-bold' 
                : 'text-emerald-400 hover:text-emerald-300 font-bold')
            : (isRetro
                ? 'text-[#000080]/80'
                : isLight
                ? 'text-slate-700 hover:text-slate-900 font-medium'
                : 'text-slate-300 hover:text-white font-medium')
        } ${textStyle}`}
      >
        {formattedDisplay}
      </span>
    );
  };

  const getBatchRowBg = (isSelected: boolean, allReady: boolean) => {
    if (isSelected) {
      return isRetro ? (isLight ? '#fed7aa' : '#383c48') : isLight ? '#fed7aa' : 'rgba(49, 46, 129, 0.4)';
    }
    if (allReady) {
      return isRetro ? (isLight ? '#fef2f2' : 'rgba(153, 27, 27, 0.25)') : isLight ? '#fef2f2' : 'rgba(153, 27, 27, 0.2)';
    }
    return isRetro ? (isLight ? '#ffedd5' : '#1d2027') : isLight ? '#ffedd5' : 'rgba(61, 31, 0, 0.45)';
  };

  const getOrderRowBg = (isSelected: boolean) => {
    if (isSelected) {
      return isRetro ? (isLight ? '#c6c6c6' : '#383c48') : isLight ? '#dbeafe' : 'rgba(30, 58, 138, 0.3)';
    }
    return isRetro ? (isLight ? '#ffffff' : '#121316') : isLight ? '#ffffff' : 'transparent';
  };
  // Helper: usa eco mode si está activo, sino imprime directo
  const fmPrint = React.useCallback((opts: { 
    html: string; 
    deviceName?: string; 
    paperWidthMicrons?: number; 
    paperHeightMicrons?: number; 
    copies?: number; 
    isLabel?: boolean; 
    isReport?: boolean; 
    noToast?: boolean; 
    toastName?: string; 
    toastDetails?: string;
    isServiceTicket?: boolean;
    order?: RepairOrder;
  }) => {
    if (!opts.isReport && !opts.noToast) {
      const type = opts.isLabel ? 'label' : 'ticket';
      window.dispatchEvent(new CustomEvent('automated-print', {
        detail: { type, name: opts.toastName || (opts.isLabel ? 'Etiqueta de Servicio' : 'Ticket de Orden'), details: opts.toastDetails }
      }));
    }
    window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: opts }));
  }, []);
  const getCatalogModelNumber = (brand?: string, model?: string): string => {
    if (!brand || !model) return '';
    const bUpper = brand.trim().toUpperCase();
    const mUpper = model.trim().toUpperCase();
    
    // 1. Search in custom catalog
    const customMatch = (config.customDeviceModels || []).find(
      d => d.brand.trim().toUpperCase() === bUpper &&
           d.model.trim().toUpperCase() === mUpper
    );
    if (customMatch?.modelNumber) return customMatch.modelNumber;

    // 2. Search in default offline models
    const offlineMatch = DEFAULT_OFFLINE_MODELS.find(
      d => d.brand.trim().toUpperCase() === bUpper &&
           d.model.trim().toUpperCase() === mUpper
    );
    if (offlineMatch?.modelNumber) return offlineMatch.modelNumber;

    return '';
  };

  const isPersonalMode = (config.workshopMode ?? 'personal') === 'personal';

  const renderFinanceBox = (
    title: string,
    value: string,
    variant: 'gray' | 'violet' | 'emerald' | 'rose',
    isLiquidado: boolean = false,
    options?: { lineThrough?: boolean; pulsing?: boolean; subText?: string }
  ) => {
    let bgBorderClass = '';
    let titleClass = '';
    let valClass = '';

    if (variant === 'gray') {
      bgBorderClass = isRetro
        ? (isLight
            ? 'bg-white border-zinc-400 text-black shadow-xs'
            : 'bg-[#1a1c23] border-[#383c48] text-white shadow-xs')
        : isLight
        ? 'bg-zinc-100 border-zinc-300 text-zinc-800 shadow-xs'
        : 'bg-zinc-900/30 border-zinc-800 text-zinc-100 shadow-xs';
      titleClass = isLight ? 'text-zinc-650' : 'text-zinc-450';
      valClass = isLight ? 'text-zinc-950' : 'text-zinc-100';
    } else if (variant === 'violet') {
      bgBorderClass = isRetro
        ? (isLight
            ? 'bg-violet-50/50 border-zinc-400 text-violet-850 shadow-sm'
            : 'bg-[#251b3b]/30 border-[#4c1d95]/40 text-violet-300 shadow-sm')
        : isLight
        ? 'bg-violet-100/60 border-violet-200 text-violet-850 shadow-sm'
        : 'bg-violet-950/10 border-zinc-800 text-violet-300 shadow-xs';
      titleClass = isLight ? 'text-violet-700' : 'text-violet-400';
      valClass = isLight ? 'text-violet-800' : 'text-violet-300';
    } else if (variant === 'emerald') {
      bgBorderClass = isRetro
        ? (isLight
            ? 'bg-emerald-50 border-zinc-400 text-emerald-800 shadow-sm'
            : 'bg-[#064e3b]/30 border-[#059669]/40 text-emerald-300 shadow-sm')
        : isLight
        ? 'bg-emerald-100/60 border-emerald-200 text-emerald-800 shadow-sm'
        : 'bg-emerald-950/10 border-zinc-800 text-emerald-300 shadow-xs';
      titleClass = isLight ? 'text-emerald-700' : 'text-emerald-400';
      valClass = isLight ? 'text-emerald-800' : 'text-emerald-300';
    } else if (variant === 'rose') {
      bgBorderClass = isRetro
        ? (isLight
            ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
            : 'bg-[#7f1d1d]/30 border-[#dc2626]/40 text-red-300 shadow-xs')
        : isLight
        ? 'bg-rose-100/60 border-rose-200 text-rose-700 shadow-xs'
        : 'bg-rose-950/20 border-rose-900/30 text-rose-400 shadow-xs';
      titleClass = isLight ? 'text-rose-700' : 'text-rose-400';
      valClass = isLight ? 'text-rose-800' : 'text-rose-300';
    }

    if (options?.pulsing) {
      bgBorderClass += ' animate-pulse';
    }

    return (
      <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${bgBorderClass}`}>
        <span className={`text-[8px] font-extrabold uppercase tracking-wider ${titleClass}`}>
          {title}
        </span>
        {isLiquidado ? (
          <span className="text-[9.5px] font-black text-emerald-500 uppercase mt-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            Liquidado
          </span>
        ) : (
          <span className={`text-sm font-black font-mono mt-0.5 ${valClass} ${options?.lineThrough ? 'line-through' : ''}`}>
            {value}
          </span>
        )}
        {options?.subText && (
          <span className="text-[7.5px] text-rose-500 block uppercase font-bold tracking-wider font-mono mt-0.5">
            {options.subText}
          </span>
        )}
      </div>
    );
  };

  const getHeaderStatusBadge = (status: RepairOrder['status']): string => {
    if (isRetro) {
      switch (status) {
        case 'Pendiente': return 'bg-amber-100 border-2 border-amber-600 text-amber-950 font-black';
        case 'Diagnóstico': return 'bg-purple-100 border-2 border-purple-600 text-purple-950 font-black';
        case 'En Reparación': return 'bg-blue-100 border-2 border-blue-600 text-[#000080] font-black';
        case 'Listo': return 'bg-[#dc2626] font-extrabold text-white border-2 border-red-700 shadow-sm';
        case 'Fallido': return 'bg-red-100 border-2 border-red-500 text-red-950 font-black';
        case 'Cancelado': return 'bg-zinc-200 border-2 border-zinc-500 text-zinc-500 font-bold line-through';
        case 'Entregado':
        case 'Entregado y Pagado': return 'bg-emerald-150 border-2 border-emerald-600 text-emerald-950 font-black';
        default: return 'bg-zinc-200 border-2 border-zinc-500 text-zinc-900';
      }
    }
    switch (status) {
      case 'Pendiente':
        return 'bg-amber-600 text-white border border-amber-500 font-extrabold';
      case 'Diagnóstico':
        return 'bg-purple-600 text-white border border-purple-500 font-extrabold';
      case 'En Reparación':
        return 'bg-blue-600 text-white border border-blue-500 font-extrabold';
      case 'Listo':
        return 'bg-[#dc2626] text-white border border-red-700 font-extrabold shadow-sm';
      case 'Fallido':
        return 'bg-red-600 text-white border border-red-500 font-extrabold';
      case 'Cancelado':
        return 'bg-zinc-500 text-white border border-zinc-400 font-extrabold line-through';
      case 'Entregado':
      case 'Entregado y Pagado':
        return 'bg-emerald-600 text-white border border-emerald-500 font-extrabold';
      default:
        return 'bg-zinc-600 text-white font-extrabold';
    }
  };

  const isVencida = (order: RepairOrder): boolean => {
    const activasStatuses = ['Pendiente', 'Diagnóstico', 'En Reparación'];
    if (!activasStatuses.includes(order.status) || !order.estimatedDeliveryDate) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const delivery = new Date(order.estimatedDeliveryDate); delivery.setHours(0, 0, 0, 0);
    return delivery < today;
  };

  const diasVencida = (order: RepairOrder): number => {
    if (!order.estimatedDeliveryDate) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const delivery = new Date(order.estimatedDeliveryDate); delivery.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - delivery.getTime()) / (1000 * 60 * 60 * 24));
  };

  // States for confirming fast status transitions
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    orderId: string;
    customerName: string;
    deviceModel: string;
    currentStatus: RepairOrder['status'];
    newStatus: RepairOrder['status'];
    diagnosticsNote: string;
    returnToBatchId?: string;
  } | null>(null);

  const triggerStatusChangeConfirmation = (
    orderId: string,
    customerName: string,
    deviceModel: string,
    currentStatus: RepairOrder['status'],
    newStatus: RepairOrder['status'],
    diagnosticsNote: string,
    returnToBatchId?: string
  ) => {
    setPendingStatusChange({
      orderId,
      customerName,
      deviceModel,
      currentStatus,
      newStatus,
      diagnosticsNote,
      returnToBatchId,
    });
  };

  const handleConfirmStatusChange = () => {
    if (!pendingStatusChange) return;
    const { orderId, newStatus, diagnosticsNote, returnToBatchId } = pendingStatusChange;

    onUpdateStatus(orderId, newStatus);
    onUpdateDiagnose(orderId, diagnosticsNote);

    // Buscar si es una garantía fallida/cancelada
    const order = orders.find(o => o.id === orderId);
    if (order && (newStatus === 'Fallido' || newStatus === 'Cancelado') && order.warrantyOf && order.warrantyOf.trim() !== '') {
      const originalOrder = orders.find(o => o.id === order.warrantyOf);
      if (originalOrder) {
        const paidAmount = originalOrder.isPaid ? originalOrder.cost : originalOrder.advancePayment;
        if (paidAmount > 0) {
          const formattedAmount = `${config.currencySymbol || '$'}${paidAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const confirmMsg = `Esta orden es una garantía de la orden original #${originalOrder.id}.\n\n` +
            `¿Deseas registrar automáticamente una salida de caja (devolución en efectivo) por ${formattedAmount} por concepto de garantía fallida?`;
          
          if (window.confirm(confirmMsg)) {
            const refundExpense: Expense = {
              id: `REEMB-GAR-${orderId}-${Date.now()}`,
              description: `Devolución por garantía fallida de Orden ${originalOrder.id} (Ref. ${orderId}) — ${originalOrder.customerName}`,
              category: 'Devolución de Servicio',
              amount: paidAmount,
              createdAt: new Date().toISOString(),
              type: 'salida',
              paymentMethod: 'Efectivo'
            };
            if (onAddExpense) {
              onAddExpense(refundExpense);
            }

            // Preguntar si desea imprimir el comprobante físico
            const printMsg = `¿Deseas imprimir el comprobante físico de reembolso para firma del cliente?`;
            if (window.confirm(printMsg)) {
              const isStar = config.selectedPrinterProfileId === 'star-tsp100';
              const paperWidth = isStar ? '72mm' : (config.ticketPaperWidth || '80mm');
              const paperWidthMicrons = paperWidth === 'media-carta-duplicado'
                ? 210000
                : (config.hybridPrintMode || paperWidth === 'media-carta')
                  ? 215900
                  : paperWidth === '58mm'
                    ? 48000
                    : 72000;
              const paperHeightMicrons = paperWidth === 'media-carta-duplicado'
                ? 297000
                : config.hybridPrintMode
                  ? 279400
                  : paperWidth === 'media-carta'
                    ? 139700
                    : undefined;

              const currSym = config.currencySymbol || '$';
              const dateStr = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
              
              const refundTicketHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: ${paperWidth === 'media-carta' ? '216mm 140mm' : paperWidth === 'media-carta-duplicado' ? '210mm 297mm' : `${paperWidth} auto`}; margin: 2mm 1mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: ${paperWidth === '58mm' ? '11' : '13'}px; font-weight: 700; width: 100%; margin: 0; padding: 2mm 3mm; color: #000; background: #fff; }
  .center { text-align: center; } .bold { font-weight: 900; }
  .store { font-size: 15px; font-weight: 900; text-align: center; margin-bottom: 1px; }
  hr { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }
  .kv { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 10px; margin: 1px 0; }
  .kv-val { text-align: right; flex: 1; min-width: 0; word-break: break-word; font-weight: 900; margin-left: 8px; }
  .badge { display: block; font-weight: 950; text-align: center; font-size: 11px; background: #000 !important; color: #fff !important; padding: 5px 0 !important; margin: 3.5px 0; letter-spacing: 1px; line-height: 1.25 !important; }
  .total-row { font-size: 13px; font-weight: 900; text-align: right; border-top: 2px solid #000; margin-top: 4px; padding-top: 2px; }
  .footer { font-size: 10px; font-weight: 700; text-align: center; margin-top: 5px; }
  .signatures-table { width: 100%; margin-top: 25px; margin-bottom: 10px; }
  .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 2px; font-size: 8px; font-weight: 700; text-align: center; text-transform: uppercase; }
</style></head><body>
  ` + buildTicketHeaderHtml(config, paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado' ? '80mm' : paperWidth as any) + `
  <hr>
  <div class="badge">COMPROBANTE DE REEMBOLSO</div>
  <div class="kv"><span>FOLIO REEMBOLSO:</span><span class="bold">REF-${orderId}</span></div>
  <div class="kv"><span>ORDEN GARANTÍA:</span><span class="bold">${orderId}</span></div>
  <div class="kv"><span>ORDEN ORIGINAL:</span><span class="bold">${originalOrder.id}</span></div>
  <div class="kv"><span>FECHA:</span><span>${dateStr}</span></div>
  <div class="kv"><span>CLIENTE:</span><span class="bold">${originalOrder.customerName}</span></div>
  <div class="kv"><span>EQUIPO:</span><span class="bold">${originalOrder.deviceBrand} ${originalOrder.deviceModel}</span></div>
  <hr>
  <div class="center" style="font-size: 9.5px; margin: 6px 0; font-weight: 500; line-height: 1.3;">
    Se realiza el reembolso de dinero por concepto de garantía fallida. El cliente recibe su equipo original sin solución y la devolución de su pago.
  </div>
  <div class="total-row">REEMBOLSADO: ${currSym}${paidAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
  <hr>
  <table class="signatures-table" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="width: 50%; text-align: center; vertical-align: bottom;">
        <div style="height: 35px;"></div>
        <div class="signature-line">Firma de Recibido del Cliente</div>
      </td>
      <td style="width: 50%; text-align: center; vertical-align: bottom;">
        <div style="height: 35px;"></div>
        <div class="signature-line">Firma Autorizada del Taller</div>
      </td>
    </tr>
  </table>
  <div class="footer">${config.ticketFooter || '¡Gracias por su preferencia!'}</div>
</body></html>`;

              fmPrint({
                html: refundTicketHtml,
                deviceName: config.ticketPrinterBrand || '',
                paperWidthMicrons,
                paperHeightMicrons,
                toastName: `Reembolso de Orden #${originalOrder.id}`,
                toastDetails: formattedAmount,
                isLabel: false
              });
            }
          }
        }
      }
    }

    const returnId = pendingStatusChange.returnToBatchId;
    setPendingStatusChange(null);
    if (returnId) setReturnToBatchIdAfterUpdate(returnId);
  };

  // Reabrir el modal de grupo DESPUÉS de que React haya propagado el nuevo estado
  const [returnToBatchIdAfterUpdate, setReturnToBatchIdAfterUpdate] = useState<string | null>(null);
  React.useEffect(() => {
    if (!returnToBatchIdAfterUpdate) return;
    const freshOrders = orders.filter(o => o.batchId === returnToBatchIdAfterUpdate);
    if (freshOrders.length > 1) setSelectedOrderIdLocal(returnToBatchIdAfterUpdate);
    setReturnToBatchIdAfterUpdate(null);
  }, [orders, returnToBatchIdAfterUpdate]);



  // Checkout de todos los equipos listos del grupo
  const [batchCheckoutModal, setBatchCheckoutModal] = useState<{ batchOrders: RepairOrder[] } | null>(null);
  const [batchPaymentAmounts, setBatchPaymentAmounts] = useState<PaymentAmounts>({ 'Efectivo': '' });
  // Legacy aliases batch
  const batchCheckoutPayment = (Object.keys(batchPaymentAmounts)[0] || 'Efectivo') as PayMethod;
  const batchCashReceived = batchPaymentAmounts['Efectivo'] || '';

  // Modal finalizar y cobrar grupo directo
  const [batchFinalizeModal, setBatchFinalizeModal] = useState<{ batchId: string; batchOrders: RepairOrder[] } | null>(null);

  // State for order detail local tracking
  const [selectedOrderIdLocal, setSelectedOrderIdLocal] = useState<string | null>(null);

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const anyModalOpen = 
    selectedOrderIdLocal !== null ||
    editingOrder !== null ||
    batchCheckoutModal !== null ||
    batchFinalizeModal !== null;

  useEffect(() => {
    if (!anyModalOpen) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [anyModalOpen]);

  const selectedBatchOrders = useMemo(() => {
    if (!selectedOrderIdLocal || !selectedOrderIdLocal.startsWith('BATCH-')) return null;
    return orders.filter(o => o.batchId === selectedOrderIdLocal);
  }, [orders, selectedOrderIdLocal]);
  const detailOrder = useMemo(() => {
    const found = orders.find(o => o.id === selectedOrderIdLocal) || null;
    if (!found) return null;
    return {
      ...found,
      deviceModelNumber: found.deviceModelNumber || getCatalogModelNumber(found.deviceBrand, found.deviceModel)
    };
  }, [orders, selectedOrderIdLocal, config.customDeviceModels]);

  const [detailReturnBatch, setDetailReturnBatch] = useState<{ batchId: string; batchOrders: RepairOrder[] } | null>(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailDraft, setDetailDraft] = useState<RepairOrder | null>(null);
  const [showAccPopover, setShowAccPopover] = useState(false);
  const accPopoverRef = React.useRef<HTMLDivElement>(null);

  const [showEvidenceModal, setShowEvidenceModal] = useState<RepairOrder | null>(null);

  // Se eliminó el listener local de onEvidenceUploaded; ahora se maneja globalmente en App.tsx para evitar closures obsoletos.

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accPopoverRef.current && !accPopoverRef.current.contains(e.target as Node)) {
        setShowAccPopover(false);
      }
    };
    if (showAccPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAccPopover]);

  const [showDetailPinModal, setShowDetailPinModal] = useState(false);
  const [detailPin, setDetailPin] = useState('');
  const [detailPinError, setDetailPinError] = useState('');
  const [pinPurpose, setPinPurpose] = useState<'edit' | 'delete'>('edit');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Programmatically focus the admin pin input field on show
  const detailPinInputRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (showDetailPinModal) {
      const timer = setTimeout(() => {
        if (detailPinInputRef.current) {
          detailPinInputRef.current.focus();
          detailPinInputRef.current.select();
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [showDetailPinModal]);

  // Local states for adding parts
  const [newPartName, setNewPartName] = useState('');
  const [newPartCost, setNewPartCost] = useState('');
  const [newPartPrice, setNewPartPrice] = useState('');
  const [selectedPartRefaccionId, setSelectedPartRefaccionId] = useState('');
  const [showPartSuggestions, setShowPartSuggestions] = useState(false);
  const [showDonorSearchModal, setShowDonorSearchModal] = useState(false);
  const [donorSearchQuery, setDonorSearchQuery] = useState('');
  const [activePartSuggestionIdx, setActivePartSuggestionIdx] = useState(-1);

  // Reiniciar el índice activo al cambiar la búsqueda o la orden activa
  useEffect(() => {
    setActivePartSuggestionIdx(-1);
  }, [newPartName, detailOrder]);

  const partSuggestions = useMemo(() => {
    if (!detailOrder) return [];

    // Función de compatibilidad inteligente (fuzzy matching)
    const isCompatible = (r: RefaccionItem) => {
      const rBrand = (r.deviceBrand || '').toLowerCase().trim();
      const rModel = (r.deviceModel || '').toLowerCase().trim();
      if (!rBrand && !rModel) return true; // Universal es compatible siempre

      const oBrand = (detailOrder.deviceBrand || '').toLowerCase().trim();
      const oModel = (detailOrder.deviceModel || '').toLowerCase().trim();
      const oModelNum = (detailOrder.deviceModelNumber || '').toLowerCase().trim();
      const fullOrderText = `${oBrand} ${oModel} ${oModelNum}`.replace(/[\(\)]/g, '');

      // Validar marca
      if (rBrand) {
        const brandMatch = fullOrderText.includes(rBrand) || rBrand.includes(oBrand);
        if (!brandMatch) return false;
      }

      // Validar modelo
      if (rModel) {
        const oWords = fullOrderText.split(/[\s\-]+/);
        const rWords = rModel.split(/[\s\-]+/);
        const hasWordIntersection = rWords.some(rw => 
          rw.length > 1 && oWords.some(ow => ow === rw || ow.includes(rw) || rw.includes(ow))
        );
        if (!hasWordIntersection) return false;
      }

      return true;
    };

    if (!newPartName.trim()) {
      // Mostrar compatibles por defecto (posicionando favoritas primero)
      const compatibleList = refacciones.filter(isCompatible);
      return compatibleList.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
    }

    const q = newPartName.toLowerCase().trim();
    
    // Buscar primero dentro de los compatibles
    const compatibleList = refacciones.filter(isCompatible);
    const matchedCompatible = compatibleList.filter(r => 
      (r.name || '').toLowerCase().includes(q) ||
      (r.code || '').toLowerCase().includes(q)
    );

    if (matchedCompatible.length > 0) {
      return matchedCompatible.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)).slice(0, 10);
    }

    // Fallback: Buscar en todo el catálogo de refacciones si no coincide ninguna compatible
    const matchedAll = refacciones.filter(r => 
      (r.name || '').toLowerCase().includes(q) ||
      (r.code || '').toLowerCase().includes(q) ||
      (r.deviceBrand || '').toLowerCase().includes(q) ||
      (r.deviceModel || '').toLowerCase().includes(q)
    );
    return matchedAll.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)).slice(0, 10);
  }, [newPartName, refacciones, detailOrder]);

  // Local states for inline device pin/pattern editing
  const [editPinType, setEditPinType] = useState<'none' | 'pin' | 'pattern'>('none');
  const [editPatternNodes, setEditPatternNodes] = useState<number[]>([]);

  const startEditing = (activeOrder: RepairOrder) => {
    setDetailEditMode(true);
    const modelNum = activeOrder.deviceModelNumber || getCatalogModelNumber(activeOrder.deviceBrand, activeOrder.deviceModel);
    setDetailDraft({ 
      ...activeOrder,
      deviceModelNumber: modelNum
    });
    
    // Parse PIN type and pattern nodes
    const pinVal = activeOrder.devicePin || '';
    if (!pinVal || pinVal === 'SIN CLAVE' || pinVal.trim() === '') {
      setEditPinType('none');
      setEditPatternNodes([]);
    } else {
      const isPatronPrefix = pinVal.toUpperCase().startsWith('PATRÓN:') || pinVal.toUpperCase().startsWith('PATRON:');
      const isPatronFormat = isPatronPrefix || /^[0-8](-[0-8]){2,}$/.test(pinVal.trim());
      if (isPatronFormat) {
        setEditPinType('pattern');
        let nodeStr = pinVal.trim();
        if (nodeStr.toUpperCase().startsWith('PATRÓN:')) {
          nodeStr = nodeStr.slice('PATRÓN:'.length).trim();
        } else if (nodeStr.toUpperCase().startsWith('PATRON:')) {
          nodeStr = nodeStr.slice('PATRON:'.length).trim();
        }
        const nodes = nodeStr.split('-').map(Number).filter(n => !isNaN(n));
        setEditPatternNodes(nodes);
      } else {
        setEditPinType('pin');
        setEditPatternNodes([]);
      }
    }
  };

  const hasChanges = useMemo(() => {
    if (!detailOrder || !detailDraft) return false;
    const accsDraft = detailDraft.receivedAccessories || [];
    const accsOrder = detailOrder.receivedAccessories || [];
    const hasAccsChanged = accsDraft.length !== accsOrder.length || 
      !accsDraft.every(val => accsOrder.includes(val)) ||
      !accsOrder.every(val => accsDraft.includes(val));
    return (
      (detailDraft.customerName || '') !== (detailOrder.customerName || '') ||
      (detailDraft.customerPhone || '') !== (detailOrder.customerPhone || '') ||
      (detailDraft.customerCountryCode || '') !== (detailOrder.customerCountryCode || '') ||
      (detailDraft.deviceBrand || '') !== (detailOrder.deviceBrand || '') ||
      (detailDraft.deviceModel || '') !== (detailOrder.deviceModel || '') ||
      (detailDraft.deviceModelNumber || '') !== (detailOrder.deviceModelNumber || '') ||
      (detailDraft.devicePin || '') !== (detailOrder.devicePin || '') ||
      (detailDraft.serviceType || '') !== (detailOrder.serviceType || '') ||
      (detailDraft.assignedTechnician || '') !== (detailOrder.assignedTechnician || '') ||
      (detailDraft.diagnosticsNote || '') !== (detailOrder.diagnosticsNote || '') ||
      detailDraft.cost !== detailOrder.cost ||
      (detailDraft.serviceCost || 0) !== (detailOrder.serviceCost || 0) ||
      detailDraft.advancePayment !== detailOrder.advancePayment ||
      hasAccsChanged
    );
  }, [detailOrder, detailDraft]);

  useEffect(() => {
    if (!detailEditMode) return;
    if (editPinType === 'none') {
      setField('devicePin', 'SIN CLAVE');
    } else if (editPinType === 'pattern') {
      setField('devicePin', editPatternNodes.length > 0 ? `PATRÓN: ${editPatternNodes.join('-')}` : '');
    }
  }, [editPinType, editPatternNodes, detailEditMode]);

  const handleSave = () => {
    if (!detailDraft) return;
    const userLogStr = currentUser?.name || 'Administrador';
    const logEntry = {
      action: 'EDICIÓN DE ORDEN',
      user: userLogStr,
      timestamp: new Date().toISOString()
    };
    const updated = {
      ...detailDraft,
      activityLog: [...(detailDraft.activityLog || []), logEntry]
    };
    onUpdateOrder(updated);
    setDetailEditMode(false);
    setDetailDraft(null);
  };

  const setField = (field: keyof RepairOrder, value: any) => {
    let finalVal = value;
    if (typeof value === 'string' && [
      'customerName', 'deviceBrand', 'deviceModel', 'deviceModelNumber', 
      'faultDescription', 'diagnosticsNote', 'serviceType', 'assignedTechnician'
    ].includes(field)) {
      finalVal = value.toUpperCase();
    }
    setDetailDraft(prev => prev ? { ...prev, [field]: finalVal } : prev);
  };

  // State to confirm warranty creation warning
  const [warrantyConfirmOrder, setWarrantyConfirmOrder] = useState<{ order: RepairOrder; returnBatchId?: string } | null>(null);

  // States for delivery and checkout modal
  type PayMethod = 'Efectivo' | 'Tarjeta' | 'Tarjeta/Transfer';
  type PaymentAmounts = Partial<Record<PayMethod, string>>;
  const totalPaid = (amounts: PaymentAmounts) => Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const changeAmount = (amounts: PaymentAmounts, due: number) => {
    const nonEfectivo = (Number(amounts['Tarjeta']) || 0) + (Number(amounts['Tarjeta/Transfer']) || 0);
    const efectivoNeeded = Math.max(0, due - nonEfectivo);
    return Math.max(0, (Number(amounts['Efectivo']) || 0) - efectivoNeeded);
  };

  const getProportionalAdvances = (siblingOrders: RepairOrder[], totalAdvance: number): Record<string, number> => {
    if (siblingOrders.length === 0) return {};
    const totalCost = siblingOrders.reduce((sum, x) => sum + x.cost, 0);
    if (totalCost === 0) {
      const base = Math.floor(totalAdvance / siblingOrders.length);
      const rem = totalAdvance - base * siblingOrders.length;
      const res: Record<string, number> = {};
      siblingOrders.forEach((o, idx) => {
        res[o.id] = base + (idx < rem ? 1 : 0);
      });
      return res;
    }

    const items = siblingOrders.map(o => {
      const exact = (o.cost / totalCost) * totalAdvance;
      const floor = Math.floor(exact);
      const remainder = exact - floor;
      return {
        id: o.id,
        cost: o.cost,
        floor,
        remainder,
      };
    });

    items.sort((a, b) => {
      if (Math.abs(a.remainder - b.remainder) > 1e-9) {
        return b.remainder - a.remainder;
      }
      if (a.cost !== b.cost) {
        return b.cost - a.cost;
      }
      return a.id.localeCompare(b.id);
    });

    const sumFloor = items.reduce((s, item) => s + item.floor, 0);
    const difference = Math.round(totalAdvance - sumFloor);

    const res: Record<string, number> = {};
    items.forEach((item, idx) => {
      res[item.id] = item.floor + (idx < difference ? 1 : 0);
    });

    return res;
  };

  const getIndividualAdvance = (order: RepairOrder): number => {
    if (order.batchId) {
      const siblings = orders.filter(x => x.batchId === order.batchId);
      if (siblings.length > 1) {
        const advances = getProportionalAdvances(siblings, order.batchAdvancePayment || 0);
        return advances[order.id] || 0;
      }
    }
    return order.advancePayment || 0;
  };

  const handleChargeInPos = (order: RepairOrder) => {
    const adv = getIndividualAdvance(order);
    const balanceDue = Math.max(0, order.cost - adv);

    let basket: { item: InventoryItem; quantity: number }[] = [];
    try {
      const saved = localStorage.getItem('pos_active_basket_v1');
      basket = saved ? JSON.parse(saved) : [];
    } catch {
      basket = [];
    }

    const existing = basket.find(b => b.item.id === `repair-${order.id}`);
    if (!existing) {
      const tempItem: InventoryItem = {
        id: `repair-${order.id}`,
        code: order.id,
        name: `REPARACIÓN: ${order.id} - ${order.deviceBrand || ''} ${order.deviceModel || ''}`,
        brand: order.deviceBrand || '',
        category: 'Servicio Técnico',
        stock: 1,
        minStock: 0,
        price: balanceDue,
        cost: balanceDue,
      };
      basket.push({ item: tempItem, quantity: 1 });
      localStorage.setItem('pos_active_basket_v1', JSON.stringify(basket));
      localStorage.setItem('pos_redirect_toast', `🔧 Orden ${order.id} agregada al carrito.`);
    } else {
      localStorage.setItem('pos_redirect_toast', `⚠️ La orden ${order.id} ya estaba en el carrito.`);
    }

    setCheckoutOrder(null);
    setActiveTab('POS');
  };

  const handleChargeBatchInPos = (readyOrders: RepairOrder[]) => {
    let basket: { item: InventoryItem; quantity: number }[] = [];
    try {
      const saved = localStorage.getItem('pos_active_basket_v1');
      basket = saved ? JSON.parse(saved) : [];
    } catch {
      basket = [];
    }

    let addedCount = 0;
    for (const order of readyOrders) {
      const adv = getIndividualAdvance(order);
      const balanceDue = Math.max(0, order.cost - adv);

      const existing = basket.find(b => b.item.id === `repair-${order.id}`);
      if (!existing) {
        const tempItem: InventoryItem = {
          id: `repair-${order.id}`,
          code: order.id,
          name: `REPARACIÓN: ${order.id} - ${order.deviceBrand || ''} ${order.deviceModel || ''}`,
          brand: order.deviceBrand || '',
          category: 'Servicio Técnico',
          stock: 1,
          minStock: 0,
          price: balanceDue,
          cost: balanceDue,
        };
        basket.push({ item: tempItem, quantity: 1 });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      localStorage.setItem('pos_active_basket_v1', JSON.stringify(basket));
      localStorage.setItem('pos_redirect_toast', `🔧 ${addedCount} órdenes del lote agregadas al carrito.`);
    } else {
      localStorage.setItem('pos_redirect_toast', `⚠️ Las órdenes del lote ya estaban en el carrito.`);
    }

    setBatchCheckoutModal(null);
    setActiveTab('POS');
  };

  const [checkoutOrder, setCheckoutOrder] = useState<RepairOrder | null>(null);
  const siblingCheckoutOrders = checkoutOrder?.batchId ? orders.filter(x => x.batchId === checkoutOrder.batchId) : [];
  const isCheckoutGroupMember = siblingCheckoutOrders.length > 1;
  const checkoutGroupTotalCost = isCheckoutGroupMember ? siblingCheckoutOrders.reduce((sum, x) => sum + x.cost, 0) : 0;
  const checkoutGroupAdvance = isCheckoutGroupMember ? (checkoutOrder?.batchAdvancePayment || 0) : 0;
  const proportionalCheckoutAdvance = checkoutOrder ? getIndividualAdvance(checkoutOrder) : 0;

  const effectiveCheckoutCost = checkoutOrder?.cost || 0;
  const effectiveCheckoutAdvance = proportionalCheckoutAdvance;
  const effectiveCheckoutRemainingDue = Math.max(0, effectiveCheckoutCost - effectiveCheckoutAdvance);
  const [checkoutPaymentAmounts, setCheckoutPaymentAmounts] = useState<PaymentAmounts>({ 'Efectivo': '' });
  const [checkoutStep, setCheckoutStep] = useState<'summary' | 'ticket'>('summary');
  const [shouldPrintTicket, setShouldPrintTicket] = useState<boolean>(true);
  const [sendWhatsappOnCheckout, setSendWhatsappOnCheckout] = useState<boolean>(false);



  const [showDeliverConfirm, setShowDeliverConfirm] = useState(false);
  // Legacy aliases para compatibilidad con código existente que aún usa estas variables
  const checkoutPaymentMethod = (Object.keys(checkoutPaymentAmounts)[0] || 'Efectivo') as PayMethod;
  const cashReceived = checkoutPaymentAmounts['Efectivo'] || '';

  // State to show the change to deliver to the client with auto-close in 10 seconds
  const [changeToDisplay, setChangeToDisplay] = useState<{
    visible: boolean;
    amount: number;
    isRefund: boolean;
    clientName: string;
  }>({
    visible: false,
    amount: 0,
    isRefund: false,
    clientName: '',
  });

  const [countdown, setCountdown] = useState(10);

  // State for print confirmation dialog
  const [printConfirmOrder, setPrintConfirmOrder] = useState<RepairOrder | null>(null);
  const [printConfirmBatch, setPrintConfirmBatch] = useState<{ batchId: string; batchOrders: RepairOrder[] } | null>(null);
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [printLabelStatus, setPrintLabelStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [printWarrantyStatus, setPrintWarrantyStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [printDeliveryStatus, setPrintDeliveryStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [whatsappChoiceOrder, setWhatsappChoiceOrder] = useState<RepairOrder | null>(null);
  const [whatsappChoiceBatch, setWhatsappChoiceBatch] = useState<{ batchId: string; batchOrders: RepairOrder[] } | null>(null);
  // batchId para regresar al modal de grupo tras imprimir
  const [printReturnBatchId, setPrintReturnBatchId] = useState<string | null>(null);
  const [printLabelBatchPos, setPrintLabelBatchPos] = useState<{ position: number; total: number } | null>(null);

  const handleFinalizeCheckout = async () => {
    if (!checkoutOrder) return;
    setShowDeliverConfirm(false);

    const isRefund = checkoutOrder.status === 'Fallido';
    let changeAmt = 0;
    if (isRefund) {
      changeAmt = effectiveCheckoutAdvance;
    } else {
      const remainingDue = effectiveCheckoutRemainingDue;
      changeAmt = changeAmount(checkoutPaymentAmounts, remainingDue);
    }

    setChangeToDisplay({
      visible: sendWhatsappOnCheckout ? false : changeAmt > 0,
      amount: changeAmt,
      isRefund,
      clientName: checkoutOrder.customerName,
    });



    onDeliverOrder(
      checkoutOrder.id,
      Number(checkoutPaymentAmounts['Efectivo']) || 0,
      (Number(checkoutPaymentAmounts['Tarjeta']) || 0) + (Number(checkoutPaymentAmounts['Transferencia']) || 0)
    );

    // Construir ticketHtml y variables necesarias
    const currSym = config.currencySymbol || '$';
    const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
    const policies = config.termsAndConditionsService || config.termsAndConditions || '';
    const paperWidth = config.ticketPaperWidth || '80mm';
    const offset = config.ticketMarginOffset || 0;
    const is58 = paperWidth === '58mm';
    const isMediaCarta = paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado' || config.hybridPrintMode;
    const isMediaCartaDuplicado = paperWidth === 'media-carta-duplicado' || config.hybridPrintMode;
    const rightPad = isMediaCarta ? '6mm' : (is58 ? '8mm' : '6mm');
    const leftPad = isMediaCarta ? '6mm' : (is58 ? '3mm' : '5mm');
    const pageSizeCss = isMediaCartaDuplicado ? '210mm 297mm' : isMediaCarta ? '216mm 140mm' : `${paperWidth} auto`;
    const pageMarginCss = isMediaCarta ? '0' : '2mm 1mm';
    const dateStr = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const balance = effectiveCheckoutRemainingDue;
    const isWarranty = !!(checkoutOrder.warrantyOf && checkoutOrder.warrantyOf.trim() !== '');
    const storePhoneFormatted = config.phone
      ? config.phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || config.phone
      : '';
    const storeLogoHtml = config.mediaCartaLogoUrl
      ? `<img src="${config.mediaCartaLogoUrl}" onload="(function(img){
          var ratio = img.naturalWidth / img.naturalHeight;
          if (ratio > 1.4) {
            img.style.maxWidth = '75mm';
            img.style.maxHeight = '28mm';
          } else {
            img.style.maxWidth = '42mm';
            img.style.maxHeight = '24mm';
          }
        })(this)" style="max-height: 20mm; max-width: 45mm; object-fit: contain; display: block;" />`
      : '';
    const customerPhoneStr = checkoutOrder.customerPhone
      ? formatCustomerPhoneWithCountryCode(checkoutOrder.customerPhone, checkoutOrder.customerCountryCode)
      : 'N/A';
    const deviceTypeStr = checkoutOrder.deviceType === 'Phone' ? 'CELULAR' : (checkoutOrder.deviceType || '').toUpperCase();
    const cleanFault = (checkoutOrder.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();

    const paymentBreakdownHtml = Object.entries(checkoutPaymentAmounts)
      .filter(([, v]) => Number(v) > 0)
      .map(([m, v]) => `<div class="total-row" style="font-size: 9px;"><span class="data-label">${m}:</span><span class="data-value">${currSym}${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`)
      .join('');

    const code128Script = getBarcodeScript(checkoutOrder.id, config.barcodeAsImage);

    const innerContent = `
  <div>
    <table class="header-table">
      <tr>
        ${storeLogoHtml ? `
          <td class="header-cell" style="width: 40%; vertical-align: middle;">${storeLogoHtml}</td>
          <td class="header-cell" style="width: 60%; padding-left: 10px; text-align: center; vertical-align: middle;">
            <div class="store-title" style="font-size: 16px;">${config.storeName || 'SOPORTE TÉCNICO'}</div>
        ` : `
          <td class="header-cell" style="width: 100%; text-align: center; vertical-align: middle;">
            <div class="store-title" style="font-size: 24px; margin-bottom: 4px;">${config.storeName || 'SOPORTE TÉCNICO'}</div>
        `}
            <div class="store-details">
              ${config.slogan ? `<i>"${config.slogan}"</i><br>` : ''}
              ${config.address ? `Dirección: ${config.address}<br>` : ''}
              ${storePhoneFormatted ? `Tel: ${storePhoneFormatted}` : ''}
            </div>
          </td>
      </tr>
    </table>
    <table style="width: 100%; margin-bottom: 8px;">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 5px;">
          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
            <div class="grid-title">${isWarranty ? 'ENTREGA POR GARANTÍA' : isRefund ? 'REEMBOLSO DE SERVICIO' : 'COMPROBANTE DE ENTREGA'}</div>
            <div class="grid-body">
              <div class="data-row"><span class="data-label">Folio/Orden:</span><span class="data-value">#${checkoutOrder.id}</span></div>
              ${isWarranty ? `<div class="data-row"><span class="data-label">Garantía de Orden:</span><span class="data-value">#${checkoutOrder.warrantyOf}</span></div>` : ''}
              <div class="data-row"><span class="data-label">Fecha Entrega:</span><span class="data-value">${dateStr}</span></div>
              ${!isPersonalMode && checkoutOrder.assignedTechnician ? `<div class="data-row"><span class="data-label">Técnico:</span><span class="data-value">${checkoutOrder.assignedTechnician}</span></div>` : ''}
            </div>
          </div>
        </td>
        <td style="width: 50%; vertical-align: top; padding-left: 5px;">
          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
            <div class="grid-title">Datos del Cliente</div>
            <div class="grid-body">
              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">${checkoutOrder.customerName.toUpperCase()}</span></div>
              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">${customerPhoneStr}</span></div>
            </div>
          </div>
        </td>
      </tr>
    </table>
    <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
      <div class="grid-title">Detalles del Dispositivo Entregado</div>
      <div style="padding: 6px;">
        <div class="data-row"><span class="data-label">Marca / Modelo:</span><span class="data-value">${checkoutOrder.deviceBrand} ${checkoutOrder.deviceModel}</span></div>
        ${checkoutOrder.deviceModelNumber ? `<div class="data-row"><span class="data-label">Modelo Técnico:</span><span class="data-value">${checkoutOrder.deviceModelNumber}</span></div>` : ''}
        <div class="data-row"><span class="data-label">Tipo:</span><span class="data-value">${deviceTypeStr}</span></div>
        ${checkoutOrder.receivedAccessories && checkoutOrder.receivedAccessories.length > 0
          ? `<div class="data-row"><span class="data-label">Accesorios Devueltos:</span><span class="data-value">${checkoutOrder.receivedAccessories.join(', ')}</span></div>`
          : ''
        }
      </div>
    </div>
    <table class="items-table">
      <thead><tr><th style="width: 75%;">Servicio & Falla Entregada</th><th style="width: 25%; text-align: right;">Costo</th></tr></thead>
      <tbody><tr>
        <td>
          <div style="font-weight: 900; font-size: 11px; text-transform: uppercase;">${checkoutOrder.serviceType}</div>
          <div style="margin-top: 3px; font-weight: 500; font-size: 9px; color: #334155;"><b>FALLA INICIAL:</b> ${cleanFault.toUpperCase()}</div>
          ${checkoutOrder.diagnosticsNote ? `<div style="margin-top: 3px; border-top: 1px dashed #cbd5e1; padding-top: 3px; font-size: 8.5px; font-weight: 500; color: #475569;"><b>NOTAS TÉCNICAS DE CIERRE:</b> ${checkoutOrder.diagnosticsNote}</div>` : ''}
        </td>
        <td style="text-align: right; font-weight: 900; font-size: 11px; vertical-align: middle;">${currSym}${(isCheckoutGroupMember ? effectiveCheckoutCost : checkoutOrder.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr></tbody>
    </table>
  </div>
  <div>
    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">
      <tr>
        <td style="width: 55%; vertical-align: top; padding-right: 12px;">
          ${policies ? `<div class="policies-box" style="margin-top: 0; margin-bottom: 6px;"><b>PÓLIZA DE GARANTÍA:</b> ${policies}</div>` : ''}
          <table class="signatures-table" style="width: 100%; margin-top: 4px; margin-bottom: 0;">
            <tr>
              <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma de Recibido del Cliente</div></td>
              <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>
            </tr>
          </table>
        </td>
        <td style="width: 45%; vertical-align: top;">
          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">
            ${isWarranty
              ? `<div class="total-row" style="font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; border-radius: 2px; text-align: center; text-transform: uppercase;">GARANTÍA ✓</div>`
              : `
                <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">${currSym}${(isCheckoutGroupMember ? effectiveCheckoutCost : checkoutOrder.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-${currSym}${effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                ${isRefund
                  ? `<div class="total-row grand-total"><span class="data-label">REEMBOLSO:</span><span class="data-value">${currSym}${effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`
                  : `
                    <div class="total-row grand-total"><span class="data-label">A COBRAR:</span><span class="data-value">${currSym}${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    ${paymentBreakdownHtml}
                    ${changeAmt > 0 ? `<div class="total-row" style="font-size: 9px; font-weight: bold;"><span class="data-label">CAMBIO:</span><span class="data-value">${currSym}${changeAmt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
                  `
                }
              `
            }
          </div>
        </td>
      </tr>
    </table>
    <div style="text-align: center; border-top: 1px dashed #94a3b8; padding-top: 4px; margin-top: 6px;">
      <div class="bc-target" id="bc" style="margin: 0 auto; display: flex; justify-content: center;"></div>
      <div style="font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ${checkoutOrder.id} *</div>
      <div class="footer-text" style="font-size: 9px; font-weight: 900; margin-top: 3px; color: #000;">${footer}</div>
    </div>
  </div>
`;

    const ticketHtml = isMediaCarta
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @page { size: ${isMediaCartaDuplicado ? '210mm 297mm' : '216mm 140mm'}; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #000; background: #fff; line-height: 1.35; padding: 0; margin: 0; }
  .invoice-container { width: 100%; height: 128mm; max-height: 128mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .header-cell { vertical-align: top; }
  .store-title { font-size: 16px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }
  .store-details { font-size: 9px; font-weight: 600; color: #333; margin-top: 3px; }
  .grid-title { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 3px 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid-body { padding: 6px; }
  .data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0; }
  .data-row:last-child { border-bottom: none; }
  .data-label { font-weight: 700; color: #475569; }
  .data-value { font-weight: 700; color: #000; text-align: right; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000; }
  .items-table th { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 4px 6px; text-transform: uppercase; text-align: left; }
  .items-table td { padding: 6px; border-bottom: 1px solid #cbd5e1; font-size: 10.5px; vertical-align: top; }
  .totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 6px; background: #fafaf9; }
  .total-row { display: flex; justify-content: space-between; padding: 2.5px 0; font-size: 10.5px; }
  .total-row.grand-total { font-size: 12px; font-weight: 900; background: #000; color: #fff; padding: 4px; margin-top: 3px; border-radius: 2px; }
  .policies-box { font-size: 7px; color: #475569; line-height: 1.3; border: 1px solid #e2e8f0; padding: 4px 6px; background: #f8fafc; border-radius: 4px; margin-top: 4px; margin-bottom: 8px; word-break: break-all; overflow-wrap: break-word; }
  .signatures-table { width: 100%; margin-top: 15px; margin-bottom: 10px; }
  .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 2px; font-size: 8px; font-weight: 700; text-align: center; text-transform: uppercase; }
  .footer-text { font-size: 9px; font-weight: 900; text-align: center; margin-top: 3px; color: #000; }
</style></head><body>
${isMediaCartaDuplicado ? `
  <div style="height: 140mm; display: flex; flex-direction: column; justify-content: space-between; padding: 6mm 8mm 0 8mm; box-sizing: border-box;">
    <div class="invoice-container">
      ${innerContent}
    </div>
  </div>
  <hr style="border: none; border-top: 1.5px dashed #000; margin: 0;">
  <div style="height: 140mm; display: flex; flex-direction: column; justify-content: space-between; padding: 6mm 8mm 0 8mm; box-sizing: border-box;">
    <div class="invoice-container">
      ${innerContent}
    </div>
  </div>
` : `
  <div style="padding: 6mm 8mm 0 8mm;">
    <div class="invoice-container">
      ${innerContent}
    </div>
  </div>
`}
<script>${code128Script}</script>
</body></html>`
      : `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: ${pageSizeCss}; margin: ${pageMarginCss}; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : '13'}px; font-weight: 700; width: 100%; margin: 0; padding: 2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px); color: #000; background: #fff; }
  .center { text-align: center; } .bold { font-weight: 900; }
  .store { font-size: 15px; font-weight: 900; text-align: center; margin-bottom: 1px; }
  hr { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }
  .kv { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 10px; margin: 1px 0; }
  .kv-val { text-align: right; flex: 1; min-width: 0; word-break: break-word; font-weight: 900; margin-left: 8px; }
  .badge { display: block; font-weight: 950; text-align: center; font-size: 11px; background: #000 !important; color: #fff !important; padding: 5px 0 !important; margin: 3.5px 0; letter-spacing: 1px; line-height: 1.25 !important; height: auto !important; }
  .total-row { font-size: 13px; font-weight: 900; text-align: right; border-top: 2px solid #000; margin-top: 4px; padding-top: 2px; }
  .footer { font-size: 10px; font-weight: 700; text-align: center; margin-top: 5px; }
  .policies { font-size: 10px; font-weight: 700; text-align: center; color: #000; margin-top: 3px; }
</style></head><body>
  ${buildTicketHeaderHtml(config, paperWidth)}
  <hr>
  <div class="badge">${isWarranty ? 'ENTREGA POR GARANTÍA' : isRefund ? 'COMPROBANTE DE REEMBOLSO' : 'COMPROBANTE DE ENTREGA'}</div>
  <div class="kv"><span>ORDEN:</span><span class="kv-val">${checkoutOrder.id}</span></div>
  ${isWarranty ? `<div class="kv"><span>GARANTÍA DE ORDEN:</span><span class="kv-val">${checkoutOrder.warrantyOf}</span></div>` : ''}
  <div class="kv"><span>FECHA:</span><span class="kv-val">${dateStr}</span></div>
  <div class="kv"><span>CLIENTE:</span><span class="kv-val">${checkoutOrder.customerName}</span></div>
  ${checkoutOrder.customerPhone ? `<div class="kv"><span>TEL:</span><span class="kv-val">${formatCustomerPhoneWithCountryCode(checkoutOrder.customerPhone, checkoutOrder.customerCountryCode)}</span></div>` : ''}
  <div class="kv"><span>EQUIPO:</span><span class="kv-val">${checkoutOrder.deviceBrand} ${checkoutOrder.deviceModel}</span></div>
  <div class="kv"><span>SERVICIO:</span><span class="kv-val">${checkoutOrder.serviceType}</span></div>
  ${!isPersonalMode && checkoutOrder.assignedTechnician ? `<div class="kv"><span>TÉCNICO:</span><span class="kv-val">${checkoutOrder.assignedTechnician}</span></div>` : ''}
  ${checkoutOrder.receivedAccessories && checkoutOrder.receivedAccessories.length > 0
    ? `<div class="kv"><span>ACCESORIOS DEVUELTOS:</span><span class="bold">${checkoutOrder.receivedAccessories.join(', ')}</span></div>`
    : ''
  }
  <hr>
  ${isWarranty
    ? `<div class="kv"><span>COSTO DE SERVICIO:</span><span>${currSym}${(isCheckoutGroupMember ? effectiveCheckoutCost : checkoutOrder.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
       <div class="total-row" style="font-size:12px">CUBIERTO POR GARANTÍA ✓</div>`
    : `<div class="kv"><span>COSTO TOTAL:</span><span class="bold">${currSym}${(isCheckoutGroupMember ? effectiveCheckoutCost : checkoutOrder.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
       <div class="kv"><span>ANTICIPO:</span><span>${currSym}${effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
       ${isRefund
         ? `<div class="total-row">REEMBOLSO: ${currSym}${effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`
         : `<div class="total-row">COBRADO: ${currSym}${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            ${Object.entries(checkoutPaymentAmounts).filter(([,v]) => Number(v) > 0).map(([m,v]) => `<div class="kv"><span>${m}:</span><span>${currSym}${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`).join('')}
            ${changeAmt > 0 ? `<div class="kv"><span>CAMBIO:</span><span>${currSym}${changeAmt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}`
       }
    `
  }
  ${policies ? `<hr><div class="policies">${policies}</div>` : ''}
  <div class="footer">${footer}</div>
  <div style="text-align: center; border-top: 1px dashed #000; padding-top: 4px; margin-top: 6px;">
    <div class="bc-target" id="bc" style="margin: 0 auto; display: flex; justify-content: center;"></div>
    <div style="font-size: 8px; font-weight: 700; color: #000; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ${checkoutOrder.id} *</div>
  </div>
  <script>${code128Script}</script>
</body></html>`;

    // 2. Enviar por WhatsApp
    if (sendWhatsappOnCheckout && config.whatsappMode && config.whatsappMode !== 'disabled') {
      const statusToSend = checkoutOrder.isPaid || isCheckoutGroupMember ? 'Entregado y Pagado' : 'Entregado';
      const msg = buildWhatsappOrderStatusMessage(checkoutOrder, statusToSend, config);
      sendWhatsappNotification(config, checkoutOrder.customerPhone, msg, ticketHtml, undefined, changeAmt, checkoutOrder.customerCountryCode).then(res => {
        if (!res.ok) {
          console.warn('[WhatsApp] Error al enviar comprobante de entrega por WhatsApp:', res.error);
        }
      }).catch(err => {
        console.error('[WhatsApp] Error inesperado en WhatsApp de entrega:', err);
      });
    }

    // 3. Imprimir ticket físico si corresponde
    if (shouldPrintTicket) {
      try {
        const isWarranty = !!(checkoutOrder.warrantyOf && checkoutOrder.warrantyOf.trim() !== '');
        window.dispatchEvent(new CustomEvent('automated-print', {
          detail: {
            type: 'ticket',
            id: checkoutOrder.id,
            name: isWarranty
              ? `Entrega de Garantía ${checkoutOrder.id}`
              : isRefund
              ? `Reembolso de Anticipo ${checkoutOrder.id}`
              : `Comprobante de Entrega ${checkoutOrder.id}`,
            details: isWarranty
              ? `Cliente: ${checkoutOrder.customerName} • Cubierto por garantía`
              : isRefund
              ? `Cliente: ${checkoutOrder.customerName} • Reembolso: ${config.currencySymbol}${effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `Cliente: ${checkoutOrder.customerName} • Liquidado: ${config.currencySymbol}${(isCheckoutGroupMember ? effectiveCheckoutCost - effectiveCheckoutAdvance : checkoutOrder.cost - checkoutOrder.advancePayment).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          }
        }));
      } catch {}

      const paperWidthMicrons = paperWidth === 'media-carta-duplicado'
        ? 210000
        : (config.hybridPrintMode || paperWidth === 'media-carta')
          ? 215900
          : paperWidth === '58mm'
            ? 48000
            : 72000;
      const paperHeightMicrons = paperWidth === 'media-carta-duplicado'
        ? 297000
        : config.hybridPrintMode
          ? 279400
          : paperWidth === 'media-carta'
            ? 139700
            : undefined;
      fmPrint({ html: ticketHtml, deviceName: config.ticketPrinterBrand || '', paperWidthMicrons, paperHeightMicrons, noToast: true, isLabel: false });
    }

    setCheckoutOrder(null);
    setCheckoutStep('summary');
  };

  React.useEffect(() => {
    let timer: any;
    let interval: any;
    if (changeToDisplay.visible) {
      setCountdown(10);
      
      interval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      timer = setTimeout(() => {
        setChangeToDisplay((prev) => ({ ...prev, visible: false }));
      }, 10000);
    }
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [changeToDisplay.visible]);

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (showDeliverConfirm && checkoutOrder) {
          handleFinalizeCheckout();
        } else if (checkoutOrder && checkoutStep === 'summary' && !showDeliverConfirm) {
          const remainingDue = Math.max(0, checkoutOrder.cost - getIndividualAdvance(checkoutOrder));
          const insufficientCash = remainingDue > 0 && totalPaid(checkoutPaymentAmounts) < remainingDue;
          if (!insufficientCash) setShowDeliverConfirm(true);
        }
      }
      if (e.key === 'Escape' && showDeliverConfirm) {
        setShowDeliverConfirm(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [checkoutOrder, checkoutStep, cashReceived, checkoutPaymentMethod, showDeliverConfirm]);

  // Settle active filter if changed externally
  React.useEffect(() => {
    if (initialFilterStatus && initialFilterStatus !== 'todos') {
      if (initialFilterStatus.startsWith('TKT-')) {
        setSearchTerm(initialFilterStatus);
        setActiveFilter('todos');
      } else {
        setActiveFilter(initialFilterStatus);
      }
      // Reset in parent to prevent sticky state on tab switches
      if (setOrderFilter) {
        setOrderFilter('todos');
      }
    }
  }, [initialFilterStatus, setOrderFilter]);

  // Si se selecciona un ID de orden desde otra vista
  React.useEffect(() => {
    if (selectedOrderId && selectedOrderId.startsWith('TKT-')) {
      setSelectedOrderIdLocal(selectedOrderId);
      setActiveFilter('todos');
      // Reset in parent to prevent sticky state on tab switches
      if (setSelectedOrderId) {
        setSelectedOrderId(null);
      }
    }
  }, [selectedOrderId, setSelectedOrderId]);

  // Si la orden seleccionada localmente ya no existe en la base de datos local, la deseleccionamos para evitar paneles en blanco
  React.useEffect(() => {
    if (selectedOrderIdLocal && !selectedOrderIdLocal.startsWith('BATCH-') && orders.length > 0) {
      const exists = orders.some(o => o.id === selectedOrderIdLocal);
      if (!exists) {
        setSelectedOrderIdLocal(null);
      }
    }
  }, [orders, selectedOrderIdLocal]);

  const filteredOrders = orders.filter((order) => {
    const cleanSearch = searchTerm.replace(/,(?!\s)/g, '-');
    const textMatch =
      order.id.toLowerCase().includes(cleanSearch.toLowerCase()) ||
      order.customerName.toLowerCase().includes(cleanSearch.toLowerCase()) ||
      order.deviceBrand.toLowerCase().includes(cleanSearch.toLowerCase()) ||
      order.deviceModel.toLowerCase().includes(cleanSearch.toLowerCase()) ||
      order.faultDescription.toLowerCase().includes(cleanSearch.toLowerCase());

    const isDeliveredStatus = order.status === 'Entregado' || order.status === 'Entregado y Pagado' || order.status === 'Cancelado';
    if (hideDelivered && isDeliveredStatus && activeFilter === 'todos') return false;

    if (activeFilter === 'todos') return textMatch;
    if (activeFilter === 'Pendiente') return textMatch && (order.status === 'Pendiente' || order.status === 'Diagnóstico');
    if (activeFilter === 'En Proceso') return textMatch && order.status === 'En Reparación';
    if (activeFilter === 'Listo') return textMatch && (order.status === 'Listo' || order.status === 'Fallido');
    if (activeFilter === 'Entregado') return textMatch && isDeliveredStatus;
    if (activeFilter === 'Grupales') { const batchOrders = orders.filter(o => o.batchId === order.batchId); return textMatch && !!order.batchId && batchOrders.length > 1; }

    return textMatch;
  }).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  // Agrupar órdenes filtradas: los grupos van como una entrada, las individuales como otra
  type DisplayItem =
    | { kind: 'single'; order: RepairOrder }
    | { kind: 'batch'; batchId: string; batchOrders: RepairOrder[] };

  const displayItems: DisplayItem[] = useMemo(() => {
    const seenBatch = new Set<string>();
    const items: DisplayItem[] = [];
    for (const order of filteredOrders) {
      if (order.batchId) {
        if (!seenBatch.has(order.batchId)) {
          seenBatch.add(order.batchId);
          const batchOrders = orders.filter(o => o.batchId === order.batchId);
          if (batchOrders.length > 1) {
            items.push({ kind: 'batch', batchId: order.batchId, batchOrders });
          } else {
            items.push({ kind: 'single', order });
          }
        }
      } else {
        items.push({ kind: 'single', order });
      }
    }
    return items;
  }, [filteredOrders, orders]);

  const getBatchSaldo = (batchOrders: RepairOrder[]) => {
    if (batchOrders.length === 0) return 0;
    const totalAdvance = batchOrders[0]?.batchAdvancePayment || 0;
    const advances = getProportionalAdvances(batchOrders, totalAdvance);
    return batchOrders.reduce((sum, o) => {
      const isDelivered = o.status === 'Entregado' || o.status === 'Entregado y Pagado' || o.status === 'Cancelado';
      if (isDelivered) return sum;
      const adv = advances[o.id] || 0;
      return sum + Math.max(0, o.cost - adv);
    }, 0);
  };

  const getBatchStatus = (batchOrders: RepairOrder[]) => {
    const statuses = batchOrders.map(o => o.status);
    if (statuses.every(s => s === 'Entregado y Pagado')) return 'Entregado y Pagado';
    if (statuses.some(s => s === 'Listo')) return 'Listo';
    if (statuses.some(s => s === 'En Reparación')) return 'En Reparación';
    return 'Pendiente';
  };

  // Devuelve conteos por estado para mostrar breakdown en la vista comprimida del grupo
  const getBatchStatusBreakdown = (batchOrders: RepairOrder[]) => {
    const counts: Partial<Record<RepairOrder['status'], number>> = {};
    for (const o of batchOrders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  };

  const getStatusInlineStyle = (status: RepairOrder['status']): { background: string; color: string } => {
    switch (status) {
      case 'Pendiente':         return { background: '#d97706', color: '#ffffff' };
      case 'Diagnóstico':      return { background: '#6d28d9', color: '#ffffff' };
      case 'En Reparación':    return { background: '#1d4ed8', color: '#ffffff' };
      case 'Listo':            return { background: '#dc2626', color: '#ffffff' };
      case 'Fallido':          return { background: '#ea580c', color: '#ffffff' };
      case 'Entregado':
      case 'Entregado y Pagado': return { background: '#065f46', color: '#ffffff' };
      case 'Cancelado':        return { background: '#71717a', color: '#ffffff' };
      default:                  return { background: '#3f3f46', color: '#ffffff' };
    }
  };

  const getStatusBadge = (status: RepairOrder['status']) => {
    if (isRetro) {
      if (isLight) {
        switch (status) {
          case 'Pendiente':
            return 'bg-amber-100 border-2 border-amber-600 text-amber-950 font-black';
          case 'Diagnóstico':
            return 'bg-purple-100 border-2 border-purple-600 text-purple-950 font-black';
          case 'En Reparación':
            return 'bg-blue-100 border-2 border-blue-600 text-[#000080] font-black';
          case 'Listo':
            return 'bg-[#dc2626] font-extrabold text-[#ffffff] retro-white-text border-2 border-red-700 shadow-sm';
          case 'Fallido':
            return 'bg-red-100 border-2 border-red-500 text-red-950 font-black';
          case 'Cancelado':
            return 'bg-zinc-200 border-2 border-zinc-500 text-zinc-500 font-bold line-through';
          case 'Entregado':
          case 'Entregado y Pagado':
            return 'bg-emerald-150 border-2 border-emerald-600 text-emerald-950 font-black';
          default:
            return 'bg-zinc-200 border-2 border-zinc-500 text-zinc-900';
        }
      } else {
        // Retro Dark Mode Status Badges: Bevel 3D, solid deep colors, white/light text (no pastels!)
        switch (status) {
          case 'Pendiente':
            return 'bg-[#3b2e1b] border-2 border-t-[#78350f] border-l-[#78350f] border-b-[#fbbf24]/20 border-r-[#fbbf24]/20 text-[#fbbf24] font-black';
          case 'Diagnóstico':
            return 'bg-[#2e1065] border-2 border-t-[#581c87] border-l-[#581c87] border-b-[#c084fc]/20 border-r-[#c084fc]/20 text-[#c084fc] font-black';
          case 'En Reparación':
            return 'bg-[#000080] border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a] text-white font-black';
          case 'Listo':
            return 'bg-[#dc2626] font-extrabold text-[#ffffff] retro-white-text border-2 border-red-700 shadow-sm';
          case 'Fallido':
            return 'bg-[#4c0519] border-2 border-t-[#9f1239] border-l-[#9f1239] border-b-[#f43f5e]/20 border-r-[#f43f5e]/20 text-[#f43f5e] font-black';
          case 'Cancelado':
            return 'bg-[#24252c] border-2 border-t-[#383c48] border-l-[#383c48] border-b-[#111317] border-r-[#111317] text-zinc-500 font-bold line-through';
          case 'Entregado':
          case 'Entregado y Pagado':
            return 'bg-[#064e3b] border-2 border-t-[#065f46] border-l-[#065f46] border-b-[#34d399]/20 border-r-[#34d399]/20 text-[#34d399] font-black';
          default:
            return 'bg-[#24252c] border-2 border-t-[#383c48] border-l-[#383c48] border-b-[#111317] border-r-[#111317] text-zinc-300';
        }
      }
    }
    if (isLight) {
      switch (status) {
        case 'Pendiente':
          return 'bg-zinc-100 border border-zinc-350 text-zinc-600';
        case 'Diagnóstico':
          return 'bg-purple-50 border border-purple-300 text-purple-800';
        case 'En Reparación':
          return 'bg-amber-50 border border-amber-300 text-amber-950 font-semibold';
        case 'Listo':
          return 'bg-[#dc2626] text-white font-bold border border-red-700 shadow-sm';
        case 'Fallido':
          return 'bg-red-50 border border-red-300 text-red-800 font-bold';
        case 'Cancelado':
          return 'bg-zinc-50 border border-zinc-300 text-zinc-500 font-bold line-through';
        case 'Entregado':
        case 'Entregado y Pagado':
          return 'bg-emerald-50 border border-emerald-300 text-emerald-805';
        default:
          return 'bg-zinc-100 border border-zinc-350 text-zinc-800';
      }
    }
    switch (status) {
      case 'Pendiente':
        return 'bg-zinc-800 border border-zinc-700 text-zinc-300';
      case 'Diagnóstico':
        return 'bg-purple-950/40 border border-purple-800/60 text-purple-400';
      case 'En Reparación':
        return 'bg-amber-950/40 border border-amber-800/60 text-amber-500';
      case 'Listo':
        return 'bg-[#dc2626] text-white font-bold border border-red-700 shadow-[0_0_10px_rgba(220,38,38,0.5)]';
      case 'Fallido':
        return 'bg-red-950/40 border border-red-800/60 text-red-500 font-bold';
      case 'Cancelado':
        return 'bg-red-950/20 border border-red-900/40 text-red-500/80 font-bold line-through';
      case 'Entregado':
      case 'Entregado y Pagado':
        return 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-400';
      default:
        return 'bg-zinc-800 text-zinc-300';
    }
  };

  const handlePreviewOrder = (order: RepairOrder) => {
    if (order.status === 'Entregado' || order.status === 'Entregado y Pagado') {
      setPreviewChoiceOrder(order);
      return;
    }
    setPreviewTicketType('service');
    setPreviewOrderForModal(order);
  };

  const handlePrint = (order: RepairOrder) => {
    const enriched = {
      ...order,
      deviceModelNumber: order.deviceModelNumber || getCatalogModelNumber(order.deviceBrand, order.deviceModel)
    };
    setPrintConfirmOrder(enriched);
    setPrintStatus('idle');
    setPrintLabelStatus('idle');
  };

  const handleConfirmPrint = async () => {
    if (!printConfirmOrder) { setPrintConfirmOrder(null); return; }
    const order = printConfirmOrder;
    setPrintStatus('printing');

    // Dispatch automated-print event (triggers notification in App.tsx)
    try {
      const printEvent = new CustomEvent('automated-print', {
        detail: {
          type: 'ticket',
          id: order.id,
          name: `Ticket de Servicio ${order.id}`,
          details: `Cliente: ${order.customerName} • ${order.deviceBrand} ${order.deviceModel}`,
          brand: config.printerInterface || 'Default',
          port: config.printerInterface || 'USB'
        }
      });
      window.dispatchEvent(printEvent);
    } catch (e) {}

    try {
      const ticketWidth = config.hybridPrintMode ? 'media-carta-duplicado' : (config.ticketPaperWidth || '80mm');
      const paperWidthMicrons = ticketWidth === 'media-carta-duplicado'
        ? 210000
        : (config.hybridPrintMode || ticketWidth === 'media-carta')
          ? 215900
          : ticketWidth === '58mm'
            ? 48000
            : 72000;
      const paperHeightMicrons = ticketWidth === 'media-carta-duplicado'
        ? 297000
        : config.hybridPrintMode
          ? 279400
          : ticketWidth === 'media-carta'
            ? 139700
            : undefined;
      const ticketHtml = buildTicketHtml(order, config, config.duplexManual ? 'front' : undefined);
      fmPrint({
        html: ticketHtml,
        deviceName: config.ticketPrinterBrand || '',
        paperWidthMicrons,
        paperHeightMicrons,
        noToast: true,
        isLabel: false,
        isServiceTicket: true,
        order
      } as any);
      setPrintStatus('success');
      
      const userLogStr = currentUser?.name || 'Administrador';
      const logEntry = {
        action: 'IMPRESIÓN TICKET',
        user: userLogStr,
        timestamp: new Date().toISOString()
      };
      onUpdateOrder({
        ...order,
        activityLog: [...(order.activityLog || []), logEntry]
      });
      
      const n = document.createElement('div');
      n.textContent = `✅ Enviando a imprimir: Ticket de Servicio (${ticketWidth})`;
      n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#16a34a;color:#fff;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3200);

      setTimeout(() => {
        setPrintConfirmOrder(null); setPrintStatus('idle');
        if (printReturnBatchId) { setSelectedOrderIdLocal(printReturnBatchId); setPrintReturnBatchId(null); }
      }, 1200);
    } catch (err) {
      setPrintStatus('error');
      setTimeout(() => { setPrintStatus('idle'); }, 2000);
    }
  };

  const handleConfirmPrintLabel = async () => {
    if (!printConfirmOrder) return;
    const order = printConfirmOrder;
    setPrintLabelStatus('printing');

    window.dispatchEvent(new CustomEvent('automated-print', {
      detail: { type: 'label', id: order.id, name: `Etiqueta de Servicio ${order.id}`, details: `Cliente: ${order.customerName} • ${order.deviceBrand} ${order.deviceModel}` }
    }));

    try {
      const html = buildServiceLabelHtml(order, config, printLabelBatchPos?.position, printLabelBatchPos?.total);
      
      const sizeKey = config.labelPaperSize || '51x25mm';
      const [widthMm, heightMm] = sizeKey.replace('mm', '').split('x').map(Number);
      const paperWidthMicrons = widthMm * 1000;
      const paperHeightMicrons = heightMm * 1000;

      fmPrint({
        html,
        deviceName: config.labelPrinterBrand || '',
        copies: config.printLabelCopies || 1,
        isLabel: true,
        noToast: true,
        paperWidthMicrons,
        paperHeightMicrons
      });
      setPrintLabelStatus('success');

      const userLogStr = currentUser?.name || 'Administrador';
      const logEntry = {
        action: 'IMPRESIÓN ETIQUETA',
        user: userLogStr,
        timestamp: new Date().toISOString()
      };
      onUpdateOrder({
        ...order,
        activityLog: [...(order.activityLog || []), logEntry]
      });

      const n = document.createElement('div');
      n.textContent = `✅ Enviando a imprimir: Etiqueta de Servicio (${sizeKey})`;
      n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#16a34a;color:#fff;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3200);

      setTimeout(() => {
        setPrintLabelStatus('idle'); setPrintConfirmOrder(null); setPrintLabelBatchPos(null);
        if (printReturnBatchId) { setSelectedOrderIdLocal(printReturnBatchId); setPrintReturnBatchId(null); }
      }, 1200);
    } catch (err) {
      setPrintLabelStatus('error');
      setTimeout(() => setPrintLabelStatus('idle'), 2000);
    }
  };

  const handleConfirmPrintWarrantyLabel = async () => {
    if (!printConfirmOrder) return;
    const order = printConfirmOrder;
    setPrintWarrantyStatus('printing');

    window.dispatchEvent(new CustomEvent('automated-print', {
      detail: { type: 'label', id: order.id, name: `Etiqueta de Garantía ${order.id}`, details: `Cliente: ${order.customerName} • ${order.deviceBrand} ${order.deviceModel}` }
    }));

    try {
      const serviceTypeLower = (order.serviceType || '').trim().toLowerCase();
      let serviceRepetitionCount = 1;
      if (serviceTypeLower) {
        const matchingOrders = orders.filter(o => 
          o.serviceType && o.serviceType.trim().toLowerCase() === serviceTypeLower
        );
        matchingOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const index = matchingOrders.findIndex(o => o.id === order.id);
        serviceRepetitionCount = index !== -1 ? index + 1 : matchingOrders.length;
      }
      const html = buildWarrantyLabelHtml(order, config, serviceRepetitionCount);
      const sizeKey = config.labelPaperSize || '51x25mm';
      const [widthMm, heightMm] = sizeKey.replace('mm', '').split('x').map(Number);
      const paperWidthMicrons = widthMm * 1000;
      const paperHeightMicrons = heightMm * 1000;

      fmPrint({
        html,
        deviceName: config.labelPrinterBrand || '',
        copies: config.printLabelCopies || 1,
        isLabel: true,
        noToast: true,
        paperWidthMicrons,
        paperHeightMicrons
      });
      setPrintWarrantyStatus('success');

      const userLogStr = currentUser?.name || 'Administrador';
      const logEntry = {
        action: 'IMPRESIÓN SELLO GARANTÍA',
        user: userLogStr,
        timestamp: new Date().toISOString()
      };
      onUpdateOrder({
        ...order,
        activityLog: [...(order.activityLog || []), logEntry]
      });

      const n = document.createElement('div');
      n.textContent = `✅ Enviando a imprimir: Sello de Garantía (${sizeKey})`;
      n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#16a34a;color:#fff;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3200);

      setTimeout(() => {
        setPrintWarrantyStatus('idle'); setPrintConfirmOrder(null);
        if (printReturnBatchId) { setSelectedOrderIdLocal(printReturnBatchId); setPrintReturnBatchId(null); }
      }, 1200);
    } catch (err) {
      setPrintWarrantyStatus('error');
      setTimeout(() => setPrintWarrantyStatus('idle'), 2000);
    }
  };

  const handleConfirmPrintBatch = async () => {
    if (!printConfirmBatch) return;
    const { batchOrders } = printConfirmBatch;
    const first = batchOrders[0];
    if (!first) { setPrintConfirmBatch(null); return; }
    
    setPrintStatus('printing');
    
    try {
      const ticketWidth = config.hybridPrintMode ? 'media-carta-duplicado' : (config.ticketPaperWidth || '80mm');
      const paperWidthMicrons = ticketWidth === 'media-carta-duplicado'
        ? 210000
        : (config.hybridPrintMode || ticketWidth === 'media-carta')
          ? 215900
          : ticketWidth === '58mm'
            ? 48000
            : 72000;
      const paperHeightMicrons = ticketWidth === 'media-carta-duplicado'
        ? 297000
        : config.hybridPrintMode
          ? 279400
          : ticketWidth === 'media-carta'
            ? 139700
            : undefined;
      const enrichedBatchOrders = batchOrders.map(o => ({
        ...o,
        deviceModelNumber: o.deviceModelNumber || getCatalogModelNumber(o.deviceBrand, o.deviceModel)
      }));
      const html = (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado')
        ? buildConsolidatedTicketHtml(enrichedBatchOrders, config, config.duplexManual ? 'front' : undefined)
        : buildConsolidatedTicketHtml(enrichedBatchOrders, config);
      
      fmPrint({ 
        html, 
        deviceName: config.ticketPrinterBrand || '', 
        paperWidthMicrons, 
        paperHeightMicrons,
        noToast: true, 
        isLabel: false,
        isBatchServiceTicket: config.hybridPrintMode || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado',
        orders: enrichedBatchOrders
      });
      
      setPrintStatus('success');

      const userLogStr = currentUser?.name || 'Administrador';
      const logEntry = {
        action: 'IMPRESIÓN TICKET CONSOLIDADO',
        user: userLogStr,
        timestamp: new Date().toISOString()
      };
      batchOrders.forEach(o => {
        onUpdateOrder({
          ...o,
          activityLog: [...(o.activityLog || []), logEntry]
        });
      });
      
      const n = document.createElement('div');
      n.textContent = `✅ Enviando a imprimir: Ticket Consolidado Grupal (${ticketWidth})`;
      n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#16a34a;color:#fff;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3200);

      setTimeout(() => {
        setPrintConfirmBatch(null);
        setPrintStatus('idle');
      }, 1200);
    } catch (err) {
      setPrintStatus('error');
      setTimeout(() => { setPrintStatus('idle'); }, 2000);
    }
  };

  const buildDeliveryTicketHtmlForOrder = (order: RepairOrder, customConfig: WorkshopConfig = config, page?: 'whatsapp' | 'print') => {
    const paperWidth = customConfig.ticketPaperWidth || '80mm';
    const is58 = paperWidth === '58mm';
    const isMediaCarta = paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado' || customConfig.hybridPrintMode;
    const isMediaCartaDuplicado = paperWidth === 'media-carta-duplicado' || customConfig.hybridPrintMode;
    const isStarTsp100 = customConfig.selectedPrinterProfileId === 'star-tsp100';
    const effectivePaperSize = isStarTsp100 ? '72mm' : paperWidth;
    const isWhatsappPage = page === 'whatsapp';
    const offset = isWhatsappPage ? 0 : (customConfig.ticketMarginOffset || 0);

    const rightPad = isMediaCarta ? '6mm' : (isWhatsappPage ? '4mm' : (isStarTsp100 ? '1mm' : (is58 ? '4mm' : '6mm')));
    const leftPad = isMediaCarta ? '6mm' : (isWhatsappPage ? '4mm' : (isStarTsp100 ? '1mm' : (is58 ? '4mm' : '5mm')));
    const bottomPad = is58 ? '2mm' : '4mm';

    const pageSizeCss = isMediaCartaDuplicado ? '210mm 297mm' : isMediaCarta ? '216mm 140mm' : `${effectivePaperSize} auto`;
    const pageMarginCss = isMediaCarta ? '0' : '0';
    const currSym = customConfig.currencySymbol || '$';
    const dateStr = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const isWarranty = !!(order.warrantyOf && order.warrantyOf.trim() !== '');
    const storePhoneFormatted = customConfig.phone
      ? customConfig.phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || customConfig.phone
      : '';
    const storeLogoHtml = customConfig.mediaCartaLogoUrl
      ? `<img src="${customConfig.mediaCartaLogoUrl}" style="max-height: 20mm; max-width: 45mm; object-fit: contain; display: block;" />`
      : '';
    const customerPhoneStr = order.customerPhone
      ? formatCustomerPhoneWithCountryCode(order.customerPhone, order.customerCountryCode)
      : 'N/A';
    const deviceTypeStr = order.deviceType === 'Phone' ? 'CELULAR' : (order.deviceType || '').toUpperCase();
    const cleanFault = (order.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();

    const code128Script = getBarcodeScript(order.id, customConfig.barcodeAsImage);
    const footer = customConfig.ticketFooter || '¡GRACIAS POR SU PREFERENCIA!';
    const policies = customConfig.termsAndConditionsService || customConfig.termsAndConditions || '';
    const isPersonalMode = customConfig.enableTaller === false;

    // Calcular metodos de pago dinamicos para anticipo y liquidacion
    let advancePaymentMethodStr = '';
    if (order.advancePayment > 0) {
      const breakdown = order.advancePaymentBreakdown || [];
      if (breakdown.length > 0) {
        advancePaymentMethodStr = ' (' + breakdown.map(b => b.method).join('+') + ')';
      } else {
        advancePaymentMethodStr = ' (Efectivo)';
      }
    }

    let liquidationPaymentMethodStr = '';
    const liquidationAmount = Math.max(0, order.cost - order.advancePayment);
    if (liquidationAmount > 0) {
      const cash = order.cashPaid || 0;
      const card = order.cardPaid || 0;
      if (cash > 0 && card > 0) {
        liquidationPaymentMethodStr = ' (Mixto - Efec+Tarj)';
      } else if (cash > 0) {
        liquidationPaymentMethodStr = ' (Efectivo)';
      } else if (card > 0) {
        liquidationPaymentMethodStr = ' (Tarjeta)';
      } else {
        liquidationPaymentMethodStr = ' (Efectivo)';
      }
    }

    const innerContent = `
<div>
  <table class="header-table">
    <tr>
      ${storeLogoHtml ? `
        <td class="header-cell" style="width: 40%; vertical-align: middle;">${storeLogoHtml}</td>
        <td class="header-cell" style="width: 60%; padding-left: 10px; text-align: center; vertical-align: middle;">
          <div class="store-title" style="font-size: 16px;">${customConfig.storeName || 'SOPORTE TÉCNICO'}</div>
      ` : `
        <td class="header-cell" style="width: 100%; text-align: center; vertical-align: middle;">
          <div class="store-title" style="font-size: 24px; margin-bottom: 4px;">${customConfig.storeName || 'SOPORTE TÉCNICO'}</div>
      `}
          <div class="store-details">
            ${customConfig.slogan ? `<i>"${customConfig.slogan}"</i><br>` : ''}
            ${customConfig.address ? `Dirección: ${customConfig.address}<br>` : ''}
            ${storePhoneFormatted ? `Tel: ${storePhoneFormatted}` : ''}
          </div>
        </td>
    </tr>
  </table>
  <table style="width: 100%; margin-bottom: 8px;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding-right: 5px;">
        <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
          <div class="grid-title">${isWarranty ? 'ENTREGA POR GARANTÍA' : 'COMPROBANTE DE ENTREGA'}</div>
          <div class="grid-body">
            <div class="data-row"><span class="data-label">Folio/Orden:</span><span class="data-value">#${order.id}</span></div>
            ${isWarranty ? `<div class="data-row"><span class="data-label">Garantía de Orden:</span><span class="data-value">#${order.warrantyOf}</span></div>` : ''}
            <div class="data-row"><span class="data-label">Fecha Entrega:</span><span class="data-value">${dateStr}</span></div>
            ${!isPersonalMode && order.assignedTechnician ? `<div class="data-row"><span class="data-label">Técnico:</span><span class="data-value">${order.assignedTechnician}</span></div>` : ''}
          </div>
        </div>
      </td>
      <td style="width: 50%; vertical-align: top; padding-left: 5px;">
        <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
          <div class="grid-title">Datos del Cliente</div>
          <div class="grid-body">
            <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">${order.customerName.toUpperCase()}</span></div>
            <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">${customerPhoneStr}</span></div>
          </div>
        </div>
      </td>
    </tr>
  </table>
  <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
    <div class="grid-title">Detalles del Dispositivo Entregado</div>
    <div style="padding: 6px;">
      <div class="data-row"><span class="data-label">Marca / Modelo:</span><span class="data-value">${order.deviceBrand} ${order.deviceModel}</span></div>
      ${order.deviceModelNumber ? `<div class="data-row"><span class="data-label">Modelo Técnico:</span><span class="data-value">${order.deviceModelNumber}</span></div>` : ''}
      <div class="data-row"><span class="data-label">Tipo:</span><span class="data-value">${deviceTypeStr}</span></div>
      ${order.receivedAccessories && order.receivedAccessories.length > 0
        ? `<div class="data-row"><span class="data-label">Accesorios Devueltos:</span><span class="data-value">${order.receivedAccessories.join(', ')}</span></div>`
        : ''
      }
    </div>
  </div>
  <table class="items-table">
    <thead><tr><th style="width: 75%;">Servicio & Falla Entregada</th><th style="width: 25%; text-align: right;">Costo</th></tr></thead>
    <tbody><tr>
      <td>
        <div style="font-weight: 900; font-size: 11px; text-transform: uppercase;">${order.serviceType}</div>
        <div style="margin-top: 3px; font-weight: 500; font-size: 9px; color: #334155;"><b>FALLA INICIAL:</b> ${cleanFault.toUpperCase()}</div>
        ${order.diagnosticsNote ? `<div style="margin-top: 3px; border-top: 1px dashed #cbd5e1; padding-top: 3px; font-size: 8.5px; font-weight: 500; color: #475569;"><b>NOTAS TÉCNICAS DE CIERRE:</b> ${order.diagnosticsNote}</div>` : ''}
      </td>
      <td style="text-align: right; font-weight: 900; font-size: 11px; vertical-align: middle;">${currSym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr></tbody>
  </table>
</div>
<div>
  <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">
    <tr>
      <td style="width: 55%; vertical-align: top; padding-right: 12px;">
        ${policies ? `<div class="policies-box" style="margin-top: 0; margin-bottom: 6px;"><b>PÓLIZA DE GARANTÍA:</b> ${policies}</div>` : ''}
        <table class="signatures-table" style="width: 100%; margin-top: 4px; margin-bottom: 0;">
          <tr>
            <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma de Recibido del Cliente</div></td>
            <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>
          </tr>
        </table>
      </td>
      <td style="width: 45%; vertical-align: top;">
        <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">
          ${isWarranty
            ? `<div class="total-row" style="font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; border-radius: 2px; text-align: center; text-transform: uppercase;">GARANTÍA ✓</div>`
            : `
              <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">${currSym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-${currSym}${(order.advancePayment || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${advancePaymentMethodStr}</span></div>
              <div class="total-row grand-total"><span class="data-label">ESTADO:</span><span class="data-value">LIQUIDADO ✓</span></div>
              <div class="total-row" style="font-size: 8.5px; border-top: 1px dashed #cbd5e1; margin-top: 2px; padding-top: 2px;"><span class="data-label">Liquidación:</span><span class="data-value" style="font-weight: 700;">${liquidationPaymentMethodStr.replace(/^\s*\(\s*|\s*\)\s*$/g, '').toUpperCase() || 'EFECTIVO'}</span></div>
            `
          }
        </div>
      </td>
    </tr>
  </table>
  <div style="text-align: center; border-top: 1px dashed #94a3b8; padding-top: 4px; margin-top: 6px;">
    <div class="bc-target" id="bc" style="margin: 0 auto; display: flex; justify-content: center;"></div>
    <div style="font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ${order.id} *</div>
    <div class="footer-text" style="font-size: 9px; font-weight: 900; margin-top: 3px; color: #000;">${footer}</div>
  </div>
</div>
`;

    if (isMediaCarta) {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @page { size: ${isMediaCartaDuplicado ? '210mm 297mm' : '216mm 140mm'}; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #000; background: #fff; line-height: 1.35; padding: 0; margin: 0; }
  .invoice-container { width: 100%; height: 128mm; max-height: 128mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .header-cell { vertical-align: top; }
  .store-title { font-size: 16px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }
  .store-details { font-size: 9px; font-weight: 600; color: #333; margin-top: 3px; }
  .grid-title { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 3px 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid-body { padding: 6px; }
  .data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0; }
  .data-row:last-child { border-bottom: none; }
  .data-label { font-weight: 700; color: #475569; }
  .data-value { font-weight: 700; color: #000; text-align: right; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000; }
  .items-table th { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 4px 6px; text-transform: uppercase; text-align: left; }
  .items-table td { padding: 6px; border-bottom: 1px solid #cbd5e1; font-size: 10.5px; vertical-align: top; }
  .totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 6px; background: #fafaf9; }
  .total-row { display: flex; justify-content: space-between; padding: 2.5px 0; font-size: 10.5px; }
  .total-row.grand-total { font-size: 12px; font-weight: 900; background: #000; color: #fff; padding: 4px; margin-top: 3px; border-radius: 2px; }
  .policies-box { font-size: 7px; color: #475569; line-height: 1.3; border: 1px solid #e2e8f0; padding: 4px 6px; background: #f8fafc; border-radius: 4px; margin-top: 4px; margin-bottom: 8px; word-break: break-all; overflow-wrap: break-word; }
  .signatures-table { width: 100%; margin-top: 15px; margin-bottom: 10px; }
  .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 2px; font-size: 8px; font-weight: 700; text-align: center; text-transform: uppercase; }
  .footer-text { font-size: 9px; font-weight: 900; text-align: center; margin-top: 3px; color: #000; }
  </style></head><body>
  ${isMediaCartaDuplicado ? `
    <div style="height: 140mm; display: flex; flex-direction: column; justify-content: space-between; padding: 6mm 8mm 0 8mm; box-sizing: border-box;">
      <div class="invoice-container">
        ${innerContent}
      </div>
    </div>
    <hr style="border: none; border-top: 1.5px dashed #000; margin: 0;">
    <div style="height: 140mm; display: flex; flex-direction: column; justify-content: space-between; padding: 6mm 8mm 0 8mm; box-sizing: border-box;">
      <div class="invoice-container">
        ${innerContent}
      </div>
    </div>
  ` : `
    <div style="padding: 6mm 8mm 0 8mm;">
      <div class="invoice-container">
        ${innerContent}
      </div>
    </div>
  `}
  <script>${code128Script}</script>
  </body></html>`;
    } else {
      return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    @page { size: ${pageSizeCss}; margin: ${pageMarginCss}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : '13'}px; font-weight: 700; width: 100%; margin: 0; padding: 2mm calc(${rightPad} - ${offset}px) ${bottomPad} calc(${leftPad} + ${offset}px); color: #000; background: #fff; overflow-x: hidden; overflow-wrap: break-word; word-break: break-word; }
    .center { text-align: center; } .bold { font-weight: 900; }
    .store { font-size: 15px; font-weight: 900; text-align: center; margin-bottom: 1px; }
    hr { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }
    .kv { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 10px; margin: 1px 0; }
    .kv-val { text-align: right; flex: 1; min-width: 0; word-break: break-word; font-weight: 900; margin-left: 8px; }
    .badge { display: block; font-weight: 950; text-align: center; font-size: 11px; background: #000 !important; color: #fff !important; padding: 5px 0 !important; margin: 3.5px 0; letter-spacing: 1px; line-height: 1.25 !important; height: auto !important; }
    .total-row { font-size: 13px; font-weight: 900; text-align: right; border-top: 2px solid #000; margin-top: 4px; padding-top: 2px; }
    .footer { font-size: 10px; font-weight: 700; text-align: center; margin-top: 5px; }
    .policies { font-size: 10px; font-weight: 700; text-align: center; color: #000; margin-top: 3px; }
  </style></head><body>
    ${buildTicketHeaderHtml(customConfig, paperWidth)}
    <hr>
    <div class="badge">${isWarranty ? 'ENTREGA POR GARANTÍA' : 'COMPROBANTE DE ENTREGA'}</div>
    <div class="kv"><span>ORDEN:</span><span class="kv-val">${order.id}</span></div>
    ${isWarranty ? `<div class="kv"><span>GARANTÍA DE ORDEN:</span><span class="kv-val">${order.warrantyOf}</span></div>` : ''}
    <div class="kv"><span>FECHA:</span><span class="kv-val">${dateStr}</span></div>
    <div class="kv"><span>CLIENTE:</span><span class="kv-val">${order.customerName}</span></div>
    ${order.customerPhone ? `<div class="kv"><span>TEL:</span><span class="kv-val">${customerPhoneStr}</span></div>` : ''}
    <div class="kv"><span>EQUIPO:</span><span class="kv-val">${order.deviceBrand} ${order.deviceModel}</span></div>
    <div class="kv"><span>SERVICIO:</span><span class="kv-val">${order.serviceType}</span></div>
    ${!isPersonalMode && order.assignedTechnician ? `<div class="kv"><span>TÉCNICO:</span><span class="kv-val">${order.assignedTechnician}</span></div>` : ''}
    ${order.receivedAccessories && order.receivedAccessories.length > 0
      ? `<div class="kv"><span>ACCESORIOS DEVUELTOS:</span><span class="bold">${order.receivedAccessories.join(', ')}</span></div>`
      : ''
    }
    <hr>
    <div class="kv"><span>COSTO TOTAL:</span><span class="bold">${currSym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="kv"><span>ANTICIPO:</span><span>${currSym}${(order.advancePayment || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${advancePaymentMethodStr}</span></div>
    <div class="total-row">ESTADO: LIQUIDADO ✓</div>
    <div class="kv" style="font-size: 10px; margin-top: 2px; font-weight: 900;"><span>MÉTODO LIQ:</span><span class="kv-val" style="text-transform: uppercase;">${liquidationPaymentMethodStr.replace(/^\s*\(\s*|\s*\)\s*$/g, '') || 'EFECTIVO'}</span></div>
    ${policies ? `<hr><div class="policies">${policies}</div>` : ''}
    <div class="footer">${footer}</div>
    <div style="text-align: center; border-top: 1px dashed #000; padding-top: 4px; margin-top: 6px;">
      <div class="bc-target" id="bc" style="margin: 0 auto; display: flex; justify-content: center;"></div>
      <div style="font-size: 8px; font-weight: 700; color: #000; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ${order.id} *</div>
    </div>
    <script>${code128Script}</script>
  </body></html>`;
    }
  };

  const handleConfirmPrintDeliveryTicket = async () => {
    if (!printConfirmOrder) return;
    const order = printConfirmOrder;
    setPrintDeliveryStatus('printing');

    try {
      const ticketWidth = config.hybridPrintMode ? 'media-carta-duplicado' : (config.ticketPaperWidth || '80mm');
      const paperWidthMicrons = ticketWidth === 'media-carta-duplicado'
        ? 210000
        : (config.hybridPrintMode || ticketWidth === 'media-carta')
          ? 215900
          : ticketWidth === '58mm'
            ? 48000
            : 72000;
      const paperHeightMicrons = ticketWidth === 'media-carta-duplicado'
        ? 297000
        : config.hybridPrintMode
          ? 279400
          : ticketWidth === 'media-carta'
            ? 139700
            : undefined;

      const deliveryHtml = buildDeliveryTicketHtmlForOrder(order, config);
      fmPrint({
        html: deliveryHtml,
        deviceName: config.ticketPrinterBrand || '',
        paperWidthMicrons,
        paperHeightMicrons,
        noToast: true,
        isLabel: false
      });
      setPrintDeliveryStatus('success');

      const n = document.createElement('div');
      n.textContent = `✅ Enviando a imprimir: Comprobante de Entrega (${ticketWidth})`;
      n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#16a34a;color:#fff;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3200);

      setTimeout(() => {
        setPrintConfirmOrder(null); setPrintDeliveryStatus('idle');
        if (printReturnBatchId) { setSelectedOrderIdLocal(printReturnBatchId); setPrintReturnBatchId(null); }
      }, 1200);
    } catch (err) {
      setPrintDeliveryStatus('error');
      setTimeout(() => { setPrintDeliveryStatus('idle'); }, 2000);
    }
  };

  const sendStandardWhatsapp = (order: RepairOrder) => {
    const enriched = {
      ...order,
      deviceModelNumber: order.deviceModelNumber || getCatalogModelNumber(order.deviceBrand, order.deviceModel)
    };
    const ticketHtml = buildTicketHtml(enriched, config);
    const msg = buildWhatsappOrderStatusMessage(enriched, enriched.status, config);
    sendWhatsappNotification(config, enriched.customerPhone, msg, ticketHtml, undefined, undefined, enriched.customerCountryCode, true);
  };

  const sendDeliveryWhatsapp = (order: RepairOrder) => {
    const enriched = {
      ...order,
      deviceModelNumber: order.deviceModelNumber || getCatalogModelNumber(order.deviceBrand, order.deviceModel)
    };
    const deliveryHtml = buildDeliveryTicketHtmlForOrder(enriched, config, 'whatsapp');
    const msg = buildWhatsappOrderStatusMessage(enriched, 'Entregado y Pagado', config);
    sendWhatsappNotification(config, enriched.customerPhone, msg, deliveryHtml, undefined, undefined, enriched.customerCountryCode, true);
  };

  const handleSendWhatsAppFromHistory = (order: RepairOrder) => {
    if (order.status === 'Entregado' || order.status === 'Entregado y Pagado') {
      setWhatsappChoiceOrder(order);
      return;
    }
    sendStandardWhatsapp(order);
  };

  const sendStandardBatchWhatsapp = (batchId: string, batchOrders: RepairOrder[]) => {
    const first = batchOrders[0];
    if (!first) return;
    
    const enrichedBatchOrders = batchOrders.map(o => ({
      ...o,
      deviceModelNumber: o.deviceModelNumber || getCatalogModelNumber(o.deviceBrand, o.deviceModel)
    }));

    const consolidatedHtml = (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado')
      ? buildConsolidatedTicketHtml(enrichedBatchOrders, config, config.duplexManual ? 'front' : undefined)
      : buildConsolidatedTicketHtml(enrichedBatchOrders, config);
      
    const clientName = first.customerName;
    const clientPhone = first.customerPhone;
    const sym = config.currencySymbol || '$';
    const totalDue = enrichedBatchOrders.reduce((acc, o) => acc + Math.max(0, o.cost - o.advancePayment), 0);

    let msg = `*NOTIFICACIÓN DE SERVICIO GRUPAL*\n`;
    msg += `Estimado(a) *${clientName.toUpperCase()}*:\n\n`;
    msg += `Le enviamos el resumen de sus equipos registrados bajo el Folio Grupal *#${batchId}*:\n\n`;
    
    enrichedBatchOrders.forEach(o => {
      msg += `• *Folio:* #${o.id} - *Equipo:* ${o.deviceBrand} ${o.deviceModel} (${o.status.toUpperCase()})\n`;
    });
    
    if (totalDue > 0) {
      msg += `\n*Saldo Total Pendiente:* ${sym}${totalDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    } else {
      msg += `\n*Estado:* Todos los equipos se encuentran liquidados.\n`;
    }
    msg += `\n_Agradecemos su preferencia y confianza._`;

    sendWhatsappNotification(config, clientPhone, msg, consolidatedHtml, undefined, undefined, first.customerCountryCode, true);
  };

  const sendDeliveryBatchWhatsapp = (batchId: string, batchOrders: RepairOrder[]) => {
    const first = batchOrders[0];
    if (!first) return;
    const enrichedBatchOrders = batchOrders.map(o => ({
      ...o,
      deviceModelNumber: o.deviceModelNumber || getCatalogModelNumber(o.deviceBrand, o.deviceModel)
    }));
    const deliveryHtml = buildDeliveryTicketHtmlForOrder(first, config, 'whatsapp');
    let msg = `*COMPROBANTE DE ENTREGA GRUPAL — #${batchId}*\n`;
    msg += `Estimado(a) *${first.customerName.toUpperCase()}*:\n\n`;
    msg += `Le enviamos el comprobante de entrega de sus equipos registrados bajo el Folio Grupal *#${batchId}*:\n\n`;
    enrichedBatchOrders.forEach(o => {
      msg += `• *Folio:* #${o.id} - *Equipo:* ${o.deviceBrand} ${o.deviceModel} (ENTREGADO)\n`;
    });
    msg += `\n*Estado:* Todos los equipos se encuentran entregados y liquidados.\n`;
    msg += `\n_Agradecemos su preferencia y confianza._`;
    sendWhatsappNotification(config, first.customerPhone, msg, deliveryHtml, undefined, undefined, first.customerCountryCode, true);
  };

  const handleSendWhatsAppBatchFromHistory = (batchId: string, batchOrders: RepairOrder[]) => {
    const first = batchOrders[0];
    if (first && (first.status === 'Entregado' || first.status === 'Entregado y Pagado')) {
      setWhatsappChoiceBatch({ batchId, batchOrders });
      return;
    }
    sendStandardBatchWhatsapp(batchId, batchOrders);
  };

  const openEditModal = (order: RepairOrder) => {
    setEditingOrder(order);
    setDiagnosticsDraft(order.diagnosticsNote || '');
  };

  const saveDetailsDraft = () => {
    if (editingOrder) {
      onUpdateDiagnose(editingOrder.id, diagnosticsDraft);
      setEditingOrder(null);
    }
  };

  // Limpia faultDescription de tokens [ACCESO: ...] y [NO. MODELO: ...] que quedaron de versiones anteriores
  const cleanFault = (s: string) => s.replace(/\[(?:ACCESO|NO\.\s*MODELO)[^\]]*\]\s*/gi, '').trim();

  // Renderiza el acceso del dispositivo (PIN, patrón o sin clave)
  const renderAcceso = (pin?: string) => {
    if (!pin || pin === 'SIN CLAVE' || pin.trim() === '') {
      return <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isLight ? 'bg-zinc-100 text-zinc-400 border border-zinc-300' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>Sin clave</span>;
    }
    const cleanPin = pin.trim();
    const isPatronPrefix = cleanPin.toUpperCase().startsWith('PATRÓN:') || cleanPin.toUpperCase().startsWith('PATRON:');
    const isPatronFormat = isPatronPrefix || /^[0-8](-[0-8]){2,}$/.test(cleanPin);
    if (isPatronFormat) {
      let nodeStr = cleanPin;
      if (cleanPin.toUpperCase().startsWith('PATRÓN:')) {
        nodeStr = cleanPin.slice('PATRÓN:'.length).trim();
      } else if (cleanPin.toUpperCase().startsWith('PATRON:')) {
        nodeStr = cleanPin.slice('PATRON:'.length).trim();
      }
      const nodes = nodeStr.split('-').map(Number).filter(n => !isNaN(n));
      const pos = (n: number) => ({ x: (n % 3) * 16 + 8, y: Math.floor(n / 3) * 16 + 8 });
      const color = isLight ? '#6366f1' : '#818cf8';
      const nodeR = 5.0;
      const arrowSize = 4.5;
      let arrowEl = null;
      if (nodes.length >= 2) {
        const lp = pos(nodes[nodes.length - 2]);
        const lq = pos(nodes[nodes.length - 1]);
        const dx = lq.x - lp.x; const dy = lq.y - lp.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len; const uy = dy / len;
        const px = -uy; const py = ux;
        // Tip of the arrow lands exactly at the boundary of the last node (circle)
        const tip = { x: lq.x - ux * nodeR, y: lq.y - uy * nodeR };
        const base = { x: tip.x - ux * arrowSize, y: tip.y - uy * arrowSize };
        const l1 = { x: base.x + px * arrowSize * 0.7, y: base.y + py * arrowSize * 0.7 };
        const l2 = { x: base.x - px * arrowSize * 0.7, y: base.y - py * arrowSize * 0.7 };
        arrowEl = <polygon points={`${tip.x},${tip.y} ${l1.x},${l1.y} ${l2.x},${l2.y}`} fill={color} />;
      }
      return (
        <svg width="56" height="56" viewBox="-4 -4 56 56" className="shrink-0 mx-auto">
          {nodes.slice(1).map((n, i) => {
            const a = pos(nodes[i]); const b = pos(n);
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="1.5" strokeLinecap="round" />;
          })}
          {[0,1,2,3,4,5,6,7,8].map(n => {
            const p = pos(n);
            const activeIndex = nodes.indexOf(n);
            const active = activeIndex !== -1;
            if (active) {
              const stepNumber = activeIndex + 1;
              return (
                <g key={n}>
                  <circle cx={p.x} cy={p.y} r={nodeR} fill={color} />
                  <text x={p.x} y={p.y + 0.5} fill="#ffffff" fontSize="6.5px" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                    {stepNumber}
                  </text>
                </g>
              );
            } else {
              return <circle key={n} cx={p.x} cy={p.y} r={2.5} fill={isLight ? '#d1d5db' : '#3f3f46'} />;
            }
          })}
          {arrowEl}
        </svg>
      );
    }
    // PIN numérico — etiqueta inline dentro del badge
    return (
      <span className={`text-[9px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded ${isLight ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/30'}`}>
        PIN: {pin}
      </span>
    );
  };

  // Devuelve clases de color para botones utilitarios según estado
  const utilBtnCls = (status: string) => {
    const map: Record<string, string> = {
      'Pendiente':         'bg-purple-300 hover:bg-purple-400 text-purple-900  border border-purple-500',
      'Diagnóstico':       'bg-amber-300  hover:bg-amber-400  text-amber-900   border border-amber-500',
      'En Reparación':     'bg-blue-300   hover:bg-blue-400   text-blue-900    border border-blue-500',
      'Listo':             'bg-rose-300   hover:bg-rose-400   text-rose-900    border border-rose-500',
      'Fallido':           'bg-orange-300 hover:bg-orange-400 text-orange-900  border border-orange-500',
      'Entregado':         'bg-emerald-300 hover:bg-emerald-400 text-emerald-900 border border-emerald-500',
      'Entregado y Pagado':'bg-emerald-300 hover:bg-emerald-400 text-emerald-900 border border-emerald-500',
      'Cancelado':         'bg-zinc-300   hover:bg-zinc-400   text-zinc-700    border border-zinc-400',
    };
    return (isLight)
      ? (map[status] || 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 border border-zinc-400')
      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700';
  };

  const isDetailOpen = !!(selectedOrderIdLocal || selectedBatchOrders);
  const cardHeightCls = 'flex-1 h-full min-h-0';

  // Helper function to dynamically count active matching tab items based on search term
  const getTabCount = (tabId: string) => {
    return orders.filter((order) => {
      // 1. Text search matching
      const cleanSearch = searchTerm.replace(/,(?!\s)/g, '-');
      const textMatch =
        order.id.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        order.customerName.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        order.deviceBrand.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        order.deviceModel.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        order.faultDescription.toLowerCase().includes(cleanSearch.toLowerCase());

      if (!textMatch) return false;

      // 2. Delivered status check
      const isDeliveredStatus = order.status === 'Entregado' || order.status === 'Entregado y Pagado' || order.status === 'Cancelado';
      if (hideDelivered && isDeliveredStatus && tabId === 'todos') return false;

      // 3. Tab state filtering
      if (tabId === 'todos') return true;
      if (tabId === 'Pendiente') return order.status === 'Pendiente' || order.status === 'Diagnóstico';
      if (tabId === 'En Proceso') return order.status === 'En Reparación';
      if (tabId === 'Listo') return order.status === 'Listo' || order.status === 'Fallido';
      if (tabId === 'Entregado') return isDeliveredStatus;
      if (tabId === 'Grupales') {
        const batchOrders = orders.filter(o => o.batchId === order.batchId);
        return !!order.batchId && batchOrders.length > 1;
      }
      return true;
    }).length;
  };

  // Resumen informativo de órdenes
  const totalOrdersCount = orders.length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'Entregado' || o.status === 'Entregado y Pagado').length;
  
  // Dinero ya cobrado (Costo de entregadas + anticipo de activas)
  const totalCollectedMoney = orders.reduce((sum, o) => {
    const isDelivered = o.status === 'Entregado' || o.status === 'Entregado y Pagado';
    if (isDelivered) {
      return sum + (o.cost || 0);
    } else if (o.status !== 'Cancelado' && o.status !== 'Fallido') {
      return sum + (o.advancePayment || 0);
    }
    return sum;
  }, 0);

  // Dinero ya cobrado desglosado por Efectivo y Tarjeta/Digital
  const totalCashCollected = orders.reduce((sum, o) => {
    const isDelivered = o.status === 'Entregado' || o.status === 'Entregado y Pagado';
    if (isDelivered) {
      let cash = 0;
      if (o.advancePaymentBreakdown && o.advancePaymentBreakdown.length > 0) {
        o.advancePaymentBreakdown.forEach(b => {
          if (b.method === 'Efectivo') cash += b.amount;
        });
      } else {
        cash += o.advancePayment || 0;
      }
      cash += o.cashPaid || 0;
      if (!o.cashPaid && !o.cardPaid) {
        const remaining = o.cost - (o.advancePayment || 0);
        if (remaining > 0) {
          cash += remaining;
        }
      }
      return sum + cash;
    } else if (o.status !== 'Cancelado' && o.status !== 'Fallido') {
      let cash = 0;
      if (o.advancePaymentBreakdown && o.advancePaymentBreakdown.length > 0) {
        o.advancePaymentBreakdown.forEach(b => {
          if (b.method === 'Efectivo') cash += b.amount;
        });
      } else {
        cash += o.advancePayment || 0;
      }
      return sum + cash;
    }
    return sum;
  }, 0);

  const totalCardCollected = orders.reduce((sum, o) => {
    const isDelivered = o.status === 'Entregado' || o.status === 'Entregado y Pagado';
    if (isDelivered) {
      let card = 0;
      if (o.advancePaymentBreakdown && o.advancePaymentBreakdown.length > 0) {
        o.advancePaymentBreakdown.forEach(b => {
          if (b.method !== 'Efectivo') card += b.amount;
        });
      }
      card += o.cardPaid || 0;
      return sum + card;
    } else if (o.status !== 'Cancelado' && o.status !== 'Fallido') {
      let card = 0;
      if (o.advancePaymentBreakdown && o.advancePaymentBreakdown.length > 0) {
        o.advancePaymentBreakdown.forEach(b => {
          if (b.method !== 'Efectivo') card += b.amount;
        });
      }
      return sum + card;
    }
    return sum;
  }, 0);

  // Dinero por cobrar (Costo - anticipo de órdenes activas)
  const totalPendingMoney = orders.reduce((sum, o) => {
    const isDelivered = o.status === 'Entregado' || o.status === 'Entregado y Pagado';
    const isCancelled = o.status === 'Cancelado' || o.status === 'Fallido';
    if (!isDelivered && !isCancelled) {
      const remaining = (o.cost || 0) - (o.advancePayment || 0);
      return sum + (remaining > 0 ? remaining : 0);
    }
    return sum;
  }, 0);

  return (
    <div 
      className={`flex-1 flex flex-col h-full overflow-hidden ${isDetailOpen ? 'p-3.5 space-y-3.5' : 'p-6 space-y-6'} select-none ${
        isRetro
          ? 'text-black font-sans' 
          : isLight 
            ? 'text-zinc-900 font-sans' 
            : 'bg-[#0c0c0e] text-gray-200'
      }`}
      style={isLight ? { backgroundColor: '#eaeef3' } : undefined}
    >
      {/* Resumen Informativo de Órdenes */}
      {!isDetailOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 select-none shrink-0 animate-fadeIn">
          {/* Total Órdenes */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-zinc-200 shadow-sm' : 'bg-[#121316]/50 border border-white/[0.06] backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-zinc-200 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <ClipboardList className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Total Órdenes
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-blue-900' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                {totalOrdersCount} <span className="text-[10px] font-normal font-sans text-zinc-500">reg.</span>
              </span>
            </div>
          </div>

          {/* Entregadas */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-zinc-200 shadow-sm' : 'bg-[#121316]/50 border border-white/[0.06] backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-zinc-200 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Entregadas
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-emerald-950' : 'text-emerald-500'}`}>
                {deliveredOrdersCount} <span className="text-[10px] font-normal font-sans text-zinc-500">equipos</span>
              </span>
            </div>
          </div>

          {/* Ganancia Recaudada */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-emerald-500/10 shadow-sm' : 'bg-[#121316]/50 border border-emerald-500/20 backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-emerald-200 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Total Recaudado
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-emerald-950' : 'text-emerald-450'}`}>
                {config.currencySymbol}{totalCollectedMoney.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Total Efectivo */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-emerald-500/10 shadow-sm' : 'bg-[#121316]/50 border border-emerald-500/20 backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-emerald-200 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <PiggyBank className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Total Efectivo
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-emerald-950' : 'text-emerald-450'}`}>
                {config.currencySymbol}{totalCashCollected.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Tarjeta/Transfer */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-purple-500/10 shadow-sm' : 'bg-[#121316]/50 border border-purple-500/20 backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-purple-200 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <CreditCard className="w-3.5 h-3.5 text-purple-500 shrink-0" /> Tarjeta/Transfer
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-purple-950' : 'text-purple-400'}`}>
                {config.currencySymbol}{totalCardCollected.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Ganancia Proyectada (Por Cobrar) */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-cyan-500/10 shadow-sm' : 'bg-[#121316]/50 border border-cyan-500/20 backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-cyan-200 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <FileText className="w-3.5 h-3.5 text-cyan-500 shrink-0" /> Ingreso Pendiente
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-cyan-950' : 'text-cyan-400'}`}>
                +{config.currencySymbol}{totalPendingMoney.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Control row: Search and filter tabs unified inside a card container (compact single row) */}
      <div className={`w-full flex flex-row items-center justify-between gap-4 p-1.5 px-3 select-none shrink-0 ${
        isRetro 
          ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]' 
          : isLight 
            ? 'bg-white border border-zinc-200 rounded-xl shadow-sm' 
            : 'bg-[#121316] border border-[#1b1c21] rounded-xl shadow-lg'
      }`}>
        {/* Left Side: Filter Tabs */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`flex overflow-x-auto overflow-y-hidden hide-scrollbar gap-1 p-1 items-center ${
            isRetro 
              ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' 
              : isLight 
                ? 'bg-transparent border-none' 
                : 'bg-[#121316] border border-[#1c1d22] rounded-md'
          }`}>
            {[
              { id: 'todos', label: 'TODOS' },
              { id: 'Grupales', label: '📦 Grupales' },
              { id: 'Pendiente', label: 'En Espera' },
              { id: 'En Proceso', label: 'En Proceso' },
              { id: 'Listo', label: 'Finalizado / Listos' },
              { id: 'Entregado', label: 'Entregados' }
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              const count = getTabCount(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  title={`Filtrar órdenes por estado: ${tab.label}`}
                  className={`px-3 cursor-pointer text-xs font-bold font-sans transition-all shrink-0 h-7 flex items-center justify-center gap-1.5 ${
                    isActive
                      ? isRetro
                        ? 'bg-[#000080] text-white retro-white-text font-extrabold uppercase border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white'
                        : isLight
                          ? 'bg-[#000080] text-white shadow font-extrabold rounded'
                          : 'bg-zinc-800 text-sky-400 shadow-sm border border-zinc-700 rounded'
                      : isRetro
                        ? 'bg-[#dfdfdf] text-zinc-800 hover:bg-zinc-200 hover:text-black border-2 border-transparent font-bold'
                        : isLight
                          ? 'text-zinc-550 hover:text-zinc-900 hover:bg-zinc-100 rounded'
                          : 'text-gray-400 hover:text-white hover:bg-zinc-900/40 rounded'
                  }`}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ml-1.5 ${
                      isActive 
                        ? 'bg-white text-[#000080] sub-count-badge' 
                        : isRetro 
                          ? 'bg-[#c6c6c6] text-zinc-900 border border-[#808080]/30'
                          : isLight 
                            ? 'bg-zinc-200 text-zinc-700' 
                            : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Search and Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Search bar */}
          <div className="capsule-search-container w-64 select-none">
            <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              className="premium-search-input"
              placeholder="Buscar orden..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Standalone Solo Activas Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setHideDelivered(prev => {
                const next = !prev;
                localStorage.setItem('fm_hide_delivered', String(next));
                return next;
              });
            }}
            title={hideDelivered ? 'Mostrando órdenes activas — clic para ver todas' : 'Ocultar entregadas y cobradas'}
            className={`shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              hideDelivered
                ? isRetro 
                  ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-[#000080] font-black' 
                  : isLight 
                    ? 'bg-[#facc15] hover:bg-[#eab308] text-zinc-900 border-[#eab308] shadow-sm' 
                    : 'bg-amber-900/30 text-amber-400 border-amber-850 shadow-sm'
                : isRetro 
                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200' 
                  : isLight 
                    ? 'bg-white hover:bg-zinc-50 text-zinc-650 border-zinc-200 hover:text-zinc-800 hover:border-zinc-300 shadow-sm' 
                    : 'bg-zinc-900/60 hover:bg-zinc-850 text-gray-400 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700 shadow-md'
            }`}
          >
            {hideDelivered ? <EyeOff className="w-4 h-4 shrink-0" /> : <Eye className="w-4 h-4 shrink-0" />}
            <span className="shrink-0">{hideDelivered ? 'Solo activas' : 'Todas'}</span>
          </button>

          {/* Imprimir Reporte Button */}
          <button
            type="button"
            title="Imprimir un reporte PDF en tamaño A4 de las órdenes filtradas actualmente"
            onClick={() => {
              const sym = config.currencySymbol || '$';
              if (filteredOrders.length === 0) {
                const el = document.createElement('div'); el.textContent = '⚠️ No hay órdenes para imprimir'; el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#b45309;color:#fff;pointer-events:none;white-space:nowrap;'; document.body.appendChild(el); setTimeout(() => el.remove(), 3200); return;
              }
              if (!config.reportPrinterName?.trim()) {
                showUiToast('⚠️ No hay una impresora A4 configurada. Define una impresora A4 en Ajustes > Impresoras antes de imprimir.', 'error');
                return;
              }
              const thead = `<thead><tr><th>ID</th><th>Cliente</th><th>Dispositivo</th><th>Falla</th><th>Estado</th><th>Técnico</th><th>Registrado por</th><th>Fecha</th><th style="text-align:right">Costo</th></tr></thead>`;
              const tbody = `<tbody>${filteredOrders.map(o => `<tr>
                <td style="font-family:monospace">${o.id}</td>
                <td>${o.customerName}</td>
                <td>${o.deviceBrand} ${o.deviceModel}</td>
                <td>${o.faultDescription}</td>
                <td>${o.status}</td>
                <td>${o.assignedTechnician || '—'}</td>
                <td>${o.createdBy || '—'}</td>
                <td>${new Date(o.createdAt).toLocaleString('es-MX')}</td>
                <td>${sym}${(o.cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>`).join('')}</tbody>`;
              const totalRevenue = filteredOrders.filter(o => o.status === 'Entregado y Pagado').reduce((s, o) => s + (o.cost || 0), 0);
              const summary = `
                <div class="summary-item"><label>Total órdenes</label><span>${filteredOrders.length}</span></div>
                <div class="summary-item"><label>Ingresos cobrados</label><span>${sym}${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div class="summary-item"><label>Filtro activo</label><span style="font-size:11px">${activeFilter}</span></div>
              `;
              const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
  <style>
    @page { size: A4 landscape; margin: 14mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #111; background: #fff; padding: 12mm; }
    @media print { body { padding: 0 !important; } }
    .header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .header-left p { font-size: 9px; color: #555; margin-top: 2px; }
    .header-right { text-align: right; font-size: 8px; color: #555; }
    .header-right strong { display: block; font-size: 10px; color: #111; }
    .subtitle { font-size: 10px; font-weight: 700; text-transform: uppercase; border-left: 4px solid #111; padding-left: 8px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
    thead tr { background: #111; color: #fff; }
    thead th { padding: 4px 6px; text-align: left; font-size: 8px; text-transform: uppercase; }
    thead th:last-child { text-align: right; }
    tbody tr:nth-child(even) { background: #f5f5f5; }
    tbody td { padding: 4px 6px; border-bottom: 1px solid #e0e0e0; }
    tbody td:last-child { text-align: right; font-weight: 700; }
    .summary { margin-top: 14px; border-top: 2px solid #111; padding-top: 10px; display: flex; flex-wrap: wrap; gap: 10px; }
    .summary-item { background: #f0f0f0; border: 1px solid #ddd; padding: 6px 12px; border-radius: 4px; }
    .summary-item label { display: block; font-size: 7.5px; text-transform: uppercase; color: #666; font-weight: 700; }
    .summary-item span { display: block; font-size: 13px; font-weight: 900; margin-top: 2px; }
    .footer { margin-top: 16px; border-top: 1px solid #ccc; padding-top: 5px; font-size: 7.5px; color: #888; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
  <div class="header">
    <div class="header-left"><h1>${config.storeName || 'TALLER'}</h1><p>Historial de Órdenes de Reparación</p></div>
    <div class="header-right"><strong>${new Date().toLocaleString('es-MX', { year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit' })}</strong>Reporte generado por FixManager</div>
  </div>
  <div class="subtitle">Filtro: ${activeFilter} · ${filteredOrders.length} orden(es)</div>
  <table>${thead}${tbody}</table>
  <div class="summary">${summary}</div>
  <div class="footer">${config.storeName || 'TALLER'} — Reporte generado automáticamente por FixManager</div>
  </body></html>`;
              fmPrint({ html, deviceName: config.reportPrinterName || '', paperWidthMicrons: 210000, paperHeightMicrons: 297000, isReport: true });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase transition-all select-none active:scale-95 cursor-pointer shrink-0 h-9 ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
              : isLight ? 'bg-zinc-850 hover:bg-zinc-700 text-white rounded-lg'
              : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> IMPRIMIR REPORTE
          </button>
        </div>
      </div>

      {/* Main Repair Orders Split Container */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 items-stretch w-full overflow-hidden">
        {/* Left Side: Orders Table */}
        <div className={`transition-all duration-300 w-full flex-1 h-full min-h-0 flex flex-col gap-4 ${selectedOrderIdLocal ? 'lg:w-[calc(65%-12px)] lg:flex-none shrink-0' : ''}`}>
          <div className={(
            isRetro 
              ? `bg-white border border-zinc-350 rounded-xl force-rounded-xl overflow-hidden text-zinc-900 font-sans ${cardHeightCls} flex flex-col` 
              : isLight 
                ? `bg-white border border-zinc-200 rounded-xl force-rounded-xl overflow-hidden shadow text-zinc-900 font-sans ${cardHeightCls} flex flex-col` 
                : `bg-[#121316] border border-[#1b1c21] rounded-xl force-rounded-xl overflow-hidden shadow-lg text-gray-200 ${cardHeightCls} flex flex-col`
          )}>
            <section className="overflow-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className={
                    isRetro 
                      ? 'bg-[#000080] text-[#ffffff] retro-white-text font-black uppercase tracking-wider text-[11px] border-b-2 border-b-[#808080]' 
                      : isLight 
                        ? 'bg-zinc-100 border-b border-zinc-200 text-zinc-600 font-bold text-[10px] uppercase tracking-wider' 
                        : 'bg-[#0e0f12] border-b border-[#2d2f36] text-[10px] text-gray-400 font-mono uppercase tracking-wider'
                  }>
                    <th className="p-3 pl-4">Ticket</th>
                    <th className="p-3">Cliente / Cel</th>
                    <th className="p-3">Dispositivo / Falla</th>
                    {!selectedOrderIdLocal && (
                      <>
                        <th className="p-3 text-center">Acceso</th>
                        <th className="p-3 text-right">Costo Total</th>
                        <th className="p-3 text-right">Abonado / Resta</th>
                      </>
                    )}
                    <th className="p-3 text-center w-[160px] min-w-[160px] shrink-0">Estado</th>
                    {!selectedOrderIdLocal && <th className="p-3 text-center w-[130px] min-w-[130px] shrink-0">Acciones</th>}
                  </tr>
                </thead>
            <tbody className={`divide-y ${isRetro ? 'divide-zinc-300' : isLight ? 'divide-zinc-200' : 'divide-zinc-800/70'}`}>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-mono">
                    No se encontraron órdenes registradas con este filtro
                  </td>
                </tr>
              ) : (
                displayItems.map((item, idx) => {
                  if (item.kind === 'batch') {
                    const { batchId, batchOrders } = item;
                    const first = batchOrders[0];
                    const totalCost = batchOrders.reduce((s, o) => s + o.cost, 0);
                    const advance = first.batchAdvancePayment || 0;
                    const saldo = getBatchSaldo(batchOrders);
                    const batchStatus = getBatchStatus(batchOrders);
                    const activeBatchOrders = batchOrders.filter(o => o.status !== 'Entregado' && o.status !== 'Entregado y Pagado' && o.status !== 'Cancelado');
                    const allReady = activeBatchOrders.length > 0 && activeBatchOrders.every(o => o.status === 'Listo' || o.status === 'Fallido');
                    const sym = config.currencySymbol || '$';
                    // Barra de progreso: colores por estado
                    const statusColors: Partial<Record<RepairOrder['status'], string>> = {
                      'Pendiente': '#d97706', 'Diagnóstico': '#7c3aed', 'En Reparación': '#2563eb',
                      'Listo': '#dc2626', 'Fallido': '#ea580c',
                      'Entregado': '#059669', 'Entregado y Pagado': '#059669', 'Cancelado': '#71717a',
                    };
                    const breakdown = getBatchStatusBreakdown(batchOrders);
                    const allDelivered = batchOrders.every(o => o.status === 'Entregado' || o.status === 'Entregado y Pagado' || o.status === 'Cancelado');
                    const isSelected = selectedOrderIdLocal === batchId || batchOrders.some(o => o.id === selectedOrderIdLocal);
                    const totalEvidenceCount = batchOrders.reduce((s, o) => s + (o.evidence?.length || 0), 0);
                    return (
                      <tr key={batchId}
                        className={`cursor-pointer border-l-[5px] transition-colors group align-top ${
                          isSelected
                            ? isRetro ? 'border-l-[#000080]' : isLight ? 'border-l-indigo-600' : 'border-l-indigo-500'
                            : allReady
                              ? isRetro ? 'border-l-red-600' : isLight ? 'border-l-red-500' : 'border-l-red-600'
                              : isRetro ? 'border-l-orange-600' : isLight ? 'border-l-orange-500' : 'border-l-orange-500'
                        }`}
                        ref={el => { if (el) el.style.setProperty('background-color', getBatchRowBg(isSelected, allReady), 'important'); }}
                        onClick={() => { setDetailReturnBatch(null); setSelectedOrderIdLocal(batchId); }}>
                        {/* Columna TICKET */}
                        <td className={`p-3 pl-4 align-top ${allDelivered ? 'opacity-40' : ''}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm ${allReady ? (isLight ? 'bg-red-100' : 'bg-red-900/40') : (isLight ? 'bg-violet-100' : 'bg-violet-900/40')}`}>📦</div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className={`text-[10px] font-black font-mono ${allDelivered ? 'line-through text-zinc-400' : allReady ? (isLight ? 'text-red-700' : 'text-red-400') : (isLight ? 'text-violet-700' : 'text-violet-400')}`}>{batchId}</div>
                                <span className={`text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${isLight ? 'bg-orange-200 text-orange-800' : 'bg-orange-900/50 text-orange-300'}`}>GRUPAL</span>
                                {totalEvidenceCount > 0 && (
                                  <span 
                                    title={`${totalEvidenceCount} archivo(s) de evidencia adjuntos en este lote`} 
                                    className={`text-[8.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 border shrink-0 ${
                                      isLight 
                                        ? 'bg-sky-50 border-sky-200 text-sky-700' 
                                        : 'bg-sky-950/40 border-sky-900/50 text-sky-400'
                                    }`}
                                  >
                                    📷 {totalEvidenceCount}
                                  </span>
                                )}
                              </div>
                              <div className={`text-[9px] mt-0.5 ${allReady ? (isLight ? 'text-red-500' : 'text-red-500') : (isLight ? 'text-violet-500' : 'text-violet-500')}`}>{batchOrders.length} equipos</div>
                            </div>
                          </div>

                          {/* Listado compacto de refacciones de todo el lote */}
                          {(() => {
                            const allBatchParts = batchOrders.flatMap(o => (o.parts || []).map(p => ({ ...p, orderId: o.id })));
                            if (allBatchParts.length === 0) return null;
                            return (
                              <div className={`mt-2.5 p-1.5 rounded-lg border text-[9px] font-mono leading-tight space-y-1.5 ${
                                isLight
                                  ? 'bg-zinc-50 border-zinc-150 text-zinc-650'
                                  : 'bg-zinc-950/45 border-zinc-800/40 text-zinc-400'
                              }`}>
                                <div className="flex items-center gap-1 font-bold text-zinc-500 uppercase text-[8px] tracking-wider border-b pb-0.5 border-zinc-800/10 dark:border-zinc-800/35">
                                  <span>🔧 Refacciones Lote</span>
                                </div>
                                <div className="space-y-1 max-h-[80px] overflow-y-auto pr-0.5">
                                  {allBatchParts.map((p, idx) => {
                                    const catalogRef = refacciones.find(r => r.id === p.refaccionId);
                                    const displayPrice = p.price !== undefined ? p.price : (catalogRef ? catalogRef.price : 0);
                                    return (
                                      <div key={idx} className="flex flex-col border-b border-dashed border-zinc-800/5 dark:border-zinc-850 last:border-0 pb-1 last:pb-0">
                                        <div className="flex items-center justify-between gap-1.5">
                                          <span className={`font-bold truncate max-w-[85px] ${isLight ? 'text-zinc-800 font-extrabold' : 'text-zinc-200'}`} title={p.name}>
                                            {p.name}
                                          </span>
                                          <span className="text-[7.5px] font-semibold text-zinc-500 uppercase shrink-0">
                                            {p.orderId.split('-')[1] || p.orderId}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                          <span className="text-[8px] opacity-75">
                                            C: {sym}{p.cost} | V: {sym}{displayPrice}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        {/* Columna CLIENTE */}
                        <td className={`p-3 max-w-[160px] ${allDelivered ? 'opacity-40' : ''}`}>
                          <div className={`text-[12px] font-black flex items-center gap-1.5 break-all whitespace-normal ${allDelivered ? 'line-through text-zinc-400' : allReady ? (isLight ? 'text-red-800' : 'text-red-300') : (isLight ? 'text-violet-800' : 'text-violet-300')}`}>
                            {first.customerName}
                            {allReady && !allDelivered && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"/>}
                          </div>
                          {first.customerPhone && (
                            <p className={`text-xs mt-0.5 font-medium ${
                              allDelivered
                                ? 'text-zinc-500'
                                : (isLight) ? 'text-zinc-650 font-semibold' : 'text-zinc-400 font-mono'
                            }`}>{renderClickablePhone(first.customerPhone, first.customerCountryCode, first)}</p>
                          )}
                          {(() => {
                            const hoy = new Date(); hoy.setHours(0,0,0,0);
                            const entrada = new Date(first.createdAt); entrada.setHours(0,0,0,0);
                            const diasEnTaller = Math.floor((hoy.getTime() - entrada.getTime()) / (1000*60*60*24));
                            const entrega = first.estimatedDeliveryDate ? new Date(first.estimatedDeliveryDate) : null;
                            if (entrega) entrega.setHours(0,0,0,0);
                            const vencida = entrega ? entrega < hoy : false;
                            return (
                              <div className={`text-[9px] font-mono mt-1.5 space-y-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                <div>Ingresó: <span className={`font-bold ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>{entrada.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span></div>
                                {entrega && <div>Entrega: <span className={`font-bold ${vencida ? 'text-rose-500' : isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>{entrega.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span></div>}
                                <span className={`inline-block px-1.5 py-0.5 rounded font-black text-[8px] ${diasEnTaller >= 7 ? (isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-950/40 text-rose-400') : diasEnTaller >= 3 ? (isLight ? 'bg-amber-100 text-amber-600' : 'bg-amber-950/40 text-amber-400') : (isLight ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-800 text-zinc-400')}`}>
                                  {diasEnTaller === 0 ? 'Hoy en taller' : `${diasEnTaller}d en taller`}
                                </span>
                              </div>
                            );
                          })()}
                          {(() => {
                            const done = batchOrders.filter(o => o.status === 'Listo' || o.status === 'Entregado' || o.status === 'Entregado y Pagado' || o.status === 'Fallido' || o.status === 'Cancelado').length;
                            const pct = Math.round((done / batchOrders.length) * 100);
                            return (
                              <div className="mt-1.5">
                                <div className={`h-2 rounded-full overflow-hidden w-36 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#059669' : pct > 0 ? '#2563eb' : '#d97706' }} />
                                </div>
                                <div className={`text-[8px] font-mono mt-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{done}/{batchOrders.length} listos</div>
                              </div>
                            );
                          })()}
                        </td>
                        {/* Columna DISPOSITIVO / FALLA — lista comprimida */}
                        <td className={`px-3 py-2.5 ${allDelivered ? 'opacity-40' : ''}`}>
                          <div className="flex flex-col gap-1">
                            {batchOrders.slice(0, 3).map(o => (
                              <div key={o.id} className="min-h-[32px] flex flex-col justify-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColors[o.status] || '#71717a' }} />
                                  <span className={`text-[10px] font-bold truncate max-w-[165px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                                    {o.deviceBrand} {o.deviceModel}
                                  </span>
                                </div>
                                <p className={`text-[8.5px] pl-3 truncate max-w-[165px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`} title={cleanFault(o.faultDescription || '')}>
                                  {cleanFault(o.faultDescription || 'Sin reporte de falla')}
                                </p>
                              </div>
                            ))}
                            {batchOrders.length > 3 && (
                              <div className={`text-[9px] font-mono mt-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                +{batchOrders.length - 3} más…
                              </div>
                            )}
                          </div>
                        </td>
                        {/* ACCESO */}
                        {!selectedOrderIdLocal && (
                          <td className={`p-2 ${allDelivered ? 'opacity-40' : ''}`}>
                            <div className="flex flex-col gap-1">
                              {batchOrders.slice(0, 3).map(o => (
                                <div key={o.id} className="min-h-[32px] flex items-center justify-center">
                                  {renderAcceso(o.devicePin)}
                                </div>
                              ))}
                              {batchOrders.length > 3 && <div className="h-4" />}
                            </div>
                          </td>
                        )}
                        {/* COSTO TOTAL */}
                        {!selectedOrderIdLocal && (
                          <td className={`p-3 text-right ${allDelivered ? 'opacity-40' : ''}`}>
                            <span className={`text-[11px] font-black font-mono ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{sym}{totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </td>
                        )}
                        {/* ABONADO / RESTA */}
                        {!selectedOrderIdLocal && (
                          <td className={`p-3 text-right ${allDelivered ? 'opacity-40' : ''}`}>
                            <div className={`text-[10px] font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{sym}{advance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className={`text-[11px] font-black font-mono mt-0.5 ${saldo > 0 ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-600' : 'text-emerald-500')}`}>
                              {saldo > 0 ? `Debe: ${sym}${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '✓ Liquidado'}
                            </div>
                          </td>
                        )}
                        {/* ESTADO — proporcional a cada equipo */}
                        <td className={`p-2 w-[160px] min-w-[160px] ${allDelivered ? 'opacity-40' : ''}`}>
                          <div className="flex flex-col gap-1">
                            {batchOrders.slice(0, 3).map(o => (
                              <div key={o.id} className="min-h-[32px] flex items-center justify-center">
                                <span className={`text-[9px] font-bold px-2 py-1 rounded block w-full text-center truncate ${getStatusBadge(o.status)}`}>
                                  {o.status === 'Pendiente' ? 'En espera' : o.status}
                                </span>
                              </div>
                            ))}
                            {batchOrders.length > 3 && <div className="h-4" />}
                          </div>
                        </td>
                        {!selectedOrderIdLocal && (
                          <td className="p-2 w-[130px] min-w-[130px] shrink-0" onClick={e => e.stopPropagation()}>
                            <div className="flex flex-col gap-1.5 justify-center w-full">
                              <button type="button"
                                title="Imprimir el ticket consolidado para este grupo de órdenes"
                                onClick={e => {
                                  e.stopPropagation();
                                  setPrintConfirmBatch({ batchId: item.batchId, batchOrders });
                                }}
                                className={`w-full h-8 flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase cursor-pointer transition-all active:scale-95 rounded-lg ${
                                  isRetro 
                                    ? 'bg-zinc-200 text-black border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400 active:border-t-zinc-400 active:border-l-zinc-400 active:border-b-white active:border-r-white font-mono font-bold' 
                                    : isLight 
                                      ? 'bg-zinc-50 hover:bg-blue-50/50 text-zinc-600 hover:text-blue-600 border border-zinc-200 hover:border-blue-200' 
                                      : 'bg-zinc-900/50 hover:bg-blue-950/20 text-zinc-300 hover:text-blue-400 border border-zinc-800 hover:border-blue-900/40'
                                }`}
                              >
                                <Printer className="w-3.5 h-3.5 shrink-0" />
                                Ticket Grupal
                              </button>
                              {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isWaIntegratedOffline) {
                                      window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.');
                                    } else {
                                      handleSendWhatsAppBatchFromHistory(item.batchId, batchOrders);
                                    }
                                  }}
                                  title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : "Enviar ticket consolidado por WhatsApp"}
                                  className={`whatsapp-green-btn w-full h-8 flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase cursor-pointer transition-all active:scale-95 rounded-lg border ${
                                    isWaIntegratedOffline
                                      ? 'border-[#71717a] grayscale opacity-45'
                                      : isRetro
                                        ? 'border-2 border-t-emerald-300 border-l-emerald-300 border-b-emerald-800 border-r-emerald-800 font-mono font-bold text-white'
                                        : 'border-[#20ba5a] text-white hover:opacity-90'
                                  }`}
                                  style={isWaIntegratedOffline ? { backgroundColor: '#71717a', color: '#d4d4d8' } : { backgroundColor: '#25D366', color: '#ffffff' }}
                                >
                                  💬 WhatsApp
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  }

                  const { order } = item;
                  const sym = config.currencySymbol || '$';
                  const orderAdv = getIndividualAdvance(order);
                  const balanceDue = order.cost - orderAdv;
                  const isCancelled = order.status === 'Cancelado';
                  const isFailed = order.status === 'Fallido';
                  const isCancelledOrFailed = isCancelled || isFailed;

                  const isSelected = detailOrder && order.id === detailOrder.id;

                  // Fondo uniforme para todas las filas — el estado se indica solo con el borde izquierdo
                  const rowBgClass = isSelected
                    ? (isRetro ? 'bg-[#c6c6c6]' : isLight ? 'bg-blue-50/70 hover:bg-blue-100/70 font-semibold' : 'bg-blue-950/20 hover:bg-blue-900/30 border-y border-blue-900/30')
                    : isRetro
                    ? 'bg-white hover:bg-zinc-100'
                    : isLight
                    ? 'bg-white hover:bg-zinc-50'
                    : 'bg-transparent hover:bg-white/[0.04]';

                  const borderLeftWidth = isSelected ? 'border-l-[6px]' : 'border-l-[4px]';
                  let borderLeftClass = `${borderLeftWidth} border-l-transparent`;
                  if (order.status === 'Pendiente' || order.status === 'Diagnóstico')
                    borderLeftClass = `${borderLeftWidth} border-l-amber-500`;
                  else if (order.status === 'En Reparación')
                    borderLeftClass = `${borderLeftWidth} border-l-blue-500`;
                  else if (order.status === 'Listo')
                    borderLeftClass = `${borderLeftWidth} border-l-emerald-500`;
                  else if (order.status === 'Entregado' || order.status === 'Entregado y Pagado')
                    borderLeftClass = `${borderLeftWidth} border-l-zinc-400`;
                  else if (order.status === 'Fallido' || order.status === 'Cancelado')
                    borderLeftClass = `${borderLeftWidth} border-l-red-500/60`;

                  const isDelivered = order.status === 'Entregado' || order.status === 'Entregado y Pagado';
                  return (
                    <tr
                      key={order.id}
                      onClick={() => { setDetailReturnBatch(null); setSelectedOrderIdLocal(order.id); }}
                      className={`${rowBgClass} transition-all duration-200 cursor-pointer align-top`}
                      ref={el => { if (el) el.style.setProperty('background-color', getOrderRowBg(isSelected), 'important'); }}
                    >
                      {/* Ticket id */}
                      <td className={`p-3 pl-4 font-mono font-black ${borderLeftClass} ${isCancelledOrFailed || isDelivered ? 'opacity-40' : ''} ${
                        isCancelledOrFailed || isDelivered
                          ? 'text-zinc-500 line-through'
                          : (isLight) ? 'text-zinc-900 font-bold' : 'text-gray-300'
                      } align-top`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold">{order.id}</span>
                          {(order.status === 'Listo' || order.status === 'Fallido') && (
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"></span>
                          )}
                          {order.evidence && order.evidence.length > 0 && (
                            <span 
                              title={`${order.evidence.length} archivo(s) de evidencia adjuntos`} 
                              className={`text-[8.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 border shrink-0 ${
                                isLight 
                                  ? 'bg-sky-50 border-sky-200 text-sky-700' 
                                  : 'bg-sky-950/40 border-sky-900/50 text-sky-400'
                              }`}
                            >
                              📷 {order.evidence.length}
                            </span>
                          )}
                          {order.warrantyOf && (
                            <span title={`Garantía de orden ${order.warrantyOf}`} className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">
                              🛡 GAR
                            </span>
                          )}
                          {isVencida(order) && (
                            <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              +{diasVencida(order)}d
                            </span>
                          )}
                        </div>

                        {/* Listado compacto de refacciones de la orden */}
                        {order.parts && order.parts.length > 0 && (
                          <div className={`mt-2.5 p-1.5 rounded-lg border text-[9px] font-mono leading-tight space-y-1.5 max-w-[240px] ${
                            isLight
                              ? 'bg-zinc-50 border-zinc-150 text-zinc-650'
                              : 'bg-zinc-950/45 border-zinc-800/40 text-zinc-400'
                          }`}>
                            <div className="flex items-center gap-1 font-bold text-zinc-500 uppercase text-[8px] tracking-wider border-b pb-0.5 border-zinc-800/10 dark:border-zinc-800/35">
                              <span>🔧 Refacciones</span>
                            </div>
                            <div className="space-y-1 max-h-[80px] overflow-y-auto pr-0.5">
                              {order.parts.map((p, idx) => {
                                const catalogRef = refacciones.find(r => r.id === p.refaccionId);
                                const displayPrice = p.price !== undefined ? p.price : (catalogRef ? catalogRef.price : 0);
                                return (
                                  <div key={idx} className="flex flex-col border-b border-dashed border-zinc-800/5 dark:border-zinc-850 last:border-0 pb-1 last:pb-0">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className={`font-bold break-all whitespace-normal ${isLight ? 'text-zinc-800 font-extrabold' : 'text-zinc-200'}`} title={p.name}>
                                        {p.name}
                                      </span>
                                    </div>
                                    <div className={`text-[8px] opacity-75 mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                      C: {sym}{p.cost} | V: {sym}{displayPrice}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Customer info */}
                      <td className={`p-3 max-w-[160px] ${isCancelledOrFailed || isDelivered ? 'opacity-40' : ''}`}>
                        <p className={`text-sm font-bold break-all whitespace-normal ${
                          isCancelledOrFailed 
                            ? 'text-zinc-500 line-through' 
                            : (isLight) ? 'text-zinc-900 font-extrabold' : 'text-zinc-100'
                        }`}>{order.customerName}</p>
                        <p className={`text-xs mt-0.5 font-medium ${
                          isCancelledOrFailed
                            ? 'text-zinc-500'
                            : (isLight) ? 'text-zinc-650 font-semibold' : 'text-zinc-400 font-mono'
                        }`}>{renderClickablePhone(order.customerPhone, order.customerCountryCode, order)}</p>
                        <div className={`text-[9px] font-mono mt-1.5 space-y-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {(() => {
                            const hoy = new Date(); hoy.setHours(0,0,0,0);
                            const entrada = new Date(order.createdAt); entrada.setHours(0,0,0,0);
                            const diasEnTaller = Math.floor((hoy.getTime() - entrada.getTime()) / (1000*60*60*24));
                            const entrega = order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate) : null;
                            if (entrega) entrega.setHours(0,0,0,0);
                            const vencida = entrega ? entrega < hoy : false;
                            return (<>
                              <div>Ingresó: <span className={`font-bold ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>{entrada.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span></div>
                              {entrega && <div>Entrega: <span className={`font-bold ${vencida ? 'text-rose-500' : isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>{entrega.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span></div>}
                              <span className={`inline-block px-1.5 py-0.5 rounded font-black text-[8px] ${diasEnTaller >= 7 ? (isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-950/40 text-rose-400') : diasEnTaller >= 3 ? (isLight ? 'bg-amber-100 text-amber-600' : 'bg-amber-950/40 text-amber-400') : (isLight ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-800 text-zinc-400')}`}>
                                {diasEnTaller === 0 ? 'Hoy en taller' : `${diasEnTaller}d en taller`}
                              </span>
                            </>);
                          })()}
                        </div>
                      </td>

                      {/* Device info */}
                      <td className={`p-3 space-y-0.5 max-w-[200px] ${isCancelledOrFailed || isDelivered ? 'opacity-40' : ''}`}>
                        <p className={`font-sans font-semibold ${
                          isCancelledOrFailed 
                            ? 'text-zinc-500 line-through' 
                            : isRetro 
                              ? 'text-[#000080]' 
                              : isLight 
                                ? 'text-amber-700 font-bold' 
                                : 'text-sky-400'
                        }`}>
                          {order.deviceBrand} <span className={
                            isCancelledOrFailed 
                              ? 'text-zinc-500 line-through' 
                              : (isLight) ? 'text-zinc-900 font-bold' : 'text-white'
                          }>{order.deviceModel}</span>
                        </p>
                        <p className={`text-[10px] break-all whitespace-normal ${
                          isCancelledOrFailed
                            ? 'text-zinc-500 line-through'
                            : (isLight) ? 'text-zinc-800' : 'text-gray-400'
                        }`} title={cleanFault(order.faultDescription)}>
                          {cleanFault(order.faultDescription)}
                        </p>
                      </td>

                      {/* Acceso dispositivo */}
                      {!selectedOrderIdLocal && (
                        <td className={`p-3 text-center ${isCancelledOrFailed || isDelivered ? 'opacity-40' : ''}`}>
                          {renderAcceso(order.devicePin)}
                        </td>
                      )}

                      {/* Cost total */}
                      {!selectedOrderIdLocal && (
                        <td className={`p-3 text-right font-mono ${isCancelledOrFailed || isDelivered ? 'opacity-40' : ''} ${
                          isCancelledOrFailed
                            ? 'text-zinc-500 line-through'
                            : 'font-bold ' + ((isLight) ? 'text-zinc-900 font-extrabold' : 'text-white')
                        }`}>
                          {config.currencySymbol}{Number(order.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}

                      {/* Paid vs Due */}
                      {!selectedOrderIdLocal && (
                        <td className={`p-3 text-right space-y-0.5 ${isCancelledOrFailed || isDelivered ? 'opacity-40' : ''}`}>
                          <p className={`font-mono ${
                            isCancelledOrFailed
                              ? 'text-zinc-500'
                              : (isLight) ? 'text-emerald-800 font-black' : 'text-emerald-400 font-bold'
                          }`}>{config.currencySymbol}{Number(orderAdv).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          {isCancelled ? (
                            <p className="font-mono text-[9px] text-zinc-500 uppercase italic">Devuelto</p>
                          ) : balanceDue > 0 ? (
                            <p className={`font-mono text-[10px] ${
                              (isLight) ? 'text-red-700 font-bold' : 'text-rose-500'
                            }`}>Debe: {config.currencySymbol}{balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          ) : (
                            <p className={`font-mono text-[10px] font-bold px-1 rounded inline-block ${
                              isRetro 
                                ? 'text-emerald-950 bg-emerald-250 border border-emerald-450' 
                                : isLight
                                  ? 'text-emerald-850 bg-emerald-50'
                                  : 'text-emerald-400 bg-emerald-950/20'
                            }`}>Liquidado</p>
                          )}
                        </td>
                      )}

                      {/* Status */}
                      <td className={`p-3 w-[160px] min-w-[160px] shrink-0 text-center ${isCancelledOrFailed || isDelivered ? 'opacity-40' : ''}`}>
                        <div className="flex items-center justify-center gap-1.5 w-[136px] mx-auto">
                          <span className={`flex items-center justify-center w-full h-7 text-[10px] rounded font-bold uppercase tracking-wider ${getStatusBadge(order.status)}`}>
                            {order.status === 'Pendiente' ? 'En espera' : order.status === 'Listo' ? 'Finalizado' : order.status === 'Fallido' ? 'Fallido' : order.status === 'Cancelado' ? 'Cancelado' : order.status}
                          </span>
                        </div>
                      </td>

                      {!selectedOrderIdLocal && (
                        <td className="p-2 w-[130px] min-w-[130px] shrink-0 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-1.5 justify-center w-full">
                            <button
                              type="button"
                              onClick={() => handlePreviewOrder(order)}
                              title="Ticket Digital"
                              className={`w-full h-8 flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase cursor-pointer transition-all active:scale-95 rounded-lg ${
                                isRetro 
                                  ? 'bg-zinc-200 text-black border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400 active:border-t-zinc-400 active:border-l-zinc-400 active:border-b-white active:border-r-white font-mono font-bold' 
                                  : isLight 
                                    ? 'bg-sky-50 hover:bg-sky-100 text-sky-850 border border-sky-200 hover:border-sky-300' 
                                    : 'bg-sky-500/10 hover:bg-sky-500 hover:text-black text-sky-350 border border-sky-500/35'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5 shrink-0" />
                              Ticket Digital
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrint(order)}
                              title="Imprimir comprobante"
                              className={`w-full h-8 flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase cursor-pointer transition-all active:scale-95 rounded-lg ${
                                isRetro 
                                  ? 'bg-zinc-200 text-black border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400 active:border-t-zinc-400 active:border-l-zinc-400 active:border-b-white active:border-r-white font-mono font-bold' 
                                  : isLight 
                                    ? 'bg-zinc-50 hover:bg-blue-50/50 text-zinc-600 hover:text-blue-600 border border-zinc-200 hover:border-blue-200' 
                                    : 'bg-zinc-900/50 hover:bg-blue-950/20 text-zinc-300 hover:text-blue-400 border border-zinc-800 hover:border-blue-900/40'
                              }`}
                            >
                              <Printer className="w-3.5 h-3.5 shrink-0" />
                              Ticket
                            </button>
                             {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isWaIntegratedOffline) {
                                    window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.');
                                  } else {
                                    handleSendWhatsAppFromHistory(order);
                                  }
                                }}
                                title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : "Enviar comprobante por WhatsApp"}
                                className={`whatsapp-green-btn w-full h-8 flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase cursor-pointer transition-all active:scale-95 rounded-lg border ${
                                  isWaIntegratedOffline
                                    ? 'border-[#71717a] grayscale opacity-45'
                                    : isRetro
                                      ? 'border-2 border-t-emerald-300 border-l-emerald-300 border-b-emerald-800 border-r-emerald-800 font-mono font-bold text-white'
                                      : 'border-[#20ba5a] text-white hover:opacity-90'
                                }`}
                                style={isWaIntegratedOffline ? { backgroundColor: '#71717a', color: '#d4d4d8' } : { backgroundColor: '#25D366', color: '#ffffff' }}
                              >
                                💬 WhatsApp
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>


      </div>

      </div> {/* Close Left Side: Orders Table */}


    {/* Right Side: Order Detail / Edit Panel */}
    {(detailOrder || selectedBatchOrders) && (() => {
      const isBatch = !!selectedOrderIdLocal && selectedOrderIdLocal.startsWith('BATCH-');
      const batchOrders = selectedBatchOrders || [];
      const firstBatchOrder = batchOrders[0];
      const o = isBatch ? null : (detailEditMode && detailDraft ? detailDraft : detailOrder);
      const siblingOrders = o?.batchId ? orders.filter(x => x.batchId === o.batchId) : [];
      const isGroupMember = !isBatch && o && o.batchId && siblingOrders.length > 1;
      const groupTotalCost = isGroupMember ? siblingOrders.reduce((sum, x) => sum + x.cost, 0) : 0;
      const groupAdvance = isGroupMember ? (o?.batchAdvancePayment || 0) : 0;
      const proportionalAdvance = o ? getIndividualAdvance(o) : 0;
      const individualBalanceDue = o ? Math.max(0, o.cost - proportionalAdvance) : 0;

      const isDelivered = o && (o.status === 'Entregado' || o.status === 'Entregado y Pagado');
      const balanceDue = isBatch 
        ? getBatchSaldo(batchOrders) 
        : isDelivered
          ? 0
          : isGroupMember 
            ? individualBalanceDue 
            : Math.max(0, o!.cost - o!.advancePayment);
      const sym = config.currencySymbol || '$';
      
      const panelTitle = isBatch ? `Grupo — ${selectedOrderIdLocal}` : (detailEditMode ? `Editar Orden — ${o!.id}` : `Resumen de Orden — ${o!.id}`);

      const inputCls = `w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-800'
        : isLight ? 'bg-white border border-zinc-300 text-zinc-800'
        : 'bg-zinc-800 border border-zinc-600 text-zinc-100'
      }`;

      const textareaCls = `w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${
        isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-800'
        : isLight ? 'bg-white border border-zinc-300 text-zinc-800'
        : 'bg-zinc-800 border border-zinc-600 text-zinc-100'
      }`;

      const labelCls = `text-[9px] font-black uppercase tracking-widest mb-1.5 block ${
        isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'
      }`;

      const handleClosePanel = () => {
        if (detailEditMode) {
          setDetailEditMode(false);
          setDetailDraft(null);
          return;
        }
        setSelectedOrderIdLocal(null);
        setDetailEditMode(false);
        setDetailDraft(null);
        setDetailPin('');
        setDetailPinError('');
        if (detailReturnBatch) {
          setSelectedOrderIdLocal(detailReturnBatch.batchId);
          setDetailReturnBatch(null);
        }
      };

      const handleStartEdit = () => {
        if (isBatch) return;
        setPinPurpose('edit');
        setShowDetailPinModal(true);
      };

      const handleStartDelete = () => {
        if (isBatch || !o) return;
        if (o.status === 'Entregado' || o.status === 'Entregado y Pagado') {
          alert('No se puede eliminar una orden que ya ha sido entregada.');
          return;
        }
        setPinPurpose('delete');
        setShowDetailPinModal(true);
      };

      const handlePrintGroup = () => {
        if (!firstBatchOrder) return;
        setPrintConfirmBatch({ batchId: selectedOrderIdLocal!, batchOrders });
      };

      // Obtener descripción original del servicio
      const getOriginalServiceDescription = (serviceType: string): string => {
        if (!serviceType) return 'Servicio / Mano de Obra';
        const lines = serviceType.split('\n');
        const laborLine = lines.find(l => l.includes('(Mano de Obra)'));
        if (laborLine) {
          const idx = laborLine.indexOf(' (Mano de Obra)');
          if (idx !== -1) return laborLine.substring(0, idx).trim();
        }
        // Filtrar líneas de refacciones (tienen " - $")
        const nonPartLines = lines.filter(l => !l.includes(' - $'));
        if (nonPartLines.length > 0) return nonPartLines[0].trim();
        return lines[0].split(' - $')[0].trim();
      };

      // Inline Part actions
      const handleAddPart = () => {
        if (isBatch || !detailOrder) return;
        if (!newPartName.trim()) return;
        const costNum = Number(newPartCost) || 0;
        
        // ─── PROTECCIÓN CASO GARANTÍA ($0.00) ───
        // Si la orden original cuesta 0, forzamos que el precio al cliente de la refacción sea 0
        const isWarrantyOrder = (detailOrder.cost || 0) === 0;
        const priceNum = isWarrantyOrder ? 0 : (Number(newPartPrice) || 0);

        let fromStock = false;
        if (selectedPartRefaccionId) {
          const refac = refacciones.find(r => r.id === selectedPartRefaccionId);
          if (refac && refac.stock > 0) {
            fromStock = true;
            // Descontar stock
            const updatedRefacciones = refacciones.map(r => r.id === selectedPartRefaccionId ? { ...r, stock: r.stock - 1 } : r);
            onSetRefacciones?.(updatedRefacciones);
          }
        }

        const newPart = { 
          name: newPartName.trim(), 
          cost: costNum, 
          price: priceNum,
          refaccionId: selectedPartRefaccionId || undefined, 
          fromStock 
        };

        const updatedParts = [...(detailOrder.parts || []), newPart];

        // ─── DISTRIBUCIÓN AUTOMÁTICA DEL TOTAL FIJO ───
        const originalSvcDesc = getOriginalServiceDescription(detailOrder.serviceType || '');
        const totalPartsPrice = updatedParts.reduce((sum, p) => sum + (p.price || 0), 0);
        
        let newOrderCost = detailOrder.cost || 0;
        if (totalPartsPrice > newOrderCost) {
          newOrderCost = totalPartsPrice;
        }

        if (updatedParts.length === 1 && newOrderCost > 0) {
          updatedParts[0].price = newOrderCost;
        } else if (updatedParts.length > 1 && newOrderCost > 0) {
          const sumPrices = updatedParts.reduce((s, p) => s + (p.price || 0), 0);
          if (sumPrices > 0 && sumPrices !== newOrderCost) {
            const ratio = newOrderCost / sumPrices;
            let runningSum = 0;
            updatedParts.forEach((p, idx) => {
              if (idx === updatedParts.length - 1) {
                p.price = Math.max(0, Math.round((newOrderCost - runningSum) * 100) / 100);
              } else {
                const scaled = Math.round((p.price || 0) * ratio * 100) / 100;
                p.price = scaled;
                runningSum += scaled;
              }
            });
          }
        }

        const newSvcLines: string[] = [];
        if (updatedParts.length > 1) {
          updatedParts.forEach(p => {
            if ((p.price || 0) > 0) {
              newSvcLines.push(`${p.name} - ${sym}${p.price!.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            }
          });
        }

        onUpdateOrder({
          ...detailOrder,
          cost: newOrderCost,
          serviceType: newSvcLines.length > 1 ? newSvcLines.join('\n') : (originalSvcDesc || updatedParts[0]?.name || 'SERVICIO'),
          parts: updatedParts
        });
        
        setNewPartName('');
        setNewPartCost('');
        setNewPartPrice('');
        setSelectedPartRefaccionId('');
        setShowPartSuggestions(false);
      };

      const handleSelectDonorPart = (donor: DonorDevice, part: DonorPart, customerPrice: number) => {
        if (!detailOrder || !onSetDonors || !donors) return;

        const newPart = {
          name: `${part.name} [Donante ${donor.id}]`,
          cost: 0,
          price: customerPrice,
          donorId: donor.id,
          donorPartId: part.id,
          fromStock: false
        };

        const updatedParts = [...(detailOrder.parts || []), newPart];

        const originalSvcDesc = getOriginalServiceDescription(detailOrder.serviceType || '');
        const totalPartsPrice = updatedParts.reduce((sum, p) => sum + (p.price || 0), 0);
        let newOrderCost = detailOrder.cost || 0;
        if (totalPartsPrice > newOrderCost) {
          newOrderCost = totalPartsPrice;
        }

        if (updatedParts.length === 1 && newOrderCost > 0) {
          updatedParts[0].price = newOrderCost;
        } else if (updatedParts.length > 1 && newOrderCost > 0) {
          const sumPrices = updatedParts.reduce((s, p) => s + (p.price || 0), 0);
          if (sumPrices > 0 && sumPrices !== newOrderCost) {
            const ratio = newOrderCost / sumPrices;
            let runningSum = 0;
            updatedParts.forEach((p, idx) => {
              if (idx === updatedParts.length - 1) {
                p.price = Math.max(0, Math.round((newOrderCost - runningSum) * 100) / 100);
              } else {
                const scaled = Math.round((p.price || 0) * ratio * 100) / 100;
                p.price = scaled;
                runningSum += scaled;
              }
            });
          }
        }

        const newSvcLines: string[] = [];
        if (updatedParts.length > 1) {
          updatedParts.forEach(p => {
            if ((p.price || 0) > 0) {
              newSvcLines.push(`${p.name} - ${sym}${p.price!.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            }
          });
        }

        onUpdateOrder({
          ...detailOrder,
          cost: newOrderCost,
          serviceType: newSvcLines.length > 1 ? newSvcLines.join('\n') : (originalSvcDesc || updatedParts[0]?.name || 'SERVICIO'),
          parts: updatedParts
        });

        const updatedDonors = donors.map(d => {
          if (d.id === donor.id) {
            const updatedPartsList = d.parts.map(p => {
              if (p.id === part.id) {
                return {
                  ...p,
                  status: 'Usado' as const,
                  usedInOrderId: detailOrder.id,
                  usedDate: new Date().toISOString().split('T')[0]
                };
              }
              return p;
            });
            const hasAvailable = updatedPartsList.some(p => p.status === 'Disponible');
            return {
              ...d,
              status: (hasAvailable ? 'Disponible' : 'Agotado') as any,
              parts: updatedPartsList
            };
          }
          return d;
        });
        onSetDonors(updatedDonors);
        setShowDonorSearchModal(false);
      };

      const handleDeletePart = (indexToDelete: number) => {
        if (isBatch || !detailOrder) return;
        const partToDelete = (detailOrder.parts || [])[indexToDelete];
        if (partToDelete && partToDelete.refaccionId && partToDelete.fromStock) {
          // Reintegrar stock
          const updatedRefacciones = refacciones.map(r => r.id === partToDelete.refaccionId ? { ...r, stock: r.stock + 1 } : r);
          onSetRefacciones?.(updatedRefacciones);
        }

        if (partToDelete && partToDelete.donorId && partToDelete.donorPartId && donors && onSetDonors) {
          // Devolver a disponible
          const updatedDonors = donors.map(d => {
            if (d.id === partToDelete.donorId) {
              const updatedPartsList = d.parts.map(p => {
                if (p.id === partToDelete.donorPartId) {
                  const pCopy = { ...p, status: 'Disponible' as const };
                  delete pCopy.usedInOrderId;
                  delete pCopy.usedDate;
                  return pCopy;
                }
                return p;
              });
              return {
                ...d,
                status: 'Disponible' as const,
                parts: updatedPartsList
              };
            }
            return d;
          });
          onSetDonors(updatedDonors);
        }

        const updatedParts = (detailOrder.parts || []).filter((_, idx) => idx !== indexToDelete);
        
        // ─── DISTRIBUCIÓN AUTOMÁTICA DEL TOTAL FIJO ───
        const originalSvcDesc = getOriginalServiceDescription(detailOrder.serviceType || '');
        const orderCost = detailOrder.cost || 0;

        if (updatedParts.length === 1 && orderCost > 0) {
          updatedParts[0].price = orderCost;
        } else if (updatedParts.length > 1 && orderCost > 0) {
          const sumPrices = updatedParts.reduce((s, p) => s + (p.price || 0), 0);
          if (sumPrices > 0 && sumPrices !== orderCost) {
            const ratio = orderCost / sumPrices;
            let runningSum = 0;
            updatedParts.forEach((p, idx) => {
              if (idx === updatedParts.length - 1) {
                p.price = Math.max(0, Math.round((orderCost - runningSum) * 100) / 100);
              } else {
                const scaled = Math.round((p.price || 0) * ratio * 100) / 100;
                p.price = scaled;
                runningSum += scaled;
              }
            });
          }
        }

        const newSvcLines: string[] = [];
        if (updatedParts.length > 1) {
          updatedParts.forEach(p => {
            if ((p.price || 0) > 0) {
              newSvcLines.push(`${p.name} - ${sym}${p.price!.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            }
          });
        }

        onUpdateOrder({
          ...detailOrder,
          serviceType: newSvcLines.length > 1 ? newSvcLines.join('\n') : (originalSvcDesc || 'SERVICIO'),
          parts: updatedParts
        });
      };

      return (
        <>
          <div className={`w-full lg:w-[calc(35%-12px)] transition-all duration-300 shrink-0 flex flex-col rounded-xl force-rounded-xl border overflow-hidden ${cardHeightCls} ${
          isRetro ? 'bg-white border border-zinc-350 text-black shadow-md'
          : isLight ? 'bg-white border-zinc-200 text-zinc-800 shadow-lg'
          : 'bg-[#121316] border-[#1b1c21] text-zinc-100 shadow-xl'
        }`}>
          {/* Panel Header */}
          <div className={`px-4 py-3 flex items-center justify-between border-b shrink-0 ${
            isRetro ? 'bg-[#000080] text-white border-b-[#808080]'
            : isLight ? 'bg-[#1a3a6b] text-white border-zinc-200'
            : 'bg-[#0f1013] text-zinc-100 border-[#1c1d22]'
          }`}>
            <div className="flex items-center gap-2">
              {detailReturnBatch ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    id="header-return-group-btn"
                    onClick={() => {
                      setSelectedOrderIdLocal(detailReturnBatch.batchId);
                      setDetailReturnBatch(null);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold border transition-colors cursor-pointer text-[10px] uppercase tracking-wider ${
                      isRetro 
                        ? 'bg-zinc-200 border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-black hover:bg-zinc-150' 
                        : isLight 
                        ? 'bg-white text-[#1a3a6b] hover:bg-white/90 border-transparent font-extrabold shadow-sm' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    <ArrowLeft className="w-3 h-3" /> Grupo
                  </button>
                  <span className={isLight ? 'text-white/60' : 'text-zinc-500 font-black'}>/</span>
                  <span className="font-extrabold text-[12px] uppercase tracking-wide bg-white/10 px-2 py-0.5 rounded flex items-center gap-1">
                    {o!.id}
                    {o!.warrantyOf && (
                      <span className="text-[8.5px] font-black uppercase px-1 py-0.5 rounded bg-violet-600 text-white flex items-center gap-0.5 scale-[0.95] shrink-0 animate-pulse">
                        <Shield className="w-2.5 h-2.5" /> Garantía
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <>
                  <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-1.5">
                    {panelTitle}
                    {!isBatch && o!.warrantyOf && (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded bg-violet-600 text-white border border-violet-500 flex items-center gap-0.5 shrink-0 animate-pulse`}>
                        <Shield className="w-2.5 h-2.5" /> Garantía
                      </span>
                    )}
                  </span>
                  {!detailEditMode && !isBatch && (
                    <span 
                      id={`header-status-badge-${o!.status === 'En Reparación' ? 'en-reparacion' : o!.status === 'Entregado y Pagado' ? 'entregado-y-pagado' : o!.status.toLowerCase()}`}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded ${getHeaderStatusBadge(o!.status)}`}
                    >
                      {o!.status === 'Pendiente' ? 'En espera' : o!.status}
                    </span>
                  )}
                  {isBatch && (
                    <span 
                      id={`header-status-badge-${getBatchStatus(batchOrders) === 'En Reparación' ? 'en-reparacion' : getBatchStatus(batchOrders) === 'Entregado y Pagado' ? 'entregado-y-pagado' : getBatchStatus(batchOrders).toLowerCase()}`}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded ${getHeaderStatusBadge(getBatchStatus(batchOrders))}`}
                    >
                      {getBatchStatus(batchOrders)}
                    </span>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {isBatch && (
                <button
                  type="button"
                  onClick={handlePrintGroup}
                  title="Imprimir Ticket Grupal"
                  className={`p-1 rounded transition-colors active:scale-95 cursor-pointer ${
                    isRetro ? 'hover:bg-white/20 text-white' : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}
              {!detailEditMode && !isBatch && (
                <>
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(o!)}
                  title="Evidencias Multimedia (Foto/Video)"
                  className={`p-1 rounded transition-colors active:scale-95 cursor-pointer ${
                    isRetro ? 'hover:bg-white/20 text-white' : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePreviewOrder(o!)}
                  title="Ticket Digital"
                  className={`p-1 rounded transition-colors active:scale-95 cursor-pointer ${
                    isRetro ? 'hover:bg-white/20 text-white' : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(o!)}
                  title="Imprimir Comprobante"
                  className={`p-1 rounded transition-colors active:scale-95 cursor-pointer ${
                    isRetro ? 'hover:bg-white/20 text-white' : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                </button>
                </>
              )}
              {!detailEditMode && !isBatch && canManage && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  title="Editar información de esta orden"
                  className={`p-1 rounded transition-colors active:scale-95 cursor-pointer ${
                    isRetro ? 'hover:bg-white/20 text-white' : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {!detailEditMode && !isBatch && canManage && o && o.status !== 'Entregado' && o.status !== 'Entregado y Pagado' && (
                <button
                  type="button"
                  onClick={handleStartDelete}
                  title="Eliminar esta orden completamente"
                  className={`p-1 rounded transition-colors active:scale-95 cursor-pointer hover:bg-red-500/20 text-rose-500 hover:text-rose-450`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClosePanel}
                title="Cerrar panel de detalle"
                className={`p-1 rounded transition-colors active:scale-95 cursor-pointer ${
                  isRetro ? 'hover:bg-white/20 text-white font-black' : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <section className="p-4 space-y-3 overflow-y-auto min-h-0 flex-1">
            {isBatch ? (
              /* BATCH/GROUP VIEW */
              <div className="space-y-4">
                {/* Cliente */}
                <div className={`py-2 px-1 flex items-center gap-3 border-b ${
                  isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-200' : 'border-zinc-800'
                }`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isRetro ? 'bg-[#000080]/15 text-[#000080]' : isLight ? 'bg-sky-50 text-sky-600' : 'bg-sky-950/40 text-sky-400'
                  }`}>
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${
                      isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>
                      Cliente
                    </p>
                    <p className={`text-base font-black truncate leading-tight ${
                      isRetro ? 'text-black' : isLight ? 'text-zinc-900' : 'text-white'
                    }`}>
                      {firstBatchOrder?.customerName || '—'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <p className={`text-sm font-mono font-bold flex items-center gap-2 ${
                        isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-900' : 'text-sky-400'
                      }`}>
                        <Phone className={`w-4 h-4 shrink-0 ${
                          isRetro ? 'text-[#000080]' : isLight ? 'text-indigo-600' : 'text-sky-500'
                        }`} />
                        {firstBatchOrder?.customerCountryCode && `${firstBatchOrder.customerCountryCode} `}
                        {renderClickablePhone(firstBatchOrder?.customerPhone || '', firstBatchOrder?.customerCountryCode, firstBatchOrder)}
                      </p>
                      {firstBatchOrder?.customerCountryCode && (
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                          isRetro ? 'bg-[#dfdfdf] border border-zinc-400 text-zinc-800'
                          : isLight ? 'bg-zinc-150 text-zinc-700 border border-zinc-250'
                          : 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/60'
                        }`}>
                          {getCountryName(firstBatchOrder.customerCountryCode)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Equipos del Grupo */}
                <div>
                  <style>{`
                    .group-order-card {
                      display: flex !important;
                      flex-direction: column !important;
                      gap: 10px !important;
                      padding: 14px !important;
                      cursor: pointer !important;
                      transition: all 0.2s ease-in-out !important;
                    }
                    
                    /* Retro theme */
                    .mode-light .group-order-card.retro-card {
                      background-color: #ffedd5 !important;
                      border: 2px solid #808080 !important;
                      border-radius: 2px !important;
                    }
                    .mode-light .group-order-card.retro-card:hover {
                      background-color: #ffebd3 !important;
                      border-color: #000080 !important;
                    }
                    .mode-dark .group-order-card.retro-card {
                      background-color: #1a1c23 !important;
                      border: 2px solid #383c48 !important;
                      border-radius: 2px !important;
                    }
                    .mode-dark .group-order-card.retro-card:hover {
                      background-color: #22252e !important;
                      border-color: #3b82f6 !important;
                    }
                    
                    /* Light theme */
                    .group-order-card.light-card {
                      background-color: #ffedd5 !important;
                      border: 1px solid #fed7aa !important;
                      border-radius: 12px !important;
                      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03) !important;
                    }
                    .group-order-card.light-card:hover {
                      transform: translateY(-2px) !important;
                      border-color: #f97316 !important;
                      background-color: #ffebd3 !important;
                      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04) !important;
                    }
                    
                    /* Dark theme */
                    .group-order-card.dark-card {
                      background-color: rgba(61, 31, 0, 0.45) !important;
                      border: 1px solid #78350f !important;
                      border-radius: 12px !important;
                      box-shadow: 0 4px 10px rgba(0,0,0,0.2) !important;
                    }
                    .group-order-card.dark-card:hover {
                      transform: translateY(-2px) !important;
                      border-color: #d97706 !important;
                      background-color: rgba(61, 31, 0, 0.65) !important;
                      box-shadow: 0 10px 20px rgba(0,0,0,0.3) !important;
                    }
                  `}</style>
                  <span className={labelCls}>Equipos en este Grupo</span>
                  <div className="flex flex-col gap-2 mt-1 max-h-[calc(100vh-530px)] min-h-[140px] overflow-y-auto pr-1">
                    {(() => {
                      const cardThemeClass = isRetro 
                        ? 'retro-card' 
                        : isLight 
                        ? 'light-card' 
                        : 'dark-card';
                      return batchOrders.map((order) => {
                        const hasListo = order.status === 'Listo' || order.status === 'Fallido';
                        const adv = getIndividualAdvance(order);
                        const isOrderDelivered = order.status === 'Entregado' || order.status === 'Entregado y Pagado';
                        const balanceDue = isOrderDelivered ? 0 : Math.max(0, order.cost - adv);
                        return (
                          <div
                            key={order.id}
                            className={`group group-order-card ${cardThemeClass}`}
                          onClick={e => {
                            if (!(e.target as HTMLElement).closest('button')) {
                              setDetailReturnBatch({ batchId: selectedOrderIdLocal!, batchOrders });
                              setSelectedOrderIdLocal(order.id);
                            }
                          }}
                          style={{
                            borderLeft: `4px solid ${
                              order.status === 'Listo' ? '#dc2626' 
                              : order.status === 'En Reparación' ? '#2563eb' 
                              : order.status === 'Diagnóstico' ? '#7c3aed' 
                              : order.status === 'Entregado y Pagado' || order.status === 'Entregado' ? '#059669' 
                              : '#d97706'
                            }`
                          }}
                        >
                          {/* Info del Equipo */}
                          <div className={`grid grid-cols-12 items-center gap-3 w-full ${isOrderDelivered ? 'opacity-40' : ''}`}>
                            {/* Lado Izquierdo: Datos principales */}
                            <div className="min-w-0 col-span-5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-black font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>{order.id}</span>
                                {order.individuallyCharged && <span className="text-[8px] font-bold text-emerald-500">✓ Cobrado</span>}
                              </div>
                              <p className={`text-xs font-black truncate leading-snug ${isOrderDelivered ? 'line-through text-zinc-400' : isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                {order.deviceBrand} {order.deviceModel}
                              </p>
                              <p className={`text-[10.5px] truncate mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                {order.faultDescription || 'Sin falla reportada'}
                              </p>
                            </div>
                            
                            {/* Centro: Clave / PIN de Acceso */}
                            <div className="flex flex-col items-center justify-center col-span-4 text-center">
                              <span className={`text-[7.5px] font-black uppercase tracking-wider ${isLight ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Clave</span>
                              <div className="scale-[0.85] origin-center select-none">
                                {renderAcceso(order.devicePin)}
                              </div>
                            </div>

                            {/* Lado Derecho: Estado y Navegación */}
                            <div className="flex items-center justify-end gap-2 col-span-3">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded shrink-0 whitespace-nowrap ${getStatusBadge(order.status)}`}>
                                {order.status === 'Pendiente' ? 'En espera' : order.status}
                              </span>
                              <ChevronRight className={`w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 ${
                                isLight ? 'text-zinc-400 group-hover:text-zinc-700' : 'text-zinc-500 group-hover:text-zinc-300'
                              }`} />
                            </div>
                          </div>

                          {/* Detalles del Servicio y Finanzas */}
                          <div className={`flex flex-wrap items-center justify-between text-[10px] gap-2 pt-1.5 border-t ${isLight ? 'border-zinc-100' : 'border-zinc-800/45'} ${isOrderDelivered ? 'opacity-40' : ''}`}>
                            <span className="font-mono text-zinc-500 truncate max-w-[130px]" title={order.serviceType || 'General'}>
                              {order.serviceType || 'General'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-400 font-mono">Costo: {sym}{order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              {balanceDue > 0 ? (
                                <span className="font-bold text-rose-500 font-mono">Resta: {sym}{balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              ) : (
                                <span className="font-bold text-emerald-500 font-mono">Liquidado</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  </div>
                </div>

                {/* Finanzas Grupales */}
                {(() => {
                  const totalCost = batchOrders.reduce((s, o) => s + o.cost, 0);
                  const advance = firstBatchOrder?.batchAdvancePayment || 0;
                  const advances = getProportionalAdvances(batchOrders, advance);
                  const totalCobradoEnCaja = batchOrders.reduce((sum, o) => {
                    const isDelivered = o.status === 'Entregado' || o.status === 'Entregado y Pagado';
                    if (!isDelivered) return sum;
                    const advVal = advances[o.id] || 0;
                    return sum + Math.max(0, o.cost - advVal);
                  }, 0);
                  const saldo = getBatchSaldo(batchOrders);
                  const hasCobrado = totalCobradoEnCaja > 0;
                  
                  return (
                    <div>
                      <span className={labelCls}>Finanzas del Grupo</span>
                      <div className={`grid gap-3 mt-1.5 ${hasCobrado ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        {renderFinanceBox("Costo Total", sym + totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "gray")}
                        {renderFinanceBox("Anticipo", sym + advance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "violet")}
                        {hasCobrado && renderFinanceBox("Cobrado en Caja", sym + totalCobradoEnCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "emerald")}
                        {renderFinanceBox(saldo > 0 ? "Resta (Debe)" : "Estado", sym + saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), saldo > 0 ? "rose" : "emerald", saldo === 0)}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* SINGLE ORDER READ & EDIT VIEW (INLINE EDIT MODE) */
              <div className="space-y-3">
                {o.warrantyOf && (
                  <div className={`py-1.5 px-3 rounded-lg border text-[10.5px] font-bold flex items-center gap-2 ${
                    isRetro 
                      ? 'bg-violet-50 border-2 border-violet-400 text-violet-950 font-mono' 
                      : isLight 
                      ? 'bg-violet-50 border-violet-200 text-violet-850 font-sans' 
                      : 'bg-violet-950/25 border-violet-900/40 text-violet-300'
                  }`}>
                    <Shield className="w-4 h-4 text-violet-500 shrink-0 animate-pulse" />
                    <span className="truncate">
                      <strong>GARANTÍA:</strong> Sin costo (derivado de <span className="font-mono font-black">{o.warrantyOf}</span>)
                    </span>
                  </div>
                )}
                {detailReturnBatch && (
                  <div className={`py-1 px-3 rounded-lg border text-[10.5px] flex items-center justify-between gap-2 mb-1.5 ${
                    isRetro 
                      ? isLight ? 'bg-[#fde8c8] border-2 border-[#808080] text-black' : 'bg-amber-950/30 border border-amber-900/50 text-amber-300 font-medium'
                      : isLight 
                      ? 'bg-orange-50 border-orange-200 text-orange-850' 
                      : 'bg-orange-950/20 border-orange-900/30 text-orange-400'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">📦</span>
                      <span className="truncate">
                        <strong>GRUPO:</strong> Pertenece al lote <span className="font-mono font-black">{detailReturnBatch.batchId}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderIdLocal(detailReturnBatch.batchId);
                        setDetailReturnBatch(null);
                      }}
                      className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase border transition-colors cursor-pointer shrink-0 ${
                        isRetro 
                          ? isLight 
                            ? 'bg-zinc-200 border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-black hover:bg-zinc-150' 
                            : 'bg-zinc-800 border-2 border-t-zinc-700 border-l-zinc-700 border-b-zinc-950 border-r-zinc-950 text-zinc-200 hover:bg-zinc-750'
                          : isLight 
                          ? 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700' 
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      Ver Grupo
                    </button>
                  </div>
                )}
                {/* Metadata Atendió y Fecha */}
                <div className={`flex justify-between items-center text-[9.5px] font-mono px-1 opacity-75 ${
                  isLight ? 'text-zinc-650' : 'text-zinc-400'
                }`}>
                  <span>Atendió: <strong>{o.createdBy || '—'}</strong></span>
                  <span>Fecha: <strong>{new Date(o.createdAt).toLocaleDateString()}</strong></span>
                </div>

                {/* Cliente */}
                <div className={`py-2 px-1 flex items-center gap-3 border-b ${
                  isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-200' : 'border-zinc-800'
                }`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isRetro ? 'bg-[#000080]/15 text-[#000080]' : isLight ? 'bg-sky-50 text-sky-600' : 'bg-sky-950/40 text-sky-400'
                  }`}>
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${
                      isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>
                      Cliente
                    </p>
                    {detailEditMode ? (
                      <div className="space-y-2 mt-1">
                        <div>
                          <input
                            type="text"
                            value={o.customerName || ''}
                            onChange={e => handleCaretPreservingChange(e, (val) => setField('customerName', val), val => val.toUpperCase())}
                            style={{ textTransform: 'uppercase' }}
                            className={inputCls}
                            placeholder="Nombre del Cliente"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <select
                            value={o.customerCountryCode || '+52'}
                            onChange={(e) => setField('customerCountryCode', e.target.value)}
                            className={`w-20 text-xs font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer ${
                              isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-800'
                              : isLight ? 'bg-white border border-zinc-300 text-zinc-800'
                              : 'bg-zinc-800 border border-zinc-600 text-zinc-100'
                            }`}
                          >
                            <option value="+52">🇲🇽 +52</option>
                            <option value="+1">🇺🇸 +1</option>
                          </select>
                          <input
                            type="text"
                            value={o.customerPhone || ''}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                              const formatted = digits.length === 10
                                ? digits.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
                                : e.target.value;
                              setField('customerPhone', formatted);
                            }}
                            className={inputCls}
                            placeholder="Celular"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className={`text-base font-black truncate leading-tight ${
                          isRetro ? 'text-black' : isLight ? 'text-zinc-900' : 'text-white'
                        }`}>
                          {o.customerName}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <p className={`text-sm font-mono font-bold flex items-center gap-2 ${
                            isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-900' : 'text-sky-400'
                          }`}>
                            <Phone className={`w-4 h-4 shrink-0 ${
                              isRetro ? 'text-[#000080]' : isLight ? 'text-indigo-600' : 'text-sky-500'
                            }`} />
                            {o.customerCountryCode && `${o.customerCountryCode} `}
                            {renderClickablePhone(o.customerPhone, o.customerCountryCode, o)}
                          </p>
                          {o.customerCountryCode && (
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                              isRetro ? 'bg-[#dfdfdf] border border-zinc-400 text-zinc-800'
                              : isLight ? 'bg-zinc-150 text-zinc-700 border border-zinc-250'
                              : 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/60'
                            }`}>
                              {getCountryName(o.customerCountryCode)}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Dispositivo y Servicio */}
                <div className={`p-2.5 rounded-xl border space-y-2 ${
                  isRetro ? 'bg-white border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800'
                }`}>
                  {detailEditMode ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 animate-fade-in">
                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider mb-1">Marca</p>
                          <input
                            type="text"
                            value={o.deviceBrand || ''}
                            onChange={e => handleCaretPreservingChange(e, (val) => setField('deviceBrand', val), val => val.toUpperCase())}
                            style={{ textTransform: 'uppercase' }}
                            className={inputCls}
                            placeholder="Marca"
                          />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider mb-1">Modelo</p>
                          <input
                            type="text"
                            value={o.deviceModel || ''}
                            onChange={e => handleCaretPreservingChange(e, (val) => setField('deviceModel', val), val => val.toUpperCase())}
                            style={{ textTransform: 'uppercase' }}
                            className={inputCls}
                            placeholder="Modelo"
                          />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider mb-1">No. Modelo</p>
                          <input
                            type="text"
                            value={o.deviceModelNumber || ''}
                            onChange={e => handleCaretPreservingChange(e, (val) => setField('deviceModelNumber', val), val => val.toUpperCase())}
                            style={{ textTransform: 'uppercase' }}
                            className={inputCls}
                            placeholder="No. Modelo"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800/20">
                        <div className="col-span-2 space-y-2">
                          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Acceso al Dispositivo</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['none', 'pin', 'pattern'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setEditPinType(t);
                                  if (t !== 'pattern') setEditPatternNodes([]);
                                  if (t === 'none') setField('devicePin', 'SIN CLAVE');
                                  else if (t === 'pin') setField('devicePin', '');
                                }}
                                className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer text-center ${
                                  editPinType === t
                                    ? (isLight ? 'bg-indigo-650 text-white border-indigo-700 font-bold' : 'bg-blue-600 text-white border-blue-700 font-bold')
                                    : (isLight ? 'bg-white text-zinc-655 border-zinc-200 hover:border-zinc-350' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-600')
                                }`}
                              >
                                {t === 'none' ? 'Sin clave' : t === 'pin' ? '🔢 PIN' : '🔷 Patrón'}
                              </button>
                            ))}
                          </div>
                          {editPinType === 'pin' && (
                            <input
                              type="text"
                              value={o.devicePin === 'SIN CLAVE' || o.devicePin.toUpperCase().startsWith('PATRÓN:') || o.devicePin.toUpperCase().startsWith('PATRON:') ? '' : o.devicePin}
                              onChange={e => setField('devicePin', e.target.value)}
                              placeholder="Ingresar PIN..."
                              className={inputCls}
                            />
                          )}
                          {editPinType === 'pattern' && (() => {
                            const nodePos = (i: number) => ({ x: (i % 3) * 32 + 16, y: (Math.floor(i / 3)) * 32 + 16 });
                            return (
                              <div className="flex flex-col items-center gap-1.5 p-2 bg-zinc-950/20 border border-zinc-800/60 rounded-xl">
                                <svg width="96" height="96" className="bg-zinc-900 rounded-lg cursor-pointer select-none mx-auto"
                                  onClick={(e) => {
                                    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * 96;
                                    const y = ((e.clientY - rect.top) / rect.height) * 96;
                                    let closest = 0; let minD = Infinity;
                                    for (let i = 0; i < 9; i++) {
                                      const p = nodePos(i);
                                      const d = Math.hypot(p.x - x, p.y - y);
                                      if (d < minD) { minD = d; closest = i; }
                                    }
                                    if (minD < 18) {
                                      setEditPatternNodes(prev => prev.includes(closest) ? prev : [...prev, closest]);
                                    }
                                  }}>
                                  {editPatternNodes.slice(1).map((n, i) => {
                                    const a = nodePos(editPatternNodes[i]); const b = nodePos(n);
                                    return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />;
                                  })}
                                  {Array.from({ length: 9 }, (_, i) => {
                                    const { x, y } = nodePos(i);
                                    const order = editPatternNodes.indexOf(i);
                                    return <circle key={i} cx={x} cy={y} r="6" fill={order >= 0 ? '#3b82f6' : '#4b5563'} stroke={order >= 0 ? '#93c5fd' : '#6b7280'} strokeWidth="1" />;
                                  })}
                                </svg>
                                <div className="flex items-center justify-between w-full text-[9px] text-zinc-400 px-1 font-sans">
                                  <span>
                                    {editPatternNodes.length === 0 ? 'Toca para dibujar' : `${editPatternNodes.length} pts — ${editPatternNodes.join('-')}`}
                                  </span>
                                  {editPatternNodes.length > 0 && (
                                    <button type="button" onClick={() => setEditPatternNodes([])} className="text-rose-450 hover:text-rose-400 cursor-pointer font-bold uppercase">Borrar</button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider mb-1">Servicio</p>
                          <input
                            type="text"
                            value={o.serviceType || ''}
                            onChange={e => handleCaretPreservingChange(e, (val) => setField('serviceType', val), val => val.toUpperCase())}
                            style={{ textTransform: 'uppercase' }}
                            placeholder="Servicio"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Equipo / Dispositivo</p>
                        <p className="text-sm font-black text-violet-400">
                          {o.deviceBrand} {o.deviceModel} {o.deviceModelNumber && <span className={`text-xs font-normal ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>({o.deviceModelNumber})</span>}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-800/20">
                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Acceso</p>
                          <p className="font-mono font-bold">{renderAcceso(o.devicePin)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Servicio</p>
                          <p className="font-bold truncate">{o.serviceType || 'General'}</p>
                        </div>
                      </div>
                    </>
                  )}
                  {/* Técnico Asignado */}
                  <div className="pt-2 border-t border-zinc-800/20">
                    <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Técnico Asignado</p>
                    {detailEditMode ? (
                      <select
                        value={o.assignedTechnician || ''}
                        onChange={e => setField('assignedTechnician', e.target.value)}
                        className={inputCls + " mt-1"}
                      >
                        <option value="">— Sin Asignar —</option>
                        {users.filter(u => u.role === 'tecnico' || u.role === 'admin').map(u => (
                          <option key={u.id} value={u.name}>{u.name} ({u.role === 'admin' ? 'Admin' : 'Técnico'})</option>
                        ))}
                      </select>
                    ) : (
                      <p className={`text-xs font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                        {o.assignedTechnician || '— Sin Asignar —'}
                      </p>
                    )}
                  </div>

                  {/* Accesorios Recibidos */}
                  {!isBatch && o && (
                    <div className="pt-2 border-t border-zinc-800/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Accesorios Recibidos</span>
                        {!detailEditMode && canManage && (
                          <button
                            type="button"
                            onClick={() => setShowAccPopover(!showAccPopover)}
                            className={`text-[9px] font-bold cursor-pointer flex items-center gap-1 hover:underline ${
                              isRetro ? 'text-[#000080]' : isLight ? 'text-indigo-600' : 'text-sky-400'
                            }`}
                          >
                            <Edit3 className="w-2.5 h-2.5" /> Editar
                          </button>
                        )}
                      </div>
                      {detailEditMode ? (
                        <div className="mt-1 relative" ref={accPopoverRef}>
                          <button
                            type="button"
                            onClick={() => setShowAccPopover(!showAccPopover)}
                            className={`w-full py-1.5 px-3 rounded-sm text-xs font-bold uppercase border transition-all cursor-pointer flex items-center justify-between ${
                              (o.receivedAccessories || []).length > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : isRetro
                                  ? 'bg-white text-zinc-705 border-[#b2c0cc] hover:border-zinc-400'
                                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-750'
                            }`}
                          >
                            <span>
                              {(o.receivedAccessories || []).length > 0
                                ? `Accesorios (${o.receivedAccessories.length})`
                                : 'Registrar Accesorios'}
                            </span>
                          </button>
                          {showAccPopover && (
                            <div className={`absolute z-50 left-0 right-0 mt-1 p-3 border rounded shadow-xl max-h-48 overflow-y-auto ${
                              isRetro
                                ? 'bg-[#eaeef3] border-zinc-400 text-zinc-900'
                                : 'bg-zinc-950 border-zinc-700 text-zinc-150'
                            }`}>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                {ACCESSORY_OPTIONS.map((opt) => {
                                  const draftAccs = o.receivedAccessories || [];
                                  const checked = draftAccs.includes(opt);
                                  return (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer py-0.5">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setField('receivedAccessories', checked
                                            ? draftAccs.filter((x: string) => x !== opt)
                                            : [...draftAccs, opt]
                                          );
                                        }}
                                        className="w-3.5 h-3.5 rounded cursor-pointer accent-emerald-500"
                                      />
                                      <span className="font-semibold uppercase tracking-wide">
                                        {opt}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                              <div className="border-t border-zinc-750/30 mt-2 pt-2">
                                <input
                                  type="text"
                                  placeholder="Otro accesorio..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const val = e.currentTarget.value.trim().toUpperCase();
                                      const draftAccs = o.receivedAccessories || [];
                                      if (val && !draftAccs.includes(val)) {
                                        setField('receivedAccessories', [...draftAccs, val]);
                                        e.currentTarget.value = '';
                                      }
                                    }
                                  }}
                                  className={`w-full text-[11px] px-2 py-0.5 focus:outline-none rounded border uppercase ${
                                    isRetro
                                      ? 'bg-white border-zinc-400 text-zinc-800'
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative" ref={accPopoverRef}>
                          <p className={`text-xs font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-300'} uppercase`}>
                            {(o.receivedAccessories || []).join(', ') || '— Ninguno —'}
                          </p>
                          {showAccPopover && (
                            <div className={`absolute z-50 left-0 right-0 mt-1 p-3 border rounded shadow-xl max-h-48 overflow-y-auto ${
                              isRetro
                                ? 'bg-[#eaeef3] border-zinc-400 text-zinc-900'
                                : 'bg-zinc-950 border-zinc-700 text-zinc-150'
                            }`}>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                {ACCESSORY_OPTIONS.map((opt) => {
                                  const currentAccs = o.receivedAccessories || [];
                                  const checked = currentAccs.includes(opt);
                                  return (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer py-0.5">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          const updatedAccs = checked
                                            ? currentAccs.filter((x: string) => x !== opt)
                                            : [...currentAccs, opt];
                                          onUpdateOrder({
                                            ...o,
                                            receivedAccessories: updatedAccs
                                          });
                                        }}
                                        className="w-3.5 h-3.5 rounded cursor-pointer accent-emerald-500"
                                      />
                                      <span className="font-semibold uppercase tracking-wide">
                                        {opt}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                              <div className="border-t border-zinc-750/30 mt-2 pt-2">
                                <input
                                  type="text"
                                  placeholder="Otro accesorio..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const val = e.currentTarget.value.trim().toUpperCase();
                                      const currentAccs = o.receivedAccessories || [];
                                      if (val && !currentAccs.includes(val)) {
                                        const updatedAccs = [...currentAccs, val];
                                        onUpdateOrder({
                                          ...o,
                                          receivedAccessories: updatedAccs
                                        });
                                        e.currentTarget.value = '';
                                      }
                                    }
                                  }}
                                  className={`w-full text-[11px] px-2 py-0.5 focus:outline-none rounded border uppercase ${
                                    isRetro
                                      ? 'bg-white border-zinc-400 text-zinc-800'
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notas de Diagnóstico (si existen y son personalizadas, o si se está editando) */}
                {(hasCustomNote(o.diagnosticsNote) || detailEditMode) && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={labelCls}>Notas de Diagnóstico</span>
                      {!detailEditMode && canManage && (
                        <button
                          type="button"
                          onClick={() => openEditModal(o)}
                          className={`text-[9px] font-bold cursor-pointer flex items-center gap-1 hover:underline ${
                            isRetro ? 'text-[#000080]' : isLight ? 'text-indigo-600' : 'text-sky-400'
                          }`}
                        >
                          <Edit3 className="w-2.5 h-2.5" /> Editar
                        </button>
                      )}
                    </div>
                    {detailEditMode ? (
                       <textarea
                        value={o.diagnosticsNote || ''}
                        onChange={e => handleCaretPreservingChange(e, (val) => setField('diagnosticsNote', val))}
                        onKeyDown={e => e.stopPropagation()}
                        rows={3}
                        placeholder="Sin notas de diagnóstico..."
                        className={textareaCls}
                      />
                    ) : (
                      <div className={`p-3 rounded-xl border ${
                        isRetro ? 'bg-amber-50/60 border-zinc-400 text-zinc-900 font-sans'
                        : isLight ? 'bg-amber-50/40 border-zinc-200 text-zinc-800 font-sans'
                        : 'bg-amber-950/10 border-zinc-800/80 text-zinc-200 font-sans'
                      }`}>
                        <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{o.diagnosticsNote}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Finanzas */}
                <div>
                  <span className={labelCls}>{isGroupMember ? "Finanzas del Equipo (Prop.)" : "Finanzas del Servicio"}</span>
                  {(() => {
                    const totalPartsCost = o.parts ? o.parts.reduce((sum, part) => sum + (part.cost || 0), 0) : 0;
                    const totalCostOfParts = totalPartsCost + (o.serviceCost || 0);
                    const showCostoCompra = detailEditMode || (o.parts && o.parts.length > 0) || (o.serviceCost && o.serviceCost > 0);
                    return (
                      <div className={`grid gap-3 ${showCostoCompra ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'}`}>
                        {detailEditMode ? (
                          /* Costo Equipo Input */
                          (() => {
                            const bgBorderClass = isRetro
                              ? 'bg-white border-zinc-400 text-black shadow-xs'
                              : isLight
                              ? 'bg-zinc-100 border-zinc-300 text-zinc-800 shadow-xs'
                              : 'bg-zinc-900/30 border-zinc-800 text-zinc-100 shadow-xs';
                            const titleClass = isLight ? 'text-zinc-650' : 'text-zinc-400';
                            const inputFieldClass = `w-full text-center text-sm font-black font-mono mt-1 bg-transparent border-0 focus:ring-0 focus:outline-none p-0 ${
                              isLight ? 'text-zinc-950' : 'text-zinc-100'
                            }`;
                            return (
                              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${bgBorderClass}`}>
                                <span className={`text-[9px] font-extrabold uppercase tracking-wider ${titleClass}`}>
                                  Total ({sym})
                                </span>
                                <input
                                  type="number"
                                  value={o.cost}
                                  onChange={e => setField('cost', Number(e.target.value) || 0)}
                                  className={inputFieldClass}
                                  style={{ width: '100%' }}
                                />
                              </div>
                            );
                          })()
                        ) : (
                          renderFinanceBox("Total", sym + o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "gray")
                        )}

                        {detailEditMode ? (
                          /* Costo Compra Input */
                          (() => {
                            const bgBorderClass = isRetro
                              ? 'bg-white border-zinc-400 text-black shadow-xs'
                              : isLight
                              ? 'bg-zinc-100 border-zinc-300 text-zinc-800 shadow-xs'
                              : 'bg-zinc-900/30 border-zinc-800 text-zinc-100 shadow-xs';
                            const titleClass = isLight ? 'text-zinc-650' : 'text-zinc-400';
                            const inputFieldClass = `w-full text-center text-sm font-black font-mono mt-1 bg-transparent border-0 focus:ring-0 focus:outline-none p-0 ${
                              isLight ? 'text-zinc-950' : 'text-zinc-100'
                            }`;
                            return (
                              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${bgBorderClass}`}>
                                <span className={`text-[9px] font-extrabold uppercase tracking-wider ${titleClass}`}>
                                  Costo Pieza ({sym})
                                </span>
                                <input
                                  type="number"
                                  value={o.serviceCost || 0}
                                  onChange={e => setField('serviceCost', Number(e.target.value) || 0)}
                                  className={inputFieldClass}
                                  style={{ width: '100%' }}
                                />
                              </div>
                            );
                          })()
                        ) : (
                          // Ocultar si no hay refacciones asignadas Y el costo de compra es 0
                          showCostoCompra ? (
                            renderFinanceBox("Costo Pieza", sym + totalCostOfParts.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "gray")
                          ) : null
                        )}

                        {detailEditMode ? (
                          /* Anticipo / Abonado Input */
                          (() => {
                            const bgBorderClass = isRetro
                              ? 'bg-violet-50/50 border-zinc-400 text-violet-850 shadow-sm'
                              : isLight
                              ? 'bg-violet-100/60 border-violet-200 text-violet-850 shadow-sm'
                              : 'bg-violet-950/10 border-zinc-800 text-violet-300 shadow-xs';
                            const titleClass = isLight ? 'text-violet-700' : 'text-violet-400';
                            const inputFieldClass = `w-full text-center text-sm font-black font-mono mt-1 bg-transparent border-0 focus:ring-0 focus:outline-none p-0 ${
                              isLight ? 'text-violet-800' : 'text-violet-300'
                            }`;
                            return (
                              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${bgBorderClass}`}>
                                <span className={`text-[9px] font-extrabold uppercase tracking-wider ${titleClass}`}>
                                  {isGroupMember ? "Anticipo Prop." : "Abonado"} ({sym})
                                </span>
                                <input
                                  type="number"
                                  value={o.advancePayment}
                                  onChange={e => setField('advancePayment', Number(e.target.value) || 0)}
                                  className={inputFieldClass}
                                  style={{ width: '100%' }}
                                />
                              </div>
                            );
                          })()
                        ) : (
                          renderFinanceBox(isGroupMember ? "Anticipo Prop." : "Abonado", sym + proportionalAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "violet")
                        )}

                        {renderFinanceBox(isGroupMember ? "Resta Equipo" : "Resta (Debe)", sym + balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), balanceDue > 0 ? "rose" : "emerald", balanceDue === 0)}
                      </div>
                    );
                  })()}
                  {isGroupMember && (
                    <div className={`mt-1.5 py-1 px-3 rounded-lg border text-[10px] font-sans flex items-center justify-between gap-2 ${
                      isRetro ? 'bg-[#dfdfdf]/40 border-zinc-400 text-zinc-900 shadow-sm' 
                      : isLight ? 'bg-blue-50/45 border-blue-100/70 text-blue-950 shadow-sm' 
                      : 'bg-blue-950/10 border-zinc-800/80 text-blue-300'
                    }`}>
                      <span className="font-extrabold uppercase text-[9px] tracking-wider opacity-75 shrink-0">Lote</span>
                      <div className="flex gap-3 flex-wrap">
                        <span>Total: <strong className="font-mono">{sym}{groupTotalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        <span>Anticipo: <strong className="font-mono">{sym}{groupAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        {(() => {
                          const advances = getProportionalAdvances(siblingOrders, groupAdvance);
                          const cobradoEnCaja = siblingOrders.reduce((sum, x) => {
                            const isDelivered = x.status === 'Entregado' || x.status === 'Entregado y Pagado';
                            if (!isDelivered) return sum;
                            const advVal = advances[x.id] || 0;
                            return sum + Math.max(0, x.cost - advVal);
                          }, 0);
                          return cobradoEnCaja > 0 ? (
                            <span>Cobrado: <strong className="font-mono text-emerald-500">{sym}{cobradoEnCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                          ) : null;
                        })()}
                        <span>Resta: <strong className="font-mono">{sym}{getBatchSaldo(siblingOrders).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Piezas / Repuestos */}
                <div>
                  <span className={labelCls}>Repuestos / Refacciones</span>
                  <div className={`rounded-xl border relative ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-[#1c1d22]'}`}>
                    {/* List */}
                    {o.parts && o.parts.length > 0 ? (
                      <div className="divide-y divide-zinc-800/10 max-h-[85px] overflow-y-auto pr-0.5 rounded-t-xl">
                        {o.parts.map((p, idx) => (
                          <div key={idx} className={`flex justify-between items-center px-3 py-2 text-xs ${
                            isLight ? 'bg-white border-b border-zinc-100 last:border-0' : 'bg-zinc-900/20 border-b border-zinc-800/60 last:border-0'
                          }`}>
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-extrabold truncate">{p.name}</p>
                              <p className="text-[10px] font-mono text-zinc-500">
                                Costo: {sym}{p.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {p.price ? ` | Venta: ${sym}${p.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              {canManage && !isDelivered && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePart(idx)}
                                  className="text-zinc-500 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs italic text-zinc-500 rounded-t-xl">Sin refacciones registradas.</div>
                    )}

                    {/* Inline Add Part Form */}
                    {canManage && !isDelivered && (
                      <div className={`p-1.5 flex items-center gap-2 border-t rounded-b-xl ${
                        isRetro ? 'bg-zinc-100 border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0f1013] border-[#1c1d22]'
                      }`}>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Nueva refacción..."
                            value={newPartName}
                            onChange={e => {
                              setNewPartName(e.target.value);
                              setSelectedPartRefaccionId(''); // Limpiar ID si se edita a mano
                              setShowPartSuggestions(true);
                            }}
                            onFocus={() => setShowPartSuggestions(true)}
                            onBlur={() => setTimeout(() => {
                              setShowPartSuggestions(false);
                              setActivePartSuggestionIdx(-1);
                            }, 220)}
                            onKeyDown={e => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setShowPartSuggestions(true);
                                setActivePartSuggestionIdx(prev => 
                                  prev < partSuggestions.length - 1 ? prev + 1 : 0
                                );
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setShowPartSuggestions(true);
                                setActivePartSuggestionIdx(prev => 
                                  prev > 0 ? prev - 1 : partSuggestions.length - 1
                                );
                              } else if (e.key === 'Enter') {
                                if (showPartSuggestions && activePartSuggestionIdx >= 0 && activePartSuggestionIdx < partSuggestions.length) {
                                  e.preventDefault();
                                  const s = partSuggestions[activePartSuggestionIdx];
                                  setSelectedPartRefaccionId(s.id);
                                  setNewPartName(`${s.name} (${s.deviceBrand} ${s.deviceModel})`);
                                  setNewPartCost(String(s.cost));
                                  setNewPartPrice(String(s.price));
                                  setShowPartSuggestions(false);
                                  setActivePartSuggestionIdx(-1);
                                }
                              } else if (e.key === 'Escape') {
                                setShowPartSuggestions(false);
                                setActivePartSuggestionIdx(-1);
                              }
                            }}
                            className={`w-full text-xs px-2.5 py-1 focus:outline-none rounded border ${
                              isRetro ? 'bg-white border-zinc-400 text-zinc-800' : isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                            }`}
                          />
                          {showPartSuggestions && partSuggestions.length > 0 && (
                            <div className={`absolute bottom-full mb-1.5 left-0 right-0 max-h-44 overflow-y-auto border rounded-lg shadow-xl z-50 ${
                              isRetro ? 'bg-white border-zinc-400 text-black font-mono' : isLight ? 'bg-white border-zinc-200 text-zinc-850' : 'bg-[#18191e] border-zinc-850 text-zinc-100'
                            }`}>
                              {partSuggestions.map((s, idx) => {
                                const hasStock = s.stock > 0;
                                const isActive = idx === activePartSuggestionIdx;
                                return (
                                  <div
                                    key={s.id}
                                    onMouseDown={() => {
                                      setSelectedPartRefaccionId(s.id);
                                      setNewPartName(`${s.name} (${s.deviceBrand} ${s.deviceModel})`);
                                      setNewPartCost(String(s.cost));
                                      setNewPartPrice(String(s.price));
                                      setShowPartSuggestions(false);
                                      setActivePartSuggestionIdx(-1);
                                    }}
                                    className={`px-2.5 py-1.5 text-[10.5px] cursor-pointer flex items-center justify-between transition-colors ${
                                      isActive
                                        ? (isLight ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-zinc-800 text-white font-bold')
                                        : (isLight ? 'hover:bg-zinc-100 text-zinc-800' : 'hover:bg-zinc-800/80 text-zinc-200')
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                      <PosItemThumbnail
                                        imageUrl={s.imageUrl}
                                        extraImages={s.extraImages}
                                        name={s.name}
                                        code={s.code}
                                        category={s.category || 'Refacción'}
                                        price={s.price}
                                        currencySymbol={config.currencySymbol}
                                        size={28}
                                      />
                                      <div className="truncate min-w-0 flex-1">
                                        <span className="font-bold block truncate">{s.name}</span>
                                        <span className="opacity-60 font-mono text-[9px]">({s.deviceBrand} {s.deviceModel})</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className={`text-[8.5px] font-black uppercase px-1 py-0.5 rounded ${
                                        hasStock 
                                          ? (isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/50 text-emerald-400')
                                          : (isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950/50 text-amber-500')
                                      }`}>
                                        {hasStock ? `${s.stock} pz` : 'Bajo pedido'}
                                      </span>
                                      <span className="font-mono font-bold">${s.price}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <input
                          type="number"
                          placeholder="Costo"
                          value={newPartCost}
                          onChange={e => setNewPartCost(e.target.value)}
                          className={`w-14 text-xs px-1.5 py-1 focus:outline-none rounded border font-mono ${
                            isRetro ? 'bg-white border-zinc-400 text-zinc-800' : isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                          }`}
                          title="Costo interno del taller"
                        />
                        <input
                          type="number"
                          placeholder="Precio"
                          value={newPartPrice}
                          onChange={e => setNewPartPrice(e.target.value)}
                          className={`w-14 text-xs px-1.5 py-1 focus:outline-none rounded border font-mono ${
                            isRetro ? 'bg-white border-zinc-400 text-zinc-800' : isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                          }`}
                          title="Precio cobrado al cliente"
                        />
                        <button
                          type="button"
                          onClick={handleAddPart}
                          disabled={!newPartName.trim()}
                          className={`p-1 rounded cursor-pointer transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                            isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
                          }`}
                          title="Agregar refacción normal"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {donors && donors.length > 0 && onSetDonors && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowDonorSearchModal(true);
                              if (detailOrder) {
                                setDonorSearchQuery(`${detailOrder.deviceBrand} ${detailOrder.deviceModel}`.trim());
                              }
                            }}
                            className={`p-1 rounded cursor-pointer transition-transform active:scale-95 text-white bg-teal-600 hover:bg-teal-500`}
                            title="Extraer de equipo donante (despiece)"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Gain margin calc */}
                  {((o.parts && o.parts.length > 0) || (o.serviceCost && o.serviceCost > 0)) && (
                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-zinc-400 px-1 font-mono">
                      {(() => {
                        const totalParts = o.parts ? o.parts.reduce((sum, part) => sum + part.cost, 0) : 0;
                        const sCost = o.serviceCost || 0;
                        const totalCost = totalParts + sCost;
                        const margin = o.cost - totalCost;
                        return (
                          <>
                            <span>
                              Costo: {sym}{totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {sCost > 0 && totalParts > 0 && ` (${sym}${sCost.toLocaleString('es-MX')} serv + ${sym}${totalParts.toLocaleString('es-MX')} pza)`}
                            </span>
                            <span className={margin < 0 ? 'text-rose-500 font-bold' : 'text-emerald-500'}>
                              Ganancia: {sym}{margin.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {margin < 0 && '⚠️'}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Evidencias Multimedia */}
                {!detailEditMode && o.evidence && o.evidence.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/20">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={labelCls}>Evidencias (Foto/Video)</span>
                      <button
                        type="button"
                        onClick={() => setShowEvidenceModal(o)}
                        className={`text-[9px] font-bold cursor-pointer flex items-center gap-1 hover:underline ${
                          isRetro ? 'text-[#000080]' : isLight ? 'text-indigo-600' : 'text-sky-400'
                        }`}
                      >
                        <Camera className="w-2.5 h-2.5 text-zinc-500" /> Administrar
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {o.evidence.slice(0, 3).map((ev, idx) => (
                        <div
                          key={ev.id}
                          onClick={() => setShowEvidenceModal(o)}
                          className={`relative aspect-video rounded-lg border overflow-hidden cursor-pointer flex items-center justify-center bg-black/25 hover:border-blue-500 transition-all ${
                            isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'
                          }`}
                        >
                          {ev.type === 'video' ? (
                            <div className="flex flex-col items-center justify-center text-center p-1">
                              <Video className="w-4 h-4 text-sky-400" />
                              <span className="text-[7px] text-zinc-450 truncate w-full max-w-[70px] mt-0.5">{ev.name}</span>
                            </div>
                          ) : (
                            <EvidenceMiniature ev={ev} />
                          )}
                        </div>
                      ))}
                      {o.evidence.length > 3 && (
                        <div
                          onClick={() => setShowEvidenceModal(o)}
                          className={`aspect-video rounded-lg border flex items-center justify-center cursor-pointer text-xs font-black select-none ${
                            isRetro ? 'bg-zinc-200 border-zinc-400 text-black font-mono' : isLight ? 'bg-zinc-150 border-zinc-200 text-zinc-650' : 'bg-zinc-900 border-zinc-800 text-zinc-350'
                          }`}
                        >
                          +{o.evidence.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Activity Log / Bitácora de Operaciones */}
                {!detailEditMode && (
                  <div>
                    <span className={labelCls}>Bitácora de Operaciones</span>
                    {(() => {
                      const logs = o.activityLog || [];
                      const hasCreationLog = logs.some(l => l.action === 'CREACIÓN DE ORDEN');
                      const displayLogs = hasCreationLog ? logs : [
                        {
                          action: 'CREACIÓN DE ORDEN',
                          user: o.createdBy || 'Administrador',
                          timestamp: o.createdAt
                        },
                        ...logs
                      ];
                      
                      return (
                        <div className={`rounded-xl border overflow-hidden ${
                          isRetro ? 'border-zinc-400 bg-white' : isLight ? 'border-zinc-200 bg-white' : 'border-[#1c1d22] bg-[#0f1013]/20'
                        } p-3 max-h-[135px] overflow-y-auto pr-1.5 scrollbar-thin`}>
                          <div className="relative border-l-2 border-zinc-700/30 pl-4 ml-1.5 space-y-3">
                            {displayLogs.map((log, index) => {
                              const date = new Date(log.timestamp);
                              const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                              const dateStr = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                              
                              let actionColor = 'text-zinc-450';
                              if (log.action.includes('CREACIÓN')) actionColor = 'text-sky-400 font-black';
                              else if (log.action.includes('EDICIÓN')) actionColor = 'text-amber-500 font-black';
                              else if (log.action.includes('IMPRESIÓN')) actionColor = 'text-indigo-400 font-black';
                              else if (log.action.includes('ESTADO')) actionColor = 'text-violet-400 font-black';
                              else if (log.action.includes('ENTREGA')) actionColor = 'text-emerald-500 font-black';

                              return (
                                <div key={index} className="relative text-xs">
                                  <div className={`absolute -left-[22px] top-1.5 w-2 h-2 rounded-full border ${
                                    isLight ? 'bg-white border-zinc-400' : 'bg-[#121316] border-zinc-650'
                                  }`} />
                                  <div className="flex justify-between items-start leading-none">
                                    <p className={`text-[9.5px] uppercase tracking-wide ${actionColor}`}>
                                      {log.action}
                                    </p>
                                    <span className="text-[8.5px] font-mono text-zinc-500 shrink-0 whitespace-nowrap ml-2">
                                      {dateStr} · {timeStr}
                                    </span>
                                  </div>
                                  <p className={`text-[9.5px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'} mt-1`}>
                                    Por: <strong className="font-bold">{log.user}</strong>
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Panel Footer (Actions & Workflow) */}
          <div className="px-4 pb-4 pt-3 flex flex-col gap-2.5 shrink-0 bg-transparent">
            {isBatch ? (
              /* BATCH FOOTER ACTIONS */
              (() => {
                const readyOrders = batchOrders.filter(o => (o.status === 'Listo' || o.status === 'Fallido') && !o.individuallyCharged);
                const finishedCount = batchOrders.filter(o => o.status === 'Listo' || o.status === 'Fallido' || o.status === 'Entregado' || o.status === 'Entregado y Pagado').length;
                return (
                  <div className="w-full">
                    {readyOrders.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const _due = readyOrders.reduce((s, o) => s + Math.max(0, o.cost - getIndividualAdvance(o)), 0);
                          setBatchCheckoutModal({ batchOrders: readyOrders });
                          setBatchPaymentAmounts({ 'Efectivo': String(_due) });
                        }}
                        className={`pos-checkout-btn w-full py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white`}
                      >
                        💳 Cobrar Listos ({readyOrders.length} de {batchOrders.length} Dispositivos)
                      </button>
                    ) : (
                      <div className={`pos-checkout-btn w-full py-3.5 text-xs font-black uppercase text-center flex items-center justify-center gap-1.5 select-none ${
                        isRetro 
                          ? 'bg-zinc-150 text-zinc-450 border border-zinc-350'
                          : isLight 
                            ? 'bg-zinc-50/75 text-zinc-450 border border-zinc-200' 
                            : 'bg-zinc-900/30 text-zinc-500 border border-zinc-850'
                      }`}>
                        {batchOrders.every(o => o.status === 'Entregado' || o.status === 'Entregado y Pagado' || o.status === 'Cancelado')
                          ? '✓ Lote completamente entregado'
                          : `Reparaciones en curso — ${finishedCount} de ${batchOrders.length} dispositivos listos`}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : detailEditMode ? (
              /* EDIT ACTIONS */
              <div className="flex gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => { setDetailEditMode(false); setDetailDraft(null); }}
                  className={`pos-checkout-btn flex-1 py-3.5 text-xs font-bold uppercase rounded-2xl cursor-pointer transition-all active:scale-95 ${
                    isRetro ? 'bg-red-700 text-white border-2 border-t-red-600 border-l-red-600 border-r-red-950 border-b-red-950 hover:bg-red-800'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/20'
                  }`}
                >
                  Cancelar
                </button>
                 <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className={`pos-checkout-btn flex-1 py-3.5 text-xs font-black uppercase rounded-2xl cursor-pointer transition-all active:scale-95 ${
                    hasChanges 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20' 
                      : 'bg-zinc-650/30 border border-zinc-700/30 text-zinc-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  Guardar ✓
                </button>
              </div>
            ) : (
              /* WORKFLOW ACTIONS */
              <div className="space-y-2.5 w-full">
                {/* Positive/Negative Action Buttons Row */}
                {(o.status === 'Pendiente' || o.status === 'Diagnóstico' || o.status === 'En Reparación') && (() => {
                  const completeCls = `pos-checkout-btn flex-1 py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg`;
                  const repairCls = `pos-checkout-btn flex-1 py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg`;
                  const failedCls = `pos-checkout-btn flex-1 py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg`;

                  return (
                    <div className="flex gap-2.5 w-full">
                      {/* Positive Transition */}
                      {o.status === 'Pendiente' && (
                        isPersonalMode ? (
                          <button
                            type="button"
                            onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'Listo', o.diagnosticsNote || 'REPARACIÓN FINALIZADA.'); }}
                            className={completeCls}
                          >
                            <Check className="w-4 h-4 text-white shrink-0" /> ✓ REPARACIÓN COMPLETA
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'Diagnóstico', 'INICIANDO DIAGNÓSTICO DEL EQUIPO.'); }}
                              className={`pos-checkout-btn flex-1 py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg`}
                            >
                              <Search className="w-4 h-4 text-white shrink-0" /> 🔍 DIAGNOSTICAR
                            </button>
                            <button
                              type="button"
                              onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'En Reparación', 'INICIANDO REPARACIONES EN EL EQUIPO.'); }}
                              className={repairCls}
                            >
                              <Flame className="w-4 h-4 text-white shrink-0" /> 🚀 REPARAR
                            </button>
                          </>
                        )
                      )}

                      {o.status === 'Diagnóstico' && (
                        isPersonalMode ? (
                          <button
                            type="button"
                            onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'Listo', o.diagnosticsNote || 'REPARACIÓN FINALIZADA.'); }}
                            className={completeCls}
                          >
                            <Check className="w-4 h-4 text-white shrink-0" /> ✓ REPARACIÓN COMPLETA
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'En Reparación', o.diagnosticsNote || 'AUTORIZADO: CLIENTE ACEPTÓ EL PRESUPUESTO.'); }}
                              className={repairCls}
                              title="El cliente aceptó el presupuesto y autorizó la reparación"
                            >
                              <Flame className="w-4 h-4 text-white shrink-0" /> 🚀 AUTORIZAR / REPARAR
                            </button>
                            <button
                              type="button"
                              onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'Cancelado', 'DIAGNÓSTICO REALIZADO: CLIENTE NO AUTORIZÓ EL PRESUPUESTO.'); }}
                              className="pos-checkout-btn flex-1 py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                              title="El cliente rechazó el presupuesto o decidió no reparar"
                            >
                              <Ban className="w-4 h-4 text-white shrink-0" /> 🚫 NO AUTORIZADO
                            </button>
                          </>
                        )
                      )}

                      {o.status === 'En Reparación' && (
                        <button
                          type="button"
                          onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'Listo', o.diagnosticsNote || 'REPARACIÓN FINALIZADA.'); }}
                          className={completeCls}
                        >
                          <Check className="w-4 h-4 text-white shrink-0" /> ✓ REPARACIÓN COMPLETA
                        </button>
                      )}

                      {/* Negative Transition */}
                      <button
                        type="button"
                        onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'Fallido', 'EQUIPO NO REPARABLE.'); }}
                        className={failedCls}
                      >
                        <X className="w-4 h-4 text-white shrink-0" /> ✕ NO REPARABLE
                      </button>
                    </div>
                  );
                })()}

                {/* State Transition Buttons inside the details card footer (positive flow for other states) */}
                {o.status === 'Listo' && (() => {
                  const reopenCls = `pos-checkout-btn w-full py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-2 bg-zinc-500 hover:bg-zinc-600 text-white rounded-lg`;
                  return (
                    <button
                      type="button"
                      onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'En Reparación', 'REAPERTURA: RETORNANDO EQUIPO A REPARACIÓN.'); }}
                      className={reopenCls}
                    >
                      <RefreshCw className="w-4 h-4 text-zinc-300 shrink-0" /> ↩️ REABRIR (REPARACIÓN)
                    </button>
                  );
                })()}

                {o.status === 'Fallido' && (() => {
                  const repairCls = `pos-checkout-btn w-full py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg`;
                  return (
                    <button
                      type="button"
                      onClick={() => { triggerStatusChangeConfirmation(o.id, o.customerName, `${o.deviceBrand} ${o.deviceModel}`, o.status, 'En Reparación', 'REINTENTO: RETORNANDO EQUIPO A REPARACIÓN.'); }}
                      className={repairCls}
                    >
                      <Flame className="w-4 h-4 text-white shrink-0" /> 🚀 REINTENTAR REPARACIÓN
                    </button>
                  );
                })()}

                {/* Dedicated Delivery / Checkout Button */}
                {(o.status !== 'Entregado' && o.status !== 'Entregado y Pagado' && o.status !== 'Cancelado') && (() => {
                  const isFailed = o.status === 'Fallido';
                  const isReady = o.status === 'Listo';
                  const isDisabled = !isFailed && !isReady;
                  const effectiveAdvance = getIndividualAdvance(o);
                  const balance = Math.max(0, o.cost - effectiveAdvance);
                  
                  let buttonText = '';
                  let buttonCls = '';
                  
                  if (isDisabled) {
                    buttonText = '🤝 ENTREGAR EQUIPO (REPARACIÓN EN CURSO)';
                    buttonCls = isRetro 
                      ? 'bg-blue-100/40 text-blue-300/70 border border-blue-200/30 cursor-not-allowed opacity-60 font-black uppercase'
                      : isLight 
                        ? 'bg-blue-50 border border-blue-100 text-blue-300 cursor-not-allowed opacity-70 font-black uppercase'
                        : 'bg-blue-950/15 border border-blue-900/20 text-blue-500/30 cursor-not-allowed opacity-60 font-black uppercase';
                  } else if (isFailed) {
                    if (effectiveAdvance > 0) {
                      buttonText = `🤝 ENTREGAR / DEVOLVER ANTICIPO (${sym}${effectiveAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
                    } else {
                      buttonText = '🤝 ENTREGAR EQUIPO (NO REPARADO)';
                    }
                    buttonCls = 'bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800 font-black uppercase';
                  } else {
                    // isReady (Listo)
                    if (balance > 0) {
                      buttonText = `🤝 ENTREGAR EQUIPO (COBRAR ${sym}${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
                    } else {
                      buttonText = '🤝 ENTREGAR EQUIPO (LIQUIDADO)';
                    }
                    buttonCls = 'bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800 font-black uppercase';
                  }

                  return (
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        setCheckoutOrder(o);
                        setCheckoutStep('summary');
                        setCheckoutPaymentAmounts({ 'Efectivo': isFailed ? '0' : String(balance) });
                      }}
                      className={`pos-checkout-btn pos-deliver-btn w-full py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 ${buttonCls}`}
                    >
                      {buttonText}
                    </button>
                  );
                })()}

                {/* Already Delivered Badge & Warranty */}
                {(o.status === 'Entregado' || o.status === 'Entregado y Pagado') && (
                  <div className="space-y-2.5 w-full">
                    <div className="pos-checkout-btn w-full py-3.5 text-xs font-black uppercase bg-emerald-600 text-white flex items-center justify-center gap-1.5 font-sans">
                      <CheckCircle className="w-4 h-4 text-white" /> ✓ Entregado
                    </div>
                    <button
                      type="button"
                      onClick={() => { setWarrantyConfirmOrder({ order: o }); }}
                      className="pos-checkout-btn w-full py-4 text-xs sm:text-sm font-black uppercase cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                      title="Registrar un re-ingreso por garantía de este equipo"
                    >
                      <Shield className="w-4 h-4 text-white shrink-0 animate-pulse" /> 🛡 Registrar Ingreso por Garantía
                    </button>
                  </div>
                )}

                {/* Cancelled Badge */}
                {o.status === 'Cancelado' && (
                  <div className="pos-checkout-btn w-full py-3.5 text-xs font-mono text-white font-extrabold uppercase bg-rose-600 line-through flex items-center justify-center gap-1.5">
                    ✕ Cancelado
                  </div>
                )}




              </div>
            )}
          </div>
        </div>

        {/* ── Modal de Búsqueda de Equipos Donantes ── */}
        {showDonorSearchModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
              isRetro ? 'bg-zinc-100 border-zinc-400 font-mono text-zinc-800' : isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#15161b] border-zinc-850 text-zinc-100'
            }`}>
              
              {/* Header */}
              <div className={`modal-dark-header flex items-center justify-between px-4 py-3 border-b rounded-t-xl ${
                isRetro ? 'bg-[#000080] border-[#00006a]' : isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-[#11131e] border-zinc-700'
              }`}>
                <div className="flex items-center gap-2 text-white">
                  <Wrench className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">Extraer de Equipo Donante</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowDonorSearchModal(false)} 
                  className="text-white opacity-70 hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 flex-1 flex flex-col overflow-hidden">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-70">
                    Buscar Donante (Ej: Samsung, iPhone)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribe marca o modelo..."
                      value={donorSearchQuery}
                      onChange={e => setDonorSearchQuery(e.target.value)}
                      className={`w-full text-xs pl-8 pr-3 py-2 focus:outline-none rounded-lg border ${
                        isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                      }`}
                    />
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-40" />
                  </div>
                </div>

                {/* Lista de Donantes filtrados */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {(() => {
                    const q = donorSearchQuery.toLowerCase();
                    const filtered = (donors || []).filter(d => 
                      d.status === 'Disponible' && (
                        `${d.brand} ${d.model}`.toLowerCase().includes(q) ||
                        (d.notes || '').toLowerCase().includes(q)
                      )
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs opacity-50 italic">
                          No se encontraron equipos donantes disponibles con piezas compatibles.
                        </div>
                      );
                    }

                    return filtered.map(d => {
                      const availableParts = d.parts.filter(p => p.status === 'Disponible');
                      if (availableParts.length === 0) return null;

                      return (
                        <div 
                          key={d.id} 
                          className={`p-3 rounded-xl border ${
                            isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-850'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2 border-b border-zinc-800/10 pb-1.5">
                            <div>
                              <span className="text-[10px] font-mono opacity-50 block">{d.id}</span>
                              <strong className="text-xs uppercase">{d.brand} {d.model}</strong>
                              {d.color && <span className="text-[9px] opacity-60 ml-2">({d.color})</span>}
                            </div>
                            {d.notes && (
                              <span className="text-[9px] opacity-60 max-w-[200px] truncate" title={d.notes}>
                                📝 {d.notes}
                              </span>
                            )}
                          </div>

                          {/* Lista de piezas disponibles */}
                          <div className="grid grid-cols-2 gap-1.5">
                            {availableParts.map(part => {
                              return (
                                <button
                                  key={part.id}
                                  type="button"
                                  onClick={() => {
                                    const priceStr = prompt(`Ingrese el precio a cobrar al cliente por la refacción '${part.name}' (0 para mano de obra pura o sin costo adicional):`, '0');
                                    if (priceStr === null) return; // cancelado
                                    const customerPrice = Math.max(0, parseFloat(priceStr) || 0);
                                    handleSelectDonorPart(d, part, customerPrice);
                                  }}
                                  className={`text-[10px] p-1.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors ${
                                    isLight 
                                      ? 'bg-white hover:bg-teal-50 border-zinc-200 hover:border-teal-300 text-zinc-700 hover:text-teal-700 font-medium' 
                                      : 'bg-zinc-900 hover:bg-teal-950/20 border-zinc-800 hover:border-teal-900 text-zinc-200 hover:text-teal-400 font-medium'
                                  }`}
                                >
                                  <span>{part.name}</span>
                                  <span className="text-[8px] bg-teal-500/15 text-teal-400 px-1 py-0.5 rounded font-black uppercase">Extraer</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Botón Cerrar */}
                <div className="flex justify-end pt-2 border-t border-zinc-800/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDonorSearchModal(false)}
                    className={`px-4 py-2 text-xs rounded-xl font-bold uppercase cursor-pointer border ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100' : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  })()}
  </div>

      {/* Editing Diagnostics / Inspecting modal popup */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div 
            className={`rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative animate-scaleUp max-h-[92vh] overflow-y-auto border ${
              isRetro 
                ? 'bg-[#ece9d8] text-black border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600' 
                : isLight 
                  ? 'bg-white text-zinc-900 border-zinc-200' 
                  : 'bg-[#121316] text-white border-[#2d2f36]'
            }`}
            style={{
              backgroundColor: isRetro ? '#ece9d8' : isLight ? '#ffffff' : '#121316',
              color: isRetro || isLight ? '#0f172a' : '#ffffff'
            }}
          >
            <button
              type="button"
              onClick={() => setEditingOrder(null)}
              className={`absolute top-4 right-4 cursor-pointer transition-colors ${
                isRetro || isLight ? 'text-zinc-500 hover:text-black' : 'text-gray-500 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            <div className={`flex gap-2 items-start border-b pb-3 ${
              isRetro || isLight ? 'text-indigo-600 border-zinc-200' : 'text-sky-400 border-zinc-800'
            }`}>
              <MessageSquareCode className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h3 className={`font-bold text-sm ${isRetro || isLight ? 'text-zinc-900' : 'text-white'}`}>
                  Bitácora de Notas — {editingOrder.id}
                </h3>
                <p className={`text-[10px] ${isRetro || isLight ? 'text-zinc-500' : 'text-gray-500'}`}>
                  {editingOrder.deviceBrand} {editingOrder.deviceModel} · {editingOrder.customerName}
                </p>
              </div>
            </div>

            {/* Note logs */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className={`text-[10px] uppercase font-bold tracking-wider block ${
                  isRetro || isLight ? 'text-zinc-600' : 'text-gray-400'
                }`}>
                  Apuntes internos de diagnóstico y avance técnico
                </label>
                <span className="text-[9.5px] font-mono text-zinc-500">
                  [Enter: nueva línea · Ctrl+Enter: guardar]
                </span>
              </div>
              <textarea
                rows={8}
                autoFocus
                placeholder="Escribe aquí el diagnóstico, piezas requeridas, avances de la reparación, observaciones del técnico..."
                value={diagnosticsDraft}
                onChange={(e) => setDiagnosticsDraft(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    saveDetailsDraft();
                  }
                }}
                style={{ 
                  textTransform: 'uppercase',
                  color: isRetro || isLight ? '#0f172a' : '#ffffff',
                  backgroundColor: isRetro ? '#ffffff' : isLight ? '#f8fafc' : '#08080a',
                  borderColor: isRetro || isLight ? '#cbd5e1' : '#2d2f36'
                }}
                className={`w-full border focus:outline-none rounded-lg px-3 py-2 text-xs text-left font-sans resize-none leading-relaxed shadow-inner ${
                  isRetro || isLight
                    ? 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30'
                    : 'focus:border-sky-500'
                }`}
              />
              <p className={`text-[9.5px] ${isRetro || isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                💡 Estas notas son internas del taller y no se imprimen en el ticket del cliente.
              </p>
            </div>

            <div className={`flex justify-end gap-2.5 pt-3 border-t ${
              isRetro || isLight ? 'border-zinc-200' : 'border-zinc-800'
            }`}>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer border transition-colors ${
                  isRetro
                    ? 'bg-[#ece9d8] text-black border-zinc-400 hover:bg-zinc-200'
                    : isLight
                      ? 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                      : 'bg-zinc-900 text-gray-400 border-zinc-800 hover:text-white'
                }`}
              >
                Cerrar
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={saveDetailsDraft}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded cursor-pointer transition-all active:scale-95 shadow-md flex items-center gap-1.5 ${
                    isRetro || isLight
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  Guardar Notas ✔
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout, Settle Account & Deliver Modal */}
      {checkoutOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={`${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 shadow-[4px_4px_10px_rgba(0,0,0,0.5)] max-w-2xl w-full text-black font-sans'
              : 'bg-[#121318] border border-zinc-800 rounded-2xl max-w-2xl w-full shadow-2xl text-zinc-100 font-sans'
          } overflow-y-auto max-h-[92vh] relative animate-scaleUp`}>
            {/* Header */}
            <div className={`${
              isRetro
                ? 'bg-[#000080] !text-white p-3.5 flex items-center justify-between border-b-2 border-zinc-400'
                : 'bg-[#11131e] border-b border-zinc-600 p-4 flex items-center justify-between rounded-t-2xl text-white'
            }`}>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-450 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sm !text-white uppercase tracking-wider" style={{ color: '#ffffff' }}>Resumen de Entrega y Cobro de Equipo</h3>
                  <p className="text-[10.5px] !text-zinc-200 font-mono font-bold" style={{ color: '#e4e4e7' }}>ID ÓRDEN: {checkoutOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutOrder(null)}
                className="text-zinc-200 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutStep === 'summary' ? (
              <div className="p-5 space-y-5">
                {/* Alerta Devolver Accesorios */}
                {checkoutOrder && checkoutOrder.receivedAccessories && checkoutOrder.receivedAccessories.length > 0 && (
                  <div className={`rounded-xl border px-4 py-3 flex gap-3 items-start animate-pulse ${isRetro ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-950/30 border-amber-700 text-amber-300'}`}>
                    <span className="text-lg">📦</span>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-wide">Devolver Accesorios Registrados</p>
                      <p className="text-xs font-bold font-mono">
                        {checkoutOrder.receivedAccessories.join(', ')}
                      </p>
                      <p className="text-[10px] opacity-75">Asegúrese de regresar estos elementos al cliente al entregar el equipo.</p>
                    </div>
                  </div>
                )}
                {/* Upper description / equipment summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`${
                    isRetro
                      ? 'bg-[#eaeef3] border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3.5 text-black'
                      : 'bg-[#12141c]/90 border border-zinc-600 rounded-xl p-3.5 text-zinc-300 animate-fadeIn'
                  } space-y-2 text-xs`}>
                    <p className={`text-[10px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'} font-mono uppercase tracking-wider font-bold`}>Resumen de Cliente y Reparación</p>
                    <div className="space-y-1">
                      <p className="font-bold"><span className={`${isRetro ? 'text-zinc-500' : 'text-zinc-450'} font-normal`}>Cliente:</span> {checkoutOrder.customerName}</p>
                      <p className=""><span className={`${isRetro ? 'text-zinc-500' : 'text-zinc-450'} font-normal`}>Teléfono:</span> {formatPhoneNumber(checkoutOrder.customerPhone)}</p>
                      <p className={`${isRetro ? 'text-indigo-650 font-bold' : 'text-[#22d3ee] font-black'}`}><span className={`${isRetro ? 'text-zinc-500' : 'text-zinc-450'} font-normal`}>Dispositivo:</span> {checkoutOrder.deviceBrand} {checkoutOrder.deviceModel}</p>
                      <p className={`${isRetro ? 'text-zinc-500' : 'text-zinc-300'} line-clamp-2`} title={checkoutOrder.faultDescription}><span className={`${isRetro ? 'text-zinc-500' : 'text-zinc-450'} font-normal font-sans`}>Falla:</span> {checkoutOrder.faultDescription}</p>
                    </div>
                  </div>

                  <div className={`${
                    isRetro
                      ? 'bg-[#eaeef3] border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3.5 text-black'
                      : 'bg-[#12141c]/90 border border-zinc-600 rounded-xl p-3.5 text-zinc-300 animate-fadeIn'
                  } space-y-2 text-xs flex flex-col justify-between`}>
                    <div>
                      <p className={`text-[10px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'} font-mono uppercase tracking-wider font-bold`}>Especificaciones del Estado</p>
                      <div className="space-y-1 mt-1">
                        <p className=""><span className={`${isRetro ? 'text-zinc-500' : 'text-zinc-450'} font-sans`}>Servicio:</span> {checkoutOrder.serviceType}</p>
                        <p className={`${isRetro ? 'text-[#a16207]' : 'text-amber-400'} font-mono text-[10px] font-bold`}><span className={`${isRetro ? 'text-zinc-500' : 'text-zinc-450'}`}>Registrado el:</span> {new Date(checkoutOrder.createdAt).toLocaleDateString('es-MX')}</p>
                        {checkoutOrder.createdBy && <p className="font-mono text-[10px]"><span className={`${isRetro ? 'text-zinc-500' : 'text-zinc-450'}`}>Registrado por:</span> <span className="text-sky-400 font-bold">{checkoutOrder.createdBy}</span></p>}
                      </div>
                    </div>
                    <div className="pt-2">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded uppercase font-bold border ${
                        isLight 
                          ? 'text-emerald-800 bg-emerald-100 border-emerald-300' 
                          : 'text-emerald-300 bg-emerald-950/30 border-emerald-900/50'
                      }`}>
                        Listo para Entrega
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account details / calculations */}
                <div className={`${
                  isRetro
                    ? 'bg-[#eaeef3] border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-4 text-black space-y-4'
                    : 'bg-[#13151f] border border-zinc-800 p-4 rounded-xl space-y-4'
                }`}>
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isRetro ? 'text-black' : 'text-zinc-200'}`}>Desglose de Cuenta:</span>
                    <span className="text-[10px] font-mono font-bold text-zinc-400">Monto Restante</span>
                  </div>

                  {checkoutOrder.status === 'Fallido' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {renderFinanceBox("Total", config.currencySymbol + "0.00", "gray", false, { lineThrough: true, subText: "(CANCELADO)" })}
                        {renderFinanceBox(isCheckoutGroupMember ? "Anticipo Prop." : "Anticipo Original", config.currencySymbol + effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "violet")}
                        {renderFinanceBox("Total a Devolver", config.currencySymbol + effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "rose", false, { pulsing: true, subText: "(REFUND PROPORCIONAL)" })}
                      </div>
                      {isCheckoutGroupMember && (
                        <div className={`p-2.5 rounded-lg border text-[10.5px] font-sans flex items-center justify-between ${
                          isRetro ? 'bg-[#dfdfdf]/45 border-zinc-400 text-zinc-900 shadow-sm' 
                          : isLight ? 'bg-blue-50/45 border-blue-100/70 text-blue-950 shadow-sm' 
                          : 'bg-blue-950/10 border-zinc-800 text-blue-200'
                        }`}>
                          <div>
                            <span>Este equipo pertenece al lote <strong className="font-mono">{checkoutOrder.batchId}</strong>.</span>
                            <span className="ml-2 opacity-80">(Total lote: {config.currencySymbol}{checkoutGroupTotalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • Anticipo lote: {config.currencySymbol}{checkoutGroupAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {renderFinanceBox("Total", config.currencySymbol + effectiveCheckoutCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "gray")}
                        {renderFinanceBox(isCheckoutGroupMember ? "Anticipo Prop." : "Abonado / Anticipo", config.currencySymbol + effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "emerald")}
                        {renderFinanceBox(isCheckoutGroupMember ? "Resta Equipo" : "Adeudo Restante", config.currencySymbol + effectiveCheckoutRemainingDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), effectiveCheckoutRemainingDue > 0 ? "rose" : "emerald", effectiveCheckoutRemainingDue === 0, { pulsing: effectiveCheckoutRemainingDue > 0 })}
                      </div>
                      {isCheckoutGroupMember && (
                        <div className={`p-2.5 rounded-lg border text-[10.5px] font-sans flex items-center justify-between ${
                          isRetro ? 'bg-[#dfdfdf]/45 border-zinc-400 text-zinc-900 shadow-sm' 
                          : isLight ? 'bg-blue-50/45 border-blue-100/70 text-blue-950 shadow-sm' 
                          : 'bg-blue-950/10 border-zinc-800 text-blue-200'
                        }`}>
                          <div>
                            <span>Este equipo pertenece al lote <strong className="font-mono">{checkoutOrder.batchId}</strong>.</span>
                            <span className="ml-2 opacity-80">(Total lote: {config.currencySymbol}{checkoutGroupTotalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • Anticipo lote: {config.currencySymbol}{checkoutGroupAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment controls if amount is due */}
                  {checkoutOrder.status === 'Fallido' ? (
                    effectiveCheckoutAdvance > 0 ? (
                      <div className="space-y-3 pt-1">
                        <div className="border-t border-zinc-200 pt-2 text-center">
                          <p className={`text-[11px] font-bold mb-1 flex items-center justify-center gap-1.5 uppercase font-sans ${isRetro ? 'text-[#b45309]' : 'text-amber-400'}`}>
                            💵 Devolución de Anticipo Requerida
                          </p>
                          <p className={`text-[10.5px] mb-3 max-w-md mx-auto ${isRetro ? 'text-zinc-500' : 'text-zinc-350'}`}>
                            Se debe regresar la cantidad de <span className="text-rose-500 font-black">{config.currencySymbol}{effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> al cliente por concepto de devolución proporcional del anticipo.
                          </p>
                        </div>

                        <MixedPaymentSelector amounts={checkoutPaymentAmounts} onChange={setCheckoutPaymentAmounts} due={effectiveCheckoutAdvance} isRefund isRetro={isRetro} isLight={isLight} />

                        {checkoutPaymentMethod === 'Efectivo' && (
                          <div className={`${
                            isRetro
                              ? 'bg-slate-50 border border-slate-200'
                              : 'bg-rose-500/10 border border-rose-500/20'
                          } p-3 rounded-lg text-center`}>
                            <span className={`text-[10px] ${isRetro ? 'text-zinc-500' : 'text-rose-300'} uppercase font-mono tracking-wider font-bold`}>Efectivo a Entregar (Reembolso)</span>
                            <p className="text-xl font-black font-mono text-rose-500 mt-1">
                              {config.currencySymbol}{effectiveCheckoutAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`p-3 border rounded-lg text-xs text-center font-bold ${
                        isRetro
                          ? 'bg-zinc-100 border-zinc-200 text-zinc-500'
                          : 'bg-[#12141c] border-zinc-800 text-zinc-350'
                      }`}>
                        ✨ No hay anticipos por devolver. El equipo se entrega sin costo alguno.
                      </div>
                    )
                  ) : effectiveCheckoutRemainingDue > 0 ? (
                    <div className="space-y-3 pt-1">
                      <div className="border-t border-slate-205 pt-2">
                        <p className={`text-[11px] font-bold mb-2 flex items-center gap-1.5 uppercase ${isRetro ? 'text-amber-800' : 'text-amber-400'}`}>
                          ⚠️ Se requiere liquidar saldo para retirar el equipo. Método de pago:
                        </p>
                      </div>

                      {checkoutOrder && <MixedPaymentSelector amounts={checkoutPaymentAmounts} onChange={setCheckoutPaymentAmounts} due={effectiveCheckoutRemainingDue} isRetro={isRetro} isLight={isLight} />}

                    </div>
                  ) : (
                    <div className={`p-3 border rounded-xl text-xs text-center font-bold ${
                      isRetro
                        ? 'bg-emerald-50 border-emerald-150 text-emerald-800'
                        : 'bg-[#12141c] border-zinc-600 text-emerald-350'
                    }`}>
                      ✨ Sin adeudos. El dispositivo fue completamente liquidado al registrarse el ingreso o con su anticipo proporcional.
                    </div>
                  )}
                </div>

                {/* Opciones de Impresión del Ticket */}
                <div className={`${
                  isRetro
                    ? 'bg-[#eaeef3] border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3.5 text-black flex flex-row items-center justify-between gap-3 text-xs'
                    : 'bg-[#12141c] p-3.5 rounded-xl border border-zinc-800 flex flex-row items-center justify-between gap-3 text-xs text-zinc-300'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`p-1.5 rounded-full h-8 w-8 flex items-center justify-center border shrink-0 ${
                      isRetro
                        ? isLight ? 'bg-emerald-100 border-emerald-250' : 'bg-emerald-950/30 border-emerald-900/50'
                        : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <Printer className={`w-4 h-4 ${isRetro ? (isLight ? 'text-emerald-600' : 'text-emerald-300') : 'text-emerald-400'}`} />
                    </span>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[9px]">Imprenta Automática del Taller</p>
                      <p className={`text-[10px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'} font-mono`}>
                        Impresora: <span className={`${isRetro ? 'text-sky-600' : 'text-sky-450'} font-bold`}>{config.printerInterface === 'Default' ? 'Impresora por Defecto' : (config.printerInterface || 'USB SPOOLER')}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5 items-start shrink-0 font-sans">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        id="checkbox-print-delivery-ticket"
                        checked={shouldPrintTicket}
                        onChange={(e) => {
                          setShouldPrintTicket(e.target.checked);
                          if (e.target.checked) setSendWhatsappOnCheckout(false);
                        }}
                        className={`w-5 h-5 rounded cursor-pointer ${
                          isRetro
                            ? 'text-emerald-500 bg-white border-slate-350 accent-emerald-500'
                            : 'accent-emerald-500 bg-[#07080b] border-zinc-700'
                        }`}
                      />
                      <span className={`text-[11px] font-black uppercase tracking-wider ${isRetro ? 'text-zinc-800 font-mono' : 'text-zinc-350'}`}>Imprimir ticket de salida</span>
                    </label>

                    {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                      <label 
                        title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                        onClick={isWaIntegratedOffline ? (e) => { e.preventDefault(); window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.'); } : undefined}
                        className={`flex items-center gap-3 select-none transition-all ${
                          isWaIntegratedOffline 
                            ? 'opacity-40 grayscale cursor-pointer' 
                            : 'cursor-pointer'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          id="checkbox-send-delivery-whatsapp"
                          checked={!isWaIntegratedOffline && sendWhatsappOnCheckout}
                          disabled={isWaIntegratedOffline}
                          onChange={(e) => {
                            setSendWhatsappOnCheckout(e.target.checked);
                            if (e.target.checked) setShouldPrintTicket(false);
                          }}
                          className={`w-5 h-5 rounded cursor-pointer pointer-events-none ${
                            isRetro
                              ? 'text-[#25D366] bg-white border-slate-350 accent-[#25D366]'
                              : 'accent-[#25D366] bg-[#07080b] border-zinc-700'
                          }`}
                        />
                        <span className={`text-[11px] font-black uppercase tracking-wider ${
                          !isWaIntegratedOffline && sendWhatsappOnCheckout 
                            ? 'text-[#25D366] font-bold' 
                            : isRetro ? 'text-zinc-800 font-mono' : 'text-zinc-350'
                        }`}>Enviar ticket por WhatsApp</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Footer buttons to register checkout */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCheckoutOrder(null)}
                    title="Cancelar el proceso de cobro y entrega"
                    className={`${
                      isRetro
                        ? 'bg-red-600 hover:bg-red-700 text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs px-5 py-2 cursor-pointer font-bold uppercase'
                        : 'px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer transition-all border border-red-700 uppercase shadow-xs'
                    }`}
                  >
                    Cancelar
                  </button>
                  {checkoutOrder.status !== 'Fallido' && (
                    <button
                      type="button"
                      onClick={() => handleChargeInPos(checkoutOrder)}
                      title="Agregar esta reparación al carrito de POS para cobrar junto con accesorios"
                      className={`${
                        isRetro
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs px-5 py-2 cursor-pointer font-bold uppercase flex items-center gap-1.5'
                          : 'px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-all border border-emerald-700 uppercase shadow-xs flex items-center gap-1.5'
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                      Cobrar en POS (con accesorios)
                    </button>
                  )}
                  {(() => {
                    const adv = getIndividualAdvance(checkoutOrder);
                    const remainingDue = Math.max(0, checkoutOrder.cost - adv);
                    const insufficientCash = checkoutOrder.status !== 'Fallido' && remainingDue > 0 && totalPaid(checkoutPaymentAmounts) < remainingDue;
                    return (
                      <button
                        type="button"
                        disabled={insufficientCash}
                        onClick={() => setShowDeliverConfirm(true)}
                        title="Proceder con la confirmación de cobro y entrega del equipo"
                        className={`${
                          isRetro
                            ? `border-2 border-t-white border-l-white border-b-zinc-950 border-r-zinc-950 px-6 py-2 text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${insufficientCash ? 'bg-zinc-400 text-zinc-200 cursor-not-allowed opacity-60' : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'}`
                            : `px-6 py-2.5 text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all ${insufficientCash ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed opacity-60' : 'cursor-pointer text-white bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.25)]'}`
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {checkoutOrder.status === 'Fallido'
                          ? adv > 0
                            ? `Devolver ${config.currencySymbol}${adv.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} y Entregar [↵ Enter]`
                            : 'Entregar Equipo Sin Costo [↵ Enter]'
                          : remainingDue > 0
                            ? insufficientCash
                              ? `Monto insuficiente — faltan ${config.currencySymbol}${(remainingDue - totalPaid(checkoutPaymentAmounts)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `Cobrar ${config.currencySymbol}${remainingDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} y Entregar [↵ Enter]`
                            : 'Registrar Entrega de Equipo [↵ Enter]'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            ) : (
              /* Success / Ticket View state inside the modal */
              <div className="p-5 space-y-4 text-center">
                {/* Visual Checkmark */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center border ${
                    checkoutOrder.status === 'Fallido'
                      ? 'bg-rose-50 border-rose-300 text-rose-500'
                      : 'bg-emerald-50 border-emerald-350 text-emerald-500'
                  }`}>
                    {checkoutOrder.status === 'Fallido' ? <Check className="w-5 h-5 font-black text-rose-600" /> : <Check className="w-5 h-5 font-black text-emerald-600" />}
                  </div>
                  <h4 className={`font-extrabold text-sm ${checkoutOrder.status === 'Fallido' ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {checkoutOrder.status === 'Fallido' ? '¡Equipo Devuelto y Anticipo Reembolsado!' : '¡Equipo Entregado y Cobrado con éxito!'}
                  </h4>
                  <p className="text-[10px] text-zinc-500">
                    {checkoutOrder.status === 'Fallido'
                      ? 'Se registró la entrega del equipo cancelado y la devolución íntegra del anticipo.'
                      : 'Se ingresó el saldo correspondiente a la caja diaria del taller.'}
                  </p>
                </div>

                {/* Simulated thermal receipt ticket */}
                <div className={`bg-white text-zinc-950 p-4.5 rounded shadow-inner max-w-xs mx-auto text-left font-mono text-[10px] leading-relaxed relative select-text overflow-hidden ${
                  checkoutOrder.status === 'Fallido' ? 'border-l-4 border-rose-500' : 'border-l-4 border-emerald-500'
                }`}>
                  <div className={`absolute top-0 right-0 font-sans text-[7.5px] uppercase font-bold py-0.5 px-2 rounded-bl shadow ${
                    checkoutOrder.status === 'Fallido' ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {checkoutOrder.status === 'Fallido' ? 'REEMBOLSADO' : 'LIQUIDADO'}
                  </div>
                  <div className="text-center font-sans space-y-0.5 border-b border-dashed border-zinc-300 pb-2">
                    <h5 className="font-black text-xs uppercase tracking-wider text-black">{config.storeName}</h5>
                    <p className="text-[8.5px] text-zinc-500">{config.slogan}</p>
                    <p className="text-[8.5px] text-zinc-500">{config.address}</p>
                    <p className="text-[9px] font-bold mt-1 text-zinc-700">COMPROBANTE DE ENTREGA #{checkoutOrder.id}</p>
                  </div>

                  <div className="py-2 border-b border-dashed border-zinc-300 space-y-1 text-zinc-800">
                    <p><span className="text-zinc-500 font-sans">CLIENTE:</span> {checkoutOrder.customerName.toUpperCase()}</p>
                    <p><span className="text-zinc-500 font-sans">TELÉFONO:</span> {formatPhoneNumber(checkoutOrder.customerPhone)}</p>
                    <p><span className="text-zinc-500 font-sans">FECHA:</span> {new Date().toLocaleString('es-MX')}</p>
                  </div>

                  <div className="py-2 border-b border-dashed border-zinc-300 space-y-1 text-zinc-800">
                    <p className="font-bold text-zinc-900 font-sans">DISPOSITIVO Y SERVICIO:</p>
                    <p className="pl-2">{checkoutOrder.deviceBrand.toUpperCase()} {checkoutOrder.deviceModel.toUpperCase()}</p>
                    <p className="pl-2 text-[9.5px] text-zinc-500">Servicio hecho: {checkoutOrder.serviceType}</p>
                  </div>

                  <div className="py-2 space-y-1 text-right text-zinc-900 font-mono text-[10px]">
                    {checkoutOrder.status === 'Fallido' ? (
                      <>
                        <p className="flex justify-between">
                          <span className="text-zinc-500 font-sans">COSTO ORIGINAL SERVICIO:</span>
                          <span className="line-through text-zinc-400">{config.currencySymbol}{checkoutOrder.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <p className="flex justify-between text-zinc-900 font-bold">
                          <span className="text-zinc-500 font-sans">NUEVO ACUERDO (FALLIDO):</span>
                          <span>{config.currencySymbol}0.00</span>
                        </p>
                        <p className="flex justify-between text-zinc-500">
                          <span className="font-sans">ANTICIPO DEPOSITADO:</span>
                          <span>{config.currencySymbol}{checkoutOrder.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <div className="border-t border-zinc-200 mt-1 pt-1 flex justify-between font-black text-[11px] text-rose-600">
                          <span className="font-sans font-extrabold">DEVOLUCIÓN EFECTUADA:</span>
                          <span>-{config.currencySymbol}{checkoutOrder.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[8px] text-zinc-500 mt-0.5">
                          <span className="font-sans text-[7px]">MÉTODO REEMBOLSO:</span>
                          <span>{checkoutOrder.advancePayment > 0 ? checkoutPaymentMethod.toUpperCase() : 'N/A'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="flex justify-between">
                          <span className="text-zinc-500 font-sans">COSTO TOTAL SERVICIO:</span>
                          <span>{config.currencySymbol}{checkoutOrder.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <p className="flex justify-between text-zinc-500">
                          <span className="font-sans">ANTICIPO PAGADO:</span>
                          <span>-{config.currencySymbol}{checkoutOrder.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <div className="border-t border-zinc-200 mt-1 pt-1 flex justify-between font-black text-[11px] text-zinc-950">
                          <span className="font-sans">LIQUIDACIÓN EN ENTREGA:</span>
                          <span>{config.currencySymbol}{(checkoutOrder.cost - checkoutOrder.advancePayment).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[8px] text-zinc-500 mt-0.5">
                          <span className="font-sans">MÉTODO DE COBRO:</span>
                          <span>{checkoutOrder.cost - checkoutOrder.advancePayment > 0 ? checkoutPaymentMethod.toUpperCase() : 'SALDO CUBIERTO'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-center border-t border-dashed border-zinc-300 pt-2 font-sans text-[7.5px] text-zinc-500 leading-tight">
                    <p className="font-bold">{config.ticketFooterService || '¡Gracias por su preferencia!'}</p>
                    <p className="mt-0.5">Garantía válida únicamente con este comprobante de pago.</p>
                  </div>
                </div>

                {/* Interactive ticket redirect buttons */}
                <div className="flex flex-row gap-2.5 justify-center pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      // Navigate directly to the printing view
                      setSelectedOrderId(checkoutOrder.id);
                      setActiveTab('Imprimir');
                      setCheckoutOrder(null);
                    }}
                    title="Abrir la pantalla de vista previa para imprimir el ticket oficial del servicio"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    🖨️ Ir a Imprimir Ticket Oficial
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutOrder(null)}
                    title="Cerrar el modal de ticket de salida y volver al historial"
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-all active:scale-95"
                  >
                    Cerrar y Volver
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual representation of change/refund to deliver */}
      {changeToDisplay.visible && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className={`bg-zinc-950 border-2 rounded-2xl max-w-sm w-full p-8 text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            changeToDisplay.isRefund
              ? 'border-rose-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
              : 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
          }`}>
            {/* Countdown animated border or bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-900 overflow-hidden">
              <div
                className={`h-full ${changeToDisplay.isRefund ? 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'} transition-all ease-linear`}
                style={{ width: `${(countdown / 10) * 100}%`, transitionDuration: '1000ms' }}
              />
            </div>

            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 mb-4 animate-bounce ${
                changeToDisplay.isRefund
                  ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
              }`}>
                <Coins className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {changeToDisplay.isRefund ? '🔴 DEVOLUCIÓN DE ANTICIPO' : '🟢 CAMBIO PARA EL CLIENTE'}
              </h3>
              <p className="text-zinc-500 text-[10px] font-mono font-black mt-1.5 max-w-xs truncate uppercase">
                Cliente: {changeToDisplay.clientName}
              </p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-1 shadow-inner">
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block font-extrabold">
                {changeToDisplay.isRefund ? 'DEVOLUCIÓN TOTAL EN EFECTIVO' : 'ENTREGAR EL SIGUIENTE EFECTIVO'}
              </span>
              <p className={`text-4xl font-black font-mono tracking-tight ${changeToDisplay.isRefund ? 'text-rose-500' : 'text-emerald-400'}`}>
                {config.currencySymbol}{changeToDisplay.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-zinc-500 font-mono font-bold flex items-center justify-center gap-1.5">
                <span>⏱️</span>
                <span>Se cerrará automáticamente en <strong className="text-zinc-300">{countdown}</strong> segundos...</span>
              </p>
              <button
                type="button"
                onClick={() => setChangeToDisplay((prev) => ({ ...prev, visible: false }))}
                title="Cerrar esta ventana de cambio"
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-black text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer uppercase font-sans tracking-widest"
              >
                Cerrar ahora (OK)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for state transitions */}
      {pendingStatusChange && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">

          {isRetro ? (
            /* ── RETRO VERSION — Windows 95 dialog ── */
            <div className="status-modal-card max-w-sm w-full animate-scaleUp" style={{ border: '2px solid', borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderBottomColor: '#808080', borderRightColor: '#808080', boxShadow: '2px 2px 6px rgba(0,0,0,0.4)' }}>
              {/* Title bar */}
              <div id="retro-status-titlebar" className="px-2 py-1.5 flex items-center justify-between">
                <span className="font-mono font-black text-xs uppercase tracking-wide">FixManager — Cambio de Estado</span>
                <button type="button" onClick={() => setPendingStatusChange(null)} title="Cerrar ventana sin cambiar estado" className="retro-btn-cancel w-5 h-5 flex items-center justify-center font-black text-xs cursor-pointer active:scale-95">✕</button>
              </div>
              {/* Body */}
              <div className="px-4 py-3 space-y-3">
                {/* Info row */}
                <div className="retro-inset-box flex items-center gap-3 px-3 py-2">
                  <AlertTriangle className="w-7 h-7 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-black text-sm">¿Confirmar cambio de estado?</p>
                    <p className="text-[10px] font-mono mt-0.5">{pendingStatusChange.orderId} · {pendingStatusChange.customerName} · {pendingStatusChange.deviceModel}</p>
                  </div>
                </div>
                {/* Transition */}
                <div className="flex items-center gap-2">
                  {(() => {
                    const cs = getStatusInlineStyle(pendingStatusChange.currentStatus as RepairOrder['status']);
                    const ns = getStatusInlineStyle(pendingStatusChange.newStatus as RepairOrder['status']);
                    return (<>
                      <style>{`#retro-status-current-state{background-color:${cs.background}!important;color:${cs.color}!important;opacity:0.65;}#retro-status-new-state{background-color:${ns.background}!important;color:${ns.color}!important;}`}</style>
                      <div id="retro-status-current-state" className="grow text-center px-2 py-1.5 text-[10px] font-bold uppercase">{pendingStatusChange.currentStatus === 'Pendiente' ? 'En espera' : pendingStatusChange.currentStatus}</div>
                      <span className="font-bold text-base shrink-0">→</span>
                      <div id="retro-status-new-state" className="grow text-center px-2 py-1.5 text-[10px] font-bold uppercase">{pendingStatusChange.newStatus === 'Pendiente' ? 'En espera' : pendingStatusChange.newStatus}</div>
                    </>);
                  })()}
                </div>
                {/* Note */}
                <p className="text-[10px] italic px-1">"{pendingStatusChange.diagnosticsNote}"</p>
              </div>
              {/* Footer */}
              <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid #808080' }}>
                <button type="button" onClick={() => setPendingStatusChange(null)} title="Cerrar ventana sin cambiar estado" className="retro-btn-cancel px-5 py-1.5 text-xs font-bold uppercase cursor-pointer active:scale-95">Cancelar</button>
                <button type="button" id="retro-status-confirm" onClick={handleConfirmStatusChange} title="Confirmar cambio de estado de la orden" className="px-5 py-1.5 text-xs font-black uppercase cursor-pointer active:scale-95">Sí, Confirmar</button>
              </div>
            </div>

          ) : (
            /* ── DARK / LIGHT VERSION ── */
            <div className={`max-w-md w-full relative animate-scaleUp shadow-2xl ${
              isLight ? 'bg-white border border-zinc-200 rounded-xl' : 'bg-[#121316] border border-amber-500/30 rounded-xl shadow-[0_0_40px_rgba(245,158,11,0.15)]'
            }`}>
              {/* Header */}
              <div className={`modal-dark-header flex items-center gap-3 px-5 py-4 border-b rounded-t-xl ${isRetro ? 'bg-[#000080] border-[#00006a]' : isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-[#11131e] border-zinc-700'}`}>
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-sm uppercase tracking-wider !text-white">¿Confirmar Cambio de Estado?</h3>
                  <p className="text-[10.5px] mt-0.5 font-mono text-zinc-300">
                    Ticket: <span className="font-bold text-amber-300">{pendingStatusChange.orderId}</span>
                  </p>
                </div>
                <button type="button" onClick={() => setPendingStatusChange(null)} title="Cerrar ventana sin cambiar estado" className={`cursor-pointer shrink-0 ${isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-white'}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                <div className={`grid grid-cols-2 gap-3 p-3 text-xs rounded-lg border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                  <div>
                    <span className={`text-[9px] uppercase font-black tracking-wider block font-mono mb-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Cliente</span>
                    <span className={`font-bold block ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{pendingStatusChange.customerName}</span>
                  </div>
                  <div>
                    <span className={`text-[9px] uppercase font-black tracking-wider block font-mono mb-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Equipo</span>
                    <span className={`font-bold block ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{pendingStatusChange.deviceModel}</span>
                  </div>
                </div>
                <div>
                  <span className={`text-[9px] uppercase font-black tracking-wider block font-mono mb-2 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Transición de Estado</span>
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                    <span className="flex-1 text-center px-2.5 py-1.5 text-[10px] font-bold uppercase rounded" style={{ ...getStatusInlineStyle(pendingStatusChange.currentStatus as RepairOrder['status']), opacity: 0.55 }}>
                      {pendingStatusChange.currentStatus === 'Pendiente' ? 'En espera' : pendingStatusChange.currentStatus}
                    </span>
                    <span className={`font-bold text-lg shrink-0 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>→</span>
                    <span className="flex-1 text-center px-2.5 py-1.5 text-[10px] font-bold uppercase rounded" style={getStatusInlineStyle(pendingStatusChange.newStatus as RepairOrder['status'])}>
                      {pendingStatusChange.newStatus === 'Pendiente' ? 'En espera' : pendingStatusChange.newStatus}
                    </span>
                  </div>
                </div>
                <div>
                  <span className={`text-[9px] uppercase font-black tracking-wider block font-mono mb-1 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Nota de Diagnóstico Automática</span>
                  <p className={`text-[10.5px] italic leading-relaxed px-3 py-2 rounded-lg border ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'}`}>
                    "{pendingStatusChange.diagnosticsNote}"
                  </p>
                </div>
              </div>
              {/* Footer */}
              <div className={`flex gap-3 px-5 py-4 border-t ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                <button type="button" onClick={() => setPendingStatusChange(null)}
                  title="Cerrar ventana sin cambiar estado"
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide cursor-pointer transition-all active:scale-95 rounded-lg border ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'}`}>
                  Cancelar
                </button>
                <button type="button" onClick={handleConfirmStatusChange}
                  title="Confirmar cambio de estado de la orden"
                  className="flex-1 py-2.5 text-xs font-black uppercase tracking-wide cursor-pointer transition-all active:scale-95 rounded-lg bg-amber-500 hover:bg-amber-400 text-black border border-amber-600">
                  Sí, Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRMACIÓN DE IMPRESIÓN DE TICKET ─────────────────────────── */}
      {printConfirmOrder && (
        <div className="fixed inset-0 z-[60000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${
            isRetro
              ? 'bg-[#d4d0c8] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600'
              : isLight
                ? 'bg-white border border-zinc-200'
                : 'bg-[#1a1c22] border border-zinc-700/60'
          }`}>
            {/* Header */}
            <div className={`modal-dark-header flex items-center gap-2.5 px-4 py-3 border-b ${
              isRetro ? 'bg-[#000080] border-[#00006a]' : isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-[#11131e] border-zinc-700'
            }`}>
              <Printer className="w-4 h-4 shrink-0 !text-blue-300" />
              <span className="text-xs font-black uppercase tracking-wider !text-white">
                Confirmar Impresión
              </span>
              <button
                onClick={() => { setPrintConfirmOrder(null); setPrintStatus('idle'); setPrintLabelStatus('idle'); setPrintWarrantyStatus('idle'); }}
                title="Cerrar ventana de impresión"
                className="ml-auto cursor-pointer !text-zinc-300 hover:!text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order summary */}
            <div className="px-4 py-3 space-y-3">
              <div className={`rounded-lg p-3 space-y-1.5 text-xs font-mono ${
                isRetro ? 'bg-white border border-zinc-400' : isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-[#0f1115] border border-zinc-800'
              }`}>
                <div className="flex justify-between font-mono">
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Orden</span>
                  <span className={`font-black ${isLight ? 'text-zinc-900' : 'text-sky-400'}`}>{printConfirmOrder.id}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Cliente</span>
                  <span className={`font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{printConfirmOrder.customerName}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Equipo</span>
                  <span className={isLight ? 'text-zinc-800' : 'text-zinc-200'}>{printConfirmOrder.deviceBrand} {printConfirmOrder.deviceModel}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Total</span>
                  <span className={`font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{config.currencySymbol}{printConfirmOrder.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Opción rápida: Ocultar precio en etiqueta */}
              <div className="px-1 py-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printConfirmOrder.hidePriceOnLabel ?? config.hidePriceOnLabel ?? false}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setPrintConfirmOrder(prev => prev ? ({ ...prev, hidePriceOnLabel: val }) : null);
                    }}
                    className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                  />
                  <span className={`text-[10px] font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    🙈 Ocultar precio en etiqueta (maquila / técnico externo)
                  </span>
                </label>
              </div>

              {/* Three print options */}
              <div className={`grid ${config.hybridPrintMode ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
                {/* Ticket de orden */}
                <button
                  onClick={handleConfirmPrint}
                  disabled={printStatus === 'printing' || printStatus === 'success'}
                  title="Imprimir el ticket completo de la orden para el cliente"
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60 ${
                    printStatus === 'success'
                      ? isRetro ? (isLight ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300') : 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : isRetro
                        ? 'bg-white border-[#000080] hover:bg-blue-50 text-[#000080]'
                        : isLight
                          ? 'bg-white border-sky-400 hover:bg-sky-50 text-sky-750 font-bold'
                          : 'bg-[#0f1115] border-sky-600/60 hover:bg-sky-950/40 text-sky-400'
                  }`}
                >
                  <span className="text-2xl">🧾</span>
                  <div className="text-center">
                    <div className={`text-[10px] font-black uppercase tracking-wider ${isRetro ? 'text-[#000080]' : isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                      {printStatus === 'printing' ? 'Imprimiendo…' : printStatus === 'success' ? '✓ Enviado' : 'Ticket de Orden'}
                    </div>
                    <div className={`text-[9px] mt-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Hoja completa de servicio</div>
                  </div>
                </button>

                {/* Etiqueta adhesiva */}
                {!config.hybridPrintMode && (
                  <button
                    onClick={handleConfirmPrintLabel}
                    disabled={printLabelStatus === 'printing' || printLabelStatus === 'success'}
                    title="Imprimir etiqueta adhesiva de código de barras para el equipo"
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60 ${
                      printLabelStatus === 'success'
                        ? isRetro ? (isLight ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300') : 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : isRetro
                          ? 'bg-white border-amber-600 hover:bg-amber-50 text-amber-750'
                          : isLight
                            ? 'bg-white border-amber-400 hover:bg-amber-50 text-amber-700'
                            : 'bg-[#0f1115] border-amber-600/60 hover:bg-amber-950/40 text-amber-400'
                    }`}
                  >
                    <span className="text-2xl">🏷️</span>
                    <div className="text-center">
                      <div className={`text-[10px] font-black uppercase tracking-wider ${isRetro ? 'text-amber-700' : isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                        {printLabelStatus === 'printing' ? 'Imprimiendo…' : printLabelStatus === 'success' ? '✓ Enviada' : 'Etiqueta Adhesiva'}
                      </div>
                      <div className={`text-[9px] mt-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Sticker para el equipo</div>
                    </div>
                  </button>
                )}

                {/* Sello de Garantía */}
                {!config.hybridPrintMode && (
                  <button
                    onClick={handleConfirmPrintWarrantyLabel}
                    disabled={printWarrantyStatus === 'printing' || printWarrantyStatus === 'success'}
                    title="Imprimir sello adhesivo de garantía y control para el equipo"
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60 ${
                      printWarrantyStatus === 'success'
                        ? isRetro ? (isLight ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300') : 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : isRetro
                          ? 'bg-white border-indigo-600 hover:bg-indigo-50 text-indigo-750'
                          : isLight
                            ? 'bg-white border-indigo-400 hover:bg-indigo-50 text-indigo-750 font-bold'
                            : 'bg-[#0f1115] border-indigo-600/60 hover:bg-indigo-950/40 text-indigo-400'
                    }`}
                  >
                    <span className="text-2xl">🛡️</span>
                    <div className="text-center">
                      <div className={`text-[10px] font-black uppercase tracking-wider ${isRetro ? 'text-indigo-700' : isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
                        {printWarrantyStatus === 'printing' ? 'Imprimiendo…' : printWarrantyStatus === 'success' ? '✓ Enviado' : 'Sello Garantía'}
                      </div>
                      <div className={`text-[9px] mt-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Sello de seguridad</div>
                    </div>
                  </button>
                )}

                {/* Ticket de Entrega (solo si la orden está finalizada / entregada) */}
                {(printConfirmOrder.status === 'Entregado' || printConfirmOrder.status === 'Entregado y Pagado') && (
                  <button
                    onClick={handleConfirmPrintDeliveryTicket}
                    disabled={printDeliveryStatus === 'printing' || printDeliveryStatus === 'success'}
                    title="Reimprimir comprobante de entrega oficial de la orden"
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60 ${
                      printDeliveryStatus === 'success'
                        ? isRetro ? (isLight ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300') : 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : isRetro
                          ? 'bg-white border-blue-600 hover:bg-blue-50 text-blue-800'
                          : isLight
                            ? 'bg-white border-blue-500 hover:bg-blue-50 text-blue-700 font-bold'
                            : 'bg-[#0f1115] border-blue-600/60 hover:bg-blue-950/40 text-blue-400'
                    }`}
                  >
                    <span className="text-2xl">🤝</span>
                    <div className="text-center">
                      <div className={`text-[10px] font-black uppercase tracking-wider ${isRetro ? 'text-blue-800' : isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                        {printDeliveryStatus === 'printing' ? 'Imprimiendo…' : printDeliveryStatus === 'success' ? '✓ Enviado' : 'Ticket Entrega'}
                      </div>
                      <div className={`text-[9px] mt-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Comprobante de entrega</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`flex px-4 py-3 border-t ${
              isRetro ? 'border-zinc-400 bg-[#d4d0c8]' : isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-700/60 bg-[#13151a]'
            }`}>
              <button
                onClick={() => { setPrintConfirmOrder(null); setPrintStatus('idle'); setPrintLabelStatus('idle'); setPrintWarrantyStatus('idle'); }}
                title="Cerrar ventana de impresión"
                className={`flex-1 py-2 text-xs font-bold rounded cursor-pointer transition-all active:scale-95 ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-800'
                    : isLight
                      ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMACIÓN DE IMPRESIÓN DE TICKET GRUPAL/BATCH ─────────────────── */}
      {printConfirmBatch && printConfirmBatch.batchOrders.length > 0 && (() => {
        const { batchId, batchOrders } = printConfirmBatch;
        return (
          <div className="fixed inset-0 z-[60000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className={`w-full max-w-sm rounded-xl shadow-2xl overflow-hidden ${
              isRetro
                ? 'bg-[#d4d0c8] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600'
                : isLight
                  ? 'bg-white border border-zinc-200'
                  : 'bg-[#1a1c22] border border-zinc-700/60'
            }`}>
              {/* Header */}
              <div className={`modal-dark-header flex items-center gap-2.5 px-4 py-3 border-b ${
                isRetro ? 'bg-[#000080] border-[#00006a]' : isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-[#11131e] border-zinc-700'
              }`}>
                <Printer className="w-4 h-4 shrink-0 !text-blue-300" />
                <span className="text-xs font-black uppercase tracking-wider !text-white">
                  Confirmar Impresión Grupal
                </span>
                <button
                  onClick={() => { setPrintConfirmBatch(null); setPrintStatus('idle'); }}
                  title="Cerrar ventana de impresión"
                  className="ml-auto cursor-pointer !text-zinc-300 hover:!text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content announcement */}
              <div className="px-5 py-4 space-y-4">
                <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2.5 ${
                  isRetro
                    ? 'bg-white border-zinc-400 text-black font-mono'
                    : isLight
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-750 font-sans'
                      : 'bg-[#0f1115] border-zinc-800/60 text-zinc-300 font-sans'
                }`}>
                  <p className="font-bold text-[11px] uppercase tracking-wider text-emerald-500">Aviso de Impresión Grupal</p>
                  <p>
                    Se mandará a imprimir el <strong className="text-emerald-500 font-extrabold uppercase dark:text-emerald-400">Ticket Grupal Consolidado</strong> para el lote <strong className="font-mono text-white text-[12px]">{batchId}</strong> (contiene {batchOrders.length} equipos).
                  </p>
                  <p>
                    ¿Autoriza enviar esta impresión consolidada al taller?
                  </p>
                </div>

                {/* Confirm buttons */}
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setPrintConfirmBatch(null); setPrintStatus('idle'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer text-center active:scale-95 ${
                      isRetro
                        ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-800'
                        : isLight
                          ? 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    No, Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPrintBatch}
                    disabled={printStatus === 'printing' || printStatus === 'success'}
                    className={`flex-1 py-2 text-xs font-black rounded-xl border transition-colors cursor-pointer text-center active:scale-95 text-white ${
                      printStatus === 'printing' || printStatus === 'success'
                        ? 'bg-zinc-650 border-zinc-700 opacity-60 cursor-not-allowed'
                        : 'bg-emerald-600 border-emerald-700 hover:bg-emerald-700'
                    }`}
                  >
                    {printStatus === 'printing' ? 'Imprimiendo…' : printStatus === 'success' ? '✓ Enviado' : 'Sí, Imprimir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Modal de confirmación de entrega */}
      {showDeliverConfirm && checkoutOrder && (() => {
        const isRefund = checkoutOrder.status === 'Fallido';
        const isWarranty = !!(checkoutOrder.warrantyOf && checkoutOrder.warrantyOf.trim() !== '');
        const adv = getIndividualAdvance(checkoutOrder);
        const hasAbono = adv > 0;
        const remainingDue = Math.max(0, checkoutOrder.cost - adv);
        const sym = config.currencySymbol || '$';

        return (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border ${isRetro ? 'bg-[#dfdfdf] border-zinc-500 rounded-none' : isLight ? 'bg-white border-zinc-200' : 'bg-[#131720] border-zinc-700'}`}>

              {/* Header — color violeta si es garantía, rojo si es reembolso, verde si es cobro */}
              <div id="confirm-checkout-header" className={`modal-dark-header px-5 py-4 border-b ${
                isRetro ? 'bg-[#000080] border-zinc-600'
                : isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-[#11131e] border-zinc-700'
              }`}>
                <p className="text-sm font-black uppercase tracking-wide text-white">
                  {isWarranty ? '🛡️ Confirmar Entrega de Garantía' : isRefund ? '↩️ Confirmar Devolución y Entrega' : '🤝 Confirmar Cobro y Entrega'}
                </p>
                <p className="text-[10px] mt-0.5 text-zinc-300">
                  {isWarranty
                    ? 'Esta acción marcará la orden de garantía como entregada y cerrada'
                    : isRefund
                    ? 'El equipo no pudo repararse — se devuelve al cliente'
                    : 'Esta acción marcará la orden como entregada y pagada'}
                </p>
              </div>

              {/* Cuerpo */}
              <div className={`px-5 py-4 space-y-2 text-xs ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div><span className={`block text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Orden</span><span className="font-black font-mono">{checkoutOrder.id}</span></div>
                  <div><span className={`block text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Cliente</span><span className="font-bold truncate block">{checkoutOrder.customerName}</span></div>
                  <div className="col-span-2"><span className={`block text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Equipo</span><span className="font-bold">{checkoutOrder.deviceBrand} {checkoutOrder.deviceModel}</span></div>
                </div>

                {/* Resumen financiero según caso */}
                <div className={`mt-2 rounded-xl border p-3 space-y-1.5 ${
                  isWarranty
                    ? isLight ? 'bg-violet-50 border-violet-200' : 'bg-violet-950/20 border-violet-850'
                    : isRefund
                    ? isLight ? 'bg-rose-50 border-rose-300' : 'bg-rose-950/20 border-rose-700/40'
                    : isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-700/40'
                }`}>
                  {isWarranty ? (
                    <>
                      <p className={`text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-violet-700' : 'text-violet-400'}`}>🛡️ Servicio de Garantía Vinculado a {checkoutOrder.warrantyOf}</p>
                      <div className="flex justify-between text-xs">
                        <span className={isLight ? 'text-zinc-600' : 'text-zinc-400'}>Costo total de reparación</span>
                        <span className="font-bold">{sym}0.00</span>
                      </div>
                      <div className={`flex justify-between text-sm font-black border-t pt-1.5 ${isLight ? 'border-violet-300 text-violet-700' : 'border-violet-700/40 text-violet-400'}`}>
                        <span>CUBIERTO POR GARANTÍA</span>
                        <span>{sym}0.00</span>
                      </div>
                    </>
                  ) : isRefund ? (
                    <>
                      <p className={`text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>⚠️ Equipo No Reparable — Reembolso</p>
                      <div className="flex justify-between text-xs">
                        <span className={isLight ? 'text-zinc-600' : 'text-zinc-400'}>Anticipo recibido</span>
                        <span className="font-black">{sym}{adv.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className={`flex justify-between text-sm font-black border-t pt-1.5 ${isLight ? 'border-rose-300 text-rose-700' : 'border-rose-700/40 text-rose-400'}`}>
                        <span>A DEVOLVER AL CLIENTE</span>
                        <span>{sym}{adv.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {!hasAbono && (
                        <p className={`text-[9px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Sin anticipo registrado — entrega sin cargo.</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className={`text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>✅ Reparación Completada — Cobro</p>
                      <div className="flex justify-between text-xs">
                        <span className={isLight ? 'text-zinc-600' : 'text-zinc-400'}>Costo total</span>
                        <span className="font-bold">{sym}{checkoutOrder.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {hasAbono && (
                        <div className="flex justify-between text-xs">
                          <span className={isLight ? 'text-zinc-600' : 'text-zinc-400'}>Anticipo ya pagado</span>
                          <span className="font-bold text-emerald-500">- {sym}{adv.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className={`flex justify-between text-sm font-black border-t pt-1.5 ${isLight ? 'border-emerald-300 text-emerald-700' : 'border-emerald-700/40 text-emerald-400'}`}>
                        <span>{remainingDue > 0 ? 'SALDO A COBRAR' : 'SIN SALDO PENDIENTE'}</span>
                        <span>{sym}{remainingDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {remainingDue > 0 && (
                        <div className={`mt-2 pt-2 border-t border-dashed space-y-1 ${isLight ? 'border-emerald-300' : 'border-emerald-700/40'}`}>
                          {Object.entries(checkoutPaymentAmounts).filter(([,v]) => Number(v) > 0).map(([m,v]) => (
                            <div key={m} className="flex justify-between text-xs">
                              <span className={isLight ? 'text-zinc-600' : 'text-zinc-400'}>Recibido ({m})</span>
                              <span className="font-bold">{sym}{Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                          {changeAmount(checkoutPaymentAmounts, remainingDue) > 0 && (
                            <div className={`flex justify-between text-xs font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                              <span>Cambio a entregar</span>
                              <span>{sym}{changeAmount(checkoutPaymentAmounts, remainingDue).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <p className={`text-[9px] pt-1.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Presiona Enter o el botón para confirmar. Esta acción no se puede deshacer.</p>
              </div>

              {/* Botones */}
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={handleFinalizeCheckout}
                  className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl cursor-pointer transition-all active:scale-95 ${
                    isRetro ? 'bg-[#000080] text-white border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a]'
                    : isWarranty ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : isRefund ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-black'
                  }`}
                >
                  {isWarranty ? '🛡️ Entregar Garantía [↵]' : isRefund ? '↩️ Devolver y Entregar [↵]' : '✓ Cobrar y Entregar [↵]'}
                </button>
                <button
                  onClick={() => setShowDeliverConfirm(false)}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl cursor-pointer transition-all active:scale-95 ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal de Confirmación de Creación de Garantía ──────────────────────── */}
      {warrantyConfirmOrder && (() => {
        const { order, returnBatchId } = warrantyConfirmOrder;
        
        const handleConfirmWarranty = () => {
          const newId = generateNextOrderId(orders);
          const warrantyOrder: RepairOrder = {
            ...order,
            id: newId,
            status: 'En Reparación',
            cost: 0,
            advancePayment: 0,
            advancePaymentBreakdown: [],
            isPaid: false,
            createdAt: new Date().toISOString(),
            estimatedDeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString(),
            faultDescription: `GARANTÍA — ${order.faultDescription}`,
            diagnosticsNote: '',
            parts: [],
            warrantyOf: order.id,
            batchId: undefined,
            batchPosition: undefined,
            batchTotal: undefined,
          };

          // ── Imprimir ticket de recepción de garantía automáticamente ──
          try {
            const entryHtml = buildTicketHtml(warrantyOrder, config, config.duplexManual ? 'front' : undefined);
            const paperWidthMicrons = config.ticketPaperWidth === 'media-carta-duplicado'
              ? 210000
              : (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta')
                ? 215900
                : config.ticketPaperWidth === '58mm'
                  ? 48000
                  : 72000;
            const paperHeightMicrons = config.ticketPaperWidth === 'media-carta-duplicado'
              ? 297000
              : config.hybridPrintMode
                ? 279400
                : config.ticketPaperWidth === 'media-carta'
                  ? 139700
                  : undefined;
            fmPrint({
              html: entryHtml,
              deviceName: config.ticketPrinterBrand || '',
              paperWidthMicrons,
              paperHeightMicrons,
              noToast: true,
              isLabel: false,
              isServiceTicket: config.hybridPrintMode,
              order: warrantyOrder
            });
            window.dispatchEvent(new CustomEvent('automated-print', {
              detail: {
                type: 'ticket',
                id: warrantyOrder.id,
                name: `Ticket de Ingreso (Garantía) ${warrantyOrder.id}`,
                details: `Cliente: ${warrantyOrder.customerName} • ${warrantyOrder.deviceBrand} ${warrantyOrder.deviceModel}`
              }
            }));
          } catch (err) {
            console.error('Error imprimiendo ticket de garantía:', err);
          }

          // ── Imprimir etiqueta de servicio de garantía automáticamente ──
          if (!config.hybridPrintMode) {
            try {
              const labelHtml = buildServiceLabelHtml(warrantyOrder, config);
              const sizeKey = config.labelPaperSize || '51x25mm';
              const [widthMm, heightMm] = sizeKey.replace('mm', '').split('x').map(Number);
              fmPrint({
                html: labelHtml,
                deviceName: config.labelPrinterBrand || '',
                paperWidthMicrons: widthMm * 1000,
                paperHeightMicrons: heightMm * 1000,
                isLabel: true,
                copies: config.printLabelCopies || 1,
                noToast: true
              });
              window.dispatchEvent(new CustomEvent('automated-print', {
                detail: {
                  type: 'label',
                  id: warrantyOrder.id,
                  name: `Etiqueta de Ingreso (Garantía) ${warrantyOrder.id}`,
                  details: `Cliente: ${warrantyOrder.customerName} • ${warrantyOrder.deviceBrand} ${warrantyOrder.deviceModel}`
                }
              }));
            } catch (err) {
              console.error('Error imprimiendo etiqueta de garantía:', err);
            }
          }

          onAddOrder && onAddOrder(warrantyOrder);
          setWarrantyConfirmOrder(null);
        };

        const handleCancelWarranty = () => {
          setWarrantyConfirmOrder(null);
          if (returnBatchId) {
            setSelectedOrderIdLocal(returnBatchId);
          }
        };

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            {isRetro ? (
              /* RETRO CONFIRMATION */
              <div className="status-modal-card max-w-sm w-full animate-scaleUp" style={{ border: '2px solid', borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderBottomColor: '#808080', borderRightColor: '#808080', boxShadow: '2px 2px 6px rgba(0,0,0,0.4)' }}>
                <div id="retro-status-titlebar" className="px-2 py-1.5 flex items-center justify-between bg-[#000080] text-white">
                  <span className="font-mono font-black text-xs uppercase tracking-wide">FixManager — Confirmar Garantía</span>
                  <button type="button" onClick={handleCancelWarranty} className="retro-btn-cancel w-5 h-5 flex items-center justify-center font-black text-xs cursor-pointer active:scale-95">✕</button>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="retro-inset-box flex items-center gap-3 px-3 py-2">
                    <AlertTriangle className="w-7 h-7 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-black text-sm">¿Registrar orden bajo garantía?</p>
                      <p className="text-[10px] font-mono mt-0.5">{order.id} · {order.customerName}</p>
                    </div>
                  </div>
                  <p className="text-[10.5px] leading-relaxed font-mono">
                    Esta acción creará una nueva orden de servicio vinculada a la orden original <b>{order.id}</b> con un costo de <b>$0.00</b>. El equipo ingresará con el estado <b>En Reparación</b>.
                  </p>
                </div>
                <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid #808080' }}>
                  <button type="button" onClick={handleCancelWarranty} className="retro-btn-cancel px-5 py-1.5 text-xs font-bold uppercase cursor-pointer active:scale-95">Cancelar</button>
                  <button type="button" onClick={handleConfirmWarranty} className="px-5 py-1.5 text-xs font-black uppercase cursor-pointer active:scale-95">Confirmar</button>
                </div>
              </div>
            ) : (
              /* MODERN CONFIRMATION */
              <div className={`max-w-md w-full relative animate-scaleUp shadow-2xl ${
                isLight ? 'bg-white border border-zinc-200 rounded-xl' : 'bg-[#121316] border border-violet-500/30 rounded-xl shadow-[0_0_40px_rgba(124,58,237,0.15)]'
              }`}>
                <div className={`modal-dark-header flex items-center gap-3 px-5 py-4 border-b rounded-t-xl ${isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-[#11131e] border-zinc-700'}`}>
                  <AlertTriangle className="w-5 h-5 shrink-0 text-violet-400" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm uppercase tracking-wider text-white">¿Confirmar Ingreso por Garantía?</h3>
                    <p className="text-[10.5px] mt-0.5 font-mono text-zinc-300">
                      Orden original: <span className="font-bold text-violet-300">{order.id}</span>
                    </p>
                  </div>
                  <button type="button" onClick={handleCancelWarranty} className={`cursor-pointer shrink-0 ${isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-white'}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${isLight ? 'bg-violet-50/50 border-violet-100 text-zinc-700' : 'bg-violet-950/10 border-violet-900/30 text-zinc-300'}`}>
                    <p className="font-bold text-sm text-violet-400">🛡️ Detalle de la Garantía:</p>
                    <ul className="list-disc pl-4 space-y-1.5">
                      <li>Se registrará una nueva orden de reparación vinculada a la orden original <b>{order.id}</b>.</li>
                      <li>El equipo ingresará automáticamente con estado <b>En Reparación</b>.</li>
                      <li>El costo se establecerá en <b>$0.00</b> de forma automática.</li>
                    </ul>
                  </div>
                </div>
                <div className={`px-5 py-4 border-t flex justify-end gap-2.5 rounded-b-xl ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#13151b] border-zinc-700/60'}`}>
                  <button type="button" onClick={handleCancelWarranty} className={`px-4 py-2 text-xs font-bold uppercase rounded-lg cursor-pointer transition-all active:scale-95 ${isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleConfirmWarranty} className="px-5 py-2 text-xs font-black uppercase rounded-lg cursor-pointer transition-all active:scale-95 bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/20">
                    Registrar Garantía ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Modal PIN de administrador ────────────────────────────────────── */}
      {showDetailPinModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${isRetro ? 'bg-[#f8fafc] border border-slate-200' : isLight ? 'bg-white border border-blue-100' : 'bg-[#121316] border border-[#2d2f36] text-white'}`}>
            <div className="bg-gradient-to-r from-[#000080] to-[#1034a6] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                🔐 Autenticación de Autorización
              </div>
              <button onClick={() => { setShowDetailPinModal(false); setDetailPin(''); setDetailPinError(''); }}
                className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-[10px] cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className={`p-3 rounded-lg border text-[10.5px] leading-relaxed font-bold ${
                isLight ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-950/20 border-amber-900/30 text-amber-400'
              }`}>
                ⚠️ ADVERTENCIA: Modificar una orden puede alterar las finanzas, saldos de caja, detalles de equipos e historial de servicio. Esta acción requiere autorización expresa.
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Ingrese el PIN de un administrador para continuar:
              </p>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">PIN (4 dígitos)</label>
                <input
                  ref={detailPinInputRef}
                  type="password" inputMode="numeric" maxLength={4} autoFocus
                  value={detailPin}
                  onChange={e => { setDetailPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setDetailPinError(''); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const admins = users.filter(u => u.role === 'admin');
                      const ok = admins.length === 0 ? detailPin === '1234' : admins.some(u => u.pin === detailPin);
                      if (ok) {
                        setShowDetailPinModal(false);
                        setDetailPin('');
                        if (pinPurpose === 'delete') {
                          setShowDeleteConfirmModal(true);
                        } else {
                          startEditing(detailOrder!);
                        }
                      } else {
                        setDetailPinError('PIN incorrecto. Intente de nuevo.');
                        setDetailPin('');
                      }
                    }
                    if (e.key === 'Escape') { setShowDetailPinModal(false); setDetailPin(''); setDetailPinError(''); }
                  }}
                  placeholder="••••"
                  className={`w-full border-2 focus:border-blue-500 rounded-xl px-3 py-2.5 text-center text-xl font-mono font-black tracking-[0.5em] focus:outline-none transition-colors ${
                    isLight ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-zinc-900 border-zinc-700 text-white'
                  }`}
                />
                {detailPinError && <p className="text-[11px] text-rose-600 font-bold">{detailPinError}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={() => { setShowDetailPinModal(false); setDetailPin(''); setDetailPinError(''); }}
                  className={`py-2 font-bold rounded-xl text-xs uppercase cursor-pointer active:scale-95 ${
                    isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}>Cancelar</button>
                <button
                  disabled={detailPin.length < 4}
                  onClick={() => {
                    const admins = users.filter(u => u.role === 'admin');
                    const ok = admins.length === 0 ? detailPin === '1234' : admins.some(u => u.pin === detailPin);
                    if (ok) {
                      setShowDetailPinModal(false);
                      setDetailPin('');
                      if (pinPurpose === 'delete') {
                        setShowDeleteConfirmModal(true);
                      } else {
                        startEditing(detailOrder!);
                      }
                    } else {
                      setDetailPinError('PIN incorrecto. Intente de nuevo.');
                      setDetailPin('');
                    }
                  }}
                  className="py-2 bg-[#000080] hover:bg-[#0000aa] text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  🔓 Autorizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmación de Eliminación Completa ────────────────────── */}
      {showDeleteConfirmModal && detailOrder && (() => {
        const isRetro = config.theme === 'retro-window';
        const isLight = config.themeMode === 'light';
        const sym = config.currencySymbol || '$';
        const isGroupMember = !!detailOrder.batchId && orders.filter(x => x.batchId === detailOrder.batchId).length > 1;
        const adv = detailOrder.batchId ? (detailOrder.batchAdvancePayment || 0) : (detailOrder.advancePayment || 0);
        const hasParts = detailOrder.parts && detailOrder.parts.length > 0;
        const totalPartsCost = detailOrder.parts ? detailOrder.parts.reduce((s, p) => s + p.cost, 0) : 0;

        return (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border ${isRetro ? 'bg-[#dfdfdf] border-zinc-500 rounded-none' : isLight ? 'bg-white border-zinc-200' : 'bg-[#131720] border-zinc-700 text-white'}`}>
              
              {/* Header */}
              <div className="modal-dark-header px-5 py-4 border-b bg-gradient-to-r from-red-805 to-rose-700 border-zinc-700" style={{ backgroundImage: 'linear-gradient(to right, #991b1b, #be123c)' }}>
                <p className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-1.5">
                  <Trash2 className="w-4.5 h-4.5" /> Confirmar Eliminación de Orden
                </p>
                <p className="text-[10px] mt-0.5 text-zinc-200">
                  Esta acción eliminará de forma permanente el registro de la orden {detailOrder.id}
                </p>
              </div>

              {/* Cuerpo */}
              <div className={`px-5 py-4 space-y-3.5 text-xs ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                
                {/* Resumen del equipo */}
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950/20 border-zinc-800'} space-y-1.5`}>
                  <div className="flex justify-between">
                    <span className="opacity-60">Orden ID:</span>
                    <strong className="font-mono font-black">{detailOrder.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Cliente:</span>
                    <strong className="font-bold">{detailOrder.customerName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Equipo:</span>
                    <strong className="font-bold">{detailOrder.deviceBrand} {detailOrder.deviceModel}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Estado:</span>
                    <strong className="font-bold">{detailOrder.status}</strong>
                  </div>
                </div>

                {/* Advertencias condicionales */}
                <div className="space-y-2">
                  {/* Anticipo */}
                  {adv > 0 && (
                    <div className={`p-3 rounded-lg border text-[11px] leading-relaxed font-semibold ${
                      isLight ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-950/20 border-amber-900/40 text-amber-400'
                    }`}>
                      💰 <strong>Anticipo Detectado:</strong> Esta orden cuenta con un anticipo de <strong>{sym}{adv.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>.
                      <p className="mt-1 font-normal text-[10px] opacity-90">
                        Como seleccionaste la opción lógica de caja, puedes elegir reembolsar el dinero (creará un egreso de caja automático) o solo eliminarla.
                      </p>
                    </div>
                  )}

                  {/* Refacciones */}
                  {hasParts && (
                    <div className={`p-3 rounded-lg border text-[11px] leading-relaxed font-semibold ${
                      isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/25 border-rose-900/30 text-rose-400'
                    }`}>
                      🛠️ <strong>Piezas Asignadas:</strong> Se descartará el registro de {detailOrder.parts?.length} pieza(s) asignadas con un costo de <strong>{sym}{totalPartsCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>.
                    </div>
                  )}

                  {/* Grupo */}
                  {isGroupMember && (
                    <div className={`p-3 rounded-lg border text-[11px] leading-relaxed font-semibold ${
                      isLight ? 'bg-sky-50 border-sky-200 text-sky-800' : 'bg-sky-950/20 border-sky-900/40 text-sky-400'
                    }`}>
                      📦 <strong>Lote Grupal:</strong> Pertene el lote <strong>{detailOrder.batchId}</strong>. Las órdenes hermanas restantes seguirán activas y se actualizará su numeración proporcional.
                    </div>
                  )}
                </div>

                <p className="text-[11px] font-bold text-red-500 text-center select-none pt-1">
                  ⚠️ ADVERTENCIA: Esta acción es permanente y no se puede deshacer.
                </p>

              </div>

              {/* Botones de acción */}
              <div className={`px-5 py-3 border-t flex flex-col gap-2 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#11131a] border-zinc-850'}`}>
                {adv > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteOrder(detailOrder.id, { refundAdvance: true });
                          setShowDeleteConfirmModal(false);
                          setSelectedOrderIdLocal(null);
                        }}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] rounded-lg uppercase tracking-wide cursor-pointer text-center active:scale-95 transition-all shadow-md shadow-emerald-950/20 flex flex-col items-center justify-center leading-tight"
                      >
                        <span>Reembolsar y</span>
                        <span>Eliminar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteOrder(detailOrder.id, { refundAdvance: false });
                          setShowDeleteConfirmModal(false);
                          setSelectedOrderIdLocal(null);
                        }}
                        className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[11px] rounded-lg uppercase tracking-wide cursor-pointer text-center active:scale-95 transition-all shadow-md shadow-amber-950/20 flex flex-col items-center justify-center leading-tight"
                      >
                        <span>Solo Eliminar</span>
                        <span>(Sin Egreso)</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className={`w-full py-2 font-bold rounded-lg text-xs uppercase cursor-pointer active:scale-95 text-center ${
                        isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      Cancelar (No eliminar)
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className={`py-2.5 font-bold rounded-lg text-xs uppercase cursor-pointer active:scale-95 text-center ${
                        isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteOrder(detailOrder.id);
                        setShowDeleteConfirmModal(false);
                        setSelectedOrderIdLocal(null);
                      }}
                      className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-lg text-xs uppercase tracking-wide cursor-pointer text-center active:scale-95 transition-all shadow-md shadow-rose-950/20"
                    >
                      Eliminar ✓
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal checkout grupal — cobrar todos los listos del grupo */}
      {batchCheckoutModal && (() => {
        const { batchOrders: readyOrders } = batchCheckoutModal;
        const sym = config.currencySymbol || '$';
        const totalCost = readyOrders.reduce((s, o) => s + o.cost, 0);
        const isBatch = readyOrders.some(o => o.batchId);
        const totalAdvance = readyOrders.reduce((s, o) => s + getIndividualAdvance(o), 0);
        const totalDue = Math.max(0, totalCost - totalAdvance);
        const batchTotalPaid = totalPaid(batchPaymentAmounts);
        const batchInsufficient = totalDue > 0 && batchTotalPaid < totalDue;
        const ordersWithAccessories = readyOrders.filter(o => o.receivedAccessories && o.receivedAccessories.length > 0);

        const handleConfirmBatchCheckout = async () => {
          const changeAmt = changeAmount(batchPaymentAmounts, totalDue);

          const batchCash = Number(batchPaymentAmounts['Efectivo']) || 0;
          const batchCard = (Number(batchPaymentAmounts['Tarjeta']) || 0) + (Number(batchPaymentAmounts['Tarjeta/Transfer']) || 0);

          for (const order of readyOrders) {
            const orderDue = Math.max(0, order.cost - getIndividualAdvance(order));
            const ratio = totalDue > 0 ? orderDue / totalDue : 0;
            const orderCashPaid = batchCash * ratio;
            const orderCardPaid = batchCard * ratio;
            onDeliverOrder(order.id, orderCashPaid, orderCardPaid);
          }



          // Mostrar overlay de cambio igual que checkout individual
          if (changeAmt > 0 || totalDue === 0) {
            setChangeToDisplay({
              visible: true,
              amount: changeAmt,
              isRefund: false,
              clientName: readyOrders[0]?.customerName || '',
            });
          }

          // Ticket agrupado
          if (shouldPrintTicket) {
            const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
            const dateStr = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
            const paperWidth = config.ticketPaperWidth || '80mm';
            const offset = config.ticketMarginOffset || 0;
            const is58 = paperWidth === '58mm';
            const isMediaCarta = paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado' || config.hybridPrintMode;
            const isMediaCartaDuplicado = paperWidth === 'media-carta-duplicado' || config.hybridPrintMode;
            const rightPad = isMediaCarta ? '6mm' : (is58 ? '8mm' : '6mm');
            const leftPad = isMediaCarta ? '6mm' : (is58 ? '3mm' : '5mm');
            const pageSizeCss = isMediaCartaDuplicado ? '210mm 297mm' : isMediaCarta ? '216mm 140mm' : `${paperWidth} auto`;
            const pageMarginCss = isMediaCarta ? '0' : '2mm 1mm';
            const first = readyOrders[0];
            const totalCost = readyOrders.reduce((s, o) => s + o.cost, 0);
            const storePhoneFormatted = config.phone
              ? config.phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || config.phone
              : '';
            const storeLogoHtml = config.mediaCartaLogoUrl
              ? `<img src="${config.mediaCartaLogoUrl}" onload="(function(img){
                  var ratio = img.naturalWidth / img.naturalHeight;
                  if (ratio > 1.4) {
                    img.style.maxWidth = '75mm';
                    img.style.maxHeight = '28mm';
                  } else {
                    img.style.maxWidth = '42mm';
                    img.style.maxHeight = '24mm';
                  }
                })(this)" style="max-height: 20mm; max-width: 45mm; object-fit: contain; display: block;" />`
              : '';
            const customerPhoneStr = first.customerPhone
              ? formatCustomerPhoneWithCountryCode(first.customerPhone, first.customerCountryCode)
              : 'N/A';
            const policies = config.termsAndConditionsService || config.termsAndConditions || '';

            const itemRowsMediaCarta = readyOrders.map((o, idx) => {
              const accsLine = o.receivedAccessories && o.receivedAccessories.length > 0
                ? `<div style="font-size: 8px; color: #475569; font-style: italic; margin-top: 1px;"><b>Accesorios Devueltos:</b> ${o.receivedAccessories.join(', ')}</div>`
                : '';
              return `<tr>
                <td>
                  <div style="font-weight: 700; font-size: 10.5px;">${o.deviceBrand} ${o.deviceModel}</div>
                  <div style="font-size: 9px; color: #334155; margin-top: 2px;"><b>SERVICIO:</b> ${o.serviceType || 'Soporte Técnico'}</div>
                  ${accsLine}
                </td>
                <td style="text-align: right; font-weight: 700; font-size: 10.5px; vertical-align: middle;">${sym}${o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>`;
            }).join('');

            const paymentBreakdownHtml = Object.entries(batchPaymentAmounts)
              .filter(([, v]) => Number(v) > 0)
              .map(([m, v]) => `<div class="total-row" style="font-size: 9px;"><span class="data-label">${m}:</span><span class="data-value">${sym}${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`)
              .join('');

            const itemRows = readyOrders.map(o => {
              const accsLine = o.receivedAccessories && o.receivedAccessories.length > 0
                ? `<div class="kv" style="padding-left: 4px; font-style: italic; font-size: 9px; margin-top: -1px;"><span>↳ Accesorios Devueltos:</span><span>${o.receivedAccessories.join(', ')}</span></div>`
                : '';
              return `<div class="kv"><span>${o.deviceBrand} ${o.deviceModel}</span><span class="bold">${sym}${o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>${accsLine}`;
            }).join('');

            const code128Script = getBarcodeScript(first.batchId || first.id, config.barcodeAsImage);

            const innerContent = `
  <div>
    <table class="header-table">
      <tr>
        ${storeLogoHtml ? `
          <td class="header-cell" style="width: 40%; vertical-align: middle;">${storeLogoHtml}</td>
          <td class="header-cell" style="width: 60%; padding-left: 10px; text-align: center; vertical-align: middle;">
            <div class="store-title" style="font-size: 16px;">${config.storeName || 'SOPORTE TÉCNICO'}</div>
        ` : `
          <td class="header-cell" style="width: 100%; text-align: center; vertical-align: middle;">
            <div class="store-title" style="font-size: 24px; margin-bottom: 4px;">${config.storeName || 'SOPORTE TÉCNICO'}</div>
        `}
            <div class="store-details">
              ${config.slogan ? `<i>"${config.slogan}"</i><br>` : ''}
              ${config.address ? `Dirección: ${config.address}<br>` : ''}
              ${storePhoneFormatted ? `Tel: ${storePhoneFormatted}` : ''}
            </div>
          </td>
      </tr>
    </table>
    <table style="width: 100%; margin-bottom: 8px;">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 5px;">
          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
            <div class="grid-title">ENTREGA GRUPAL</div>
            <div class="grid-body">
              <div class="data-row"><span class="data-label">No. Equipos:</span><span class="data-value">${readyOrders.length}</span></div>
              <div class="data-row"><span class="data-label">Fecha Entrega:</span><span class="data-value">${dateStr}</span></div>
            </div>
          </div>
        </td>
        <td style="width: 50%; vertical-align: top; padding-left: 5px;">
          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
            <div class="grid-title">Datos del Cliente</div>
            <div class="grid-body">
              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">${first.customerName.toUpperCase()}</span></div>
              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">${customerPhoneStr}</span></div>
            </div>
          </div>
        </td>
      </tr>
    </table>
    <table class="items-table">
      <thead><tr><th style="width: 75%;">Dispositivo & Servicio Entregado</th><th style="width: 25%; text-align: right;">Costo</th></tr></thead>
      <tbody>${itemRowsMediaCarta}</tbody>
    </table>
  </div>
  <div>
    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">
      <tr>
        <td style="width: 55%; vertical-align: top; padding-right: 12px;">
          ${policies ? `<div class="policies-box" style="margin-top: 0; margin-bottom: 6px;"><b>PÓLIZA DE GARANTÍA:</b> ${policies}</div>` : ''}
          <table class="signatures-table" style="width: 100%; margin-top: 4px; margin-bottom: 0;">
            <tr>
              <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma de Recibido del Cliente</div></td>
              <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>
            </tr>
          </table>
        </td>
        <td style="width: 45%; vertical-align: top;">
          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">
            <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">${sym}${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div class="total-row"><span class="data-label">Anticipo Total:</span><span class="data-value">-${sym}${totalAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>TOTAL COBRADO:</span><span>${sym}${totalDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            ${paymentBreakdownHtml}
            ${changeAmt > 0 ? `<div class="total-row" style="font-size: 9px; font-weight: bold;"><span class="data-label">CAMBIO:</span><span class="data-value">${sym}${changeAmt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
          </div>
        </td>
      </tr>
    </table>
    <div style="text-align: center; border-top: 1px dashed #94a3b8; padding-top: 4px; margin-top: 6px;">
      <div class="bc-target" id="bc" style="margin: 0 auto; display: flex; justify-content: center;"></div>
      <div style="font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ${first.batchId || first.id} *</div>
      <div class="footer-text" style="font-size: 9px; font-weight: 900; margin-top: 3px; color: #000;">${footer}</div>
    </div>
  </div>
`;

            const ticketHtml = isMediaCarta
              ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @page { size: ${isMediaCartaDuplicado ? '210mm 297mm' : '216mm 140mm'}; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #000; background: #fff; line-height: 1.35; padding: 0; margin: 0; }
  .invoice-container { width: 100%; height: 128mm; max-height: 128mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .header-cell { vertical-align: top; }
  .store-title { font-size: 16px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }
  .store-details { font-size: 9px; font-weight: 600; color: #333; margin-top: 3px; }
  .grid-title { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 3px 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid-body { padding: 6px; }
  .data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0; }
  .data-row:last-child { border-bottom: none; }
  .data-label { font-weight: 700; color: #475569; }
  .data-value { font-weight: 700; color: #000; text-align: right; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000; }
  .items-table th { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 4px 6px; text-transform: uppercase; text-align: left; }
  .items-table td { padding: 6px; border-bottom: 1px solid #cbd5e1; font-size: 10.5px; vertical-align: top; }
  .totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 6px; background: #fafaf9; }
  .total-row { display: flex; justify-content: space-between; padding: 2.5px 0; font-size: 10.5px; }
  .total-row.grand-total { font-size: 12px; font-weight: 900; background: #000; color: #fff; padding: 4px; margin-top: 3px; border-radius: 2px; }
  .policies-box { font-size: 7px; color: #475569; line-height: 1.3; border: 1px solid #e2e8f0; padding: 4px 6px; background: #f8fafc; border-radius: 4px; margin-top: 4px; margin-bottom: 8px; word-break: break-all; overflow-wrap: break-word; }
  .signatures-table { width: 100%; margin-top: 15px; margin-bottom: 10px; }
  .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 2px; font-size: 8px; font-weight: 700; text-align: center; text-transform: uppercase; }
  .footer-text { font-size: 9px; font-weight: 900; text-align: center; margin-top: 3px; color: #000; }
</style></head><body>
${isMediaCartaDuplicado ? `
  <div style="height: 140mm; display: flex; flex-direction: column; justify-content: space-between; padding: 6mm 8mm 0 8mm; box-sizing: border-box;">
    <div class="invoice-container">
      ${innerContent}
    </div>
  </div>
  <hr style="border: none; border-top: 1.5px dashed #000; margin: 0;">
  <div style="height: 140mm; display: flex; flex-direction: column; justify-content: space-between; padding: 6mm 8mm 0 8mm; box-sizing: border-box;">
    <div class="invoice-container">
      ${innerContent}
    </div>
  </div>
` : `
  <div style="padding: 6mm 8mm 0 8mm;">
    <div class="invoice-container">
      ${innerContent}
    </div>
  </div>
`}
<script>${code128Script}</script>
</body></html>`
              : `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: ${pageSizeCss}; margin: ${pageMarginCss}; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : isMediaCarta ? '14' : '13'}px; font-weight: 700; width: 100%; margin: 0; padding: 2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px); color: #000; background: #fff; }
  .center { text-align: center; } .bold { font-weight: 900; }
  .store { font-size: 15px; font-weight: 900; text-align: center; margin-bottom: 1px; }
  hr { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }
  .kv { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 10px; margin: 1px 0; }
  .kv-val { text-align: right; flex: 1; min-width: 0; word-break: break-word; font-weight: 900; margin-left: 8px; }
  .badge { display: block; font-weight: 950; text-align: center; font-size: 11px; background: #000 !important; color: #fff !important; padding: 5px 0 !important; margin: 3.5px 0; letter-spacing: 1px; line-height: 1.25 !important; height: auto !important; }
  .total-row { font-size: 13px; font-weight: 900; text-align: right; border-top: 2px solid #000; margin-top: 4px; padding-top: 2px; }
  .footer { font-size: 10px; font-weight: 700; text-align: center; margin-top: 5px; }
</style></head><body>
  ${buildTicketHeaderHtml(config, paperWidth)}
  <hr>
  <div class="badge">ENTREGA GRUPAL</div>
  <div class="kv"><span>FECHA:</span><span class="kv-val">${dateStr}</span></div>
  <div class="kv"><span>CLIENTE:</span><span class="kv-val">${first.customerName}</span></div>
  ${first.customerPhone ? `<div class="kv"><span>TEL:</span><span class="kv-val">${formatCustomerPhoneWithCountryCode(first.customerPhone, first.customerCountryCode)}</span></div>` : ''}
  <hr>
  ${itemRows}
  <hr>
  <div class="kv"><span>ANTICIPO TOTAL:</span><span>${sym}${totalAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  <div class="total-row">COBRADO: ${sym}${totalDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
  ${Object.entries(batchPaymentAmounts).filter(([,v]) => Number(v) > 0).map(([m,v]) => `<div class="kv"><span>${m}:</span><span>${sym}${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`).join('')}
  ${changeAmt > 0 ? `<div class="kv"><span>CAMBIO:</span><span>${sym}${changeAmt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
  <div class="footer">${footer}</div>
  <div style="text-align: center; border-top: 1px dashed #000; padding-top: 4px; margin-top: 6px;">
    <div class="bc-target" id="bc" style="margin: 0 auto; display: flex; justify-content: center;"></div>
    <div style="font-size: 8px; font-weight: 700; color: #000; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ${first.batchId || first.id} *</div>
  </div>
  <script>${code128Script}</script>
</body></html>`;

            const paperWidthMicrons = paperWidth === 'media-carta-duplicado'
              ? 210000
              : (config.hybridPrintMode || paperWidth === 'media-carta')
                ? 215900
                : paperWidth === '58mm'
                  ? 48000
                  : 72000;
            const paperHeightMicrons = paperWidth === 'media-carta-duplicado'
              ? 297000
              : config.hybridPrintMode
                ? 279400
                : paperWidth === 'media-carta'
                  ? 139700
                  : undefined;

            fmPrint({ html: ticketHtml, deviceName: config.ticketPrinterBrand || '', paperWidthMicrons, paperHeightMicrons, toastName: `Entrega Grupal — ${first.customerName}`, toastDetails: `${readyOrders.length} equipos`, isLabel: false });
          }

          setBatchCheckoutModal(null);
          setBatchPaymentAmounts({ 'Efectivo': '' });
        };

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-700'}`}>
              {/* Header */}
              <div className={`modal-dark-header ${isRetro ? 'bg-[#000080] p-4 flex items-center justify-between border-b-2 border-zinc-400' : isLight ? 'bg-[#1a3a6b] p-4 flex items-center justify-between border-b border-blue-300' : 'bg-[#11131e] border-b border-zinc-600 p-4 flex items-center justify-between rounded-t-2xl'}`}>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-300 shrink-0" />
                  <div>
                    <h3 className="font-extrabold text-sm !text-white uppercase tracking-wider">Resumen de Entrega y Cobro — Grupo</h3>
                    <p className="text-[10.5px] text-zinc-300 font-mono">{readyOrders.length} equipos · {readyOrders[0].customerName}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setBatchCheckoutModal(null)} className="text-zinc-300 hover:text-white font-bold text-xl leading-none">✕</button>
              </div>

              <div className="p-5 space-y-4">
                {/* Alerta de Devolución de Accesorios Grupal */}
                {ordersWithAccessories.length > 0 && (
                  <div className={`rounded-xl border px-4 py-3 flex gap-3 items-start animate-pulse ${isRetro ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-950/30 border-amber-700 text-amber-300'}`}>
                    <span className="text-lg">📦</span>
                    <div className="space-y-1 flex-1 text-left">
                      <p className="text-[11px] font-black uppercase tracking-wide">Devolver Accesorios Registrados</p>
                      <div className="space-y-1 font-mono text-[10px]">
                        {ordersWithAccessories.map(o => (
                          <div key={o.id} className="flex justify-between border-b border-amber-500/10 py-0.5">
                            <span>{o.deviceBrand} {o.deviceModel} ({o.id}):</span>
                            <span className="font-bold">{(o.receivedAccessories || []).join(', ')}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] opacity-75 mt-1">Asegúrese de regresar los accesorios correspondientes a cada equipo del lote.</p>
                    </div>
                  </div>
                )}

                {/* Lista de equipos */}
                <div className={`rounded-xl border divide-y text-[11px] ${isLight ? 'border-zinc-200 divide-zinc-100' : 'border-zinc-800 divide-zinc-800'}`}>
                  {readyOrders.map(o => (
                    <div key={o.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span className={`font-black ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{o.deviceBrand} {o.deviceModel}</span>
                        <span className={`ml-2 text-[9px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{o.id}</span>
                      </div>
                      <span className={`font-black font-mono ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{sym}{o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>

                {/* Resumen financiero */}
                <div className={`grid grid-cols-3 gap-2 text-center text-[11px]`}>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-700'}`}>
                    <div className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Total servicios</div>
                    <div className={`font-black font-mono mt-0.5 ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{sym}{totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800'}`}>
                    <div className={`text-[9px] uppercase font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`}>Anticipos</div>
                    <div className={`font-black font-mono mt-0.5 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>{sym}{totalAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${totalDue > 0 ? (isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/20 border-rose-800') : (isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800')}`}>
                    <div className={`text-[9px] uppercase font-bold ${totalDue > 0 ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-700' : 'text-emerald-500')}`}>A cobrar</div>
                    <div className={`font-black font-mono mt-0.5 ${totalDue > 0 ? (isLight ? 'text-rose-700' : 'text-rose-400') : (isLight ? 'text-emerald-800' : 'text-emerald-400')}`}>{sym}{totalDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>

                {/* Método de pago */}
                {totalDue > 0 && (
                  <MixedPaymentSelector amounts={batchPaymentAmounts} onChange={setBatchPaymentAmounts} due={totalDue} isRetro={isRetro} isLight={isLight} />
                )}

                {totalDue === 0 && (
                  <div className={`text-[11px] text-center py-2 px-3 rounded-xl border font-bold ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/20 border-emerald-800 text-emerald-400'}`}>
                    ✨ Sin adeudos — todos los equipos están liquidados
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`px-5 py-3 border-t flex flex-col gap-3 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
                <label className={`flex items-center gap-3 cursor-pointer select-none px-1 py-2 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-800/50 border-zinc-700'}`}>
                  <span className={`p-1.5 rounded-full h-7 w-7 flex items-center justify-center border shrink-0 ${isLight ? 'bg-emerald-100 border-emerald-250' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <Printer className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  </span>
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider flex-1 ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>Imprimir ticket de salida</span>
                  <input type="checkbox" checked={shouldPrintTicket} onChange={e => setShouldPrintTicket(e.target.checked)}
                    className={`w-5 h-5 rounded cursor-pointer ${isLight ? 'accent-emerald-500' : 'accent-emerald-500'}`} />
                </label>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setBatchCheckoutModal(null)}
                    className={`py-2 px-4 text-xs font-bold rounded-xl border transition-colors ${isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}>
                    Cancelar
                  </button>
                  <button type="button" onClick={() => handleChargeBatchInPos(readyOrders)}
                    className={`py-2 px-4 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 cursor-pointer`}>
                    <Receipt className="w-3.5 h-3.5" />
                    Cobrar lote en POS (con accesorios)
                  </button>
                  <button type="button" onClick={handleConfirmBatchCheckout}
                    disabled={batchInsufficient}
                    className={`py-2 px-5 text-xs font-black rounded-xl border transition-colors flex items-center gap-1.5 ${
                      batchInsufficient
                        ? 'bg-zinc-600 border-zinc-700 text-zinc-400 cursor-not-allowed opacity-60'
                        : 'text-white bg-emerald-600 border-emerald-700 hover:bg-emerald-700 cursor-pointer'
                    }`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {batchInsufficient
                      ? `Monto insuficiente — faltan ${sym}${(totalDue - totalPaid(batchPaymentAmounts)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : totalDue > 0 ? `Cobrar ${sym}${totalDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} y entregar todos` : 'Registrar entrega de todos'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Finalizar y Cobrar grupo — acción directa */}
      {batchFinalizeModal && (() => {
        const { batchId: fBatchId, batchOrders: fOrders } = batchFinalizeModal;
        const activeOrders = fOrders.filter(o => o.status !== 'Entregado' && o.status !== 'Entregado y Pagado' && o.status !== 'Cancelado');
        const sym = config.currencySymbol || '$';
        const totalCost = activeOrders.reduce((s, o) => s + o.cost, 0);
        const totalAdvance = activeOrders.reduce((s, o) => s + getIndividualAdvance(o), 0);
        const totalDue = Math.max(0, totalCost - totalAdvance);
        const first = fOrders[0];

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[300] p-4">
            <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${isRetro ? 'bg-white border-emerald-300' : isLight ? 'bg-white border-emerald-200' : 'bg-zinc-950 border-emerald-800'}`}>
              {/* Header */}
              <div className={`modal-dark-header px-5 py-4 border-b flex items-center gap-2 ${isRetro ? 'bg-[#000080] border-[#00006a]' : isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-[#11131e] border-zinc-700'}`}>
                <CheckCircle className="w-5 h-5 text-blue-300 shrink-0" />
                <div>
                  <div className="font-black text-sm !text-white">✓ Finalizar y cobrar grupo</div>
                  <div className="text-[10px] mt-0.5 text-zinc-300">
                    Los equipos pasarán directo a <strong>Entregado y Pagado</strong> en una sola acción.
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Lista de equipos con estado actual → final */}
                <div className={`rounded-xl border overflow-hidden text-[11px] ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                  {activeOrders.map(o => (
                    <div key={o.id} className={`flex items-center gap-3 px-3 py-2.5 border-b last:border-0 ${isLight ? 'border-zinc-100' : 'border-zinc-800'}`}>
                      <div className="flex-1 min-w-0">
                        <div className={`font-black truncate ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{o.deviceBrand} {o.deviceModel}</div>
                        <div className={`text-[9px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>{o.serviceType} · {o.id}</div>
                      </div>
                      {/* Estado actual → final */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded opacity-60 ${getStatusBadge(o.status)}`}>{o.status === 'Pendiente' ? 'En espera' : o.status}</span>
                        <span className={`text-[9px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>→</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">Entregado ✓</span>
                      </div>
                      <div className={`text-[11px] font-black font-mono shrink-0 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{sym}{o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                </div>

                {/* Resumen financiero */}
                <div className={`grid grid-cols-3 gap-2 text-center text-[11px]`}>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-700'}`}>
                    <div className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Total servicios</div>
                    <div className={`font-black font-mono mt-0.5 ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{sym}{totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800'}`}>
                    <div className={`text-[9px] uppercase font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`}>Anticipo</div>
                    <div className={`font-black font-mono mt-0.5 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>{sym}{totalAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${totalDue > 0 ? (isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/20 border-rose-800') : (isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800')}`}>
                    <div className={`text-[9px] uppercase font-bold ${totalDue > 0 ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-700' : 'text-emerald-500')}`}>A cobrar</div>
                    <div className={`font-black font-mono mt-0.5 ${totalDue > 0 ? (isLight ? 'text-rose-700' : 'text-rose-400') : (isLight ? 'text-emerald-800' : 'text-emerald-400')}`}>{totalDue > 0 ? `${sym}${totalDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '✓ Liquidado'}</div>
                  </div>
                </div>

                {/* Aviso */}
                <div className={`text-[10px] px-3 py-2 rounded-lg flex gap-2 ${isLight ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-amber-950/20 border border-amber-800 text-amber-400'}`}>
                  <span>⚠️</span>
                  <span>Esta acción es irreversible. Los {activeOrders.length} equipos pasarán directo a <strong>Entregado y Pagado</strong> sin pasar por estados intermedios.</span>
                </div>
              </div>

              {/* Footer */}
              <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
                <button type="button" onClick={() => setBatchFinalizeModal(null)}
                  className={`py-2 px-4 text-xs font-bold rounded-xl border transition-colors ${isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-650 hover:bg-zinc-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}>
                  Cancelar
                </button>
                <button type="button"
                  onClick={() => {
                    const _due = Math.max(0, totalCost - totalAdvance);
                    setBatchFinalizeModal(null);
                    setBatchCheckoutModal({ batchOrders: activeOrders });
                    setBatchPaymentAmounts({ 'Efectivo': String(_due) });
                  }}
                  className="py-2 px-5 text-xs font-black rounded-xl border transition-colors flex items-center gap-1.5 text-white bg-emerald-600 border-emerald-700 hover:bg-emerald-700 cursor-pointer">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Continuar al cobro →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal de Evidencias de Recepción (Premium) ────────────────────── */}
      {showEvidenceModal && (() => {
        const freshOrder = orders.find(o => o.id === showEvidenceModal.id) || showEvidenceModal;
        return (
          <EvidenceModal
            order={freshOrder}
            config={config}
            onClose={() => setShowEvidenceModal(null)}
            onUpdateOrder={onUpdateOrder}
          />
        );
      })()}

      {/* Modal de Previsualización del Ticket de Orden */}
      {previewOrderForModal && (() => {
        const effectiveWidth = config.ticketPaperWidth || '80mm';
        const isMediaCarta = effectiveWidth === 'media-carta' || effectiveWidth === 'media-carta-duplicado';
        const iframeWidth = effectiveWidth === '58mm' ? '230px' : isMediaCarta ? '816px' : '310px';
        const iframeHeight = effectiveWidth === '58mm' ? '450px' : effectiveWidth === 'media-carta' ? '540px' : effectiveWidth === 'media-carta-duplicado' ? '700px' : '520px';

        const html = previewTicketType === 'delivery'
          ? buildDeliveryTicketHtmlForOrder(previewOrderForModal, config, 'whatsapp')
          : buildTicketHtml(previewOrderForModal, config);

        const titleText = previewTicketType === 'delivery'
          ? `Vista Previa del Ticket de Entrega #${previewOrderForModal.id}`
          : `Vista Previa del Ticket de Orden #${previewOrderForModal.id}`;

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
            <div className={`w-full ${isMediaCarta ? 'max-w-4xl' : 'max-w-lg'} rounded-xl border p-4 shadow-2xl relative bg-zinc-950 border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white`}
                 ref={el => { if (el && isRetro) { el.className = `w-full ${isMediaCarta ? 'max-w-4xl' : 'max-w-lg'} border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 p-4 relative bg-[#dfdfdf] text-zinc-900 font-sans shadow-2xl`; } else if (el && isLight) { el.className = `w-full ${isMediaCarta ? 'max-w-4xl' : 'max-w-lg'} rounded-xl border border-zinc-200 p-4 shadow-2xl relative bg-white text-zinc-900`; } }}>
              <div className="flex items-center justify-between border-b pb-2 mb-3 border-zinc-800"
                   ref={el => { if (el && isRetro) { el.className = 'flex items-center justify-between border-b pb-2 mb-3 border-[#808080]'; } else if (el && isLight) { el.className = 'flex items-center justify-between border-b pb-2 mb-3 border-zinc-200'; } }}>
                <h3 className="text-xs uppercase font-black tracking-widest flex items-center gap-1.5 text-zinc-300"
                    ref={el => { if (el && isRetro) { el.className = 'text-xs uppercase font-black tracking-widest flex items-center gap-1.5 text-[#000080]'; } else if (el && isLight) { el.className = 'text-xs uppercase font-black tracking-widest flex items-center gap-1.5 text-zinc-800'; } }}>
                  <span>👁️</span> {titleText}
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewOrderForModal(null)}
                  className="p-1 rounded hover:bg-zinc-800 text-xs font-bold cursor-pointer text-zinc-400"
                  ref={el => { if (el && isRetro) { el.className = 'p-1 rounded hover:bg-zinc-300 text-xs font-bold cursor-pointer text-zinc-800'; } else if (el && isLight) { el.className = 'p-1 rounded hover:bg-zinc-100 text-xs font-bold cursor-pointer text-zinc-500'; } }}
                >
                  ✕
                </button>
              </div>

              {/* Contenedor del ticket */}
              <div className="bg-white rounded-lg p-2 overflow-auto max-h-[70vh] flex justify-center border border-zinc-800"
                   ref={el => { if (el && isRetro) { el.className = 'bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white p-2 overflow-auto max-h-[70vh] flex justify-center'; } else if (el && isLight) { el.className = 'bg-white rounded-lg p-2 overflow-auto max-h-[70vh] flex justify-center border border-zinc-200'; } }}>
                <iframe
                  title="Ticket Order Preview"
                  srcDoc={html}
                  onLoad={(e) => {
                    try {
                      const iframe = e.currentTarget;
                      const body = iframe.contentWindow?.document.body;
                      if (body) {
                        setTimeout(() => {
                          const contentHeight = body.scrollHeight;
                          const maxHeight = effectiveWidth === '58mm' ? 450 : isMediaCarta ? (effectiveWidth === 'media-carta-duplicado' ? 700 : 540) : 520;
                          iframe.style.height = `${Math.min(contentHeight + 20, maxHeight)}px`;
                        }, 50);
                      }
                    } catch (err) {
                      console.error("Error resizing iframe:", err);
                    }
                  }}
                  style={{ width: iframeWidth, height: iframeHeight }}
                  className="border-0 max-w-full"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewOrderForModal(null)}
                  className="py-1.5 px-4 text-xs font-black uppercase rounded-sm border cursor-pointer bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                  ref={el => { if (el && isRetro) { el.className = 'py-1.5 px-4 text-xs font-black uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 bg-[#dfdfdf] hover:bg-zinc-200 text-zinc-900 cursor-pointer'; } else if (el && isLight) { el.className = 'py-1.5 px-4 text-xs font-black uppercase rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer shadow-sm'; } }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal de Elección de Comprobante para Visualización (Órdenes Finalizadas) ── */}
      {previewChoiceOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleUp border ${
            isRetro
              ? 'bg-[#f8fafc] border-zinc-400 text-black'
              : isLight
                ? 'bg-white border-zinc-200 text-zinc-800'
                : 'bg-[#121316] border-sky-500/30 text-white shadow-[0_0_50px_rgba(56,189,248,0.15)]'
          }`}>
            <div className={`bg-gradient-to-r ${isRetro ? 'from-[#000080] to-[#1034a6]' : 'from-sky-600 to-blue-700'} text-white px-5 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-2.5 font-extrabold text-sm uppercase tracking-wider">
                <span className="text-xl">👁️</span> Visualizar Ticket Digital
              </div>
              <button
                type="button"
                onClick={() => setPreviewChoiceOrder(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-xs cursor-pointer active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                isLight ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-sky-950/30 border-sky-900/40 text-sky-300'
              }`}>
                <p className="font-extrabold text-sm">
                  Orden #{previewChoiceOrder.id}
                </p>
                <p className="text-[11px] mt-0.5 opacity-90">
                  Esta orden se encuentra <strong>Entregada</strong>. Selecciona qué tipo de comprobante deseas visualizar digitalmente:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1">
                {/* Opción 1: Ticket de Servicio */}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTicketType('service');
                    setPreviewOrderForModal(previewChoiceOrder);
                    setPreviewChoiceOrder(null);
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all active:scale-95 text-left ${
                    isLight
                      ? 'bg-white border-zinc-200 hover:border-sky-400 hover:bg-sky-50/50 text-zinc-800'
                      : 'bg-[#181a20] border-zinc-700/80 hover:border-sky-500/60 hover:bg-sky-950/20 text-zinc-100'
                  }`}
                >
                  <span className="text-2xl shrink-0">📄</span>
                  <div>
                    <div className="font-extrabold text-xs uppercase tracking-wide">Ticket de Servicio</div>
                    <div className={`text-[10.5px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Ticket inicial de recepción y diagnóstico de la orden
                    </div>
                  </div>
                </button>

                {/* Opción 2: Ticket de Entrega */}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTicketType('delivery');
                    setPreviewOrderForModal(previewChoiceOrder);
                    setPreviewChoiceOrder(null);
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all active:scale-95 text-left ${
                    isLight
                      ? 'bg-white border-zinc-200 hover:border-sky-400 hover:bg-sky-50/50 text-zinc-800'
                      : 'bg-[#181a20] border-zinc-700/80 hover:border-sky-500/60 hover:bg-sky-950/20 text-zinc-100'
                  }`}
                >
                  <span className="text-2xl shrink-0">🤝</span>
                  <div>
                    <div className="font-extrabold text-xs uppercase tracking-wide">Ticket de Entrega</div>
                    <div className={`text-[10.5px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Comprobante oficial de entrega y liquidación de la orden
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Elección de Comprobante para WhatsApp (Órdenes Finalizadas) ── */}
      {(whatsappChoiceOrder || whatsappChoiceBatch) && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleUp border ${
            isRetro
              ? 'bg-[#f8fafc] border-zinc-400 text-black'
              : isLight
                ? 'bg-white border-zinc-200 text-zinc-800'
                : 'bg-[#121316] border-emerald-500/30 text-white shadow-[0_0_50px_rgba(16,185,129,0.15)]'
          }`}>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-extrabold text-sm uppercase tracking-wider">
                <span className="text-xl">💬</span> Enviar por WhatsApp
              </div>
              <button
                type="button"
                onClick={() => { setWhatsappChoiceOrder(null); setWhatsappChoiceBatch(null); }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-xs cursor-pointer active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
              }`}>
                <p className="font-extrabold text-sm">
                  {whatsappChoiceBatch ? `Grupo #${whatsappChoiceBatch.batchId}` : `Orden #${whatsappChoiceOrder?.id}`}
                </p>
                <p className="text-[11px] mt-0.5 opacity-90">
                  Esta orden se encuentra <strong>Entregada</strong>. Selecciona qué tipo de comprobante deseas enviar al cliente por WhatsApp:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1">
                {/* Opción 1: Ticket de Servicio */}
                <button
                  type="button"
                  onClick={() => {
                    if (whatsappChoiceOrder) {
                      sendStandardWhatsapp(whatsappChoiceOrder);
                    } else if (whatsappChoiceBatch) {
                      sendStandardBatchWhatsapp(whatsappChoiceBatch.batchId, whatsappChoiceBatch.batchOrders);
                    }
                    setWhatsappChoiceOrder(null);
                    setWhatsappChoiceBatch(null);
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all active:scale-95 text-left ${
                    isLight
                      ? 'bg-white border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-zinc-800'
                      : 'bg-[#181a20] border-zinc-700/80 hover:border-emerald-500/60 hover:bg-emerald-950/20 text-zinc-100'
                  }`}
                >
                  <span className="text-2xl shrink-0">📄</span>
                  <div>
                    <div className="font-extrabold text-xs uppercase tracking-wide">Ticket de Servicio</div>
                    <div className={`text-[10.5px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Ticket inicial de recepción y diagnóstico de la orden
                    </div>
                  </div>
                </button>

                {/* Opción 2: Ticket de Entrega */}
                <button
                  type="button"
                  onClick={() => {
                    if (whatsappChoiceOrder) {
                      sendDeliveryWhatsapp(whatsappChoiceOrder);
                    } else if (whatsappChoiceBatch) {
                      sendDeliveryBatchWhatsapp(whatsappChoiceBatch.batchId, whatsappChoiceBatch.batchOrders);
                    }
                    setWhatsappChoiceOrder(null);
                    setWhatsappChoiceBatch(null);
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all active:scale-95 text-left ${
                    isLight
                      ? 'bg-white border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-950'
                      : 'bg-[#181a20] border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-950/40 text-emerald-300'
                  }`}
                >
                  <span className="text-2xl shrink-0">🤝</span>
                  <div>
                    <div className="font-extrabold text-xs uppercase tracking-wide">Comprobante de Entrega</div>
                    <div className={`text-[10.5px] mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      Comprobante final de entrega con desglose de liquidación
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className={`px-5 py-3.5 border-t flex justify-end ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#14161d] border-zinc-800'
            }`}>
              <button
                type="button"
                onClick={() => { setWhatsappChoiceOrder(null); setWhatsappChoiceBatch(null); }}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg cursor-pointer transition-all active:scale-95 ${
                  isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Botones de selección de método de pago — reutilizable
function PaymentMethodSelector({ value, onChange, isRefund = false, isRetro, isLight }: {
  value: 'Efectivo' | 'Tarjeta' | 'Tarjeta/Transfer';
  onChange: (m: 'Efectivo' | 'Tarjeta' | 'Tarjeta/Transfer') => void;
  isRefund?: boolean;
  isRetro: boolean;
  isLight: boolean;
}) {
  const methods = [
    { id: 'Efectivo' as const, icon: '💵', label: 'Efectivo' },
    { id: 'Tarjeta' as const, icon: '💳', label: 'Tarjeta' },
    { id: 'Tarjeta/Transfer' as const, icon: '🏦', label: 'Tarjeta/Transfer' },
  ];
  return (
    <div>
      <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
        {isRefund ? 'Método de devolución' : 'Método de pago'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {methods.map(m => {
          const selected = value === m.id;
          return (
            <button key={m.id} type="button" onClick={() => onChange(m.id)}
              className={`relative py-3 px-2 rounded-xl border-2 text-[11px] font-black flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                selected
                  ? isRefund
                    ? 'bg-rose-600 border-rose-600 text-white shadow-lg scale-[1.03]'
                    : 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-[1.03]'
                  : isLight
                    ? 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
              }`}>
              {selected && (
                <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-white/30 flex items-center justify-center text-[8px]">✓</span>
              )}
              <span className="text-lg">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Selector de métodos de pago mixto — estilo POS
type PayMethod = 'Efectivo' | 'Tarjeta' | 'Tarjeta/Transfer';
type PaymentAmounts = Partial<Record<PayMethod, string>>;

function MixedPaymentSelector({ amounts, onChange, due, isRefund = false, isRetro, isLight }: {
  amounts: PaymentAmounts;
  onChange: (a: PaymentAmounts) => void;
  due: number;
  isRefund?: boolean;
  isRetro: boolean;
  isLight: boolean;
}) {
  const [cardRef, setCardRef] = React.useState('');

  const cash = Number(amounts['Efectivo']) || 0;
  const card = (Number(amounts['Tarjeta/Transfer']) || 0) + (Number(amounts['Tarjeta']) || 0);
  const transfer = 0;
  const totalCovered = cash + card;
  const isOk = totalCovered >= due;
  const nonEfectivo = card;
  const efectivoNeeded = Math.max(0, due - nonEfectivo);
  const change = Math.max(0, cash - efectivoNeeded);
  const difference = Math.abs(totalCovered - due);
  const sym = '$';

  const inputCls = `w-36 bg-[#07080b] border border-zinc-700 focus:border-indigo-500 focus:outline-none rounded-lg px-3 pl-8 py-2.5 text-base font-mono font-black text-right shadow-sm ${isLight ? 'bg-white border-zinc-300 text-black focus:border-indigo-400' : 'text-yellow-400'}`;

  return (
    <div className="space-y-3">
      {/* Barra de estado — estilo POS */}
      <div className={`border p-3.5 rounded-xl flex flex-row items-center justify-between gap-3 font-mono ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#11131c] border-zinc-600'}`}>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className={isLight ? 'text-zinc-500' : 'text-zinc-300'}>ESTADO DEL PAGO:</span>
          {isOk ? (
            <span className={`px-2.5 py-1 rounded font-black text-[10px] ${isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              PAGO DISPONIBLE
            </span>
          ) : (
            <span className={`px-2.5 py-1 rounded font-black text-[10px] animate-pulse ${isLight ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
              MONTO INCOMPLETO
            </span>
          )}
        </div>
        <div className="text-right font-mono">
          <span className={`text-sm font-black ${isOk ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400 animate-pulse')}`}>
            {isOk ? `CAMBIO AL CLIENTE: ${sym}${change.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `FALTANTE POR COBRAR: ${sym}${difference.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
          <div className={`text-[9px] mt-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Cobrado: {sym}{totalCovered.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Total: {sym}{due.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Campos de pago */}
      <div className={`space-y-3 p-4 rounded-xl ${isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-[#0a0b0e]'}`}>
        <p className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-zinc-400' : 'text-zinc-400'}`}>
          {isRefund ? 'Distribuya el importe a devolver:' : 'Distribuya el importe de cobro del cliente:'}
        </p>

        {/* Efectivo */}
        <div className={`border p-4 rounded-xl flex items-center justify-between gap-4 transition-all ${isLight ? 'bg-white border-zinc-200 hover:border-zinc-300' : 'bg-[#12141c] border-zinc-800 hover:border-zinc-700 shadow-inner'}`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg select-none border ${isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'}`}>🪙</div>
            <div>
              <span className={`block text-xs font-extrabold leading-none ${isLight ? 'text-zinc-800' : 'text-white'}`}>Efectivo Recibido</span>
              <span className={`text-[9.5px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-400'}`}>Monedas o billetes físicos</span>
            </div>
          </div>
          <div className="relative">
            <span className={`absolute left-3 top-3 text-base font-black ${isLight ? 'text-zinc-400' : 'text-zinc-400'}`}>{sym}</span>
            <input type="number" min={0} step="any" placeholder="0.00" value={amounts['Efectivo'] || ''}
              onChange={e => onChange({ ...amounts, 'Efectivo': e.target.value })}
              onFocus={e => e.target.select()} autoFocus
              className={inputCls} />
          </div>
        </div>

        {/* Tarjeta/Transfer */}
        <div className={`border rounded-xl flex flex-col gap-3 p-4 transition-all ${isLight ? 'bg-white border-zinc-200 hover:border-zinc-300' : 'bg-[#12141c] border-zinc-800 hover:border-zinc-700 shadow-inner'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg select-none border ${isLight ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-blue-500/15 text-blue-400 border-blue-500/25'}`}>💳</div>
              <div>
                <span className={`block text-xs font-extrabold leading-none ${isLight ? 'text-zinc-800' : 'text-white'}`}>Tarjeta / Transferencia</span>
                <span className={`text-[9.5px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-400'}`}>Terminal, SPEI o depósito</span>
              </div>
            </div>
            <div className="relative">
              <span className={`absolute left-3 top-3 text-base font-black ${isLight ? 'text-zinc-400' : 'text-zinc-400'}`}>{sym}</span>
              <input type="number" min={0} step="any" placeholder="0.00" value={amounts['Tarjeta/Transfer'] || ''}
                onChange={e => onChange({ ...amounts, 'Tarjeta/Transfer': e.target.value })}
                onFocus={e => e.target.select()}
                className={inputCls} />
            </div>
          </div>
          {card > 0 && (
            <div className={`p-3 rounded-lg grid grid-cols-2 gap-2 items-center border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#080b12] border-zinc-800'}`}>
              <span className={`text-[9.5px] uppercase font-black ${isLight ? 'text-zinc-500' : 'text-zinc-300'}`}>Ref. / Folio de operación (opcional):</span>
              <input type="text" value={cardRef} placeholder="Folio voucher / SPEI..."
                onChange={e => setCardRef(e.target.value)}
                className={`border rounded px-3 py-1.5 text-xs font-mono font-black w-full focus:outline-none ${isLight ? 'bg-white border-zinc-300 text-zinc-800 focus:border-indigo-400' : 'bg-black/50 border-zinc-700 text-zinc-100 focus:border-indigo-500'}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helpers del modal de detalle
function DetailSection({ title, children, isRetro, isLight }: { title: string; children: React.ReactNode; isRetro: boolean; isLight: boolean }) {
  return (
    <div>
      <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{title}</p>
      <div className={`rounded-xl border overflow-hidden ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight, isRetro, isLight }: { label: string; value: string; highlight?: boolean; isRetro: boolean; isLight: boolean }) {
  return (
    <div className={`flex justify-between items-start px-3 py-2 text-xs border-b last:border-0 ${isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-100' : 'border-zinc-800/60'}`}>
      <span className={`shrink-0 mr-4 ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</span>
      <span className={`text-right font-semibold ${highlight ? (isRetro ? 'text-zinc-900 font-black' : isLight ? 'text-zinc-900 font-black' : 'text-white font-black') : ''}`}>{value}</span>
    </div>
  );
}

function EditRow({ label, children, isRetro, isLight }: { label: string; children: React.ReactNode; isRetro: boolean; isLight: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-1.5 text-xs border-b last:border-0 gap-3 ${isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-100' : 'border-zinc-800/60'}`}>
      <span className={`shrink-0 w-32 ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const getCountryName = (code?: string): string => {
  if (!code) return '';
  const cleanCode = code.replace(/\s+/g, '').replace('+', '');
  switch (cleanCode) {
    case '52': return '🇲🇽 México';
    case '1': return '🇺🇸 EUA';
    case '502': return '🇬🇹 Guatemala';
    case '503': return '🇸🇻 El Salvador';
    case '504': return '🇭🇳 Honduras';
    case '505': return '🇳🇮 Nicaragua';
    case '506': return '🇨🇷 Costa Rica';
    case '507': return '🇵🇦 Panamá';
    case '57': return '🇨🇴 Colombia';
    case '58': return '🇻🇪 Venezuela';
    case '51': return '🇵🇪 Perú';
    case '56': return '🇨🇱 Chile';
    case '54': return '🇦🇷 Argentina';
    case '591': return '🇧🇴 Bolivia';
    case '593': return '🇪🇨 Ecuador';
    case '595': return '🇵🇾 Paraguay';
    case '598': return '🇺🇾 Uruguay';
    case '34': return '🇪🇸 España';
    default: return `🌐 +${cleanCode}`;
  }
};

