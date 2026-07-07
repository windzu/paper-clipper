# Technical Route

## Architecture

MVP flow:

`arXiv page -> content parser -> Markdown builder -> Obsidian URI -> Obsidian vault`

The extension should stay browser-only:

- Chrome Manifest V3 extension.
- No localhost service.
- No local Node/Python daemon.
- No Obsidian plugin for MVP.

## Main Modules

Suggested structure:

- `manifest.json`
- `popup/`
- `options/`
- `background/`
- `parsers/`

Suggested core files:

- `parsers/arxiv.js`: extract paper metadata from arXiv pages.
- `background/obsidian-client.js`: build file path, Markdown, and Obsidian URI.
- `background/service-worker.js`: handle extension messages and open Obsidian.
- `options/options.js`: store vault, folder, and default status.
- `popup/popup.js`: detect supported page, preview paper, trigger clipping.

## Obsidian Config

Minimum settings:

- `vaultName`: Obsidian vault name, not filesystem path.
- `targetFolder`: folder inside vault, for example `Papers/arXiv`.
- `defaultStatus`: default reading state, for example `To Read`.

## File Naming

Use deterministic paths:

- folder: user configured, such as `Papers/arXiv`
- filename: `{paperId}.md`
- example: `Papers/arXiv/2505.12345.md`

This avoids title sanitization issues and gives repeat saves the same target path.

## Markdown Schema

Recommended frontmatter fields:

- `title`
- `short_title`
- `authors`
- `source`
- `arxiv_id`
- `url`
- `html_url`
- `pdf_url`
- `code_url`
- `publish_date`
- `status`
- `type`
- `created`

Recommended body sections:

- Links
- Abstract
- Notes
- Method
- Experiments
- Ideas

The Links section should duplicate the most important URLs in normal Markdown body text so both Obsidian users and agents can see them without parsing YAML only.

## HTML And PDF Strategy

HTML is preferred because later reading will often be done by Codex, Claude Code, or similar agents.

Priority:

1. Official arXiv HTML URL if available.
2. ar5iv fallback URL.
3. PDF URL.

PDF files should not be downloaded in the MVP unless the link-only workflow proves insufficient. Obsidian URI is not a reliable binary attachment transport, and automatic attachment writing would likely require an Obsidian plugin, local service, or explicit browser download workflow.

## Obsidian URI Strategy

Primary route:

- Use `obsidian://new`.
- Pass `vault`.
- Pass `file`.
- Pass generated note content.

Risk:

- Long content may exceed practical URI limits.
- Existing-file behavior needs manual verification.

Fallback route:

- Put full Markdown content into clipboard.
- Use Obsidian URI to open/create the target file.
- Keep implementation compatible with Obsidian Web Clipper style behavior.

## MVP Acceptance

- On an arXiv abstract page, clicking the extension opens Obsidian.
- A Markdown note is created in the configured vault/folder.
- The file path is stable and based on arXiv ID.
- Obsidian Properties include `html_url` and `pdf_url`.
- Body includes abstract and reading note sections.
- Non-arXiv pages show unsupported state.
- No local service is required.
