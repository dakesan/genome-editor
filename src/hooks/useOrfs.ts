// Hook for detecting ORFs via backend abstraction.

import { useCallback, useEffect, useState } from "react";
import { getBackend } from "../backend";
import { useGenomeStore } from "../store";
import type { WasmOrf } from "../types/wasm";

interface UseOrfsReturn {
  orfs: WasmOrf[];
  isLoading: boolean;
  error: string | null;
}

export function useOrfs(
  sequence: string | null,
  isCircular: boolean,
  minLengthAa: number,
): UseOrfsReturn {
  const orfs = useGenomeStore((s) => s.orfs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findOrfs = useCallback(async () => {
    if (!sequence) {
      useGenomeStore.getState().setOrfs([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const backend = await getBackend();
      await backend.init();
      const result = await backend.findOrfs(sequence, isCircular, minLengthAa);
      useGenomeStore.getState().setOrfs(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ORF detection failed");
      useGenomeStore.getState().setOrfs([]);
    } finally {
      setIsLoading(false);
    }
  }, [sequence, isCircular, minLengthAa]);

  useEffect(() => {
    findOrfs();
  }, [findOrfs]);

  return { orfs, isLoading, error };
}
