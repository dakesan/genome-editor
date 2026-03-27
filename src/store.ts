// Centralized application state powered by Zustand.

import { create } from "zustand";
import type { AlignedSequence, AppMode } from "./types/alignment";
import type { SearchRange, SeqSelection } from "./types/selection";
import type { ParsedSequence, SequenceAnnotation, ViewerType } from "./types/sequence";
import type { WasmCutSite, WasmOrf } from "./types/wasm";
import { adjustAnnotations, applyEdit, type SequenceEdit } from "./utils/sequenceEdit";

type ParserBackend = "tauri" | "wasm" | "js";

const EDIT_HISTORY_LIMIT = 50;

interface HistoryEntry {
  seq: string;
  annotations: SequenceAnnotation[];
}

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

  // App mode
  appMode: AppMode;
  alignmentResult: AlignedSequence[] | null;
  alignmentInput: string;

  // Layout
  sidebarOpen: boolean;

  // Edit history
  editHistory: HistoryEntry[];
  editHistoryIndex: number; // Points to current position; -1 = no history
  isDirty: boolean;

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
  setAppMode: (mode: AppMode) => void;
  setAlignmentResult: (result: AlignedSequence[] | null) => void;
  setAlignmentInput: (input: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  applySequenceEdit: (edit: SequenceEdit) => void;
  undo: () => void;
  redo: () => void;
  markClean: () => void;
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
  appMode: "editor" as AppMode,
  alignmentResult: null as AlignedSequence[] | null,
  alignmentInput: "",
  sidebarOpen: false,
  editHistory: [] as HistoryEntry[],
  editHistoryIndex: -1,
  isDirty: false,
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
  setAppMode: (mode) => set({ appMode: mode }),
  setAlignmentResult: (result) => set({ alignmentResult: result }),
  setAlignmentInput: (input) => set({ alignmentInput: input }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  applySequenceEdit: (edit) =>
    set((s) => {
      if (!s.parsedSequence) return s;

      const currentEntry: HistoryEntry = {
        seq: s.parsedSequence.seq,
        annotations: s.parsedSequence.annotations,
      };

      // Discard any redo entries beyond current position
      const historyBase =
        s.editHistoryIndex >= 0
          ? s.editHistory.slice(0, s.editHistoryIndex + 1)
          : [...s.editHistory];
      const newHistory = [...historyBase, currentEntry];

      // Enforce FIFO limit
      if (newHistory.length > EDIT_HISTORY_LIMIT) {
        newHistory.shift();
      }

      const newSeq = applyEdit(s.parsedSequence.seq, edit);
      const newAnnotations = adjustAnnotations(s.parsedSequence.annotations, edit);

      return {
        parsedSequence: {
          ...s.parsedSequence,
          seq: newSeq,
          annotations: newAnnotations,
        },
        editHistory: newHistory,
        editHistoryIndex: newHistory.length - 1,
        isDirty: true,
        selection: null,
      };
    }),

  undo: () =>
    set((s) => {
      if (!s.parsedSequence || s.editHistory.length === 0) return s;

      // If we're at the latest edit (editHistoryIndex === history.length - 1),
      // save current state so we can redo back to it
      const isAtTip = s.editHistoryIndex === s.editHistory.length - 1;
      let history = s.editHistory;
      const index = s.editHistoryIndex;

      if (isAtTip) {
        const currentEntry: HistoryEntry = {
          seq: s.parsedSequence.seq,
          annotations: s.parsedSequence.annotations,
        };
        history = [...history, currentEntry];
        // index still points to the entry we want to restore
      }

      if (index < 0) return s;

      const entry = history[index];
      return {
        parsedSequence: {
          ...s.parsedSequence,
          seq: entry.seq,
          annotations: entry.annotations,
        },
        editHistory: history,
        editHistoryIndex: index - 1,
        isDirty: true,
        selection: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.parsedSequence) return s;

      // We can redo if there's an entry after the current index + 1
      // (index points to last restored entry, so index + 2 is redo target)
      const redoIndex = s.editHistoryIndex + 2;
      if (redoIndex >= s.editHistory.length) return s;

      const entry = s.editHistory[redoIndex];
      return {
        parsedSequence: {
          ...s.parsedSequence,
          seq: entry.seq,
          annotations: entry.annotations,
        },
        editHistoryIndex: s.editHistoryIndex + 1,
        isDirty: true,
        selection: null,
      };
    }),

  markClean: () => set({ isDirty: false }),

  reset: () => set(initialState),
}));
