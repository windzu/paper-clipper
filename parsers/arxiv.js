(function () {
  "use strict";

  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function extractPaperId() {
    const match = window.location.href.match(/arxiv\.org\/abs\/([^/?#]+)/i);
    if (!match) return "";
    try {
      return decodeURIComponent(match[1]);
    } catch (error) {
      return match[1];
    }
  }

  function extractTitle() {
    const titleEl = document.querySelector("h1.title");
    if (!titleEl) return "";
    return cleanText(titleEl.textContent.replace(/^Title:\s*/i, ""));
  }

  function extractShortTitle(title) {
    const match = (title || "").match(/^([A-Z][A-Za-z0-9-]*)\s*:/);
    return match ? match[1] : "";
  }

  function extractAuthors() {
    const authorsEl = document.querySelector(".authors");
    if (!authorsEl) return [];

    const linkedAuthors = Array.from(authorsEl.querySelectorAll("a"))
      .map((author) => cleanText(author.textContent))
      .filter(Boolean);

    if (linkedAuthors.length > 0) return linkedAuthors;

    const authors = cleanText(authorsEl.textContent.replace(/^Authors?:\s*/i, ""));
    return authors ? authors.split(/\s*,\s*/).filter(Boolean) : [];
  }

  function extractAbstract() {
    const abstractEl = document.querySelector("blockquote.abstract");
    if (!abstractEl) return "";
    return cleanText(abstractEl.textContent.replace(/^Abstract:\s*/i, ""));
  }

  function buildPdfUrl(paperId) {
    return paperId ? `https://arxiv.org/pdf/${paperId}.pdf` : "";
  }

  function extractHtmlUrl(paperId) {
    const urls = {
      url: "",
      source: ""
    };

    if (!paperId) return urls;

    const officialLink = Array.from(document.querySelectorAll("a[href]"))
      .map((link) => link.href)
      .find((href) => /^https:\/\/arxiv\.org\/html\//i.test(href));

    if (officialLink) {
      urls.url = officialLink;
      urls.source = "arxiv";
      return urls;
    }

    urls.url = `https://ar5iv.labs.arxiv.org/html/${paperId}`;
    urls.source = "ar5iv";
    return urls;
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

  function extractPublishDate() {
    const submissionEl = document.querySelector(".submission-history");
    if (submissionEl) {
      const text = submissionEl.textContent || "";
      const v1Match = text.match(/\[v1\][^\d]*(\d{1,2}\s+\w+\s+\d{4})/);
      if (v1Match) return parseToISODate(v1Match[1]);

      const anyMatch = text.match(/(\d{1,2}\s+\w+\s+\d{4})/);
      if (anyMatch) return parseToISODate(anyMatch[1]);
    }

    const datelineEl = document.querySelector(".dateline");
    if (!datelineEl) return "";

    const datelineMatch = datelineEl.textContent.match(/(\d{1,2}\s+\w+\s+\d{4})/);
    return datelineMatch ? parseToISODate(datelineMatch[1]) : "";
  }

  function extractCodeUrl() {
    const abstractEl = document.querySelector("blockquote.abstract");
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

  function extractPaperData() {
    const arxivId = extractPaperId();
    if (!arxivId) return null;

    const title = extractTitle();
    if (!title) return null;

    const html = extractHtmlUrl(arxivId);

    return {
      title,
      shortTitle: extractShortTitle(title),
      authors: extractAuthors(),
      abstract: extractAbstract(),
      source: "arxiv",
      arxivId,
      url: window.location.href,
      htmlUrl: html.url,
      htmlSource: html.source,
      pdfUrl: buildPdfUrl(arxivId),
      codeUrl: extractCodeUrl(),
      publishDate: extractPublishDate()
    };
  }

  return extractPaperData();
})();
