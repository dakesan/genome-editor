// GenBank format parser and writer using gb-io.

use std::collections::HashMap;

use gb_io::reader::SeqReader;
use gb_io::seq::{Feature, Location, Topology};
use genome_editor_core::{Annotation, FeatureType, GenomeError, GenomeResult, Sequence, Strand};

/// Determine whether a gb-io `Location` is on the complement strand.
fn is_complement(loc: &Location) -> bool {
    match loc {
        Location::Complement(_) => true,
        Location::Join(parts) | Location::Order(parts) => {
            // If any part is complement, treat the whole location as complement.
            parts.iter().any(is_complement)
        }
        _ => false,
    }
}

/// Return a color string based on the feature type.
fn color_for_feature_type(ft: &FeatureType) -> &'static str {
    match ft {
        FeatureType::Cds => "#4B7BE5",
        FeatureType::Gene => "#2E8B57",
        FeatureType::Promoter => "#E53E3E",
        FeatureType::Terminator => "#805AD5",
        FeatureType::RepOrigin => "#DD6B20",
        FeatureType::Misc => "#A0AEC0",
        FeatureType::Other(_) => "#718096",
    }
}

/// Convert a gb-io `Feature` into a core `Annotation`.
fn convert_feature(feature: &Feature) -> Annotation {
    let kind_str: &str = &feature.kind;
    let feature_type = FeatureType::from(kind_str);

    // Determine strand from location.
    let strand = if is_complement(&feature.location) {
        Strand::Reverse
    } else {
        Strand::Forward
    };

    // Determine start/end from location bounds (0-based, exclusive end).
    let (start, end) = feature
        .location
        .find_bounds()
        .map(|(s, e)| (s as usize, e as usize))
        .unwrap_or((0, 0));

    // Collect qualifiers into a HashMap.
    // gb-io stores qualifiers as Vec<(QualifierKey, Option<String>)>.
    // A qualifier key can appear multiple times; we keep the first value.
    let mut qualifiers = HashMap::new();
    for (key, value) in &feature.qualifiers {
        if let Some(val) = value {
            let key_str: &str = key;
            qualifiers
                .entry(key_str.to_string())
                .or_insert_with(|| val.clone());
        }
    }

    // Determine annotation name: /label > /gene > /product > feature type key.
    let name = qualifiers
        .get("label")
        .or_else(|| qualifiers.get("gene"))
        .or_else(|| qualifiers.get("product"))
        .cloned()
        .unwrap_or_else(|| kind_str.to_string());

    let color = color_for_feature_type(&feature_type).to_string();

    Annotation {
        name,
        feature_type,
        start,
        end,
        strand,
        qualifiers,
        color: Some(color),
    }
}

/// Parse a GenBank format file from bytes.
///
/// Returns the first sequence record and its annotations.
/// Returns an error if the data cannot be parsed or contains no records.
pub fn parse_genbank(data: &[u8]) -> GenomeResult<(Sequence, Vec<Annotation>)> {
    if data.is_empty() {
        return Err(GenomeError::Parse("empty input data".to_string()));
    }

    let mut reader = SeqReader::new(data);
    let gb_seq = reader
        .next()
        .ok_or_else(|| GenomeError::Parse("no records found in GenBank data".to_string()))?
        .map_err(|e| GenomeError::Parse(format!("GenBank parse error: {e}")))?;

    let is_circular = gb_seq.topology == Topology::Circular;
    let name = gb_seq.name.clone().unwrap_or_else(|| "unnamed".to_string());

    let sequence = Sequence::new(&name, &gb_seq.seq, is_circular);

    let annotations: Vec<Annotation> = gb_seq.features.iter().map(convert_feature).collect();

    Ok((sequence, annotations))
}

/// Write a minimal GenBank file from a `Sequence` and its `Annotation`s.
///
/// Produces a valid GenBank file containing LOCUS, FEATURES, ORIGIN, and
/// terminator lines. The output is not intended to be a byte-perfect
/// round-trip of the original file.
pub fn write_genbank(seq: &Sequence, annotations: &[Annotation]) -> GenomeResult<Vec<u8>> {
    let mut out = Vec::new();

    // LOCUS line
    let topology = if seq.is_circular {
        "circular"
    } else {
        "linear"
    };
    let locus_line = format!(
        "LOCUS       {:<16} {:>11} bp    DNA     {:<8} UNK 01-JAN-1970\n",
        truncate_name(&seq.name, 16),
        seq.length,
        topology,
    );
    out.extend_from_slice(locus_line.as_bytes());

    // FEATURES
    if !annotations.is_empty() {
        out.extend_from_slice(b"FEATURES             Location/Qualifiers\n");
        for ann in annotations {
            let kind = feature_type_to_key(&ann.feature_type);
            let location = format_location(ann);
            // Feature key line: 5 spaces + key (padded to 16) + location
            let feature_line = format!("     {:<16}{}\n", kind, location);
            out.extend_from_slice(feature_line.as_bytes());

            // Write qualifiers
            for (key, value) in &ann.qualifiers {
                let qual_line = format!("                     /{}=\"{}\"\n", key, value);
                out.extend_from_slice(qual_line.as_bytes());
            }
        }
    }

    // ORIGIN
    out.extend_from_slice(b"ORIGIN\n");
    let seq_lower: Vec<u8> = seq.bases.iter().map(|b| b.to_ascii_lowercase()).collect();
    for (i, chunk) in seq_lower.chunks(60).enumerate() {
        let pos = i * 60 + 1;
        let mut line = format!("{:>9}", pos);
        for sub in chunk.chunks(10) {
            line.push(' ');
            // Safety: GenBank bases are always ASCII.
            line.push_str(std::str::from_utf8(sub).unwrap_or(""));
        }
        line.push('\n');
        out.extend_from_slice(line.as_bytes());
    }

    // Terminator
    out.extend_from_slice(b"//\n");

    Ok(out)
}

/// Truncate a name to `max_len` characters.
fn truncate_name(name: &str, max_len: usize) -> &str {
    if name.len() <= max_len {
        name
    } else {
        &name[..max_len]
    }
}

/// Convert a `FeatureType` back to a GenBank feature key string.
fn feature_type_to_key(ft: &FeatureType) -> &str {
    match ft {
        FeatureType::Cds => "CDS",
        FeatureType::Gene => "gene",
        FeatureType::Promoter => "promoter",
        FeatureType::Terminator => "terminator",
        FeatureType::RepOrigin => "rep_origin",
        FeatureType::Misc => "misc_feature",
        FeatureType::Other(s) => s,
    }
}

/// Format the location string for an annotation.
/// Uses 1-based inclusive coordinates for GenBank format.
fn format_location(ann: &Annotation) -> String {
    // Convert from 0-based exclusive-end to 1-based inclusive (GenBank convention).
    let start = ann.start + 1;
    let end = ann.end;
    let range = format!("{}..{}", start, end);
    match ann.strand {
        Strand::Reverse => format!("complement({})", range),
        _ => range,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    static PUC19_DATA: &[u8] = include_bytes!("../../testdata/pUC19.gb");
    static LAMBDA_DATA: &[u8] = include_bytes!("../../testdata/lambda.gb");

    #[test]
    fn test_parse_puc19_length() {
        let (seq, _annotations) = parse_genbank(PUC19_DATA).unwrap();
        assert_eq!(seq.length, 2686);
    }

    #[test]
    fn test_parse_puc19_circular() {
        let (seq, _) = parse_genbank(PUC19_DATA).unwrap();
        assert!(seq.is_circular);
    }

    #[test]
    fn test_parse_puc19_has_annotations() {
        let (_, annotations) = parse_genbank(PUC19_DATA).unwrap();
        // At minimum there should be a "source" feature.
        assert!(
            !annotations.is_empty(),
            "pUC19 should have at least one annotation"
        );
    }

    #[test]
    fn test_parse_puc19_source_annotation() {
        let (_, annotations) = parse_genbank(PUC19_DATA).unwrap();
        let source = annotations
            .iter()
            .find(|a| matches!(a.feature_type, FeatureType::Other(ref s) if s == "source"))
            .expect("pUC19 should have a source feature");
        assert_eq!(source.start, 0);
        assert_eq!(source.end, 2686);
    }

    #[test]
    fn test_parse_lambda_length() {
        let (seq, _) = parse_genbank(LAMBDA_DATA).unwrap();
        assert_eq!(seq.length, 48502);
    }

    #[test]
    fn test_parse_lambda_linear() {
        let (seq, _) = parse_genbank(LAMBDA_DATA).unwrap();
        assert!(!seq.is_circular, "lambda should be linear");
    }

    #[test]
    fn test_parse_lambda_has_cds() {
        let (_, annotations) = parse_genbank(LAMBDA_DATA).unwrap();
        let cds_count = annotations
            .iter()
            .filter(|a| a.feature_type == FeatureType::Cds)
            .count();
        assert!(cds_count > 0, "lambda should have CDS features, found 0");
    }

    #[test]
    fn test_parse_lambda_complement_features() {
        let (_, annotations) = parse_genbank(LAMBDA_DATA).unwrap();
        let reverse_count = annotations
            .iter()
            .filter(|a| a.strand == Strand::Reverse)
            .count();
        assert!(
            reverse_count > 0,
            "lambda should have features on the reverse strand"
        );
    }

    #[test]
    fn test_parse_empty_data() {
        let result = parse_genbank(b"");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_invalid_data() {
        let result = parse_genbank(b"this is not genbank data");
        assert!(result.is_err());
    }

    #[test]
    fn test_color_assignment() {
        assert_eq!(color_for_feature_type(&FeatureType::Cds), "#4B7BE5");
        assert_eq!(color_for_feature_type(&FeatureType::Gene), "#2E8B57");
        assert_eq!(color_for_feature_type(&FeatureType::Promoter), "#E53E3E");
        assert_eq!(color_for_feature_type(&FeatureType::Terminator), "#805AD5");
        assert_eq!(color_for_feature_type(&FeatureType::RepOrigin), "#DD6B20");
        assert_eq!(color_for_feature_type(&FeatureType::Misc), "#A0AEC0");
        assert_eq!(
            color_for_feature_type(&FeatureType::Other("source".to_string())),
            "#718096"
        );
    }

    #[test]
    fn test_is_complement() {
        let fwd = Location::simple_range(0, 100);
        assert!(!is_complement(&fwd));

        let rev = Location::Complement(Box::new(Location::simple_range(0, 100)));
        assert!(is_complement(&rev));

        let join_rev = Location::Join(vec![
            Location::Complement(Box::new(Location::simple_range(0, 50))),
            Location::simple_range(50, 100),
        ]);
        assert!(is_complement(&join_rev));
    }

    #[test]
    fn test_write_genbank_basic() {
        let seq = Sequence::new("test_seq", b"ATGCATGC", false);
        let annotations = vec![Annotation {
            name: "test_gene".to_string(),
            feature_type: FeatureType::Gene,
            start: 0,
            end: 8,
            strand: Strand::Forward,
            qualifiers: HashMap::from([("gene".to_string(), "test_gene".to_string())]),
            color: Some("#2E8B57".to_string()),
        }];

        let output = write_genbank(&seq, &annotations).unwrap();
        let output_str = std::str::from_utf8(&output).unwrap();

        assert!(output_str.contains("LOCUS"));
        assert!(output_str.contains("test_seq"));
        assert!(output_str.contains("8 bp"));
        assert!(output_str.contains("linear"));
        assert!(output_str.contains("FEATURES"));
        assert!(output_str.contains("gene"));
        assert!(output_str.contains("1..8"));
        assert!(output_str.contains("ORIGIN"));
        assert!(output_str.contains("atgcatgc"));
        assert!(output_str.contains("//"));
    }

    #[test]
    fn test_write_genbank_circular() {
        let seq = Sequence::new("circ", b"AAAA", true);
        let output = write_genbank(&seq, &[]).unwrap();
        let output_str = std::str::from_utf8(&output).unwrap();
        assert!(output_str.contains("circular"));
    }

    #[test]
    fn test_write_genbank_complement() {
        let seq = Sequence::new("test", b"ATGCATGC", false);
        let annotations = vec![Annotation {
            name: "rev_gene".to_string(),
            feature_type: FeatureType::Cds,
            start: 2,
            end: 6,
            strand: Strand::Reverse,
            qualifiers: HashMap::new(),
            color: None,
        }];
        let output = write_genbank(&seq, &annotations).unwrap();
        let output_str = std::str::from_utf8(&output).unwrap();
        assert!(output_str.contains("complement(3..6)"));
    }

    #[test]
    fn test_roundtrip_puc19() {
        let (seq, annotations) = parse_genbank(PUC19_DATA).unwrap();
        let written = write_genbank(&seq, &annotations).unwrap();
        // Re-parse the written output.
        let (seq2, annotations2) = parse_genbank(&written).unwrap();
        assert_eq!(seq.length, seq2.length);
        assert_eq!(seq.is_circular, seq2.is_circular);
        assert_eq!(annotations.len(), annotations2.len());
    }

    #[test]
    fn test_annotation_name_priority() {
        // The name should prioritize: label > gene > product > feature key
        let (_, annotations) = parse_genbank(LAMBDA_DATA).unwrap();
        // Lambda CDS features typically have /gene qualifiers.
        let first_cds = annotations
            .iter()
            .find(|a| a.feature_type == FeatureType::Cds)
            .expect("lambda should have CDS");
        // The name should not be the raw feature key "CDS" if a qualifier exists.
        assert_ne!(
            first_cds.name, "CDS",
            "CDS annotation name should come from a qualifier, not the feature key"
        );
    }

    #[test]
    fn test_feature_type_to_key_roundtrip() {
        assert_eq!(feature_type_to_key(&FeatureType::Cds), "CDS");
        assert_eq!(feature_type_to_key(&FeatureType::Gene), "gene");
        assert_eq!(feature_type_to_key(&FeatureType::Promoter), "promoter");
        assert_eq!(feature_type_to_key(&FeatureType::Terminator), "terminator");
        assert_eq!(feature_type_to_key(&FeatureType::RepOrigin), "rep_origin");
        assert_eq!(feature_type_to_key(&FeatureType::Misc), "misc_feature");
        assert_eq!(
            feature_type_to_key(&FeatureType::Other("source".to_string())),
            "source"
        );
    }
}
