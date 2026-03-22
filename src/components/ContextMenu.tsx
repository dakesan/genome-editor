// Floating toolbar that appears above the selected sequence region.
// Shows actions like "Add Annotation" and "Delete Selection".

import { useCallback, useEffect, useRef, useState } from "react";
import { useGenomeStore } from "../store";
import type { SequenceAnnotation } from "../types/sequence";

const ANNOTATION_TYPES = [
  "CDS",
  "gene",
  "promoter",
  "terminator",
  "rep_origin",
  "misc_feature",
] as const;

export function ContextMenu() {
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [annotationName, setAnnotationName] = useState("");
  const [annotationType, setAnnotationType] = useState("misc_feature");
  const [annotationDirection, setAnnotationDirection] = useState(1);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const selection = useGenomeStore((s) => s.selection);
  const parsedSequence = useGenomeStore((s) => s.parsedSequence);
  const setParsedSequence = useGenomeStore((s) => s.setParsedSequence);
  const applySequenceEdit = useGenomeStore((s) => s.applySequenceEdit);

  const hasSelection =
    parsedSequence != null &&
    selection != null &&
    selection.start != null &&
    selection.end != null &&
    selection.start !== selection.end;

  const selStart = hasSelection ? Math.min(selection.start as number, selection.end as number) : 0;
  const selEnd = hasSelection ? Math.max(selection.start as number, selection.end as number) : 0;
  const selLength = selEnd - selStart;

  // Position the toolbar above the selection edge in the linear viewer.
  // Falls back to a fixed position if no selection edge is found.
  // biome-ignore lint/correctness/useExhaustiveDependencies: must reposition when selection range changes
  useEffect(() => {
    if (!hasSelection) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      // Find the first visible selection edge element
      const edge = document.querySelector(".la-vz-selection-edge");
      if (edge) {
        const rect = edge.getBoundingClientRect();
        const toolbarHeight = toolbarRef.current?.offsetHeight ?? 36;
        setPosition({
          top: rect.top - toolbarHeight - 8,
          left: Math.max(8, rect.left),
        });
      } else {
        // Fallback: center near top of the viewer
        const viewer = document.querySelector(".viewer-wrapper");
        if (viewer) {
          const vRect = viewer.getBoundingClientRect();
          setPosition({
            top: vRect.top + 8,
            left: vRect.left + vRect.width / 2 - 120,
          });
        }
      }
    };

    // Debounce initial positioning to let SeqViz render the selection
    const timer = setTimeout(updatePosition, 50);
    return () => clearTimeout(timer);
  }, [hasSelection, selStart, selEnd]);

  // Reset form when selection changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset must trigger on position change
  useEffect(() => {
    setShowAnnotationForm(false);
    setAnnotationName("");
  }, [selStart, selEnd]);

  // Focus name input when annotation form opens
  useEffect(() => {
    if (showAnnotationForm && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showAnnotationForm]);

  // Prevent right-click from clearing selection on the toolbar itself
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".selection-toolbar")) {
        e.preventDefault();
      }
    };
    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  }, []);

  const handleDeleteSelection = useCallback(() => {
    if (!hasSelection) return;
    applySequenceEdit({
      type: "delete",
      position: selStart,
      deletedCount: selLength,
    });
  }, [hasSelection, applySequenceEdit, selStart, selLength]);

  const handleSubmitAnnotation = useCallback(() => {
    if (!parsedSequence || !hasSelection || !annotationName.trim()) return;

    const newAnnotation: SequenceAnnotation = {
      name: annotationName.trim(),
      start: selStart,
      end: selEnd,
      direction: annotationDirection,
      type: annotationType,
    };

    // Create a history entry
    applySequenceEdit({ type: "insert", position: 0, insertedBases: "" });

    setParsedSequence({
      ...parsedSequence,
      annotations: [...parsedSequence.annotations, newAnnotation],
    });

    setAnnotationName("");
    setShowAnnotationForm(false);
  }, [
    parsedSequence,
    hasSelection,
    selStart,
    selEnd,
    annotationName,
    annotationType,
    annotationDirection,
    applySequenceEdit,
    setParsedSequence,
  ]);

  if (!hasSelection || !position) return null;

  return (
    <div
      ref={toolbarRef}
      className="selection-toolbar"
      style={{ top: position.top, left: position.left }}
    >
      <div className="selection-toolbar-info">
        {selStart + 1}..{selEnd} ({selLength} bp)
      </div>

      {!showAnnotationForm ? (
        <div className="selection-toolbar-actions">
          <button
            type="button"
            className="selection-toolbar-btn"
            onClick={() => setShowAnnotationForm(true)}
            title="Add annotation to selection"
          >
            + Annotation
          </button>
          <button
            type="button"
            className="selection-toolbar-btn selection-toolbar-btn-danger"
            onClick={handleDeleteSelection}
            title="Delete selected bases"
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="selection-toolbar-form">
          <input
            ref={nameInputRef}
            type="text"
            className="selection-toolbar-input"
            placeholder="Name"
            value={annotationName}
            onChange={(e) => setAnnotationName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && annotationName.trim()) {
                handleSubmitAnnotation();
              }
              if (e.key === "Escape") {
                setShowAnnotationForm(false);
              }
            }}
          />
          <select
            className="selection-toolbar-select"
            value={annotationType}
            onChange={(e) => setAnnotationType(e.target.value)}
          >
            {ANNOTATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="selection-toolbar-select"
            value={annotationDirection}
            onChange={(e) => setAnnotationDirection(Number(e.target.value))}
          >
            <option value={1}>Fwd</option>
            <option value={-1}>Rev</option>
            <option value={0}>Both</option>
          </select>
          <button
            type="button"
            className="selection-toolbar-btn"
            disabled={!annotationName.trim()}
            onClick={handleSubmitAnnotation}
          >
            Add
          </button>
          <button
            type="button"
            className="selection-toolbar-btn"
            onClick={() => setShowAnnotationForm(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
