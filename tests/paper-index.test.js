const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const indexSource = fs.readFileSync(
  path.join(__dirname, "..", "shared", "paper-index.js"),
  "utf8"
);

function loadIndex() {
  const context = { self: {} };
  vm.runInNewContext(indexSource, context);
  return context.self.PaperClipperIndex;
}

function fakeFile(relativePath, content) {
  return {
    name: relativePath.split("/").pop(),
    webkitRelativePath: relativePath,
    async text() {
      return content;
    }
  };
}

test("resolves top-level paper notes when selecting the vault, parent, or target folder", () => {
  const index = loadIndex();

  assert.equal(
    index.resolveTargetFilename("Wind/Papers/arXiv/2303.09551.md", "Papers/arXiv"),
    "2303.09551.md"
  );
  assert.equal(
    index.resolveTargetFilename("Papers/arXiv/2303.09551.md", "Papers/arXiv"),
    "2303.09551.md"
  );
  assert.equal(
    index.resolveTargetFilename("arXiv/2303.09551.md", "Papers/arXiv"),
    "2303.09551.md"
  );
  assert.equal(
    index.resolveTargetFilename(
      "Wind/Papers/arXiv/assets/2303.09551/_manifest.md",
      "Papers/arXiv"
    ),
    ""
  );
});

test("parses quoted paper properties and normalizes versioned arXiv IDs", () => {
  const index = loadIndex();
  const record = index.buildPaperRecord(
    [
      "---",
      "title: 'SurroundOcc: Multi-Camera 3D Occupancy Prediction'",
      "arxiv_id: \"2303.09551v2\"",
      "html_url: https://ar5iv.labs.arxiv.org/html/2303.09551",
      "---"
    ].join("\n"),
    "2303.09551.md",
    "Papers/arXiv"
  );

  assert.deepEqual({ ...record }, {
    arxivId: "2303.09551",
    title: "SurroundOcc: Multi-Camera 3D Occupancy Prediction",
    htmlUrl: "https://ar5iv.labs.arxiv.org/html/2303.09551",
    filePath: "Papers/arXiv/2303.09551.md"
  });
});

test("prefers the canonical arXiv filename and reports duplicate files", async () => {
  const index = loadIndex();
  const content = [
    "---",
    "title: Scene as Occupancy",
    "arxiv_id: 2306.02851",
    "---"
  ].join("\n");

  const result = await index.scanPaperFiles(
    [
      fakeFile("arXiv/2306.02851 1.md", content),
      fakeFile("arXiv/2306.02851.md", content),
      fakeFile("arXiv/assets/2306.02851/_manifest.md", content)
    ],
    "Papers/arXiv"
  );

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].filePath, "Papers/arXiv/2306.02851.md");
  assert.deepEqual(Array.from(result.duplicateFiles), [
    "Papers/arXiv/2306.02851 1.md"
  ]);
});
