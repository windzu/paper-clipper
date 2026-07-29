(function () {
  "use strict";

  function normalizeFolder(folder) {
    return String(folder || "")
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/{2,}/g, "/");
  }

  function normalizeArxivId(arxivId) {
    return String(arxivId || "").trim().replace(/v\d+$/i, "");
  }

  function unquoteYamlScalar(value) {
    const text = String(value || "").trim();
    if (text.length < 2) return text;

    if (text.startsWith("\"") && text.endsWith("\"")) {
      try {
        return JSON.parse(text);
      } catch (error) {
        return text.slice(1, -1);
      }
    }

    if (text.startsWith("'") && text.endsWith("'")) {
      return text.slice(1, -1).replace(/''/g, "'");
    }

    return text;
  }

  function getFrontmatter(content) {
    const match = String(content || "").match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
    return match ? match[1] : "";
  }

  function getFrontmatterScalar(frontmatter, propertyName) {
    const escapedName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(frontmatter || "").match(
      new RegExp(`^${escapedName}:[ \\t]*(.*)$`, "m")
    );
    return match ? unquoteYamlScalar(match[1]) : "";
  }

  function resolveTargetFilename(relativePath, targetFolder) {
    const normalizedPath = normalizeFolder(relativePath);
    const normalizedTarget = normalizeFolder(targetFolder);
    if (!normalizedPath || !normalizedTarget) return "";

    const marker = `/${normalizedTarget}/`;
    const paddedPath = `/${normalizedPath}`;
    const markerIndex = paddedPath.indexOf(marker);
    let filename = "";

    if (markerIndex >= 0) {
      filename = paddedPath.slice(markerIndex + marker.length);
    } else {
      const targetFolderName = normalizedTarget.split("/").pop();
      const prefix = `${targetFolderName}/`;
      if (normalizedPath.startsWith(prefix)) {
        filename = normalizedPath.slice(prefix.length);
      }
    }

    if (!filename || filename.includes("/") || !filename.toLowerCase().endsWith(".md")) {
      return "";
    }

    return filename;
  }

  function buildPaperRecord(content, filename, targetFolder) {
    const frontmatter = getFrontmatter(content);
    const arxivId = normalizeArxivId(getFrontmatterScalar(frontmatter, "arxiv_id"));
    if (!arxivId) return null;

    const folder = normalizeFolder(targetFolder);
    return {
      arxivId,
      title: getFrontmatterScalar(frontmatter, "title"),
      htmlUrl: getFrontmatterScalar(frontmatter, "html_url"),
      filePath: folder ? `${folder}/${filename}` : filename
    };
  }

  function isCanonicalRecord(record) {
    const filename = String(record.filePath || "").split("/").pop();
    return filename === `${record.arxivId}.md`;
  }

  function preferRecord(current, candidate) {
    if (!current) return candidate;
    if (isCanonicalRecord(candidate) && !isCanonicalRecord(current)) return candidate;
    if (isCanonicalRecord(current) && !isCanonicalRecord(candidate)) return current;
    return candidate.filePath.localeCompare(current.filePath) < 0 ? candidate : current;
  }

  async function scanPaperFiles(files, targetFolder) {
    const recordsById = new Map();
    const duplicateFiles = [];
    let matchedFiles = 0;
    let invalidFiles = 0;

    for (const file of Array.from(files || [])) {
      const filename = resolveTargetFilename(file.webkitRelativePath || file.name, targetFolder);
      if (!filename) continue;

      matchedFiles += 1;
      const record = buildPaperRecord(await file.text(), filename, targetFolder);
      if (!record) {
        invalidFiles += 1;
        continue;
      }

      const existing = recordsById.get(record.arxivId);
      if (existing) {
        const preferred = preferRecord(existing, record);
        const ignored = preferred === existing ? record : existing;
        duplicateFiles.push(ignored.filePath);
        recordsById.set(record.arxivId, preferred);
      } else {
        recordsById.set(record.arxivId, record);
      }
    }

    return {
      records: Array.from(recordsById.values()).sort((left, right) =>
        left.arxivId.localeCompare(right.arxivId)
      ),
      matchedFiles,
      invalidFiles,
      duplicateFiles: duplicateFiles.sort()
    };
  }

  self.PaperClipperIndex = {
    buildPaperRecord,
    getFrontmatterScalar,
    normalizeArxivId,
    normalizeFolder,
    resolveTargetFilename,
    scanPaperFiles
  };
})();
