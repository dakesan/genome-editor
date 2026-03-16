use criterion::{Criterion, black_box, criterion_group, criterion_main};
use genome_editor_enzyme::EnzymeDatabase;
use genome_editor_parser::parse_genbank;

static PUC19_DATA: &[u8] = include_bytes!("../../testdata/pUC19.gb");
static LAMBDA_DATA: &[u8] = include_bytes!("../../testdata/lambda.gb");

fn bench_find_cut_sites_ecori_puc19(c: &mut Criterion) {
    let db = EnzymeDatabase::from_rebase();
    let (seq, _) = parse_genbank(PUC19_DATA).unwrap();
    let enzymes = vec!["EcoRI".to_string()];

    c.bench_function("cut_sites_EcoRI_puc19", |b| {
        b.iter(|| db.find_cut_sites(black_box(&seq), black_box(&enzymes)))
    });
}

fn bench_find_cut_sites_all_puc19(c: &mut Criterion) {
    let db = EnzymeDatabase::from_rebase();
    let (seq, _) = parse_genbank(PUC19_DATA).unwrap();
    let enzymes: Vec<String> = db.enzyme_names().iter().map(|s| s.to_string()).collect();

    c.bench_function("cut_sites_all_enzymes_puc19", |b| {
        b.iter(|| db.find_cut_sites(black_box(&seq), black_box(&enzymes)))
    });
}

fn bench_find_cut_sites_all_lambda(c: &mut Criterion) {
    let db = EnzymeDatabase::from_rebase();
    let (seq, _) = parse_genbank(LAMBDA_DATA).unwrap();
    let enzymes: Vec<String> = db.enzyme_names().iter().map(|s| s.to_string()).collect();

    c.bench_function("cut_sites_all_enzymes_lambda", |b| {
        b.iter(|| db.find_cut_sites(black_box(&seq), black_box(&enzymes)))
    });
}

criterion_group!(
    benches,
    bench_find_cut_sites_ecori_puc19,
    bench_find_cut_sites_all_puc19,
    bench_find_cut_sites_all_lambda,
);
criterion_main!(benches);
