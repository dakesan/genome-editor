/// REBASE enzyme data loading from embedded JSON.
use genome_editor_core::enzyme::RestrictionEnzyme;
use serde::Deserialize;

/// Intermediate struct for JSON deserialization.
#[derive(Deserialize)]
struct RawEnzyme {
    name: String,
    recognition_sequence: String,
    cut_forward: i32,
    cut_reverse: i32,
    is_palindromic: bool,
}

/// Embedded enzyme data compiled into the binary.
const REBASE_JSON: &str = include_str!("../data/rebase_enzymes.json");

/// Load all restriction enzymes from the embedded REBASE JSON data.
pub fn load_rebase_enzymes() -> Vec<RestrictionEnzyme> {
    let raw: Vec<RawEnzyme> =
        serde_json::from_str(REBASE_JSON).expect("embedded REBASE JSON must be valid");

    raw.into_iter()
        .map(|r| RestrictionEnzyme {
            name: r.name,
            recognition_sequence: r.recognition_sequence.into_bytes(),
            cut_forward: r.cut_forward,
            cut_reverse: r.cut_reverse,
            is_palindromic: r.is_palindromic,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_rebase_enzymes() {
        let enzymes = load_rebase_enzymes();
        assert!(
            enzymes.len() >= 40,
            "expected at least 40 enzymes, got {}",
            enzymes.len()
        );
    }

    #[test]
    fn test_ecori_data_integrity() {
        let enzymes = load_rebase_enzymes();
        let ecori = enzymes.iter().find(|e| e.name == "EcoRI").unwrap();
        assert_eq!(ecori.recognition_sequence, b"GAATTC");
        assert_eq!(ecori.cut_forward, 1);
        assert_eq!(ecori.cut_reverse, 5);
        assert!(ecori.is_palindromic);
    }

    #[test]
    fn test_all_enzymes_have_nonempty_fields() {
        let enzymes = load_rebase_enzymes();
        for enzyme in &enzymes {
            assert!(!enzyme.name.is_empty(), "enzyme name must not be empty");
            assert!(
                !enzyme.recognition_sequence.is_empty(),
                "recognition sequence must not be empty for {}",
                enzyme.name
            );
        }
    }
}
