#!/usr/bin/env python3
"""Generate printable NEWOTEG Code 128 product label sheets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from reportlab.graphics.barcode import code128
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


BLUE = HexColor("#1D4ED8")
INK = HexColor("#101828")
MUTED = HexColor("#667085")
BORDER = HexColor("#D0D5DD")


def fcfa(value: float | int | None) -> str:
    if value is None:
        return ""
    return f"{round(float(value)):,}".replace(",", " ") + " FCFA"


def fit_line(text: str, max_width: float, font: str, size: float) -> str:
    if stringWidth(text, font, size) <= max_width:
        return text
    suffix = "…"
    result = text
    while result and stringWidth(result + suffix, font, size) > max_width:
        result = result[:-1]
    return result.rstrip() + suffix


def split_name(text: str, max_width: float, font: str = "Helvetica-Bold", size: float = 7.5) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if not current or stringWidth(candidate, font, size) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
        if len(lines) == 1:
            break
    if current and len(lines) < 2:
        consumed = len(" ".join(lines + [current]).split())
        remaining = " ".join(words[consumed:])
        lines.append(fit_line(f"{current} {remaining}".strip(), max_width, font, size))
    return lines[:2]


def draw_label(pdf: canvas.Canvas, x: float, y: float, width: float, height: float, product: dict) -> None:
    padding = 4 * mm
    pdf.setStrokeColor(BORDER)
    pdf.setLineWidth(0.5)
    pdf.roundRect(x, y, width, height, 2 * mm, stroke=1, fill=0)
    pdf.setFillColor(BLUE)
    pdf.roundRect(x, y + height - 2.2 * mm, width, 2.2 * mm, 1.8 * mm, stroke=0, fill=1)

    name = str(product.get("name") or product.get("nomProduit") or "Article")
    code_family = str(product.get("codeFamille") or product.get("family") or "000")
    internal_code = str(product.get("code") or "")
    payload = f"{code_family}/{internal_code}"

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 7.5)
    name_y = y + height - 7 * mm
    for index, line in enumerate(split_name(name, width - 2 * padding)):
        pdf.drawString(x + padding, name_y - index * 3.3 * mm, line)

    price = fcfa(product.get("prixDetail"))
    if price:
        pdf.setFillColor(BLUE)
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawRightString(x + width - padding, y + height - 13.5 * mm, price)

    barcode = code128.Code128(payload, barHeight=11 * mm, barWidth=0.29 * mm, humanReadable=False)
    max_barcode_width = width - 2 * padding
    if barcode.width > max_barcode_width:
        barcode.barWidth *= max_barcode_width / barcode.width
        barcode._calculate()
    # Keep the machine-readable bars near black for maximum contrast on
    # monochrome thermal printers. Blue remains only as a visual accent.
    pdf.setFillColor(INK)
    barcode.drawOn(pdf, x + (width - barcode.width) / 2, y + 8.8 * mm)

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawCentredString(x + width / 2, y + 6 * mm, payload)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 5.8)
    pdf.drawCentredString(x + width / 2, y + 3.4 * mm, "NEWOTEG · X ELECTRONICS")


def draw_roll_label(pdf: canvas.Canvas, product: dict) -> None:
    """Draw one monochrome label for an Epson 80 mm receipt roll."""
    width = 80 * mm
    height = 40 * mm
    margin = 4 * mm
    name = str(product.get("name") or product.get("nomProduit") or "Article")
    code_family = str(product.get("codeFamille") or product.get("family") or "000")
    internal_code = str(product.get("code") or "")
    payload = f"{code_family}/{internal_code}"

    pdf.setStrokeColor(INK)
    pdf.setLineWidth(0.45)
    pdf.roundRect(1.5 * mm, 1.5 * mm, width - 3 * mm, height - 3 * mm, 1.2 * mm, stroke=1, fill=0)

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin, height - 6.3 * mm, "NEWOTEG")
    pdf.setFont("Helvetica", 6.2)
    pdf.drawString(margin, height - 9.2 * mm, "X ELECTRONICS - DOUALA")

    price = fcfa(product.get("prixDetail"))
    if price:
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawRightString(width - margin, height - 6.7 * mm, price)

    pdf.setLineWidth(0.35)
    pdf.line(margin, height - 11 * mm, width - margin, height - 11 * mm)

    pdf.setFont("Helvetica-Bold", 8.4)
    name_lines = split_name(name, width - 2 * margin, size=8.4)
    for index, line in enumerate(name_lines):
        pdf.drawString(margin, height - 15 * mm - index * 3.5 * mm, line)

    barcode = code128.Code128(payload, barHeight=10.5 * mm, barWidth=0.34 * mm, humanReadable=False)
    max_width = width - 2 * margin
    if barcode.width > max_width:
        barcode.barWidth *= max_width / barcode.width
        barcode._calculate()
    pdf.setFillColor(INK)
    barcode.drawOn(pdf, (width - barcode.width) / 2, 6.6 * mm)

    pdf.setFont("Courier-Bold", 7.4)
    pdf.drawCentredString(width / 2, 4.3 * mm, payload)
    pdf.setFont("Helvetica", 5.5)
    pdf.drawRightString(width - margin, 2.6 * mm, "CODE INTERNE")


def generate(input_path: Path, output_path: Path, output_format: str = "a4") -> int:
    data = json.loads(input_path.read_text(encoding="utf-8"))
    products = data.get("labels", data if isinstance(data, list) else [])
    if not products:
        raise ValueError("Aucune étiquette à générer")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_format == "roll80":
        pdf = canvas.Canvas(str(output_path), pagesize=(80 * mm, 40 * mm), pageCompression=1)
        pdf.setTitle("Étiquettes code-barres 80 mm — NEWOTEG")
        pdf.setAuthor("NEWOTEG")
        for index, product in enumerate(products):
            if index > 0:
                pdf.showPage()
            draw_roll_label(pdf, product)
        pdf.save()
        return len(products)

    page_width, page_height = A4
    margin_x = 7 * mm
    margin_y = 7 * mm
    gap_x = 2 * mm
    gap_y = 2 * mm
    columns = 3
    rows = 7
    label_width = (page_width - 2 * margin_x - (columns - 1) * gap_x) / columns
    label_height = (page_height - 2 * margin_y - (rows - 1) * gap_y) / rows

    pdf = canvas.Canvas(str(output_path), pagesize=A4, pageCompression=1)
    pdf.setTitle("Étiquettes code-barres — Registre NEWOTEG")
    pdf.setAuthor("NEWOTEG")
    for index, product in enumerate(products):
        slot = index % (columns * rows)
        if slot == 0 and index > 0:
            pdf.showPage()
        row = slot // columns
        column = slot % columns
        x = margin_x + column * (label_width + gap_x)
        y = page_height - margin_y - (row + 1) * label_height - row * gap_y
        draw_label(pdf, x, y, label_width, label_height, product)
    pdf.save()
    return len(products)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--format", choices=("a4", "roll80"), default="a4")
    args = parser.parse_args()
    count = generate(args.input, args.output, args.format)
    print(json.dumps({"labels": count, "format": args.format, "output": str(args.output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
