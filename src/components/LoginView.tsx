/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// Recarga automática de verificación
import React, { useState, useEffect } from 'react';
import { Wrench, ShoppingCart, ClipboardList, Package, BarChart2, Scissors, CreditCard, RefreshCw } from 'lucide-react';
import { AppUser, WorkshopConfig } from '../types';
import { supabase } from '../supabase';
import { isMobile } from '../utils/nativeBridge';
import { subscribeToNetworkStatus, getNetworkStatus } from '../utils/networkStatus';
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';

interface LoginViewProps {
  users: AppUser[];
  config: WorkshopConfig;
  onLogin: (user: AppUser) => void;
  isOverlay?: boolean;
  licenseStatus?: 'checking' | 'active' | 'none' | 'invalid' | 'expired';
  licenseInfo?: Record<string, unknown> | null;
  onRenewLicense?: () => void;
  onLicenseActivated?: (info: Record<string, unknown>) => void;
  initialSbMode?: 'login' | 'register' | 'forgot' | 'localLink';
  onResetApp?: () => Promise<void> | void;
}

const translateAuthError = (msg: string): string => {
  if (!msg) return 'Ocurrió un error inesperado.';
  const lower = msg.toLowerCase();
  if (lower.includes('at least 6 characters')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (lower.includes('user already exists')) {
    return 'Este correo electrónico ya está registrado en FixManager. Por favor, inicia sesión.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Correo electrónico o contraseña incorrectos.';
  }
  if (lower.includes('email rate limit exceeded') || lower.includes('too many requests')) {
    return 'Has excedido el límite de intentos de seguridad. Inténtalo más tarde.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Por favor confirma tu correo electrónico antes de iniciar sesión.';
  }
  if (lower.includes('network error') || lower.includes('failed to fetch')) {
    return 'Error de conexión a internet o de red.';
  }
  return msg;
};

const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  if (error.status === 0 || !error.status) return true;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('fetch') || msg.includes('network') || msg.includes('load failed') || msg.includes('typeerror');
};

export default function LoginView({ users, config, onLogin, isOverlay = false, licenseStatus, licenseInfo, onRenewLicense, onLicenseActivated, initialSbMode, onResetApp }: LoginViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';
  const appMode = 'fixmanager' as 'fixpos' | 'fixmanager' | 'fixrestaurante';
  const appName = 'FixManager';

  const [isWindowSmall, setIsWindowSmall] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsWindowSmall(window.innerWidth < 600 && window.innerHeight < 700);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const centerCard = isOverlay || !isWindowSmall;

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(() => {
    if (users.length === 1) return users[0];
    const admin = users.find(u => u.role === 'admin');
    return admin ?? null;
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showDevExport, setShowDevExport] = useState(false);
  const [devPw, setDevPw] = useState('');
  const [devPwError, setDevPwError] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devLocked, setDevLocked] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Estados para Biometría Real (Face ID / Huella)
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);

  // Estado de Conectividad a Internet y Feedback del Botón
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isCheckingNet, setIsCheckingNet] = useState(false);
  const [netCheckFeedback, setNetCheckFeedback] = useState<string | null>(null);

  const handleRetryConnection = async () => {
    if (isCheckingNet) return;
    setIsCheckingNet(true);
    setNetCheckFeedback('Comprobando red...');

    await new Promise(r => setTimeout(r, 600));

    const online = await getNetworkStatus();
    if (online) {
      setNetCheckFeedback('✓ ¡Conexión restablecida!');
      setTimeout(() => {
        setIsOnline(true);
        setIsCheckingNet(false);
        setNetCheckFeedback(null);
        setError(null);
      }, 500);
    } else {
      setNetCheckFeedback('❌ Aún sin conexión. Verifica tu cable o Wi-Fi.');
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setIsCheckingNet(false);
        setTimeout(() => setNetCheckFeedback(null), 2500);
      }, 500);
    }
  };

  useEffect(() => {
    return subscribeToNetworkStatus((online) => {
      setIsOnline(online);
      if (!online) {
        setPin('');
      } else {
        setError(null);
      }
    });
  }, []);

  useEffect(() => {
    if (isMobile()) {
      NativeBiometric.isAvailable()
        .then((res) => {
          if (res.isAvailable) {
            setIsBiometricAvailable(true);
            setBiometryType(res.biometryType || BiometryType.TOUCH_ID);
          }
        })
        .catch((err) => {
          console.warn('[Biometric] No disponible en este dispositivo:', err);
        });
    }
  }, []);

  const handleTriggerBiometric = async () => {
    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Verifica tu identidad para ingresar a FixManager',
        title: 'FixManager Móvil',
        subtitle: 'Autenticación Biométrica',
        description: 'Ingresa con Face ID o Huella Digital',
        maxAttempts: 3
      });
      const u = selectedUser || users[0];
      if (u) {
        onLogin(u);
      }
    } catch (err) {
      console.warn('[Biometric] Error o cancelación:', err);
      setError('Autenticación biométrica no completada.');
    }
  };

  // Supabase Auth and Activation States
  const [sbMode, setSbMode] = useState<'login' | 'register' | 'forgot' | 'localLink'>(initialSbMode || 'login');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetAdminPin, setResetAdminPin] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');
  const [sbEmail, setSbEmail] = useState('');
  const [sbPassword, setSbPassword] = useState('');
  const [sbLoading, setSbLoading] = useState(false);
  const [sbError, setSbError] = useState<string | null>(null);
  const [sbMessage, setSbMessage] = useState<string | null>(null);
  const [localMachineId, setLocalMachineId] = useState('');
  const [activeSupabaseUser, setActiveSupabaseUser] = useState<any | null>(null);

  // Estados para enlace Multicaja local
  const [localServerIp, setLocalServerIp] = useState('');
  const [isLinkingLocal, setIsLinkingLocal] = useState(false);

  const handleConnectLocalServer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localServerIp.trim()) {
      setSbError('Por favor ingresa el código de enlace o dirección IP de la Caja Principal.');
      return;
    }
    
    setIsLinkingLocal(true);
    setSbError(null);
    setSbMessage(null);
    
    let host = localServerIp.trim();
    // Decodificar código de enlace de 6 dígitos (ej: 001-045 o 001045)
    const cleanHost = host.replace(/[-\s]/g, '');
    if (cleanHost.length === 6 && !isNaN(Number(cleanHost))) {
      const x = parseInt(cleanHost.substring(0, 3), 10);
      const y = parseInt(cleanHost.substring(3, 6), 10);
      host = `192.168.${x}.${y}`;
    }

    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      host = `http://${host}`;
    }
    if (!host.includes(':', 6)) {
      host = `${host}:3011`;
    }
    
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3500);
      
      const res = await fetch(`${host}/api/sync`, { signal: controller.signal });
      clearTimeout(id);
      
      if (!res.ok) throw new Error('El servidor local respondió con un error.');
      
      localStorage.setItem('selected_local_server_host', host);
      localStorage.setItem('last_successful_sync_time', Date.now().toString());
      
      setSbMessage('¡Conexión establecida con éxito! Redirigiendo...');
      setTimeout(() => {
        if (onLicenseActivated) {
          onLicenseActivated({
            status: 'active',
            type: 'Multicaja Local',
            expiry: 'PERPETUA',
            ownerName: 'Caja Secundaria (Red Local)',
            activatedAt: new Date().toISOString(),
            machineId: 'LAN_CLIENT'
          });
        }
      }, 1000);
      
    } catch (err) {
      console.error('[LAN Connect Error]:', err);
      setSbError('No se pudo conectar a la Caja Principal. Verifica que la dirección IP sea correcta y que la Caja Principal esté encendida en la misma red WiFi.');
    } finally {
      setIsLinkingLocal(false);
    }
  };

  useEffect(() => {
    if ((window as any).electronAPI?.getMachineId) {
      (window as any).electronAPI.getMachineId().then((id: string) => {
        setLocalMachineId(id);
      }).catch(() => {});
    }
  }, []);

  const checkUserLicense = async (user: any) => {
    setSbLoading(true);
    setSbError(null);
    setSbMessage(null);
    try {
      let machineId = localMachineId;
      if (!machineId && (window as any).electronAPI?.getMachineId) {
        machineId = await (window as any).electronAPI.getMachineId().catch(() => '');
        setLocalMachineId(machineId);
      }
      if (!machineId) {
        setSbError('No se pudo identificar el identificador físico de esta computadora.');
        setSbLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('license_status, license_expiry, email, app, cloud_sync_enabled')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        if (profileError && isNetworkError(profileError)) {
          setSbError('Error de red: No se pudo conectar al servidor de licencias. Verifica tu conexión a internet.');
        } else {
          setSbError('No se encontró el perfil de licencia de tu cuenta. Por favor contacta a soporte.');
        }
        setSbLoading(false);
        return;
      }

      if (profile.app && profile.app !== appMode) {
        const profileAppName = profile.app === 'fixpos' ? 'FixPOS' : (profile.app === 'fixrestaurante' ? 'FixRestaurante' : 'FixManager');
        setSbError(`Esta cuenta corresponde a una licencia de ${profileAppName}. Para usar ${appName}, por favor regístrate con una cuenta diferente.`);
        setSbLoading(false);
        return;
      }

      // 1. Validar si es una cuenta nueva sin activar
      if (!profile.license_expiry || profile.license_status === 'none' || !profile.license_status) {
        setSbError('Tu cuenta ha sido registrada con éxito. Por favor, comunícate con administración para activar tu licencia.');
        setSbLoading(false);
        return;
      }

      // 2. Validar si la cuenta está suspendida
      if (profile.license_status === 'suspended') {
        setSbError('Tu cuenta/licencia ha sido suspendida. Comunícate con administración.');
        setSbLoading(false);
        return;
      }

      // 3. Validar si expiró por fecha
      const expiryDate = new Date(profile.license_expiry);
      const isCloudInvalid = profile.license_status !== 'active' && profile.license_status !== 'trial';
      if (isCloudInvalid || expiryDate < new Date()) {
        setSbError('Tu suscripción ha expirado. Por favor, comunícate con administración para renovar tu licencia.');
        setSbLoading(false);
        return;
      }

      // Validar si esta computadora ya está vinculada a otra cuenta de usuario (Prevención de abuso de licencias compartidas)
      const { data: machineOwner, error: machineCheckError } = await supabase
        .from('activations')
        .select('user_id')
        .eq('machine_id', machineId)
        .eq('app', appMode)
        .maybeSingle();

      if (machineCheckError) {
        setSbError('Error al validar la firma de la máquina: ' + machineCheckError.message);
        setSbLoading(false);
        return;
      }

      if (machineOwner && machineOwner.user_id !== user.id && !isMobile()) {
        setSbError(`Esta computadora ya está vinculada a otra cuenta de ${appName}. No es posible vincular múltiples cuentas en el mismo dispositivo.`);
        setSbLoading(false);
        return;
      }

      // Validar dispositivo único (machineId) del usuario actual
      const { data: activations, error: actError } = await supabase
        .from('activations')
        .select('machine_id')
        .eq('user_id', user.id)
        .eq('app', appMode)
        .maybeSingle();

      const activeMachineId = activations?.machine_id;

      if (!activeMachineId) {
        // Registrar este dispositivo
        const { error: insertError } = await supabase.from('activations').insert({
          user_id: user.id,
          machine_id: machineId,
          app: appMode,
        });
        if (insertError) {
          setSbError('Error al registrar dispositivo: ' + insertError.message);
          setSbLoading(false);
          return;
        }
      } else if (activeMachineId !== machineId && !isMobile()) {
        // Ya registrado en otra máquina, bloquear acceso
        setSbError('Esta licencia ya está activa en otra computadora. Desvincúlala primero para poder usarla aquí o contacta a soporte.');
        setSbLoading(false);
        return;
      }

      // Todo correcto: guardar token local firmado
      const isLicenseVitalicia = expiryDate.getFullYear() > 2035;
      let localExpiryDate = expiryDate;
      if (isLicenseVitalicia) {
        localExpiryDate = new Date();
        localExpiryDate.setDate(localExpiryDate.getDate() + 30);
      }

      const yyyy = localExpiryDate.getFullYear();
      const mm = String(localExpiryDate.getMonth() + 1).padStart(2, '0');
      const dd = String(localExpiryDate.getDate()).padStart(2, '0');
      const expiryStr = `${yyyy}${mm}${dd}`;

      const actResult = await (window as any).electronAPI.activateLicense({
        email: profile.email,
        expiry: expiryStr,
        status: profile.license_status,
        type: profile.license_status === 'trial' ? 'Prueba' : (isLicenseVitalicia ? 'Vitalicia' : 'Suscripción'),
        ownerName: profile.email,
        isVitalicia: isLicenseVitalicia,
        lastOnlineCheck: new Date().toISOString()
      });

      if (actResult.success) {
        localStorage.setItem('fixmanager_cloud_sync_enabled', String(!!profile.cloud_sync_enabled));
        // Sincronizar datos locales del negocio a Supabase
        if (config && (config.storeName || config.phone)) {
          try {
            await supabase
              .from('profiles')
              .update({
                business_name: config.storeName,
                business_phone: config.phone || null
              })
              .eq('id', user.id)
              .eq('app', appMode);
          } catch (e) {}
        }

        setSbMessage('¡Licencia activada con éxito!');
        if (onLicenseActivated) {
          onLicenseActivated(actResult.license);
        }
      } else {
        setSbError(actResult.error || 'Error al persistir la activación local.');
      }
    } catch (err) {
      setSbError('Error al validar la licencia: ' + (err as Error).message);
    } finally {
      setSbLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setActiveSupabaseUser(user);
      if (user?.email) {
        setSbEmail(user.email);
      }
      
      // Auto-verificar una vez si la licencia está suspendida o expirada
      if (user && (licenseStatus === 'invalid' || licenseStatus === 'expired')) {
        checkUserLicense(user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [licenseStatus]);

  const handleSignOutSupabase = async () => {
    setSbLoading(true);
    try {
      const api = (window as any).electronAPI;
      if (api?.saveSupabaseSession) {
        await api.saveSupabaseSession(null).catch(() => {});
      }
      await supabase.auth.signOut();
      localStorage.removeItem('fixmanager_cloud_sync_enabled');
      setActiveSupabaseUser(null);
      setSbEmail('');
      setSbPassword('');
      setSbError(null);
      setSbMessage(null);
      if (onRenewLicense) {
        onRenewLicense();
      }
    } catch (err) {
      setSbError('Error al cerrar sesión: ' + (err as Error).message);
    } finally {
      setSbLoading(false);
    }
  };

  const handleSbLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSbLoading(true);
    setSbError(null);
    setSbMessage(null);

    try {
      let machineId = localMachineId;
      if (!machineId && (window as any).electronAPI?.getMachineId) {
        machineId = await (window as any).electronAPI.getMachineId().catch(() => '');
        setLocalMachineId(machineId);
      }
      if (!machineId) {
        setSbError('No se pudo identificar el identificador físico de esta computadora.');
        setSbLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: sbEmail.trim(),
        password: sbPassword,
      });

      if (authError) {
        setSbError(translateAuthError(authError.message));
        setSbLoading(false);
        return;
      }

      if (!authData.user) {
        setSbError('No se pudo obtener la información de usuario.');
        setSbLoading(false);
        return;
      }

      setActiveSupabaseUser(authData.user);
      const userId = authData.user.id;

      // Persistir tokens de sesión en disco para que sobrevivan reinicios del app
      const api = (window as any).electronAPI;
      if (api?.saveSupabaseSession && authData.session) {
        api.saveSupabaseSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        }).catch(() => {});
      }

      // Obtener el estado de la licencia de su perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, license_status, license_expiry, app, cloud_sync_enabled')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        if (profileError && isNetworkError(profileError)) {
          setSbError('Error de red: No se pudo conectar al servidor de licencias. Verifica tu conexión a internet.');
        } else {
          setSbError('No se encontró el perfil de licencia de tu cuenta. Por favor contacta a soporte.');
        }
        setSbLoading(false);
        return;
      }

      if (profile.app && profile.app !== appMode) {
        const profileAppName = profile.app === 'fixpos' ? 'FixPOS' : (profile.app === 'fixrestaurante' ? 'FixRestaurante' : 'FixManager');
        setSbError(`Esta cuenta corresponde a una licencia de ${profileAppName}. Para usar ${appName}, por favor regístrate con una cuenta diferente.`);
        setSbLoading(false);
        return;
      }

      // 1. Validar si es una cuenta nueva sin activar
      if (!profile.license_expiry || profile.license_status === 'none' || !profile.license_status) {
        setSbError('Tu cuenta ha sido registrada con éxito. Por favor, comunícate con administración para activar tu licencia.');
        setSbLoading(false);
        return;
      }

      // 2. Verificar si la licencia está suspendida
      if (profile.license_status === 'suspended') {
        setSbError('Tu cuenta/licencia ha sido suspendida. Comunícate con administración.');
        setSbLoading(false);
        return;
      }

      // 3. Verificar si la licencia venció o es inválida
      const expiryDate = new Date(profile.license_expiry);
      const isCloudInvalid = profile.license_status !== 'active' && profile.license_status !== 'trial';
      if (isCloudInvalid || expiryDate < new Date()) {
        setSbError('Tu suscripción ha expirado. Por favor, comunícate con administración para renovar tu licencia.');
        setSbLoading(false);
        return;
      }

      // Validar si esta computadora ya está vinculada a otra cuenta de usuario (Prevención de abuso de licencias compartidas)
      const { data: machineOwner, error: machineCheckError } = await supabase
        .from('activations')
        .select('user_id')
        .eq('machine_id', machineId)
        .eq('app', appMode)
        .maybeSingle();

      if (machineCheckError) {
        setSbError('Error al validar la firma de la máquina: ' + machineCheckError.message);
        setSbLoading(false);
        return;
      }

      if (machineOwner && machineOwner.user_id !== userId && !isMobile()) {
        setSbError(`Esta computadora ya está vinculada a otra cuenta de ${appName}. No es posible vincular múltiples cuentas en el mismo dispositivo. Por favor, inicia sesión con tu cuenta original o contacta a soporte.`);
        setSbLoading(false);
        return;
      }

      // Validar dispositivo único (machineId) del usuario actual
      const { data: activations, error: actError } = await supabase
        .from('activations')
        .select('machine_id')
        .eq('user_id', userId)
        .eq('app', appMode)
        .maybeSingle();

      const activeMachineId = activations?.machine_id;

      if (!activeMachineId) {
        // Registrar este dispositivo
        const { error: insertError } = await supabase.from('activations').insert({
          user_id: userId,
          machine_id: machineId,
          app: appMode,
        });
        if (insertError) {
          setSbError('Error al registrar dispositivo: ' + insertError.message);
          setSbLoading(false);
          return;
        }
      } else if (activeMachineId !== machineId && !isMobile()) {
        // Ya registrado en otra máquina, bloquear acceso
        setSbError('Esta licencia ya está activa en otra computadora. Desvincúlala primero para poder usarla aquí o contacta a soporte.');
        setSbLoading(false);
        return;
      }

      // Todo correcto: guardar token local firmado
      const isLicenseVitalicia = expiryDate.getFullYear() > 2035;
      let localExpiryDate = expiryDate;
      if (isLicenseVitalicia) {
        localExpiryDate = new Date();
        localExpiryDate.setDate(localExpiryDate.getDate() + 30);
      }

      const yyyy = localExpiryDate.getFullYear();
      const mm = String(localExpiryDate.getMonth() + 1).padStart(2, '0');
      const dd = String(localExpiryDate.getDate()).padStart(2, '0');
      const expiryStr = `${yyyy}${mm}${dd}`;

      const actResult = await (window as any).electronAPI.activateLicense({
        email: profile.email,
        expiry: expiryStr,
        status: profile.license_status,
        type: profile.license_status === 'trial' ? 'Prueba' : (isLicenseVitalicia ? 'Vitalicia' : 'Suscripción'),
        ownerName: profile.email,
        isVitalicia: isLicenseVitalicia,
        lastOnlineCheck: new Date().toISOString()
      });

      if (actResult.success) {
        localStorage.setItem('fixmanager_cloud_sync_enabled', String(!!profile.cloud_sync_enabled));
        // Sincronizar datos locales del negocio a Supabase
        if (config && (config.storeName || config.phone)) {
          try {
            await supabase
              .from('profiles')
              .update({
                business_name: config.storeName,
                business_phone: config.phone || null
              })
              .eq('id', userId)
              .eq('app', appMode);
          } catch (e) {}
        }

        setSbMessage('¡Licencia activada con éxito!');
        if (onLicenseActivated) {
          onLicenseActivated(actResult.license);
        }
      } else {
        setSbError(actResult.error || 'Error al persistir la activación local.');
      }
    } catch (err) {
      setSbError('Error de red o servidor: ' + (err as Error).message);
    } finally {
      setSbLoading(false);
    }
  };

  const handleSbRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSbLoading(true);
    setSbError(null);
    setSbMessage(null);

    if (sbPassword.length < 6) {
      setSbError('La contraseña debe tener al menos 6 caracteres.');
      setSbLoading(false);
      return;
    }

    try {
      // 1. Validar si el correo ya existe en Supabase mediante la función RPC check_email_exists
      const { data: emailExists, error: rpcError } = await supabase.rpc('check_email_exists', {
        email_to_check: sbEmail.trim()
      });

      if (rpcError) {
        console.error('Error al verificar duplicados de correo:', rpcError);
      } else if (emailExists) {
        setSbError('Este correo electrónico ya está registrado en FixManager. Por favor, inicia sesión.');
        setSbLoading(false);
        return;
      }

      // 2. Si no existe, proceder con el registro
      const { data, error } = await supabase.auth.signUp({
        email: sbEmail.trim(),
        password: sbPassword,
        options: {
          emailRedirectTo: `https://fixmanagerproject.com/auth/${appMode}/index.html`,
          data: {
            app: appMode
          }
        }
      });

      if (error) {
        setSbError(translateAuthError(error.message));
        setSbLoading(false);
        return;
      }

      if (data?.user) {
        await supabase
          .from('profiles')
          .update({ 
            app: appMode,
            business_name: config?.storeName || null,
            business_phone: config?.phone || null
          })
          .eq('id', data.user.id);
      }

      setSbMessage('Registro exitoso. Se ha enviado un correo de confirmación. Por favor, confírmalo y luego solicita la activación de tu plan por WhatsApp.');
      setSbMode('login');
      setSbPassword('');
    } catch (err) {
      setSbError('Error al registrar cuenta: ' + (err as Error).message);
    } finally {
      setSbLoading(false);
    }
  };

  const handleSbResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSbLoading(true);
    setSbError(null);
    setSbMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sbEmail.trim(), {
        redirectTo: `https://fixmanagerproject.com/auth/${appMode}/index.html`,
      });

      if (error) {
        setSbError(translateAuthError(error.message));
        setSbLoading(false);
        return;
      }

      setSbMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
      setSbMode('login');
    } catch (err) {
      setSbError('Error al enviar enlace: ' + (err as Error).message);
    } finally {
      setSbLoading(false);
    }
  };

  const handleDevAuth = async () => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(devPw));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const result = await (window as any).electronAPI?.devAuth?.(hash) ?? { ok: false, locked: false };
    const ok = typeof result === 'boolean' ? result : result.ok;
    const locked = typeof result === 'boolean' ? false : result.locked;
    if (locked) { setDevLocked(true); setShowDevExport(false); }
    else if (ok) { setDevUnlocked(true); setDevPwError(false); setDevPw(''); }
    else { setDevPwError(true); setDevPw(''); }
  };

  const exportData = (key: string, filename: string) => {
    const raw = localStorage.getItem(key);
    if (!raw) { setExportFeedback(`Sin datos en ${key}`); setTimeout(() => setExportFeedback(null), 3000); return; }
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportFeedback(`✓ ${filename} exportado`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const exportAll = () => {
    const data: Record<string, unknown> = {};
    const keys = ['fixmanager_orders','fixmanager_inventory','fixmanager_services','fixmanager_sales','fixmanager_expenses','fixmanager_users','fixmanager_config','fixmanager_clients'];
    keys.forEach(k => { const v = localStorage.getItem(k); if (v) { try { data[k] = JSON.parse(v); } catch { data[k] = v; } } });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixmanager_backup_completo_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportFeedback('✓ Backup completo exportado');
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const version = localStorage.getItem('fixmanager_app_version') || '1.14';
  const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const licenseBlocked = licenseStatus === 'expired' || licenseStatus === 'none' || licenseStatus === 'invalid';
  const licenseExpiry = licenseInfo?.expiry as string | undefined;
  const licenseExpiryFormatted = licenseExpiry && licenseExpiry !== 'PERPETUA'
    ? new Date(
        parseInt(licenseExpiry.slice(0,4)),
        parseInt(licenseExpiry.slice(4,6)) - 1,
        parseInt(licenseExpiry.slice(6,8))
      ).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const tryLogin = async (pinToCheck: string) => {
    if (!selectedUser) { setError('Selecciona un usuario primero.'); return; }
    if (pinToCheck.length < 4) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Se requiere conexión a Internet para iniciar sesión.');
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 500);
      return;
    }

    if (selectedUser.pin !== pinToCheck) {
      setError('PIN incorrecto.');
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 500);
      return;
    }

    // PIN correcto — verificar licencia en Supabase obligatoriamente para login inicial
    try {
      const checkOnline = async () => {
        await supabase.auth.refreshSession();
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
          // Hay sesión activa → consultar estado real de la licencia
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('license_status, license_expiry, app, cloud_sync_enabled')
            .eq('id', sbUser.id)
            .single();
          if (profileErr) {
            throw profileErr;
          }
          if (profile) {
            if (profile.app && profile.app !== appMode) {
              const profileAppName = profile.app === 'fixpos' ? 'FixPOS' : (profile.app === 'fixrestaurante' ? 'FixRestaurante' : 'FixManager');
              throw new Error(`Licencia de ${profileAppName} — no tienes acceso a ${appName}.`);
            }
            if (profile.license_status === 'suspended') {
              throw new Error('Tu licencia ha sido suspendida. Contacta a soporte.');
            }
            if (profile.license_status !== 'active' && profile.license_status !== 'trial') {
              throw new Error('Tu licencia no está activa. Contacta a soporte.');
            }
            const expiryDate = new Date(profile.license_expiry);
            if (expiryDate < new Date() && expiryDate.getFullYear() <= 2035) {
              throw new Error('Tu suscripción ha expirado. Por favor renuévala.');
            }
            localStorage.setItem('fixmanager_cloud_sync_enabled', String(!!profile.cloud_sync_enabled));
          }
        }
      };

      // Limitar el chequeo online a un tiempo máximo de 3 segundos (3000ms)
      await Promise.race([
        checkOnline(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 3000))
      ]);

    } catch (err: any) {
      console.warn('[Login] Error durante chequeo online:', err);
      const isConnectionIssue = err.message === 'TIMEOUT' || isNetworkError(err);
      if (isConnectionIssue) {
        setError('Sin conexión a Internet. Se requiere red para iniciar sesión.');
      } else {
        setError(err.message || 'Error al validar la licencia.');
      }
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 500);
      return;
    }
    setError(null);
    onLogin(selectedUser);
  };

  const handleNumpad = (key: string) => {
    if (!isOnline) return;
    if (key === '⌫') { setPin(p => p.slice(0, -1)); if (error) setError(null); }
    else if (key === '→') { tryLogin(pin); }
    else if (pin.length < 4) {
      const p = pin + key;
      if (error) setError(null);
      setPin(p);
      if (p.length === 4) setTimeout(() => tryLogin(p), 80);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (licenseBlocked || !isOnline) return;
      if (/^[0-9]$/.test(e.key)) handleNumpad(e.key);
      else if (e.key === 'Backspace') handleNumpad('⌫');
      else if (e.key === 'Enter') handleNumpad('→');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pin, error, licenseBlocked, isOnline]); // eslint-disable-line

  const moduleIcons = [
    { icon: ShoppingCart, label: 'POS' },
    { icon: ClipboardList, label: 'Órdenes' },
    { icon: Package, label: 'Stock' },
    { icon: Scissors, label: 'Servicios' },
    { icon: CreditCard, label: 'Fiados' },
    { icon: BarChart2, label: 'Reportes' },
  ];

  // Dynamic banner and button calculation
  let bannerBg = '#431407';
  let bannerText = '⛔ Sin licencia activa — Acceso bloqueado';
  let bannerTextColor = '#fca5a5';
  let bannerBorder = '1px solid rgba(239,68,68,0.4)';
  
  let btnText = 'Renovar licencia →';
  let btnBg = '#dc2626';
  let btnBorder = '1px solid #ef4444';
  let btnAction: () => void = onRenewLicense || (() => {});

  const getPlanLabel = (plan: string) => {
    if (plan === 'yearly') return 'Plan Anual (1 Año)';
    if (plan === 'lifetime') return 'Licencia Permanente (Vitalicia)';
    return 'Plan Mensual (1 Mes)';
  };

  const handleWhatsAppRenew = () => {
    const email = sbEmail || (licenseInfo?.email as string) || '';
    const store = config.storeName || 'Mi Taller';
    const machine = localMachineId || 'No disponible';
    const planName = getPlanLabel(selectedPlan);
    const baseMsg = `Hola, deseo contratar/renovar mi licencia de FixManager.\n\nDatos del cliente:\n- Taller: ${store}\n- Correo: ${email}\n- Plan deseado: ${planName}\n- ID de equipo: ${machine}`;
    const encoded = encodeURIComponent(baseMsg);
    const phone = '523511574876';
    const url = `https://wa.me/${phone}?text=${encoded}`;
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const renderPlanSelector = () => {
    return (
      <div style={{ marginBottom: 4 }}>
        <label style={{ display:'block', color:'#5a7a9a', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>
          Elige el plan que deseas adquirir:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { id: 'monthly', label: '1 Mes', desc: 'Suscripción' },
            { id: 'yearly', label: '1 Año', desc: 'Ahorro' },
            { id: 'lifetime', label: 'Vitalicia', desc: 'Acceso total' }
          ].map(p => {
            const isSelected = selectedPlan === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlan(p.id as any)}
                style={{
                  padding: '8px 4px',
                  textAlign: 'center',
                  background: isSelected ? '#ffffff' : '#f8fafc',
                  border: isSelected ? '2px solid #1a7abf' : '2px solid #c8d8e8',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 12px rgba(26,122,191,0.15)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 800, color: isSelected ? '#0d5a95' : '#334155' }}>
                  {p.label}
                </span>
                <span style={{ fontSize: '8px', fontWeight: 600, color: isSelected ? '#1d4ed8' : '#64748b', marginTop: 2 }}>
                  {p.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (licenseBlocked) {
    if (licenseStatus === 'expired') {
      bannerBg = '#7f1d1d';
      bannerText = `⛔ Licencia vencida${licenseExpiryFormatted ? ` el ${licenseExpiryFormatted}` : ''} — Acceso bloqueado`;
      bannerTextColor = '#fca5a5';
      bannerBorder = '1px solid rgba(239,68,68,0.4)';
      btnText = 'Solicitar Renovación →';
      btnBg = '#dc2626';
      btnBorder = '1px solid #ef4444';
      btnAction = handleWhatsAppRenew;
    } else if (licenseStatus === 'invalid') {
      bannerBg = '#7c2d12';
      bannerText = '⛔ Dispositivo no autorizado / Licencia suspendida';
      bannerTextColor = '#fed7aa';
      bannerBorder = '1px solid rgba(249,115,22,0.4)';
      btnText = 'Contactar Soporte →';
      btnBg = '#ea580c';
      btnBorder = '1px solid #f97316';
      btnAction = handleWhatsAppRenew;
    } else if (licenseStatus === 'none') {
      bannerBg = '#1e3a8a'; // Azul indigo profesional
      bannerText = '💡 ¡Todo listo! Activa tu FixManager para comenzar';
      bannerTextColor = '#bfdbfe';
      bannerBorder = '1px solid rgba(59,130,246,0.4)';
      
      // Estilo de vidrio translúcido (glassmorphism) para que no se pierda y tenga buen contraste
      btnBg = 'rgba(255, 255, 255, 0.15)';
      btnBorder = '1px solid rgba(255, 255, 255, 0.35)';
      
      if (sbMode === 'login') {
        btnText = '¿Eres nuevo? Regístrate aquí →';
        btnAction = () => { setSbMode('register'); setSbError(null); setSbMessage(null); };
      } else if (sbMode === 'register') {
        btnText = '¿Ya tienes cuenta? Inicia sesión →';
        btnAction = () => { setSbMode('login'); setSbError(null); setSbMessage(null); };
      } else {
        btnText = 'Volver al Inicio →';
        btnAction = () => { setSbMode('login'); setSbError(null); setSbMessage(null); };
      }
    }
  }
  if (licenseStatus === 'checking') {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: isRetro ? '#cbd6e2' : '#0f172a',
        fontFamily: isRetro ? 'sans-serif' : 'system-ui, sans-serif',
        userSelect: 'none'
      }}>
        <div style={{
          background: isRetro ? '#dfdfdf' : '#1e293b',
          border: isRetro ? '2px solid' : '1px solid #334155',
          borderTopColor: isRetro ? '#ffffff' : '#334155',
          borderLeftColor: isRetro ? '#ffffff' : '#334155',
          borderRightColor: isRetro ? '#808080' : '#334155',
          borderBottomColor: isRetro ? '#808080' : '#334155',
          boxShadow: isRetro ? '2px 2px 0px rgba(0,0,0,0.5)' : '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          padding: '24px 32px',
          borderRadius: isRetro ? 0 : 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <svg
            style={{ width: 40, height: 40, color: '#1a7abf', animation: 'spin 1s linear infinite' }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            color: isRetro ? '#000000' : '#94a3b8',
            fontFamily: isRetro ? 'monospace' : 'inherit'
          }}>
            {isRetro ? 'VERIFICANDO LICENCIA...' : 'Verificando licencia...'}
          </span>
        </div>
      </div>
    );
  }

  const submitBtnBg = sbMode === 'register'
    ? 'linear-gradient(180deg, #10b981, #059669)' // Verde esmeralda para registro
    : sbMode === 'forgot'
    ? 'linear-gradient(180deg, #4b5563, #374151)' // Gris para recuperar
    : 'linear-gradient(180deg, #1a7abf, #0d5a95)'; // Azul para login/activar

  const submitBtnShadow = sbMode === 'register'
    ? '0 3px 10px rgba(16, 185, 129, 0.3)'
    : sbMode === 'forgot'
    ? '0 3px 10px rgba(75, 85, 99, 0.3)'
    : '0 3px 10px rgba(13, 90, 149, 0.3)';

  const isDarkRetro = isRetro && !isLight;

  const getBtnStyle = (key: string) => {
    const isEnter = key === '→';
    const isDel = key === '⌫';
    if (isDarkRetro) {
      return {
        border: `1px solid ${isEnter ? '#1d4ed8' : isDel ? '#991b1b' : '#383c48'}`,
        background: isEnter ? 'linear-gradient(180deg,#3b82f6,#1d4ed8)' : isDel ? '#4c0519' : '#1c1f2e',
        color: isEnter ? 'white' : isDel ? '#f87171' : 'white',
        boxShadow: isEnter ? '0 3px 10px rgba(29,78,216,0.4)' : 'none'
      };
    }
    return {
      border: `1px solid ${isEnter ? '#1558a0' : isDel ? '#fca5a5' : '#b8cce0'}`,
      background: isEnter ? 'linear-gradient(180deg,#2175c2,#1558a0)' : isDel ? '#fee2e2' : 'white',
      color: isEnter ? 'white' : isDel ? '#dc2626' : '#1e293b',
      boxShadow: isEnter ? '0 3px 10px rgba(21,88,160,0.4)' : '0 1px 3px rgba(0,0,0,0.08)'
    };
  };

  if (isMobile()) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto',
          userSelect: 'none',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: isLight ? '#f8fafc' : '#090d16',
          color: isLight ? '#0f172a' : '#ffffff'
        }}
      >
        {/* 1. HERO HEADER AZUL UNIFICADO EXPANDIDO (100% Texto Blanco Nítido en Todo Momento) */}
        <div
          style={{
            width: '100%',
            paddingTop: 'calc(1.6rem + env(safe-area-inset-top, 24px))',
            paddingBottom: '26px',
            paddingLeft: '24px',
            paddingRight: '24px',
            background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 40%, #3730a3 100%)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0
          }}
        >
          {/* Resplandor decorativo de fondo */}
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-sky-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10 max-w-lg mx-auto">
            <div className="flex items-center gap-4">
              {((config as any).logoUrl || (config as any).customLogo || (config as any).ticketLogoUrl || (config as any).logo || (config as any).appLogoUrl) ? (
                <img
                  src={(config as any).logoUrl || (config as any).customLogo || (config as any).ticketLogoUrl || (config as any).logo || (config as any).appLogoUrl}
                  alt="Logo"
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-contain bg-white/20 p-1.5 border-2 border-white/40 shrink-0 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-white shrink-0 shadow-lg">
                  <Wrench className="w-8 h-8 stroke-[2.5]" />
                </div>
              )}
              <div className="flex flex-col">
                <h1
                  style={{ color: '#ffffff' }}
                  className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight drop-shadow-md"
                >
                  {(config as any).workshopName || config.storeName || 'SMARTEC MÓVIL'}
                </h1>
                <p
                  style={{ color: '#dbeafe' }}
                  className="text-xs sm:text-sm font-bold mt-1 tracking-wide"
                >
                  Sistema de Gestión de Taller
                </p>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end text-right shrink-0">
              <span
                style={{ color: '#6ee7b7', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                className="px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-black uppercase tracking-wider border shadow-sm"
              >
                ✓ PRO ACTIVADO
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }} className="text-xs font-mono mt-1">v1.15.20</span>
            </div>
          </div>

          {/* BADGE DE LICENCIA INTEGRADO EXPANDIDO CON TEXTO BLANCO GARANTIZADO */}
          <div className="mt-4 flex items-center max-w-lg mx-auto">
            <div
              style={{ color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.35)' }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-lg border-2 text-xs sm:text-sm font-extrabold shadow-md max-w-full"
            >
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-sm" />
              <span style={{ color: '#ffffff' }} className="truncate">
                Software Activado — <strong style={{ color: '#ffffff' }} className="font-black">FixManager Pro</strong>
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.95)', borderLeftColor: 'rgba(255, 255, 255, 0.35)' }} className="font-mono text-xs pl-3 border-l-2 shrink-0">
                v1.15.20
              </span>
            </div>
          </div>
        </div>

        {/* 2. CUERPO DE AUTENTICACIÓN (Distribuido para aprovechar 100% el alto de pantalla) */}
        <div className="w-full flex-1 flex flex-col justify-between px-6 sm:px-10 py-5 gap-3.5 max-w-md mx-auto">
          {/* SECCIÓN USUARIO */}
          <div className="flex flex-col gap-1">
            <label className={`text-[10.5px] font-mono font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-zinc-400'}`}>
              USUARIO
            </label>
            <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm border ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
            }`}>
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-base shadow-md shrink-0">
                  {selectedUser?.name ? selectedUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="flex flex-col truncate">
                  <span className={`text-base font-black uppercase truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {selectedUser?.name || 'Administrador'}
                  </span>
                  <span className="text-xs font-bold text-amber-500 uppercase mt-0.5">
                    {selectedUser?.role === 'admin' ? 'Administrador' : 'Empleado'}
                  </span>
                </div>
              </div>

              {users.length > 1 && (
                <div className="relative shrink-0">
                  <select
                    value={selectedUser?.id ?? ''}
                    onChange={e => {
                      const u = users.find(u => u.id === e.target.value) ?? null;
                      setSelectedUser(u); setPin(''); setError(null);
                    }}
                    className={`py-2 px-3 pr-7 rounded-xl text-xs font-black uppercase border tracking-wider appearance-none cursor-pointer shadow-sm ${
                      isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-zinc-800 border-zinc-700 text-white'
                    }`}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-zinc-400">▾</span>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN CONTRASEÑA PIN */}
          <div className="w-full flex flex-col gap-3">
            {!isOnline ? (
              <div className={`w-full flex flex-col items-center justify-center p-6 rounded-2xl border-2 text-center gap-3 my-2 animate-fade-in shadow-xl ${
                isLight 
                  ? 'bg-amber-50 border-amber-400 text-slate-900' 
                  : 'bg-zinc-900 border-amber-500 text-white'
              }`}>
                <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl shrink-0 shadow-sm border border-amber-500/30">
                  ⚠️
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-base font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Se requiere conexión a Internet
                  </span>
                  <p className="text-xs font-semibold leading-relaxed max-w-xs opacity-90">
                    Es necesario contar con Internet para el primer inicio de sesión del día para autenticar tu cuenta. Una vez validada, podrás seguir trabajando sin conexión.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isCheckingNet}
                  onClick={handleRetryConnection}
                  className="mt-2 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-75"
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingNet ? 'animate-spin' : ''}`} />
                  <span>{isCheckingNet ? 'Verificando red...' : 'Reintentar Conexión'}</span>
                </button>

                {netCheckFeedback && (
                  <div className={`text-xs font-black transition-all ${
                    netCheckFeedback.includes('✓') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {netCheckFeedback}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className={`text-[10.5px] font-mono font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-zinc-400'}`}>
                    CONTRASEÑA
                  </label>
                  <div className={`p-4 rounded-2xl flex items-center justify-center gap-6 transition-all shadow-inner border-2 ${
                    shake ? 'animate-bounce' : ''
                  } ${
                    error 
                      ? (isLight ? 'border-rose-500 bg-rose-50' : 'border-rose-500 bg-rose-950/30')
                      : (isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800')
                  }`}>
                    {[0, 1, 2, 3].map(i => {
                      const isFilled = pin.length > i;
                      return (
                        <div
                          key={i}
                          className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                            isFilled
                              ? 'bg-blue-600 border-blue-600 scale-110 shadow-md shadow-blue-500/50'
                              : (isLight ? 'border-slate-300 bg-slate-100' : 'border-zinc-700 bg-zinc-800')
                          }`}
                        />
                      );
                    })}
                  </div>

                  {error && (
                    <div className="text-xs font-black text-rose-600 dark:text-rose-400 animate-pulse text-center mt-0.5">
                      ⚠️ {error}
                    </div>
                  )}
                </div>

                {/* BOTÓN FACE ID VÍVIDO EXPANDIDO */}
                <button
                  type="button"
                  onClick={handleTriggerBiometric}
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 100%)' }}
                  className="w-full py-4 px-4 rounded-2xl font-black text-white border border-blue-500/50 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md shadow-blue-500/30 cursor-pointer"
                  title="Autenticación Biométrica Nativa"
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-base font-black shadow-inner shrink-0">
                    {biometryType === BiometryType.FACE_ID ? '👤' : '🫆'}
                  </div>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                    Desbloquear con {biometryType === BiometryType.FACE_ID ? 'Face ID' : 'Huella'}
                  </span>
                </button>

                {/* TECLADO NUMÉRICO EXPANDIDO (TECLAS MÁS ALTAS h-16 sm:h-18 Y NÚMEROS 3XL) */}
                <div className="grid grid-cols-3 gap-3 w-full my-1">
                  {['1','2','3','4','5','6','7','8','9'].map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleNumpad(k)}
                      className={`h-16 sm:h-18 rounded-2xl text-3xl font-black flex items-center justify-center active:scale-95 transition-all shadow-sm cursor-pointer ${
                        isLight
                          ? 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 active:bg-blue-50'
                          : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white active:bg-zinc-700'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                  <div className="h-16 sm:h-18 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => handleNumpad('0')}
                    className={`h-16 sm:h-18 rounded-2xl text-3xl font-black flex items-center justify-center active:scale-95 transition-all shadow-sm cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 active:bg-blue-50'
                        : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white active:bg-zinc-700'
                    }`}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpad('⌫')}
                    className={`h-16 sm:h-18 rounded-2xl text-2xl font-black flex items-center justify-center active:scale-95 transition-all shadow-sm cursor-pointer ${
                      isLight
                        ? 'bg-slate-200/80 hover:bg-slate-300 border border-slate-300 text-slate-800'
                        : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200'
                    }`}
                    title="Borrar dígito"
                  >
                    ⌫
                  </button>
                </div>
              </>
            )}
          </div>

          {/* FOOTER LINK CON ESPACIADO INFERIOR ADECUADO */}
          <div className="flex justify-center pt-2 pb-[calc(0.8rem+env(safe-area-inset-bottom,0px))] shrink-0">
            <button
              type="button"
              onClick={() => alert('Contacta al administrador del taller para restablecer tu PIN.')}
              className={`text-xs font-black underline underline-offset-4 cursor-pointer py-1 active:scale-95 transition-all ${
                isLight ? 'text-slate-600 hover:text-blue-700' : 'text-slate-400 hover:text-blue-300'
              }`}
            >
              🔑 ¿Olvidaste tu contraseña? Restablecer PIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: centerCard ? 'center' : 'stretch', justifyContent: centerCard ? 'center' : 'stretch', userSelect: 'none', fontFamily: 'system-ui, sans-serif', background: centerCard ? (isOverlay ? (isLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(5, 10, 20, 0.65)') : (isLight ? 'radial-gradient(circle at center, #f1f5f9 0%, #cbd5e1 100%)' : 'radial-gradient(circle at center, #1e293b 0%, #0b1120 100%)')) : (isRetro && !isLight ? '#1a1c23' : '#f0f4f8'), backdropFilter: isOverlay ? 'blur(18px)' : 'none', WebkitBackdropFilter: isOverlay ? 'blur(18px)' : 'none' }}>
      {/* Tarjeta login */}
      <div style={{ position:'relative', width: centerCard ? 460 : '100%', height: centerCard ? (isOverlay ? 'auto' : 600) : '100vh', maxWidth: centerCard ? 'calc(100vw - 32px)' : '100%', maxHeight: centerCard ? 'calc(100vh - 32px)' : '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: centerCard ? 12 : 0, boxShadow: centerCard ? '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)' : 'none' }}>

      {/* ── BANNER ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #0a4a7a 0%, #1a7abf 40%, #0d5a95 70%, #083050 100%)',
        padding: '14px 24px 12px',
        display: 'flex', alignItems: 'center', gap: 16,
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decoración de fondo — círculos translúcidos */}
        <div style={{ position:'absolute',top:-40,right:-20,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,0.06)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:-30,left:'35%',width:140,height:140,borderRadius:'50%',background:'rgba(255,255,255,0.04)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',top:10,right:100,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.05)',pointerEvents:'none' }} />

        {/* Logo */}
        <div style={{ width:60,height:60,borderRadius:8,overflow:'hidden',background:'rgba(255,255,255,0.18)',border:'2px solid rgba(255,255,255,0.30)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 16px rgba(0,0,0,0.3)' }}>
          {config.logoUrl && (config.logoUrl.startsWith('data:') || config.logoUrl.startsWith('http'))
            ? <img src={config.logoUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
            : <Wrench style={{ width:30,height:30,color:'white' }} />}
        </div>

        {/* Nombre */}
        <div style={{ flex:1 }}>
          <div style={{ color:'white',fontWeight:900,fontSize:28,lineHeight:1.05,textShadow:'0 2px 10px rgba(0,0,0,0.5)',letterSpacing:'-0.5px' }}>
            {config.storeName || 'FixManager'}
          </div>
          <div style={{ color:'rgba(180,220,255,0.80)',fontSize:11,fontWeight:600,marginTop:3,letterSpacing:'0.02em' }}>
            Sistema de Gestión de Taller
          </div>
        </div>
      </div>

      {/* ── BARRA DE ESTADO ────────────────────────────────────────────── */}
      {licenseBlocked ? (
        <div style={{ background: bannerBg, padding:'5px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, borderBottom: bannerBorder }}>
          <span className="retro-white-text" style={{ fontSize:10, fontWeight:700 }}>
            {bannerText}
          </span>
          <button type="button" onClick={btnAction} className="retro-white-text" style={{ background: btnBg, border: btnBorder, padding:'4px 10px', borderRadius:4, cursor:'pointer', letterSpacing:'0.05em', textTransform:'uppercase', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}>
            <span className="retro-white-text" style={{ fontSize: '9px', fontWeight: 900 }}>
              {btnText}
            </span>
          </button>
        </div>
      ) : (
        <div style={{ background:'#1a5fa8',padding:'4px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <span style={{ color:'#bfdbfe',fontSize:10,fontWeight:700 }}>
            ✓ Software Activado Correctamente — FixManager Pro
          </span>
          <span style={{ color:'rgba(147,197,253,0.55)',fontSize:9,fontFamily:'monospace' }}>
            V {version} · {dateStr}
          </span>
        </div>
      )}

      {/* ── CUERPO ─────────────────────────────────────────────────────── */}
      <div style={{ background: isRetro && !isLight ? '#1a1c23' : '#f0f4f8', position:'relative', flex: isOverlay ? 'none' : 1, display:'flex', flexDirection:'column', justifyContent: isOverlay ? 'flex-start' : 'center', overflowY:'auto' }}>
        
        {showResetConfirm && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 9999,
          }}>
            <div style={{
              background: isRetro && !isLight ? '#1e2025' : 'white',
              border: isRetro && !isLight ? '1px solid #383c48' : '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '20px 24px',
              maxWidth: 320,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
                <span style={{ fontSize: 32 }}>⚠️</span>
                <h4 style={{ margin: 0, color: isRetro && !isLight ? 'white' : '#0f172a', fontWeight: 850, fontSize: 14 }}>
                  ¿Restablecer esta computadora?
                </h4>
                <p style={{ margin: 0, color: isRetro && !isLight ? '#94a3b8' : '#64748b', fontSize: 11, lineHeight: 1.4, fontWeight: 550 }}>
                  Se borrarán la base de datos local y la sesión de esta PC para que puedas configurarla nuevamente o enlazarla como Caja Secundaria.
                </p>
              </div>

              {users.some(u => u.role === 'admin') && (
                <div style={{ width: '100%' }}>
                  <label style={{ display: 'block', color: isRetro && !isLight ? '#94a3b8' : '#475569', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, textAlign: 'left' }}>
                    PIN de Administrador para confirmar:
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={resetAdminPin}
                    onChange={e => {
                      setResetAdminPin(e.target.value.replace(/\D/g, ''));
                      setResetError(null);
                    }}
                    placeholder="PIN de 4 dígitos"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: isRetro && !isLight ? '#121316' : 'white',
                      border: isRetro && !isLight ? '1px solid #383c48' : '1px solid #cbd5e1',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 'bold',
                      color: isRetro && !isLight ? 'white' : '#1e293b',
                      outline: 'none',
                      textAlign: 'center',
                      boxSizing: 'border-box'
                    }}
                  />
                  {resetError && (
                    <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, marginTop: 4, textAlign: 'center' }}>
                      {resetError}
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetAdminPin('');
                    setResetError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    background: isRetro && !isLight ? '#2d3139' : '#f1f5f9',
                    border: 'none',
                    borderRadius: 6,
                    color: isRetro && !isLight ? '#cbd5e1' : '#475569',
                    fontWeight: 800,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const admins = users.filter(u => u.role === 'admin');
                    if (admins.length > 0) {
                      const isValidPin = admins.some(a => a.pin === resetAdminPin);
                      if (!isValidPin) {
                        setResetError('❌ PIN de administrador incorrecto.');
                        return;
                      }
                    }
                    if (onResetApp) {
                      onResetApp();
                    } else {
                      localStorage.removeItem('fixmanager_setup_complete');
                      localStorage.removeItem('fixmanager_config');
                      localStorage.removeItem('fixmanager_users');
                      localStorage.removeItem('selected_local_server_host');
                      localStorage.removeItem('fixmanager_session_closed');
                      window.location.reload();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: 6,
                    color: 'white',
                    fontWeight: 900,
                    fontSize: 11,
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)'
                  }}
                >
                  Sí, Restablecer
                </button>
              </div>
            </div>
          </div>
        )}

        {licenseBlocked ? (
          activeSupabaseUser ? (
            /* USUARIO CON SESIÓN ACTIVA EN EL EQUIPO PERO CON LICENCIA SUSPENDIDA/VENCIDA */
            <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'16px 24px', zIndex:1 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: 15 }}>
                  {licenseStatus === 'expired' ? '⏳ Suscripción Vencida' : '⛔ Licencia Inactiva / Suspendida'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 11, lineHeight: 1.3 }}>
                  Cuenta asociada: <strong>{activeSupabaseUser.email}</strong>
                </p>
              </div>

              {sbError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '8px 12px', color: '#b91c1c', fontSize: 10.5, fontWeight: 700 }}>
                  ⚠️ {sbError}
                </div>
              )}

              {sbMessage && (
                <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 8, padding: '8px 12px', color: '#065f46', fontSize: 10.5, fontWeight: 700 }}>
                  💡 {sbMessage}
                </div>
              )}

              <button type="button" onClick={() => checkUserLicense(activeSupabaseUser)} disabled={sbLoading}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: 'linear-gradient(180deg, #1a7abf, #0d5a95)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(13, 90, 149, 0.3)',
                  opacity: sbLoading ? 0.7 : 1
                }}
              >
                {sbLoading ? 'Comprobando...' : '🔄 Recomprobar Licencia →'}
              </button>

              <button type="button" onClick={handleWhatsAppRenew}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: 'linear-gradient(180deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)'
                }}
              >
                Solicitar Activación por WhatsApp →
              </button>

              <button type="button" onClick={handleSignOutSupabase}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginTop: 8,
                  alignSelf: 'center'
                }}
              >
                Cerrar Sesión / Usar otra cuenta
              </button>
            </div>
          ) : sbMode === 'localLink' ? (
            /* FORMULARIO DE ENLACE MULTICAJA LOCAL */
            <form onSubmit={handleConnectLocalServer}
              style={{ display:'flex', flexDirection:'column', gap:10, padding:'16px 24px', zIndex:1 }}>
              
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: 15 }}>
                  🌐 Enlace Multicaja Local
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 10.5, lineHeight: 1.3 }}>
                  Conecta esta computadora secundaria a tu Caja Principal mediante red local para sincronizar ventas y órdenes de servicio.
                </p>
              </div>

              {sbError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '8px 12px', color: '#b91c1c', fontSize: 10.5, fontWeight: 700 }}>
                  ⚠️ {sbError}
                </div>
              )}

              {sbMessage && (
                <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 8, padding: '8px 12px', color: '#065f46', fontSize: 10.5, fontWeight: 700 }}>
                  💡 {sbMessage}
                </div>
              )}

              <div>
                <label style={{ display:'block', color:'#5a7a9a', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>
                  Dirección IP de la Caja Principal
                </label>
                <input
                  type="text"
                  required
                  value={localServerIp}
                  onChange={e => setLocalServerIp(e.target.value)}
                  placeholder="Ej. 192.168.1.50"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'white',
                    border: '2px solid #c8d8e8',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button type="submit" disabled={isLinkingLocal}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: 'linear-gradient(180deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
                  opacity: isLinkingLocal ? 0.7 : 1
                }}
              >
                {isLinkingLocal ? 'Conectando...' : 'Conectar Caja Secundaria →'}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <button type="button" onClick={() => { setSbMode('login'); setSbError(null); setSbMessage(null); }}
                  style={{ background: 'none', border: 'none', color: '#1a7abf', fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                  Volver a Activación por Internet
                </button>
              </div>
            </form>
          ) : (
            /* FORMULARIO DE AUTENTICACIÓN Y ACTIVACIÓN CON SUPABASE */
            <form onSubmit={sbMode === 'login' ? handleSbLogin : sbMode === 'register' ? handleSbRegister : handleSbResetPassword}
              style={{ display:'flex', flexDirection:'column', gap:10, padding:'16px 24px', zIndex:1 }}>
              
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: 15 }}>
                  {sbMode === 'login' ? '🔑 Activar Software' : sbMode === 'register' ? '📝 Crear Cuenta FixManager' : '🔄 Recuperar Contraseña'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 10.5, lineHeight: 1.3 }}>
                  {sbMode === 'login' && 'Ingresa tu correo y contraseña para activar la licencia en esta computadora.'}
                  {sbMode === 'register' && 'Crea tu cuenta de FixManager. Para activarla, deberás adquirir una licencia.'}
                  {sbMode === 'forgot' && 'Ingresa tu correo para recibir un enlace para cambiar tu contraseña.'}
                </p>
              </div>

              {sbError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '8px 12px', color: '#b91c1c', fontSize: 10.5, fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span>⚠️ {sbError}</span>
                  {(sbError.includes('administración') || sbError.includes('soporte') || sbError.includes('vincular') || sbError.includes('expirado') || sbError.includes('vencida')) && (
                    <button type="button" onClick={handleWhatsAppRenew}
                       style={{ background: '#dc2626', border: 'none', borderRadius: 6, color: 'white', fontWeight: 900, fontSize: 10.5, padding: '6px 12px', cursor: 'pointer', textTransform: 'uppercase', alignSelf: 'center', transition: 'all 0.15s' }}>
                      Solicitar Activación / Soporte por WhatsApp →
                    </button>
                  )}
                </div>
              )}

              {sbMessage && (
                <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 8, padding: '8px 12px', color: '#065f46', fontSize: 10.5, fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span>💡 {sbMessage}</span>
                  {sbMessage.includes('Registro exitoso') && (
                    <button type="button" onClick={handleWhatsAppRenew}
                      style={{ background: '#10b981', border: 'none', borderRadius: 6, color: 'white', fontWeight: 900, fontSize: 10.5, padding: '6px 12px', cursor: 'pointer', textTransform: 'uppercase', alignSelf: 'center' }}>
                      Solicitar Activación de Plan por WhatsApp →
                    </button>
                  )}
                </div>
              )}

              <div>
                <label style={{ display:'block', color:'#5a7a9a', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={sbEmail}
                  onChange={e => setSbEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'white',
                    border: '2px solid #c8d8e8',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>

              {sbMode !== 'forgot' && (
                <div>
                  <label style={{ display:'block', color:'#5a7a9a', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Contraseña</label>
                  <input
                    type="password"
                    required
                    value={sbPassword}
                    onChange={e => setSbPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'white',
                      border: '2px solid #c8d8e8',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                  />
                  {sbMode === 'register' && (
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b', marginTop: 4, fontWeight: 700, lineHeight: 1.2 }}>
                      ℹ️ Mínimo 6 caracteres.
                    </span>
                  )}
                </div>
              )}

              {(sbMode === 'register' || licenseStatus === 'expired' || licenseStatus === 'invalid') && renderPlanSelector()}

              <button type="submit" disabled={sbLoading}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: submitBtnBg,
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  boxShadow: submitBtnShadow,
                  transition: 'all 0.15s',
                  opacity: sbLoading ? 0.7 : 1
                }}
              >
                {sbLoading ? 'Cargando...' : sbMode === 'login' ? 'Activar Dispositivo →' : sbMode === 'register' ? 'Crear Cuenta →' : 'Enviar Enlace →'}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {sbMode === 'login' ? (
                  <>
                    <button type="button" onClick={() => { setSbMode('register'); setSbError(null); setSbMessage(null); }}
                      style={{ background: 'none', border: 'none', color: '#1a7abf', fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                      Registrarme como usuario nuevo
                    </button>
                    <button type="button" onClick={() => { setSbMode('forgot'); setSbError(null); setSbMessage(null); }}
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>
                      ¿Olvidaste tu contraseña?
                    </button>
                    <button type="button" onClick={() => { setSbMode('localLink'); setSbError(null); setSbMessage(null); }}
                      style={{ background: 'none', border: 'none', color: '#10b981', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', marginTop: 4 }}>
                      🌐 Enlazar como Caja Secundaria
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => { setSbMode('login'); setSbError(null); setSbMessage(null); }}
                    style={{ background: 'none', border: 'none', color: '#1a7abf', fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                    Ya tengo cuenta, Iniciar Sesión
                  </button>
                )}
              </div>
            </form>
          )
        ) : (
          /* FORMULARIO DE USUARIO LOCAL Y PIN PAD */
          isMobile() ? (
            /* ── INTERFAZ DE LOGIN MÓVIL (UNIBODY SINGLE-CANVAS BLUE THEME) ────────── */
            <div className="fixed inset-0 z-[999999] w-full h-full min-h-[100vh] flex flex-col justify-between overflow-y-auto select-none font-sans bg-gradient-to-b from-blue-700 via-indigo-800 to-slate-950 text-white transition-all duration-200 animate-fade-in">
              
              {/* 1. HERO HEADER (Completamente integrado sin fondo recortado) */}
              <div className="w-full px-6 pt-[calc(1.2rem+env(safe-area-inset-top,20px))] pb-4 text-white relative overflow-hidden shrink-0">
                {/* Resplandor decorativo de fondo */}
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between relative z-10 max-w-lg mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
                      <Wrench className="w-5.5 h-5.5 stroke-[2.5]" />
                    </div>
                    <div className="flex flex-col">
                      <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-none text-white">
                        {(config as any).workshopName || config.storeName || 'SMARTEC MÓVIL'}
                      </h1>
                      <p className="text-[10.5px] font-bold text-blue-100 mt-0.5">
                        Sistema de Gestión de Taller
                      </p>
                    </div>
                  </div>

                  {/* Badge PRO lateral */}
                  <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-emerald-300 border border-white/20">
                      ✓ PRO ACTIVADO
                    </span>
                    <span className="text-[9px] font-mono text-white/70 mt-0.5">V 1.15.17</span>
                  </div>
                </div>

                {/* BADGE DE LICENCIA INTEGRADO */}
                <div className="mt-3.5 flex items-center max-w-lg mx-auto">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-bold text-white shadow-sm max-w-full">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">Software Activado — <strong className="font-black text-white">FixManager Pro</strong></span>
                    <span className="text-white/90 font-mono text-[10px] pl-2 border-l border-white/30 shrink-0">v1.15.20</span>
                  </div>
                </div>
              </div>

              {/* 2. CUERPO DE AUTENTICACIÓN (100% En el mismo fondo continuo) */}
              <div className="w-full flex-1 flex flex-col justify-center px-6 sm:px-10 py-4 gap-4 my-auto">
                
                {/* SECCIÓN USUARIO */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-black uppercase tracking-widest text-blue-200">
                    USUARIO
                  </label>
                  
                  <div className="p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-lg backdrop-blur-md border bg-white/15 border-white/20 text-white">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shrink-0">
                        {selectedUser?.name ? selectedUser.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-sm font-black uppercase truncate text-white">
                          {selectedUser?.name || 'Administrador'}
                        </span>
                        <span className="text-[11px] font-bold text-amber-300 uppercase mt-0.5">
                          {selectedUser?.role === 'admin' ? 'Administrador' : 'Empleado'}
                        </span>
                      </div>
                    </div>

                    {users.length > 1 && (
                      <div className="relative shrink-0">
                        <select
                          value={selectedUser?.id ?? ''}
                          onChange={e => {
                            const u = users.find(u => u.id === e.target.value) ?? null;
                            setSelectedUser(u); setPin(''); setError(null);
                          }}
                          className="py-1.5 px-3 pr-7 rounded-xl text-[11px] font-black uppercase border tracking-wider appearance-none cursor-pointer shadow-sm bg-white/20 border-white/30 text-white"
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-white/70">▾</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECCIÓN CONTRASEÑA PIN */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-black uppercase tracking-widest text-blue-200">
                    CONTRASEÑA
                  </label>
                  
                  <div className={`p-3.5 rounded-2xl flex items-center justify-center gap-5 transition-all shadow-inner backdrop-blur-md border-2 ${
                    shake ? 'animate-bounce' : ''
                  } ${
                    error 
                      ? 'border-rose-400 bg-rose-950/50'
                      : 'bg-white/15 border-white/20'
                  }`}>
                    {[0, 1, 2, 3].map(i => {
                      const isFilled = pin.length > i;
                      return (
                        <div
                          key={i}
                          className={`w-4.5 h-4.5 rounded-full border-2 transition-all duration-150 ${
                            isFilled
                              ? 'bg-white border-white scale-110 shadow-md shadow-white/50'
                              : 'border-white/40 bg-white/10'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {error && (
                    <div className="text-xs font-black text-rose-300 animate-pulse text-center mt-0.5">
                      ⚠️ {error}
                    </div>
                  )}
                </div>

                {/* BOTÓN FACE ID BLANCO DE ALTO CONTRASTE Y GRAN VISIBILIDAD */}
                <button
                  type="button"
                  onClick={handleTriggerBiometric}
                  className="w-full py-3.5 px-4 rounded-2xl font-black text-blue-700 bg-white hover:bg-slate-100 border border-white flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-xl cursor-pointer"
                  title="Autenticación Biométrica Nativa"
                >
                  <div className="w-6.5 h-6.5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black shadow-inner shrink-0">
                    {biometryType === BiometryType.FACE_ID ? '👤' : '🫆'}
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-blue-700">
                    Desbloquear con {biometryType === BiometryType.FACE_ID ? 'Face ID' : 'Huella'}
                  </span>
                </button>

                {/* TECLADO NUMÉRICO DE CRISTAL UNIFICADO (BOTONES TRASLÚCIDOS BLANCOS) */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full">
                  {['1','2','3','4','5','6','7','8','9'].map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleNumpad(k)}
                      className="h-14 rounded-2xl text-2xl font-black flex items-center justify-center active:scale-95 transition-all shadow-sm cursor-pointer bg-white/15 hover:bg-white/25 border border-white/20 text-white backdrop-blur-md active:bg-white/30"
                    >
                      {k}
                    </button>
                  ))}
                  
                  {/* Espacio reservado para centrar el 0 */}
                  <div className="h-14 pointer-events-none" />

                  {/* Número 0 */}
                  <button
                    type="button"
                    onClick={() => handleNumpad('0')}
                    className="h-14 rounded-2xl text-2xl font-black flex items-center justify-center active:scale-95 transition-all shadow-sm cursor-pointer bg-white/15 hover:bg-white/25 border border-white/20 text-white backdrop-blur-md active:bg-white/30"
                  >
                    0
                  </button>

                  {/* Botón Borrar ⌫ */}
                  <button
                    type="button"
                    onClick={() => handleNumpad('⌫')}
                    className="h-14 rounded-2xl text-xl font-black flex items-center justify-center active:scale-95 transition-all shadow-sm cursor-pointer bg-white/25 hover:bg-white/35 border border-white/30 text-white backdrop-blur-md"
                    title="Borrar dígito"
                  >
                    ⌫
                  </button>
                </div>

                {/* FOOTER LINK CON MARGEN SEGURO */}
                <div className="flex justify-center pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shrink-0">
                  <button
                    type="button"
                    onClick={() => alert('Contacta al administrador del taller para restablecer tu PIN.')}
                    className="text-[11.5px] font-bold text-blue-100 hover:text-white underline underline-offset-4 cursor-pointer py-1 active:scale-95 transition-all"
                  >
                    🔑 ¿Olvidaste tu contraseña? Restablecer PIN
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:10,padding:'16px 24px',position:'relative',zIndex:1 }}>

              {/* Selector de usuario */}
              <div>
                <label style={{ display:'block',color:'#5a7a9a',fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5 }}>Usuario</label>
                {users.length === 0 ? (
                  <div style={{ padding:'10px 14px',background:isDarkRetro ? '#121316' : 'white',border:isDarkRetro ? '2px solid #383c48' : '2px solid #c8d8e8',borderRadius:8,color:isDarkRetro ? '#64748b' : '#94a3b8',fontSize:12 }}>
                    Sin usuarios configurados
                  </div>
                ) : users.length === 1 ? (
                  <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:isDarkRetro ? '#121316' : 'white',border:isDarkRetro ? '2px solid #383c48' : '2px solid #1a7abf',borderRadius:8 }}>
                    <div style={{ width:30,height:30,borderRadius:'50%',background:users[0].role==='admin'?'#b45309':'#0369a1',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:13 }}>
                      {users[0].name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color:isDarkRetro ? '#ffffff' : '#1e293b',fontWeight:800,fontSize:13 }}>{users[0].name}</div>
                      <div style={{ color:users[0].role==='admin'?'#d97706':'#0284c7',fontSize:10,fontWeight:700 }}>{users[0].role==='admin'?'Administrador':'Empleado'}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ position:'relative' }}>
                    <select
                      value={selectedUser?.id ?? ''}
                      onChange={e => {
                        const u = users.find(u => u.id === e.target.value) ?? null;
                        setSelectedUser(u); setPin(''); setError(null);
                      }}
                      style={{ width:'100%',padding:'10px 36px 10px 14px',background:isDarkRetro ? '#121316' : 'white',border:isDarkRetro ? '2px solid #383c48' : `2px solid ${selectedUser?'#1a7abf':'#c8d8e8'}`,borderRadius:8,fontSize:13,fontWeight:800,color:isDarkRetro ? '#ffffff' : (selectedUser?'#1e293b':'#94a3b8'),cursor:'pointer',appearance:'none',outline:'none',boxShadow:selectedUser?'0 2px 8px rgba(26,122,191,0.15)':'none',transition:'border-color 0.2s' }}
                    >
                      <option value="" disabled>— Selecciona usuario —</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'admin' ? 'Admin' : 'Empleado'})
                        </option>
                      ))}
                    </select>
                    <span style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#5a7a9a',fontSize:12 }}>▾</span>
                  </div>
                )}
              </div>

              {/* PIN y Teclado Numérico Desktop */}
              {!isOnline ? (
                <div style={{
                  padding: '16px',
                  background: isDarkRetro ? '#1e293b' : '#fef3c7',
                  border: isDarkRetro ? '2px solid #f59e0b' : '2px solid #f59e0b',
                  borderRadius: 8,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 6,
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
                }}>
                  <div style={{ fontSize: 24 }}>⚠️</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: isDarkRetro ? '#fbbf24' : '#92400e', textTransform: 'uppercase' }}>
                    Se requiere conexión a Internet
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isDarkRetro ? '#cbd5e1' : '#78350f', lineHeight: 1.4 }}>
                    Es necesario contar con Internet para el primer inicio de sesión del día para autenticar tu usuario. Una vez iniciada la sesión, podrás trabajar sin conexión.
                  </div>
                  <button
                    type="button"
                    disabled={isCheckingNet}
                    onClick={handleRetryConnection}
                    style={{
                      marginTop: 6,
                      padding: '10px 20px',
                      background: isCheckingNet ? '#0284c7' : '#1a7abf',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: isCheckingNet ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(26, 122, 191, 0.3)',
                      transition: 'all 0.2s',
                      opacity: isCheckingNet ? 0.85 : 1
                    }}
                  >
                    <RefreshCw style={{ width: 14, height: 14 }} className={isCheckingNet ? 'animate-spin' : ''} />
                    <span>{isCheckingNet ? 'Verificando red...' : 'Reintentar Conexión'}</span>
                  </button>

                  {netCheckFeedback && (
                    <div style={{
                      marginTop: 4,
                      fontSize: 11,
                      fontWeight: 800,
                      color: netCheckFeedback.includes('✓') ? '#16a34a' : '#dc2626',
                      transition: 'all 0.2s'
                    }}>
                      {netCheckFeedback}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* PIN */}
                  <div>
                    <label style={{ display:'block',color:'#5a7a9a',fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5 }}>Contraseña</label>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:16,padding:'14px',background:isDarkRetro ? '#121316' : 'white',border:isDarkRetro ? `2px solid ${error?'#ef4444':'#383c48'}` : `2px solid ${error?'#ef4444':'#c8d8e8'}`,borderRadius:4,animation:shake?'shake 0.4s ease':'none',transition:'border-color 0.2s' }}>
                      {[0,1,2,3].map(i => {
                        const activeColor = isDarkRetro ? '#60a5fa' : '#1a7abf';
                        const inactiveColor = isDarkRetro ? '#4a5568' : '#94a3b8';
                        return (
                          <div key={i} style={{ width:14,height:14,borderRadius:'50%',border:`2.5px solid ${pin.length>i?activeColor:inactiveColor}`,background:pin.length>i?activeColor:'transparent',transform:pin.length>i?'scale(1.25)':'scale(1)',boxShadow:pin.length>i?`0 0 8px ${activeColor}`:'none',transition:'all 0.15s' }} />
                        );
                      })}
                    </div>
                    {error && <div style={{ marginTop:4,color:'#dc2626',fontSize:10,fontWeight:700 }}>❌ {error}</div>}
                  </div>

                  {/* Numpad */}
                  <div style={{ position:'relative' }}>
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5 }}>
                      {['1','2','3','4','5','6','7','8','9','⌫','0','→'].map(key => (
                        <button key={key} type="button" onClick={() => handleNumpad(key)}
                          style={{ padding:'9px 0',textAlign:'center',fontSize:key==='→'?10:15,fontWeight:900,cursor:'pointer',borderRadius:4,transition:'all 0.1s',letterSpacing:key==='→'?'0.05em':'0', ...getBtnStyle(key) }}>
                          {key==='→'?'INICIAR\nSESIÓN':key}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}{/* cierre numpad */}

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    opacity: 0.7,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                >
                  ⚙️ Restablecer esta PC / Configurar de nuevo
                </button>
              </div>
            </div>
          )
        )}
      </div>{/* cierre cuerpo */}

      {/* ── STRIP DE MÓDULOS ────────────────────────────────────────────── */}
      {!isMobile() && (
        <div style={{ background:isDarkRetro ? '#121316' : '#dde6f0',borderTop:isDarkRetro ? '1px solid #383c48' : '1px solid #c4d0de',borderBottom:isDarkRetro ? '1px solid #383c48' : '1px solid #c4d0de',padding:'7px 0',display:'flex',justifyContent:'center',gap:30,flexShrink:0, position:'relative' }}>
          {moduleIcons.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:2,opacity:0.5 }}>
              <Icon style={{ width:18,height:18,color:isDarkRetro ? '#60a5fa' : '#34618e' }} />
              <span style={{ fontSize:7,color:isDarkRetro ? '#60a5fa' : '#34618e',fontWeight:700,textTransform:'uppercase' }}>{label}</span>
            </div>
          ))}
          {!devLocked && (
            <button
              type="button"
              onClick={() => { setShowDevExport(true); setDevUnlocked(false); setDevPw(''); setDevPwError(false); }}
              title="Panel de desarrollador"
              style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', cursor:'pointer', opacity:0.25, padding:4, lineHeight:1 }}
            >🔧</button>
          )}
        </div>
      )}

      {/* ── MODAL DEV EXPORT ─────────────────────────────────────────────── */}
      {showDevExport && (
        <div style={{ position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(8px)' }}
          onClick={() => setShowDevExport(false)}>
          <div className={isRetro ? 'border-2' : ''}
            style={{
              background: isRetro ? '#dfdfdf' : '#0f172a',
              border: isRetro ? '2px solid' : '1px solid #334155',
              borderTopColor: isRetro ? '#ffffff' : '#334155',
              borderLeftColor: isRetro ? '#ffffff' : '#334155',
              borderRightColor: isRetro ? '#808080' : '#334155',
              borderBottomColor: isRetro ? '#808080' : '#334155',
              borderRadius: isRetro ? 0 : 14,
              width: '100%',
              maxWidth: 400,
              overflow: 'hidden',
              boxShadow: isRetro ? '2px 2px 10px rgba(0,0,0,0.3)' : '0 24px 60px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={isRetro ? 'retro-blue-header' : ''}
              style={{
                background: isRetro ? 'linear-gradient(90deg, #000080, #1084d0)' : '#1e293b',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: isRetro ? '2px solid #808080' : '1px solid #334155'
              }}>
              <div>
                <div className={isRetro ? 'retro-white-text' : ''}
                  style={{ color:'white',fontWeight:900,fontSize:13,textTransform:'uppercase',letterSpacing:'0.05em' }}>
                  🔧 Panel de Desarrollador
                </div>
                <div className={isRetro ? 'retro-white-text' : ''}
                  style={{ color: isRetro ? '#cbd5e1' : 'rgba(255,255,255,0.7)',fontSize:10,marginTop:2,opacity: isRetro ? 0.8 : 1 }}>
                  Exportación de datos de emergencia
                </div>
              </div>
              <button type="button" onClick={() => setShowDevExport(false)}
                className={isRetro ? 'retro-white-text' : ''}
                style={{
                  background: isRetro ? 'none' : 'rgba(255,255,255,0.1)',
                  border: isRetro ? '1px solid #ffffff' : 'none',
                  borderRadius: isRetro ? 2 : '50%',
                  width: 24,
                  height: 24,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>✕</button>
            </div>

            <div style={{ padding:18, maxHeight: '440px', overflowY: 'auto' }}>
              {!devUnlocked ? (
                <div style={{ textAlign:'center',paddingTop:8,paddingBottom:8 }}>
                  <div style={{ fontSize:36,marginBottom:12 }}>🔐</div>
                  <div style={{ color: isRetro ? '#000000' : 'white',fontWeight:800,fontSize:13,marginBottom:6 }}>Acceso restringido</div>
                  <div style={{ color: isRetro ? '#334155' : '#cbd5e1',fontSize:11,marginBottom:14 }}>Introduce la contraseña de desarrollador para continuar.</div>
                  <input
                    type="password"
                    value={devPw}
                    onChange={e => { setDevPw(e.target.value); setDevPwError(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleDevAuth()}
                    placeholder="Contraseña…"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: isRetro ? '#ffffff' : (devPwError ? 'rgba(239,68,68,0.1)' : '#1e293b'),
                      border: isRetro ? '2px solid #808080' : `1px solid ${devPwError ? '#ef4444' : '#334155'}`,
                      borderRadius: isRetro ? 0 : 8,
                      color: isRetro ? '#000000' : 'white',
                      fontSize: 13,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {devPwError && <div style={{ color:'#f87171',fontSize:10,fontWeight:700,marginTop:6 }}>Contraseña incorrecta</div>}
                  <button type="button" onClick={handleDevAuth}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: '8px 0',
                      background: isRetro ? '#dfdfdf' : '#dc2626',
                      border: isRetro ? '2px solid' : 'none',
                      borderTopColor: isRetro ? '#ffffff' : 'none',
                      borderLeftColor: isRetro ? '#ffffff' : 'none',
                      borderRightColor: isRetro ? '#808080' : 'none',
                      borderBottomColor: isRetro ? '#808080' : 'none',
                      borderRadius: isRetro ? 0 : 8,
                      color: isRetro ? '#000000' : 'white',
                      fontWeight: 900,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      cursor: 'pointer'
                    }}>
                    Acceder →
                  </button>
                </div>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                  <div style={{ color: isRetro ? '#000000' : '#cbd5e1',fontSize:11,marginBottom:4 }}>Descarga los datos directamente desde localStorage. Sin necesidad de iniciar sesión.</div>
                  {exportFeedback && (
                    <div style={{
                      background: isRetro ? '#ecfdf5' : 'rgba(16,185,129,0.15)',
                      border: isRetro ? '2px solid #34d399' : '1px solid rgba(16,185,129,0.4)',
                      borderRadius: isRetro ? 0 : 8,
                      padding: '8px 12px',
                      color: '#065f46',
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      {exportFeedback}
                    </div>
                  )}
                  {[
                    { key:'fixmanager_orders', label:'Órdenes de reparación', emoji:'🔧' },
                    { key:'fixmanager_inventory', label:'Inventario / Productos', emoji:'📦' },
                    { key:'fixmanager_services', label:'Catálogo de servicios', emoji:'⚙️' },
                    { key:'fixmanager_sales', label:'Ventas POS', emoji:'🛒' },
                    { key:'fixmanager_clients', label:'Clientes', emoji:'👤' },
                  ].map(({ key, label, emoji }) => (
                    <button key={key} type="button"
                      onClick={() => exportData(key, label.toLowerCase().replace(/ \//g,'').replace(/ /g,'_'))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        background: isRetro ? '#dfdfdf' : '#1e293b',
                        border: isRetro ? '2px solid' : '1px solid #334155',
                        borderTopColor: isRetro ? '#ffffff' : '#334155',
                        borderLeftColor: isRetro ? '#ffffff' : '#334155',
                        borderRightColor: isRetro ? '#808080' : '#334155',
                        borderBottomColor: isRetro ? '#808080' : '#334155',
                        borderRadius: isRetro ? 0 : 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                      <span style={{ fontSize:18,flexShrink:0 }}>{emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: isRetro ? '#000000' : 'white',fontWeight:700,fontSize:12 }}>{label}</div>
                        <div style={{ color: isRetro ? '#555555' : '#94a3b8',fontSize:10,marginTop:2 }}>{key}</div>
                      </div>
                      <span style={{ marginLeft:'auto',color: isRetro ? '#000080' : '#38bdf8',fontSize:11,fontWeight:700 }}>↓ JSON</span>
                    </button>
                  ))}
                  <button type="button" onClick={exportAll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      background: isRetro ? '#000080' : '#0284c7',
                      border: isRetro ? '2px solid' : '1px solid #38bdf8',
                      borderTopColor: isRetro ? '#6060ff' : '#38bdf8',
                      borderLeftColor: isRetro ? '#6060ff' : '#38bdf8',
                      borderRightColor: isRetro ? '#000040' : '#38bdf8',
                      borderBottomColor: isRetro ? '#000040' : '#38bdf8',
                      borderRadius: isRetro ? 0 : 8,
                      cursor: 'pointer',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                    <span className="retro-white-text" style={{ color: 'white' }}>💾 Exportar TODO (backup completo)</span>
                  </button>
                  <button type="button"
                    onClick={async () => {
                      if (window.confirm('⚠️ ¿Estás seguro de que deseas borrar TODOS los datos locales y reiniciar de fábrica? Esta acción no se puede deshacer.')) {
                        localStorage.clear();
                        const api = (window as any).electronAPI;
                        if (api?.activateLicense) {
                          await api.activateLicense({ logout: true }).catch(() => {});
                        }
                        await supabase.auth.signOut().catch(() => {});
                        window.location.reload();
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      background: isRetro ? '#dc2626' : '#b91c1c',
                      border: isRetro ? '2px solid' : '1px solid #ef4444',
                      borderTopColor: isRetro ? '#f87171' : '#ef4444',
                      borderLeftColor: isRetro ? '#f87171' : '#ef4444',
                      borderRightColor: isRetro ? '#7f1d1d' : '#ef4444',
                      borderBottomColor: isRetro ? '#7f1d1d' : '#ef4444',
                      borderRadius: isRetro ? 0 : 8,
                      cursor: 'pointer',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      marginTop: 8,
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                    <span className="retro-white-text" style={{ color: 'white' }}>⚙️ Restaurar de Fábrica (Limpiar todo)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-6px)}
          40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
      `}</style>
      </div>{/* cierre tarjeta */}
    </div>
  );
}
