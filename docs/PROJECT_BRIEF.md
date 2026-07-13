# Project Brief

## Background

This project is split out from Notionary. Notionary already implements an arXiv-to-Notion browser extension flow, but the new priority is different:

- Obsidian is the primary destination.
- The browser extension is the primary interaction surface.
- The paper database in Obsidian is the primary entry point for later reading.
- Raw paper assets are less important than structured metadata and stable reading links.

Because of this, Paper Clipper should start as a clean project instead of deeply merging Obsidian support into Notionary.

## User Workflow

1. Open an arXiv abstract or official HTML page, such as `https://arxiv.org/abs/2505.xxxxx` or `https://arxiv.org/html/2505.xxxxx`.
2. Click the Paper Clipper browser extension.
3. The extension parses the paper metadata.
4. The extension generates a Markdown note with Obsidian Properties.
5. The extension opens Obsidian and creates or opens the note in the configured vault/folder.
6. The user later enters from Obsidian Bases / Dataview / Properties and reads the paper with Codex, Claude Code, or similar tools.

## Core Product Requirement

The note is a database row first and a reading workspace second.

The Obsidian database view should expose the information needed to decide what to read:

- title
- short title
- status
- category
- publish date
- abstract

The note frontmatter should keep links and metadata for tools:

- arXiv ID
- authors
- HTML paper link
- PDF paper link
- source page link
- code link

## Important Interpretation

When the user says "record the paper HTML link in properties", it means the Markdown note should include a frontmatter / Obsidian Properties field such as:

- `html_url: "https://arxiv.org/html/2505.xxxxx"`

or, if official arXiv HTML is unavailable:

- `html_url: "https://ar5iv.labs.arxiv.org/html/2505.xxxxx"`

This field should be available in note frontmatter and usable by Codex, Claude Code, or similar agents as a direct reading target. It does not need to be shown in the default Base view.

## Priorities

1. Obsidian support.
2. Browser extension workflow.
3. Structured paper note generation.
4. Root-level Obsidian Base as the common paper entry.
5. HTML link first for agent reading.
6. Simple, deterministic file naming.

## Open Questions

- Repeated save is now blocked by arXiv ID to avoid duplicate imports.
- HTML priority is official arXiv HTML -> ar5iv. Only reachable HTML URL is written.
- `obsidian://new` remains the primary route. If URI length or overwrite behavior becomes an issue, evaluate clipboard fallback.
