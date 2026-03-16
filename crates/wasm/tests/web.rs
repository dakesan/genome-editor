//! Integration tests for WASM bindings using wasm-bindgen-test.
//!
//! These tests run in a headless browser environment and verify that
//! each WASM-exported function produces valid results.

use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

// ---------------------------------------------------------------------------
// Helper: extract a field from a JsValue object.
// ---------------------------------------------------------------------------

fn get_field(obj: &JsValue, key: &str) -> JsValue {
    js_sys::Reflect::get(obj, &JsValue::from_str(key)).unwrap_or(JsValue::UNDEFINED)
}

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

#[wasm_bindgen_test]
fn test_parse_genbank_wasm() {
    let puc19_data: &[u8] = include_bytes!("../../testdata/pUC19.gb");
    let result = genome_editor_wasm::parse_genbank_wasm(puc19_data);

    assert!(!result.is_null(), "parse_genbank_wasm returned null");

    let name = get_field(&result, "name");
    assert!(name.is_string(), "result should have a string 'name' field");

    let length = get_field(&result, "length");
    assert_eq!(
        length.as_f64().unwrap() as usize,
        2686,
        "pUC19 should be 2686 bp"
    );

    let is_circular = get_field(&result, "is_circular");
    assert_eq!(
        is_circular.as_bool(),
        Some(true),
        "pUC19 should be circular"
    );
}

#[wasm_bindgen_test]
fn test_parse_fasta_wasm() {
    let fasta_data = b">test_seq\nATGCGATCGATCG\n";
    let result = genome_editor_wasm::parse_fasta_wasm(fasta_data);

    assert!(!result.is_null(), "parse_fasta_wasm returned null");

    let name = get_field(&result, "name");
    assert_eq!(name.as_string().unwrap(), "test_seq");

    let length = get_field(&result, "length");
    assert_eq!(length.as_f64().unwrap() as usize, 13);
}

// ---------------------------------------------------------------------------
// Enzyme tests
// ---------------------------------------------------------------------------

#[wasm_bindgen_test]
fn test_get_enzyme_names() {
    let result = genome_editor_wasm::get_enzyme_names();
    assert!(!result.is_null(), "get_enzyme_names returned null");

    let arr = js_sys::Array::from(&result);
    assert!(
        arr.length() >= 40,
        "should have at least 40 enzymes, got {}",
        arr.length()
    );
}

#[wasm_bindgen_test]
fn test_find_cut_sites_wasm() {
    // EcoRI recognizes GAATTC; BamHI recognizes GGATCC.
    let seq = "AAGAATTCAAGGATCCAA";
    let enzyme_json = r#"["EcoRI","BamHI"]"#;
    let result = genome_editor_wasm::find_cut_sites_wasm(seq, false, enzyme_json);

    assert!(!result.is_null(), "find_cut_sites_wasm returned null");

    let arr = js_sys::Array::from(&result);
    assert_eq!(arr.length(), 2, "should find 2 cut sites (EcoRI + BamHI)");
}

#[wasm_bindgen_test]
fn test_find_single_cutters_wasm() {
    let puc19_data: &[u8] = include_bytes!("../../testdata/pUC19.gb");
    let parsed = genome_editor_wasm::parse_genbank_wasm(puc19_data);
    let seq_str = get_field(&parsed, "seq");
    let seq = seq_str.as_string().expect("seq should be a string");

    let result = genome_editor_wasm::find_single_cutters_wasm(&seq, true);

    assert!(!result.is_null(), "find_single_cutters_wasm returned null");

    let arr = js_sys::Array::from(&result);
    assert!(
        arr.length() > 0,
        "pUC19 should have at least one single-cutter"
    );

    // Verify EcoRI is among the single-cutters.
    let mut found_ecori = false;
    for i in 0..arr.length() {
        let item = arr.get(i);
        let name = get_field(&item, "enzyme_name");
        if name.as_string().as_deref() == Some("EcoRI") {
            found_ecori = true;
            break;
        }
    }
    assert!(found_ecori, "EcoRI should be a single-cutter in pUC19");
}

// ---------------------------------------------------------------------------
// ORF tests
// ---------------------------------------------------------------------------

#[wasm_bindgen_test]
fn test_find_orfs_wasm() {
    // A simple sequence with an ATG start and TAA stop codon.
    let seq = "ATGAAAGCGTAA";
    let result = genome_editor_wasm::find_orfs_wasm(seq, false, 1);

    assert!(!result.is_null(), "find_orfs_wasm returned null");

    let arr = js_sys::Array::from(&result);
    assert!(arr.length() >= 1, "should find at least 1 ORF");
}

// ---------------------------------------------------------------------------
// Alignment tests
// ---------------------------------------------------------------------------

#[wasm_bindgen_test]
fn test_pairwise_align_wasm() {
    let result = genome_editor_wasm::pairwise_align_wasm("ATGC", "ATGC", 2, -1, -5, -1);

    assert!(!result.is_null(), "pairwise_align_wasm returned null");

    let score = get_field(&result, "score");
    assert!(
        score.as_f64().unwrap() > 0.0,
        "alignment score should be positive"
    );

    let aligned_query = get_field(&result, "aligned_query");
    assert_eq!(aligned_query.as_string().unwrap(), "ATGC");

    let aligned_target = get_field(&result, "aligned_target");
    assert_eq!(aligned_target.as_string().unwrap(), "ATGC");

    let cigar = get_field(&result, "cigar");
    assert_eq!(cigar.as_string().unwrap(), "4M");
}

#[wasm_bindgen_test]
fn test_pairwise_align_wasm_with_mismatches() {
    let result = genome_editor_wasm::pairwise_align_wasm("ATGC", "ATCC", 2, -1, -5, -1);

    assert!(!result.is_null());

    let score = get_field(&result, "score");
    assert!(
        score.as_f64().unwrap() > 0.0,
        "alignment with mismatches should still have positive score"
    );
}

#[wasm_bindgen_test]
fn test_pairwise_align_wasm_empty_input() {
    let result = genome_editor_wasm::pairwise_align_wasm("", "ATGC", 2, -1, -5, -1);

    assert!(!result.is_null());

    let score = get_field(&result, "score");
    assert_eq!(
        score.as_f64().unwrap(),
        0.0,
        "empty query should give score 0"
    );
}
