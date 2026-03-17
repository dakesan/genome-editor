import { useCallback, useEffect, useMemo } from "react";
import "./App.css";
import { getBackend } from "./backend";
import { CutSiteList } from "./components/CutSiteList";
import { FileLoader } from "./components/FileLoader";
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
  const toggleSidebar = useGenomeStore((s) => s.toggleSidebar);

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
  const translations = orfs.map((orf, i) => ({
    start: orf.start,
    end: orf.end,
    direction: orf.strand === "forward" ? (1 as const) : (-1 as const),
    name: `ORF ${i + 1} (${orf.length_aa} aa)`,
  }));

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
      await parseFile(content);
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

  // Listen for Tauri menu events.
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen("menu-open-file", () => {
        handleMenuOpen();
      });
    })();
    return () => {
      unlisten?.();
    };
  }, [handleMenuOpen]);

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

  // Cmd+F / Ctrl+F opens sidebar and focuses search.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        useGenomeStore.getState().setSidebarOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Report web vitals on mount.
  useEffect(() => {
    reportWebVitals();
  }, []);

  return (
    <div className="app" role="application" onDragOver={handleDragOver} onDrop={handleDrop}>
      <header className="app-header">
        <h1>Genome Editor</h1>
        <FileLoader onFileLoad={handleFileLoad} isLoading={isLoading} />
        {fileName && <span className="file-name">{fileName}</span>}
        <ViewerControls
          viewerType={viewerType}
          onViewerTypeChange={setViewerType}
          selectedEnzymes={enzymes}
          onEnzymesChange={setEnzymes}
        />
        {renderMetrics && (
          <span className="file-name">
            Render: {renderMetrics.duration.toFixed(0)}ms ({backend})
          </span>
        )}
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

      <div className="app-body">
        <div className="main-content">
          {parsedSequence ? (
            <>
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
        </Sidebar>
      </div>
    </div>
  );
}

export default App;
