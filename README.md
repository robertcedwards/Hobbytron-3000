# Hobbytron 3000

![Hobbytron habitat](docs/screenshot.png)

A hobby tamagotchi. Your creature sits in the middle of a "habitat" with every hobby orbiting around it. Log time on a hobby and its energy ring fills; skip it and the energy slowly drains (about a one-week decay). Keep all your hobbies charged and the creature is happy; let them all fade and it goes to sleep.

## Features

- **Habitat**: the creature plus orbiting hobby rings. Tap a hobby to log a session. Neglected hobbies pulse.
- **Energy bars**: per-hobby energy versus a weekly minutes goal, minutes this week, and when you last did it.
- **Levels**: the creature levels up with total lifetime hours and grows an extra antenna per level (up to 5).
- **Hangar**: gear and builds across all hobbies, tagged Ready / In build / Needs repair / Wishlist.
- **Log**: add, edit or delete hobbies (name, emoji, color, weekly goal) and review recent sessions.
- **Data**: export and import JSON backups. Everything is stored in your browser's localStorage.

Starter hobbies: Hardware, Piano, Drones and RC. Add more from the `＋` node.

## Running

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

It also works on GitHub Pages as-is.

## How energy works

Each session adds `minutes × e^(−days_ago / 7)` to its hobby's energy. Energy % is that total divided by the hobby's weekly goal, capped at 100%. If you hit your weekly goal at a steady pace, the hobby sits near 100%.
