"""Public course notes and a stateless read-tool demonstration."""
from contextlib import asynccontextmanager
import asyncio
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .budget import DailyBudgetExceeded
from .knowledge import CourseKnowledge
from .qa import create_course_agent, preview_events


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=3, max_length=800)

    @field_validator("question")
    @classmethod
    def trim_question(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Write a course question of at least three characters.")
        return value


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.knowledge = CourseKnowledge()
    app.state.agent = create_course_agent(app.state.knowledge)
    app.state.model_slots = asyncio.Semaphore(2)
    agent = app.state.agent
    try:
        yield
    finally:
        if agent:
            await agent.close()


app = FastAPI(title="AC215 course guide", version="1.0.0", lifespan=lifespan,
              docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)


@app.middleware("http")
async def public_response_headers(request, call_next):
    if request.method == "POST" and request.headers.get("content-type", "").split(";")[0] != "application/json":
        return JSONResponse({"detail": "Send the question as JSON."}, status_code=415)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/course")
async def course():
    knowledge = app.state.knowledge
    agent = app.state.agent
    return {"title": "AC215: MLOps & LLMOps, Production AI Systems", "updated_on": knowledge.updated_on,
            "files": list(knowledge.files.values()), "answer_mode": "model" if agent else "sources",
            "provider": agent.provider if agent else "preview", "model": agent.model if agent else None}


@app.get("/api/course/files/{filename}", response_class=PlainTextResponse)
async def course_file(filename: str):
    try:
        return app.state.knowledge.read_file(filename)
    except ValueError:
        raise HTTPException(404, "Course file not found.") from None


async def answer_events(question: str):
    agent = app.state.agent
    yield {"type": "started", "mode": "model" if agent else "sources"}
    try:
        if agent:
            async with app.state.model_slots:
                async for event in agent.events(question):
                    yield event
        else:
            async for event in preview_events(app.state.knowledge, question):
                yield event
    except DailyBudgetExceeded:
        yield {"type": "error", "code": "daily_budget",
               "message": "Today’s AI chat budget is used up. Try again after midnight Eastern."}
    except Exception:
        # Never send upstream bodies, credentials or private provider reasoning to the UI.
        yield {"type": "error", "message": "The course guide could not finish. Please try again or ask the teaching team on Ed."}


@app.post("/api/chat/stream")
async def stream_chat(body: Question):
    async def stream():
        async for event in answer_events(body.question):
            yield "data: " + json.dumps(event, ensure_ascii=False) + "\n\n"
    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"X-Accel-Buffering": "no", "Cache-Control": "no-store"})
