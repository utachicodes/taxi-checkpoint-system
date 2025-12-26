-- Insert sample checkpoints
INSERT INTO checkpoints (name, location, latitude, longitude, checkpoint_type) VALUES
  ('Downtown Central', '123 Main St, City Center', 40.7128, -74.0060, 'scheduled'),
  ('Airport Road', 'Airport Expressway Mile 5', 40.7589, -73.9851, 'random'),
  ('Highway Patrol Point', 'Highway 101 North', 40.7812, -73.9665, 'scheduled');

-- Insert sample drivers
INSERT INTO drivers (license_number, full_name, phone, email, date_of_birth, license_status) VALUES
  ('SN-DL-987654', 'Amina Diallo', '+221771234567', 'amina.diallo@email.com', '1985-03-15', 'active'),
  ('SN-DL-123456', 'Moussa Sow', '+221778765432', 'moussa.sow@email.com', '1990-07-22', 'active'),
  ('SN-DL-654321', 'Fatou Ndiaye', '+221772345678', 'fatou.ndiaye@email.com', '1988-11-30', 'suspended');

-- Insert sample vehicles
INSERT INTO vehicles (plate_number, make, model, year, color, insurance_expiry, last_inspection) VALUES
  ('DK-123-AB', 'Toyota', 'Corolla', 2020, 'White', '2025-06-30', '2024-12-01'),
  ('TH-456-CD', 'Nissan', 'Note', 2019, 'Silver', '2025-08-15', '2024-11-20'),
  ('LG-789-EF', 'Honda', 'Fit', 2021, 'Blue', '2025-05-20', '2024-10-15');

-- Link drivers to vehicles
UPDATE vehicles SET driver_id = (SELECT id FROM drivers WHERE license_number = 'SN-DL-987654') WHERE plate_number = 'DK-123-AB';
UPDATE vehicles SET driver_id = (SELECT id FROM drivers WHERE license_number = 'SN-DL-123456') WHERE plate_number = 'TH-456-CD';
UPDATE vehicles SET driver_id = (SELECT id FROM drivers WHERE license_number = 'SN-DL-654321') WHERE plate_number = 'LG-789-EF';

-- Insert sample operators
-- Note: The id for the operator should match a user id from the Supabase auth.users table after the user is created.
-- This is a placeholder value and will need to be updated.
INSERT INTO operators (id, first_name, last_name, checkpoint_id, phone_number) VALUES
('8b8d734f-3210-4923-a535-35458d73936b', 'Babacar', 'Diop', (SELECT id FROM checkpoints WHERE name = 'Downtown Central'), '+221771112233');
