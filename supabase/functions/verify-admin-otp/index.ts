/**
 * Edge Function: verify-admin-otp
 *
 * Fluxo:
 * 1. Decodifica JWT → extrai user_id
 * 2. Busca último código não usado e não expirado
 * 3. Valida tentativas (máx 3)
 * 4. Compara bcrypt do código
 * 5. Se correto → marca used = true, retorna { verified: true }
 * 6. Se incorreto → incrementa attempts, retorna erro
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Extract user from JWT ──────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Token de autenticação não fornecido" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Sessão inválida" }, 401);
    }

    // Verify admin role
    if (user.app_metadata?.role !== "admin") {
      return jsonResponse({ error: "Acesso negado" }, 403);
    }

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await req.json();
    const code = body?.code;

    if (!code || typeof code !== "string" || code.length !== 6) {
      return jsonResponse({ error: "Código inválido. Deve ter 6 dígitos." }, 400);
    }

    // ── Service role client ───────────────────────────────────────────────
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 2. Fetch latest unused, non-expired code ──────────────────────────
    const { data: otpRecord, error: fetchError } = await supabase
      .from("admin_otp_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      return jsonResponse({ error: "Erro ao verificar código" }, 500);
    }

    if (!otpRecord) {
      return jsonResponse({ error: "Código expirado ou inexistente. Solicite um novo código." }, 401);
    }

    // ── 3. Check attempts ─────────────────────────────────────────────────
    if (otpRecord.attempts >= 3) {
      // Mark as used (burned)
      await supabase
        .from("admin_otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);

      return jsonResponse({
        error: "Máximo de tentativas atingido. Solicite um novo código.",
      }, 429);
    }

    // ── 4. Increment attempts first ───────────────────────────────────────
    await supabase
      .from("admin_otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    // ── 5. Compare bcrypt ─────────────────────────────────────────────────
    const isValid = await bcrypt.compare(code, otpRecord.code);

    if (!isValid) {
      const remaining = 2 - otpRecord.attempts; // already incremented
      return jsonResponse({
        error: "Código incorreto",
        attempts_remaining: Math.max(remaining, 0),
      }, 401);
    }

    // ── 6. Mark as used ───────────────────────────────────────────────────
    await supabase
      .from("admin_otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // ── 7. Return success ─────────────────────────────────────────────────
    return jsonResponse({
      verified: true,
      message: "Código verificado com sucesso",
    });
  } catch (err) {
    console.error("verify-admin-otp error:", err);
    return jsonResponse(
      { error: "Erro interno ao verificar código" },
      500
    );
  }
});
