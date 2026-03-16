// Backend abstraction interface for dual-mode (Tauri / WASM) operation.

import type { ParsedSequence } from "../types/sequence";
import type { WasmCutSite, WasmOrf } from "../types/wasm";

export interface GenomeBackend {
  readonly name: "tauri" | "wasm";
  init(): Promise<void>;
  parseFile(data: Uint8Array, format: "genbank" | "fasta"): Promise<ParsedSequence>;
  findCutSites(seq: string, isCircular: boolean, enzymes: string[]): Promise<WasmCutSite[]>;
  findOrfs(seq: string, isCircular: boolean, minLengthAa: number): Promise<WasmOrf[]>;
  getEnzymeNames(): Promise<string[]>;
  openFileDialog(): Promise<{ content: string; fileName: string } | null>;
}
