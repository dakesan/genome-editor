use genome_editor_enzyme::EnzymeDatabase;

pub struct AppState {
    pub enzyme_db: EnzymeDatabase,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            enzyme_db: EnzymeDatabase::from_rebase(),
        }
    }
}
