#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from dataclasses import dataclass, asdict
from html import unescape
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

UA = "Mozilla/5.0 paper-html-ingest/0.2"


def read_frontmatter(note: Path) -> dict:
    text = note.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not m:
        raise SystemExit(f"No YAML frontmatter found: {note}")
    fm = {}
    current_key = None
    for raw in m.group(1).splitlines():
        line = raw.rstrip()
        if not line or line.lstrip().startswith("#"):
            continue
        if re.match(r"^[A-Za-z0-9_\-]+:\s*", line):
            key, val = line.split(":", 1)
            current_key = key.strip()
            val = val.strip()
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            fm[current_key] = val
        elif line.strip().startswith("-") and current_key:
            fm.setdefault(current_key, [])
    return fm


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", unescape(s or "")).strip()


def ext_from_url(url: str, default: str = ".png") -> str:
    path = urlparse(url).path
    ext = Path(path).suffix.lower()
    if ext in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}:
        return ext
    return default


def alpha(n: int) -> str:
    return chr(ord("a") + n)


def slugify(text: str, fallback: str, max_words: int = 4) -> str:
    cleaned = re.sub(r"(?i)\b(fig(?:ure)?|table)\s+\d+[\.:]?", " ", text or "")
    words = re.findall(r"[a-zA-Z0-9]+", cleaned.lower())
    stop = {
        "a", "an", "and", "are", "as", "by", "for", "from", "in", "is",
        "of", "on", "or", "our", "the", "to", "with", "we"
    }
    picked = [w for w in words if w not in stop][:max_words]
    return "-".join(picked) if picked else fallback


def figure_filename(fig_no: str | None, caption: str, ext: str, fallback_idx: int, part_idx: int | None = None) -> str:
    if fig_no:
        slug = slugify(caption, "figure")
        suffix = f"-{alpha(part_idx)}" if part_idx is not None else ""
        return f"fig{int(fig_no):02d}-{slug}{suffix}{ext}"
    slug = slugify(caption, "image")
    return f"img{fallback_idx:02d}-{slug}{ext}"


def table_filename(table_no: str, caption: str) -> str:
    slug = slugify(caption, "table")
    return f"table{int(table_no):02d}-{slug}.png"


def note_relative_asset_path(note: Path, asset_path: Path) -> str:
    return asset_path.relative_to(note.parent).as_posix()


def markdown_embed(note: Path, asset_path: Path, alt: str) -> str:
    return f"![{alt}]({note_relative_asset_path(note, asset_path)})"


@dataclass
class ImageItem:
    figure_no: str | None
    filename: str
    local_path: str
    note_relative_path: str
    embed: str
    source_url: str
    caption: str
    bytes: int
    width: int | None = None
    height: int | None = None


@dataclass
class TableItem:
    table_no: str
    filename: str
    local_path: str
    note_relative_path: str
    embed: str
    page: int
    bbox_pdf: list[float]
    caption: str
    crop_status: str
    bytes: int
    width: int | None = None
    height: int | None = None


def image_size(path: Path):
    try:
        from PIL import Image
        with Image.open(path) as im:
            return im.width, im.height
    except Exception:
        return None, None


def render_pdf_page(pdf_path: Path, page_index: int, scale: float = 3.0):
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(str(pdf_path))
    page = pdf[page_index]
    bitmap = page.render(scale=scale).to_pil()
    pdf.close()
    return bitmap


def find_table_captions(page):
    words = page.extract_words(x_tolerance=1, y_tolerance=3, keep_blank_chars=False)
    captions = []
    for i, w in enumerate(words[:-1]):
        if w.get("text") != "Table":
            continue
        nxt = words[i + 1].get("text", "")
        m = re.match(r"(\d+)[:.]?", nxt)
        if not m:
            continue
        no = m.group(1)
        top = float(w["top"])
        # Collect caption words on the same and immediately following caption lines, stopping before table body.
        cap_words = [ww for ww in words if top - 2 <= float(ww["top"]) <= top + 28]
        cap_words = sorted(cap_words, key=lambda x: (x["top"], x["x0"]))
        caption = clean_text(" ".join(ww["text"] for ww in cap_words))
        captions.append({"table_no": no, "top": top, "x0": float(w["x0"]), "caption": caption})
    # Deduplicate false repeats.
    uniq = []
    seen = set()
    for c in captions:
        key = (c["table_no"], round(c["top"], 1))
        if key not in seen:
            uniq.append(c); seen.add(key)
    return sorted(uniq, key=lambda c: c["top"])



def line_gap_bottom(page, y0: float, y_limit: float, gap_threshold: float = 22.0):
    words = [w for w in page.extract_words(x_tolerance=1, y_tolerance=3, keep_blank_chars=False) if y0 <= float(w["top"]) < y_limit]
    if not words:
        return None
    lines = []
    for w in sorted(words, key=lambda x: (float(x["top"]), float(x["x0"]))):
        top = float(w["top"]); bottom = float(w["bottom"])
        if not lines or abs(lines[-1][0] - top) > 2.0:
            lines.append([top, bottom])
        else:
            lines[-1][1] = max(lines[-1][1], bottom)
    prev_top, prev_bottom = lines[0]
    for top, bottom in lines[1:]:
        # Wait until after the caption/header region before accepting a large blank gap.
        if prev_top > y0 + 55 and top - prev_top > gap_threshold:
            return prev_bottom + 10
        prev_top, prev_bottom = top, bottom
    return None

def crop_tables_from_pdf(pdf_path: Path, out_dir: Path, note: Path, force: bool = False):
    import pdfplumber
    tables: list[TableItem] = []
    warnings: list[str] = []
    scale = 3.0
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            captions = find_table_captions(page)
            # Ignore appendix Table of Contents false positive.
            captions = [c for c in captions if f"Table {c['table_no']}" in c["caption"]]
            if not captions:
                continue
            try:
                line_tables = page.find_tables(table_settings={"vertical_strategy":"lines", "horizontal_strategy":"lines"})
            except Exception:
                line_tables = []
            bboxes = [tuple(map(float, t.bbox)) for t in line_tables]
            page_img = None
            for idx, cap in enumerate(captions):
                no = cap["table_no"]
                next_top = captions[idx + 1]["top"] if idx + 1 < len(captions) else page.height - 55
                y0 = max(0, cap["top"] - 6)
                # Prefer detected table ruling boxes that fall between this caption and next table caption.
                seg_boxes = [b for b in bboxes if b[1] >= cap["top"] - 2 and b[1] < next_top - 2]
                if seg_boxes:
                    x0 = max(0, min([b[0] for b in seg_boxes] + [cap["x0"]]) - 10)
                    x1 = min(page.width, max([b[2] for b in seg_boxes] + [520]) + 10)
                    y1 = min(page.height, max(b[3] for b in seg_boxes) + 16)
                    gap_y1 = line_gap_bottom(page, y0, next_top)
                    if gap_y1 is not None and gap_y1 > y0 + 80:
                        y1 = min(y1, gap_y1)
                    status = "cropped"
                else:
                    # Fallback: crop from caption to the next caption / lower page region.
                    x0, x1 = 70, page.width - 70
                    gap_y1 = line_gap_bottom(page, y0, next_top)
                    y1 = min(page.height - 55, next_top - 6, gap_y1 if gap_y1 is not None else page.height)
                    status = "page_segment_fallback"
                # Keep a reasonable minimum crop height to include multi-line captions.
                if y1 - y0 < 60:
                    y1 = min(page.height - 55, y0 + 120)
                    status = "expanded_fallback"
                filename = table_filename(no, cap["caption"])
                dest = out_dir / filename
                if not dest.exists() or force:
                    if page_img is None:
                        page_img = render_pdf_page(pdf_path, page_idx, scale=scale)
                    crop_box = (int(x0 * scale), int(y0 * scale), int(x1 * scale), int(y1 * scale))
                    cropped = page_img.crop(crop_box)
                    cropped.save(dest)
                w, h = image_size(dest)
                alt = f"table {no}"
                tables.append(TableItem(
                    table_no=no,
                    filename=filename,
                    local_path=str(dest),
                    note_relative_path=note_relative_asset_path(note, dest),
                    embed=markdown_embed(note, dest, alt),
                    page=page_idx + 1,
                    bbox_pdf=[round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)],
                    caption=cap["caption"],
                    crop_status=status,
                    bytes=dest.stat().st_size if dest.exists() else 0,
                    width=w,
                    height=h,
                ))
    return tables, warnings


def parse_args():
    ap = argparse.ArgumentParser(description="Ingest arXiv HTML figures and PDF table screenshots into a paper asset folder.")
    ap.add_argument("note", help="Vault-relative paper note path, e.g. Papers/arXiv/2410.22461.md")
    ap.add_argument("--force", action="store_true", help="Overwrite existing image/table files")
    ap.add_argument("--no-pdf", action="store_true", help="Skip PDF download and table screenshots")
    return ap.parse_args()


def main():
    args = parse_args()
    note = Path(args.note)
    if not note.exists():
        raise SystemExit(f"Note not found: {note}")

    fm = read_frontmatter(note)
    html_url = fm.get("html_url")
    pdf_url = fm.get("pdf_url")
    arxiv_id = fm.get("arxiv_id")
    if not html_url:
        raise SystemExit("frontmatter missing html_url")
    if not arxiv_id:
        m = re.search(r"(\d{4}\.\d{4,5})(?:v\d+)?", html_url)
        if not m:
            raise SystemExit("frontmatter missing arxiv_id and cannot infer from html_url")
        arxiv_id = m.group(1)

    out_dir = Path("Papers/arXiv/assets") / arxiv_id
    out_dir.mkdir(parents=True, exist_ok=True)

    html = fetch(html_url)
    (out_dir / "_source.html").write_bytes(html)
    soup = BeautifulSoup(html, "html.parser")

    sections = [clean_text(h.get_text(" ", strip=True)) for h in soup.find_all(["h1", "h2", "h3"]) if clean_text(h.get_text(" ", strip=True))]

    images: list[ImageItem] = []
    seen_src: set[str] = set()
    warnings: list[str] = []
    html_table_count = 0
    fallback_idx = 1

    figures = soup.find_all("figure")
    for fig in figures:
        cap_el = fig.find("figcaption")
        caption = clean_text(cap_el.get_text(" ", strip=True)) if cap_el else ""
        imgs = [im for im in fig.find_all("img") if im.get("src") and not im.get("src", "").startswith("data:")]
        if not imgs:
            if caption.lower().startswith("table") or fig.find("table"):
                html_table_count += 1
            continue

        m = re.search(r"Figure\s+(\d+)", caption, re.I)
        fig_no = m.group(1) if m else None

        for i, img in enumerate(imgs):
            src = img.get("src")
            source_url = urljoin(html_url.rstrip("/") + "/", src)
            if source_url in seen_src:
                continue
            seen_src.add(source_url)
            ext = ext_from_url(source_url)
            if fig_no:
                filename = figure_filename(fig_no, caption, ext, fallback_idx, i if len(imgs) > 1 else None)
            else:
                filename = figure_filename(None, caption, ext, fallback_idx)
                fallback_idx += 1
            dest = out_dir / filename
            if dest.exists() and not args.force:
                data_len = dest.stat().st_size
            else:
                try:
                    data = fetch(source_url)
                    dest.write_bytes(data)
                    data_len = len(data)
                except Exception as e:
                    warnings.append(f"failed to download {source_url}: {e}")
                    continue
            w, h = image_size(dest)
            local = dest.as_posix()
            alt = f"figure {fig_no}" if fig_no else Path(filename).stem
            images.append(ImageItem(
                figure_no=fig_no,
                filename=filename,
                local_path=local,
                note_relative_path=note_relative_asset_path(note, dest),
                embed=markdown_embed(note, dest, alt),
                source_url=source_url,
                caption=caption,
                bytes=data_len,
                width=w,
                height=h,
            ))

    pdf_path = out_dir / "_source.pdf"
    table_items: list[TableItem] = []
    if pdf_url and not args.no_pdf:
        try:
            if not pdf_path.exists() or args.force:
                pdf_path.write_bytes(fetch(pdf_url))
            table_items, table_warnings = crop_tables_from_pdf(pdf_path, out_dir, note, force=args.force)
            warnings.extend(table_warnings)
        except Exception as e:
            warnings.append(f"PDF table screenshot failed: {e}")

    manifest = {
        "note": str(note),
        "arxiv_id": arxiv_id,
        "html_url": html_url,
        "pdf_url": pdf_url or "",
        "asset_dir": out_dir.as_posix(),
        "source_html": (out_dir / "_source.html").as_posix(),
        "source_pdf": pdf_path.as_posix() if pdf_path.exists() else "",
        "sections": sections,
        "figures": [asdict(x) for x in images],
        "html_tables_detected": html_table_count,
        "tables": [asdict(x) for x in table_items],
        "warnings": warnings,
    }
    (out_dir / "_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    md = []
    md.append(f"# Paper assets: {arxiv_id}\n")
    md.append(f"- Note: [[{note.as_posix()}]]")
    md.append(f"- HTML: {html_url}")
    if pdf_url:
        md.append(f"- PDF: {pdf_url}")
    md.append(f"- Asset dir: `{out_dir.as_posix()}`")
    md.append(f"- Source HTML: `{(out_dir / '_source.html').as_posix()}`")
    if pdf_path.exists():
        md.append(f"- Source PDF: `{pdf_path.as_posix()}`")
    md.append(f"- Figures downloaded: {len(images)}")
    md.append(f"- HTML tables detected: {html_table_count}")
    md.append(f"- Table screenshots: {len(table_items)}\n")
    md.append("## Sections\n")
    for s in sections:
        md.append(f"- {s}")
    md.append("\n## Figures\n")
    for item in images:
        size = f"{item.width}×{item.height}" if item.width and item.height else "unknown"
        mb = item.bytes / 1024 / 1024
        label = f"Figure {item.figure_no}" if item.figure_no else item.filename
        md.append(f"### {label}\n")
        md.append(item.embed)
        md.append("")
        md.append(f"- File: `{item.local_path}`")
        md.append(f"- Size: {size}, {mb:.2f} MB")
        md.append(f"- Source: {item.source_url}")
        if item.caption:
            md.append(f"- Caption: {item.caption}")
        md.append("")
    md.append("\n## Tables\n")
    for item in table_items:
        size = f"{item.width}×{item.height}" if item.width and item.height else "unknown"
        mb = item.bytes / 1024 / 1024
        md.append(f"### Table {item.table_no}\n")
        md.append(item.embed)
        md.append("")
        md.append(f"- File: `{item.local_path}`")
        md.append(f"- Page: {item.page}")
        md.append(f"- Crop status: `{item.crop_status}`")
        md.append(f"- PDF bbox: `{item.bbox_pdf}`")
        md.append(f"- Size: {size}, {mb:.2f} MB")
        if item.caption:
            md.append(f"- Caption: {item.caption}")
        md.append("")
    if warnings:
        md.append("## Warnings\n")
        for w in warnings:
            md.append(f"- {w}")
    (out_dir / "_manifest.md").write_text("\n".join(md), encoding="utf-8")

    print(json.dumps({
        "note": str(note),
        "arxiv_id": arxiv_id,
        "asset_dir": out_dir.as_posix(),
        "figures_downloaded": len(images),
        "html_tables_detected": html_table_count,
        "table_screenshots": len(table_items),
        "source_pdf": pdf_path.as_posix() if pdf_path.exists() else "",
        "sections": sections[:20],
        "manifest_md": (out_dir / "_manifest.md").as_posix(),
        "manifest_json": (out_dir / "_manifest.json").as_posix(),
        "warnings": warnings,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
