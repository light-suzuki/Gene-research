// Ensembl Plants 関連のユーティリティ

export const inferEnsemblPlantsSpeciesFromGeneId = (geneId: string | undefined | null): string | null => {
  if (!geneId) return null;
  const trimmed = geneId.trim();
  if (!trimmed) return null;

  // ref Psat... は標準の user_species
  if (/^Psat[0-9a-z]+/i.test(trimmed)) return "user_species";
  // ALT の KIW84_... は GCA_024323335.2 のパスを使う
  if (/^KIW[0-9A-Za-z_]+/.test(trimmed)) return "user_species_alt";
  return null;
};

export const inferEnsemblPlantsSpeciesFromDbLabel = (label: string | undefined | null): string | null => {
  if (!label) return null;
  const t = label.trim().toLowerCase();
  if (!t) return null;

  // ALT
  if (t.includes("ALT") || t.includes("gca_024323335")) return "user_species_alt";
  // ref のみ user_species に寄せる
  if (t.includes("ref") || t.includes("UserDB_ref") || t.includes("user_species_ref")) return "user_species";
  return null;
};

export const inferEnsemblPlantsSpecies = (opts: {
  geneId?: string | null;
  dbLabel?: string | null;
}): string | null => {
  return (
    inferEnsemblPlantsSpeciesFromGeneId(opts.geneId) ||
    inferEnsemblPlantsSpeciesFromDbLabel(opts.dbLabel)
  );
};

export const ensemblLocationUrl = (opts: {
  species: string | undefined | null;
  chrom: string | undefined | null;
  start: number | undefined | null;
  end: number | undefined | null;
}): string | null => {
  const species = (opts.species || "").trim();
  const chrom = (opts.chrom || "").trim();
  const start = opts.start;
  const end = opts.end;
  if (!species || !chrom) return null;
  if (start == null || end == null) return null;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const left = Math.min(start, end);
  const right = Math.max(start, end);
  if (left < 1 || right < 1) return null;

  return `https://plants.ensembl.org/${species}/Location/View?r=${encodeURIComponent(
    `${chrom}:${left}-${right}`,
  )}`;
};

const buildSemicolonQuery = (pairs: Array<[string, string]>): string => {
  return pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join(";");
};

export const inferEnsemblTranscriptId = (opts: {
  geneId?: string | undefined | null;
  geneName?: string | undefined | null;
}): string | null => {
  const geneId = (opts.geneId || "").trim();
  const geneName = (opts.geneName || "").trim();

  const candidates = [geneName, geneId].filter((v) => Boolean(v && v.trim())) as string[];
  const psatG = /^Psat\\d+G\\d+/i;
  const psatg = /^Psat[0-9A-Za-z]+g\\d+/i;

  for (const c of candidates) {
    if (/-T\\d+$/i.test(c)) return c;
    if (/\\.\\d+$/i.test(c)) return c;
  }

  // ALT: KIW geneID + PsatNNGNNNNNN の geneName → Psat...-T1
  if (geneName && geneName !== geneId && psatG.test(geneName)) {
    return `${geneName}-T1`;
  }

  for (const c of candidates) {
    if (psatG.test(c)) return `${c}-T1`;
    if (psatg.test(c)) return `${c}.1`;
  }

  return null;
};

export const ensemblTranscriptSummaryUrl = (opts: {
  species: string | undefined | null;
  geneId: string | undefined | null;
  transcriptId: string | undefined | null;
  chrom?: string | undefined | null;
  start?: number | undefined | null;
  end?: number | undefined | null;
}): string | null => {
  const species = (opts.species || "").trim();
  const geneId = (opts.geneId || "").trim();
  const transcriptId = (opts.transcriptId || "").trim();
  if (!species || !geneId || !transcriptId) return null;

  const pairs: Array<[string, string]> = [
    ["db", "core"],
    ["g", geneId],
    ["t", transcriptId],
  ];

  const chrom = (opts.chrom || "").trim();
  const start = opts.start;
  const end = opts.end;
  if (chrom && start != null && end != null && Number.isFinite(start) && Number.isFinite(end)) {
    const left = Math.min(start, end);
    const right = Math.max(start, end);
    if (left >= 1 && right >= 1) {
      pairs.push(["r", `${chrom}:${left}-${right}`]);
    }
  }

  return `https://plants.ensembl.org/${species}/Transcript/Summary?${buildSemicolonQuery(pairs)}`;
};

export const ensemblTranscriptExportUrl = (opts: {
  species: string | undefined | null;
  geneId: string | undefined | null;
  transcriptId: string | undefined | null;
  chrom?: string | undefined | null;
  start?: number | undefined | null;
  end?: number | undefined | null;
}): string | null => {
  const species = (opts.species || "").trim();
  const geneId = (opts.geneId || "").trim();
  const transcriptId = (opts.transcriptId || "").trim();
  if (!species || !geneId || !transcriptId) return null;

  const pairs: Array<[string, string]> = [
    ["db", "core"],
    ["flank3_display", "0"],
    ["flank5_display", "0"],
    ["g", geneId],
    ["output", "fasta"],
  ];

  const chrom = (opts.chrom || "").trim();
  const start = opts.start;
  const end = opts.end;
  if (chrom && start != null && end != null && Number.isFinite(start) && Number.isFinite(end)) {
    const left = Math.min(start, end);
    const right = Math.max(start, end);
    if (left >= 1 && right >= 1) {
      pairs.push(["r", `${chrom}:${left}-${right}`]);
    }
  }

  pairs.push(
    ["strand", "feature"],
    ["t", transcriptId],
    ["param", "cdna"],
    ["param", "coding"],
    ["param", "peptide"],
    ["param", "utr5"],
    ["param", "utr3"],
    ["param", "exon"],
    ["param", "intron"],
    ["genomic", "unmasked"],
    ["_format", "Text"],
  );

  return `https://plants.ensembl.org/${species}/Export/Output/Transcript?${buildSemicolonQuery(pairs)}`;
};

/**
 * ローカル BLAST DB で使っている gene ID から、
 * 対応する Ensembl Plants Gene サマリーページの URL を推定する。
 *
 * - ref: Psat... → user_species
 * - ALT: KIW84_... → user_species_alt
 *
 * 対応できない ID の場合は null を返す。
 */
export const ensemblGeneUrl = (geneId: string | undefined | null): string | null => {
  if (!geneId) return null;
  const trimmed = geneId.trim();
  if (!trimmed) return null;

  const species = inferEnsemblPlantsSpeciesFromGeneId(trimmed);
  if (species) {
    return `https://plants.ensembl.org/${species}/Gene/Summary?g=${encodeURIComponent(trimmed)}`;
  }

  // 直接対応できない ID は、Ensembl Plants の検索結果ページにフォールバックする。
  // (gene summary が存在しない場合でも、検索なら辿れる可能性がある)
  return `https://plants.ensembl.org/Multi/Search/Results?q=${encodeURIComponent(trimmed)}`;
};

// --- Optional local reference browser integration ---

/**
 * Ensembl Plants に存在しないローカル専用の BLAST DB かどうかを判定する。
 * ref / ALT のみ Ensembl Plants に存在するため false を返す。
 * FRA, JAC, JI*, USU, query 系統はローカル専用として true を返す。
 */
export const isLocalOnlyDb = (dbLabel: string | undefined | null): boolean => {
  if (!dbLabel) return false;
  const t = dbLabel.trim().toLowerCase();
  if (!t) return false;

  // Ensembl Plants に存在する DB パターン (ref と ALT のみ)
  const ensemblPatterns = [
    "ref",
    "UserDB_ref",
    "user_species_ref",
    "ALT",
    "gca_024323335",
  ];

  for (const pat of ensemblPatterns) {
    if (t.includes(pat)) return false;
  }

  // その他（FRA, JAC, JI*, USU, query など）はローカル専用と見なす
  return true;
};

/**
 * ローカル DB のラベルから外部ブラウザ用の species 表示名にマッピングする。
 */
export const getLocalReferenceSpecies = (dbLabel: string | undefined | null): string => {
  if (!dbLabel) return "user_species_ref"; // default
  const t = dbLabel.trim().toLowerCase();

  const speciesMap: Record<string, string> = {
    "fra": "user_species_ref",
    "jac": "user_species_ref",
    "ji128": "user_species_ref",
    "ji2694": "user_species_ref",
    "ji5": "user_species_ref",
    "usu": "user_species_ref",
    "UserDB_query": "user_species_alt",
    "query_ps": "user_species_alt_ps",
  };

  for (const [key, value] of Object.entries(speciesMap)) {
    if (t.includes(key)) {
      return value;
    }
  }

  return "user_species_ref"; // default fallback
};

/**
 * ローカル参照ブラウザのベース URL。
 */
export const getLocalReferenceBaseUrl = (): string => {
  return "http://127.0.0.1:13600";
};

/**
 * ローカル DB の遺伝子を外部参照ブラウザで開くための URL を生成する。
 */
export const localReferenceGeneUrl = (opts: {
  geneId?: string | null;
  dbLabel?: string | null;
}): string | null => {
  const geneId = (opts.geneId || "").trim();
  if (!geneId) return null;

  const species = getLocalReferenceSpecies(opts.dbLabel);
  const base = getLocalReferenceBaseUrl();

  return `${base}/${species}/Gene/Summary?g=${encodeURIComponent(geneId)}`;
};

/**
 * ローカル DB の座標を外部参照ブラウザの Location ビューで開くための URL を生成する。
 */
export const localReferenceLocationUrl = (opts: {
  dbLabel?: string | null;
  chrom?: string | null;
  start?: number | null;
  end?: number | null;
}): string | null => {
  const chrom = (opts.chrom || "").trim();
  const start = opts.start;
  const end = opts.end;
  if (!chrom || start == null || end == null) return null;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const left = Math.min(start, end);
  const right = Math.max(start, end);
  if (left < 1 || right < 1) return null;

  const species = getLocalReferenceSpecies(opts.dbLabel);
  const base = getLocalReferenceBaseUrl();

  return `${base}/${species}/Location/View?r=${encodeURIComponent(`${chrom}:${left}-${right}`)}`;
};

// --- Legacy: UserDBGenomeNavigator 連携 (後方互換性のため残す) ---

/**
 * UserDBGenomeNavigator のベース URL。
 * 環境変数またはデフォルト値を使用。
 */
export const getNavigatorBaseUrl = (): string => {
  // Vite 環境変数または window オブジェクト経由で設定可能
  if (typeof window !== "undefined" && (window as unknown as Record<string, string>).NAVIGATOR_BASE_URL) {
    return (window as unknown as Record<string, string>).NAVIGATOR_BASE_URL;
  }
  // デフォルト: 同一ホストの 8000 ポート
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
};

/**
 * ローカル DB の遺伝子を UserDBGenomeNavigator で開くための URL を生成する。
 */
export const navigatorGeneUrl = (opts: {
  geneId?: string | null;
  dbLabel?: string | null;
}): string | null => {
  return localReferenceGeneUrl(opts);
};

/**
 * ローカル DB の座標を UserDBGenomeNavigator のゲノムビューで開くための URL を生成する。
 */
export const navigatorLocationUrl = (opts: {
  dbLabel?: string | null;
  chrom?: string | null;
  start?: number | null;
  end?: number | null;
}): string | null => {
  return localReferenceLocationUrl(opts);
};
