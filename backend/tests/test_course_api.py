import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import httpx
from openai import AsyncOpenAI
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.budget import DailyBudget, DailyBudgetExceeded
from app.main import app
from app.qa import RESERVATION
from app.knowledge import CourseKnowledge

SOURCE_ENV = {'COURSE_PROVIDER': 'openai', 'OPENAI_API_KEY': '', 'COURSE_MODEL': '', 'OPENAI_BASE_URL': '', 'OPENAI_API_BASE': '', 'LANGSMITH_TRACING': 'false', 'LANGCHAIN_TRACING_V2': 'false'}


def stream_events(response):
    return [
        json.loads(line.removeprefix("data: "))
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]


class KnowledgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.knowledge = CourseKnowledge()

    def test_location_question_finds_lecture_room(self):
        text = self.knowledge.search('Where does the class meet?')[0].text
        self.assertIn('SEC 1.321', text)
        self.assertIn('Tuesday and Thursday', text)

    def test_deadline_comes_from_milestone_file(self):
        passage = self.knowledge.search('When is milestone 3 due?')[0]
        self.assertIn('November 12', passage.text)
        self.assertEqual(passage.filename, 'milestones.md')

    def test_prerequisites_include_programming_and_ml(self):
        text = ' '.join(p.text for p in self.knowledge.search('What are the prerequisites?')).lower()
        self.assertIn('python', text)
        self.assertRegex(text, r'machine[ -]learning')

    def test_unknown_topic_has_no_retrieval(self):
        self.assertEqual(self.knowledge.search('What is the weather in Boston?'), [])

    def test_read_tool_can_read_only_catalog_files(self):
        self.assertIn('SEC 1.321', self.knowledge.read_file('lectures.md'))
        for filename in ['../.env', '/etc/passwd', 'catalog.json', 'course-pages.json', 'missing.md']:
            with self.assertRaises(ValueError):
                self.knowledge.read_file(filename)


class APITests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, SOURCE_ENV)
        self.env.start()
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.env.stop()

    def test_health_and_file_catalog(self):
        health = self.client.get('/api/health')
        self.assertEqual(health.json(), {'status': 'ok'})
        self.assertEqual(health.headers['Cache-Control'], 'no-store')
        course = self.client.get('/api/course').json()
        self.assertEqual(course['answer_mode'], 'sources')
        self.assertEqual(len(course['files']), 4)
        self.assertNotIn('source_url', course)

    def test_preview_reads_actual_files_and_has_no_cookie(self):
        response = self.client.post('/api/chat/stream', json={'question': 'Where does the class meet?'})
        events = stream_events(response)
        answer = events[-1]
        steps = [event for event in events if event['type'] == 'read_complete']
        self.assertEqual(answer['mode'], 'sources')
        self.assertIn('SEC 1.321', answer['answer'])
        self.assertTrue(steps)
        self.assertTrue(all(source['url'].startswith('/api/course/files/') for source in answer['sources']))
        for step in steps:
            note = self.client.get('/api/course/files/' + step['filename'])
            self.assertEqual(note.text, step['output'])
            self.assertEqual(step['characters'], len(note.text))
        self.assertEqual(self.client.get('/api/course/files/secret.json').status_code, 404)
        self.assertNotIn('set-cookie', response.headers)
        self.assertNotIn('harvard-iacs.github.io', response.text)

    def test_no_session_or_history_contract(self):
        self.assertEqual(self.client.get('/api/sessions').status_code, 404)
        self.assertEqual(self.client.post('/api/chat/stream', json={'question': 'Course projects?', 'history': []}).status_code, 422)

    def test_empty_oversized_and_non_json_input(self):
        for question in ['  ', 'a' * 801]:
            self.assertEqual(self.client.post('/api/chat/stream', json={'question': question}).status_code, 422)
        self.assertEqual(self.client.post('/api/chat/stream', content='question=hello').status_code, 415)

    def test_unknown_question_points_to_staff(self):
        events = stream_events(self.client.post('/api/chat/stream', json={'question': 'What is the weather in Boston?'}))
        answer = events[-1]
        self.assertEqual(answer['mode'], 'not_found')
        self.assertEqual(answer['sources'], [])
        self.assertEqual([event for event in events if event['type'] == 'read_complete'], [])

    def test_provider_error_is_redacted(self):
        class BrokenAgent:
            async def events(self, _):
                raise RuntimeError('credential=do-not-return upstream-private-detail')
                yield
        app.state.agent = BrokenAgent()
        streamed = self.client.post('/api/chat/stream', json={'question': 'Where does the class meet?'})
        self.assertIn('"type": "error"', streamed.text)
        self.assertNotIn('do-not-return', streamed.text)

    def test_streamed_read_order_and_complete_result(self):
        response = self.client.post('/api/chat/stream', json={'question': 'When is milestone 3 due?'})
        self.assertIn('text/event-stream', response.headers['content-type'])
        self.assertEqual(response.headers['X-Accel-Buffering'], 'no')
        events = stream_events(response)
        types = [event['type'] for event in events]
        self.assertEqual(types[0], 'started')
        self.assertEqual(types[-1], 'answer')
        self.assertLess(types.index('read_start'), types.index('read_complete'))
        self.assertLess(types.index('read_complete'), types.index('answer'))
        self.assertIn('milestones.md', [e.get('filename') for e in events])


class BudgetTests(unittest.TestCase):
    def test_concurrent_reservations_persist_and_do_not_overspend(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "budget.sqlite3"
            budget = DailyBudget(path, limit=100)

            def reserve(_):
                try:
                    return budget.reserve(30)
                except DailyBudgetExceeded:
                    return None

            with ThreadPoolExecutor(max_workers=8) as pool:
                days = [day for day in pool.map(reserve, range(8)) if day]
            self.assertEqual(len(days), 3)
            reopened = DailyBudget(path, limit=100)
            with self.assertRaises(DailyBudgetExceeded):
                reopened.reserve(11)
            reopened.refund(days[0], 20)
            self.assertEqual(reopened.reserve(30), days[0])


    def test_budget_resets_at_midnight_eastern(self):
        with TemporaryDirectory() as directory:
            budget = DailyBudget(Path(directory) / "budget.sqlite3", limit=100)
            with patch("app.budget.datetime") as clock:
                before = datetime(2026, 11, 4, 4, 59, tzinfo=timezone.utc)
                after = datetime(2026, 11, 4, 5, 0, tzinfo=timezone.utc)
                clock.now.side_effect = lambda zone: before.astimezone(zone)
                self.assertEqual(budget.reserve(100), "2026-11-03")
                with self.assertRaises(DailyBudgetExceeded):
                    budget.reserve(1)
                clock.now.side_effect = lambda zone: after.astimezone(zone)
                self.assertEqual(budget.reserve(100), "2026-11-04")


class ModelFixtureTests(unittest.TestCase):
    def test_responses_tool_selection_streaming_and_daily_cap(self):
        requests = []

        def handler(request):
            self.assertEqual(str(request.url), 'https://api.openai.com/v1/responses')
            body = json.loads(request.content)
            requests.append(body)
            self.assertEqual(body['model'], 'gpt-6-luna')
            self.assertEqual(body['reasoning'], {'effort': 'max'})
            self.assertFalse(body['store'])
            usage = {'input_tokens': 20, 'output_tokens': 12, 'total_tokens': 32}
            if 'tools' in body:
                self.assertEqual(body['tools'][0]['name'], 'read_course_files')
                filename = 'lectures.md' if 'class meet' in body['input'] else 'milestones.md'
                return httpx.Response(200, json={
                    'id': 'resp_selection', 'status': 'completed', 'usage': usage,
                    'output': [{'type': 'function_call', 'name': 'read_course_files',
                                'call_id': 'fixture', 'arguments': json.dumps({'filenames': [filename]})}],
                })
            self.assertTrue(body['stream'])
            self.assertIn('only facts explicitly supported', body['instructions'])
            deltas = ['The course meets ', 'in SEC 1.321.']
            events = [
                {'type': 'response.output_text.delta', 'delta': delta}
                for delta in deltas
            ]
            events.append({'type': 'response.completed', 'response': {
                'id': 'resp_answer', 'status': 'completed', 'usage': usage,
                'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': ''.join(deltas)}]}],
            }})
            return httpx.Response(200, headers={'Content-Type': 'text/event-stream'},
                                  text=''.join('data: ' + json.dumps(event) + '\n\n' for event in events))

        def client_factory(**kwargs):
            return AsyncOpenAI(**kwargs, http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))

        with TemporaryDirectory() as directory:
            env = {**SOURCE_ENV, 'OPENAI_API_KEY': 'fixture-key',
                   'COURSE_BUDGET_DB': str(Path(directory) / 'budget.sqlite3')}
            with patch.dict(os.environ, env), patch('app.qa.AsyncOpenAI', side_effect=client_factory), TestClient(app) as client:
                response = client.post('/api/chat/stream', json={'question': 'Where does the class meet?'})
                events = stream_events(response)
                self.assertEqual([event['type'] for event in events],
                                 ['started', 'read_start', 'read_complete', 'answer_delta', 'answer_delta', 'answer'])
                self.assertEqual(events[-1]['answer'], ''.join(event['delta'] for event in events if event['type'] == 'answer_delta'))
                self.assertIn('SEC 1.321', json.loads(requests[1]['input'])['course_notes']['lectures.md'])
                self.assertNotIn('tools', requests[1])
                second = client.post('/api/chat/stream', json={'question': 'When is milestone 3 due?'})
                self.assertEqual(second.status_code, 200, second.text)
                self.assertEqual(stream_events(second)[1]['filename'], 'milestones.md')
                self.assertNotIn('Where does the class meet?', json.dumps(requests[2:]))

                app.state.agent.budget.limit = RESERVATION - 1
                self.assertEqual(client.post('/api/chat', json={'question': 'Where does the class meet?'}).status_code, 404)
                blocked = client.post('/api/chat/stream', json={'question': 'Where does the class meet?'})
                self.assertIn('"code": "daily_budget"', blocked.text)
                self.assertEqual(len(requests), 4)


if __name__ == '__main__':
    unittest.main()
