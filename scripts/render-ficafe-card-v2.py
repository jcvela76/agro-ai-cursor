#!/usr/bin/env python3
"""Generate the editable FICAFÉ card proposal and review previews.

Requires Pillow and qrcode. SVG text remains editable; PDF is a raster review
export at 300 dpi. Printer production still needs its final specification.
"""

from __future__ import annotations

import os
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.constants import ERROR_CORRECT_M

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/marketing/assets/ficafe-card-v2"
QR_URL = "https://geoagro.ai/f26"
FOREST = "#1C2A1F"
IVORY = "#F3F0E8"
WHITE = "#FFFDFA"
SOFT = "#D8E1D3"
GREEN = "#4F6F52"
SIZE = (900, 500)
PX_PER_UNIT = 300 / 25.4 * 0.1  # viewBox is in tenths of a millimetre
PIXEL_SIZE = (round(SIZE[0] * PX_PER_UNIT), round(SIZE[1] * PX_PER_UNIT))


def font_path(name: str) -> Path:
    candidates = [
        Path(os.environ.get("FICAFE_FONT_DIR", "")) / name,
        ROOT / ".venv-card/fonts" / name,
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"{name}: set FICAFE_FONT_DIR to the two original card fonts")


def qr_matrix() -> list[list[bool]]:
    qr = qrcode.QRCode(
        error_correction=ERROR_CORRECT_M,
        box_size=1,
        border=4,
    )
    qr.add_data(QR_URL)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    assert len(matrix) == len(matrix[0])
    assert all(not any(row[:4]) and not any(row[-4:]) for row in matrix)
    assert all(not any(matrix[i]) for i in list(range(4)) + list(range(len(matrix) - 4, len(matrix))))
    return matrix


def qr_svg(matrix: list[list[bool]], left=530, top=76, side=348) -> str:
    module = side / len(matrix)
    blocks = [
        f'<rect x="{left + col * module:.4f}" y="{top + row * module:.4f}" '
        f'width="{module:.4f}" height="{module:.4f}"/>'
        for row, line in enumerate(matrix)
        for col, filled in enumerate(line)
        if filled
    ]
    return (
        f'<rect x="{left}" y="{top}" width="{side}" height="{side}" fill="{WHITE}"/>'
        f'<g fill="{FOREST}">' + "".join(blocks) + "</g>"
    )


def svg(body: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="50mm" '
        'viewBox="0 0 900 500" role="img">\n'
        "<!-- Text remains editable. Fonts: Fraunces and Source Sans 3. "
        "Dimensions are provisional; verify final printer specifications. -->\n"
        + body + "\n</svg>\n"
    )


def front_svg() -> str:
    return svg(
        f'<rect width="900" height="500" fill="{FOREST}"/>'
        '<text x="68" y="197" fill="#F3F0E8" '
        'font-family="Fraunces, Georgia, serif" font-size="110" font-weight="600">Agro AI</text>'
        f'<text x="72" y="265" fill="{SOFT}" '
        'font-family="Source Sans 3, Arial, sans-serif" font-size="30">Clima por parcela</text>'
        f'<text x="72" y="430" fill="{IVORY}" '
        'font-family="Source Sans 3, Arial, sans-serif" font-size="23">geoagro.ai</text>'
        f'<text x="828" y="430" text-anchor="end" fill="{SOFT}" '
        'font-family="Source Sans 3, Arial, sans-serif" font-size="21">FICAFÉ · Cusco</text>'
    )


def back_svg(matrix: list[list[bool]]) -> str:
    return svg(
        f'<rect width="900" height="500" fill="{IVORY}"/>'
        f'<text x="67" y="143" fill="{FOREST}" '
        'font-family="Fraunces, Georgia, serif" font-size="61" font-weight="600">Agro AI</text>'
        f'<text x="68" y="241" fill="{FOREST}" '
        'font-family="Source Sans 3, Arial, sans-serif" font-size="31" font-weight="600">'
        'Escanea para registrarte</text>'
        f'<text x="68" y="287" fill="{GREEN}" '
        'font-family="Source Sans 3, Arial, sans-serif" font-size="22">geoagro.ai/f26</text>'
        f'<text x="68" y="421" fill="{GREEN}" '
        'font-family="Source Sans 3, Arial, sans-serif" font-size="20">FICAFÉ · Cusco</text>'
        + qr_svg(matrix)
    )


def draw_qr(draw: ImageDraw.ImageDraw, matrix: list[list[bool]], scale: float) -> None:
    left, top, side = 530, 76, 348
    draw.rectangle(
        (round(left * scale), round(top * scale), round((left + side) * scale), round((top + side) * scale)),
        fill=WHITE,
    )
    module = side / len(matrix)
    for row, line in enumerate(matrix):
        for col, filled in enumerate(line):
            if filled:
                x0 = round((left + col * module) * scale)
                y0 = round((top + row * module) * scale)
                x1 = round((left + (col + 1) * module) * scale)
                y1 = round((top + (row + 1) * module) * scale)
                draw.rectangle((x0, y0, x1 - 1, y1 - 1), fill=FOREST)


def render_side(back: bool, matrix: list[list[bool]]) -> Image.Image:
    scale = PIXEL_SIZE[0] / SIZE[0]
    image = Image.new("RGB", PIXEL_SIZE, IVORY if back else FOREST)
    draw = ImageDraw.Draw(image)

    def text(x: int, y: int, value: str, name: str, size: int, color: str, anchor="lt", weight="Regular") -> None:
        face = ImageFont.truetype(str(font_path(name)), round(size * scale))
        if name == "SourceSans3.ttf":
            face.set_variation_by_name(weight)
        draw.text((round(x * scale), round(y * scale)), value, font=face, fill=color, anchor=anchor)

    if back:
        text(67, 84, "Agro AI", "Fraunces.ttf", 61, FOREST)
        text(68, 203, "Escanea para registrarte", "SourceSans3.ttf", 31, FOREST, weight="SemiBold")
        text(68, 257, "geoagro.ai/f26", "SourceSans3.ttf", 22, GREEN)
        text(68, 394, "FICAFÉ · Cusco", "SourceSans3.ttf", 20, GREEN)
        draw_qr(draw, matrix, scale)
    else:
        text(68, 107, "Agro AI", "Fraunces.ttf", 110, IVORY)
        text(72, 234, "Clima por parcela", "SourceSans3.ttf", 30, SOFT)
        text(72, 402, "geoagro.ai", "SourceSans3.ttf", 23, IVORY)
        text(828, 402, "FICAFÉ · Cusco", "SourceSans3.ttf", 21, SOFT, anchor="rt")
    return image


def main() -> None:
    route = (ROOT / "src/app/f26/route.ts").read_text()
    middleware = (ROOT / "src/middleware.ts").read_text()
    if "ficafe_cusco_202611" not in route or '"/f26"' not in middleware:
        raise RuntimeError("The short public route must be implemented before generating the QR")
    OUT.mkdir(parents=True, exist_ok=True)
    matrix = qr_matrix()
    (OUT / "card-front.svg").write_text(front_svg(), encoding="utf-8")
    (OUT / "card-back.svg").write_text(back_svg(matrix), encoding="utf-8")
    front = render_side(False, matrix)
    back = render_side(True, matrix)
    front.save(OUT / "card-front.png", dpi=(300, 300))
    back.save(OUT / "card-back.png", dpi=(300, 300))
    pad = round(35 * PIXEL_SIZE[0] / SIZE[0])
    preview = Image.new("RGB", (front.width * 2 + pad * 3, front.height + pad * 2), "#E9E6DF")
    preview.paste(front, (pad, pad))
    preview.paste(back, (front.width + pad * 2, pad))
    preview.save(OUT / "card-preview.png")
    front.save(OUT / "card-review.pdf", "PDF", resolution=300, save_all=True, append_images=[back])
    print(f"{len(matrix)} modules including four-module quiet zone; {QR_URL}")


if __name__ == "__main__":
    main()
