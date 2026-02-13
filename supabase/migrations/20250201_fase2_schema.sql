-- =============================================================================
-- FASE 2 — Migration: Admin OTP + Product Dimensions + Order Extras
-- =============================================================================

-- 1. Admin OTP codes (MFA by email)
-- ---------------------------------------------------------------------------
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
-- No public policies — access only via Edge Functions with service_role

CREATE INDEX IF NOT EXISTS idx_otp_expires
  ON admin_otp_codes(expires_at) WHERE used = FALSE;

CREATE INDEX IF NOT EXISTS idx_otp_user
  ON admin_otp_codes(user_id, created_at DESC);

-- 2. Product dimensions for shipping calculation (Melhor Envio)
-- ---------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2) DEFAULT 0.3;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,1) DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm  DECIMAL(5,1) DEFAULT 20;
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm DECIMAL(5,1) DEFAULT 25;

COMMENT ON COLUMN products.weight_kg IS 'Peso em kg para cálculo de frete';
COMMENT ON COLUMN products.height_cm IS 'Altura em cm da embalagem';
COMMENT ON COLUMN products.width_cm  IS 'Largura em cm da embalagem';
COMMENT ON COLUMN products.length_cm IS 'Comprimento em cm da embalagem';

-- 3. Orders — extra columns for Melhor Envio + Mercado Pago details
-- ---------------------------------------------------------------------------

-- Shipping service details (Melhor Envio)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service_id    INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service_name  TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_company       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_delivery_days INTEGER;

-- Mercado Pago payment details
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_payment_id     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_payment_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_installments   INTEGER DEFAULT 1;
