---
name: vault-ingestion
description: >
  Executes structured ingestion of external content (Notion, Google Drive, Gmail, repo session
  outputs) into an Obsidian vault as properly formatted knowledge nodes. Use this skill whenever
  the user wants to ingest, sync, or pull external content into their vault — even if they just
  say "proceed" mid-pipeline, "run the ingestion plan", "ingest from Notion/Drive/Gmail/repo",
  "add this to the vault", "update the vault from this session", or "execute the [source]
  ingestion". Also triggers when continuing an ingestion session across context breaks. The skill
  applies lineage tagging, reference-stub vs full-ingest logic, DCM exclusions, archive rules,
  and distill-don't-copy rules for repo docs automatically.
---

# Vault Ingestion

You are executing a structured ingestion pipeline: fetching external content (Notion, Google Drive,
Gmail, repo/session outputs, or other sources) and writing it into an Obsidian vault as
well-formed knowledge nodes.

---

## Step 0: Orient yourself

Before writing anything, do **three** things:

1. **Read `systems/_ingestion.md`** — this is the primary ingestion config for the vault. It
   defines which projects have active ingestion, node targets, update triggers, and the
   per-session checklist. If it doesn't exist yet, fall back to legacy plan files (step 2).
2. **Find any other ingestion plan** — if no `systems/_ingestion.md` exists, look for files like
   `systems/notion-ingestion-plan.md`, `systems/google-drive-restructure-plan.md` (or equivalent).
   These are the authoritative disposition tables. Read whichever plan applies.
3. **Read `_taxonomy.md`** — this defines the canonical folder structure and tag schema. Use it
   to determine correct node paths and tags for everything you write. Never invent folder paths
   or tags that aren't in the taxonomy.

Check what's already done — scan for `✅` rows in the checklist. Skip those targets. Only process
rows that are `Pending` or unmarked.

If neither `systems/_ingestion.md` nor a plan file exists, ask the user to describe what they
want ingested and where. Offer to draft a plan first — ingestion is much cleaner with a plan.

---

## Universal Ingestion Rules

These apply to every source, every note type. Never deviate.

### Rule 1: Lineage over replacement
When multiple versions of the same content exist across sources, the **most recently modified,
most complete copy** wins as the `authoritative-source`. Older/alternate versions get
`status: lineage` in their frontmatter. Never overwrite a Drive-sourced note with a Notion note
or vice versa — preserve both with lineage links.

### Rule 2: DCM always excluded
Any content tagged DCM, "Divine Creative Ministries", "Project_10:14", "Created to Create
curriculum", or similar ministry project content is **never ingested**. Note the exclusion in
the plan but do not create a vault node.

### Rule 3: Large docs → reference stubs only
If a source document is large (>300KB, or a full manuscript/rulebook/GDD), do NOT attempt to
copy its content into the vault. Instead, write a **reference stub** — a vault note that
contains metadata, a link back to the source, and key data points extracted from the search
result or document metadata. The user reads the content at the source; the vault tracks its
existence and lineage.

### Rule 4: Pre-2023 content → archive, don't ingest
Content last modified before April 2023 stays in its source system. Note its existence if needed
for lineage, but do not create an active vault node. If a pre-2023 item already has a stub in
the vault, tag it `status: archived`.

### Rule 5: Repo docs → distill, don't copy
Engineering docs (PLANNING.md, DESIGN.md, ROADMAP.md, AGENTS.md, ADRs) live in the repo. Do
NOT copy their full content into the vault. Write distilled knowledge nodes: decisions made,
key schemas/formulas, open questions, phase summaries, and wikilinks back to the source URL.
The repo is the source of truth; the vault is the compressed intelligence layer.

---

## Note Frontmatter Schema

Every vault node gets YAML frontmatter. Use exactly these field names:

```yaml
---
type: <knowledge | reference | log | template>
domain: <engineering | writing | game-design | personal | systems | career | pkm>
source: <notion | google-drive | gmail | repo | vault>
source-url: <direct link to source document>
status: <active | lineage | archived>
authoritative-source: <notion | google-drive | gmail | repo | vault>
tags: [tag1, tag2, ...]
created: <YYYY-MM-DD>
---
```

**Choosing `type`:**
- `knowledge` — evergreen concepts, frameworks, writer profiles, methodologies
- `reference` — large external docs, project-specific data, things you link to but don't replicate
- `log` — timestamped events (releases, recruiter calls, decision records, ADRs)
- `template` — reusable prompt or document structures

**Choosing `status`:**
- `active` — this is the canonical, current version
- `lineage` — an older or alternate version, preserved for history
- `archived` — pre-2023 or superseded content

---

## Reference Stub Structure

Use this template for large or inaccessible documents:

```markdown
---
[frontmatter]
---

# [Document Title]

## Summary
One-paragraph description. Include: what it is, why it matters, current status/milestone.

→ **[Open in [Source]](source-url)**

## Key Metadata

| Field | Value |
|-------|-------|
| Last Modified | YYYY-MM-DD |
| Size | ~X KB / MB |
| Status | e.g. 2nd draft 33% complete |
| [Other relevant fields] | ... |

## Key Data Points
- Bullet-form high-signal facts extracted from search metadata or document header
- Enough context that a future agent can understand what's here without fetching it

## Lineage

| Version | Source | Status | Notes |
|---------|--------|--------|-------|
| [This doc] | google-drive | active | Current canonical version |
| [Older draft] | notion | lineage | Superseded |

## Links
- [[related/vault/note]]

## Tags
#tag1 #tag2
```

---

## Full Ingest Structure

Use this for short, high-signal documents (under ~300KB, fetchable, non-manuscript):

```markdown
---
[frontmatter]
---

# [Document Title]

## [Section from source]
[Actual content — preserve structure, convert to Markdown]

## [Next Section]
...

## Links
- [[related/vault/note]]

## Tags
#tag1 #tag2
```

Keep the content faithful to the source. Don't summarize aggressively — if the user sent it to
themselves or created it in Notion, they want the substance, not a synopsis.

---

## Distilled Knowledge Node Structure (Repo / Session Outputs)

Use this for engineering docs, session outputs, ADRs, and roadmap content from repos:

```markdown
---
type: <knowledge | reference | log>
domain: <engineering | game-design | ...>
source: repo
source-url: <GitHub link to the source doc>
status: active
authoritative-source: repo
tags: [project/<name>, type/<type>, status/active]
created: YYYY-MM-DD
---

# [Topic]

→ **[Full doc in repo](source-url)**

## [Key insight / Decision / Summary]
Compressed, high-signal content only. Include: what was decided, why, key formulas/schemas,
open questions. Omit: full spec text, exhaustive option lists, setup instructions.

## Links
- [[projects/<project>/_index]]
- [[related/vault/node]]

## Tags
#project/<name> #type/<type> #domain/<domain>
```

---

## Source-Specific Notes

### Repo / Session Outputs
- Source type: `repo` in frontmatter
- Always distill — never copy full doc content (Rule 5)
- Node targets are defined in `systems/_ingestion.md` per project
- Update triggers: new docs created, decisions made, phases completed, open questions resolved
- ADRs → `type: log` nodes in `projects/<project>/decisions/`
- Planning/design/roadmap → distilled `knowledge` or `reference` nodes
- After ingestion, check `projects/<project>/planning.md` — mark any resolved open questions

### Notion
- Use `mcp__notion-*` tools to fetch page content
- Pages with `last_edited_time` before 2023-04-01 → skip (Rule 4)
- Pages mentioning DCM/Project_10:14/Created to Create → skip (Rule 2)
- Notion databases (task boards, project trackers) → reference stub with Notion URL only, not full rows
- Working names vs canonical names: if a Notion draft uses a working name (e.g. "FaithSpark Studios")
  but the canonical name is different, use the canonical name in the vault note and add a comment

### Google Drive
- Use `mcp__google_drive_*` tools to search and fetch
- Files > 500KB will likely time out on fetch — fall back to reference stub immediately
- Drive is authoritative over Notion for active manuscripts (`TK1-MS1`, rulebooks, etc.)
- If a file can't be fetched, extract what you can from the search result metadata
  (file name, last modified, owner, size estimate from snippet)

### Gmail
- Use `mcp__gmail_*` tools — note that Gmail MCP is typically READ-ONLY
- Only ingest YELLOW_STAR / self-sent reference artifacts (the user's own docs)
- Attachments may not be downloadable — if so, write a reference stub with attachment filenames
  and sizes extracted from the message body/metadata
- Transactional emails (receipts, notifications) → never ingest
- DCM threads → never ingest
- Career/recruiter threads → log entry only (dates, company, status, Gmail deep link)
- Dev events (npm publish, deploys) → log entry only

---

## Wikilinks

Use `[[path/from/vault/root/note-name]]` for all cross-references. Never use bare filenames.
Link to related vault nodes at the bottom of every note under a `## Links` section.

---

## After Each Node is Written

1. Mark the corresponding row in the ingestion plan / checklist as `✅ Ingested`
2. Update the `status` field in the plan table from "Pending" to "✅ Ingested" and add the
   actual vault path if it wasn't already specified
3. If you're at the end of a source's section, update any "Phase X complete" checklist entry

---

## Finishing Up

After all nodes for a given ingestion run are written:
1. Do a quick scan — did you miss any `Pending` rows in the plan?
2. Report a summary: source processed, nodes written, nodes skipped (with reasons)
3. Call out any items that need manual follow-up (e.g. Gmail label cleanup, Notion archive moves)
   — these are things Claude can't do via MCP but the user should do manually

---

## Eval Workflow (for improving this skill)

Test cases are in `evals/evals.json`. The HTML viewer template and generator script are bundled
so you never need to regenerate them from scratch.

### Running evals

For each test case in `evals/evals.json`, spawn a with-skill and without-skill subagent in the
same turn. Save outputs to a workspace like `vault-ingestion-workspace/iteration-N/<eval-name>/`.

### Generating the review viewer

```bash
python <skill-path>/scripts/generate_review.py \
  <workspace>/iteration-N \
  --skill-name "vault-ingestion" \
  --benchmark <workspace>/iteration-N/benchmark.json \
  --static <output-path>/eval-review.html
```

The script reads eval output directories, injects data into `assets/eval-review-template.html`
(via the `/*__EMBEDDED_DATA__*/` placeholder), and writes a self-contained HTML file. No server
needed — open directly in a browser.

### Template structure

`assets/eval-review-template.html` — static HTML/CSS/JS with one injection point:
```
/*__EMBEDDED_DATA__*/
```
The script replaces this comment with `const EMBEDDED_DATA = {...};` containing all run outputs,
grading results, benchmark data, and feedback state.

`scripts/generate_review.py` — reads the workspace, collects outputs + grading + benchmark,
substitutes into the template, writes the static HTML. Accepts:
- `--static <path>` — write file instead of starting a server (use in Cowork)
- `--benchmark <path>` — path to benchmark.json to include the Benchmark tab
- `--previous-workspace <path>` — show diffs vs previous iteration
