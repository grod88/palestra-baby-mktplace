# Fase 2 — Especificação Técnica Completa

> Admin + Pagamentos + Frete
> Prioridade: funcional primeiro, dashboard depois.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Admin Auth com MFA por Email](#2-admin-auth-com-mfa-por-email)
3. [CRUD de Produtos (Preço + Estoque)](#3-crud-de-produtos)
4. [Integração Mercado Pago](#4-integração-mercado-pago)
5. [Integração Melhor Envio (Frete)](#5-integração-melhor-envio)
6. [Edge Functions](#6-edge-functions)
7. [Banco de Dados — Alterações](#7-banco-de-dados)
8. [Variáveis de Ambiente](#8-variáveis-de-ambiente)
9. [Sequência de Implementação](#9-sequência-de-implementação)
10. [Testes](#10-testes)

---

## 1. Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUXO DO CLIENTE                            │
│                                                                 │
│  [Produtos] → [Carrinho] → [CEP] → [Cotação Frete] →           │
│  [Escolhe Frete] → [Pagamento PIX/Cartão] → [Pedido Criado]    │
│                                                                 │
│  Melhor Envio ←──── Edge Function ────→ Mercado Pago            │
│  (cotação frete)    calculate-shipping    (processar pagamento)  │
│                     process-order                                │
│                     webhook-mercadopago                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     FLUXO DO ADMIN                              │
│                                                                 │
│  [Login email] → [Código MFA por email] → [Painel Admin]        │
│  → CRUD Produtos (nome, preço, estoque, imagens, tamanhos)      │
│  → Visualizar pedidos (status, pagamento, frete)                │
└─────────────────────────────────────────────────────────────────┘
```

**Escopo desta fase (SEM dashboards):**
- Login admin com MFA por email (OTP 6 dígitos)
- CRUD produtos: criar, editar, excluir, ativar/desativar
- Gestão de estoque por tamanho
- Gestão de preços e promoções
- Upload de imagens para Supabase Storage
- Integração Mercado Pago (PIX + Cartão via Checkout Transparente)
- Integração Melhor Envio (cotação de frete no checkout)
- Webhooks para atualização de status de pagamento

---

## 2. Admin Auth com MFA por Email

### 2.1 Fluxo de Autenticação

```
Admin acessa /admin
    ↓
Tela de login (email + senha)
    ↓
Supabase Auth: signInWithPassword()
    ↓
Verifica role = 'admin' em app_metadata
    ↓ (se admin)
Gera código OTP 6 dígitos → salva em tabela admin_otp_codes
    ↓
Envia email com código via Supabase Edge Function (Resend)
    ↓
Admin digita código na tela de verificação
    ↓
Edge Function valida: código correto + não expirado (5 min)
    ↓ (se válido)
Marca sessão como MFA-verificada (localStorage flag + timestamp)
    ↓
Redireciona para /admin/produtos
```

### 2.2 Tabela admin_otp_codes

```sql
CREATE TABLE admin_otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- 6 dígitos (hash bcrypt)
  expires_at TIMESTAMPTZ NOT NULL, -- created_at + 5 minutos
  used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0, -- máx 3 tentativas
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: apenas service_role acessa
ALTER TABLE admin_otp_codes ENABLE ROW LEVEL SECURITY;
-- Sem policies públicas — acesso apenas via Edge Function com service_role

-- Limpar códigos expirados (rodar via cron ou Edge Function)
CREATE INDEX idx_otp_expires ON admin_otp_codes(expires_at) WHERE used = FALSE;
```

### 2.3 Edge Function: send-admin-otp

```
POST /functions/v1/send-admin-otp
Headers: Authorization: Bearer <user_jwt>
Body: nenhum

Lógica:
1. Decodifica JWT → extrai user_id
2. Verifica app_metadata.role === 'admin' (senão 403)
3. Invalida códigos anteriores não usados desse user_id
4. Gera código: Math.random() → 6 dígitos
5. Hash com bcrypt → salva em admin_otp_codes
6. Busca email do usuário em auth.users
7. Envia email via Resend API:
   - From: noreply@palestrababy.com.br (ou domínio verificado)
   - Subject: "Código de verificação Palestra Baby"
   - HTML: template bonito com código grande + expira em 5min
8. Retorna { success: true, expires_in: 300 }
```

### 2.4 Edge Function: verify-admin-otp

```
POST /functions/v1/verify-admin-otp
Headers: Authorization: Bearer <user_jwt>
Body: { "code": "123456" }

Lógica:
1. Decodifica JWT → extrai user_id
2. Busca último código não usado e não expirado
3. Se não existe → 401 { error: "Código expirado ou inexistente" }
4. Incrementa attempts
5. Se attempts >= 3 → marca como used, retorna 429 { error: "Máximo de tentativas" }
6. Compara bcrypt(code, hash)
7. Se correto → marca used = true, retorna { verified: true, token: <mfa_session_token> }
8. Se incorreto → retorna 401 { error: "Código incorreto", attempts_remaining: N }
```

### 2.5 Frontend: AdminAuthGuard

```typescript
// src/hooks/useAdminAuth.ts
interface AdminAuthState {
  isAuthenticated: boolean;     // Supabase session existe
  isMfaVerified: boolean;       // OTP verificado
  mfaVerifiedAt: number | null; // timestamp
  isLoading: boolean;
}

// MFA expira em 24h — admin precisa verificar novamente após isso
const MFA_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Componente wrapper para rotas /admin/*
function AdminAuthGuard({ children }) {
  const { isAuthenticated, isMfaVerified, isLoading } = useAdminAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/admin/login" />;
  if (!isMfaVerified) return <Navigate to="/admin/verify" />;
  
  return children;
}
```

### 2.6 Páginas Admin Auth

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/admin/login` | `AdminLogin.tsx` | Email + senha |
| `/admin/verify` | `AdminVerify.tsx` | Input 6 dígitos + timer 5min + "Reenviar código" |
| `/admin/*` | Protegido por `AdminAuthGuard` | Só acessa com MFA verificado |

### 2.7 Email com Resend

```
Serviço: Resend (https://resend.com)
Plano Free: 100 emails/dia, 3000/mês — mais que suficiente para admin MFA
Secret: RESEND_API_KEY (no Supabase Secrets)

Alternativa caso não queira domínio próprio:
- Usar "onboarding@resend.dev" como remetente (funciona sem verificar domínio)
- Depois migrar para noreply@palestrababy.com.br
```

---

## 3. CRUD de Produtos

### 3.1 Páginas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/admin/produtos` | `AdminProducts.tsx` | Lista de produtos (tabela simples com ações) |
| `/admin/produtos/novo` | `AdminProductForm.tsx` | Form criação |
| `/admin/produtos/:id` | `AdminProductForm.tsx` | Form edição (mesmo componente, modo edit) |

### 3.2 Form de Produto

```typescript
// Zod schema para validação
const productSchema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres").max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  description: z.string().min(10).max(2000),
  short_description: z.string().max(200).optional(),
  price: z.number().min(0.01, "Preço mínimo R$ 0,01"),
  original_price: z.number().min(0.01).optional(), // preço "de"
  category: z.enum(["body", "conjunto", "acessorio", "kit"]),
  is_active: z.boolean().default(true),
  featured: z.boolean().default(false),
  
  // Tamanhos com estoque individual
  sizes: z.array(z.object({
    label: z.string(), // "P", "M", "G", "GG" ou "RN", "0-3m", "3-6m", etc
    stock: z.number().int().min(0),
    sku: z.string().optional(),
  })).min(1, "Pelo menos um tamanho"),
  
  // Dimensões para cálculo de frete (Melhor Envio)
  weight_kg: z.number().min(0.01).max(30), // peso em kg
  height_cm: z.number().min(1).max(100),   // altura em cm
  width_cm: z.number().min(1).max(100),    // largura em cm
  length_cm: z.number().min(1).max(100),   // comprimento em cm
  
  // Metadados
  care_instructions: z.string().optional(), // cuidados de lavagem
  material: z.string().optional(),          // "100% algodão"
  age_range: z.string().optional(),         // "0-3 meses"
});
```

### 3.3 Upload de Imagens

```
Fluxo:
1. Admin seleciona até 5 imagens (drag & drop ou file picker)
2. Preview local (URL.createObjectURL)
3. No submit: upload para Supabase Storage bucket "product-images"
4. Path: product-images/{product_id}/{timestamp}_{filename}
5. Salva URLs na tabela product_images (order para definir principal)
6. Primeira imagem = imagem principal (is_primary = true)

Regras:
- Formatos: JPEG, PNG, WebP
- Tamanho máximo: 2MB por imagem
- Redimensionar no frontend antes do upload (max 1200x1200)
- Compressão: qualidade 80% para JPEG/WebP
```

### 3.4 Gestão de Estoque

```
Na listagem de produtos:
- Coluna "Estoque Total" (soma de todos os tamanhos)
- Badge vermelho se estoque total < 5
- Badge amarelo se estoque total < 15

No form de edição:
- Seção "Tamanhos e Estoque" com inputs numéricos
- Botão "+ Adicionar Tamanho"
- Possibilidade de remover tamanho (só se stock = 0)

Decremento atômico:
- Usar a function SQL decrement_stock() existente
- Chamada via Edge Function process-order no momento da compra
```

### 3.5 Alterações no Schema — Dimensões de Produto

```sql
-- Adicionar colunas de dimensão para cálculo de frete
ALTER TABLE products ADD COLUMN weight_kg DECIMAL(5,2) DEFAULT 0.3;
ALTER TABLE products ADD COLUMN height_cm DECIMAL(5,1) DEFAULT 5;
ALTER TABLE products ADD COLUMN width_cm DECIMAL(5,1) DEFAULT 20;
ALTER TABLE products ADD COLUMN length_cm DECIMAL(5,1) DEFAULT 25;

-- Valores padrão para roupas de bebê (embalagem típica)
COMMENT ON COLUMN products.weight_kg IS 'Peso em kg para cálculo de frete';
COMMENT ON COLUMN products.height_cm IS 'Altura em cm da embalagem';
COMMENT ON COLUMN products.width_cm IS 'Largura em cm da embalagem';
COMMENT ON COLUMN products.length_cm IS 'Comprimento em cm da embalagem';
```

---

## 4. Integração Mercado Pago

### 4.1 Arquitetura

```
[Frontend Checkout]
    │
    ├── PIX: Envia dados do pedido → Edge Function process-order
    │         → Cria payment no MP (method: pix)
    │         → Retorna QR Code + Pix Copia/Cola
    │         → Frontend exibe QR + polling status
    │
    ├── Cartão: MercadoPago.js SDK tokeniza cartão no browser
    │           → Envia card_token + dados → Edge Function process-order
    │           → Cria payment no MP (method: credit_card)
    │           → Retorna status (approved/pending/rejected)
    │
    └── Webhook: MP notifica → Edge Function webhook-mercadopago
                 → Atualiza status do pedido no Supabase
                 → (futuro) Notifica admin via email/whatsapp
```

### 4.2 Frontend — Checkout Steps (3 etapas)

```
Step 1: IDENTIFICAÇÃO
  - Nome completo
  - Email
  - CPF
  - Telefone (WhatsApp)

Step 2: ENDEREÇO + FRETE
  - CEP (com busca automática via ViaCEP)
  - Endereço completo (autopreenchido)
  - Complemento, número
  - [Botão "Calcular Frete"]
  - → Chama Edge Function calculate-shipping (Melhor Envio)
  - → Exibe opções: PAC, SEDEX, Jadlog, etc com preço e prazo
  - → Cliente seleciona opção de frete

Step 3: PAGAMENTO
  - Resumo do pedido (itens + frete + total)
  - Toggle: PIX ou Cartão de Crédito
  
  PIX:
    → Botão "Gerar PIX"
    → Edge Function cria pagamento no MP
    → Exibe QR Code (imagem base64) + código Pix Copia/Cola
    → Timer 30 minutos para pagar
    → Polling a cada 5s para verificar status
    → Quando aprovado → tela de confirmação
  
  Cartão:
    → Form com: número, validade, CVV, titular, parcelas
    → MercadoPago.js tokeniza no browser (nunca toca nosso servidor)
    → Envia card_token para Edge Function
    → Edge Function cria pagamento no MP
    → Retorna resultado imediato
    → Tela de confirmação ou erro
```

### 4.3 MercadoPago.js — Tokenização de Cartão (Frontend)

```typescript
// src/lib/mercadopago.ts
import { loadMercadoPago } from '@mercadopago/sdk-js';

// Inicializar SDK (carregar uma vez no Checkout)
await loadMercadoPago();
const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY, {
  locale: 'pt-BR',
});

// Criar card token (chamado no submit do form de cartão)
async function createCardToken(cardData: {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  identificationType: string; // "CPF"
  identificationNumber: string;
}) {
  const token = await mp.createCardToken({
    cardNumber: cardData.cardNumber,
    cardholderName: cardData.cardholderName,
    cardExpirationMonth: cardData.expirationMonth,
    cardExpirationYear: cardData.expirationYear,
    securityCode: cardData.securityCode,
    identificationType: cardData.identificationType,
    identificationNumber: cardData.identificationNumber,
  });
  return token.id; // este token vai para a Edge Function
}

// Buscar parcelas disponíveis
async function getInstallments(amount: number, bin: string) {
  const installments = await mp.getInstallments({
    amount: String(amount),
    bin: bin, // primeiros 6 dígitos do cartão
    locale: 'pt-BR',
  });
  return installments[0]?.payer_costs || [];
}
```

### 4.4 Edge Function: process-order

```
POST /functions/v1/process-order
Headers: Authorization: Bearer <anon_key> (público, mas valida dados)
Body:
{
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "12345678900",
    "phone": "11999998888"
  },
  "shipping_address": {
    "zip_code": "02062000",
    "street": "Rua tal",
    "number": "123",
    "complement": "Apto 4",
    "neighborhood": "Freguesia do Ó",
    "city": "São Paulo",
    "state": "SP"
  },
  "items": [
    { "product_id": "uuid", "size": "M", "quantity": 2 }
  ],
  "shipping": {
    "service_id": 1,           // ID do serviço Melhor Envio selecionado
    "service_name": "PAC",
    "price": 18.90,
    "delivery_days": 5
  },
  "payment": {
    "method": "pix" | "credit_card",
    // Se cartão:
    "card_token": "abc123...",
    "installments": 1,
    "issuer_id": "24"
  }
}

Lógica:
1. Validar payload com Zod
2. Verificar estoque de todos os itens (SELECT ... FOR UPDATE)
3. Se sem estoque → 409 { error: "Produto X tamanho M esgotado" }
4. Calcular total: sum(price * qty) + shipping.price
5. Criar registro em orders (status: 'pending_payment')
6. Criar registros em order_items
7. Decrementar estoque (decrement_stock function)
8. Criar pagamento no Mercado Pago:

   PIX:
   POST https://api.mercadopago.com/v1/payments
   {
     "transaction_amount": total,
     "payment_method_id": "pix",
     "payer": { "email": customer.email, "first_name": ..., "identification": { "type": "CPF", "number": cpf } },
     "description": "Palestra Baby - Pedido #XXX",
     "external_reference": order_id,
     "notification_url": "https://<project>.supabase.co/functions/v1/webhook-mercadopago"
   }
   → Retorna: qr_code, qr_code_base64, ticket_url, payment_id

   CARTÃO:
   POST https://api.mercadopago.com/v1/payments
   {
     "transaction_amount": total,
     "token": card_token,
     "installments": installments,
     "payment_method_id": "visa" (detectado pelo bin),
     "issuer_id": issuer_id,
     "payer": { ... },
     "description": "Palestra Baby - Pedido #XXX",
     "external_reference": order_id,
     "notification_url": "https://<project>.supabase.co/functions/v1/webhook-mercadopago"
   }
   → Retorna: status (approved/pending/rejected), status_detail

9. Atualizar order com payment_id do MP
10. Retornar ao frontend:
    PIX: { order_id, qr_code, qr_code_base64, ticket_url, expires_at }
    Cartão: { order_id, status, status_detail }

Se pagamento cartão rejeitado:
    → Reverter estoque (increment)
    → Atualizar order status para 'cancelled'
    → Retornar mensagem amigável de erro
```

### 4.5 Edge Function: webhook-mercadopago

```
POST /functions/v1/webhook-mercadopago
Headers: nenhum JWT (verify_jwt = false)
Body (do Mercado Pago):
{
  "action": "payment.updated",
  "data": { "id": "12345678" }
}

Lógica:
1. Receber notificação
2. GET https://api.mercadopago.com/v1/payments/{data.id}
   (confirmar diretamente na API do MP — nunca confiar no body do webhook)
3. Extrair: status, external_reference (order_id)
4. Mapear status MP → status Palestra Baby:
   - "approved" → "paid"
   - "pending" → "pending_payment" (sem ação)
   - "rejected" → "cancelled" (+ reverter estoque)
   - "refunded" → "refunded"
   - "cancelled" → "cancelled" (+ reverter estoque)
5. Atualizar order.status + order.payment_status
6. Inserir em order_status_history
7. (futuro) Disparar notificação por email/WhatsApp
8. Retornar 200 OK (SEMPRE retornar 200, senão MP reenvia)
```

### 4.6 Checagem de Status PIX (Polling)

```typescript
// Frontend: polling a cada 5s enquanto PIX pendente
function usePixPaymentStatus(orderId: string) {
  return useQuery({
    queryKey: ['order-status', orderId],
    queryFn: () => supabase
      .from('orders')
      .select('status, payment_status')
      .eq('id', orderId)
      .single(),
    refetchInterval: 5000, // 5 segundos
    enabled: !!orderId,
    // Para de fazer polling quando status muda de pending
    refetchIntervalInBackground: false,
  });
}
```

---

## 5. Integração Melhor Envio

### 5.1 Sobre o Melhor Envio

```
Plataforma: https://melhorenvio.com.br
API Docs: https://docs.melhorenvio.com.br
Sandbox: https://sandbox.melhorenvio.com.br
Produção: https://melhorenvio.com.br

Custo: GRATUITO para cotação. Paga-se apenas ao comprar etiqueta.
Auth: OAuth2 (token Bearer)

Serviços disponíveis (IDs):
  1 = Correios PAC
  2 = Correios SEDEX
  3 = Correios Mini Envios
  4 = Jadlog .Package
  7 = Jadlog .Com
 11 = Azul Cargo (não disponível para etiquetas via API)
 17 = LATAM Cargo

CEP origem da loja: definir no .env (CEP de São Paulo - Freguesia do Ó)
```

### 5.2 Setup Melhor Envio

```
1. Criar conta em https://sandbox.melhorenvio.com.br (sandbox)
2. Ir em Configurações → Dados pessoais → preencher tudo
3. Ir em Integrações → Área Dev → Aplicativos → Novo Aplicativo:
   - Nome: Palestra Baby
   - Redirect URL: https://palestrababy.com.br/callback (pode ser qualquer uma por enquanto)
   - Scopes: cart-read, cart-write, companies-read, companies-write,
             coupons-read, ecommerce-shipping, orders-read, products-read,
             products-write, purchases-read, shipping-calculate, shipping-cancel,
             shipping-checkout, shipping-companies, shipping-generate,
             shipping-preview, shipping-print, shipping-share, shipping-tracking,
             transactions-read, users-read, users-write
4. Anotar: client_id, client_secret
5. Gerar token de acesso:
   - No sandbox, ir em Configurações → Tokens → Gerar novo token
   - Copiar o token (Bearer)
   - Salvar como MELHOR_ENVIO_TOKEN no Supabase Secrets
```

### 5.3 Edge Function: calculate-shipping

```
POST /functions/v1/calculate-shipping
Headers: nenhum JWT necessário (público, qualquer cliente pode cotar)
Body:
{
  "postal_code": "90570020",
  "products": [
    {
      "id": "uuid-produto",
      "width": 20,      // cm
      "height": 5,      // cm  
      "length": 25,     // cm
      "weight": 0.3,    // kg
      "insurance_value": 89.90, // valor do produto (seguro)
      "quantity": 2
    }
  ]
}

Lógica:
1. Validar CEP destino (8 dígitos)
2. Montar request para API Melhor Envio:

   POST https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate
   Headers:
     Authorization: Bearer {MELHOR_ENVIO_TOKEN}
     Content-Type: application/json
     Accept: application/json
     User-Agent: PalestraBaby contato@palestrababy.com.br
   Body:
   {
     "from": {
       "postal_code": "02062000"  // CEP da loja (env var)
     },
     "to": {
       "postal_code": "90570020"  // CEP do cliente
     },
     "products": [
       {
         "id": "uuid",
         "width": 20,
         "height": 5,
         "length": 25,
         "weight": 0.3,
         "insurance_value": 89.90,
         "quantity": 2
       }
     ],
     "options": {
       "receipt": false,
       "own_hand": false
     },
     "services": "1,2,3,4"  // PAC, SEDEX, Mini Envios, Jadlog
   }

3. Processar resposta — filtrar apenas serviços com preço (sem erro):

   Resposta da API (array):
   [
     {
       "id": 1,
       "name": "PAC",
       "price": "18.90",
       "custom_price": "18.90",
       "discount": "0.00",
       "currency": "R$",
       "delivery_time": 8,
       "delivery_range": { "min": 6, "max": 8 },
       "custom_delivery_time": 8,
       "custom_delivery_range": { "min": 6, "max": 8 },
       "packages": [...],
       "company": {
         "id": 1,
         "name": "Correios",
         "picture": "https://..."
       },
       "error": null  // null = ok, string = erro
     },
     {
       "id": 2,
       "name": "SEDEX",
       "price": "32.50",
       ...
       "delivery_time": 3,
       "error": null
     },
     {
       "id": 3,
       "name": "Mini Envios",
       ...
       "error": "Peso excede o limite" // este não aparece pro cliente
     }
   ]

4. Retornar ao frontend apenas opções válidas (error === null):
   {
     "shipping_options": [
       {
         "service_id": 1,
         "service_name": "PAC",
         "company_name": "Correios",
         "company_picture": "https://...",
         "price": 18.90,
         "delivery_days": 8,
         "delivery_range": { "min": 6, "max": 8 }
       },
       {
         "service_id": 2,
         "service_name": "SEDEX",
         "company_name": "Correios",
         "company_picture": "https://...",
         "price": 32.50,
         "delivery_days": 3,
         "delivery_range": { "min": 2, "max": 3 }
       }
     ]
   }
```

### 5.4 Frontend — Componente de Frete no Checkout

```typescript
// src/components/checkout/ShippingCalculator.tsx

interface ShippingOption {
  service_id: number;
  service_name: string;
  company_name: string;
  company_picture: string;
  price: number;
  delivery_days: number;
  delivery_range: { min: number; max: number };
}

// Componente:
// [Input CEP] [Botão Calcular]
// ↓ Loading skeleton enquanto calcula
// ↓ Lista de opções com radio button:
//
//   ○ 🟡 Correios PAC     R$ 18,90   6-8 dias úteis
//   ● 🔴 Correios SEDEX   R$ 32,50   2-3 dias úteis  
//   ○ 🟢 Jadlog .Package  R$ 22,40   4-6 dias úteis
//
// Ao selecionar → atualiza total do pedido (subtotal + frete)

// Busca CEP automática (ViaCEP)
async function fetchAddress(cep: string) {
  const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  return resp.json();
  // Retorna: { logradouro, bairro, localidade, uf }
  // Preenche automaticamente os campos de endereço
}
```

### 5.5 Cache de Cotações

```
Para evitar chamadas excessivas à API do Melhor Envio:
- Cache no frontend: React Query com staleTime = 10 minutos
- Key: ['shipping', cep, JSON.stringify(productIds)]
- Se cliente muda quantidade → invalida cache e recalcula
- Se cliente muda CEP → recalcula
```

---

## 6. Edge Functions — Resumo

| Function | Rota | JWT | Descrição |
|----------|------|-----|-----------|
| `send-admin-otp` | POST /functions/v1/send-admin-otp | ✅ user JWT | Gera e envia OTP por email |
| `verify-admin-otp` | POST /functions/v1/verify-admin-otp | ✅ user JWT | Valida código OTP |
| `calculate-shipping` | POST /functions/v1/calculate-shipping | ❌ público | Cotação Melhor Envio |
| `process-order` | POST /functions/v1/process-order | ❌ público | Cria pedido + pagamento MP |
| `webhook-mercadopago` | POST /functions/v1/webhook-mercadopago | ❌ público | Recebe notificações MP |
| `check-payment-status` | GET /functions/v1/check-payment-status?order_id=X | ❌ público | Polling status PIX |

### Config no supabase/config.toml

```toml
[functions.send-admin-otp]
verify_jwt = true

[functions.verify-admin-otp]
verify_jwt = true

[functions.calculate-shipping]
verify_jwt = false

[functions.process-order]
verify_jwt = false

[functions.webhook-mercadopago]
verify_jwt = false

[functions.check-payment-status]
verify_jwt = false
```

---

## 7. Banco de Dados — Alterações

### 7.1 Nova tabela: admin_otp_codes
(Ver seção 2.2 acima)

### 7.2 Adicionar colunas em products
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2) DEFAULT 0.3;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,1) DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm DECIMAL(5,1) DEFAULT 20;
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm DECIMAL(5,1) DEFAULT 25;
```

### 7.3 Adicionar colunas em orders
```sql
-- Dados de frete
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service_id INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_company TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_delivery_days INTEGER;

-- Dados de pagamento Mercado Pago
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_payment_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_payment_method TEXT; -- 'pix', 'credit_card'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_installments INTEGER DEFAULT 1;

-- Dados do cliente
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Endereço de entrega
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zip_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_street TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_complement TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_neighborhood TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;
```

### 7.4 RLS Policies Atualizadas

```sql
-- products: leitura pública, escrita apenas admin
CREATE POLICY "products_select_all" ON products
  FOR SELECT USING (true);

CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (
    auth.jwt()->'app_metadata'->>'role' = 'admin'
  );

CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (
    auth.jwt()->'app_metadata'->>'role' = 'admin'
  );

CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (
    auth.jwt()->'app_metadata'->>'role' = 'admin'
  );

-- orders: qualquer um cria (checkout), admin vê todas
CREATE POLICY "orders_insert_anon" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (
    customer_email = auth.jwt()->>'email'
    OR auth.jwt()->'app_metadata'->>'role' = 'admin'
  );

CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (
    auth.jwt()->'app_metadata'->>'role' = 'admin'
  );
```

---

## 8. Variáveis de Ambiente

### Frontend (Vercel — prefixo VITE_)
```
VITE_SUPABASE_URL         # já configurado
VITE_SUPABASE_ANON_KEY    # já configurado
VITE_MERCADO_PAGO_PUBLIC_KEY  # já configurado
VITE_STORE_CEP=02062000   # CEP da loja (para exibição)
```

### Supabase Secrets (Edge Functions)
```
# Já configurados:
MERCADO_PAGO_ACCESS_TOKEN  # TEST-xxx (sandbox) ou APP_USR-xxx (prod)

# Novos para Fase 2:
RESEND_API_KEY             # Resend.com para envio de email OTP
MELHOR_ENVIO_TOKEN         # Token Bearer do Melhor Envio
STORE_POSTAL_CODE=02062000 # CEP de origem para cálculo de frete
STORE_NAME=Palestra Baby   # Nome para display no Melhor Envio
```

---

## 9. Sequência de Implementação

### Sprint 1: Admin Auth (2-3 dias)
```
1. Migration SQL: criar tabela admin_otp_codes
2. Edge Function: send-admin-otp (com Resend)
3. Edge Function: verify-admin-otp
4. Frontend: AdminLogin.tsx + AdminVerify.tsx
5. Frontend: AdminAuthGuard + useAdminAuth hook
6. Testar: login → OTP → verificação → acesso
```

### Sprint 2: CRUD Produtos (3-4 dias)
```
1. Migration SQL: adicionar colunas de dimensão em products
2. Frontend: AdminProducts.tsx (listagem tabela)
3. Frontend: AdminProductForm.tsx (form com Zod + RHF)
4. Upload imagens para Supabase Storage
5. Gestão de tamanhos/estoque no form
6. RLS policies para products (admin write)
7. Testar: criar, editar, desativar produto
```

### Sprint 3: Melhor Envio + Checkout Flow (3-4 dias)
```
1. Criar conta Melhor Envio sandbox + gerar token
2. Edge Function: calculate-shipping
3. Frontend: ShippingCalculator.tsx (CEP → opções frete)
4. Integrar ViaCEP no checkout (autopreenchimento endereço)
5. Atualizar Checkout.tsx: 3 steps (dados → endereço+frete → pagamento)
6. Testar: cotação com CEPs variados
```

### Sprint 4: Mercado Pago (3-4 dias)
```
1. Migration SQL: adicionar colunas em orders
2. Instalar @mercadopago/sdk-js no frontend
3. Frontend: PaymentForm PIX + Cartão
4. Edge Function: process-order
5. Edge Function: webhook-mercadopago
6. Frontend: tela de confirmação + polling PIX
7. Testar com contas de teste:
   - PIX: gerar QR → simular pagamento
   - Cartão: APRO → aprovado, OTHE → recusado
```

### Sprint 5: Integração + Polish (2-3 dias)
```
1. Fluxo completo end-to-end: produto → carrinho → frete → pagamento
2. Tratamento de erros em todas as etapas
3. Loading states e skeletons
4. Validação cruzada (estoque, preço, frete)
5. Admin: visualizar pedidos (lista simples, sem dashboard)
6. Testes automatizados
```

**Total estimado: 13-18 dias**

---

## 10. Testes

### Testes Unitários (Vitest)
```
- useAdminAuth: estados de autenticação
- productSchema: validação Zod (campos obrigatórios, ranges)
- formatPrice: formatação monetária BRL
- calculateTotal: subtotal + frete + desconto
- shipping options: filtragem de erros, ordenação por preço
```

### Testes de Integração (Edge Functions)
```
- send-admin-otp: verifica geração + email
- verify-admin-otp: código correto, expirado, tentativas
- calculate-shipping: CEP válido → opções, CEP inválido → erro
- process-order PIX: cria pedido + gera QR
- process-order Cartão: cria pedido + processa
- webhook-mercadopago: atualiza status corretamente
```

### Testes E2E (manual / Playwright futuro)
```
- Admin: login → OTP → criar produto → editar estoque
- Cliente: buscar produto → adicionar carrinho → calcular frete →
          escolher SEDEX → pagar PIX → ver QR → confirmar
- Webhook: simular aprovação → pedido muda para "paid"
```

### Dados de Teste Mercado Pago
```
Cartão aprovado:    Titular "APRO", qualquer número válido
Cartão recusado:    Titular "OTHE"
Cartão sem saldo:   Titular "FUND"
Cartão pendente:    Titular "CONT"

CPF teste: 12345678909
Email teste: test_user_XXXXXXXX@testuser.com (conta de teste MP)
```
