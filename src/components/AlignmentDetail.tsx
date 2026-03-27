// Horizontal-scroll MSA detail viewer with variant coloring.

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import type { AlignmentAnalysis } from "../hooks/useAlignmentAnalysis";
import type {
  AlignedSequence,
  AlignmentVariant,
  AminoAcidEffect,
  VariantType,
} from "../types/alignment";

/** Background color for a residue based on variant type. */
function variantColor(type: VariantType): string | undefined {
  switch (type) {
    case "match":
      return undefined; // Use base color
    case "substitution":
      return "var(--alignment-color-substitution)";
    case "insertion":
      return "var(--alignment-color-insertion)";
    case "deletion":
      return "var(--alignment-color-deletion)";
    case "gap":
      return "var(--msa-color-gap)";
    default:
      return undefined;
  }
}

/** Background color for nucleotide bases (match coloring). */
function baseColor(c: string): string | undefined {
  switch (c.toUpperCase()) {
    case "A":
      return "var(--msa-color-a)";
    case "T":
    case "U":
      return "var(--msa-color-t)";
    case "G":
      return "var(--msa-color-g)";
    case "C":
      return "var(--msa-color-c)";
    case "-":
      return "var(--msa-color-gap)";
    default:
      return undefined;
  }
}

export interface AlignmentDetailHandle {
  scrollToAlignedPos: (pos: number) => void;
}

interface AlignmentDetailProps {
  sequences: AlignedSequence[];
  analysis: AlignmentAnalysis;
}

export const AlignmentDetail = forwardRef<AlignmentDetailHandle, AlignmentDetailProps>(
  function AlignmentDetail({ sequences, analysis }, ref) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const alnLen = sequences[0]?.sequence.length ?? 0;
    const maxNameLen = useMemo(
      () => Math.max(...sequences.map((s) => s.name.length), 9),
      [sequences],
    );

    const scrollToAlignedPos = useCallback((pos: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      // Each character is approximately 1ch wide; estimate pixel width.
      const charWidth = 7.2;
      const targetScroll = pos * charWidth - container.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
    }, []);

    useImperativeHandle(ref, () => ({ scrollToAlignedPos }), [scrollToAlignedPos]);

    // Position ruler
    const ruler = useMemo(() => {
      let r = "";
      for (let i = 1; i <= alnLen; i++) {
        if (i % 10 === 0) {
          const label = String(i);
          const padding = label.length - 1;
          if (padding <= i - 1 - (r.length - (i - 1 - padding > r.length ? r.length : 0))) {
            r += label;
            while (r.length < i) r += " ";
          } else {
            r += " ";
          }
        } else if (r.length < i) {
          r += " ";
        }
      }
      return r;
    }, [alnLen]);

    // Build variant lookup maps for each query
    const queryVariantMaps = useMemo(() => {
      return analysis.mappings.map((mapping) => {
        const map = new Map<number, AlignmentVariant>();
        for (const v of mapping.variants) {
          map.set(v.alignmentPos, v);
        }
        return map;
      });
    }, [analysis.mappings]);

    return (
      <div className="alignment-detail">
        <div className="alignment-detail-container" ref={scrollContainerRef}>
          <div className="alignment-detail-scroll">
            {/* Ruler row */}
            <div className="alignment-detail-row alignment-ruler-row">
              <span className="alignment-row-name" style={{ minWidth: `${maxNameLen + 1}ch` }} />
              <span className="alignment-row-residues alignment-ruler-text">{ruler}</span>
            </div>

            {/* Reference row */}
            <div className="alignment-detail-row alignment-ref-row">
              <span
                className="alignment-row-name"
                style={{ minWidth: `${maxNameLen + 1}ch` }}
                title={sequences[0]?.name}
              >
                {sequences[0]?.name}
              </span>
              <span className="alignment-row-residues">
                <ReferenceResidueRow sequence={sequences[0]?.sequence ?? ""} />
              </span>
            </div>

            {/* Query rows + AA effect rows */}
            {sequences.slice(1).map((seq, qi) => {
              const effects = analysis.aaEffects?.[qi] ?? [];
              return (
                <div key={seq.name}>
                  <div className="alignment-detail-row alignment-query-row">
                    <span
                      className="alignment-row-name"
                      style={{ minWidth: `${maxNameLen + 1}ch` }}
                      title={seq.name}
                    >
                      {seq.name}
                    </span>
                    <span className="alignment-row-residues">
                      <QueryResidueRow sequence={seq.sequence} variantMap={queryVariantMaps[qi]} />
                    </span>
                  </div>
                  {effects.length > 0 && (
                    <div className="alignment-detail-row alignment-aa-row">
                      <span
                        className="alignment-row-name alignment-aa-label"
                        style={{ minWidth: `${maxNameLen + 1}ch` }}
                      >
                        AA effects
                      </span>
                      <span className="alignment-row-residues">
                        <AminoAcidEffectRow effects={effects} />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Consensus row */}
            <div className="alignment-detail-row alignment-consensus-row">
              <span className="alignment-row-name" style={{ minWidth: `${maxNameLen + 1}ch` }}>
                Consensus
              </span>
              <span className="alignment-row-residues alignment-consensus-text">
                {analysis.consensus}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

/** Render reference sequence with base coloring. */
function ReferenceResidueRow({ sequence }: { sequence: string }) {
  const elements: React.ReactElement[] = [];
  for (let i = 0; i < sequence.length; i++) {
    const c = sequence[i];
    elements.push(
      <span key={i} className="msa-residue" style={{ backgroundColor: baseColor(c) }}>
        {c}
      </span>,
    );
  }
  return <>{elements}</>;
}

/** Amino acid effect row: shows colored badges for codon effects. */
function AminoAcidEffectRow({ effects }: { effects: AminoAcidEffect[] }) {
  if (effects.length === 0) return null;

  const summary = effects.map((e) => {
    const colorClass =
      e.effectType === "synonymous"
        ? "aa-synonymous"
        : e.effectType === "missense"
          ? "aa-missense"
          : "aa-nonsense";
    return (
      <span
        key={`${e.orfIndex}-${e.codonPos}`}
        className={`aa-effect-badge ${colorClass}`}
        title={`${e.refAa}${e.codonPos + 1}${e.queryAa} (${e.effectType}): ${e.refCodon}\u2192${e.queryCodon}`}
      >
        {e.refAa}
        {e.codonPos + 1}
        {e.queryAa}
      </span>
    );
  });

  return <span className="aa-effect-summary">{summary}</span>;
}

/** Render query sequence with variant-based coloring. */
function QueryResidueRow({
  sequence,
  variantMap,
}: {
  sequence: string;
  variantMap: Map<number, AlignmentVariant> | undefined;
}) {
  const elements: React.ReactElement[] = [];
  for (let i = 0; i < sequence.length; i++) {
    const c = sequence[i];
    const variant = variantMap?.get(i);
    let bg: string | undefined;

    if (variant) {
      if (variant.type === "match") {
        bg = baseColor(c);
      } else {
        bg = variantColor(variant.type);
      }
    } else {
      bg = baseColor(c);
    }

    elements.push(
      <span
        key={i}
        className={`msa-residue ${variant?.type === "substitution" ? "variant-substitution" : ""}`}
        style={{ backgroundColor: bg }}
        title={
          variant && variant.type !== "match"
            ? `${variant.type}: ${variant.refBase}\u2192${variant.queryBase}`
            : undefined
        }
      >
        {c}
      </span>,
    );
  }
  return <>{elements}</>;
}
