#!/usr/bin/env python3
"""Verify a deployed course origin with public data and no model-provider call."""
import json
import os
import re
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

base = os.environ['BASE_URL'].rstrip('/')
if urlsplit(base).scheme not in ('http', 'https'):
    raise SystemExit('BASE_URL must use http:// or https://')


def request(path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    try:
        response = urlopen(Request(base + path, data=data, headers={'Content-Type': 'application/json'}), timeout=25)
    except HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read()


status, headers, body = request('/')
assert status == 200 and 'text/html' in headers.get('Content-Type', '')
assert 'no-store' in headers.get('Cache-Control', '')
html = body.decode()
assert 'AC215' in html and 'Pavlos Protopapas' in html, 'Expected prerendered course content'
asset = re.search(r'(?:src|href)="(/assets/[^\"]+\.js)"', html)
assert asset
status, headers, _ = request(asset.group(1))
assert status == 200 and 'immutable' in headers.get('Cache-Control', '')
status, headers, body = request('/api/health')
assert status == 200 and json.loads(body) == {'status': 'ok'}
status, headers, body = request('/api/course')
assert status == 200 and 'no-store' in headers.get('Cache-Control', '')
if json.loads(body)['answer_mode'] == 'sources':
    status, headers, body = request('/api/chat/stream', {'question': 'Where does the class meet?'})
    events = [json.loads(line[6:]) for line in body.decode().splitlines() if line.startswith('data: ')]
    answer = events[-1]
    assert status == 200 and answer['type'] == 'answer' and 'SEC 1.321' in answer['answer']
    assert answer['mode'] == 'sources'
    assert 'Set-Cookie' not in headers
status, _, _ = request('/api/sessions')
assert status == 404
status, _, body = request('/lesson/intro')
assert status == 404 and b'course showcase has one page' in body
print('PASS: course HTML, caching, API health/metadata, stateless source Q&A (if enabled), and 404. No paid model call.')
