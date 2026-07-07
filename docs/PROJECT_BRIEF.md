# Project Brief

## Background

This project is split out from Notionary. Notionary already implements an arXiv-to-Notion browser extension flow, but the new priority is different:

- Obsidian is the primary destination.
- The browser extension is the primary interaction surface.
- The paper database in Obsidian is the primary entry point for later reading.
- Raw paper assets are less important than structured metadata and stable reading links.

Because of this, Paper Clipper should start as a clean project instead of deeply merging Obsidian support into Notionary.

## User Workflow

1. Open an arXiv paper page, such as `https://arxiv.org/abs/2505.xxxxx`.
2. Click the Paper Clipper browser extension.
3. The extension parses the paper metadata.
4. The extension generates a Markdown note with Obsidian Properties.
5. The extension opens Obsidian and creates or opens the note in the configured vault/folder.
6. The user later enters from Obsidian Bases / Dataview / Properties and reads the paper with Codex, Claude Code, or similar tools.

## Core Product Requirement

The note is a database row first and a reading workspace second.

The Obsidian database view should expose the information needed to decide what to read and how to fetch it:

- title
- authors
- status
- publish date
- arXiv ID
- HTML paper link
- PDF paper link
- source page link
- code link

## Important Interpretation

When the user says "record the paper HTML link in properties", it means the Markdown note should include a frontmatter / Obsidian Properties field such as:

- `html_url: "https://arxiv.org/html/2505.xxxxx"`

or, if official arXiv HTML is unavailable:

- `html_url: "https://ar5iv.labs.arxiv.org/html/2505.xxxxx"`

This field should be visible as a database column in Obsidian Bases / Dataview and usable by agents as a direct reading target.

## Priorities

1. Obsidian support.
2. Browser extension workflow.
3. Structured paper note generation.
4. HTML link first.
5. PDF URL fallback.
6. Simple, deterministic file naming.

## Open Questions

- Whether to use official arXiv HTML only when detected on the page, or always generate an ar5iv fallback.
- Whether repeated saves should open the same target note without overwriting existing user notes.
- Whether `obsidian://new` with `content` is stable enough, or whether clipboard fallback is required from the first version.
