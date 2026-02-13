/**
 * Edge Function: calculate-shipping
 *
 * Cotação de frete via Melhor Envio API.
 * Recebe CEP destino + produtos (com dimensões).
 * Retorna opções de frete disponíveis com preço e prazo.
 *
 * verify_jwt = false (público — qualquer cliente pode cotar frete)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface ShippingProduct {
  id: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  insurance_value: number;
  quantity: number;
}

interface ShippingRequest {
  postal_code: string;
  products: ShippingProduct[];
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const melhorEnvioToken = Deno.env.get("MELHOR_ENVIO_TOKEN");
    const storePostalCode = Deno.env.get("STORE_POSTAL_CODE") || "02062000";

    if (!melhorEnvioToken) {
      return jsonResponse({ error: "MELHOR_ENVIO_TOKEN não configurado" }, 500);
    }

    // ── Parse request ─────────────────────────────────────────────────────
    const body: ShippingRequest = await req.json();

    if (!body.postal_code || !/^\d{8}$/.test(body.postal_code)) {
      return jsonResponse({ error: "CEP inválido. Deve ter 8 dígitos." }, 400);
    }

    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return jsonResponse({ error: "Lista de produtos vazia." }, 400);
    }

    // ── Build Melhor Envio request ────────────────────────────────────────
    // Use sandbox URL for now, switch to production later
    const melhorEnvioUrl =
      "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate";

    const meProducts = body.products.map((p) => ({
      id: p.id,
      width: p.width,
      height: p.height,
      length: p.length,
      weight: p.weight,
      insurance_value: p.insurance_value,
      quantity: p.quantity,
    }));

    const meBody = {
      from: { postal_code: storePostalCode },
      to: { postal_code: body.postal_code },
      products: meProducts,
      options: { receipt: false, own_hand: false },
      services: "1,2,3,4", // PAC, SEDEX, Mini Envios, Jadlog
    };

    const meRes = await fetch(melhorEnvioUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${melhorEnvioToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "PalestraBaby contato@palestrababy.com.br",
      },
      body: JSON.stringify(meBody),
    });

    if (!meRes.ok) {
      const errorText = await meRes.text();
      console.error("Melhor Envio API error:", meRes.status, errorText);
      return jsonResponse(
        { error: "Erro ao consultar serviço de frete. Tente novamente." },
        502
      );
    }

    const meData = await meRes.json();

    // ── Filter valid options (error === null) ─────────────────────────────
    interface MeServiceResult {
      id: number;
      name: string;
      price: string;
      delivery_time: number;
      delivery_range: { min: number; max: number };
      company: { id: number; name: string; picture: string };
      error: string | null;
    }

    const validOptions = (meData as MeServiceResult[])
      .filter((service) => service.error === null && service.price)
      .map((service) => ({
        service_id: service.id,
        service_name: service.name,
        company_name: service.company.name,
        company_picture: service.company.picture,
        price: parseFloat(service.price),
        delivery_days: service.delivery_time,
        delivery_range: service.delivery_range,
      }))
      .sort((a, b) => a.price - b.price); // cheapest first

    if (validOptions.length === 0) {
      return jsonResponse({
        error: "Nenhuma opção de frete disponível para o CEP informado.",
        shipping_options: [],
      }, 200);
    }

    // ── Return shipping options ───────────────────────────────────────────
    return jsonResponse({
      shipping_options: validOptions,
      origin_postal_code: storePostalCode,
      destination_postal_code: body.postal_code,
    });
  } catch (err) {
    console.error("calculate-shipping error:", err);
    return jsonResponse(
      { error: "Erro interno ao calcular frete" },
      500
    );
  }
});
