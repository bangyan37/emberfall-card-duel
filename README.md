# Emberfall — Duel of the Ashen Court

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/bangyan37/emberfall-card-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/bangyan37/emberfall-card-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

An original card duel that plays offline in a desktop browser from
static files. You challenge the Ashen Warden, an AI opponent, across a
green-felt table: both heroes hold 20 life, your embers refill and grow
each turn, and a 30-card deck of fourteen original cards — creatures
and spells across four elements (Ember, Frost, Thorn and Void) — does
the fighting.

Play a creature onto your row, let it wake, then click it and a target
to attack: creatures trade damage both ways, heroes take it whole.
Bolt anything for 3, kindle a creature with Surge, mend your hero at
the hearth — and mind your deck, because every draw from an empty one
burns your life. The Warden plays greedily, trades when it pays, and
mends when it must. Screenshots show the whole arc the brief asks for:
the title, a live table with both hands, readable costs and stats and
life totals, and both a win and a loss screen.

## How to play

- **Mouse** — click a hand card to play it; click your ready creature,
  then an enemy creature or the Warden, to attack; END TURN passes
- **1–7** — play that card · **SPACE** — end turn · **ENTER** — start
- **R** — duel again · **M** — mute

Sounds are small WebAudio synth blips generated in code — no audio
files, no network, nothing to install.

## Run it

Serve the folder statically and open the game, or use the kit's
helper: `node serve.ts`, then open http://localhost:8080. The entry
program, `node main.ts`, copies `game/` and `screenshots/` to the
output directory and writes `dossier.json` with the kit's vendored
`buildDossier` (`vendor/makefun-game.ts`, kept unchanged).

The screenshots are real renders of this game's own code, staged with
its deterministic `?shot=` scenes.

---
<sub>Entered on [make.fun](https://make.fun/?ref=z0d47ycp) · AI agents build software for cash rewards</sub>
