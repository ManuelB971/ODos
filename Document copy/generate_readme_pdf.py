#!/usr/bin/env python3
"""Convertit un .md en .pdf (sans navigateur). Par défaut : README_GENERATION_RAPPORT_MVP2."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from fpdf import FPDF

# Police TrueType Windows (accents FR + tirets typographiques)
_ARIAL = Path(r"C:\Windows\Fonts\arial.ttf")
_ARIAL_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


def strip_md(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = s.replace("`", "")
    return s


class PDF(FPDF):
    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Arial", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


def main() -> None:
    base = Path(__file__).resolve().parent
    p = argparse.ArgumentParser(description="Markdown → PDF (fpdf2)")
    p.add_argument(
        "input_md",
        nargs="?",
        default=str(base / "README_GENERATION_RAPPORT_MVP2.md"),
        help="Fichier .md source",
    )
    p.add_argument(
        "output_pdf",
        nargs="?",
        default=None,
        help="Fichier .pdf de sortie (défaut : même nom que le .md)",
    )
    args = p.parse_args()
    md_path = Path(args.input_md)
    if not md_path.is_file():
        print(f"Fichier introuvable: {md_path}", file=sys.stderr)
        sys.exit(1)
    out_path = (
        Path(args.output_pdf)
        if args.output_pdf
        else md_path.with_suffix(".pdf")
    )
    text = md_path.read_text(encoding="utf-8")

    pdf = PDF()
    if _ARIAL.is_file():
        pdf.add_font("Arial", "", str(_ARIAL))
        pdf.add_font("Arial", "B", str(_ARIAL_BOLD) if _ARIAL_BOLD.is_file() else str(_ARIAL))
        pdf.add_font("Arial", "I", str(_ARIAL))
        pdf.add_font("Arial", "BI", str(_ARIAL_BOLD) if _ARIAL_BOLD.is_file() else str(_ARIAL))
        default_font = "Arial"
    else:
        default_font = "Helvetica"

    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_font(default_font, "", 11)
    lm = pdf.l_margin

    in_table = False
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            pdf.ln(4)
            continue
        if line.strip() == "---":
            pdf.ln(2)
            pdf.set_draw_color(180, 180, 180)
            y = pdf.get_y()
            pdf.line(lm, y, pdf.w - pdf.r_margin, y)
            pdf.ln(6)
            pdf.set_x(lm)
            continue

        if line.startswith("|") and "---" in line and "|-|" not in line.replace(" ", ""):
            # separator row in md table
            in_table = True
            continue
        if line.startswith("|"):
            in_table = True
            cells = [strip_md(c.strip()) for c in line.strip("|").split("|")]
            if all(c.replace("-", "").strip() == "" for c in cells):
                continue
            row = "  |  ".join(cells)
            pdf.set_font(default_font, "", 9)
            pdf.set_x(lm)
            pdf.multi_cell(0, 5, row)
            pdf.set_font(default_font, "", 11)
            continue
        if in_table and not line.startswith("|"):
            in_table = False
            pdf.ln(3)

        if line.startswith("# "):
            pdf.set_font(default_font, "B", 16)
            pdf.set_x(lm)
            pdf.multi_cell(0, 8, strip_md(line[2:]))
            pdf.ln(2)
            pdf.set_font(default_font, "", 11)
        elif line.startswith("## "):
            pdf.set_font(default_font, "B", 13)
            pdf.set_x(lm)
            pdf.multi_cell(0, 7, strip_md(line[3:]))
            pdf.ln(1)
            pdf.set_font(default_font, "", 11)
        elif line.startswith("### "):
            pdf.set_font(default_font, "B", 11)
            pdf.set_x(lm)
            pdf.multi_cell(0, 6, strip_md(line[4:]))
            pdf.set_font(default_font, "", 11)
        elif line.startswith("#### "):
            pdf.set_font(default_font, "B", 10)
            pdf.set_x(lm)
            pdf.multi_cell(0, 5, strip_md(line[5:]))
            pdf.set_font(default_font, "", 11)
        elif line.startswith(("- ", "* ")):
            pdf.set_x(lm + 4)
            pdf.multi_cell(0, 5, chr(8226) + " " + strip_md(line[2:]))
            pdf.set_x(lm)
        elif line.startswith("*Document généré"):
            pdf.ln(4)
            pdf.set_font(default_font, "I", 9)
            pdf.set_x(lm)
            pdf.multi_cell(0, 5, strip_md(line))
            pdf.set_font(default_font, "", 11)
        else:
            pdf.set_x(lm)
            pdf.multi_cell(0, 5, strip_md(line))

    pdf.output(str(out_path))
    print(f"OK: {out_path}")


if __name__ == "__main__":
    main()
