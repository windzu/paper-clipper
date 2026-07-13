importScripts("../shared/paper-schema.js", "obsidian-client.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, (config) => {
    const defaultPaperStatus = PaperClipperSchema.normalizePaperStatus(
      config.defaultPaperStatus || config.defaultStatus
    );

    chrome.storage.sync.set({
      ...PaperClipperObsidian.DEFAULT_CONFIG,
      ...config,
      defaultPaperStatus
    }, () => {
      chrome.storage.sync.remove("defaultStatus");
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    message.type !== "CLIP_PAPER" &&
    message.type !== "OPEN_NOTE" &&
    message.type !== "CREATE_BASE"
  ) {
    return false;
  }

  (async () => {
    const config = await chrome.storage.sync.get(PaperClipperObsidian.DEFAULT_CONFIG);

    if (message.type === "CREATE_BASE") {
      if (!config.vaultName) {
        sendResponse({
          ok: false,
          error: "Missing Obsidian vault name. Open options and set vaultName first."
        });
        return;
      }

      const uri = PaperClipperObsidian.buildObsidianNewUri(
        config,
        "PaperClipper.base",
        message.content || ""
      );

      chrome.tabs.create({ url: uri }, () => {
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
          filePath: "PaperClipper.base"
        });
      });
      return;
    }

    if (message.type === "OPEN_NOTE") {
      if (!config.vaultName) {
        sendResponse({
          ok: false,
          error: "Missing Obsidian vault name. Open options and set vaultName first."
        });
        return;
      }

      if (!message.filePath) {
        sendResponse({
          ok: false,
          error: "Missing filePath when opening existing note."
        });
        return;
      }

      const uri = PaperClipperObsidian.buildObsidianOpenUri(config, message.filePath || "");
      chrome.tabs.create({ url: uri }, () => {
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
          filePath: message.filePath
        });
      });
      return;
    }

    if (message.type !== "CLIP_PAPER") {
      return;
    }

    if (!config.vaultName) {
      sendResponse({
        ok: false,
        error: "Missing Obsidian vault name. Open options and set vaultName first."
      });
      return;
    }

    const target = await PaperClipperObsidian.buildClipTarget(config, message.paper);
    const duplicate = await PaperClipperObsidian.checkImported(config, target.resolvedPaper);

    if (duplicate.exists) {
      sendResponse({
        ok: false,
        reason: "DUPLICATE",
        error: "This paper has already been imported.",
        filePath: target.filePath,
        vaultName: config.vaultName,
        existed: duplicate.record
      });
      return;
    }

    chrome.tabs.create({ url: target.uri }, async () => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        sendResponse({
          ok: false,
          error: runtimeError.message
        });
        return;
      }

      await PaperClipperObsidian.markImported(config, target.resolvedPaper);

      sendResponse({
        ok: true,
        filePath: target.filePath
      });
    });
  })().catch((error) => {
    sendResponse({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  });

  return true;
});
