import { describe, expect, it } from "vitest";
import type { AlignmentVariant } from "../types/alignment";
import type { WasmOrf } from "../types/wasm";
import { computeAminoAcidEffects, reconstructUngappedQuery } from "./aminoAcidEffects";

function makeVariants(ref: string, query: string): AlignmentVariant[] {
  const variants: AlignmentVariant[] = [];
  let refPos = 0;
  let queryPos = 0;

  for (let i = 0; i < ref.length; i++) {
    const r = ref[i];
    const q = query[i];
    let type: AlignmentVariant["type"];

    if (r === "-" && q === "-") type = "gap";
    else if (r === "-") type = "insertion";
    else if (q === "-") type = "deletion";
    else if (r.toUpperCase() === q.toUpperCase()) type = "match";
    else type = "substitution";

    variants.push({
      alignmentPos: i,
      refPos: r === "-" ? -1 : refPos,
      queryPos: q === "-" ? -1 : queryPos,
      type,
      refBase: r,
      queryBase: q,
    });

    if (r !== "-") refPos++;
    if (q !== "-") queryPos++;
  }

  return variants;
}

describe("computeAminoAcidEffects", () => {
  const makeOrf = (start: number, end: number): WasmOrf => ({
    start,
    end,
    strand: "forward",
    frame: 0,
    length_aa: Math.floor((end - start) / 3),
  });

  it("detects synonymous substitution", () => {
    // ref:   ATGTTT (M, F)
    // query: ATGTTC (M, F) — TTC is also F (synonymous)
    const ref = "ATGTTT";
    const query = "ATGTTC";
    const variants = makeVariants(ref, query);
    const orfs = [makeOrf(0, 6)];

    const effects = computeAminoAcidEffects(ref, query, variants, orfs);

    expect(effects).toHaveLength(1);
    expect(effects[0].effectType).toBe("synonymous");
    expect(effects[0].refAa).toBe("F");
    expect(effects[0].queryAa).toBe("F");
    expect(effects[0].codonPos).toBe(1); // second codon
  });

  it("detects missense substitution", () => {
    // ref:   ATGTTT (M, F)
    // query: ATGTAT (M, Y) — TAT is Y (missense)
    const ref = "ATGTTT";
    const query = "ATGTAT";
    const variants = makeVariants(ref, query);
    const orfs = [makeOrf(0, 6)];

    const effects = computeAminoAcidEffects(ref, query, variants, orfs);

    expect(effects).toHaveLength(1);
    expect(effects[0].effectType).toBe("missense");
    expect(effects[0].refAa).toBe("F");
    expect(effects[0].queryAa).toBe("Y");
  });

  it("detects nonsense substitution (creates stop codon)", () => {
    // ref:   ATGTTT (M, F)
    // query: ATGTAA (M, *) — TAA is stop (nonsense)
    const ref = "ATGTTT";
    const query = "ATGTAA";
    const variants = makeVariants(ref, query);
    const orfs = [makeOrf(0, 6)];

    const effects = computeAminoAcidEffects(ref, query, variants, orfs);

    expect(effects).toHaveLength(1);
    expect(effects[0].effectType).toBe("nonsense");
    expect(effects[0].queryAa).toBe("*");
  });

  it("returns empty when no substitutions in ORF region", () => {
    const ref = "ATGTTT";
    const query = "ATGTTT";
    const variants = makeVariants(ref, query);
    const orfs = [makeOrf(0, 6)];

    const effects = computeAminoAcidEffects(ref, query, variants, orfs);
    expect(effects).toHaveLength(0);
  });

  it("returns empty when substitution is outside ORF", () => {
    // ORF is positions 0..3, substitution at position 4
    const ref = "ATGATT";
    const query = "ATGACT";
    const variants = makeVariants(ref, query);
    const orfs = [makeOrf(0, 3)];

    const effects = computeAminoAcidEffects(ref, query, variants, orfs);
    expect(effects).toHaveLength(0);
  });

  it("handles multiple ORFs", () => {
    const ref = "ATGTTTATGAAA";
    const query = "ATGTTCATGAAG";
    const variants = makeVariants(ref, query);
    const orfs = [makeOrf(0, 6), makeOrf(6, 12)];

    const effects = computeAminoAcidEffects(ref, query, variants, orfs);
    expect(effects).toHaveLength(2);
    expect(effects[0].orfIndex).toBe(0);
    expect(effects[1].orfIndex).toBe(1);
  });
});

describe("reconstructUngappedQuery", () => {
  it("removes gaps from query", () => {
    const variants = makeVariants("ATGC", "A-GC");
    expect(reconstructUngappedQuery(variants)).toBe("AGC");
  });

  it("includes insertions", () => {
    const variants = makeVariants("A-GC", "ATGC");
    expect(reconstructUngappedQuery(variants)).toBe("ATGC");
  });

  it("handles all matches", () => {
    const variants = makeVariants("ATGC", "ATGC");
    expect(reconstructUngappedQuery(variants)).toBe("ATGC");
  });

  it("returns empty for empty input", () => {
    expect(reconstructUngappedQuery([])).toBe("");
  });
});
