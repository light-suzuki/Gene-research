import React, { Suspense, useEffect, useState } from "react";
import { BackendHealthPill } from "./components/BackendHealthPill";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PrimerReversePanel } from "./components/PrimerReversePanel";
import { useLocalStorageFlag } from "./utils/storage";
import { WorkbenchContext } from "./utils/workbenchContext";
import { useLanguage } from "./utils/language";
import { applyUiLanguage } from "./utils/uiTranslation";

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

const tabs: { id: TabId; labelJa: string; labelEn: string; descJa: string; descEn: string; color: string }[] = [
  {
    id: "workflow",
    labelJa: "ワークフロー", labelEn: "Workflow",
    descJa: "貼り付け→各タブへ送る（よくある流れ）", descEn: "Paste a sequence and send it to the appropriate tool",
    color: "#0f766e",
  },
  {
    id: "sequence",
    labelJa: "配列", labelEn: "Sequence",
    descJa: "GC / ORF / 制限酵素 + SeqViz", descEn: "GC / ORF / restriction sites + SeqViz",
    color: "#16a34a",
  },
  {
    id: "primers",
    labelJa: "プライマー", labelEn: "Primers",
    descJa: "Primer3 条件と増幅領域のハイライト", descEn: "Primer3 design and amplicon highlighting",
    color: "#7c3aed",
  },
  {
    id: "blast",
    labelJa: "BLAST", labelEn: "BLAST",
    descJa: "ユーザー管理DBに対してローカル検索", descEn: "Search user-managed local databases",
    color: "#2563eb",
  },
  {
    id: "blast_or",
    labelJa: "BLAST-OR", labelEn: "BLAST-OR",
    descJa: "1DB×1クエリでアラインメント表示（ミスマッチ色分け）", descEn: "Inspect one query alignment with mismatch coloring",
    color: "#dc2626",
  },
  {
    id: "exon",
    labelJa: "CDS/エキソン増幅", labelEn: "CDS/exon primers",
    descJa: "配列中のCDS/エキソンをハイライトして設計・BLAST", descEn: "Highlight CDS/exons, design primers, and run BLAST",
    color: "#ea580c",
  },
  {
    id: "seq_primers",
    labelJa: "シーケンスプライマー", labelEn: "Sequencing primers",
    descJa: "エキソンを挟む 600–800bp のシーケンス用プライマー", descEn: "Design 600–800 bp sequencing amplicons around exons",
    color: "#0d9488",
  },
  {
    id: "primer_blast",
    labelJa: "PrimerBLAST", labelEn: "PrimerBLAST",
    descJa: "貼り付け配列→Primer3→複数DBで特異性チェック", descEn: "Primer3 design followed by multi-database specificity checks",
    color: "#4338ca",
  },
  {
    id: "primer_reverse",
    labelJa: "Primer 逆引き", labelEn: "Primer lookup",
    descJa: "既存プライマーペアからユーザーDB上の位置を探索", descEn: "Locate an existing primer pair in user databases",
    color: "#4f46e5",
  },
  {
    id: "db_manage",
    labelJa: "DB管理", labelEn: "DB Manager",
    descJa: "ローカル BLAST DB の一覧・chr/entry 変換・既定セット", descEn: "Register and inspect local BLAST databases",
    color: "#64748b",
  },
  {
    id: "caps",
    labelJa: "CAPSプライマー作成", labelEn: "CAPS primers",
    descJa: "指定範囲で共優勢マーカーを大量生成", descEn: "Generate co-dominant marker candidates in a target region",
    color: "#b45309",
  },
];

type WorkbenchMode = "full" | "blast" | "primer" | "marker";
const workbenchMode = ((import.meta.env.VITE_WORKBENCH_MODE as string | undefined) ?? "full") as WorkbenchMode;
const modeTabs: Record<WorkbenchMode, TabId[]> = {
  full: tabs.map((tab) => tab.id),
  blast: ["blast", "blast_or", "db_manage"],
  primer: ["primers", "primer_blast", "primer_reverse"],
  marker: ["exon", "seq_primers", "caps"],
};
const visibleTabs = tabs.filter((tab) => modeTabs[workbenchMode].includes(tab.id));
const initialTab = visibleTabs[0]?.id ?? "workflow";

// アプリ全体のルートコンポーネント
export const App: React.FC = () => {
  const [language, setLanguage] = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
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
  const [mountedTabs, setMountedTabs] = useState<TabId[]>([initialTab]);
  const activeTabMeta = visibleTabs.find((t) => t.id === activeTab) ?? visibleTabs[0] ?? tabs[0];
  const label = (tab: (typeof tabs)[number]) => language === "ja" ? tab.labelJa : tab.labelEn;
  const description = (tab: (typeof tabs)[number]) => language === "ja" ? tab.descJa : tab.descEn;

  useEffect(() => {
    setMountedTabs((prev) =>
      prev.includes(activeTab) ? prev : [...prev, activeTab],
    );
  }, [activeTab]);

  useEffect(() => applyUiLanguage(language), [language]);

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
                <summary>{language === "ja" ? "使い方" : "How to use"}</summary>
                <div className="ui-details-body">
                  <p className="seq-hint">
                    {language === "ja" ? "タブで機能を切り替えます。説明はツールチップでも確認できます。" : "Switch tools with the tabs. Hover a tab to see its description."}
                  </p>
                  <p className="seq-hint">
                    {language === "ja" ? "BLASTなどを使う前にローカルDBを登録・選択してください。" : "Register and select a local database before using BLAST-based tools."}
                  </p>
                </div>
              </details>
            </div>
            <p className="app-subtitle">
              {language === "ja" ? "配列解析・プライマー設計・BLASTをまとめたローカルワークベンチ。" : "A local workbench for sequence analysis, primer design, and BLAST."}
            </p>
          </div>
          <div className="hero-meta">
            <button type="button" className="hero-toggle" onClick={() => setLanguage(language === "en" ? "ja" : "en")}>
              {language === "en" ? "日本語" : "English"}
            </button>
            <BackendHealthPill />
            <button
              type="button"
              className="hero-toggle"
              onClick={() => setHeroCollapsed((v) => !v)}
              title={language === "ja" ? "ヘッダーの表示を切り替えます" : "Toggle the header"}
            >
              {language === "ja" ? (heroCollapsed ? "ヘッダー展開" : "ヘッダー折りたたむ") : (heroCollapsed ? "Expand header" : "Collapse header")}
            </button>
            <button
              type="button"
              className="hero-toggle"
              onClick={() => window.print()}
              title={language === "ja" ? "現在のタブを印刷またはPDF保存します" : "Print or save the current tab as PDF"}
            >
              {language === "ja" ? "印刷 / PDF保存" : "Print / Save PDF"}
            </button>
            <details className="ui-details hero-details">
              <summary>{language === "ja" ? "環境" : "Environment"}</summary>
              <div className="ui-details-body hero-meta-details">
                <span className="hero-pill">FastAPI backend</span>
                <span className="hero-pill">React + Vite + SeqViz</span>
                <span className="hero-pill">Primer3 / BLAST+ / user DB</span>
              </div>
            </details>
          </div>
        </header>

      <nav className="tab-nav" aria-label="Workbench sections">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            title={description(tab)}
            style={
              {
                ["--tab-accent" as any]: tab.color,
              } as React.CSSProperties
            }
          >
            <span className="tab-label">{label(tab)}</span>
          </button>
        ))}
      </nav>
      <div className="tab-active-hint" style={{ ["--tab-accent" as any]: activeTabMeta.color } as React.CSSProperties}>
        <span className="tab-active-pill">{label(activeTabMeta)}</span>
        <span className="tab-active-desc">{description(activeTabMeta)}</span>
      </div>

      <main className="app-main">
        <ErrorBoundary title="Sequence Workbench">
          <Suspense
            fallback={
              <div className="panel-card">
                <p className="seq-hint">{language === "ja" ? "パネルを読み込み中です..." : "Loading panel..."}</p>
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
