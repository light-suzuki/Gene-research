import React, { Suspense, useEffect, useState } from "react";
import { BackendHealthPill } from "./components/BackendHealthPill";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PrimerReversePanel } from "./components/PrimerReversePanel";
import { useLocalStorageFlag } from "./utils/storage";
import { WorkbenchContext } from "./utils/workbenchContext";

const SequenceViewer = React.lazy(async () => {
  const mod = await import("./components/SequenceViewer");
  return { default: mod.SequenceViewer };
});

const PrimerPanel = React.lazy(async () => {
  const mod = await import("./components/PrimerPanel");
  return { default: mod.PrimerPanel };
});

const BlastPanel = React.lazy(async () => {
  const mod = await import("./components/BlastPanel");
  return { default: mod.BlastPanel };
});

const BlastOrPanel = React.lazy(async () => {
  const mod = await import("./components/BlastOrPanel");
  return { default: mod.BlastOrPanel };
});

const WorkflowPanel = React.lazy(async () => {
  const mod = await import("./components/WorkflowPanel");
  return { default: mod.WorkflowPanel };
});

const ExonPrimerPanel = React.lazy(async () => {
  const mod = await import("./components/ExonPrimerPanel");
  return { default: mod.ExonPrimerPanel };
});

const SequencePrimerPanel = React.lazy(async () => {
  const mod = await import("./components/SequencePrimerPanel");
  return { default: mod.SequencePrimerPanel };
});

const PrimerBlastPanel = React.lazy(async () => {
  const mod = await import("./components/PrimerBlastPanel");
  return { default: mod.PrimerBlastPanel };
});

const CapsPrimerPanel = React.lazy(async () => {
  const mod = await import("./components/CapsPrimerPanel");
  return { default: mod.CapsPrimerPanel };
});

const DbManagerPanel = React.lazy(async () => {
  const mod = await import("./components/DbManagerPanel");
  return { default: mod.DbManagerPanel };
});

type TabId =
  | "workflow"
  | "sequence"
  | "primers"
  | "blast"
  | "blast_or"
  | "exon"
  | "seq_primers"
  | "primer_blast"
  | "primer_reverse"
  | "db_manage"
  | "caps";

const tabs: { id: TabId; label: string; desc: string; color: string }[] = [
  {
    id: "workflow",
    label: "Workflow",
    desc: "貼り付け→各タブへ送る（よくある流れ）",
    color: "#0f766e",
  },
  {
    id: "sequence",
    label: "Sequence",
    desc: "GC / ORF / Restriction + SeqViz",
    color: "#16a34a",
  },
  {
    id: "primers",
    label: "Primers",
    desc: "Primer3 条件と増幅領域のハイライト",
    color: "#7c3aed",
  },
  {
    id: "blast",
    label: "BLAST",
    desc: "ユーザー管理DBに対してローカル検索",
    color: "#2563eb",
  },
  {
    id: "blast_or",
    label: "BLAST-OR",
    desc: "1DB×1クエリでアラインメント表示（ミスマッチ色分け）",
    color: "#dc2626",
  },
  {
    id: "exon",
    label: "CDS/エキソン増幅",
    desc: "配列中のCDS/エキソンをハイライトして設計・BLAST",
    color: "#ea580c",
  },
  {
    id: "seq_primers",
    label: "シーケンスプライマー",
    desc: "エキソンを挟む 600–800bp のシーケンス用プライマー",
    color: "#0d9488",
  },
  {
    id: "primer_blast",
    label: "PrimerBLAST",
    desc: "貼り付け配列→Primer3→複数DBで特異性チェック",
    color: "#4338ca",
  },
  {
    id: "primer_reverse",
    label: "Primer 逆引き",
    desc: "既存プライマーペアからユーザーDB上の位置を探索",
    color: "#4f46e5",
  },
  {
    id: "db_manage",
    label: "DB管理",
    desc: "ローカル BLAST DB の一覧・chr/entry 変換・既定セット",
    color: "#64748b",
  },
  {
    id: "caps",
    label: "CAPSプライマー作成",
    desc: "指定範囲で共優勢マーカーを大量生成",
    color: "#b45309",
  },
];

// アプリ全体のルートコンポーネント
export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("workflow");
  const [heroCollapsed, setHeroCollapsed] = useLocalStorageFlag(
    "seqwb_ui_hero_collapsed",
    false,
  );
  const [presetReversePair, setPresetReversePair] = useState<{
    primer1: string;
    primer2: string;
  } | null>(null);
  const [presetBlastQuery, setPresetBlastQuery] = useState<{
    sequence: string;
    label?: string;
  } | null>(null);
  const [presetSequenceInput, setPresetSequenceInput] = useState<{
    sequence: string;
    label?: string;
  } | null>(null);
  const [mountedTabs, setMountedTabs] = useState<TabId[]>(["workflow"]);
  const activeTabMeta = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  useEffect(() => {
    setMountedTabs((prev) =>
      prev.includes(activeTab) ? prev : [...prev, activeTab],
    );
  }, [activeTab]);

  return (
    <WorkbenchContext.Provider
      value={{
        setActiveTab: (tabId: string) => setActiveTab(tabId as TabId),
        presetReversePair,
        setPresetReversePair,
        presetBlastQuery,
        setPresetBlastQuery,
        presetSequenceInput,
        setPresetSequenceInput,
      }}
    >
      <div className="app-shell">
        <header className={`app-hero ${heroCollapsed ? "is-collapsed" : ""}`}>
          <div className="hero-left">
            <p className="hero-kicker">Generic local sequence tools • SnapGene view</p>
            <div className="hero-title-row">
              <h1 className="hero-title">Sequence Workbench</h1>
              <details className="ui-details hero-details hero-help">
                <summary>使い方</summary>
                <div className="ui-details-body">
                  <p className="seq-hint">
                    タブで機能を切り替えます。各タブの説明は、タブにマウスを乗せるとツールチップでも確認できます。
                  </p>
                  <p className="seq-hint">
                    ローカル DB を使う機能（BLAST / Primer 逆引きなど）は、DB の選択が未設定だとエラーになります。
                  </p>
                </div>
              </details>
            </div>
            <p className="app-subtitle">
              配列解析・プライマー設計・BLAST をまとめたローカルワークベンチ。
            </p>
          </div>
          <div className="hero-meta">
            <BackendHealthPill />
            <button
              type="button"
              className="hero-toggle"
              onClick={() => setHeroCollapsed((v) => !v)}
              title="ヘッダーの表示を切り替えます"
            >
              {heroCollapsed ? "ヘッダー展開" : "ヘッダー折りたたむ"}
            </button>
            <button
              type="button"
              className="hero-toggle"
              onClick={() => window.print()}
              title="現在のタブを色付きで保存します（印刷→PDF保存）"
            >
              色付き保存（PDF）
            </button>
            <details className="ui-details hero-details">
              <summary>環境</summary>
              <div className="ui-details-body hero-meta-details">
                <span className="hero-pill">FastAPI backend</span>
                <span className="hero-pill">React + Vite + SeqViz</span>
                <span className="hero-pill">Primer3 / BLAST+ / user DB</span>
              </div>
            </details>
          </div>
        </header>

      <nav className="tab-nav" aria-label="Workbench sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.desc}
            style={
              {
                ["--tab-accent" as any]: tab.color,
              } as React.CSSProperties
            }
          >
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="tab-active-hint" style={{ ["--tab-accent" as any]: activeTabMeta.color } as React.CSSProperties}>
        <span className="tab-active-pill">{activeTabMeta.label}</span>
        <span className="tab-active-desc">{activeTabMeta.desc}</span>
      </div>

      <main className="app-main">
        <ErrorBoundary title="Sequence Workbench">
          <Suspense
            fallback={
              <div className="panel-card">
                <p className="seq-hint">パネルを読み込み中です...</p>
              </div>
            }
          >
          {mountedTabs.includes("sequence") && (
            <div
              className={`panel-card ${
                activeTab === "sequence" ? "" : "panel-hidden"
              }`}
            >
              <SequenceViewer />
            </div>
          )}
          {mountedTabs.includes("workflow") && (
            <div
              className={`panel-card ${
                activeTab === "workflow" ? "" : "panel-hidden"
              }`}
            >
              <WorkflowPanel />
            </div>
          )}
          {mountedTabs.includes("primers") && (
            <div
              className={`panel-card ${
                activeTab === "primers" ? "" : "panel-hidden"
              }`}
            >
              <PrimerPanel />
            </div>
          )}
          {mountedTabs.includes("blast") && (
            <div
              className={`panel-card ${
                activeTab === "blast" ? "" : "panel-hidden"
              }`}
            >
              <BlastPanel />
            </div>
          )}
          {mountedTabs.includes("blast_or") && (
            <div
              className={`panel-card ${
                activeTab === "blast_or" ? "" : "panel-hidden"
              }`}
            >
              <BlastOrPanel />
            </div>
          )}
          {mountedTabs.includes("exon") && (
            <div
              className={`panel-card ${
                activeTab === "exon" ? "" : "panel-hidden"
              }`}
            >
              <ExonPrimerPanel />
            </div>
          )}
          {mountedTabs.includes("seq_primers") && (
            <div
              className={`panel-card ${
                activeTab === "seq_primers" ? "" : "panel-hidden"
              }`}
            >
              <SequencePrimerPanel />
            </div>
          )}
          {mountedTabs.includes("primer_blast") && (
            <div
              className={`panel-card ${
                activeTab === "primer_blast" ? "" : "panel-hidden"
              }`}
            >
              <PrimerBlastPanel />
            </div>
          )}
          {mountedTabs.includes("primer_reverse") && (
            <div
              className={`panel-card ${
                activeTab === "primer_reverse" ? "" : "panel-hidden"
              }`}
            >
              <PrimerReversePanel />
            </div>
          )}
          {mountedTabs.includes("db_manage") && (
            <div
              className={`panel-card ${
                activeTab === "db_manage" ? "" : "panel-hidden"
              }`}
            >
              <DbManagerPanel />
            </div>
          )}
          {mountedTabs.includes("caps") && (
            <div
              className={`panel-card ${
                activeTab === "caps" ? "" : "panel-hidden"
              }`}
            >
              <CapsPrimerPanel />
            </div>
          )}
        </Suspense>
        </ErrorBoundary>
      </main>
      </div>
    </WorkbenchContext.Provider>
  );
};
