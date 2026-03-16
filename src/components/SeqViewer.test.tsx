import { fireEvent, render, screen } from "@testing-library/react";
import type { ParsedSequence } from "../types/sequence";
import { SeqViewer } from "./SeqViewer";
import { ViewerControls } from "./ViewerControls";

// Mock SeqViz to avoid rendering the full SVG-based viewer in jsdom
vi.mock("seqviz", () => ({
  SeqViz: (props: Record<string, unknown>) => (
    <div
      data-testid="seqviz"
      data-name={props.name}
      data-seq={props.seq}
      data-viewer={props.viewer}
      data-enzymes={JSON.stringify(props.enzymes)}
      data-annotations={JSON.stringify(props.annotations)}
    />
  ),
}));

const sampleSequence: ParsedSequence = {
  name: "pUC19",
  seq: "ATCGATCGATCG",
  annotations: [
    { name: "Promoter", start: 0, end: 5, direction: 1, color: "#8FBC8F", type: "promoter" },
    { name: "Terminator", start: 8, end: 12, direction: -1, type: "terminator" },
  ],
};

describe("SeqViewer", () => {
  it("renders without crashing with a sample sequence", () => {
    const { container } = render(
      <SeqViewer sequence={sampleSequence} viewerType="both" enzymes={[]} />,
    );
    expect(container).toBeTruthy();
    expect(screen.getByTestId("seqviz")).toBeInTheDocument();
  });

  it("passes sequence name and seq to SeqViz", () => {
    render(<SeqViewer sequence={sampleSequence} viewerType="both" enzymes={[]} />);

    const seqviz = screen.getByTestId("seqviz");
    expect(seqviz).toHaveAttribute("data-name", "pUC19");
    expect(seqviz).toHaveAttribute("data-seq", "ATCGATCGATCG");
  });

  it("passes annotations to SeqViz correctly", () => {
    render(<SeqViewer sequence={sampleSequence} viewerType="circular" enzymes={[]} />);

    const seqviz = screen.getByTestId("seqviz");
    const annotations = JSON.parse(seqviz.getAttribute("data-annotations") || "[]");
    expect(annotations).toHaveLength(2);
    expect(annotations[0]).toMatchObject({
      name: "Promoter",
      start: 0,
      end: 5,
      direction: 1,
    });
    expect(annotations[1]).toMatchObject({
      name: "Terminator",
      start: 8,
      end: 12,
      direction: -1,
    });
  });

  it("passes viewer type to SeqViz", () => {
    render(<SeqViewer sequence={sampleSequence} viewerType="linear" enzymes={[]} />);

    const seqviz = screen.getByTestId("seqviz");
    expect(seqviz).toHaveAttribute("data-viewer", "linear");
  });

  it("passes enzymes to SeqViz correctly", () => {
    const enzymes = ["EcoRI", "BamHI"];
    render(<SeqViewer sequence={sampleSequence} viewerType="both" enzymes={enzymes} />);

    const seqviz = screen.getByTestId("seqviz");
    const passedEnzymes = JSON.parse(seqviz.getAttribute("data-enzymes") || "[]");
    expect(passedEnzymes).toEqual(["EcoRI", "BamHI"]);
  });

  it("passes empty enzymes array when no enzymes selected", () => {
    render(<SeqViewer sequence={sampleSequence} viewerType="both" enzymes={[]} />);

    const seqviz = screen.getByTestId("seqviz");
    const passedEnzymes = JSON.parse(seqviz.getAttribute("data-enzymes") || "[]");
    expect(passedEnzymes).toEqual([]);
  });
});

describe("ViewerControls", () => {
  it("renders viewer type select with correct value", () => {
    render(
      <ViewerControls
        viewerType="both"
        onViewerTypeChange={() => {}}
        selectedEnzymes={[]}
        onEnzymesChange={() => {}}
      />,
    );

    const select = screen.getByLabelText("View:");
    expect(select).toHaveValue("both");
  });

  it("calls onViewerTypeChange when select changes", () => {
    const onViewerTypeChange = vi.fn();
    render(
      <ViewerControls
        viewerType="both"
        onViewerTypeChange={onViewerTypeChange}
        selectedEnzymes={[]}
        onEnzymesChange={() => {}}
      />,
    );

    const select = screen.getByLabelText("View:");
    fireEvent.change(select, { target: { value: "linear" } });
    expect(onViewerTypeChange).toHaveBeenCalledWith("linear");
  });

  it("renders all enzyme buttons", () => {
    render(
      <ViewerControls
        viewerType="both"
        onViewerTypeChange={() => {}}
        selectedEnzymes={[]}
        onEnzymesChange={() => {}}
      />,
    );

    const expectedEnzymes = ["EcoRI", "BamHI", "PstI", "HindIII", "XbaI", "SalI", "SphI", "NotI"];
    for (const enzyme of expectedEnzymes) {
      expect(screen.getByText(enzyme)).toBeInTheDocument();
    }
  });

  it("highlights selected enzyme buttons with active class", () => {
    render(
      <ViewerControls
        viewerType="both"
        onViewerTypeChange={() => {}}
        selectedEnzymes={["EcoRI", "BamHI"]}
        onEnzymesChange={() => {}}
      />,
    );

    expect(screen.getByText("EcoRI")).toHaveClass("active");
    expect(screen.getByText("BamHI")).toHaveClass("active");
    expect(screen.getByText("PstI")).not.toHaveClass("active");
  });

  it("calls onEnzymesChange to add enzyme when unselected enzyme is clicked", () => {
    const onEnzymesChange = vi.fn();
    render(
      <ViewerControls
        viewerType="both"
        onViewerTypeChange={() => {}}
        selectedEnzymes={["EcoRI"]}
        onEnzymesChange={onEnzymesChange}
      />,
    );

    fireEvent.click(screen.getByText("BamHI"));
    expect(onEnzymesChange).toHaveBeenCalledWith(["EcoRI", "BamHI"]);
  });

  it("calls onEnzymesChange to remove enzyme when selected enzyme is clicked", () => {
    const onEnzymesChange = vi.fn();
    render(
      <ViewerControls
        viewerType="both"
        onViewerTypeChange={() => {}}
        selectedEnzymes={["EcoRI", "BamHI"]}
        onEnzymesChange={onEnzymesChange}
      />,
    );

    fireEvent.click(screen.getByText("EcoRI"));
    expect(onEnzymesChange).toHaveBeenCalledWith(["BamHI"]);
  });
});
