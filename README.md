# Press Room

Multiplayer briefing-room game. Walk up to the podium, press E, and your voice goes through the PA to the whole room. The pool camera at the back records every speech (video + audio) to the TV archive, where anyone can play it or download it.

## Run locally
npm install
npm start   -> http://localhost:3000

## Deploy (Railway)
Push to GitHub; Railway runs `npm start`.
Recordings: add a Railway Volume mounted at /data and set RECORDINGS_DIR=/data/recordings, or speeches disappear on every redeploy.
Optional env: MAX_SPEECH_SECONDS (default 300), MAX_ARCHIVE (default 200).

## Your sound files (optional)
Drop these in public/sounds/ and they're used as-is:
- mic_on.mp3    plays when someone takes the podium
- applause.mp3  plays when a speech ends
- clap.mp3      plays when a player presses C
- room_tone.mp3 quiet looping room ambience

## Controls
WASD move, mouse look, E podium / sit / TV, C clap, M hear yourself on the PA (headphones only)
