# AGENTS.md instructions for Paper Clipper

## 项目定位

Paper Clipper 是一个浏览器插件，用于把 arXiv 论文页面剪藏为 Obsidian 中的结构化 Markdown note。

核心目标不是下载和管理论文原始文件，而是创建一条可以作为 Obsidian 数据库入口的论文记录。

## 当前最高优先级

1. Obsidian 接入优先。
2. 浏览器插件流程优先。
3. arXiv 页面优先。
4. HTML 页面链接优先。
5. PDF 只作为 fallback 链接，MVP 不强求下载为附件。

## 关键需求解释

「在属性里记录论文的 HTML 链接」指的是：

- 在 Markdown frontmatter / Obsidian Properties 中写入 `html_url` 字段。
- 该字段应能在 Obsidian Bases / Dataview / Properties 数据库视图中作为列展示。
- 后续 Codex、Claude Code 等工具可以从该字段直接读取 HTML 页面并解析论文。

优先链接：

1. 官方 arXiv HTML 页面。
2. ar5iv HTML 页面。
3. arXiv PDF 页面。

## MVP 不做

- 不接 Notion。
- 不引入本地 service。
- 不实现 Obsidian 插件。
- 不扫描 vault 做复杂去重。
- 不做 PDF/Figure 附件管理。
- 不覆盖用户已有阅读笔记。

## 可参考旧项目

旧项目路径：

- `/Users/wind/Projects/Notionary`

最重要参考：

- `/Users/wind/Projects/Notionary/parsers/arxiv.js`

可参考但不要照搬 Notion 逻辑：

- `/Users/wind/Projects/Notionary/popup/popup.js`
- `/Users/wind/Projects/Notionary/options/options.js`
- `/Users/wind/Projects/Notionary/background/task-manager.js`

不要迁移：

- Notion API client。
- Notion database 字段映射。
- Notion PDF/Figure 上传链路。

## 沟通偏好

- 中文为主，保留必要英文术语。
- 直接指出问题，不做过度夸奖。
- 方案先收敛目标和边界，再进入实现。
