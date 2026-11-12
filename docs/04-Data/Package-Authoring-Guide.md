<div align="center">

# Learning Package Authoring Guide

**From an empty folder to a `.morrow` archive that installs, reads, generates papers and feeds the learner model.**

[![Essential](https://img.shields.io/badge/ESSENTIAL-read%20before%20authoring-2f6f5e?style=flat-square)](#) [![Bilingual](https://img.shields.io/badge/docs-bilingual-2f6f5e?style=flat-square)](#) [![Validator](https://img.shields.io/badge/validated%20by-validatePackage.mjs-c2410c?style=flat-square)](#)

[English](#english) · [中文](#中文)

</div>

> **Audience.** Anyone producing a learning package for Morrow Agent, and any agent asked to "generate a learning package".
> **Goal.** After reading this you can produce a `.morrow` file that **installs, reads, generates papers and feeds the learner model**.

---

# English

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

Authoring prompts: `prompts/conventions.md` (IDs, difficulty, math notation, copyright), `prompts/question-generation.md` (question writing).

---

# 中文

## 0. 先说结论

一个合格的学习包，是九个必需文件加一堆内容文件，全部通过 `node scripts/validatePackage.mjs`，并且满足三件事：

1. **每个引用都落在一个真实存在的对象上。** 题目引用的知识点、题目引用的标签、正文引用的来源，都必须在包内真实登记，否则校验直接失败。
2. **ID 稳定且全局唯一。** ID 是用户学习记录的锚点，改一次 ID，历史作答就全部悬空。
3. **校验和覆盖整棵树。** `checksums.sha256` 少登记一个文件、多登记一个不存在的文件、或者哈希对不上，安装都会失败。

再加一条内容层面的硬要求：**每个知识点至少 2 道题**。没有题的知识点，诊断卷抽不到、画像测不出、计划排不进——它在 App 里等于不存在。

---

## 1. 最小可用形状

```
my-package/
├── manifest.yaml                    ← 唯一入口，客户端只读它来定位其他文件
├── README.md                        ← 人读的说明（安装器也要求它在根目录）
├── checksums.sha256                 ← 全树哈希，最后一个生成
│
├── knowledge/
│   ├── index.yaml                   ← 章节树 + 知识点挂载位置
│   ├── relations.yaml               ← 知识点之间的关系边
│   └── concepts/
│       ├── ch01-01-function.md      ← 知识点正文（front matter + Markdown）
│       └── ...
│
├── questions/
│   ├── index.yaml                   ← 题目文件清单 + 每个文件的题数
│   ├── original/                    ← 自编题
│   ├── adapted/                     ← 改编题
│   ├── imported/                    ← 真题原文录入
│   └── generated/                   ← AI 生成题
│       └── ch01.json
│
├── solutions/
│   ├── index.yaml
│   └── ch01.json                    ← 与题目按 question_id 关联，可选但强烈建议
│
├── taxonomy/
│   ├── tags.yaml                    ← 标签词表（题目 tags 必须在此登记）
│   └── error-types.yaml             ← 错误类型词表
│
├── citations/
│   └── sources.yaml                 ← 来源与授权状态
│
└── media/
    ├── covers/cover.png             ← 封面，只收 png/jpg/jpeg/webp
    └── figures/ch01/*.png           ← 正文配图
```

### 1.1 九个必需文件

校验器在读取任何内容之前先查这九个（缺一个就报 `缺少必需文件`）：

| 文件 | 作用 |
| --- | --- |
| `manifest.yaml` | 包自述：ID、版本、封面、各内容的索引路径 |
| `README.md` | 人读说明。安装器另外单独要求它在压缩包根目录 |
| `knowledge/index.yaml` | 章节与知识点挂载 |
| `knowledge/relations.yaml` | 关系边（可以为空数组，但文件必须在） |
| `questions/index.yaml` | 题目文件清单 |
| `taxonomy/tags.yaml` | 标签词表，至少 1 条 |
| `taxonomy/error-types.yaml` | 错误类型词表，至少 1 条 |
| `citations/sources.yaml` | 来源登记 |
| `checksums.sha256` | 全树完整性 |

`manifest.yaml` 里的 `contents.solutions` 是**唯一可选**的内容块。不声明它，题目依然可作答，只是没有解析步骤。

---

## 2. 三条不变量

### 2.1 ID 稳定

所有 ID 都是反向域名式：至少两段，每段小写字母开头，只允许 `a-z 0-9 -`。

```
^[a-z][a-z0-9]*(\.[a-z0-9-]+)+$
```

- 合法：`calculus.limit.one-sided`、`calculus.limit.q.000001`、`calculus.book.ch01`
- 非法：`calculus`（只有一段）、`Calculus.Limit`（大写）、`math_higher_q_000001`（下划线，旧规范遗留）

**ID 发布后不得修改。** 改名只改 `name`。题目下线后序号永久作废，不得复用。

### 2.2 引用必须落地

校验器会逐条追这些引用，任何一条指向不存在的东西都是错误：

| 引用方 | 被引用方 | 说明 |
| --- | --- | --- |
| 题目 `knowledge_points[]` | 知识点 | 每一个都必须是已定义知识点 |
| 题目 `tags[]` | `taxonomy/tags.yaml` | 每一个都必须登记 |
| 题目 `source.source_id` | `citations/sources.yaml` | 登记后才能引用 |
| 知识点 `sources[]` | `citations/sources.yaml` | 同上 |
| 关系 `from` / `to` | 知识点 | 两端都必须存在 |
| 知识点 `prerequisites[]` | 知识点 | **只参与环检测，不查是否存在**（见下） |
| `manifest.package.targets[]` | `taxonomy/tags.yaml` | 书架筛选器不能挂空标签 |
| `manifest.package.cover.file` | `media/covers/` 下的真实文件 | 只收位图 |
| 任意 `images[].path` | 包内真实文件 | 缺文件即失败 |

注意两处**不被校验**、只能靠自觉的地方：

- **知识点 `tags[]` 只做格式校验，不查词表。** 题目的 tags 会查。为了筛选一致，知识点也用同一套标签。
- **正文 Markdown 里的 `![alt](media/…)` 不被校验。** front matter 的 `images` 才查文件是否存在。正文配图请自己确认路径拼对。

### 2.3 校验和覆盖整棵树

`checksums.sha256` 每行 `<64 位十六进制>   <包内 POSIX 路径>`，两空格分隔，按路径排序，**不登记自己**。

校验是双向的：登记了但文件不存在 → 错；文件存在但没登记 → 错；哈希不一致 → 错。所以每次改完内容都要重新生成。

---

## 3. `manifest.yaml`

```yaml
format:
  name: morrow-learning-package        # 常量，写错即拒绝
  version: "1.0"                       # 必须加引号，否则 YAML 会读成浮点数 1.0

package:
  id: cn.morrow.calculus.shaanxi-upgrade
  name: 应用高等数学
  version: 2.0.0                       # 严格 x.y.z
  description: 覆盖函数与极限到曲线曲面积分的完整高数教材。
  subject: mathematics                 # ^[a-z][a-z0-9-]*$
  sub_subject: calculus                # 可选
  language: zh-CN                      # ^[a-z]{2,3}(-[A-Za-z0-9]+)*$
  targets:                             # 机器可读，必须登记在 tags.yaml
    - college-entrance-upgrade
  region:                              # 可选，^[A-Z]{2}(-[A-Z0-9]{1,3})?$
    - CN-SN
  tags:                                # 书架展示文字，中文可以，不必登记
    - 高等数学
    - 专升本
    - 陕西
  cover:
    file: media/covers/cover.png
    accent: "#2f6f5e"                  # 必填，#RRGGBB
    focus: [0.5, 0.35]                 # 可选，两个 0–1 的数
    alt: 高等数学封面                    # 可选，≤120 字

author:
  name: Morrow Community               # 必填
  url: https://example.com             # 可选，必须是合法 URI
  email: hi@example.com                # 可选，必须是合法邮箱

compatibility:
  min_app_version: "0.1.0"             # 当前客户端是 0.1.0，写更大就装不上

contents:
  knowledge:
    index: knowledge/index.yaml
  questions:
    index: questions/index.yaml
  solutions:
    index: solutions/index.yaml        # 整块可省
  relations:
    index: knowledge/relations.yaml
  taxonomy:
    tags: taxonomy/tags.yaml
    error_types: taxonomy/error-types.yaml
  citations:
    sources: citations/sources.yaml

dependencies: []                        # 可选；有依赖时必须显式声明，不得运行时下载
integrity:
  algorithm: sha256                    # 常量
  file: checksums.sha256               # 常量
```

要点：

- **manifest 的每一层都不允许额外字段**（schema 是 `additionalProperties: false`，Rust 侧还有 `deny_unknown_fields`）。写一个拼错的键，包就装不上，不会静默忽略。
- `package.tags` 是**给人看的**（书架卡片、筛选文案），可以写中文，1–24 字，1–12 条。
- `package.targets` 是**给机器看的**（标签 ID），必须能在 `taxonomy/tags.yaml` 里找到同名 ID。
- `description` ≤400 字，会显示在书架详情。
- 封面 `file` 的路径必须匹配 `^media/covers/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$`。**不收 SVG**——学习包是不可信输入，SVG 能带脚本。

---

## 4. `knowledge/`

### 4.1 `knowledge/index.yaml`

```yaml
chapters:
  - id: calculus.book.ch01
    name: 第一章 函数与极限
    order: 0
    summary: 从函数概念到闭区间连续性。      # 可选，≤200 字
    points:
      - id: calculus.book.ch01.function
        file: knowledge/concepts/ch01-01-function.md
      - id: calculus.book.ch01.limit-computation
        file: knowledge/concepts/ch01-05-limit-computation.md
```

- `chapters[]` 必填 `id` / `name` / `order`；`order` 决定侧边栏顺序（客户端按它排序，不按书写顺序）。
- **章节树是平的。** schema 允许章节写 `parent`，但客户端不读，不要指望多级章节。
- 每个 `points[]` 必填 `id` / `file`；`file` 必须匹配 `^knowledge/concepts/[A-Za-z0-9._-]+\.md$`。
- 同一个知识点只能挂在一个章节下。
- `points` 数组的顺序就是章节内知识点的展示顺序，`order` 字段可选。

### 4.2 知识点正文

文件 = YAML front matter + Markdown 正文。

```markdown
---
id: calculus.limit.one-sided
name: 左右极限
chapter: calculus.chapter.function-and-limit
parent: calculus.function                # 可选，客户端不读，仅表意
tags:
  - limit
  - one-sided
difficulty: 3                            # 1–5
exam_importance: high                    # low | medium | high | critical
learning_objectives:
  - 能写出左极限与右极限的记号并解释其含义
  - 能用左右极限判断双侧极限是否存在
summary: 函数在一点的左极限与右极限分别描述自变量从该点左侧与右侧趋近时函数值的趋向。
prerequisites:
  - calculus.function
sources:
  - source.textbook.tongji-7
common_errors:                           # 可选，每条 ≥6 字
  - 忽略分段点两侧表达式不同，直接用同一侧代入。
images:                                  # 可选
  - type: figure
    path: media/figures/ch01/single-limit.png
    caption: 单侧极限示意
    alt: 单侧极限示意图
---

# 左右极限

$x\to a$ 只说了"趋近 $a$"，没说从哪边来……
```

字段约束：

| 字段 | 必填 | 约束 |
| --- | --- | --- |
| `id` | 是 | 必须与 `index.yaml` 里登记的 id 完全一致 |
| `name` | 是 | 1–60 字 |
| `chapter` | 是 | 必须等于它挂载的章节 id |
| `tags` | 是 | ≥1 条，唯一，`^[a-z0-9][a-z0-9._-]*$` |
| `difficulty` | 是 | 1–5 整数（只表示内容难度，不代表学生掌握度） |
| `learning_objectives` | 是 | 1–8 条，每条 ≥4 字 |
| `exam_importance` | 否 | `low` / `medium` / `high` / `critical`，缺省按最低排 |
| `summary` | 否 | ≤400 字，用于列表与检索摘要 |
| `prerequisites` | 否 | 知识点 id 列表，**只参与环检测，不校验目标是否存在** |
| `sources` | 否 | 来源 id 列表，必须已登记 |
| `common_errors` | 否 | 每条 ≥6 字 |
| `images` | 否 | 见下 |
| `version` | 否 | `x.y.z` |

`images[]` 每项必填 `type`（`formula` / `figure` / `screenshot` / `other`）与 `path`；可选 `caption`（≤200）、`alt`（≤200）。`path` 是包内相对路径，**建议放在 `media/` 下**（放别处会给一条「打包时容易漏掉」的警告），文件必须真实存在。

正文要求：

- **正文去掉首尾空白后至少 20 字**，否则报「正文为空或过短」。
- 正文是 Markdown，行内公式用 `$…$`，独立公式用 `$$…$$`，由 KaTeX 渲染。
- 正文图片用 `![说明](media/figures/…)`，走同一套 workspace 隔离的媒体读取。
- 建议按「知识概述 / 核心定义 / 性质与定理 / 公式与推导 / 典型例题 / 常见错误 / 前置知识 / 拓展内容」八节写，但这不是硬约束。

### 4.3 `knowledge/relations.yaml`

```yaml
relations:
  - id: relation.limit.function
    from: calculus.limit
    to: calculus.function
    type: prerequisite
    strength: 1.0
```

- `id` 必须匹配 `^relation\.[a-z0-9._-]+$`，全局唯一。
- `type` 只能是 `prerequisite` / `related` / `contains` / `extends` / `contrasts`。
- `strength` 是 0–1 的数，**必填**（schema 里没有缺省，虽然 Rust 解析给了 1.0 的兜底）。
- 两端必须是已定义知识点。
- **前置关系不得成环。** 环检测会把 `relations.yaml` 的 `prerequisite` 边和知识点 front matter 的 `prerequisites` 合并后一起跑，所以同一个前置关系不要在两处写出矛盾。
- 注意：`prerequisites` 里的 id **不校验是否真实存在**（只做格式校验与环检测）。写错一个 id 不会报错，但这条前置关系在客户端就静默丢失了。写完自己 grep 一遍。
- 同一对知识点（无向）**不得同时声明 `prerequisite` 和其他类型**。写成 `A→B prerequisite` 又写 `B→A related` 是错的。

语义提示：`from` 是「更基础/更靠前」的一方。`relation.derivative.limit` 表示「导数以极限为前置」。

---

## 5. `questions/`

### 5.1 `questions/index.yaml`

```yaml
files:
  - path: questions/adapted/limits.json
    chapter: calculus.chapter.function-and-limit    # 可选，客户端不读，仅归档用
    count: 15                                       # 必填，必须等于文件内题数
    schema_version: "1.0"                           # 可选
  - path: questions/generated/ch01.json
    chapter: calculus.book.ch01
    count: 18
```

- `path` 必须匹配 `^questions/(original|adapted|imported|generated)/[A-Za-z0-9._-]+\.json$`。**不能放在 `questions/` 根下。**
- `count` 必填，与实际条数不符即报错。安装器也会再查一次。
- 按来源类型分目录是硬要求，不是习惯：`original` 自编、`adapted` 改编、`imported` 真题原文、`generated` AI 生成。

### 5.2 题目文件

顶层只有 `questions` 数组：

```json
{
  "questions": [
    {
      "id": "calculus.limit.q.000001",
      "type": "single_choice",
      "content": "设 $f(x)=\\begin{cases} x+1, & x<0 \\\\ x^2, & x \\ge 0 \\end{cases}$，则 $\\lim\\limits_{x \\to 0} f(x)$ 是",
      "options": [
        { "id": "A", "content": "$0$" },
        { "id": "B", "content": "$1$" },
        { "id": "C", "content": "不存在" },
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

必填字段：`id`、`type`、`content`、`answer`、`knowledge_points`、`tags`、`difficulty`、`source`、`status`。
可选：`options`、`images`、`estimated_minutes`、`version`。

### 5.3 题型与答案的对应关系

`type` 有九种，但**答案类型必须与题型自洽**，这是校验器真会拦的：

| `type` | 含义 | `answer.type` | `answer.value` 写法 | 选项 |
| --- | --- | --- | --- | --- |
| `single_choice` | 单选 | **必须 `single`** | `["B"]`，恰好一个 | 必须有 |
| `multiple_choice` | 多选 | `multiple` | `["A","C"]`，按选项顺序 | 必须有 |
| `true_false` | 判断 | `boolean` 或 `single` | `["true"]` / `["false"]`；用 `single` 时必须给 A/B 两个选项并写 `["A"]` | `boolean` 可无；`single` 必须有 |
| `fill_blank` | 填空 | `text` | `["$-1$"]` | 无 |
| `calculation` | 计算 | `text` | `["$\\frac{3}{2}$"]` | 无 |
| `proof` | 证明 | `text` | `["存在 $\\xi\\in(0,1)$ 使 …"]` | 无 |
| `short_answer` | 简答 | `text` | 关键结论 | 无 |
| `application` | 应用 | `text` | 最终结果 | 无 |
| `ordering` | 排序 | `ordering` | 按期望顺序列出 | 必须有 |

校验器的具体规则：

- 选项 id 只能是 `A`–`H`，且不得重复；选项数量 2–12。
- `answer.type` 为 `boolean` 时，`value[0]` 只能是字符串 `"true"` 或 `"false"`。
- `answer.type` 为 `single` / `multiple` / `ordering` 时，`value` 里每个键都必须是已存在的选项 id。
- `answer.type` 为 `single` 时，`value` 长度必须恰好 1。
- `type` 是 `single_choice` 时，`answer.type` 必须是 `single`。
- `answer.type` 为 `text` 时，`value` 内容不参与选项校验。

### 5.4 文本答案怎么写才能被自动判对

填空/计算这类题的答案是**字符串比对**，比较前会做一次归一化：

- 去掉 `$`、空格、句末句号；`，、` → `,`；全角括号 → 半角；`－−–` → `-`
- `\frac{a}{b}` → `a/b`；`\sqrt{x}` → `√(x)`
- `\infty \cup \cap \pi \alpha \beta \theta \times \div \cdot \le \ge \ne \to \pm` 等转成对应符号
- 统一小写

所以：

- 能写成 `$-\frac{1}{2}$` 的，用户输入 `-1/2` 也能判对。
- 但**不要**在 `value` 里写解题过程或多种等价写法（如 `"$-1$ 或 $1$"`），比对是全等，不是包含。
- `calculation` / `proof` / `short_answer` / `application` 四类**不做自动判分**：App 让用户自己对照解析打勾。所以这四类的 `answer.value` 写成「最终结论」，供人核对即可，不必苛求可机器比对。
- 多选答案在客户端会按选项顺序拼成一个字符串比较，因此 `value` 请按 `A→H` 顺序书写。

### 5.5 知识点与标签

- `knowledge_points` 至少 1 个，且**第一个是主考点**。诊断卷按主考点覆盖式抽题：一道题只算它主考的那个点。
- 主考点写错，这个点就永远抽不到题。
- `tags` 至少 1 个，全部必须登记在 `taxonomy/tags.yaml`。
- 一道题建议主考 1 个点，最多再挂 3 个关联标记。

### 5.6 `source` 与 `status`

```json
"source": { "type": "adapted", "source_id": "source.exam.shaanxi-zsb.2021" }
```

- `type` 只能是 `original` / `adapted` / `imported` / `generated`。
- **不得把 AI 生成题标成真题。** 这是内容诚信问题，也是唯一无法靠校验器发现的问题。
- `source_id` 可空；非空时必须在 `citations/sources.yaml` 登记。
- `type` 为 `imported`（真题原文）时，对应来源的 `license` 必须是 `public_domain` / `open_license` / `licensed` / `local_only` 之一。`unknown` 或 `permission_required` 会直接报错。
- `status` 只能是 `draft` / `pending` / `reviewed` / `deprecated`。

> **注意：客户端目前不按 `status` 过滤。** `draft` 的题同样会进诊断卷和模拟卷。所以「先放几道草稿以后再改」是不成立的，提交前就必须是成品。

### 5.7 题目配图

```json
"images": [
  {
    "type": "figure",
    "path": "media/figures/ch01/single-limit.png",
    "position": "stem",
    "caption": "题干配图",
    "alt": "分段函数图像"
  }
]
```

- `position` 只能是 `stem` / `explanation` / `option:A`–`option:H`，缺省 `stem`。
- 写 `option:X` 时，选项 X 必须存在。
- 文件必须存在，否则报错。

---

## 6. `solutions/`

### 6.1 `solutions/index.yaml`

```yaml
files:
  - path: solutions/limits.json
    count: 15
```

- `path` 必须匹配 `^solutions/[A-Za-z0-9._-]+\.json$`，**不能再分子目录**。
- `count` 必填，必须等于文件内解析条数。

### 6.2 解析文件

```json
{
  "solutions": [
    {
      "question_id": "calculus.limit.q.000001",
      "schema_version": "1.0",
      "explanation": {
        "summary": "分段函数在分界点求极限，必须分别看左右极限；两侧不相等，极限就不存在。",
        "steps": [
          { "index": 1, "content": "左极限：$x \\to 0^-$ 时走 $x<0$ 这支，$\\lim\\limits_{x \\to 0^-}(x+1)=1$。" },
          { "index": 2, "content": "右极限：$x \\to 0^+$ 时走 $x \\ge 0$ 这支，$\\lim\\limits_{x \\to 0^+}x^2=0$。" },
          { "index": 3, "content": "左右极限不等，所以 $\\lim\\limits_{x \\to 0}f(x)$ 不存在。" }
        ],
        "final_answer": "C"
      },
      "common_errors": [
        "只代入右支的 $x^2$ 得到 $0$，忽略了左支的极限是 $1$。",
        "把 $f(0)=0$ 当成极限值：函数在一点取值与极限无关。"
      ]
    }
  ]
}
```

- 必填 `question_id`、`schema_version`（`x.y`）、`explanation.summary`。
- `explanation.steps[]` 每项必填 `index`（≥1 整数）与 `content`。
- `explanation.final_answer` 可选，会单独展示，方便一眼对照。
- `explanation.alternatives[]` 可选，写其他解法，按段落列。
- `common_errors[]` 每条 ≥1 字。这是错题归因与「常见错误」面板的数据源，值得认真写。
- **`question_id` 必须指向真实题目，且全局不重复。** 一道题只能有一份解析。

---

## 7. `taxonomy/`

### 7.1 `tags.yaml`

```yaml
tags:
  - id: limit
    name: 极限
  - id: one-sided
    name: 单侧
    description: 左右极限、左右导数这类需要分方向讨论的内容。
  - id: advanced
    name: 综合题
    color: "#c2410c"
```

- `id` 匹配 `^[a-z0-9][a-z0-9._-]*$`，`name` 1–24 字，`description` ≤120 字，`color` 可选 `#RRGGBB`。
- 至少 1 条，id 不得重复。
- 题目 `tags`、知识点 `tags`、`manifest.package.targets` 都从这里取词。

### 7.2 `error-types.yaml`

```yaml
error_types:
  - id: conceptual_misunderstanding
    name: 概念理解错误
  - id: limit_sign
    name: 单侧符号错误
    description: 左右极限或左右导数的方向判断出错。
```

结构同上（无 `color`）。跨学科通用类型由基础规范维护，学习包只追加学科专属项。至少 1 条。

---

## 8. `citations/sources.yaml`

```yaml
sources:
  - id: source.textbook.tongji-7
    title: 同济大学《高等数学》第七版
    type: textbook
    author: 同济大学数学系
    publisher: 高等教育出版社
    license: unknown
    attribution: 精讲章节由本项目自行撰写，仅参考该教材的章节划分与术语，未复制原文。

  - id: source.exam.shaanxi-zsb.2021
    title: 2021 年陕西省普通高等教育专升本招生考试 高等数学
    type: exam
    year: 2021
    license: local_only
    attribution: 试卷扫描件由用户自行持有；题目原文仅收录于本地学习包，不得公开分发。
```

- 必填 `id`、`title`（≤200 字）、`type`、`license`。
- `type` 枚举：`exam` / `textbook` / `syllabus` / `slides` / `notes` / `web` / `other`。
- `license` 枚举：`original` / `public_domain` / `open_license` / `licensed` / `permission_required` / `local_only` / `unknown`。
- 可选 `year`（1900–2200）、`author`、`publisher`、`url`（合法 URI）、`attribution`（≤400 字）。
- **授权状态未知时填 `unknown`，不要默认按可分发处理。**
- `local_only` 表示「用户自持、仅限本机」：内容可以进包，但包不得公开分发。用到它，校验会输出一条警告，`README.md` 里也必须写清楚。

---

## 9. `media/`

- 封面：`media/covers/` 下，png / jpg / jpeg / webp。**不收 SVG。**
- 配图：建议 `media/figures/<章节>/*.png`，正文用 `![alt](media/figures/…)` 引用。
- 单文件建议 ≤2 MB，整包解压后 ≤512 MB。
- 图片路径必须是包内 POSIX 相对路径，不得是 `data:` URI 或远程 URL（schema 的 `path` 不接受）。

---

## 10. 路径与安全限制

这些不是建议，是安装器会逐条拒绝的：

**路径**必须是 POSIX 相对路径：

- 不得以 `/` 或 `\` 开头（绝对路径）
- 不得含盘符（`C:`）
- 不得含反斜杠（`\`），必须用 `/`
- 不得含空字符
- 不得含 `.` 或 `..` 路径段
- 不得有空路径段（`a//b`）

**扩展名白名单**：

```
.md .yaml .yml .json .sha256 .txt
.png .jpg .jpeg .webp .svg .pdf
.docx .doc .pptx .ppt
.mp3 .wav .m4a .ogg .mp4 .webm
```

无扩展名的文件（如 `LICENSE`）允许存在，但不会被当作内容读取。

**扩展名黑名单**（即使白名单里没有也单独拒绝）：

```
.exe .dll .so .dylib .bat .cmd .ps1 .sh .msi .com .scr
.js .mjs .cjs .vbs .jar .py
```

**规模限制**：

| 项 | 上限 |
| --- | --- |
| 文件数 | 20000 |
| 解压后总大小 | 512 MB |
| 解压后总大小 | 不超过可用内存的 1/4 |
| 压缩比 | >200 倍只警告，不拒绝 |

---

## 11. 生成校验和与打包

```bash
# 1. 重算校验和（每次改完内容都要跑）
node scripts/writeChecksums.mjs packages/my-package

# 2. 校验（退出码 0 才算通过）
node scripts/validatePackage.mjs packages/my-package

# 3. 打包成 .morrow（内部会先跑 1 和 2）
node scripts/mlps/pack.mjs packages/my-package dist-packages/my-package.morrow
```

通过的输出长这样：

```
✓ cn.morrow.calculus.shaanxi-upgrade@2.0.0：13 章、72 知识点、153 题、153 份解析、18 条关系、9 条来源
```

有警告时会在上面多一行 `!`：

```
! 包含 7 条 local_only 来源，本学习包仅限本机使用，不得公开分发
```

**压缩包结构：`manifest.yaml` 必须在压缩包根目录。** `pack.mjs` 是在包目录内部执行 `7z a ... * -r`，所以不会多套一层文件夹。手工打包时注意别把整个目录打进去。

---

## 12. 内容下限：让每个功能都有东西可用

格式合格 ≠ 好用。App 的几个功能对内容量有硬性依赖：

### 12.1 诊断卷：15 题，按主考点覆盖

`buildDiagnostic` 第一轮**每个知识点抽 1 题**，抽满 15 题为止；不够再按同一稳定顺序加第二轮。

推论：

- **每个知识点至少 1 道题**，否则该点在诊断卷里永远缺席，画像上是「未测」。
- 建议**每个知识点 2 道**（一道客观题 + 一道主观题），这样诊断能覆盖到它，专项训练也有得练。
- 知识点少于 15 个时，卷子会变短；多于 15 个时，一轮只能覆盖前 15 个点，剩下的靠多套卷子轮换。

### 12.2 模拟卷：22 个题位，按题型抽

`EXAM_SECTIONS` 是固定的真题结构：

| 部分 | 题型 | 题位 | 每题分 |
| --- | --- | --- | --- |
| 一、选择题 | `single_choice` | 5 | 5 |
| 二、填空题 | `fill_blank` | 5 | 5 |
| 三、计算题 | `calculation` | 10 | 8 |
| 四、应用题与证明题 | `proof` / `application` / `short_answer` | 2 | 10 |

满分 150，时长 120 分钟。**每个部分内按难度从高到低取题**，取不满就在结果页标注「本卷缺 N 题」，不会静默缩小总分。

所以要出一张完整模拟卷，包里至少要有：

- 5 道 `single_choice`
- 5 道 `fill_blank`
- 10 道 `calculation`
- 2 道 `proof` / `application` / `short_answer`

题目不够时卷子仍然能出，只是分数不满 150。想让演示好看，就按这个配比出题。

### 12.3 建议配比

以 72 个知识点为例：

| 项 | 建议量 |
| --- | --- |
| 知识点 | 每章 5–10 个，每点一篇 ≥400 字正文 |
| 题目 | 每点 2 道，合计约 2×知识点数 |
| 解析 | 与题目 1:1（强烈建议 100% 覆盖） |
| 关系 | 每点至少 1 条前置或相关，总数为知识点数的 1.5–2 倍 |
| 来源 | 每个引用到的教材/试卷都要登记 |
| 标签 | 覆盖「章节」「题型」「难度」三个维度 |

---

## 13. 提交前自检清单

**结构与格式**

- [ ] 九个必需文件齐全，`manifest.yaml` 在根目录
- [ ] `format.version` 是字符串 `"1.0"`（带引号）
- [ ] `package.version` 是 `x.y.z`，`min_app_version` ≤ `0.1.0`
- [ ] 没有任何 schema 之外的字段（多一个键就装不上）
- [ ] `package.tags` 是给人看的中文，`package.targets` 是登记过的 ID

**引用**

- [ ] 每个题目的 `knowledge_points` 都真实存在
- [ ] 每个题目的 `tags` 都在 `taxonomy/tags.yaml` 登记
- [ ] 每个 `source_id` 都在 `citations/sources.yaml` 登记
- [ ] 每条关系的两端都存在，且前置关系无环
- [ ] 同一对知识点没有同时声明 `prerequisite` 和别的类型
- [ ] 每个 `images[].path` 指向真实文件
- [ ] 封面在 `media/covers/` 且是位图

**内容**

- [ ] 每篇正文 ≥20 字（实际建议 ≥400 字）
- [ ] front matter 的 `id` / `chapter` 与 `knowledge/index.yaml` 完全一致
- [ ] 每个知识点 ≥2 道题
- [ ] 单选题的 `answer.type` 是 `single` 且只有一个值
- [ ] 选择题答案引用的选项 id 都存在
- [ ] 判断题答案写成 `["true"]` / `["false"]` 或 `["A"]` / `["B"]`
- [ ] 每道题都有解析，`question_id` 不重复
- [ ] AI 生成的题没有标成 `imported`

**完整性**

- [ ] `node scripts/writeChecksums.mjs` 已重跑
- [ ] `node scripts/validatePackage.mjs` 退出码 0
- [ ] 压缩包根目录直接是 `manifest.yaml`，没有多一层文件夹

---

## 附录 A：旧文档与新 schema 的差异

`docs/04-Data/MLPS.md` 与 `Knowledge-Standard.md` 是早期设计稿，部分内容已被实现取代。写包时按右列来。

| 项 | 旧文档 | 现在的真实约束 |
| --- | --- | --- |
| 题目 ID | `math_higher_q_000001` | `calculus.limit.q.000001`（反向域名，禁止下划线） |
| 题型的字段名 | `question_type` | `type` |
| 难度 | 枚举 `easy/medium/hard` | 整数 1–5 |
| 来源字段名 | `source_type` | `source.type` |
| 答案解析 | 写在题目里 | 独立 `solutions/`，按 `question_id` 关联 |
| 目录 | 有 `exams/`、`materials/`、`past-papers/`、`learning/`、`indexes/` | 客户端不读这些目录，写了也只是普通文件 |
| 章节 | 多级 `chapters/` 目录树 | `knowledge/index.yaml` 平铺章节，正文在 `knowledge/concepts/` |
| 打包格式 | 未定 | 7z 容器，扩展名 `.morrow`，条目在根目录 |

`schemas/question.schema.json`（无 `mlps` 前缀）是更早的一版，字段名同样过时。**以 `schemas/mlps/*.schema.json` 为准。**

---

## 附录 B：命令与目录速查

```bash
# 校验一个学习包目录
node scripts/validatePackage.mjs <包目录>

# 重算校验和
node scripts/writeChecksums.mjs <包目录>

# 打包
node scripts/mlps/pack.mjs <包目录> [输出路径.morrow]

# 统计知识点题目覆盖率（当前工作区脚本）
node scripts/mlps/coverage.mjs <包目录>

# 统计题型分布
node scripts/mlps/types.mjs <包目录>
```

参考实现：`packages/cn.morrow.calculus.shaanxi-upgrade/`（13 章 / 72 知识点 / 153 题 / 153 解析 / 18 关系 / 9 来源）。它是唯一一个能完整通过校验的样例，拿不准格式时直接对照它。

生成提示词：`prompts/conventions.md`（ID、难度、数学表述、版权口径）、`prompts/question-generation.md`（命题）。
