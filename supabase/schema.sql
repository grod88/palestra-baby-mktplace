-- =============================================================================
-- Palestra Baby Design -- Complete Database Schema
-- Supabase (Postgres + pgvector)
-- =============================================================================
-- Run this in order. Idempotent where possible (IF NOT EXISTS).
-- After applying, enable RLS per table and create policies (section at the end).
-- =============================================================================

-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector for embeddings

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE product_category AS ENUM ('bodies', 'conjuntos', 'acessorios', 'kits');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending',      -- cart converted, awaiting payment
    'confirmed',    -- payment confirmed by gateway
    'paid',         -- money received
    'preparing',    -- being packed
    'shipped',      -- handed to carrier
    'delivered',    -- confirmed delivery
    'cancelled',    -- cancelled before shipment
    'returned'      -- post-delivery return
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'debit_card');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shipping_method AS ENUM ('pac', 'sedex', 'free');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE banner_placement AS ENUM ('hero', 'category', 'checkout', 'popup');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE analytics_event_type AS ENUM (
    'page_view',
    'product_view',
    'add_to_cart',
    'remove_from_cart',
    'cart_abandon',
    'begin_checkout',
    'purchase',
    'search'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('insert', 'update', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. PRODUCT CATALOG
-- =============================================================================

-- 2a. Products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  category          product_category NOT NULL,
  -- Pricing (current active price lives here for fast reads)
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  original_price    NUMERIC(10,2) CHECK (original_price IS NULL OR original_price >= price),
  -- Flags
  featured          BOOLEAN NOT NULL DEFAULT FALSE,
  active            BOOLEAN NOT NULL DEFAULT TRUE,       -- soft delete / hide
  -- Structured data stored as JSONB to avoid over-normalizing
  care_instructions TEXT[] NOT NULL DEFAULT '{}',          -- array of strings
  measurements      JSONB  NOT NULL DEFAULT '{}'::jsonb,   -- {"RN":"Altura: 50-55cm", ...}
  -- Shipping dimensions (Melhor Envio)
  weight_kg         DECIMAL(5,2) DEFAULT 0.3,              -- peso em kg
  height_cm         DECIMAL(5,1) DEFAULT 5,                -- altura em cm
  width_cm          DECIMAL(5,1) DEFAULT 20,               -- largura em cm
  length_cm         DECIMAL(5,1) DEFAULT 25,               -- comprimento em cm
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_slug     ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active   ON products (active)   WHERE active = TRUE;

-- 2b. Product images
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,                 -- Supabase Storage public URL
  alt_text   TEXT NOT NULL DEFAULT '',
  position   SMALLINT NOT NULL DEFAULT 0,   -- ordering (0 = primary)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id, position);

-- 2c. Product sizes / stock (one row per product-size combination)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_sizes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL,                 -- 'RN', 'P', 'M', 'G', 'Unico'
  stock      INT  NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku        TEXT,                          -- optional SKU per size
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, size_label)
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product ON product_sizes (product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_sku     ON product_sizes (sku) WHERE sku IS NOT NULL;

-- =============================================================================
-- 3. PRICING
-- =============================================================================

-- 3a. Promotional pricing (time-boxed price overrides)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  promo_price     NUMERIC(10,2) NOT NULL CHECK (promo_price >= 0),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  label           TEXT,                      -- e.g. "Black Friday", "Dia das Maes"
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_product_promotions_active
  ON product_promotions (product_id, starts_at, ends_at) WHERE active = TRUE;

-- 3b. Price history (append-only log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price   NUMERIC(10,2),
  new_price   NUMERIC(10,2) NOT NULL,
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history (product_id, changed_at DESC);

-- =============================================================================
-- 4. CUSTOMERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Link to Supabase Auth (nullable: guest checkout creates customer without auth)
  auth_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  cpf        TEXT,                          -- Brazilian tax ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_email   ON customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_auth_id ON customers (auth_id) WHERE auth_id IS NOT NULL;

-- Customer addresses (a customer may have multiple saved addresses)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label         TEXT NOT NULL DEFAULT 'Casa',  -- "Casa", "Trabalho", etc.
  cep           TEXT NOT NULL,
  street        TEXT NOT NULL,
  number        TEXT NOT NULL,
  complement    TEXT,
  neighborhood  TEXT NOT NULL,
  city          TEXT NOT NULL,
  state         CHAR(2) NOT NULL,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses (customer_id);

-- =============================================================================
-- 5. ORDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  -- Status
  status            order_status NOT NULL DEFAULT 'pending',
  -- Shipping snapshot (denormalized so it survives address edits)
  shipping_method   shipping_method NOT NULL,
  shipping_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_name     TEXT NOT NULL,
  shipping_cep      TEXT NOT NULL,
  shipping_street   TEXT NOT NULL,
  shipping_number   TEXT NOT NULL,
  shipping_complement TEXT,
  shipping_neighborhood TEXT NOT NULL,
  shipping_city     TEXT NOT NULL,
  shipping_state    CHAR(2) NOT NULL,
  tracking_code     TEXT,
  -- Shipping service details (Melhor Envio)
  shipping_service_id    INTEGER,
  shipping_service_name  TEXT,
  shipping_company       TEXT,
  shipping_delivery_days INTEGER,
  -- Payment
  payment_method    payment_method NOT NULL,
  payment_id        TEXT,                    -- Mercado Pago external reference
  -- Mercado Pago details
  mp_payment_id     TEXT,
  mp_payment_status TEXT,
  mp_payment_method TEXT,
  mp_installments   INTEGER DEFAULT 1,
  -- Totals
  subtotal          NUMERIC(10,2) NOT NULL,
  discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total             NUMERIC(10,2) NOT NULL,
  -- Coupon (nullable)
  coupon_id         UUID,                    -- FK added after coupons table
  -- Notes
  customer_notes    TEXT,
  admin_notes       TEXT,
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at           TIMESTAMPTZ,
  shipped_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created  ON orders (created_at DESC);

-- Order items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  -- Snapshot at time of purchase (prices may change later)
  product_name TEXT NOT NULL,
  size        TEXT NOT NULL,
  quantity    INT  NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

-- Order status history (append-only log for lifecycle tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status order_status,
  new_status order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history (order_id, created_at DESC);

-- =============================================================================
-- 6. PROMOTIONS / COUPONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  discount_type   discount_type NOT NULL,
  discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC(10,2),                  -- NULL = no minimum
  max_uses        INT,                             -- NULL = unlimited
  used_count      INT NOT NULL DEFAULT 0,
  -- Scope (NULL = applies to everything)
  category        product_category,                -- limit to category
  -- Validity
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code ON coupons (UPPER(code));

-- Now add the FK from orders -> coupons
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS fk_orders_coupon;
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_coupon
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

-- =============================================================================
-- 6b. ADMIN OTP CODES (MFA by email)
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_otp_codes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,                -- bcrypt hash of 6-digit code
  expires_at TIMESTAMPTZ NOT NULL,         -- created_at + 5 minutes
  used       BOOLEAN DEFAULT FALSE,
  attempts   INTEGER DEFAULT 0,            -- max 3 attempts
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_otp_expires ON admin_otp_codes(expires_at) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_otp_user    ON admin_otp_codes(user_id, created_at DESC);

-- =============================================================================
-- 7. CONTENT (public-facing)
-- =============================================================================

-- Testimonials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  avatar_url TEXT,
  text       TEXT NOT NULL,
  rating     SMALLINT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  position   SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FAQs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faqs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  position   SMALLINT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Banners (hero, popups, category headers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT,
  subtitle    TEXT,
  image_url   TEXT NOT NULL,
  link_url    TEXT,
  placement   banner_placement NOT NULL DEFAULT 'hero',
  position    SMALLINT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON banners (placement, position) WHERE active = TRUE;

-- =============================================================================
-- 8. AI / CHAT (RAG with pgvector)
-- =============================================================================

-- Chat sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- Anonymous sessions use a fingerprint/cookie ID
  anonymous_id TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_customer ON chat_sessions (customer_id) WHERE customer_id IS NOT NULL;

-- Chat messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        chat_role NOT NULL,
  content     TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- token counts, model, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id, created_at);

-- Embeddings store for RAG (product descriptions, FAQs, policies, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Source reference (polymorphic)
  source_type TEXT NOT NULL,       -- 'product', 'faq', 'policy', 'page'
  source_id   UUID,                -- FK to the source table row (nullable for raw text)
  -- Content
  content     TEXT NOT NULL,       -- the chunk of text that was embedded
  -- Vector (OpenAI text-embedding-3-small = 1536 dims)
  embedding   vector(1536) NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
  ON embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings (source_type, source_id);

-- =============================================================================
-- 9. WHATSAPP INTEGRATION
-- =============================================================================

-- WhatsApp conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  -- Latest message preview
  last_message TEXT,
  last_at      TIMESTAMPTZ,
  is_open      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON whatsapp_conversations (phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_conv_open  ON whatsapp_conversations (is_open) WHERE is_open = TRUE;

-- WhatsApp messages (queue + history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction       whatsapp_direction NOT NULL,
  status          whatsapp_status NOT NULL DEFAULT 'queued',
  content         TEXT NOT NULL,
  -- External IDs from the WhatsApp API provider
  external_id     TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_conv   ON whatsapp_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_status ON whatsapp_messages (status) WHERE status = 'queued';

-- =============================================================================
-- 10. ANALYTICS EVENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   analytics_event_type NOT NULL,
  -- Who
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  anonymous_id TEXT,                          -- cookie / fingerprint for guests
  -- What
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  -- Context
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- e.g. { "query": "body verde", "page": "/produtos", "cart_value": 129.90,
  --        "size": "M", "quantity": 2, "source": "whatsapp" }
  page_url     TEXT,
  referrer     TEXT,
  user_agent   TEXT,
  ip_address   INET,
  -- When
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partition-friendly index for time-range queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time
  ON analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product
  ON analytics_events (product_id, created_at DESC) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_customer
  ON analytics_events (customer_id) WHERE customer_id IS NOT NULL;

-- =============================================================================
-- 11. ADMIN AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      audit_action NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table  ON audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_time   ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user   ON audit_log (changed_by) WHERE changed_by IS NOT NULL;

-- =============================================================================
-- 12. HELPER FUNCTIONS
-- =============================================================================

-- Auto-update updated_at on any table that has the column
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I; '
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- Similarity search function for RAG
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_count     INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7,
  filter_source   TEXT DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  source_type TEXT,
  source_id   UUID,
  content     TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.source_type,
    e.source_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE (filter_source IS NULL OR e.source_type = filter_source)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Decrement stock on order confirmation (call from Edge Function / trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id UUID,
  p_size_label TEXT,
  p_quantity   INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE product_sizes
  SET stock = stock - p_quantity,
      updated_at = now()
  WHERE product_id = p_product_id
    AND size_label = p_size_label
    AND stock >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product % size %', p_product_id, p_size_label;
  END IF;
END;
$$;

-- Increment stock (used by webhook on cancellation / refund)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_stock(
  p_product_id UUID,
  p_size_label TEXT,
  p_quantity   INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE product_sizes
  SET stock = stock + p_quantity,
      updated_at = now()
  WHERE product_id = p_product_id
    AND size_label = p_size_label;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product size not found for product % size %', p_product_id, p_size_label;
  END IF;
END;
$$;

-- Increment coupon usage count (called after order creation)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_coupon_usage(
  p_coupon_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE coupons
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = p_coupon_id;
END;
$$;

-- =============================================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Enable RLS on ALL tables. Supabase requires this for security.
-- Policies follow the principle: public reads for catalog/content,
-- authenticated writes for orders, service_role for admin/analytics.

ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_promotions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials          ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;

-- -------------------------
-- PUBLIC READ (anon + authenticated)
-- -------------------------

-- Product catalog: anyone can read active products
CREATE POLICY "Products are publicly readable"
  ON products FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Product images are publicly readable"
  ON product_images FOR SELECT
  USING (TRUE);

CREATE POLICY "Product sizes are publicly readable"
  ON product_sizes FOR SELECT
  USING (TRUE);

CREATE POLICY "Active promotions are publicly readable"
  ON product_promotions FOR SELECT
  USING (active = TRUE AND now() BETWEEN starts_at AND ends_at);

CREATE POLICY "Active coupons are publicly readable"
  ON coupons FOR SELECT
  USING (active = TRUE AND (expires_at IS NULL OR expires_at > now()));

-- Content: anyone can read active content
CREATE POLICY "Testimonials are publicly readable"
  ON testimonials FOR SELECT
  USING (active = TRUE);

CREATE POLICY "FAQs are publicly readable"
  ON faqs FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Active banners are publicly readable"
  ON banners FOR SELECT
  USING (active = TRUE AND (starts_at IS NULL OR now() >= starts_at)
                       AND (ends_at IS NULL OR now() <= ends_at));

-- Embeddings: readable by authenticated (used by Edge Functions / AI chat)
CREATE POLICY "Embeddings readable by authenticated"
  ON embeddings FOR SELECT
  TO authenticated
  USING (TRUE);

-- -------------------------
-- CUSTOMER SELF-ACCESS
-- -------------------------

-- Customers can read/update their own row
CREATE POLICY "Customers can view own profile"
  ON customers FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Customers can update own profile"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Addresses
CREATE POLICY "Customers can manage own addresses"
  ON customer_addresses FOR ALL
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));

-- Orders: customers see their own orders
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));

CREATE POLICY "Customers can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE c.auth_id = auth.uid()
  ));

-- -------------------------
-- INSERT POLICIES (checkout flow -- uses service_role or anon insert)
-- -------------------------

-- Orders and customers are created by Edge Functions using service_role key,
-- so they bypass RLS. For direct anon inserts (analytics), we allow:

CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (TRUE);

-- Chat: anyone can create sessions and messages (anonymous chat support)
CREATE POLICY "Anyone can create chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Anyone can insert chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can read own chat sessions"
  ON chat_sessions FOR SELECT
  USING (
    anonymous_id IS NOT NULL  -- anonymous sessions readable by anyone who has the ID
    OR customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can read own chat messages"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions
      WHERE anonymous_id IS NOT NULL
        OR customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
    )
  );

-- -------------------------
-- ADMIN (service_role bypasses RLS, but for dashboard users with is_admin claim):
-- -------------------------
-- NOTE: Admin policies use auth.jwt() -> 'app_metadata' -> 'role' = 'admin'.
-- Set this via Supabase dashboard or: supabase auth admin update-user <uid> --data '{"app_metadata":{"role":"admin"}}'

CREATE POLICY "Admins have full access to products"
  ON products FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins have full access to product_images"
  ON product_images FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins have full access to product_sizes"
  ON product_sizes FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins have full access to orders"
  ON orders FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins have full access to order_items"
  ON order_items FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins have full access to testimonials"
  ON testimonials FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins have full access to faqs"
  ON faqs FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins have full access to banners"
  ON banners FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins have full access to coupons"
  ON coupons FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins can read audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins can read price history"
  ON price_history FOR SELECT
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins can manage embeddings"
  ON embeddings FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins can manage whatsapp conversations"
  ON whatsapp_conversations FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins can manage whatsapp messages"
  ON whatsapp_messages FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins can read all analytics"
  ON analytics_events FOR SELECT
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins can read order status history"
  ON order_status_history FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

CREATE POLICY "Admins can manage product promotions"
  ON product_promotions FOR ALL
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- =============================================================================
-- 14. SEED DATA (matches current static data in src/data/products.ts)
-- =============================================================================

-- Insert products
INSERT INTO products (id, name, slug, price, original_price, description, short_description, category, featured, care_instructions, measurements)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Body Listrado Verde/Branco', 'body-listrado-verde-branco', 59.90, NULL,
   'Body em algodao premium com listras nas cores do Verdao. Perfeito para os pequenos torcedores que ja nascem campeoes! Tecido macio e confortavel, ideal para o dia a dia do bebe.',
   'Body listrado em algodao premium', 'bodies', TRUE,
   ARRAY['Lavar a maquina em agua fria', 'Nao usar alvejante', 'Secar a sombra', 'Passar em temperatura media'],
   '{"RN":"Altura: 50-55cm | Peso: ate 4kg","P":"Altura: 55-60cm | Peso: 4-6kg","M":"Altura: 60-65cm | Peso: 6-9kg","G":"Altura: 65-72cm | Peso: 9-12kg"}'::jsonb),

  ('a1b2c3d4-0002-4000-8000-000000000002', 'Conjunto Alviverde Completo', 'conjunto-alviverde-completo', 129.90, 159.90,
   'Conjunto completo com body, calca e touca nas cores alviverde. Fabricado com algodao organico certificado.',
   'Conjunto 3 pecas algodao organico', 'conjuntos', TRUE,
   ARRAY['Lavar a maquina em agua fria', 'Nao usar alvejante', 'Secar a sombra', 'Passar em temperatura media'],
   '{"RN":"Altura: 50-55cm | Peso: ate 4kg","P":"Altura: 55-60cm | Peso: 4-6kg","M":"Altura: 60-65cm | Peso: 6-9kg","G":"Altura: 65-72cm | Peso: 9-12kg"}'::jsonb),

  ('a1b2c3d4-0003-4000-8000-000000000003', 'Macacao Campeao', 'macacao-campeao', 89.90, NULL,
   'Macacao quentinho para os dias mais frios. Design exclusivo com detalhes bordados, ziper frontal.',
   'Macacao com ziper frontal', 'conjuntos', TRUE,
   ARRAY['Lavar a maquina em agua fria', 'Nao usar alvejante', 'Secar a sombra', 'Passar em temperatura baixa'],
   '{"RN":"Altura: 50-55cm | Peso: ate 4kg","P":"Altura: 55-60cm | Peso: 4-6kg","M":"Altura: 60-65cm | Peso: 6-9kg","G":"Altura: 65-72cm | Peso: 9-12kg"}'::jsonb),

  ('a1b2c3d4-0004-4000-8000-000000000004', 'Kit 3 Bodies', 'kit-3-bodies', 149.90, 179.90,
   'Kit economico com 3 bodies em cores diferentes: verde, branco e listrado.',
   'Kit com 3 bodies sortidos', 'kits', TRUE,
   ARRAY['Lavar a maquina em agua fria', 'Nao usar alvejante', 'Secar a sombra', 'Passar em temperatura media'],
   '{"RN":"Altura: 50-55cm | Peso: ate 4kg","P":"Altura: 55-60cm | Peso: 4-6kg","M":"Altura: 60-65cm | Peso: 6-9kg","G":"Altura: 65-72cm | Peso: 9-12kg"}'::jsonb),

  ('a1b2c3d4-0005-4000-8000-000000000005', 'Sapatinho Primeiro Gol', 'sapatinho-primeiro-gol', 49.90, NULL,
   'Sapatinho de bebe em formato de chuteira. Super fofo e confortavel, com elastico.',
   'Sapatinho formato chuteira', 'acessorios', FALSE,
   ARRAY['Lavar a mao', 'Nao torcer', 'Secar a sombra'],
   '{"RN":"Sola: 9cm","P":"Sola: 10cm","M":"Sola: 11cm"}'::jsonb),

  ('a1b2c3d4-0006-4000-8000-000000000006', 'Babador Hora do Gol', 'babador-hora-do-gol', 29.90, NULL,
   'Babador impermeavel com estampa divertida "Hora do Gol".',
   'Babador impermeavel divertido', 'acessorios', FALSE,
   ARRAY['Limpar com pano umido', 'Lavar a mao se necessario', 'Nao passar'],
   '{"Unico":"Largura: 20cm | Altura: 25cm"}'::jsonb),

  ('a1b2c3d4-0007-4000-8000-000000000007', 'Manta Verdao', 'manta-verdao', 79.90, NULL,
   'Manta soft ultra macia nas cores do Palmeiras. Perfeita para aquecer o bebe.',
   'Manta soft com bordado', 'acessorios', TRUE,
   ARRAY['Lavar a maquina em agua fria', 'Nao usar alvejante', 'Secar em temperatura baixa', 'Nao passar'],
   '{"Unico":"80cm x 100cm"}'::jsonb),

  ('a1b2c3d4-0008-4000-8000-000000000008', 'Kit Presente Nascimento', 'kit-presente-nascimento', 199.90, 249.90,
   'O presente perfeito para o nascimento do pequeno palmeirense! Kit completo.',
   'Kit completo para presente', 'kits', TRUE,
   ARRAY['Verificar instrucoes individuais de cada peca'],
   '{"RN":"Altura: 50-55cm | Peso: ate 4kg","P":"Altura: 55-60cm | Peso: 4-6kg","M":"Altura: 60-65cm | Peso: 6-9kg"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Insert product sizes with initial stock
INSERT INTO product_sizes (product_id, size_label, stock) VALUES
  -- Body Listrado
  ('a1b2c3d4-0001-4000-8000-000000000001', 'RN', 10),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'P', 15),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'M', 15),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'G', 10),
  -- Conjunto Alviverde
  ('a1b2c3d4-0002-4000-8000-000000000002', 'RN', 8),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'P', 12),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'M', 12),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'G', 8),
  -- Macacao Campeao
  ('a1b2c3d4-0003-4000-8000-000000000003', 'RN', 8),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'P', 10),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'M', 10),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'G', 8),
  -- Kit 3 Bodies
  ('a1b2c3d4-0004-4000-8000-000000000004', 'RN', 5),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'P', 8),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'M', 8),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'G', 5),
  -- Sapatinho
  ('a1b2c3d4-0005-4000-8000-000000000005', 'RN', 12),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'P', 15),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'M', 10),
  -- Babador (tamanho unico)
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Unico', 20),
  -- Manta (tamanho unico)
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Unico', 15),
  -- Kit Presente
  ('a1b2c3d4-0008-4000-8000-000000000008', 'RN', 5),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'P', 8),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'M', 5)
ON CONFLICT (product_id, size_label) DO NOTHING;

-- Seed testimonials
INSERT INTO testimonials (name, avatar_url, text, rating, position) VALUES
  ('Mariana Silva', NULL, 'A qualidade e incrivel! Meu bebe fica super confortavel e lindo com as roupinhas. O atendimento tambem e excelente!', 5, 0),
  ('Pedro Santos', NULL, 'Comprei o kit presente para meu sobrinho e foi um sucesso! A caixa veio linda e as pecas sao de altissima qualidade.', 5, 1),
  ('Juliana Costa', NULL, 'Ja e a terceira compra e sempre supera minhas expectativas. Entrega rapida e produtos impecaveis. Super recomendo!', 5, 2)
ON CONFLICT DO NOTHING;

-- Seed FAQs
INSERT INTO faqs (question, answer, position) VALUES
  ('Qual o prazo de entrega?', 'O prazo de entrega varia de acordo com a sua regiao. Apos a postagem, entregas para Sao Paulo capital levam de 2 a 3 dias uteis. Para outras regioes, o prazo e de 5 a 10 dias uteis.', 0),
  ('Como escolher o tamanho correto?', 'Disponibilizamos uma tabela de medidas detalhada em cada produto. Recomendamos medir o bebe e comparar com nossa tabela. Em caso de duvida, nosso atendimento via WhatsApp pode ajudar!', 1),
  ('Posso trocar ou devolver um produto?', 'Sim! Aceitamos trocas e devolucoes em ate 30 dias apos o recebimento, desde que o produto esteja sem uso e com etiquetas originais.', 2),
  ('Os produtos sao oficiais do Palmeiras?', 'Nossos produtos sao inspirados nas cores e no espirito do Palmeiras, criados especialmente para bebes. Sao pecas autorais da Palestra Baby.', 3),
  ('Quais formas de pagamento sao aceitas?', 'Aceitamos PIX, cartao de credito (ate 3x sem juros) e cartao de debito. O PIX oferece 5% de desconto no valor total da compra!', 4),
  ('Como cuidar das roupinhas?', 'Recomendamos lavar as pecas a maquina com agua fria, usar sabao neutro e secar a sombra. Evite alvejantes e amaciantes com fragancias fortes.', 5)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Done. Summary:
--   21 tables, 11 enums, 3 functions, ~40 indexes, full RLS with policies
-- =============================================================================
