import { generatedEnglishUi } from "./translations.generated";
import type { Language } from "./language";

const japanese = /[ぁ-んァ-ヶ一-龠]/;
const decodeEntities = (value: string): string =>
  value.replaceAll("&apos;", "'").replaceAll("&quot;", '"').replaceAll("&amp;", "&");
const translatedUi = Object.fromEntries(
  Object.entries({ ...generatedEnglishUi,
    "Excel・表から読み取る": "Import Excel or a table",
    "Excelのセルを上に貼り付けるか、ファイルを選択してください。ここでは検索せず、配列とペアを確認します。ファイルはブラウザ内で読み取ります。": "Paste Excel cells above or choose a file. Review sequences and pairs before searching. Files are read locally in your browser.",
    "Excel / CSV / TSV ファイル": "Excel / CSV / TSV file",
    "読むシート": "Worksheet",
    "貼り付けた内容を読む": "Read pasted text",
    "ペアの読み方": "Pair layout",
    "自動（見出しを優先・名前なしは各列で上下）": "Automatic: use headers; otherwise pair vertically in each column",
    "各列で上下2本が1ペア（縦の表が横に複数あっても可）": "Vertical: consecutive primers in each column, including parallel tables",
    "横の2本で1ペア（1行に名前・Fw・Re）": "Horizontal: two primers in each row (name / Fw / Re)",
    "対応する表と記法の例": "Supported layouts and examples",
    "名前・元の位置": "Names and source cells",
    "Fw / Re 配列（5′→3′）": "Fw / Re sequences (5′→3′)",
    "Fw/Reを入れ替え": "Swap Fw/Re",
    "確認したペアを検索入力へ取り込む": "Use reviewed pairs as search input",
    "ペア未確定の配列（検索には含めません）": "Unpaired primers (excluded from search)",
    "本がペア未確定": "unpaired primers",
    "読み取り中…": "Reading…",
    "500ペアを超えます。範囲を分けて取り込んでください。": "Over 500 pairs. Import a smaller range at a time.",
  }).map(([source, target]) => [decodeEntities(source), target]),
);
const entries = Object.entries(translatedUi).sort(([left], [right]) => right.length - left.length);
const originalText = new Map<Text, string>();
const originalAttributes = new Map<Element, Map<string, string>>();
let observer: MutationObserver | null = null;
let activeLanguage: Language = "ja";

const translate = (value: string): string => {
  if (!japanese.test(value)) return value;
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact === "日本語") return value;
  const exact = translatedUi[compact];
  if (exact) return value.replace(compact, exact);
  let result = value;
  for (const [source, target] of entries) {
    if (source.length >= 2 && result.includes(source)) result = result.replaceAll(source, target);
  }
  return result;
};

const translateNode = (node: Node): void => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node as Text;
    const parent = text.parentElement;
    if (!parent || parent.closest("script, style, code, pre, textarea")) return;
    const value = text.nodeValue ?? "";
    const translated = translate(value);
    if (translated !== value) {
      if (!originalText.has(text)) originalText.set(text, value);
      text.nodeValue = translated;
    }
    return;
  }
  if (!(node instanceof Element)) return;
  for (const attribute of ["title", "placeholder", "aria-label"]) {
    const value = node.getAttribute(attribute);
    if (!value) continue;
    const translated = translate(value);
    if (translated !== value) {
      if (!originalAttributes.has(node)) originalAttributes.set(node, new Map());
      const saved = originalAttributes.get(node)!;
      if (!saved.has(attribute)) saved.set(attribute, value);
      node.setAttribute(attribute, translated);
    }
  }
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let child = walker.nextNode();
  while (child) {
    translateNode(child);
    child = walker.nextNode();
  }
  node.querySelectorAll("[title], [placeholder], [aria-label]").forEach((element) => translateNode(element));
};

const restore = (): void => {
  for (const [node, value] of originalText) {
    if (node.isConnected) node.nodeValue = value;
  }
  for (const [element, attributes] of originalAttributes) {
    if (!element.isConnected) continue;
    for (const [name, value] of attributes) element.setAttribute(name, value);
  }
  originalText.clear();
  originalAttributes.clear();
};

export const applyUiLanguage = (language: Language): void => {
  activeLanguage = language;
  observer?.disconnect();
  observer = null;
  if (language === "ja") {
    restore();
    return;
  }
  if (document.body) translateNode(document.body);
  observer = new MutationObserver((mutations) => {
    if (activeLanguage !== "en") return;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(translateNode);
      if (mutation.type === "characterData") translateNode(mutation.target);
      if (mutation.type === "attributes") translateNode(mutation.target);
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["title", "placeholder", "aria-label"],
  });
};
