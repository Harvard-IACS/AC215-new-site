#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
for file in "$ROOT"/scripts/*.sh "$ROOT"/vm/*.sh; do bash -n "$file"; done
python3 - "$ROOT" <<'PY'
import ast
from pathlib import Path
import sys
root = Path(sys.argv[1])
for folder in ('vm', 'scripts', 'tests', 'backend/app', 'backend/tests'):
    for path in (root / folder).glob('*.py'):
        ast.parse(path.read_text(), filename=str(path))
print('PASS: shell syntax and Python parsing; no packages installed or cloud calls made.')
PY
for file in "$ROOT"/frontend/scripts/*.mjs "$ROOT"/frontend/tests/*.mjs; do
  [[ -f "$file" ]] && node --check "$file"
done
echo 'PASS: frontend check-script syntax. Run the frontend build to check JSX.'
