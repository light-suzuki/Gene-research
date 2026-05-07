<h1 align="center">Gene Research / Sequence Workbench</h1>

<p align="center">
  手持ちのゲノム、BLAST+、Primer3を使って、Windows上で配列解析をGUI操作するためのローカルWebワークベンチ。<br>
  A local-first Windows-friendly sequence workbench for user-supplied genomes, BLAST+, and Primer3.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <img alt="Runs locally" src="https://img.shields.io/badge/runs-localhost-0f766e.svg">
  <img alt="Data" src="https://img.shields.io/badge/data-user%20supplied-2563eb.svg">
  <img alt="UI" src="https://img.shields.io/badge/UI-Japanese--first-f59e0b.svg">
</p>

---

## 日本語

### 何ができる？

Gene Research / Sequence Workbench は、研究者が手元のゲノム配列やBLAST DBを使って、
ブラウザGUIから配列解析、プライマー設計、BLAST結果確認を行うためのローカルツールです。

このリポジトリにゲノムデータ、BLAST DB、Primer3、BLAST+本体は含めません。ユーザーが自分の
PCに用意したデータとツールを登録して使います。そのため、公開リポジトリとして配布しつつ、
非公開ゲノムや研究室内データをGitに含めずに運用できます。

### 主な機能

| 機能 | 内容 |
| --- | --- |
| Sequence | DNA配列の基本情報、ORF、制限酵素サイト、SeqViz表示 |
| Primers | Primer3を使った一般プライマー設計 |
| BLAST | ユーザー登録のローカルBLAST DBに対する検索 |
| BLAST-OR | BLASTヒットのアラインメント確認 |
| CDS/エキソン増幅 | ローカルDBと注釈情報を使った増幅候補設計 |
| シーケンスプライマー | シーケンス用プライマー候補の整理 |
| PrimerBLAST | Primer3候補のローカルBLAST確認 |
| Primer 逆引き | 既存プライマーのヒット/増幅候補確認 |
| DB管理 | makeblastdb prefixの登録、DB状態確認 |
| CAPSプライマー作成 | 候補領域からCAPS向けプライマー設計 |

### 含まないもの

- 参照ゲノム本体
- BLAST DB
- Primer3バイナリ
- BLAST+バイナリ
- APIキー
- 個人PCの絶対パス
- 外部参照サービスへの依存
- ハードウェア固有のBLAST高速化機能

公開用の例として Arabidopsis thaliana のプリセットだけを残しています。不要なら削除できます。

### 基本の流れ

1. このリポジトリを取得する
2. frontendを起動する
3. backendを起動する
4. 自分のFASTA/GFFなどをリポジトリ外に置く
5. `makeblastdb` でBLAST DBを作る
6. DB管理タブで `makeblastdb` prefix を登録する
7. BLAST、PrimerBLAST、CDS/エキソン増幅などで使う

### フロントエンド起動

```powershell
cd frontend\workbench
npm install
npm run dev
```

Viteが表示するローカルURLを開きます。通常は次のようなURLです。

```text
http://localhost:5173/
```

Windowsでは、リポジトリ直下の `start_windows.bat` からfrontendだけを起動することもできます。

### バックエンド起動

Primer3、BLAST、DB管理を使う場合はbackendを起動します。

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

```powershell
makeblastdb -in C:\path\to\genome.fa -dbtype nucl -out C:\path\to\blastdb\my_genome
```

Workbenchの `DB管理` タブで、次のような `makeblastdb` prefix を登録します。

```text
C:\path\to\blastdb\my_genome
```

### Primer3

Primer3は同梱していません。別途インストールし、`primer3_core` を `PATH` に入れるか、
次のように指定してください。

```powershell
$env:PRIMER3_CORE = "C:\path\to\primer3_core.exe"
```

### BLAST+

BLAST+は同梱していません。NCBI BLAST+を別途インストールし、`PATH` に入れるか、
次のように指定してください。

```powershell
$env:BLAST_BIN_DIR = "C:\path\to\ncbi-blast+\bin"
$env:BLASTDB_DIR = "C:\path\to\blastdb"
```

### ゲノムプリセットの追加

公開プリセットはここに集約しています。

```text
frontend/workbench/src/config/referencePresets.ts
```

別ゲノム向けに調整する場合は、まずこのファイルを見てください。コンポーネント内に
種名、研究室データ名、個人パス、APIキーを直接書かないでください。

詳細:

```text
docs/ADAPTING_REFERENCE_GENOMES.md
docs/AGENT_GUIDE.md
```

### 開発・検証

```powershell
npm --prefix frontend\workbench run typecheck
npm --prefix frontend\workbench run build
python -m py_compile backend\bioapi\app\main.py
```

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

### Features

| Feature | Description |
| --- | --- |
| Sequence | Basic DNA summary, ORF detection, restriction sites, SeqViz view |
| Primers | Primer3-based primer design |
| BLAST | Search user-registered local BLAST databases |
| BLAST-OR | Inspect BLAST alignments |
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

### Development

Frontend:

```powershell
cd frontend\workbench
npm install
npm run dev
```

Backend:

```powershell
cd backend\bioapi
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Use Your Own Genome

Keep genome files outside this repository, build a BLAST database, and register
the `makeblastdb` prefix in DB Manager.

```powershell
makeblastdb -in C:\path\to\genome.fa -dbtype nucl -out C:\path\to\blastdb\my_genome
```

### Checks

```powershell
npm --prefix frontend\workbench run typecheck
npm --prefix frontend\workbench run build
python -m py_compile backend\bioapi\app\main.py
```

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
