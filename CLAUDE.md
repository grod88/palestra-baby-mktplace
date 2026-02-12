# CLAUDE.md — Palestra Baby Marketplace

> Documento de referência para Claude Code. Leia INTEGRALMENTE antes de qualquer tarefa....

## 🎯 Sobre o Projeto

E-commerce de roupas de bebê com temática Palmeiras (cores verde/branco/gold).
Público: pais/mães palmeirenses comprando para bebês 0-2 anos.
Produtos: bodies, conjuntos, acessórios, kits presente.

**Repositório:** palestra-baby-mktplace
**URL produção:** (a definir — Vercel)
**Supabase project:** (a definir)

---

## 🏗️ Stack Técnica

### Frontend (React SPA)
| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5.x | Tipagem (config relaxada: noImplicitAny: false) |
| Vite | 5.x | Build tool (porta 8080, SWC) |
| Tailwind CSS | 3.x | Estilização utility-first, mobile-first |
| shadcn/ui (Radix) | latest | Componentes em `src/components/ui/` |
| Zustand | 5.x | Estado global (carrinho → localStorage) |
| React Router DOM | 6.x | Roteamento client-side |
| React Query | 5.x | Server state (fetch/cache Supabase) |
| React Hook Form + Zod | latest | Formulários + validação |
| Framer Motion | latest | Animações |
| Lucide React | latest | Ícones |
| Sonner | latest | Notificações toast |
| Vitest + Testing Library | latest | Testes |

### Backend (Supabase BaaS)
| Serviço | Uso |
|---|---|
| Supabase Postgres | Banco relacional (21 tabelas, RLS, enums, functions) |
| Supabase Auth | Autenticação (admin + clientes futuros) |
| Supabase Storage | Imagens de produtos (bucket: product-images) |
| Supabase Edge Functions | Lógica server-side (Deno/TypeScript) |
| Supabase Realtime | Notificações em tempo real |
| pg_cron | Refresh de materialized views |
| pgvector | Vector store para RAG (pós-MVP) |

### Infraestrutura
| Serviço | Uso |
|---|---|
| Vercel | Hospedagem frontend (deploy automático, SSL) |
| Mercado Pago | Gateway pagamento (PIX + cartão, ~5% por venda) |
| GCP (futuro) | Cloud Run para serviços pesados de IA, BigQuery para analytics |

### IA & Atendimento (pós-MVP)
| Serviço | Uso |
|---|---|
| Claude API (Anthropic) | LLM para chat de atendimento |
| Vercel AI SDK | Streaming de respostas no frontend |
| Voyage AI | Geração de embeddings (1536 dims) |
| Evolution API | WhatsApp automatizado (self-hosted) |

---

## 📁 Estrutura de Arquivos

```
src/
├── pages/                  # Páginas (rotas)
│   ├── Index.tsx           # Home (hero, destaques, features, depoimentos, FAQ)
│   ├── Produtos.tsx        # Listagem com filtros e ordenação
│   ├── Produto.tsx         # Detalhe (tabs: descrição, medidas, cuidados)
│   ├── Checkout.tsx        # Checkout multi-step (3 etapas)
│   ├── NotFound.tsx        # 404
│   └── admin/              # Painel administrativo
├── components/
│   ├── ui/                 # shadcn/ui — NÃO editar manualmente
│   ├── layout/             # Header, Footer, WhatsAppButton
│   ├── home/               # Hero, Featured, Features, Testimonials, FAQ
│   ├── products/           # ProductCard, ProductGrid, ProductFilters
│   ├── cart/               # CartDrawer, CartItem
│   ├── checkout/           # CheckoutSteps, PaymentForm
│   └── chat/               # (futuro) Widget de chat IA
├── hooks/                  # useCart (Zustand), useProducts, use-toast, use-mobile
├── data/                   # products.ts (fallback — fonte primária é Supabase)
├── types/                  # Interfaces TypeScript
├── lib/                    # utils.ts, supabase.ts (cliente Supabase)
└── assets/                 # Imagens estáticas

supabase/
├── schema.sql              # Schema completo (21 tabelas, RLS, seeds)
├── functions/              # Edge Functions (Deno/TypeScript)
│   ├── process-order/
│   ├── webhook-mercadopago/
│   ├── whatsapp-notify/
│   └── chat-ai/
└── migrations/             # Migrações incrementais

docs/
├── ARCHITECTURE.md         # Arquitetura detalhada
├── DATABASE.md             # Schema, RLS, queries
├── API.md                  # Edge Functions endpoints
└── DEPLOYMENT.md           # Deploy Vercel + Supabase

.claude/
└── settings.json           # Configuração MCPs para Claude Code

.github/
├── copilot-instructions.md # Instruções GitHub Copilot
└── workflows/
    └── quality.yml         # CI: lint, test, build, sonar
```

---

## 🚫 Regras OBRIGATÓRIAS

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

### O que NUNCA fazer
- ❌ Instalar Material UI, Chakra, Ant Design, Bootstrap
- ❌ Usar Redux, MobX, Context API para estado global
- ❌ Usar Font Awesome, Hero Icons, Material Icons
- ❌ Usar react-toastify ou alert()
- ❌ Usar react-spring ou CSS animations complexas
- ❌ Usar Formik ou validação manual de forms
- ❌ Fazer fetch direto nos componentes (sempre via hooks/React Query)
- ❌ Expor SUPABASE_SERVICE_ROLE_KEY no frontend
- ❌ Usar dangerouslySetInnerHTML sem sanitização
- ❌ Confiar apenas em validação client-side (validar no Edge Function também)
- ❌ Editar manualmente arquivos em `src/components/ui/` (shadcn gerado via CLI)

---

## 🔒 Segurança

- NUNCA expor `SUPABASE_SERVICE_ROLE_KEY` no frontend
- Sempre usar parameterized queries no Supabase (`.eq()`, `.match()`)
- Sanitizar inputs do usuário antes de exibir
- Validar com Zod no frontend E no Edge Function
- RLS habilitado em TODAS as tabelas
- Admin: `auth.jwt()->'app_metadata'->>'role' = 'admin'`
- Edge Functions usam `service_role` key (bypassa RLS)
- Variáveis sensíveis NUNCA com prefixo `VITE_`

---

## 🗃️ Banco de Dados (Supabase Postgres)

### Tabelas (21)

**Catálogo (4):** products, product_images, product_sizes, product_promotions
**Precificação (1):** price_history
**Clientes (2):** customers, customer_addresses
**Pedidos (3):** orders, order_items, order_status_history
**Promoções (1):** coupons
**Conteúdo (3):** testimonials, faqs, banners
**IA & Chat (3):** chat_sessions, chat_messages, embeddings
**WhatsApp (2):** whatsapp_conversations, whatsapp_messages
**Analytics & Admin (2):** analytics_events, audit_log

### Convenções do banco
- Tabelas: `snake_case`
- PKs: UUID (gen_random_uuid())
- Timestamps: `created_at` e `updated_at` em todas as tabelas
- Trigger `update_updated_at()` automático
- Enums para campos com valores fixos (11 enums definidos)

### Funções SQL
- `update_updated_at()` — trigger automático
- `match_embeddings(query, count, threshold, source_filter)` — busca RAG
- `decrement_stock(product_id, size_label, quantity)` — decremento atômico

---

## 🛤️ Rotas

| Rota | Página | Status |
|---|---|---|
| `/` | Home | 🔲 Fase 1 |
| `/produtos` | Listagem com filtros | 🔲 Fase 1 |
| `/produto/:slug` | Detalhe do produto | 🔲 Fase 1 |
| `/checkout` | Checkout 3 etapas | 🔲 Fase 1 |
| `/admin` | Dashboard admin | 🔲 Fase 1 |
| `/admin/produtos` | CRUD produtos | 🔲 Fase 1 |
| `/admin/pedidos` | Gestão pedidos | 🔲 Fase 1 |
| `/admin/clientes` | CRM básico | 🔲 Fase 2 |
| `*` | 404 | 🔲 Fase 1 |

---

## 🎨 Design System

- **Cores:** verde Palmeiras (escuro #1F5C46, medio #2E7A5E, claro #7FB8A2), cream #F6F3EC, gold #C8A44D, whatsapp #25D366
- **Fontes:** Baloo 2 (headings), Poppins (body)
- **Animações:** Framer Motion + keyframes (float, bounce-gentle)
- **Responsivo:** breakpoints sm/md/lg/xl, container max 1400px
- **Classes custom:** .btn-primary, .btn-whatsapp, .btn-gold, .card-product, .text-gradient

---

## 🔧 Comandos

```bash
npm run dev          # Dev server → http://localhost:8080
npm run build        # Build produção (tsc + vite)
npm run lint         # ESLint
npm run lint:fix     # ESLint com auto-fix
npm test             # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
npm run test:coverage # Vitest com coverage
```

---

## 📊 Variáveis de Ambiente

```bash
# Frontend (prefixo VITE_ = expostas ao browser)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_MERCADO_PAGO_PUBLIC_KEY=<public-key>

# Edge Functions (NUNCA no frontend)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ANTHROPIC_API_KEY=<claude-api-key>
VOYAGE_API_KEY=<voyage-api-key>
EVOLUTION_API_URL=<evolution-api-url>
EVOLUTION_API_KEY=<evolution-api-key>
MERCADO_PAGO_ACCESS_TOKEN=<mp-access-token>
```

---

## 🗺️ Roadmap

### Fase 1 — MVP (lançamento)
- [x] Setup projeto limpo (sem lovable-tagger)
- [ ] Supabase client + React Query hooks
- [ ] Migrar dados estáticos para Supabase
- [ ] Migrar imagens para Supabase Storage
- [ ] Componentes: Home, Produtos, Produto, Checkout
- [ ] Integrar Mercado Pago (checkout transparente)
- [ ] Edge Functions: process-order, webhook-mercadopago
- [ ] Painel admin: CRUD produtos, estoque, pedidos
- [ ] Materialized views (mv_daily_sales, mv_product_performance)
- [ ] Deploy Vercel

### Fase 2 — Pós-lançamento (mês 1-3)
- [ ] Tracking de eventos (analytics_events)
- [ ] Sistema de cupons
- [ ] Embrulho para presente
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
