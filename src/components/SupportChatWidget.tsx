import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, X, Send, Headphones, CheckCheck } from 'lucide-react';
import { supabase } from '../supabase';
import { WorkshopConfig } from '../types';

interface SupportChatWidgetProps {
  config: WorkshopConfig;
  currentUser: any;
  appVersion?: string;
}

interface ChatMessage {
  id?: number | string;
  user_id: string;
  sender: 'admin' | 'client';
  message: string;
  created_at: string;
}

export function SupportChatWidget({ config, currentUser, appVersion }: SupportChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sound chime for incoming admin message
  const playNotificationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (_) {}
  };

  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-support-toggle="true"]')) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeChannelRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    const initChat = async () => {
      let resolvedUserId: string | null = null;

      // 1. Intentar obtener el usuario de Supabase Auth
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) resolvedUserId = user.id;
      } catch (_) {}

      // 2. Fallback a currentUser o MachineId si no hay sesión de Supabase Auth
      if (!resolvedUserId) {
        if (currentUser?.id) {
          resolvedUserId = String(currentUser.id);
        } else if (currentUser?.username) {
          resolvedUserId = String(currentUser.username);
        } else {
          const api = (window as any).electronAPI;
          if (api?.getMachineId) {
            const mId = await api.getMachineId().catch(() => '');
            if (mId) resolvedUserId = mId;
          }
        }
      }

      if (!resolvedUserId) {
        resolvedUserId = 'usuario-soporte';
      }

      if (!active) return;
      setUserId(resolvedUserId);

      // Load initial chat history from Supabase
      try {
        const { data, error } = await supabase
          .from('support_chat_messages')
          .select('*')
          .eq('user_id', resolvedUserId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (!error && data && active) {
          setMessages(data);
        }
      } catch (e) {
        console.warn('[Support Chat] Error loading history:', e);
      }

      // Realtime subscription for incoming broadcast messages from Admin
      const channel = supabase.channel(`chat-${resolvedUserId}`);
      activeChannelRef.current = channel;

      channel
        .on('broadcast', { event: 'new_message' }, ({ payload }) => {
          if (payload && payload.sender === 'admin' && active) {
            setMessages(prev => [...prev, payload]);
            playNotificationChime();
            setIsOpen(prevOpen => {
              if (!prevOpen) {
                setUnreadCount(c => c + 1);
              }
              return prevOpen;
            });
          }
        })
        .subscribe();
    };

    initChat();

    return () => {
      active = false;
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
        activeChannelRef.current = null;
      }
    };
  }, [currentUser]);

  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 74, left: 280 });

  const updateCoords = () => {
    const btn = document.querySelector('[data-support-toggle="true"]');
    if (btn) {
      const r = btn.getBoundingClientRect();
      setCoords({
        top: Math.round(r.bottom + 8),
        left: Math.max(10, Math.round(r.left + r.width / 2 - 53))
      });
    }
  };

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => {
        const next = !prev;
        if (next) {
          setTimeout(updateCoords, 0);
        }
        return next;
      });
    };
    window.addEventListener('toggle-support-chat', handleToggle);
    return () => window.removeEventListener('toggle-support-chat', handleToggle);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      return () => window.removeEventListener('resize', updateCoords);
    }
  }, [isOpen]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('support-unread-count', { detail: unreadCount }));
  }, [unreadCount]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !userId) return;

    const text = inputText.trim();
    setInputText('');

    const newMsg: ChatMessage = {
      user_id: userId,
      sender: 'client',
      message: text,
      created_at: new Date().toISOString()
    };

    // Update UI immediately
    setMessages(prev => [...prev, newMsg]);

    // Broadcast message via existing Supabase Realtime channel
    try {
      if (activeChannelRef.current) {
        await activeChannelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: newMsg
        });
      }
    } catch (_) {}

    // Persist message in database
    try {
      await supabase.from('support_chat_messages').insert({
        user_id: userId,
        sender: 'client',
        message: text,
        created_at: newMsg.created_at
      });
    } catch (err) {
      console.warn('[Support Chat] Error saving message to DB:', err);
    }
  };

  if (!userId || !isOpen) return null;

  return (
    <div 
      ref={widgetRef} 
      className="fixed z-[99999] select-none font-sans"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`
      }}
    >
      {/* Triangle indicator pointing UP to exact center of Soporte button */}
      <div 
        className="absolute -top-[5px] left-12 w-2.5 h-2.5 rotate-45 z-20"
        style={{ backgroundColor: '#ffffff', borderTop: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1' }}
      />

      {/* CHAT WINDOW */}
      <div 
        className="w-[360px] sm:w-[400px] h-[520px] border rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200"
        style={{ 
          backgroundColor: '#ffffff', 
          color: '#0f172a', 
          borderColor: '#cbd5e1',
          borderRadius: '1rem',
          transformOrigin: 'top left' 
        }}
      >
        {/* HEADER BAR */}
        <div 
          className="px-4 py-3 border-b flex items-center justify-between shadow-sm rounded-t-2xl"
          style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#e0e7ff', borderColor: '#c7d2fe', color: '#4f46e5' }}
            >
              <Headphones className="w-4 h-4" style={{ color: '#4f46e5' }} />
            </div>
            <div>
              <div 
                className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: '#0f172a' }}
              >
                <span>Soporte Técnico FixManager</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <span className="text-[10px] font-medium block mt-0.5" style={{ color: '#64748b' }}>
                Chat en vivo con administración
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 hover:bg-slate-100"
            style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#0f172a' }}
            title="Cerrar chat"
          >
            <X className="w-4 h-4" style={{ color: '#334155' }} />
          </button>
        </div>

        {/* MESSAGES LIST */}
        <div 
          className="flex-1 p-4 overflow-y-auto space-y-3"
          style={{ backgroundColor: '#f8fafc' }}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
              <div 
                className="w-12 h-12 rounded-full border flex items-center justify-center mb-1 shadow-sm"
                style={{ backgroundColor: '#e0e7ff', borderColor: '#c7d2fe', color: '#4f46e5' }}
              >
                <MessageSquare className="w-6 h-6" style={{ color: '#4f46e5' }} />
              </div>
              <div className="text-xs font-black uppercase tracking-wider text-center" style={{ color: '#0f172a' }}>
                ¿EN QUÉ PODEMOS AYUDARTE?
              </div>
              <div 
                className="text-[11.5px] font-semibold leading-relaxed text-center px-4 max-w-[280px] mx-auto mt-1" 
                style={{ 
                  color: '#64748b', 
                  whiteSpace: 'normal', 
                  wordBreak: 'break-word', 
                  overflowWrap: 'break-word' 
                }}
              >
                Escribe un mensaje aquí para comunicarte directamente con el equipo de soporte de FixManager.
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isAdmin = msg.sender === 'admin';
              const date = new Date(msg.created_at);
              const timeStr = date.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });

              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isAdmin ? 'rounded-tl-none' : 'rounded-tr-none'
                    }`}
                    style={{
                      backgroundColor: isAdmin ? '#ffffff' : '#4f46e5',
                      color: isAdmin ? '#0f172a' : '#ffffff',
                      border: isAdmin ? '1px solid #cbd5e1' : '1px solid #4338ca'
                    }}
                  >
                    {isAdmin && (
                      <div className="text-[9.5px] font-black uppercase tracking-wider mb-1" style={{ color: '#4f46e5' }}>
                        🛠️ Soporte Técnico
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words font-medium" style={{ color: isAdmin ? '#0f172a' : '#ffffff' }}>{msg.message}</div>
                    <div
                      className="text-[9px] mt-1 font-mono flex items-center justify-end gap-1"
                      style={{ color: isAdmin ? '#64748b' : '#e0e7ff' }}
                    >
                      <span>{timeStr}</span>
                      {!isAdmin && <CheckCheck className="w-3 h-3 text-indigo-100" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FORM */}
        <form 
          onSubmit={handleSendMessage} 
          className="p-3 border-t flex items-center gap-2 shadow-inner rounded-b-2xl"
          style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe tu consulta de soporte..."
            className="flex-1 border rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none transition-colors"
            style={{ backgroundColor: '#f1f5f9', color: '#0f172a', borderColor: '#cbd5e1' }}
            spellcheck="true"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center"
            style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
          >
            <Send className="w-4 h-4 text-white" style={{ color: '#ffffff' }} />
          </button>
        </form>
      </div>
    </div>
  );
}
