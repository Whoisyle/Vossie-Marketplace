# Rebuilds the app icon files in assets/branding/app-icon from the supplied photo of the Vossie "SS" icon.
# Run from the project folder: python scripts/make-app-icon.py (needs Pillow and numpy).
import numpy as np
from PIL import Image, ImageFilter

SRC = "assets/branding/app-icon/vossie-app-icon-light.jpeg"  # photo of the icon; the mark is traced from it
OUT = "assets/branding/app-icon/"
import os
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert("RGB")
w, h = img.size
arr = np.asarray(img).astype(float)

# the mark is teal on an off-white tile: red is low where the mark is
red = Image.fromarray(arr[:, :, 0].astype("uint8")).filter(ImageFilter.GaussianBlur(3))
r = np.asarray(red).astype(float)
mask = (r < 165).astype("uint8") * 255

# keep only the area inside the tile (the grey surround is also dark)
tile = (np.asarray(Image.fromarray(arr[:, :, 2].astype("uint8")).filter(ImageFilter.GaussianBlur(6))) > 200)
ys, xs = np.where(tile)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
inner = np.zeros_like(mask)
inner[570:1170, 320:1050] = 1
mask = mask * inner

m = Image.fromarray(mask)
bbox = m.getbbox()
print("tile", (x0, y0, x1, y1), "mark bbox", bbox)
m = m.crop(bbox)
from PIL import ImageOps
m = ImageOps.expand(m, border=40, fill=0)  # room so smoothing does not flatten the edges

# smooth the photo noise: upscale, blur, threshold for crisp curved edges
scale = 4
m = m.resize((m.width * scale, m.height * scale), Image.LANCZOS).filter(ImageFilter.GaussianBlur(14))
m = m.point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.GaussianBlur(2))
m = m.crop(m.getbbox())
m.save(OUT + "mask.png")

def compose(size, bg, fg, mark_width_fraction, transparent_bg=False):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent_bg else bg + (255,))
    mw = int(size * mark_width_fraction)
    mh = int(m.height * mw / m.width)
    mark = m.resize((mw, mh), Image.LANCZOS)
    layer = Image.new("RGBA", (mw, mh), fg + (255,))
    canvas.paste(layer, ((size - mw) // 2, (size - mh) // 2), mark)
    return canvas

LIGHT_BG = (232, 230, 226)
TEAL = (79, 127, 148)
DARK_BG = (14, 92, 117)
WHITE = (236, 243, 242)

# iOS app icon: full square, no transparency (iOS rounds it)
compose(1024, LIGHT_BG, TEAL, 0.56).convert("RGB").save(OUT + "icon.png")
compose(1024, DARK_BG, WHITE, 0.56).convert("RGB").save(OUT + "icon-dark.png")
# Android adaptive icon: the mark must sit inside the middle 66% so any mask shape keeps it
compose(1024, LIGHT_BG, TEAL, 0.42, transparent_bg=True).save(OUT + "adaptive-foreground.png")
compose(1024, (0, 0, 0), WHITE, 0.42, transparent_bg=True).save(OUT + "adaptive-monochrome.png")
compose(48, LIGHT_BG, TEAL, 0.62).convert("RGB").save(OUT + "favicon.png")
print("done")
