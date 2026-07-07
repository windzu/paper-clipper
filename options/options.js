const DEFAULT_CONFIG = {
  vaultName: "",
  targetFolder: "Papers/arXiv",
  defaultStatus: "To Read"
};

const form = document.getElementById("optionsForm");
const saveStatus = document.getElementById("saveStatus");

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

async function loadOptions() {
  const config = await chrome.storage.sync.get(DEFAULT_CONFIG);
  fields.vaultName.value = config.vaultName || "";
  fields.targetFolder.value = config.targetFolder || DEFAULT_CONFIG.targetFolder;
  fields.defaultStatus.value = config.defaultStatus || DEFAULT_CONFIG.defaultStatus;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const config = {
    vaultName: fields.vaultName.value.trim(),
    targetFolder: normalizeFolder(fields.targetFolder.value.trim()),
    defaultStatus: fields.defaultStatus.value.trim() || DEFAULT_CONFIG.defaultStatus
  };

  await chrome.storage.sync.set(config);
  saveStatus.textContent = "Saved";
  window.setTimeout(() => {
    saveStatus.textContent = "";
  }, 1800);
});

loadOptions();
