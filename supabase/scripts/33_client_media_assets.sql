CREATE TABLE IF NOT EXISTS public.client_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  file_url text NOT NULL,
  thumbnail_url text,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'gif')),
  mime_type text NOT NULL,
  file_size bigint,
  width integer,
  height integer,
  duration_ms integer,
  tags text[] DEFAULT '{}',
  folder text DEFAULT 'general',
  metadata jsonb DEFAULT '{}'::jsonb,
  used_in_posts integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.client_media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media assets are viewable by owner"
  ON public.client_media_assets FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Media assets are insertable by owner"
  ON public.client_media_assets FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Media assets are updatable by owner"
  ON public.client_media_assets FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Media assets are deletable by owner"
  ON public.client_media_assets FOR DELETE USING (auth.uid() = owner_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_client ON public.client_media_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON public.client_media_assets(client_id, folder);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON public.client_media_assets USING gin(tags);

-- Updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.client_media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
