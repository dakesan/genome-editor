import { useCallback, useState } from "react";
import seqparse from "seqparse";
import type { ParsedSequence } from "../types/sequence";
import type { WasmParsedSequence } from "../types/wasm";
import { isWasmError } from "../types/wasm";
import { ensureWasmInit } from "../wasm/init";

type ParserBackend = "wasm" | "js";

interface UseGenBankParserReturn {
  parsedSequence: ParsedSequence | null;
  isLoading: boolean;
  error: string | null;
  parseFile: (fileContent: string) => Promise<void>;
  reset: () => void;
  backend: ParserBackend;
}

/**
 * Detect file format from content.
 */
function detectFormat(content: string): "genbank" | "fasta" {
  const trimmed = content.trimStart();
  if (trimmed.startsWith("LOCUS") || trimmed.startsWith("locus")) {
    return "genbank";
  }
  return "fasta";
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
 * Try parsing with WASM first, fall back to JS (seqparse) on failure.
 */
async function parseWithWasm(fileContent: string): Promise<ParsedSequence> {
  await ensureWasmInit();
  const wasm = await import("../../pkg/genome_editor_wasm.js");
  const encoder = new TextEncoder();
  const bytes = encoder.encode(fileContent);

  const format = detectFormat(fileContent);
  const result =
    format === "genbank" ? wasm.parse_genbank_wasm(bytes) : wasm.parse_fasta_wasm(bytes);

  if (isWasmError(result)) {
    throw new Error(result.error);
  }

  return toAppSequence(result as WasmParsedSequence);
}

async function parseWithJs(fileContent: string): Promise<ParsedSequence> {
  const parsed = await seqparse(fileContent);
  return {
    name: parsed.name || "Unknown",
    seq: parsed.seq || "",
    annotations: (parsed.annotations || []).map((a) => ({
      name: a.name || "",
      start: a.start ?? 0,
      end: a.end ?? 0,
      direction: a.direction,
      color: a.color,
      type: a.type,
    })),
  };
}

export function useGenBankParser(): UseGenBankParserReturn {
  const [parsedSequence, setParsedSequence] = useState<ParsedSequence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<ParserBackend>("js");

  const parseFile = useCallback(async (fileContent: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Try WASM first.
      const result = await parseWithWasm(fileContent);
      setParsedSequence(result);
      setBackend("wasm");
    } catch {
      // Fall back to JS parser.
      try {
        const result = await parseWithJs(fileContent);
        setParsedSequence(result);
        setBackend("js");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse file");
        setParsedSequence(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setParsedSequence(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { parsedSequence, isLoading, error, parseFile, reset, backend };
}
