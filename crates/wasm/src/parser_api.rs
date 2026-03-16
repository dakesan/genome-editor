//! WASM bindings for GenBank/FASTA parsing.

use genome_editor_core::{Annotation, Sequence};
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

/// Parsed sequence data returned to JavaScript.
#[derive(Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct WasmParsedSequence {
    pub name: String,
    pub seq: String,
    pub is_circular: bool,
    pub length: usize,
    pub annotations: Vec<WasmAnnotation>,
}

/// Annotation data returned to JavaScript.
#[derive(Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct WasmAnnotation {
    pub name: String,
    pub start: usize,
    pub end: usize,
    pub direction: i32,
    pub color: Option<String>,
    #[serde(rename = "type")]
    pub feature_type: String,
}

impl From<(&Sequence, &[Annotation])> for WasmParsedSequence {
    fn from((seq, annotations): (&Sequence, &[Annotation])) -> Self {
        Self {
            name: seq.name.clone(),
            seq: seq.as_str().to_string(),
            is_circular: seq.is_circular,
            length: seq.length,
            annotations: annotations.iter().map(WasmAnnotation::from).collect(),
        }
    }
}

impl From<&Annotation> for WasmAnnotation {
    fn from(ann: &Annotation) -> Self {
        let direction = match ann.strand {
            genome_editor_core::Strand::Forward => 1,
            genome_editor_core::Strand::Reverse => -1,
            genome_editor_core::Strand::Both => 0,
        };
        let feature_type = match &ann.feature_type {
            genome_editor_core::FeatureType::Cds => "CDS".to_string(),
            genome_editor_core::FeatureType::Gene => "gene".to_string(),
            genome_editor_core::FeatureType::Promoter => "promoter".to_string(),
            genome_editor_core::FeatureType::Terminator => "terminator".to_string(),
            genome_editor_core::FeatureType::RepOrigin => "rep_origin".to_string(),
            genome_editor_core::FeatureType::Misc => "misc_feature".to_string(),
            genome_editor_core::FeatureType::Other(s) => s.clone(),
        };
        Self {
            name: ann.name.clone(),
            start: ann.start,
            end: ann.end,
            direction,
            color: ann.color.clone(),
            feature_type,
        }
    }
}

/// Parse a GenBank format file from bytes and return JSON result.
#[wasm_bindgen]
pub fn parse_genbank_wasm(data: &[u8]) -> JsValue {
    match genome_editor_parser::parse_genbank(data) {
        Ok((seq, annotations)) => {
            let result = WasmParsedSequence::from((&seq, annotations.as_slice()));
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
        Err(e) => {
            let error = serde_json::json!({ "error": e.to_string() });
            serde_wasm_bindgen::to_value(&error).unwrap_or(JsValue::NULL)
        }
    }
}

/// Parse a FASTA format file from bytes and return JSON result.
/// Returns the first sequence only (for compatibility with single-sequence UI).
#[wasm_bindgen]
pub fn parse_fasta_wasm(data: &[u8]) -> JsValue {
    match genome_editor_parser::parse_fasta(data) {
        Ok(sequences) => {
            if let Some(seq) = sequences.first() {
                let result = WasmParsedSequence {
                    name: seq.name.clone(),
                    seq: seq.as_str().to_string(),
                    is_circular: seq.is_circular,
                    length: seq.length,
                    annotations: vec![],
                };
                serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
            } else {
                let error = serde_json::json!({ "error": "no sequences found" });
                serde_wasm_bindgen::to_value(&error).unwrap_or(JsValue::NULL)
            }
        }
        Err(e) => {
            let error = serde_json::json!({ "error": e.to_string() });
            serde_wasm_bindgen::to_value(&error).unwrap_or(JsValue::NULL)
        }
    }
}
