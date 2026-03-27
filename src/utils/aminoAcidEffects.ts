// Determine amino acid effects of variants within ORF regions.

import type { AlignmentVariant, AminoAcidEffect } from "../types/alignment";
import type { WasmOrf } from "../types/wasm";
import { translateCodon } from "./codonTable";

/**
 * Compute amino acid effects for variants that fall within ORF regions.
 *
 * For each ORF, extracts codons from the ungapped reference and query sequences,
 * compares translations, and classifies the effect.
 *
 * @param refSeq - Ungapped reference sequence
 * @param queryUngapped - Ungapped query sequence (reconstructed from alignment)
 * @param variants - Variants for this query (used to map ref→query positions)
 * @param orfs - ORF regions detected on the reference
 */
export function computeAminoAcidEffects(
  refSeq: string,
  queryUngapped: string,
  variants: AlignmentVariant[],
  orfs: WasmOrf[],
): AminoAcidEffect[] {
  const effects: AminoAcidEffect[] = [];

  // Build a refPos → queryPos mapping from the variants.
  const refToQueryMap = new Map<number, number>();
  for (const v of variants) {
    if (v.refPos >= 0 && v.queryPos >= 0) {
      refToQueryMap.set(v.refPos, v.queryPos);
    }
  }

  // Collect refPos values that have substitutions.
  const substitutionRefPositions = new Set<number>();
  for (const v of variants) {
    if (v.type === "substitution" && v.refPos >= 0) {
      substitutionRefPositions.add(v.refPos);
    }
  }

  for (let orfIdx = 0; orfIdx < orfs.length; orfIdx++) {
    const orf = orfs[orfIdx];
    const orfStart = orf.start;
    const orfEnd = orf.end;

    // Process each codon in the ORF.
    for (let pos = orfStart; pos + 2 < orfEnd; pos += 3) {
      const codonStart = pos;
      const codonEnd = pos + 3;

      // Check if any position in this codon has a substitution.
      let hasSubstitution = false;
      for (let p = codonStart; p < codonEnd; p++) {
        if (substitutionRefPositions.has(p)) {
          hasSubstitution = true;
          break;
        }
      }

      if (!hasSubstitution) continue;

      // Extract ref codon.
      const refCodon = refSeq.slice(codonStart, codonEnd).toUpperCase();
      if (refCodon.length !== 3) continue;

      // Extract query codon by mapping each ref position.
      let queryCodon = "";
      let valid = true;
      for (let p = codonStart; p < codonEnd; p++) {
        const qp = refToQueryMap.get(p);
        if (qp === undefined || qp < 0 || qp >= queryUngapped.length) {
          valid = false;
          break;
        }
        queryCodon += queryUngapped[qp];
      }

      if (!valid || queryCodon.length !== 3) continue;

      queryCodon = queryCodon.toUpperCase();

      const refAa = translateCodon(refCodon);
      const queryAa = translateCodon(queryCodon);

      if (refAa === queryAa) {
        effects.push({
          orfIndex: orfIdx,
          codonPos: Math.floor((pos - orfStart) / 3),
          refCodon,
          queryCodon,
          refAa,
          queryAa,
          effectType: "synonymous",
        });
      } else if (queryAa === "*") {
        effects.push({
          orfIndex: orfIdx,
          codonPos: Math.floor((pos - orfStart) / 3),
          refCodon,
          queryCodon,
          refAa,
          queryAa,
          effectType: "nonsense",
        });
      } else {
        effects.push({
          orfIndex: orfIdx,
          codonPos: Math.floor((pos - orfStart) / 3),
          refCodon,
          queryCodon,
          refAa,
          queryAa,
          effectType: "missense",
        });
      }
    }
  }

  return effects;
}

/**
 * Reconstruct the ungapped query sequence from alignment variants.
 */
export function reconstructUngappedQuery(variants: AlignmentVariant[]): string {
  let seq = "";
  for (const v of variants) {
    if (v.queryPos >= 0 && v.queryBase !== "-") {
      seq += v.queryBase;
    }
  }
  return seq;
}
