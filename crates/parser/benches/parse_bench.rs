use criterion::{Criterion, black_box, criterion_group, criterion_main};
use genome_editor_parser::{parse_fasta, parse_genbank};

static PUC19_DATA: &[u8] = include_bytes!("../../testdata/pUC19.gb");
static LAMBDA_DATA: &[u8] = include_bytes!("../../testdata/lambda.gb");

fn bench_parse_genbank_puc19(c: &mut Criterion) {
    c.bench_function("parse_genbank_puc19_2.7kb", |b| {
        b.iter(|| parse_genbank(black_box(PUC19_DATA)))
    });
}

fn bench_parse_genbank_lambda(c: &mut Criterion) {
    c.bench_function("parse_genbank_lambda_48.5kb", |b| {
        b.iter(|| parse_genbank(black_box(LAMBDA_DATA)))
    });
}

fn bench_parse_fasta_puc19(c: &mut Criterion) {
    // Generate FASTA from pUC19 GenBank
    let (seq, _) = parse_genbank(PUC19_DATA).unwrap();
    let fasta = format!(">{}\n{}\n", seq.name, seq.as_str());
    let fasta_bytes = fasta.into_bytes();

    c.bench_function("parse_fasta_puc19_2.7kb", |b| {
        b.iter(|| parse_fasta(black_box(&fasta_bytes)))
    });
}

fn bench_parse_fasta_lambda(c: &mut Criterion) {
    let (seq, _) = parse_genbank(LAMBDA_DATA).unwrap();
    let fasta = format!(">{}\n{}\n", seq.name, seq.as_str());
    let fasta_bytes = fasta.into_bytes();

    c.bench_function("parse_fasta_lambda_48.5kb", |b| {
        b.iter(|| parse_fasta(black_box(&fasta_bytes)))
    });
}

criterion_group!(
    benches,
    bench_parse_genbank_puc19,
    bench_parse_genbank_lambda,
    bench_parse_fasta_puc19,
    bench_parse_fasta_lambda,
);
criterion_main!(benches);
