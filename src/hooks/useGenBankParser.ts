import { useCallback, useState } from "react";
import seqparse from "seqparse";
import { getBackend } from "../backend";
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
  const [parsedSequence, setParsedSequence] = useState<ParsedSequence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<ParserBackend>("js");

  const parseFile = useCallback(async (fileContent: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Try backend (Tauri IPC or WASM) first.
      const b = await getBackend();
      await b.init();
      const format = detectFormat(fileContent);
      const data = new TextEncoder().encode(fileContent);
      const result = await b.parseFile(data, format);
      setParsedSequence(result);
      setBackend(b.name);
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
