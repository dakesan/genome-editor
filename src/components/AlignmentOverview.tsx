// Overview of reference sequence with query mapping bars — labels rendered directly on bars.

import { useCallback, useMemo } from "react";
import type { AlignmentAnalysis } from "../hooks/useAlignmentAnalysis";
import type { AlignedSequence } from "../types/alignment";
import type { SequenceAnnotation } from "../types/sequence";
import type { WasmOrf } from "../types/wasm";
import { summarizeVariants } from "../utils/variantDetection";

const QUERY_COLORS = [
  "var(--color-primary)",
  "#e8a838",
  "#7c3aed",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

const ORF_COLORS = ["#4299e1", "#48bb78", "#ed8936", "#9f7aea", "#f56565"];

// Default annotation colors when the annotation has no explicit color.
const ANNOTATION_FALLBACK_COLORS = [
  "#8FBC8F",
  "#CD853F",
  "#6495ED",
  "#DB7093",
  "#9ACD32",
  "#DDA0DD",
  "#F4A460",
  "#87CEEB",
];

interface AlignmentOverviewProps {
  sequences: AlignedSequence[];
  analysis: AlignmentAnalysis;
  annotations?: SequenceAnnotation[];
  orfs?: WasmOrf[];
  viewport?: { start: number; end: number };
  onPositionClick?: (alignedPos: number) => void;
}

export function AlignmentOverview({
  sequences,
  analysis,
  annotations,
  orfs,
  viewport,
  onPositionClick,
}: AlignmentOverviewProps) {
  const refLen = analysis.refToAlignedMap.length;
  const alnLen = sequences[0]?.sequence.length ?? 0;

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onPositionClick || refLen === 0) return;
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      const refPos = Math.min(Math.round(fraction * refLen), refLen - 1);
      const alignedPos = analysis.refToAlignedMap[refPos] ?? 0;
      onPositionClick(alignedPos);
    },
    [onPositionClick, refLen, analysis.refToAlignedMap],
  );

  const querySummaries = useMemo(() => {
    return analysis.mappings.map((mapping) => {
      const summary = summarizeVariants(mapping.variants);
      return {
        identity: mapping.identity,
        mismatches: summary.substitutions,
        insertions: summary.insertions,
        deletions: summary.deletions,
      };
    });
  }, [analysis.mappings]);

  // Determine how many annotation rows we need (simple overlap stacking).
  const annotationRows = useMemo(() => {
    if (!annotations || annotations.length === 0) return [];
    // Sort by start position.
    const sorted = [...annotations].sort((a, b) => a.start - b.start);
    const rows: SequenceAnnotation[][] = [];
    for (const ann of sorted) {
      let placed = false;
      for (const row of rows) {
        const last = row[row.length - 1];
        if (last.end <= ann.start) {
          row.push(ann);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push([ann]);
      }
    }
    return rows;
  }, [annotations]);

  const hasAnnotations = annotationRows.length > 0;
  const hasOrfs = orfs && orfs.length > 0;

  return (
    <div className="alignment-overview">
      {/* Reference track */}
      <div className="ov-section-label">Reference</div>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: click-to-scroll shortcut */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: click-to-scroll shortcut */}
      <div
        className={`ov-track ov-ref-track ${hasAnnotations || hasOrfs ? "ov-ref-track-tall" : ""}`}
        onClick={handleBarClick}
      >
        {/* Base bar with name label */}
        <div className="ov-ref-bar">
          <span className="ov-bar-label">
            {sequences[0]?.name ?? "Reference"} ({refLen} bp, {alnLen} aligned pos)
          </span>
        </div>

        {/* GenBank annotations — stacked rows */}
        {annotationRows.map((row, rowIdx) =>
          row.map((ann, annIdx) => {
            if (refLen === 0) return null;
            const leftPct = (ann.start / refLen) * 100;
            const widthPct = ((ann.end - ann.start) / refLen) * 100;
            const color =
              ann.color ||
              ANNOTATION_FALLBACK_COLORS[(rowIdx * 3 + annIdx) % ANNOTATION_FALLBACK_COLORS.length];
            const topPx = 22 + rowIdx * 18;
            return (
              <div
                key={`ann-${ann.name}-${ann.start}`}
                className="ov-annotation"
                style={{
                  left: `${leftPct}%`,
                  width: `${Math.max(widthPct, 0.3)}%`,
                  top: `${topPx}px`,
                  backgroundColor: color,
                }}
                title={`${ann.name}${ann.type ? ` (${ann.type})` : ""}: ${ann.start}..${ann.end}${ann.direction === -1 ? " (reverse)" : ""}`}
              >
                <span className="ov-annotation-label">{ann.name}</span>
              </div>
            );
          }),
        )}

        {/* ORF annotations — below GenBank annotations */}
        {orfs?.map((orf, i) => {
          if (refLen === 0) return null;
          const leftPct = (orf.start / refLen) * 100;
          const widthPct = ((orf.end - orf.start) / refLen) * 100;
          const topPx = 22 + annotationRows.length * 18 + (hasAnnotations ? 2 : 0);
          return (
            <div
              key={`orf-${orf.start}-${orf.end}`}
              className="ov-annotation ov-annotation-orf"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                top: `${topPx}px`,
                backgroundColor: ORF_COLORS[i % ORF_COLORS.length],
              }}
              title={`ORF ${i + 1}: ${orf.start}..${orf.end} (${orf.strand}, ${orf.length_aa} aa)`}
            >
              <span className="ov-annotation-label">
                ORF {i + 1} ({orf.length_aa} aa)
              </span>
            </div>
          );
        })}

        {/* Viewport indicator */}
        {viewport && (
          <div
            className="ov-viewport"
            style={{
              left: `${viewport.start * 100}%`,
              width: `${Math.max((viewport.end - viewport.start) * 100, 0.5)}%`,
            }}
          />
        )}
      </div>

      {/* Query tracks */}
      {analysis.mappings.length > 0 && <div className="ov-section-label">Queries</div>}
      {analysis.mappings.map((mapping, i) => {
        const color = QUERY_COLORS[i % QUERY_COLORS.length];
        const leftPct = refLen > 0 ? (mapping.refStart / refLen) * 100 : 0;
        const widthPct = refLen > 0 ? ((mapping.refEnd - mapping.refStart) / refLen) * 100 : 100;
        const summary = querySummaries[i];

        const variantParts: string[] = [];
        if (summary.mismatches > 0) variantParts.push(`${summary.mismatches} sub`);
        if (summary.insertions > 0) variantParts.push(`${summary.insertions} ins`);
        if (summary.deletions > 0) variantParts.push(`${summary.deletions} del`);
        const variantText = variantParts.length > 0 ? ` | ${variantParts.join(", ")}` : "";

        return (
          <div key={mapping.queryName} className="ov-track ov-query-track">
            <div className="ov-query-bg" />
            <div
              className="ov-query-bar"
              style={{
                left: `${leftPct}%`,
                width: `${Math.max(widthPct, 1)}%`,
                backgroundColor: color,
              }}
              title={`${mapping.queryName}: ${mapping.identity.toFixed(1)}% identity (${mapping.refStart}..${mapping.refEnd})${variantText}`}
            >
              <span className="ov-bar-label">
                {mapping.queryName} — {mapping.identity.toFixed(1)}%{variantText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
