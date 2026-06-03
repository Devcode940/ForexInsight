# ForexInsight AI — Professional Trading Intelligence

AI-powered forex trading dashboard with real-time market data, technical indicator analysis, and AI-driven trade signal generation using Google Gemini 2.5 Flash.

Built with [Next.js 15](https://nextjs.org/) (App Router), [Firebase](https://firebase.google.com/) (Auth + Firestore), [Genkit](https://firebase.google.com/docs/genkit) (AI orchestration), and [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/).

---

## Features

- **Real-time forex data** — Live price streaming via Finnhub WebSocket with automatic fallback to realistic mock data
- **Technical indicators** — SMA, EMA, RSI, and volume histogram with configurable periods and colors
- **AI trade signals** — Two Genkit-powered AI analysis flows:
  - *Explainable Trade Signals* — Confluence-based trade recommendations with entry, stop-loss, take-profit, and risk/reward ratio
  - *Candlestick Pattern Recognition* — Identifies patterns (Engulfing, Doji, Hammer, Morning/Evening Star, etc.)
- **User accounts** — Google Sign-In via Firebase Authentication
- **Cloud persistence** — User preferences (active pair, timeframe, indicator settings, custom AI instructions) saved to Firestore
- **Signal history** — Past AI analyses stored and browsable
- **Professional UI** — Dark mode, responsive layout with collapsible sidebars, built with shadcn/ui

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.5.9 (App Router, Turbopack) |
| **Language** | TypeScript (strict mode) |
| **UI** | React 19, Tailwind CSS, shadcn/ui (Radix primitives + Lucide icons) |
| **Charts** | TradingView Lightweight Charts 4.2.1 |
| **AI / LLM** | Genkit 1.28 + Google Generative AI (Gemini 2.5 Flash) |
| **Auth** | Firebase Authentication (Google provider) |
| **Database** | Cloud Firestore |
| **Market Data** | Finnhub REST API + WebSocket |
| **Forms** | react-hook-form + zod validation |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Finnhub API key (free tier at [finnhub.io](https://finnhub.io/))
- A Firebase project with Authentication (Google provider) and Firestore enabled
- A Google AI API key ([ai.google.dev](https://ai.google.dev/))

### Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> ⚠️ `.env` files are gitignored for security. Never commit credentials.

### Installation

```bash
npm install
```

### Development

```bash
# Start the Next.js dev server (port 9002)
npm run dev

# In a separate terminal, start the Genkit dev server for AI flows
npm run genkit:dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server with Turbopack on port 9002 |
| `npm run genkit:dev` | Start Genkit flow server for AI development |
| `npm run genkit:watch` | Genkit dev server with watch mode |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking (`tsc --noEmit`) |

---

## Project Structure

```
src/
├── ai/                        # Genkit AI configuration and flows
│   ├── dev.ts                 # Genkit dev entry point
│   ├── genkit.ts              # Genkit initialization (Gemini 2.5 Flash)
│   └── flows/
│       ├── explainable-trade-signals.ts    # Trade signal generation flow
│       └── candlestick-pattern-recognition.ts  # Pattern detection flow
├── app/                       # Next.js App Router pages
│   ├── actions/
│   │   └── market-data.ts     # Server actions for market data
│   ├── login/
│   │   └── page.tsx           # Login page (Google Sign-In)
│   ├── globals.css            # Global styles and CSS variables
│   ├── layout.tsx             # Root layout (dark mode, fonts)
│   └── page.tsx               # Main trading dashboard
├── components/
│   ├── analysis-panel.tsx          # AI analysis results & signal history
│   ├── indicator-settings-sidebar.tsx  # Indicator config & API key input
│   ├── trading-chart.tsx           # Lightweight Charts wrapper
│   ├── user-nav.tsx                # Auth user menu
│   ├── watchlist-sidebar.tsx       # Currency pair watchlist
│   └── ui/                         # shadcn/ui components (35 primitives)
├── hooks/
│   ├── use-auth.ts             # Firebase auth state hook
│   ├── use-mobile.tsx          # Responsive breakpoint hook
│   └── use-toast.ts            # Toast notification hook
└── lib/
    ├── firebase/
    │   ├── config.ts           # Firebase app initialization
    │   ├── auth.ts             # Auth helpers (signInWithGoogle, logOut)
    │   └── store.ts            # Firestore CRUD operations
    ├── forex-data-utils.ts     # Indicator calculations & mock data
    └── utils.ts                # Tailwind class merge utility
```

---

## Architecture

### Data Flow

1. **Market Data** — On page load, `loadMarketData()` fetches historical candles from Finnhub REST API. If no Finnhub key is configured, it falls back to `generateMockForexData()`. Real-time updates stream via Finnhub WebSocket, updating the last candle in place.
2. **Technical Indicators** — SMA, EMA, and RSI are calculated client-side in the `TradingChart` component or via `forex-data-utils.ts`. Volume is displayed as a histogram series below the chart.
3. **AI Analysis** — Two Genkit flows run as Next.js server actions using Gemini 2.5 Flash:
   - `getExplainableTradeSignals` — Analyzes candles + indicators + patterns + optional user instructions, returns a structured trade recommendation
   - `detectCandlestickPatterns` — Analyzes raw candle data to identify candlestick patterns
4. **Persistence** — Authenticated users have preferences saved to Firestore. Trade signals are stored in a `signals` collection for history browsing.

### Authentication

Google Sign-In via Firebase popup. Auth state is managed by the `use-auth` hook, which wraps `onAuthStateChanged`. The root layout is an unprotected server component; `page.tsx` and UI components guard functionality based on `user` state.

---

## Deployment

### Firebase App Hosting

The project includes an `apphosting.yaml` configuration for Firebase App Hosting:

```yaml
runConfig:
  maxInstances: 1
```

Deploy via the Firebase console or CLI:

```bash
firebase deploy --only hosting
```

### Build

```bash
npm run build
```

The output is a standard Next.js standalone build in `.next/`.

---

## Known Issues

See [BUGS.md](./BUGS.md) for the full bug tracker (10 documented issues).

**Critical:**
- Hardcoded placeholder indicator values in AI signal requests (indicators passed to the LLM are mock values, not real calculations)
- Inconsistent mock price data for non-forex instruments (Gold, Silver use forex-level base prices)
- Dynamic `require()` in a client component (`trading-chart.tsx`)
- Duplicated SMA/EMA calculations between component and utility library

---

## License

Private — internal use.
