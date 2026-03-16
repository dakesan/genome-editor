import type { ViewerType } from "../types/sequence";

const AVAILABLE_ENZYMES = ["EcoRI", "BamHI", "PstI", "HindIII", "XbaI", "SalI", "SphI", "NotI"];

interface ViewerControlsProps {
  viewerType: ViewerType;
  onViewerTypeChange: (type: ViewerType) => void;
  selectedEnzymes: string[];
  onEnzymesChange: (enzymes: string[]) => void;
}

export function ViewerControls({
  viewerType,
  onViewerTypeChange,
  selectedEnzymes,
  onEnzymesChange,
}: ViewerControlsProps) {
  const handleEnzymeToggle = (enzyme: string) => {
    if (selectedEnzymes.includes(enzyme)) {
      onEnzymesChange(selectedEnzymes.filter((e) => e !== enzyme));
    } else {
      onEnzymesChange([...selectedEnzymes, enzyme]);
    }
  };

  return (
    <div className="viewer-controls">
      <div className="control-group">
        <label htmlFor="viewer-type">View:</label>
        <select
          id="viewer-type"
          value={viewerType}
          onChange={(e) => onViewerTypeChange(e.target.value as ViewerType)}
        >
          <option value="both">Both</option>
          <option value="circular">Circular</option>
          <option value="linear">Linear</option>
          <option value="both_flip">Both (Flipped)</option>
        </select>
      </div>
      <div className="control-group">
        <span>Enzymes:</span>
        <div className="enzyme-buttons">
          {AVAILABLE_ENZYMES.map((enzyme) => (
            <button
              key={enzyme}
              type="button"
              className={selectedEnzymes.includes(enzyme) ? "active" : ""}
              onClick={() => handleEnzymeToggle(enzyme)}
            >
              {enzyme}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
