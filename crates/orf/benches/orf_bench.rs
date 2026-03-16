use criterion::{Criterion, black_box, criterion_group, criterion_main};
use genome_editor_orf::find_orfs_default;
use genome_editor_parser::parse_genbank;

static PUC19_DATA: &[u8] = include_bytes!("../../testdata/pUC19.gb");
static LAMBDA_DATA: &[u8] = include_bytes!("../../testdata/lambda.gb");

fn bench_find_orfs_puc19(c: &mut Criterion) {
    let (seq, _) = parse_genbank(PUC19_DATA).unwrap();

    c.bench_function("find_orfs_puc19_2.7kb", |b| {
        b.iter(|| find_orfs_default(black_box(&seq), black_box(100)))
    });
}

fn bench_find_orfs_lambda(c: &mut Criterion) {
    let (seq, _) = parse_genbank(LAMBDA_DATA).unwrap();

    c.bench_function("find_orfs_lambda_48.5kb", |b| {
        b.iter(|| find_orfs_default(black_box(&seq), black_box(100)))
    });
}

criterion_group!(benches, bench_find_orfs_puc19, bench_find_orfs_lambda);
criterion_main!(benches);
