// TypeScript types for WASM API results.

export interface WasmParsedSequence {
  name: string;
  seq: string;
  is_circular: boolean;
  length: number;
  annotations: WasmAnnotation[];
}

export interface WasmAnnotation {
  name: string;
  start: number;
  end: number;
  direction: number;
  color?: string;
  type: string;
}

export interface WasmCutSite {
  enzyme_name: string;
  position: number;
  forward_cut: number;
  reverse_cut: number;
}

export interface WasmOrf {
  start: number;
  end: number;
  strand: string;
  frame: number;
  length_aa: number;
}

export interface WasmAlignmentResult {
  score: number;
  aligned_query: string;
  aligned_target: string;
  cigar: string;
}

export interface WasmError {
  error: string;
}

export type WasmParseResult = WasmParsedSequence | WasmError;

export function isWasmError(result: WasmParseResult): result is WasmError {
  return "error" in result;
}
