// Panel for viewing, filtering, and adding sequence annotations.

import { useCallback, useMemo, useState } from "react";
import { useGenomeStore } from "../store";
import type { SequenceAnnotation } from "../types/sequence";

const ANNOTATION_TYPES = [
  "CDS",
  "gene",
  "promoter",
  "terminator",
  "rep_origin",
  "misc_feature",
  "primer_bind",
  "source",
] as const;

interface AnnotationAddFormState {
  name: string;
  type: string;
  start: string;
  end: string;
  direction: number;
}

const emptyForm: AnnotationAddFormState = {
  name: "",
  type: "misc_feature",
  start: "",
  end: "",
  direction: 1,
};

export function AnnotationListPanel() {
  const parsedSequence = useGenomeStore((s) => s.parsedSequence);
  const selection = useGenomeStore((s) => s.selection);
  const setSelection = useGenomeStore((s) => s.setSelection);
  const applySequenceEdit = useGenomeStore((s) => s.applySequenceEdit);
  const setParsedSequence = useGenomeStore((s) => s.setParsedSequence);

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AnnotationAddFormState>(emptyForm);

  const annotations = parsedSequence?.annotations ?? [];

  // Filter annotations by search text and type
  const filteredAnnotations = useMemo(() => {
    return annotations.filter((ann) => {
      const matchesSearch =
        !searchText || ann.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = !typeFilter || ann.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [annotations, searchText, typeFilter]);

  // Get unique annotation types for the filter dropdown
  const uniqueTypes = useMemo(() => {
    const types = new Set(annotations.map((a) => a.type).filter(Boolean));
    return Array.from(types).sort();
  }, [annotations]);

  // Click annotation to select it on the viewer
  const handleAnnotationClick = useCallback(
    (ann: SequenceAnnotation) => {
      setSelection({
        type: "ANNOTATION",
        start: ann.start,
        end: ann.end,
        name: ann.name,
        direction: ann.direction,
      });
    },
    [setSelection],
  );

  // Pre-fill start/end from current selection when opening add form
  const handleShowAddForm = useCallback(() => {
    if (selection?.start != null && selection?.end != null) {
      const start = Math.min(selection.start, selection.end);
      const end = Math.max(selection.start, selection.end);
      setForm({ ...emptyForm, start: String(start + 1), end: String(end) });
    } else {
      setForm(emptyForm);
    }
    setShowAddForm(true);
  }, [selection]);

  // Add a new annotation
  const handleAddAnnotation = useCallback(() => {
    if (!parsedSequence) return;

    const startVal = Number.parseInt(form.start, 10) - 1; // Convert 1-based to 0-based
    const endVal = Number.parseInt(form.end, 10);

    if (
      !form.name.trim() ||
      Number.isNaN(startVal) ||
      Number.isNaN(endVal) ||
      startVal < 0 ||
      endVal <= startVal ||
      endVal > parsedSequence.seq.length
    ) {
      return;
    }

    const newAnnotation: SequenceAnnotation = {
      name: form.name.trim(),
      start: startVal,
      end: endVal,
      direction: form.direction,
      type: form.type,
    };

    // Push current state to history via a no-op edit, then update annotations directly
    // We use a zero-length insert to create a history entry, then update annotations
    applySequenceEdit({ type: "insert", position: 0, insertedBases: "" });

    // Since the no-op edit doesn't change sequence, we need to update parsedSequence directly
    setParsedSequence({
      ...parsedSequence,
      annotations: [...parsedSequence.annotations, newAnnotation],
    });

    setForm(emptyForm);
    setShowAddForm(false);
  }, [parsedSequence, form, applySequenceEdit, setParsedSequence]);

  // Delete an annotation
  const handleDeleteAnnotation = useCallback(
    (index: number) => {
      if (!parsedSequence) return;

      // Push current state to history
      applySequenceEdit({ type: "insert", position: 0, insertedBases: "" });

      setParsedSequence({
        ...parsedSequence,
        annotations: parsedSequence.annotations.filter((_, i) => i !== index),
      });
    },
    [parsedSequence, applySequenceEdit, setParsedSequence],
  );

  if (!parsedSequence) return null;

  return (
    <div className="annotation-list-panel">
      <h3>Annotations ({annotations.length})</h3>

      <div className="annotation-filters">
        <input
          type="text"
          className="annotation-search-input"
          placeholder="Search annotations..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select
          className="annotation-type-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="annotation-list">
        {filteredAnnotations.length === 0 ? (
          <p className="annotation-empty">
            {annotations.length === 0 ? "No annotations" : "No matching annotations"}
          </p>
        ) : (
          filteredAnnotations.map((ann) => {
            const originalIndex = annotations.indexOf(ann);
            return (
              <button
                type="button"
                key={`${ann.name}-${ann.start}-${ann.end}`}
                className="annotation-item"
                onClick={() => handleAnnotationClick(ann)}
              >
                <div className="annotation-item-header">
                  <span className="annotation-name">{ann.name}</span>
                  <button
                    type="button"
                    className="annotation-delete-btn"
                    title="Delete annotation"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnnotation(originalIndex);
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="annotation-item-details">
                  <span className="annotation-type-badge">{ann.type || "misc"}</span>
                  <span>
                    {ann.start + 1}..{ann.end}
                  </span>
                  <span>{ann.direction === 1 ? "→" : ann.direction === -1 ? "←" : "↔"}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {!showAddForm ? (
        <button type="button" className="annotation-add-btn" onClick={handleShowAddForm}>
          + Add Annotation
        </button>
      ) : (
        <div className="annotation-add-form">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {ANNOTATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="annotation-position-row">
            <input
              type="number"
              placeholder="Start (1-based)"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
            <input
              type="number"
              placeholder="End"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </div>
          <select
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: Number(e.target.value) })}
          >
            <option value={1}>Forward (5'→3')</option>
            <option value={-1}>Reverse (3'→5')</option>
            <option value={0}>Both</option>
          </select>
          <div className="annotation-form-actions">
            <button type="button" onClick={handleAddAnnotation}>
              Add
            </button>
            <button type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
