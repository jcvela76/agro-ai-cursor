#!/usr/bin/env python3
"""Render Agro AI FICAFÉ business card art (print-ready PNG + PDF)."""

from __future__ import annotations

from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.constants import ERROR_CORRECT_H

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "marketing" / "assets" / "ficafe-card"
FONTS = ROOT / ".venv-card" / "fonts"

# Brand tokens (globals.css)
CHROME = (0x1C, 0x2A, 0x1F)
CANVAS = (0xF3, 0xF0, 0xE8)
FIELD = (0x4F, 0x6F, 0x52)
MUTED = (0x5C, 0x6B, 0x5E)
WHITE = (0xFF, 0xFD, 0xF8)

# 90 × 50 mm @ 300 dpi (common PE card) + 3 mm bleed
DPI = 300
MM = DPI / 25.4
W_TRIM, H_TRIM = int(90 * MM), int(50 * MM)
BLEED = int(3 * MM)
W, H = W_TRIM + 2 * BLEED, H_TRIM + 2 * BLEED

QR_URL = (
    "https://geoagro.ai/sign-up"
    "?utm_source=ficafe"
    "&utm_medium=card"
    "&utm_campaign=ficafe_cusco_202611"
)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def load_fonts() -> dict[str, ImageFont.FreeTypeFont]:
    fraunces = FONTS / "Fraunces.ttf"
    source = FONTS / "SourceSans3.ttf"
    return {
        "display_xl": font(fraunces, 96),
        "display_lg": font(fraunces, 72),
        "display_md": font(fraunces, 42),
        "body": font(source, 28),
        "body_sm": font(source, 22),
        "caption": font(source, 18),
        "micro": font(source, 15),
    }


def make_qr(size: int) -> Image.Image:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=12,
        border=2,
    )
    qr.add_data(QR_URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color=CHROME, back_color=WHITE).convert("RGB")
    return img.resize((size, size), Image.Resampling.NEAREST)


def _field_grain(draw: ImageDraw.ImageDraw, ink: tuple[int, int, int]) -> None:
    """Subtle horizontal field lines — atmosphere without clutter."""
    step = max(3, int(1.8 * MM))
    y0, y1 = BLEED + int(2 * MM), H - BLEED - int(2 * MM)
    x0, x1 = BLEED + int(2 * MM), W - BLEED - int(2 * MM)
    for i, y in enumerate(range(y0, y1, step)):
        if i % 5 == 0:
            continue
        # shorter dashes toward the right for depth
        draw.line([(x0, y), (x0 + int((x1 - x0) * 0.55), y)], fill=ink, width=1)


def render_front(fonts: dict) -> Image.Image:
    img = Image.new("RGB", (W, H), CHROME)
    draw = ImageDraw.Draw(img)

    # Atmosphere: faint field lines
    _field_grain(draw, (0x28, 0x3A, 0x2C))

    # Soft field accent bar at left edge (inside trim)
    bar_w = int(5 * MM)
    draw.rectangle([BLEED, BLEED, BLEED + bar_w, H - BLEED], fill=FIELD)

    left = BLEED + int(11 * MM)
    top = BLEED + int(12 * MM)
    draw.text((left, top), "Agro AI", font=fonts["display_xl"], fill=CANVAS)

    tag_y = top + int(20 * MM)
    draw.text((left, tag_y), "Clima por parcela", font=fonts["body"], fill=(0xC8, 0xD0, 0xC4))

    rule_y = tag_y + int(8 * MM)
    draw.line(
        [(left, rule_y), (left + int(36 * MM), rule_y)],
        fill=FIELD,
        width=max(2, int(0.45 * MM)),
    )

    bottom = H - BLEED - int(7 * MM)
    draw.text((left, bottom), "geoagro.ai", font=fonts["caption"], fill=FIELD)
    ficafe = "FICAFÉ · Cusco"
    bbox = draw.textbbox((0, 0), ficafe, font=fonts["caption"])
    draw.text(
        (W - BLEED - (bbox[2] - bbox[0]) - int(6 * MM), bottom),
        ficafe,
        font=fonts["caption"],
        fill=(0x8A, 0x9A, 0x8C),
    )

    return img


def render_back(fonts: dict) -> Image.Image:
    """Back: QR only, centered — maximum scan target, no copy."""
    del fonts  # unused; signature kept for call-site symmetry
    img = Image.new("RGB", (W, H), CANVAS)

    # Fit largest square QR with quiet margin inside trim
    margin = int(5 * MM)
    qr_size = min(W_TRIM, H_TRIM) - 2 * margin
    qr = make_qr(qr_size)
    pad = int(2.5 * MM)
    panel = Image.new("RGB", (qr_size + 2 * pad, qr_size + 2 * pad), WHITE)
    panel.paste(qr, (pad, pad))

    px = (W - panel.width) // 2
    py = (H - panel.height) // 2
    img.paste(panel, (px, py))
    return img


def render_oneside(fonts: dict) -> Image.Image:
    """Single-side card: brand left + QR right (cheaper print)."""
    img = Image.new("RGB", (W, H), CHROME)
    draw = ImageDraw.Draw(img)
    _field_grain(draw, (0x28, 0x3A, 0x2C))

    bar_w = int(5 * MM)
    draw.rectangle([BLEED, BLEED, BLEED + bar_w, H - BLEED], fill=FIELD)

    left = BLEED + int(9 * MM)
    top = BLEED + int(10 * MM)
    draw.text((left, top), "Agro AI", font=fonts["display_lg"], fill=CANVAS)
    draw.text(
        (left, top + int(15 * MM)),
        "Clima por parcela",
        font=fonts["body_sm"],
        fill=(0xC8, 0xD0, 0xC4),
    )
    draw.line(
        [
            (left, top + int(22 * MM)),
            (left + int(28 * MM), top + int(22 * MM)),
        ],
        fill=FIELD,
        width=max(2, int(0.4 * MM)),
    )
    draw.text(
        (left, top + int(25 * MM)),
        "Escanea · prueba Free",
        font=fonts["caption"],
        fill=FIELD,
    )
    draw.text(
        (left, H - BLEED - int(7 * MM)),
        "geoagro.ai",
        font=fonts["micro"],
        fill=(0x8A, 0x9A, 0x8C),
    )

    qr_size = int(34 * MM)
    qr = make_qr(qr_size)
    pad = int(2.8 * MM)
    plate = Image.new("RGB", (qr_size + 2 * pad, qr_size + 2 * pad), WHITE)
    plate.paste(qr, (pad, pad))
    pdraw = ImageDraw.Draw(plate)
    pdraw.rectangle(
        [0, 0, plate.width - 1, plate.height - 1],
        outline=FIELD,
        width=max(2, int(0.35 * MM)),
    )
    px = W - BLEED - plate.width - int(5 * MM)
    py = (H - plate.height) // 2
    img.paste(plate, (px, py))

    return img


def crop_trim(img: Image.Image) -> Image.Image:
    return img.crop((BLEED, BLEED, W - BLEED, H - BLEED))


def save_pdf(front: Image.Image, back: Image.Image, path: Path) -> None:
    # Pillow PDF: one page per side, physical size in mm
    front_t = crop_trim(front)
    back_t = crop_trim(back)
    front_t.save(
        path,
        "PDF",
        resolution=DPI,
        save_all=True,
        append_images=[back_t],
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    fonts = load_fonts()

    front = render_front(fonts)
    back = render_back(fonts)
    oneside = render_oneside(fonts)

    # With bleed (for print shop)
    front.save(OUT / "card-front-bleed.png", dpi=(DPI, DPI))
    back.save(OUT / "card-back-bleed.png", dpi=(DPI, DPI))
    oneside.save(OUT / "card-oneside-bleed.png", dpi=(DPI, DPI))

    # Trim (preview / simple print)
    crop_trim(front).save(OUT / "card-front.png", dpi=(DPI, DPI))
    crop_trim(back).save(OUT / "card-back.png", dpi=(DPI, DPI))
    crop_trim(oneside).save(OUT / "card-oneside.png", dpi=(DPI, DPI))

    # Standalone QR (sticker / larger reprint)
    make_qr(1200).save(OUT / "qr-sign-up.png", dpi=(DPI, DPI))

    save_pdf(front, back, OUT / "card-print.pdf")

    # Preview strip (front | back) for quick review
    ft, bt = crop_trim(front), crop_trim(back)
    gap = 40
    strip = Image.new("RGB", (ft.width + bt.width + gap, max(ft.height, bt.height)), (40, 40, 40))
    strip.paste(ft, (0, 0))
    strip.paste(bt, (ft.width + gap, 0))
    strip.save(OUT / "card-preview.png", dpi=(DPI, DPI))

    (OUT / "README.md").write_text(
        f"""# Tarjeta FICAFÉ · Agro AI

Arte minimalista listo para imprenta (90 × 50 mm @ 300 dpi, sangría 3 mm).

## URL del QR

```
{QR_URL}
```

## Archivos

| Archivo | Uso |
|---------|-----|
| `card-front.png` / `card-back.png` | Vista a corte (sin sangría) |
| `card-front-bleed.png` / `card-back-bleed.png` | Entregar a imprenta (con sangría) |
| `card-oneside.png` | Una sola cara (marca + QR) — más barato |
| `card-print.pdf` | PDF 2 páginas (frente + dorso) a tamaño trim |
| `qr-sign-up.png` | QR suelto 1200 px |
| `card-preview.png` | Frente y dorso lado a lado |

## Specs para la imprenta

- Formato: **90 × 50 mm**
- Sangría: **3 mm** por lado (usar `*-bleed.png`)
- Color: CMYK simulado desde RGB marca `#1C2A1F` / `#F3F0E8` / `#4F6F52`
- Acabado sugerido: mate o soft-touch; QR sin barniz UV selectivo encima
- Cantidad tip: 200–500 para FICAFÉ

## Tipografía

Fraunces (display) + Source Sans 3 (cuerpo) — misma pareja del sitio.
""",
        encoding="utf-8",
    )

    print(f"Wrote card art → {OUT}")
    print(f"QR → {QR_URL}")
    print(f"Trim px: {W_TRIM}×{H_TRIM}  Bleed canvas: {W}×{H}")


if __name__ == "__main__":
    main()
