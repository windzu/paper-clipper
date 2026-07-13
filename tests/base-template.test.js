const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const template = fs.readFileSync(
  path.join(__dirname, "..", "templates", "PaperClipper.base"),
  "utf8"
);

test("uses property identifiers instead of display names in base views", () => {
  assert.match(template, /^  note\.paper_status:$/m);
  assert.match(template, /^      - short_title$/m);
  assert.match(template, /^      - paper_status$/m);
  assert.match(template, /^      - property: publish_date$/m);
  assert.doesNotMatch(template, /^\s+- (ShortTitle|Title|Status|Category|PublishDate|Abstract)$/m);
});

test("uses only the namespaced paper status in base filters", () => {
  assert.match(template, /note\.paper_status == "To Read"/);
  assert.match(template, /note\.paper_status == "Reading"/);
  assert.match(template, /note\.paper_status == "Done"/);
  assert.doesNotMatch(template, /note\.status/);
});
