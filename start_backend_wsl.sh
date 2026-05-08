#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend/bioapi"

cd "${BACKEND_DIR}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found in WSL. Install it first: sudo apt update && sudo apt install -y python3 python3-venv"
  exit 1
fi

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

if [[ -f ".env.wsl" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.wsl"
  set +a
fi

if [[ "${BLASTDB_DIR:-}" =~ ^[A-Za-z]:\\ ]]; then
  echo "BLASTDB_DIR looks like a Windows path: ${BLASTDB_DIR}"
  echo "When backend runs in WSL, use Linux paths (example: /home/<user>/blastdb or /mnt/c/...)."
  exit 1
fi

if [[ "${BLAST_BIN_DIR:-}" =~ ^[A-Za-z]:\\ ]]; then
  echo "BLAST_BIN_DIR looks like a Windows path: ${BLAST_BIN_DIR}"
  echo "When backend runs in WSL, use Linux paths (example: /usr/bin or /mnt/c/...)."
  exit 1
fi

if [[ "${PRIMER3_CORE:-}" =~ ^[A-Za-z]:\\ ]]; then
  echo "PRIMER3_CORE looks like a Windows path: ${PRIMER3_CORE}"
  echo "When backend runs in WSL, use Linux path to primer3_core (example: /usr/bin/primer3_core)."
  exit 1
fi

if ! command -v blastn >/dev/null 2>&1 && [[ -z "${BLAST_BIN_DIR:-}" ]]; then
  echo "Warning: blastn not found in PATH. Set BLAST_BIN_DIR in backend/bioapi/.env.wsl if needed."
fi

if ! command -v primer3_core >/dev/null 2>&1 && [[ -z "${PRIMER3_CORE:-}" ]]; then
  echo "Warning: primer3_core not found in PATH. Set PRIMER3_CORE in backend/bioapi/.env.wsl if needed."
fi

echo "Starting BioAPI on 127.0.0.1:8000 (WSL backend)."
uvicorn app.main:app --host 127.0.0.1 --port 8000
