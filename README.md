# Paper Clipper

Clip arXiv papers into Obsidian as structured paper notes.

Paper Clipper is a browser extension for turning paper pages into Obsidian notes that can be used as rows in an Obsidian paper database. It focuses on metadata, stable links, and agent-friendly reading entry points rather than heavy local file management.

## Goal

- Create one Markdown note per paper.
- Use Obsidian Properties / Bases / Dataview as the paper database entry.
- Prioritize HTML paper links for later reading by Codex, Claude Code, or similar coding agents.
- Keep the MVP as a pure browser extension with no local service.

## MVP Scope

- Support arXiv abstract pages.
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
- arXiv abstract-page parser.
- Popup preview and clip action.
- Obsidian options for vault, target folder, and default status.
- Markdown generation with Obsidian Properties.
- `html_url` priority: official arXiv HTML, then ar5iv.
- Stable note path: `{targetFolder}/{arxiv_id}.md`.

## Manual Check

1. Open `chrome://extensions`.
2. Enable developer mode.
3. Load this folder as an unpacked extension.
4. Open the extension options and set the Obsidian vault name.
5. Open an arXiv abstract page and click Paper Clipper.
