const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const clientSource = fs.readFileSync(
  path.join(__dirname, "..", "background", "obsidian-client.js"),
  "utf8"
);
const schemaSource = fs.readFileSync(
  path.join(__dirname, "..", "shared", "paper-schema.js"),
  "utf8"
);

function loadClient(initialIndex = {}) {
  const storage = { ...initialIndex };
  const context = {
    URL,
    AbortController,
    fetch,
    setTimeout,
    clearTimeout,
    self: {},
    chrome: {
      storage: {
        sync: {
          async get(key) {
            return { [key]: storage[key] || {} };
          },
          async set(values) {
            Object.assign(storage, values);
          }
        }
      }
    }
  };

  vm.runInNewContext(schemaSource, context);
  vm.runInNewContext(clientSource, context);
  return context.self.PaperClipperObsidian;
}

test("uses a versionless arXiv ID for paths and duplicate keys", () => {
  const client = loadClient();
  const paper = { arxivId: "2410.22461v3" };

  assert.equal(client.buildFilePath({ targetFolder: "Papers/arXiv" }, paper), "Papers/arXiv/2410.22461.md");
  assert.equal(client.getImportKey({}, paper), "arxiv:2410.22461");
});

test("finds a legacy import record stored with a versioned arXiv ID", async () => {
  const indexKey = "__paper_clipper_imported_by_file__";
  const client = loadClient({
    [indexKey]: {
      "arxiv:2410.22461v1": {
        arxivId: "2410.22461v1",
        filePath: "Papers/arXiv/2410.22461v1.md"
      }
    }
  });

  const result = await client.checkImported({}, { arxivId: "2410.22461" });

  assert.equal(result.exists, true);
  assert.equal(result.record.filePath, "Papers/arXiv/2410.22461v1.md");
});

test("writes a namespaced and normalized paper status", () => {
  const client = loadClient();
  const markdown = client.buildMarkdown(
    { defaultPaperStatus: "In progress" },
    {
      title: "Paper",
      shortTitle: "Paper",
      authors: [],
      arxivId: "2410.22461",
      category: []
    }
  );

  assert.match(markdown, /^paper_status: "Reading"$/m);
  assert.doesNotMatch(markdown, /^status:/m);
});

test("falls back to To Read for unsupported paper status values", () => {
  const client = loadClient();

  assert.equal(client.normalizePaperStatus("Draft"), "To Read");
  assert.equal(client.normalizePaperStatus("Read"), "Done");
  assert.deepEqual(Array.from(client.PAPER_STATUSES), ["To Read", "Reading", "Done"]);
});
