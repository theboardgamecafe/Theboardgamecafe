# Third-party scripts

Self-hosted because the site's Content-Security-Policy only allows scripts from this domain.

| File | Library | Version | Licence | Source |
| --- | --- | --- | --- | --- |
| `gsap.min.js` | GSAP | 3.15.1 | GreenSock standard "no charge" licence (https://gsap.com/standard-license) | `dist/gsap.min.js` in https://github.com/greensock/GSAP, unchanged |
| `SplitText.min.js` | GSAP SplitText | 3.15.1 | as above | `dist/SplitText.min.js` in the same repository, unchanged |
| `lenis.min.js` | Lenis | 1.3.27 | MIT (`LICENSE-lenis.txt`) | built from https://github.com/darkroomengineering/lenis at tag `v1.3.27` |

The Lenis repository does not ship a ready-made browser file, so `lenis.min.js` is its unmodified source bundled with esbuild:

```
esbuild packages/core/index.ts --bundle --format=iife --global-name=LenisBundle --minify --target=es2019 --footer:js='window.Lenis=LenisBundle.default;' --outfile=lenis.min.js
```

`motion.js` in the site root is the café's own code that uses these. See "Motion" in `WEBSITE-MAINTENANCE.md`.

## Icons

The four icons in the phone bar at the bottom of every page (Home, Book, Join, Menu) are from Lucide (https://github.com/lucide-icons/lucide): `house`, `calendar-days`, `users` and `coffee`, copied into each page's `.cafe-tabs` markup. They are the same icons the café app uses for its own bar. Lucide is ISC licensed; its licence is in `LICENSE-lucide.txt`.
