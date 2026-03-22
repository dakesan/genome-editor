// Hook for running Multiple Sequence Alignment via EBI Clustal Omega REST API.

import { useCallback, useRef, useState } from "react";

const BASE_URL = "https://www.ebi.ac.uk/Tools/services/rest/clustalo";
const POLL_INTERVAL_MS = 3000;

export interface AlignedSequence {
  name: string;
  sequence: string;
}

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
    async (fastaInput: string, email: string, stype: "dna" | "rna" | "protein" = "dna") => {
      cancel();
      setStatus("submitting");
      setError(null);
      setResult(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Validate: at least 2 sequences
        const seqCount = (fastaInput.match(/^>/gm) ?? []).length;
        if (seqCount < 2) {
          throw new Error("At least 2 sequences are required for alignment");
        }

        // 1. Submit job
        const params = new URLSearchParams({
          email,
          stype,
          outfmt: "fa",
          order: "input",
          sequence: fastaInput,
        });

        const submitRes = await fetch(`${BASE_URL}/run`, {
          method: "POST",
          body: params,
          signal: controller.signal,
        });

        if (!submitRes.ok) {
          const errText = await submitRes.text();
          throw new Error(`Job submission failed: ${errText}`);
        }

        const jobId = (await submitRes.text()).trim();
        setStatus("running");

        // 2. Poll for completion
        let finished = false;
        while (!finished) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

          if (controller.signal.aborted) return;

          const statusRes = await fetch(`${BASE_URL}/status/${jobId}`, {
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
        const [alnRes, treeRes] = await Promise.all([
          fetch(`${BASE_URL}/result/${jobId}/fa`, {
            signal: controller.signal,
          }),
          fetch(`${BASE_URL}/result/${jobId}/phylotree`, {
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

        setResult({ sequences, phylotree: treeText });
        setStatus("finished");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setStatus("error");
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
