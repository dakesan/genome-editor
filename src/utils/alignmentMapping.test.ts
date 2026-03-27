import { describe, expect, it } from "vitest";
import {
  buildAlignedToRefMap,
  buildAllQueryMappings,
  buildQueryMapping,
  buildRefToAlignedMap,
  detectVariants,
} from "./alignmentMapping";

describe("buildAlignedToRefMap", () => {
  it("maps ungapped sequence 1:1", () => {
    expect(buildAlignedToRefMap("ATGC")).toEqual([0, 1, 2, 3]);
  });

  it("assigns -1 to gap positions", () => {
    expect(buildAlignedToRefMap("A-T-GC")).toEqual([0, -1, 1, -1, 2, 3]);
  });

  it("handles all-gap sequence", () => {
    expect(buildAlignedToRefMap("---")).toEqual([-1, -1, -1]);
  });

  it("handles empty sequence", () => {
    expect(buildAlignedToRefMap("")).toEqual([]);
  });
});

describe("buildRefToAlignedMap", () => {
  it("maps ungapped sequence 1:1", () => {
    expect(buildRefToAlignedMap("ATGC")).toEqual([0, 1, 2, 3]);
  });

  it("skips gap positions", () => {
    expect(buildRefToAlignedMap("A-T-GC")).toEqual([0, 2, 4, 5]);
  });

  it("returns empty for all-gap", () => {
    expect(buildRefToAlignedMap("---")).toEqual([]);
  });
});

describe("detectVariants", () => {
  it("detects all match when sequences are identical", () => {
    const ref = "ATGC";
    const query = "ATGC";
    const map = buildAlignedToRefMap(ref);
    const variants = detectVariants(ref, query, map);

    expect(variants).toHaveLength(4);
    expect(variants.every((v) => v.type === "match")).toBe(true);
    expect(variants[0]).toEqual({
      alignmentPos: 0,
      refPos: 0,
      queryPos: 0,
      type: "match",
      refBase: "A",
      queryBase: "A",
    });
  });

  it("detects substitutions", () => {
    const ref = "ATGC";
    const query = "AAGC";
    const map = buildAlignedToRefMap(ref);
    const variants = detectVariants(ref, query, map);

    expect(variants[1].type).toBe("substitution");
    expect(variants[1].refBase).toBe("T");
    expect(variants[1].queryBase).toBe("A");
  });

  it("detects insertions (gap in ref)", () => {
    const ref = "A-GC";
    const query = "ATGC";
    const map = buildAlignedToRefMap(ref);
    const variants = detectVariants(ref, query, map);

    expect(variants[1].type).toBe("insertion");
    expect(variants[1].refPos).toBe(-1);
    expect(variants[1].queryPos).toBe(1);
  });

  it("detects deletions (gap in query)", () => {
    const ref = "ATGC";
    const query = "A-GC";
    const map = buildAlignedToRefMap(ref);
    const variants = detectVariants(ref, query, map);

    expect(variants[1].type).toBe("deletion");
    expect(variants[1].queryPos).toBe(-1);
    expect(variants[1].refPos).toBe(1);
  });

  it("detects double gaps as gap type", () => {
    const ref = "A-GC";
    const query = "A-GC";
    const map = buildAlignedToRefMap(ref);
    const variants = detectVariants(ref, query, map);

    expect(variants[1].type).toBe("gap");
  });

  it("tracks query positions correctly with gaps", () => {
    // ref:   A T - G C
    // query: A - T G C
    const ref = "AT-GC";
    const query = "A-TGC";
    const map = buildAlignedToRefMap(ref);
    const variants = detectVariants(ref, query, map);

    // Position 0: match A/A, queryPos=0
    expect(variants[0]).toMatchObject({ type: "match", queryPos: 0 });
    // Position 1: deletion T/-, queryPos=-1
    expect(variants[1]).toMatchObject({ type: "deletion", queryPos: -1 });
    // Position 2: insertion -/T, queryPos=1
    expect(variants[2]).toMatchObject({ type: "insertion", queryPos: 1 });
    // Position 3: match G/G, queryPos=2
    expect(variants[3]).toMatchObject({ type: "match", queryPos: 2 });
    // Position 4: match C/C, queryPos=3
    expect(variants[4]).toMatchObject({ type: "match", queryPos: 3 });
  });
});

describe("buildQueryMapping", () => {
  it("computes identity and ref range", () => {
    const ref = "ATGC";
    const query = "AAGC";
    const map = buildAlignedToRefMap(ref);
    const mapping = buildQueryMapping(ref, query, "seq2", map);

    expect(mapping.queryName).toBe("seq2");
    expect(mapping.refStart).toBe(0);
    expect(mapping.refEnd).toBe(4);
    // 3 out of 4 match → 75%
    expect(mapping.identity).toBeCloseTo(75);
    expect(mapping.variants).toHaveLength(4);
  });

  it("computes 100% identity for identical sequences", () => {
    const ref = "ATGC";
    const query = "ATGC";
    const map = buildAlignedToRefMap(ref);
    const mapping = buildQueryMapping(ref, query, "seq2", map);

    expect(mapping.identity).toBeCloseTo(100);
  });
});

describe("buildAllQueryMappings", () => {
  it("builds mappings for all queries", () => {
    const sequences = [
      { name: "ref", sequence: "ATGC" },
      { name: "q1", sequence: "AAGC" },
      { name: "q2", sequence: "ATGC" },
    ];

    const { alignedToRefMap, refToAlignedMap, mappings } = buildAllQueryMappings(sequences);

    expect(alignedToRefMap).toEqual([0, 1, 2, 3]);
    expect(refToAlignedMap).toEqual([0, 1, 2, 3]);
    expect(mappings).toHaveLength(2);
    expect(mappings[0].queryName).toBe("q1");
    expect(mappings[1].queryName).toBe("q2");
  });

  it("returns empty for fewer than 2 sequences", () => {
    const result = buildAllQueryMappings([{ name: "ref", sequence: "ATGC" }]);
    expect(result.mappings).toHaveLength(0);
  });
});
