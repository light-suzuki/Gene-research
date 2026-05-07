import React, { useMemo, useState } from "react";
import { useWorkbench } from "../utils/workbenchContext";
import { extractPrimerSeqsFromLine, normalizePrimerSeq, parseFastaPrimers } from "../utils/primerInput";
import { useToast } from "./ToastProvider";

const normalizeSequence = (text: string): string =>
  (text || "")
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith(">"))
    .join("")
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/[^ACGTURYKMSWBDHVN]/g, "")
    .replace(/U/g, "T");

type PrimerPair = { left: string; right: string };

const parsePrimerPairs = (text: string): PrimerPair[] => {
  const t = (text || "").trim();
  if (!t) return [];

  const hasFastaHeader = t.split(/\r?\n/).some((l) => l.trim().startsWith(">"));
  let primers: string[] = [];

  if (hasFastaHeader) {
    const fasta = parseFastaPrimers(t);
    primers = fasta.map((e) => e.seq);
  } else {
    const seqs: string[] = [];
    t.split(/\r?\n/).forEach((raw) => {
      extractPrimerSeqsFromLine(raw).forEach((s) => seqs.push(s));
    });
    primers = seqs.map((s) => normalizePrimerSeq(s));
  }

  const pairs: PrimerPair[] = [];
  for (let i = 0; i + 1 < primers.length; i += 2) {
    pairs.push({ left: primers[i], right: primers[i + 1] });
  }
  return pairs;
};

export const WorkflowPanel: React.FC = () => {
  const { showToast } = useToast();
  const { setActiveTab, setPresetSequenceInput, setPresetBlastQuery, setPresetReversePair } = useWorkbench();
  const [seqText, setSeqText] = useState<string>("");
  const [primerText, setPrimerText] = useState<string>("");
  const [pairIndex, setPairIndex] = useState<number>(0);

  const normalizedSeq = useMemo(() => normalizeSequence(seqText), [seqText]);
  const primerPairs = useMemo(() => parsePrimerPairs(primerText), [primerText]);

  const selectedPair = primerPairs[pairIndex] ?? null;

  const copyText = async (text: string, label: string) => {
    const t = (text || "").trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      showToast(`${label} をコピーしました`, "success");
    } catch {
      showToast(`${label} のコピーに失敗しました`, "error");
    }
  };

  const sendSequenceTo = (tab: "sequence" | "blast") => {
    if (!normalizedSeq) {
      showToast("配列が空です。FASTA または塩基配列を貼り付けてください。", "error");
      return;
    }
    if (tab === "sequence") {
      setPresetSequenceInput?.({ sequence: normalizedSeq });
      setActiveTab?.("sequence");
      return;
    }
    setPresetBlastQuery?.({ sequence: normalizedSeq });
    setActiveTab?.("blast");
  };

  const sendPairToReverse = () => {
    if (!selectedPair) {
      showToast("プライマーが 1 ペア以上必要です。", "error");
      return;
    }
    setPresetReversePair?.({ primer1: selectedPair.left, primer2: selectedPair.right });
    setActiveTab?.("primer_reverse");
  };

  return (
    <div>
      <h2 className="panel-title">Workflow（貼り付け→各タブへ送る）</h2>
      <p className="panel-hint">
        よくある作業を「貼り付け→送る」で繋げます。DB の初期選択は「DB管理」タブで変更できます。
      </p>

      <div className="form-grid">
        <label className="seq-label grid-span-2">
          配列（FASTA / 生配列）:
          <textarea
            className="seq-textarea"
            rows={7}
            value={seqText}
            onChange={(e) => setSeqText(e.target.value)}
            placeholder={"例:\n>gene\nATG..."}
          />
          <div className="seq-hint">正規化後: {normalizedSeq.length.toLocaleString()} bp</div>
        </label>

        <label className="seq-label grid-span-2">
          プライマー（2行=1ペア / FASTA 可）:
          <textarea
            className="seq-textarea"
            rows={6}
            value={primerText}
            onChange={(e) => setPrimerText(e.target.value)}
            placeholder={"例:\nGCATGGCTTGTGATGCAACA\nTGGTACGTGTGGTTCAGTTTCA"}
          />
          <div className="seq-hint">検出: {primerPairs.length.toLocaleString()} ペア</div>
        </label>
      </div>

      <details className="ui-details" style={{ marginTop: "0.6rem" }} open>
        <summary>送る / コピー</summary>
        <div className="ui-details-body">
          <div className="primer-row" style={{ flexWrap: "wrap" }}>
            <button type="button" className="seq-button" onClick={() => sendSequenceTo("sequence")} disabled={!normalizedSeq}>
              Sequence 解析へ
            </button>
            <button type="button" className="seq-button" onClick={() => sendSequenceTo("blast")} disabled={!normalizedSeq}>
              BLAST へ
            </button>
            <button type="button" className="seq-button secondary" onClick={() => setActiveTab?.("db_manage")}>
              DB管理を開く
            </button>
            <button type="button" className="seq-button secondary" onClick={() => void copyText(normalizedSeq, "配列")} disabled={!normalizedSeq}>
              配列をコピー
            </button>
          </div>

          <div style={{ marginTop: "0.55rem" }}>
            <div className="primer-row" style={{ alignItems: "center" }}>
              <label className="seq-hint">
                ペア選択:
                <select
                  className="seq-input"
                  value={String(pairIndex)}
                  onChange={(e) => setPairIndex(Math.max(0, Number(e.target.value) || 0))}
                  style={{ marginLeft: "0.35rem", width: "min(420px, 70vw)" }}
                >
                  {primerPairs.length ? (
                    primerPairs.map((p, idx) => (
                      <option key={`${idx}-${p.left}-${p.right}`} value={String(idx)}>
                        #{idx + 1} ({p.left.length}/{p.right.length}) {p.left.slice(0, 12)}… / {p.right.slice(0, 12)}…
                      </option>
                    ))
                  ) : (
                    <option value="0">（プライマー未入力）</option>
                  )}
                </select>
              </label>
              <button type="button" className="seq-button" onClick={sendPairToReverse} disabled={!selectedPair}>
                Primer 逆引きへ（このペア）
              </button>
              <button
                type="button"
                className="seq-button secondary"
                onClick={() => void copyText(primerText, "プライマー原文")}
                disabled={!primerText.trim()}
              >
                プライマー原文をコピー
              </button>
            </div>

            {selectedPair ? (
              <div className="seq-hint" style={{ marginTop: "0.25rem" }}>
                選択中: F/R 不明でOK（Primer 逆引き側で向きを自動判定します） / {selectedPair.left} / {selectedPair.right}
              </div>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  );
};

