// Hook to compute alignment analysis: mappings, variants, consensus, AA effects.

import { useMemo } from "react";
import type { AlignedSequence, AminoAcidEffect, QueryMapping } from "../types/alignment";
import type { WasmOrf } from "../types/wasm";
import { buildAllQueryMappings } from "../utils/alignmentMapping";
import { computeAminoAcidEffects, reconstructUngappedQuery } from "../utils/aminoAcidEffects";
import { translateCodon } from "../utils/codonTable";
import { buildConsensusFromVariants } from "../utils/variantDetection";

export interface AlignmentAnalysis {
  alignedToRefMap: number[];
  refToAlignedMap: number[];
  mappings: QueryMapping[];
  consensus: string;
  /** Per-query amino acid effects (same order as mappings). */
  aaEffects: AminoAcidEffect[][];
  /**
   * Sparse AA translation string for the reference (length = alnLen).
   * Each position is either an AA letter (at codon start positions) or " ".
   * Null when no forward-strand ORFs overlap the alignment reference.
   */
  refTranslation: string | null;
  /** Per-query sparse AA translation strings, parallel to mappings. */
  queryTranslations: (string | null)[];
}

export function useAlignmentAnalysis(
  alignmentResult: AlignedSequence[] | null,
  orfs?: WasmOrf[],
): AlignmentAnalysis | null {
  return useMemo(() => {
    if (!alignmentResult || alignmentResult.length < 2) return null;

    const { alignedToRefMap, refToAlignedMap, mappings } = buildAllQueryMappings(alignmentResult);

    const consensus = buildConsensusFromVariants(alignmentResult.map((s) => s.sequence));

    const refUngapped = alignmentResult[0].sequence.replace(/-/g, "");

    // Compute amino acid effects for each query mapping.
    const aaEffects = mappings.map((mapping) => {
      if (!orfs || orfs.length === 0) return [];
      const queryUngapped = reconstructUngappedQuery(mapping.variants);
      return computeAminoAcidEffects(refUngapped, queryUngapped, mapping.variants, orfs);
    });

    // Build AA translation rows for forward-strand ORFs only.
    const alnLen = alignmentResult[0].sequence.length;
    let refTranslation: string | null = null;
    const queryTranslations: (string | null)[] = new Array(mappings.length).fill(null);

    if (orfs && orfs.length > 0) {
      const fwdOrfs = orfs.filter((o) => o.strand === "forward");

      if (fwdOrfs.length > 0) {
        // Reference translation — place one AA char at each codon's aligned start position.
        const refArr = new Array<string>(alnLen).fill(" ");
        let hasAny = false;

        for (const orf of fwdOrfs) {
          for (let pos = orf.start; pos + 2 < orf.end; pos += 3) {
            const alnPos = refToAlignedMap[pos];
            if (alnPos === undefined || alnPos >= alnLen) continue;
            const codon = refUngapped.slice(pos, pos + 3).toUpperCase();
            if (codon.length !== 3) continue;
            refArr[alnPos] = translateCodon(codon);
            hasAny = true;
          }
        }

        if (hasAny) {
          refTranslation = refArr.join("");

          // Per-query translations.
          for (let qi = 0; qi < mappings.length; qi++) {
            const mapping = mappings[qi];
            const queryUngapped = reconstructUngappedQuery(mapping.variants);

            // Build ref-position → query-position map.
            const r2q = new Map<number, number>();
            for (const v of mapping.variants) {
              if (v.refPos >= 0 && v.queryPos >= 0) {
                r2q.set(v.refPos, v.queryPos);
              }
            }

            const qArr = new Array<string>(alnLen).fill(" ");
            for (const orf of fwdOrfs) {
              for (let pos = orf.start; pos + 2 < orf.end; pos += 3) {
                const alnPos = refToAlignedMap[pos];
                if (alnPos === undefined || alnPos >= alnLen) continue;

                let codon = "";
                let valid = true;
                for (let p = pos; p < pos + 3; p++) {
                  const qp = r2q.get(p);
                  if (qp === undefined || qp >= queryUngapped.length) {
                    valid = false;
                    break;
                  }
                  codon += queryUngapped[qp];
                }

                qArr[alnPos] = valid ? translateCodon(codon.toUpperCase()) : "?";
              }
            }

            queryTranslations[qi] = qArr.join("");
          }
        }
      }
    }

    return {
      alignedToRefMap,
      refToAlignedMap,
      mappings,
      consensus,
      aaEffects,
      refTranslation,
      queryTranslations,
    };
  }, [alignmentResult, orfs]);
}
