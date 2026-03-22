/* tslint:disable */
/* eslint-disable */
/**
 * A DNA/RNA sequence with metadata.
 */
export interface Sequence {
    name: string;
    bases: number[];
    is_circular: boolean;
    length: number;
}

/**
 * A cut site on a sequence.
 */
export interface CutSite {
    /**
     * Name of the enzyme that cuts here.
     */
    enzyme_name: string;
    /**
     * Start position of recognition sequence on the forward strand (0-based).
     */
    position: number;
    /**
     * Position of the forward strand cut (0-based).
     */
    forward_cut: number;
    /**
     * Position of the reverse strand cut (0-based).
     */
    reverse_cut: number;
}

/**
 * A restriction enzyme definition.
 */
export interface RestrictionEnzyme {
    /**
     * Enzyme name (e.g., \"EcoRI\").
     */
    name: string;
    /**
     * Recognition sequence in IUPAC codes (e.g., b\"GAATTC\").
     */
    recognition_sequence: number[];
    /**
     * Cut position on forward strand relative to recognition start.
     */
    cut_forward: number;
    /**
     * Cut position on reverse strand relative to recognition start.
     */
    cut_reverse: number;
    /**
     * Whether the recognition sequence is palindromic.
     */
    is_palindromic: boolean;
}

/**
 * Alignment result data returned to JavaScript.
 */
export interface WasmAlignmentResult {
    score: number;
    aligned_query: string;
    aligned_target: string;
    cigar: string;
}

/**
 * An Open Reading Frame (ORF) detected in a sequence.
 */
export interface Orf {
    /**
     * Start position on the sequence (0-based, inclusive).
     */
    start: number;
    /**
     * End position on the sequence (0-based, exclusive).
     */
    end: number;
    /**
     * Strand direction.
     */
    strand: Strand;
    /**
     * Reading frame (0, 1, or 2).
     */
    frame: number;
    /**
     * Length in amino acids.
     */
    length_aa: number;
}

/**
 * An annotation (feature) on a sequence.
 */
export interface Annotation {
    name: string;
    feature_type: FeatureType;
    start: number;
    end: number;
    strand: Strand;
    qualifiers: Record<string, string>;
    color: string | undefined;
}

/**
 * Annotation data returned to JavaScript.
 */
export interface WasmAnnotation {
    name: string;
    start: number;
    end: number;
    direction: number;
    color: string | undefined;
    type: string;
}

/**
 * Biological feature type for annotations.
 */
export type FeatureType = "Cds" | "Gene" | "Promoter" | "Terminator" | "RepOrigin" | "Misc" | { Other: string };

/**
 * Cut site data returned to JavaScript.
 */
export interface WasmCutSite {
    enzyme_name: string;
    position: number;
    forward_cut: number;
    reverse_cut: number;
}

/**
 * DNA strand direction.
 */
export type Strand = "Forward" | "Reverse" | "Both";

/**
 * ORF data returned to JavaScript.
 */
export interface WasmOrf {
    start: number;
    end: number;
    strand: string;
    frame: number;
    length_aa: number;
}

/**
 * Parsed sequence data returned to JavaScript.
 */
export interface WasmParsedSequence {
    name: string;
    seq: string;
    is_circular: boolean;
    length: number;
    annotations: WasmAnnotation[];
}

/**
 * Result of a pairwise sequence alignment.
 */
export interface AlignmentResult {
    /**
     * Alignment score.
     */
    score: number;
    /**
     * Aligned query string (with gaps as \'-\').
     */
    aligned_query: string;
    /**
     * Aligned target string (with gaps as \'-\').
     */
    aligned_target: string;
    /**
     * CIGAR string representation.
     */
    cigar: string;
}

/**
 * Result of a subsequence search.
 */
export interface SubsequenceMatch {
    /**
     * Start position on the sequence (0-based, inclusive).
     */
    start: number;
    /**
     * End position on the sequence (0-based, exclusive).
     */
    end: number;
    /**
     * Number of mismatches.
     */
    mismatches: number;
}


/**
 * Find restriction enzyme cut sites in a sequence.
 *
 * # Arguments
 * * `seq_bases` - The DNA sequence as a string (e.g., "ATGCGATCG...")
 * * `is_circular` - Whether the sequence is circular
 * * `enzyme_names_json` - JSON array of enzyme names (e.g., '["EcoRI","BamHI"]')
 */
export function find_cut_sites_wasm(seq_bases: string, is_circular: boolean, enzyme_names_json: string): any;

/**
 * Find ORFs in a sequence using the standard genetic code.
 *
 * # Arguments
 * * `seq_bases` - The DNA sequence as a string
 * * `is_circular` - Whether the sequence is circular
 * * `min_length_aa` - Minimum ORF length in amino acids
 */
export function find_orfs_wasm(seq_bases: string, is_circular: boolean, min_length_aa: number): any;

/**
 * Find restriction enzymes that cut the sequence exactly once.
 *
 * # Arguments
 * * `seq_bases` - The DNA sequence as a string
 * * `is_circular` - Whether the sequence is circular
 */
export function find_single_cutters_wasm(seq_bases: string, is_circular: boolean): any;

/**
 * Get the list of available enzyme names from the built-in REBASE database.
 */
export function get_enzyme_names(): any;

/**
 * Perform Smith-Waterman local alignment of two sequences.
 *
 * # Arguments
 * * `query` - The query sequence
 * * `target` - The target sequence
 * * `match_score` - Reward for matching bases (>= 0)
 * * `mismatch_penalty` - Penalty for mismatches (<= 0)
 * * `gap_open_penalty` - Penalty for opening a gap (<= 0)
 * * `gap_extend_penalty` - Penalty for extending a gap (<= 0)
 */
export function pairwise_align_wasm(query: string, target: string, match_score: number, mismatch_penalty: number, gap_open_penalty: number, gap_extend_penalty: number): any;

/**
 * Parse a FASTA format file from bytes and return JSON result.
 * Returns the first sequence only (for compatibility with single-sequence UI).
 */
export function parse_fasta_wasm(data: Uint8Array): any;

/**
 * Parse a GenBank format file from bytes and return JSON result.
 */
export function parse_genbank_wasm(data: Uint8Array): any;

/**
 * Write a FASTA format file from sequence data.
 * Returns the file content as bytes.
 */
export function write_fasta_wasm(name: string, seq: string): Uint8Array;

/**
 * Write a GenBank format file from sequence data.
 * Returns the file content as bytes.
 */
export function write_genbank_wasm(name: string, seq: string, is_circular: boolean, annotations_json: string): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly find_cut_sites_wasm: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly find_orfs_wasm: (a: number, b: number, c: number, d: number) => number;
    readonly find_single_cutters_wasm: (a: number, b: number, c: number) => number;
    readonly get_enzyme_names: () => number;
    readonly pairwise_align_wasm: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly parse_fasta_wasm: (a: number, b: number) => number;
    readonly parse_genbank_wasm: (a: number, b: number) => number;
    readonly write_fasta_wasm: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly write_genbank_wasm: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
