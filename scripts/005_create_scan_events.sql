-- Create scan_events table for realtime frontend subscriptions

CREATE TABLE IF NOT EXISTS public.scan_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plate_text text,
  vehicle_id uuid,
  is_registered boolean DEFAULT false,
  has_paid boolean DEFAULT false,
  checkpoint_status text,
  image_url text,
  uploaded_image_id bigint,
  api_response jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for quick lookup by plate
CREATE INDEX IF NOT EXISTS idx_scan_events_plate_text ON public.scan_events (plate_text);

-- Optional retention policy can be added depending on retention needs
-- e.g., to keep 30 days:
-- CREATE POLICY "retention_30_days" ON public.scan_events FOR DELETE USING (created_at < now() - interval '30 days');
