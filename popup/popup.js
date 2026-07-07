let currentPaper = null;

const elements = {
  title: document.getElementById("title"),
  status: document.getElementById("status"),
  preview: document.getElementById("preview"),
  arxivId: document.getElementById("arxivId"),
  authors: document.getElementById("authors"),
  htmlSource: document.getElementById("htmlSource"),
  clipButton: document.getElementById("clipButton"),
  optionsButton: document.getElementById("optionsButton")
};

function setStatus(message, tone = "") {
  elements.status.textContent = message;
  elements.status.className = `status ${tone}`.trim();
}

function isArxivAbsPage(url) {
  return /^https:\/\/arxiv\.org\/abs\/[^/?#]+/i.test(url || "");
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
  elements.title.textContent = paper.title;
  elements.arxivId.textContent = paper.arxivId;
  elements.authors.textContent = paper.authors.join(", ");
  elements.htmlSource.textContent = paper.htmlSource || "unknown";
  elements.preview.classList.remove("hidden");
  elements.clipButton.disabled = false;
  setStatus("Ready to clip.", "success");
}

async function init() {
  try {
    const tab = await getActiveTab();
    if (!tab || !isArxivAbsPage(tab.url)) {
      elements.title.textContent = "Unsupported page";
      setStatus("Open an arXiv abstract page first.", "error");
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
  setStatus("Opening Obsidian...");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CLIP_PAPER",
      paper: currentPaper
    });

    if (!response || !response.ok) {
      throw new Error(response ? response.error : "No response from background worker.");
    }

    setStatus(`Opened ${response.filePath}`, "success");
  } catch (error) {
    elements.clipButton.disabled = false;
    setStatus(error.message || "Could not open Obsidian.", "error");
  }
});

elements.optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
