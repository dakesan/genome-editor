import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { CutSiteList } from "./components/CutSiteList";
import { FileLoader } from "./components/FileLoader";
import { SeqViewer } from "./components/SeqViewer";
import { ViewerControls } from "./components/ViewerControls";
import { useEnzymes } from "./hooks/useEnzymes";
import { useGenBankParser } from "./hooks/useGenBankParser";
import { useOrfs } from "./hooks/useOrfs";
import { usePerformance } from "./hooks/usePerformance";
import type { ViewerType } from "./types/sequence";
import { reportWebVitals } from "./utils/performance";

function App() {
  const { parsedSequence, isLoading, error, parseFile, backend } = useGenBankParser();
  const [viewerType, setViewerType] = useState<ViewerType>("both");
  const [enzymes, setEnzymes] = useState<string[]>(["EcoRI"]);
  const [fileName, setFileName] = useState<string | null>(null);

  const { renderMetrics, startMeasure, stopMeasure } = usePerformance("SeqViewer");

  // WASM cut site detection.
  const {
    cutSites,
    isLoading: cutSitesLoading,
    availableEnzymes: _availableEnzymes,
  } = useEnzymes(parsedSequence?.seq ?? null, false, enzymes);

  // WASM ORF detection (minimum 100 amino acids).
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

  // Stop measurement after sequence is parsed and component re-renders
  useEffect(() => {
    if (parsedSequence && !isLoading) {
      // Wait for the next frame to capture actual render time
      requestAnimationFrame(() => {
        stopMeasure();
      });
    }
  }, [parsedSequence, isLoading, stopMeasure]);

  // Report web vitals on mount
  useEffect(() => {
    reportWebVitals();
  }, []);

  return (
    <div className="app">
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
