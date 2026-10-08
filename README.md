# memoriser

背書幫 monorepo. Web app now, structured so a mobile app can reuse the same content and study logic later.

## Layout

- `packages/content` — the 18 HKDSE texts as markdown with frontmatter (`id`, `title`, `group`, `author`, `note`), plus a dependency-free parser. Tests lock the EDB excerpt ranges.
- `packages/core` — pure study logic: chunking, Leitner scheduling, recall scoring, cloze masking. No DOM, no storage, no clock. Imports cleanly on any platform.
- `apps/web` — Vite + TypeScript shell. The only place with DOM, localStorage, and speech synthesis.

Future mobile app: add `apps/mobile`, import `@memoriser/content/parse` and `@memoriser/core`, bring its own storage and TTS adapters. Keep platform code out of the packages.

## Develop

```sh
nvm use
npm install
npm run dev --workspace @memoriser/web
npm test
npm run build
```

Pushing to GitHub runs CI (`npm ci`, `npm test`, `format:check`). `master` passing CI deploys `apps/web` to GitHub Pages (first run: repo Settings → Pages → Source → GitHub Actions).
