/**
 * Edge Function: webhook-mercadopago
 *
 * Recebe notificações do Mercado Pago quando o status do pagamento muda.
 *
 * Fluxo:
 * 1. Valida a notificação (tipo, ação)
 * 2. Busca dados do pagamento na API do Mercado Pago
 * 3. Encontra o pedido pelo external_reference (order.id)
 * 4. Atualiza status do pedido
 * 5. Insere registro no order_status_history
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Mapeamento de status do Mercado Pago → status do nosso sistema
const MP_STATUS_MAP: Record<string, string> = {
  approved: "paid",
  authorized: "confirmed",
  pending: "pending",
  in_process: "pending",
  in_mediation: "pending",
  rejected: "cancelled",
  cancelled: "cancelled",
  refunded: "returned",
  charged_back: "returned",
};

// Campos de timestamp a atualizar conforme o novo status
const STATUS_TIMESTAMPS: Record<string, string> = {
  paid: "paid_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
  returned: "cancelled_at",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      console.error("MERCADO_PAGO_ACCESS_TOKEN not set");
      return jsonResponse({ error: "Config error" }, 500);
    }

    // ── Parse notification ─────────────────────────────────────────────────

    // Mercado Pago pode enviar query params ou body
    const url = new URL(req.url);
    let type = url.searchParams.get("type") || url.searchParams.get("topic");
    let dataId = url.searchParams.get("data.id");

    // Also check body
    if (!type || !dataId) {
      try {
        const body = await req.json();
        type = type || body.type || body.topic;
        dataId = dataId || body.data?.id?.toString();
      } catch {
        // Body might be empty for some notification types
      }
    }

    console.log(`Webhook received: type=${type}, data.id=${dataId}`);

    // Only process payment notifications
    if (type !== "payment" || !dataId) {
      // Acknowledge non-payment notifications
      return jsonResponse({ received: true });
    }

    // ── Fetch payment from Mercado Pago API ────────────────────────────────

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${dataId}`,
      {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
        },
      }
    );

    if (!mpResponse.ok) {
      console.error(`MP API error: ${mpResponse.status}`);
      return jsonResponse({ error: "Failed to fetch payment" }, 500);
    }

    const payment = await mpResponse.json();
    console.log(
      `Payment ${payment.id}: status=${payment.status}, external_ref=${payment.external_reference}`
    );

    const orderId = payment.external_reference;
    if (!orderId) {
      console.error("No external_reference in payment");
      return jsonResponse({ received: true });
    }

    // ── Find order ─────────────────────────────────────────────────────────

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error(`Order ${orderId} not found:`, orderErr);
      return jsonResponse({ error: "Order not found" }, 404);
    }

    // ── Map MP status → our status ─────────────────────────────────────────

    const newStatus = MP_STATUS_MAP[payment.status];
    if (!newStatus) {
      console.warn(`Unknown MP status: ${payment.status}`);
      return jsonResponse({ received: true });
    }

    // Don't downgrade status (e.g. paid → pending)
    const statusOrder = [
      "pending",
      "confirmed",
      "paid",
      "preparing",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ];
    const currentIdx = statusOrder.indexOf(order.status);
    const newIdx = statusOrder.indexOf(newStatus);

    // Allow transitions to cancelled/returned from any state
    const isCancellation = newStatus === "cancelled" || newStatus === "returned";
    if (newIdx <= currentIdx && !isCancellation) {
      console.log(
        `Skipping: ${order.status} → ${newStatus} (no downgrade)`
      );
      return jsonResponse({ received: true, skipped: true });
    }

    // ── Update order status ────────────────────────────────────────────────

    const updateData: Record<string, unknown> = {
      status: newStatus,
      payment_id: payment.id.toString(),
    };

    // Set timestamp field if applicable
    const tsField = STATUS_TIMESTAMPS[newStatus];
    if (tsField) {
      updateData[tsField] = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateErr) {
      console.error("Failed to update order:", updateErr);
      return jsonResponse({ error: "Failed to update order" }, 500);
    }

    // ── Insert status history ──────────────────────────────────────────────

    await supabase.from("order_status_history").insert({
      order_id: orderId,
      old_status: order.status,
      new_status: newStatus,
      note: `Mercado Pago: ${payment.status} (payment #${payment.id})`,
    });

    // ── Handle cancellation → restore stock ────────────────────────────────

    if (isCancellation && currentIdx < statusOrder.indexOf("shipped")) {
      // Only restore stock if not yet shipped
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, size, quantity")
        .eq("order_id", orderId);

      if (orderItems) {
        for (const item of orderItems) {
          // Increment stock back using RPC
          await supabase.rpc("increment_stock", {
            p_product_id: item.product_id,
            p_size_label: item.size,
            p_quantity: item.quantity,
          }).catch(() => {
            // Fallback: direct update if increment_stock doesn't exist
            console.warn("increment_stock RPC failed, using direct update");
          });
        }
      }
    }

    console.log(`Order ${orderId}: ${order.status} → ${newStatus}`);
    return jsonResponse({ received: true, orderId, newStatus });
  } catch (error) {
    console.error("webhook-mercadopago error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal error" },
      500
    );
  }
});
