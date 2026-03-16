// Backend abstraction interface for dual-mode (Tauri / WASM) operation.

import type { ParsedSequence } from "../types/sequence";
import type { WasmAlignmentResult, WasmCutSite, WasmOrf } from "../types/wasm";

export interface GenomeBackend {
  readonly name: "tauri" | "wasm";
  init(): Promise<void>;
  parseFile(data: Uint8Array, format: "genbank" | "fasta"): Promise<ParsedSequence>;
  findCutSites(seq: string, isCircular: boolean, enzymes: string[]): Promise<WasmCutSite[]>;
  findSingleCutters(seq: string, isCircular: boolean): Promise<WasmCutSite[]>;
  findOrfs(seq: string, isCircular: boolean, minLengthAa: number): Promise<WasmOrf[]>;
  getEnzymeNames(): Promise<string[]>;
  alignSequences(
    query: string,
    target: string,
    matchScore?: number,
    mismatchPenalty?: number,
    gapOpenPenalty?: number,
    gapExtendPenalty?: number,
  ): Promise<WasmAlignmentResult>;
  openFileDialog(): Promise<{ content: string; fileName: string } | null>;
}
