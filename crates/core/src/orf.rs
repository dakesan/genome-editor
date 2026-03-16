use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

use crate::Strand;

/// An Open Reading Frame (ORF) detected in a sequence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Orf {
    /// Start position on the sequence (0-based, inclusive).
    pub start: usize,
    /// End position on the sequence (0-based, exclusive).
    pub end: usize,
    /// Strand direction.
    pub strand: Strand,
    /// Reading frame (0, 1, or 2).
    pub frame: u8,
    /// Length in amino acids.
    pub length_aa: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_orf_creation() {
        let orf = Orf {
            start: 0,
            end: 300,
            strand: Strand::Forward,
            frame: 0,
            length_aa: 100,
        };
        assert_eq!(orf.start, 0);
        assert_eq!(orf.end, 300);
        assert_eq!(orf.strand, Strand::Forward);
        assert_eq!(orf.frame, 0);
        assert_eq!(orf.length_aa, 100);
    }

    #[test]
    fn test_orf_equality() {
        let orf1 = Orf {
            start: 10,
            end: 100,
            strand: Strand::Reverse,
            frame: 1,
            length_aa: 30,
        };
        let orf2 = orf1.clone();
        assert_eq!(orf1, orf2);
    }
}
