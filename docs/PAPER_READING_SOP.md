# Paper Reading SOP

Paper Clipper owns the full workflow from browser clipping to agent-ready Obsidian paper notes.

## Scope

1. Browser extension clips paper metadata into an Obsidian note.
2. Codex skill ingests HTML/PDF resources into a stable asset folder.
3. The user's vault-level reading preferences decide how the paper is interpreted and written up.

## Note contract

The generated Obsidian paper note should include these frontmatter fields when available:

- `arxiv_id`
- `url`
- `html_url`
- `pdf_url`
- `code_url`
- `title`
- `short_title`
- `authors`
- `publish_date`
- `paper_status`
- `category`
- `abstract`

The Codex skill uses `html_url`, `pdf_url`, and `arxiv_id` as its primary inputs.

## Asset contract

For arXiv papers, derived assets are stored under:

`Papers/arXiv/assets/{arxiv_id}/`

Standard files:

- `_source.html` — cached HTML paper page.
- `_source.pdf` — cached PDF, used as high-fidelity source for table screenshots.
- `_manifest.md` — human-readable resource manifest.
- `_manifest.json` — machine-readable resource manifest.
- `fig{NN}-{slug}.{ext}` — figures from HTML.
- `table{NN}-{slug}.png` — table screenshots cropped from PDF.

Use standard Markdown relative paths when embedding assets in a note:

- `![overview](assets/2410.22461/fig01-overview.png)`

Do not use vault-absolute wikilinks as the automation default.

## Table policy

- Do not reconstruct complex paper tables as Markdown by default.
- Use PDF-cropped table screenshots for faithful Obsidian rendering.
- In notes, embed important table screenshots and summarize key conclusions in bullets.

## Skill improvement policy

If ingestion fails or table screenshots are poor, improve `skills/paper-html-ingest` and rerun ingestion. Prefer reusable SOP fixes over one-off manual workarounds.

Known failure modes to improve over time:

- multi-page tables
- captions below tables
- single-column tables in two-column PDFs
- table/figure regions too close together
- PDF text extraction fails to detect `Table N`
- non-arXiv source conventions
