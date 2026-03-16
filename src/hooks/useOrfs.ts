// Hook for detecting ORFs via WASM.

import { useCallback, useEffect, useState } from "react";
import type { WasmOrf } from "../types/wasm";
import { ensureWasmInit } from "../wasm/init";

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
  const [orfs, setOrfs] = useState<WasmOrf[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findOrfs = useCallback(async () => {
    if (!sequence) {
      setOrfs([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await ensureWasmInit();
      const wasm = await import("../../pkg/genome_editor_wasm.js");
      const result = wasm.find_orfs_wasm(sequence, isCircular, minLengthAa) as WasmOrf[];
      setOrfs(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ORF detection failed");
      setOrfs([]);
    } finally {
      setIsLoading(false);
    }
  }, [sequence, isCircular, minLengthAa]);

  useEffect(() => {
    findOrfs();
  }, [findOrfs]);

  return { orfs, isLoading, error };
}
