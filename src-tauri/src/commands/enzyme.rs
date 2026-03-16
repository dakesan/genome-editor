use crate::state::AppState;
use genome_editor_core::Sequence;
use serde::Serialize;
use tauri::State;

/// DTO matching the frontend WasmCutSite type.
#[derive(Serialize)]
pub struct CutSiteDto {
    pub enzyme_name: String,
    pub position: usize,
    pub forward_cut: usize,
    pub reverse_cut: usize,
}

#[tauri::command]
pub fn compute_cut_sites(
    seq: String,
    is_circular: bool,
    enzymes: Vec<String>,
    state: State<AppState>,
) -> Result<Vec<CutSiteDto>, String> {
    let sequence = Sequence::new("query", seq.as_bytes(), is_circular);
    let cut_sites = state.enzyme_db.find_cut_sites(&sequence, &enzymes);

    Ok(cut_sites
        .into_iter()
        .map(|cs| CutSiteDto {
            enzyme_name: cs.enzyme_name,
            position: cs.position,
            forward_cut: cs.forward_cut,
            reverse_cut: cs.reverse_cut,
        })
        .collect())
}

#[tauri::command]
pub fn get_enzyme_names(state: State<AppState>) -> Vec<String> {
    state
        .enzyme_db
        .enzyme_names()
        .into_iter()
        .map(|s| s.to_string())
        .collect()
}
