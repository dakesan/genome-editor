//! WASM entry point for genome-editor.
//!
//! Exposes Rust computation engines to JavaScript via wasm-bindgen.

use genome_editor_core::Sequence;
use wasm_bindgen::prelude::*;

mod enzyme_api;
mod orf_api;
mod parser_api;

pub use enzyme_api::*;
pub use orf_api::*;
pub use parser_api::*;

/// Get the list of available enzyme names from the built-in REBASE database.
#[wasm_bindgen]
pub fn get_enzyme_names() -> JsValue {
    let db = genome_editor_enzyme::EnzymeDatabase::from_rebase();
    let names: Vec<&str> = db.enzyme_names();
    serde_wasm_bindgen::to_value(&names).unwrap_or(JsValue::NULL)
}

/// Internal helper: build a Sequence from string fields.
fn build_sequence(name: &str, bases: &str, is_circular: bool) -> Sequence {
    Sequence::new(name, bases.as_bytes(), is_circular)
}
