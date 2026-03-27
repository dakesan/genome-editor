// Hook for running Multiple Sequence Alignment via EBI REST APIs (Clustal Omega / MAFFT).

import { useCallback, useRef, useState } from "react";
import type { AlignedSequence } from "../types/alignment";

export type MsaTool = "clustalo" | "mafft";

const TOOL_CONFIG: Record<MsaTool, { baseUrl: string; label: string }> = {
  clustalo: {
    baseUrl: "https://www.ebi.ac.uk/Tools/services/rest/clustalo",
    label: "Clustal Omega",
  },
  mafft: {
    baseUrl: "https://www.ebi.ac.uk/Tools/services/rest/mafft",
    label: "MAFFT",
  },
};

const POLL_INTERVAL_MS = 3000;

export interface MsaResult {
  sequences: AlignedSequence[];
  phylotree?: string;
}

export type MsaStatus = "idle" | "submitting" | "running" | "finished" | "error";

/** Parse aligned FASTA text into structured sequence array. */
function parseFastaAlignment(fasta: string): AlignedSequence[] {
  const sequences: AlignedSequence[] = [];
  let currentName = "";
  let currentSeq = "";

  for (const line of fasta.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(">")) {
      if (currentName) {
        sequences.push({ name: currentName, sequence: currentSeq });
      }
      currentName = trimmed.slice(1).split(/\s+/)[0] ?? trimmed.slice(1);
      currentSeq = "";
    } else if (trimmed) {
      currentSeq += trimmed;
    }
  }
  if (currentName) {
    sequences.push({ name: currentName, sequence: currentSeq });
  }
  return sequences;
}

/** Compute consensus character for a column of residues. */
function computeConsensus(column: string[]): string {
  const counts = new Map<string, number>();
  for (const c of column) {
    if (c !== "-") {
      const upper = c.toUpperCase();
      counts.set(upper, (counts.get(upper) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return " ";
  const total = column.filter((c) => c !== "-").length;
  const max = Math.max(...counts.values());
  if (max === total && total === column.length) return "*"; // fully conserved
  if (max / column.length >= 0.6) return ":"; // mostly conserved
  if (max / column.length >= 0.3) return "."; // weakly conserved
  return " ";
}

/** Build consensus string from aligned sequences. */
export function buildConsensus(sequences: AlignedSequence[]): string {
  if (sequences.length === 0) return "";
  const len = sequences[0].sequence.length;
  let consensus = "";
  for (let i = 0; i < len; i++) {
    const column = sequences.map((s) => s.sequence[i] ?? "-");
    consensus += computeConsensus(column);
  }
  return consensus;
}

/** Validate FASTA input before submission. Returns error message or null if valid. */
function validateFastaInput(input: string): string | null {
  const lines = input.split("\n");
  const entries: { name: string; seq: string; lineNum: number }[] = [];
  let currentName = "";
  let currentSeq = "";
  let headerLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(">")) {
      if (currentName) {
        entries.push({ name: currentName, seq: currentSeq, lineNum: headerLine });
      }
      currentName = trimmed.slice(1).trim();
      currentSeq = "";
      headerLine = i + 1;
    } else if (trimmed) {
      currentSeq += trimmed;
    }
  }
  if (currentName) {
    entries.push({ name: currentName, seq: currentSeq, lineNum: headerLine });
  }

  if (entries.length < 2) {
    return "At least 2 sequences are required for alignment";
  }

  for (const entry of entries) {
    if (!entry.seq) {
      return `Sequence "${entry.name.slice(0, 30)}${entry.name.length > 30 ? "..." : ""}" (line ${entry.lineNum}) has no sequence data. Each FASTA entry needs a header line (>name) followed by the sequence on the next line(s).`;
    }
  }

  return null;
}

/** Build tool-specific submission parameters. */
function buildSubmitParams(
  tool: MsaTool,
  fastaInput: string,
  email: string,
  stype: "dna" | "rna" | "protein",
): URLSearchParams {
  if (tool === "mafft") {
    return new URLSearchParams({
      email,
      // MAFFT accepts "dna", "protein", or "automatic" (no "rna")
      stype: stype === "rna" ? "dna" : stype,
      format: "fasta",
      order: "input",
      sequence: fastaInput,
    });
  }
  // Clustal Omega
  return new URLSearchParams({
    email,
    stype,
    outfmt: "fa",
    order: "input",
    sequence: fastaInput,
  });
}

export function useMsaAlignment() {
  const [status, setStatus] = useState<MsaStatus>("idle");
  const [result, setResult] = useState<MsaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  const runAlignment = useCallback(
    async (
      fastaInput: string,
      email: string,
      stype: "dna" | "rna" | "protein" = "dna",
      tool: MsaTool = "clustalo",
    ): Promise<MsaResult | null> => {
      cancel();
      setStatus("submitting");
      setError(null);
      setResult(null);

      const controller = new AbortController();
      abortRef.current = controller;
      const baseUrl = TOOL_CONFIG[tool].baseUrl;

      try {
        // Validate FASTA input
        const validationError = validateFastaInput(fastaInput);
        if (validationError) {
          throw new Error(validationError);
        }

        // 1. Submit job
        const params = buildSubmitParams(tool, fastaInput, email, stype);

        const submitRes = await fetch(`${baseUrl}/run`, {
          method: "POST",
          body: params,
          signal: controller.signal,
        });

        if (!submitRes.ok) {
          const errText = await submitRes.text();
          // Parse XML error from EBI if present.
          const descMatch = errText.match(/<description>([\s\S]*?)<\/description>/);
          const friendlyMsg = descMatch ? descMatch[1].trim() : errText;
          throw new Error(`Job submission failed: ${friendlyMsg}`);
        }

        const jobId = (await submitRes.text()).trim();
        setStatus("running");

        // 2. Poll for completion
        let finished = false;
        while (!finished) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

          if (controller.signal.aborted) return null;

          const statusRes = await fetch(`${baseUrl}/status/${jobId}`, {
            signal: controller.signal,
          });
          const statusText = (await statusRes.text()).trim();

          if (statusText === "FINISHED") {
            finished = true;
          } else if (statusText === "ERROR" || statusText === "FAILURE") {
            throw new Error(`Alignment job failed (${statusText})`);
          } else if (statusText === "NOT_FOUND") {
            throw new Error("Alignment job not found");
          }
          // RUNNING — continue polling
        }

        // 3. Fetch results
        // Both tools support /result/{jobId}/aln-fasta for alignment FASTA
        const alnResultId = tool === "mafft" ? "aln-fasta" : "fa";
        const [alnRes, treeRes] = await Promise.all([
          fetch(`${baseUrl}/result/${jobId}/${alnResultId}`, {
            signal: controller.signal,
          }),
          fetch(`${baseUrl}/result/${jobId}/phylotree`, {
            signal: controller.signal,
          }).catch(() => null),
        ]);

        if (!alnRes.ok) {
          throw new Error("Failed to fetch alignment result");
        }

        const alnText = await alnRes.text();
        const treeText = treeRes?.ok ? await treeRes.text() : undefined;

        const sequences = parseFastaAlignment(alnText);
        if (sequences.length === 0) {
          throw new Error("Empty alignment result");
        }

        const msaResult = { sequences, phylotree: treeText };
        setResult(msaResult);
        setStatus("finished");
        return msaResult;
      } catch (err) {
        if ((err as Error).name === "AbortError") return null;
        setError((err as Error).message);
        setStatus("error");
        return null;
      }
    },
    [cancel],
  );

  const reset = useCallback(() => {
    cancel();
    setResult(null);
    setError(null);
    setStatus("idle");
  }, [cancel]);

  return { status, result, error, runAlignment, cancel, reset };
}
