-- Migration: Add content_group column to client_schedule_items
-- Purpose: Link posts that share the same content across multiple platforms (cross-posting)
-- Non-breaking: existing items will have content_group = NULL

ALTER TABLE public.client_schedule_items
  ADD COLUMN IF NOT EXISTS content_group text;

-- Optional: index for grouping queries
CREATE INDEX IF NOT EXISTS idx_client_schedule_items_content_group
  ON public.client_schedule_items (content_group)
  WHERE content_group IS NOT NULL;
