-- Seed some test vehicles linked to existing drivers
-- Assuming driver IDs from previous seed or just generic ones

INSERT INTO vehicles (plate_number, make, model, year, color, vehicle_status, driver_id)
SELECT 'KAA-123-B', 'Toyota', 'Corolla', 2022, 'Jaune', 'active', id FROM drivers LIMIT 1
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO vehicles (plate_number, make, model, year, color, vehicle_status, driver_id)
SELECT 'DK-456-XY', 'Mercedes', 'Sprinter', 2020, 'Blanc', 'active', id FROM drivers OFFSET 1 LIMIT 1
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO vehicles (plate_number, make, model, year, color, vehicle_status, driver_id)
SELECT 'SL-789-ZZ', 'Peugeot', '504', 2018, 'Bleu', 'active', id FROM drivers OFFSET 2 LIMIT 1
ON CONFLICT (plate_number) DO NOTHING;
