#!/bin/bash
cd "$(dirname "$0")/.."
TOTAL=8557; N=3; STEP=$(( (TOTAL + N - 1) / N ))
for i in $(seq 0 $((N-1))); do
  a=$((i*STEP)); b=$(( (i+1)*STEP )); [ $b -gt $TOTAL ] && b=$TOTAL
  RESUME=1 node tools/render.mjs $a $b 24 > out/render-$i.log 2>&1 & sleep 40
done
wait
echo ALLRENDERED > out/render-done.txt
