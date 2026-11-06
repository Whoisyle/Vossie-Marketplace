#!/usr/bin/env bash
# Mux rendered frames + score into out/vossie-launch.mp4. Run: bash tools/mux.sh
set -euo pipefail
cd "$(dirname "$0")/.."
command -v ffmpeg >/dev/null || { echo "ffmpeg not found on PATH" >&2; exit 1; }
[ -f out/score.wav ] || { echo "missing out/score.wav (run: python tools/score2.py)" >&2; exit 1; }
ffmpeg -y -framerate 24 -i out/render/f%06d.jpg -i out/score.wav \
  -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart -shortest \
  out/vossie-launch.mp4
echo "wrote out/vossie-launch.mp4"
