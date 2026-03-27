import { describe, expect, it } from "vitest";
import type { AlignmentVariant } from "../types/alignment";
import {
  buildConsensusFromVariants,
  filterVariants,
  getMismatchVariants,
  summarizeVariants,
} from "./variantDetection";

function makeVariant(type: AlignmentVariant["type"], pos = 0): AlignmentVariant {
  return {
    alignmentPos: pos,
    refPos: type === "insertion" ? -1 : pos,
    queryPos: type === "deletion" ? -1 : pos,
    type,
    refBase: type === "insertion" ? "-" : "A",
    queryBase: type === "deletion" ? "-" : "T",
  };
}

describe("summarizeVariants", () => {
  it("counts each variant type", () => {
    const variants = [
      makeVariant("match"),
      makeVariant("match"),
      makeVariant("substitution"),
      makeVariant("insertion"),
      makeVariant("deletion"),
      makeVariant("gap"),
    ];
    const summary = summarizeVariants(variants);
    expect(summary).toEqual({
      total: 6,
      matches: 2,
      substitutions: 1,
      insertions: 1,
      deletions: 1,
      gaps: 1,
    });
  });

  it("returns zero counts for empty array", () => {
    const summary = summarizeVariants([]);
    expect(summary.total).toBe(0);
    expect(summary.matches).toBe(0);
  });
});

describe("filterVariants", () => {
  it("filters by single type", () => {
    const variants = [makeVariant("match"), makeVariant("substitution"), makeVariant("deletion")];
    const result = filterVariants(variants, ["substitution"]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("substitution");
  });

  it("filters by multiple types", () => {
    const variants = [makeVariant("match"), makeVariant("substitution"), makeVariant("deletion")];
    const result = filterVariants(variants, ["substitution", "deletion"]);
    expect(result).toHaveLength(2);
  });
});

describe("getMismatchVariants", () => {
  it("excludes matches and gaps", () => {
    const variants = [
      makeVariant("match"),
      makeVariant("substitution"),
      makeVariant("insertion"),
      makeVariant("deletion"),
      makeVariant("gap"),
    ];
    const result = getMismatchVariants(variants);
    expect(result).toHaveLength(3);
    expect(result.map((v) => v.type)).toEqual(["substitution", "insertion", "deletion"]);
  });
});

describe("buildConsensusFromVariants", () => {
  it("marks fully conserved columns with *", () => {
    const seqs = ["AAAA", "AAAA", "AAAA"];
    expect(buildConsensusFromVariants(seqs)).toBe("****");
  });

  it("marks partial conservation correctly", () => {
    // 3 sequences: 2 match = 66% → ":"
    const seqs = ["AAA", "ATA", "AAA"];
    const consensus = buildConsensusFromVariants(seqs);
    expect(consensus[0]).toBe("*"); // A,A,A = 100%
    expect(consensus[1]).toBe(":"); // A,T,A = 66%
    expect(consensus[2]).toBe("*"); // A,A,A = 100%
  });

  it("returns space for all-gap columns", () => {
    const seqs = ["A-A", "A-A"];
    expect(buildConsensusFromVariants(seqs)[1]).toBe(" ");
  });

  it("returns empty string for empty input", () => {
    expect(buildConsensusFromVariants([])).toBe("");
  });
});
