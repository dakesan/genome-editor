// Multiple Sequence Alignment panel with input form and colored alignment viewer.

import { useCallback, useMemo, useRef, useState } from "react";
import { buildConsensus, type MsaStatus, useMsaAlignment } from "../hooks/useMsaAlignment";
import type { AlignedSequence } from "../types/alignment";

const EXAMPLE_FASTA = `>human_HBB
ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTG
>mouse_Hbb
ATGGTGCACCTGACTGATGCTGAGAAGTCTGCTGTCTCTTGCCTGTGGGGAAAGGTG
>chicken_HBB
ATGGTGCACTGGACTGCTGAGGAGAAGCAGCTCATCACCGGCCTCTGGGGCAAGGTC`;

/** Background color for nucleotide bases. */
function baseColor(c: string): string | undefined {
  switch (c.toUpperCase()) {
    case "A":
      return "var(--msa-color-a)";
    case "T":
    case "U":
      return "var(--msa-color-t)";
    case "G":
      return "var(--msa-color-g)";
    case "C":
      return "var(--msa-color-c)";
    case "-":
      return "var(--msa-color-gap)";
    default:
      return undefined;
  }
}

interface MsaPanelProps {
  open: boolean;
  onToggle: () => void;
  /** Current loaded sequence to pre-fill. */
  currentSequence?: { name: string; seq: string } | null;
}

export function MsaPanel({ open, onToggle, currentSequence }: MsaPanelProps) {
  const [input, setInput] = useState("");
  const [stype, setStype] = useState<"dna" | "rna" | "protein">("dna");
  const [email, setEmail] = useState(() => localStorage.getItem("msa-email") ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { status, result, error, runAlignment, cancel, reset } = useMsaAlignment();

  const handleRun = useCallback(() => {
    if (input.trim() && email.trim()) {
      localStorage.setItem("msa-email", email.trim());
      runAlignment(input.trim(), email.trim(), stype);
    }
  }, [input, email, stype, runAlignment]);

  const handleAddCurrent = useCallback(() => {
    if (!currentSequence) return;
    const name = currentSequence.name || "current";
    const entry = `>${name}\n${currentSequence.seq}\n`;
    setInput((prev) => (prev ? `${prev}\n${entry}` : entry));
    textareaRef.current?.focus();
  }, [currentSequence]);

  const handleLoadExample = useCallback(() => {
    setInput(EXAMPLE_FASTA);
    textareaRef.current?.focus();
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setInput("");
  }, [reset]);

  if (!open) {
    return null;
  }

  return (
    <div className="msa-panel">
      <div className="msa-panel-header">
        <h3>Multiple Sequence Alignment</h3>
        <span className="msa-panel-badge">EBI Clustal Omega</span>
        <button type="button" className="msa-panel-close" onClick={onToggle} title="Close">
          {"\u2715"}
        </button>
      </div>

      <div className="msa-panel-body">
        {!result ? (
          <MsaInputForm
            input={input}
            email={email}
            stype={stype}
            status={status}
            error={error}
            textareaRef={textareaRef}
            onInputChange={setInput}
            onEmailChange={setEmail}
            onStypeChange={setStype}
            onRun={handleRun}
            onCancel={cancel}
            onAddCurrent={currentSequence ? handleAddCurrent : undefined}
            onLoadExample={handleLoadExample}
          />
        ) : (
          <MsaResultView result={result.sequences} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}

// --- Input form ---

interface MsaInputFormProps {
  input: string;
  email: string;
  stype: "dna" | "rna" | "protein";
  status: MsaStatus;
  error: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onStypeChange: (value: "dna" | "rna" | "protein") => void;
  onRun: () => void;
  onCancel: () => void;
  onAddCurrent?: () => void;
  onLoadExample: () => void;
}

function MsaInputForm({
  input,
  email,
  stype,
  status,
  error,
  textareaRef,
  onInputChange,
  onEmailChange,
  onStypeChange,
  onRun,
  onCancel,
  onAddCurrent,
  onLoadExample,
}: MsaInputFormProps) {
  const isRunning = status === "submitting" || status === "running";
  const seqCount = (input.match(/^>/gm) ?? []).length;

  return (
    <div className="msa-input-form">
      <div className="msa-input-toolbar">
        {onAddCurrent && (
          <button type="button" onClick={onAddCurrent} disabled={isRunning}>
            + Current Sequence
          </button>
        )}
        <button type="button" onClick={onLoadExample} disabled={isRunning}>
          Load Example
        </button>
        <div className="msa-input-stype">
          <label htmlFor="msa-stype-select">Type:</label>
          <select
            id="msa-stype-select"
            value={stype}
            onChange={(e) => onStypeChange(e.target.value as "dna" | "rna" | "protein")}
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
        className="msa-input-textarea"
        placeholder={`Paste FASTA sequences here (minimum 2)...\n\n>seq1\nATGCGATCGATCG\n>seq2\nATGCAATCAATCG`}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        disabled={isRunning}
        spellCheck={false}
        rows={6}
      />

      <div className="msa-input-actions">
        <input
          className="msa-email-input"
          type="email"
          placeholder="Email (required by EBI)"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
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
              {status === "submitting" ? "Submitting..." : "Running alignment..."}
            </span>
            <button type="button" className="msa-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="msa-run-btn"
            onClick={onRun}
            disabled={seqCount < 2 || !email.trim()}
            title={
              !email.trim()
                ? "Email is required by EBI"
                : seqCount < 2
                  ? "At least 2 sequences required"
                  : "Run alignment"
            }
          >
            Run Alignment
          </button>
        )}
      </div>

      {error && <div className="msa-error">{error}</div>}
    </div>
  );
}

// --- Residue row (renders each base with color) ---

function ResidueRow({ sequence }: { sequence: string }) {
  const elements: React.ReactElement[] = [];
  for (let i = 0; i < sequence.length; i++) {
    const c = sequence[i];
    elements.push(
      <span key={i} className="msa-residue" style={{ backgroundColor: baseColor(c) }}>
        {c}
      </span>,
    );
  }
  return <>{elements}</>;
}

// --- Result viewer ---

interface MsaResultViewProps {
  result: AlignedSequence[];
  onReset: () => void;
}

function MsaResultView({ result, onReset }: MsaResultViewProps) {
  const consensus = useMemo(() => buildConsensus(result), [result]);
  const maxNameLen = useMemo(() => Math.max(...result.map((s) => s.name.length), 9), [result]);

  // Position ruler
  const alnLen = result[0]?.sequence.length ?? 0;
  const ruler = useMemo(() => {
    let r = "";
    for (let i = 1; i <= alnLen; i++) {
      r += i % 10 === 0 ? String(i % 100 === 0 ? i : (i / 10) % 10) : " ";
    }
    return r;
  }, [alnLen]);

  return (
    <div className="msa-result">
      <div className="msa-result-toolbar">
        <span className="msa-result-info">
          {result.length} sequences, {alnLen} positions
        </span>
        <button type="button" onClick={onReset}>
          New Alignment
        </button>
      </div>

      <div className="msa-alignment-container">
        <div className="msa-alignment-scroll">
          {/* Ruler row */}
          <div className="msa-alignment-row msa-ruler-row">
            <span className="msa-seq-name" style={{ minWidth: `${maxNameLen + 1}ch` }} />
            <span className="msa-seq-residues">{ruler}</span>
          </div>

          {/* Sequence rows */}
          {result.map((seq) => (
            <div key={seq.name} className="msa-alignment-row">
              <span
                className="msa-seq-name"
                style={{ minWidth: `${maxNameLen + 1}ch` }}
                title={seq.name}
              >
                {seq.name}
              </span>
              <span className="msa-seq-residues">
                <ResidueRow sequence={seq.sequence} />
              </span>
            </div>
          ))}

          {/* Consensus row */}
          <div className="msa-alignment-row msa-consensus-row">
            <span className="msa-seq-name" style={{ minWidth: `${maxNameLen + 1}ch` }}>
              Consensus
            </span>
            <span className="msa-seq-residues">{consensus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
