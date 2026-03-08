# 🍵 Tim Hortons Voice Command System

A real-time, multi-location restaurant operations platform powered by voice commands, predictive AI, and live database sync.

## Features

- 🎙️ **Real Voice Recognition** — Web Speech API with wake word "Hey Timmy"
- 🧠 **NLP Engine** — Fuzzy intent + item detection (ORDER, MAKING, WASTE, DISCARDING, PREPARED)
- 👤 **Speaker Identity** — Voice prints per staff member
- 🔔 **Kitchen Display** — Real-time order board with timers
- 📊 **Predictive Alerts** — Historical demand engine flags unusual orders
- 🗄️ **Live Database** — All events written to Supabase in real-time
- 🏪 **Multi-Restaurant** — Switch between locations, isolated data per store
- 📈 **Analytics** — Daily, weekly, franchise-wide reporting

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React + Vite |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) |
| Hosting | Netlify |
| Voice | Web Speech API (Chrome/Edge) |

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOURNAME/timhortons-vcs.git
cd timhortons-vcs
npm install
```

### 2. Add environment variables
Create a `.env` file in the root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run locally
```bash
npm run dev
```
Visit `http://localhost:5173`

### 4. Deploy to Netlify
Push to GitHub. Connect repo on netlify.com. Add env variables in Netlify dashboard. Done.

## Database Setup (Supabase)

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor.

## Voice Commands

Wake the system by saying **"Hey Timmy"**, then:

- `"Order 6 Hashbrowns"` — creates kitchen order with unique ID
- `"Making 12 Timbits now"` — logs production event
- `"Waste 3 Donuts expired"` — logs waste event
- `"Prepared order TH-R001-..."` — closes order lifecycle
- `"Discarding 5 Bagels end of batch"` — logs discard event

## Supported Browsers

Voice recognition requires **Chrome** or **Edge**. All other features work in any browser.

## License

Internal use — Tim Hortons franchise operations.
