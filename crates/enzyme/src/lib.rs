//! Restriction enzyme database and cut site search engine.
//!
//! This crate provides:
//! - An embedded REBASE enzyme database (`EnzymeDatabase::from_rebase()`)
//! - Aho-Corasick based multi-pattern search (`find_cut_sites`)
//! - IUPAC ambiguity code expansion

pub mod database;
pub mod iupac;
pub mod search;

use genome_editor_core::Sequence;
use genome_editor_core::enzyme::{CutSite, RestrictionEnzyme};

/// A database of restriction enzymes with efficient cut site searching.
pub struct EnzymeDatabase {
    enzymes: Vec<RestrictionEnzyme>,
}

impl EnzymeDatabase {
    /// Create a new database from a list of enzymes.
    pub fn new(enzymes: Vec<RestrictionEnzyme>) -> Self {
        Self { enzymes }
    }

    /// Load the built-in REBASE enzyme database.
    pub fn from_rebase() -> Self {
        Self {
            enzymes: database::load_rebase_enzymes(),
        }
    }

    /// Find cut sites for the selected enzymes in a sequence.
    ///
    /// Only enzymes whose names appear in `selected_enzymes` are used.
    /// Enzyme name matching is case-sensitive.
    pub fn find_cut_sites(&self, sequence: &Sequence, selected_enzymes: &[String]) -> Vec<CutSite> {
        let enzymes: Vec<&RestrictionEnzyme> = self
            .enzymes
            .iter()
            .filter(|e| selected_enzymes.iter().any(|name| name == &e.name))
            .collect();

        search::find_cut_sites_for_enzymes(sequence, &enzymes)
    }

    /// Return the names of all enzymes in the database.
    pub fn enzyme_names(&self) -> Vec<&str> {
        self.enzymes.iter().map(|e| e.name.as_str()).collect()
    }

    /// Look up an enzyme by name.
    pub fn get_enzyme(&self, name: &str) -> Option<&RestrictionEnzyme> {
        self.enzymes.iter().find(|e| e.name == name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_rebase_loads_all_enzymes() {
        let db = EnzymeDatabase::from_rebase();
        let names = db.enzyme_names();
        assert!(
            names.len() >= 40,
            "expected >= 40 enzymes, got {}",
            names.len()
        );
        assert!(names.contains(&"EcoRI"));
        assert!(names.contains(&"BamHI"));
        assert!(names.contains(&"HindIII"));
        assert!(names.contains(&"NotI"));
    }

    #[test]
    fn test_get_enzyme() {
        let db = EnzymeDatabase::from_rebase();
        let ecori = db.get_enzyme("EcoRI").expect("EcoRI should exist");
        assert_eq!(ecori.recognition_sequence, b"GAATTC");
        assert!(db.get_enzyme("NonExistent").is_none());
    }

    #[test]
    fn test_find_cut_sites_filters_by_name() {
        let db = EnzymeDatabase::from_rebase();
        let seq = Sequence::new("test", b"AAGAATTCAAGGATCCAA", false);

        // Only search EcoRI.
        let sites = db.find_cut_sites(&seq, &["EcoRI".to_string()]);
        assert_eq!(sites.len(), 1);
        assert_eq!(sites[0].enzyme_name, "EcoRI");

        // Search both.
        let sites = db.find_cut_sites(&seq, &["EcoRI".to_string(), "BamHI".to_string()]);
        assert_eq!(sites.len(), 2);
    }

    #[test]
    fn test_empty_selection_returns_empty() {
        let db = EnzymeDatabase::from_rebase();
        let seq = Sequence::new("test", b"GAATTC", false);
        let sites = db.find_cut_sites(&seq, &[]);
        assert!(sites.is_empty());
    }

    #[test]
    fn test_new_with_custom_enzymes() {
        let enzyme = RestrictionEnzyme {
            name: "Custom".to_string(),
            recognition_sequence: b"AAAA".to_vec(),
            cut_forward: 2,
            cut_reverse: 2,
            is_palindromic: true,
        };
        let db = EnzymeDatabase::new(vec![enzyme]);
        assert_eq!(db.enzyme_names(), vec!["Custom"]);

        let seq = Sequence::new("test", b"CCAAAACCCC", false);
        let sites = db.find_cut_sites(&seq, &["Custom".to_string()]);
        assert_eq!(sites.len(), 1);
        assert_eq!(sites[0].position, 2);
    }

    #[test]
    fn test_nonexistent_enzyme_selection() {
        let db = EnzymeDatabase::from_rebase();
        let seq = Sequence::new("test", b"GAATTC", false);
        let sites = db.find_cut_sites(&seq, &["FakeEnzyme".to_string()]);
        assert!(sites.is_empty());
    }
}
