# 🍼 Palestra Baby Marketplace

E-commerce de roupas de bebê com temática Palmeiras — Verde, branco e muito amor pelo Verdão! 💚

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=grod88_palestra-baby-mktplace&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=grod88_palestra-baby-mktplace)
[![CI/CD](https://github.com/grod88/palestra-baby-mktplace/actions/workflows/quality.yml/badge.svg)](https://github.com/grod88/palestra-baby-mktplace/actions/workflows/quality.yml)

---

## 📋 Sobre o Projeto

Marketplace especializado em roupas de bebê (0-24 meses) com temática do Palmeiras:
- Bodies, macacões, conjuntos
- Kits presente personalizados
- Acessórios (babadores, toucas, meias)
- Sistema de tamanhos específico para bebês
- Integração com Mercado Pago (PIX + Cartão)
- Painel administrativo completo

**Público-alvo:** Pais e mães palmeirenses que querem presentear seus pequenos torcedores.

---

## 🏗️ Stack Tecnológica

### Frontend
- ⚛️ **React 18** + **TypeScript 5**
- ⚡ **Vite 5** (build tool com SWC)
- 🎨 **Tailwind CSS 3** + **shadcn/ui** (Radix UI)
- 🧭 **React Router DOM 6** (roteamento)
- 🔄 **React Query 5** (server state)
- 🗃️ **Zustand 5** (estado global do carrinho)
- 📝 **React Hook Form** + **Zod** (formulários e validação)
- 🎭 **Framer Motion** (animações)
- 🔔 **Sonner** (notificações toast)
- ✅ **Vitest** + **Testing Library** (testes)

### Backend (BaaS)
- 🗄️ **Supabase** (Postgres + Auth + Storage + Edge Functions)
- 💳 **Mercado Pago** (gateway de pagamento)
- 🚀 **Vercel** (deploy + CDN)

### Qualidade de Código
- 📊 **SonarCloud** (análise estática)
- 🔍 **ESLint 9** (linting)
- 🎯 **GitHub Actions** (CI/CD)

---

## 🚀 Começando

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase (para backend)
- Conta no Mercado Pago (para pagamentos)

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/grod88/palestra-baby-mktplace.git
   cd palestra-baby-mktplace
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   
   Edite `.env` e preencha:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_anon_key
   VITE_MERCADO_PAGO_PUBLIC_KEY=sua_public_key
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   
   Aplicação estará em: http://localhost:8080

---

## 🧪 Scripts Disponíveis

```bash
npm run dev          # Dev server (localhost:8080)
npm run build        # Build de produção (tsc + vite)
npm run preview      # Preview do build (localhost:4173)
npm run lint         # Executar ESLint
npm run lint:fix     # Corrigir erros do ESLint automaticamente
npm test             # Executar testes (Vitest)
npm run test:watch   # Testes em modo watch
npm run test:coverage # Cobertura de testes
```

---

## 📁 Estrutura do Projeto

```
palestra-baby-mktplace/
├── src/
│   ├── pages/              # Páginas (rotas)
│   │   ├── Index.tsx       # Home
│   │   ├── Produtos.tsx    # Listagem
│   │   ├── Produto.tsx     # Detalhe
│   │   ├── Checkout.tsx    # Checkout
│   │   └── admin/          # Admin panel
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── layout/         # Header, Footer, etc
│   │   ├── home/           # Componentes da home
│   │   ├── products/       # Componentes de produtos
│   │   ├── cart/           # Carrinho
│   │   └── checkout/       # Checkout
│   ├── hooks/              # Custom hooks
│   │   ├── useCart.ts      # Carrinho (Zustand)
│   │   ├── useProducts.ts  # Produtos (React Query)
│   │   └── useCheckout.ts  # Checkout
│   ├── lib/                # Utilitários
│   │   ├── supabase.ts     # Cliente Supabase
│   │   ├── utils.ts        # Funções helpers
│   │   └── checkout-api.ts # API de checkout
│   ├── types/              # Interfaces TypeScript
│   └── data/               # Dados estáticos (fallback)
├── supabase/
│   ├── schema.sql          # Schema do banco (21 tabelas)
│   ├── functions/          # Edge Functions
│   │   ├── process-order/
│   │   └── webhook-mercadopago/
│   └── migrations/
├── public/                 # Assets estáticos
├── vercel.json             # Config Vercel
├── DEPLOYMENT.md           # 📖 Guia completo de deploy
└── CLAUDE.md               # Instruções para AI agents
```

---

## 🚢 Deploy

### Deploy no Vercel (Frontend)

1. **Conecte o repositório ao Vercel:**
   - Acesse [vercel.com/new](https://vercel.com/new)
   - Importe o repositório do GitHub
   - Selecione framework: **Vite**

2. **Configure as variáveis de ambiente:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MERCADO_PAGO_PUBLIC_KEY`

3. **Deploy automático:**
   - Push no branch `main` → deploy automático
   - Pull requests → preview deploys

📖 **Guia completo:** Veja [DEPLOYMENT.md](./DEPLOYMENT.md) para instruções detalhadas de configuração do Supabase, Edge Functions, Mercado Pago e troubleshooting.

---

## 🗄️ Banco de Dados

O projeto usa **Supabase Postgres** com:
- 21 tabelas (produtos, pedidos, clientes, etc)
- Row Level Security (RLS) habilitado
- 11 enums customizados
- Functions SQL (match_embeddings, decrement_stock, etc)
- Materialized views para analytics

### Schema Principal

```sql
-- Catálogo
products, product_images, product_sizes, product_promotions, price_history

-- Clientes
customers, customer_addresses

-- Pedidos
orders, order_items, order_status_history

-- Promoções
coupons

-- Conteúdo
testimonials, faqs, banners

-- IA & Chat (pós-MVP)
chat_sessions, chat_messages, embeddings

-- WhatsApp (pós-MVP)
whatsapp_conversations, whatsapp_messages

-- Admin
analytics_events, audit_log
```

Veja `supabase/schema.sql` para o schema completo.

---

## 💳 Integração com Mercado Pago

### Métodos de Pagamento

- ✅ **PIX** (instantâneo)
- ✅ **Cartão de Crédito** (via Checkout Transparente)

### Fluxo de Pagamento

1. Frontend coleta dados do cliente e pedido
2. Chama Edge Function `process-order` (bypassa frontend)
3. Edge Function cria pedido no banco + payment no Mercado Pago
4. Retorna URL de checkout ou QR Code PIX
5. Webhook recebe notificação de pagamento
6. Atualiza status do pedido automaticamente

⚠️ **Segurança:** O `access_token` do Mercado Pago **NUNCA** fica exposto no frontend. Tudo passa por Edge Functions com `service_role`.

---

## 👨‍💼 Painel Administrativo

Acesse: `/admin/login`

### Funcionalidades

- 📊 **Dashboard:** Vendas, receita, produtos mais vendidos
- 📦 **Produtos:** CRUD completo + upload de imagens
- 📋 **Pedidos:** Visualização e atualização de status
- 📈 **Estoque:** Alertas de estoque baixo
- 🎟️ **Cupons:** Criar e gerenciar cupons de desconto (pós-MVP)
- 👥 **Clientes:** CRM básico (pós-MVP)

**Credenciais de teste:** Configure via SQL no Supabase (veja `DEPLOYMENT.md`).

---

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Modo watch (desenvolvimento)
npm run test:watch

# Cobertura de testes
npm run test:coverage
```

**Meta de cobertura:**
- MVP: 60%+
- Fase 2: 80%+

---

## 📊 Qualidade de Código

O projeto usa **SonarCloud** para análise contínua:

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=grod88_palestra-baby-mktplace&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=grod88_palestra-baby-mktplace)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=grod88_palestra-baby-mktplace&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=grod88_palestra-baby-mktplace)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=grod88_palestra-baby-mktplace&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=grod88_palestra-baby-mktplace)

**Métricas monitoradas:**
- Bugs e vulnerabilidades
- Code smells
- Duplicações
- Cobertura de testes
- Dívida técnica

---

## 🛣️ Roadmap

### ✅ Fase 1 — MVP (em andamento)
- [x] Setup do projeto (Vite + React + TypeScript)
- [x] Componentes UI (shadcn/ui)
- [x] Páginas principais (Home, Produtos, Checkout)
- [x] Carrinho de compras (Zustand)
- [x] Integração Supabase (React Query)
- [x] Integração Mercado Pago
- [x] Painel admin básico
- [x] Deploy Vercel + CI/CD
- [ ] Testes automatizados (60%+ cobertura)

### 🔲 Fase 2 — Pós-lançamento
- [ ] Sistema de cupons
- [ ] Embrulho para presente
- [ ] "Avise-me quando chegar"
- [ ] CRM de clientes
- [ ] Relatórios avançados

### 🔲 Fase 3 — Automação & IA
- [ ] Chat de atendimento (Claude AI + RAG)
- [ ] WhatsApp automatizado (Evolution API)
- [ ] Notificações de status via WhatsApp
- [ ] Recomendações de produtos (ML)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit suas mudanças: `git commit -m 'Adiciona nova feature'`
4. Push para a branch: `git push origin feature/nova-feature`
5. Abra um Pull Request

**Diretrizes:**
- Siga as convenções de código (ESLint)
- Adicione testes para novas features
- Atualize a documentação se necessário

---

## 📄 Licença

Este projeto é proprietário e não possui licença open source.

© 2024 Palestra Baby Marketplace. Todos os direitos reservados.

---

## 📞 Contato

- **Issues:** [github.com/grod88/palestra-baby-mktplace/issues](https://github.com/grod88/palestra-baby-mktplace/issues)
- **Email:** (adicionar e-mail de contato)

---

## 🙏 Agradecimentos

- [Palmeiras](https://www.palmeiras.com.br/) pela inspiração verde! 💚
- [shadcn/ui](https://ui.shadcn.com/) pelos componentes lindos
- [Supabase](https://supabase.com/) pelo backend incrível
- [Vercel](https://vercel.com/) pelo deploy fácil e rápido

---

**Feito com 💚 para pequenos palestrinos!** 🍼⚽
