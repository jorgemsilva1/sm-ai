CREATE TABLE IF NOT EXISTS public.post_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_item_id uuid NOT NULL REFERENCES public.client_schedule_items(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_id text,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  engagement integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  saves integer DEFAULT 0,
  video_views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  raw_data jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post analytics are viewable by owner"
  ON public.post_analytics FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Post analytics are insertable by owner"
  ON public.post_analytics FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Post analytics are updatable by owner"
  ON public.post_analytics FOR UPDATE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_post_analytics_item ON public.post_analytics(schedule_item_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_client ON public.post_analytics(client_id);
