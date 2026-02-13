# CLAUDE.md — Palestra Baby Marketplace

> Documento de referência para Claude Code. Leia INTEGRALMENTE antes de qualquer tarefa.

## Sobre o Projeto

E-commerce de roupas de bebê com temática Palmeiras (cores verde/branco/gold).
Público: pais/mães palmeirenses comprando para bebês 0-2 anos.
Produtos: bodies, conjuntos, acessórios, kits presente.

**Repositório:** palestra-baby-mktplace
**URL produção:** (a definir — Vercel, região São Paulo `gru1`)
**Supabase project:** (a definir)

---

## Stack Técnica

### Frontend (React SPA)

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Tipagem (config relaxada: `noImplicitAny: false`, `strictNullChecks: false`) |
| Vite | 5.4.19 | Build tool (porta 8080, SWC via `@vitejs/plugin-react-swc`) |
| Tailwind CSS | 3.4.17 | Estilização utility-first, mobile-first |
| shadcn/ui (Radix) | latest | 60+ componentes em `src/components/ui/` — NÃO editar manualmente |
| Zustand | 5.0.10 | Estado global (carrinho → localStorage, key: `palestra-baby-cart`) |
| React Router DOM | 6.30.1 | Roteamento client-side (17 rotas) |
| React Query | 5.83.0 | Server state (fetch/cache Supabase, staleTime: 5min, retry: 1) |
| React Hook Form + Zod | 7.61.1 / 3.25.76 | Formulários + validação |
| Framer Motion | 12.29.2 | Animações |
| Lucide React | 0.462.0 | Ícones |
| Sonner | 1.7.4 | Notificações toast |
| Recharts | 2.15.4 | Gráficos no admin dashboard |
| Embla Carousel | 8.6.0 | Carrosséis (produtos, depoimentos) |
| Vitest + Testing Library | 3.2.4 / 16.0.0 | Testes (jsdom, coverage v8) |

### Backend (Supabase BaaS)

| Serviço | Uso |
|---|---|
| Supabase Postgres | Banco relacional (21 tabelas, 11 enums, RLS, functions) |
| Supabase Auth | Autenticação (admin com MFA/OTP + clientes futuros) |
| Supabase Storage | Imagens de produtos (bucket: product-images) |
| Supabase Edge Functions | 5 funções Deno/TypeScript (OTP, frete, pedidos, webhooks) |
| Supabase Realtime | Notificações em tempo real |
| pg_cron | Refresh de materialized views |
| pgvector | Vector store para RAG (pós-MVP) |

### Infraestrutura

| Serviço | Uso |
|---|---|
| Vercel | Hospedagem frontend (deploy automático, SSL, região gru1) |
| Mercado Pago | Gateway pagamento (PIX + cartão, SDK: `mercadopago@2.12.0`) |
| Melhor Envio | Cotação de frete (PAC, SEDEX) — Edge Function |
| Resend | Envio de email OTP para admin — Edge Function |
| SonarCloud | Análise de qualidade de código |
| GCP (futuro) | Cloud Run para serviços pesados de IA, BigQuery para analytics |

### IA & Atendimento (pós-MVP)

| Serviço | Uso |
|---|---|
| Claude API (Anthropic) | LLM para chat de atendimento |
| Vercel AI SDK | Streaming de respostas no frontend |
| Voyage AI | Geração de embeddings (1536 dims) |
| Evolution API | WhatsApp automatizado (self-hosted) |

---

## Estrutura de Arquivos

```
src/
├── App.tsx                     # Router (17 rotas, admin lazy-loaded)
├── main.tsx                    # Entry point (React DOM)
├── index.css                   # Tailwind + CSS variables (cores, sombras, animações)
├── vite-env.d.ts               # Tipos de ambiente Vite
│
├── pages/
│   ├── Index.tsx               # Home (hero, destaques, features, depoimentos, FAQ)
│   ├── Produtos.tsx            # Listagem com filtros (categoria, tamanho, preço)
│   ├── Produto.tsx             # Detalhe (tabs: descrição, medidas, cuidados)
│   ├── Checkout.tsx            # Checkout multi-step (3 etapas)
│   ├── OrderConfirmation.tsx   # Confirmação de pedido (lazy)
│   ├── NotFound.tsx            # 404
│   └── admin/                  # Painel administrativo (lazy-loaded)
│       ├── Login.tsx           # Login email/senha
│       ├── AdminVerify.tsx     # Verificação OTP (MFA)
│       ├── AdminLayout.tsx     # Layout com sidebar (rotas aninhadas)
│       ├── Dashboard.tsx       # Dashboard (stats/resumo)
│       ├── AdminProducts.tsx   # Lista de produtos (CRUD)
│       ├── AdminProductForm.tsx # Criar/editar produto
│       ├── AdminStock.tsx      # Gestão de estoque por tamanho
│       ├── AdminOrders.tsx     # Lista de pedidos (filtros, busca)
│       ├── AdminOrderDetail.tsx # Detalhe do pedido
│       └── AdminCoupons.tsx    # CRUD de cupons
│
├── components/
│   ├── ui/                     # shadcn/ui (60+ arquivos) — NÃO editar manualmente
│   ├── NavLink.tsx             # Componente de navegação customizado
│   ├── layout/
│   │   ├── Header.tsx          # Navegação, logo, botão carrinho
│   │   ├── Footer.tsx          # Links, social, info, newsletter
│   │   └── WhatsAppButton.tsx  # Botão WhatsApp fixo (flutuante)
│   ├── home/
│   │   ├── HeroSection.tsx     # Banner hero com CTA
│   │   ├── FeaturedProducts.tsx # Carrossel de produtos destaque
│   │   ├── FeaturesSection.tsx # Seção de benefícios (3 colunas)
│   │   ├── TestimonialsSection.tsx # Carrossel de depoimentos
│   │   └── FAQSection.tsx      # FAQ accordion
│   ├── products/
│   │   └── ProductCard.tsx     # Card de produto (imagem, nome, preço, add-to-cart)
│   └── cart/
│       └── CartDrawer.tsx      # Drawer do carrinho (itens, total, checkout)
│
├── hooks/
│   ├── useCart.ts              # Zustand store (add, remove, qty, clear, total)
│   ├── useSupabase.ts          # React Query hooks (useProducts, etc)
│   ├── useAuth.ts              # Auth de clientes (signup, login, logout)
│   ├── useAdminAuth.ts         # Auth admin (email/senha + MFA OTP)
│   ├── useAdmin.ts             # Operações admin (CRUD produtos, pedidos, cupons)
│   ├── useCheckout.ts          # Estado do checkout + validação
│   ├── use-mobile.tsx          # Detecção mobile (breakpoint)
│   └── use-toast.ts            # Hook de notificações Sonner
│
├── lib/
│   ├── supabase.ts             # Inicialização do cliente Supabase
│   ├── api.ts                  # Queries públicas (fetchProducts, fetchTestimonials, etc)
│   ├── admin-api.ts            # API admin (CRUD produtos, pedidos, imagens)
│   ├── checkout-api.ts         # Checkout (validarCEP, calcularFrete, processarPedido)
│   └── utils.ts                # Utilitários (formatPrice, formatDate, cn)
│
├── types/
│   ├── index.ts                # Tipos frontend (Product, CartItem, CustomerInfo, etc)
│   └── database.ts             # Tipos do schema Supabase (DbProduct, etc)
│
├── data/
│   └── products.ts             # Dados estáticos de fallback (se Supabase indisponível)
│
└── test/
    └── setup.ts                # Setup Vitest (@testing-library/jest-dom)

supabase/
├── schema.sql                  # Schema completo (21 tabelas, 11 enums, indexes, RLS, seeds)
├── migrations/
│   └── 20250201_fase2_schema.sql # Fase 2: admin_otp_codes, dimensões produto, campos frete/MP
└── functions/
    ├── _shared/
    │   ├── auth.ts             # Verificação admin JWT + role
    │   └── cors.ts             # Headers CORS
    ├── send-admin-otp/
    │   └── index.ts            # Gerar + enviar OTP via Resend
    ├── verify-admin-otp/
    │   └── index.ts            # Validar código OTP (max 3 tentativas, 5min expiry)
    ├── calculate-shipping/
    │   └── index.ts            # Cotação Melhor Envio (PAC, SEDEX)
    ├── process-order/
    │   └── index.ts            # Criar pedido + preferência Mercado Pago
    └── webhook-mercadopago/
        └── index.ts            # Webhook de status de pagamento

.github/
├── copilot-instructions.md
└── workflows/
    ├── quality.yml             # CI: lint, test (coverage), build
    └── ci-cd.yml               # CI/CD completo: quality → sonar → vercel → supabase

.claude/
└── settings.json               # Permissões + MCPs (GitHub, Supabase, GCP)
```

---

## Regras OBRIGATÓRIAS

### O que SEMPRE fazer

- TypeScript em todo arquivo (.ts, .tsx) — NUNCA JavaScript puro
- Estilização via Tailwind classes inline — NUNCA CSS modules ou styled-components
- Componentes UI: usar shadcn/ui de `@/components/ui/`
- State: Zustand para global, React Query para server state
- Imports: alias `@/` (ex: `@/components/ui/button`)
- Supabase queries: via React Query hooks em `@/hooks/`
- Formulários: React Hook Form + Zod
- Ícones: Lucide React
- Notificações: Sonner (toast)
- Animações: Framer Motion
- Edge Functions: Deno/TypeScript
- Testes: Vitest + Testing Library
- Dados de API: sempre via `@/lib/api.ts` ou `@/lib/admin-api.ts` — nunca fetch direto em componentes

### O que NUNCA fazer

- Instalar Material UI, Chakra, Ant Design, Bootstrap
- Usar Redux, MobX, Context API para estado global
- Usar Font Awesome, Hero Icons, Material Icons
- Usar react-toastify ou alert()
- Usar react-spring ou CSS animations complexas
- Usar Formik ou validação manual de forms
- Fazer fetch direto nos componentes (sempre via hooks/React Query)
- Expor SUPABASE_SERVICE_ROLE_KEY no frontend
- Usar dangerouslySetInnerHTML sem sanitização
- Confiar apenas em validação client-side (validar no Edge Function também)
- Editar manualmente arquivos em `src/components/ui/` (shadcn gerado via CLI)

---

## Segurança

- NUNCA expor `SUPABASE_SERVICE_ROLE_KEY` no frontend
- Sempre usar parameterized queries no Supabase (`.eq()`, `.match()`)
- Sanitizar inputs do usuário antes de exibir
- Validar com Zod no frontend E no Edge Function
- RLS habilitado em TODAS as tabelas
- Admin: `auth.jwt()->'app_metadata'->>'role' = 'admin'`
- Edge Functions usam `service_role` key (bypassa RLS)
- Variáveis sensíveis NUNCA com prefixo `VITE_`

---

## Banco de Dados (Supabase Postgres)

### Tabelas (21 + 1 Fase 2)

| Domínio | Tabelas |
|---|---|
| Catálogo (4) | `products`, `product_images`, `product_sizes`, `product_promotions` |
| Precificação (1) | `price_history` |
| Clientes (2) | `customers`, `customer_addresses` |
| Pedidos (3) | `orders`, `order_items`, `order_status_history` |
| Promoções (1) | `coupons` |
| Conteúdo (3) | `testimonials`, `faqs`, `banners` |
| IA & Chat (3) | `chat_sessions`, `chat_messages`, `embeddings` |
| WhatsApp (2) | `whatsapp_conversations`, `whatsapp_messages` |
| Analytics (2) | `analytics_events`, `audit_log` |
| Admin MFA (1) | `admin_otp_codes` (Fase 2 migration) |

### Enums (11)

`product_category`, `order_status`, `payment_method`, `shipping_method`, `discount_type`, `banner_placement`, `chat_role`, `whatsapp_direction`, `whatsapp_status`, `analytics_event_type`, `audit_action`

### Convenções do banco

- Tabelas: `snake_case`
- PKs: UUID (`gen_random_uuid()`)
- Timestamps: `created_at` e `updated_at` em todas as tabelas
- Trigger `update_updated_at()` automático
- Indexes em colunas de busca frequente (slug, category, featured, active)

### Funções SQL

- `update_updated_at()` — trigger automático
- `match_embeddings(query, count, threshold, source_filter)` — busca RAG
- `decrement_stock(product_id, size_label, quantity)` — decremento atômico de estoque

### Fase 2 Migration (20250201_fase2_schema.sql)

- **Nova tabela:** `admin_otp_codes` (hash bcrypt, expiry 5min, max 3 tentativas)
- **Novos campos products:** `weight_kg`, `height_cm`, `width_cm`, `length_cm` (dimensões para frete)
- **Novos campos orders:** `shipping_service_id`, `shipping_service_name`, `shipping_company`, `shipping_delivery_days`, `mp_payment_id`, `mp_payment_status`, `mp_payment_method`, `mp_installments`

---

## Edge Functions (Supabase)

| Função | Método | Auth | Descrição |
|---|---|---|---|
| `send-admin-otp` | POST | JWT admin | Gera OTP 6 dígitos → bcrypt → envia via Resend |
| `verify-admin-otp` | POST | JWT admin | Valida OTP (max 3 tentativas, 5min expiry) |
| `calculate-shipping` | POST | JWT | Cotação Melhor Envio (CEP + itens com dimensões) |
| `process-order` | POST | JWT | Cria pedido, decrementa estoque, gera preference Mercado Pago |
| `webhook-mercadopago` | POST | Público | Recebe notificação de pagamento, atualiza status do pedido |

**Código compartilhado:** `_shared/auth.ts` (verificação JWT admin), `_shared/cors.ts` (headers CORS)

---

## Rotas

| Rota | Componente | Auth | Lazy | Status |
|---|---|---|---|---|
| `/` | Index | - | - | Implementado |
| `/produtos` | Produtos | - | - | Implementado |
| `/produto/:slug` | Produto | - | - | Implementado |
| `/checkout` | Checkout | - | - | Implementado |
| `/pedido/confirmacao` | OrderConfirmation | - | Sim | Implementado |
| `/admin/login` | AdminLogin | - | Sim | Implementado |
| `/admin/verify` | AdminVerify | Admin | Sim | Implementado |
| `/admin` | AdminLayout > Dashboard | Admin | Sim | Implementado |
| `/admin/produtos` | AdminProducts | Admin | Sim | Implementado |
| `/admin/produtos/novo` | AdminProductForm | Admin | Sim | Implementado |
| `/admin/produtos/:id` | AdminProductForm | Admin | Sim | Implementado |
| `/admin/estoque` | AdminStock | Admin | Sim | Implementado |
| `/admin/pedidos` | AdminOrders | Admin | Sim | Implementado |
| `/admin/pedidos/:id` | AdminOrderDetail | Admin | Sim | Implementado |
| `/admin/cupons` | AdminCoupons | Admin | Sim | Implementado |
| `*` | NotFound | - | - | Implementado |

---

## Design System

### Cores

| Token | Valor | Uso |
|---|---|---|
| `verde-principal` | `#1F5C46` / `hsl(156, 49%, 24%)` | Cor primária (escuro) |
| `verde-medio` | `#2E7A5E` / `hsl(156, 45%, 33%)` | Cor secundária (médio) |
| `verde-claro` | `#7FB8A2` | Destaques claros |
| `cream` | `#F6F3EC` | Background principal |
| `gold` | `#C8A44D` | Acentos, CTAs especiais |
| `whatsapp` | `#25D366` | Botão WhatsApp |

### Fontes

- **Headings:** `Baloo 2` (`font-display` no Tailwind)
- **Body:** `Poppins` (`font-sans` no Tailwind)

### Animações (Tailwind keyframes)

- `fade-in`: translateY(20px) → 0, 0.6s
- `slide-in-right`: translateX(100%) → 0, 0.4s
- `scale-in`: scale(0.95) → 1, 0.3s
- `bounce-gentle`: translateY(0) → -5px → 0, 2s infinite
- `accordion-down/up`: altura Radix, 0.2s

### Sombras customizadas

- `shadow-soft`, `shadow-card`, `shadow-hover`, `shadow-float` (CSS variables em `index.css`)

### Layout

- Responsivo: breakpoints sm/md/lg/xl/2xl
- Container: max 1400px, padding 2rem, centralizado
- Dark mode: classe (`darkMode: ["class"]`)

---

## Configurações de Ferramentas

### TypeScript (tsconfig.json)

- Path alias: `@/*` → `./src/*`
- Relaxado: `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`
- Refs: `tsconfig.app.json` (app), `tsconfig.node.json` (tooling)

### Vite (vite.config.ts)

- Dev server: `localhost:8080`, HMR overlay desabilitado
- Plugin: React SWC (compilação rápida)
- Build chunking: `vendor` (React/Router), `ui` (Radix), `state` (Zustand/Query)

### ESLint (eslint.config.js)

- Flat config (ESLint 9)
- Extends: `@eslint/js` recommended + `typescript-eslint` recommended
- Plugins: `react-hooks`, `react-refresh`
- Regras desabilitadas: `no-unused-vars`, `no-explicit-any`
- Ignores: `dist/`, `coverage/`

### Vitest (vitest.config.ts)

- Environment: jsdom
- Globals: true
- Setup: `src/test/setup.ts` (imports `@testing-library/jest-dom`)
- Coverage: v8 provider, reporters: text + lcov + html
- Coverage inclui apenas arquivos específicos (selective — ver `vitest.config.ts`)
- Pattern: `src/**/*.{test,spec}.{ts,tsx}`

### Vercel (vercel.json)

- Framework: Vite
- Região: `gru1` (São Paulo)
- SPA rewrites: todas as rotas → `/index.html`
- Security headers: CSP, X-Content-Type-Options, X-Frame-Options
- Cache: assets imutáveis 1 ano, robots.txt 24h
- CSP permite: Mercado Pago SDK, Supabase, Google Fonts

---

## Testes

### Arquivos de teste existentes (16)

| Arquivo | Testa |
|---|---|
| `src/pages/Index.test.tsx` | Renderização da home page |
| `src/pages/NotFound.test.tsx` | Renderização da 404 |
| `src/components/home/HeroSection.test.tsx` | Hero banner |
| `src/components/home/FeaturedProducts.test.tsx` | Carrossel de destaques |
| `src/components/home/FAQSection.test.tsx` | FAQ accordion |
| `src/components/layout/Header.test.tsx` | Navegação |
| `src/components/layout/Footer.test.tsx` | Footer |
| `src/components/products/ProductCard.test.tsx` | Card de produto |
| `src/hooks/useCart.test.ts` | Store Zustand (add, remove, qty, total) |
| `src/hooks/useSupabase.test.tsx` | React Query hooks |
| `src/lib/api.test.ts` | Funções de fetch público |
| `src/lib/checkout-api.test.ts` | Fluxo de checkout |
| `src/lib/supabase.test.ts` | Cliente Supabase |
| `src/lib/utils.test.ts` | Utilitários |
| `src/data/products.test.ts` | Dados de fallback |
| `src/types/index.test.ts` | Tipos TypeScript |

### Convenções de teste

- Colocar testes junto ao arquivo fonte: `Component.tsx` → `Component.test.tsx`
- Usar `describe`, `test`/`it`, `expect` (globals do Vitest)
- Usar `@testing-library/react` para renderização e queries
- Mocks: inline com `vi.mock()` para Supabase e APIs externas

---

## Comandos

```bash
npm run dev           # Dev server → http://localhost:8080
npm run build         # Build produção (tsc -b + vite build)
npm run build:dev     # Build modo desenvolvimento
npm run preview       # Preview da build local
npm run lint          # ESLint (check only)
npm run lint:fix      # ESLint com auto-fix
npm test              # Vitest (run once)
npm run test:watch    # Vitest (watch mode)
npm run test:coverage # Vitest com coverage report
```

---

## Variáveis de Ambiente

### Frontend (prefixo `VITE_` = expostas ao browser)

```bash
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_MP_PUBLIC_KEY=<mercado-pago-public-key>
VITE_STORE_CEP=02062000
```

### Edge Functions (NUNCA no frontend — configurar no Supabase Dashboard)

```bash
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
MP_ACCESS_TOKEN=<mercado-pago-access-token>
RESEND_API_KEY=<resend-api-key>            # Email OTP
MELHOR_ENVIO_TOKEN=<melhor-envio-token>    # Cotação frete
STORE_POSTAL_CODE=02062000                 # CEP origem
STORE_NAME=Palestra Baby
SITE_URL=https://palestrababy.com.br
```

### Futuros (pós-MVP)

```bash
ANTHROPIC_API_KEY=<claude-api-key>
VOYAGE_API_KEY=<voyage-api-key>
EVOLUTION_API_URL=<evolution-api-url>
EVOLUTION_API_KEY=<evolution-api-key>
```

---

## CI/CD

### quality.yml (Push/PR para main/develop)

1. **Lint** — ESLint
2. **Test** — Vitest com coverage
3. **Build** — Vite build (usa secrets para env vars)
4. **Upload** — Artifact de coverage

### ci-cd.yml (Pipeline completo)

1. **Quality Gate** — Lint + test (coverage) + build
2. **SonarCloud** — Análise de qualidade (depende de quality)
3. **Deploy Vercel Production** — Apenas push em `main` (depende de quality + sonar)
4. **Deploy Preview** — Em PRs (depende de quality, comenta URL no PR)
5. **Deploy Supabase** — Apenas se `supabase/functions/` mudou + push em `main`
6. **Summary** — Relatório final (tabela de status dos jobs)

**Node.js:** v20 no CI
**Concurrency:** Cancela jobs em progresso em novo push

---

## Claude Code Settings (.claude/settings.json)

### Permissões

- **Allow:** npm, npx, git, supabase CLI, file ops básicos
- **Allow write:** `src/**`, `supabase/**`, `docs/**`, `tests/**`, `.github/**`, configs raiz
- **Deny write:** `src/components/ui/**` (shadcn auto-gerado)
- **Deny bash:** `rm -rf /`, `sudo`

### MCP Servers

- **GitHub:** PRs, issues, code review (`@modelcontextprotocol/server-github`)
- **Supabase:** SQL queries, schema, RLS, storage, edge functions (`supabase-mcp-server`)
- **GCP:** Cloud Run, BigQuery — uso futuro (`@anthropic/mcp-server-gcp`)

---

## Arquitetura de Estado

### Cart Store (Zustand + localStorage)

```typescript
interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem(product, size, qty?) → void   // Incrementa se existente
  removeItem(productId, size) → void
  updateQuantity(productId, size, qty) → void  // Remove se qty <= 0
  clearCart() → void
  openCart() / closeCart() / toggleCart() → void
  getTotalItems() → number
  getTotalPrice() → number
}
```

Persistência: localStorage key `palestra-baby-cart` (apenas `items`, não `isOpen`)

### React Query

- `QueryClient` com `staleTime: 5min`, `retry: 1`
- Hooks em `@/hooks/useSupabase.ts` (dados públicos)
- Hooks em `@/hooks/useAdmin.ts` (operações admin)
- Query functions em `@/lib/api.ts` e `@/lib/admin-api.ts`

---

## Roadmap

### Fase 1 — MVP (lançamento)

- [x] Setup projeto (Vite + React + TypeScript + Tailwind)
- [x] Schema Supabase (21 tabelas, enums, RLS, functions)
- [x] Supabase client + React Query hooks
- [x] Componentes: Home, Produtos, Produto, Checkout, OrderConfirmation
- [x] Carrinho com Zustand (localStorage)
- [x] Edge Functions: process-order, webhook-mercadopago
- [x] Painel admin: Login, OTP, Dashboard, CRUD produtos, estoque, pedidos, cupons
- [x] Testes unitários (16 arquivos, Vitest + Testing Library)
- [x] CI/CD (quality + ci-cd workflows, SonarCloud)
- [x] Configuração Vercel (vercel.json, CSP, cache, região)
- [ ] Migrar dados estáticos para Supabase (produtos ainda usam fallback)
- [ ] Migrar imagens para Supabase Storage
- [ ] Integrar Mercado Pago end-to-end (webhook ativo)
- [ ] Materialized views (mv_daily_sales, mv_product_performance)
- [ ] Deploy Vercel em produção

### Fase 2 — Pós-lançamento (mês 1-3)

- [x] Edge Functions: send-admin-otp, verify-admin-otp, calculate-shipping
- [x] Migration Fase 2 (admin_otp_codes, dimensões produto, campos MP/frete)
- [x] Admin MFA (OTP via email)
- [ ] Integrar Melhor Envio end-to-end no checkout
- [ ] Tracking de eventos (analytics_events)
- [ ] "Avise-me quando chegar"
- [ ] Admin: CRM, relatórios, alertas de estoque

### Fase 3 — Automação (mês 3-6)

- [ ] Chat IA (Claude + RAG + Vercel AI SDK)
- [ ] pgvector indexação
- [ ] WhatsApp automatizado (Evolution API)
- [ ] Notificações de status via WhatsApp

### Fase 4 — Crescimento (mês 6+)

- [ ] Chatbot IA no WhatsApp
- [ ] Programa de fidelidade
- [ ] Lista de presentes
- [ ] Integração Correios API
