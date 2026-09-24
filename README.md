# Beta Review

Strava for climbing, with a chess.com-style climb review. Phone-first Next.js app, deployed on Vercel.

- Next.js App Router + TypeScript + Tailwind
- Gemini via `@google/genai`, called only from server routes (`GEMINI_API_KEY`, `GEMINI_MODEL`)
- Upstash Redis via `Redis.fromEnv()` for all shared data

`GEMINI_MODEL` defaults to `gemini-flash-latest`, the alias the official `@google/genai` SDK README uses. It always points at the newest Flash model. You can pin a specific version such as `gemini-3.5-flash` instead.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```
