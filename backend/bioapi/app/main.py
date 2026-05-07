import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


DNA_RE = re.compile(r"[^ACGTRYSWKMBDHVN]", re.IGNORECASE)
COMP = str.maketrans("ACGTRYSWKMBDHVNacgtryswkmbdhvn", "TGCAYRSWMKVHDBNtgcayrswmkvhdbn")
STOP_CODONS = {"TAA", "TAG", "TGA"}


def _is_loopback_host(value: str | None) -> bool:
    if not value:
        return False
    raw = value.strip().lower()
    if raw.startswith("["):
        host = raw[1:].split("]", 1)[0]
    elif raw.count(":") == 1:
        host = raw.rsplit(":", 1)[0]
    else:
        host = raw
    return host in {"127.0.0.1", "localhost", "::1", "testclient"}


def _clean_sequence(sequence: str) -> str:
    seq = re.sub(r"\s+", "", sequence or "").upper()
    if not seq:
        raise HTTPException(status_code=400, detail="sequence is empty")
    bad = DNA_RE.search(seq)
    if bad:
        raise HTTPException(status_code=400, detail=f"invalid base: {bad.group(0)}")
    return seq


class SequenceRequest(BaseModel):
    sequence: str = Field(..., min_length=1)


class Orf(BaseModel):
    frame: str
    start: int
    end: int
    length: int


class SequenceSummary(BaseModel):
    length: int
    gc_percent: float
    a: int
    c: int
    g: int
    t: int
    n: int
    reverse_complement: str
    orfs: list[Orf]


class BlastRunRequest(BaseModel):
    sequence: str = Field(..., min_length=1)
    database: str = Field(..., min_length=1, description="User-provided makeblastdb prefix path")
    program: str = Field("blastn", pattern="^(blastn|blastp|blastx|tblastn|tblastx)$")
    max_target_seqs: int = Field(10, ge=1, le=100)
    evalue: str = "1e-5"


class BlastRunResponse(BaseModel):
    command: list[str]
    stdout: str
    stderr: str


class Primer3RunRequest(BaseModel):
    sequence_id: str = "query"
    sequence_template: str = Field(..., min_length=1)
    product_size_range: str = "80-250"
    num_return: int = Field(5, ge=1, le=50)


class ToolStatus(BaseModel):
    name: str
    configured: bool
    path: str
    detail: str


def _optional_tool_path(env_name: str, executable: str) -> str:
    configured = os.getenv(env_name, "").strip()
    if configured:
        return configured
    base = os.getenv(f"{env_name}_DIR", "").strip()
    return str(Path(base) / executable) if base else executable


def _run_tool(cmd: list[str], stdin: str | None = None, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(cmd, input=stdin, capture_output=True, text=True, timeout=timeout, check=False)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Executable not found: {cmd[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=504, detail=f"Command timed out: {cmd[0]}") from exc


def _find_orfs(seq: str, min_len: int = 90) -> list[Orf]:
    out: list[Orf] = []
    strands = [("+", seq), ("-", seq.translate(COMP)[::-1])]
    for strand, s in strands:
        for frame in range(3):
            i = frame
            while i <= len(s) - 3:
                codon = s[i : i + 3]
                if codon == "ATG":
                    j = i + 3
                    while j <= len(s) - 3:
                        if s[j : j + 3] in STOP_CODONS:
                            length = j + 3 - i
                            if length >= min_len:
                                if strand == "+":
                                    start, end = i + 1, j + 3
                                else:
                                    start, end = len(seq) - (j + 3) + 1, len(seq) - i
                                out.append(Orf(frame=f"{strand}{frame + 1}", start=start, end=end, length=length))
                            break
                        j += 3
                    i = j
                i += 3
    return sorted(out, key=lambda x: x.length, reverse=True)[:50]


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sequence Workbench BioAPI",
        description="Local-only API for generic sequence utilities and user-managed BLAST databases.",
        version="0.1.0",
    )

    allowed_origins = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.middleware("http")
    async def localhost_only_guard(request: Request, call_next):
        if os.getenv("SEQWB_ALLOW_NON_LOOPBACK", "0").strip().lower() in {"1", "true", "yes"}:
            return await call_next(request)
        client_host = request.client.host if request.client else ""
        host_header = request.headers.get("host", "")
        if not _is_loopback_host(client_host) or not _is_loopback_host(host_header):
            return JSONResponse(status_code=403, content={"detail": "BioAPI is localhost-only by default."})
        return await call_next(request)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/meta")
    async def meta() -> dict[str, object]:
        return {
            "python": sys.version.split()[0],
            "blastdb_dir": os.getenv("BLASTDB_DIR", ""),
            "blast_bin_dir": os.getenv("BLAST_BIN_DIR", ""),
            "primer3_core": os.getenv("PRIMER3_CORE", ""),
            "wsl_distro": os.getenv("SEQWB_WSL_DISTRO", ""),
        }

    @app.get("/tools/status", response_model=list[ToolStatus])
    async def tools_status() -> list[ToolStatus]:
        checks = [
            ("BLAST+", _optional_tool_path("BLAST_BIN", "blastn"), "-version"),
            ("Primer3", _optional_tool_path("PRIMER3_CORE", "primer3_core"), "--version"),
            ("WSL", os.getenv("WSL_EXE", "wsl.exe"), "--status"),
        ]
        out: list[ToolStatus] = []
        for name, path, version_arg in checks:
            proc = _run_tool([path, version_arg], timeout=15)
            configured = proc.returncode == 0
            detail = (proc.stdout or proc.stderr).strip().splitlines()[0] if (proc.stdout or proc.stderr).strip() else ""
            out.append(ToolStatus(name=name, configured=configured, path=path, detail=detail))
        db_dir = os.getenv("BLASTDB_DIR", "").strip()
        db_path = Path(db_dir).expanduser() if db_dir else None
        out.append(
            ToolStatus(
                name="User BLAST DB",
                configured=bool(db_path and db_path.exists()),
                path=db_dir,
                detail="BLASTDB_DIR exists" if db_path and db_path.exists() else "Set BLASTDB_DIR to a user-managed database folder",
            )
        )
        return out

    @app.post("/sequence/summary", response_model=SequenceSummary)
    async def sequence_summary(body: SequenceRequest) -> SequenceSummary:
        seq = _clean_sequence(body.sequence)
        gc = seq.count("G") + seq.count("C")
        return SequenceSummary(
            length=len(seq),
            gc_percent=round((gc / len(seq)) * 100, 2),
            a=seq.count("A"),
            c=seq.count("C"),
            g=seq.count("G"),
            t=seq.count("T"),
            n=seq.count("N"),
            reverse_complement=seq.translate(COMP)[::-1],
            orfs=_find_orfs(seq),
        )

    @app.get("/blast/local_dbs")
    async def list_local_blast_dbs() -> list[dict[str, str]]:
        base = os.getenv("BLASTDB_DIR")
        if not base:
            return []
        root = Path(base).expanduser()
        if not root.exists():
            return []
        prefixes: set[Path] = set()
        for suffix in ("*.nsq", "*.psq"):
            for item in root.glob(suffix):
                prefixes.add(item.with_suffix(""))
        return [{"label": p.name, "path": str(p)} for p in sorted(prefixes)]

    @app.post("/blast/run", response_model=BlastRunResponse)
    async def run_blast(body: BlastRunRequest) -> BlastRunResponse:
        seq = _clean_sequence(body.sequence)
        executable = str(Path(os.getenv("BLAST_BIN_DIR", "")) / body.program) if os.getenv("BLAST_BIN_DIR") else body.program
        cmd = [
            executable,
            "-query", "",
            "-db", body.database,
            "-outfmt", "6 qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore stitle",
            "-max_target_seqs", str(body.max_target_seqs),
            "-evalue", body.evalue,
        ]
        try:
            with tempfile.NamedTemporaryFile("w", delete=False, suffix=".fa", encoding="utf-8") as handle:
                handle.write(">query\n")
                handle.write(seq + "\n")
                query_path = handle.name
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

        cmd[cmd.index("-query") + 1] = query_path
        try:
            proc = _run_tool(cmd, timeout=120)
        finally:
            try:
                Path(query_path).unlink(missing_ok=True)
            except Exception:
                pass
        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail=proc.stderr.strip() or "BLAST failed")
        return BlastRunResponse(command=cmd, stdout=proc.stdout, stderr=proc.stderr)

    @app.post("/primer3/run", response_model=BlastRunResponse)
    async def run_primer3(body: Primer3RunRequest) -> BlastRunResponse:
        seq = _clean_sequence(body.sequence_template)
        executable = os.getenv("PRIMER3_CORE", "primer3_core")
        payload = "\n".join(
            [
                f"SEQUENCE_ID={body.sequence_id}",
                f"SEQUENCE_TEMPLATE={seq}",
                f"PRIMER_PRODUCT_SIZE_RANGE={body.product_size_range}",
                f"PRIMER_NUM_RETURN={body.num_return}",
                "PRIMER_TASK=generic",
                "=",
                "",
            ]
        )
        proc = _run_tool([executable], stdin=payload, timeout=60)
        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail=proc.stderr.strip() or "Primer3 failed")
        return BlastRunResponse(command=[executable], stdout=proc.stdout, stderr=proc.stderr)

    return app


app = create_app()
