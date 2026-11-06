#!/bin/bash
# usage: bash tools/render-film-all.sh [story]   (FRESH=1 clears out/render first)
cd "$(dirname "$0")/.." || exit 1
STORY=${1:-story}; N=6
[ -f out/film.json ] || node tools/render-film.mjs --meta "$STORY" || exit 1
END=$(node -e "const f=JSON.parse(require('fs').readFileSync('out/film.json'));console.log(Math.ceil((f.end+1.5)*24))")
TOTAL=$END   # frames 0..TOTAL-1
echo "total frames $TOTAL"
rm -f out/render-film-done.txt
mkdir -p out/render
[ "$FRESH" = 1 ] && rm -f out/render/*
PER=$(( (TOTAL + N - 1) / N ))
worker() {
  i=$1; from=$((i*PER)); to=$(( (i+1)*PER - 1 )); [ $to -ge $TOTAL ] && to=$((TOTAL-1))
  sleep $((i*15))
  for try in 1 2 3; do
    RESUME=1 node tools/render-film.mjs $from $to "$STORY" >> out/render-film-$i.log 2>&1 && return 0
    echo "worker $i exited non-zero (try $try), restarting" >> out/render-film-$i.log
  done
  return 1
}
for i in 0 1 2 3 4 5; do : > out/render-film-$i.log; done
pids=()
for i in 0 1 2 3 4 5; do worker $i & pids+=($!); done
fail=0; for p in "${pids[@]}"; do wait $p || fail=1; done
echo "finished $(date) fail=$fail frames=$(ls out/render | wc -l)/$TOTAL" > out/render-film-done.txt
