# Gene Research / Sequence Workbench

[![CI](https://github.com/light-suzuki/Gene-research/actions/workflows/ci.yml/badge.svg)](https://github.com/light-suzuki/Gene-research/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/light-suzuki/=semver)](https://github.com/light-suzuki/Gene-research/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)


A local-first sequence analysis GUI for Windows. The browser and React frontend run on Windows; FastAPI, NCBI BLAST+, and Primer3 run in WSL2 Ubuntu. Your genomes and BLAST databases stay on your computer.

Windows向けのローカル配列解析GUIです。ブラウザとReact frontendはWindows、FastAPI・NCBI BLAST+・Primer3はWSL2 Ubuntuで動きます。ゲノムとBLAST DBは利用者のPC内に置きます。

## Features / 機能

- Sequence summary, GC, ORF, restriction sites, and SeqViz
- Primer3 primer design and local specificity checks
- Local BLAST and alignment inspection
- CDS/exon and sequencing-primer workflows
- Existing-primer lookup and predicted amplicons
- BLAST database registration
- CAPS marker candidate design
- Japanese/English UI selector

## Requirements / 必要条件

- Windows 10 or 11
- WSL2 with Ubuntu
- Node.js 20 or newer on Windows
- In WSL: Python 3, `python3-venv`, NCBI BLAST+, Primer3, and `netcat-openbsd`
- At least one user-supplied FASTA/BLAST database for BLAST workflows

Windows版Primer3はサポートしません。Primer3は安定したWSL版だけを使用します。

## Clean installation / 新規環境への導入

Open PowerShell:

```powershell
wsl --install -d Ubuntu
```

Restart Windows if requested, open Ubuntu once, create its Linux user, then install the backend tools:

```powershell
wsl -d Ubuntu -- bash -lc "sudo apt update && sudo apt install -y python3 python3-venv ncbi-blast+ primer3 netcat-openbsd"
```

Clone and start:

```powershell
git clone https://github.com/light-suzuki/Gene-research.git
cd Gene-research
.\start_windows.bat
```

The first start runs `npm ci`, creates the Python environment at
`~/.sequence_workbench/venvs/bioapi` inside WSL, installs Python packages,
starts the WSL backend on port 8000, starts the Windows UI on port 5173, and
opens <http://127.0.0.1:5173/>.

初回起動は依存関係を自動導入するため時間がかかります。Python仮想環境はリポジトリ内や
Windowsファイルシステムではなく、WSLの `~/.sequence_workbench/venvs/bioapi` に作成されます。

Stop all processes started by the launcher:

```powershell
.\stop_windows.ps1
```

## Use your own genome / 手持ちゲノムを使う

Do not copy a genome into this repository. Store it in WSL, build a BLAST
database, then register the database prefix in the **DB Manager** tab.

```bash
mkdir -p ~/sequence-workbench-data/blastdb
makeblastdb \
  -in ~/sequence-workbench-data/my_genome.fa \
  -dbtype nucl \
  -out ~/sequence-workbench-data/blastdb/my_genome
```

Register this prefix:

```text
/home/<your-wsl-user>/sequence-workbench-data/blastdb/my_genome
```

Register the prefix passed to `-out`, not `.nhr`, `.nin`, or `.nsq`
files. For protein databases use `-dbtype prot`.

ゲノムはrepo外に置き、`makeblastdb -out`へ渡したprefixをDB管理タブへ登録します。

## Optional configuration / 任意設定

Copy the WSL example only when tools or data are outside their default paths:

```powershell
Copy-Item backend\bioapi\.env.wsl.example backend\bioapi\.env.wsl
```

Values in `.env.wsl` must be Linux paths such as `/usr/bin/primer3_core` or
`/home/user/blastdb`. A Windows path such as `C:\data` is rejected at startup.

## Architecture / 構成

```text
Windows browser
  -> React/Vite UI       127.0.0.1:5173
  -> localhost proxy     127.0.0.1:8000
       -> WSL FastAPI    0.0.0.0:8000 inside WSL
            -> primer3_core
            -> blastn / blastp / makeblastdb
            -> user-supplied data outside this repository
```

The proxy exists because Windows-to-WSL localhost forwarding differs between
Windows/WSL configurations. The API rejects non-loopback Host headers by default.

## Focused repositories / 機能別repo

- [SequenceInspector](https://github.com/light-suzuki/SequenceInspector) — offline browser-only sequence checks
- [LocalBlastWorkbench](https://github.com/light-suzuki/LocalBlastWorkbench) — BLAST, BLAST-OR, and DB management
- [PrimerWorkbench](https://github.com/light-suzuki/PrimerWorkbench) — primer design, specificity checks, and primer lookup
- [MarkerWorkbench](https://github.com/light-suzuki/MarkerWorkbench) — CDS/exon, sequencing-primer, and CAPS workflows

These are real source-level distributions. They contain only their relevant
top-level UI panels instead of hiding the other tabs at runtime.

各repoは表示だけを隠した複製ではなく、不要なトップレベルパネルをソースから除いた配布版です。

## Verification / 検証

Frontend:

```powershell
npm --prefix frontend\workbench ci
npm --prefix frontend\workbench run typecheck
npm --prefix frontend\workbench run build
npm --prefix frontend\workbench audit --audit-level=moderate
```

Backend in WSL:

```powershell
wsl -d Ubuntu -- bash -lc "cd '$(wslpath -u '$PWD')/backend/bioapi' && ~/.sequence_workbench/venvs/bioapi/bin/python -m pytest"
```

Runtime:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/blast/local_dbs
```

## Troubleshooting / トラブルシュート

| Symptom / 症状 | Action / 対処 |
| --- | --- |
| `WSL2 with Ubuntu is required` | Run `wsl --install -d Ubuntu`, reboot if requested, and open Ubuntu once |
| `python3 not found` | Install the listed apt packages in Ubuntu |
| Primer3 is unavailable | Run `wsl which primer3_core`; do not install the Windows build |
| BLAST DB is not listed | Register the `makeblastdb -out` prefix and use a WSL path |
| Port 5173 or 8000 is in use | Stop the process using that port, or run this repo's `stop_windows.ps1` |
| Startup fails | Read `.runtime\backend.error.log`, `proxy.error.log`, and `frontend.error.log` |
| Browser shows an old UI | Stop, delete `frontend\workbench\node_modules\.vite`, and start again |

## Clean removal / 完全削除

First run `stop_windows.ps1`. Delete the cloned repository. To also delete the
shared Python environment and all data you deliberately stored in the example
location:

```powershell
wsl -d Ubuntu -- bash -lc "rm -rf ~/.sequence_workbench/venvs/bioapi ~/sequence-workbench-data"
```

The application never deletes user data automatically.

## Privacy and repository hygiene / プライバシー

No genome, BLAST database, private accession, API key, machine-specific absolute
path, or research result is bundled. Runtime files, `.env.wsl`, dependencies,
and logs are ignored by Git. The default workflow makes no cloud upload.

ゲノム、研究固有ID、配列、個人パス、APIキー、解析結果は同梱していません。通常利用で外部へアップロードしません。

## License, citation, and contributors

MIT License. Citation metadata is in [CITATION.cff](CITATION.cff). Contributors
and AI assistance are documented in [CONTRIBUTORS.md](CONTRIBUTORS.md).
