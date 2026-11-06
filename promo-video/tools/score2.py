"""Apple-keynote style score for the Vossie launch film (pure numpy).
Usage: python tools/score2.py [film.json] [out.wav]   (defaults out/film.json, out/score.wav)
Hit types: impact title bounce logo whoosh tap ding ring cash swipe (unknown types ignored).
Duration = film['end'] + 3 s. Targets about -16 LUFS (K-weighted approx), peak below -1 dBFS."""
import json, wave, sys
import numpy as np

SR = 44100
src = sys.argv[1] if len(sys.argv) > 1 else 'out/film.json'
dst = sys.argv[2] if len(sys.argv) > 2 else 'out/score.wav'
film = json.load(open(src))
END = float(film['end'])
DUR = END + 3.0
N = int(DUR * SR)
rng = np.random.default_rng(7)
L = np.zeros(N, dtype=np.float32); R = np.zeros(N, dtype=np.float32)
DRY_L = np.zeros(N, dtype=np.float32); DRY_R = np.zeros(N, dtype=np.float32)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def T(d): return np.arange(int(d * SR)) / SR

def add(sig, t, gain=1.0, pan=0.0, wet=True):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = np.asarray(sig[: N - i], dtype=np.float32)
    gl = gain * (1 - max(pan, 0) * .7); gr = gain * (1 + min(pan, 0) * .7)
    a, b = (L, R) if wet else (DRY_L, DRY_R)
    a[i:i + len(sig)] += sig * gl; b[i:i + len(sig)] += sig * gr

def lp(x, n):  # moving-average lowpass
    return np.convolve(x, np.ones(n) / n, mode='same')
def hp(x, n): return x - lp(x, n)

# ---------- instruments ----------
def pad(notes, dur):
    x = T(dur); out = np.zeros(len(x))
    for m in notes:
        f = mtof(m)
        for det in (-.003, 0, .003):
            ph = rng.uniform(0, 6.28)
            out += np.sin(2 * np.pi * f * (1 + det) * x + ph)
            out += .3 * np.sin(2 * np.pi * 2 * f * (1 + det) * x + ph)
            out += .08 * np.sin(2 * np.pi * 3 * f * x + ph)
    env = np.minimum(x / 3.0, 1) * np.minimum((dur - x) / 3.0, 1)
    return out * env * (.92 + .08 * np.sin(2 * np.pi * x / 6.1)) / (len(notes) * 3)

def sub_thump(f0=55, dur=1.6, drop=40):
    x = T(dur)
    s = np.sin(2 * np.pi * (f0 + drop * np.exp(-x * 14)) * x) * np.exp(-x * 3.2)
    return s * np.minimum(x / .004, 1)

def bell(m, dur=2.4, bright=1.0):
    x = T(dur); f = mtof(m); out = np.zeros(len(x))
    for r, a, d in [(1, 1, 1.1), (2.0, .35, .6), (2.76, .18 * bright, .35), (4.1, .08 * bright, .2), (5.4, .04 * bright, .12)]:
        out += a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / d)
    return out * np.minimum(x / .003, 1)

def pluck(m, dur=1.4):
    x = T(dur); f = mtof(m); out = np.zeros(len(x))
    for h, a, d in [(1, 1, .5), (2, .35, .25), (3, .15, .15), (4, .06, .1)]:
        out += a * np.sin(2 * np.pi * f * h * x) * np.exp(-x / d)
    return out * np.minimum(x / .004, 1)

def noise_sweep(dur, up=True, bright=1.0):
    n = int(dur * SR); x = np.arange(n) / SR
    nz = rng.standard_normal(n)
    k = x / dur if up else 1 - x / dur
    dark = lp(nz, 40); mid = lp(nz, 8); br = hp(nz, 3)
    mix = dark * (1 - k) ** 2 * 1.2 + mid * 2 * k * (1 - k) + br * k ** 2 * .6 * bright
    if up: env = np.clip(x / dur, 0, 1) ** 2.2 * np.minimum((dur - x) / .05, 1)
    else: env = np.sin(np.pi * np.clip(x / dur, 0, 1)) ** 1.2
    return mix * env

# ---------- bed: sparse warm pad ----------
CH = [[48, 55, 59, 64, 71], [45, 52, 59, 64, 67], [41, 53, 57, 64, 69], [43, 55, 59, 62, 69]]
SEG = 9.0
pts = [(0, 0.0), (2.0, .6), (END * .5, .85), (END - 6, .8), (END, .25), (DUR, 0)]
def energy(t): return float(np.interp(t, [p[0] for p in pts], [p[1] for p in pts]))
k = 0; t = 0.0
while t < DUR - 2:
    add(pad(CH[k % 4], SEG + 4), t, .55 * (.55 + .45 * energy(t + 4)))
    k += 1; t += SEG
# soft pulse: quiet sub heartbeat every 2 s
pt = 1.0
while pt < END - 1:
    add(sub_thump(48, .7, 18), pt, .09 * energy(pt), wet=False)
    pt += 2.0
# sparse high plucks
pent = [72, 74, 76, 79, 81, 84]
st = 6.0
while st < END - 4:
    add(pluck(pent[int(rng.integers(0, len(pent)))], 1.6), st, .035 * energy(st), pan=float(rng.uniform(-.6, .6)))
    st += float(rng.uniform(3.0, 6.0))

# ---------- risers into scene changes ----------
sc = film.get('scenes') or {}
changes = sorted({float(v) for v in sc.values() if isinstance(v, (int, float)) and 2.5 < float(v) < END})
for ts in changes:
    add(noise_sweep(2.0, True, .9), ts - 2.0, .10)
    add(sub_thump(50, 1.0, 20), ts, .22, wet=False)

# ---------- hits ----------
for h in film.get('hits', []):
    try: ty, ts, g = h['type'], float(h['t']), float(h.get('g', 1) or 1)
    except Exception: continue
    g = max(.05, min(g, 6.0))
    ga = min(g, 2.0)
    if ty == 'impact':
        add(sub_thump(46, 2.4, 50), ts, .75 * ga, wet=False)
        add(lp(rng.standard_normal(int(.5 * SR)), 30) * np.exp(-T(.5) * 9), ts, .12 * ga)
    elif ty == 'title':
        add(bell(79, 2.6), ts, .13 * ga, pan=.15)
        add(bell(86, 2.0, .6), ts + .04, .05 * ga, pan=-.15)
    elif ty == 'bounce':  # pitch rises with g (bounce index)
        f = 85 + 28 * min(g, 6); x = T(.35)
        add(np.sin(2 * np.pi * f * x * (1 - x * .6)) * np.exp(-x * 14) * np.minimum(x / .002, 1), ts, .5, wet=False)
    elif ty == 'logo':
        add(noise_sweep(1.4, True, .8), ts - 1.4, .09)
        for i, o in enumerate([0, 7, 12, 16, 19, 24]):
            add(bell(72 + o, 4.0, 1.2), ts + i * .05, .10 * ga / (1 + i * .25), pan=(i - 2.5) / 8)
        add(sub_thump(52, 2.0, 25), ts, .35 * ga, wet=False)
    elif ty == 'whoosh':
        add(noise_sweep(.9, True, 1.0), ts - .6, .12 * ga)
        add(noise_sweep(.6, False, .8), ts, .06 * ga)
    elif ty == 'tap':
        x = T(.03)
        add(np.sin(2 * np.pi * 2400 * x) * np.exp(-x * 220) * .5 + hp(rng.standard_normal(len(x)), 3) * np.exp(-x * 300) * .15, ts, .09 * ga, wet=False)
    elif ty == 'ding':
        add(bell(88, 1.4, .8), ts, .11 * ga, pan=.1); add(bell(93, 1.2, .6), ts + .11, .09 * ga, pan=.1)
    elif ty == 'ring':  # phone ringtone: 2 warbling bursts
        for b in range(2):
            x = T(.5)
            wob = np.where((x * 16).astype(int) % 2 == 0, 880.0, 698.5)
            ph = 2 * np.pi * np.cumsum(wob) / SR
            sig = (np.sin(ph) + .2 * np.sin(2 * ph)) * np.minimum(x / .01, 1) * np.minimum((.5 - x) / .04, 1)
            add(sig, ts + b * .75, .09 * ga)
    elif ty == 'cash':
        add(bell(91, 1.0, 1.4), ts, .10 * ga, pan=-.1); add(bell(96, 1.6, 1.4), ts + .09, .10 * ga, pan=-.1)
        x = T(.05); add(hp(rng.standard_normal(len(x)), 3) * np.exp(-x * 150), ts, .06 * ga, wet=False)
    elif ty == 'swipe':
        add(noise_sweep(.22, True, .8) * .8 + noise_sweep(.22, False, .6) * .4, ts - .1, .09 * ga)
    # unknown types ignored

# ---------- reverb ----------
def reverb(sig, secs, wet):
    n = int(secs * SR); x = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-x / (secs * .28))
    ir = lp(ir, 10); ir[:int(.015 * SR)] *= np.linspace(0, 1, int(.015 * SR))
    m = 1 << int(np.ceil(np.log2(len(sig) + n)))
    out = np.fft.irfft(np.fft.rfft(sig, m) * np.fft.rfft(ir, m), m)[: len(sig)]
    return out * wet / (np.abs(ir).sum() ** .5 + 1e-9) * 3.0

L = L + reverb(L, 3.0, .22) + DRY_L
R = R + reverb(R, 3.4, .22) + DRY_R

# ---------- master: fades, ~-16 LUFS, peak < -1 dBFS ----------
tt = np.arange(N) / SR
fade = np.minimum(tt / 1.5, 1) * np.clip((DUR - tt) / 2.5, 0, 1)
x = np.stack([L * fade, R * fade]).astype(np.float64)

def kweight(sig):
    n = len(sig); F = np.fft.rfft(sig); f = np.fft.rfftfreq(n, 1 / SR)
    hpf = (f / 38.0) ** 2 / (1 + (f / 38.0) ** 2)
    shelf = 1 + (10 ** (4 / 20) - 1) * (f / 1700) ** 2 / (1 + (f / 1700) ** 2)
    return np.fft.irfft(F * hpf * shelf, n)

def lufs(x):
    kw = [kweight(c) for c in x]; blk = int(.4 * SR); hop = int(.1 * SR)
    ms = np.array([sum(np.mean(c[i:i + blk] ** 2) for c in kw) for i in range(0, N - blk, hop)])
    l = -.691 + 10 * np.log10(ms + 1e-12)
    g1 = ms[l > -70]
    if len(g1) == 0: return -70.0
    rel = -.691 + 10 * np.log10(g1.mean()) - 10
    g2 = ms[l > max(rel, -70)]
    return -.691 + 10 * np.log10(g2.mean() + 1e-12)

CEIL = 10 ** (-1.5 / 20)
for _ in range(4):
    x = x * 10 ** ((-16 - lufs(x)) / 20)
    if np.abs(x).max() > CEIL:  # soft-knee limiter on peaks only
        thr = CEIL * .6; a = np.abs(x)
        x = np.where(a > thr, np.sign(x) * (thr + (CEIL - thr) * np.tanh((a - thr) / (CEIL - thr))), x)
    x = np.clip(x, -CEIL, CEIL)
final = lufs(x); peak = np.abs(x).max()
pcm = (x.T * 32767).astype('<i2')
with wave.open(dst, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'wrote {dst}  {DUR:.1f}s  ~{final:.1f} LUFS  peak {20 * np.log10(peak):.2f} dBFS')
