# API

TypeScript API routes and server-side helpers (Next.js App Router).

| File | Live source | Purpose |
|---|---|---|
| `analyze.route.ts` | `app/api/analyze/route.ts` | Main image analysis endpoint |
| `classify-query.route.ts` | `app/api/classify-query/route.ts` | Pre-flight LLM router |
| `gemini.ts` | `lib/gemini.ts` | Gemini 21-key rotation client |

> Note: Named `API/` rather than `Backend/` to avoid case conflict with the Python `backend/` folder on Windows.

## Git Upgrade
```bash
git add API/
git commit -m 'feat(api): update backend analysis or routing logic'
```

