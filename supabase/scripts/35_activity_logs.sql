CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity logs are viewable by owner"
  ON public.activity_logs FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Activity logs are insertable by owner"
  ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_client ON public.activity_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
