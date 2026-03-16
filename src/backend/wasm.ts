// WASM backend implementation — used in browser environments.

import type { ParsedSequence } from "../types/sequence";
import type { WasmAlignmentResult, WasmCutSite, WasmOrf, WasmParsedSequence } from "../types/wasm";
import { isWasmError } from "../types/wasm";
import { ensureWasmInit } from "../wasm/init";
import type { GenomeBackend } from "./types";

function toAppSequence(wasm: WasmParsedSequence): ParsedSequence {
  return {
    name: wasm.name,
    seq: wasm.seq,
    annotations: wasm.annotations.map((a) => ({
      name: a.name,
      start: a.start,
      end: a.end,
      direction: a.direction,
      color: a.color,
      type: a.type,
    })),
  };
}

export class WasmBackend implements GenomeBackend {
  readonly name = "wasm" as const;

  async init(): Promise<void> {
    await ensureWasmInit();
  }

  async parseFile(data: Uint8Array, format: "genbank" | "fasta"): Promise<ParsedSequence> {
    await this.init();
    const wasm = await import("../../pkg/genome_editor_wasm.js");
    const result =
      format === "genbank" ? wasm.parse_genbank_wasm(data) : wasm.parse_fasta_wasm(data);

    if (isWasmError(result)) {
      throw new Error(result.error);
    }
    return toAppSequence(result as WasmParsedSequence);
  }

  async findCutSites(seq: string, isCircular: boolean, enzymes: string[]): Promise<WasmCutSite[]> {
    await this.init();
    const wasm = await import("../../pkg/genome_editor_wasm.js");
    const result = wasm.find_cut_sites_wasm(seq, isCircular, JSON.stringify(enzymes)) as
      | WasmCutSite[]
      | { error: string };

    if (result && "error" in result) {
      throw new Error((result as { error: string }).error);
    }
    return result as WasmCutSite[];
  }

  async findSingleCutters(seq: string, isCircular: boolean): Promise<WasmCutSite[]> {
    await this.init();
    const wasm = await import("../../pkg/genome_editor_wasm.js");
    return wasm.find_single_cutters_wasm(seq, isCircular) as WasmCutSite[];
  }

  async findOrfs(seq: string, isCircular: boolean, minLengthAa: number): Promise<WasmOrf[]> {
    await this.init();
    const wasm = await import("../../pkg/genome_editor_wasm.js");
    return wasm.find_orfs_wasm(seq, isCircular, minLengthAa) as WasmOrf[];
  }

  async getEnzymeNames(): Promise<string[]> {
    await this.init();
    const wasm = await import("../../pkg/genome_editor_wasm.js");
    return wasm.get_enzyme_names() as string[];
  }

  async alignSequences(
    query: string,
    target: string,
    matchScore = 2,
    mismatchPenalty = -1,
    gapOpenPenalty = -5,
    gapExtendPenalty = -1,
  ): Promise<WasmAlignmentResult> {
    await this.init();
    const wasm = await import("../../pkg/genome_editor_wasm.js");
    return wasm.pairwise_align_wasm(
      query,
      target,
      matchScore,
      mismatchPenalty,
      gapOpenPenalty,
      gapExtendPenalty,
    ) as WasmAlignmentResult;
  }

  async openFileDialog(): Promise<{
    content: string;
    fileName: string;
  } | null> {
    // Browser environment: use HTML file input via a hidden element.
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".gb,.gbk,.genbank,.fasta,.fa,.fna,.seq";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result;
          if (typeof content === "string") {
            resolve({ content, fileName: file.name });
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };
      input.click();
    });
  }
}
