import { render, screen } from "@testing-library/react";
import type { SeqSelection } from "../types/selection";
import type { ParsedSequence } from "../types/sequence";
import { SelectionInfoPanel } from "./SelectionInfoPanel";

const mockSequence: ParsedSequence = {
  name: "test",
  seq: "ATGCGATCGATCGATCG",
  annotations: [],
};

describe("SelectionInfoPanel", () => {
  it("shows default message when no selection", () => {
    render(<SelectionInfoPanel selection={null} sequence={null} />);
    expect(
      screen.getByText("Click or drag on the sequence to select a region"),
    ).toBeInTheDocument();
  });

  it("shows position and length for SEQ selection", () => {
    const selection: SeqSelection = {
      type: "SEQ",
      start: 2,
      end: 8,
    };
    render(<SelectionInfoPanel selection={selection} sequence={mockSequence} />);
    expect(screen.getByText("3..8")).toBeInTheDocument(); // 1-based
    expect(screen.getByText("6 bp")).toBeInTheDocument();
  });

  it("shows sequence excerpt", () => {
    const selection: SeqSelection = {
      type: "SEQ",
      start: 0,
      end: 4,
    };
    render(<SelectionInfoPanel selection={selection} sequence={mockSequence} />);
    expect(screen.getByText("ATGC")).toBeInTheDocument();
  });

  it("shows name for ANNOTATION selection", () => {
    const selection: SeqSelection = {
      type: "ANNOTATION",
      name: "lacZ",
      start: 0,
      end: 10,
      direction: 1,
    };
    render(<SelectionInfoPanel selection={selection} sequence={mockSequence} />);
    expect(screen.getByText("lacZ")).toBeInTheDocument();
    expect(screen.getByText("ANNOTATION")).toBeInTheDocument();
  });

  it("shows direction for forward strand", () => {
    const selection: SeqSelection = {
      type: "ANNOTATION",
      start: 0,
      end: 5,
      direction: 1,
    };
    render(<SelectionInfoPanel selection={selection} sequence={mockSequence} />);
    expect(screen.getByText("5' → 3'")).toBeInTheDocument();
  });

  it("shows direction for reverse strand", () => {
    const selection: SeqSelection = {
      type: "ANNOTATION",
      start: 0,
      end: 5,
      direction: -1,
    };
    render(<SelectionInfoPanel selection={selection} sequence={mockSequence} />);
    expect(screen.getByText("3' → 5'")).toBeInTheDocument();
  });

  it("truncates long sequences with ellipsis", () => {
    const longSeq: ParsedSequence = {
      name: "long",
      seq: "A".repeat(200),
      annotations: [],
    };
    const selection: SeqSelection = {
      type: "SEQ",
      start: 0,
      end: 150,
    };
    render(<SelectionInfoPanel selection={selection} sequence={longSeq} />);
    // Should show first 100 chars + "..."
    expect(screen.getByText(`${"A".repeat(100)}...`)).toBeInTheDocument();
  });
});
