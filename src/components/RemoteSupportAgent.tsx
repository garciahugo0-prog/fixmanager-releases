import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { WorkshopConfig } from '../types';

interface RemoteSupportAgentProps {
  config: WorkshopConfig;
  currentUser: any;
  uploadBackupToSupabase?: (silent: boolean) => Promise<any>;
  appVersion?: string;
}

export function RemoteSupportAgent({ config, currentUser, uploadBackupToSupabase, appVersion }: RemoteSupportAgentProps) {
  const [activeSession, setActiveSession] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<any>(null);
  const machineIdRef = useRef<string>('');
  const micStreamRef = useRef<MediaStream | null>(null);

  // STUN servers configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    let active = true;

    // Fetch machine ID and setup channels
    const setupAgent = async () => {
      if (!supabase || config.unattendedSupportEnabled === false) {
        cleanupSession();
        return;
      }

      const api = (window as any).electronAPI;
      let machineId = '';
      if (api?.getMachineId) {
        machineId = await api.getMachineId().catch(() => '');
      }
      if (!active) return;
      machineIdRef.current = machineId;

      if (!machineId) {
        console.warn('[Fix Asistencia] No machineId available. Support presence bypassed.');
        cleanupSession();
        return;
      }

      // Try to get Supabase User ID if signed in (optional additional info)
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const userId = user?.id || '';

      // 1. Register presence to announce online state with machineId and optional userId
      const presenceChannel = supabase.channel('support-presence');
      presenceChannel
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && active) {
            console.log('[Fix Asistencia] Presence online registered:', machineId);
            await presenceChannel.track({
              user_id: userId,
              machine_id: machineId,
              app: 'fixmanager',
              store_name: config.storeName || 'Caja Central',
              online_at: new Date().toISOString(),
              version: appVersion || '1.0'
            });
          }
        });

      // 2. Listen to signals on a unique channel per computer (machineId)
      const channelId = `support-${machineId}`;
      const controlChannel = supabase.channel(channelId);
      signalingChannelRef.current = controlChannel;

      controlChannel
        .on('broadcast', { event: 'signal' }, async ({ payload }) => {
          if (active) {
            handleIncomingSignal(payload, controlChannel);
          }
        })
        .subscribe();

      // Custom window event listener to trigger database backups requested from support panel
      const backupListener = async () => {
        if (uploadBackupToSupabase) {
          try {
            console.log('[Fix Asistencia] Executing remote backup request...');
            await uploadBackupToSupabase(true);
            // Notify admin that the backup has completed successfully
            controlChannel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { type: 'action-feedback', status: 'backup-success' }
            });
          } catch (err: any) {
            controlChannel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { type: 'action-feedback', status: 'backup-failed', error: err.message }
            });
          }
        }
      };

      window.addEventListener('fix-asistencia-backup' as any, backupListener);

      return () => {
        window.removeEventListener('fix-asistencia-backup' as any, backupListener);
        presenceChannel.unsubscribe();
        controlChannel.unsubscribe();
      };
    };

    let cleanupPromise = setupAgent();

    return () => {
      active = false;
      cleanupPromise.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
      cleanupSession();
    };
  }, [currentUser, config.unattendedSupportEnabled]);

  const cleanupSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setActiveSession(false);
  };

  const handleIncomingSignal = async (signal: any, channel: any) => {
    if (!signal) return;

    if (signal.type === 'request-control') {
      console.log('[Fix Asistencia] Connecting remote screen viewer session...');
      await startScreenShare(channel);
    } else if (signal.type === 'answer') {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      }
    } else if (signal.type === 'ice-candidate') {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } else if (signal.type === 'end-control') {
      console.log('[Fix Asistencia] Remote support ended the session');
      cleanupSession();
    } else if (signal.type === 'mouse-move' || signal.type === 'mouse-down' || signal.type === 'mouse-up') {
      const api = (window as any).electronAPI;
      if (api?.simulateMouse) {
        api.simulateMouse(signal);
      }
    } else if (signal.type === 'key-down' || signal.type === 'key-up') {
      const api = (window as any).electronAPI;
      if (api?.simulateKeyboard) {
        api.simulateKeyboard(signal);
      }
    } else if (signal.type === 'action') {
      handleQuickAction(signal.action);
    } else if (signal.type === 'fs-list-req') {
      const api = (window as any).electronAPI;
      if (api?.listRemoteDir) {
        const res = await api.listRemoteDir(signal.path);
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'fs-list-res', reqId: signal.reqId, ...res }
        });
      }
    } else if (signal.type === 'fs-upload-chunk') {
      const api = (window as any).electronAPI;
      if (api?.writeRemoteChunk) {
        const res = await api.writeRemoteChunk(signal);
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'fs-upload-ack', reqId: signal.reqId, chunkIndex: signal.chunkIndex, ...res }
        });
      }
    } else if (signal.type === 'fs-download-req') {
      const api = (window as any).electronAPI;
      if (api?.readRemoteChunk) {
        const res = await api.readRemoteChunk(signal);
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'fs-download-chunk', reqId: signal.reqId, offset: signal.offset, ...res }
        });
      }
    } else if (signal.type === 'fs-delete-req') {
      const api = (window as any).electronAPI;
      if (api?.deleteRemoteFile) {
        const res = await api.deleteRemoteFile(signal.filePath);
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'fs-delete-res', reqId: signal.reqId, ...res }
        });
      }
    } else if (signal.type === 'fs-zip-req') {
      const api = (window as any).electronAPI;
      if (api?.zipRemoteDir) {
        const res = await api.zipRemoteDir(signal.dirPath);
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'fs-zip-res', reqId: signal.reqId, ...res }
        });
      }
    } else if (signal.type === 'trigger-remote-auto-update') {
      console.log('[Fix Asistencia] Recibida orden remota de auto-actualización desde el Panel Administrador');
      
      const api = (window as any).electronAPI;
      if (!signal.force && api?.checkAppUpdate) {
        try {
          const res = await api.checkAppUpdate();
          if (res && !res.hasUpdate) {
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'remote-auto-update-progress',
                percent: 100,
                status: 'no-update',
                currentVersion: res.currentVersion
              }
            });
            return;
          }
        } catch (e) {
          console.error('[Fix Asistencia] Error en checkAppUpdate:', e);
        }
      }

      window.dispatchEvent(new CustomEvent('fix-remote-auto-update-trigger', { detail: signal }));
      if (api?.onUpdateProgress) {
        api.onUpdateProgress((data: { percent: number }) => {
          if (data && typeof data.percent === 'number') {
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'remote-auto-update-progress',
                percent: Math.round(data.percent),
                status: data.percent < 100 ? 'downloading' : 'installing'
              }
            });
          }
        });
      }
    }
  };

  const handleQuickAction = async (action: string) => {
    const api = (window as any).electronAPI;
    if (action === 'restart-app') {
      if (api?.confirmClose) {
        api.confirmClose();
      }
    } else if (action === 'download-db') {
      window.dispatchEvent(new CustomEvent('fix-asistencia-backup'));
    }
  };

  const startScreenShare = async (channel: any) => {
    cleanupSession();

    const api = (window as any).electronAPI;
    if (!api || !api.getDesktopSources) return;

    try {
      const sources = await api.getDesktopSources();
      if (!sources || sources.length === 0) return;

      // Select primary screen or fallback
      const source = sources.find((s: any) => s.name.toLowerCase().includes('screen') || s.name.toLowerCase().includes('pantalla')) || sources[0];

      const stream = await (navigator.mediaDevices as any).getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            maxFrameRate: 30,
            minFrameRate: 20,
            maxWidth: 1920,
            maxHeight: 1080
          }
        }
      });

      streamRef.current = stream;
      setActiveSession(true);

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      pc.ondatachannel = (event) => {
        const dataChannel = event.channel;
        if (dataChannel.label === 'input-control') {
          dataChannel.onmessage = (msgEvent) => {
            try {
              const payload = JSON.parse(msgEvent.data);
              handleIncomingSignal(payload, channel);
            } catch (err) {
              console.error('[Fix Asistencia] DataChannel error parsing input:', err);
            }
          };
        }
      };

      pc.ontrack = (event) => {
        if (event.track.kind === 'audio') {
          console.log('[Fix Asistencia] Audio track received from admin!');
          let audioEl = document.getElementById('fix-remote-audio-player') as HTMLAudioElement;
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = 'fix-remote-audio-player';
            audioEl.autoplay = true;
            document.body.appendChild(audioEl);
          }
          audioEl.srcObject = event.streams[0];
          audioEl.play().catch(console.warn);

          if (!micStreamRef.current) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(async (micStream) => {
              micStreamRef.current = micStream;
              micStream.getAudioTracks().forEach(track => {
                pc.addTrack(track, micStream);
              });
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                channel.send({
                  type: 'broadcast',
                  event: 'signal',
                  payload: offer
                });
              } catch (e) {
                console.warn('[Fix Asistencia] Audio renegotiation offer error:', e);
              }
            }).catch(err => {
              console.warn('[Fix Asistencia] Mic access error on client:', err);
            });
          }
        }
      };

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'ice-candidate',
              candidate: event.candidate
            }
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'offer',
          sdp: offer.sdp
        }
      });

    } catch (err) {
      console.error('[Fix Asistencia] Screen recording init error:', err);
      cleanupSession();
    }
  };

  if (!activeSession) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 bg-emerald-600 border border-emerald-500 text-white text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5 z-[99999] animate-bounce select-none">
      <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
      <span>Asistencia Remota Activa (Soporte Fix)</span>
      <button 
        onClick={cleanupSession}
        className="ml-1 px-2 py-0.5 bg-emerald-800 hover:bg-emerald-900 rounded text-[9px] font-bold transition-colors cursor-pointer"
      >
        Detener Asistencia
      </button>
    </div>
  );
}
