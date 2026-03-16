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
