import { SeqViz } from "seqviz";
import type { ParsedSequence, ViewerType } from "../types/sequence";

interface SeqViewerProps {
  sequence: ParsedSequence;
  viewerType: ViewerType;
  enzymes: string[];
}

export function SeqViewer({ sequence, viewerType, enzymes }: SeqViewerProps) {
  return (
    <div className="seq-viewer" style={{ flex: 1 }}>
      <SeqViz
        name={sequence.name}
        seq={sequence.seq}
        annotations={sequence.annotations}
        viewer={viewerType}
        enzymes={enzymes}
        primers={[]}
      />
    </div>
  );
}
