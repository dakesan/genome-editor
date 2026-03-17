// Hook for finding restriction enzyme cut sites via backend abstraction.

import { useCallback, useEffect, useState } from "react";
import { getBackend } from "../backend";
import { useGenomeStore } from "../store";
import type { WasmCutSite } from "../types/wasm";

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
  const cutSites = useGenomeStore((s) => s.cutSites);
  const isLoading = useGenomeStore((s) => s.cutSitesLoading);
  const [error, setError] = useState<string | null>(null);
  const [availableEnzymes, setAvailableEnzymes] = useState<string[]>([]);

  // Load available enzyme names on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const backend = await getBackend();
        await backend.init();
        const names = await backend.getEnzymeNames();
        if (!cancelled) {
          setAvailableEnzymes(names);
        }
      } catch {
        // Backend not available; leave empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Find cut sites whenever sequence or enzyme selection changes.
  const findCutSites = useCallback(async () => {
    if (!sequence || selectedEnzymes.length === 0) {
      useGenomeStore.getState().setCutSites([]);
      return;
    }

    useGenomeStore.getState().setCutSitesLoading(true);
    setError(null);
    try {
      const backend = await getBackend();
      await backend.init();
      const result = await backend.findCutSites(sequence, isCircular, selectedEnzymes);
      useGenomeStore.getState().setCutSites(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cut site search failed");
      useGenomeStore.getState().setCutSites([]);
    } finally {
      useGenomeStore.getState().setCutSitesLoading(false);
    }
  }, [sequence, isCircular, selectedEnzymes]);

  useEffect(() => {
    findCutSites();
  }, [findCutSites]);

  return { cutSites, isLoading, error, availableEnzymes };
}
