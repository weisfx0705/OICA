# ISU Graduation Oracle

An English 2026 Guanyin oracle game for I-Shou University international
graduates.

This is a separate project copied from the original oracle app. The original
`oracle/` folder is not overwritten.

## Purpose

The game can be used at an ISU International Student Graduation Party, but the
party is only the current location. The main purpose is a future-facing blessing
and life-direction oracle for graduates. A graduate asks a question, picks a
letter card from A to V, and the system maps that letter to one of the 100
Guanyin oracle poems through the same shuffled random structure as the original
project.

Each result includes:

- the original Chinese Guanyin poem
- a fixed local English poetic translation, so the API does not re-translate
  the same poem on every draw
- an English future reading with good signs, warning signs, and next steps
- an English humorous graduation-oracle TTS reading
- an AI-generated blessing card that keeps the ISU logo and avoids Thai imagery

## Use

Open `index.html` directly in a browser.

The page uses:

- Tailwind CDN and Google Fonts
- Google Gemini API for interpretation, image generation, and TTS
- browser `localStorage` for the user's API key

## Development

```bash
npm install
npm run build
```

The build script creates a single-file `index.html` for easy sharing.

## Notes

The oracle reading is for reflection, blessing, and future direction. It should
not be used as a guarantee of jobs, visas, admissions, money, relationships, or
any other real-world outcome.
