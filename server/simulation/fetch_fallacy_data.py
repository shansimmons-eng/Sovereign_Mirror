#!/usr/bin/env python3
"""
fetch_fallacy_data.py - Download and parse HuggingFace fallacy datasets

Usage:
    python fetch_fallacy_data.py [--output ./fallacy_data.json]
"""

import json
import urllib.request
import argparse
from pathlib import Path

HF_DATASETS = {
    "fallacies-base": "https://huggingface.co/datasets/MrOvkill/fallacies-fallacy-base/resolve/main/fallacies-base.tsv",
    "fallacyfinder": "https://huggingface.co/datasets/SamanthaStorm/fallacyfinder/resolve/main/fallacyfinder.csv",
}


def download_tsv(url: str) -> list[dict]:
    """Download and parse TSV file"""
    print(f"Downloading {url}...")
    import urllib.request

    response = urllib.request.urlopen(url, timeout=30)
    data = response.read().decode("utf-8")

    lines = data.strip().split("\n")
    if not lines:
        return []

    headers = lines[0].split("\t")
    rows = []
    for line in lines[1:]:
        cols = line.split("\t")
        if len(cols) >= len(headers):
            row = {}
            for i, h in enumerate(headers):
                if i < len(cols):
                    row[h] = cols[i].strip()
            rows.append(row)

    return rows


def download_csv(url: str) -> list[dict]:
    """Download and parse CSV file"""
    print(f"Downloading {url}...")
    response = urllib.request.urlopen(url, timeout=30)
    data = response.read().decode("utf-8")

    lines = data.strip().split("\n")
    if not lines:
        return []

    headers = lines[0].split(",")
    rows = []
    for line in lines[1:]:
        cols = line.split(",")
        if len(cols) >= len(headers):
            row = {headers[i]: cols[i].strip('"') for i in range(len(headers))}
            rows.append(row)

    return rows


def normalize_fallacy_name(name: str) -> str:
    """Normalize fallacy name to our format"""
    name = name.lower().strip()
    name = name.replace(" ", "-").replace("_", "-")

    mapping = {
        "ad-hominem": "CU-FALLACY-AD-HOMINEM",
        "ad-populum": "CU-FALLACY-AD-POPULUM",
        "appeal-to-emotion": "CU-FALLACY-EMOTIONAL-REASONING",
        "circular-reasoning": "CU-FALLACY-CIRCULAR-REASONING",
        "equivocation": "CU-FALLACY-EQUIVOCATION",
        "false-cause": "CU-FALLACY-FALSE-CAUSALITY",
        "false-dilemma": "CU-FALLACY-FALSE-DICHOTOMY",
        "faulty-generalization": "CU-FALLACY-FAULTY-GENERALIZATION",
        "hasty-generalization": "CU-FALLACY-FAULTY-GENERALIZATION",
        "straw-man": "CU-FALLACY-STRAWMAN",
        "slippery-slope": "CU-FALLACY-SLIPPERY-SLOPE",
        "tu-quoque": "CU-FALLACY-TU-QUOQUE",
        "bandwagon": "CU-FALLACY-AD-POPULUM",
        "authority": "CU-FALLACY-AUTHORITY",
        "red-herring": "CU-FALLACY-IRRELEVANT",
        "appeal-to-authority": "CU-FALLACY-AUTHORITY",
    }

    return mapping.get(name, f"CU-FALLACY-{name.upper()}")


def process_fallacies_base(rows: list[dict]) -> list[dict]:
    """Process fallacies-base dataset"""
    processed = []

    for row in rows:
        text = row.get("example", "") or row.get("text", "") or row.get("statement", "")
        fallacy_type = (
            row.get("name", "") or row.get("label", "") or row.get("fallacy_type", "")
        )

        if not text or not fallacy_type:
            continue

        processed.append(
            {
                "text": text.strip(),
                "fallacy_type": normalize_fallacy_name(fallacy_type),
                "source": "MrOvkill/fallacies-fallacy-base",
                "original_label": fallacy_type,
                "explanation": row.get("explanation", "") or row.get("description", ""),
                "response": row.get("response", "") or row.get("rebuttal", ""),
            }
        )

    return processed


def process_fallacyfinder(rows: list[dict]) -> list[dict]:
    """Process fallacyfinder dataset"""
    processed = []

    for row in rows:
        text = (
            row.get("text", "") or row.get("statement", "") or row.get("sentence", "")
        )
        fallacy_type = (
            row.get("label", "")
            or row.get("fallacy_type", "")
            or row.get("category", "")
        )

        if not text or not fallacy_type:
            continue

        processed.append(
            {
                "text": text.strip(),
                "fallacy_type": normalize_fallacy_name(fallacy_type),
                "source": "SamanthaStorm/fallacyfinder",
                "original_label": fallacy_type,
                "explanation": row.get("explanation", "") or row.get("description", ""),
                "response": row.get("response", "") or row.get("rebuttal", ""),
            }
        )

    return processed


def main():
    parser = argparse.ArgumentParser(
        description="Fetch fallacy datasets from HuggingFace"
    )
    parser.add_argument(
        "--output", default="./fallacy_data.json", help="Output JSON file path"
    )
    args = parser.parse_args()

    all_entries = []

    # Fetch fallacies-base
    try:
        rows = download_tsv(HF_DATASETS["fallacies-base"])
        processed = process_fallacies_base(rows)
        all_entries.extend(processed)
        print(f"  -> {len(processed)} entries from fallacies-base")
    except Exception as e:
        print(f"  -> Error fetching fallacies-base: {e}")

    # Fetch fallacyfinder
    try:
        rows = download_csv(HF_DATASETS["fallacyfinder"])
        processed = process_fallacyfinder(rows)
        all_entries.extend(processed)
        print(f"  -> {len(processed)} entries from fallacyfinder")
    except Exception as e:
        print(f"  -> Error fetching fallacyfinder: {e}")

    # Deduplicate by text
    seen = set()
    unique_entries = []
    for entry in all_entries:
        text_lower = entry["text"].lower()
        if text_lower not in seen:
            seen.add(text_lower)
            unique_entries.append(entry)

    print(f"\nTotal unique entries: {len(unique_entries)}")

    # Group by fallacy type
    by_type = {}
    for entry in unique_entries:
        ft = entry["fallacy_type"]
        if ft not in by_type:
            by_type[ft] = []
        by_type[ft].append(entry)

    print("\nBy fallacy type:")
    for ft, entries in sorted(by_type.items(), key=lambda x: -len(x[1])):
        print(f"  {ft}: {len(entries)}")

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "entries": unique_entries,
                "by_type": by_type,
                "total": len(unique_entries),
                "sources": [
                    "MrOvkill/fallacies-fallacy-base",
                    "SamanthaStorm/fallacyfinder",
                ],
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    print(f"\nSaved to {output_path}")


if __name__ == "__main__":
    main()
