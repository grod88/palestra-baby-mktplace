/**
 * useAdminAuth — gerencia autenticação admin com MFA por email (OTP).
 *
 * Fluxo:
 * 1. Admin faz login com email + senha (Supabase Auth)
 * 2. Após login, Edge Function envia OTP 6 dígitos por email
 * 3. Admin digita código na tela /admin/verify
 * 4. Edge Function valida → marca sessão como MFA-verificada
 * 5. MFA expira em 24h — admin precisa verificar novamente
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

/** Chave localStorage para controlar expiração do MFA */
const MFA_STORAGE_KEY = "palestra_admin_mfa";
/** MFA expira em 24h */
const MFA_EXPIRY_MS = 24 * 60 * 60 * 1000;

export interface AdminAuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isMfaVerified: boolean;
  mfaVerifiedAt: number | null;
  isLoading: boolean;
}

interface MfaStorageData {
  userId: string;
  verifiedAt: number;
}

function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  return user.app_metadata?.role === "admin";
}

function getMfaFromStorage(userId: string): MfaStorageData | null {
  try {
    const raw = localStorage.getItem(MFA_STORAGE_KEY);
    if (!raw) return null;
    const data: MfaStorageData = JSON.parse(raw);
    // Must match current user and not be expired
    if (data.userId !== userId) return null;
    if (Date.now() - data.verifiedAt > MFA_EXPIRY_MS) {
      localStorage.removeItem(MFA_STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setMfaInStorage(userId: string): void {
  const data: MfaStorageData = {
    userId,
    verifiedAt: Date.now(),
  };
  localStorage.setItem(MFA_STORAGE_KEY, JSON.stringify(data));
}

function clearMfaStorage(): void {
  localStorage.removeItem(MFA_STORAGE_KEY);
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    session: null,
    isAdmin: false,
    isAuthenticated: false,
    isMfaVerified: false,
    mfaVerifiedAt: null,
    isLoading: true,
  });

  const initialized = useRef(false);

  // Compute state from session
  const computeState = useCallback(
    (session: Session | null): AdminAuthState => {
      const user = session?.user ?? null;
      const isAdmin = isAdminUser(user);
      const isAuthenticated = !!user && isAdmin;

      let isMfaVerified = false;
      let mfaVerifiedAt: number | null = null;

      if (user && isAdmin) {
        const mfaData = getMfaFromStorage(user.id);
        if (mfaData) {
          isMfaVerified = true;
          mfaVerifiedAt = mfaData.verifiedAt;
        }
      }

      return {
        user,
        session,
        isAdmin,
        isAuthenticated,
        isMfaVerified,
        mfaVerifiedAt,
        isLoading: false,
      };
    },
    []
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(computeState(session));
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(computeState(session));
    });

    return () => subscription.unsubscribe();
  }, [computeState]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  /** Login with email + password. Throws if not admin. */
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (!isAdminUser(data.user)) {
      await supabase.auth.signOut();
      throw new Error("Acesso negado. Apenas administradores podem acessar.");
    }

    return data;
  }, []);

  /** Send OTP email via Edge Function */
  const sendOtp = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão não encontrada");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-admin-otp`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      }
    );

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Erro ao enviar código");
    return result;
  }, []);

  /** Verify OTP code via Edge Function */
  const verifyOtp = useCallback(
    async (code: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-admin-otp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ code }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        const err = new Error(result.error || "Código inválido");
        (err as Error & { attemptsRemaining?: number }).attemptsRemaining =
          result.attempts_remaining;
        throw err;
      }

      // Mark MFA as verified in localStorage
      if (state.user) {
        setMfaInStorage(state.user.id);
        setState((prev) => ({
          ...prev,
          isMfaVerified: true,
          mfaVerifiedAt: Date.now(),
        }));
      }

      return result;
    },
    [state.user]
  );

  /** Sign out and clear MFA */
  const signOut = useCallback(async () => {
    clearMfaStorage();
    await supabase.auth.signOut();
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    sendOtp,
    verifyOtp,
  };
}
