#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/backend/bioapi"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found in WSL. Please install Python 3 first."
  exit 1
fi

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
