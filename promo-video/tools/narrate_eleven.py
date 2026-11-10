"""Builds the narrator track from NARRATION.md with ElevenLabs.

usage: python tools/narrate_eleven.py [voice_id]
Reads ELEVENLABS_API_KEY from the environment (source ../.env.local first). Never prints it.

Each spoken line is requested once and cached in out/eleven/lines/<hash>.mp3, so a re-run costs no
characters. "[pause]" becomes silence. Writes out/narration-eleven/sNN.wav (24 kHz mono) per scene
and prints each scene's speech length against its window.
"""
import os, re, sys, wave, json, hashlib, pathlib, subprocess, urllib.request, urllib.error

VOICE = sys.argv[1] if len(sys.argv) > 1 else "nPczCjzI2devNBz1zQrb"   # Brian: deep, calm, American
KEY = os.environ["ELEVENLABS_API_KEY"]
ROOT = pathlib.Path(__file__).resolve().parent.parent
LINES = ROOT / "out/eleven/lines"; LINES.mkdir(parents=True, exist_ok=True)
OUT = ROOT / "out/narration-eleven"; OUT.mkdir(parents=True, exist_ok=True)
SR, PAUSE, GAP = 24000, 0.9, 0.35
SAY = {"Vossie": "Vossy", "Eduvos": "Edoovos"}      # pronunciation: Voss-ee, Ed-oo-vos

def say(t):
    for a, b in SAY.items(): t = t.replace(a, b)
    return t

def speak(text, prev, nxt):
    key = hashlib.sha1(json.dumps([VOICE, text]).encode()).hexdigest()[:16]
    f = LINES / f"{key}.mp3"
    if not f.exists():
        body = {"text": say(text), "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.6, "similarity_boost": 0.8, "style": 0.15, "use_speaker_boost": True, "speed": 0.95}}
        if prev: body["previous_text"] = say(prev)
        if nxt: body["next_text"] = say(nxt)
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
                                     data=json.dumps(body).encode(), headers={"xi-api-key": KEY, "Content-Type": "application/json"})
        try:
            f.write_bytes(urllib.request.urlopen(req, timeout=120).read())
        except urllib.error.HTTPError as e:
            sys.exit(f"ElevenLabs error {e.code}: {e.read().decode()[:300]}")
    wav = f.with_suffix(".wav")
    if not wav.exists():
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(f), "-ar", str(SR), "-ac", "1", "-sample_fmt", "s16", str(wav)], check=True)
    with wave.open(str(wav)) as w: return w.readframes(w.getnframes())

silence = lambda s: b"\x00\x00" * int(SR * s)
mmss = lambda s: int(s.split(":")[0]) * 60 + int(s.split(":")[1])
text = (ROOT / "NARRATION.md").read_text(encoding="utf-8")
chars = 0
timings = {}
for m in re.finditer(r"^## (\d\d) .*?, (\d\d:\d\d) to (\d\d:\d\d)[^\n]*\n(.*?)(?=^## |^---|\Z)", text, re.M | re.S):
    n, a, b, body = m.groups()
    parts = []
    for l in body.splitlines():
        if not l.startswith(">"): continue
        for p in re.split(r"(\[pause\])", l[1:].strip()):
            p = p.strip()
            if p: parts.append(p)
    spoken = [p for p in parts if p != "[pause]"]
    pcm = bytearray(); i = 0; tl = []
    for p in parts:
        if p == "[pause]": pcm += silence(PAUSE); continue
        prev = spoken[i - 1] if i else None; nxt = spoken[i + 1] if i + 1 < len(spoken) else None
        t0 = len(pcm) / 2 / SR; pcm += speak(p, prev, nxt); tl.append({'text': p, 'start': round(t0, 2), 'end': round(len(pcm) / 2 / SR, 2)}); pcm += silence(GAP); chars += len(p); i += 1
    with wave.open(str(OUT / f"s{n}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
    timings[n] = tl
    dur, win = len(pcm) / 2 / SR, mmss(b) - mmss(a)
    print(f"scene {n}: speech {dur:5.1f}s in a {win}s window" + ("   <-- TOO LONG" if dur > win else ""))
print("characters in the script:", chars)
(OUT / "timings.json").write_text(json.dumps(timings, indent=1))
