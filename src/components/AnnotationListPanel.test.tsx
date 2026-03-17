import { fireEvent, render, screen } from "@testing-library/react";
import { useGenomeStore } from "../store";
import { AnnotationListPanel } from "./AnnotationListPanel";

const sampleSequence = {
  name: "test",
  seq: "ATGCATGCATGCATGCATGC",
  annotations: [
    { name: "gene1", start: 0, end: 10, direction: 1, type: "gene" },
    { name: "promoter1", start: 5, end: 8, direction: 1, type: "promoter" },
    { name: "CDS1", start: 10, end: 18, direction: -1, type: "CDS" },
  ],
};

describe("AnnotationListPanel", () => {
  beforeEach(() => {
    useGenomeStore.getState().reset();
  });

  it("returns null when no sequence is loaded", () => {
    const { container } = render(<AnnotationListPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders annotation list", () => {
    useGenomeStore.getState().setParsedSequence(sampleSequence);
    render(<AnnotationListPanel />);

    expect(screen.getByText("Annotations (3)")).toBeInTheDocument();
    expect(screen.getByText("gene1")).toBeInTheDocument();
    expect(screen.getByText("promoter1")).toBeInTheDocument();
    expect(screen.getByText("CDS1")).toBeInTheDocument();
  });

  it("filters annotations by search text", () => {
    useGenomeStore.getState().setParsedSequence(sampleSequence);
    render(<AnnotationListPanel />);

    const searchInput = screen.getByPlaceholderText("Search annotations...");
    fireEvent.change(searchInput, { target: { value: "gene" } });

    expect(screen.getByText("gene1")).toBeInTheDocument();
    expect(screen.queryByText("CDS1")).not.toBeInTheDocument();
  });

  it("filters annotations by type", () => {
    useGenomeStore.getState().setParsedSequence(sampleSequence);
    render(<AnnotationListPanel />);

    const typeSelect = screen.getByDisplayValue("All types");
    fireEvent.change(typeSelect, { target: { value: "CDS" } });

    expect(screen.getByText("CDS1")).toBeInTheDocument();
    expect(screen.queryByText("gene1")).not.toBeInTheDocument();
    expect(screen.queryByText("promoter1")).not.toBeInTheDocument();
  });

  it("selects annotation on click", () => {
    useGenomeStore.getState().setParsedSequence(sampleSequence);
    render(<AnnotationListPanel />);

    fireEvent.click(screen.getByText("gene1"));

    const selection = useGenomeStore.getState().selection;
    expect(selection).not.toBeNull();
    expect(selection?.type).toBe("ANNOTATION");
    expect(selection?.start).toBe(0);
    expect(selection?.end).toBe(10);
  });

  it("shows add form with selection pre-filled", () => {
    useGenomeStore.getState().setParsedSequence(sampleSequence);
    useGenomeStore.getState().setSelection({ type: "SEQ", start: 5, end: 15 });
    render(<AnnotationListPanel />);

    fireEvent.click(screen.getByText("+ Add Annotation"));

    // Check that start/end inputs are pre-filled (1-based display)
    const startInput = screen.getByPlaceholderText("Start (1-based)");
    const endInput = screen.getByPlaceholderText("End");
    expect((startInput as HTMLInputElement).value).toBe("6");
    expect((endInput as HTMLInputElement).value).toBe("15");
  });

  it("adds a new annotation", () => {
    useGenomeStore.getState().setParsedSequence(sampleSequence);
    render(<AnnotationListPanel />);

    fireEvent.click(screen.getByText("+ Add Annotation"));

    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "newFeature" },
    });
    fireEvent.change(screen.getByPlaceholderText("Start (1-based)"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByPlaceholderText("End"), {
      target: { value: "5" },
    });

    fireEvent.click(screen.getByText("Add"));

    const annotations = useGenomeStore.getState().parsedSequence?.annotations;
    expect(annotations).toHaveLength(4);
    expect(annotations?.[3].name).toBe("newFeature");
  });

  it("deletes an annotation", () => {
    useGenomeStore.getState().setParsedSequence(sampleSequence);
    render(<AnnotationListPanel />);

    const deleteButtons = screen.getAllByTitle("Delete annotation");
    fireEvent.click(deleteButtons[0]);

    const annotations = useGenomeStore.getState().parsedSequence?.annotations;
    expect(annotations).toHaveLength(2);
    expect(annotations?.[0].name).toBe("promoter1");
  });

  it("shows empty message when no annotations", () => {
    useGenomeStore.getState().setParsedSequence({
      name: "test",
      seq: "ATGC",
      annotations: [],
    });
    render(<AnnotationListPanel />);

    expect(screen.getByText("No annotations")).toBeInTheDocument();
  });

  it("shows no matching message when filter has no results", () => {
    useGenomeStore.getState().setParsedSequence(sampleSequence);
    render(<AnnotationListPanel />);

    const searchInput = screen.getByPlaceholderText("Search annotations...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.getByText("No matching annotations")).toBeInTheDocument();
  });
});
