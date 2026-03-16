//! IUPAC ambiguity code expansion for restriction enzyme recognition sequences.

/// Expand a single IUPAC code byte into the set of concrete bases it represents.
fn expand_base(base: u8) -> &'static [u8] {
    match base.to_ascii_uppercase() {
        b'A' => b"A",
        b'T' => b"T",
        b'G' => b"G",
        b'C' => b"C",
        b'R' => b"AG",
        b'Y' => b"CT",
        b'M' => b"AC",
        b'K' => b"GT",
        b'S' => b"GC",
        b'W' => b"AT",
        b'B' => b"CGT",
        b'D' => b"AGT",
        b'H' => b"ACT",
        b'V' => b"ACG",
        b'N' => b"ACGT",
        // Treat any unrecognized byte as fully ambiguous (N).
        _ => b"ACGT",
    }
}

/// Expand an IUPAC-encoded recognition pattern into all concrete DNA patterns.
///
/// For example, `b"GANTC"` expands to `[b"GAATC", b"GACTC", b"GAGTC", b"GATTC"]`.
///
/// Each ambiguous position multiplies the number of output patterns by the
/// number of bases that IUPAC code represents.
pub fn expand_iupac(pattern: &[u8]) -> Vec<Vec<u8>> {
    let mut results: Vec<Vec<u8>> = vec![Vec::with_capacity(pattern.len())];

    for &base in pattern {
        let expansions = expand_base(base);
        if expansions.len() == 1 {
            // Unambiguous base — just push to every existing pattern.
            for result in &mut results {
                result.push(expansions[0]);
            }
        } else {
            // Ambiguous base — fork every existing pattern.
            let mut new_results = Vec::with_capacity(results.len() * expansions.len());
            for result in &results {
                for &expanded in expansions {
                    let mut cloned = result.clone();
                    cloned.push(expanded);
                    new_results.push(cloned);
                }
            }
            results = new_results;
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expand_unambiguous() {
        let patterns = expand_iupac(b"GAATTC");
        assert_eq!(patterns.len(), 1);
        assert_eq!(patterns[0], b"GAATTC");
    }

    #[test]
    fn test_expand_single_ambiguity() {
        let mut patterns = expand_iupac(b"GANTC");
        patterns.sort();
        assert_eq!(patterns.len(), 4);
        assert_eq!(patterns[0], b"GAATC");
        assert_eq!(patterns[1], b"GACTC");
        assert_eq!(patterns[2], b"GAGTC");
        assert_eq!(patterns[3], b"GATTC");
    }

    #[test]
    fn test_expand_r_code() {
        let mut patterns = expand_iupac(b"RT");
        patterns.sort();
        assert_eq!(patterns.len(), 2);
        assert_eq!(patterns[0], b"AT");
        assert_eq!(patterns[1], b"GT");
    }

    #[test]
    fn test_expand_y_code() {
        let mut patterns = expand_iupac(b"YA");
        patterns.sort();
        assert_eq!(patterns.len(), 2);
        assert_eq!(patterns[0], b"CA");
        assert_eq!(patterns[1], b"TA");
    }

    #[test]
    fn test_expand_multiple_ambiguities() {
        let patterns = expand_iupac(b"RY");
        // R = A|G, Y = C|T => AC, AT, GC, GT
        assert_eq!(patterns.len(), 4);
        let mut sorted = patterns.clone();
        sorted.sort();
        assert_eq!(sorted[0], b"AC");
        assert_eq!(sorted[1], b"AT");
        assert_eq!(sorted[2], b"GC");
        assert_eq!(sorted[3], b"GT");
    }

    #[test]
    fn test_expand_n_code() {
        let patterns = expand_iupac(b"N");
        assert_eq!(patterns.len(), 4);
    }

    #[test]
    fn test_expand_empty() {
        let patterns = expand_iupac(b"");
        assert_eq!(patterns.len(), 1);
        assert!(patterns[0].is_empty());
    }

    #[test]
    fn test_expand_all_ambiguity_codes() {
        assert_eq!(expand_iupac(b"B").len(), 3); // C|G|T
        assert_eq!(expand_iupac(b"D").len(), 3); // A|G|T
        assert_eq!(expand_iupac(b"H").len(), 3); // A|C|T
        assert_eq!(expand_iupac(b"V").len(), 3); // A|C|G
        assert_eq!(expand_iupac(b"M").len(), 2); // A|C
        assert_eq!(expand_iupac(b"K").len(), 2); // G|T
        assert_eq!(expand_iupac(b"S").len(), 2); // G|C
        assert_eq!(expand_iupac(b"W").len(), 2); // A|T
    }

    #[test]
    fn test_expand_lowercase_treated_as_uppercase() {
        let upper = expand_iupac(b"GAATTC");
        let lower = expand_iupac(b"gaattc");
        assert_eq!(upper, lower);
    }
}
