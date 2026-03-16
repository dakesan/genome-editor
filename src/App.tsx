import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { getBackend } from "./backend";
import { CutSiteList } from "./components/CutSiteList";
import { FileLoader } from "./components/FileLoader";
import { SeqViewer } from "./components/SeqViewer";
import { ViewerControls } from "./components/ViewerControls";
import { useEnzymes } from "./hooks/useEnzymes";
import { useGenBankParser } from "./hooks/useGenBankParser";
import { useOrfs } from "./hooks/useOrfs";
import { usePerformance } from "./hooks/usePerformance";
import { useTheme } from "./hooks/useTheme";
import type { ViewerType } from "./types/sequence";
import { reportWebVitals } from "./utils/performance";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const { parsedSequence, isLoading, error, parseFile, backend } = useGenBankParser();
  const [viewerType, setViewerType] = useState<ViewerType>("both");
  const [enzymes, setEnzymes] = useState<string[]>(["EcoRI"]);
  const [fileName, setFileName] = useState<string | null>(null);

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

  const handleFileLoad = useCallback(
    async (content: string, name: string) => {
      setFileName(name);
      startMeasure();
      await parseFile(content);
    },
    [parseFile, startMeasure],
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
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
        </button>
      </header>

      {error && <div className="app-error">Error: {error}</div>}

      {parsedSequence ? (
        <>
          <SeqViewer
            sequence={parsedSequence}
            viewerType={viewerType}
            enzymes={enzymes}
            translations={translations}
          />
          <CutSiteList cutSites={cutSites} isLoading={cutSitesLoading} />
        </>
      ) : (
        <div className="app-status">
          {isLoading ? "Parsing sequence..." : "Load a GenBank or FASTA file to get started"}
        </div>
      )}
    </div>
  );
}

export default App;
