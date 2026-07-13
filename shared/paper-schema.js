(function () {
  "use strict";

  const DEFAULT_PAPER_STATUS = "To Read";
  const PAPER_STATUSES = Object.freeze([DEFAULT_PAPER_STATUS, "Reading", "Done"]);
  const LEGACY_PAPER_STATUS_MAP = Object.freeze({
    "To Read": "To Read",
    "In progress": "Reading",
    Reading: "Reading",
    Read: "Done",
    Done: "Done"
  });

  function normalizePaperStatus(status) {
    const normalized = String(status || "").trim();
    return LEGACY_PAPER_STATUS_MAP[normalized] || DEFAULT_PAPER_STATUS;
  }

  self.PaperClipperSchema = {
    DEFAULT_PAPER_STATUS,
    PAPER_STATUSES,
    normalizePaperStatus
  };
})();
