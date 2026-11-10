"""Persistent, shared budget for paid course-guide calls."""
from contextlib import closing
from datetime import datetime
from pathlib import Path
import sqlite3
from zoneinfo import ZoneInfo

DAY_ZONE = ZoneInfo("America/New_York")
DAILY_LIMIT = 10_000_000_000  # $10 in integer nanodollars.


class DailyBudgetExceeded(Exception):
    pass


class DailyBudget:
    def __init__(self, path: Path, limit: int = DAILY_LIMIT):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.limit = limit
        with closing(sqlite3.connect(path)) as db, db:
            db.execute("CREATE TABLE IF NOT EXISTS spend (day TEXT PRIMARY KEY, nanos INTEGER NOT NULL)")

    def reserve(self, amount: int) -> str:
        day = datetime.now(DAY_ZONE).date().isoformat()
        # A conditional UPSERT takes SQLite's write lock across processes.
        with closing(sqlite3.connect(self.path)) as db, db:
            if amount > self.limit:
                raise DailyBudgetExceeded
            cursor = db.execute("""
                INSERT INTO spend VALUES (?, ?)
                ON CONFLICT(day) DO UPDATE SET nanos = nanos + excluded.nanos
                WHERE nanos + excluded.nanos <= ?
            """, (day, amount, self.limit))
            if cursor.rowcount != 1:
                raise DailyBudgetExceeded
        return day

    def refund(self, day: str, amount: int):
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute("UPDATE spend SET nanos = nanos - ? WHERE day = ?", (amount, day))
