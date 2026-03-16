pub mod alignment;
pub mod enzyme;
pub mod orf;

use std::collections::HashMap;
use std::fmt;

use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

/// DNA strand direction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Strand {
    Forward,
    Reverse,
    Both,
}

impl fmt::Display for Strand {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Strand::Forward => write!(f, "+"),
            Strand::Reverse => write!(f, "-"),
            Strand::Both => write!(f, "."),
        }
    }
}

/// Biological feature type for annotations.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum FeatureType {
    Cds,
    Gene,
    Promoter,
    Terminator,
    RepOrigin,
    Misc,
    Other(String),
}

impl From<&str> for FeatureType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "cds" => FeatureType::Cds,
            "gene" => FeatureType::Gene,
            "promoter" => FeatureType::Promoter,
            "terminator" => FeatureType::Terminator,
            "rep_origin" => FeatureType::RepOrigin,
            "misc_feature" | "misc" => FeatureType::Misc,
            other => FeatureType::Other(other.to_string()),
        }
    }
}

/// A DNA/RNA sequence with metadata.
#[derive(Debug, Clone, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Sequence {
    pub name: String,
    #[tsify(type = "number[]")]
    pub bases: Vec<u8>,
    pub is_circular: bool,
    pub length: usize,
}

impl Sequence {
    /// Create a new Sequence from a byte slice.
    pub fn new(name: &str, bases: &[u8], is_circular: bool) -> Self {
        let length = bases.len();
        Self {
            name: name.to_string(),
            bases: bases.to_ascii_uppercase(),
            is_circular,
            length,
        }
    }

    /// Get the reverse complement of the sequence.
    pub fn reverse_complement(&self) -> Vec<u8> {
        self.bases.iter().rev().map(|&b| complement(b)).collect()
    }

    /// Get the base string as &str (ASCII).
    pub fn as_str(&self) -> &str {
        std::str::from_utf8(&self.bases).unwrap_or("")
    }
}

/// Return the complement of a DNA base.
pub fn complement(base: u8) -> u8 {
    match base {
        b'A' => b'T',
        b'T' => b'A',
        b'G' => b'C',
        b'C' => b'G',
        b'a' => b't',
        b't' => b'a',
        b'g' => b'c',
        b'c' => b'g',
        _ => b'N',
    }
}

/// An annotation (feature) on a sequence.
#[derive(Debug, Clone, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Annotation {
    pub name: String,
    pub feature_type: FeatureType,
    pub start: usize,
    pub end: usize,
    pub strand: Strand,
    #[tsify(type = "Record<string, string>")]
    pub qualifiers: HashMap<String, String>,
    pub color: Option<String>,
}

/// Error types for genome-editor operations.
#[derive(Debug, thiserror::Error)]
pub enum GenomeError {
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("Invalid sequence: {0}")]
    InvalidSequence(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Other(String),
}

pub type GenomeResult<T> = Result<T, GenomeError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sequence_new() {
        let seq = Sequence::new("test", b"ATGCN", false);
        assert_eq!(seq.name, "test");
        assert_eq!(seq.bases, b"ATGCN");
        assert_eq!(seq.length, 5);
        assert!(!seq.is_circular);
    }

    #[test]
    fn test_sequence_uppercase() {
        let seq = Sequence::new("test", b"atgcn", false);
        assert_eq!(seq.bases, b"ATGCN");
    }

    #[test]
    fn test_reverse_complement() {
        let seq = Sequence::new("test", b"ATGC", false);
        assert_eq!(seq.reverse_complement(), b"GCAT");
    }

    #[test]
    fn test_complement() {
        assert_eq!(complement(b'A'), b'T');
        assert_eq!(complement(b'T'), b'A');
        assert_eq!(complement(b'G'), b'C');
        assert_eq!(complement(b'C'), b'G');
        assert_eq!(complement(b'N'), b'N');
    }

    #[test]
    fn test_strand_display() {
        assert_eq!(format!("{}", Strand::Forward), "+");
        assert_eq!(format!("{}", Strand::Reverse), "-");
        assert_eq!(format!("{}", Strand::Both), ".");
    }

    #[test]
    fn test_feature_type_from_str() {
        assert_eq!(FeatureType::from("CDS"), FeatureType::Cds);
        assert_eq!(FeatureType::from("gene"), FeatureType::Gene);
        assert_eq!(FeatureType::from("promoter"), FeatureType::Promoter);
        assert_eq!(
            FeatureType::from("unknown"),
            FeatureType::Other("unknown".to_string())
        );
    }

    #[test]
    fn test_sequence_as_str() {
        let seq = Sequence::new("test", b"ATGC", false);
        assert_eq!(seq.as_str(), "ATGC");
    }
}
