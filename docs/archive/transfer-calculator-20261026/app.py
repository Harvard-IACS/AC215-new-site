"""A public, stateless API for a deliberately simple traffic model."""

from fastapi import FastAPI, Request
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(title="Transfer lab", docs_url=None, redoc_url=None, openapi_url=None)


class TransferInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    visits: int = Field(ge=1, le=10_000_000)
    asset_kib: int = Field(ge=1, le=16_384)
    cache_hit_percent: int = Field(ge=0, le=100)


@app.middleware("http")
async def prevent_api_caching(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/transfer-estimate")
def estimate_transfer(values: TransferInput):
    # A visit downloads the bundle once. Browser cache, compression, headers,
    # revalidation, and multiple cache locations are outside this small model.
    total_bytes = values.visits * values.asset_kib * 1024
    edge_hit_bytes = total_bytes * values.cache_hit_percent // 100
    origin_fill_bytes = total_bytes - edge_hit_bytes
    return {
        "browser_gib": round(total_bytes / 1024**3, 6),
        "edge_hit_gib": round(edge_hit_bytes / 1024**3, 6),
        "origin_fill_gib": round(origin_fill_bytes / 1024**3, 6),
        "assumptions": "One bundle download per visit; no browser cache or compression.",
    }
