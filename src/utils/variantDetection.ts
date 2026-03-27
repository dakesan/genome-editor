// Variant detection summary utilities for alignment analysis.

import type { AlignmentVariant, VariantType } from "../types/alignment";

export interface VariantSummary {
  total: number;
  matches: number;
  substitutions: number;
  insertions: number;
  deletions: number;
  gaps: number;
}

/** Summarize variant counts from a list of variants. */
export function summarizeVariants(variants: AlignmentVariant[]): VariantSummary {
  const summary: VariantSummary = {
    total: variants.length,
    matches: 0,
    substitutions: 0,
    insertions: 0,
    deletions: 0,
    gaps: 0,
  };

  for (const v of variants) {
    switch (v.type) {
      case "match":
        summary.matches++;
        break;
      case "substitution":
        summary.substitutions++;
        break;
      case "insertion":
        summary.insertions++;
        break;
      case "deletion":
        summary.deletions++;
        break;
      case "gap":
        summary.gaps++;
        break;
    }
  }

  return summary;
}

/** Filter variants by type(s). */
export function filterVariants(
  variants: AlignmentVariant[],
  types: VariantType[],
): AlignmentVariant[] {
  const typeSet = new Set(types);
  return variants.filter((v) => typeSet.has(v.type));
}

/** Get non-match variants (substitutions, insertions, deletions). */
export function getMismatchVariants(variants: AlignmentVariant[]): AlignmentVariant[] {
  return variants.filter(
    (v) => v.type === "substitution" || v.type === "insertion" || v.type === "deletion",
  );
}

/**
 * Build a consensus string from multiple aligned sequences.
 * Returns the most common non-gap character at each position,
 * with special symbols for conservation level.
 */
export function buildConsensusFromVariants(sequences: string[]): string {
  if (sequences.length === 0) return "";
  const len = sequences[0].length;
  let consensus = "";

  for (let i = 0; i < len; i++) {
    const counts = new Map<string, number>();
    let nonGap = 0;

    for (const seq of sequences) {
      const c = (seq[i] ?? "-").toUpperCase();
      if (c !== "-") {
        counts.set(c, (counts.get(c) ?? 0) + 1);
        nonGap++;
      }
    }

    if (nonGap === 0) {
      consensus += " ";
      continue;
    }

    const max = Math.max(...counts.values());
    if (max === sequences.length) {
      consensus += "*"; // fully conserved
    } else if (max / sequences.length >= 0.6) {
      consensus += ":"; // mostly conserved
    } else if (max / sequences.length >= 0.3) {
      consensus += "."; // weakly conserved
    } else {
      consensus += " ";
    }
  }

  return consensus;
}
