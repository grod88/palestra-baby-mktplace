/**
 * Auth hook — gerencia sessão Supabase + verificação de role admin.
 * Supabase Auth MFA (TOTP) é usado como 2FA obrigatório para admins.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session, AuthError, Factor } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  /** MFA verificado na sessão atual */
  mfaVerified: boolean;
  /** Usuário tem TOTP enrollado */
  mfaEnrolled: boolean;
}

function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  return user.app_metadata?.role === "admin";
}

function isMfaVerified(session: Session | null): boolean {
  if (!session) return false;
  const aal = session.user?.app_metadata?.aal;
  // Supabase retorna aal2 quando MFA foi verificado
  return aal === "aal2" || (session as unknown as Record<string, unknown>).aal === "aal2";
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    isLoading: true,
    mfaVerified: false,
    mfaEnrolled: false,
  });

  // Check MFA enrollment
  const checkMfaEnrollment = useCallback(async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const totpFactors = data?.totp ?? [];
      return totpFactors.some((f: Factor) => f.status === "verified");
    } catch {
      return false;
    }
  }, []);

  // Check AAL level
  const checkMfaVerified = useCallback(async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      return data?.currentLevel === "aal2";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      const mfaEnrolled = user ? await checkMfaEnrollment() : false;
      const mfaVerified = user ? await checkMfaVerified() : false;

      setState({
        user,
        session,
        isAdmin: isAdminUser(user),
        isLoading: false,
        mfaVerified,
        mfaEnrolled,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      const mfaEnrolled = user ? await checkMfaEnrollment() : false;
      const mfaVerified = user ? await checkMfaVerified() : false;

      setState({
        user,
        session,
        isAdmin: isAdminUser(user),
        isLoading: false,
        mfaVerified,
        mfaEnrolled,
      });
    });

    return () => subscription.unsubscribe();
  }, [checkMfaEnrollment, checkMfaVerified]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is admin
      if (!isAdminUser(data.user)) {
        await supabase.auth.signOut();
        throw new Error("Acesso negado. Apenas administradores podem acessar.");
      }

      return data;
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ─── MFA (TOTP) ─────────────────────────────────────────────────────────

  /** Enrolla TOTP — retorna QR code URI */
  const enrollTotp = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Palestra Baby Admin",
    });

    if (error) throw error;
    return data;
  }, []);

  /** Verifica código TOTP (tanto para enroll quanto para login MFA) */
  const verifyTotp = useCallback(
    async (factorId: string, code: string) => {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (error) throw error;

      // Refresh state after MFA verification
      const mfaVerified = await checkMfaVerified();
      setState((prev) => ({ ...prev, mfaVerified, mfaEnrolled: true }));

      return data;
    },
    [checkMfaVerified]
  );

  /** Lista fatores TOTP do usuário */
  const listFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data?.totp ?? [];
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    enrollTotp,
    verifyTotp,
    listFactors,
  };
}
