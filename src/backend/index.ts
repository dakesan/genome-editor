// Backend environment detection and singleton access.

import type { GenomeBackend } from "./types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let backendInstance: GenomeBackend | null = null;

export async function getBackend(): Promise<GenomeBackend> {
  if (backendInstance) return backendInstance;

  if (isTauri()) {
    const { TauriBackend } = await import("./tauri");
    backendInstance = new TauriBackend();
  } else {
    const { WasmBackend } = await import("./wasm");
    backendInstance = new WasmBackend();
  }

  return backendInstance;
}

export function getBackendSync(): GenomeBackend | null {
  return backendInstance;
}

export type { GenomeBackend } from "./types";
