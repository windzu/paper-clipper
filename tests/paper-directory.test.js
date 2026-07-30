const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const directorySource = fs.readFileSync(
  path.join(__dirname, "..", "shared", "paper-directory.js"),
  "utf8"
);

function loadDirectory() {
  const context = { self: {} };
  vm.runInNewContext(directorySource, context);
  return context.self.PaperClipperDirectory;
}

function fileEntry(name, content) {
  return {
    kind: "file",
    name,
    async getFile() {
      return {
        name,
        async text() {
          return content;
        }
      };
    }
  };
}

function directoryEntry(name, entries) {
  return {
    kind: "directory",
    name,
    async *values() {
      yield* entries;
    }
  };
}

function createFakeIndexedDb() {
  const databases = new Map();

  function makeRequest(operation, transaction) {
    const request = {};
    queueMicrotask(() => {
      try {
        request.result = operation();
        if (request.onsuccess) request.onsuccess();
        queueMicrotask(() => {
          if (transaction.oncomplete) transaction.oncomplete();
        });
      } catch (error) {
        request.error = error;
        transaction.error = error;
        if (request.onerror) request.onerror();
        if (transaction.onerror) transaction.onerror();
      }
    });
    return request;
  }

  return {
    open(name) {
      const request = {};
      queueMicrotask(() => {
        let database = databases.get(name);
        if (!database) {
          const stores = new Map();
          database = {
            objectStoreNames: {
              contains(storeName) {
                return stores.has(storeName);
              }
            },
            createObjectStore(storeName) {
              stores.set(storeName, new Map());
            },
            transaction(storeName) {
              const transaction = { error: null };
              const values = stores.get(storeName);
              transaction.objectStore = () => ({
                get(key) {
                  return makeRequest(() => values.get(key), transaction);
                },
                put(value, key) {
                  return makeRequest(() => {
                    values.set(key, value);
                    return key;
                  }, transaction);
                },
                delete(key) {
                  return makeRequest(() => values.delete(key), transaction);
                }
              });
              return transaction;
            },
            close() {}
          };
          databases.set(name, database);
          request.result = database;
          if (request.onupgradeneeded) request.onupgradeneeded();
        }

        request.result = database;
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    }
  };
}

test("stores and restores the selected paper directory handle", async () => {
  const directory = loadDirectory();
  const indexedDb = createFakeIndexedDb();
  const handle = directoryEntry("arXiv", []);

  await directory.setPaperFolder(handle, indexedDb);
  assert.equal(await directory.getPaperFolder(indexedDb), handle);

  await directory.clearPaperFolder(indexedDb);
  assert.equal(await directory.getPaperFolder(indexedDb), undefined);
});

test("restores or requests read permission without reselecting the directory", async () => {
  const directory = loadDirectory();
  let requests = 0;
  const handle = {
    async queryPermission() {
      return "prompt";
    },
    async requestPermission() {
      requests += 1;
      return "granted";
    }
  };

  assert.equal(await directory.ensureReadPermission(handle), true);
  assert.equal(requests, 1);
});

test("collects markdown files recursively with directory-relative paths", async () => {
  const directory = loadDirectory();
  const handle = directoryEntry("Wind", [
    directoryEntry("Papers", [
      directoryEntry("arXiv", [
        fileEntry("2303.09551.md", "paper"),
        fileEntry("notes.txt", "ignored"),
        directoryEntry("assets", [
          directoryEntry("2303.09551", [
            fileEntry("_manifest.md", "asset manifest")
          ])
        ])
      ])
    ])
  ]);

  const files = await directory.collectPaperFiles(handle);

  assert.deepEqual(
    Array.from(files, (file) => file.webkitRelativePath),
    [
      "Wind/Papers/arXiv/2303.09551.md",
      "Wind/Papers/arXiv/assets/2303.09551/_manifest.md"
    ]
  );
  assert.equal(await files[0].text(), "paper");
});
