# For Marianna

Interactive anniversary site: terminal intro, romantic archive, love letter.

```bash
npm install
npm run dev      # open the printed Network URL on the iPad
npm run build
```

Edit texts: `src/content/dialogues.js` (Кротик), `src/content/archive.js` (memories, photos, letter), `src/config.js` (secret date).
Stages (`currentStage` in `src/App.jsx`): 0 singularity, 1 terminal, 2 circle reveal, 3 story with Кротик, 4 adventure (door, dark room, puzzle, hearts, goodbye), 5 archive, 6 letter.

## Кротик (pixel animation)
Frames live in `public/mole/`: `idle_1.png` ... `idle_4.png` (64x64 px, transparent PNG).
Replace the placeholder files with your own art, keeping names and size.

## Sound
All sounds are synthesized in `src/sound.js` (WebAudio), no audio files needed. Mute button is top-right; the choice is remembered.

## Puzzle photo
Put your photo at `public/photos/us.jpg`. Without it a placeholder picture is used.
