import { describe, expect, it } from "vitest";
import { isStopCodon, translateCodon, translateSequence } from "./codonTable";

describe("translateCodon", () => {
  it("translates ATG to M (methionine)", () => {
    expect(translateCodon("ATG")).toBe("M");
  });

  it("translates stop codons", () => {
    expect(translateCodon("TAA")).toBe("*");
    expect(translateCodon("TAG")).toBe("*");
    expect(translateCodon("TGA")).toBe("*");
  });

  it("is case-insensitive", () => {
    expect(translateCodon("atg")).toBe("M");
    expect(translateCodon("Atg")).toBe("M");
  });

  it("handles RNA (U instead of T)", () => {
    expect(translateCodon("AUG")).toBe("M");
    expect(translateCodon("UUU")).toBe("F");
  });

  it("returns ? for invalid codons", () => {
    expect(translateCodon("XYZ")).toBe("?");
    expect(translateCodon("AT")).toBe("?");
    expect(translateCodon("")).toBe("?");
  });

  it("translates all standard amino acids", () => {
    // Spot-check several amino acids
    expect(translateCodon("TTT")).toBe("F");
    expect(translateCodon("TTA")).toBe("L");
    expect(translateCodon("ATT")).toBe("I");
    expect(translateCodon("GTT")).toBe("V");
    expect(translateCodon("TCT")).toBe("S");
    expect(translateCodon("CCT")).toBe("P");
    expect(translateCodon("ACT")).toBe("T");
    expect(translateCodon("GCT")).toBe("A");
    expect(translateCodon("TAT")).toBe("Y");
    expect(translateCodon("CAT")).toBe("H");
    expect(translateCodon("CAA")).toBe("Q");
    expect(translateCodon("AAT")).toBe("N");
    expect(translateCodon("AAA")).toBe("K");
    expect(translateCodon("GAT")).toBe("D");
    expect(translateCodon("GAA")).toBe("E");
    expect(translateCodon("TGT")).toBe("C");
    expect(translateCodon("TGG")).toBe("W");
    expect(translateCodon("CGT")).toBe("R");
    expect(translateCodon("GGT")).toBe("G");
  });
});

describe("translateSequence", () => {
  it("translates a simple ORF", () => {
    expect(translateSequence("ATGTTTAAA")).toBe("MFK");
  });

  it("ignores trailing incomplete codon", () => {
    expect(translateSequence("ATGTTTAA")).toBe("MF");
  });

  it("handles empty string", () => {
    expect(translateSequence("")).toBe("");
  });

  it("strips gaps before translation", () => {
    expect(translateSequence("A-T-G-T-T-T")).toBe("MF");
  });

  it("handles RNA sequences", () => {
    expect(translateSequence("AUGUUUAAA")).toBe("MFK");
  });
});

describe("isStopCodon", () => {
  it("recognizes stop", () => {
    expect(isStopCodon("*")).toBe(true);
  });

  it("rejects non-stop", () => {
    expect(isStopCodon("M")).toBe(false);
    expect(isStopCodon("")).toBe(false);
  });
});
