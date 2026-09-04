# Chrome Web Store Listing

## Product details

Name: Paper Clipper

Summary:

> Clip arXiv papers into structured, database-ready Obsidian notes.

Category: Productivity

Language: English

Detailed description:

> Paper Clipper turns the arXiv page you are viewing into a structured Markdown note in Obsidian.
>
> Use it to build a lightweight, local-first paper database without running a server or uploading your reading history.
>
> Features:
>
> - Clip from official arXiv abstract and HTML pages.
> - Capture title, authors, abstract, arXiv ID, publication date, source URL, PDF URL, HTML URL, and code URL.
> - Prefer and verify official arXiv HTML, with ar5iv as a fallback.
> - Generate Obsidian Properties for Bases and Dataview.
> - Create a bundled PaperClipper Base view.
> - Prevent likely duplicate imports by versionless arXiv ID.
> - Keep processing local: no account, analytics, advertising, or developer-operated backend.
>
> Paper Clipper requires the Obsidian desktop application and a configured vault name. It does not require an Obsidian community plugin.

Homepage URL: https://github.com/windzu/paper-clipper

Support URL: https://github.com/windzu/paper-clipper/issues

Privacy policy URL: https://github.com/windzu/paper-clipper/blob/main/PRIVACY.md

## Simplified Chinese localization

Name: Paper Clipper

Summary:

> 将 arXiv 论文剪藏为结构化、可作为数据库记录的 Obsidian 笔记。

Detailed description:

> Paper Clipper 可将当前浏览的 arXiv 论文页面转换成 Obsidian 中的结构化 Markdown 笔记。
>
> 无需运行本地服务，也不会将你的阅读记录上传至开发者服务器，即可建立轻量、local-first 的论文数据库。
>
> 主要功能：
>
> - 支持官方 arXiv 摘要页和 HTML 页面。
> - 收集标题、作者、摘要、arXiv ID、发布日期、来源链接、PDF 链接、HTML 链接和代码链接。
> - 优先验证官方 arXiv HTML，并以 ar5iv 作为 fallback。
> - 生成适用于 Obsidian Bases 和 Dataview 的 Properties。
> - 创建内置的 PaperClipper Base 数据库视图。
> - 按不含版本号的 arXiv ID 检测重复导入。
> - 数据在本地处理：无需账号，不含分析、广告或开发者运营的后端。
>
> Paper Clipper 需要安装 Obsidian 桌面应用并配置 vault 名称，不要求安装 Obsidian 社区插件。

## Graphic assets

- Store icon: `icons/icon128.png` — 128×128 PNG, included in the extension ZIP.
- Screenshot 1: `store-assets/screenshot-01-clip.png` — 1280×800 PNG.
- Screenshot 2: `store-assets/screenshot-02-options.png` — 1280×800 PNG.
- Small promo tile: `store-assets/promo-small-440x280.png` — 440×280 PNG.
- Marquee promo tile: `store-assets/promo-marquee-1400x560.png` — 1400×560 PNG, optional.

The screenshots were captured from the unpacked release running against arXiv:1706.03762 in a clean browser profile. Screenshot 1 combines the live public arXiv page and live popup captures from the same test session; screenshot 2 is a direct capture of the live options page. Capture them again from the running release after visible UI changes. The promo images can be regenerated with `scripts/render_chrome_web_store_assets.sh` after branding changes.

## Single purpose

Clip public arXiv paper metadata and links into structured Markdown notes in the user's local Obsidian vault.

## Permission justifications

### `activeTab`

Paper Clipper accesses the active tab only after the user clicks the extension. This is required to identify and preview the arXiv paper currently being viewed.

### `scripting`

Paper Clipper injects its packaged parser into the active arXiv tab after the user invokes the extension. It does not download or execute remote code.

### `storage`

Paper Clipper stores the user's Obsidian vault configuration and a local import index used for duplicate detection.

### Host permissions

Access to `arxiv.org` and `ar5iv.labs.arxiv.org` is required to read public paper metadata and verify the best available HTML reading link. The extension does not request access to other websites.

## Remote code

No. All executable code is included in the extension package.

## Data-use disclosure

Paper Clipper processes the active arXiv page URL and public page content, including paper metadata, only after the user invokes the extension. It stores settings and duplicate-detection records in Chrome extension storage and sends generated note content only to the locally installed Obsidian application through the `obsidian://` protocol. It does not transmit this data to the developer or use it for advertising, analytics, credit decisions, or any unrelated purpose.

### Privacy practices selections

Select these handled data types:

- Web history — the active arXiv or ar5iv page URL, processed only after the user clicks the extension.
- Website content — public paper metadata parsed from that page.

Do not select the remaining data types. In particular, the extension does not collect authentication information, location, personal communications, financial information, health information, or behavioral telemetry. The Obsidian vault name, target folder, default status, import index, and optional folder handle are stored locally or in Chrome Sync as described in the privacy policy; they are never received by the developer.

Certify every Limited Use statement in the dashboard. The extension uses data only for its disclosed single purpose, does not sell or transfer it for unrelated purposes, does not use it for advertising or credit decisions, and does not make it available for human review.

## Reviewer test instructions

1. Install Obsidian Desktop and create a test vault, or use an existing test vault.
2. Open the Paper Clipper extension options and enter the exact vault name.
3. Open <https://arxiv.org/abs/1706.03762> in Chrome.
4. Click the Paper Clipper toolbar icon.
5. Confirm that the popup previews the paper title, authors, arXiv ID, and selected HTML source.
6. Click the clip action and allow Chrome to open Obsidian.
7. Confirm that Obsidian creates `Papers/arXiv/1706.03762.md` with structured Properties and paper links.
8. Invoke the extension again on the same paper and confirm that it reports the paper as already imported.
9. In the extension options, click `Create PaperClipper Base`, allow Chrome to open Obsidian, and confirm that `PaperClipper.base` is created.

The popup preview and metadata parsing can be inspected without Obsidian. Obsidian is required only for the final local note-creation step.
