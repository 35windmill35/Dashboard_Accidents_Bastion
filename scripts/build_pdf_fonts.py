"""Сборка подмножеств Rubik для PDF-отчёта (src/features/pdf-report/lib/fonts).

jsPDF встраивает только TTF, поэтому шрифт режется до нужных символов и
кладётся в .ts как base64. Запуск (нужен fonttools):

    pip install fonttools
    python scripts/build_pdf_fonts.py <Rubik-Regular.ttf> <Rubik-Medium.ttf>

Исходные TTF — статические начертания Rubik 2.300 (Google Fonts, SIL OFL 1.1),
например из npm-пакета @expo-google-fonts/rubik.
"""

import base64
import io
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

OUT_DIR = Path(__file__).resolve().parent.parent / "src/features/pdf-report/lib/fonts"

# Латиница, кириллица, казахские буквы, тенге, №, пунктуация
KAZAKH = "ӘәҒғҚқҢңӨөҰұҮүҺһІі"
UNICODES = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + list(range(0x400, 0x460))
    + [0x490, 0x491]
    + [ord(c) for c in KAZAKH]
    + [0x2002, 0x2003, 0x2009, 0x200A, 0x200B]
    + list(range(0x2010, 0x2016))
    + [0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026]
    + [0x202F, 0x2030, 0x2039, 0x203A, 0x2044, 0x20B8, 0x2116, 0x2212]
)

HEADER = """// Подмножество шрифта Rubik ({style}) в base64 — jsPDF умеет встраивать
// только TTF, а встроенные шрифты jsPDF кириллицу не поддерживают вообще
// (текст превращается в мусор). Состав: латиница, кириллица, казахские
// буквы, цифры, знаки валют и пунктуация. Rubik — © The Rubik Project
// Authors, SIL Open Font License 1.1. Файл сгенерирован
// scripts/build_pdf_fonts.py, руками не править.

"""


def freeze_tnum(font: TTFont) -> None:
    """Моноширинные цифры: cmap цифр указывает на глифы из фичи tnum."""
    gsub = font["GSUB"].table
    mapping = {}
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag != "tnum":
            continue
        for index in record.Feature.LookupListIndex:
            for sub in gsub.LookupList.Lookup[index].SubTable:
                if hasattr(sub, "mapping"):
                    mapping.update(sub.mapping)
    for table in font["cmap"].tables:
        for code, glyph in list(table.cmap.items()):
            if glyph in mapping:
                table.cmap[code] = mapping[glyph]


def build(source: str, const_name: str, style: str, tabular: bool) -> set[int]:
    font = TTFont(source)
    if tabular:
        freeze_tnum(font)
    options = subset.Options()
    # jsPDF не применяет OpenType-фичи
    options.layout_features = []
    options.drop_tables += ["GSUB", "GPOS", "GDEF", "STAT"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)

    cmap = font.getBestCmap()
    missing = [c for c in KAZAKH + "₸№" if ord(c) not in cmap]
    if missing:
        raise SystemExit(f"{const_name}: в исходном шрифте нет {''.join(missing)}")

    buffer = io.BytesIO()
    font.save(buffer)
    data = base64.b64encode(buffer.getvalue()).decode()
    body = HEADER.format(style=style) + f"export const {const_name} =\n  '{data}'\n"
    (OUT_DIR / f"{const_name}.ts").write_text(body, encoding="utf-8")
    print(f"{const_name}: {len(buffer.getvalue())} байт, {len(cmap)} символов")
    return set(cmap)


CHARSET_HEADER = """// Символы, которые есть во всех четырёх встроенных шрифтах PDF. Остальные
// pdfKit заменяет перед выводом (иначе jsPDF рисует пустой глиф).
// Файл сгенерирован scripts/build_pdf_fonts.py, руками не править.

"""


def write_charset(codes: set[int]) -> None:
    ranges = []
    for code in sorted(codes):
        if ranges and code == ranges[-1][1] + 1:
            ranges[-1][1] = code
        else:
            ranges.append([code, code])
    items = ", ".join(f"[0x{a:04x}, 0x{b:04x}]" for a, b in ranges)
    body = CHARSET_HEADER + f"export const PDF_FONT_RANGES: [number, number][] = [{items}]\n"
    (OUT_DIR / "pdfCharset.ts").write_text(body, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    regular, medium = sys.argv[1], sys.argv[2]
    charsets = [
        build(regular, "rubikRegular", "Regular 400", tabular=False),
        build(medium, "rubikMedium", "Medium 500", tabular=False),
        build(regular, "rubikTabularRegular", "Regular 400, моноширинные цифры", tabular=True),
        build(medium, "rubikTabularMedium", "Medium 500, моноширинные цифры", tabular=True),
    ]
    write_charset(set.intersection(*charsets))


if __name__ == "__main__":
    main()
