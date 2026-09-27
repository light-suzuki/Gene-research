"""Local JSON CLI. No HTTP server, browser or external model is started."""
import argparse
import contextlib
import json
from pathlib import Path
import sys

from .application import capabilities, execute


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="gene-research")
    parser.add_argument("action", choices=["schema", "run"])
    parser.add_argument("--input", default="-", help="JSON request file, or - for stdin")
    args = parser.parse_args(argv)
    if args.action == "schema":
        print(json.dumps(capabilities(), ensure_ascii=False))
        return 0
    request = {}
    try:
        raw = sys.stdin.read() if args.input == "-" else Path(args.input).read_text(encoding="utf-8-sig")
        request = json.loads(raw)
        if not isinstance(request, dict) or set(request) - {"operation", "params", "request_id"}:
            raise ValueError("Expected operation, params and optional request_id")
        if not isinstance(request.get("operation"), str) or not isinstance(request.get("params"), dict):
            raise ValueError("operation and params are required")
        if "request_id" in request and not isinstance(request["request_id"], str):
            raise ValueError("request_id must be a string")
        with contextlib.redirect_stdout(sys.stderr):
            result = execute(request["operation"], request["params"])
        output = {"schema_version": "gene-research-agent/1", "ok": True,
                  "operation": request["operation"], "result": result}
        code = 0
    except Exception as exc:
        output = {"schema_version": "gene-research-agent/1", "ok": False,
                  "error": {"code": "invalid_request" if isinstance(exc, (ValueError, KeyError)) else "execution_failed",
                            "message": str(exc)}}
        code = 2 if output["error"]["code"] == "invalid_request" else 1
    if isinstance(request, dict) and "request_id" in request:
        output["request_id"] = request["request_id"]
    print(json.dumps(output, ensure_ascii=False, allow_nan=False))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
