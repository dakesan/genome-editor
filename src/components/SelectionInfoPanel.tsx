// Panel displaying details about the currently selected region in the viewer.

import type { SeqSelection } from "../types/selection";
import type { ParsedSequence } from "../types/sequence";

interface SelectionInfoPanelProps {
  selection: SeqSelection | null;
  sequence: ParsedSequence | null;
}

function extractSequence(seq: string, start?: number, end?: number): string {
  if (start == null || end == null) return "";
  const slice = seq.slice(start, end);
  if (slice.length > 100) {
    return `${slice.slice(0, 100)}...`;
  }
  return slice;
}

function formatPosition(start?: number, end?: number): string {
  if (start == null || end == null) return "—";
  // Display as 1-based inclusive
  return `${start + 1}..${end}`;
}

function formatLength(start?: number, end?: number): string {
  if (start == null || end == null) return "—";
  return `${end - start} bp`;
}

export function SelectionInfoPanel({ selection, sequence }: SelectionInfoPanelProps) {
  if (!selection || !selection.type) {
    return (
      <div className="selection-info-panel">
        <h3>Selection</h3>
        <p className="selection-empty">Click or drag on the sequence to select a region</p>
      </div>
    );
  }

  const seq = sequence?.seq ?? "";

  return (
    <div className="selection-info-panel">
      <h3>Selection</h3>
      {selection.name && (
        <div className="selection-detail">
          <span className="label">Name: </span>
          <span className="value">{selection.name}</span>
        </div>
      )}
      <div className="selection-detail">
        <span className="label">Type: </span>
        <span className="value">{selection.type || "—"}</span>
      </div>
      <div className="selection-detail">
        <span className="label">Position: </span>
        <span className="value">{formatPosition(selection.start, selection.end)}</span>
      </div>
      <div className="selection-detail">
        <span className="label">Length: </span>
        <span className="value">{formatLength(selection.start, selection.end)}</span>
      </div>
      {selection.direction != null && selection.direction !== 0 && (
        <div className="selection-detail">
          <span className="label">Direction: </span>
          <span className="value">{selection.direction === 1 ? "5' → 3'" : "3' → 5'"}</span>
        </div>
      )}
      {seq && selection.start != null && selection.end != null && (
        <div className="selection-detail">
          <span className="label">Sequence: </span>
          <div className="selection-sequence">
            {extractSequence(seq, selection.start, selection.end)}
          </div>
        </div>
      )}
    </div>
  );
}
