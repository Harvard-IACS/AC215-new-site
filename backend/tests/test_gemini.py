"""Exercise VM identity and Vertex streaming through local HTTP fixtures."""
import json
import os
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
import httpx

from app.budget import DailyBudget
from app.gemini import INPUT_RATE, OUTPUT_RATE, RESERVATION
from app.main import app
from app.qa import CourseAgent, RESERVATION as OPENAI_RESERVATION, create_course_agent


def events(response):
    return [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]


class GeminiTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.path = Path(self.directory.name) / "budget.sqlite3"
        self.requests = []
        self.filenames = ["lectures.md"]
        self.finish = "STOP"
        self.metadata_fails = False
        self.usage = {"promptTokenCount": 20, "candidatesTokenCount": 8,
                      "thoughtsTokenCount": 4, "totalTokenCount": 32}
        real_client = httpx.AsyncClient
        self.env = patch.dict(os.environ, {
            "COURSE_PROVIDER": "gemini", "OPENAI_API_KEY": "unused-openai-key",
            "COURSE_BUDGET_DB": str(self.path),
        })
        self.clients = patch("app.gemini.httpx.AsyncClient", side_effect=lambda **kwargs: real_client(
            **kwargs, transport=httpx.MockTransport(self.handle),
        ))
        self.env.start()
        self.clients.start()
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.clients.stop()
        self.env.stop()
        self.directory.cleanup()

    def handle(self, request):
        self.requests.append(request)
        if request.url.host == "metadata.google.internal":
            self.assertEqual(request.headers["Metadata-Flavor"], "Google")
            self.assertNotIn("authorization", request.headers)
            if self.metadata_fails:
                return httpx.Response(403, text="private-metadata-error")
            if request.url.path.endswith("/project/project-id"):
                return httpx.Response(200, text="course-fixture-project")
            self.assertTrue(request.url.path.endswith("/service-accounts/default/token"))
            return httpx.Response(200, json={"access_token": "fixture-token", "expires_in": 3600})
        self.assertEqual(request.url.host, "aiplatform.googleapis.com")
        self.assertIn("/projects/course-fixture-project/locations/global/", request.url.path)
        self.assertIn("/models/gemini-3.8-flash:", request.url.path)
        self.assertEqual(request.headers["Authorization"], "Bearer fixture-token")
        body = json.loads(request.content)
        self.assertNotIn("candidateCount", body["generationConfig"])
        self.assertEqual(body["generationConfig"]["thinkingConfig"]["includeThoughts"], False)
        if request.url.path.endswith(":generateContent"):
            self.assertEqual(body["toolConfig"]["functionCallingConfig"]["mode"], "ANY")
            declaration = body["tools"][0]["functionDeclarations"][0]
            self.assertEqual(declaration["name"], "read_course_files")
            self.assertEqual(len(declaration["parameters"]["properties"]["filenames"]["items"]["enum"]), 4)
            return httpx.Response(200, json={
                "candidates": [{"finishReason": "STOP", "content": {"parts": [{
                    "functionCall": {"name": "read_course_files", "args": {"filenames": self.filenames}},
                }]}}], "usageMetadata": self.usage,
            })
        self.assertEqual(request.url.params["alt"], "sse")
        self.assertNotIn("tools", body)
        self.assertIn("only facts explicitly supported", body["systemInstruction"]["parts"][0]["text"])
        note_input = json.loads(body["contents"][0]["parts"][0]["text"])
        self.assertIn("SEC 1.321", note_input["course_notes"]["lectures.md"])
        chunks = [
            {"candidates": [{"content": {"parts": [{"thought": True, "text": "private-reasoning"}]}}]},
            {"candidates": [{"content": {"parts": [{"text": "The course meets "}]}}]},
            {"candidates": [{"content": {"parts": [{"text": "in SEC 1.321."}]}}]},
        ]
        if self.finish:
            chunks.append({"candidates": [{"finishReason": self.finish}], "usageMetadata": self.usage})
        return httpx.Response(200, headers={"Content-Type": "text/event-stream"},
                              text="".join("data: " + json.dumps(chunk) + "\n\n" for chunk in chunks))

    def ask(self):
        return self.client.post("/api/chat/stream", json={"question": "Where does the class meet?"})

    def test_identity_file_tool_streaming_and_thinking_cost(self):
        course = self.client.get("/api/course").json()
        self.assertEqual((course["provider"], course["model"]), ("gemini", "gemini-3.8-flash"))
        response = self.ask()
        stream = events(response)
        self.assertEqual([event["type"] for event in stream], [
            "started", "read_start", "read_complete", "answer_delta", "answer_delta", "answer",
        ])
        self.assertEqual(stream[-1]["answer"], "The course meets in SEC 1.321.")
        self.assertNotIn("private-reasoning", response.text)
        self.assertNotIn("fixture-token", response.text)
        with sqlite3.connect(self.path) as db:
            spend = db.execute("SELECT nanos FROM spend").fetchone()[0]
        self.assertEqual(spend, 2 * (20 * INPUT_RATE + 12 * OUTPUT_RATE))
        # A second run still sends only the current question and fresh note text.
        self.ask()
        answer_requests = [r for r in self.requests if r.url.path.endswith(":streamGenerateContent")]
        self.assertEqual(len(answer_requests), 2)
        self.assertEqual(json.loads(answer_requests[0].content), json.loads(answer_requests[1].content))

    def test_shared_cap_blocks_before_paid_request(self):
        self.assertEqual(events(self.ask())[-1]["type"], "answer")
        prior = len([r for r in self.requests if r.url.host == "aiplatform.googleapis.com"])
        app.state.agent.budget.limit = RESERVATION - 1
        self.assertEqual(events(self.ask())[-1]["code"], "daily_budget")
        self.assertEqual(prior, len([r for r in self.requests if r.url.host == "aiplatform.googleapis.com"]))
        # Switching provider keeps the existing spend in the same ledger.
        with sqlite3.connect(self.path) as db:
            spend = db.execute("SELECT nanos FROM spend").fetchone()[0]
        openai_client = Mock()
        app.state.agent = CourseAgent(app.state.knowledge, openai_client,
                                      DailyBudget(self.path, limit=spend + OPENAI_RESERVATION - 1))
        self.assertEqual(events(self.ask())[-1]["code"], "daily_budget")
        openai_client.responses.create.assert_not_called()

    def test_no_files_skips_answer_request(self):
        self.filenames = []
        answer = events(self.ask())[-1]
        self.assertEqual(answer["mode"], "not_found")
        self.assertEqual(answer["sources"], [])
        self.assertFalse(any(r.url.path.endswith(":streamGenerateContent") for r in self.requests))

    def test_file_allowlist_and_metadata_errors_are_redacted(self):
        self.filenames = ["../.env"]
        self.assertEqual(events(self.ask())[-1]["type"], "error")
        self.metadata_fails = True
        response = self.ask()
        self.assertEqual(events(response)[-1]["type"], "error")
        self.assertNotIn("private-metadata-error", response.text)

    def test_interrupted_answer_keeps_reservation(self):
        self.finish = None
        self.assertEqual(events(self.ask())[-1]["type"], "error")
        with sqlite3.connect(self.path) as db:
            self.assertGreaterEqual(db.execute("SELECT nanos FROM spend").fetchone()[0], RESERVATION)

    def test_safety_stop_returns_error(self):
        self.finish = "SAFETY"
        self.assertEqual(events(self.ask())[-1]["type"], "error")

    def test_preview_switch_ignores_key_and_bad_provider_is_rejected(self):
        with patch.dict(os.environ, {"COURSE_PROVIDER": "preview"}):
            self.assertIsNone(create_course_agent(app.state.knowledge))
        with patch.dict(os.environ, {"COURSE_PROVIDER": "unknown"}):
            with self.assertRaisesRegex(ValueError, "COURSE_PROVIDER"):
                create_course_agent(app.state.knowledge)
        self.assertEqual(self.requests, [])


if __name__ == "__main__":
    unittest.main()
