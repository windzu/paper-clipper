(function () {
  "use strict";

  const DEFAULT_CONFIG = {
    vaultName: "",
    targetFolder: "Papers/arXiv",
    defaultStatus: "To Read",
    htmlProbeTimeoutMs: 2500
  };

  const DEDUPE_INDEX_KEY = "__paper_clipper_imported_by_file__";

  function normalizeFolder(folder) {
    return (folder || "")
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/{2,}/g, "/");
  }

  function normalizeArxivId(arxivId) {
    return String(arxivId || "").replace(/v\d+$/i, "");
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
      .replace(/[\\\/:*?\"<>|%#\+]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "paper";
  }

  function normalizeUrl(url) {
    try {
      return new URL(url || "").toString();
    } catch (error) {
      return "";
    }
  }

  function buildFilePath(config, paper) {
    const folder = normalizeFolder(config.targetFolder);
    const filename = `${sanitizeFileStem(normalizeArxivId(paper.arxivId))}.md`;
    return folder ? `${folder}/${filename}` : filename;
  }

  function yamlScalar(value) {
    const text = String(value || "");
    return `"${text.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"')}"`;
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

  function yamlListField(name, values) {
    if (!Array.isArray(values) || values.length === 0) return `${name}: []`;
    return `${name}:\n${yamlList(values)}`;
  }

  async function probeReachableUrl(url, timeoutMs) {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) return false;

    const timeout = timeoutMs || DEFAULT_CONFIG.htmlProbeTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headResult = await fetch(normalizedUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal
      });

      if (headResult.status >= 200 && headResult.status < 400) {
        return true;
      }
    } catch (error) {
      // some servers reject HEAD, continue with GET fallback below
    }

    try {
      const getResult = await fetch(normalizedUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal
      });

      return getResult.status >= 200 && getResult.status < 400;
    } catch (error) {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function pickBestHtmlUrl(candidates = [], timeoutMs) {
    for (const item of candidates) {
      if (!item || !item.url) continue;

      const exists = await probeReachableUrl(item.url, timeoutMs);
      if (exists) {
        return {
          url: normalizeUrl(item.url),
          source: item.source || "",
          verified: true
        };
      }
    }

    return {
      url: "",
      source: "",
      verified: false
    };
  }

  function enrichPaperUrls(paper) {
    const candidates =
      Array.isArray(paper.htmlCandidates) && paper.htmlCandidates.length > 0
        ? paper.htmlCandidates
        : [
          {
            url: paper.htmlUrl || "",
            source: paper.htmlSource || "arxiv"
          }
        ];

    return {
      ...paper,
      __htmlCandidates: candidates
    };
  }

  async function resolveHtmlUrl(paper, config) {
    const prepared = enrichPaperUrls(paper);
    const resolved = await pickBestHtmlUrl(prepared.__htmlCandidates, config.htmlProbeTimeoutMs);

    if (!resolved.verified) {
      return {
        ...prepared,
        htmlUrl: "",
        htmlSource: "",
        htmlUrlVerified: false
      };
    }

    return {
      ...prepared,
      htmlUrl: resolved.url,
      htmlSource: resolved.source,
      htmlUrlVerified: true
    };
  }

  function buildMarkdown(config, paper) {
    const status = config.defaultStatus || DEFAULT_CONFIG.defaultStatus;

    return [
      "---",
      `title: ${yamlScalar(paper.title)}`,
      `short_title: ${yamlScalar(paper.shortTitle)}`,
      yamlListField("authors", paper.authors),
      `arxiv_id: ${yamlScalar(paper.arxivId)}`,
      `url: ${yamlScalar(paper.url)}`,
      `html_url: ${yamlScalar(paper.htmlUrl)}`,
      `pdf_url: ${yamlScalar(paper.pdfUrl)}`,
      `code_url: ${yamlScalar(paper.codeUrl)}`,
      `publish_date: ${yamlScalar(paper.publishDate)}`,
      `status: ${yamlScalar(status)}`,
      yamlListField("category", paper.category),
      `abstract: ${yamlScalar(paper.abstract)}`,
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

  function buildObsidianOpenUri(config, filePath) {
    const encodedVault = encodeURIComponent(config.vaultName || "");
    const encodedFile = encodeURIComponent(filePath || "");
    return `obsidian://open?vault=${encodedVault}&file=${encodedFile}`;
  }

  async function buildClipTarget(config, paper) {
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };

    const normalizedPaper = {
      ...paper,
      arxivId: normalizeArxivId(paper.arxivId)
    };
    const filePath = buildFilePath(mergedConfig, normalizedPaper);
    const resolvedPaper = await resolveHtmlUrl(normalizedPaper, mergedConfig);
    const markdown = buildMarkdown(mergedConfig, resolvedPaper);
    const uri = buildObsidianNewUri(mergedConfig, filePath, markdown);

    return {
      filePath,
      markdown,
      uri,
      resolvedPaper
    };
  }

  async function getImportIndex() {
    const store = await chrome.storage.sync.get(DEDUPE_INDEX_KEY);
    return store[DEDUPE_INDEX_KEY] || {};
  }

  function getImportKey(config, paper) {
    if (paper?.arxivId) return `arxiv:${normalizeArxivId(paper.arxivId)}`;
    return `path:${buildFilePath(config, paper)}`;
  }

  async function checkImported(config, paper) {
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };

    const index = await getImportIndex();
    const key = getImportKey(mergedConfig, paper);
    const matched = index[key];

    if (!matched && paper?.arxivId) {
      const normalizedId = normalizeArxivId(paper.arxivId);
      const legacyMatch = Object.values(index).find(
        (record) => normalizeArxivId(record && record.arxivId) === normalizedId
      );

      if (legacyMatch) {
        return {
          exists: true,
          record: legacyMatch
        };
      }
    }

    if (!matched) {
      return {
        exists: false
      };
    }

    return {
      exists: true,
      record: matched
    };
  }

  async function markImported(config, paper) {
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };

    const index = await getImportIndex();
    const key = getImportKey(mergedConfig, paper);

    index[key] = {
      arxivId: normalizeArxivId(paper.arxivId),
      title: paper.title || "",
      filePath: buildFilePath(mergedConfig, paper),
      htmlUrl: paper.htmlUrl || "",
      vaultName: mergedConfig.vaultName || "",
      folder: normalizeFolder(mergedConfig.targetFolder),
      updatedAt: new Date().toISOString()
    };

    await chrome.storage.sync.set({ [DEDUPE_INDEX_KEY]: index });

    return {
      exists: true
    };
  }

  self.PaperClipperObsidian = {
    DEFAULT_CONFIG,
    buildClipTarget,
    buildFilePath,
    buildMarkdown,
    buildObsidianNewUri,
    pickBestHtmlUrl,
    checkImported,
    markImported,
    getImportKey,
    normalizeArxivId,
    buildObsidianOpenUri
  };
})();
