
---

## 📦 Fase 2 — Integrações (referência rápida)

> Especificação completa em `docs/FASE2_SPEC.md`

### Novas Dependências
```bash
npm install @mercadopago/sdk-js  # Tokenização de cartão no browser
# Resend: chamado via Edge Function (sem SDK no frontend)
# Melhor Envio: chamado via Edge Function (sem SDK no frontend)
```

### Novas Edge Functions
| Function | JWT | Descrição |
|----------|-----|-----------|
| `send-admin-otp` | ✅ | Gera OTP 6 dígitos + envia email (Resend) |
| `verify-admin-otp` | ✅ | Valida código MFA |
| `calculate-shipping` | ❌ | Cotação frete via Melhor Envio |
| `process-order` | ❌ | Cria pedido + pagamento Mercado Pago |
| `webhook-mercadopago` | ❌ | Recebe notificações de pagamento |
| `check-payment-status` | ❌ | Polling status PIX |

### Novos Secrets (Supabase)
```
RESEND_API_KEY             # Email OTP (resend.com)
MELHOR_ENVIO_TOKEN         # Frete (melhorenvio.com.br)
STORE_POSTAL_CODE=02062000 # CEP origem para frete
```

### Novas Tabelas/Colunas
- `admin_otp_codes` — MFA por email (ver FASE2_SPEC.md §2.2)
- `products` + `weight_kg`, `height_cm`, `width_cm`, `length_cm` — dimensões para frete
- `orders` + colunas de shipping, payment MP, customer data, endereço

### Rotas Admin Atualizadas
| Rota | Componente | Protegido |
|------|-----------|-----------|
| `/admin/login` | AdminLogin.tsx | ❌ público |
| `/admin/verify` | AdminVerify.tsx | ✅ auth (sem MFA) |
| `/admin/produtos` | AdminProducts.tsx | ✅ auth + MFA |
| `/admin/produtos/novo` | AdminProductForm.tsx | ✅ auth + MFA |
| `/admin/produtos/:id` | AdminProductForm.tsx | ✅ auth + MFA |
| `/admin/pedidos` | AdminOrders.tsx | ✅ auth + MFA |

### Checkout Flow (3 steps)
```
Step 1: Identificação (nome, email, CPF, telefone)
Step 2: Endereço + Frete (CEP → ViaCEP → Melhor Envio → seleção)
Step 3: Pagamento (PIX QR code OU cartão tokenizado via MercadoPago.js)
```

### APIs Externas
| API | Sandbox URL | Produção URL |
|-----|-------------|--------------|
| Mercado Pago | `https://api.mercadopago.com` | `https://api.mercadopago.com` |
| Melhor Envio | `https://sandbox.melhorenvio.com.br` | `https://melhorenvio.com.br` |
| ViaCEP | `https://viacep.com.br/ws/{cep}/json/` | (mesmo) |
| Resend | `https://api.resend.com` | (mesmo) |
