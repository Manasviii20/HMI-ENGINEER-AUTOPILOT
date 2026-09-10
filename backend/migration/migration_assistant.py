"""Migration Assistant -- generic tag-list import/export.

IMPORTANT (see README limitations): a real Schneider EOTE project export/
import format spec, SDK, or sample project file was not available to this
project, so migrating an actual native EOTE project is explicitly out of
scope -- attempting it would mean fabricating a file-format understanding
this project cannot verify.

What this DOES do, honestly: import a generic CSV/JSON tag list (the kind
any control system can export) into the current neutral project
representation, and export the current project's tags back out the same
way. This is a real, useful migration primitive -- just scoped to tag
metadata via a vendor-neutral interchange format, not a full proprietary
project file.
"""
import csv
import io
import json

from backend.models.project import Project, Tag

CSV_COLUMNS = ["name", "data_type", "unit", "description", "source"]
VALID_DATA_TYPES = {"BOOL", "INT", "REAL", "STRING"}


def export_tags_csv(project: Project) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=CSV_COLUMNS)
    writer.writeheader()
    for tag in project.tags:
        writer.writerow({
            "name": tag.name, "data_type": tag.data_type,
            "unit": tag.unit or "", "description": tag.description or "", "source": tag.source or "",
        })
    return buf.getvalue()


def import_tags_csv(project: Project, csv_text: str) -> dict:
    """Adds new tags parsed from a CSV (name,data_type[,unit,description,source]).
    Never overwrites or invents fields for an existing tag -- rows referencing
    an already-existing tag name are skipped and reported, not merged."""
    existing_names = {t.name for t in project.tags}
    added: list[str] = []
    skipped: list[dict] = []

    reader = csv.DictReader(io.StringIO(csv_text))
    if reader.fieldnames is None or "name" not in [f.strip().lower() for f in reader.fieldnames]:
        raise ValueError("CSV must have a 'name' column (data_type, unit, description, source optional)")

    for i, row in enumerate(reader, start=2):
        name = (row.get("name") or "").strip()
        if not name:
            skipped.append({"row": i, "reason": "missing name"})
            continue
        if name in existing_names:
            skipped.append({"row": i, "name": name, "reason": "tag already exists"})
            continue
        data_type = (row.get("data_type") or "REAL").strip().upper()
        if data_type not in VALID_DATA_TYPES:
            skipped.append({"row": i, "name": name, "reason": f"invalid data_type '{data_type}'"})
            continue
        tag = Tag(
            name=name, data_type=data_type,
            unit=(row.get("unit") or "").strip() or None,
            description=(row.get("description") or "").strip() or None,
            source=(row.get("source") or "IMPORTED").strip() or "IMPORTED",
        )
        project.tags.append(tag)
        existing_names.add(name)
        added.append(name)

    return {"added": added, "skipped": skipped, "added_count": len(added), "skipped_count": len(skipped)}


def import_tags_json(project: Project, json_text: str) -> dict:
    """Same semantics as import_tags_csv but for a JSON array of tag objects."""
    try:
        rows = json.loads(json_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")
    if not isinstance(rows, list):
        raise ValueError("JSON must be an array of tag objects")

    existing_names = {t.name for t in project.tags}
    added: list[str] = []
    skipped: list[dict] = []

    for i, row in enumerate(rows):
        if not isinstance(row, dict) or not row.get("name"):
            skipped.append({"row": i, "reason": "missing name"})
            continue
        name = str(row["name"]).strip()
        if name in existing_names:
            skipped.append({"row": i, "name": name, "reason": "tag already exists"})
            continue
        data_type = str(row.get("data_type", "REAL")).upper()
        if data_type not in VALID_DATA_TYPES:
            skipped.append({"row": i, "name": name, "reason": f"invalid data_type '{data_type}'"})
            continue
        tag = Tag(
            name=name, data_type=data_type,
            unit=row.get("unit"), description=row.get("description"),
            source=row.get("source", "IMPORTED"),
        )
        project.tags.append(tag)
        existing_names.add(name)
        added.append(name)

    return {"added": added, "skipped": skipped, "added_count": len(added), "skipped_count": len(skipped)}
