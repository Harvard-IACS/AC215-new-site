#!/usr/bin/env python3
"""Validate pinned Artifact Registry references and obtain VM identity tokens."""
import json
import re
import sys
from urllib.request import Request, urlopen

IMAGE_PATTERN = re.compile(
    r'(?P<host>[a-z]+-[a-z]+[0-9]+-docker\.pkg\.dev)/'
    r'[a-z][a-z0-9-]{4,28}[a-z0-9]/[a-z][a-z0-9-]*/'
    r'[a-z0-9][a-z0-9._-]*@sha256:[a-f0-9]{64}'
)


def registry_host(image):
    match = IMAGE_PATTERN.fullmatch(image)
    if not match:
        raise ValueError('Use the regional Artifact Registry image reference ending in @sha256:DIGEST.')
    return match['host']


def metadata_access_token(opener=urlopen):
    request = Request(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        headers={'Metadata-Flavor': 'Google'},
    )
    with opener(request, timeout=10) as response:
        token = json.load(response).get('access_token')
    if not isinstance(token, str) or not token or any(char.isspace() for char in token):
        raise ValueError('The VM metadata service did not return a usable access token.')
    return token


if __name__ == '__main__':
    try:
        if sys.argv[1:] == ['token']:
            print(metadata_access_token())
        elif len(sys.argv) == 3 and sys.argv[1] == 'host':
            print(registry_host(sys.argv[2]))
        else:
            raise ValueError('Use: registry.py host IMAGE_REFERENCE, or registry.py token on the VM.')
    except Exception:
        # Authentication responses can contain credentials; keep errors generic.
        raise SystemExit('Could not validate the image or obtain the VM identity token. Check the image digest, attached service account, access scope, and repository Reader role.')
