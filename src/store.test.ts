import { useGenomeStore } from "./store";
import type { SeqSelection } from "./types/selection";

describe("useGenomeStore", () => {
  beforeEach(() => {
    useGenomeStore.getState().reset();
  });

  it("has correct initial state", () => {
    const state = useGenomeStore.getState();
    expect(state.parsedSequence).toBeNull();
    expect(state.fileName).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.backend).toBe("js");
    expect(state.viewerType).toBe("both");
    expect(state.enzymes).toEqual(["EcoRI"]);
    expect(state.cutSites).toEqual([]);
    expect(state.cutSitesLoading).toBe(false);
    expect(state.orfs).toEqual([]);
    expect(state.sidebarOpen).toBe(false);
    expect(state.selection).toBeNull();
    expect(state.editHistory).toEqual([]);
    expect(state.editHistoryIndex).toBe(-1);
    expect(state.isDirty).toBe(false);
  });

  it("setParsedSequence updates state", () => {
    const seq = { name: "test", seq: "ATGC", annotations: [] };
    useGenomeStore.getState().setParsedSequence(seq);
    expect(useGenomeStore.getState().parsedSequence).toEqual(seq);
  });

  it("setFileName updates state", () => {
    useGenomeStore.getState().setFileName("test.gb");
    expect(useGenomeStore.getState().fileName).toBe("test.gb");
  });

  it("setViewerType updates state", () => {
    useGenomeStore.getState().setViewerType("linear");
    expect(useGenomeStore.getState().viewerType).toBe("linear");
  });

  it("setEnzymes updates state", () => {
    useGenomeStore.getState().setEnzymes(["EcoRI", "BamHI"]);
    expect(useGenomeStore.getState().enzymes).toEqual(["EcoRI", "BamHI"]);
  });

  it("toggleSidebar toggles between open and closed", () => {
    expect(useGenomeStore.getState().sidebarOpen).toBe(false);
    useGenomeStore.getState().toggleSidebar();
    expect(useGenomeStore.getState().sidebarOpen).toBe(true);
    useGenomeStore.getState().toggleSidebar();
    expect(useGenomeStore.getState().sidebarOpen).toBe(false);
  });

  it("setSidebarOpen sets explicit value", () => {
    useGenomeStore.getState().setSidebarOpen(true);
    expect(useGenomeStore.getState().sidebarOpen).toBe(true);
    useGenomeStore.getState().setSidebarOpen(false);
    expect(useGenomeStore.getState().sidebarOpen).toBe(false);
  });

  it("setSelection and clearSelection work", () => {
    const sel: SeqSelection = { type: "SEQ", start: 0, end: 10 };
    useGenomeStore.getState().setSelection(sel);
    expect(useGenomeStore.getState().selection).toEqual(sel);

    useGenomeStore.getState().clearSelection();
    expect(useGenomeStore.getState().selection).toBeNull();
  });

  it("setSearchQuery updates query and resets index", () => {
    useGenomeStore.getState().setSearchQuery("ATG");
    expect(useGenomeStore.getState().searchQuery).toBe("ATG");
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(0);
  });

  it("setSearchResults stores results and resets index", () => {
    const results = [
      { start: 0, end: 3, direction: 1 as const },
      { start: 10, end: 13, direction: 1 as const },
    ];
    useGenomeStore.getState().setSearchResults(results);
    expect(useGenomeStore.getState().searchResults).toEqual(results);
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(0);
  });

  it("nextSearchResult cycles through results", () => {
    useGenomeStore.getState().setSearchResults([
      { start: 0, end: 3, direction: 1 },
      { start: 10, end: 13, direction: 1 },
      { start: 20, end: 23, direction: 1 },
    ]);
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(0);
    useGenomeStore.getState().nextSearchResult();
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(1);
    useGenomeStore.getState().nextSearchResult();
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(2);
    useGenomeStore.getState().nextSearchResult();
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(0); // wraps
  });

  it("prevSearchResult cycles backwards", () => {
    useGenomeStore.getState().setSearchResults([
      { start: 0, end: 3, direction: 1 },
      { start: 10, end: 13, direction: 1 },
    ]);
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(0);
    useGenomeStore.getState().prevSearchResult();
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(1); // wraps to last
    useGenomeStore.getState().prevSearchResult();
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(0);
  });

  it("clearSearch resets all search state", () => {
    useGenomeStore.getState().setSearchQuery("ATG");
    useGenomeStore.getState().setSearchMismatch(2);
    useGenomeStore.getState().setSearchResults([{ start: 0, end: 3, direction: 1 }]);
    useGenomeStore.getState().clearSearch();
    expect(useGenomeStore.getState().searchQuery).toBe("");
    expect(useGenomeStore.getState().searchMismatch).toBe(0);
    expect(useGenomeStore.getState().searchResults).toEqual([]);
    expect(useGenomeStore.getState().searchCurrentIndex).toBe(0);
  });

  it("reset restores initial state", () => {
    useGenomeStore.getState().setParsedSequence({ name: "x", seq: "A", annotations: [] });
    useGenomeStore.getState().setFileName("x.gb");
    useGenomeStore.getState().setViewerType("linear");
    useGenomeStore.getState().setEnzymes(["BamHI"]);
    useGenomeStore.getState().setSidebarOpen(true);
    useGenomeStore.getState().setIsLoading(true);
    useGenomeStore.getState().setError("oops");

    useGenomeStore.getState().reset();

    const state = useGenomeStore.getState();
    expect(state.parsedSequence).toBeNull();
    expect(state.fileName).toBeNull();
    expect(state.viewerType).toBe("both");
    expect(state.enzymes).toEqual(["EcoRI"]);
    expect(state.sidebarOpen).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.editHistory).toEqual([]);
    expect(state.editHistoryIndex).toBe(-1);
    expect(state.isDirty).toBe(false);
  });

  describe("sequence editing", () => {
    const setupSequence = () => {
      useGenomeStore.getState().setParsedSequence({
        name: "test",
        seq: "ATGCATGC",
        annotations: [{ name: "gene1", start: 2, end: 6 }],
      });
    };

    it("applySequenceEdit inserts bases and updates annotations", () => {
      setupSequence();
      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 4,
        insertedBases: "NNN",
      });

      const state = useGenomeStore.getState();
      expect(state.parsedSequence?.seq).toBe("ATGCNNNATGC");
      expect(state.parsedSequence?.annotations[0].start).toBe(2);
      expect(state.parsedSequence?.annotations[0].end).toBe(9); // 6 + 3
      expect(state.isDirty).toBe(true);
      expect(state.editHistory).toHaveLength(1);
    });

    it("applySequenceEdit deletes bases", () => {
      setupSequence();
      useGenomeStore.getState().applySequenceEdit({
        type: "delete",
        position: 0,
        deletedCount: 2,
      });

      const state = useGenomeStore.getState();
      expect(state.parsedSequence?.seq).toBe("GCATGC");
      expect(state.parsedSequence?.annotations[0].start).toBe(0);
      expect(state.parsedSequence?.annotations[0].end).toBe(4);
    });

    it("applySequenceEdit replaces bases", () => {
      setupSequence();
      useGenomeStore.getState().applySequenceEdit({
        type: "replace",
        position: 0,
        deletedCount: 4,
        insertedBases: "CCCC",
      });

      const state = useGenomeStore.getState();
      expect(state.parsedSequence?.seq).toBe("CCCCATGC");
    });

    it("applySequenceEdit clears selection", () => {
      setupSequence();
      useGenomeStore.getState().setSelection({ type: "SEQ", start: 0, end: 4 });
      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "A",
      });
      expect(useGenomeStore.getState().selection).toBeNull();
    });

    it("does nothing when no parsedSequence is loaded", () => {
      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "A",
      });
      expect(useGenomeStore.getState().parsedSequence).toBeNull();
      expect(useGenomeStore.getState().isDirty).toBe(false);
    });

    it("undo restores previous state", () => {
      setupSequence();
      const originalSeq = useGenomeStore.getState().parsedSequence?.seq;

      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "NNN",
      });
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe("NNNATGCATGC");

      useGenomeStore.getState().undo();
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe(originalSeq);
    });

    it("redo restores undone state", () => {
      setupSequence();

      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "NNN",
      });
      const editedSeq = useGenomeStore.getState().parsedSequence?.seq;

      useGenomeStore.getState().undo();
      useGenomeStore.getState().redo();
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe(editedSeq);
    });

    it("undo does nothing when no history", () => {
      setupSequence();
      const originalSeq = useGenomeStore.getState().parsedSequence?.seq;
      useGenomeStore.getState().undo();
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe(originalSeq);
    });

    it("redo does nothing when no redo available", () => {
      setupSequence();
      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "A",
      });
      const currentSeq = useGenomeStore.getState().parsedSequence?.seq;
      useGenomeStore.getState().redo();
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe(currentSeq);
    });

    it("new edit after undo discards redo stack", () => {
      setupSequence();

      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "AAA",
      });
      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "BBB",
      });

      useGenomeStore.getState().undo();
      useGenomeStore.getState().undo();

      // Now make a new edit — redo should be impossible
      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "CCC",
      });

      useGenomeStore.getState().redo();
      // Should still have CCC at start (redo did nothing)
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe("CCCATGCATGC");
    });

    it("markClean sets isDirty to false", () => {
      setupSequence();
      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "A",
      });
      expect(useGenomeStore.getState().isDirty).toBe(true);
      useGenomeStore.getState().markClean();
      expect(useGenomeStore.getState().isDirty).toBe(false);
    });

    it("multiple undo/redo cycles work correctly", () => {
      setupSequence();

      // Edit 1
      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "A",
      });
      const seq1 = useGenomeStore.getState().parsedSequence?.seq;

      // Edit 2
      useGenomeStore.getState().applySequenceEdit({
        type: "insert",
        position: 0,
        insertedBases: "B",
      });
      const seq2 = useGenomeStore.getState().parsedSequence?.seq;

      // Undo back to edit 1
      useGenomeStore.getState().undo();
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe(seq1);

      // Redo to edit 2
      useGenomeStore.getState().redo();
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe(seq2);

      // Undo back to edit 1
      useGenomeStore.getState().undo();
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe(seq1);

      // Undo back to original
      useGenomeStore.getState().undo();
      expect(useGenomeStore.getState().parsedSequence?.seq).toBe("ATGCATGC");
    });
  });
});
