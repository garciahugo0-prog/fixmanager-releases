import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, ZoomIn, MessageCircle, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { sendProductByWhatsapp } from '../../utils/whatsapp';

interface PosItemThumbnailProps {
  imageUrl?: string;
  extraImages?: string[];
  name: string;
  size?: number;
  className?: string;
  code?: string;
  category?: string;
  price?: number;
  currencySymbol?: string;
}

export const PosItemThumbnail: React.FC<PosItemThumbnailProps> = ({
  imageUrl,
  extraImages = [],
  name,
  size = 32,
  className = '',
  code,
  category,
  price,
  currencySymbol = '$'
}) => {
  const [srcList, setSrcList] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showWaInput, setShowWaInput] = useState<boolean>(false);
  const [clientPhone, setClientPhone] = useState<string>('');

  useEffect(() => {
    const rawList = [imageUrl, ...extraImages].filter((img): img is string => Boolean(img && img.trim() !== ''));
    if (rawList.length === 0) {
      setSrcList([]);
      return;
    }

    let cancelled = false;
    const api = (window as any).electronAPI;

    Promise.all(
      rawList.map(async (img) => {
        if (img.startsWith('data:') || img.startsWith('http')) return img;
        if (api?.readProductImage) {
          try {
            const cleanImg = img.split('?')[0];
            const base64 = await api.readProductImage(cleanImg);
            if (base64) return base64;
          } catch (e) {}
        }
        return img;
      })
    ).then((resolved) => {
      if (!cancelled) setSrcList(resolved);
    });

    return () => { cancelled = true; };
  }, [imageUrl, JSON.stringify(extraImages)]);

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowModal(false);
        setShowWaInput(false);
      } else if (e.key === 'ArrowRight' && srcList.length > 1) {
        setActiveIdx((prev) => (prev + 1) % srcList.length);
      } else if (e.key === 'ArrowLeft' && srcList.length > 1) {
        setActiveIdx((prev) => (prev - 1 + srcList.length) % srcList.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showModal, srcList.length]);

  const placeholderBg = React.useMemo(() => {
    let hash = 0;
    const str = name || '';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#059669', '#2563eb', '#7c3aed', '#db2777', '#d97706', '#0891b2'
    ];
    return colors[Math.abs(hash) % colors.length];
  }, [name]);

  const cleanName = (name || '').replace(/^\[REFACCIÓN\]\s*/i, '').trim();
  const firstLetter = cleanName ? cleanName.charAt(0).toUpperCase() : '?';

  const currentSrc = srcList[activeIdx] || srcList[0] || '';

  const handleSendWhatsapp = async () => {
    if (!clientPhone.trim()) return;
    await sendProductByWhatsapp(clientPhone, {
      name,
      code,
      category,
      price,
      imageUrl: currentSrc
    });
    setShowWaInput(false);
    setClientPhone('');
  };

  const modalMarkup = showModal && currentSrc ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={(e) => {
        e.stopPropagation();
        setShowModal(false);
        setShowWaInput(false);
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: 580,
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          border: '2px solid #3b82f6',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header en azul Smartec */}
        <div style={{ padding: '12px 18px', background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', borderBottom: '2px solid #1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <ZoomIn style={{ width: 20, height: 20, color: '#93c5fd', flexShrink: 0 }} />
            <span style={{ color: '#ffffff', fontWeight: 900, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              {name}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(false);
              setShowWaInput(false);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            title="Cerrar (Esc)"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Contenedor Principal de Imagen con Flechas de Navegación Multi-Foto */}
        <div style={{ position: 'relative', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', minHeight: 280, maxHeight: '55vh', overflow: 'hidden', borderBottom: '1px solid #e2e8f0' }}>
          {srcList.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveIdx((prev) => (prev - 1 + srcList.length) % srcList.length)}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
              }}
              title="Foto anterior (←)"
            >
              <ChevronLeft style={{ width: 22, height: 22 }} />
            </button>
          )}

          <img
            src={currentSrc}
            alt={name}
            style={{
              maxWidth: '100%',
              maxHeight: '48vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff'
            }}
          />

          {srcList.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveIdx((prev) => (prev + 1) % srcList.length)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
              }}
              title="Siguiente foto (→)"
            >
              <ChevronRight style={{ width: 22, height: 22 }} />
            </button>
          )}
        </div>

        {/* Galería de Miniaturas Secundarias (Si hay más de 1 foto) */}
        {srcList.length > 1 && (
          <div style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {srcList.map((thumbSrc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                style={{
                  padding: 0,
                  border: idx === activeIdx ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: 6,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  opacity: idx === activeIdx ? 1 : 0.65,
                  transform: idx === activeIdx ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.15s ease'
                }}
              >
                <img src={thumbSrc} alt={`Ángulo ${idx + 1}`} style={{ width: 42, height: 42, objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
            <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginLeft: 6 }}>
              {activeIdx + 1} de {srcList.length} vistas
            </span>
          </div>
        )}

        {/* Footer con detalles y botón WhatsApp */}
        <div style={{ padding: '12px 18px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: '#1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {code && <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#0f172a', background: '#e2e8f0', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: 6 }}>SKU: {code}</span>}
              {category && <span style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', padding: '3px 8px', borderRadius: 6, fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>{category}</span>}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {price !== undefined && (
                <span style={{ fontSize: 18, fontWeight: 900, color: '#16a34a', fontFamily: 'monospace' }}>
                  {currencySymbol}{price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowWaInput(!showWaInput)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 11,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Enviar fotografía y cotización por WhatsApp al cliente"
              >
                <MessageCircle style={{ width: 14, height: 14 }} />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Formulario para ingresar número de WhatsApp */}
          {showWaInput && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginTop: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#166534', flexShrink: 0 }}>📱 WhatsApp Cliente:</span>
              <input
                type="tel"
                placeholder="Ej. 5512345678"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendWhatsapp();
                }}
                style={{ flex: 1, padding: '5px 10px', borderRadius: 6, border: '1px solid #86efac', fontSize: 12, outline: 'none', fontFamily: 'monospace' }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleSendWhatsapp}
                style={{ backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 900, border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
              >
                Enviar 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        className={`relative flex items-center justify-center shrink-0 group ${className}`}
        style={{ width: size, height: size, cursor: currentSrc ? 'zoom-in' : 'default' }}
        onClick={(e) => {
          if (currentSrc) {
            e.stopPropagation();
            setShowModal(true);
          }
        }}
        title={currentSrc ? 'Haz clic para ampliar la imagen del producto' : name}
      >
        {currentSrc ? (
          <>
            <img
              src={currentSrc}
              alt={name}
              style={{
                width: size,
                height: size,
                borderRadius: 6,
                objectFit: 'cover',
                flexShrink: 0,
                border: '1px solid rgba(0,0,0,0.2)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              className="hover:scale-110 hover:shadow-md hover:border-blue-400"
            />
            {srcList.length > 1 && (
              <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-black px-1 rounded-full border border-white shadow-sm flex items-center gap-0.5">
                <Layers className="w-2 h-2" />
                <span>{srcList.length}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <ZoomIn className="w-3.5 h-3.5 text-white drop-shadow-md" />
            </div>
          </>
        ) : (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: 6,
              backgroundColor: placeholderBg,
              color: '#ffffff',
              fontWeight: 800,
              fontSize: size * 0.42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              textTransform: 'uppercase',
              userSelect: 'none'
            }}
          >
            {firstLetter}
          </div>
        )}
      </div>

      {showModal && ReactDOM.createPortal(modalMarkup, document.body)}
    </>
  );
};
