import { useCallback, useState } from "react";
import seqparse from "seqparse";
import type { ParsedSequence } from "../types/sequence";

interface UseGenBankParserReturn {
  parsedSequence: ParsedSequence | null;
  isLoading: boolean;
  error: string | null;
  parseFile: (fileContent: string) => Promise<void>;
  reset: () => void;
}

export function useGenBankParser(): UseGenBankParserReturn {
  const [parsedSequence, setParsedSequence] = useState<ParsedSequence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback(async (fileContent: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = await seqparse(fileContent);
      setParsedSequence({
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
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
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
