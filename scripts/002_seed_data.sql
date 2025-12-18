-- Insert sample checkpoints
INSERT INTO checkpoints (name, location, latitude, longitude, checkpoint_type) VALUES
  ('Downtown Central', '123 Main St, City Center', 40.7128, -74.0060, 'scheduled'),
  ('Airport Road', 'Airport Expressway Mile 5', 40.7589, -73.9851, 'random'),
  ('Highway Patrol Point', 'Highway 101 North', 40.7812, -73.9665, 'scheduled');

-- Insert sample drivers
INSERT INTO drivers (license_number, full_name, phone, email, date_of_birth, license_status) VALUES
  ('DL-2024-001', 'John Kamau', '+254712345678', 'john.kamau@email.com', '1985-03-15', 'active'),
  ('DL-2024-002', 'Mary Wanjiku', '+254723456789', 'mary.wanjiku@email.com', '1990-07-22', 'active'),
  ('DL-2024-003', 'Peter Omondi', '+254734567890', 'peter.omondi@email.com', '1988-11-30', 'active'),
  ('DL-2024-004', 'Grace Achieng', '+254745678901', 'grace.achieng@email.com', '1992-05-18', 'suspended');

-- Insert sample vehicles
INSERT INTO vehicles (plate_number, make, model, year, color, insurance_expiry, last_inspection) VALUES
  ('KAA-123B', 'Toyota', 'Corolla', 2020, 'White', '2025-06-30', '2024-12-01'),
  ('KBB-456C', 'Nissan', 'Note', 2019, 'Silver', '2025-08-15', '2024-11-20'),
  ('KCC-789D', 'Honda', 'Fit', 2021, 'Blue', '2025-05-20', '2024-10-15'),
  ('KDD-012E', 'Mazda', 'Demio', 2018, 'Red', '2024-12-31', '2024-09-30');

-- Link drivers to vehicles
UPDATE vehicles SET driver_id = (SELECT id FROM drivers WHERE license_number = 'DL-2024-001') WHERE plate_number = 'KAA-123B';
UPDATE vehicles SET driver_id = (SELECT id FROM drivers WHERE license_number = 'DL-2024-002') WHERE plate_number = 'KBB-456C';
UPDATE vehicles SET driver_id = (SELECT id FROM drivers WHERE license_number = 'DL-2024-003') WHERE plate_number = 'KCC-789D';
UPDATE vehicles SET driver_id = (SELECT id FROM drivers WHERE license_number = 'DL-2024-004') WHERE plate_number = 'KDD-012E';
