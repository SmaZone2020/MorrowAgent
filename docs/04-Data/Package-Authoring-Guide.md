<div align="center">

# Learning Package Authoring Guide

**From an empty folder to a `.morrow` archive that installs, reads, generates papers and feeds the learner model.**

[![Essential](https://img.shields.io/badge/ESSENTIAL-read%20before%20authoring-2f6f5e?style=flat-square)](#) [![English](https://img.shields.io/badge/lang-English-2f6f5e?style=flat-square)](#) [![Validator](https://img.shields.io/badge/validated%20by-validatePackage.mjs-c2410c?style=flat-square)](#)

**English** · [中文](Package-Authoring-Guide.zh-CN.md)

</div>

> **Audience.** Anyone producing a learning package for Morrow Agent, and any agent asked to "generate a learning package".
> **Goal.** After reading this you can produce a `.morrow` file that **installs, reads, generates papers and feeds the learner model**.

---

## 0. The short version

A valid learning package is nine required files plus a pile of content files, all passing `node scripts/validatePackage.mjs`, and satisfying three things:

1. **Every reference lands on something that exists.** A question's knowledge points, a question's tags, a body's sources — all must be registered inside the package, or validation fails outright.
2. **IDs are stable and globally unique.** An ID anchors the learner's history; change it once and every past answer dangles.
3. **Checksums cover the whole tree.** One file missing from `checksums.sha256`, one entry for a file that does not exist, or one mismatched hash, and installation fails.

One more content-level requirement: **at least two questions per knowledge point.** A point without questions cannot be drawn into a diagnostic paper, cannot be measured in the learner model, cannot be scheduled into a plan — inside the app it effectively does not exist.

---

## 1. The minimum viable shape

```
my-package/
├── manifest.yaml                    ← the only entry point; the client reads it to find everything else
├── README.md                        ← human-readable notes (the installer also requires it at the root)
├── checksums.sha256                 ← hashes for the whole tree, generated last
│
├── knowledge/
│   ├── index.yaml                   ← chapter tree + where each point is mounted
│   ├── relations.yaml               ← edges between knowledge points
│   └── concepts/
│       ├── ch01-01-function.md      ← point body (front matter + Markdown)
│       └── ...
│
├── questions/
│   ├── index.yaml                   ← question file list + count per file
│   ├── original/                    ← authored questions
│   ├── adapted/                     ← adapted questions
│   ├── imported/                    ← verbatim past-exam questions
│   └── generated/                   ← AI-generated questions
│       └── ch01.json
│
├── solutions/
│   ├── index.yaml
│   └── ch01.json                    ← joined to questions by question_id; optional but strongly recommended
│
├── taxonomy/
│   ├── tags.yaml                    ← tag vocabulary (question tags must be registered here)
│   └── error-types.yaml             ← error type vocabulary
│
├── citations/
│   └── sources.yaml                 ← sources and their licence status
│
└── media/
    ├── covers/cover.png             ← cover, png/jpg/jpeg/webp only
    └── figures/ch01/*.png           ← body illustrations
```

### 1.1 The nine required files

The validator checks these nine before reading any content (missing one reports `缺少必需文件`):

| File | Purpose |
| --- | --- |
| `manifest.yaml` | Package self-description: ID, version, cover, index paths |
| `README.md` | Human-readable notes. The installer separately requires it at the archive root |
| `knowledge/index.yaml` | Chapters and point mounting |
| `knowledge/relations.yaml` | Relation edges (an empty array is fine, but the file must exist) |
| `questions/index.yaml` | Question file list |
| `taxonomy/tags.yaml` | Tag vocabulary, at least 1 entry |
| `taxonomy/error-types.yaml` | Error type vocabulary, at least 1 entry |
| `citations/sources.yaml` | Source registry |
| `checksums.sha256` | Whole-tree integrity |

`contents.solutions` in `manifest.yaml` is the **only optional** content block. Omit it and questions still work — just without worked steps.

---

## 2. Three invariants

### 2.1 IDs are stable

Every ID is reverse-domain style: at least two segments, each starting with a lowercase letter, only `a-z 0-9 -`.

```
^[a-z][a-z0-9]*(\.[a-z0-9-]+)+$
```

- Valid: `calculus.limit.one-sided`, `calculus.limit.q.000001`, `calculus.book.ch01`
- Invalid: `calculus` (one segment), `Calculus.Limit` (uppercase), `math_higher_q_000001` (underscores, legacy)

**An ID must never change after publication.** Renaming changes `name` only. A retired question number is permanently void and must not be reused.

### 2.2 References must resolve

The validator follows every one of these; a reference to something missing is an error:

| Referencing side | Referenced side | Notes |
| --- | --- | --- |
| Question `knowledge_points[]` | Knowledge point | Every entry must be a defined point |
| Question `tags[]` | `taxonomy/tags.yaml` | Every entry must be registered |
| Question `source.source_id` | `citations/sources.yaml` | Must be registered before use |
| Point `sources[]` | `citations/sources.yaml` | Same |
| Relation `from` / `to` | Knowledge point | Both ends must exist |
| Point `prerequisites[]` | Knowledge point | **Only used for cycle detection, existence not checked** (see below) |
| `manifest.package.targets[]` | `taxonomy/tags.yaml` | Shelf filters must not hang on a dead tag |
| `manifest.package.cover.file` | A real file under `media/covers/` | Bitmap only |
| Any `images[].path` | A real file in the package | Missing file fails |

Two places are **not validated** and rely on your discipline:

- **Point `tags[]` are format-checked only, not vocabulary-checked.** Question tags are checked. Use the same vocabulary anyway, so filtering stays consistent.
- **`![alt](media/…)` inside the body Markdown is not validated.** Only front matter `images` are checked for file existence. Verify body image paths yourself.

### 2.3 Checksums cover the whole tree

Each line of `checksums.sha256` is `<64 hex chars>   <POSIX path in package>`, two spaces apart, sorted by path, and **it does not list itself**.

Validation is bidirectional: registered but missing → error; present but unregistered → error; hash mismatch → error. Regenerate after every content change.

---

## 3. `manifest.yaml`

```yaml
format:
  name: morrow-learning-package        # constant; anything else is rejected
  version: "1.0"                       # must be quoted, or YAML reads it as the float 1.0

package:
  id: cn.morrow.calculus.shaanxi-upgrade
  name: 应用高等数学
  version: 2.0.0                       # strict x.y.z
  description: A complete calculus textbook from functions and limits to line and surface integrals.
  subject: mathematics                 # ^[a-z][a-z0-9-]*$
  sub_subject: calculus                # optional
  language: zh-CN                      # ^[a-z]{2,3}(-[A-Za-z0-9]+)*$
  targets:                             # machine-readable, must be registered in tags.yaml
    - college-entrance-upgrade
  region:                              # optional, ^[A-Z]{2}(-[A-Z0-9]{1,3})?$
    - CN-SN
  tags:                                # shelf display text; Chinese is fine, registration not required
    - 高等数学
    - 专升本
    - 陕西
  cover:
    file: media/covers/cover.png
    accent: "#2f6f5e"                  # required, #RRGGBB
    focus: [0.5, 0.35]                 # optional, two numbers 0–1
    alt: Higher mathematics cover      # optional, ≤120 chars

author:
  name: Morrow Community               # required
  url: https://example.com             # optional, must be a valid URI
  email: hi@example.com                # optional, must be a valid address

compatibility:
  min_app_version: "0.1.0"             # the client is 0.1.0; a larger value will not install

contents:
  knowledge:
    index: knowledge/index.yaml
  questions:
    index: questions/index.yaml
  solutions:
    index: solutions/index.yaml        # the whole block may be omitted
  relations:
    index: knowledge/relations.yaml
  taxonomy:
    tags: taxonomy/tags.yaml
    error_types: taxonomy/error-types.yaml
  citations:
    sources: citations/sources.yaml

dependencies: []                        # optional; when present they must be explicit, never fetched at runtime
integrity:
  algorithm: sha256                    # constant
  file: checksums.sha256               # constant
```

Key points:

- **No extra fields at any level of the manifest** (the schema is `additionalProperties: false`, and the Rust side adds `deny_unknown_fields`). One misspelled key and the package will not install — it is not silently ignored.
- `package.tags` are **for humans** (shelf cards, filter labels): Chinese is fine, 1–24 chars each, 1–12 entries.
- `package.targets` are **for machines** (tag IDs) and must resolve in `taxonomy/tags.yaml`.
- `description` is ≤400 chars and appears on the shelf detail page.
- The cover `file` path must match `^media/covers/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$`. **SVG is not accepted** — a package is untrusted input, and SVG can carry scripts.

---

## 4. `knowledge/`

### 4.1 `knowledge/index.yaml`

```yaml
chapters:
  - id: calculus.book.ch01
    name: Chapter 1 — Functions and Limits
    order: 0
    summary: From the idea of a function to continuity on a closed interval.   # optional, ≤200 chars
    points:
      - id: calculus.book.ch01.function
        file: knowledge/concepts/ch01-01-function.md
      - id: calculus.book.ch01.limit-computation
        file: knowledge/concepts/ch01-05-limit-computation.md
```

- `chapters[]` require `id` / `name` / `order`; `order` decides sidebar order (the client sorts by it, not by file order).
- **The chapter tree is flat.** The schema allows `parent`, but the client ignores it — do not expect nested chapters.
- Each `points[]` entry requires `id` / `file`; `file` must match `^knowledge/concepts/[A-Za-z0-9._-]+\.md$`.
- A knowledge point may be mounted under exactly one chapter.
- The order of the `points` array is the display order inside the chapter; the `order` field is optional.

### 4.2 Point body

A file is YAML front matter plus a Markdown body.

```markdown
---
id: calculus.limit.one-sided
name: One-sided limits
chapter: calculus.chapter.function-and-limit
parent: calculus.function                # optional, ignored by the client, expressive only
tags:
  - limit
  - one-sided
difficulty: 3                            # 1–5
exam_importance: high                    # low | medium | high | critical
learning_objectives:
  - Write the notation for left and right limits and explain what it means
  - Decide whether a two-sided limit exists from the one-sided ones
summary: The left and right limits at a point describe where the function value tends as the variable approaches from that side.
prerequisites:
  - calculus.function
sources:
  - source.textbook.tongji-7
common_errors:                           # optional, each ≥6 chars
  - Ignores that the two branches differ at the split point and substitutes into one side.
images:                                  # optional
  - type: figure
    path: media/figures/ch01/single-limit.png
    caption: One-sided limit illustration
    alt: One-sided limit diagram
---

# One-sided limits

$x\to a$ only says "approaches $a$", not from which side…
```

Field constraints:

| Field | Required | Constraint |
| --- | --- | --- |
| `id` | yes | Must match the id registered in `index.yaml` exactly |
| `name` | yes | 1–60 chars |
| `chapter` | yes | Must equal the chapter id it is mounted under |
| `tags` | yes | ≥1, unique, `^[a-z0-9][a-z0-9._-]*$` |
| `difficulty` | yes | Integer 1–5 (content difficulty only, not learner mastery) |
| `learning_objectives` | yes | 1–8 entries, each ≥4 chars |
| `exam_importance` | no | `low` / `medium` / `high` / `critical`; missing sorts lowest |
| `summary` | no | ≤400 chars, used in lists and search |
| `prerequisites` | no | Point ids, **cycle detection only, targets not checked** |
| `sources` | no | Source ids, must already be registered |
| `common_errors` | no | Each ≥6 chars |
| `images` | no | See below |
| `version` | no | `x.y.z` |

Each `images[]` entry requires `type` (`formula` / `figure` / `screenshot` / `other`) and `path`; `caption` (≤200) and `alt` (≤200) are optional. `path` is package-relative and **should live under `media/`** (elsewhere earns an "easy to miss when packaging" warning); the file must exist.

Body requirements:

- **The body must be at least 20 characters after trimming**, or it reports "body empty or too short".
- The body is Markdown; inline math uses `$…$`, display math `$$…$$`, rendered by KaTeX.
- Body images use `![caption](media/figures/…)` and go through the same workspace-isolated media reader.
- The suggested eight sections are "overview / core definitions / properties and theorems / formulas and derivations / worked examples / common mistakes / prerequisites / extensions" — a suggestion, not a hard constraint.

### 4.3 `knowledge/relations.yaml`

```yaml
relations:
  - id: relation.limit.function
    from: calculus.limit
    to: calculus.function
    type: prerequisite
    strength: 1.0
```

- `id` must match `^relation\.[a-z0-9._-]+$` and be globally unique.
- `type` is one of `prerequisite` / `related` / `contains` / `extends` / `contrasts`.
- `strength` is a 0–1 number and **required** (the schema has no default, even though the Rust parser falls back to 1.0).
- Both ends must be defined knowledge points.
- **Prerequisite relations must not form a cycle.** Cycle detection merges `prerequisite` edges from `relations.yaml` with the `prerequisites` in point front matter, so do not state the same prerequisite contradictorily in both places.
- Note: ids in `prerequisites` **are not checked for existence** (only format and cycles). A typo is silent, and the edge simply disappears in the client. Grep your own work.
- The same unordered pair **must not declare `prerequisite` and another type at once**. `A→B prerequisite` plus `B→A related` is wrong.

Semantic hint: `from` is the more basic / earlier side. `relation.derivative.limit` means "the derivative takes the limit as a prerequisite".

---

## 5. `questions/`

### 5.1 `questions/index.yaml`

```yaml
files:
  - path: questions/adapted/limits.json
    chapter: calculus.chapter.function-and-limit    # optional; the client ignores it, archival only
    count: 15                                       # required, must equal the number of questions in the file
    schema_version: "1.0"                           # optional
  - path: questions/generated/ch01.json
    chapter: calculus.book.ch01
    count: 18
```

- `path` must match `^questions/(original|adapted|imported|generated)/[A-Za-z0-9._-]+\.json$`. **It cannot sit directly under `questions/`.**
- `count` is required; a mismatch with the real number is an error. The installer checks again.
- Splitting by source type is a requirement, not a habit: `original` authored, `adapted` adapted, `imported` verbatim past exam, `generated` AI-generated.

### 5.2 Question files

The top level holds only a `questions` array:

```json
{
  "questions": [
    {
      "id": "calculus.limit.q.000001",
      "type": "single_choice",
      "content": "Let $f(x)=\\begin{cases} x+1, & x<0 \\\\ x^2, & x \\ge 0 \\end{cases}$. Then $\\lim\\limits_{x \\to 0} f(x)$ is",
      "options": [
        { "id": "A", "content": "$0$" },
        { "id": "B", "content": "$1$" },
        { "id": "C", "content": "does not exist" },
        { "id": "D", "content": "$+\\infty$" }
      ],
      "answer": { "type": "single", "value": ["C"] },
      "knowledge_points": ["calculus.limit.one-sided", "calculus.limit"],
      "tags": ["limit", "basic"],
      "difficulty": 2,
      "source": { "type": "generated", "source_id": null },
      "status": "reviewed",
      "version": "1.0.0",
      "estimated_minutes": 3
    }
  ]
}
```

Required: `id`, `type`, `content`, `answer`, `knowledge_points`, `tags`, `difficulty`, `source`, `status`.
Optional: `options`, `images`, `estimated_minutes`, `version`.

### 5.3 Question type vs answer type

There are nine `type` values, and **the answer type must be consistent with the question type** — the validator really does enforce this:

| `type` | Meaning | `answer.type` | `answer.value` shape | Options |
| --- | --- | --- | --- | --- |
| `single_choice` | Single choice | **must be `single`** | `["B"]`, exactly one | required |
| `multiple_choice` | Multiple choice | `multiple` | `["A","C"]`, in option order | required |
| `true_false` | True / false | `boolean` or `single` | `["true"]` / `["false"]`; with `single`, supply A/B options and write `["A"]` | `boolean` optional; `single` required |
| `fill_blank` | Fill in the blank | `text` | `["$-1$"]` | none |
| `calculation` | Calculation | `text` | `["$\\frac{3}{2}$"]` | none |
| `proof` | Proof | `text` | `["there exists $\\xi\\in(0,1)$ such that …"]` | none |
| `short_answer` | Short answer | `text` | key conclusion | none |
| `application` | Application | `text` | final result | none |
| `ordering` | Ordering | `ordering` | list in the expected order | required |

The validator's specific rules:

- Option ids are `A`–`H`, no duplicates; 2–12 options.
- With `answer.type` = `boolean`, `value[0]` is the string `"true"` or `"false"`.
- With `single` / `multiple` / `ordering`, every key in `value` must be an existing option id.
- With `single`, `value` must have exactly one element.
- When `type` is `single_choice`, `answer.type` must be `single`.
- With `text`, `value` is not checked against options.

### 5.4 Writing text answers that grade correctly

Fill-in and calculation answers are **string comparisons**, normalised before comparing:

- Strip `$`, spaces and trailing full stops; `，、` → `,`; full-width brackets → half-width; `－−–` → `-`
- `\frac{a}{b}` → `a/b`; `\sqrt{x}` → `√(x)`
- `\infty \cup \cap \pi \alpha \beta \theta \times \div \cdot \le \ge \ne \to \pm` become their symbols
- Lowercase everything

Therefore:

- Write `$-\frac{1}{2}$` and a learner typing `-1/2` still grades correct.
- Do **not** put reasoning or several equivalent forms in `value` (e.g. `"$-1$ or $1$"`) — the comparison is equality, not containment.
- `calculation` / `proof` / `short_answer` / `application` are **not auto-graded**: the app lets the learner tick their own work against the solution. Write the final conclusion in `answer.value`; it does not need to be machine-comparable.
- Multiple-choice answers are joined in option order on the client, so write `value` in `A→H` order.

### 5.5 Knowledge points and tags

- `knowledge_points` needs at least 1 entry, and **the first is the primary point**. The diagnostic paper draws by primary point: a question only counts for the point it primarily tests.
- Get the primary point wrong and that point never gets drawn.
- `tags` needs at least 1 entry, all registered in `taxonomy/tags.yaml`.
- One primary point per question is recommended, with up to three related tags.

### 5.6 `source` and `status`

```json
"source": { "type": "adapted", "source_id": "source.exam.shaanxi-zsb.2021" }
```

- `type` is one of `original` / `adapted` / `imported` / `generated`.
- **Never label an AI-generated question as a past exam question.** This is a content-integrity issue, and the only one the validator cannot catch.
- `source_id` may be null; when present it must be registered in `citations/sources.yaml`.
- When `type` is `imported`, the source's `license` must be one of `public_domain` / `open_license` / `licensed` / `local_only`. `unknown` or `permission_required` is an error.
- `status` is one of `draft` / `pending` / `reviewed` / `deprecated`.

> **Note: the client does not filter by `status`.** `draft` questions still enter diagnostic and mock papers. "Ship a few drafts and fix them later" does not work; it must be finished before submission.

### 5.7 Question images

```json
"images": [
  {
    "type": "figure",
    "path": "media/figures/ch01/single-limit.png",
    "position": "stem",
    "caption": "Stem figure",
    "alt": "Piecewise function plot"
  }
]
```

- `position` is `stem` / `explanation` / `option:A`–`option:H`, default `stem`.
- With `option:X`, option X must exist.
- The file must exist, or it is an error.

---

## 6. `solutions/`

### 6.1 `solutions/index.yaml`

```yaml
files:
  - path: solutions/limits.json
    count: 15
```

- `path` must match `^solutions/[A-Za-z0-9._-]+\.json$`, **no subdirectories**.
- `count` is required and must equal the number of solutions in the file.

### 6.2 Solution files

```json
{
  "solutions": [
    {
      "question_id": "calculus.limit.q.000001",
      "schema_version": "1.0",
      "explanation": {
        "summary": "A limit at the split point of a piecewise function needs both one-sided limits; they differ, so the limit does not exist.",
        "steps": [
          { "index": 1, "content": "Left limit: as $x \\to 0^-$ use the $x<0$ branch, $\\lim\\limits_{x \\to 0^-}(x+1)=1$." },
          { "index": 2, "content": "Right limit: as $x \\to 0^+$ use the $x \\ge 0$ branch, $\\lim\\limits_{x \\to 0^+}x^2=0$." },
          { "index": 3, "content": "The one-sided limits differ, so $\\lim\\limits_{x \\to 0}f(x)$ does not exist." }
        ],
        "final_answer": "C"
      },
      "common_errors": [
        "Substituting into the right branch only and getting $0$, missing that the left limit is $1$.",
        "Treating $f(0)=0$ as the limit: the value at a point is unrelated to the limit."
      ]
    }
  ]
}
```

- Required: `question_id`, `schema_version` (`x.y`), `explanation.summary`.
- Each `explanation.steps[]` entry requires `index` (integer ≥1) and `content`.
- `explanation.final_answer` is optional and shown separately for quick comparison.
- `explanation.alternatives[]` is optional: other methods, one paragraph each.
- Each `common_errors[]` entry is ≥1 char. It feeds error attribution and the "common mistakes" panel, so write it properly.
- **`question_id` must point at a real question and be globally unique.** One solution per question.

---

## 7. `taxonomy/`

### 7.1 `tags.yaml`

```yaml
tags:
  - id: limit
    name: Limits
  - id: one-sided
    name: One-sided
    description: Content that has to be discussed direction by direction, such as one-sided limits and derivatives.
  - id: advanced
    name: Advanced
    color: "#c2410c"
```

- `id` matches `^[a-z0-9][a-z0-9._-]*$`; `name` 1–24 chars; `description` ≤120 chars; `color` optional `#RRGGBB`.
- At least 1 entry, ids unique.
- Question `tags`, point `tags` and `manifest.package.targets` all draw from here.

### 7.2 `error-types.yaml`

```yaml
error_types:
  - id: conceptual_misunderstanding
    name: Conceptual misunderstanding
  - id: limit_sign
    name: One-sided sign error
    description: Wrong direction when judging a one-sided limit or derivative.
```

Same structure (no `color`). Cross-subject types are maintained by the base specification; a package only appends subject-specific ones. At least 1 entry.

---

## 8. `citations/sources.yaml`

```yaml
sources:
  - id: source.textbook.tongji-7
    title: Tongji University, Higher Mathematics, 7th edition
    type: textbook
    author: Department of Mathematics, Tongji University
    publisher: Higher Education Press
    license: unknown
    attribution: The advanced chapters are written by this project; only the chapter structure and terminology were consulted, no text was copied.

  - id: source.exam.shaanxi-zsb.2021
    title: 2021 Shaanxi college-upgrade admissions exam — Higher Mathematics
    type: exam
    year: 2021
    license: local_only
    attribution: The user holds the scanned paper; the verbatim questions appear only in the local package and must not be redistributed.
```

- Required: `id`, `title` (≤200 chars), `type`, `license`.
- `type` enum: `exam` / `textbook` / `syllabus` / `slides` / `notes` / `web` / `other`.
- `license` enum: `original` / `public_domain` / `open_license` / `licensed` / `permission_required` / `local_only` / `unknown`.
- Optional: `year` (1900–2200), `author`, `publisher`, `url` (valid URI), `attribution` (≤400 chars).
- **When the licence is unknown, write `unknown`. Do not assume it is distributable.**
- `local_only` means "user-held, this machine only": the content may ship in a package, but the package must not be publicly distributed. Using it produces a validator warning, and `README.md` must say so.

---

## 9. `media/`

- Cover: under `media/covers/`, png / jpg / jpeg / webp. **SVG is not accepted.**
- Illustrations: `media/figures/<chapter>/*.png` is recommended; reference them as `![alt](media/figures/…)`.
- Keep individual files ≤2 MB and the extracted package ≤512 MB.
- Image paths must be package-relative POSIX paths — no `data:` URIs, no remote URLs (the schema `path` rejects them).

---

## 10. Paths and safety limits

These are not suggestions; the installer rejects each one:

**Paths** must be POSIX-relative:

- must not start with `/` or `\` (absolute)
- must not contain a drive letter (`C:`)
- must not contain backslashes (`\`); use `/`
- must not contain null bytes
- must not contain `.` or `..` segments
- must not contain empty segments (`a//b`)

**Extension allowlist:**

```
.md .yaml .yml .json .sha256 .txt
.png .jpg .jpeg .webp .svg .pdf
.docx .doc .pptx .ppt
.mp3 .wav .m4a .ogg .mp4 .webm
```

Files without an extension (e.g. `LICENSE`) may exist but are never read as content.

**Extension denylist** (rejected even though absent from the allowlist):

```
.exe .dll .so .dylib .bat .cmd .ps1 .sh .msi .com .scr
.js .mjs .cjs .vbs .jar .py
```

**Scale limits:**

| Item | Limit |
| --- | --- |
| File count | 20000 |
| Extracted size | 512 MB |
| Extracted size | ≤ 1/4 of available memory |
| Compression ratio | >200× warns only, does not reject |

---

## 11. Checksums and packaging

```bash
# 1. Recompute checksums (after every content change)
node scripts/writeChecksums.mjs packages/my-package

# 2. Validate (exit code 0 means pass)
node scripts/validatePackage.mjs packages/my-package

# 3. Pack into .morrow (runs 1 and 2 internally)
node scripts/mlps/pack.mjs packages/my-package dist-packages/my-package.morrow
```

A passing run looks like this:

```
✓ cn.morrow.calculus.shaanxi-upgrade@2.0.0：13 chapters, 72 knowledge points, 153 questions, 153 solutions, 18 relations, 9 sources
```

With warnings, one `!` line is added above:

```
! 包含 7 条 local_only 来源，本学习包仅限本机使用，不得公开分发
```

**Archive layout: `manifest.yaml` must sit at the archive root.** `pack.mjs` runs `7z a ... * -r` inside the package directory, so no extra folder is created. When packing by hand, do not zip the directory itself.

---

## 12. Content floor: give every feature something to work with

Valid format ≠ usable. Several features depend on content volume:

### 12.1 Diagnostic paper: 15 questions, covering primary points

`buildDiagnostic` draws **one question per knowledge point** in the first pass until 15 are collected; if short, a second pass follows the same stable order.

Consequences:

- **At least one question per knowledge point**, or that point is permanently absent from the diagnostic paper and shows as "untested" in the learner model.
- Two per point is recommended (one objective, one subjective): the diagnostic can cover it and targeted practice has material.
- With fewer than 15 points the paper gets shorter; with more, one pass covers the first 15 and the rest rotate across papers.

### 12.2 Mock exam: 22 slots, drawn by question type

`EXAM_SECTIONS` is the fixed real-paper structure:

| Section | Types | Slots | Marks each |
| --- | --- | --- | --- |
| I. Multiple choice | `single_choice` | 5 | 5 |
| II. Fill in the blank | `fill_blank` | 5 | 5 |
| III. Calculation | `calculation` | 10 | 8 |
| IV. Application and proof | `proof` / `application` / `short_answer` | 2 | 10 |

150 marks, 120 minutes. **Within each section, questions are taken hardest first**; if a section cannot be filled, the result page says "this paper is short N questions" rather than silently shrinking the total.

So a complete mock paper needs at least:

- 5 `single_choice`
- 5 `fill_blank`
- 10 `calculation`
- 2 `proof` / `application` / `short_answer`

A short package still produces a paper, just not worth 150. For a good demo, match the ratio.

### 12.3 Suggested ratios

For 72 knowledge points:

| Item | Suggested volume |
| --- | --- |
| Knowledge points | 5–10 per chapter, each with a body of ≥400 characters |
| Questions | 2 per point, roughly 2× the point count |
| Solutions | 1:1 with questions (100% coverage strongly recommended) |
| Relations | At least one prerequisite or related edge per point, 1.5–2× the point count overall |
| Sources | Register every textbook or paper referenced |
| Tags | Cover the chapter, type and difficulty dimensions |

---

## 13. Pre-submission checklist

**Structure and format**

- [ ] All nine required files present, `manifest.yaml` at the root
- [ ] `format.version` is the string `"1.0"` (quoted)
- [ ] `package.version` is `x.y.z`, `min_app_version` ≤ `0.1.0`
- [ ] No fields outside the schema (one extra key and it will not install)
- [ ] `package.tags` are human-facing, `package.targets` are registered IDs

**References**

- [ ] Every question's `knowledge_points` exist
- [ ] Every question's `tags` are registered in `taxonomy/tags.yaml`
- [ ] Every `source_id` is registered in `citations/sources.yaml`
- [ ] Both ends of every relation exist, and prerequisites have no cycles
- [ ] No unordered pair declares `prerequisite` and another type
- [ ] Every `images[].path` points at a real file
- [ ] The cover is under `media/covers/` and is a bitmap

**Content**

- [ ] Every body is ≥20 characters (≥400 recommended)
- [ ] Front matter `id` / `chapter` match `knowledge/index.yaml` exactly
- [ ] At least 2 questions per knowledge point
- [ ] Single-choice questions use `answer.type: single` with exactly one value
- [ ] Choice answers reference option ids that exist
- [ ] True/false answers are written as `["true"]` / `["false"]` or `["A"]` / `["B"]`
- [ ] Every question has a solution, and `question_id` values are unique
- [ ] No AI-generated question is labelled `imported`

**Integrity**

- [ ] `node scripts/writeChecksums.mjs` has been rerun
- [ ] `node scripts/validatePackage.mjs` exits 0
- [ ] The archive root is `manifest.yaml` directly, with no extra folder

---

## Appendix A: old docs vs the current schema

`docs/04-Data/MLPS.md` and `Knowledge-Standard.md` are early design drafts; parts have been superseded. When writing a package, follow the right-hand column.

| Item | Old docs | Current real constraint |
| --- | --- | --- |
| Question ID | `math_higher_q_000001` | `calculus.limit.q.000001` (reverse domain, no underscores) |
| Type field name | `question_type` | `type` |
| Difficulty | enum `easy/medium/hard` | integer 1–5 |
| Source field name | `source_type` | `source.type` |
| Solutions | inline in the question | separate `solutions/`, joined by `question_id` |
| Directories | `exams/`, `materials/`, `past-papers/`, `learning/`, `indexes/` | the client does not read them; they are just files |
| Chapters | multi-level `chapters/` tree | flat chapters in `knowledge/index.yaml`, bodies in `knowledge/concepts/` |
| Archive format | undecided | 7z container, `.morrow` extension, entries at the root |

`schemas/question.schema.json` (no `mlps` prefix) is an older revision with the same outdated field names. **`schemas/mlps/*.schema.json` is authoritative.**

---

## Appendix B: commands and directories at a glance

```bash
# Validate a package directory
node scripts/validatePackage.mjs <package-dir>

# Recompute checksums
node scripts/writeChecksums.mjs <package-dir>

# Pack
node scripts/mlps/pack.mjs <package-dir> [output.morrow]

# Question coverage per knowledge point
node scripts/mlps/coverage.mjs <package-dir>

# Question type distribution
node scripts/mlps/types.mjs <package-dir>
```

Reference implementation: `packages/cn.morrow.calculus.shaanxi-upgrade/` (13 chapters / 72 knowledge points / 153 questions / 153 solutions / 18 relations / 9 sources). It is the only sample that passes the full validator — when in doubt, copy its shape.

The authoring prompts used to produce this content are working material and are not part of this repository. The schemas under `schemas/` are the contract they must satisfy.
