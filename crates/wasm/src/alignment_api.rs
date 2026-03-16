//! WASM bindings for sequence alignment.

use genome_editor_core::alignment::AlignmentResult;
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

/// Alignment result data returned to JavaScript.
#[derive(Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct WasmAlignmentResult {
    pub score: i32,
    pub aligned_query: String,
    pub aligned_target: String,
    pub cigar: String,
}

impl From<&AlignmentResult> for WasmAlignmentResult {
    fn from(result: &AlignmentResult) -> Self {
        Self {
            score: result.score,
            aligned_query: result.aligned_query.clone(),
            aligned_target: result.aligned_target.clone(),
            cigar: result.cigar.clone(),
        }
    }
}

/// Perform Smith-Waterman local alignment of two sequences.
///
/// # Arguments
/// * `query` - The query sequence
/// * `target` - The target sequence
/// * `match_score` - Reward for matching bases (>= 0)
/// * `mismatch_penalty` - Penalty for mismatches (<= 0)
/// * `gap_open_penalty` - Penalty for opening a gap (<= 0)
/// * `gap_extend_penalty` - Penalty for extending a gap (<= 0)
#[wasm_bindgen]
pub fn pairwise_align_wasm(
    query: &str,
    target: &str,
    match_score: i32,
    mismatch_penalty: i32,
    gap_open_penalty: i32,
    gap_extend_penalty: i32,
) -> JsValue {
    let result = genome_editor_alignment::pairwise_align(
        query.as_bytes(),
        target.as_bytes(),
        match_score,
        mismatch_penalty,
        gap_open_penalty,
        gap_extend_penalty,
    );
    let wasm_result = WasmAlignmentResult::from(&result);
    serde_wasm_bindgen::to_value(&wasm_result).unwrap_or(JsValue::NULL)
}
