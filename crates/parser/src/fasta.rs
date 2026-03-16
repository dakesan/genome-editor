// FASTA format parser (no external dependencies).

use genome_editor_core::{GenomeError, GenomeResult, Sequence};

/// Parse a FASTA format file from bytes.
///
/// Supports multi-sequence FASTA files. Each sequence starts with a header
/// line beginning with `>`. Sequence lines are concatenated and whitespace
/// is stripped.
///
/// All sequences are returned as linear (`is_circular = false`).
pub fn parse_fasta(data: &[u8]) -> GenomeResult<Vec<Sequence>> {
    if data.is_empty() {
        return Err(GenomeError::Parse("empty input data".to_string()));
    }

    let text =
        std::str::from_utf8(data).map_err(|e| GenomeError::Parse(format!("invalid UTF-8: {e}")))?;

    let mut sequences = Vec::new();
    let mut current_name: Option<String> = None;
    let mut current_bases = Vec::new();

    for line in text.lines() {
        let line = line.trim();

        if line.is_empty() {
            // Skip blank lines.
            continue;
        }

        if let Some(header) = line.strip_prefix('>') {
            // Flush previous sequence if any.
            if let Some(name) = current_name.take() {
                if current_bases.is_empty() {
                    return Err(GenomeError::Parse(format!(
                        "sequence '{}' has no bases",
                        name
                    )));
                }
                sequences.push(Sequence::new(&name, &current_bases, false));
                current_bases.clear();
            }

            let name = header.trim();
            if name.is_empty() {
                return Err(GenomeError::Parse(
                    "FASTA header line has no name after '>'".to_string(),
                ));
            }
            current_name = Some(name.to_string());
        } else if line.starts_with(';') {
            // Comment line; skip.
            continue;
        } else {
            // Sequence data line.
            if current_name.is_none() {
                return Err(GenomeError::Parse(
                    "sequence data found before any FASTA header line".to_string(),
                ));
            }
            // Collect only alphabetic characters (strip digits, spaces, etc.).
            for &b in line.as_bytes() {
                if b.is_ascii_alphabetic() {
                    current_bases.push(b);
                }
            }
        }
    }

    // Flush last sequence.
    if let Some(name) = current_name.take() {
        if current_bases.is_empty() {
            return Err(GenomeError::Parse(format!(
                "sequence '{}' has no bases",
                name
            )));
        }
        sequences.push(Sequence::new(&name, &current_bases, false));
    }

    if sequences.is_empty() {
        return Err(GenomeError::Parse(
            "no FASTA sequences found in input".to_string(),
        ));
    }

    Ok(sequences)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_fasta() {
        let data = b">seq1\nATGCATGC\n";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs.len(), 1);
        assert_eq!(seqs[0].name, "seq1");
        assert_eq!(seqs[0].bases, b"ATGCATGC");
        assert_eq!(seqs[0].length, 8);
        assert!(!seqs[0].is_circular);
    }

    #[test]
    fn test_parse_multiline_sequence() {
        let data = b">seq1\nATGC\nGCTA\nAAAA\n";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs.len(), 1);
        assert_eq!(seqs[0].bases, b"ATGCGCTAAAAA");
        assert_eq!(seqs[0].length, 12);
    }

    #[test]
    fn test_parse_multi_sequence() {
        let data = b">seq1\nATGC\n>seq2\nGCTA\n>seq3\nTTTT\n";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs.len(), 3);
        assert_eq!(seqs[0].name, "seq1");
        assert_eq!(seqs[0].bases, b"ATGC");
        assert_eq!(seqs[1].name, "seq2");
        assert_eq!(seqs[1].bases, b"GCTA");
        assert_eq!(seqs[2].name, "seq3");
        assert_eq!(seqs[2].bases, b"TTTT");
    }

    #[test]
    fn test_parse_fasta_header_with_description() {
        let data = b">seq1 some description here\nATGC\n";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs[0].name, "seq1 some description here");
    }

    #[test]
    fn test_parse_fasta_uppercase_conversion() {
        let data = b">seq1\natgcn\n";
        let seqs = parse_fasta(data).unwrap();
        // Sequence::new uppercases.
        assert_eq!(seqs[0].bases, b"ATGCN");
    }

    #[test]
    fn test_parse_fasta_skips_blank_lines() {
        let data = b">seq1\n\nATGC\n\nGCTA\n\n";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs.len(), 1);
        assert_eq!(seqs[0].bases, b"ATGCGCTA");
    }

    #[test]
    fn test_parse_fasta_skips_comment_lines() {
        let data = b"; this is a comment\n>seq1\n; another comment\nATGC\n";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs.len(), 1);
        assert_eq!(seqs[0].bases, b"ATGC");
    }

    #[test]
    fn test_parse_fasta_strips_whitespace() {
        let data = b">seq1\n  ATGC  \n  GCTA  \n";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs[0].bases, b"ATGCGCTA");
    }

    #[test]
    fn test_parse_fasta_strips_digits() {
        // Some FASTA files have numbering on sequence lines.
        let data = b">seq1\n1 ATGC\n2 GCTA\n";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs[0].bases, b"ATGCGCTA");
    }

    #[test]
    fn test_error_empty_data() {
        let result = parse_fasta(b"");
        assert!(result.is_err());
    }

    #[test]
    fn test_error_no_header() {
        let result = parse_fasta(b"ATGCATGC\n");
        assert!(result.is_err());
    }

    #[test]
    fn test_error_empty_header_name() {
        let result = parse_fasta(b">\nATGC\n");
        assert!(result.is_err());
    }

    #[test]
    fn test_error_header_only_no_sequence() {
        let result = parse_fasta(b">seq1\n");
        assert!(result.is_err());
    }

    #[test]
    fn test_error_second_sequence_empty() {
        let result = parse_fasta(b">seq1\nATGC\n>seq2\n");
        assert!(result.is_err());
    }

    #[test]
    fn test_all_sequences_are_linear() {
        let data = b">s1\nATGC\n>s2\nGCTA\n";
        let seqs = parse_fasta(data).unwrap();
        for seq in &seqs {
            assert!(!seq.is_circular);
        }
    }

    #[test]
    fn test_no_trailing_newline() {
        let data = b">seq1\nATGC";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs.len(), 1);
        assert_eq!(seqs[0].bases, b"ATGC");
    }

    #[test]
    fn test_windows_line_endings() {
        let data = b">seq1\r\nATGC\r\nGCTA\r\n";
        let seqs = parse_fasta(data).unwrap();
        assert_eq!(seqs.len(), 1);
        assert_eq!(seqs[0].bases, b"ATGCGCTA");
    }
}
