import React, { useEffect, useMemo, useState } from "react";
import type { ImportedPair } from "../utils/primerTable";
import { orderOligos, orderSheet, orderWarnings } from "../utils/primerOrder";
import { downloadXlsx } from "../utils/exportXlsx";

export const PrimerOrderSheet: React.FC<{ pairs: ImportedPair[]; disabled?: boolean }> = ({ pairs, disabled }) => {
  const initial = useMemo(() => orderOligos(pairs), [pairs]);
  const [oligos, setOligos] = useState(initial);
  const [scale, setScale] = useState("");
  const [purification, setPurification] = useState("");
  const [delivery, setDelivery] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => { setOligos(initial); setStatus(""); }, [initial]);
  const warnings = orderWarnings(oligos);
  const blocked = disabled || !oligos.length || oligos.length > 1000 || oligos.some(p => !p.name.trim() || /[\t\r\n]/.test(p.name)) || new Set(oligos.map(p => p.name.trim())).size !== oligos.length;
  const exportFile = async (pasteOnly: boolean) => {
    setStatus("");
    try {
      await downloadXlsx([{ name: pasteOnly ? "Name_Sequence" : "Oligo_Order", data: pasteOnly ? [["Name", "Sequence"], ...oligos.map(p => [p.name, p.sequence])] : orderSheet(oligos, scale, purification, delivery, note) }], pasteOnly ? "primer_name_sequence" : "primer_order");
      setStatus("注文票を出力しました。条件と配列を確認してメーカー側で注文してください。");
    } catch (e) { setStatus(e instanceof Error ? e.message : String(e)); }
  };
  return <details className="ui-details"><summary>注文票を作る</summary><div className="ui-details-body" style={{ display: "grid", gap: 10 }}>
    <p>上で選択したペアのプライマーを出力します。検索やWet検証の合格を意味しません。注文の送信は行いません。</p>
    <p>{oligos.length}本。未指定の条件は空欄で出力します。標準の未修飾DNA用です。修飾オリゴはメーカーの専用フォームで指定してください。</p>
    <label>合成スケール（メーカーの単位で入力） <input value={scale} disabled={disabled} placeholder="例: 25 nmol" onChange={e => setScale(e.target.value)} /></label>
    <label>精製 <select value={purification} disabled={disabled} onChange={e => setPurification(e.target.value)}><option value="">未指定</option><option>Desalt</option><option>HPLC</option><option>PAGE</option><option>Cartridge</option></select></label>
    <label>納品形態 <select value={delivery} disabled={disabled} onChange={e => setDelivery(e.target.value)}><option value="">未指定</option><option value="Dry">乾燥</option><option value="Solution (specify in notes)">溶液（備考に条件を記載）</option></select></label>
    <label>注文備考 <input value={note} disabled={disabled} onChange={e => setNote(e.target.value)} /></label>
    {warnings.map(w => <p key={w} role="status">{w}</p>)}
    <div style={{ maxHeight: 250, overflow: "auto" }}><table><thead><tr><th>注文名（編集可）</th><th>配列 5′→3′</th><th>nt</th></tr></thead><tbody>{oligos.map((p, i) => <tr key={i}><td><input aria-label={`注文名 ${i + 1}`} value={p.name} disabled={disabled} onChange={e => setOligos(old => old.map((v, j) => i === j ? { ...v, name: e.target.value } : v))} /></td><td><code>{p.sequence}</code></td><td>{p.sequence.length}</td></tr>)}</tbody></table></div>
    <button disabled={blocked} onClick={() => void exportFile(false)}>汎用注文票 Excel を保存</button>
    <button disabled={blocked} onClick={() => void exportFile(true)}>メーカー貼付用 Excel（名前・配列）を保存</button>
    {status && <p role="status">{status}</p>}
    <p>メーカー貼付用は共通の2列一覧です。公式テンプレートそのものではありません。スケール・精製・配送情報はメーカー側で設定してください。</p>
    <ul><li><a href="https://eurofinsgenomics.jp/media/29282/custom_oligo_orderform_dna_v302_std_jp.xlsx" target="_blank" rel="noreferrer">Eurofins 公式標準オリゴ注文書（日本語）</a> / <a href="https://eurofinsgenomics.jp/media/29283/custom_oligo_orderform_dna_v302_std_english.xlsx" target="_blank" rel="noreferrer">English</a></li>
    <li><a href="https://eurofinsgenomics.jp/jp/contact/order-form/" target="_blank" rel="noreferrer">Eurofins 最新の公式注文書一覧</a></li>
    <li><a href="https://fasmac.co.jp/dna_rna_order_webguide-2" target="_blank" rel="noreferrer">FASMAC 公式注文ガイド</a></li>
    <li><a href="https://sg.idtdna.com/page/support-and-education/technical-support/how-to-order" target="_blank" rel="noreferrer">IDT 公式注文ガイド</a></li></ul>
  </div></details>;
};
