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

    /// Find restriction enzymes that cut the sequence exactly once ("single cutters").
    ///
    /// These are especially useful for cloning, as a single-cutter enzyme
    /// linearizes a circular plasmid at exactly one site.
    pub fn find_single_cutters(&self, sequence: &Sequence) -> Vec<CutSite> {
        let all_names: Vec<String> = self.enzyme_names().iter().map(|s| s.to_string()).collect();
        let all_sites = self.find_cut_sites(sequence, &all_names);

        // Group sites by enzyme name and keep only those with exactly one hit.
        let mut counts: std::collections::HashMap<&str, Vec<&CutSite>> =
            std::collections::HashMap::new();
        for site in &all_sites {
            counts.entry(&site.enzyme_name).or_default().push(site);
        }

        counts
            .into_values()
            .filter(|sites| sites.len() == 1)
            .map(|sites| sites[0].clone())
            .collect()
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

    #[test]
    fn test_find_single_cutters_puc19() {
        let db = EnzymeDatabase::from_rebase();
        // pUC19 test data
        let puc19_data = include_bytes!("../../testdata/pUC19.gb");
        let (seq, _) = genome_editor_parser::parse_genbank(puc19_data).unwrap();
        let singles = db.find_single_cutters(&seq);
        // EcoRI should be a single-cutter in pUC19
        let ecori_sites: Vec<_> = singles
            .iter()
            .filter(|s| s.enzyme_name == "EcoRI")
            .collect();
        assert_eq!(
            ecori_sites.len(),
            1,
            "EcoRI should be a single-cutter in pUC19"
        );
    }

    #[test]
    fn test_find_single_cutters_excludes_multi_cutters() {
        let db = EnzymeDatabase::from_rebase();
        let puc19_data = include_bytes!("../../testdata/pUC19.gb");
        let (seq, _) = genome_editor_parser::parse_genbank(puc19_data).unwrap();
        let singles = db.find_single_cutters(&seq);
        // All results should be unique enzyme names (each appearing exactly once)
        let mut names: Vec<&str> = singles.iter().map(|s| s.enzyme_name.as_str()).collect();
        names.sort();
        let unique_count = names.len();
        names.dedup();
        assert_eq!(
            names.len(),
            unique_count,
            "each enzyme should appear exactly once in single cutters"
        );
    }

    #[test]
    fn test_find_single_cutters_no_cut_sequence() {
        let db = EnzymeDatabase::from_rebase();
        // Very short sequence unlikely to have any recognition sites
        let seq = Sequence::new("tiny", b"AAAA", false);
        let singles = db.find_single_cutters(&seq);
        assert!(singles.is_empty());
    }
}
