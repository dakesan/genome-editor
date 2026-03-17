import { render, screen } from "@testing-library/react";
import App from "./App";
import { useGenomeStore } from "./store";

describe("App", () => {
  beforeEach(() => {
    useGenomeStore.getState().reset();
  });

  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it("displays the app title", () => {
    render(<App />);
    expect(screen.getByText("Genome Editor")).toBeInTheDocument();
  });

  it("shows the file loader button", () => {
    render(<App />);
    expect(screen.getByText("Load GenBank/FASTA File")).toBeInTheDocument();
  });

  it("shows the initial status message", () => {
    render(<App />);
    expect(screen.getByText("Load a GenBank or FASTA file to get started")).toBeInTheDocument();
  });
});
