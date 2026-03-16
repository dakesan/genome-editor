use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

/// A restriction enzyme definition.
#[derive(Debug, Clone, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct RestrictionEnzyme {
    /// Enzyme name (e.g., "EcoRI").
    pub name: String,
    /// Recognition sequence in IUPAC codes (e.g., b"GAATTC").
    #[tsify(type = "number[]")]
    pub recognition_sequence: Vec<u8>,
    /// Cut position on forward strand relative to recognition start.
    pub cut_forward: i32,
    /// Cut position on reverse strand relative to recognition start.
    pub cut_reverse: i32,
    /// Whether the recognition sequence is palindromic.
    pub is_palindromic: bool,
}

/// A cut site on a sequence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CutSite {
    /// Name of the enzyme that cuts here.
    pub enzyme_name: String,
    /// Start position of recognition sequence on the forward strand (0-based).
    pub position: usize,
    /// Position of the forward strand cut (0-based).
    pub forward_cut: usize,
    /// Position of the reverse strand cut (0-based).
    pub reverse_cut: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_restriction_enzyme_creation() {
        let enzyme = RestrictionEnzyme {
            name: "EcoRI".to_string(),
            recognition_sequence: b"GAATTC".to_vec(),
            cut_forward: 1,
            cut_reverse: 5,
            is_palindromic: true,
        };
        assert_eq!(enzyme.name, "EcoRI");
        assert_eq!(enzyme.recognition_sequence, b"GAATTC");
        assert!(enzyme.is_palindromic);
    }

    #[test]
    fn test_cut_site_creation() {
        let site = CutSite {
            enzyme_name: "EcoRI".to_string(),
            position: 100,
            forward_cut: 101,
            reverse_cut: 105,
        };
        assert_eq!(site.enzyme_name, "EcoRI");
        assert_eq!(site.position, 100);
    }

    #[test]
    fn test_cut_site_equality() {
        let site1 = CutSite {
            enzyme_name: "EcoRI".to_string(),
            position: 100,
            forward_cut: 101,
            reverse_cut: 105,
        };
        let site2 = site1.clone();
        assert_eq!(site1, site2);
    }
}
