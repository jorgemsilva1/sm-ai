ALTER TABLE public.client_social_accounts
  ADD COLUMN IF NOT EXISTS refresh_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS page_access_token text,
  ADD COLUMN IF NOT EXISTS page_id text,
  ADD COLUMN IF NOT EXISTS token_status text DEFAULT 'active'
    CHECK (token_status IN ('active', 'expiring_soon', 'expired', 'revoked'));
