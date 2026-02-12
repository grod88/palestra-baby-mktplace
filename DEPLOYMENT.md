# 🚀 Guia de Deploy — Palestra Baby Marketplace

Este documento descreve o processo completo de deploy da aplicação no Vercel e configuração do Supabase para produção.

## 📋 Pré-requisitos

- [ ] Conta no [Vercel](https://vercel.com)
- [ ] Conta no [Supabase](https://supabase.com)
- [ ] Conta no [Mercado Pago](https://www.mercadopago.com.br/developers)
- [ ] Repositório GitHub configurado
- [ ] Node.js 18+ instalado localmente

---

## 🗄️ Parte 1: Configuração do Supabase (Backend)

### 1.1. Criar projeto no Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `palestra-baby-prod` (ou nome de sua escolha)
   - **Database Password:** Gere uma senha forte (salve em local seguro!)
   - **Region:** South America (São Paulo) — `sa-east-1`
   - **Pricing Plan:** Free (para testes) ou Pro (produção)
4. Aguarde ~2 minutos para provisionamento

### 1.2. Configurar Database Schema

1. No dashboard do Supabase, vá em **SQL Editor**
2. Copie todo o conteúdo de `supabase/schema.sql`
3. Cole no editor e clique em **"Run"**
4. Verifique se todas as tabelas foram criadas:
   - Vá em **Table Editor** e confirme 21 tabelas criadas

### 1.3. Configurar Storage

1. Vá em **Storage** no menu lateral
2. Clique em **"Create Bucket"**
3. Configure:
   - **Name:** `product-images`
   - **Public:** ✅ (marque como público)
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`
4. Clique em **"Create bucket"**

### 1.4. Configurar Authentication

1. Vá em **Authentication > Providers**
2. Confirme que **Email** está habilitado
3. Em **Email Templates**, personalize se desejar
4. Em **Policies**, confirme que RLS está habilitado

### 1.5. Criar usuário Admin

Execute no SQL Editor:

```sql
-- Criar usuário admin
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@palestrababy.com', -- Altere para seu e-mail
  crypt('SUA_SENHA_AQUI', gen_salt('bf')), -- Altere para sua senha
  NOW(),
  '{"role": "admin"}'::jsonb,
  '{"name": "Admin"}'::jsonb,
  NOW(),
  NOW()
);
```

### 1.6. Deploy Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login no Supabase
supabase login

# Linkar projeto (copie o Project ID do dashboard)
supabase link --project-ref SEU_PROJECT_ID

# Deploy das Edge Functions
supabase functions deploy process-order
supabase functions deploy webhook-mercadopago

# Configurar secrets (substitua pelos valores reais)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=your_mp_access_token
```

### 1.7. Anotar credenciais do Supabase

Vá em **Settings > API** e anote:

- ✅ **Project URL:** `https://xxxxxxxxxxxx.supabase.co`
- ✅ **Anon/Public Key:** `eyJhbGc...` (começa com `eyJ`)
- ✅ **Service Role Key:** `eyJhbGc...` ⚠️ **NUNCA exponha no frontend!**

---

## ☁️ Parte 2: Deploy no Vercel (Frontend)

### 2.1. Conectar Repositório

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **"Import Git Repository"**
3. Selecione o repositório **grod88/palestra-baby-mktplace**
4. Clique em **"Import"**

### 2.2. Configurar Build Settings

Na tela de configuração:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Node Version:** 18.x

### 2.3. Configurar Environment Variables

Ainda na mesma tela, expanda **"Environment Variables"** e adicione:

| Key | Value | Ambientes |
|-----|-------|-----------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (anon key) | Production, Preview, Development |
| `VITE_MERCADO_PAGO_PUBLIC_KEY` | `APP_USR-...` (public key) | Production, Preview, Development |

⚠️ **ATENÇÃO:**
- Use apenas variáveis com prefixo `VITE_` no frontend
- NUNCA adicione `SUPABASE_SERVICE_ROLE_KEY` aqui (apenas no Supabase Secrets)

### 2.4. Deploy

1. Clique em **"Deploy"**
2. Aguarde ~2-3 minutos
3. Vercel executará:
   - `npm install`
   - `npm run build`
   - Upload dos arquivos estáticos
4. Ao final, receberá uma URL: `https://palestra-baby-mktplace.vercel.app`

### 2.5. Configurar Domínio Customizado (Opcional)

1. Vá em **Settings > Domains**
2. Adicione seu domínio (ex: `palestrababy.com.br`)
3. Configure os registros DNS no seu provedor:
   - **Tipo A:** aponte para o IP do Vercel
   - **Tipo CNAME:** `cname.vercel-dns.com`
4. Aguarde propagação DNS (~24h)

---

## 💳 Parte 3: Configuração do Mercado Pago

### 3.1. Criar Aplicação

1. Acesse [developers.mercadopago.com.br](https://www.mercadopago.com.br/developers/panel)
2. Vá em **"Suas integrações"** > **"Criar aplicação"**
3. Configure:
   - **Nome:** Palestra Baby Marketplace
   - **Integração:** E-commerce
   - **Produtos:** Checkout Transparente + PIX
4. Clique em **"Criar aplicação"**

### 3.2. Configurar Credenciais

1. Em **Credenciais**, copie:
   - **Public Key (Produção):** `APP_USR-xxxxx` → Usar no `VITE_MERCADO_PAGO_PUBLIC_KEY`
   - **Access Token (Produção):** `APP_USR-xxxxx` → Usar no Supabase Secret `MERCADO_PAGO_ACCESS_TOKEN`

⚠️ **IMPORTANTE:**
- Comece com credenciais de **Teste** (sandbox)
- Após validar funcionamento, troque para **Produção**

### 3.3. Configurar Webhooks

1. Em **Webhooks**, clique em **"Adicionar endpoint"**
2. Configure:
   - **URL:** `https://xxxx.supabase.co/functions/v1/webhook-mercadopago`
   - **Eventos:** `payment`, `merchant_order`
3. Salve e anote o **Secret** gerado

Adicione o webhook secret no Supabase:

```bash
supabase secrets set MERCADO_PAGO_WEBHOOK_SECRET=your_webhook_secret
```

---

## ✅ Parte 4: Validação e Testes

### 4.1. Checklist de Deploy

- [ ] Build do Vercel passou sem erros
- [ ] Aplicação acessível na URL do Vercel
- [ ] Header e Footer carregando corretamente
- [ ] Página inicial exibindo produtos
- [ ] Supabase conectado (produtos carregam do banco)
- [ ] Carrinho funcionando (adicionar/remover itens)
- [ ] Checkout acessível e formulário renderizando
- [ ] Imagens de produtos carregando do Supabase Storage

### 4.2. Testar Fluxo de Compra

1. **Adicionar produto ao carrinho:**
   - Vá na home ou página de produtos
   - Clique em "Adicionar ao Carrinho"
   - Verifique contador no header

2. **Preencher dados de entrega:**
   - Clique no ícone do carrinho
   - Prossiga para checkout
   - Preencha CEP (use um CEP válido de teste: `01310-100`)
   - Preencha nome, e-mail, CPF, telefone

3. **Selecionar frete e pagamento:**
   - Escolha PAC, SEDEX ou Frete Grátis
   - Selecione método de pagamento (PIX ou Cartão)

4. **Finalizar pedido:**
   - Clique em "Finalizar Pedido"
   - Aguarde redirecionamento para Mercado Pago (em produção) ou tela de confirmação
   - Em modo teste, use [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-test/test-cards)

### 4.3. Testar Admin Panel

1. Acesse: `https://seu-dominio.vercel.app/admin/login`
2. Faça login com as credenciais criadas na etapa 1.5
3. Verifique:
   - [ ] Dashboard carregando estatísticas
   - [ ] Lista de produtos
   - [ ] Criar/editar produto
   - [ ] Upload de imagem
   - [ ] Lista de pedidos
   - [ ] Atualizar status de pedido

---

## 🔧 Troubleshooting

### Erro: "Failed to fetch" ao carregar produtos

**Causa:** Variáveis `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` incorretas.

**Solução:**
1. Vá em Vercel > Settings > Environment Variables
2. Verifique se as variáveis estão corretas
3. Clique em "Redeploy" após alterar

### Erro: "Network error" no checkout

**Causa:** Edge Function `process-order` não deployada ou sem secrets.

**Solução:**
```bash
supabase functions deploy process-order
supabase secrets list # Verificar se secrets estão configurados
```

### Build falha no Vercel

**Causa:** Erros TypeScript ou dependências faltando.

**Solução:**
1. Rode localmente: `npm run build`
2. Corrija erros apontados
3. Commit e push das correções
4. Vercel redeploy automaticamente

### Imagens não carregam

**Causa:** Bucket `product-images` não público ou imagens não upadas.

**Solução:**
1. Supabase > Storage > product-images
2. Clique no bucket > Settings
3. Marque "Public bucket"
4. Faça upload manual de imagens ou via admin panel

### Mercado Pago retorna erro

**Causa:** Credenciais inválidas ou em modo sandbox.

**Solução:**
1. Mercado Pago Developers > Credenciais
2. Certifique-se de usar **Produção** (não Teste)
3. Atualize `VITE_MERCADO_PAGO_PUBLIC_KEY` no Vercel
4. Atualize `MERCADO_PAGO_ACCESS_TOKEN` no Supabase

---

## 📊 Monitoramento

### Vercel Analytics

1. Vá em **Analytics** no dashboard do Vercel
2. Visualize:
   - Page views
   - Top pages
   - Visitors
   - Performance metrics

### Supabase Logs

1. Vá em **Logs** no dashboard do Supabase
2. Filtre por:
   - **API:** Queries SQL
   - **Auth:** Logins/signups
   - **Functions:** Edge Functions executions
   - **Storage:** Uploads/downloads

### Mercado Pago Webhooks

1. Vá em **Webhooks** no painel do Mercado Pago
2. Visualize histórico de eventos recebidos
3. Depure erros de processamento

---

## 🔄 Atualizações e Re-deploy

### Deploy Automático (Recomendado)

O Vercel está configurado para deploy automático:
1. Faça commit e push no branch `main`
2. Vercel detecta mudanças
3. Executa build automaticamente
4. Deploy em ~2 minutos

### Deploy Manual

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## 📝 Notas Finais

- **Backup:** Supabase faz backup automático diário (plano pago)
- **SSL:** Vercel fornece SSL automático e gratuito
- **CDN:** Assets são servidos via CDN global do Vercel
- **Logs:** Retenção de 7 dias (Free) ou 30 dias (Pro)
- **Limites Free Tier:**
  - Vercel: 100 GB bandwidth/mês
  - Supabase: 500 MB database, 1 GB storage, 2 GB transfer

---

## 🆘 Suporte

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Mercado Pago Docs:** [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
- **Issues do Projeto:** [github.com/grod88/palestra-baby-mktplace/issues](https://github.com/grod88/palestra-baby-mktplace/issues)

---

**Documento atualizado:** 2024-02-12  
**Versão:** 1.0.0
