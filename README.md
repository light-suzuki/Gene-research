<h1 align="center">Gene Research / Sequence Workbench</h1>

<p align="center">
  手持ちのゲノム、BLAST+、Primer3を使って、Windows上で配列解析・プライマー設計・BLAST結果確認をGUI操作するローカルWebワークベンチ。<br>
  A local-first Windows-friendly sequence workbench for user-supplied genomes, BLAST+, and Primer3.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <img alt="Runs locally" src="https://img.shields.io/badge/runs-localhost-0f766e.svg">
  <img alt="Data" src="https://img.shields.io/badge/data-user%20supplied-2563eb.svg">
  <img alt="UI" src="https://img.shields.io/badge/UI-Japanese--first-f59e0b.svg">
  <img alt="Backend" src="https://img.shields.io/badge/backend-FastAPI-009688.svg">
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-React%20%2B%20Vite-646cff.svg">
</p>

---

## 日本語

### これは何？

Gene Research / Sequence Workbench は、研究者が自分のPCに置いたゲノム配列やBLAST DBを使って、
配列解析、Primer3によるプライマー設計、ローカルBLAST、PrimerBLAST風チェック、CDS/エキソン増幅候補の確認を
ブラウザGUIから行うためのローカルワークベンチです。

目的は、コマンドラインだけで完結しにくい日常的な配列確認作業を、Windows上のGUIとして扱いやすくすることです。
ゲノムやBLAST DBはこのリポジトリに含めず、ユーザーが自分の環境で用意して登録します。

通常利用では、解析対象の配列やゲノムデータを外部サービスへアップロードしません。frontendとbackendは
`localhost` で動かす前提です。

### 何に使える？

- 自分のゲノムFASTAをBLAST DB化して、GUIから検索したい
- Primer3で設計したプライマーを、ローカルBLAST DBに当てて特異性を見たい
- BLAST結果のヒット位置、向き、複数ヒットを表で確認したい
- BLAST-ORのようにアラインメントを見ながら候補を比較したい
- CDSやエキソンをまたぐ増幅候補を、手元DBと注釈情報で検討したい
- 既存プライマーがどこに当たるか、増幅産物がどれくらい出るか調べたい
- ゲノム本体や研究室内データをGitHubに入れず、アプリだけ共有したい

### 重要な設計方針

このリポジトリは「アプリの器」です。

含めるもの:

- React + Vite frontend
- FastAPI backend
- DB登録、BLAST実行、Primer3呼び出し用のコード
- 公開向けドキュメント
- 小さな公開プリセット定義

含めないもの:

- 参照ゲノム本体
- BLAST DB
- Primer3バイナリ
- BLAST+バイナリ
- APIキー
- 個人PCの絶対パス
- 研究室内データ名
- 外部参照サービスへの必須依存
- ハードウェア固有のBLAST高速化機能

公開用の例として Arabidopsis thaliana のプリセットだけを残しています。不要なら削除できます。

### 機能一覧

| タブ / 機能 | できること | 主に必要なもの |
| --- | --- | --- |
| Workflow | 主要タブへの導線、作業の入口 | frontend |
| Sequence | DNA配列の基本情報、GC%、ORF、制限酵素サイト、SeqViz表示 | frontend + backend |
| Primers | Primer3による一般プライマー設計、候補の整理、ローカルDBでの特異性確認 | backend + Primer3 + BLAST+ |
| BLAST | ユーザー登録のローカルBLAST DBに対する検索、ヒット表、簡易可視化 | backend + BLAST+ + BLAST DB |
| BLAST-OR | BLASTヒットのアラインメント確認、折り返し表示、注釈確認 | backend + BLAST+ + BLAST DB |
| CDS/エキソン増幅 | 遺伝子構造や領域情報を使った増幅候補設計 | backend + Primer3 + BLAST+ + 注釈 |
| シーケンスプライマー | シーケンス用プライマー候補の整理 | frontend / backend |
| PrimerBLAST | Primer3候補をローカルBLAST DBで確認するPrimerBLAST風ワークフロー | backend + Primer3 + BLAST+ |
| Primer 逆引き | 既存プライマーのヒット、ペア、予測増幅産物の確認 | backend + BLAST+ |
| DB管理 | makeblastdb prefixの登録、DB一覧、状態確認、公開プリセットからの取得導線 | backend + BLAST+ |
| CAPSプライマー作成 | 候補領域からCAPS向けプライマー設計 | backend + Primer3 + BLAST+ |

### 全体構成

```text
Gene-research/
  frontend/workbench/        React + Vite UI
  backend/bioapi/            FastAPI backend
  docs/                      追加ドキュメント
  start_windows.bat          Windows向けfrontend起動補助
  start_backend_wsl.sh       WSL向けbackend起動補助
  start_workbench.sh         Unix系frontend起動補助
```

実行時の役割:

```text
Browser UI
  -> FastAPI backend on 127.0.0.1
      -> Primer3
      -> BLAST+
      -> user-provided BLAST DB
      -> user-provided reference/annotation files
```

### 最短起動: frontendだけ

frontendだけなら、配列貼り付けUIや画面の確認ができます。BLASTやPrimer3を使うにはbackendも必要です。

```powershell
git clone https://github.com/light-suzuki/Gene-research.git
cd Gene-research\frontend\workbench
npm install
npm run dev
```

Viteが表示するローカルURLを開きます。

```text
http://localhost:5173/
```

Windowsでは、リポジトリ直下の `start_windows.bat` からfrontendだけを起動することもできます。

### backend起動

Primer3、BLAST、DB管理を使う場合はbackendを起動します。

#### Windows frontend + WSL backend（推奨）

WindowsでGUI（frontend）を使い、backendはWSLで動かす最短手順です。

| 役割 | 置き場所 |
| --- | --- |
| frontend (Vite/React), ブラウザ | Windows |
| backend (FastAPI), BLAST+, Primer3, ゲノムFASTA/BLAST DB | WSL |

backendをWSLで動かす場合、`BLASTDB_DIR` / `BLAST_BIN_DIR` / `PRIMER3_CORE` は **WSLパス**（`/home/...` や `/mnt/c/...`）を使います。

1. Windowsでfrontendを起動

```powershell
.\start_windows.bat
```

2. WSL側設定（初回のみ）

```bash
cp -n backend/bioapi/.env.wsl.example backend/bioapi/.env.wsl
# 必要に応じて backend/bioapi/.env.wsl を編集
```

3. 別ターミナルでWSL backendを起動

```powershell
wsl bash ./start_backend_wsl.sh
```

`start_backend_wsl.sh` は `.env.wsl` があれば読み込み、Windows形式パス（`C:\...`）が混ざっていると起動前に止めます。

4. backend確認

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/tools/status
```

WSL側に `python3` と `venv` が必要です。`start_backend_wsl.sh` は `.venv` を作成し、依存を入れて `uvicorn` を起動します（BLAST+/Primer3 が未設定なら警告表示）。

#### backendをWindows側Pythonで起動する場合

```powershell
cd backend\bioapi
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

通常は `127.0.0.1` のまま使ってください。他のPCへ公開する前提ではありません。

確認:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/tools/status
Invoke-RestMethod http://127.0.0.1:8000/blast/local_dbs
```

### 自分のゲノムを使う

ゲノムデータはリポジトリ外に置いてください。

1. FASTAを用意する
2. BLAST+をインストールする
3. `makeblastdb` でDBを作る
4. Workbenchの `DB管理` タブでDB prefixを登録する
5. 各解析タブでそのDBを選ぶ

WSL backend構成の例:

```bash
makeblastdb -in /home/<user>/genomes/my_genome.fa -dbtype nucl -out /home/<user>/blastdb/my_genome
```

`DB管理` に登録する値:

```text
/home/<user>/blastdb/my_genome
```

`my_genome.nhr` / `my_genome.nin` / `my_genome.nsq` のようなインデックスファイルではなく、
`-out` に指定した prefix を登録します。

### Primer3を使う

Primer3は同梱していません。別途インストールし、`primer3_core` を `PATH` に入れるか、backend実行環境に合わせて指定してください。

```powershell
$env:PRIMER3_CORE = "C:\path\to\primer3_core.exe"
```

```bash
export PRIMER3_CORE=/usr/bin/primer3_core
# または backend/bioapi/.env.wsl に設定
```

WSL backendを使う場合は、Primer3もWSL側に置くのが安全です。

### BLAST+を使う

BLAST+は同梱していません。NCBI BLAST+を別途インストールし、`PATH` に入れるか、backend実行環境に合わせて指定してください。

```powershell
$env:BLAST_BIN_DIR = "C:\path\to\ncbi-blast+\bin"
$env:BLASTDB_DIR = "C:\path\to\blastdb"
```

```bash
export BLAST_BIN_DIR=/usr/bin
export BLASTDB_DIR=/home/<user>/blastdb
# または backend/bioapi/.env.wsl に設定
```

WSL backendを使う場合、DB作成・登録パスもWSLパスに揃えてください。

### 公開プリセットを追加する

公開プリセットはここに集約しています。

```text
frontend/workbench/src/config/referencePresets.ts
```

別ゲノム向けに調整する場合は、まずこのファイルを見てください。コンポーネント内に
種名、研究室データ名、個人パス、APIキーを直接書かないでください。

より詳しい手順:

```text
docs/ADAPTING_REFERENCE_GENOMES.md
docs/AGENT_GUIDE.md
```

### セキュリティとプライバシー

- backendはデフォルトで `127.0.0.1` にbindします。
- 通常利用では、入力配列やゲノムデータを外部へ送信しません。
- APIキーは不要です。
- `.env`、ゲノム、BLAST DB、解析結果、個人パスはGitに入れないでください。
- LANやインターネットへ公開する場合は、認証、CORS、管理API保護、ファイルアクセス制限を別途設計してください。

### 開発・検証

```powershell
npm --prefix frontend\workbench run typecheck
npm --prefix frontend\workbench run build
python -m py_compile backend\bioapi\app\main.py
```

frontendの依存を入れていない場合:

```powershell
cd frontend\workbench
npm install
```

### よくあるつまずき

| 症状 | 確認すること |
| --- | --- |
| BLAST DBが出ない | `makeblastdb` の `-out` prefixを登録しているか |
| BLAST実行に失敗する | BLAST+のbinが `PATH` または `BLAST_BIN_DIR` にあるか |
| Primer3が動かない | `primer3_core` が `PATH` または `PRIMER3_CORE` にあるか |
| WSL backendが起動しない | `.env.wsl` に `C:\...` のようなWindowsパスが入っていないか |
| backendに繋がらない | `uvicorn app.main:app --host 127.0.0.1 --port 8000` が起動しているか |
| 解析データを公開したくない | FASTA/GFF/BLAST DBをリポジトリ外に置いているか |

### クレジット

アイデア、方向性、ユースケース設計:

- light-suzuki

コード実装と公開版整理は、OpenAI Codex とGPT-5系coding modelの支援を受けて進めました。
CodexチームとCodexの作成者に感謝します。

### 引用

研究・発表・教育用途で使った場合は、このリポジトリを引用してもらえると嬉しいです。
`CITATION.cff` を含めているため、GitHub上で「Cite this repository」が表示されます。

### ライセンス

MIT Licenseです。ライセンス条件に従う限り、利用、コピー、改変、公開、配布、
サブライセンス、販売が可能です。

---

## English

### What Is This?

Gene Research / Sequence Workbench is a local-first browser workbench for DNA
sequence analysis, primer design, and local BLAST workflows using user-supplied
genomes and databases.

The repository provides the application shell. It does not include reference
genomes, BLAST databases, Primer3, or BLAST+ binaries. Users provide those tools
and data locally, which keeps private genome data out of Git.

### Use Cases

- Search a user-built genome BLAST database from a GUI.
- Design primers with Primer3 and check specificity against local BLAST DBs.
- Inspect BLAST hits, coordinates, directions, and alignments.
- Review predicted amplicons for existing primer pairs.
- Work with private or unpublished genomes without committing data to GitHub.

### Features

| Feature | Description |
| --- | --- |
| Sequence | Basic DNA summary, ORF detection, restriction sites, SeqViz view |
| Primers | Primer3-based primer design and local specificity checks |
| BLAST | Search user-registered local BLAST databases |
| BLAST-OR | Inspect BLAST alignments in a readable view |
| CDS/exon amplification | Design candidates using local DBs and annotations |
| Sequencing primers | Organize sequencing-primer candidates |
| PrimerBLAST | Check Primer3 candidates against local BLAST DBs |
| Primer reverse lookup | Check existing primers and predicted amplicons |
| DB Manager | Register makeblastdb prefixes and inspect DB status |
| CAPS primer design | Design CAPS-oriented primer candidates |

### Not Included

- Reference genome files
- BLAST databases
- Primer3 binary
- BLAST+ binary
- API keys
- Machine-local absolute paths
- Required external reference service
- Hardware-specific BLAST acceleration

### Architecture

```text
Browser UI
  -> FastAPI backend on 127.0.0.1
      -> Primer3
      -> BLAST+
      -> user-provided BLAST DB
      -> user-provided reference/annotation files
```

### Frontend

```powershell
git clone https://github.com/light-suzuki/Gene-research.git
cd Gene-research\frontend\workbench
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173/
```

### Backend

```powershell
cd backend\bioapi
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On Windows, a common setup is frontend on Windows + backend on WSL:

```powershell
.\start_windows.bat
wsl bash ./start_backend_wsl.sh
```

In this mode, keep boundaries explicit:

- Windows: frontend dev server and browser UI
- WSL: backend, NCBI BLAST+, Primer3, genome FASTA, and BLAST DB files

If backend runs in WSL, use Linux paths (`/home/...` or `/mnt/c/...`) for
`BLASTDB_DIR`, `BLAST_BIN_DIR`, and `PRIMER3_CORE`.

### Use Your Own Genome

Keep genome files outside this repository, build a BLAST database, and register
the `makeblastdb` prefix in DB Manager.

```bash
makeblastdb -in /home/<user>/genomes/my_genome.fa -dbtype nucl -out /home/<user>/blastdb/my_genome
```

Register:

```text
/home/<user>/blastdb/my_genome
```

Register the prefix passed to `-out`, not the generated index files.

### Checks

```powershell
npm --prefix frontend\workbench run typecheck
npm --prefix frontend\workbench run build
python -m py_compile backend\bioapi\app\main.py
```

### Privacy Notes

- The backend is intended to run on `127.0.0.1`.
- No API key is required for the public local workflow.
- Do not commit genomes, BLAST indexes, `.env` files, private results, or
  machine-local paths.
- If you expose the backend beyond localhost, add authentication and file-access
  controls first.

### Credits

Project idea, direction, and use-case design:

- light-suzuki

Code implementation and public-release preparation were developed with AI
assistance from OpenAI Codex and GPT-5-family coding models.

Special thanks to the Codex team and the creators of Codex for making this kind
of practical research-tool development workflow possible.

### Citation

If you use this project in academic work, please cite this repository. The
repository includes `CITATION.cff`, so GitHub should show a "Cite this
repository" option.

### License

MIT License. You may use, copy, modify, publish, distribute, sublicense, and/or
sell copies of the software, subject to the license terms.
