# Genome Editor

A fast, lightweight plasmid/genome sequence editor and viewer built as a Tauri v2 hybrid app.
Computationally heavy work (parsing, restriction-enzyme search, ORF detection, alignment) runs in
Rust — either natively via Tauri IPC on the desktop, or in the browser via WebAssembly.

Status: work-in-progress research project. The core viewer and editor are usable; some
polish items (SnapGene `.dna` support, code signing, auto-update) are still open.

## Features

- **Viewer** — circular and linear DNA views powered by [SeqViz](https://github.com/Lattice-Automation/seqviz)
- **File formats** — GenBank and FASTA read/write (SnapGene `.dna` not yet supported)
- **Restriction enzymes** — full REBASE database, Aho-Corasick multi-pattern search, palindromic and non-palindromic sites, circular boundaries
- **ORF detection** — 6-frame scan with configurable start/stop codons, circular-aware
- **Sequence editing** — insert / delete / replace with automatic annotation shifting, undo/redo (50 levels)
- **Annotation management** — list, filter, add, delete features
- **Search** — substring search with mismatch tolerance, in-viewer navigation
- **Alignment mode** — pairwise alignment (Smith-Waterman via `rust-bio`), variant detection, AA translation row
- **Multiple sequence alignment** — Clustal Omega / MAFFT via the EBI public REST API
- **Native desktop UX** — menu bar, `Cmd+O` / `Cmd+S` / `Cmd+F` shortcuts, drag-and-drop, window state persistence

## Architecture

```
┌───────────────────────────────────────────┐
│               Tauri v2 shell              │
├─────────────────────┬─────────────────────┤
│   React frontend    │    Rust backend     │
│   (React 19 + TS)   │                     │
│   • SeqViz views    │   • parser          │
│   • editor UI       │   • enzyme          │
│   • state (Zustand) │   • orf             │
│                     │   • alignment       │
└─────────────────────┴─────────────────────┘
          │                     ▲
          │   invoke() (desktop)│
          │   WASM       (web)  │
          └─────────────────────┘
```

The frontend talks to a `GenomeBackend` interface that transparently dispatches to either
Tauri IPC (native, fastest) or a WebAssembly module (browser fallback). Both paths share the
same Rust crates.

### Rust workspace

| Crate | Responsibility |
|-------|----------------|
| `crates/core` | Shared types: `Sequence`, `Annotation`, `RestrictionEnzyme`, `Orf` |
| `crates/parser` | GenBank/FASTA read/write (`gb-io`) |
| `crates/enzyme` | REBASE-embedded restriction-enzyme search (Aho-Corasick) |
| `crates/orf` | 6-frame ORF detection |
| `crates/alignment` | Pairwise alignment via `rust-bio` |
| `crates/wasm` | `wasm-bindgen` entry point for the browser build |
| `src-tauri` | Tauri v2 application shell and commands |

## Getting started

### Prerequisites

- Node.js 20+ and npm
- Rust stable (`rustup default stable`)
- [`wasm-pack`](https://rustwasm.github.io/wasm-pack/) for the browser build
- Tauri v2 system prerequisites — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

### Install

```bash
npm install
```

### Run the desktop app (Tauri)

```bash
npm run tauri dev
```

### Run the browser build

```bash
# Build the WASM module first, then start Vite
wasm-pack build crates/wasm --target web --out-dir ../../pkg
npm run dev
```

### Build for production

```bash
# Web build
npm run build

# Desktop bundle
npm run tauri build
```

### Test and lint

```bash
npm run test         # Vitest (frontend)
npm run lint         # Biome
npm run lint:fix     # Biome auto-fix

cargo test           # Rust unit tests
cargo clippy -- -D warnings
```

## Documentation

- [`docs/spec.md`](docs/spec.md) — technical specification (types, APIs, data flow)
- [`docs/plan.md`](docs/plan.md) — design rationale and roadmap
- [`docs/phase0-evaluation.md`](docs/phase0-evaluation.md) — SeqViz feasibility report

## License

MIT — see [`LICENSE`](LICENSE).

## Acknowledgements

- [SeqViz](https://github.com/Lattice-Automation/seqviz) for the DNA viewer components
- [`gb-io`](https://github.com/dlesl/gb-io), [`rust-bio`](https://github.com/rust-bio/rust-bio), and the REBASE database
- [Tauri](https://tauri.app/) for the desktop shell
- [EBI Job Dispatcher](https://www.ebi.ac.uk/Tools/webservices/) for Clustal Omega / MAFFT MSA
