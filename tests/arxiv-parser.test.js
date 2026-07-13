const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const parserSource = fs.readFileSync(
  path.join(__dirname, "..", "parsers", "arxiv.js"),
  "utf8"
);

function createElement(textContent, links = []) {
  return {
    textContent,
    querySelectorAll(selector) {
      return selector === "a" || selector === "a[href]" ? links : [];
    }
  };
}

function createAbstractDocument() {
  const title = createElement("Title: Example Paper");
  const authors = createElement("Authors: Alice, Bob", [
    createElement("Alice"),
    createElement("Bob")
  ]);
  const abstract = createElement("Abstract: A useful result.", [
    { href: "https://github.com/example/paper" }
  ]);
  const submission = createElement("[v1] 29 October 2024");
  const htmlLink = { href: "https://arxiv.org/html/2410.22461v1" };

  return {
    querySelector(selector) {
      return {
        "h1.title": title,
        ".authors": authors,
        "blockquote.abstract": abstract,
        ".submission-history": submission
      }[selector] || null;
    },
    querySelectorAll(selector) {
      return selector === "a[href]" ? [htmlLink] : [];
    }
  };
}

async function runParser(url, options = {}) {
  const abstractDocument = createAbstractDocument();
  const context = {
    URL,
    window: { location: { href: url } },
    document: options.document || abstractDocument,
    DOMParser: class {
      parseFromString() {
        return abstractDocument;
      }
    },
    fetch: options.fetch || (async () => {
      throw new Error("Unexpected fetch");
    })
  };

  return await vm.runInNewContext(parserSource, context);
}

test("parses an abstract page without fetching metadata", async () => {
  const paper = await runParser("https://arxiv.org/abs/2410.22461?context=cs#history");

  assert.equal(paper.arxivId, "2410.22461");
  assert.equal(paper.url, "https://arxiv.org/abs/2410.22461");
  assert.equal(paper.title, "Example Paper");
  assert.deepEqual(Array.from(paper.authors), ["Alice", "Bob"]);
});

test("parses an HTML page using abstract metadata and the current HTML URL", async () => {
  let fetchedUrl = "";
  const paper = await runParser("https://arxiv.org/html/2410.22461v2?foo=bar#S1", {
    document: { querySelector() { return null; } },
    fetch: async (url) => {
      fetchedUrl = url;
      return {
        ok: true,
        text: async () => "<html></html>"
      };
    }
  });

  assert.equal(fetchedUrl, "https://arxiv.org/abs/2410.22461");
  assert.equal(paper.arxivId, "2410.22461");
  assert.equal(paper.htmlUrl, "https://arxiv.org/html/2410.22461v2");
  assert.equal(paper.url, "https://arxiv.org/abs/2410.22461");
  assert.equal(paper.pdfUrl, "https://arxiv.org/pdf/2410.22461.pdf");
  assert.equal(paper.publishDate, "2024-10-29");
});

test("normalizes versioned abstract URLs for duplicate identity", async () => {
  const paper = await runParser("https://arxiv.org/abs/2410.22461v3");

  assert.equal(paper.arxivId, "2410.22461");
  assert.equal(paper.url, "https://arxiv.org/abs/2410.22461");
});
