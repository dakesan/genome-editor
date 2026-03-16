//! WASM bindings for restriction enzyme cut site detection.

use genome_editor_core::enzyme::CutSite;
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

use crate::build_sequence;

/// Cut site data returned to JavaScript.
#[derive(Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct WasmCutSite {
    pub enzyme_name: String,
    pub position: usize,
    pub forward_cut: usize,
    pub reverse_cut: usize,
}

impl From<&CutSite> for WasmCutSite {
    fn from(site: &CutSite) -> Self {
        Self {
            enzyme_name: site.enzyme_name.clone(),
            position: site.position,
            forward_cut: site.forward_cut,
            reverse_cut: site.reverse_cut,
        }
    }
}

/// Find restriction enzyme cut sites in a sequence.
///
/// # Arguments
/// * `seq_bases` - The DNA sequence as a string (e.g., "ATGCGATCG...")
/// * `is_circular` - Whether the sequence is circular
/// * `enzyme_names_json` - JSON array of enzyme names (e.g., '["EcoRI","BamHI"]')
#[wasm_bindgen]
pub fn find_cut_sites_wasm(seq_bases: &str, is_circular: bool, enzyme_names_json: &str) -> JsValue {
    let enzyme_names: Vec<String> = match serde_json::from_str(enzyme_names_json) {
        Ok(names) => names,
        Err(e) => {
            let error = serde_json::json!({ "error": format!("invalid enzyme names JSON: {}", e) });
            return serde_wasm_bindgen::to_value(&error).unwrap_or(JsValue::NULL);
        }
    };

    let sequence = build_sequence("query", seq_bases, is_circular);
    let db = genome_editor_enzyme::EnzymeDatabase::from_rebase();
    let cut_sites = db.find_cut_sites(&sequence, &enzyme_names);

    let result: Vec<WasmCutSite> = cut_sites.iter().map(WasmCutSite::from).collect();
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}
