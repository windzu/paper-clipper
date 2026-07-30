const DEFAULT_CONFIG = {
  vaultName: "",
  targetFolder: "Papers/arXiv",
  defaultPaperStatus: PaperClipperSchema.DEFAULT_PAPER_STATUS
};

const form = document.getElementById("optionsForm");
const saveStatus = document.getElementById("saveStatus");
const createBaseButton = document.getElementById("createBaseButton");
const baseStatus = document.getElementById("baseStatus");
const chooseFolderButton = document.getElementById("chooseFolderButton");
const rebuildIndexButton = document.getElementById("rebuildIndexButton");
const paperFolderPicker = document.getElementById("paperFolderPicker");
const paperFolderStatus = document.getElementById("paperFolderStatus");
const indexStatus = document.getElementById("indexStatus");
let pendingIndexConfig = null;
let paperDirectoryHandle = null;

const supportsPersistentFolder =
  typeof window.showDirectoryPicker === "function" &&
  typeof window.indexedDB !== "undefined";

const fields = {
  vaultName: document.getElementById("vaultName"),
  targetFolder: document.getElementById("targetFolder"),
  defaultPaperStatus: document.getElementById("defaultPaperStatus")
};

function renderPaperStatusOptions() {
  for (const status of PaperClipperSchema.PAPER_STATUSES) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    fields.defaultPaperStatus.append(option);
  }
}

function normalizeFolder(folder) {
  return folder
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

function getFormConfig() {
  return {
    vaultName: fields.vaultName.value.trim(),
    targetFolder: normalizeFolder(fields.targetFolder.value.trim()),
    defaultPaperStatus: PaperClipperSchema.normalizePaperStatus(fields.defaultPaperStatus.value)
  };
}

async function saveCurrentOptions() {
  const config = getFormConfig();
  await chrome.storage.sync.set(config);
  await chrome.storage.sync.remove("defaultStatus");
  return config;
}

async function loadOptions() {
  const config = await chrome.storage.sync.get([
    "vaultName",
    "targetFolder",
    "defaultPaperStatus",
    "defaultStatus"
  ]);
  fields.vaultName.value = config.vaultName || "";
  fields.targetFolder.value = config.targetFolder || DEFAULT_CONFIG.targetFolder;
  fields.defaultPaperStatus.value = PaperClipperSchema.normalizePaperStatus(
    config.defaultPaperStatus || config.defaultStatus
  );
}

function renderPaperFolder() {
  if (!supportsPersistentFolder) {
    chooseFolderButton.hidden = true;
    rebuildIndexButton.disabled = false;
    paperFolderStatus.textContent = "Choose on each rebuild (compatibility mode)";
    return;
  }

  chooseFolderButton.hidden = false;
  chooseFolderButton.textContent = paperDirectoryHandle ? "Change folder" : "Choose folder";
  rebuildIndexButton.disabled = !paperDirectoryHandle;
  paperFolderStatus.textContent = paperDirectoryHandle
    ? paperDirectoryHandle.name
    : "Not selected";
}

async function loadPaperFolder() {
  if (!supportsPersistentFolder) {
    renderPaperFolder();
    return;
  }

  try {
    paperDirectoryHandle = await PaperClipperDirectory.getPaperFolder();
  } catch (error) {
    paperDirectoryHandle = null;
    indexStatus.textContent = "Could not restore the saved paper folder.";
  }

  renderPaperFolder();
}

function validateIndexConfig() {
  const config = getFormConfig();
  if (!config.vaultName) {
    throw new Error("Vault name is required.");
  }

  if (!config.targetFolder) {
    throw new Error("Target folder is required.");
  }

  return config;
}

async function rebuildIndex(config, files) {
  rebuildIndexButton.disabled = true;
  chooseFolderButton.disabled = true;
  indexStatus.textContent = "Scanning paper notes...";

  try {
    await chrome.storage.sync.set(config);
    const scan = await PaperClipperIndex.scanPaperFiles(files, config.targetFolder);

    if (scan.records.length === 0) {
      throw new Error(`No paper notes found under ${config.targetFolder}.`);
    }

    const response = await chrome.runtime.sendMessage({
      type: "REBUILD_IMPORT_INDEX",
      records: scan.records
    });

    if (!response || !response.ok) {
      throw new Error(response ? response.error : "No response from background worker.");
    }

    const details = [];
    if (scan.invalidFiles > 0) details.push(`${scan.invalidFiles} missing arxiv_id`);
    if (scan.duplicateFiles.length > 0) {
      details.push(`${scan.duplicateFiles.length} duplicate files ignored`);
    }

    indexStatus.textContent =
      `Indexed ${response.indexedCount} papers.` +
      (details.length > 0 ? ` ${details.join(", ")}.` : "");
  } catch (error) {
    indexStatus.textContent = error.message || "Could not rebuild import index.";
  } finally {
    chooseFolderButton.disabled = false;
    renderPaperFolder();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  await saveCurrentOptions();
  saveStatus.textContent = "Saved";
  window.setTimeout(() => {
    saveStatus.textContent = "";
  }, 1800);
});

createBaseButton.addEventListener("click", async () => {
  createBaseButton.disabled = true;
  baseStatus.textContent = "Opening Obsidian...";

  try {
    const config = await saveCurrentOptions();
    if (!config.vaultName) {
      throw new Error("Vault name is required.");
    }

    const templateResponse = await fetch(chrome.runtime.getURL("templates/PaperClipper.base"));
    if (!templateResponse.ok) {
      throw new Error("Could not load PaperClipper.base template.");
    }

    const content = await templateResponse.text();
    const response = await chrome.runtime.sendMessage({
      type: "CREATE_BASE",
      content
    });

    if (!response || !response.ok) {
      throw new Error(response ? response.error : "No response from background worker.");
    }

    baseStatus.textContent = `Opened ${response.filePath}`;
  } catch (error) {
    baseStatus.textContent = error.message || "Could not create base.";
  } finally {
    createBaseButton.disabled = false;
  }
});

chooseFolderButton.addEventListener("click", async () => {
  if (!supportsPersistentFolder) return;

  chooseFolderButton.disabled = true;
  try {
    const directoryHandle = await window.showDirectoryPicker({
      id: "paper-clipper-index-folder",
      mode: "read",
      startIn: paperDirectoryHandle || undefined
    });
    await PaperClipperDirectory.setPaperFolder(directoryHandle);
    paperDirectoryHandle = directoryHandle;
    indexStatus.textContent = "Paper folder saved.";
    renderPaperFolder();
  } catch (error) {
    if (error && error.name === "AbortError") return;
    indexStatus.textContent = error.message || "Could not save the paper folder.";
  } finally {
    chooseFolderButton.disabled = false;
    renderPaperFolder();
  }
});

rebuildIndexButton.addEventListener("click", async () => {
  let config;
  try {
    config = validateIndexConfig();
  } catch (error) {
    indexStatus.textContent = error.message;
    return;
  }

  if (!supportsPersistentFolder) {
    pendingIndexConfig = config;
    paperFolderPicker.value = "";
    paperFolderPicker.click();
    return;
  }

  rebuildIndexButton.disabled = true;
  chooseFolderButton.disabled = true;
  indexStatus.textContent = "Reading the saved paper folder...";

  try {
    const hasPermission = await PaperClipperDirectory.ensureReadPermission(
      paperDirectoryHandle
    );
    if (!hasPermission) {
      throw new Error("Paper folder access was not granted.");
    }

    const files = await PaperClipperDirectory.collectPaperFiles(paperDirectoryHandle);
    await rebuildIndex(config, files);
  } catch (error) {
    indexStatus.textContent = error.message || "Could not read the paper folder.";
    chooseFolderButton.disabled = false;
    renderPaperFolder();
  }
});

paperFolderPicker.addEventListener("change", async () => {
  const files = Array.from(paperFolderPicker.files || []);
  if (!pendingIndexConfig || files.length === 0) return;

  try {
    await rebuildIndex(pendingIndexConfig, files);
  } finally {
    pendingIndexConfig = null;
    paperFolderPicker.value = "";
  }
});

renderPaperStatusOptions();
Promise.all([loadOptions(), loadPaperFolder()]);
