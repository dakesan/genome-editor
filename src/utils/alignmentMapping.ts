// Mapping utilities: aligned position ↔ ungapped ref position,
// and QueryMapping generation from aligned sequences.

import type {
  AlignedSequence,
  AlignmentVariant,
  QueryMapping,
  VariantType,
} from "../types/alignment";

/**
 * Build an array that maps each aligned (gapped) position to the ungapped
 * reference position. Gaps in the reference get -1.
 */
export function buildAlignedToRefMap(alignedRef: string): number[] {
  const map: number[] = [];
  let refPos = 0;
  for (let i = 0; i < alignedRef.length; i++) {
    if (alignedRef[i] === "-") {
      map.push(-1);
    } else {
      map.push(refPos);
      refPos++;
    }
  }
  return map;
}

/**
 * Build an array that maps each ungapped reference position to the aligned position.
 */
export function buildRefToAlignedMap(alignedRef: string): number[] {
  const map: number[] = [];
  for (let i = 0; i < alignedRef.length; i++) {
    if (alignedRef[i] !== "-") {
      map.push(i);
    }
  }
  return map;
}

/**
 * Classify the variant type for a single aligned column.
 */
function classifyVariant(refBase: string, queryBase: string): VariantType {
  if (refBase === "-" && queryBase === "-") return "gap";
  if (refBase === "-") return "insertion";
  if (queryBase === "-") return "deletion";
  if (refBase.toUpperCase() === queryBase.toUpperCase()) return "match";
  return "substitution";
}

/**
 * Detect variants between an aligned reference and query.
 */
export function detectVariants(
  alignedRef: string,
  alignedQuery: string,
  alignedToRefMap: number[],
): AlignmentVariant[] {
  const variants: AlignmentVariant[] = [];
  let queryPos = 0;

  for (let i = 0; i < alignedRef.length; i++) {
    const refBase = alignedRef[i];
    const queryBase = alignedQuery[i];
    const type = classifyVariant(refBase, queryBase);
    const refP = alignedToRefMap[i];
    const qP = queryBase === "-" ? -1 : queryPos;

    variants.push({
      alignmentPos: i,
      refPos: refP,
      queryPos: qP,
      type,
      refBase,
      queryBase,
    });

    if (queryBase !== "-") {
      queryPos++;
    }
  }

  return variants;
}

/**
 * Generate a QueryMapping from a pair of aligned sequences.
 * The first sequence in the MSA result is treated as the reference.
 */
export function buildQueryMapping(
  alignedRef: string,
  alignedQuery: string,
  queryName: string,
  alignedToRefMap: number[],
): QueryMapping {
  const variants = detectVariants(alignedRef, alignedQuery, alignedToRefMap);

  // Determine mapped region in ungapped ref coordinates.
  let refStart = -1;
  let refEnd = -1;
  let matchCount = 0;
  let alignedCount = 0;

  for (const v of variants) {
    if (v.type === "gap") continue;

    // Track the ref range that the query maps to.
    if (v.refPos >= 0) {
      if (refStart < 0) refStart = v.refPos;
      refEnd = v.refPos + 1;
    }

    // Count matches for identity calculation.
    alignedCount++;
    if (v.type === "match") matchCount++;
  }

  if (refStart < 0) refStart = 0;
  if (refEnd < 0) refEnd = 0;

  const identity = alignedCount > 0 ? (matchCount / alignedCount) * 100 : 0;

  return {
    queryName,
    refStart,
    refEnd,
    identity,
    variants,
  };
}

/**
 * Generate QueryMappings for all query sequences in an MSA result.
 * sequences[0] is treated as the reference.
 */
export function buildAllQueryMappings(sequences: AlignedSequence[]): {
  alignedToRefMap: number[];
  refToAlignedMap: number[];
  mappings: QueryMapping[];
} {
  if (sequences.length < 2) {
    return { alignedToRefMap: [], refToAlignedMap: [], mappings: [] };
  }

  const alignedRef = sequences[0].sequence;
  const alignedToRefMap = buildAlignedToRefMap(alignedRef);
  const refToAlignedMap = buildRefToAlignedMap(alignedRef);

  const mappings = sequences
    .slice(1)
    .map((seq) => buildQueryMapping(alignedRef, seq.sequence, seq.name, alignedToRefMap));

  return { alignedToRefMap, refToAlignedMap, mappings };
}
