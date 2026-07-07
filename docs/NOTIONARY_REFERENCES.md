# Notionary References

Paper Clipper is a new project, but these Notionary files are useful references.

## Strongly Reusable

- `/Users/wind/Projects/Notionary/parsers/arxiv.js`

What to reuse:

- arXiv page detection by URL.
- paper ID extraction.
- title extraction.
- short title extraction.
- authors extraction.
- abstract extraction.
- publish date parsing.
- PDF URL construction.
- official HTML URL extraction.
- ar5iv fallback URL generation.
- GitHub / GitLab code URL extraction from abstract links.

## Useful Patterns

- `/Users/wind/Projects/Notionary/popup/popup.js`

Useful ideas:

- popup state machine.
- current tab querying.
- content script injection through `chrome.scripting.executeScript`.
- unsupported-page handling.

- `/Users/wind/Projects/Notionary/options/options.js`

Useful ideas:

- storing config through `chrome.storage.sync`.
- simple validation and feedback messages.

- `/Users/wind/Projects/Notionary/background/task-manager.js`

Useful ideas:

- persistent task state.
- popup lifecycle decoupling.

For Paper Clipper MVP, the full task queue may be unnecessary because opening an Obsidian URI should be fast. Keep it in mind only if clipping becomes multi-step or clipboard fallback needs status tracking.

## Not To Carry Over

- Notion API client.
- Notion database schema mapping.
- Notion PDF upload logic.
- Notion figure extraction and upload path.
- Notion deduplication by querying a database.

These solve problems that Paper Clipper intentionally avoids in the MVP.
