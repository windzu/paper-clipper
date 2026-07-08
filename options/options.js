const DEFAULT_CONFIG = {
  vaultName: "",
  targetFolder: "Papers/arXiv",
  defaultStatus: "To Read"
};

const form = document.getElementById("optionsForm");
const saveStatus = document.getElementById("saveStatus");
const createBaseButton = document.getElementById("createBaseButton");
const baseStatus = document.getElementById("baseStatus");

const fields = {
  vaultName: document.getElementById("vaultName"),
  targetFolder: document.getElementById("targetFolder"),
  defaultStatus: document.getElementById("defaultStatus")
};

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
    defaultStatus: fields.defaultStatus.value.trim() || DEFAULT_CONFIG.defaultStatus
  };
}

async function saveCurrentOptions() {
  const config = getFormConfig();
  await chrome.storage.sync.set(config);
  return config;
}

async function loadOptions() {
  const config = await chrome.storage.sync.get(DEFAULT_CONFIG);
  fields.vaultName.value = config.vaultName || "";
  fields.targetFolder.value = config.targetFolder || DEFAULT_CONFIG.targetFolder;
  fields.defaultStatus.value = config.defaultStatus || DEFAULT_CONFIG.defaultStatus;
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

loadOptions();
