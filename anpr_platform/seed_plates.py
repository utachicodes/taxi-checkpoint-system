# seed_plates.py — run once to populate known plates
from database import init_db, SessionLocal
from models import KnownPlate

def seed():
    init_db()
    with SessionLocal() as session:
        # Check if already seeded to avoid duplicates
        if session.query(KnownPlate).count() > 0:
            print("Database already has known plates. Skipping seeding.")
            return

        plates = [
            KnownPlate(plate="ABC1234", owner_name="John Doe", vehicle_info="Blue Toyota", is_authorized=True),
            KnownPlate(plate="XYZ9999", owner_name="Jane Smith", vehicle_info="Red Honda", is_authorized=True),
            KnownPlate(plate="TAX1234", owner_name="Taxi Driver 1", vehicle_info="Yellow Taxi", is_authorized=True),
            KnownPlate(plate="KNG5678", owner_name="King Cabs", vehicle_info="White Minivan", is_authorized=True),
        ]
        session.add_all(plates)
        session.commit()
        print(f"Successfully seeded {len(plates)} known plates.")

if __name__ == "__main__":
    seed()
