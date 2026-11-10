# visheshbansal.dev

Personal site of Vishesh Bansal. Static [Astro](https://astro.build) site with GSAP motion and a small WebGL fog layer, deployed to Cloudflare Workers static assets.

## Develop

```bash
npm install
npm run dev
```

Node version is pinned in `.tool-versions`.

| Script                     | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `dev`                      | Local dev server                                               |
| `check`                    | `astro check` on the strictest TypeScript config               |
| `lint`, `format`           | ESLint (typescript-eslint strict) and Prettier                 |
| `verify`                   | Lint, format check, type-check and build. CI runs exactly this |
| `deploy`, `deploy:preview` | Production deploy, or a preview URL, via Wrangler              |

## Structure

```
src/
  data/          Typed content: site, route, career, writing, copy
  assets/        Images resolved by key (hero/, reel/)
  lib/           Shared runtime: motion, dom, reveal, theme, intro, images, assets, webgl/fog
  components/
    layout/      Intro montage, nav
    hero/        Hero scene config + client module
    media/       ResponsivePicture (art direction, AVIF/WebP)
    sections/    One component per section, with a .client.ts for heavier logic
  styles/        Design tokens (light and dark) and globals
```

## Editing content

- Copy and humour live in `src/data/copy.ts`; career history in `src/data/career.ts`.
- Add a reel shot: drop `src/assets/reel/<key>.jpg` and add `{ image: '<key>', caption, alt }` to `reel.shots`. Missing keys fail the build.
- Hero crops, focus points and note anchors: the `scenes` config in `src/components/hero/Hero.astro`.

## Deploy

`.github/workflows/ci.yml` runs `npm run verify` on every push and pull request. Pushes to `main` deploy to production; any other branch uploads an isolated preview version. Requires the `CF_API_TOKEN` and `CF_ACCOUNT_ID` repository secrets.
