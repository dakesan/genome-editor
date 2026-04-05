// Horizontal-scroll MSA detail viewer with variant coloring.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
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
  /** Called when the visible viewport changes: (startFraction, endFraction) in [0,1]. */
  onViewportChange?: (start: number, end: number) => void;
}

export const AlignmentDetail = forwardRef<AlignmentDetailHandle, AlignmentDetailProps>(
  function AlignmentDetail({ sequences, analysis, onViewportChange }, ref) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollContentRef = useRef<HTMLDivElement>(null);
    const residueRef = useRef<HTMLSpanElement>(null);
    const alnLen = sequences[0]?.sequence.length ?? 0;
    const maxNameLen = useMemo(
      () => Math.max(...sequences.map((s) => s.name.length), 9),
      [sequences],
    );

    /**
     * Measure the residue area using the reference row's residue span.
     * Returns the left offset (nameWidth) and total pixel width of the residue region.
     */
    const measureResidueArea = useCallback(() => {
      const content = scrollContentRef.current;
      const residue = residueRef.current;
      if (!content || !residue) return null;
      const contentRect = content.getBoundingClientRect();
      const residueRect = residue.getBoundingClientRect();
      // Both rects shift equally with scroll, so the difference is the stable name-column offset.
      const nameWidth = residueRect.left - contentRect.left;
      // getBoundingClientRect().width works reliably for inline elements with nowrap.
      const residueWidth = residueRect.width;
      return { nameWidth, residueWidth };
    }, []);

    const scrollToAlignedPos = useCallback(
      (pos: number) => {
        const container = scrollContainerRef.current;
        if (!container || alnLen === 0) return;
        const m = measureResidueArea();
        if (!m) return;
        // Target: the fraction of the residue area for this position.
        const fraction = pos / alnLen;
        const targetX = m.nameWidth + fraction * m.residueWidth;
        const targetScroll = targetX - container.clientWidth / 2;
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
      },
      [alnLen, measureResidueArea],
    );

    useImperativeHandle(ref, () => ({ scrollToAlignedPos }), [scrollToAlignedPos]);

    // Report viewport fraction on scroll — fraction of *residue area* only.
    const reportViewport = useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container || !onViewportChange) return;
      const m = measureResidueArea();
      if (!m || m.residueWidth === 0) return;
      // How much of the residue area is visible?
      const visibleLeft = container.scrollLeft - m.nameWidth;
      const visibleRight = visibleLeft + container.clientWidth;
      const start = Math.max(0, visibleLeft / m.residueWidth);
      const end = Math.min(1, visibleRight / m.residueWidth);
      onViewportChange(start, end);
    }, [onViewportChange, measureResidueArea]);

    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container || !onViewportChange) return;
      container.addEventListener("scroll", reportViewport, { passive: true });
      // Report initial viewport.
      reportViewport();
      const ro = new ResizeObserver(reportViewport);
      ro.observe(container);
      return () => {
        container.removeEventListener("scroll", reportViewport);
        ro.disconnect();
      };
    }, [reportViewport, onViewportChange]);

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
          <div className="alignment-detail-scroll" ref={scrollContentRef}>
            {/* Ruler row */}
            <div className="alignment-detail-row alignment-ruler-row">
              <span className="alignment-row-name" style={{ minWidth: `${maxNameLen + 1}ch` }} />
              <span className="alignment-row-residues alignment-ruler-text">{ruler}</span>
            </div>

            {/* Reference row — residueRef measures the actual residue area width */}
            <div className="alignment-detail-row alignment-ref-row">
              <span
                className="alignment-row-name"
                style={{ minWidth: `${maxNameLen + 1}ch` }}
                title={sequences[0]?.name}
              >
                {sequences[0]?.name}
              </span>
              <span ref={residueRef} className="alignment-row-residues">
                <ReferenceResidueRow sequence={sequences[0]?.sequence ?? ""} />
              </span>
            </div>

            {/* Reference AA translation row */}
            {analysis.refTranslation && (
              <div className="alignment-detail-row alignment-translation-row">
                <span
                  className="alignment-row-name alignment-translation-label"
                  style={{ minWidth: `${maxNameLen + 1}ch` }}
                >
                  AA
                </span>
                <span className="alignment-row-residues">
                  <TranslationResidueRow translation={analysis.refTranslation} />
                </span>
              </div>
            )}

            {/* Query rows + AA translation rows + AA effect rows */}
            {sequences.slice(1).map((seq, qi) => {
              const effects = analysis.aaEffects?.[qi] ?? [];
              const qTranslation = analysis.queryTranslations?.[qi] ?? null;
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
                  {qTranslation && (
                    <div className="alignment-detail-row alignment-translation-row">
                      <span
                        className="alignment-row-name alignment-translation-label"
                        style={{ minWidth: `${maxNameLen + 1}ch` }}
                      >
                        AA
                      </span>
                      <span className="alignment-row-residues">
                        <TranslationResidueRow translation={qTranslation} />
                      </span>
                    </div>
                  )}
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

/** Background color by amino acid physicochemical group (ClustalX-inspired). */
function aaColor(aa: string): string {
  switch (aa) {
    case "A":
    case "V":
    case "L":
    case "I":
    case "M":
    case "P":
      return "#d97706"; // nonpolar aliphatic — amber
    case "F":
    case "Y":
    case "W":
      return "#7c3aed"; // aromatic — violet
    case "S":
    case "T":
    case "N":
    case "Q":
      return "#059669"; // polar uncharged — green
    case "R":
    case "K":
    case "H":
      return "#2563eb"; // positive — blue
    case "D":
    case "E":
      return "#dc2626"; // negative — red
    case "C":
      return "#ca8a04"; // cysteine — yellow
    case "G":
      return "#6b7280"; // glycine — gray
    case "*":
      return "#7f1d1d"; // stop codon — dark red
    default:
      return "#4b5563"; // unknown — dark gray
  }
}

/**
 * Render a sparse AA translation row.
 * Each AA letter spans 3ch (one codon width), colored by amino acid type.
 */
function TranslationResidueRow({ translation }: { translation: string }) {
  const elements: React.ReactElement[] = [];

  // The sparse string has AA chars only at codon-start positions; +1 and +2 are always " ".
  let i = 0;
  while (i < translation.length) {
    const c = translation[i];

    if (c === " ") {
      elements.push(
        <span
          key={i}
          className="msa-residue"
          style={{ backgroundColor: "transparent", color: "transparent" }}
        >
          {" "}
        </span>,
      );
      i++;
      continue;
    }

    // Render as a 3ch-wide codon block colored by AA type.
    elements.push(
      <span
        key={i}
        className="msa-residue"
        style={{ backgroundColor: aaColor(c), color: "#fff", width: "3ch" }}
        title={c}
      >
        {c}
      </span>,
    );
    i += 3; // skip the 2 trailing space positions of this codon
  }

  return <>{elements}</>;
}

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
