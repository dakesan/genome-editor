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
| spec.md | Technical specification: types, APIs, data flow, architecture | Source of truth for HOW to build |
| plan.md | Roadmap: phases, milestones, success criteria, risk management | Source of truth for WHAT and WHEN |
| todo.md | Task tracking: granular checklist derived from plan.md | Execution progress tracker |

### Workflow Rules

1. Before implementing, ALWAYS read spec.md for the relevant module's API contracts and types
2. Read plan.md to understand the current phase's goals and success criteria
3. Pick tasks from todo.md — implement what spec.md defines, in the order plan.md prioritizes
4. If implementation reveals a spec gap, update spec.md FIRST, then write the code
5. After completing tasks, update todo.md checkboxes (never skip this step)
6. All three documents must stay in sync — contradictions are bugs

### Agent Responsibilities

- Every agent MUST read spec.md before writing any module it covers
- Never deviate from spec.md types/APIs without updating the spec first
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
