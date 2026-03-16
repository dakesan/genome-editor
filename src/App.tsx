import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { FileLoader } from "./components/FileLoader";
import { SeqViewer } from "./components/SeqViewer";
import { ViewerControls } from "./components/ViewerControls";
import { useGenBankParser } from "./hooks/useGenBankParser";
import { usePerformance } from "./hooks/usePerformance";
import type { ViewerType } from "./types/sequence";
import { reportWebVitals } from "./utils/performance";

function App() {
  const { parsedSequence, isLoading, error, parseFile } = useGenBankParser();
  const [viewerType, setViewerType] = useState<ViewerType>("both");
  const [enzymes, setEnzymes] = useState<string[]>(["EcoRI"]);
  const [fileName, setFileName] = useState<string | null>(null);

  const { renderMetrics, startMeasure, stopMeasure } = usePerformance("SeqViewer");

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
          <span className="file-name">Render: {renderMetrics.duration.toFixed(0)}ms</span>
        )}
      </header>

      {error && <div className="app-error">Error: {error}</div>}

      {parsedSequence ? (
        <SeqViewer sequence={parsedSequence} viewerType={viewerType} enzymes={enzymes} />
      ) : (
        <div className="app-status">
          {isLoading ? "Parsing sequence..." : "Load a GenBank or FASTA file to get started"}
        </div>
      )}
    </div>
  );
}

export default App;
