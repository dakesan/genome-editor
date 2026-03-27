// Input panel for Alignment Mode — FASTA sequence input and alignment trigger.

import { useCallback, useRef, useState } from "react";
import { type MsaTool, useMsaAlignment } from "../hooks/useMsaAlignment";
import { useGenomeStore } from "../store";

const EXAMPLE_FASTA = `>human_HBB
ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTG
>mouse_Hbb
ATGGTGCACCTGACTGATGCTGAGAAGTCTGCTGTCTCTTGCCTGTGGGGAAAGGTG
>chicken_HBB
ATGGTGCACTGGACTGCTGAGGAGAAGCAGCTCATCACCGGCCTCTGGGGCAAGGTC`;

const TOOL_LABELS: Record<MsaTool, string> = {
  clustalo: "Clustal Omega",
  mafft: "MAFFT",
};

export function AlignmentInputPanel() {
  const alignmentInput = useGenomeStore((s) => s.alignmentInput);
  const setAlignmentInput = useGenomeStore((s) => s.setAlignmentInput);
  const setAlignmentResult = useGenomeStore((s) => s.setAlignmentResult);
  const parsedSequence = useGenomeStore((s) => s.parsedSequence);

  const [stype, setStype] = useState<"dna" | "rna" | "protein">("dna");
  const [tool, setTool] = useState<MsaTool>("clustalo");
  const [email, setEmail] = useState(() => localStorage.getItem("msa-email") ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { status, error, runAlignment, cancel, reset } = useMsaAlignment();

  const isRunning = status === "submitting" || status === "running";
  const seqCount = (alignmentInput.match(/^>/gm) ?? []).length;

  const handleRun = useCallback(async () => {
    if (!alignmentInput.trim() || !email.trim()) return;
    localStorage.setItem("msa-email", email.trim());
    const result = await runAlignment(alignmentInput.trim(), email.trim(), stype, tool);
    if (result) {
      setAlignmentResult(result.sequences);
    }
  }, [alignmentInput, email, stype, tool, runAlignment, setAlignmentResult]);

  const handleAddCurrent = useCallback(() => {
    if (!parsedSequence) return;
    const name = parsedSequence.name || "current";
    const entry = `>${name}\n${parsedSequence.seq}\n`;
    setAlignmentInput(alignmentInput ? `${alignmentInput}\n${entry}` : entry);
    textareaRef.current?.focus();
  }, [parsedSequence, alignmentInput, setAlignmentInput]);

  const handleLoadExample = useCallback(() => {
    setAlignmentInput(EXAMPLE_FASTA);
    textareaRef.current?.focus();
  }, [setAlignmentInput]);

  const handleReset = useCallback(() => {
    reset();
    setAlignmentInput("");
    setAlignmentResult(null);
  }, [reset, setAlignmentInput, setAlignmentResult]);

  return (
    <div className="alignment-input-panel">
      <div className="alignment-input-header">
        <h3>Sequence Input</h3>
        <span className="msa-panel-badge">EBI {TOOL_LABELS[tool]}</span>
      </div>

      <div className="msa-input-form">
        <div className="msa-input-toolbar">
          {parsedSequence && (
            <button type="button" onClick={handleAddCurrent} disabled={isRunning}>
              + Current Sequence
            </button>
          )}
          <button type="button" onClick={handleLoadExample} disabled={isRunning}>
            Load Example
          </button>
          <button type="button" onClick={handleReset} disabled={isRunning}>
            Clear
          </button>
          <div className="msa-input-stype">
            <label htmlFor="alignment-tool-select">Tool:</label>
            <select
              id="alignment-tool-select"
              value={tool}
              onChange={(e) => setTool(e.target.value as MsaTool)}
              disabled={isRunning}
            >
              <option value="clustalo">Clustal Omega</option>
              <option value="mafft">MAFFT</option>
            </select>
          </div>
          <div className="msa-input-stype">
            <label htmlFor="alignment-stype-select">Type:</label>
            <select
              id="alignment-stype-select"
              value={stype}
              onChange={(e) => setStype(e.target.value as "dna" | "rna" | "protein")}
              disabled={isRunning}
            >
              <option value="dna">DNA</option>
              <option value="rna">RNA</option>
              <option value="protein">Protein</option>
            </select>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="msa-input-textarea alignment-input-textarea"
          placeholder={`Paste FASTA sequences here (minimum 2)...\n\n>seq1\nATGCGATCGATCG\n>seq2\nATGCAATCAATCG`}
          value={alignmentInput}
          onChange={(e) => setAlignmentInput(e.target.value)}
          disabled={isRunning}
          spellCheck={false}
          rows={10}
        />

        <div className="msa-input-actions">
          <input
            className="msa-email-input"
            type="email"
            placeholder="Email (required by EBI)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isRunning}
            spellCheck={false}
          />
          <span className="msa-seq-count">
            {seqCount} seq{seqCount !== 1 ? "s" : ""}
          </span>

          {isRunning ? (
            <>
              <span className="msa-status-indicator">
                <span className="msa-spinner" />
                {status === "submitting" ? "Submitting..." : `Running ${TOOL_LABELS[tool]}...`}
              </span>
              <button type="button" className="msa-cancel-btn" onClick={cancel}>
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="msa-run-btn"
              onClick={handleRun}
              disabled={seqCount < 2 || !email.trim()}
              title={
                !email.trim()
                  ? "Email is required by EBI"
                  : seqCount < 2
                    ? "At least 2 sequences required"
                    : `Run ${TOOL_LABELS[tool]}`
              }
            >
              Run Alignment
            </button>
          )}
        </div>

        {error && <div className="msa-error">{error}</div>}
      </div>
    </div>
  );
}
