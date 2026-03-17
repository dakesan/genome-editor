// Centralized application state powered by Zustand.

import { create } from "zustand";
import type { SearchRange, SeqSelection } from "./types/selection";
import type { ParsedSequence, ViewerType } from "./types/sequence";
import type { WasmCutSite, WasmOrf } from "./types/wasm";

type ParserBackend = "tauri" | "wasm" | "js";

interface GenomeStore {
  // Sequence
  parsedSequence: ParsedSequence | null;
  fileName: string | null;
  isLoading: boolean;
  error: string | null;
  backend: ParserBackend;

  // Viewer
  viewerType: ViewerType;
  enzymes: string[];

  // Computed data from backend
  cutSites: WasmCutSite[];
  cutSitesLoading: boolean;
  orfs: WasmOrf[];

  // Selection
  selection: SeqSelection | null;

  // Search
  searchQuery: string;
  searchMismatch: number;
  searchResults: SearchRange[];
  searchCurrentIndex: number;

  // Layout
  sidebarOpen: boolean;

  // Actions
  setParsedSequence: (seq: ParsedSequence | null) => void;
  setFileName: (name: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setBackend: (backend: ParserBackend) => void;
  setViewerType: (type: ViewerType) => void;
  setEnzymes: (enzymes: string[]) => void;
  setCutSites: (sites: WasmCutSite[]) => void;
  setCutSitesLoading: (loading: boolean) => void;
  setOrfs: (orfs: WasmOrf[]) => void;
  setSelection: (selection: SeqSelection | null) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setSearchMismatch: (mismatch: number) => void;
  setSearchResults: (results: SearchRange[]) => void;
  nextSearchResult: () => void;
  prevSearchResult: () => void;
  clearSearch: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  reset: () => void;
}

const initialState = {
  parsedSequence: null,
  fileName: null,
  isLoading: false,
  error: null,
  backend: "js" as ParserBackend,
  viewerType: "both" as ViewerType,
  enzymes: ["EcoRI"],
  cutSites: [] as WasmCutSite[],
  cutSitesLoading: false,
  orfs: [] as WasmOrf[],
  selection: null as SeqSelection | null,
  searchQuery: "",
  searchMismatch: 0,
  searchResults: [] as SearchRange[],
  searchCurrentIndex: 0,
  sidebarOpen: false,
};

export const useGenomeStore = create<GenomeStore>((set) => ({
  ...initialState,

  setParsedSequence: (seq) => set({ parsedSequence: seq }),
  setFileName: (name) => set({ fileName: name }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setBackend: (backend) => set({ backend }),
  setViewerType: (type) => set({ viewerType: type }),
  setEnzymes: (enzymes) => set({ enzymes }),
  setCutSites: (sites) => set({ cutSites: sites }),
  setCutSitesLoading: (loading) => set({ cutSitesLoading: loading }),
  setOrfs: (orfs) => set({ orfs }),
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
  setSearchQuery: (query) => set({ searchQuery: query, searchCurrentIndex: 0 }),
  setSearchMismatch: (mismatch) => set({ searchMismatch: mismatch, searchCurrentIndex: 0 }),
  setSearchResults: (results) => set({ searchResults: results, searchCurrentIndex: 0 }),
  nextSearchResult: () =>
    set((s) => ({
      searchCurrentIndex:
        s.searchResults.length > 0 ? (s.searchCurrentIndex + 1) % s.searchResults.length : 0,
    })),
  prevSearchResult: () =>
    set((s) => ({
      searchCurrentIndex:
        s.searchResults.length > 0
          ? (s.searchCurrentIndex - 1 + s.searchResults.length) % s.searchResults.length
          : 0,
    })),
  clearSearch: () =>
    set({ searchQuery: "", searchMismatch: 0, searchResults: [], searchCurrentIndex: 0 }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  reset: () => set(initialState),
}));
