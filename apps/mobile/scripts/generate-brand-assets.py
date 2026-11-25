"""Generate Swyft's original app and adaptive icon artwork (requires Pillow)."""

from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "assets" / "brand"
OUT.mkdir(parents=True, exist_ok=True)
INK = (23, 42, 42, 255)
PAPER = (247, 245, 240, 255)
MINT = (148, 212, 180, 255)


def symbol(canvas: Image.Image, mono: bool = False) -> None:
    draw = ImageDraw.Draw(canvas)
    scale = canvas.width / 1024
    def box(values):
        return tuple(int(v * scale) for v in values)
    color = PAPER if mono else PAPER
    width = int(68 * scale)
    # One continuous path suggests a free slot becoming a confirmed booking.
    draw.arc(box((237, 210, 789, 659)), 208, 344, fill=color, width=width)
    draw.arc(box((246, 357, 787, 816)), 22, 164, fill=color, width=width)
    draw.ellipse(box((668, 245, 787, 364)), fill=PAPER if mono else MINT)


icon = Image.new("RGBA", (1024, 1024), INK)
symbol(icon)
icon.convert("RGB").save(OUT / "icon.png")

foreground = Image.new("RGBA", (1024, 1024))
symbol(foreground)
foreground.save(OUT / "adaptive-foreground.png")

mono = Image.new("RGBA", (1024, 1024))
symbol(mono, mono=True)
mono.save(OUT / "adaptive-monochrome.png")

background = Image.new("RGB", (1024, 1024), INK[:3])
background.save(OUT / "adaptive-background.png")
icon.resize((48, 48), Image.Resampling.LANCZOS).save(OUT / "favicon.png")
foreground.resize((256, 256), Image.Resampling.LANCZOS).save(OUT / "splash.png")
