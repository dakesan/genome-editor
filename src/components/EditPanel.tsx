// Panel for editing the loaded DNA sequence (insert, delete, replace).

import { useCallback, useState } from "react";
import { useGenomeStore } from "../store";
import { validateBases } from "../utils/sequenceEdit";

export function EditPanel() {
  const selection = useGenomeStore((s) => s.selection);
  const parsedSequence = useGenomeStore((s) => s.parsedSequence);
  const isDirty = useGenomeStore((s) => s.isDirty);
  const applySequenceEdit = useGenomeStore((s) => s.applySequenceEdit);
  const undo = useGenomeStore((s) => s.undo);
  const redo = useGenomeStore((s) => s.redo);
  const editHistory = useGenomeStore((s) => s.editHistory);
  const editHistoryIndex = useGenomeStore((s) => s.editHistoryIndex);

  const [insertBases, setInsertBases] = useState("");
  const [replaceBases, setReplaceBases] = useState("");

  const hasSelection = selection != null && selection.start != null && selection.end != null;
  const selStart = hasSelection ? (selection.start as number) : 0;
  const selEnd = hasSelection ? (selection.end as number) : 0;
  const selectionStart = Math.min(selStart, selEnd);
  const selectionEnd = Math.max(selStart, selEnd);
  const selectionLength = selectionEnd - selectionStart;

  const insertValid = insertBases.length > 0 && validateBases(insertBases);
  const replaceValid = replaceBases.length > 0 && validateBases(replaceBases);

  const canUndo = editHistory.length > 0 && editHistoryIndex >= 0;
  const canRedo = editHistory.length > 0 && editHistoryIndex + 2 < editHistory.length;

  const handleInsertBefore = useCallback(() => {
    if (!hasSelection || !insertValid) return;
    applySequenceEdit({
      type: "insert",
      position: selectionStart,
      insertedBases: insertBases.toUpperCase(),
    });
    setInsertBases("");
  }, [hasSelection, insertValid, applySequenceEdit, selectionStart, insertBases]);

  const handleInsertAfter = useCallback(() => {
    if (!hasSelection || !insertValid) return;
    applySequenceEdit({
      type: "insert",
      position: selectionEnd,
      insertedBases: insertBases.toUpperCase(),
    });
    setInsertBases("");
  }, [hasSelection, insertValid, applySequenceEdit, selectionEnd, insertBases]);

  const handleDelete = useCallback(() => {
    if (!hasSelection || selectionLength === 0) return;
    applySequenceEdit({
      type: "delete",
      position: selectionStart,
      deletedCount: selectionLength,
    });
  }, [hasSelection, selectionLength, applySequenceEdit, selectionStart]);

  const handleReplace = useCallback(() => {
    if (!hasSelection || selectionLength === 0 || !replaceValid) return;
    applySequenceEdit({
      type: "replace",
      position: selectionStart,
      deletedCount: selectionLength,
      insertedBases: replaceBases.toUpperCase(),
    });
    setReplaceBases("");
  }, [
    hasSelection,
    selectionLength,
    replaceValid,
    applySequenceEdit,
    selectionStart,
    replaceBases,
  ]);

  if (!parsedSequence) return null;

  return (
    <div className="edit-panel">
      <h3>Edit {isDirty && <span className="edit-dirty-indicator">*</span>}</h3>

      <div className="edit-section">
        <div className="edit-section-label">Insert</div>
        <input
          type="text"
          className="edit-input"
          placeholder="Bases (A/T/G/C/N)"
          value={insertBases}
          onChange={(e) => setInsertBases(e.target.value)}
          spellCheck={false}
        />
        {insertBases.length > 0 && !validateBases(insertBases) && (
          <div className="edit-validation-error">Invalid bases (A/T/G/C/N only)</div>
        )}
        <div className="edit-button-row">
          <button
            type="button"
            disabled={!hasSelection || !insertValid}
            onClick={handleInsertBefore}
          >
            Before
          </button>
          <button
            type="button"
            disabled={!hasSelection || !insertValid}
            onClick={handleInsertAfter}
          >
            After
          </button>
        </div>
      </div>

      <div className="edit-section">
        <div className="edit-section-label">
          Delete {hasSelection && selectionLength > 0 && `(${selectionLength} bp)`}
        </div>
        <button
          type="button"
          className="edit-delete-btn"
          disabled={!hasSelection || selectionLength === 0}
          onClick={handleDelete}
        >
          Delete Selection
        </button>
      </div>

      <div className="edit-section">
        <div className="edit-section-label">Replace</div>
        <input
          type="text"
          className="edit-input"
          placeholder="New bases (A/T/G/C/N)"
          value={replaceBases}
          onChange={(e) => setReplaceBases(e.target.value)}
          spellCheck={false}
        />
        {replaceBases.length > 0 && !validateBases(replaceBases) && (
          <div className="edit-validation-error">Invalid bases (A/T/G/C/N only)</div>
        )}
        <button
          type="button"
          disabled={!hasSelection || selectionLength === 0 || !replaceValid}
          onClick={handleReplace}
        >
          Replace
        </button>
      </div>

      <div className="edit-section edit-undo-redo">
        <button type="button" disabled={!canUndo} onClick={undo} title="Undo (Cmd+Z)">
          Undo
        </button>
        <button type="button" disabled={!canRedo} onClick={redo} title="Redo (Cmd+Shift+Z)">
          Redo
        </button>
      </div>
    </div>
  );
}
