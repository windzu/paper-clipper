# Paper Clipper Privacy Policy

Last updated: September 4, 2026

Paper Clipper is a browser extension that turns arXiv paper pages into structured Markdown notes for Obsidian. This policy explains what data the extension processes and how that data is handled.

## Data processed by the extension

Paper Clipper processes the following data only to provide its paper-clipping features:

- The URL and public paper metadata from the active arXiv or ar5iv page, including title, authors, abstract, publication date, and paper identifiers.
- The Obsidian vault name, target folder, and default paper status entered in the extension settings.
- A local index of papers previously imported through the extension.
- A user-selected paper-folder handle, when the user chooses to rebuild the local import index from existing Markdown notes.

## How data is used

The extension uses this data to:

- Preview and generate a structured Markdown paper note.
- Verify whether an official arXiv or ar5iv HTML page is available.
- Open Obsidian through its local `obsidian://` protocol to create or open a note.
- Detect likely duplicate imports within the configured vault and folder.
- Create the bundled `PaperClipper.base` definition in Obsidian when requested by the user.

## Storage and transmission

- Extension settings are stored with Chrome's extension storage APIs. Chrome may synchronize settings through the user's signed-in Chrome profile when browser synchronization is enabled.
- The import index is stored locally in the browser.
- A selected folder handle is stored locally in the browser and is used with read-only access for rebuilding the import index.
- Generated note content is sent only to the locally installed Obsidian application through the `obsidian://` protocol after the user initiates a clip action.
- Network requests are limited to public paper resources on `arxiv.org` and `ar5iv.labs.arxiv.org` that are required to retrieve or verify paper metadata and links.

Paper Clipper does not operate a developer-controlled backend and does not transmit paper data, vault settings, browsing activity, or generated notes to the developer. It does not use analytics, advertising, tracking, or remotely hosted executable code.

## Data sharing and sale

Paper Clipper does not sell user data. The extension does not share user data with advertisers, data brokers, the developer, or developer-operated services. Public paper metadata is requested from arXiv or ar5iv only as necessary to provide the extension's user-facing functionality. If Chrome Sync is enabled, Google may synchronize the extension settings as part of the user's Chrome account; that service is governed by Google's privacy policy.

## Limited use

Paper Clipper's use of information received through Chrome extension APIs complies with the Chrome Web Store User Data Policy, including its Limited Use requirements. The extension uses data only to provide or improve its clearly described paper-clipping features. It does not use or transfer data for personalized advertising, creditworthiness or lending decisions, or other unrelated purposes. Apart from Chrome Sync when enabled, the required public arXiv/ar5iv requests, and the user-initiated local Obsidian handoff described above, no data is transferred. The developer does not receive the data, so it is not available for human review.

## Data retention and deletion

Settings and local import records remain in Chrome extension storage until the user clears the extension's data or uninstalls the extension. The user can revoke a saved folder permission through browser or operating-system controls. Notes already created in Obsidian remain under the user's control in their vault.

## Permissions

- `activeTab`: lets the extension inspect the current tab only after the user invokes Paper Clipper.
- `scripting`: runs the packaged arXiv parser in the active tab.
- `storage`: saves extension settings and the local import index.
- Access to `https://arxiv.org/*` and `https://ar5iv.labs.arxiv.org/*`: retrieves and verifies public paper metadata and HTML links.

## Changes to this policy

Material changes to data handling will be disclosed in the extension and reflected in this policy before the changed behavior is released.

## Contact

For privacy questions or support, open an issue at <https://github.com/windzu/paper-clipper/issues>.
