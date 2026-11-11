# Hobbytron 3000

![Hobbytron habitat](docs/screenshot.png)

A hobby tamagotchi. Your creature sits in the middle of a "habitat" with every hobby orbiting around it. Log time on a hobby and its energy ring fills; skip it and the energy slowly drains (about a one-week decay). Keep all your hobbies charged and the creature is happy; let them all fade and it goes to sleep.

## Features

- **Habitat**: the creature plus orbiting hobby rings. Tap a hobby to log a session. Neglected hobbies pulse.
- **Energy bars**: per-hobby energy versus a weekly minutes goal, minutes this week, and when you last did it.
- **Levels**: the creature levels up with total lifetime hours and grows an extra antenna per level (up to 5).
- **Hangar**: the full hardware fleet imported from [The Hangar](https://claude.ai/artifact/LUBUXLJSEkgiBoxzNfSJ5N): hand-drawn SVG flat-lay on a walnut desk, with each device's story, highlights and firmware history. Every device feeds a hobby (e-ink, microcontrollers and AI gadgets → Hardware; radios and the CW paddle → Ham Radio; the Bambu and xTool → Fabrication).
  - **Log bench time** on a device to feed its hobby's energy.
  - **Log firmware flash** to add to the firmware history and log the bench time in one step.
  - Add your own gear (drones, RC, piano...) with an emoji in place of art, and track the "What's next" idea board.
- **Log**: add, edit or delete hobbies (name, emoji, color, weekly goal) and review recent sessions.
- **Data**: export and import JSON backups. Everything is stored in your browser's localStorage.

Starter hobbies: Hardware, Ham Radio, Fabrication, Piano, Drones, RC, Watches and Expeditions. Add more from the `＋` node. When a new version adds a starter hobby, existing saves get it too, unless you already deleted it.

![The Hangar tab](docs/hangar.png)

## Running

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

It also works on GitHub Pages as-is.

## Syncing the Hangar

[The Hangar](https://claude.ai/artifact/LUBUXLJSEkgiBoxzNfSJ5N) is the upstream for the fleet. `hangar/fleet.js` is a generated copy of its data and device SVGs.

```
The Hangar artifact ──sync-hangar.mjs──▶ hangar/fleet.js ──⟳ Sync in the app──▶ your browser's Hangar
        ▲                                                                              │
        └──── sync-hangar.mjs --into ◀── "Export fleet for the Hangar" (Data tab) ◀─────┘
```

**Hangar → Hobbytron**

1. Save the artifact's HTML, for example by asking Claude to read The Hangar and save it.
2. Run `node scripts/sync-hangar.mjs path/to/hangar.html`. It prints what changed (`+` added, `~` changed, `-` removed) and rewrites `hangar/fleet.js`. Use `--dry-run` to preview without writing.
3. Commit and deploy. The app then shows "The Hangar has updates". Press **⟳ Sync** to merge.

**How the in-app merge works.** It's a three-way merge against the copy saved at your last sync:

- New devices and ideas are added.
- Upstream changes to a device's story, status, firmware and so on are applied, unless you've edited that field here. Your edit wins, and the sync report lists it.
- Firmware histories are combined, so flashes you logged here and flashes recorded upstream are both kept.
- Devices you deleted here stay deleted. Devices removed upstream are kept here, and the report lists them.

**Hobbytron → Hangar.** Go to **Data → Export fleet for the Hangar**. The download is your fleet, including flashes and new gear, in the Hangar's format. Then either:

- run `node scripts/sync-hangar.mjs hangar-fleet.json --into path/to/hangar.html`, which writes `hangar.synced.html` ready to republish, or
- hand the file to Claude and ask it to update The Hangar.

**Between browsers.** **Data → Sync from fleet file…** merges a fleet export from another browser in the same way.

Your sessions, hobbies and edits live in localStorage, so use **Data → Export JSON** to back them up.

## How energy works

Each session adds `minutes × e^(−days_ago / 7)` to its hobby's energy. Energy % is that total divided by the hobby's weekly goal, capped at 100%. If you hit your weekly goal at a steady pace, the hobby sits near 100%.
