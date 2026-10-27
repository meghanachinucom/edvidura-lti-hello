"""EPUB3 archive parsing, security validation, and safe extraction module.

Follows strict security controls:
- Rejects ZIP slips (path traversal, absolute paths)
- Rejects symlinks/hardlinks
- Enforces file size limits and zip bomb expansion ratio checks
- Validates META-INF/container.xml and OPF package document
"""
from __future__ import annotations

import hashlib
import io
import os
import re
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET
import zipfile

# Security constants
MAX_EPUB_FILE_SIZE = 50 * 1024 * 1024  # 50 MB total archive file size
MAX_SINGLE_EXTRACTED_FILE_SIZE = 20 * 1024 * 1024  # 20 MB max per file
MAX_TOTAL_UNCOMPRESSED_SIZE = 100 * 1024 * 1024  # 100 MB total uncompressed
MAX_EXPANSION_RATIO = 100.0  # Zip bomb protection ratio threshold

NAMESPACES = {
    "container": "urn:oasis:names:tc:opendocument:xmlns:container",
    "opf": "http://www.idpf.org/2007/opf",
    "dc": "http://purl.org/dc/elements/1.1/",
    "xhtml": "http://www.w3.org/1999/xhtml",
    "ncx": "http://www.daisy.org/z3986/2005/ncx/",
}


class EPUBValidationError(ValueError):
    """Raised when an EPUB file fails structural or security validation."""


def validate_and_extract_epub(
    file_bytes: bytes,
    *,
    target_dir: str | Path,
    max_archive_size: int = MAX_EPUB_FILE_SIZE,
) -> tuple[dict[str, Any], str]:
    """
    Validate EPUB archive bytes, verify OPF manifest/spine, safely extract files,
    and return (epub_manifest_dict, sha256_hash).
    """
    if not file_bytes:
        raise EPUBValidationError("EPUB file is empty")
    if len(file_bytes) > max_archive_size:
        raise EPUBValidationError(
            f"EPUB file exceeds maximum allowed size of {max_archive_size // (1024*1024)}MB"
        )

    sha256_hash = hashlib.sha256(file_bytes).hexdigest()

    try:
        zf = zipfile.ZipFile(io.BytesIO(file_bytes))
    except Exception as exc:
        raise EPUBValidationError(f"Invalid ZIP archive: {exc}") from exc

    # Security check on archive entries before extraction
    total_uncompressed = 0
    infolist = zf.infolist()
    if not infolist:
        raise EPUBValidationError("EPUB archive is empty")

    for info in infolist:
        filename = info.filename
        # Check path traversal
        if ".." in filename.split("/") or ".." in filename.split("\\"):
            raise EPUBValidationError(f"Path traversal detected in entry: {filename}")
        if filename.startswith("/") or filename.startswith("\\") or re.match(r"^[a-zA-Z]:", filename):
            raise EPUBValidationError(f"Absolute path detected in entry: {filename}")
        # Check suspicious symlink attributes (Unix external_attr & 0o120000 == 0o120000)
        if (info.external_attr >> 16) & 0o120000 == 0o120000:
            raise EPUBValidationError(f"Symlink entry rejected: {filename}")
        # Check file sizes
        if info.file_size > MAX_SINGLE_EXTRACTED_FILE_SIZE:
            raise EPUBValidationError(
                f"Archive entry {filename} exceeds maximum single file size"
            )
        total_uncompressed += info.file_size
        if total_uncompressed > MAX_TOTAL_UNCOMPRESSED_SIZE:
            raise EPUBValidationError(
                "Total uncompressed EPUB archive size exceeds maximum limit"
            )
        # Zip bomb expansion ratio check for compressed entries
        if info.compress_size > 1000 and info.file_size > 100 * 1024:
            ratio = info.file_size / float(info.compress_size)
            if ratio > MAX_EXPANSION_RATIO:
                raise EPUBValidationError(
                    f"Excessive expansion ratio detected for entry {filename} ({ratio:.1f}x)"
                )

    # Validate META-INF/container.xml
    container_entry = None
    for name in zf.namelist():
        if name.lower() == "meta-inf/container.xml":
            container_entry = name
            break
    if not container_entry:
        raise EPUBValidationError("Missing META-INF/container.xml in EPUB archive")

    try:
        container_xml = zf.read(container_entry).decode("utf-8", errors="replace")
        container_root = ET.fromstring(container_xml)
    except Exception as exc:
        raise EPUBValidationError(f"Malformed META-INF/container.xml: {exc}") from exc

    # Locate OPF rootfile
    rootfile_path = None
    for rootfile in container_root.findall(".//{*}rootfile"):
        media_type = rootfile.attrib.get("media-type", "")
        if media_type == "application/oebps-package+xml" or rootfile.attrib.get("full-path"):
            rootfile_path = rootfile.attrib.get("full-path")
            if rootfile_path:
                break

    if not rootfile_path:
        raise EPUBValidationError("Could not find OPF rootfile path in container.xml")

    # Read OPF
    opf_entry = None
    for name in zf.namelist():
        if name.lower() == rootfile_path.lower():
            opf_entry = name
            break
    if not opf_entry:
        raise EPUBValidationError(f"OPF package file missing at path: {rootfile_path}")

    try:
        opf_xml = zf.read(opf_entry).decode("utf-8", errors="replace")
        opf_root = ET.fromstring(opf_xml)
    except Exception as exc:
        raise EPUBValidationError(f"Malformed OPF XML package document: {exc}") from exc

    # Parse OPF package document
    manifest = parse_opf_package(opf_root, opf_path=rootfile_path, zf=zf)

    # Safe extraction into target_dir
    target_path = Path(target_dir).resolve()
    target_path.mkdir(parents=True, exist_ok=True)
    real_target_dir = os.path.realpath(target_path)

    for info in zf.infolist():
        # Canonicalize target location
        out_filepath = os.path.realpath(os.path.join(real_target_dir, info.filename))
        common = os.path.commonpath([real_target_dir, out_filepath])
        if common != real_target_dir:
            raise EPUBValidationError(f"Path traversal during extraction: {info.filename}")

        if info.filename.endswith("/") or info.filename.endswith("\\"):
            os.makedirs(out_filepath, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(out_filepath), exist_ok=True)
            with zf.open(info) as src, open(out_filepath, "wb") as dst:
                chunk = src.read(64 * 1024)
                while chunk:
                    dst.write(chunk)
                    chunk = src.read(64 * 1024)

    return manifest, sha256_hash


def parse_opf_package(
    opf_root: ET.Element, *, opf_path: str, zf: zipfile.ZipFile
) -> dict[str, Any]:
    """Parse OPF XML element tree and return structured manifest dictionary."""
    opf_dir = os.path.dirname(opf_path).replace("\\", "/").strip("/")

    # Metadata
    title = "Untitled eBook"
    creator = ""
    description = ""
    language = "en"

    metadata_el = opf_root.find(".//{*}metadata")
    if metadata_el is not None:
        for child in metadata_el:
            tag = child.tag.split("}")[-1]
            text = (child.text or "").strip()
            if tag == "title" and text:
                title = text
            elif tag == "creator" and text:
                creator = text
            elif tag == "description" and text:
                description = text
            elif tag == "language" and text:
                language = text

    # Manifest items
    items_by_id: dict[str, dict[str, str]] = {}
    cover_href: str | None = None
    nav_href: str | None = None
    ncx_href: str | None = None

    manifest_el = opf_root.find(".//{*}manifest")
    if manifest_el is None:
        raise EPUBValidationError("OPF missing manifest element")

    for item in manifest_el.findall("{*}item"):
        item_id = item.attrib.get("id", "")
        href = item.attrib.get("href", "")
        media_type = item.attrib.get("media-type", "")
        properties = item.attrib.get("properties", "")

        if not item_id or not href:
            continue

        # Normalize href relative to OPF directory
        if opf_dir:
            full_href = f"{opf_dir}/{href}"
        else:
            full_href = href

        items_by_id[item_id] = {
            "id": item_id,
            "href": href,
            "full_href": full_href,
            "media_type": media_type,
            "properties": properties,
        }

        if "nav" in properties.split():
            nav_href = full_href
        if media_type == "application/x-dtbncx+xml" or item_id == "ncx":
            ncx_href = full_href
        if "cover-image" in properties.split() or "cover" in item_id.lower():
            cover_href = full_href

    # Spine
    spine_el = opf_root.find(".//{*}spine")
    if spine_el is None:
        raise EPUBValidationError("OPF missing spine element")

    spine_items: list[dict[str, str]] = []
    for itemref in spine_el.findall("{*}itemref"):
        idref = itemref.attrib.get("idref", "")
        if idref in items_by_id:
            spine_items.append(items_by_id[idref])

    if not spine_items:
        raise EPUBValidationError("OPF spine contains no valid itemrefs")

    # Table of Contents parsing
    toc_items: list[dict[str, str]] = []
    if nav_href:
        toc_items = _parse_nav_toc(nav_href, zf)
    elif ncx_href:
        toc_items = _parse_ncx_toc(ncx_href, zf)

    # Fallback TOC from spine items if NAV/NCX gave nothing
    if not toc_items:
        for idx, item in enumerate(spine_items, start=1):
            fname = os.path.basename(item["href"])
            title_guess = fname.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title()
            toc_items.append({
                "title": f"Chapter {idx}: {title_guess}" if title_guess else f"Chapter {idx}",
                "href": item["full_href"],
                "slug": f"chap-{idx}",
            })

    return {
        "title": title,
        "creator": creator,
        "description": description,
        "language": language,
        "opf_path": opf_path,
        "opf_dir": opf_dir,
        "cover_href": cover_href,
        "spine": spine_items,
        "toc": toc_items,
        "manifest_items": list(items_by_id.values()),
    }


def _parse_nav_toc(nav_href: str, zf: zipfile.ZipFile) -> list[dict[str, str]]:
    """Parse EPUB3 NAV XHTML TOC."""
    toc: list[dict[str, str]] = []
    nav_entry = None
    for name in zf.namelist():
        if name.lower() == nav_href.lower():
            nav_entry = name
            break
    if not nav_entry:
        return toc

    try:
        content = zf.read(nav_entry).decode("utf-8", errors="replace")
        root = ET.fromstring(content)
        nav_dir = os.path.dirname(nav_href).replace("\\", "/").strip("/")

        for a in root.findall(".//{*}a"):
            text = "".join(a.itertext()).strip()
            href = a.attrib.get("href", "").strip()
            if text and href:
                full_href = f"{nav_dir}/{href}" if nav_dir and not href.startswith("/") else href
                slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50] or "section"
                toc.append({"title": text, "href": full_href, "slug": slug})
    except Exception:
        pass
    return toc


def _parse_ncx_toc(ncx_href: str, zf: zipfile.ZipFile) -> list[dict[str, str]]:
    """Parse EPUB2 NCX TOC."""
    toc: list[dict[str, str]] = []
    ncx_entry = None
    for name in zf.namelist():
        if name.lower() == ncx_href.lower():
            ncx_entry = name
            break
    if not ncx_entry:
        return toc

    try:
        content = zf.read(ncx_entry).decode("utf-8", errors="replace")
        root = ET.fromstring(content)
        ncx_dir = os.path.dirname(ncx_href).replace("\\", "/").strip("/")

        for navpoint in root.findall(".//{*}navPoint"):
            label_el = navpoint.find(".//{*}text")
            content_el = navpoint.find(".//{*}content")
            if label_el is not None and content_el is not None:
                text = (label_el.text or "").strip()
                src = content_el.attrib.get("src", "").strip()
                if text and src:
                    full_href = f"{ncx_dir}/{src}" if ncx_dir and not src.startswith("/") else src
                    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50] or "section"
                    toc.append({"title": text, "href": full_href, "slug": slug})
    except Exception:
        pass
    return toc
