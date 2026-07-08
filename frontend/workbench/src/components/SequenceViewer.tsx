import React, { useEffect, useState } from "react";
import { bioapiClient } from "../api/bioapiClient";
import { SequenceTrack } from "./SequenceTrack";
import { SeqvizViewer } from "./SeqvizViewer";
import type {
  BasicAnalysisResponse,
  OrfResult,
  RestrictionCutSite,
} from "../types/sequence";
import { downloadMarkdown, openPrintViewForMarkdown } from "../utils/exportReport";
import { useWorkbench } from "../utils/workbenchContext";
import { useLanguage } from "../utils/language";

// シンプルな Linear View ベースのシーケンス解析 UI
export const SequenceViewer: React.FC = () => {
  const [language] = useLanguage();
  const en = language === "en";
  const [sequence, setSequence] = useState<string>("");
  const [enzymesInput, setEnzymesInput] = useState<string>("EcoRI,BamHI");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { presetSequenceInput, setPresetSequenceInput } = useWorkbench();

  const [basic, setBasic] = useState<BasicAnalysisResponse | null>(null);
  const [orfs, setOrfs] = useState<OrfResult[]>([]);
  const [restrictionSites, setRestrictionSites] = useState<
    RestrictionCutSite[]
  >([]);
  useEffect(() => {
    const preset = presetSequenceInput?.sequence?.trim();
    if (!preset) return;
    setSequence(preset);
    setPresetSequenceInput?.(null);
  }, [presetSequenceInput, setPresetSequenceInput]);

  const handleAnalyze = async () => {
    const trimmed = sequence.trim();
    if (!trimmed) {
      setError(en ? "Enter a DNA sequence first." : "まずは塩基配列を入力してください。");
      return;
    }

    setLoading(true);
    setError(null);
    setBasic(null);
    setOrfs([]);
    setRestrictionSites([]);

    try {
      // enzymesInput をカンマ区切りで分割し、空白を取り除く
      const enzymes = enzymesInput
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      const [basicRes, orfRes, restrictionRes] = await Promise.all([
        bioapiClient.analyzeBasic({
          sequence: trimmed,
          include_translation: false,
        }),
        bioapiClient.analyzeOrfs({
          sequence: trimmed,
          min_aa_length: 50,
        }),
        enzymes.length > 0
          ? bioapiClient.analyzeRestriction({
              sequence: trimmed,
              enzymes,
            })
          : Promise.resolve({
              sequence_length: trimmed.length,
              results: [],
            }),
      ]);

      setBasic(basicRes);
      setOrfs(orfRes.orfs);
      setRestrictionSites(restrictionRes.results);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : (en ? "An unexpected analysis error occurred." : "解析中に思わぬエラーが起きました。");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const buildMarkdownReport = (): string => {
    if (!basic) return "";
    const dt = new Date();
    const lines: string[] = [];
    lines.push("# Sequence 解析レポート");
    lines.push("");
    lines.push(`- 作成時刻: ${dt.toLocaleString()}`);
    lines.push(`- 配列長: ${basic.length} bp`);
    lines.push(`- GC 含量: ${basic.gc_percent.toFixed(2)} %`);
    lines.push("");

    if (orfs.length > 0) {
      lines.push("## ORF 候補");
      lines.push("");
      lines.push("| # | フレーム | 開始 | 終了 | 長さ (aa) |");
      lines.push("| ---: | ---: | ---: | ---: | ---: |");
      orfs.forEach((orf, idx) => {
        lines.push(
          `| ${idx + 1} | ${orf.frame} | ${orf.start} | ${orf.end} | ${orf.length_aa} |`,
        );
      });
      lines.push("");
    }

    if (restrictionSites.length > 0) {
      lines.push("## 制限酵素サイト");
      lines.push("");
      lines.push("| 酵素 | 切断位置 (1-based) |");
      lines.push("| --- | --- |");
      restrictionSites.forEach((site) => {
        const cuts =
          site.cut_positions.length > 0
            ? site.cut_positions.join(", ")
            : "なし";
        lines.push(`| ${site.enzyme} | ${cuts} |`);
      });
      lines.push("");
    }

    lines.push("## 入力配列");
    lines.push("");
    const normalized = sequence.replace(/\s+/g, "").toUpperCase();
    lines.push("```");
    lines.push(normalized || "(空)");
    lines.push("```");
    lines.push("");

    return lines.join("\n");
  };

  return (
    <section>
      <h2 className="panel-title">{en ? "Sequence analysis & SeqViz" : "Sequence 解析 & SeqViz"}</h2>
      <p className="panel-hint">
        {en ? "Paste a FASTA or DNA sequence to inspect GC content, ORFs, restriction sites, and the SeqViz view." : "FASTA または DNA 配列を貼り付けて、ORF・制限酵素・SeqViz の両ビューに反映します。"}
      </p>
      <div className="primer-row" style={{ marginBottom: "0.4rem" }}>
        <button
          type="button"
          className="seq-button secondary"
          onClick={() => {
            const md = buildMarkdownReport();
            if (!md) return;
            downloadMarkdown(md, "sequence_analysis");
          }}
          disabled={!basic}
        >
          {en ? "Save results as Markdown" : "結果を Markdown として保存"}
        </button>
        <button
          type="button"
          className="seq-button secondary"
          onClick={() => {
            const md = buildMarkdownReport();
            if (!md) return;
            openPrintViewForMarkdown(md, "Sequence 解析レポート");
          }}
          disabled={!basic}
        >
          {en ? "Open printable view (save as PDF)" : "印刷用ビューを開く（PDF 保存に利用）"}
        </button>
      </div>
      <div className="seq-viewer">
        <div className="seq-input-panel">
          <label className="seq-label">
            {en ? "DNA sequence:" : "解析したい配列（DNA）:"}
            <textarea
              className="seq-textarea"
              rows={8}
              placeholder={en ? "Example: ATGCGT..." : "例: ATGCGT..."}
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
            />
          </label>

          <label className="seq-label">
            {en ? "Restriction enzymes (comma-separated):" : "制限酵素（カンマ区切り）:"}
            <input
              type="text"
              className="seq-input"
              value={enzymesInput}
              onChange={(e) => setEnzymesInput(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="seq-button"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (en ? "Analyzing..." : "解析中...") : (en ? "Analyze sequence" : "この配列を解析する")}
          </button>

          {error && <p className="seq-error">{en ? "Error" : "エラー"}: {error}</p>}
        </div>

        <div className="seq-results">
          {basic && (
            <section className="seq-result-block">
              <h2>{en ? "Basic information" : "Basic 情報"}</h2>
              <p>{en ? "Length" : "塩基数"}: {basic.length} bp</p>
              <p>{en ? "GC content" : "GC 含量"}: {basic.gc_percent.toFixed(2)} %</p>
              {(orfs.length > 0 || restrictionSites.length > 0) && (
                <SequenceTrack
                  length={basic.length}
                  orfs={orfs}
                  restrictionSites={restrictionSites}
                />
              )}
              <div className="seqviz-wrapper">
                <SeqvizViewer
                  sequence={sequence}
                  name="Custom sequence"
                />
              </div>
            </section>
          )}

          {orfs.length > 0 && (
            <section className="seq-result-block">
              <h2>{en ? "ORF candidates" : "ORF の候補"}</h2>
              <table className="seq-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>フレーム</th>
                    <th>開始</th>
                    <th>終了</th>
                    <th>長さ (aa)</th>
                  </tr>
                </thead>
                <tbody>
                  {orfs.map((orf, idx) => (
                    <tr key={`${orf.frame}-${orf.start}-${orf.end}-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{orf.frame}</td>
                      <td>{orf.start}</td>
                      <td>{orf.end}</td>
                      <td>{orf.length_aa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {restrictionSites.length > 0 && (
            <section className="seq-result-block">
              <h2>{en ? "Restriction sites" : "制限酵素サイト"}</h2>
              <table className="seq-table">
                <thead>
                  <tr>
                    <th>酵素</th>
                    <th>切断位置 (1-based)</th>
                  </tr>
                </thead>
                <tbody>
                  {restrictionSites.map((site) => (
                    <tr key={site.enzyme}>
                      <td>{site.enzyme}</td>
                      <td>
                        {site.cut_positions.length > 0
                          ? site.cut_positions.join(", ")
                          : "なし"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {!basic && !loading && !error && (
            <p className="seq-hint">
              上のテキストボックスに塩基配列を貼り付けて「この配列を解析する」を押すと、ここに長さ・GC%・ORF・制限酵素サイトが表示されます。
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
