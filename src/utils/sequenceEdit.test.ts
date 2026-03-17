import type { SequenceAnnotation } from "../types/sequence";
import { adjustAnnotations, applyEdit, validateBases } from "./sequenceEdit";

describe("validateBases", () => {
  it("accepts valid DNA bases", () => {
    expect(validateBases("ATGC")).toBe(true);
    expect(validateBases("atgcn")).toBe(true);
    expect(validateBases("NNNN")).toBe(true);
    expect(validateBases("")).toBe(true);
  });

  it("rejects invalid characters", () => {
    expect(validateBases("ATGX")).toBe(false);
    expect(validateBases("ATG C")).toBe(false);
    expect(validateBases("123")).toBe(false);
    expect(validateBases("ATGU")).toBe(false); // RNA base
  });
});

describe("applyEdit", () => {
  const seq = "ATGCATGC";

  describe("insert", () => {
    it("inserts bases at the specified position", () => {
      expect(applyEdit(seq, { type: "insert", position: 0, insertedBases: "NNN" })).toBe(
        "NNNATGCATGC",
      );
      expect(applyEdit(seq, { type: "insert", position: 4, insertedBases: "AA" })).toBe(
        "ATGCAAATGC",
      );
      expect(applyEdit(seq, { type: "insert", position: 8, insertedBases: "TT" })).toBe(
        "ATGCATGCTT",
      );
    });

    it("handles empty insert", () => {
      expect(applyEdit(seq, { type: "insert", position: 4, insertedBases: "" })).toBe(seq);
    });

    it("clamps position to valid range", () => {
      expect(applyEdit(seq, { type: "insert", position: -5, insertedBases: "AA" })).toBe(
        "AAATGCATGC",
      );
      expect(applyEdit(seq, { type: "insert", position: 100, insertedBases: "AA" })).toBe(
        "ATGCATGCAA",
      );
    });
  });

  describe("delete", () => {
    it("deletes bases at the specified position", () => {
      expect(applyEdit(seq, { type: "delete", position: 0, deletedCount: 3 })).toBe("CATGC");
      expect(applyEdit(seq, { type: "delete", position: 4, deletedCount: 4 })).toBe("ATGC");
    });

    it("handles zero delete count", () => {
      expect(applyEdit(seq, { type: "delete", position: 0, deletedCount: 0 })).toBe(seq);
    });

    it("handles delete beyond sequence length", () => {
      expect(applyEdit(seq, { type: "delete", position: 6, deletedCount: 10 })).toBe("ATGCAT");
    });
  });

  describe("replace", () => {
    it("replaces bases at the specified position", () => {
      expect(
        applyEdit(seq, { type: "replace", position: 0, deletedCount: 3, insertedBases: "CCC" }),
      ).toBe("CCCCATGC");
    });

    it("handles replacement with different length", () => {
      expect(
        applyEdit(seq, { type: "replace", position: 2, deletedCount: 2, insertedBases: "NNNNN" }),
      ).toBe("ATNNNNNATGC");
    });

    it("replace with empty string acts like delete", () => {
      expect(
        applyEdit(seq, { type: "replace", position: 0, deletedCount: 4, insertedBases: "" }),
      ).toBe("ATGC");
    });
  });
});

describe("adjustAnnotations", () => {
  const makeAnn = (
    name: string,
    start: number,
    end: number,
    extra?: Partial<SequenceAnnotation>,
  ): SequenceAnnotation => ({
    name,
    start,
    end,
    ...extra,
  });

  describe("insert", () => {
    it("shifts annotations after the insert position", () => {
      const annotations = [makeAnn("a", 10, 20)];
      const result = adjustAnnotations(annotations, {
        type: "insert",
        position: 5,
        insertedBases: "AAA",
      });
      expect(result).toEqual([makeAnn("a", 13, 23)]);
    });

    it("does not affect annotations before the insert position", () => {
      const annotations = [makeAnn("a", 0, 5)];
      const result = adjustAnnotations(annotations, {
        type: "insert",
        position: 10,
        insertedBases: "AAA",
      });
      expect(result).toEqual([makeAnn("a", 0, 5)]);
    });

    it("expands annotations that span the insert position", () => {
      const annotations = [makeAnn("a", 5, 15)];
      const result = adjustAnnotations(annotations, {
        type: "insert",
        position: 10,
        insertedBases: "AAAA",
      });
      expect(result).toEqual([makeAnn("a", 5, 19)]);
    });

    it("shifts annotations starting exactly at the insert position", () => {
      const annotations = [makeAnn("a", 10, 20)];
      const result = adjustAnnotations(annotations, {
        type: "insert",
        position: 10,
        insertedBases: "AA",
      });
      expect(result).toEqual([makeAnn("a", 12, 22)]);
    });

    it("does not move annotations ending exactly at the insert position", () => {
      const annotations = [makeAnn("a", 5, 10)];
      const result = adjustAnnotations(annotations, {
        type: "insert",
        position: 10,
        insertedBases: "AA",
      });
      expect(result).toEqual([makeAnn("a", 5, 10)]);
    });

    it("preserves annotation properties", () => {
      const annotations = [makeAnn("gene1", 10, 20, { direction: 1, color: "#ff0000" })];
      const result = adjustAnnotations(annotations, {
        type: "insert",
        position: 5,
        insertedBases: "A",
      });
      expect(result[0].direction).toBe(1);
      expect(result[0].color).toBe("#ff0000");
    });
  });

  describe("delete", () => {
    it("shifts annotations after the deleted range", () => {
      const annotations = [makeAnn("a", 10, 20)];
      const result = adjustAnnotations(annotations, {
        type: "delete",
        position: 0,
        deletedCount: 5,
      });
      expect(result).toEqual([makeAnn("a", 5, 15)]);
    });

    it("does not affect annotations before the deleted range", () => {
      const annotations = [makeAnn("a", 0, 5)];
      const result = adjustAnnotations(annotations, {
        type: "delete",
        position: 10,
        deletedCount: 5,
      });
      expect(result).toEqual([makeAnn("a", 0, 5)]);
    });

    it("removes annotations fully within the deleted range", () => {
      const annotations = [makeAnn("a", 5, 10)];
      const result = adjustAnnotations(annotations, {
        type: "delete",
        position: 3,
        deletedCount: 10,
      });
      expect(result).toEqual([]);
    });

    it("shrinks annotations partially overlapping (start before delete)", () => {
      const annotations = [makeAnn("a", 5, 15)];
      const result = adjustAnnotations(annotations, {
        type: "delete",
        position: 10,
        deletedCount: 10,
      });
      expect(result).toEqual([makeAnn("a", 5, 10)]);
    });

    it("shrinks annotations partially overlapping (start within delete)", () => {
      const annotations = [makeAnn("a", 5, 20)];
      const result = adjustAnnotations(annotations, {
        type: "delete",
        position: 3,
        deletedCount: 5,
      });
      // start was 5, within delete [3..8) → start becomes position=3
      // end was 20 → 20 - 5 = 15
      expect(result).toEqual([makeAnn("a", 3, 15)]);
    });

    it("shrinks annotations that fully contain the deleted range", () => {
      const annotations = [makeAnn("a", 0, 20)];
      const result = adjustAnnotations(annotations, {
        type: "delete",
        position: 5,
        deletedCount: 5,
      });
      expect(result).toEqual([makeAnn("a", 0, 15)]);
    });

    it("handles multiple annotations", () => {
      const annotations = [
        makeAnn("before", 0, 3),
        makeAnn("inside", 5, 8),
        makeAnn("after", 12, 15),
      ];
      const result = adjustAnnotations(annotations, {
        type: "delete",
        position: 4,
        deletedCount: 6,
      });
      expect(result).toEqual([makeAnn("before", 0, 3), makeAnn("after", 6, 9)]);
    });
  });

  describe("replace", () => {
    it("handles same-length replacement (no shift)", () => {
      const annotations = [makeAnn("a", 10, 20)];
      const result = adjustAnnotations(annotations, {
        type: "replace",
        position: 0,
        deletedCount: 5,
        insertedBases: "NNNNN",
      });
      expect(result).toEqual([makeAnn("a", 10, 20)]);
    });

    it("handles longer replacement (positive delta)", () => {
      const annotations = [makeAnn("a", 10, 20)];
      const result = adjustAnnotations(annotations, {
        type: "replace",
        position: 0,
        deletedCount: 3,
        insertedBases: "NNNNN",
      });
      // delta = 5 - 3 = 2 → shift by +2
      expect(result).toEqual([makeAnn("a", 12, 22)]);
    });

    it("handles shorter replacement (negative delta)", () => {
      const annotations = [makeAnn("a", 10, 20)];
      const result = adjustAnnotations(annotations, {
        type: "replace",
        position: 0,
        deletedCount: 5,
        insertedBases: "NN",
      });
      // delta = 2 - 5 = -3 → shift by -3
      expect(result).toEqual([makeAnn("a", 7, 17)]);
    });

    it("removes annotations within replaced range when replacement is shorter", () => {
      const annotations = [makeAnn("a", 2, 4)];
      const result = adjustAnnotations(annotations, {
        type: "replace",
        position: 0,
        deletedCount: 10,
        insertedBases: "AA",
      });
      expect(result).toEqual([]);
    });
  });
});
