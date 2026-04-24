CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_item_id uuid REFERENCES public.client_schedule_items(id) ON DELETE SET NULL,
  social_account_id uuid REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  platform text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'boost' CHECK (campaign_type IN ('boost', 'campaign')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'completed', 'failed')),
  external_campaign_id text,
  external_adset_id text,
  external_ad_id text,
  name text NOT NULL,
  daily_budget_cents integer,
  total_budget_cents integer,
  currency text DEFAULT 'USD',
  start_date timestamptz,
  end_date timestamptz,
  targeting jsonb DEFAULT '{}'::jsonb,
  results jsonb DEFAULT '{}'::jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ad campaigns are viewable by owner"
  ON public.ad_campaigns FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Ad campaigns are insertable by owner"
  ON public.ad_campaigns FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Ad campaigns are updatable by owner"
  ON public.ad_campaigns FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Ad campaigns are deletable by owner"
  ON public.ad_campaigns FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_client ON public.ad_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_item ON public.ad_campaigns(schedule_item_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
