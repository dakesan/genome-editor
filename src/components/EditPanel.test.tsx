import { fireEvent, render, screen } from "@testing-library/react";
import { useGenomeStore } from "../store";
import { EditPanel } from "./EditPanel";

describe("EditPanel", () => {
  beforeEach(() => {
    useGenomeStore.getState().reset();
  });

  it("returns null when no sequence is loaded", () => {
    const { container } = render(<EditPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when sequence is loaded", () => {
    useGenomeStore.getState().setParsedSequence({
      name: "test",
      seq: "ATGCATGC",
      annotations: [],
    });
    render(<EditPanel />);
    expect(screen.getByText("Insert")).toBeInTheDocument();
    expect(screen.getByText("Delete Selection")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
  });

  it("disables buttons when no selection", () => {
    useGenomeStore.getState().setParsedSequence({
      name: "test",
      seq: "ATGCATGC",
      annotations: [],
    });
    render(<EditPanel />);

    expect(screen.getByText("Before")).toBeDisabled();
    expect(screen.getByText("After")).toBeDisabled();
    expect(screen.getByText("Delete Selection")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Replace" })).toBeDisabled();
  });

  it("enables insert buttons when selection exists and valid bases entered", () => {
    useGenomeStore.getState().setParsedSequence({
      name: "test",
      seq: "ATGCATGC",
      annotations: [],
    });
    useGenomeStore.getState().setSelection({ type: "SEQ", start: 2, end: 5 });
    render(<EditPanel />);

    const input = screen.getAllByPlaceholderText(/Bases/)[0];
    fireEvent.change(input, { target: { value: "ATG" } });

    expect(screen.getByText("Before")).toBeEnabled();
    expect(screen.getByText("After")).toBeEnabled();
  });

  it("shows validation error for invalid bases", () => {
    useGenomeStore.getState().setParsedSequence({
      name: "test",
      seq: "ATGCATGC",
      annotations: [],
    });
    render(<EditPanel />);

    const input = screen.getAllByPlaceholderText(/Bases/)[0];
    fireEvent.change(input, { target: { value: "XYZ" } });

    expect(screen.getByText("Invalid bases (A/T/G/C/N only)")).toBeInTheDocument();
  });

  it("inserts bases before selection", () => {
    useGenomeStore.getState().setParsedSequence({
      name: "test",
      seq: "ATGCATGC",
      annotations: [],
    });
    useGenomeStore.getState().setSelection({ type: "SEQ", start: 4, end: 6 });
    render(<EditPanel />);

    const input = screen.getAllByPlaceholderText(/Bases/)[0];
    fireEvent.change(input, { target: { value: "NNN" } });
    fireEvent.click(screen.getByText("Before"));

    expect(useGenomeStore.getState().parsedSequence?.seq).toBe("ATGCNNNATGC");
  });

  it("deletes selected bases", () => {
    useGenomeStore.getState().setParsedSequence({
      name: "test",
      seq: "ATGCATGC",
      annotations: [],
    });
    useGenomeStore.getState().setSelection({ type: "SEQ", start: 0, end: 4 });
    render(<EditPanel />);

    fireEvent.click(screen.getByText("Delete Selection"));
    expect(useGenomeStore.getState().parsedSequence?.seq).toBe("ATGC");
  });

  it("shows dirty indicator after edit", () => {
    useGenomeStore.getState().setParsedSequence({
      name: "test",
      seq: "ATGCATGC",
      annotations: [],
    });
    useGenomeStore.getState().setSelection({ type: "SEQ", start: 0, end: 4 });

    render(<EditPanel />);
    fireEvent.click(screen.getByText("Delete Selection"));

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("undo and redo buttons respond to history state", () => {
    useGenomeStore.getState().setParsedSequence({
      name: "test",
      seq: "ATGCATGC",
      annotations: [],
    });
    render(<EditPanel />);

    // Initially both disabled
    expect(screen.getByTitle("Undo (Cmd+Z)")).toBeDisabled();
    expect(screen.getByTitle("Redo (Cmd+Shift+Z)")).toBeDisabled();
  });
});
