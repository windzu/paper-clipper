importScripts("obsidian-client.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(PaperClipperObsidian.DEFAULT_CONFIG, (config) => {
    chrome.storage.sync.set({
      ...PaperClipperObsidian.DEFAULT_CONFIG,
      ...config
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "CLIP_PAPER") return false;

  chrome.storage.sync.get(PaperClipperObsidian.DEFAULT_CONFIG, (config) => {
    if (!config.vaultName) {
      sendResponse({
        ok: false,
        error: "Missing Obsidian vault name. Open options and set vaultName first."
      });
      return;
    }

    const target = PaperClipperObsidian.buildClipTarget(config, message.paper);

    chrome.tabs.create({ url: target.uri }, () => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        sendResponse({
          ok: false,
          error: runtimeError.message
        });
        return;
      }

      sendResponse({
        ok: true,
        filePath: target.filePath
      });
    });
  });

  return true;
});
