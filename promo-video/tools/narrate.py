"""Builds the narrator track from NARRATION.md with Piper (offline TTS).

usage: python tools/narrate.py <voice.onnx> [out_dir]

For every scene heading ("## 05 The buyer, 05:30 to 07:00 ...") it speaks the quoted lines,
turns "[pause]" into silence, and writes out/narration/sNN.wav. It then lays each scene at its
start time into out/narration/narration.wav (15:00 long), and prints any scene whose speech
runs past its window so it can be trimmed.
"""
import re, sys, wave, subprocess, pathlib

voice = sys.argv[1]
out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "out/narration")
out.mkdir(parents=True, exist_ok=True)
text = pathlib.Path(__file__).resolve().parent.parent.joinpath("NARRATION.md").read_text(encoding="utf-8")

SR = 22050
PAUSE = 0.9   # seconds for [pause]
LINE_GAP = 0.35

def mmss(s):
    m, sec = s.split(":")
    return int(m) * 60 + int(sec)

scenes = []
for m in re.finditer(r"^## (\d\d) .*?, (\d\d:\d\d) to (\d\d:\d\d)[^\n]*\n(.*?)(?=^## |^---|\Z)", text, re.M | re.S):
    n, a, b, body = m.groups()
    lines = [l[1:].strip() for l in body.splitlines() if l.startswith(">")]
    if lines:
        scenes.append((n, mmss(a), mmss(b), lines))

def synth(sentence, path):
    subprocess.run([sys.executable, "-m", "piper", "-m", voice, "-f", str(path), "--length-scale", "1.08"],
                   input=sentence.encode(), check=True)

def read(path):
    with wave.open(str(path)) as w:
        assert w.getframerate() == SR, (w.getframerate(), SR)
        return w.readframes(w.getnframes())

silence = lambda s: b"\x00\x00" * int(SR * s)

total = mmss("15:00")
track = bytearray(silence(total))
for n, a, b, lines in scenes:
    pcm = bytearray()
    for line in lines:
        for part in re.split(r"(\[pause\])", line):
            part = part.strip()
            if not part:
                continue
            if part == "[pause]":
                pcm += silence(PAUSE)
            else:
                tmp = out / "_t.wav"
                synth(part, tmp)
                pcm += read(tmp) + silence(LINE_GAP)
    with wave.open(str(out / f"s{n}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
    dur, win = len(pcm) / 2 / SR, b - a
    print(f"scene {n}: speech {dur:5.1f}s in a {win}s window" + ("   <-- TOO LONG" if dur > win else ""))
    start = a * SR * 2
    track[start:start + len(pcm)] = pcm[:len(track) - start]

with wave.open(str(out / "narration.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(track))
print("wrote", out / "narration.wav")
