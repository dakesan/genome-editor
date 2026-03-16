// Hook for parsing GenBank/FASTA files via WASM.

import { useCallback, useState } from "react";
import type { ParsedSequence } from "../types/sequence";
import type { WasmParsedSequence } from "../types/wasm";
import { isWasmError } from "../types/wasm";
import { ensureWasmInit } from "../wasm/init";

interface UseWasmParserReturn {
  parsedSequence: ParsedSequence | null;
  isLoading: boolean;
  error: string | null;
  parseFile: (fileContent: string) => Promise<void>;
  reset: () => void;
}

/**
 * Convert WASM parsed result to the app's ParsedSequence type.
 */
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

/**
 * Detect file format from content and return the appropriate WASM parser.
 */
function detectFormat(content: string): "genbank" | "fasta" {
  const trimmed = content.trimStart();
  if (trimmed.startsWith("LOCUS") || trimmed.startsWith("locus")) {
    return "genbank";
  }
  return "fasta";
}

export function useWasmParser(): UseWasmParserReturn {
  const [parsedSequence, setParsedSequence] = useState<ParsedSequence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback(async (fileContent: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await ensureWasmInit();

      // Dynamic import to avoid loading WASM functions before init.
      const wasm = await import("../../pkg/genome_editor_wasm.js");
      const encoder = new TextEncoder();
      const bytes = encoder.encode(fileContent);

      const format = detectFormat(fileContent);
      const result =
        format === "genbank" ? wasm.parse_genbank_wasm(bytes) : wasm.parse_fasta_wasm(bytes);

      if (isWasmError(result)) {
        throw new Error(result.error);
      }

      setParsedSequence(toAppSequence(result as WasmParsedSequence));
    } catch (e) {
      setError(e instanceof Error ? e.message : "WASM parse failed");
      setParsedSequence(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setParsedSequence(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { parsedSequence, isLoading, error, parseFile, reset };
}
