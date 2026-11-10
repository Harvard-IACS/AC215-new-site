#!/usr/bin/env python3
"""Temporary ALB IP validation server; serves one public token and health only."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import re
import sys


def validation_response(path):
    token = path.name
    content = path.read_bytes()
    if not re.fullmatch(r'[A-Za-z0-9_-]+', token):
        raise ValueError('The filename must be the ACME token.')
    if not re.fullmatch(rb'[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', content):
        raise ValueError('The file must contain only the public ACME validation response.')
    if content.split(b'.', 1)[0].decode() != token:
        raise ValueError('The validation content must match its token filename.')
    return token, content


def handler_for(token, content):
    class ValidationHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == '/api/health':
                body, content_type = b'{"status":"ok"}', 'application/json'
            elif self.path == '/.well-known/acme-challenge/' + token:
                body, content_type = content, 'text/plain'
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
    return ValidationHandler


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Use: serve-acme-challenge.py PUBLIC_TOKEN_FILE')
    try:
        token, content = validation_response(Path(sys.argv[1]))
    except ValueError as error:
        raise SystemExit(str(error))
    HTTPServer(('0.0.0.0', 8000), handler_for(token, content)).serve_forever()
