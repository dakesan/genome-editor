// Overview of reference sequence with query mapping bars (div-based).

import { useCallback } from "react";
import type { AlignmentAnalysis } from "../hooks/useAlignmentAnalysis";
import type { AlignedSequence } from "../types/alignment";
import type { WasmOrf } from "../types/wasm";

// Colors for query mapping bars (cycle through).
const QUERY_COLORS = [
  "var(--color-primary)",
  "#e8a838",
  "#7c3aed",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

interface AlignmentOverviewProps {
  sequences: AlignedSequence[];
  analysis: AlignmentAnalysis;
  orfs?: WasmOrf[];
  onPositionClick?: (alignedPos: number) => void;
}

export function AlignmentOverview({
  sequences,
  analysis,
  orfs,
  onPositionClick,
}: AlignmentOverviewProps) {
  const refLen = analysis.refToAlignedMap.length; // ungapped ref length

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

  return (
    <div className="alignment-overview">
      {/* Reference bar */}
      <div className="alignment-overview-row">
        <span className="alignment-overview-label" title={sequences[0]?.name}>
          {sequences[0]?.name ?? "Reference"}
        </span>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: overview click-to-scroll is a visual shortcut, not primary navigation */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: click-to-scroll shortcut */}
        <div className="alignment-overview-bar alignment-overview-ref-bar" onClick={handleBarClick}>
          {/* ORF regions overlaid on ref bar */}
          {orfs?.map((orf, i) => {
            if (refLen === 0) return null;
            const leftPct = (orf.start / refLen) * 100;
            const widthPct = ((orf.end - orf.start) / refLen) * 100;
            const orfColors = ["#4299e1", "#48bb78", "#ed8936", "#9f7aea", "#f56565"];
            return (
              <div
                key={`orf-${orf.start}-${orf.end}`}
                className="alignment-overview-orf"
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: orfColors[i % orfColors.length],
                }}
                title={`ORF ${i + 1}: ${orf.start}..${orf.end} (${orf.strand})`}
              />
            );
          })}
        </div>
      </div>

      {/* Query mapping bars */}
      {analysis.mappings.map((mapping, i) => {
        const color = QUERY_COLORS[i % QUERY_COLORS.length];
        const leftPct = refLen > 0 ? (mapping.refStart / refLen) * 100 : 0;
        const widthPct = refLen > 0 ? ((mapping.refEnd - mapping.refStart) / refLen) * 100 : 100;

        return (
          <div key={mapping.queryName} className="alignment-overview-row">
            <span className="alignment-overview-label" title={mapping.queryName}>
              {mapping.queryName}
            </span>
            <div className="alignment-overview-bar alignment-overview-query-track">
              <div
                className="alignment-overview-query-bar"
                style={{
                  left: `${leftPct}%`,
                  width: `${Math.max(widthPct, 0.5)}%`,
                  backgroundColor: color,
                  opacity: Math.max(0.3, mapping.identity / 100),
                }}
                title={`${mapping.queryName}: ${mapping.identity.toFixed(1)}% identity (${mapping.refStart}..${mapping.refEnd})`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
