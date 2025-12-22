Supabase integration notes

Required environment variables (backend / Django):

- `SUPABASE_URL` - URL of your Supabase project (e.g. https://xyz.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend-only, keep secret)
- `EXTERNAL_CHECKPOINT_ID` - (optional) default checkpoint id used in `SupabaseService`
- `EXTERNAL_OPERATOR_ID` - (optional) default operator id used in `SupabaseService`

Client-side (Next.js) environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

How it works

- After OCR processing, the Django view `api_ocr_upload` will call `SupabaseService.create_scan_event(...)`.
- The `create_scan_event` method inserts a row into `scan_events` table.
- The Next.js component `components/supabase/ScanLive.tsx` subscribes to `scan_events` and renders incoming INSERT events.

Database schema (example SQL)

CREATE TABLE public.scan_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plate_text text,
  vehicle_id uuid,
  is_registered boolean,
  has_paid boolean,
  checkpoint_status text,
  image_url text,
  uploaded_image_id integer,
  api_response jsonb,
  created_at timestamptz DEFAULT now()
);

Security note

- Use the Supabase service role key only from backend code. The frontend uses the anon key only for subscriptions and reads.
