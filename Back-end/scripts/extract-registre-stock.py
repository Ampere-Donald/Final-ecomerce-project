#!/usr/bin/env python3
"""Extract the legacy NEWOTEG purchase register into a deterministic JSON file.

The PDF is the source of truth. Rows explicitly marked for internal or home use
are retained in the audit section, but never included in the importable rows.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

import pdfplumber


LOCAL_SUPPLIER_ALIASES = {
    "CHINOIS FACE ANCIEN PMU": "CHINOIS FACE ANCIEN PMUC",
    "CHINOIS FACE ANCIEN PMUC": "CHINOIS FACE ANCIEN PMUC",
    "CHINOIS PMUC": "CHINOIS PMUC",
    "CHINOIS VERS ANCIEN NUM": "CHINOIS VERS ANCIEN NUMBER ONE",
    "CHINOIS VERS ANCIEN NUMBER ONE": "CHINOIS VERS ANCIEN NUMBER ONE",
    "FOCUS — Marche Congo": "FOCUS — Marche Congo",
    "SAF ELECTRONIQUE": "SAF ELECTRONIQUE",
    "BETA SARL": "BETA SARL",
    "FAMILY REMOTE": "FAMILY REMOTE",
    "TIEKA SARL — Mboppi": "TIEKA SARL — Mboppi",
    "MA ELYS SARL — Congo": "MA ELYS SARL — Congo",
    "HASSANA SARL — Congo": "HASSANA SARL — Congo",
    "NEYO INTER — Congo": "NEYO INTER — Congo",
    "ROSA SARL": "ROSA SARL",
    "BORIS SHOP — Congo": "BORIS SHOP — Congo",
    "OKE ET NZONGANG": "OKE ET NZONGANG",
    "SEVERIN — Camp Yabassi": "SEVERIN — Camp Yabassi",
    "CHINOIS DOUCHE": "CHINOIS DOUCHE",
    "USAGE INTERNE": "USAGE INTERNE",
    "USAGE MAISON": "USAGE MAISON",
}

NIGERIA_SUPPLIERS = {"UZOBEST", "CHIKASON", "CHYDONE", "CHIKAGO"}
EXCLUDED_SUPPLIERS = {"USAGE INTERNE", "USAGE MAISON"}


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).replace("\n", " ")).strip()


def number(value: Any) -> int | None:
    text = clean_text(value)
    if not text or text == "-":
        return None
    text = text.replace(" ", "").replace("\u00a0", "").replace(",", ".")
    try:
        return int(round(float(text)))
    except ValueError:
        return None


def normalized(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.upper().replace("’", "'")
    return re.sub(r"\s+", " ", text).strip()


def flexible_number_pattern(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return ""
    if text == "-":
        return r"-"
    digits = re.sub(r"\D", "", text)
    if not digits:
        return re.escape(text)
    # Thousands separators are spaces in the register; accept any whitespace.
    groups: list[str] = []
    while len(digits) > 3:
        groups.insert(0, digits[-3:])
        digits = digits[:-3]
    groups.insert(0, digits)
    return r"\s*".join(re.escape(group) for group in groups)


def supplier_name(raw: str) -> str:
    raw_norm = normalized(raw)
    for alias, canonical in sorted(
        LOCAL_SUPPLIER_ALIASES.items(), key=lambda item: len(item[0]), reverse=True
    ):
        if raw_norm.startswith(normalized(alias)):
            return canonical
    return clean_text(raw)


def recover_designation(
    page_lines: list[str],
    table_designation: str,
    fields: list[Any],
    supplier: str | None = None,
) -> str:
    """Recover names that overflowed their PDF table cell.

    The numeric columns are stable. We identify the raw line by its numeric
    suffix, then remove the optional quantity that precedes the purchase price.
    """

    table_start = normalized(table_designation)[:20]
    # A few overlong designations cover the visual quantity cell, so the PDF
    # text layer omits that quantity. Try the complete suffix first, then retry
    # without it; the quantity remains safely inferred from total / unit price.
    for suffix_fields in (fields, fields[1:]):
        numeric_pattern = r"\s+".join(flexible_number_pattern(value) for value in suffix_fields)
        suffix = numeric_pattern
        if supplier:
            suffix += r"\s+" + re.escape(supplier).replace(r"\ ", r"\s+")
        matcher = re.compile(rf"^(?P<prefix>.+?)\s+{suffix}\s*$", re.IGNORECASE)
        for line in page_lines:
            if table_start and not normalized(line).startswith(table_start):
                continue
            match = matcher.match(clean_text(line))
            if not match:
                continue
            prefix = clean_text(match.group("prefix"))
            expected_quantity = number(fields[0])
            if expected_quantity is not None:
                quantity_text = f"{expected_quantity:,}".replace(",", " ")
                prefix = re.sub(rf"\s+{re.escape(quantity_text)}$", "", prefix)
                prefix = re.sub(rf"\s+{expected_quantity}$", "", prefix)
            return prefix.strip()
    return clean_text(table_designation)


def derive_quantity(raw_quantity: Any, unit_price: int | None, total: int | None) -> int | None:
    quantity = number(raw_quantity)
    if unit_price and total and total % unit_price == 0:
        inferred = total // unit_price
        if not quantity or quantity * unit_price != total:
            return inferred
    return quantity


def parse_date(value: str | None) -> str | None:
    if not value or value == "-":
        return None
    try:
        return datetime.strptime(value, "%d/%m/%Y").date().isoformat()
    except ValueError:
        return None


def section_for_page(page_number: int, supplier: str) -> str:
    # Supplier names are unambiguous for import purposes. This mapping also
    # keeps the original register section available in the audit report.
    mapping = {
        "CHINOIS FACE ANCIEN PMUC": "I",
        "CHINOIS PMUC": "II/III",
        "CHINOIS VERS ANCIEN NUMBER ONE": "IV",
        "FOCUS — Marche Congo": "V",
        "SAF ELECTRONIQUE": "VI",
        "BETA SARL": "VII",
        "FAMILY REMOTE": "VII",
        "TIEKA SARL — Mboppi": "VIII/IX",
        "MA ELYS SARL — Congo": "X",
        "HASSANA SARL — Congo": "XI",
        "NEYO INTER — Congo": "XII",
        "ROSA SARL": "XIII",
        "USAGE INTERNE": "XIII",
        "BORIS SHOP — Congo": "XIV",
        "USAGE MAISON": "XIV",
        "OKE ET NZONGANG": "XV",
        "SEVERIN — Camp Yabassi": "XV",
        "CHINOIS DOUCHE": "XV",
    }
    return mapping.get(supplier, f"PAGE-{page_number}")


def local_purchase_date(supplier: str) -> str | None:
    if supplier in {
        "CHINOIS FACE ANCIEN PMUC",
        "CHINOIS PMUC",
        "CHINOIS VERS ANCIEN NUMBER ONE",
        "FOCUS — Marche Congo",
    }:
        return "2026-02-11"
    if supplier in {"SAF ELECTRONIQUE", "BETA SARL", "FAMILY REMOTE"}:
        return "2026-02-13"
    return None


def extract(pdf_path: Path) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    excluded: list[dict[str, Any]] = []
    nigeria_supplier = "UZOBEST"

    with pdfplumber.open(pdf_path) as document:
        for page_index, page in enumerate(document.pages, start=1):
            page_lines = [clean_text(line) for line in (page.extract_text() or "").splitlines()]
            for table in page.extract_tables():
                if not table or not table[0]:
                    continue
                header = [clean_text(cell) for cell in table[0]]
                is_local = "FOURNISSEUR" in header and len(header) >= 9
                is_nigeria = "PU(N)" in header and len(header) >= 9
                if not (is_local or is_nigeria):
                    continue

                for raw_row in table[1:]:
                    values = [clean_text(value) for value in raw_row]
                    designation = values[0] if values else ""
                    if not designation or designation.startswith("TOTAL "):
                        continue

                    if is_nigeria and designation in NIGERIA_SUPPLIERS and not values[1]:
                        nigeria_supplier = designation
                        continue

                    if is_local:
                        if len(values) < 9 or not values[2] or not values[3]:
                            continue
                        supplier = supplier_name(values[8])
                        unit_price = number(values[2])
                        total_purchase = number(values[3])
                        quantity = derive_quantity(values[1], unit_price, total_purchase)
                        if not quantity or unit_price is None or total_purchase is None:
                            continue

                        recovery_fields = [quantity, values[2], values[3], values[4], values[5], values[6], values[7]]
                        full_supplier = supplier
                        recovered = recover_designation(
                            page_lines,
                            designation,
                            recovery_fields,
                            full_supplier,
                        )
                        row = {
                            "sourcePage": page_index,
                            "section": section_for_page(page_index, supplier),
                            "purchaseDate": local_purchase_date(supplier),
                            "designation": recovered,
                            "quantity": quantity,
                            "purchaseCurrency": "FCFA",
                            "unitPurchasePrice": unit_price,
                            "totalPurchaseCurrency": total_purchase,
                            "totalPurchaseFcfa": total_purchase,
                            "unitCostFcfa": unit_price,
                            "wholesalePrice": number(values[5]),
                            "semiWholesalePrice": number(values[6]),
                            "retailPrice": number(values[7]),
                            "supplier": supplier,
                            "country": "Cameroun",
                        }
                    else:
                        if len(values) < 9 or not values[1] or not values[2]:
                            continue
                        unit_price_ngn = number(values[2])
                        total_ngn = number(values[3])
                        quantity = derive_quantity(values[1], unit_price_ngn, total_ngn)
                        if not quantity or unit_price_ngn is None or total_ngn is None:
                            continue
                        recovered = recover_designation(page_lines, designation, values[1:9])
                        row = {
                            "sourcePage": page_index,
                            "section": "XVI",
                            "purchaseDate": None,
                            "designation": recovered,
                            "quantity": quantity,
                            "purchaseCurrency": "NGN",
                            "unitPurchasePrice": unit_price_ngn,
                            "totalPurchaseCurrency": total_ngn,
                            "totalPurchaseFcfa": number(values[4]),
                            "unitCostFcfa": number(values[5]),
                            "wholesalePrice": number(values[6]),
                            "semiWholesalePrice": number(values[7]),
                            "retailPrice": number(values[8]),
                            "supplier": nigeria_supplier,
                            "country": "Nigeria",
                        }

                    row["normalizedDesignation"] = normalized(row["designation"])
                    row["excluded"] = row["supplier"] in EXCLUDED_SUPPLIERS
                    if row["excluded"]:
                        excluded.append(row)
                    else:
                        rows.append(row)

    return {
        "source": pdf_path.name,
        "exchangeRate": {"from": "NGN", "to": "FCFA", "rate": 1000 / 2400},
        "rules": {
            "existingProductStock": "preserve",
            "newProductStock": "sum register quantities",
            "excludedSuppliers": sorted(EXCLUDED_SUPPLIERS),
        },
        "rows": rows,
        "excludedRows": excluded,
        "counts": {
            "importableRows": len(rows),
            "excludedRows": len(excluded),
            "uniqueImportableDesignations": len({row["normalizedDesignation"] for row in rows}),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    result = extract(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["counts"], ensure_ascii=False))


if __name__ == "__main__":
    main()
