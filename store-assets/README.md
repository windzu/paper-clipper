# Chrome Web Store Assets

These files are ready for upload to the Chrome Web Store developer dashboard:

| Dashboard field | File | Required |
| --- | --- | --- |
| Store icon | `../icons/icon128.png` | Yes; included in the extension ZIP |
| Screenshot 1 | `screenshot-01-clip.png` | Yes |
| Screenshot 2 | `screenshot-02-options.png` | Recommended |
| Small promo tile | `promo-small-440x280.png` | Yes |
| Marquee promo tile | `promo-marquee-1400x560.png` | Optional |

The screenshots were captured from the unpacked release running in a clean Chrome for Testing profile with public arXiv paper `1706.03762` and the non-private `Test Vault` configuration. Screenshot 1 combines the live arXiv page capture and the live extension popup capture from the same test session; screenshot 2 is a direct capture of the live options page.

Editable HTML sources for the promotional images are in `sources/`. Run `../scripts/render_chrome_web_store_assets.sh` on macOS to regenerate the two promo PNG files with Google Chrome. Set `CHROME_BINARY` to override the default Chrome path.

After any visible extension UI change, capture the screenshots again from the running release. After a branding change, update the promo source files and regenerate the promo images so that the listing continues to represent the current product accurately.
