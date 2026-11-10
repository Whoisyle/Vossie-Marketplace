"""Assembles the 15:00 Vossie launch film with PIL + ffmpeg.

usage: python tools/assemble_film.py [draft|final|4k] [scene numbers...]
  draft = 960x540 (quick look), final = 1920x1080, 4k = 3840x2160.  Output: out/film/vossie-launch-<mode>.mp4
Inputs: out/tour-review.mp4 + out/tour/marks.json (app recording), out/stock/*.mp4 (Mixkit clips, free licence),
out/narration-eleven/sNN.wav + timings.json (ElevenLabs), out/music/*.mp3.
"""
import os, sys, json, wave, pathlib, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent; os.chdir(ROOT)
MODE = sys.argv[1] if len(sys.argv) > 1 else "draft"
ONLY = {int(a) for a in sys.argv[2:]}
S = {"draft": 0.5, "final": 1.0, "4k": 2.0}[MODE]
W, H, FPS = int(1920 * S), int(1080 * S), 24
WORK = pathlib.Path(f"out/film/{MODE}"); WORK.mkdir(parents=True, exist_ok=True)
NAR = pathlib.Path("out/narration-eleven")
T = json.load(open(NAR / "timings.json"))
BOLD = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
SEMI = "/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf"
IVORY, MIST, TEAL, SKY = (245, 239, 230), (183, 196, 204), (55, 99, 113), (223, 234, 241)
f = lambda v: int(round(v * S))
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18" if MODE != "draft" else "26", "-pix_fmt", "yuv420p", "-r", str(FPS), "-an"]
GRADE = ("eq=contrast=1.12:saturation=1.30:brightness=0.015:gamma=1.05,"
         "colorbalance=rs=-0.03:bs=0.05:gm=0.01:rh=0.02:bh=-0.01,vignette=PI/6")

def run(cmd): subprocess.run(["nice", "-n", "5", "ffmpeg", "-loglevel", "error", "-y"] + [str(c) for c in cmd], check=True)
def font(p, size): return ImageFont.truetype(p, f(size))

# ----------------------------------------------------------------------------- images
def background(glow=(0.62, 0.45)):
    p = WORK / f"bg_{int(glow[0]*100)}_{int(glow[1]*100)}.png"
    if p.exists(): return p
    y, x = np.mgrid[0:H, 0:W]
    d = np.sqrt(((x - glow[0] * W) / (1500 * S)) ** 2 + ((y - glow[1] * H) / (950 * S)) ** 2)
    t = np.clip(d / 0.72, 0, 1)[..., None]
    img = np.array([26, 66, 92]) * (1 - t) + np.array([6, 16, 24]) * t
    g = np.sqrt(((x - 0.22 * W) / (800 * S)) ** 2 + ((y - 1.0 * H) / (560 * S)) ** 2)
    img += (np.clip(1 - g, 0, 1)[..., None] ** 2) * np.array((70, 140, 165)) * 0.55
    Image.fromarray(np.clip(img, 0, 255).astype("uint8")).save(p); return p

def text_png(key, lines, size=96, pos="center", sub=None, subsize=40, color=IVORY, track=0):
    p = WORK / f"txt_{key}.png"
    if p.exists(): return p
    lines = [lines] if isinstance(lines, str) else list(lines)
    subl = [] if sub is None else ([sub] if isinstance(sub, str) else list(sub))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    F, FS = font(BOLD, size), font(SEMI, subsize)
    lh, sh = int(f(size) * 1.14), int(f(subsize) * 1.45)
    total = lh * len(lines) + (f(26) + sh * len(subl) if subl else 0)
    y = (H - total) // 2 if pos == "center" else (f(380) if pos == "left" else (f(170) if pos == "upper" else H - total - f(150)))
    items = [(l, F, color, lh) for l in lines] + [(l, FS, MIST, sh) for l in subl]
    for i, (l, fo, col, step) in enumerate(items):
        if i == len(lines) and subl: y += f(26)
        w = d.textlength(l, font=fo)
        x = (W - w) / 2 if pos != "left" else f(140)
        d.text((x, y), l, font=fo, fill=col + (255,)); y += step
    # soft dark band behind the text so it reads over bright footage
    ys = np.where(np.array(layer)[..., 3].max(axis=1) > 0)[0]
    if len(ys):
        y0, y1 = max(ys.min() - f(150), 0), min(ys.max() + f(150), H)
        band = np.zeros((H, W, 4), dtype="uint8"); prof = np.zeros(H)
        n_ = y1 - y0; prof[y0:y1] = np.sin(np.linspace(0, np.pi, n_)) ** 1.6 * 85
        band[..., 3] = prof[:, None].astype("uint8")
        if pos != "left": layer = Image.alpha_composite(Image.fromarray(band), layer)
    sh_ = layer.filter(ImageFilter.GaussianBlur(f(14))); a = np.array(sh_); a[..., :3] = 0; a[..., 3] = (a[..., 3] * .55).astype("uint8")
    out = Image.alpha_composite(Image.fromarray(a), layer); out.save(p); return p

def wordmark_png(width=1100):
    p = WORK / "wordmark.png"
    if not p.exists():
        subprocess.run(["node", "tools/wordmark.mjs", str(WORK / "wm_raw.png"), str(f(width))], check=True)
        raw = Image.open(WORK / "wm_raw.png").convert("RGBA"); layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        layer.alpha_composite(raw, ((W - raw.width) // 2, (H - raw.height) // 2 - f(30))); layer.save(p)
    return p

# ----------------------------------------------------------------------------- video building blocks
def seg_bg(out, dur, glow=(0.62, 0.45), fade=0.8):
    run(["-loop", 1, "-framerate", FPS, "-i", background(glow), "-t", dur, "-vf", f"fade=t=in:st=0:d={fade},fade=t=out:st={max(dur-fade,0):.2f}:d={fade}"] + ENC + [out])

def seg_black(out, dur):
    run(["-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r={FPS}", "-t", dur] + ENC + [out])

def seg_clip(out, clip, ss, dur, fade=0.6, speed=1.0):
    den = "hqdn3d=1.2:1.2:3:3," if S > 1 else ""
    up = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},unsharp=5:5:0.9:5:5:0.0,"
    bloom = f"split[a][b];[b]gblur=sigma={f(16)},eq=brightness=-0.10[bl];[a][bl]blend=all_mode=screen:all_opacity=0.13,"
    vf = (f"setpts=PTS/{speed},{den}{up}fps={FPS},{GRADE},{bloom}fade=t=in:st=0:d={fade},fade=t=out:st={max(dur-fade,0):.2f}:d={fade},format=yuv420p")
    run(["-ss", ss, "-t", dur * speed, "-i", f"out/stock/{clip}.mp4", "-vf", vf] + ENC + [out])


PHOTOS = pathlib.Path("out/eduvos")
def plate(name, kind):
    """A 2x-size 16:9 plate: the photo cropped to fill ('full'), or as a rounded card on a blurred copy ('card')."""
    p = WORK / f"plate_{name}_{kind}.png"
    if p.exists(): return p
    im = Image.open(next(PHOTOS.glob(name + ".*"))).convert("RGB"); PW, PH = W * 2, H * 2
    def cover(img, w, h):
        r = max(w / img.width, h / img.height); img = img.resize((int(img.width * r) + 1, int(img.height * r) + 1), Image.LANCZOS)
        l, t = (img.width - w) // 2, (img.height - h) // 2; return img.crop((l, t, l + w, t + h))
    if kind == "full": out = cover(im, PW, PH)
    else:
        out = cover(im, PW, PH).filter(ImageFilter.GaussianBlur(PH // 30)); out = Image.eval(out, lambda v: int(v * 0.45))
        ch = int(PH * 0.72); cw = int(im.width * ch / im.height); card = im.resize((cw, ch), Image.LANCZOS)
        m = Image.new("L", card.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw - 1, ch - 1), radius=PH // 45, fill=255)
        sh = Image.new("RGBA", (PW, PH), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle(((PW - cw) // 2 + 10, (PH - ch) // 2 + 40, (PW + cw) // 2 + 10, (PH + ch) // 2 + 60), radius=PH // 45, fill=(0, 0, 0, 170))
        out = out.convert("RGBA"); out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(PH // 40))); out = out.convert("RGB"); out.paste(card, ((PW - cw) // 2, (PH - ch) // 2), m)
    out.save(p); return p

def seg_photo(out, name, dur, kind="full", zoom=1.12, fade=0.7):
    dz = (zoom - 1) / (dur * FPS)
    vf = (f"zoompan=z='min(zoom+{dz:.6f},{zoom})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},"
          f"eq=contrast=1.07:saturation=1.14:gamma=1.03,vignette=PI/6,fade=t=in:st=0:d={fade},fade=t=out:st={max(dur-fade,0):.2f}:d={fade},format=yuv420p")
    run(["-loop", 1, "-framerate", FPS, "-i", plate(name, kind), "-t", dur, "-vf", vf] + ENC + [out])

def concat(parts, out):
    lst = out.with_suffix(".txt"); lst.write_text("".join(f"file '{pathlib.Path(p).resolve()}'\n" for p in parts))
    run(["-f", "concat", "-safe", 0, "-i", lst, "-c", "copy", out])

def overlay_texts(base, texts, dur, out):
    """texts: list of (png, t0, t1). Each fades in with a small rise and fades out."""
    if not texts: pathlib.Path(out).write_bytes(pathlib.Path(base).read_bytes()); return
    cmd = ["-i", base]; fc = []; prev = "[0:v]"
    for k, (png, t0, t1) in enumerate(texts, 1):
        cmd += ["-loop", 1, "-framerate", FPS, "-t", dur, "-i", png]
        fc.append(f"[{k}:v]format=rgba,fade=t=in:st={t0:.2f}:d=0.7:alpha=1,fade=t=out:st={max(t1-0.7,t0):.2f}:d=0.7:alpha=1[t{k}]")
        rise = f"if(lt(t,{t0:.2f}),{f(26)},{f(26)}*pow(max(0,1-(t-{t0:.2f})/0.9),2))"
        fc.append(f"{prev}[t{k}]overlay=x=0:y='{rise}':eval=frame:format=auto[o{k}]"); prev = f"[o{k}]"
    run(cmd + ["-filter_complex", ";".join(fc), "-map", prev, "-t", dur] + ENC + [out])

# the phone
FW, FH = f(430) // 2 * 2, f(932) // 2 * 2; FX, FY = f(1360), (H - f(932)) // 2
def phone_frame():
    p = WORK / "phone_frame.png"
    if p.exists(): return p
    pad = f(26); bw, bh = FW + 2 * pad, FH + 2 * pad
    body = Image.new("RGBA", (bw, bh)); bd = ImageDraw.Draw(body)
    for i in range(bw):
        v = int(150 + 80 * (1 - abs(i / bw - .35) * 1.6)); bd.line([(i, 0), (i, bh)], fill=(v, v + 3, v + 8, 255))
    m = Image.new("L", body.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, bw - 1, bh - 1), radius=f(84), fill=255)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); img.paste(body, (FX - pad, FY - pad), m)
    ImageDraw.Draw(img).rounded_rectangle((FX - f(10), FY - f(10), FX + FW + f(10), FY + FH + f(10)), radius=f(62), fill=(6, 8, 10, 255))
    cut = Image.new("L", (W, H), 255); ImageDraw.Draw(cut).rounded_rectangle((FX, FY, FX + FW, FY + FH), radius=f(52), fill=0)
    a = np.array(img); a[..., 3] = np.minimum(a[..., 3], np.array(cut)); img = Image.fromarray(a)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((FX - f(30), FY + f(20), FX + FW + f(30), FY + FH + f(50)), radius=f(90), fill=(0, 0, 0, 150))
    full = Image.new("RGBA", (W, H), (0, 0, 0, 0)); full.alpha_composite(sh.filter(ImageFilter.GaussianBlur(f(40)))); full.alpha_composite(img)
    fa = np.array(full); fa[..., 3] = np.minimum(fa[..., 3], np.array(cut)); Image.fromarray(fa).save(p); return p

def app_base(out, segs, dur, tag):
    parts = []; assert abs(sum(s[2] for s in segs) - dur) < 0.01, (tag, sum(s[2] for s in segs), dur)
    for i, (a, b, d) in enumerate(segs):
        sp = WORK / f"{tag}_a{i}.mp4"
        run(["-ss", a, "-t", b - a, "-i", "out/tour-review.mp4", "-vf", f"setpts=(PTS-STARTPTS)*{d/(b-a):.6f},fps={FPS},scale={FW}:{FH}:flags=lanczos,eq=contrast=1.05:saturation=1.12,unsharp=3:3:0.5", "-t", d,
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", "-an", sp]); parts.append(sp)
    clip = WORK / f"{tag}_clip.mp4"; concat(parts, clip)
    fl = (f"[0:v][1:v]overlay={FX}:{FY}[a];[a][2:v]overlay=0:0,fade=t=in:st=0:d=0.8,fade=t=out:st={dur-0.8:.2f}:d=0.8")
    run(["-loop", 1, "-framerate", FPS, "-i", background((0.7, 0.5)), "-i", clip, "-loop", 1, "-framerate", FPS, "-i", phone_frame(), "-filter_complex", fl, "-t", dur] + ENC + [out])

# ----------------------------------------------------------------------------- the film
NOFF = {1: 6}                                   # narration starts 6 s into scene 1, 2 s into the others
def L(n, i, edge="start"): return NOFF.get(n, 2) + T[f"{n:02d}"][i][edge]
def tx(n, key, i, lines, j=None, size=96, pos="center", sub=None, subsize=40, lead=0.0, tail=0.4):
    j = i if j is None else j
    return (text_png(f"{n}_{key}", lines, size, pos, sub, subsize), L(n, i) + lead, L(n, j, "end") + tail)

SCENES = {}
def scene(n, window, kind, **kw): SCENES[n] = (window, kind, kw)

# 01 opening: black, campus, hands and phones, buyer/seller/courier flashes, logo reveal  (music: Cinematic_Build)
scene(1, 75, "story", parts=[("black", 6), ("photo", "potchefstroom-carousel-01", 7), ("photo", "potchefstroom-carousel-03", 6.8), ("wm", 6.2), ("clip", "39774", 1, 5), ("photo", "potchefstroom-Feature-02", 5, "card"),
                              ("clip", "31999", 0.5, 5), ("photo", "potchefstroom-carousel-02", 5), ("photo", "potchefstroom-carousel-01", 4.6), ("wm", 24.4)],
      texts=lambda n: [tx(n, "a", 0, ["Every campus", "has an economy."]), tx(n, "b", 1, ["People looking for something.", "Students building something."], size=70),
                       tx(n, "c", 2, ["What happens when", "all of it is connected?"]),
                       (text_png("1_d", "INTRODUCING", 40, "upper"), 19.6, 24.6),
                       (text_png("1_buy", "BUY.", 150), 27.0, 29.2), (text_png("1_sell", "SELL.", 150), 32.0, 34.2), (text_png("1_del", "DELIVER.", 150), 37.0, 39.6),
                       (text_png("1_tag", ["One campus. Multiple opportunities.", "One connected marketplace."], 54, "lower"), 56.0, 73.5)])
scene(2, 75, "story", parts=[("photo", "potchefstroom-carousel-03", 7), ("photo", "potchefstroom-Feature-01", 8, "card"), ("photo", "potchefstroom-carousel-02", 8), ("photo", "potchefstroom-Feature-02", 5.2, "card"), ("bg", 8, (0.5, 0.5)), ("app", [(1016.9, 1070.5, 38.8)])],
      texts=lambda n: [tx(n, "a", 0, "Welcome."), (text_png("2_b", "BUY.", 150), L(n, 1) + 0.2, L(n, 1) + 3.0), (text_png("2_s", "SELL.", 150), L(n, 1) + 3.2, L(n, 1) + 6.0),
                       (text_png("2_d", "DISCOVER.", 150), L(n, 1) + 6.2, L(n, 1) + 9.4), tx(n, "c", 2, "It works, but it is scattered.", size=84),
                       tx(n, "d", 3, ["We think those moments", "belong together."], size=84), tx(n, "e", 4, "That is Vossie.", size=120)])
scene(3, 90, "story", parts=[("clip", "42123", 2, 8), ("clip", "4915", 4, 6), ("clip", "31999", 1, 6.2), ("photo", "potchefstroom-carousel-01", 5.2), ("bg", 8, (0.5, 0.5)), ("app", [(990.9, 1092.5, 56.6)])],
      texts=lambda n: [tx(n, "a", 0, "Picture an ordinary day.", size=84), tx(n, "b", 1, "DISCOVERY", sub="A student needs something."), tx(n, "c", 2, "COMMERCE", sub="A student entrepreneur has something to sell."),
                       tx(n, "d", 3, "FULFILMENT", sub="How does it get from one person to the other?"), tx(n, "e", 4, ["One story, told in", "three disconnected places."], size=80),
                       tx(n, "f", 5, "Vossie connects them.", size=100)])
scene(4, 90, "story", parts=[("bg", 12, (0.5, 0.5)), ("photo", "potchefstroom-carousel-01", 7), ("bg", 8, (0.5, 0.5)), ("app", [(1329, 1371.6, 25), (1730.5, 1762.8, 19), (1016.9, 1056.5, 19)])],
      texts=lambda n: [tx(n, "a", 0, ["At the centre of Vossie", "is a simple idea."], size=84), tx(n, "b", 1, ["Different people.", "One marketplace."], size=84, sub="Each with different tools."),
                       (text_png("4_buyer", "BUYER", 150), L(n, 2) + 0.3, L(n, 2) + 3.2), (text_png("4_seller", "SELLER", 150), L(n, 2) + 3.4, L(n, 2) + 6.4), (text_png("4_courier", "COURIER", 150), L(n, 2) + 6.6, L(n, 2) + 9.3),
                       tx(n, "c", 3, ["One app. Three roles.", "One connected marketplace."], size=84), tx(n, "d", 4, "Let me show you.", size=100)])

def prod(n, window, label, segs, caps):
    scene(n, window, "app", label=label, segs=segs, caps=caps)
prod(5, 90, "BUYER", [(39.9, 58.8, 9), (1016.9, 1056.5, 17), (2194.5, 2277.2, 19), (321.9, 333.0, 7), (333.3, 371.0, 38)],
     [(1, ["Sign in with", "your Eduvos account"], "Student card verified"), (2, ["Home, Explore,", "Reels, Activity"], "Everything on your campus"),
      (3, ["Study notes,", "by module"], "Read two pages free. Pay once. Yours to keep."), (4, ["Pick it. Pay.", "Follow it."], "To your hands")])
prod(6, 105, "SELLER", [(63.3, 137.3, 17), (179.3, 206.7, 6), (2040.3, 2107.6, 19), (566.3, 583.1, 8), (1329, 1388.7, 55)],
     [(1, ["Open a shop", "in minutes"], "Name, logo, banner, location"), (2, ["List a product", "in a minute"], "A photo, a name, a price"),
      (3, ["Turn your notes", "into income"], "Module, campus, PDF, publish"), (4, ["Accept. Prepare.", "Hand over."], "Earnings and payouts in view")])
prod(7, 90, "COURIER", [(659.7, 668.2, 5), (668.2, 713.5, 14), (1919.1, 1950.0, 8), (754.0, 806.8, 8), (806.8, 839.5, 20), (905.4, 987.0, 35)],
     [(0, ["It ends when", "the item arrives"], None), (1, ["Jobs, codes,", "live tracking"], "Collect with the seller's code. Deliver with the buyer's."),
      (2, ["Campus Hub"], "A place to wait, hand over and collect"), (3, ["Seller. Hub.", "Courier. Buyer."], "One clear journey")])
prod(8, 60, "OPERATIONS", [(1919.1, 2002.4, 60)],
     [(1, ["Four views"], "Campus Hub · Transfers · Incubation · Activity log"), (2, ["Every approval", "and hand-over, traced"], None)])
prod(9, 75, "TRUST", [(15.4, 39.9, 12), (371.3, 394.2, 14), (621.1, 659.7, 20), (1115.8, 1181.8, 29)],
     [(1, ["Your Eduvos account.", "Your role."], "One clear design for buyers, sellers and couriers"), (2, ["Easy to use."], None)])

scene(10, 75, "story", parts=[("photo", "potchefstroom-carousel-03", 6), ("photo", "potchefstroom-Feature-01", 7, "card"), ("photo", "potchefstroom-carousel-01", 6), ("photo", "potchefstroom-Feature-02", 5.3, "card"), ("photo", "potchefstroom-carousel-02", 7), ("bg", 9, (0.5, 0.5)), ("photo", "potchefstroom-carousel-01", 7), ("bg", 27.7, (0.5, 0.5))],
      texts=lambda n: [tx(n, "a", 0, ["What sits around", "a single sale."], size=84), tx(n, "b", 1, ["Buyers. Sellers.", "Delivery. Campus operations."], size=70, sub="Working as one."),
                       (text_png("10_s", ["For students,", "a place made for campus life."], 70), L(n, 2), L(n, 2) + 4.5), (text_png("10_e", ["For student entrepreneurs,", "a way to reach customers."], 70), L(n, 2) + 4.7, L(n, 2) + 8.2),
                       (text_png("10_c", ["For campuses and partners,", "a more connected way to bring commerce on campus."], 56), L(n, 2) + 8.4, L(n, 2) + 11.5),
                       tx(n, "d", 3, ["For investors, an integrated", "marketplace that can grow", "beyond where it starts."], size=64),
                       tx(n, "f", 4, ["Prove the experience.", "Earn real participation.", "Grow responsibly."], size=72, tail=3.0),
                       (text_png("10_x", "USERS  ·  SELLERS  ·  TRANSACTIONS  ·  OPERATIONS", 48), 63.0, 73.5)])
scene(11, 45, "story", parts=[("bg", 45, (0.5, 0.5))],
      texts=lambda n: [tx(n, "a", 0, ["Today is an introduction,", "and a starting point."], size=80), (text_png("11_b", "BUILD", 140, sub=["Refine the product", "(proposed)"]), L(n, 1) + 0.3, L(n, 1) + 3.4),
                       (text_png("11_v", "VALIDATE", 140, sub=["Test with real students", "(proposed)"]), L(n, 1) + 3.6, L(n, 1) + 6.8), (text_png("11_s", "SCALE", 140, sub=["Grow carefully, campus by campus", "(proposed)"]), L(n, 1) + 7.0, L(n, 1) + 10.3),
                       tx(n, "c", 2, ["Everything on this roadmap is proposed.", "We will earn each step."], size=64), tx(n, "d", 3, "That is what we are building with Vossie.", size=64, tail=5)])
scene(12, 30, "story", parts=[("photo", "potchefstroom-carousel-01", 12, "full"), ("bg", 4, (0.5, 0.5)), ("wm", 6), ("bg", 8, (0.5, 0.5))],
      texts=lambda n: [tx(n, "a", 0, ["One campus.", "Multiple opportunities.", "One connected marketplace."], size=76),
                       (text_png("12_t", "THIS IS VOSSIE MARKETPLACE", 36, "lower"), 14.0, 18.5), (text_png("12_e", "DISCOVER.  CONNECT.  TRADE.", 92), 19.5, 29.2)])

def build_scene(n):
    window, kind, kw = SCENES[n]; out = WORK / f"scene{n:02d}.mp4"
    base = WORK / f"scene{n:02d}_base.mp4"
    if kind == "app":
        app_base(base, kw["segs"], window, f"s{n}")
        txts = []
        for i, (li, big, small) in enumerate(kw["caps"]):
            t0, t1 = L(n, li), L(n, li, "end") + 2.5
            txts.append((text_png(f"{n}_c{i}", big, 96, "left", small, 38), t0, t1))
    else:
        parts = []
        for k, p in enumerate(kw["parts"]):
            o = WORK / f"scene{n:02d}_p{k}.mp4"
            if p[0] == "black": seg_black(o, p[1])
            elif p[0] == "bg": seg_bg(o, p[1], p[2])
            elif p[0] == "wm":
                tmp = WORK / f"scene{n:02d}_p{k}_b.mp4"; seg_bg(tmp, p[1], (0.5, 0.5)); overlay_texts(tmp, [(wordmark_png(), 0.4, p[1] - 0.2)], p[1], o)
            elif p[0] == "clip": seg_clip(o, p[1], p[2], p[3])
            elif p[0] == "photo": seg_photo(o, p[1], p[2], p[3] if len(p) > 3 else "full")
            elif p[0] == "app":
                app_base(o, p[1], sum(s[2] for s in p[1]), f"s{n}k{k}")
            parts.append(o)
        concat(parts, base); txts = kw["texts"](n)
    overlay_texts(base, txts, window, out); return out

def build_audio():
    SR = 24000; track = bytearray(b"\x00\x00" * SR * 900)
    for n in range(1, 13):
        start = {1: 0, 2: 75, 3: 150, 4: 240, 5: 330, 6: 420, 7: 525, 8: 615, 9: 675, 10: 750, 11: 825, 12: 870}[n]
        with wave.open(str(NAR / f"s{n:02d}.wav")) as w: pcm = w.readframes(w.getnframes())
        s = int((start + NOFF.get(n, 2)) * SR) * 2; track[s:s + len(pcm)] = pcm[:len(track) - s]
    nar = WORK / "narration900.wav"
    with wave.open(str(nar), "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(track))
    U = "/root/.claude/uploads/23b01a34-c10e-5ef5-8948-1dd6d643671a/"
    cb, gp, wr = U + "9a9bce52-Cinematic_Build.mp3", U + "78585b61-Gentle_Pulse.mp3", U + "32e49ca5-Warm_Resolve.mp3"
    fl = ("[0:a]aresample=48000,volume=0.9,atrim=0:77,afade=t=out:st=70:d=7[cb];"
          "[1:a]aresample=48000,asplit=4[g1][g2][g3][g4];[g1][g2]acrossfade=d=3[x1];[x1][g3]acrossfade=d=3[x2];[x2][g4]acrossfade=d=3[x3];"
          "[x3]volume=0.55,atrim=0:818,afade=t=in:d=4,afade=t=out:st=800:d=18,adelay=72000|72000[gp];"
          "[2:a]aresample=48000,atempo=0.8,volume=0.8,afade=t=out:st=20:d=2,adelay=868000|868000[wr];"
          "[cb][gp][wr]amix=inputs=3:duration=longest:normalize=0,atrim=0:900[mus];"
          "[3:a]aresample=48000,volume=1.5,asplit[n1][n2];[mus][n1]sidechaincompress=threshold=0.02:ratio=9:attack=30:release=700[md];"
          "[md][n2]amix=inputs=2:duration=longest:normalize=0,atrim=0:900,loudnorm=I=-16:TP=-1.5:LRA=11[o]")
    mix = WORK / "audio.m4a"
    run(["-i", cb, "-i", gp, "-i", wr, "-i", nar, "-filter_complex", fl, "-map", "[o]", "-c:a", "aac", "-b:a", "256k", mix]); return mix

if __name__ == "__main__":
    nums = sorted(ONLY or SCENES)
    for n in nums: print("scene", n, flush=True); build_scene(n)
    if not ONLY:
        lst = WORK / "all.txt"; lst.write_text("".join(f"file '{(WORK / f'scene{n:02d}.mp4').resolve()}'\n" for n in sorted(SCENES)))
        video = WORK / "video.mp4"; run(["-f", "concat", "-safe", 0, "-i", lst, "-c", "copy", video])
        audio = build_audio(); out = pathlib.Path(f"out/film/vossie-launch-{MODE}.mp4")
        run(["-i", video, "-i", audio, "-c:v", "copy", "-c:a", "copy", "-movflags", "+faststart", "-shortest", out]); print("wrote", out)
