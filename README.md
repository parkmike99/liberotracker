# LiberoTracker

**USAV-style travel volleyball scorekeeping.** Built for club volleyball (ages 8–18). Scorekeeper-first, iPad-optimized.

- **Single codebase:** iPad (landscape), iPhone, Android, Web (Expo)
- **Stack:** Expo + TypeScript, expo-router, zustand, react-native-gesture-handler, react-native-reanimated, react-native-svg
- **Storage:** AsyncStorage (native) / localStorage (web); ready for future backend sync

## Quick start

```bash
cd liberotracker
npm install
npx expo start
```

Then: **w** for web, **i** for iOS simulator, **a** for Android.

## App flow

1. **Home** → New Match | Teams | Recent matches
2. **Teams** → Add/edit teams (name, colors, roster numbers)
3. **New Match** → Pick Home → Away → Liberos for Set 1 → First server → Start
4. **Match** → Court view, Point Home / Point Away, Undo, Libero IN/OUT, Sub. Set break between sets.

## Rules (USAV Club default)

- 15 substitutions per set
- 0–2 liberos per set (one on court); libero may serve in one rotation per set
- Best of 3: 25/25/15 win by 2

## Modes

- **Guided (default):** Only legal actions allowed; violation banner with Fix / Override (long-press → Coach)
- **Coach:** All actions allowed; violations still logged

## Court image and colors

- **Court graphic:** Place your volleyball court image at `assets/court.png`. In `app/match/[id].tsx`, set `courtImageSource = require('../../assets/court.png')` to use it. If no image is set, a green court background is used.
- **Team colors:** Set in **Teams** → edit team (Team color, Jersey number color, Libero color). Those colors are used for player circles on the court and on the bench.

## Drag and drop

- **Libero:** Drag the libero circle (orange border) from one back-row zone and drop on another back-row zone to move them.
- **Substitutions:** Drag a bench player (right side) and drop on a court zone to sub that player in. Subs remaining are enforced in Guided mode.

## Project layout

- `app/` – expo-router screens (index, teams, match)
- `src/types/` – TeamProfile, Match, SetState, events, rules
- `src/storage/` – persistence abstraction (AsyncStorage / localStorage)
- `src/store/` – zustand (teams, match, app mode)
- `src/components/` – CourtView (court image + player circles), BenchStrip (draggable bench), Scoreboard, NumberChip, RosterGrid, LiberoModal, SubstitutionModal, SetBreakModal, ViolationBanner

Event-sourced set state for full Undo/Redo.
