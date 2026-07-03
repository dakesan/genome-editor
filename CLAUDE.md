# Genome Editor

## Tech Stack

- Build: Vite 6.x + @vitejs/plugin-react
- Language: TypeScript (strict)
- UI: React 19 + SeqViz 3.x
- Test: Vitest 2.x + @testing-library/react + jsdom
- Linter/Formatter: Biome（ESLint+Prettier の代替）
- Parser: seqparse（GenBank/FASTA パース）

## Commands

- npm run dev -- dev server
- npm run build -- type check + build
- npm run test -- Vitest
- npm run lint -- Biome check
- npm run lint:fix -- Biome auto-fix

## Code Conventions

- Source code / comments: English
- Documentation (*.md): Japanese (ですます体)
- Components: PascalCase (SeqViewer.tsx)
- Hooks: camelCase with "use" prefix
- Tests: co-located .test.ts(x)

## Spec-Driven Development

### Document Roles

| Document | Role | Authority |
|----------|------|-----------|
| docs/spec.md | Technical specification: types, APIs, data flow, architecture | Source of truth for HOW to build |
| docs/plan.md | Roadmap: phases, milestones, success criteria, risk management | Source of truth for WHAT and WHEN |

### Workflow Rules

1. Before implementing, ALWAYS read docs/spec.md for the relevant module's API contracts and types
2. Read docs/plan.md to understand the phase's goals and success criteria
3. If implementation reveals a spec gap, update docs/spec.md FIRST, then write the code
4. docs/spec.md and docs/plan.md must stay in sync with the code — contradictions are bugs

### Agent Responsibilities

- Every agent MUST read docs/spec.md before writing any module it covers
- Never deviate from docs/spec.md types/APIs without updating the spec first
- Leader agent is responsible for cross-document consistency

## Multi-Agent Workflow

### File Ownership (prevent merge conflicts)

| Agent | Owned Files |
|-------|-------------|
| scaffold | vite.config.ts, tsconfig*.json, biome.json, package.json, index.html, src/main.tsx |
| viewer | src/components/*, src/hooks/useGenBankParser.*, src/types/* |
| perf | src/utils/*, src/hooks/usePerformance.*, public/testdata/* |
| leader | src/App.tsx, *.md |

### Quality Gates

Before marking any task complete:
1. npm run lint passes
2. npm run test passes
3. npm run build succeeds

### Commit Convention

Format: `<type>(<scope>): <description>`
Types: feat, fix, chore, test, docs, perf

## Phase 1: Rust/WASM Engine

### Rust Commands

- cargo test -p genome-editor-{crate} -- run crate tests
- cargo clippy -p genome-editor-{crate} -- -D warnings -- lint crate
- cargo fmt --check -- format check
- wasm-pack build crates/wasm --target web --out-dir ../../pkg -- WASM build

### Phase 1 File Ownership

| Agent | Owned Files |
|-------|-------------|
| rust-core | `Cargo.toml`, `crates/core/**`, `.github/workflows/rust.yml` |
| rust-parser | `crates/parser/**` |
| rust-enzyme | `crates/enzyme/**` |
| rust-orf | `crates/orf/**` |
| rust-alignment | `crates/alignment/**` |
| rust-wasm | `crates/wasm/**`, `pkg/**` |
| frontend-wasm | `src/wasm/**`, `src/hooks/useWasm*.ts`, `src/hooks/useEnzymes.ts`, `src/hooks/useOrfs.ts`, `src/types/wasm.ts` |
| frontend-ui | `src/components/CutSiteList.tsx`, `src/components/LoadingOverlay.tsx` |
| leader | `*.md`, `src/App.tsx`, `vite.config.ts`, `package.json` |

### Rust Quality Gates

```bash
cargo test -p {crate}
cargo clippy -p {crate} -- -D warnings
cargo fmt --check
```
