// Hook for finding restriction enzyme cut sites via WASM.

import { useCallback, useEffect, useState } from "react";
import type { WasmCutSite } from "../types/wasm";
import { ensureWasmInit } from "../wasm/init";

interface UseEnzymesReturn {
  cutSites: WasmCutSite[];
  isLoading: boolean;
  error: string | null;
  availableEnzymes: string[];
}

export function useEnzymes(
  sequence: string | null,
  isCircular: boolean,
  selectedEnzymes: string[],
): UseEnzymesReturn {
  const [cutSites, setCutSites] = useState<WasmCutSite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableEnzymes, setAvailableEnzymes] = useState<string[]>([]);

  // Load available enzyme names on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureWasmInit();
        const wasm = await import("../../pkg/genome_editor_wasm.js");
        const names = wasm.get_enzyme_names() as string[];
        if (!cancelled) {
          setAvailableEnzymes(names);
        }
      } catch {
        // WASM not available; leave empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Find cut sites whenever sequence or enzyme selection changes.
  const findCutSites = useCallback(async () => {
    if (!sequence || selectedEnzymes.length === 0) {
      setCutSites([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await ensureWasmInit();
      const wasm = await import("../../pkg/genome_editor_wasm.js");
      const result = wasm.find_cut_sites_wasm(
        sequence,
        isCircular,
        JSON.stringify(selectedEnzymes),
      ) as WasmCutSite[] | { error: string };

      if (result && "error" in result) {
        throw new Error((result as { error: string }).error);
      }

      setCutSites(result as WasmCutSite[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cut site search failed");
      setCutSites([]);
    } finally {
      setIsLoading(false);
    }
  }, [sequence, isCircular, selectedEnzymes]);

  useEffect(() => {
    findCutSites();
  }, [findCutSites]);

  return { cutSites, isLoading, error, availableEnzymes };
}
