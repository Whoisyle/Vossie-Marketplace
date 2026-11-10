# Vossie launch film: handoff to the next session

Written 2026-11-10. About 35 to 40% of the film is done.

## Paste this to start the next session

> Read `projects/Vossie-Marketplace-1/promo-video/HANDOFF-NEXT-SESSION.md`, `KEYNOTE-PLAN.md` and `NARRATION.md`, and the memory note `vossie-promo-film`. Continue the 15:00 Vossie launch film from the first unfinished item in the handoff. The OpenArt connector should now be loaded: check for it first. Tell me the percentage complete every 10%.

## Where things are

| What | Where |
| --- | --- |
| App (Expo, TypeScript) | `projects/Vossie-Marketplace-1`, GitHub `Whoisyle/Vossie-Marketplace`, branches `main` and `feature/jev-agent-layer` (kept in step) |
| Film folder | `projects/Vossie-Marketplace-1/promo-video/` |
| Scene plan, timings, notes wording | `KEYNOTE-PLAN.md` |
| Narrator script, 12 scenes | `NARRATION.md` |
| Film engine (Three.js): silver phone, scenes, timeline | `film/phone.js`, `film/engine.js`, `film/scenes.js`, `film/index.html` |
| Slow full-app recorder | `tools/tour.mjs` |
| Notes pictures | `scripts/render-notes-photos.mjs` (project root) |
| Demo-mode app build used for recording | `promo-video/app-tour` (served on port 8092 by `node tools/serve.mjs app-tour 8092`) |

## Decisions already made (do not re-ask)

- One pre-produced 15:00 film, continuous, no stage cues. One AI narrator, calm male keynote voice.
- 4K master (3840x2160) plus a 1080p copy. Blue palette `#396573` on black, charcoal and white. No burgundy.
- Silver 3D phone from the owner's photo: shape only, no Apple logo, no watermark.
- OpenArt for generated campus clips and original music (three tracks: opening, product, closing), plus sound design. Free fonts close to Oline, Minimalist and Canto.
- No invented statistics. No competitor price comparison. No "prototype" label. The sign-in is narrated as the Eduvos sign-in; if asked, answer that no institutional approval is being claimed.
- Study notes appear inside the buyer and seller scenes, with the wording in `NARRATION.md`.
- Review after each stage. Email the final video to the owner (see "Delivery").

## State

Done:
1. Operations demo screens (`/operations/*`).
2. Study notes in the app: listings with three pictures, details, reviews, buy, reader, library, seller upload. Pushed and deployed.
3. Slow recording v1 reviewed: `out/tour-review-v1.mp4` (the seller's notes upload had a typing bug, now fixed).
4. Narration script, scene plan, silver phone coded, blue scene grades.

In progress or next, in order:
1. Slow recording v2 (`K=1.8 OUT=out/tour node tools/tour.mjs`, about 2255 s, 86k frames). If `out/tour/marks.json` exists it finished; if the folder is missing or incomplete, run it again (about 40 minutes, about 3 GB of disk).
2. Encode the review video (frames vary in size, so scale them first):
   `ffmpeg -f concat -safe 0 -i out/tour/list.txt -vf "fps=30,scale=786:1704:force_original_aspect_ratio=decrease,pad=786:1704:(ow-iw)/2:(oh-ih)/2:color=white,format=yuv420p" -c:v libx264 -crf 26 -preset veryfast -threads 2 -movflags +faststart out/tour-review.mp4`
   Check the seller notes upload shows the name "Business Law" and a drawn cover.
3. Render the silver phone with the film engine and check it against the owner's photo.
4. OpenArt: campus clips (aerial campus, students walking, hands and phones, no real people or brand marks) and three music tracks.
5. Narrator voice from `NARRATION.md`.
6. Assemble the 15:00 film: update `film/scenes.js` to the new scene list and marks from `out/tour/marks.json`, render 4K plus 1080p, mix audio.

## Cautions

- The machine is short on memory (about 600 MB free) and disk (about 6 GB). Do not run `du` on frame folders. For test runs use `NOFRAMES=1`. Clear `out/tour-dbg*` after tests.
- Do not kill all node processes: the owner may run Expo. Stop only your own.
- The live Vercel site is in real-login mode and refuses the demo email, so record only from the demo-mode build: `EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_ANON_KEY= EXPO_PUBLIC_USE_BACKEND= npx expo export --platform web --output-dir promo-video/app-tour`.
- After every change to the app: typecheck, lint, tests, commit, push `main` and `feature/jev-agent-layer`, then `npx --yes vercel@latest deploy --prod --yes --scope team_Bwbxw1znYomv99ji39t84dZK`.
- One test is known to fail by itself: the promotion-code test in `src/seller/seller.test.ts`, which depends on today's date.

## Delivery

The owner asked for the final video to be emailed to paballokali11@gmail.com. Gmail takes at most 25 MB, so send a Google Drive link (Drive needs the owner to sign in). Say plainly whether it is a rough cut or the final. Send nothing until the owner has seen what the file is.
