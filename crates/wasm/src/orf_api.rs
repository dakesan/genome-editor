//! WASM bindings for ORF detection.

use genome_editor_core::Strand;
use genome_editor_core::orf::Orf;
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

use crate::build_sequence;

/// ORF data returned to JavaScript.
#[derive(Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct WasmOrf {
    pub start: usize,
    pub end: usize,
    pub strand: String,
    pub frame: u8,
    pub length_aa: usize,
}

impl From<&Orf> for WasmOrf {
    fn from(orf: &Orf) -> Self {
        let strand = match orf.strand {
            Strand::Forward => "forward".to_string(),
            Strand::Reverse => "reverse".to_string(),
            Strand::Both => "both".to_string(),
        };
        Self {
            start: orf.start,
            end: orf.end,
            strand,
            frame: orf.frame,
            length_aa: orf.length_aa,
        }
    }
}

/// Find ORFs in a sequence using the standard genetic code.
///
/// # Arguments
/// * `seq_bases` - The DNA sequence as a string
/// * `is_circular` - Whether the sequence is circular
/// * `min_length_aa` - Minimum ORF length in amino acids
#[wasm_bindgen]
pub fn find_orfs_wasm(seq_bases: &str, is_circular: bool, min_length_aa: usize) -> JsValue {
    let sequence = build_sequence("query", seq_bases, is_circular);
    let orfs = genome_editor_orf::find_orfs_default(&sequence, min_length_aa);

    let result: Vec<WasmOrf> = orfs.iter().map(WasmOrf::from).collect();
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}
