// WASM module initialization.
//
// Loads the WASM binary once and caches the result so that subsequent
// calls return the same promise without re-initializing.

import wasmInit from "../../pkg/genome_editor_wasm.js";

let initPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module. Safe to call multiple times —
 * initialization happens at most once.
 */
export function ensureWasmInit(): Promise<void> {
  if (!initPromise) {
    initPromise = wasmInit().then(() => undefined);
  }
  return initPromise;
}

/**
 * Check whether the WASM module has been initialized.
 */
export function isWasmReady(): boolean {
  return initPromise !== null;
}
