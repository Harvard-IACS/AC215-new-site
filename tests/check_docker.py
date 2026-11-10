#!/usr/bin/env python3
"""Check the actual stateless production image under the VM's restrictions."""
import json
import subprocess
import time
from urllib.request import Request, urlopen

NAME = 'ac215-runtime-check'

def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()

try:
    docker('run', '--detach', '--rm', '--init', '--name', NAME,
           '--user', '10001:10001', '--read-only', '--cap-drop=ALL',
           '--security-opt=no-new-privileges=true', '--memory=768m', '--memory-swap=768m',
           '--pids-limit=64', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
           '--publish', '127.0.0.1::8000', 'backend:check')
    port = json.loads(docker('inspect', NAME))[0]['NetworkSettings']['Ports']['8000/tcp'][0]['HostPort']
    base = 'http://127.0.0.1:' + port
    for _ in range(60):
        try:
            with urlopen(base + '/api/health', timeout=2) as response:
                assert json.load(response) == {'status': 'ok'}
            break
        except (OSError, TimeoutError):
            time.sleep(0.5)
    else:
        raise AssertionError('Container did not become healthy.')
    inspection = json.loads(docker('inspect', NAME))[0]
    assert inspection['Config']['User'] == '10001:10001'
    assert inspection['HostConfig']['ReadonlyRootfs']
    assert 'ALL' in inspection['HostConfig']['CapDrop']
    assert 'no-new-privileges=true' in inspection['HostConfig']['SecurityOpt']
    assert inspection['HostConfig']['Memory'] == 768 * 1024 * 1024
    assert inspection['HostConfig']['PidsLimit'] == 64
    assert not inspection['Mounts'], 'The stateless app must not need a persistent data mount.'
    request = Request(base + '/api/chat/stream', data=json.dumps({'question': 'Where does the class meet?'}).encode(), headers={'Content-Type': 'application/json'})
    with urlopen(request, timeout=10) as response:
        events = [json.loads(line[6:]) for line in response if line.startswith(b'data: ')]
        answer = events[-1]
        assert answer['type'] == 'answer'
        assert answer['mode'] == 'sources' and 'SEC 1.321' in answer['answer']
        assert 'Set-Cookie' not in response.headers
    # A fresh container produces the same source answer without restoring a database.
    docker('restart', NAME)
    port = json.loads(docker('inspect', NAME))[0]['NetworkSettings']['Ports']['8000/tcp'][0]['HostPort']
    base = 'http://127.0.0.1:' + port
    for _ in range(40):
        try:
            with urlopen(base + '/api/course', timeout=2) as response:
                assert json.load(response)['answer_mode'] == 'sources'
            break
        except (OSError, TimeoutError):
            time.sleep(0.5)
    else:
        raise AssertionError('Container did not recover after restart.')
    print('PASS: real FastAPI image, health, source Q&A, restart, non-root/read-only/capabilities/resource limits, no persistent mount.')
finally:
    subprocess.run(['docker', 'rm', '--force', NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
