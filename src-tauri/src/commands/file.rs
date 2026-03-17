use genome_editor_core::{FeatureType, Strand};
use genome_editor_parser::{parse_fasta, parse_genbank, write_fasta, write_genbank};
use serde::{Deserialize, Serialize};

/// DTO matching the frontend WasmAnnotation type.
#[derive(Serialize, Deserialize)]
pub struct AnnotationDto {
    pub name: String,
    pub start: usize,
    pub end: usize,
    pub direction: i32,
    pub color: Option<String>,
    #[serde(rename = "type")]
    pub feature_type: String,
}

/// DTO matching the frontend WasmParsedSequence type.
#[derive(Serialize, Deserialize)]
pub struct SequenceFileDto {
    pub name: String,
    pub seq: String,
    pub is_circular: bool,
    pub length: usize,
    pub annotations: Vec<AnnotationDto>,
}

fn strand_to_direction(strand: &Strand) -> i32 {
    match strand {
        Strand::Forward => 1,
        Strand::Reverse => -1,
        Strand::Both => 0,
    }
}

fn direction_to_strand(direction: i32) -> Strand {
    match direction {
        1 => Strand::Forward,
        -1 => Strand::Reverse,
        _ => Strand::Both,
    }
}

fn feature_type_to_string(ft: &FeatureType) -> String {
    match ft {
        FeatureType::Cds => "CDS".to_string(),
        FeatureType::Gene => "gene".to_string(),
        FeatureType::Promoter => "promoter".to_string(),
        FeatureType::Terminator => "terminator".to_string(),
        FeatureType::RepOrigin => "rep_origin".to_string(),
        FeatureType::Misc => "misc_feature".to_string(),
        FeatureType::Other(s) => s.clone(),
    }
}

fn string_to_feature_type(s: &str) -> FeatureType {
    match s {
        "CDS" => FeatureType::Cds,
        "gene" => FeatureType::Gene,
        "promoter" => FeatureType::Promoter,
        "terminator" => FeatureType::Terminator,
        "rep_origin" => FeatureType::RepOrigin,
        "misc_feature" => FeatureType::Misc,
        other => FeatureType::Other(other.to_string()),
    }
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<SequenceFileDto, String> {
    let data = tokio::fs::read(&path).await.map_err(|e| e.to_string())?;

    // Try GenBank first, then FASTA.
    let trimmed = String::from_utf8_lossy(&data);
    let trimmed = trimmed.trim_start();
    let is_genbank = trimmed.starts_with("LOCUS") || trimmed.starts_with("locus");

    if is_genbank {
        let (seq, annotations) = parse_genbank(&data).map_err(|e| e.to_string())?;
        Ok(SequenceFileDto {
            name: seq.name.clone(),
            seq: seq.as_str().to_string(),
            is_circular: seq.is_circular,
            length: seq.length,
            annotations: annotations
                .iter()
                .map(|a| AnnotationDto {
                    name: a.name.clone(),
                    start: a.start,
                    end: a.end,
                    direction: strand_to_direction(&a.strand),
                    color: a.color.clone(),
                    feature_type: feature_type_to_string(&a.feature_type),
                })
                .collect(),
        })
    } else {
        let sequences = parse_fasta(&data).map_err(|e| e.to_string())?;
        let seq = sequences.into_iter().next().ok_or("No sequences found")?;
        Ok(SequenceFileDto {
            name: seq.name.clone(),
            seq: seq.as_str().to_string(),
            is_circular: seq.is_circular,
            length: seq.length,
            annotations: vec![],
        })
    }
}

#[tauri::command]
pub async fn save_file(path: String, data: SequenceFileDto, format: String) -> Result<(), String> {
    let sequence =
        genome_editor_core::Sequence::new(&data.name, data.seq.as_bytes(), data.is_circular);

    let bytes = match format.as_str() {
        "fasta" => write_fasta(&[sequence]).map_err(|e| e.to_string())?,
        _ => {
            let annotations: Vec<genome_editor_core::Annotation> = data
                .annotations
                .iter()
                .map(|a| genome_editor_core::Annotation {
                    name: a.name.clone(),
                    start: a.start,
                    end: a.end,
                    strand: direction_to_strand(a.direction),
                    feature_type: string_to_feature_type(&a.feature_type),
                    color: a.color.clone(),
                    qualifiers: std::collections::HashMap::new(),
                })
                .collect();
            write_genbank(&sequence, &annotations).map_err(|e| e.to_string())?
        }
    };

    tokio::fs::write(&path, &bytes)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
