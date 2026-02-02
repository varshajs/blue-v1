from fastapi.testclient import TestClient
import pytest

import main

# --- Simple in-memory async fake collections ---
class FakeCursor:
    def __init__(self, docs):
        # store copies to avoid mutation surprises
        self._docs = [doc.copy() for doc in docs]
        self._sort_key = None
        self._sort_order = 1

    def sort(self, key, order=1):
        self._sort_key = key
        self._sort_order = order
        return self

    async def to_list(self, n):
        if self._sort_key:
            reverse = self._sort_order == -1
            self._docs.sort(key=lambda d: d.get(self._sort_key), reverse=reverse)
        return [d.copy() for d in self._docs[:n]]

class FakeCollection:
    def __init__(self, initial=None, key_field="_id"):
        self.docs = [d.copy() for d in (initial or [])]
        self.key_field = key_field

    async def count_documents(self, _filter):
        return len(self.docs)

    async def insert_many(self, list_of_docs):
        for d in list_of_docs:
            self.docs.append(d.copy())

    def find(self, *args, **kwargs):
        return FakeCursor(self.docs)

    async def find_one(self, filter):
        # simple equality match for a single key
        for d in self.docs:
            match = True
            for k, v in filter.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                return d.copy()
        return None

    async def update_one(self, filter, update, upsert=False):
        # find existing
        doc = None
        for d in self.docs:
            match = True
            for k, v in filter.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                doc = d
                break

        if not doc and upsert:
            # create new doc for simple upsert
            new_doc = {}
            new_doc.update(filter)
            # apply $set if present
            if "$set" in update:
                new_doc.update(update["$set"].copy())
            if "$addToSet" in update:
                for k, v in update["$addToSet"].items():
                    new_doc[k] = [v]
            self.docs.append(new_doc)
            return

        if not doc:
            return

        # apply $set
        if "$set" in update:
            for k, v in update["$set"].items():
                doc[k] = v

        # apply $addToSet
        if "$addToSet" in update:
            for k, v in update["$addToSet"].items():
                arr = doc.get(k)
                if arr is None:
                    doc[k] = [v]
                elif v not in arr:
                    arr.append(v)


# --- Tests ---
@pytest.fixture
def fake_db(monkeypatch):
    # empty seats -> will trigger seeding
    fake_seats = FakeCollection(initial=[])
    fake_employees = FakeCollection(initial=[], key_field="w3_id")

    monkeypatch.setattr(main, "seats_collection", fake_seats)
    monkeypatch.setattr(main, "employees_collection", fake_employees)
    return fake_seats, fake_employees


def test_get_seats_seeds_db(fake_db):
    fake_seats, _ = fake_db
    with TestClient(main.app) as client:
        # After startup, seats should be seeded
        resp = client.get("/seats")
        assert resp.status_code == 200
        seats = resp.json()
        assert isinstance(seats, list)
        assert len(seats) == 100

        first = seats[0]
        # Ensure basic fields exist and default values are present
        assert first.get("status") == "available"
        assert first.get("price") == 5


def test_booking_and_release_flow(fake_db):
    fake_seats, fake_employees = fake_db
    payload = {
        "seat_id": 1,
        "w3_id": "tester@example.com",
        "name": "Tester",
        "date": "2026-01-31",
        "time_slot": "10:00-12:00",
    }

    with TestClient(main.app) as client:
        # Book the seat
        resp = client.post("/book", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert "Seat 1 booked" in body["message"]

        seat = body["seat"]
        assert seat["status"] == "occupied"
        assert seat["booked_by"] == "tester@example.com"
        assert seat["booking_details"]["name"] == "Tester"
        assert seat["booking_details"]["date"] == "2026-01-31"

        # Booking again should fail
        resp2 = client.post("/book", json=payload)
        assert resp2.status_code == 400

        # Release the seat
        rel = client.post("/release/1")
        assert rel.status_code == 200
        rel_body = rel.json()
        assert "Seat 1 released" in rel_body["message"]
        seat_after = rel_body["seat"]
        assert seat_after["status"] == "available"
        assert seat_after.get("booked_by") is None
        assert seat_after.get("booking_details") is None


def test_book_nonexistent_seat(fake_db):
    payload = {
        "seat_id": 9999,
        "w3_id": "noone@example.com",
        "name": "No One",
        "date": "2026-02-01",
        "time_slot": "09:00-10:00",
    }

    with TestClient(main.app) as client:
        resp = client.post("/book", json=payload)
        assert resp.status_code == 404


def test_invalid_payload_returns_422(fake_db):
    with TestClient(main.app) as client:
        # Missing required fields
        resp = client.post("/book", json={"seat_id": 1})
        assert resp.status_code == 422
