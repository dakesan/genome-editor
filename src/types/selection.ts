// Selection types compatible with SeqViz's internal Selection interface.

export type SelectionType =
  | "ANNOTATION"
  | "FIND"
  | "TRANSLATION"
  | "TRANSLATION_HANDLE"
  | "ENZYME"
  | "SEQ"
  | "AMINOACID"
  | "HIGHLIGHT"
  | "PRIMER"
  | "";

// Maps to seqviz Range type returned by onSearch.
export interface SearchRange {
  start: number;
  end: number;
  direction: -1 | 0 | 1;
}

export interface SeqSelection {
  clockwise?: boolean;
  color?: string;
  direction?: number;
  end?: number;
  id?: string;
  length?: number;
  name?: string;
  ref?: null | string;
  start?: number;
  type: SelectionType;
  viewer?: "LINEAR" | "CIRCULAR";
}
