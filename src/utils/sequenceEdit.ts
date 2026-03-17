// Pure functions for sequence editing operations.

import type { SequenceAnnotation } from "../types/sequence";

export interface SequenceEdit {
  type: "insert" | "delete" | "replace";
  position: number; // 0-based index
  insertedBases?: string; // For insert/replace
  deletedCount?: number; // For delete/replace
}

const VALID_BASES = /^[ATGCNatgcn]*$/;

/** Validate that a string contains only valid DNA bases (A/T/G/C/N). */
export function validateBases(bases: string): boolean {
  return VALID_BASES.test(bases);
}

/** Apply a sequence edit to a DNA string. */
export function applyEdit(seq: string, edit: SequenceEdit): string {
  const { type, position } = edit;
  const pos = Math.max(0, Math.min(position, seq.length));

  switch (type) {
    case "insert": {
      const bases = edit.insertedBases ?? "";
      return seq.slice(0, pos) + bases + seq.slice(pos);
    }
    case "delete": {
      const count = edit.deletedCount ?? 0;
      return seq.slice(0, pos) + seq.slice(pos + count);
    }
    case "replace": {
      const count = edit.deletedCount ?? 0;
      const bases = edit.insertedBases ?? "";
      return seq.slice(0, pos) + bases + seq.slice(pos + count);
    }
  }
}

/**
 * Adjust annotations after a sequence edit.
 *
 * Rules:
 * - Insert: annotations starting at or after the insert position shift right.
 *   Annotations that span the insert position are expanded.
 * - Delete: annotations fully within the deleted range are removed.
 *   Annotations partially overlapping are shrunk. Annotations after the
 *   deleted range shift left.
 * - Replace: treated as delete + insert (delta = insertedLength - deletedCount).
 */
export function adjustAnnotations(
  annotations: SequenceAnnotation[],
  edit: SequenceEdit,
): SequenceAnnotation[] {
  switch (edit.type) {
    case "insert":
      return adjustForInsert(annotations, edit.position, (edit.insertedBases ?? "").length);
    case "delete":
      return adjustForDelete(annotations, edit.position, edit.deletedCount ?? 0);
    case "replace":
      return adjustForReplace(
        annotations,
        edit.position,
        edit.deletedCount ?? 0,
        (edit.insertedBases ?? "").length,
      );
  }
}

function adjustForInsert(
  annotations: SequenceAnnotation[],
  position: number,
  insertLength: number,
): SequenceAnnotation[] {
  if (insertLength === 0) return annotations;

  return annotations.map((ann) => {
    // Annotation is entirely before the insert position — no change
    if (ann.end <= position) return ann;

    // Annotation starts at or after the insert position — shift both
    if (ann.start >= position) {
      return { ...ann, start: ann.start + insertLength, end: ann.end + insertLength };
    }

    // Annotation spans the insert position — expand end only
    return { ...ann, end: ann.end + insertLength };
  });
}

function adjustForDelete(
  annotations: SequenceAnnotation[],
  position: number,
  deleteCount: number,
): SequenceAnnotation[] {
  if (deleteCount === 0) return annotations;

  const deleteEnd = position + deleteCount;
  const result: SequenceAnnotation[] = [];

  for (const ann of annotations) {
    // Annotation is entirely before the deleted range — no change
    if (ann.end <= position) {
      result.push(ann);
      continue;
    }

    // Annotation is entirely after the deleted range — shift left
    if (ann.start >= deleteEnd) {
      result.push({ ...ann, start: ann.start - deleteCount, end: ann.end - deleteCount });
      continue;
    }

    // Annotation is fully contained within the deleted range — remove
    if (ann.start >= position && ann.end <= deleteEnd) {
      continue;
    }

    // Partial overlap: annotation starts before delete range
    if (ann.start < position && ann.end <= deleteEnd) {
      result.push({ ...ann, end: position });
      continue;
    }

    // Partial overlap: annotation starts within delete range, ends after
    if (ann.start >= position && ann.start < deleteEnd && ann.end > deleteEnd) {
      result.push({ ...ann, start: position, end: ann.end - deleteCount });
      continue;
    }

    // Annotation fully contains the deleted range — shrink
    if (ann.start < position && ann.end > deleteEnd) {
      result.push({ ...ann, end: ann.end - deleteCount });
    }
  }

  return result;
}

function adjustForReplace(
  annotations: SequenceAnnotation[],
  position: number,
  deleteCount: number,
  insertLength: number,
): SequenceAnnotation[] {
  // Replace = delete then insert at same position
  const afterDelete = adjustForDelete(annotations, position, deleteCount);
  return adjustForInsert(afterDelete, position, insertLength);
}
