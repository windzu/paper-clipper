let currentPaper = null;

const elements = {
  title: document.getElementById("title"),
  status: document.getElementById("status"),
  preview: document.getElementById("preview"),
  arxivId: document.getElementById("arxivId"),
  authors: document.getElementById("authors"),
  htmlSource: document.getElementById("htmlSource"),
  clipButton: document.getElementById("clipButton"),
  openExistingButton: document.getElementById("openExistingButton"),
  optionsButton: document.getElementById("optionsButton")
};

let duplicateRecord = null;

function setStatus(message, tone = "") {
  elements.status.textContent = message;
  elements.status.className = `status ${tone}`.trim();
}

function isSupportedArxivPage(url) {
  try {
    const parsed = new URL(url || "");
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "arxiv.org" &&
      /^\/(?:abs|html)\/[^/].*/i.test(parsed.pathname)
    );
  } catch (error) {
    return false;
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tabs[0];
}

async function parseCurrentPaper(tab) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["parsers/arxiv.js"]
  });
  return results && results[0] ? results[0].result : null;
}

function renderPaper(paper) {
  currentPaper = paper;
  duplicateRecord = null;
  elements.title.textContent = paper.title;
  elements.arxivId.textContent = paper.arxivId;
  elements.authors.textContent = paper.authors.join(", ");
  elements.htmlSource.textContent = paper.htmlSource || "unknown";
  elements.preview.classList.remove("hidden");
  elements.clipButton.disabled = false;
  elements.openExistingButton.classList.add("hidden");
  elements.openExistingButton.disabled = true;
  elements.openExistingButton.textContent = "Open imported note";
  setStatus("Ready to clip.", "success");
}

async function init() {
  try {
    const tab = await getActiveTab();
    if (!tab || !isSupportedArxivPage(tab.url)) {
      elements.title.textContent = "Unsupported page";
      setStatus("Open an arXiv abstract or HTML page first.", "error");
      return;
    }

    const paper = await parseCurrentPaper(tab);
    if (!paper) {
      elements.title.textContent = "Parse failed";
      setStatus("Could not extract paper metadata from this page.", "error");
      return;
    }

    renderPaper(paper);
  } catch (error) {
    elements.title.textContent = "Error";
    setStatus(error.message || "Unexpected popup error.", "error");
  }
}

elements.clipButton.addEventListener("click", async () => {
  if (!currentPaper) return;

  elements.clipButton.disabled = true;
  setStatus("Preparing...");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CLIP_PAPER",
      paper: currentPaper
    });

    if (!response || !response.ok) {
      if (response && response.reason === "DUPLICATE") {
        duplicateRecord = {
          vaultName: response.vaultName || "",
          filePath: response.filePath
        };
        setStatus(`Already imported: ${response.filePath}`, "warning");
        elements.clipButton.disabled = true;
        elements.openExistingButton.disabled = false;
        elements.openExistingButton.classList.remove("hidden");
        return;
      }

      throw new Error(response ? response.error : "No response from background worker.");
    }

    setStatus(`Opened ${response.filePath}`, "success");
  } catch (error) {
    elements.clipButton.disabled = false;
    setStatus(error.message || "Could not open Obsidian.", "error");
  }
});

elements.openExistingButton.addEventListener("click", async () => {
  if (!duplicateRecord || !duplicateRecord.filePath) return;

  elements.openExistingButton.disabled = true;
  setStatus("Opening imported note...");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "OPEN_NOTE",
      vaultName: duplicateRecord.vaultName,
      filePath: duplicateRecord.filePath
    });

    if (!response || !response.ok) {
      throw new Error(response ? response.error : "No response from background worker.");
    }

    setStatus(`Opened ${response.filePath}`, "success");
  } catch (error) {
    elements.openExistingButton.disabled = false;
    setStatus(error.message || "Could not open imported note.", "error");
  }
});

elements.optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
