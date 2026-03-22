import { useEffect, useRef, useState } from "react";
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
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleEnzymeToggle = (enzyme: string) => {
    if (selectedEnzymes.includes(enzyme)) {
      onEnzymesChange(selectedEnzymes.filter((e) => e !== enzyme));
    } else {
      onEnzymesChange([...selectedEnzymes, enzyme]);
    }
  };

  const handleSelectAll = () => {
    onEnzymesChange([...AVAILABLE_ENZYMES]);
  };

  const handleClearAll = () => {
    onEnzymesChange([]);
  };

  // Close popup on outside click
  useEffect(() => {
    if (!showPopup) return;
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPopup]);

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
      <div className="control-group enzyme-control">
        <button
          ref={btnRef}
          type="button"
          className={`enzyme-trigger${selectedEnzymes.length > 0 ? " has-selection" : ""}`}
          onClick={() => setShowPopup((v) => !v)}
        >
          Enzymes{selectedEnzymes.length > 0 ? ` (${selectedEnzymes.length})` : ""}
        </button>
        {showPopup && (
          <div ref={popupRef} className="enzyme-popup">
            <div className="enzyme-popup-header">Restriction Enzymes</div>
            <div className="enzyme-popup-list">
              {AVAILABLE_ENZYMES.map((enzyme) => (
                <label key={enzyme} className="enzyme-popup-item">
                  <input
                    type="checkbox"
                    checked={selectedEnzymes.includes(enzyme)}
                    onChange={() => handleEnzymeToggle(enzyme)}
                  />
                  {enzyme}
                </label>
              ))}
            </div>
            <div className="enzyme-popup-actions">
              <button type="button" className="enzyme-popup-action-btn" onClick={handleSelectAll}>
                Select All
              </button>
              <button type="button" className="enzyme-popup-action-btn" onClick={handleClearAll}>
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
