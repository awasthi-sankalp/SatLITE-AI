# Login

All authentication-related source files (Clerk).

| File | Live source |
|---|---|
| `page.tsx` | `app/page.tsx` |
| `BreakLoop.tsx` | `app/BreakLoop.tsx` |
| `sign-in.tsx` | `app/sign-in/[[...sign-in]]/page.tsx` |
| `sign-up.tsx` | `app/sign-up/[[...sign-up]]/page.tsx` |
| `sso-callback.tsx` | `app/sso-callback/page.tsx` |
| `middleware.ts` | `proxy.ts` (Clerk auth middleware) |

## Git Upgrade
```bash
git add Login/
git commit -m 'feat(login): update authentication flow'
```

