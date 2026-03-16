//! Sequence alignment algorithms for genome-editor.
//!
//! With the `full` feature (default, native builds), this crate delegates to the
//! [`bio`] crate's Smith-Waterman implementation.  When `full` is disabled
//! (e.g. for WASM targets), a lightweight fallback is compiled instead.

use genome_editor_core::Sequence;
use genome_editor_core::alignment::{AlignmentResult, SubsequenceMatch};

// ---------------------------------------------------------------------------
// pairwise_align — feature-gated implementations
// ---------------------------------------------------------------------------

/// Perform Smith-Waterman local alignment of `query` against `target`.
///
/// Returns an [`AlignmentResult`] containing the alignment score, the aligned
/// strings (with `'-'` for gaps) and a CIGAR string.
///
/// # Parameters
///
/// * `match_score`       – reward for a matching base (must be >= 0)
/// * `mismatch_penalty`  – penalty for a mismatch   (must be <= 0)
/// * `gap_open_penalty`  – penalty for opening a gap (must be <= 0)
/// * `gap_extend_penalty`– penalty for extending a gap (must be <= 0)
#[cfg(feature = "full")]
pub fn pairwise_align(
    query: &[u8],
    target: &[u8],
    match_score: i32,
    mismatch_penalty: i32,
    gap_open_penalty: i32,
    gap_extend_penalty: i32,
) -> AlignmentResult {
    use bio::alignment::AlignmentOperation;
    use bio::alignment::pairwise::Aligner;

    if query.is_empty() || target.is_empty() {
        return AlignmentResult {
            score: 0,
            aligned_query: String::new(),
            aligned_target: String::new(),
            cigar: String::new(),
        };
    }

    let score_fn = |a: u8, b: u8| -> i32 {
        if a == b {
            match_score
        } else {
            mismatch_penalty
        }
    };

    let mut aligner = Aligner::with_capacity(
        query.len(),
        target.len(),
        gap_open_penalty,
        gap_extend_penalty,
        &score_fn,
    );

    let alignment = aligner.local(query, target);

    // Build aligned strings and CIGAR from the operation list.
    let mut aligned_query = String::new();
    let mut aligned_target = String::new();
    let mut cigar = String::new();

    let mut qi = alignment.xstart;
    let mut ti = alignment.ystart;

    // Collapse operations into CIGAR runs.
    let mut current_op: Option<char> = None;
    let mut run_len: usize = 0;

    let flush = |op: Option<char>, len: usize, cigar: &mut String| {
        if let Some(c) = op {
            cigar.push_str(&len.to_string());
            cigar.push(c);
        }
    };

    for &op in &alignment.operations {
        let cigar_char = match op {
            AlignmentOperation::Match | AlignmentOperation::Subst => {
                aligned_query.push(query[qi] as char);
                aligned_target.push(target[ti] as char);
                qi += 1;
                ti += 1;
                'M'
            }
            AlignmentOperation::Ins => {
                // Insertion in query (gap in target)
                aligned_query.push(query[qi] as char);
                aligned_target.push('-');
                qi += 1;
                'I'
            }
            AlignmentOperation::Del => {
                // Deletion in query (gap in query)
                aligned_query.push('-');
                aligned_target.push(target[ti] as char);
                ti += 1;
                'D'
            }
            // Clip operations are filtered out by bio's local() mode,
            // but handle them defensively.
            _ => continue,
        };

        if current_op == Some(cigar_char) {
            run_len += 1;
        } else {
            flush(current_op, run_len, &mut cigar);
            current_op = Some(cigar_char);
            run_len = 1;
        }
    }
    flush(current_op, run_len, &mut cigar);

    AlignmentResult {
        score: alignment.score,
        aligned_query,
        aligned_target,
        cigar,
    }
}

#[cfg(not(feature = "full"))]
pub fn pairwise_align(
    query: &[u8],
    target: &[u8],
    match_score: i32,
    mismatch_penalty: i32,
    gap_open_penalty: i32,
    gap_extend_penalty: i32,
) -> AlignmentResult {
    // Lightweight Smith-Waterman with linear gap penalty.
    // Uses gap_open_penalty as the per-base gap cost (gap_extend_penalty is
    // accepted for API compatibility but ignored in this fallback).
    let _ = gap_extend_penalty;
    let gap_penalty = gap_open_penalty;

    let m = query.len();
    let n = target.len();

    if m == 0 || n == 0 {
        return AlignmentResult {
            score: 0,
            aligned_query: String::new(),
            aligned_target: String::new(),
            cigar: String::new(),
        };
    }

    // Scoring matrix H and traceback matrix.
    // 0 = stop, 1 = diagonal, 2 = up (gap in target), 3 = left (gap in query)
    let mut h = vec![vec![0i32; n + 1]; m + 1];
    let mut tb = vec![vec![0u8; n + 1]; m + 1];

    let mut max_score: i32 = 0;
    let mut max_i: usize = 0;
    let mut max_j: usize = 0;

    for i in 1..=m {
        for j in 1..=n {
            let diag = h[i - 1][j - 1]
                + if query[i - 1] == target[j - 1] {
                    match_score
                } else {
                    mismatch_penalty
                };
            let up = h[i - 1][j] + gap_penalty;
            let left = h[i][j - 1] + gap_penalty;

            let score = 0i32.max(diag).max(up).max(left);
            h[i][j] = score;

            if score == 0 {
                tb[i][j] = 0;
            } else if score == diag {
                tb[i][j] = 1;
            } else if score == up {
                tb[i][j] = 2;
            } else {
                tb[i][j] = 3;
            }

            if score > max_score {
                max_score = score;
                max_i = i;
                max_j = j;
            }
        }
    }

    // Traceback from the maximum score position.
    let mut aligned_query_bytes: Vec<u8> = Vec::new();
    let mut aligned_target_bytes: Vec<u8> = Vec::new();
    let mut ops: Vec<char> = Vec::new();

    let mut i = max_i;
    let mut j = max_j;
    while i > 0 && j > 0 && h[i][j] > 0 {
        match tb[i][j] {
            1 => {
                // Diagonal
                aligned_query_bytes.push(query[i - 1]);
                aligned_target_bytes.push(target[j - 1]);
                ops.push('M');
                i -= 1;
                j -= 1;
            }
            2 => {
                // Up — gap in target (insertion in query)
                aligned_query_bytes.push(query[i - 1]);
                aligned_target_bytes.push(b'-');
                ops.push('I');
                i -= 1;
            }
            3 => {
                // Left — gap in query (deletion)
                aligned_query_bytes.push(b'-');
                aligned_target_bytes.push(target[j - 1]);
                ops.push('D');
                j -= 1;
            }
            _ => break,
        }
    }

    // Reverse since traceback produces the alignment backwards.
    aligned_query_bytes.reverse();
    aligned_target_bytes.reverse();
    ops.reverse();

    let cigar = build_cigar(&ops);

    AlignmentResult {
        score: max_score,
        aligned_query: String::from_utf8(aligned_query_bytes)
            .expect("aligned query should be valid ASCII"),
        aligned_target: String::from_utf8(aligned_target_bytes)
            .expect("aligned target should be valid ASCII"),
        cigar,
    }
}

/// Build a CIGAR string from a sequence of operation characters.
///
/// Consecutive identical operations are collapsed (e.g. `['M','M','M'] → "3M"`).
#[cfg(not(feature = "full"))]
fn build_cigar(ops: &[char]) -> String {
    let mut cigar = String::new();
    let mut iter = ops.iter().peekable();
    while let Some(&op) = iter.next() {
        let mut count: usize = 1;
        while iter.peek() == Some(&&op) {
            count += 1;
            iter.next();
        }
        cigar.push_str(&count.to_string());
        cigar.push(op);
    }
    cigar
}

// ---------------------------------------------------------------------------
// find_subsequence — works regardless of feature flags
// ---------------------------------------------------------------------------

/// Find all occurrences of `pattern` within `sequence`, allowing up to
/// `max_mismatches` mismatched positions.
///
/// Returns a vector of [`SubsequenceMatch`] sorted by start position.
pub fn find_subsequence(
    pattern: &[u8],
    sequence: &Sequence,
    max_mismatches: usize,
) -> Vec<SubsequenceMatch> {
    let seq = &sequence.bases;
    let pat_len = pattern.len();
    let seq_len = seq.len();

    if pat_len == 0 || seq_len < pat_len {
        return Vec::new();
    }

    let pattern_upper: Vec<u8> = pattern.iter().map(|b| b.to_ascii_uppercase()).collect();

    let mut results = Vec::new();

    for i in 0..=(seq_len - pat_len) {
        let mismatches = pattern_upper
            .iter()
            .zip(&seq[i..i + pat_len])
            .filter(|(a, b)| a != b)
            .count();

        if mismatches <= max_mismatches {
            results.push(SubsequenceMatch {
                start: i,
                end: i + pat_len,
                mismatches,
            });
        }
    }

    results
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // -- pairwise_align tests -----------------------------------------------

    #[test]
    fn test_exact_match_alignment() {
        let result = pairwise_align(b"ATGC", b"ATGC", 2, -1, -5, -1);
        assert!(result.score > 0);
        assert_eq!(result.aligned_query, "ATGC");
        assert_eq!(result.aligned_target, "ATGC");
    }

    #[test]
    fn test_alignment_with_mismatches() {
        let result = pairwise_align(b"ATGC", b"ATCC", 2, -1, -5, -1);
        assert!(result.score > 0);
    }

    #[test]
    fn test_alignment_with_gaps() {
        let result = pairwise_align(b"ATGAATC", b"ATGATC", 2, -1, -5, -1);
        // Should produce an alignment that accounts for the extra 'A' in query.
        assert!(result.score > 0);
    }

    #[test]
    fn test_cigar_exact_match() {
        let result = pairwise_align(b"ATGC", b"ATGC", 2, -1, -5, -1);
        assert_eq!(result.cigar, "4M");
    }

    #[test]
    fn test_empty_query() {
        let result = pairwise_align(b"", b"ATGC", 2, -1, -5, -1);
        assert_eq!(result.score, 0);
    }

    #[test]
    fn test_empty_target() {
        let result = pairwise_align(b"ATGC", b"", 2, -1, -5, -1);
        assert_eq!(result.score, 0);
    }

    // -- find_subsequence tests ---------------------------------------------

    #[test]
    fn test_subsequence_exact_match() {
        let seq = Sequence::new("test", b"AATGCCGATGCCA", false);
        let matches = find_subsequence(b"ATGCC", &seq, 0);
        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].start, 1);
        assert_eq!(matches[0].end, 6);
        assert_eq!(matches[0].mismatches, 0);
        assert_eq!(matches[1].start, 7);
        assert_eq!(matches[1].end, 12);
        assert_eq!(matches[1].mismatches, 0);
    }

    #[test]
    fn test_subsequence_with_mismatches() {
        let seq = Sequence::new("test", b"AATGCCGATGCCA", false);
        let exact = find_subsequence(b"ATGCC", &seq, 0);
        let fuzzy = find_subsequence(b"ATGCC", &seq, 1);
        // Allowing one mismatch should find at least as many matches as exact.
        assert!(fuzzy.len() >= exact.len());
    }

    #[test]
    fn test_subsequence_no_match() {
        let seq = Sequence::new("test", b"AAAAAAA", false);
        let matches = find_subsequence(b"TTTTT", &seq, 0);
        assert!(matches.is_empty());
    }

    #[test]
    fn test_subsequence_empty_pattern() {
        let seq = Sequence::new("test", b"ATGC", false);
        let matches = find_subsequence(b"", &seq, 0);
        assert!(matches.is_empty());
    }

    #[test]
    fn test_subsequence_pattern_longer_than_sequence() {
        let seq = Sequence::new("test", b"AT", false);
        let matches = find_subsequence(b"ATGCC", &seq, 0);
        assert!(matches.is_empty());
    }

    #[test]
    fn test_subsequence_case_insensitive() {
        // Sequence::new uppercases bases; pattern should also be handled.
        let seq = Sequence::new("test", b"aatgccga", false);
        let matches = find_subsequence(b"atgc", &seq, 0);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].start, 1);
    }
}
