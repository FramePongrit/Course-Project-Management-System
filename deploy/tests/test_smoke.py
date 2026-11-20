"""Offline unit tests for deploy/smoke_test.py (the network is mocked).

Run (repo root):  python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'
CI runs it (.github/workflows/ci-docker.yml).
"""
from email.message import Message
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).parents[1] / 'smoke_test.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def headers(*cookies):
    msg = Message()
    for cookie in cookies:
        msg['Set-Cookie'] = cookie
    return msg


class SmokeTests(unittest.TestCase):
    def response(self, base, path, data=None, cookie=None):
        if path == '/api/me':
            if cookie == 'session=test-session':
                return 200, headers(), b'{"email":"alice@student.university.ac.th"}'
            return 401, headers(), b'{"error":{"code":"UNAUTHENTICATED"}}'
        return {
            '/api/health': (200, headers(), b'{"status":"ok"}'),
            '/api/ready': (200, headers(), b'{"status":"ready"}'),
            '/': (200, headers(), b'<!doctype html><html></html>'),
            '/api/auth/login': (200, headers('session=test-session; Path=/; HttpOnly; Secure'), b'{}'),
            '/api/auth/logout': (204, headers(), b''),
        }[path]

    @patch.dict('os.environ', {}, clear=True)
    def test_public_checks_pass_and_skip_optional_login(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            self.assertEqual(req.call_count, 4)

    @patch.dict('os.environ', {}, clear=True)
    def test_db_not_ready_fails_even_when_http_responds(self):
        def unavailable(base, path, data=None, cookie=None):
            if path == '/api/ready':
                return 503, headers(), b'{"status":"unavailable"}'
            return self.response(base, path, data, cookie)
        with patch.object(smoke, 'request', side_effect=unavailable), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/ready'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {}, clear=True)
    def test_open_api_without_auth_guard_fails(self):
        def unguarded(base, path, data=None, cookie=None):
            if path == '/api/me':
                return 200, headers(), b'{}'
            return self.response(base, path, data, cookie)
        with patch.object(smoke, 'request', side_effect=unguarded), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/me'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'alice@student.university.ac.th', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_login_uses_session_cookie_and_logs_out(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')
            self.assertEqual(req.call_args.kwargs.get('cookie'), 'session=test-session')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'alice@student.university.ac.th', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_session_is_logged_out_even_if_me_fails(self):
        def broken_me(base, path, data=None, cookie=None):
            if path == '/api/me' and cookie:
                return 500, headers(), b'{}'
            return self.response(base, path, data, cookie)
        with patch.object(smoke, 'request', side_effect=broken_me) as req:
            with self.assertRaisesRegex(RuntimeError, 'Login smoke'):
                smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'alice@student.university.ac.th'}, clear=True)
    def test_only_one_credential_is_an_error(self):
        with patch.object(smoke, 'request', side_effect=self.response):
            with self.assertRaisesRegex(RuntimeError, 'both'):
                smoke.check('https://demo.test')


if __name__ == '__main__':
    unittest.main()
