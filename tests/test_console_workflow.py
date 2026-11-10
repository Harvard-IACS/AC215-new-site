"""Local checks for Console-era image delivery and VM configuration helpers."""
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
ACCOUNT = 'gceweb-access@tutorial-test-project.iam.gserviceaccount.com'
IMAGE = 'us-central1-docker.pkg.dev/tutorial-test-project/labtest-images/backend'
DIGEST = 'sha256:' + 'a' * 64


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


registry = load_module('ac215_registry', ROOT / 'vm/registry.py')
nginx = load_module('ac215_nginx', ROOT / 'vm/render-nginx.py')

FAKE_TOOL = r'''#!/usr/bin/env python3
import json, os, pathlib, sys
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
with pathlib.Path(os.environ['CALL_LOG']).open('a') as log:
    log.write(json.dumps({'tool': name, 'args': args, 'account': os.environ.get('CLOUDSDK_CORE_ACCOUNT')}) + '\n')
if name == 'gcloud' and 'list' in args and 'auth' in args:
    print('gceweb-access@tutorial-test-project.iam.gserviceaccount.com')
if name == 'docker' and args[0] == 'push':
    if os.environ.get('FAIL_PUSH'):
        raise SystemExit(7)
    print('v1: digest: sha256:' + 'a' * 64 + ' size: 1234')
if name == 'npm':
    root = pathlib.Path(os.environ['FIXTURE_ROOT'])
    dist = root / 'frontend/dist'
    (dist / 'assets').mkdir(parents=True, exist_ok=True)
    (dist / 'assets/chat-123.js').write_text("console.log('fixture');")
    (dist / 'index.html').write_text('<script src="/assets/chat-123.js"></script>')
    (dist / '404.html').write_text('Not found')
'''


class RegistryAndNginxTests(unittest.TestCase):
    def test_only_digest_pinned_regional_registry_images_are_accepted(self):
        self.assertEqual(registry.registry_host(IMAGE + '@' + DIGEST), 'us-central1-docker.pkg.dev')
        for image in (IMAGE + ':latest', 'docker.io/example/app@' + DIGEST,
                      IMAGE + '@' + DIGEST + '\nEnvironment=BAD=1',
                      'https://' + IMAGE + '@' + DIGEST):
            with self.subTest(image=image), self.assertRaises(ValueError):
                registry.registry_host(image)

    def test_metadata_token_uses_vm_identity_endpoint_and_required_header(self):
        seen = []

        def opener(request, timeout):
            seen.append((request.full_url, dict(request.header_items()), timeout))
            return io.BytesIO(b'{"access_token":"fixture-token","expires_in":3600}')

        self.assertEqual(registry.metadata_access_token(opener), 'fixture-token')
        url, headers, timeout = seen[0]
        self.assertEqual(url, 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token')
        self.assertEqual(headers['Metadata-flavor'], 'Google')
        self.assertEqual(timeout, 10)

    def test_unusable_metadata_token_is_rejected(self):
        for body in (b'{}', b'{"access_token":""}', b'{"access_token":"bad token"}'):
            with self.subTest(body=body), self.assertRaises(ValueError):
                registry.metadata_access_token(lambda request, timeout: io.BytesIO(body))

    def test_nginx_domain_input_cannot_inject_configuration(self):
        text = nginx.render('chat.school.edu')
        self.assertIn('server_name chat.school.edu;', text)
        self.assertNotIn('__DOMAIN__', text)
        for domain in ('https://chat.school.edu', 'chat.school.edu; include /tmp/bad;',
                       'chat.school.edu\nserver {}', 'chat.school.edu:443', '-chat.school.edu'):
            with self.subTest(domain=domain), self.assertRaises(ValueError):
                nginx.render(domain)

    def test_ipv4_host_preserves_http_api_routing(self):
        text = nginx.render('203.0.113.10')
        self.assertIn('server_name 203.0.113.10;', text)
        self.assertIn('listen 80;', text)
        self.assertIn('proxy_pass http://127.0.0.1:8000;', text)
        for host in ('999.1.2.3', '203.0.113.10:443', '203.0.113.10; include /tmp/bad;',
                     '203.0.113.10/../../bad', '203.0.113.010', '::1'):
            with self.subTest(host=host), self.assertRaises(ValueError):
                nginx.render(host)


class ImageDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / 'tutorial'
        shutil.copytree(ROOT / 'scripts', self.root / 'scripts')
        shutil.copytree(ROOT / 'vm', self.root / 'vm')
        (self.root / 'backend').mkdir()
        (self.root / 'backend/Dockerfile').write_text('FROM fixture-only\n')
        (self.root / 'secrets').mkdir()
        (self.root / 'secrets/gcp-service-account.json').write_text('PRIVATE-FIXTURE-DO-NOT-UPLOAD')
        self.set_mode('single-vm')
        binary = self.root / 'bin'
        binary.mkdir()
        for name in ('gcloud', 'docker', 'npm'):
            executable = binary / name
            executable.write_text(FAKE_TOOL)
            executable.chmod(0o755)
        self.log = self.root / 'calls.jsonl'
        self.env = {**os.environ, 'PATH': f"{binary}:{os.environ['PATH']}",
                    'CALL_LOG': str(self.log), 'FIXTURE_ROOT': str(self.root)}

    def tearDown(self):
        self.temporary.cleanup()

    def set_mode(self, mode):
        (self.root / 'config.env').write_text(
            'PROJECT_ID=tutorial-test-project\nREGION=us-central1\nZONE=us-central1-a\n'
            'PREFIX=labtest\nDOMAIN=chat.school.edu\nMACHINE_TYPE=e2-small\n'
            f'DEPLOYMENT_MODE={mode}\nBUCKET=tutorial-test-project-public\n'
            f'ACCESS_SERVICE_ACCOUNT={ACCOUNT}\nSERVICE_ACCOUNT_KEY_FILE=secrets/gcp-service-account.json\n')

    def run_script(self, name, *args, fail_push=False):
        env = {**self.env, **({'FAIL_PUSH': '1'} if fail_push else {})}
        return subprocess.run(['bash', str(self.root / 'scripts' / name), *args],
                              env=env, text=True, capture_output=True)

    def calls(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []

    def write_key(self, email=ACCOUNT, key_type='service_account'):
        (self.root / 'secrets/gcp-service-account.json').write_text(json.dumps({
            'type': key_type, 'client_email': email, 'private_key': 'PRIVATE-KEY-FIXTURE'}))

    def test_authentication_activates_matching_account_without_printing_key(self):
        self.write_key()
        result = self.run_script('00-auth.sh')
        self.assertEqual(result.returncode, 0, result.stderr)
        activation = next(call for call in self.calls() if 'activate-service-account' in call['args'])
        self.assertIn(ACCOUNT, activation['args'])
        self.assertIn(f'--key-file={self.root}/secrets/gcp-service-account.json', activation['args'])
        self.assertNotIn('PRIVATE-KEY-FIXTURE', result.stdout + result.stderr + self.log.read_text())

    def test_unusable_local_keys_stop_before_cloud_commands(self):
        key = self.root / 'secrets/gcp-service-account.json'
        for body in [None, 'not JSON', json.dumps({'type': 'authorized_user'}),
                     json.dumps({'type': 'service_account', 'client_email': 'other@example.com'})]:
            with self.subTest(body=body):
                if key.exists():
                    key.unlink()
                if body is not None:
                    key.write_text(body)
                result = self.run_script('00-auth.sh')
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.calls(), [])

    def test_ssh_selects_iap_identity_and_forwards_remote_command(self):
        result = self.run_script('ssh.sh', '--command=id')
        self.assertEqual(result.returncode, 0, result.stderr)
        ssh = next(call for call in self.calls() if 'ssh' in call['args'])
        for arg in ['--project=tutorial-test-project', f'--account={ACCOUNT}',
                    'labtest-api', '--zone=us-central1-a', '--tunnel-through-iap',
                    '--impersonate-service-account=labtest-ssh@tutorial-test-project.iam.gserviceaccount.com',
                    '--command=id']:
            self.assertIn(arg, ssh['args'])
        self.assertFalse(any(action in ssh['args'] for action in ('create', 'delete')))

    def test_image_delivery_does_not_require_console_only_configuration(self):
        config = self.root / 'config.env'
        lines = config.read_text().splitlines()
        config.write_text('\n'.join(line for line in lines
            if not line.startswith(('BUCKET=', 'DOMAIN=', 'MACHINE_TYPE='))) + '\n')
        result = self.run_script('build-push.sh', 'v1')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / '.build/image-ref.txt').read_text().strip(), IMAGE + '@' + DIGEST)

    def test_local_build_push_selects_amd64_and_records_the_actual_digest(self):
        result = self.run_script('build-push.sh', 'v1')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / '.build/image-ref.txt').read_text().strip(), IMAGE + '@' + DIGEST)
        calls = self.calls()
        build = next(call for call in calls if call['tool'] == 'docker' and call['args'][0] == 'build')
        self.assertIn('--platform=linux/amd64', build['args'])
        self.assertIn(str(self.root / 'backend'), build['args'])
        push = next(call for call in calls if call['tool'] == 'docker' and call['args'][0] == 'push')
        self.assertEqual(push['account'], ACCOUNT)
        self.assertEqual(push['args'][1], IMAGE + ':v1')
        self.assertFalse(any('secrets/' in str(call) for call in calls))

    def test_failed_push_does_not_create_a_deployment_reference(self):
        self.assertEqual(self.run_script('build-push.sh', 'v1').returncode, 0)
        result = self.run_script('build-push.sh', 'v1', fail_push=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / '.build/image-ref.txt').exists())

    def test_image_push_does_not_need_a_vm_or_public_host(self):
        config = self.root / 'config.env'
        config.write_text(config.read_text().replace('DOMAIN=chat.school.edu', 'DOMAIN='))
        result = self.run_script('build-push.sh', 'v1')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / '.build/image-ref.txt').read_text().strip(), IMAGE + '@' + DIGEST)
        self.assertFalse(any('ssh' in call['args'] for call in self.calls()))

    def test_uploaded_archive_contains_only_vm_files_and_profile_frontend(self):
        self.assertEqual(self.run_script('build-push.sh', 'v1').returncode, 0)
        subprocess.run(['npm', 'run', 'build', '--prefix', str(self.root / 'frontend')],
                       env=self.env, check=True, capture_output=True)
        for mode in ('single-vm', 'alb-cdn'):
            self.set_mode(mode)
            self.log.write_text('')
            result = self.run_script('upload-vm-files.sh')
            self.assertEqual(result.returncode, 0, result.stderr)
            with tarfile.open(self.root / '.build/course-vm.tar.gz') as archive:
                names = [name.removeprefix('./') for name in archive.getnames()]
                self.assertIn('vm/deploy-from-registry.sh', names)
                self.assertEqual('vm/nginx.conf.in' in names, mode == 'single-vm')
                self.assertEqual('vm/install-nginx.sh' in names, mode == 'single-vm')
                self.assertIn(f'vm/webdemo-{mode}.conf', names)
                other_mode = 'alb-cdn' if mode == 'single-vm' else 'single-vm'
                self.assertNotIn(f'vm/webdemo-{other_mode}.conf', names)
                self.assertIn('image-ref.txt', names)
                self.assertEqual('frontend/dist/index.html' in names, mode == 'single-vm')
                self.assertFalse(any(name.startswith(('secrets/', 'backend/')) or name == 'config.env' for name in names))
                self.assertNotIn(b'PRIVATE-FIXTURE-DO-NOT-UPLOAD', b''.join(
                    archive.extractfile(member).read() for member in archive.getmembers() if member.isfile()))
            remote = [call for call in self.calls() if call['tool'] == 'gcloud' and 'scp' in call['args']]
            self.assertEqual(len(remote), 1)
            self.assertIn('--tunnel-through-iap', remote[0]['args'])
            self.assertIn('--impersonate-service-account=labtest-ssh@tutorial-test-project.iam.gserviceaccount.com', remote[0]['args'])
            self.assertFalse(any(call['tool'] == 'gcloud' and any(action in call['args'] for action in ('create', 'delete', 'update')) for call in self.calls()))

    def test_missing_frontend_build_stops_single_vm_upload(self):
        self.assertEqual(self.run_script('build-push.sh', 'v1').returncode, 0)
        self.log.write_text('')
        result = self.run_script('upload-vm-files.sh')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Build the frontend first', result.stderr)
        self.assertFalse(any('scp' in call['args'] for call in self.calls()))


if __name__ == '__main__':
    unittest.main()
