(async function () {
  "use strict";

  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function parseArxivPageUrl(rawUrl) {
    try {
      const url = new URL(rawUrl || "");
      if (url.protocol !== "https:" || url.hostname !== "arxiv.org") return null;

      const match = url.pathname.match(/^\/(abs|html)\/(.+?)\/?$/i);
      if (!match) return null;

      const sourceId = decodeURIComponent(match[2]);
      const arxivId = sourceId.replace(/v\d+$/i, "");
      if (!arxivId) return null;

      return {
        pageType: match[1].toLowerCase(),
        arxivId,
        sourceId,
        pageUrl: `${url.origin}/${match[1].toLowerCase()}/${encodeURI(sourceId)}`
      };
    } catch (error) {
      return null;
    }
  }

  function extractTitle(sourceDocument) {
    const titleEl = sourceDocument.querySelector("h1.title");
    if (!titleEl) return "";
    return cleanText(titleEl.textContent.replace(/^Title:\s*/i, ""));
  }

  function extractShortTitle(title) {
    const match = (title || "").match(/^([A-Z][A-Za-z0-9-]*)\s*:/);
    return match ? match[1] : "";
  }

  function extractAuthors(sourceDocument) {
    const authorsEl = sourceDocument.querySelector(".authors");
    if (!authorsEl) return [];

    const linkedAuthors = Array.from(authorsEl.querySelectorAll("a"))
      .map((author) => cleanText(author.textContent))
      .filter(Boolean);

    if (linkedAuthors.length > 0) return linkedAuthors;

    const authors = cleanText(authorsEl.textContent.replace(/^Authors?:\s*/i, ""));
    return authors ? authors.split(/\s*,\s*/).filter(Boolean) : [];
  }

  function extractAbstract(sourceDocument) {
    const abstractEl = sourceDocument.querySelector("blockquote.abstract");
    if (!abstractEl) return "";
    return cleanText(abstractEl.textContent.replace(/^Abstract:\s*/i, ""));
  }

  function uniqueUrls(urls) {
    const seen = new Set();
    return urls.filter((value) => {
      const url = value && value.url;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }

  function extractHtmlCandidates(sourceDocument, paperId, currentHtmlUrl) {
    if (!paperId) return [];

    const candidates = [];

    if (currentHtmlUrl) {
      candidates.push({
        url: currentHtmlUrl,
        source: "arxiv"
      });
    }

    const officialLink = Array.from(sourceDocument.querySelectorAll("a[href]"))
      .map((link) => link.href)
      .find((href) => /^https:\/\/arxiv\.org\/html\//i.test(href));

    if (officialLink) {
      candidates.push({
        url: officialLink,
        source: "arxiv"
      });
    }

    candidates.push({
      url: `https://ar5iv.labs.arxiv.org/html/${paperId}`,
      source: "ar5iv"
    });

    return uniqueUrls(candidates);
  }

  function buildPdfUrl(paperId) {
    return paperId ? `https://arxiv.org/pdf/${paperId}.pdf` : "";
  }

  function monthToNumber(month) {
    const months = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12"
    };
    return months[month.toLowerCase().slice(0, 3)] || "01";
  }

  function parseToISODate(dateText) {
    const match = (dateText || "").match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (!match) return "";
    return `${match[3]}-${monthToNumber(match[2])}-${match[1].padStart(2, "0")}`;
  }

  function extractPublishDate(sourceDocument) {
    const submissionEl = sourceDocument.querySelector(".submission-history");
    if (submissionEl) {
      const text = submissionEl.textContent || "";
      const v1Match = text.match(/\[v1\][^\d]*(\d{1,2}\s+\w+\s+\d{4})/);
      if (v1Match) return parseToISODate(v1Match[1]);

      const anyMatch = text.match(/(\d{1,2}\s+\w+\s+\d{4})/);
      if (anyMatch) return parseToISODate(anyMatch[1]);
    }

    const datelineEl = sourceDocument.querySelector(".dateline");
    if (!datelineEl) return "";

    const datelineMatch = datelineEl.textContent.match(/(\d{1,2}\s+\w+\s+\d{4})/);
    return datelineMatch ? parseToISODate(datelineMatch[1]) : "";
  }

  function extractCodeUrl(sourceDocument) {
    const abstractEl = sourceDocument.querySelector("blockquote.abstract");
    if (!abstractEl) return "";

    const links = Array.from(abstractEl.querySelectorAll("a[href]")).map((link) => link.href);
    const content = `${abstractEl.textContent || ""} ${links.join(" ")}`;
    const patterns = [
      /https?:\/\/github\.com\/[\w-]+\/[\w.-]+/i,
      /https?:\/\/gitlab\.com\/[\w-]+\/[\w.-]+/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[0].replace(/[.,;:)}\]]+$/, "");
    }

    return "";
  }

  async function fetchAbstractDocument(arxivId) {
    const response = await fetch(`https://arxiv.org/abs/${encodeURI(arxivId)}`);
    if (!response.ok) {
      throw new Error(`Could not load arXiv abstract page (${response.status}).`);
    }

    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  async function extractPaperData() {
    const page = parseArxivPageUrl(window.location.href);
    if (!page) return null;

    const sourceDocument =
      page.pageType === "html" ? await fetchAbstractDocument(page.arxivId) : document;

    const title = extractTitle(sourceDocument);
    if (!title) return null;

    const currentHtmlUrl = page.pageType === "html" ? page.pageUrl : "";
    const htmlCandidates = extractHtmlCandidates(
      sourceDocument,
      page.arxivId,
      currentHtmlUrl
    );

    return {
      title,
      shortTitle: extractShortTitle(title),
      authors: extractAuthors(sourceDocument),
      abstract: extractAbstract(sourceDocument),
      arxivId: page.arxivId,
      url: `https://arxiv.org/abs/${page.arxivId}`,
      htmlCandidates,
      htmlUrl: htmlCandidates[0] ? htmlCandidates[0].url : "",
      htmlSource: htmlCandidates[0] ? htmlCandidates[0].source : "",
      pdfUrl: buildPdfUrl(page.arxivId),
      codeUrl: extractCodeUrl(sourceDocument),
      publishDate: extractPublishDate(sourceDocument)
    };
  }

  return await extractPaperData();
})();
