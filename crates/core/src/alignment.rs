use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

/// Result of a pairwise sequence alignment.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct AlignmentResult {
    /// Alignment score.
    pub score: i32,
    /// Aligned query string (with gaps as '-').
    pub aligned_query: String,
    /// Aligned target string (with gaps as '-').
    pub aligned_target: String,
    /// CIGAR string representation.
    pub cigar: String,
}

/// Result of a subsequence search.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SubsequenceMatch {
    /// Start position on the sequence (0-based, inclusive).
    pub start: usize,
    /// End position on the sequence (0-based, exclusive).
    pub end: usize,
    /// Number of mismatches.
    pub mismatches: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alignment_result() {
        let result = AlignmentResult {
            score: 42,
            aligned_query: "ATGC--AT".to_string(),
            aligned_target: "ATGCGGAT".to_string(),
            cigar: "4M2I2M".to_string(),
        };
        assert_eq!(result.score, 42);
        assert_eq!(result.cigar, "4M2I2M");
    }

    #[test]
    fn test_subsequence_match() {
        let m = SubsequenceMatch {
            start: 10,
            end: 16,
            mismatches: 1,
        };
        assert_eq!(m.start, 10);
        assert_eq!(m.end, 16);
        assert_eq!(m.mismatches, 1);
    }
}
