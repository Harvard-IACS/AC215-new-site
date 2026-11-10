#!/usr/bin/env python3
"""Render the Nginx configuration for one DNS hostname or IPv4 address."""
import ipaddress
from pathlib import Path
import re
import sys


def validate_host(domain):
    try:
        return str(ipaddress.IPv4Address(domain))
    except ipaddress.AddressValueError:
        pass
    labels = domain.split('.')
    if (len(domain) > 253 or len(labels) < 2 or
            any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in labels) or
            not re.fullmatch(r'[a-z]{2,}', labels[-1])):
        raise ValueError('Enter one lowercase DNS hostname or IPv4 address, without a scheme, port, or path.')
    return domain


def render(domain):
    domain = validate_host(domain)
    return Path(__file__).with_name('nginx.conf.in').read_text().replace('__DOMAIN__', domain)


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2:
            raise ValueError('Use: render-nginx.py YOUR_HOST')
        print(render(sys.argv[1]), end='')
    except ValueError as error:
        raise SystemExit(str(error))
