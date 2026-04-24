-- Add publishing-related columns
ALTER TABLE public.client_schedule_items
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS publish_job_id text,
  ADD COLUMN IF NOT EXISTS social_account_id uuid REFERENCES public.client_social_accounts(id) ON DELETE SET NULL;

-- Index for finding posts to publish
CREATE INDEX IF NOT EXISTS idx_schedule_items_status_scheduled
  ON public.client_schedule_items (status, scheduled_at)
  WHERE status IN ('scheduled', 'publishing');
