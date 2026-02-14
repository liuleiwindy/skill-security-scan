# Module Contract Template

A language-agnostic, reusable template for defining module interfaces and dependencies.

---

## 1. Purpose

This template provides a standardized way to:
- Define module boundaries and public interfaces
- Declare dependencies between modules
- Enable automated coordination across multiple agents/contributors
- Prevent duplicate implementations and interface drift

**This template is business-agnostic and can be applied to any project.**

---

## 2. Contract Structure

```yaml
# module-contract.yaml (or .md with embedded YAML)

module:
  name: string              # e.g., "query-parser"
  path: string              # e.g., "lib/poster/query-parser.ts"
  status: pending | in_progress | completed
  version: string           # semver, e.g., "1.0.0"

exports:
  - name: string            # function/type name
    signature: string       # type signature (language-specific)
    description: string     # one-line description

dependencies:
  - module: string          # module path or name
    imports: string[]       # what is imported
    required: boolean       # hard dependency or optional

constraints:
  allow_duplicate_impl: boolean  # false = forbid reimplementation
  fallback_module: string | null # allowed alternative if module missing
```

---

## 3. Example: Using This Template

### 3.1 Define a Module Contract

```yaml
module:
  name: query-parser
  path: lib/poster/query-parser.ts
  status: completed
  version: 1.0.0

exports:
  - name: parsePosterQueryOverrides
    signature: (input: URLSearchParams | NextRequest) => ParseResult
    description: Parse and validate query parameters for poster rendering

  - name: generateRequestId
    signature: () => string
    description: Generate unique request ID in format "req_xxx"

dependencies:
  - module: next/server
    imports: [NextRequest]
    required: true

constraints:
  allow_duplicate_impl: false
```

### 3.2 Define a Consumer Contract

```yaml
module:
  name: poster-image-api
  path: app/api/scan/[id]/poster/image/route.ts
  status: pending
  version: 0.1.0

exports:
  - name: GET
    signature: (request: NextRequest, params: { id: string }) => Promise<Response>
    description: Render and return PNG poster image

dependencies:
  - module: lib/poster/query-parser.ts
    imports: [parsePosterQueryOverrides, generateRequestId]
    required: true

  - module: lib/poster/render-options.ts
    imports: [getGradeForScore, getColorForGrade]
    required: true

  - module: lib/poster/render-poster.ts
    imports: [renderPoster]
    required: true

constraints:
  allow_duplicate_impl: false
  # Explicitly forbid reimplementing these:
  forbid_impl:
    - URLSearchParams parsing logic
    - request ID generation
    - grade/color mapping logic
```

---

## 4. Contract Lifecycle

```
1. DEFINE    → Write contract before implementation
2. VALIDATE  → Check if dependencies exist and are satisfied
3. IMPLEMENT → Build module according to contract
4. VERIFY    → Auto-check: imports match, no forbidden reimplementations
5. FREEZE    → Contract becomes source of truth for consumers
```

---

## 5. Coordination Protocol

When distributing work across multiple agents:

### 5.1 Pre-flight Check
Before starting work on a module:
```markdown
## Your Module Contract

[Embed the full contract YAML here]

## Available Dependencies (Already Completed)

[List all dependency modules with their exports]

## Rules
- You MUST import from the listed dependency modules
- You MUST NOT reimplement functionality marked as "required dependency"
- Your exports MUST match the signatures defined above
```

### 5.2 Post-completion Verify
After module completion:
```markdown
## Verification Checklist
- [ ] All declared exports are implemented
- [ ] All required dependencies are imported (not reimplemented)
- [ ] No forbidden reimplementations detected
- [ ] Signatures match contract definitions
```

---

## 6. Multi-Module Dependency Graph

For complex projects, maintain a central registry:

```yaml
# registry.yaml

modules:
  query-parser:
    path: lib/poster/query-parser.ts
    status: completed

  render-options:
    path: lib/poster/render-options.ts
    status: completed

  render-poster:
    path: lib/poster/render-poster.ts
    status: completed
    depends_on: [render-options]

  poster-image-api:
    path: app/api/scan/[id]/poster/image/route.ts
    status: pending
    depends_on: [query-parser, render-options, render-poster]

execution_order:
  - query-parser      # Phase 1: no dependencies
  - render-options    # Phase 1: no dependencies
  - render-poster     # Phase 2: depends on render-options
  - poster-image-api  # Phase 3: depends on all above
```

This enables:
1. **Parallel execution** of modules with no inter-dependencies
2. **Sequential execution** when dependencies exist
3. **Automatic context injection** for dependent modules

---

## 7. Language Adaptations

The contract structure is language-agnostic. Adapt signatures to your language:

| Language | Signature Format |
|----------|------------------|
| TypeScript | `(a: number, b: string) => boolean` |
| Python | `(a: int, b: str) -> bool` |
| Go | `func(a int, b string) bool` |
| Rust | `fn(a: i32, b: &str) -> bool` |

---

## 8. Summary

| Concept | Description |
|---------|-------------|
| **Module Contract** | Declaration of what a module exports and requires |
| **Dependency Graph** | Map of module relationships |
| **Execution Order** | Derived from dependency graph for parallel/serial execution |
| **Constraints** | Rules to prevent drift and duplication |
| **Verification** | Automated checks post-implementation |

**Key Principle**: Define contracts first, then distribute work. Contracts become the single source of truth for all agents.
