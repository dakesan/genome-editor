import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { getBackend } from "./backend";
import { AnnotationListPanel } from "./components/AnnotationListPanel";
import { ContextMenu } from "./components/ContextMenu";
import { CutSiteList } from "./components/CutSiteList";
import { EditPanel } from "./components/EditPanel";
import { FileLoader } from "./components/FileLoader";
import { MsaPanel } from "./components/MsaPanel";
import { SearchPanel } from "./components/SearchPanel";
import { SelectionInfoPanel } from "./components/SelectionInfoPanel";
import { SeqViewer } from "./components/SeqViewer";
import { Sidebar } from "./components/Sidebar";
import { ViewerControls } from "./components/ViewerControls";
import { useEnzymes } from "./hooks/useEnzymes";
import { useGenBankParser } from "./hooks/useGenBankParser";
import { useOrfs } from "./hooks/useOrfs";
import { usePerformance } from "./hooks/usePerformance";
import { useTheme } from "./hooks/useTheme";
import { useGenomeStore } from "./store";
import type { SearchRange, SeqSelection } from "./types/selection";
import { reportWebVitals } from "./utils/performance";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const { parsedSequence, isLoading, error, parseFile, backend } = useGenBankParser();

  const viewerType = useGenomeStore((s) => s.viewerType);
  const enzymes = useGenomeStore((s) => s.enzymes);
  const fileName = useGenomeStore((s) => s.fileName);
  const selection = useGenomeStore((s) => s.selection);
  const searchQuery = useGenomeStore((s) => s.searchQuery);
  const searchMismatch = useGenomeStore((s) => s.searchMismatch);
  const searchResults = useGenomeStore((s) => s.searchResults);
  const searchCurrentIndex = useGenomeStore((s) => s.searchCurrentIndex);
  const sidebarOpen = useGenomeStore((s) => s.sidebarOpen);
  const setViewerType = useGenomeStore((s) => s.setViewerType);
  const setEnzymes = useGenomeStore((s) => s.setEnzymes);
  const setFileName = useGenomeStore((s) => s.setFileName);
  const setSelection = useGenomeStore((s) => s.setSelection);
  const setSearchResults = useGenomeStore((s) => s.setSearchResults);
  const markClean = useGenomeStore((s) => s.markClean);
  const toggleSidebar = useGenomeStore((s) => s.toggleSidebar);

  const [saveFormat, setSaveFormat] = useState<"genbank" | "fasta">("genbank");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [msaPanelOpen, setMsaPanelOpen] = useState(false);

  const { renderMetrics, startMeasure, stopMeasure } = usePerformance("SeqViewer");

  // Backend cut site detection.
  const {
    cutSites,
    isLoading: cutSitesLoading,
    availableEnzymes: _availableEnzymes,
  } = useEnzymes(parsedSequence?.seq ?? null, false, enzymes);

  // Backend ORF detection (minimum 100 amino acids).
  const { orfs } = useOrfs(parsedSequence?.seq ?? null, false, 100);

  // Convert ORFs to SeqViz translations prop format.
  const translations = useMemo(
    () =>
      orfs.map((orf, i) => ({
        start: orf.start,
        end: orf.end,
        direction: orf.strand === "forward" ? (1 as const) : (-1 as const),
        name: `ORF ${i + 1} (${orf.length_aa} aa)`,
      })),
    [orfs],
  );

  // Search props for SeqViz.
  const searchProp = useMemo(() => {
    if (!searchQuery) return undefined;
    return { query: searchQuery, mismatch: searchMismatch || undefined };
  }, [searchQuery, searchMismatch]);

  const handleSearch = useCallback(
    (ranges: SearchRange[]) => {
      setSearchResults(ranges);
    },
    [setSearchResults],
  );

  // Highlight current search match with a distinct color.
  const searchHighlights = useMemo(() => {
    if (searchResults.length === 0 || searchCurrentIndex >= searchResults.length) return undefined;
    const current = searchResults[searchCurrentIndex];
    return [{ start: current.start, end: current.end, color: "rgba(255, 165, 0, 0.5)" }];
  }, [searchResults, searchCurrentIndex]);

  const handleSelection = useCallback(
    (sel: SeqSelection) => {
      setSelection(sel);
    },
    [setSelection],
  );

  const handleCopyEvent = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    return (event.metaKey || event.ctrlKey) && event.key === "c";
  }, []);

  const handleFileLoad = useCallback(
    async (content: string, name: string) => {
      setFileName(name);
      startMeasure();
      await parseFile(content, name);
    },
    [parseFile, startMeasure, setFileName],
  );

  // Tauri menu event: open file via native dialog.
  const handleMenuOpen = useCallback(async () => {
    const b = await getBackend();
    const result = await b.openFileDialog();
    if (result) {
      handleFileLoad(result.content, result.fileName);
    }
  }, [handleFileLoad]);

  // Save file to disk or download.
  const handleSave = useCallback(
    async (format: "genbank" | "fasta") => {
      const seq = useGenomeStore.getState().parsedSequence;
      if (!seq) return;

      if (format === "fasta" && seq.annotations.length > 0) {
        const proceed = window.confirm(
          "FASTA format does not support annotations. Annotations will be lost. Continue?",
        );
        if (!proceed) return;
      }

      const b = await getBackend();
      const saved = await b.saveFileDialog(
        {
          name: seq.name,
          seq: seq.seq,
          annotations: seq.annotations,
          isCircular: false,
        },
        format,
        useGenomeStore.getState().fileName ?? "sequence",
      );
      if (saved) {
        markClean();
      }
    },
    [markClean],
  );

  // Handle Cmd+S: show save format picker or save directly.
  const handleSaveShortcut = useCallback(() => {
    if (!useGenomeStore.getState().parsedSequence) return;
    setShowSaveDialog(true);
  }, []);

  // Listen for Tauri menu events.
  useEffect(() => {
    if (!isTauri()) return;
    let unlistenOpen: (() => void) | undefined;
    let unlistenSave: (() => void) | undefined;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlistenOpen = await listen("menu-open-file", () => {
        handleMenuOpen();
      });
      unlistenSave = await listen("menu-save-file", () => {
        handleSaveShortcut();
      });
    })();
    return () => {
      unlistenOpen?.();
      unlistenSave?.();
    };
  }, [handleMenuOpen, handleSaveShortcut]);

  // Drag-and-drop file loading.
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === "string") {
          handleFileLoad(content, file.name);
        }
      };
      reader.readAsText(file);
    },
    [handleFileLoad],
  );

  // Stop measurement after sequence is parsed and component re-renders.
  useEffect(() => {
    if (parsedSequence && !isLoading) {
      requestAnimationFrame(() => {
        stopMeasure();
      });
    }
  }, [parsedSequence, isLoading, stopMeasure]);

  // Keyboard shortcuts: Cmd+F (search), Cmd+Z (undo), Cmd+Shift+Z (redo),
  // Delete/Backspace (delete selection).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "s") {
        e.preventDefault();
        handleSaveShortcut();
        return;
      }

      if (mod && e.key === "f") {
        e.preventDefault();
        useGenomeStore.getState().setSidebarOpen(true);
        return;
      }

      if (mod && e.shiftKey && e.key === "z") {
        e.preventDefault();
        useGenomeStore.getState().redo();
        return;
      }

      if (mod && e.key === "z") {
        e.preventDefault();
        useGenomeStore.getState().undo();
        return;
      }

      if (e.key === "Escape") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        useGenomeStore.getState().clearSelection();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        // Only handle if not typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        const state = useGenomeStore.getState();
        if (
          state.parsedSequence &&
          state.selection?.start != null &&
          state.selection?.end != null
        ) {
          const start = Math.min(state.selection.start, state.selection.end);
          const end = Math.max(state.selection.start, state.selection.end);
          const count = end - start;
          if (count > 0) {
            e.preventDefault();
            state.applySequenceEdit({
              type: "delete",
              position: start,
              deletedCount: count,
            });
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveShortcut]);

  // Report web vitals on mount.
  useEffect(() => {
    reportWebVitals();
  }, []);

  return (
    <div className="app" role="application" onDragOver={handleDragOver} onDrop={handleDrop}>
      <header className="app-header">
        <h1>Genome Editor</h1>
        <span className="header-divider" />
        <FileLoader onFileLoad={handleFileLoad} isLoading={isLoading} />
        {fileName && <span className="file-name">{fileName}</span>}
        <span className="header-divider" />
        <ViewerControls
          viewerType={viewerType}
          onViewerTypeChange={setViewerType}
          selectedEnzymes={enzymes}
          onEnzymesChange={setEnzymes}
        />
        {renderMetrics && (
          <span className="render-metrics">
            {renderMetrics.duration.toFixed(0)}ms ({backend})
          </span>
        )}
        <button
          type="button"
          className={`msa-toggle ${msaPanelOpen ? "active" : ""}`}
          onClick={() => setMsaPanelOpen((v) => !v)}
          title="Multiple Sequence Alignment"
        >
          MSA
        </button>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? "\u2715" : "\u2630"}
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
        </button>
      </header>

      {error && <div className="app-error">Error: {error}</div>}

      {showSaveDialog && (
        <div
          className="save-dialog-overlay"
          role="dialog"
          onClick={() => setShowSaveDialog(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowSaveDialog(false)}
        >
          <div
            className="save-dialog"
            role="document"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
          >
            <h3>Save As</h3>
            <div className="save-format-group">
              <label>
                <input
                  type="radio"
                  name="format"
                  value="genbank"
                  checked={saveFormat === "genbank"}
                  onChange={() => setSaveFormat("genbank")}
                />
                GenBank (.gb)
              </label>
              <label>
                <input
                  type="radio"
                  name="format"
                  value="fasta"
                  checked={saveFormat === "fasta"}
                  onChange={() => setSaveFormat("fasta")}
                />
                FASTA (.fasta)
              </label>
            </div>
            <div className="save-dialog-actions">
              <button
                type="button"
                onClick={() => {
                  setShowSaveDialog(false);
                  handleSave(saveFormat);
                }}
              >
                Save
              </button>
              <button type="button" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="app-body">
        <div className="main-content">
          <MsaPanel
            open={msaPanelOpen}
            onToggle={() => setMsaPanelOpen(false)}
            currentSequence={parsedSequence}
          />
          {parsedSequence ? (
            <>
              <div className="viewer-wrapper">
                <SeqViewer
                  sequence={parsedSequence}
                  viewerType={viewerType}
                  enzymes={enzymes}
                  translations={translations}
                  onSelection={handleSelection}
                  copyEvent={handleCopyEvent}
                  search={searchProp}
                  onSearch={handleSearch}
                  highlights={searchHighlights}
                />
                <ContextMenu />
              </div>
              <CutSiteList cutSites={cutSites} isLoading={cutSitesLoading} />
            </>
          ) : (
            <div className="app-status">
              {isLoading ? "Parsing sequence..." : "Load a GenBank or FASTA file to get started"}
            </div>
          )}
        </div>
        <Sidebar open={sidebarOpen}>
          <SearchPanel />
          <SelectionInfoPanel selection={selection} sequence={parsedSequence} />
          <EditPanel />
          <AnnotationListPanel />
        </Sidebar>
      </div>
    </div>
  );
}

export default App;
