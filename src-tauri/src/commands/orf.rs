use genome_editor_core::{Sequence, Strand};
use genome_editor_orf::find_orfs_default;
use serde::Serialize;

/// DTO matching the frontend WasmOrf type.
#[derive(Serialize)]
pub struct OrfDto {
    pub start: usize,
    pub end: usize,
    pub strand: String,
    pub frame: u8,
    pub length_aa: usize,
}

fn strand_to_string(strand: &Strand) -> String {
    match strand {
        Strand::Forward => "forward".to_string(),
        Strand::Reverse => "reverse".to_string(),
        Strand::Both => "both".to_string(),
    }
}

#[tauri::command]
pub fn detect_orfs(
    seq: String,
    is_circular: bool,
    min_length: usize,
) -> Result<Vec<OrfDto>, String> {
    let sequence = Sequence::new("query", seq.as_bytes(), is_circular);
    let orfs = find_orfs_default(&sequence, min_length);

    Ok(orfs
        .into_iter()
        .map(|orf| OrfDto {
            start: orf.start,
            end: orf.end,
            strand: strand_to_string(&orf.strand),
            frame: orf.frame,
            length_aa: orf.length_aa,
        })
        .collect())
}
