# VICE CUT — Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/jonjet155/gta6-cover-art-01-vice-cut-v3-push-fix/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/jonjet155/gta6-cover-art-01-vice-cut-v3-push-fix/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A photo-led GTA 6 cover studio for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01): it runs entirely offline in a desktop browser. Pick your photos, place them on a dense comic-panel cover, letter it in the genre's style, and export a shareable PNG. Your photos never leave your machine.

## What it does

- **7 layouts** — Hero Collage (default), Comic (diagonal cuts), Hero + 3, Film Strip, Four Cut, Hero + 5, Billboard. Switching layouts keeps your edits.
- **6 grades, each with an intensity slider** — Warm Sunset (default), Neon Night, Teal Coast, Ink Mono, Twilight Gold, Coral Heat.
- **4 caption styles + role-tag toggle** — Chrome, Neon, Sunset, Mono; a role tag (THE DRIVER, THE RUNAWAYS, …) sits on every panel.
- **Photo-led, not template-led** — click a panel, then a tray photo, to place it. Drag to pan, scroll to zoom, double-click to re-centre on that spot. Upload your own photos, fill empty panels, or fill every panel from one photo.
- **Captions and role tags edit in place**, per panel.
- **Dense poster furniture** — 5-star press strip with quote + gazette + VOL badge, giant striped retro-chrome VICE CUT title, neon script tagline "Painted in Leonida.", tagline ribbon, billing block, COMING SOON, barcode and a gold ORIGINAL COVER ART seal. No void anywhere.
- **One-click PNG export in the three post sizes** — square 1080×1080, portrait 1080×1350, wide 1920×1080 (exact dimensions).

Zero clicks to a first cover: the seven sample photos are preloaded, the hero collage + sunset grade + VICE CUT title are the defaults.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `app/` is plain static files (HTML, CSS, ES modules, vendored fonts and photos).

## Screenshots

- `1-cover.jpg` — the cover alone (`?shot=cover`, wide 1280×720).
- `2-editor.jpg` — the studio with a photo loaded (`?shot=editor`).
- `3-cover.jpg` — the exported square PNG, shown as-is.
- `4-cover.jpg` — the exported portrait PNG, shown as-is.

## Sample photos (all free licence, Wikimedia Commons)

| File | Photo | Licence |
|---|---|---|
| `app/samples/hero.jpg` | Young woman sits in a car, contemplating life as sunset light filters through the windshield on an outdoor road | CC BY 2.0 |
| `app/samples/couple.jpg` | Couple at sunset on the beach | CC BY-SA 3.0 |
| `app/samples/duo.jpg` | Hippie Sister (37972352) | CC BY-SA 3.0 |
| `app/samples/boats.jpg` | DFC 1857 Two small boats skim the water as the sun sets painting the sky and sea in soft purples and golds | CC BY-SA 4.0 |
| `app/samples/corvette.jpg` | 58 Corvette (230071919) | CC0 |
| `app/samples/pier.jpg` | Crowded pier after the sunset (Unsplash) | CC0 |
| `app/samples/skyline.jpg` | 2007 Miami sunset 3 | CC BY 3.0 |

Source pages: `https://commons.wikimedia.org/wiki/File:<title>` for each title above (e.g. `File:Young_woman_sits_in_a_car,_contemplating_life_as_sunset_light_filters_through_the_windshield_on_an_outdoor_road.jpg`).
