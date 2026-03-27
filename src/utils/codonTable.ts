// Standard genetic code: codon → amino acid translation.

const CODON_TABLE: Record<string, string> = {
  TTT: "F",
  TTC: "F",
  TTA: "L",
  TTG: "L",
  CTT: "L",
  CTC: "L",
  CTA: "L",
  CTG: "L",
  ATT: "I",
  ATC: "I",
  ATA: "I",
  ATG: "M",
  GTT: "V",
  GTC: "V",
  GTA: "V",
  GTG: "V",
  TCT: "S",
  TCC: "S",
  TCA: "S",
  TCG: "S",
  AGT: "S",
  AGC: "S",
  CCT: "P",
  CCC: "P",
  CCA: "P",
  CCG: "P",
  ACT: "T",
  ACC: "T",
  ACA: "T",
  ACG: "T",
  GCT: "A",
  GCC: "A",
  GCA: "A",
  GCG: "A",
  TAT: "Y",
  TAC: "Y",
  TAA: "*",
  TAG: "*",
  TGA: "*",
  CAT: "H",
  CAC: "H",
  CAA: "Q",
  CAG: "Q",
  AAT: "N",
  AAC: "N",
  AAA: "K",
  AAG: "K",
  GAT: "D",
  GAC: "D",
  GAA: "E",
  GAG: "E",
  TGT: "C",
  TGC: "C",
  TGG: "W",
  CGT: "R",
  CGC: "R",
  CGA: "R",
  CGG: "R",
  AGA: "R",
  AGG: "R",
  GGT: "G",
  GGC: "G",
  GGA: "G",
  GGG: "G",
};

/** Translate a 3-letter codon to a single-letter amino acid. Returns "?" for unknown. */
export function translateCodon(codon: string): string {
  if (codon.length !== 3) return "?";
  const upper = codon.toUpperCase().replace(/U/g, "T");
  return CODON_TABLE[upper] ?? "?";
}

/** Translate an entire DNA/RNA sequence to amino acids. Ignores trailing incomplete codons. */
export function translateSequence(seq: string): string {
  let result = "";
  const cleaned = seq.toUpperCase().replace(/U/g, "T").replace(/-/g, "");
  for (let i = 0; i + 2 < cleaned.length; i += 3) {
    result += translateCodon(cleaned.slice(i, i + 3));
  }
  return result;
}

/** Check if an amino acid is a stop codon. */
export function isStopCodon(aa: string): boolean {
  return aa === "*";
}
