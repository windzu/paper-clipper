---
name: paper-html-ingest
description: Use when a paper note has frontmatter html_url, especially arXiv HTML, and the task needs reading the HTML page, extracting figures/tables/captions, downloading paper images, or standardizing local paper assets under Papers/arXiv/assets/{arxiv_id}/.
---

# Paper HTML Ingest

## Purpose

Handle the mechanical ingestion layer for paper notes whose primary source is `html_url`, not a local PDF attachment.

Use this skill before deep paper analysis when:

- The current note has `html_url` in frontmatter.
- The user asks to read an imported paper without local attachments.
- The task needs figures, captions, tables, or local paper assets from arXiv HTML.

This skill does not decide the paper's research value. It only prepares reliable source material and local assets for the paper-reading workflow.

## Source priority

1. Use `html_url` as the primary source for section structure, text, figures, and captions.
2. Use `pdf_url` as the standard high-fidelity source for table screenshots; do not ask per paper whether to download it when `pdf_url` exists.
3. Do not assume a local PDF exists unless the note explicitly has an attachment or the user uploads one.

## Asset location

For arXiv notes, save downloaded resources under:

`Papers/arXiv/assets/{arxiv_id}/`

Example note and asset paths:

`Papers/arXiv/2410.22461.md`

`Papers/arXiv/assets/2410.22461/fig03-architecture.png`

Use standard Markdown embeds relative to the paper note:

`![overview](assets/2410.22461/fig01-overview.png)`

## Naming rules

- Figure with caption number: `fig{NN}-{slug}.{ext}`
- Multiple images under one figure: `fig{NN}-{slug}-{a|b|c}.{ext}`
- No figure number: `img{NN}-{slug}.{ext}`
- Table screenshot: `table{NN}-{slug}.png`
- Manifest: `_manifest.json` and `_manifest.md`
- Source HTML snapshot: `_source.html`
- Source PDF cache: `_source.pdf`

## Default download policy

Default to caching all actual paper figures found in arXiv HTML and, when `pdf_url` exists, caching `_source.pdf` and generating table screenshots from the PDF. The reading note should embed only figures/tables that support the analysis. Ignore:

- base64 mascot images
- images outside figure contexts unless clearly paper content
- duplicate src URLs

If the paper has unusually many or huge appendix images, summarize first and ask before downloading all.

## Workflow

1. Read the paper note frontmatter and get `arxiv_id`, `html_url`, and optionally `pdf_url`.
2. Run the bundled script from the vault root. If installed through `scripts/link_codex_skill.sh`, the script is available under `$CODEX_HOME/skills/paper-html-ingest/`:

`python3 "$CODEX_HOME/skills/paper-html-ingest/scripts/ingest_arxiv_html.py" "Papers/arXiv/<note>.md"`

If `CODEX_HOME` is unset, use `~/.codex/skills/paper-html-ingest/scripts/ingest_arxiv_html.py`.

3. Inspect the script summary:
   - sections found
   - figures downloaded
   - PDF cached
   - table screenshots generated
   - warnings
   - manifest path
4. Use `_manifest.md` for quick caption review and Obsidian embed paths.
5. When writing the paper note, embed only figures/tables that help the argument; do not blindly insert every downloaded resource. For important experiment tables, prefer table screenshots over Markdown table reconstruction.

## Known issues and improvement policy

Known table screenshot failure modes:

- Table spans multiple pages.
- Caption is below the table instead of above it.
- Single-column table in a two-column PDF is cropped too wide.
- Table and figure are too close, causing over-cropping.
- PDF text extraction fails to detect `Table N`.
- Non-arXiv sources use different URL/path conventions.

When these issues appear, prefer improving this skill/script and rerunning ingestion so the fix becomes reusable SOP. Avoid one-off manual workarounds unless the user explicitly asks for a quick local fix.

Use PDF正文局部校验 only when:

- HTML formula text contains duplicated MathML / LaTeX noise.
- Formula must be accurately restated or derived.
- Appendix content seems omitted or structurally confusing.
- Quantitative metrics are central and table screenshot is insufficient.
