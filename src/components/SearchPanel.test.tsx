import { fireEvent, render, screen } from "@testing-library/react";
import { useGenomeStore } from "../store";
import { SearchPanel } from "./SearchPanel";

describe("SearchPanel", () => {
  beforeEach(() => {
    useGenomeStore.getState().reset();
  });

  it("renders search input", () => {
    render(<SearchPanel />);
    expect(screen.getByPlaceholderText(/Search sequence/)).toBeInTheDocument();
  });

  it("renders mismatch selector", () => {
    render(<SearchPanel />);
    expect(screen.getByLabelText("Mismatch:")).toBeInTheDocument();
  });

  it("does not show nav buttons when no query", () => {
    render(<SearchPanel />);
    expect(screen.queryByTitle("Next (Enter)")).not.toBeInTheDocument();
  });

  it("shows match count when search has results", () => {
    useGenomeStore.getState().setSearchQuery("ATG");
    useGenomeStore.getState().setSearchResults([
      { start: 0, end: 3, direction: 1 },
      { start: 10, end: 13, direction: 1 },
    ]);
    render(<SearchPanel />);
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("shows no matches message when query has no results", () => {
    useGenomeStore.getState().setSearchQuery("ZZZZZ");
    useGenomeStore.getState().setSearchResults([]);
    render(<SearchPanel />);
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("changes mismatch value", () => {
    render(<SearchPanel />);
    const select = screen.getByLabelText("Mismatch:");
    fireEvent.change(select, { target: { value: "2" } });
    expect(useGenomeStore.getState().searchMismatch).toBe(2);
  });

  it("clears search on clear button click", () => {
    useGenomeStore.getState().setSearchQuery("ATG");
    render(<SearchPanel />);
    const clearBtn = screen.getByTitle("Clear");
    fireEvent.click(clearBtn);
    expect(useGenomeStore.getState().searchQuery).toBe("");
  });
});
