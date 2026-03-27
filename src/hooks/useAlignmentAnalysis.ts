// Hook to compute alignment analysis: mappings, variants, consensus, AA effects.

import { useMemo } from "react";
import type { AlignedSequence, AminoAcidEffect, QueryMapping } from "../types/alignment";
import type { WasmOrf } from "../types/wasm";
import { buildAllQueryMappings } from "../utils/alignmentMapping";
import { computeAminoAcidEffects, reconstructUngappedQuery } from "../utils/aminoAcidEffects";
import { buildConsensusFromVariants } from "../utils/variantDetection";

export interface AlignmentAnalysis {
  alignedToRefMap: number[];
  refToAlignedMap: number[];
  mappings: QueryMapping[];
  consensus: string;
  /** Per-query amino acid effects (same order as mappings). */
  aaEffects: AminoAcidEffect[][];
}

export function useAlignmentAnalysis(
  alignmentResult: AlignedSequence[] | null,
  orfs?: WasmOrf[],
): AlignmentAnalysis | null {
  return useMemo(() => {
    if (!alignmentResult || alignmentResult.length < 2) return null;

    const { alignedToRefMap, refToAlignedMap, mappings } = buildAllQueryMappings(alignmentResult);

    const consensus = buildConsensusFromVariants(alignmentResult.map((s) => s.sequence));

    // Compute amino acid effects for each query mapping.
    const refUngapped = alignmentResult[0].sequence.replace(/-/g, "");
    const aaEffects = mappings.map((mapping) => {
      if (!orfs || orfs.length === 0) return [];
      const queryUngapped = reconstructUngappedQuery(mapping.variants);
      return computeAminoAcidEffects(refUngapped, queryUngapped, mapping.variants, orfs);
    });

    return {
      alignedToRefMap,
      refToAlignedMap,
      mappings,
      consensus,
      aaEffects,
    };
  }, [alignmentResult, orfs]);
}
