-- Create enum types
CREATE TYPE driver_license_status AS ENUM ('active', 'suspended', 'expired', 'revoked');
CREATE TYPE checkpoint_type AS ENUM ('random', 'scheduled', 'incident');
CREATE TYPE record_status AS ENUM ('clear', 'warning', 'violation', 'detained');
CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'impounded');

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  license_status driver_license_status DEFAULT 'active',
  photo_url TEXT,
  date_of_birth DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT UNIQUE NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT NOT NULL,
  vehicle_status vehicle_status DEFAULT 'active',
  insurance_expiry DATE,
  last_inspection DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkpoints table
CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  checkpoint_type checkpoint_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operators (users) table
CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  badge_number TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'operator',
  checkpoint_id UUID REFERENCES checkpoints(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkpoint records table
CREATE TABLE IF NOT EXISTS checkpoint_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  record_status record_status NOT NULL,
  notes TEXT,
  violation_details TEXT,
  fine_amount DECIMAL(10, 2),
  photo_evidence_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Violations table
CREATE TABLE IF NOT EXISTS violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  checkpoint_record_id UUID REFERENCES checkpoint_records(id) ON DELETE SET NULL,
  violation_type TEXT NOT NULL,
  description TEXT,
  fine_amount DECIMAL(10, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operators (must be authenticated)
CREATE POLICY "operators_select_own" ON operators FOR SELECT USING (auth.uid() = id);
CREATE POLICY "operators_update_own" ON operators FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for drivers (public read, operators write)
CREATE POLICY "drivers_select_all" ON drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "drivers_insert_operators" ON drivers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "drivers_update_operators" ON drivers FOR UPDATE TO authenticated USING (true);

-- RLS Policies for vehicles (public read, operators write)
CREATE POLICY "vehicles_select_all" ON vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicles_insert_operators" ON vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vehicles_update_operators" ON vehicles FOR UPDATE TO authenticated USING (true);

-- RLS Policies for checkpoints (read all, admin write)
CREATE POLICY "checkpoints_select_all" ON checkpoints FOR SELECT TO authenticated USING (true);
CREATE POLICY "checkpoints_insert_admin" ON checkpoints FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM operators WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "checkpoints_update_admin" ON checkpoints FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM operators WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for checkpoint_records (operators can CRUD their own or their checkpoint's records)
CREATE POLICY "records_select_all" ON checkpoint_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "records_insert_operators" ON checkpoint_records FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = operator_id
);
CREATE POLICY "records_update_operators" ON checkpoint_records FOR UPDATE TO authenticated USING (
  auth.uid() = operator_id
);

-- RLS Policies for violations (read all, operators write)
CREATE POLICY "violations_select_all" ON violations FOR SELECT TO authenticated USING (true);
CREATE POLICY "violations_insert_operators" ON violations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "violations_update_operators" ON violations FOR UPDATE TO authenticated WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_drivers_license ON drivers(license_number);
CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX idx_vehicles_driver ON vehicles(driver_id);
CREATE INDEX idx_records_checkpoint ON checkpoint_records(checkpoint_id);
CREATE INDEX idx_records_driver ON checkpoint_records(driver_id);
CREATE INDEX idx_records_created ON checkpoint_records(created_at DESC);
CREATE INDEX idx_violations_driver ON violations(driver_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
