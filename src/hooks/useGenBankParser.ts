import { useCallback } from "react";
import seqparse from "seqparse";
import { getBackend } from "../backend";
import { useGenomeStore } from "../store";
import type { ParsedSequence } from "../types/sequence";

type ParserBackend = "tauri" | "wasm" | "js";

interface UseGenBankParserReturn {
  parsedSequence: ParsedSequence | null;
  isLoading: boolean;
  error: string | null;
  parseFile: (fileContent: string) => Promise<void>;
  reset: () => void;
  backend: ParserBackend;
}

function detectFormat(content: string): "genbank" | "fasta" {
  const trimmed = content.trimStart();
  if (trimmed.startsWith("LOCUS") || trimmed.startsWith("locus")) {
    return "genbank";
  }
  return "fasta";
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
  const parsedSequence = useGenomeStore((s) => s.parsedSequence);
  const isLoading = useGenomeStore((s) => s.isLoading);
  const error = useGenomeStore((s) => s.error);
  const backend = useGenomeStore((s) => s.backend);

  const parseFile = useCallback(async (fileContent: string) => {
    const store = useGenomeStore.getState();
    store.setIsLoading(true);
    store.setError(null);
    try {
      // Try backend (Tauri IPC or WASM) first.
      const b = await getBackend();
      await b.init();
      const format = detectFormat(fileContent);
      const data = new TextEncoder().encode(fileContent);
      const result = await b.parseFile(data, format);
      useGenomeStore.getState().setParsedSequence(result);
      useGenomeStore.getState().setBackend(b.name);
    } catch {
      // Fall back to JS parser.
      try {
        const result = await parseWithJs(fileContent);
        useGenomeStore.getState().setParsedSequence(result);
        useGenomeStore.getState().setBackend("js");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to parse file";
        useGenomeStore.getState().setError(msg);
        useGenomeStore.getState().setParsedSequence(null);
      }
    } finally {
      useGenomeStore.getState().setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    const store = useGenomeStore.getState();
    store.setParsedSequence(null);
    store.setError(null);
    store.setIsLoading(false);
  }, []);

  return { parsedSequence, isLoading, error, parseFile, reset, backend };
}
