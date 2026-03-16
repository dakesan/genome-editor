//! ORF (Open Reading Frame) detection for DNA sequences.
//!
//! Searches all 6 reading frames (3 forward + 3 reverse complement)
//! and returns ORFs sorted by start position on the forward strand.

use genome_editor_core::orf::Orf;
use genome_editor_core::{Sequence, Strand};

/// Find all ORFs in a sequence.
///
/// Searches all 6 reading frames (3 forward + 3 reverse complement).
/// Returns ORFs sorted by start position.
pub fn find_orfs(
    sequence: &Sequence,
    min_length_aa: usize,
    start_codons: &[&[u8]],
    stop_codons: &[&[u8]],
) -> Vec<Orf> {
    let mut orfs = Vec::new();

    if sequence.length == 0 {
        return orfs;
    }

    if sequence.is_circular {
        find_orfs_circular(
            sequence,
            min_length_aa,
            start_codons,
            stop_codons,
            &mut orfs,
        );
    } else {
        // Forward strand
        find_orfs_on_strand(
            &sequence.bases,
            Strand::Forward,
            sequence.length,
            min_length_aa,
            start_codons,
            stop_codons,
            &mut orfs,
        );

        // Reverse strand
        let rc = sequence.reverse_complement();
        find_orfs_on_strand(
            &rc,
            Strand::Reverse,
            sequence.length,
            min_length_aa,
            start_codons,
            stop_codons,
            &mut orfs,
        );
    }

    orfs.sort_by_key(|o| o.start);
    orfs
}

/// Find ORFs using standard genetic code (ATG start, TAA/TAG/TGA stop).
pub fn find_orfs_default(sequence: &Sequence, min_length_aa: usize) -> Vec<Orf> {
    find_orfs(
        sequence,
        min_length_aa,
        &[b"ATG"],
        &[b"TAA", b"TAG", b"TGA"],
    )
}

/// Scan a single strand (given as raw bases) for ORFs in all 3 reading frames.
///
/// `strand_bases` is either the original forward bases or the reverse complement.
/// `strand` indicates Forward or Reverse for the resulting `Orf`.
/// `seq_len` is the length of the original sequence (used for coordinate conversion).
fn find_orfs_on_strand(
    strand_bases: &[u8],
    strand: Strand,
    seq_len: usize,
    min_length_aa: usize,
    start_codons: &[&[u8]],
    stop_codons: &[&[u8]],
    orfs: &mut Vec<Orf>,
) {
    let len = strand_bases.len();

    for frame in 0u8..3 {
        let offset = frame as usize;
        // Track the first start codon position in the current reading window.
        let mut first_start: Option<usize> = None;

        let mut i = offset;
        while i + 3 <= len {
            let codon = &strand_bases[i..i + 3];

            if is_codon(codon, stop_codons) {
                if let Some(start_pos) = first_start {
                    let end_pos = i + 3; // exclusive, past the stop codon
                    let length_aa = (end_pos - start_pos) / 3;
                    if length_aa >= min_length_aa {
                        let (fwd_start, fwd_end) = match strand {
                            Strand::Forward => (start_pos, end_pos),
                            Strand::Reverse => {
                                // Convert reverse complement coordinates to forward strand.
                                (seq_len - end_pos, seq_len - start_pos)
                            }
                            _ => (start_pos, end_pos),
                        };
                        orfs.push(Orf {
                            start: fwd_start,
                            end: fwd_end,
                            strand,
                            frame,
                            length_aa,
                        });
                    }
                }
                first_start = None;
            } else if is_codon(codon, start_codons) && first_start.is_none() {
                first_start = Some(i);
            }

            i += 3;
        }
    }
}

/// Handle circular sequences by doubling the sequence and de-duplicating results.
fn find_orfs_circular(
    sequence: &Sequence,
    min_length_aa: usize,
    start_codons: &[&[u8]],
    stop_codons: &[&[u8]],
    orfs: &mut Vec<Orf>,
) {
    let len = sequence.length;

    // Forward strand: double the bases
    let mut doubled_fwd = Vec::with_capacity(len * 2);
    doubled_fwd.extend_from_slice(&sequence.bases);
    doubled_fwd.extend_from_slice(&sequence.bases);

    let mut raw_fwd = Vec::new();
    find_orfs_on_strand(
        &doubled_fwd,
        Strand::Forward,
        len * 2, // pass doubled length so coordinate conversion is identity for forward
        min_length_aa,
        start_codons,
        stop_codons,
        &mut raw_fwd,
    );

    // For forward strand ORFs found on the doubled sequence:
    // Keep only those whose start < len (original range).
    for mut orf in raw_fwd {
        if orf.start < len {
            // If end > len, this ORF wraps around the origin.
            // Cap end at len * 2 would be meaningless; keep it as-is
            // but wrap end into [0, 2*len).
            // The ORF's end can exceed `len` — that indicates wrapping.
            // Normalize end: if end > 2*len, something is wrong, but shouldn't happen.
            // We keep end as-is; the caller sees end > len as a wrapping ORF.
            // However, cap the ORF length to at most the full sequence length.
            if orf.end > len * 2 {
                orf.end = len * 2;
            }
            orf.length_aa = (orf.end - orf.start) / 3;
            if orf.length_aa >= min_length_aa {
                orfs.push(orf);
            }
        }
    }

    // Reverse strand: double the reverse complement
    let rc = sequence.reverse_complement();
    let mut doubled_rc = Vec::with_capacity(len * 2);
    doubled_rc.extend_from_slice(&rc);
    doubled_rc.extend_from_slice(&rc);

    let mut raw_rev = Vec::new();
    // We scan the doubled RC as if it were a forward strand of length 2*len,
    // then convert coordinates ourselves.
    find_orfs_on_strand(
        &doubled_rc,
        Strand::Forward, // treat as forward temporarily for raw positions
        len * 2,
        min_length_aa,
        start_codons,
        stop_codons,
        &mut raw_rev,
    );

    for orf in raw_rev {
        // orf.start/end are positions on the doubled RC (which == forward coords since
        // we passed len*2 and Strand::Forward).
        // These are positions on the doubled reverse complement.
        let rc_start = orf.start;
        let rc_end = orf.end;

        // Only keep ORFs that start in [0, len) on the doubled RC.
        if rc_start >= len {
            continue;
        }

        // Convert from doubled-RC coordinates to forward strand coordinates.
        // On the doubled RC of length 2*len, position p corresponds to
        // forward position (2*len - 1 - p), but we need range conversion.
        // For a range [rc_start, rc_end) on the doubled RC:
        //   forward_start = 2*len - rc_end
        //   forward_end   = 2*len - rc_start
        let fwd_start = 2 * len - rc_end;
        let fwd_end = 2 * len - rc_start;

        // fwd_start should be in [0, 2*len).
        // For circular, a wrapping reverse ORF could have fwd_start < len
        // and fwd_end <= 2*len.
        // We only keep if fwd_start < len (maps to original sequence).
        // Actually, the de-dup criterion for reverse is: rc_start < len.
        // fwd_end = 2*len - rc_start > 2*len - len = len, and
        // fwd_start = 2*len - rc_end. rc_end could be > len (wrapping on RC).
        // This is correct.

        let length_aa = (fwd_end - fwd_start) / 3;
        if length_aa >= min_length_aa {
            orfs.push(Orf {
                start: fwd_start,
                end: fwd_end,
                strand: Strand::Reverse,
                frame: orf.frame,
                length_aa,
            });
        }
    }
}

/// Check if a codon matches any entry in a codon list.
fn is_codon(codon: &[u8], codons: &[&[u8]]) -> bool {
    codons.iter().any(|&c| {
        codon.len() == c.len()
            && codon
                .iter()
                .zip(c.iter())
                .all(|(&a, &b)| a.eq_ignore_ascii_case(&b))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    // Test 1: Simple known ORF
    #[test]
    fn test_simple_orf() {
        let seq = Sequence::new("test", b"ATGAAATAA", false);
        // ATG (start) + AAA (Lys) + TAA (stop) = 3 codons, ORF from 0..9, length_aa = 3
        let orfs = find_orfs_default(&seq, 1);
        assert!(!orfs.is_empty());
        let orf = &orfs[0];
        assert_eq!(orf.start, 0);
        assert_eq!(orf.end, 9);
        assert_eq!(orf.strand, Strand::Forward);
        assert_eq!(orf.frame, 0);
        assert_eq!(orf.length_aa, 3);
    }

    // Test 2: Multiple frames
    #[test]
    fn test_multiple_frames() {
        // "XATGCCCTAGXX" — frame 1: ATG CCC TAG at positions 1..10
        let seq = Sequence::new("test", b"XATGCCCTAGXX", false);
        let orfs = find_orfs_default(&seq, 1);
        let fwd_orfs: Vec<_> = orfs
            .iter()
            .filter(|o| o.strand == Strand::Forward)
            .collect();
        assert!(!fwd_orfs.is_empty());
        let orf = fwd_orfs
            .iter()
            .find(|o| o.frame == 1)
            .expect("should find ORF in frame 1");
        assert_eq!(orf.start, 1);
        assert_eq!(orf.end, 10);
        assert_eq!(orf.length_aa, 3);
    }

    // Test 3: Minimum length filtering
    #[test]
    fn test_min_length_filtering() {
        // ATG TAA = 2 codons = length_aa 2, should be filtered by min_length_aa=3
        let seq = Sequence::new("test", b"ATGTAA", false);
        let orfs = find_orfs_default(&seq, 3);
        assert!(orfs.is_empty());

        // But should be found with min_length_aa=2
        let orfs = find_orfs_default(&seq, 2);
        assert_eq!(orfs.len(), 1);
        assert_eq!(orfs[0].length_aa, 2);
    }

    // Test 4: Reverse strand
    #[test]
    fn test_reverse_strand() {
        // TTATTTCAT -> reverse complement: ATGAAATAA -> ATG AAA TAA
        let seq = Sequence::new("test", b"TTATTTCAT", false);
        let orfs = find_orfs_default(&seq, 1);
        let rev_orfs: Vec<_> = orfs
            .iter()
            .filter(|o| o.strand == Strand::Reverse)
            .collect();
        assert!(!rev_orfs.is_empty());
        let orf = &rev_orfs[0];
        assert_eq!(orf.strand, Strand::Reverse);
        // RC is ATGAAATAA, ORF on RC at 0..9
        // Forward coords: start = 9 - 9 = 0, end = 9 - 0 = 9
        assert_eq!(orf.start, 0);
        assert_eq!(orf.end, 9);
        assert_eq!(orf.length_aa, 3);
    }

    // Test 5: Circular sequence crossing boundary
    #[test]
    fn test_circular_crossing_boundary() {
        // "AAATAATTTTATG" (length 13)
        // The ATG at positions 10..13 + wrap: AAA at 0..3 + TAA at 3..6
        // So an ORF: start=10, end = 10+9 = 19 (on doubled), length_aa=3
        let seq = Sequence::new("circ", b"AAATAATTTTATG", true);
        let orfs = find_orfs_default(&seq, 1);
        let wrapping: Vec<_> = orfs.iter().filter(|o| o.end > seq.length).collect();
        assert!(
            !wrapping.is_empty(),
            "should find at least one wrapping ORF"
        );
        let orf = &wrapping[0];
        assert_eq!(orf.start, 10);
        assert_eq!(orf.end, 19); // wraps past length 13
        assert_eq!(orf.length_aa, 3);
        assert_eq!(orf.strand, Strand::Forward);
    }

    // Test 6: Custom codons
    #[test]
    fn test_custom_codons() {
        // GTG as alternative start codon
        let seq = Sequence::new("test", b"GTGAAATAA", false);
        let orfs = find_orfs(&seq, 1, &[b"ATG", b"GTG"], &[b"TAA", b"TAG", b"TGA"]);
        assert!(!orfs.is_empty());
        assert_eq!(orfs[0].start, 0);
        assert_eq!(orfs[0].end, 9);
    }

    // Test 7: Empty/short sequence
    #[test]
    fn test_empty_sequence() {
        let seq = Sequence::new("empty", b"", false);
        let orfs = find_orfs_default(&seq, 1);
        assert!(orfs.is_empty());
    }

    #[test]
    fn test_short_sequence() {
        let seq = Sequence::new("short", b"AT", false);
        let orfs = find_orfs_default(&seq, 1);
        assert!(orfs.is_empty());
    }

    // Test 8: No ORFs found
    #[test]
    fn test_no_orfs() {
        let seq = Sequence::new("no_orf", b"TTTTTTTTT", false);
        let orfs = find_orfs_default(&seq, 1);
        assert!(orfs.is_empty());
    }

    // Additional test: ORFs are sorted by start position
    #[test]
    fn test_sorted_by_start() {
        // Two ORFs in different frames
        let seq = Sequence::new("test", b"ATGAAATAAXATGCCCTAG", false);
        let orfs = find_orfs_default(&seq, 1);
        for window in orfs.windows(2) {
            assert!(window[0].start <= window[1].start);
        }
    }

    // Test: first start codon is used (not a later one)
    #[test]
    fn test_first_start_codon_used() {
        // ATG ATG AAA TAA — should use first ATG at position 0
        let seq = Sequence::new("test", b"ATGATGAAATAA", false);
        let orfs = find_orfs_default(&seq, 1);
        let fwd: Vec<_> = orfs
            .iter()
            .filter(|o| o.strand == Strand::Forward && o.frame == 0)
            .collect();
        assert!(!fwd.is_empty());
        assert_eq!(fwd[0].start, 0);
        assert_eq!(fwd[0].end, 12);
        assert_eq!(fwd[0].length_aa, 4);
    }

    // Test: multiple ORFs in same frame separated by stop codons
    #[test]
    fn test_multiple_orfs_same_frame() {
        // ATG AAA TAA ATG CCC TGA
        let seq = Sequence::new("test", b"ATGAAATAAATGCCCTGA", false);
        let orfs = find_orfs_default(&seq, 1);
        let frame0: Vec<_> = orfs
            .iter()
            .filter(|o| o.strand == Strand::Forward && o.frame == 0)
            .collect();
        assert_eq!(frame0.len(), 2);
        assert_eq!(frame0[0].start, 0);
        assert_eq!(frame0[0].end, 9);
        assert_eq!(frame0[1].start, 9);
        assert_eq!(frame0[1].end, 18);
    }

    // Test: circular sequence without wrapping ORF still works
    #[test]
    fn test_circular_non_wrapping() {
        let seq = Sequence::new("circ", b"ATGAAATAA", true);
        let orfs = find_orfs_default(&seq, 1);
        // Should still find the non-wrapping ORF
        let fwd: Vec<_> = orfs
            .iter()
            .filter(|o| o.strand == Strand::Forward)
            .collect();
        assert!(!fwd.is_empty());
        assert_eq!(fwd[0].start, 0);
        assert_eq!(fwd[0].end, 9);
    }
}
