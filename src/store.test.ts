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
  });
});
