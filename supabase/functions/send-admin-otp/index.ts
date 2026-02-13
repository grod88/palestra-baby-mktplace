/**
 * Edge Function: send-admin-otp
 *
 * Fluxo:
 * 1. Decodifica JWT → extrai user_id
 * 2. Verifica app_metadata.role === 'admin'
 * 3. Invalida códigos anteriores não usados
 * 4. Gera código 6 dígitos + hash bcrypt
 * 5. Salva em admin_otp_codes (expira em 5 min)
 * 6. Envia email via Resend API
 * 7. Retorna { success: true, expires_in: 300 }
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return jsonResponse({ error: "RESEND_API_KEY não configurada" }, 500);
    }

    // Create client with user's JWT to validate session
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Sessão inválida" }, 401);
    }

    // ── 2. Verify admin role ──────────────────────────────────────────────
    if (user.app_metadata?.role !== "admin") {
      return jsonResponse({ error: "Acesso negado. Apenas administradores." }, 403);
    }

    // ── Service role client for DB operations ─────────────────────────────
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 3. Invalidate previous unused codes ───────────────────────────────
    await supabase
      .from("admin_otp_codes")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("used", false);

    // ── 4. Generate 6-digit OTP + bcrypt hash ─────────────────────────────
    const plainCode = String(Math.floor(100000 + Math.random() * 900000));
    const hashedCode = await bcrypt.hash(plainCode);

    // ── 5. Save to admin_otp_codes (expires in 5 minutes) ─────────────────
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("admin_otp_codes")
      .insert({
        user_id: user.id,
        code: hashedCode,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error inserting OTP code:", insertError);
      return jsonResponse({ error: "Erro ao gerar código de verificação" }, 500);
    }

    // ── 6. Send email via Resend ──────────────────────────────────────────
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f3ec; padding: 40px 20px;">
        <div style="max-width: 460px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1F5C46; font-size: 24px; margin: 0;">🌿 Palestra Baby</h1>
            <p style="color: #888; font-size: 14px; margin-top: 4px;">Painel Administrativo</p>
          </div>

          <p style="color: #333; font-size: 16px; margin-bottom: 8px;">
            Olá! Seu código de verificação é:
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background: #f0fdf4; border: 2px solid #1F5C46; border-radius: 12px; padding: 16px 32px; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #1F5C46;">
              ${plainCode}
            </div>
          </div>

          <p style="color: #666; font-size: 14px; text-align: center;">
            Este código expira em <strong>5 minutos</strong>.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            Se você não solicitou este código, ignore este email.
          </p>
        </div>
      </body>
      </html>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Palestra Baby <onboarding@resend.dev>",
        to: [user.email],
        subject: "Código de verificação — Palestra Baby Admin",
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const resendError = await resendRes.text();
      console.error("Resend API error:", resendError);
      return jsonResponse({ error: "Erro ao enviar email de verificação" }, 500);
    }

    // ── 7. Return success ─────────────────────────────────────────────────
    return jsonResponse({
      success: true,
      expires_in: 300,
      message: "Código enviado para " + (user.email ?? "seu email"),
    });
  } catch (err) {
    console.error("send-admin-otp error:", err);
    return jsonResponse(
      { error: "Erro interno ao processar OTP" },
      500
    );
  }
});
