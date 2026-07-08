# 论文数据库设计草稿

## 目标

Paper Clipper 导入的论文需要进入一个 Obsidian 统一数据库入口。这个数据库用于人快速浏览、筛选、分类和管理阅读状态，不是为了展示完整导入日志或系统调试字段。

数据库入口：

- 文件名：`PaperClipper.base`
- 位置：Vault 根目录，即 `/PaperClipper.base`
- 模板：`templates/PaperClipper.base`
- 创建方式：Options 页面显式点击 `Create PaperClipper Base`
- 管理范围：默认纳管 `Papers/arXiv` 下的论文 note

## 设计原则

- 数据库视图优先服务「人看」：状态、分类、标题、发布日期、摘要。
- 链接和作者等元信息可以写入 note，但默认不占用数据库主视图。
- 不保留低价值系统字段，避免长期污染 Properties 和 Base 视图。
- 每篇论文以 `arxiv_id` 作为唯一标识，重复导入时提示已存在。
- 插件不静默自动创建数据库入口，必须由用户在 Options 页面显式触发。

## 数据库默认展示字段

默认视图只展示真正用于筛选和阅读决策的字段：

- `short_title`：短标题，便于快速识别论文。
- `file.name`：Obsidian Base 的页面打开入口，不作为论文信息字段理解。
- `title`：完整标题。
- `status`：阅读状态，取值为 `To Read` / `In progress` / `Done`。
- `category`：研究方向，例如 `End2End`、`BEV`、`Occupancy`。
- `publish_date`：论文发布时间。
- `abstract`：摘要，用于快速判断是否值得读。

## Note 保留字段

这些字段写入 note frontmatter，但默认不在数据库主视图展示：

- `arxiv_id`：唯一键。
- `authors`：作者列表，需要时进 note 查看。
- `url`：arXiv abstract/source 页面。
- `html_url`：HTML 阅读入口，供 Codex / Claude Code 等工具读取原文。
- `pdf_url`：PDF 链接。
- `code_url`：论文代码链接。

## 明确不需要的字段

以下字段不进入设计目标，后续实现应从生成 schema 中移除：

- `task`：论文未必绑定具体任务，维护成本高。
- `html_url_verified`：若只在探测成功后写入 `html_url`，该字段冗余。
- `created`：导入时间不是论文管理核心信息。
- `abs_url`：与 `url` 重复，固定让 `url` 表示 arXiv abstract/source 页面即可。
- `imported_at`
- `html_probe_error`

## Base 视图草案

仓库中提供了可复用模板：`templates/PaperClipper.base`。该模板应放到 Obsidian Vault 根目录，并命名为 `PaperClipper.base`。

### 全部

- 筛选：`file.folder == "Papers/arXiv"`
- 字段：`short_title`, `file.name`, `title`, `status`, `category`, `publish_date`, `abstract`
- 排序：`publish_date` 降序

### To Read

- 筛选：`status == "To Read"`
- 字段：`short_title`, `file.name`, `title`, `category`, `publish_date`, `abstract`
- 排序：`publish_date` 降序

### In progress

- 筛选：`status == "In progress"`
- 字段：`short_title`, `file.name`, `title`, `category`, `publish_date`, `abstract`

### Done

- 筛选：`status == "Done"`
- 字段：`short_title`, `file.name`, `title`, `category`, `publish_date`, `abstract`
- 排序：`publish_date` 降序

### Category 视图

按常用方向建立视图，例如：

- `End2End`
- `BEV`
- `Occupancy`

筛选规则为 `category` 包含对应方向。

## 论文图片资产设计

### 背景

导入论文后，后续可能通过 Codex / Claude Code 根据 `html_url` 阅读原文，并从 HTML 页面中提取论文中的关键图片插入到 note 中。

因此需要设计图片存储位置和命名规则，避免图片散落、重名或难以追溯来源。

### 存储位置

推荐把每篇论文的图片放在该论文 note 同目录下的附件子目录：

- 论文 note：`Papers/arXiv/2410.22461.md`
- 图片目录：`Papers/arXiv/assets/2410.22461/`

理由：

- 所有 arXiv 论文资产都在 `Papers/arXiv` 管理范围内。
- 图片按 `arxiv_id` 隔离，避免不同论文图片重名。
- note 与图片路径稳定，适合长期迁移和 Git 管理。
- 数据库视图不被附件目录污染，因为 `.base` 只纳管 Markdown note。

### 图片命名

推荐命名：

- `fig01-overview.png`
- `fig02-method.png`
- `fig03-architecture.png`
- `fig04-results.png`

规则：

- 前缀使用论文中出现顺序：`fig01`, `fig02`, `fig03`。
- 后缀使用简短语义：`overview`, `method`, `architecture`, `results`。
- 文件扩展名优先保留原图格式；若需要统一，使用 `.png`。
- 不使用原网页的随机文件名或长 hash 作为最终文件名。

### Markdown 引用方式

在论文 note 中优先使用标准 Markdown 相对路径：

- `![overview](assets/2410.22461/fig01-overview.png)`

理由：

- Obsidian 可以正常渲染。
- Codex / Claude Code 等工具更容易解析和改写。
- 迁移到普通 Markdown 渲染器或发布系统时更稳定。

Obsidian wikilink 可作为手工笔记补充，但不作为自动化默认格式：

- `![[assets/2410.22461/fig01-overview.png]]`

### 图片选择原则

不是把论文中所有图片都下载下来。只保存阅读笔记中真正需要引用的图片：

- 方法总览图
- 网络结构图
- 关键实验结果图
- 重要对比表或定性结果

这件事更适合由后续阅读流程触发，而不是论文首次导入时自动完成。

## 验收

- 根目录 `/PaperClipper.base` 是论文数据库入口。
- 默认视图聚焦 `short_title`、`title`、`status`、`category`、`publish_date`、`abstract`，并保留 `file.name` 作为打开 note 的入口。
- `authors`、`url`、`html_url` 等链接/元信息写在 note 中，但不进入默认数据库主视图。
- 新增论文图片时，图片进入 `Papers/arXiv/assets/{arxiv_id}/`。
- note 中图片引用使用相对路径，移动 Vault 时不依赖绝对路径。
