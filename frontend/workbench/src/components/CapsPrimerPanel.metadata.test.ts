import { describe, expect, it } from "vitest";
import type { CapsDesignResponse, CapsReportMetadata } from "../types/caps";
import { buildMarkdown, buildXlsxSheets } from "./CapsPrimerPanel";

const meta: CapsReportMetadata = {
  schema_version: "caps-report/1",
  app_version: "0.2.0",
  primer3: { identity: "primer3_core", version: "2.6.1" },
  blast: { identity: "blastn", version: "2.12.0+" },
  dbs: [
    { role: "ref", label: "ref_genome", db_type: "nucl" },
    { role: "alt", label: "alt_genome", db_type: "nucl" },
    { role: "screen", label: "ref_genome", db_type: "nucl" },
  ],
  conditions: {
    product_min: 200,
    product_max: 800,
    primer_num_return: 200,
    max_markers: 200,
    enzymes: ["EcoRI", "HindIII"] as string[],
    enzymes_per_primer: 2,
    max_cuts_per_allele: 3,
    min_fragment_len: 30,
    require_perfect_primers_in_alt: true,
    primer3_opt_tm: 60.0,
    primer3_min_tm: 57.0,
    primer3_max_tm: 63.0,
    primer3_min_size: 18,
    primer3_opt_size: 20,
    primer3_max_size: 27,
    primer3_min_gc: 20.0,
    primer3_max_gc: 80.0,
    primer3_salt_monovalent: 50.0,
    primer3_dna_conc: 50.0,
  },
  specificity: {
    screen_dbs: ["ref_genome"] as string[],
    screen_task: "blastn-short",
    screen_evalue: 1000,
    blast_max_target_seqs: 25,
    blast_num_threads: null,
    alt_mapping_task: "megablast",
    alt_mapping_evalue: 1e-20,
    alt_mapping_min_identity_pct: 85.0,
    alt_mapping_min_coverage: 0.55,
  },
};

const makeResponse = (): CapsDesignResponse => ({
  ref_db: "/home/user/blastdb/ref_genome",
  ref_entry: "chr1",
  ref_start: 1000,
  ref_end: 3000,
  ref_length: 2001,
  alt_db: "/home/user/blastdb/alt_genome",
  alt_entry: "chr1",
  alt_start: 900,
  alt_end: 2900,
  alt_strand: "plus",
  alt_length: 2001,
  mapped_by_blast: true,
  primer_pairs_generated: 10,
  markers: [],
  warnings: [],
  metadata: meta,
});

describe("caps report metadata", () => {
  it("markdown に再現用メタデータ節が含まれる", () => {
    const md = buildMarkdown(makeResponse());
    expect(md).toContain("## 解析条件（Reproducibility）");
    expect(md).toContain("- report_schema: caps-report/1");
    expect(md).toContain("- app_version: 0.2.0");
    expect(md).toContain("- primer3: primer3_core 2.6.1");
    expect(md).toContain("- blast: blastn 2.12.0+");
    expect(md).toContain("- db_ref: ref_genome (nucl)");
    expect(md).toContain("- product_size: 200–800");
    expect(md).toContain("- primer3_tm: opt=60 / min=57 / max=63");
    expect(md).toContain("- screen_blast: blastn-short evalue=1000");
    expect(md).not.toContain("/home/user/blastdb");
  });

  it("xlsx summary に metadata 行が含まれる", () => {
    const sheets = buildXlsxSheets(makeResponse());
    const summary = sheets.find((s) => s.name === "Summary");
    expect(summary).toBeDefined();
    const keys = summary!.data.map((row) => row[0]);
    expect(keys).toContain("report_schema");
    expect(keys).toContain("app_version");
    expect(keys).toContain("primer3");
    expect(keys).toContain("db_ref");
    expect(keys).toContain("screen_blast");
  });

  it("metadata なしでも既存レポート構造は壊れない", () => {
    const res = makeResponse();
    res.metadata = null;
    const md = buildMarkdown(res);
    expect(md).toContain("# CAPS プライマー作成レポート");
    expect(md).not.toContain("Reproducibility");
    const sheets = buildXlsxSheets(res);
    const summary = sheets.find((s) => s.name === "Summary");
    expect(summary!.data.some((row) => row[0] === "markers")).toBe(true);
  });
});


