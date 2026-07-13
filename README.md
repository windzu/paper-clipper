# Paper Clipper

Clip arXiv papers into Obsidian as structured paper notes.

Paper Clipper is a browser extension for turning paper pages into Obsidian notes that can be used as rows in an Obsidian paper database. It focuses on metadata, stable links, and agent-friendly reading entry points rather than heavy local file management.

## Goal

- Create one Markdown note per paper.
- Use Obsidian Properties / Bases / Dataview as the paper database entry.
- Prioritize HTML paper links for later reading by Codex, Claude Code, or similar coding agents.
- Keep the MVP as a pure browser extension with no local service.

## MVP Scope

- Support official arXiv abstract and HTML pages.
- Extract paper title, authors, abstract, arXiv ID, publish date, source URL, PDF URL, HTML URL, and code URL.
- Generate a structured Obsidian note.
- Open Obsidian through `obsidian://new`.
- Configure target vault and folder.
- Use stable file paths based on arXiv ID.

## Non-Goals For MVP

- No localhost service.
- No Obsidian plugin.
- No full vault scanning.
- No reliable binary attachment writing.
- No PDF download unless URI-only paper links are insufficient for the workflow.
- No figure extraction.

## Current Implementation

- Chrome Manifest V3 extension scaffold.
- arXiv abstract- and HTML-page parser.
- Popup preview and clip action.
- Obsidian options for vault, target folder, and default paper status.
- Markdown generation with Obsidian Properties.
- `html_url` priority: official arXiv HTML, then ar5iv.
- Duplicate prevention: same `arxiv_id` will not be imported twice.
- `html_url` is validated before writing; if no HTML page is reachable, it remains empty.
- Duplicate UX: when paper already exists, popup shows `Already imported` with an `Open imported note` action.
- Options page can create the root-level `PaperClipper.base` from the bundled template.
- Stable note path: `{targetFolder}/{arxiv_id}.md`.
- URL normalization: `/abs/`, `/html/`, and versioned URLs share the same versionless `arxiv_id` and duplicate record.

## Design-first updates in this iteration

- 重复导入保护：以 `arxiv_id` 为主键判断是否已存在，已导入则直接提示，不再重复生成文件。
- 数据库设计收敛：默认 Base 只展示阅读管理字段，包括 `short_title`、`title`、`paper_status`、`category`、`publish_date`、`abstract`。
- HTML 链接真实性：`html_url` 不再无脑写入候选页；会按优先级对候选地址进行可达性探测，仅可达的才写入 frontmatter。

### Property adequacy assessment

当前数据库默认展示字段：

- `short_title`
- `title`
- `paper_status`
- `category`
- `publish_date`
- `abstract`

以下字段保留在 note 中，但不作为默认数据库列：

- `arxiv_id`
- `authors`
- `url`
- `html_url`
- `pdf_url`
- `code_url`


## Codex Skill

Paper Clipper includes a Codex skill for the agent-side ingestion step:

```text
skills/paper-html-ingest/
```

The skill reads clipped paper notes, caches the paper HTML/PDF, downloads figures, crops PDF table screenshots, and writes a manifest under `Papers/arXiv/assets/{arxiv_id}/`. See [docs/PAPER_READING_SOP.md](docs/PAPER_READING_SOP.md).

### Stable install

In Codex, ask:

> Install the skill from `https://github.com/windzu/paper-clipper/tree/main/skills/paper-html-ingest`

Then restart Codex to pick up the new skill.

### Development install

For local development, clone this repository and symlink the skill instead of reinstalling after every change:

```bash
scripts/link_codex_skill.sh
```

By default this links to `${CODEX_HOME:-~/.codex}/skills/paper-html-ingest`. You can pass a custom skills directory as the first argument.

If you change `SKILL.md` metadata, restart Codex. Script changes are picked up the next time the skill runs.

## Manual Check

1. Open `chrome://extensions`.
2. Enable developer mode.
3. Load this folder as an unpacked extension.
4. Open the extension options and set the Obsidian vault name.
5. Click `Create PaperClipper Base` in options if `/PaperClipper.base` does not exist.
6. Open an arXiv abstract or official HTML page and click Paper Clipper.

For database-first usage and base schema, see [docs/PAPER_DATABASE_DESIGN_DRAFT.md](/Users/wind/Projects/paper-clipper/docs/PAPER_DATABASE_DESIGN_DRAFT.md). Base template: [templates/PaperClipper.base](/Users/wind/Projects/paper-clipper/templates/PaperClipper.base).
