"""Assemble the final Vossie walkthrough: speed-ramp the raw recording, synthesise music + SFX, mux to MP4."""
import glob, json, subprocess, sys, wave
import numpy as np

OFFSET = float(sys.argv[1]) if len(sys.argv) > 1 else 0.8   # video time = script time + OFFSET
RAW = glob.glob('out/rawwalk/*.webm')[0]
M = json.load(open('out/walk-marks.json'))
marks, taps = M['marks'], M['taps']

import re
SEC = {}
for line in open('out/final-run.log', encoding='utf-8', errors='ignore'):
    m = re.match(r'\[([\d.]+)s\] >> (\S+)', line)
    if m: SEC[m.group(2)] = float(m.group(1))
def sec(n): return SEC[n]
# (start, end, speed) in script time. Anything between is 1x.
RAMPS = [
    (sec('buyer-browse'), sec('buyer-account'), 1.15),
    (sec('buyer-account'), sec('buyer-checkout'), 2.2),          # rewards / wallet tour
    (sec('buyer-checkout'), sec('buyer-track'), 1.25),
    (sec('seller-setup'), sec('seller-orders'), 2.2),            # shop setup forms
    (sec('seller-orders'), sec('seller-payout'), 1.2),
    (sec('courier-setup'), sec('courier-live'), 2.5),            # courier + car setup forms
    (sec('courier-live'), marks['rampStart'], 1.3),
    (marks['rampStart'], marks['rampEnd'], 8.0),                 # waiting for the courier to arrive
    (sec('courier-cash'), sec('outro'), 1.3),
]
END = marks['end'] + 1.0

# build segments
segs, t = [], 0.0
for a, b, sp in sorted(RAMPS):
    if a > t: segs.append((t, a, 1.0))
    segs.append((a, b, sp)); t = b
segs.append((t, END, 1.0))

# output-time mapping
def out_time(x):
    o = 0.0
    for a, b, sp in segs:
        if x >= b: o += (b - a) / sp
        elif x >= a: return o + (x - a) / sp
        else: break
    return o
OUT_LEN = out_time(END)
print('output length', round(OUT_LEN, 1), 's')

# ---------- video ----------
parts, labels = [], []
for i, (a, b, sp) in enumerate(segs):
    parts.append(f"[0:v]trim=start={a+OFFSET:.3f}:end={b+OFFSET:.3f},setpts=(PTS-STARTPTS)/{sp},fps=30[v{i}]")
    labels.append(f"[v{i}]")
fc = ';'.join(parts) + ';' + ''.join(labels) + f"concat=n={len(segs)}:v=1:a=0[v]"
open('out/_fc.txt', 'w').write(fc)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', RAW, '-/filter_complex', 'out/_fc.txt', '-map', '[v]',
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', 'out/_video.mp4'], check=True)

# ---------- audio ----------
SR = 44100
N = int((OUT_LEN + 1) * SR)
L = np.zeros(N); R = np.zeros(N)
tt = np.arange(N) / SR

def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N: return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(pan, 0))
    R[i:i + len(sig)] += sig * gain * (1 + min(pan, 0))

def env(n, a=0.01, d=0.5):
    x = np.arange(n) / SR
    return np.minimum(x / a, 1) * np.exp(-x / d)

# pad: slow chord progression Am - F - C - G, 16 s each
chords = [(110, 164.8, 220, 261.6), (87.3, 130.8, 174.6, 261.6), (130.8, 196, 261.6, 329.6), (98, 146.8, 196, 293.7)]
pad = np.zeros(N)
for k in range(int(OUT_LEN // 16) + 2):
    ch = chords[k % 4]
    a0, a1 = int(k * 16 * SR), min(int((k * 16 + 18) * SR), N)
    if a0 >= N: break
    x = tt[a0:a1] - k * 16
    e = np.clip(x / 5, 0, 1) * np.clip((18 - x) / 5, 0, 1)
    for j, f in enumerate(ch):
        pad[a0:a1] += (np.sin(2 * np.pi * f * x) + .4 * np.sin(2 * np.pi * f * 2.003 * x) + .2 * np.sin(2 * np.pi * f * .5 * x)) * e * (.55 if j == 0 else .3)
pad *= (0.5 + 0.5 * np.sin(2 * np.pi * tt / 11 - 1))   # slow swell
L += pad * .085; R += pad * .085

# soft arpeggio from sign-in on
start_arp = out_time(marks['signin'])
scale = [220, 261.6, 329.6, 392, 329.6, 261.6, 293.7, 349.2, 440, 349.2, 293.7, 261.6]
step = 60 / 96 / 2
k = 0; x = start_arp
while x < OUT_LEN - 3:
    f = scale[k % len(scale)] * (2 if (k // 24) % 2 else 1)
    n = int(1.1 * SR)
    note = (np.sin(2 * np.pi * f * np.arange(n) / SR) + .3 * np.sin(2 * np.pi * 2 * f * np.arange(n) / SR)) * env(n, .005, .28)
    add(note, x, .05, pan=((k % 5) - 2) / 8)
    x += step; k += 1

# gentle kick pulse, grows during the courier + outro
for beat in np.arange(start_arp + 8, OUT_LEN - 4, 60 / 96):
    n = int(.35 * SR); xx = np.arange(n) / SR
    kick = np.sin(2 * np.pi * (48 + 60 * np.exp(-xx * 30)) * xx) * np.exp(-xx * 9)
    add(kick, beat, .10 if beat > out_time(marks['courier']) else .06)

# impacts at act changes + logo land
def boom(t, big=1.0):
    n = int(2.2 * SR); xx = np.arange(n) / SR
    b = np.sin(2 * np.pi * (42 + 30 * np.exp(-xx * 6)) * xx) * np.exp(-xx * 2.2)
    noise = np.random.default_rng(int(t * 100)).standard_normal(n)
    sw = np.convolve(noise, np.ones(40) / 40, mode='same') * np.exp(-xx * 2.8) * np.minimum(xx / .5, 1) * .25
    add(b * .55 * big + sw * big, t, 1.0)
for key, g in [('logoLand', 1.2), ('buyer', .7), ('seller', .9), ('courier', .9), ('outro', 1.1)]:
    if key in marks: boom(max(0, out_time(marks[key]) - 0.05), g)

# tap clicks (thinned)
last = -1
rng = np.random.default_rng(7)
for tp in taps:
    ot = out_time(tp)
    if ot - last < .35: continue
    last = ot
    n = int(.09 * SR); xx = np.arange(n) / SR
    f = 1400 + rng.integers(0, 800)
    click = (np.sin(2 * np.pi * f * xx) * np.exp(-xx * 60) + .5 * np.sin(2 * np.pi * f * 1.5 * xx) * np.exp(-xx * 90))
    add(click, ot, .16, pan=rng.uniform(-.2, .2))

# master: fades, soft clip, normalise
fade = np.minimum(tt / 1.2, 1) * np.clip((OUT_LEN + .5 - tt) / 3.0, 0, 1)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max(), 1e-6)
L = np.tanh(L / peak * 1.6) * .8; R = np.tanh(R / peak * 1.6) * .8
pcm = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open('out/_audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'out/_video.mp4', '-i', 'out/_audio.wav', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                '-shortest', '-movflags', '+faststart', 'out/vossie-walkthrough.mp4'], check=True)
print('wrote out/vossie-walkthrough.mp4')
