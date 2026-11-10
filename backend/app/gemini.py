"""Gemini on the GCP VM, authenticated by its attached service account."""
import json
from urllib.parse import quote

import httpx

from .qa import ANSWER_INSTRUCTIONS, MAX_OUTPUT_TOKENS, CourseAgent, ReadSelection

MODEL = "gemini-3.8-flash"
METADATA_ROOT = "http://metadata.google.internal/computeMetadata/v1/"
# Global standard rates, including the announced January 2027 prices.
# Nanodollars per token. Cached input is charged at the full input rate here.
INPUT_RATE = 1500
OUTPUT_RATE = 7500
# Reserve the model's full published output limit, including thinking, even
# though our request asks for fewer tokens.
RESERVATION = 1_048_576 * INPUT_RATE + 65_536 * OUTPUT_RATE


class GeminiCourseAgent(CourseAgent):
    provider = "gemini"
    model = MODEL

    def __init__(self, knowledge, budget):
        # Reuse the course catalog, note allowlist, prompt and streaming events.
        super().__init__(knowledge, httpx.AsyncClient(timeout=60, trust_env=False), budget)

    async def close(self):
        await self.client.aclose()

    async def endpoint(self):
        # Fetch short-lived credentials for each call. Never copy a JSON key to
        # the VM, store an access token, or forward it to the browser.
        headers = {"Metadata-Flavor": "Google"}
        project = await self.client.get(METADATA_ROOT + "project/project-id", headers=headers, timeout=10)
        project.raise_for_status()
        response = await self.client.get(
            METADATA_ROOT + "instance/service-accounts/default/token", headers=headers, timeout=10,
        )
        response.raise_for_status()
        token = response.json()["access_token"]
        url = ("https://aiplatform.googleapis.com/v1/projects/"
               f"{quote(project.text.strip(), safe='')}/locations/global/publishers/google/models/{MODEL}")
        return url, {"Authorization": f"Bearer {token}"}

    def body(self, instructions, content):
        return {
            "systemInstruction": {"parts": [{"text": instructions}]},
            "contents": [{"role": "user", "parts": [{"text": content}]}],
            "generationConfig": {
                "maxOutputTokens": MAX_OUTPUT_TOKENS,
                "thinkingConfig": {"thinkingLevel": "LOW", "includeThoughts": False},
            },
        }

    def settle_usage(self, day, usage):
        if not usage or "promptTokenCount" not in usage or "totalTokenCount" not in usage:
            return
        # Total includes response and thinking tokens, even when thoughts are
        # hidden. Any additional tokens are charged at the higher output rate.
        prompt = usage["promptTokenCount"]
        output = usage["totalTokenCount"] - prompt
        if prompt < 0 or output < 0:
            return
        cost = prompt * INPUT_RATE + output * OUTPUT_RATE
        self.budget.refund(day, RESERVATION - cost)

    async def select_files(self, question):
        url, headers = await self.endpoint()
        body = self.body(self.selection_instructions(), question)
        body["tools"] = [{"functionDeclarations": [{
            "name": "read_course_files",
            "description": self.selector["description"],
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "filenames": {
                        "type": "ARRAY", "maxItems": 3,
                        "items": {"type": "STRING", "enum": list(self.knowledge.files)},
                    },
                },
                "required": ["filenames"],
            },
        }]}]
        body["toolConfig"] = {"functionCallingConfig": {
            "mode": "ANY", "allowedFunctionNames": ["read_course_files"],
        }}
        day = self.budget.reserve(RESERVATION)
        response = await self.client.post(url + ":generateContent", headers=headers, json=body)
        response.raise_for_status()
        result = response.json()
        self.settle_usage(day, result.get("usageMetadata"))
        candidates = result.get("candidates", [])
        if len(candidates) != 1 or candidates[0].get("finishReason") != "STOP":
            raise RuntimeError("Gemini course note selection did not complete.")
        parts = candidates[0].get("content", {}).get("parts", [])
        calls = [part["functionCall"] for part in parts if "functionCall" in part]
        if len(calls) != 1 or calls[0].get("name") != "read_course_files":
            raise RuntimeError("Invalid Gemini course note selection.")
        return ReadSelection.model_validate(calls[0]["args"]).filenames

    async def answer_deltas(self, question, notes):
        url, headers = await self.endpoint()
        body = self.body(ANSWER_INSTRUCTIONS, json.dumps(
            {"question": question, "course_notes": notes}, ensure_ascii=False,
        ))
        day = self.budget.reserve(RESERVATION)
        usage = None
        finished = False
        async with self.client.stream(
            "POST", url + ":streamGenerateContent",
            params={"alt": "sse"}, headers=headers, json=body,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                event = json.loads(line[5:].strip())
                if "error" in event:
                    raise RuntimeError("Gemini course answer failed.")
                usage = event.get("usageMetadata", usage)
                for candidate in event.get("candidates", []):
                    reason = candidate.get("finishReason")
                    if reason:
                        if reason != "STOP":
                            self.settle_usage(day, usage)
                            raise RuntimeError("Gemini course answer did not complete.")
                        finished = True
                    for part in candidate.get("content", {}).get("parts", []):
                        if not part.get("thought") and "text" in part:
                            yield part["text"]
        if not finished:
            # An interrupted request retains its reservation when usage is unknown.
            raise RuntimeError("Gemini course answer stream ended early.")
        self.settle_usage(day, usage)
