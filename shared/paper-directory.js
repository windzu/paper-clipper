(function () {
  "use strict";

  const DATABASE_NAME = "paper-clipper";
  const DATABASE_VERSION = 1;
  const STORE_NAME = "directory-handles";
  const PAPER_FOLDER_KEY = "paper-index-folder";

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
    });
  }

  function transactionComplete(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        reject(transaction.error || new Error("IndexedDB transaction failed."));
      };
      transaction.onabort = () => {
        reject(transaction.error || new Error("IndexedDB transaction was aborted."));
      };
    });
  }

  function openDatabase(indexedDb = self.indexedDB) {
    if (!indexedDb) {
      return Promise.reject(new Error("IndexedDB is not available."));
    }

    return new Promise((resolve, reject) => {
      const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open IndexedDB."));
    });
  }

  async function useStore(mode, operation, indexedDb) {
    const database = await openDatabase(indexedDb);
    try {
      const transaction = database.transaction(STORE_NAME, mode);
      const completion = transactionComplete(transaction);
      const result = await requestResult(operation(transaction.objectStore(STORE_NAME)));
      await completion;
      return result;
    } finally {
      database.close();
    }
  }

  function getPaperFolder(indexedDb = self.indexedDB) {
    return useStore("readonly", (store) => store.get(PAPER_FOLDER_KEY), indexedDb);
  }

  function setPaperFolder(directoryHandle, indexedDb = self.indexedDB) {
    return useStore(
      "readwrite",
      (store) => store.put(directoryHandle, PAPER_FOLDER_KEY),
      indexedDb
    );
  }

  function clearPaperFolder(indexedDb = self.indexedDB) {
    return useStore("readwrite", (store) => store.delete(PAPER_FOLDER_KEY), indexedDb);
  }

  async function ensureReadPermission(directoryHandle, requestIfNeeded = true) {
    if (!directoryHandle) return false;
    if (typeof directoryHandle.queryPermission !== "function") return true;

    const permission = { mode: "read" };
    if (await directoryHandle.queryPermission(permission) === "granted") {
      return true;
    }

    if (
      requestIfNeeded &&
      typeof directoryHandle.requestPermission === "function" &&
      await directoryHandle.requestPermission(permission) === "granted"
    ) {
      return true;
    }

    return false;
  }

  async function collectPaperFiles(directoryHandle) {
    const files = [];

    async function visit(handle, relativePath) {
      for await (const entry of handle.values()) {
        const entryPath = `${relativePath}/${entry.name}`;
        if (entry.kind === "directory") {
          await visit(entry, entryPath);
          continue;
        }

        if (entry.kind !== "file" || !entry.name.toLowerCase().endsWith(".md")) {
          continue;
        }

        const file = await entry.getFile();
        files.push({
          name: file.name,
          webkitRelativePath: entryPath,
          text: () => file.text()
        });
      }
    }

    await visit(directoryHandle, directoryHandle.name);
    return files;
  }

  self.PaperClipperDirectory = {
    clearPaperFolder,
    collectPaperFiles,
    ensureReadPermission,
    getPaperFolder,
    setPaperFolder
  };
})();
