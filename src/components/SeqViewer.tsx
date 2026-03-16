import { SeqViz } from "seqviz";
import type { ParsedSequence, ViewerType } from "../types/sequence";

export interface Translation {
  start: number;
  end: number;
  direction: 1 | -1;
  name: string;
}

interface SeqViewerProps {
  sequence: ParsedSequence;
  viewerType: ViewerType;
  enzymes: string[];
  translations?: Translation[];
}

export function SeqViewer({ sequence, viewerType, enzymes, translations = [] }: SeqViewerProps) {
  return (
    <div className="seq-viewer" style={{ flex: 1 }}>
      <SeqViz
        name={sequence.name}
        seq={sequence.seq}
        annotations={sequence.annotations}
        viewer={viewerType}
        enzymes={enzymes}
        translations={translations}
        primers={[]}
      />
    </div>
  );
}
