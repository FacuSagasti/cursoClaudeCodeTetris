'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SKINS = {
  retro: {
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#64b5f6', // J - blue
      '#ffb74d', // L - orange
    ]
  },
  neon: {
    colors: [
      null,
      '#00fff2', // I - cyan
      '#faff00', // O - yellow
      '#ff00e6', // T - magenta
      '#39ff14', // S - green
      '#ff073a', // Z - red
      '#00b0ff', // J - blue
      '#ff8c00', // L - orange
    ]
  },
  pastel: {
    colors: [
      null,
      '#a8d8ea', // I - light blue
      '#fff6b7', // O - light yellow
      '#d9b8f0', // T - light purple
      '#b8e8c8', // S - light green
      '#ffb3ba', // Z - light red
      '#b3d1ff', // J - light blue
      '#ffd8b3', // L - light orange
    ]
  },
  pixel: {
    colors: [
      null,
      '#00e5ff', // I - bright cyan
      '#ffea00', // O - bright yellow
      '#d500f9', // T - bright purple
      '#00e676', // S - bright green
      '#ff1744', // Z - bright red
      '#2979ff', // J - bright blue
      '#ff9100', // L - bright orange
    ]
  }
};

let COLORS = SKINS.retro.colors;
let currentSkin = 'retro';

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const overlayStats = document.getElementById('overlay-stats');
const playerNameContainer = document.getElementById('player-name-container');
const playerNameInput = document.getElementById('player-name');
const overlayRecords = document.getElementById('overlay-records');
const restartBtn = document.getElementById('restart-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let gridColor = '#22222e';
let maxCombo = 0, currentCombo = 0, maxLines = 0;
let records = [];

// Block renderers for each skin (neon/pastel/pixel replace these with custom functions)
const drawBlockRetro = (context, x, y, colorIndex, size, alpha) => {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
};

// TODO: neon/pastel/pixel replace these with actual implementations
const drawBlockNeon = drawBlockRetro;
const drawBlockPastel = drawBlockRetro;
const drawBlockPixel = drawBlockRetro;

const BLOCK_RENDERERS = {
  retro: drawBlockRetro,
  neon: drawBlockNeon,
  pastel: drawBlockPastel,
  pixel: drawBlockPixel
};

function applySkin(skin) {
  if (!SKINS[skin]) skin = 'retro';
  currentSkin = skin;
  COLORS = SKINS[skin].colors;
  document.documentElement.setAttribute('data-theme', skin);
  skinSelect.value = skin;
  localStorage.setItem('tetris-skin', skin);
  gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim();
}

function initSkin() {
  const saved = localStorage.getItem('tetris-skin');
  applySkin(saved || 'retro');
}

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
});

function loadRecords() {
  const saved = localStorage.getItem('tetris-records');
  records = saved ? JSON.parse(saved) : [];
}

function saveRecords() {
  localStorage.setItem('tetris-records', JSON.stringify(records));
}

function addRecord(name, score, lines, maxCombo) {
  records.push({ name, score, lines, maxCombo, date: new Date().toLocaleDateString() });
  records.sort((a, b) => b.score - a.score);
  records = records.slice(0, 5);
  saveRecords();
}

function isTopScore(score) {
  if (records.length < 5) return true;
  return score > records[records.length - 1].score;
}

function renderRecords(highlightScore = null) {
  if (!overlayRecords) return;

  overlayRecords.innerHTML = '';
  if (records.length === 0) {
    overlayRecords.innerHTML = '<p class="no-records">Sin records aún</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'records-table';

  const headerRow = document.createElement('tr');
  headerRow.className = 'records-header';
  headerRow.innerHTML = '<th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th><th>Combo</th>';
  table.appendChild(headerRow);

  records.forEach((rec, idx) => {
    const row = document.createElement('tr');
    row.className = idx < 3 ? `records-row rank-${idx + 1}` : 'records-row';
    if (highlightScore !== null && rec.score === highlightScore) {
      row.classList.add('highlight');
    }
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${rec.name}</td>
      <td>${rec.score.toLocaleString()}</td>
      <td>${rec.lines}</td>
      <td>${rec.maxCombo}</td>
    `;
    table.appendChild(row);
  });

  overlayRecords.appendChild(table);
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    maxLines = Math.max(maxLines, lines);
    currentCombo++;
    maxCombo = Math.max(maxCombo, currentCombo);
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  } else {
    currentCombo = 0;
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  const renderer = BLOCK_RENDERERS[currentSkin];
  renderer(context, x, y, colorIndex, size, alpha);
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;

  const isTop = isTopScore(score);
  overlayStats.innerHTML = `
    <div class="end-stats">
      <div><strong>Líneas:</strong> ${lines}</div>
      <div><strong>Nivel:</strong> ${level}</div>
      <div><strong>Combo máx:</strong> ${maxCombo}</div>
      ${isTop ? '<div class="top-message">¡TOP 5! 🎉</div>' : ''}
    </div>
  `;

  if (isTop) {
    playerNameContainer.style.display = 'block';
    playerNameInput.value = '';
    playerNameInput.focus();
    overlayRecords.style.display = 'none';
  } else {
    playerNameContainer.style.display = 'none';
    overlayRecords.style.display = 'block';
    renderRecords();
  }

  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  maxCombo = 0;
  currentCombo = 0;
  maxLines = 0;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  playerNameContainer.style.display = 'none';
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => {
  if (gameOver && isTopScore(score) && playerNameContainer.style.display !== 'none') {
    const name = playerNameInput.value.trim() || 'Anónimo';
    addRecord(name, score, lines, maxCombo);
    renderRecords(score);
  }
  init();
});

resetRecordsBtn.addEventListener('click', () => {
  if (confirm('¿Estás seguro? Esto eliminará todos los records.')) {
    records = [];
    localStorage.removeItem('tetris-records');
    if (overlayRecords && overlayRecords.style.display !== 'none') {
      renderRecords();
    }
  }
});

document.addEventListener('keydown', e => {
  if (gameOver && playerNameContainer.style.display !== 'none' && e.code === 'Enter') {
    const name = playerNameInput.value.trim() || 'Anónimo';
    addRecord(name, score, lines, maxCombo);
    renderRecords(score);
    playerNameContainer.style.display = 'none';
    overlayRecords.style.display = 'block';
  }
}, true);

loadRecords();
initSkin();
init();
