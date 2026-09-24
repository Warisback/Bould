# Beta Review

Strava for climbing, with a chess.com-style climb review. Phone-first Next.js app, deployed on Vercel.

- Next.js App Router + TypeScript + Tailwind
- Gemini via `@google/genai`, called only from server routes (`GEMINI_API_KEY`, `GEMINI_MODEL`)
- Upstash Redis via `Redis.fromEnv()` for all shared data

`GEMINI_MODEL` defaults to `gemini-3.8-flash`, the newest Flash model in the Gemini API model list (checked Sept 2026). `gemini-flash-latest` also works if you always want the newest Flash.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```
