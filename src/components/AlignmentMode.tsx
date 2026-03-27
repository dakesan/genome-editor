// Root container for Alignment Mode — shows input panel or alignment views.

import { useCallback, useRef } from "react";
import { useAlignmentAnalysis } from "../hooks/useAlignmentAnalysis";
import { useGenomeStore } from "../store";
import { AlignmentDetail, type AlignmentDetailHandle } from "./AlignmentDetail";
import { AlignmentInputPanel } from "./AlignmentInputPanel";
import { AlignmentOverview } from "./AlignmentOverview";

export function AlignmentMode() {
  const alignmentResult = useGenomeStore((s) => s.alignmentResult);
  const orfs = useGenomeStore((s) => s.orfs);
  const analysis = useAlignmentAnalysis(alignmentResult, orfs);
  const detailRef = useRef<AlignmentDetailHandle>(null);

  const handleOverviewClick = useCallback((alignedPos: number) => {
    detailRef.current?.scrollToAlignedPos(alignedPos);
  }, []);

  if (!alignmentResult || !analysis) {
    return (
      <div className="alignment-mode">
        <AlignmentInputPanel />
      </div>
    );
  }

  return (
    <div className="alignment-mode alignment-mode-has-result">
      <AlignmentInputPanel />
      <div className="alignment-views">
        <AlignmentOverview
          sequences={alignmentResult}
          analysis={analysis}
          orfs={orfs}
          onPositionClick={handleOverviewClick}
        />
        <AlignmentDetail ref={detailRef} sequences={alignmentResult} analysis={analysis} />
      </div>
    </div>
  );
}
