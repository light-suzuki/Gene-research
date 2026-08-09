import { afterEach, describe, expect, it, vi } from "vitest";
import type { CapsDesignResponse } from "../types/caps";
import { buildMarkdown } from "./CapsPrimerPanel";

afterEach(() => {
  vi.unstubAllEnvs();
});

const makeResponse = (overrides?: Partial<CapsDesignResponse>): CapsDesignResponse => ({
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
  markers: [
    {
      index: 1,
      enzyme: "EcoRI",
      primer_left: "ATGCATGCATGC",
      primer_right: "GCATGCATGCAT",
      product_len_ref: 300,
      product_len_alt: 300,
      ref_product_start: 1500,
      ref_product_end: 1800,
      alt_product_start: 1450,
      alt_product_end: 1750,
      alt_strand: "plus",
      mismatch_count: 2,
      cuts_ref: [100],
      cuts_alt: [50, 150],
      fragments_ref: [100, 200],
      fragments_alt: [50, 100, 150],
      gene_label: "Vfaba.GeneID.00001",
      blast: [],
    },
  ],
  warnings: [],
  ...overrides,
});

describe("buildMarkdown gene link", () => {
  it("Ensembl gene fixture は正しい外部リンクとして出る", () => {
    vi.stubEnv("VITE_ENSEMBL_SPECIES", "vicia_faba");
    const md = buildMarkdown(makeResponse());
    expect(md).toContain(
      "[Vfaba.GeneID.00001](https://plants.ensembl.org/vicia_faba/Gene/Summary?g=Vfaba.GeneID.00001)",
    );
  });

  it("local gene fixture は Ensembl へリンクしない（base URL 設定時はローカル参照ブラウザ）", () => {
    vi.stubEnv("VITE_ENSEMBL_SPECIES", "");
    vi.stubEnv("VITE_LOCAL_REFERENCE_BASE_URL", "http://127.0.0.1:8000");
    vi.stubEnv("VITE_LOCAL_REFERENCE_SPECIES", "local_genome");
    const md = buildMarkdown(makeResponse({ ref_db: "/home/user/blastdb/local_only" }));
    expect(md).toContain(
      "[Vfaba.GeneID.00001](http://127.0.0.1:8000/local_genome/Gene/Summary?g=Vfaba.GeneID.00001)",
    );
    expect(md).not.toContain("plants.ensembl.org");
  });

  it("link 不能 ID は plain text として安全に出る", () => {
    vi.stubEnv("VITE_ENSEMBL_SPECIES", "");
    vi.stubEnv("VITE_LOCAL_REFERENCE_BASE_URL", "");
    const md = buildMarkdown(makeResponse({ ref_db: "/home/user/blastdb/local_only" }));
    expect(md).toContain("| 1 | EcoRI | Vfaba.GeneID.00001 |");
    expect(md).not.toContain("](");
  });

  it("gene_label がない行は - を出す", () => {
    vi.stubEnv("VITE_ENSEMBL_SPECIES", "");
    const md = buildMarkdown(
      makeResponse({ markers: [{ ...makeResponse().markers[0], gene_label: null }] }),
    );
    expect(md).toContain("| 1 | EcoRI | - |");
  });
});
