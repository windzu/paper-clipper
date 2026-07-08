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

MVP defaults:

- `targetFolder`: `Papers/arXiv`
- `defaultStatus`: `To Read`

## File Naming

Use deterministic paths:

- folder: user configured, such as `Papers/arXiv`
- filename: `{paperId}.md`
- example: `Papers/arXiv/2505.12345.md`

This avoids title sanitization issues and gives repeat saves the same target path.
For old arXiv IDs containing `/`, replace `/` with `_` in the filename while keeping the original `arxiv_id` in frontmatter.

## Markdown Schema

Recommended frontmatter fields:

- `title`
- `short_title`
- `authors`
- `arxiv_id`
- `url`
- `html_url`
- `pdf_url`
- `code_url`
- `publish_date`
- `status`
- `category`
- `abstract`

Recommended body sections:

- Links
- Abstract
- Notes
- Method
- Experiments
- Ideas

The Links section should duplicate the most important URLs in normal Markdown body text so both Obsidian users and agents can see them without parsing YAML only.

`authors` should be written as a YAML list, not a single comma-separated string.

## HTML And PDF Strategy

HTML is preferred because later reading will often be done by Codex, Claude Code, or similar agents.

Priority:

1. Official arXiv HTML URL if available.
2. ar5iv fallback URL.
3. PDF URL.

### Duplicate Import Rule

- 去重主键为 `arxiv_id`。
- 同一论文若已导入，后台返回 `DUPLICATE` 并附带现存记录，不再重复触发 `obsidian://new`。
- 目的是避免重复文件与重复行，保持数据库条目唯一性。
- 弹窗层提供「Open imported note」动作，可直接打开历史文件。

### html_url Rule

- 解析器只负责给出候选列表（官方 arXiv HTML、ar5iv）。
- `obsidian-client` 在 `buildClipTarget` 时逐个探测可达性（`HEAD` -> `GET` 回退）。
- 只写可达的第一个候选为 `html_url`。
- 失败则 `html_url` 置空。
- 不再单独写 `html_url_verified`，避免冗余字段污染数据库。

## Paper Database Strategy

- 数据库入口为 Vault 根目录 `/PaperClipper.base`。
- 仓库模板为 `templates/PaperClipper.base`。
- Options 页面提供显式创建按钮，通过 `obsidian://new` 创建根目录 `PaperClipper.base`。
- 默认纳管 `Papers/arXiv` 下的 Markdown note。
- Base 默认视图只展示人读论文时需要扫描和筛选的字段：
  - `short_title`
  - `file.name`（打开 note 的入口）
  - `title`
  - `status`
  - `category`
  - `publish_date`
  - `abstract`
- `authors`、`url`、`html_url`、`pdf_url`、`code_url` 保留在 note frontmatter 中，但默认不展示在数据库主视图。

## Paper Image Assets

Paper Clipper 首次导入不自动下载论文图片。图片资产由后续阅读流程触发，例如 Codex / Claude Code 根据 `html_url` 阅读原文后提取关键图片。

Recommended layout:

- note: `Papers/arXiv/{arxiv_id}.md`
- images: `Papers/arXiv/assets/{arxiv_id}/`

Recommended names:

- `fig01-overview.png`
- `fig02-method.png`
- `fig03-architecture.png`
- `fig04-results.png`

Only save images that are actually used by the reading note, such as overview figures, architecture figures, key experiment results, and important qualitative examples.

Use standard Markdown relative paths when inserting images into notes:

- `![overview](assets/{arxiv_id}/fig01-overview.png)`

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

MVP implementation starts with the primary route only. Clipboard fallback should be added after manual testing proves that URI length or existing-file behavior is a real issue.

## MVP Acceptance

- On an arXiv abstract page, clicking the extension opens Obsidian.
- A Markdown note is created in the configured vault/folder.
- The file path is stable and based on arXiv ID.
- Obsidian Properties include `html_url` and `pdf_url`.
- Body includes abstract and reading note sections.
- Non-arXiv pages show unsupported state.
- No local service is required.
