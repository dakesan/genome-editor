# Genome Editor: Technical Specification

## Tech Stack

### Rust Backend

| ライブラリ | 用途 | バージョン |
|---|---|---|
| gb-io | GenBank パース | latest |
| rust-bio | アライメント、パターンマッチング | latest |
| noodles | FASTA/FASTQ I/O | latest |
| wasm-bindgen | WASM ↔ JS バインディング | latest |
| wasm-pack | WASM ビルドツール | latest |
| serde / serde_json | シリアライゼーション | latest |
| tauri v2 | デスクトップシェル | 2.x |

### Frontend

| ライブラリ | 用途 |
|---|---|
| React 18+ | UI フレームワーク |
| SeqViz | DNA 配列ビューア（Phase 0 PoC） |
| TypeScript | 型安全性 |
| Vite | ビルドツール |
| Zustand or Jotai | 状態管理（Redux からの移行候補） |

## Module Design

### Rust ワークスペース構成

```
genome-editor/
├── crates/
│   ├── core/           # Shared data types and traits
│   ├── parser/         # GenBank/FASTA parser (gb-io wrapper)
│   ├── enzyme/         # Restriction enzyme database and search
│   ├── orf/            # ORF detection
│   ├── alignment/      # Sequence alignment (rust-bio wrapper)
│   └── wasm/           # wasm-bindgen entry point
├── src-tauri/          # Tauri application
│   ├── src/
│   │   ├── main.rs
│   │   └── commands.rs # Tauri command handlers
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                # React frontend
│   ├── components/
│   ├── hooks/
│   ├── stores/
│   └── wasm/           # WASM loader and bindings
├── plan.md
├── spec.md
└── todo.md
```

### crates/core

共通データ型の定義です。全モジュール間で共有します。

```rust
// Sequence representation
pub struct Sequence {
    pub name: String,
    pub bases: Vec<u8>,      // ASCII encoded (A, T, G, C, N)
    pub is_circular: bool,
    pub length: usize,
}

// Annotation on a sequence
pub struct Annotation {
    pub name: String,
    pub feature_type: FeatureType, // CDS, gene, promoter, etc.
    pub start: usize,
    pub end: usize,
    pub strand: Strand,            // Forward, Reverse, Both
    pub qualifiers: HashMap<String, String>,
    pub color: Option<String>,
}

// Restriction enzyme definition
pub struct RestrictionEnzyme {
    pub name: String,
    pub recognition_sequence: Vec<u8>,
    pub cut_forward: i32,     // Cut position on forward strand
    pub cut_reverse: i32,     // Cut position on reverse strand
    pub is_palindromic: bool,
}

// Cut site on a sequence
pub struct CutSite {
    pub enzyme_name: String,
    pub position: usize,
    pub forward_cut: usize,
    pub reverse_cut: usize,
}

// Open Reading Frame
pub struct Orf {
    pub start: usize,
    pub end: usize,
    pub strand: Strand,
    pub frame: u8,            // 0, 1, or 2
    pub length_aa: usize,
}
```

### crates/parser

GenBank/FASTA ファイルのパースを担当します。gb-io をラップし、core 型に変換します。

主要 API は以下のとおりです。

```rust
pub fn parse_genbank(data: &[u8]) -> Result<(Sequence, Vec<Annotation>)>;
pub fn parse_fasta(data: &[u8]) -> Result<Vec<Sequence>>;
pub fn write_genbank(seq: &Sequence, annotations: &[Annotation]) -> Result<Vec<u8>>;
pub fn write_fasta(sequences: &[Sequence]) -> Result<Vec<u8>>;
```

### crates/enzyme

制限酵素データベースと高速検索エンジンです。

Aho-Corasick アルゴリズムによる複数パターン同時検索で O(n+m) を実現します（OVE の O(n×m) を改善）。

主要 API は以下のとおりです。

```rust
pub struct EnzymeDatabase {
    enzymes: Vec<RestrictionEnzyme>,
    searcher: AhoCorasick,  // Pre-built automaton
}

impl EnzymeDatabase {
    pub fn new(enzymes: Vec<RestrictionEnzyme>) -> Self;
    pub fn from_rebase() -> Self; // Load from embedded REBASE data
    pub fn find_cut_sites(
        &self,
        sequence: &Sequence,
        selected_enzymes: &[String],
    ) -> Vec<CutSite>;
}
```

### crates/orf

ORF（Open Reading Frame）の検出を担当します。

主要 API は以下のとおりです。

```rust
pub fn find_orfs(
    sequence: &Sequence,
    min_length_aa: usize,    // Minimum ORF length in amino acids
    start_codons: &[&[u8]],  // Default: [ATG]
    stop_codons: &[&[u8]],   // Default: [TAA, TAG, TGA]
) -> Vec<Orf>;
```

### crates/alignment

配列アライメントを担当します。rust-bio をラップします。

主要 API は以下のとおりです。

```rust
pub struct AlignmentResult {
    pub score: i32,
    pub aligned_query: String,
    pub aligned_target: String,
    pub cigar: String,
}

pub fn pairwise_align(
    query: &[u8],
    target: &[u8],
    scoring: &ScoringMatrix,
) -> AlignmentResult;

pub fn find_subsequence(
    pattern: &[u8],
    sequence: &Sequence,
    max_mismatches: usize,
) -> Vec<(usize, usize)>;
```

### crates/wasm

WASM エントリポイントです。ブラウザ/Web Worker から呼び出します。

```rust
#[wasm_bindgen]
pub fn parse_genbank_wasm(data: &[u8]) -> JsValue; // Returns JSON

#[wasm_bindgen]
pub fn find_cut_sites_wasm(
    sequence_json: &str,
    enzyme_names_json: &str,
) -> JsValue;

#[wasm_bindgen]
pub fn find_orfs_wasm(
    sequence_json: &str,
    min_length_aa: usize,
) -> JsValue;
```

## Tauri Command API（Phase 2）

Tauri のコマンドシステムを使い、フロントエンドから Rust バックエンドを呼び出します。

### ファイル操作

```rust
#[tauri::command]
async fn open_file(path: String) -> Result<SequenceFile, String>;

#[tauri::command]
async fn save_file(path: String, data: SequenceFile) -> Result<(), String>;

#[tauri::command]
async fn export_file(
    path: String,
    format: ExportFormat, // GenBank, FASTA, SnapGene
    data: SequenceFile,
) -> Result<(), String>;
```

### 計算処理

```rust
#[tauri::command]
async fn compute_cut_sites(
    sequence: SequenceData,
    enzymes: Vec<String>,
) -> Result<Vec<CutSite>, String>;

#[tauri::command]
async fn detect_orfs(
    sequence: SequenceData,
    min_length: usize,
) -> Result<Vec<Orf>, String>;

#[tauri::command]
async fn align_sequences(
    query: String,
    target: String,
) -> Result<AlignmentResult, String>;
```

### イベント

Tauri のイベントシステムで長時間計算の進捗通知を実装します。

```rust
// Backend → Frontend
app.emit("computation-progress", ProgressPayload { percent: 50 });
app.emit("file-changed", FileChangedPayload { path });
```

```typescript
// Frontend
import { listen } from "@tauri-apps/api/event";

listen("computation-progress", (event) => {
    setProgress(event.payload.percent);
});
```

## Data Flow

### Phase 1（WASM モード）

```
User Action
    │
    ▼
React Component
    │
    ├─ UI State ──→ Zustand Store ──→ Re-render
    │
    └─ Heavy Computation ──→ Web Worker
                                │
                                ▼
                            WASM Module
                                │
                            ┌───┴───┐
                            │Rust   │
                            │Engine │
                            └───┬───┘
                                │
                                ▼
                            Result (JSON)
                                │
                                ▼
                        postMessage → Main Thread
                                │
                                ▼
                        Zustand Store Update
                                │
                                ▼
                        React Re-render
```

### Phase 2（Tauri モード）

```
User Action
    │
    ▼
React Component
    │
    ├─ UI State ──→ Zustand Store ──→ Re-render
    │
    └─ invoke("compute_cut_sites", { ... })
                    │
                    ▼
            Tauri IPC Bridge
                    │
                    ▼
            ┌───────────────┐
            │ Rust Backend  │
            │ (native perf) │
            └───────┬───────┘
                    │
                    ▼
            Result (JSON via IPC)
                    │
                    ▼
            Zustand Store Update
                    │
                    ▼
            React Re-render
```

## WASM-JS Data Transfer Strategy

大規模配列データの転送で Zero-copy を実現するための戦略です。

### 小規模データ（< 100KB）

JSON シリアライゼーションを使用します。開発が容易で十分な速度です。

### 大規模データ（> 100KB）

SharedArrayBuffer + MessagePort を使用します。

```typescript
// Frontend: Send sequence to WASM worker
const buffer = new SharedArrayBuffer(sequence.length);
const view = new Uint8Array(buffer);
view.set(encoder.encode(sequence));
worker.postMessage({ type: "analyze", buffer }, [buffer]);
```

### 配列表現

DNA 配列は内部的に `Uint8Array`（ASCII エンコード）で保持します。

| 文字 | バイト値 |
|---|---|
| A | 0x41 |
| T | 0x54 |
| G | 0x47 |
| C | 0x43 |
| N | 0x4E |

## Restriction Enzyme Database

REBASE（Restriction Enzyme Database）からデータを取得し、Rust 構造体にコンパイルタイム埋め込みします。

### データフォーマット

```
// Embedded at compile time via include_str! or build.rs
const REBASE_DATA: &str = include_str!("../data/rebase_enzymes.json");
```

### 初期の対応酵素数

- 商用酵素（NEB/Thermo 等で入手可能）: 約 250 種
- 全 REBASE 登録酵素: 約 4,000 種
- Phase 1 では商用酵素をカバーし、段階的に拡張

## Testing Strategy

### Rust Unit Tests

各 crate に `#[cfg(test)]` モジュールを配置します。

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_parse_genbank_puc19() {
        let data = include_bytes!("../testdata/pUC19.gb");
        let (seq, annotations) = parse_genbank(data).unwrap();
        assert_eq!(seq.length, 2686);
        assert!(annotations.len() > 0);
    }
}
```

### Benchmark Tests

criterion を使用してパフォーマンスを計測します。

```rust
use criterion::{criterion_group, criterion_main, Criterion};

fn bench_cut_sites(c: &mut Criterion) {
    let db = EnzymeDatabase::from_rebase();
    let seq = load_test_sequence("lambda_phage.gb"); // 48,502 bp
    c.bench_function("find_cut_sites_all_enzymes", |b| {
        b.iter(|| db.find_cut_sites(&seq, &["all"]))
    });
}
```

### Integration Tests

WASM ビルド → ブラウザ実行をテストします。wasm-bindgen-test を使用します。

### E2E Tests

Tauri アプリ全体の動作を Playwright + Tauri Driver でテストします。
