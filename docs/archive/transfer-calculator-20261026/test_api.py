"""Exercise the public API contract, including cache and input boundaries."""

from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import httpx
from app import app


class ApiContractTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_health_and_no_store(self):
        response = await self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
        self.assertIn("no-store", response.headers["cache-control"])

    async def test_one_gib_download_with_different_hit_rates(self):
        for hit_rate, hit_gib, origin_gib in [(0, 0, 1), (75, .75, .25), (100, 1, 0)]:
            with self.subTest(hit_rate=hit_rate):
                response = await self.client.post("/api/transfer-estimate", json={
                    "visits": 1024, "asset_kib": 1024, "cache_hit_percent": hit_rate,
                })
                self.assertEqual(response.status_code, 200)
                result = response.json()
                self.assertEqual(result["browser_gib"], 1)
                self.assertEqual(result["edge_hit_gib"], hit_gib)
                self.assertEqual(result["origin_fill_gib"], origin_gib)
                self.assertIn("no-store", response.headers["cache-control"])

    async def test_invalid_input_is_rejected_and_not_cached(self):
        valid = {"visits": 1, "asset_kib": 1, "cache_hit_percent": 90}
        invalid = [
            {**valid, "visits": 0}, {**valid, "visits": 10_000_001},
            {**valid, "asset_kib": -1}, {**valid, "asset_kib": 16_385},
            {**valid, "cache_hit_percent": 101}, {**valid, "cache_hit_percent": -1},
            {**valid, "visits": "100"}, {**valid, "visits": True},
            {**valid, "asset_kib": 2.5}, {**valid, "extra": "not accepted"},
        ]
        for values in invalid:
            with self.subTest(values=values):
                response = await self.client.post("/api/transfer-estimate", json=values)
                self.assertEqual(response.status_code, 422)
                self.assertIn("no-store", response.headers["cache-control"])

    async def test_unknown_api_path_stays_a_json_404(self):
        response = await self.client.get("/api/not-a-route")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Not Found"})
        self.assertIn("no-store", response.headers["cache-control"])

    async def test_method_boundary(self):
        response = await self.client.get("/api/transfer-estimate")
        self.assertEqual(response.status_code, 405)
        self.assertIn("no-store", response.headers["cache-control"])


if __name__ == "__main__":
    unittest.main()
