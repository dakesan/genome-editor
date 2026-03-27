// Type definitions for Alignment Mode.

export type AppMode = "editor" | "alignment";

export type VariantType = "match" | "substitution" | "insertion" | "deletion" | "gap";

export interface AlignmentVariant {
  /** Position in the aligned (gapped) coordinate system. */
  alignmentPos: number;
  /** Ungapped reference position (-1 for insertions). */
  refPos: number;
  /** Ungapped query position (-1 for deletions). */
  queryPos: number;
  type: VariantType;
  refBase: string;
  queryBase: string;
}

export interface QueryMapping {
  queryName: string;
  /** 0-based ungapped ref start. */
  refStart: number;
  /** 0-based ungapped ref end (exclusive). */
  refEnd: number;
  /** Sequence identity percentage. */
  identity: number;
  variants: AlignmentVariant[];
}

export interface AminoAcidEffect {
  orfIndex: number;
  codonPos: number;
  refCodon: string;
  queryCodon: string;
  refAa: string;
  queryAa: string;
  effectType: "synonymous" | "missense" | "nonsense";
}

/** A single aligned sequence from MSA output. */
export interface AlignedSequence {
  name: string;
  sequence: string;
}
