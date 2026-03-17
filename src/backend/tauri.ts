// Tauri backend implementation — used in desktop environments.

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { ParsedSequence } from "../types/sequence";
import type { WasmAlignmentResult, WasmCutSite, WasmOrf } from "../types/wasm";
import type { GenomeBackend } from "./types";

export class TauriBackend implements GenomeBackend {
  readonly name = "tauri" as const;

  async init(): Promise<void> {
    // No initialization needed for Tauri — the Rust backend is always ready.
  }

  async parseFile(data: Uint8Array, _format: "genbank" | "fasta"): Promise<ParsedSequence> {
    // For inline content parsing (drag-and-drop, pasted content),
    // delegate to WasmBackend since Tauri IPC uses file paths.
    const content = new TextDecoder().decode(data);
    const trimmed = content.trimStart();
    const format = trimmed.startsWith("LOCUS") || trimmed.startsWith("locus") ? "genbank" : "fasta";
    const { WasmBackend } = await import("./wasm");
    const wasmBackend = new WasmBackend();
    return wasmBackend.parseFile(data, format);
  }

  async findCutSites(seq: string, isCircular: boolean, enzymes: string[]): Promise<WasmCutSite[]> {
    return invoke<WasmCutSite[]>("compute_cut_sites", {
      seq,
      isCircular,
      enzymes,
    });
  }

  async findSingleCutters(seq: string, isCircular: boolean): Promise<WasmCutSite[]> {
    return invoke<WasmCutSite[]>("find_single_cutters", {
      seq,
      isCircular,
    });
  }

  async findOrfs(seq: string, isCircular: boolean, minLengthAa: number): Promise<WasmOrf[]> {
    return invoke<WasmOrf[]>("detect_orfs", {
      seq,
      isCircular,
      minLength: minLengthAa,
    });
  }

  async getEnzymeNames(): Promise<string[]> {
    return invoke<string[]>("get_enzyme_names");
  }

  async alignSequences(
    query: string,
    target: string,
    _matchScore = 2,
    _mismatchPenalty = -1,
    _gapOpenPenalty = -5,
    _gapExtendPenalty = -1,
  ): Promise<WasmAlignmentResult> {
    return invoke<WasmAlignmentResult>("align_sequences", {
      query,
      target,
    });
  }

  async openFileDialog(): Promise<{
    content: string;
    fileName: string;
  } | null> {
    const path = await open({
      filters: [
        {
          name: "Sequence Files",
          extensions: ["gb", "gbk", "genbank", "fasta", "fa", "fna", "seq", "ape", "dna"],
        },
      ],
      multiple: false,
      directory: false,
    });

    if (!path) return null;
    const filePath = typeof path === "string" ? path : null;
    if (!filePath) return null;

    const content = await readTextFile(filePath);
    const fileName = filePath.split("/").pop() ?? "file";
    return { content, fileName };
  }
}
