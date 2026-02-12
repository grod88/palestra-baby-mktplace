# Copilot Instructions — Palestra Baby Marketplace

## Contexto
E-commerce React de roupas de bebê temáticas do Palmeiras.
Stack: React 18 + TypeScript + Vite + Tailwind CSS 3 + shadcn/ui + Supabase + Zustand.
Backend: Supabase Edge Functions (Deno/TypeScript). Não há backend Python.

## Regras obrigatórias

### Linguagem & Tipagem
- TypeScript sempre, nunca JavaScript puro
- Interfaces para props de componentes (não `type` aliases para props)
- Zod schemas para validação de dados externos (API, forms)

### Estilização
- Tailwind classes inline, NUNCA CSS modules ou styled-components
- Mobile-first: começar com classes base, adicionar `sm:`, `md:`, `lg:`
- Cores do projeto: usar variáveis CSS customizadas (verde-escuro, verde-medio, cream, gold)

### Componentes
- Usar shadcn/ui de `@/components/ui/`. Não instalar Material UI, Chakra, Ant Design, Bootstrap
- Componentes novos em `src/components/{domain}/` (home, products, cart, checkout, admin)
- Páginas em `src/pages/`

### Estado
- Zustand para estado global (ex: carrinho)
- React Query para server state (fetch/cache do Supabase)
- Não usar Redux, MobX, Context API para estado global
- useState/useReducer apenas para estado local do componente

### Imports
- Alias `@/` para `src/` (ex: `@/components/ui/button`, `@/hooks/useCart`)
- Lucide React para ícones. Não usar Font Awesome, Hero Icons, Material Icons
- Sonner para toasts. Não usar react-toastify ou alert()
- Framer Motion para animações. Não usar react-spring

### Dados
- Supabase queries via React Query hooks em `@/hooks/`
- Nunca fazer fetch direto nos componentes
- Formulários: React Hook Form + Zod

## Segurança
- NUNCA expor SUPABASE_SERVICE_ROLE_KEY no frontend
- Sempre usar parameterized queries (`.eq()`, `.match()`)
- Sanitizar inputs do usuário
- Validar com Zod no frontend E no Edge Function
- Cuidado com dangerouslySetInnerHTML (evitar sempre que possível)

## Banco de dados
- Tabelas: snake_case, UUIDs como PK
- Todas as tabelas têm RLS habilitado
- Admin: `auth.jwt()->'app_metadata'->>'role' = 'admin'`
- Edge Functions usam service_role key (bypassa RLS)
- Schema completo em `supabase/schema.sql`

## Edge Functions (Supabase)
- Runtime: Deno (TypeScript)
- Cada função em `supabase/functions/{nome}/index.ts`
- Usar Supabase client com service_role para operações privilegiadas
- CORS headers obrigatórios
- Validar input com Zod
- Retornar JSON consistente: `{ data, error, message }`

## Testes
- Vitest + Testing Library
- Arquivos de teste: `*.test.ts` ou `*.test.tsx` junto ao arquivo testado
- Coverage mínimo target: 60% (MVP), 80% (fase 2)

## Padrões de código
- Componentes: PascalCase (ProductCard.tsx)
- Hooks: camelCase prefixado com `use` (useCart.ts)
- Rotas: kebab-case (/produto/:slug)
- Funções utilitárias: camelCase em `src/lib/`
- Constantes: UPPER_SNAKE_CASE
