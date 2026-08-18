# 📚 A/L Insight Bot

A lightweight WhatsApp AI study assistant for Sri Lankan A/L students, built with **Node.js**, **Baileys** and the **Gemini API**.

## Features

- 💬 Ask any A/L question — Gemini answers in the same language you use (English / Tamil / Sinhala)
- 📄 Past papers, 📚 notes and 📝 model papers browsed by **Year → Medium → Subject → Paper**
- 🔗 Papers are loaded from simple JSON files — add a new paper URL without touching any code
- ❓ Gemini-generated MCQ practice with answer checking
- 🖼 Image question support (Gemini vision)
- ⌨️ WhatsApp typing indicator before every AI reply
- 📋 Interactive list menus (with plain-text fallback)
- ⬅️ Back / 🏠 Main Menu navigation everywhere

## Installation

```bash
git clone <your-repo-url>
cd al-insight-bot
npm install
```

## Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

# AI provider: "scraper" (gemini.google.com free) | "shyracore" (custom API) | "gemini" (SDK)
AI_PROVIDER=scraper

# Custom AI API (used if AI_PROVIDER=shyracore, or as fallback when the scraper fails)
AI_API_URL=https://shyracore.indevs.in/api/ai/shitsu
AI_API_KEY=your_api_key_here

OWNER_NUMBER=94764642432
PHONE_NUMBER=94764642432
MAX_HISTORY=10
TEMP_DIR=./tmp
```

### AI providers

The bot uses a fallback chain, so chat always works even if one provider is blocked:

1. **`scraper`** (default) — free web scraping of gemini.google.com, no API key needed. Best on home/residential IPs.
2. **`shyracore`** — custom Gemini API via `AI_API_URL` + `AI_API_KEY`.
3. **`gemini`** — official Google SDK (requires `GEMINI_API_KEY`; also used for **image questions**).

Get a Google API key at https://aistudio.google.com/apikey

## Start

```bash
npm start
```

The bot asks for a phone number — type it (e.g. `94764642432`) and use the printed **pairing code**.

### Login with pairing code (only method)

QR login is **not supported** — pairing code is the only way to connect the bot.

Set `PHONE_NUMBER` in `.env` (or just type the number when prompted). The bot prints a **pairing code** in the terminal:

1. Open WhatsApp → Settings → Linked Devices → Link a Device
2. Tap "Link with phone number instead"
3. Enter the pairing code shown in the terminal

## Adding Papers / Notes / Model Papers

All data lives in JSON files under `data/`:

- `data/papers.json` — past papers
- `data/notes.json` — notes
- `data/model-papers.json` — model papers

Structure (years → mediums → subjects → papers):

```json
{
  "2025": {
    "english": {
      "physics": [
        { "id": "paper", "name": "2025 Physics Paper", "url": "https://example.com/papers/2025/english/physics/paper.pdf" },
        { "id": "marking", "name": "2025 Physics Marking Scheme", "url": "https://example.com/papers/2025/english/physics/marking.pdf" }
      ]
    },
    "tamil": {
      "physics": [
        { "id": "paper", "name": "2025 Physics Paper", "url": "https://example.com/papers/2025/tamil/physics/paper.pdf" }
      ]
    }
  }
}
```

- Add a new year → create a new key
- Add a new medium (`english`, `tamil`, `sinhala`) or subject → add a new key
- `id` is a unique key used when the user taps the paper
- URLs must be valid `http(s)://` PDF links

No JavaScript changes needed. Restart the bot (or it re-reads data at startup) and the new items appear automatically.

## Commands

| Command | Action |
|---------|--------|
| `.menu` | Open main menu |
| `.help` | Show help |
| `.study` | Open A/L Study Menu |
| `.papers` | Browse past papers |
| `.notes` | Browse notes |
| `.mcq` | Generate MCQs |
| `.ai` | AI study conversation |
| `.language` | Change UI language |
| `.reset` | Clear conversation history |

## How It Works

```
User message
    ↓
Typing indicator
    ↓
Gemini AI (auto language detection)
    ↓
Reply in same language
    ↓
📚 A/L Study Menu button
    ↓
Past Papers → Year → Medium → Subject → Paper
    ↓
Download PDF → send as WhatsApp document → cleanup
```

- Normal chat works without menus — just send a question
- UI text follows the language saved per user; AI answers follow each message's language
- Temporary PDFs are deleted after sending; temp files older than 1 hour are cleaned automatically

## Project Structure

```
al-insight-bot/
├── index.js
├── package.json
├── .env.example
├── .gitignore
├── config/config.js
├── data/ (papers.json, notes.json, model-papers.json, users.json)
├── services/ (gemini, paperService, userService, downloadService)
├── handlers/ (message, menu, paper, note, mcq, ai)
├── utils/ (language, typing, menus, logger)
├── tmp/
└── sessions/
```

## Troubleshooting

- **No pairing code shown** — check `npm start` output; make sure `PHONE_NUMBER` is set (or type the number when prompted). If the session folder exists from an old login, delete `sessions/` and restart.
- **AI doesn't reply** — make sure `GEMINI_API_KEY` is valid and the model name is correct.
- **Paper fails to download** — the URL must be reachable from your server, return a PDF, and be under the size limit (default 20 MB).
