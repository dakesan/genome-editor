/// Aho-Corasick based restriction enzyme cut site search engine.
use aho_corasick::AhoCorasick;
use genome_editor_core::enzyme::{CutSite, RestrictionEnzyme};
use genome_editor_core::{Sequence, complement};

use crate::iupac::expand_iupac;

/// Mapping from an Aho-Corasick pattern index back to the enzyme that produced it.
struct PatternMapping<'a> {
    enzyme: &'a RestrictionEnzyme,
    /// Whether this pattern was derived from the reverse complement (for
    /// non-palindromic enzymes).
    is_reverse_complement: bool,
}

/// Find all cut sites for the given enzymes in a sequence.
///
/// For each enzyme the IUPAC recognition sequence is expanded into concrete
/// patterns. All patterns are compiled into a single Aho-Corasick automaton
/// for efficient multi-pattern search.
///
/// For circular sequences, the search region is extended by
/// `max_recognition_len - 1` bases to detect matches that wrap around the
/// origin. Any match whose start position falls in the extended region is
/// mapped back to the original coordinate space.
pub fn find_cut_sites_for_enzymes(
    sequence: &Sequence,
    enzymes: &[&RestrictionEnzyme],
) -> Vec<CutSite> {
    if enzymes.is_empty() || sequence.bases.is_empty() {
        return Vec::new();
    }

    // Build pattern list and mapping.
    let mut patterns: Vec<Vec<u8>> = Vec::new();
    let mut mappings: Vec<PatternMapping> = Vec::new();

    let mut max_recog_len: usize = 0;

    for &enzyme in enzymes {
        let recog_len = enzyme.recognition_sequence.len();
        if recog_len > max_recog_len {
            max_recog_len = recog_len;
        }

        // Expand forward patterns.
        let expanded = expand_iupac(&enzyme.recognition_sequence);
        for pat in &expanded {
            patterns.push(pat.clone());
            mappings.push(PatternMapping {
                enzyme,
                is_reverse_complement: false,
            });
        }

        // For non-palindromic enzymes, also search the reverse complement.
        if !enzyme.is_palindromic {
            let rc_recog = reverse_complement_bytes(&enzyme.recognition_sequence);
            let rc_expanded = expand_iupac(&rc_recog);
            for pat in &rc_expanded {
                patterns.push(pat.clone());
                mappings.push(PatternMapping {
                    enzyme,
                    is_reverse_complement: true,
                });
            }
        }
    }

    if patterns.is_empty() {
        return Vec::new();
    }

    // Build the search haystack.
    let seq_len = sequence.length;
    let search_bytes: Vec<u8> = if sequence.is_circular && max_recog_len > 1 {
        let extension = max_recog_len - 1;
        let ext_len = extension.min(seq_len);
        let mut extended = Vec::with_capacity(seq_len + ext_len);
        extended.extend_from_slice(&sequence.bases);
        extended.extend_from_slice(&sequence.bases[..ext_len]);
        extended
    } else {
        sequence.bases.clone()
    };

    // Build Aho-Corasick automaton.
    let ac = AhoCorasick::new(&patterns).expect("patterns must be valid for Aho-Corasick");

    let mut sites: Vec<CutSite> = Vec::new();

    for mat in ac.find_iter(&search_bytes) {
        let pattern_idx = mat.pattern().as_usize();
        let mapping = &mappings[pattern_idx];
        let enzyme = mapping.enzyme;
        let recog_len = enzyme.recognition_sequence.len();

        let raw_pos = mat.start();

        // Skip matches that start at or beyond seq_len for circular sequences
        // (they are duplicates of matches that start within the sequence).
        // But we keep matches that start in [seq_len - recog_len + 1, seq_len)
        // only if they were found via the extension (their position wraps around).
        if raw_pos >= seq_len {
            continue;
        }

        // For circular sequences, the cut positions may wrap around.
        let position = raw_pos;

        let (forward_cut, reverse_cut) = if mapping.is_reverse_complement {
            // For reverse complement matches, the cut offsets are swapped:
            // forward cut uses reverse offset, reverse cut uses forward offset.
            let fc = wrap_position(
                position as isize + (recog_len as i32 - enzyme.cut_reverse) as isize,
                seq_len,
                sequence.is_circular,
            );
            let rc = wrap_position(
                position as isize + (recog_len as i32 - enzyme.cut_forward) as isize,
                seq_len,
                sequence.is_circular,
            );
            (fc, rc)
        } else {
            let fc = wrap_position(
                position as isize + enzyme.cut_forward as isize,
                seq_len,
                sequence.is_circular,
            );
            let rc = wrap_position(
                position as isize + enzyme.cut_reverse as isize,
                seq_len,
                sequence.is_circular,
            );
            (fc, rc)
        };

        sites.push(CutSite {
            enzyme_name: enzyme.name.clone(),
            position,
            forward_cut,
            reverse_cut,
        });
    }

    // Sort by position, then by enzyme name for deterministic output.
    sites.sort_by(|a, b| {
        a.position
            .cmp(&b.position)
            .then(a.enzyme_name.cmp(&b.enzyme_name))
    });

    // Deduplicate (palindromic enzymes may match both strands at the same
    // position, but since we only search forward for palindromic, this should
    // not happen — this is a safety net).
    sites.dedup();

    sites
}

/// Wrap a position into [0, seq_len) for circular sequences.
/// For linear sequences, the position is returned as-is (clamped to 0).
fn wrap_position(pos: isize, seq_len: usize, is_circular: bool) -> usize {
    if is_circular {
        pos.rem_euclid(seq_len as isize) as usize
    } else {
        pos.max(0) as usize
    }
}

/// Compute the reverse complement of a byte sequence.
fn reverse_complement_bytes(seq: &[u8]) -> Vec<u8> {
    seq.iter().rev().map(|&b| complement(b)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper to create a simple RestrictionEnzyme.
    fn make_enzyme(
        name: &str,
        seq: &[u8],
        cut_fwd: i32,
        cut_rev: i32,
        palindromic: bool,
    ) -> RestrictionEnzyme {
        RestrictionEnzyme {
            name: name.to_string(),
            recognition_sequence: seq.to_vec(),
            cut_forward: cut_fwd,
            cut_reverse: cut_rev,
            is_palindromic: palindromic,
        }
    }

    #[test]
    fn test_ecori_simple_sequence() {
        let ecori = make_enzyme("EcoRI", b"GAATTC", 1, 5, true);
        let seq = Sequence::new("test", b"AAGAATTCTT", false);
        let sites = find_cut_sites_for_enzymes(&seq, &[&ecori]);
        assert_eq!(sites.len(), 1);
        assert_eq!(sites[0].position, 2);
        assert_eq!(sites[0].forward_cut, 3);
        assert_eq!(sites[0].reverse_cut, 7);
        assert_eq!(sites[0].enzyme_name, "EcoRI");
    }

    #[test]
    fn test_multiple_enzymes() {
        let ecori = make_enzyme("EcoRI", b"GAATTC", 1, 5, true);
        let bamhi = make_enzyme("BamHI", b"GGATCC", 1, 5, true);
        let seq = Sequence::new("test", b"AAGAATTCAAGGATCCAA", false);
        let sites = find_cut_sites_for_enzymes(&seq, &[&ecori, &bamhi]);
        assert_eq!(sites.len(), 2);
        assert_eq!(sites[0].enzyme_name, "EcoRI");
        assert_eq!(sites[0].position, 2);
        assert_eq!(sites[1].enzyme_name, "BamHI");
        assert_eq!(sites[1].position, 10);
    }

    #[test]
    fn test_circular_boundary_crossing() {
        // Build a 10-bp circular sequence where EcoRI (GAATTC) wraps around.
        // Sequence: A T T C C C C C G A
        //           0 1 2 3 4 5 6 7 8 9
        // Extended: A T T C C C C C G A A T T C C
        // GAATTC starts at position 8: G(8) A(9) | A(0) T(1) T(2) C(3)
        let ecori = make_enzyme("EcoRI", b"GAATTC", 1, 5, true);
        let seq = Sequence::new("circ", b"ATTCCCCCGA", true);
        let sites = find_cut_sites_for_enzymes(&seq, &[&ecori]);
        assert_eq!(sites.len(), 1, "expected 1 cut site, got {:?}", sites);
        assert_eq!(sites[0].position, 8);
        // forward_cut = (8 + 1) % 10 = 9
        assert_eq!(sites[0].forward_cut, 9);
        // reverse_cut = (8 + 5) % 10 = 3
        assert_eq!(sites[0].reverse_cut, 3);
    }

    #[test]
    fn test_no_match() {
        let ecori = make_enzyme("EcoRI", b"GAATTC", 1, 5, true);
        let seq = Sequence::new("test", b"AAAAAAAAAA", false);
        let sites = find_cut_sites_for_enzymes(&seq, &[&ecori]);
        assert!(sites.is_empty());
    }

    #[test]
    fn test_empty_enzymes() {
        let seq = Sequence::new("test", b"GAATTC", false);
        let sites = find_cut_sites_for_enzymes(&seq, &[]);
        assert!(sites.is_empty());
    }

    #[test]
    fn test_empty_sequence() {
        let ecori = make_enzyme("EcoRI", b"GAATTC", 1, 5, true);
        let seq = Sequence::new("test", b"", false);
        let sites = find_cut_sites_for_enzymes(&seq, &[&ecori]);
        assert!(sites.is_empty());
    }

    #[test]
    fn test_palindromic_no_duplicates() {
        // EcoRI is palindromic. The reverse complement of GAATTC is GAATTC.
        // We should only get one hit, not two.
        let ecori = make_enzyme("EcoRI", b"GAATTC", 1, 5, true);
        let seq = Sequence::new("test", b"AAGAATTCAA", false);
        let sites = find_cut_sites_for_enzymes(&seq, &[&ecori]);
        assert_eq!(
            sites.len(),
            1,
            "palindromic enzyme should not produce duplicates"
        );
    }

    #[test]
    fn test_ecorv_blunt_end() {
        // EcoRV: GATATC, cuts 3/3 (blunt end).
        let ecorv = make_enzyme("EcoRV", b"GATATC", 3, 3, true);
        let seq = Sequence::new("test", b"AAGATATCAA", false);
        let sites = find_cut_sites_for_enzymes(&seq, &[&ecorv]);
        assert_eq!(sites.len(), 1);
        assert_eq!(sites[0].position, 2);
        assert_eq!(sites[0].forward_cut, 5);
        assert_eq!(sites[0].reverse_cut, 5);
    }

    #[test]
    fn test_multiple_matches_same_enzyme() {
        let ecori = make_enzyme("EcoRI", b"GAATTC", 1, 5, true);
        let seq = Sequence::new("test", b"GAATTCAAAGAATTC", false);
        let sites = find_cut_sites_for_enzymes(&seq, &[&ecori]);
        assert_eq!(sites.len(), 2);
        assert_eq!(sites[0].position, 0);
        assert_eq!(sites[1].position, 9);
    }

    #[test]
    fn test_wrap_position_circular() {
        assert_eq!(wrap_position(5, 10, true), 5);
        assert_eq!(wrap_position(10, 10, true), 0);
        assert_eq!(wrap_position(12, 10, true), 2);
        assert_eq!(wrap_position(-1, 10, true), 9);
    }

    #[test]
    fn test_wrap_position_linear() {
        assert_eq!(wrap_position(5, 10, false), 5);
        assert_eq!(wrap_position(10, 10, false), 10);
        assert_eq!(wrap_position(-1, 10, false), 0);
    }

    #[test]
    fn test_reverse_complement_bytes() {
        assert_eq!(reverse_complement_bytes(b"GAATTC"), b"GAATTC"); // palindromic
        assert_eq!(reverse_complement_bytes(b"ATGC"), b"GCAT");
        assert_eq!(reverse_complement_bytes(b""), b"");
    }

    #[test]
    fn test_puc19_ecori() {
        // The test GenBank file (pUC19.gb) is 2686 bp circular.
        // EcoRI (GAATTC) appears at 0-based position 449 in this file's sequence.
        let puc19_raw = include_str!("../../testdata/pUC19.gb");
        let bases = extract_genbank_sequence(puc19_raw);
        assert_eq!(bases.len(), 2686, "pUC19 should be 2686 bp");

        // Verify the recognition site is actually present at position 449.
        assert_eq!(&bases[449..455], b"GAATTC");

        let seq = Sequence::new("pUC19", &bases, true);

        let ecori = RestrictionEnzyme {
            name: "EcoRI".to_string(),
            recognition_sequence: b"GAATTC".to_vec(),
            cut_forward: 1,
            cut_reverse: 5,
            is_palindromic: true,
        };

        let sites = find_cut_sites_for_enzymes(&seq, &[&ecori]);
        assert_eq!(sites.len(), 1, "pUC19 should have exactly 1 EcoRI site");
        assert_eq!(
            sites[0].position, 449,
            "EcoRI site should be at 0-based position 449"
        );
        assert_eq!(sites[0].forward_cut, 450); // 449 + 1
        assert_eq!(sites[0].reverse_cut, 454); // 449 + 5
    }

    /// Minimal GenBank ORIGIN sequence extractor for testing purposes.
    fn extract_genbank_sequence(text: &str) -> Vec<u8> {
        let mut in_origin = false;
        let mut bases = Vec::new();
        for line in text.lines() {
            if line.starts_with("ORIGIN") {
                in_origin = true;
                continue;
            }
            if line.starts_with("//") {
                break;
            }
            if in_origin {
                for ch in line.chars() {
                    if ch.is_ascii_alphabetic() {
                        bases.push(ch.to_ascii_uppercase() as u8);
                    }
                }
            }
        }
        bases
    }
}
