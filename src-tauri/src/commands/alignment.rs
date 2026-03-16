use genome_editor_alignment::pairwise_align;
use serde::Serialize;

/// DTO matching the frontend alignment result type.
#[derive(Serialize)]
pub struct AlignmentResultDto {
    pub score: i32,
    pub aligned_query: String,
    pub aligned_target: String,
    pub cigar: String,
}

#[tauri::command]
pub fn align_sequences(query: String, target: String) -> Result<AlignmentResultDto, String> {
    let result = pairwise_align(query.as_bytes(), target.as_bytes(), 2, -1, -5, -1);

    Ok(AlignmentResultDto {
        score: result.score,
        aligned_query: result.aligned_query,
        aligned_target: result.aligned_target,
        cigar: result.cigar,
    })
}
