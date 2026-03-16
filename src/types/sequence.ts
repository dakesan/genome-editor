export interface SequenceAnnotation {
  name: string;
  start: number;
  end: number;
  direction?: number;
  color?: string;
  type?: string;
}

export interface ParsedSequence {
  name: string;
  seq: string;
  annotations: SequenceAnnotation[];
}

export type ViewerType = "linear" | "circular" | "both" | "both_flip";

export interface ViewerState {
  sequence: ParsedSequence | null;
  viewerType: ViewerType;
  enzymes: string[];
  isLoading: boolean;
  error: string | null;
  fileName: string | null;
}
