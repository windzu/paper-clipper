(function () {
  "use strict";

  const DEFAULT_CONFIG = {
    vaultName: "",
    targetFolder: "Papers/arXiv",
    defaultStatus: "To Read"
  };

  function normalizeFolder(folder) {
    return (folder || "")
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/{2,}/g, "/");
  }

  function sanitizeFileStem(stem) {
    const decoded = (() => {
      try {
        return decodeURIComponent(stem || "");
      } catch (error) {
        return stem || "";
      }
    })();

    return decoded
      .replace(/[\\/:*?"<>|%#\+]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "paper";
  }

  function buildFilePath(config, paper) {
    const folder = normalizeFolder(config.targetFolder);
    const filename = `${sanitizeFileStem(paper.arxivId)}.md`;
    return folder ? `${folder}/${filename}` : filename;
  }

  function yamlScalar(value) {
    const text = String(value || "");
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  function yamlList(values) {
    if (!Array.isArray(values) || values.length === 0) return "[]";
    return values.map((value) => `  - ${yamlScalar(value)}`).join("\n");
  }

  function line(label, url) {
    return url ? `- ${label}: ${url}` : "";
  }

  function compactLines(lines) {
    return lines.filter((item) => item !== "").join("\n");
  }

  function buildMarkdown(config, paper, now = new Date()) {
    const created = now.toISOString().slice(0, 10);
    const status = config.defaultStatus || DEFAULT_CONFIG.defaultStatus;

    return [
      "---",
      `title: ${yamlScalar(paper.title)}`,
      `short_title: ${yamlScalar(paper.shortTitle)}`,
      Array.isArray(paper.authors) && paper.authors.length > 0
        ? `authors:\n${yamlList(paper.authors)}`
        : "authors: []",
      `source: ${yamlScalar(paper.source || "arxiv")}`,
      `arxiv_id: ${yamlScalar(paper.arxivId)}`,
      `url: ${yamlScalar(paper.url)}`,
      `html_url: ${yamlScalar(paper.htmlUrl)}`,
      `html_source: ${yamlScalar(paper.htmlSource)}`,
      `pdf_url: ${yamlScalar(paper.pdfUrl)}`,
      `code_url: ${yamlScalar(paper.codeUrl)}`,
      `publish_date: ${yamlScalar(paper.publishDate)}`,
      `status: ${yamlScalar(status)}`,
      'type: "paper"',
      `created: ${yamlScalar(created)}`,
      "---",
      "",
      "# Links",
      "",
      compactLines([
        line("HTML", paper.htmlUrl),
        line("PDF", paper.pdfUrl),
        line("arXiv", paper.url),
        line("Code", paper.codeUrl)
      ]),
      "",
      "# Abstract",
      "",
      paper.abstract || "",
      "",
      "# Notes",
      "",
      "# Method",
      "",
      "# Experiments",
      "",
      "# Ideas"
    ].join("\n");
  }

  function buildObsidianNewUri(config, filePath, content) {
    const encodedVault = encodeURIComponent(config.vaultName || "");
    const encodedFile = encodeURIComponent(filePath || "");
    const encodedContent = encodeURIComponent(content || "");

    return `obsidian://new?vault=${encodedVault}&file=${encodedFile}&content=${encodedContent}`;
  }

  function buildClipTarget(config, paper) {
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };
    const filePath = buildFilePath(mergedConfig, paper);
    const markdown = buildMarkdown(mergedConfig, paper);
    const uri = buildObsidianNewUri(mergedConfig, filePath, markdown);

    return {
      filePath,
      markdown,
      uri
    };
  }

  self.PaperClipperObsidian = {
    DEFAULT_CONFIG,
    buildClipTarget,
    buildFilePath,
    buildMarkdown
  };
})();
