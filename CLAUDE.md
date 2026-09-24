# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **vanilla JavaScript Tetris implementation** using HTML5 Canvas and CSS. The game requires no build tools, package manager, or dependencies—just open `index.html` in a browser to play.

**Tech Stack:** JavaScript (ES6+), HTML5 Canvas, CSS3 Flexbox

## Running the Game

Since there's no build process, launch the game directly:

### Quick Start
```bash
# Python 3 (recommended for local development)
python3 -m http.server 8000
# Then open http://localhost:8000 in your browser

# Alternative: Node.js
npx serve .

# Direct file open (works but may have CORS issues with some modern browsers)
start index.html    # Windows
open index.html     # macOS
xdg-open index.html # Linux
```

## Project Structure

```
├── index.html      # DOM structure: board canvas + sidebar panel + overlays
├── style.css       # Dark theme styling with Flexbox layout
├── game.js         # Complete game logic (~300 lines)
└── README.md       # (Spanish) Feature list and controls
```

## Architecture & Key Concepts

### Game Loop & State
The game runs on `requestAnimationFrame` via `loop()` which:
1. Accumulates elapsed time in `dropAccum`
2. Triggers piece drop when `dropAccum ≥ dropInterval`
3. Calls `draw()` to render canvas
4. Continues recursively until game over or pause

Game state is stored in module-level variables:
- `board` — 20×10 matrix of color indices (0 = empty, 1-7 = piece types)
- `current` — active falling piece: `{type, shape, x, y}`
- `next` — preview piece
- `score`, `lines`, `level` — game metrics

### Piece System
- **Definition:** 7 Tetris pieces stored in `PIECES` array as 4×4 matrices with color indices
- **Rotation:** `rotateCW()` transposes and reverses rows—converts any rotation without tracking orientation
- **Wall Kicks:** `tryRotate()` attempts ±0, ±1, ±2 column offsets if rotation collides, allowing pieces to rotate against walls
- **Positioning:** Pieces spawn centered; `(x, y)` is the top-left of their bounding box

### Collision Detection
`collide(shape, ox, oy)` checks:
- Piece doesn't extend outside board horizontally or bottom
- No overlap with already-locked blocks in `board`
- Returns early if shape cell is empty (sparse matrices)

### Rendering Pipeline
1. **Grid:** `drawGrid()` — subtle gray lines for visual reference
2. **Board:** Loop through `board[r][c]` and draw via `drawBlock()`
3. **Ghost Piece:** `ghostY()` finds landing position; draw at alpha=0.2 to preview
4. **Active Piece:** Draw current piece at full opacity

### Line Clearing & Scoring
- `clearLines()` scans board bottom-up; full rows are spliced out and new empty rows inserted at top
- Score += `LINE_SCORES[lineCount] * level` (values: 100, 300, 500, 800 for 1-4 lines)
- Level increments every 10 cleared lines; drop speed decreases (see below)

### Speed Mechanics
- `dropInterval` (ms) = `Math.max(100, 1000 - (level - 1) * 90)`
- Level 1: 1000ms, Level 2: 910ms, ... Level 10: 190ms, Level 11+: 100ms
- **Soft drop** (↓ key): Immediate +1 row, +1 point, respects collisions
- **Hard drop** (Space): Jump to landing, +2 points per row fallen, triggers lock

## Customization

Common tweaks in `game.js`:

| Constant | Default | Notes |
|----------|---------|-------|
| `COLS` | 10 | Board width; also update `<canvas width>` in HTML |
| `ROWS` | 20 | Board height; also update `<canvas height>` in HTML |
| `BLOCK` | 30 | Pixel size per cell; canvas size = `COLS*BLOCK × ROWS*BLOCK` |
| `COLORS` | 7 hex colors | Palette for piece types (I, O, T, S, Z, J, L) |
| `LINE_SCORES` | [0,100,300,500,800] | Points for clearing 0-4 lines, multiplied by level |
| `dropInterval` (in `init`) | 1000 | Initial drop speed in milliseconds |

> **Important:** If you change `COLS`, `ROWS`, or `BLOCK`, update the `<canvas id="board">` dimensions in `index.html` to match: `width="COLS * BLOCK"` and `height="ROWS * BLOCK"`.

## Input Handling

Keyboard events trigger:
- **Arrow Left/Right:** Move piece horizontally (checks collision first)
- **Arrow Up / X:** Attempt rotation with wall kicks
- **Arrow Down:** Soft drop
- **Space:** Hard drop
- **P:** Toggle pause (can pause/resume, disabled during game over)

All input validation happens at the source (collision checks before move, only allow pause toggle outside game-over state).

## Game States

- **Playing:** Active game loop, piece falling
- **Paused:** Loop cancelled, overlay shown, `lastTime` reset on resume to avoid delta spike
- **Game Over:** Triggered when new piece spawns but already collides; overlay shown, loop cancelled

Restart via button calls `init()` which reinitializes all state and restarts the loop.

## Common Modifications

**Speed up/slow down:** Adjust `dropInterval` calculation in line 110:
```js
dropInterval = Math.max(100, 1000 - (level - 1) * 90);
```

**Change colors:** Edit `COLORS` array (line 7). Must match `PIECES` array length (8 entries: null + 7 pieces).

**Add new rotation style:** Replace `rotateCW()` logic (line 68) to implement SRS (Super Rotation System) or other rules.

**Tweak scoring:** Modify `LINE_SCORES` table or multiply factor in line 108.

## Debugging Tips

- Open browser DevTools → Console to see any errors
- Use `console.log(board)` in `draw()` to inspect board state
- Check `current` object to see active piece position/rotation
- The ghost piece (semi-transparent) shows where the piece will land—if it seems wrong, check `ghostY()` logic
