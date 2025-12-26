-- Daily Payments table
CREATE TABLE IF NOT EXISTS daily_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 500, -- Default daily fee
  is_paid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, payment_date)
);

-- Enable RLS
ALTER TABLE daily_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "payments_select_all" ON daily_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "payments_insert_operators" ON daily_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "payments_update_operators" ON daily_payments FOR UPDATE TO authenticated USING (true);

-- Function to check if a vehicle has paid for today
CREATE OR REPLACE FUNCTION check_daily_payment(v_plate_number TEXT)
RETURNS TABLE (
  paid BOOLEAN,
  payment_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT dp.is_paid, dp.created_at
  FROM daily_payments dp
  JOIN vehicles v ON v.id = dp.vehicle_id
  WHERE v.plate_number = v_plate_number
  AND dp.payment_date = CURRENT_DATE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Seed sample daily payments for existing vehicles
-- These inserts are idempotent and will not duplicate for the same day

INSERT INTO daily_payments (vehicle_id, payment_date, amount, is_paid)
SELECT (SELECT id FROM vehicles WHERE plate_number = 'DK-123-AB'), CURRENT_DATE, 500, true
WHERE NOT EXISTS (
  SELECT 1 FROM daily_payments dp
  WHERE dp.vehicle_id = (SELECT id FROM vehicles WHERE plate_number = 'DK-123-AB')
    AND dp.payment_date = CURRENT_DATE
);

INSERT INTO daily_payments (vehicle_id, payment_date, amount, is_paid)
SELECT (SELECT id FROM vehicles WHERE plate_number = 'TH-456-CD'), CURRENT_DATE, 500, true
WHERE NOT EXISTS (
  SELECT 1 FROM daily_payments dp
  WHERE dp.vehicle_id = (SELECT id FROM vehicles WHERE plate_number = 'TH-456-CD')
    AND dp.payment_date = CURRENT_DATE
);

INSERT INTO daily_payments (vehicle_id, payment_date, amount, is_paid)
SELECT (SELECT id FROM vehicles WHERE plate_number = 'LG-789-EF'), CURRENT_DATE, 500, false
WHERE NOT EXISTS (
  SELECT 1 FROM daily_payments dp
  WHERE dp.vehicle_id = (SELECT id FROM vehicles WHERE plate_number = 'LG-789-EF')
    AND dp.payment_date = CURRENT_DATE
);
