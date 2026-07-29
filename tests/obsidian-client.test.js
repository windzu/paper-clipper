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

function createStorageArea(initialValues = {}) {
  const storage = { ...initialValues };
  return {
    storage,
    area: {
      async get(keys) {
        if (keys === null || keys === undefined) return { ...storage };
        if (typeof keys === "string") return { [keys]: storage[keys] };
        if (Array.isArray(keys)) {
          return Object.fromEntries(keys.map((key) => [key, storage[key]]));
        }

        return Object.fromEntries(
          Object.entries(keys).map(([key, fallback]) => [
            key,
            storage[key] === undefined ? fallback : storage[key]
          ])
        );
      },
      async set(values) {
        Object.assign(storage, values);
      },
      async remove(keys) {
        for (const key of Array.isArray(keys) ? keys : [keys]) delete storage[key];
      }
    }
  };
}

function loadClient(initialSync = {}, initialLocal = {}) {
  const sync = createStorageArea(initialSync);
  const local = createStorageArea(initialLocal);
  const context = {
    URL,
    AbortController,
    fetch,
    setTimeout,
    clearTimeout,
    self: {},
    chrome: {
      storage: {
        sync: sync.area,
        local: local.area
      }
    }
  };

  vm.runInNewContext(schemaSource, context);
  vm.runInNewContext(clientSource, context);
  const client = context.self.PaperClipperObsidian;
  client.__testStorage = {
    sync: sync.storage,
    local: local.storage
  };
  return client;
}

test("uses a versionless arXiv ID for paths and duplicate keys", () => {
  const client = loadClient();
  const paper = { arxivId: "2410.22461v3" };

  assert.equal(client.buildFilePath({ targetFolder: "Papers/arXiv" }, paper), "Papers/arXiv/2410.22461.md");
  assert.equal(
    client.getImportKey(
      { vaultName: "Wind", targetFolder: "Papers/arXiv" },
      paper
    ),
    "Wind:Papers%2FarXiv:arxiv:2410.22461"
  );
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
  assert.deepEqual(
    client.__testStorage.local[client.DEDUPE_INDEX_KEY],
    client.__testStorage.sync[indexKey]
  );
});

test("rebuilds one vault scope in local storage and preserves other scopes", async () => {
  const indexKey = "__paper_clipper_import_index_v2__";
  const client = loadClient({}, {
    [indexKey]: {
      "Other:Elsewhere:arxiv:1000.00001": {
        arxivId: "1000.00001",
        filePath: "Elsewhere/1000.00001.md",
        vaultName: "Other",
        folder: "Elsewhere"
      },
      "Wind:Papers%2FarXiv:arxiv:old": {
        arxivId: "old",
        filePath: "Papers/arXiv/old.md",
        vaultName: "Wind",
        folder: "Papers/arXiv"
      }
    }
  });

  const result = await client.rebuildImportIndex(
    { vaultName: "Wind", targetFolder: "Papers/arXiv" },
    [
      {
        arxivId: "2303.09551v2",
        filePath: "Papers/arXiv/2303.09551.md",
        title: "SurroundOcc"
      },
      {
        arxivId: "2306.02851",
        filePath: "Papers/arXiv/2306.02851.md",
        title: "Scene as Occupancy"
      }
    ]
  );

  assert.deepEqual({ ...result }, {
    indexedCount: 2,
    totalCount: 3
  });

  const rebuilt = client.__testStorage.local[indexKey];
  assert.equal(rebuilt["Other:Elsewhere:arxiv:1000.00001"].arxivId, "1000.00001");
  assert.equal(
    rebuilt["Wind:Papers%2FarXiv:arxiv:2303.09551"].filePath,
    "Papers/arXiv/2303.09551.md"
  );
  assert.equal(rebuilt["Wind:Papers%2FarXiv:arxiv:old"], undefined);
});

test("marks new imports in local storage", async () => {
  const client = loadClient();

  await client.markImported(
    { vaultName: "Wind", targetFolder: "Papers/arXiv" },
    {
      arxivId: "2410.22461v3",
      title: "Paper",
      htmlUrl: "https://arxiv.org/html/2410.22461"
    }
  );

  assert.equal(
    client.__testStorage.local[client.DEDUPE_INDEX_KEY][
      "Wind:Papers%2FarXiv:arxiv:2410.22461"
    ].filePath,
    "Papers/arXiv/2410.22461.md"
  );
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
