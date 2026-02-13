/**
 * Shared authentication utilities for Edge Functions
 */

import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  user: User;
  supabaseUser: SupabaseClient;
  supabaseService: SupabaseClient;
}

export interface AuthError {
  error: string;
  status: number;
}

/**
 * Extracts and validates admin user from JWT
 * Returns user info and both user/service Supabase clients
 */
export async function getAuthenticatedAdmin(
  authHeader: string | null
): Promise<AuthResult | AuthError> {
  if (!authHeader) {
    return { error: "Token de autenticação não fornecido", status: 401 };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Create client with user's JWT to validate session
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return { error: "Sessão inválida", status: 401 };
  }

  // Verify admin role
  if (user.app_metadata?.role !== "admin") {
    return { error: "Acesso negado. Apenas administradores.", status: 403 };
  }

  // Service role client for DB operations
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

  return { user, supabaseUser, supabaseService };
}

export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return "error" in result;
}
