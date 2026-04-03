(() => {
  "use strict";

  const TILE = 32;
  const MAP = [
    "#####################",
    "#P........#........G#",
    "#.###.###.#.###.###.#",
    "#.#.....#...#.....#.#",
    "#.#.###.#####.###.#.#",
    "#.................#.#",
    "#.###.#.#####.#.###.#",
    "#.....#...#...#.....#",
    "#####.###.#.###.#####",
    "#.....#...H...#.....#",
    "#.###.#.#####.#.###.#",
    "#.#...............#.#",
    "#.#.###.#####.###.#.#",
    "#...#.....#.....#...#",
    "#.###.###.#.###.###.#",
    "#G........#.........#",
    "#####################"
  ];

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const statusEl = document.getElementById("status");
  const restartBtn = document.getElementById("restartBtn");
  const finalBoardEl = document.getElementById("finalBoard");
  const finalScoreEl = document.getElementById("finalScore");
  const restartFinalBtn = document.getElementById("restartFinalBtn");

  const rows = MAP.length;
  const cols = MAP[0].length;
  canvas.width = cols * TILE;
  canvas.height = rows * TILE;

  const DIRS = {
    ArrowUp: { x: 0, y: -1, angle: -Math.PI / 2 },
    ArrowDown: { x: 0, y: 1, angle: Math.PI / 2 },
    ArrowLeft: { x: -1, y: 0, angle: Math.PI },
    ArrowRight: { x: 1, y: 0, angle: 0 }
  };

  const STEP_MS = 90;
  const GHOST_STEP_EVERY = 2;

  let walls = new Set();
  let dots = new Set();
  let powerPellets = new Set();
  let score = 0;
  let gameOver = false;
  let frightenedTicks = 0;

  let pacman = {
    x: 1,
    y: 1,
    dir: "ArrowRight",
    nextDir: "ArrowRight"
  };

  let ghosts = [];
  let imageReady = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let accumulator = 0;
  let lastFrameTime = 0;
  let stepCount = 0;

  const headImg = new Image();
  headImg.src = "hoofd.png";

  let audioCtx = null;

  function showFinalBoard() {
    finalScoreEl.textContent = String(score);
    finalBoardEl.classList.remove("show");
    void finalBoardEl.offsetWidth;
    finalBoardEl.classList.add("show");
  }

  function hideFinalBoard() {
    finalBoardEl.classList.remove("show");
  }

  function key(x, y) {
    return `${x},${y}`;
  }

  function isWall(x, y) {
    return walls.has(key(x, y));
  }

  function canMove(x, y) {
    return x >= 0 && x < cols && y >= 0 && y < rows && !isWall(x, y);
  }

  function parseMap() {
    walls = new Set();
    dots = new Set();
    powerPellets = new Set();
    ghosts = [];

    MAP.forEach((line, y) => {
      [...line].forEach((cell, x) => {
        const cellKey = key(x, y);

        if (cell === "#") {
          walls.add(cellKey);
          return;
        }

        dots.add(cellKey);

        // Hoek-pellets geven power mode.
        const isCornerPath =
          (x === 1 && y === 1) ||
          (x === cols - 2 && y === 1) ||
          (x === 1 && y === rows - 2) ||
          (x === cols - 2 && y === rows - 2);

        if (isCornerPath) {
          powerPellets.add(cellKey);
        }

        if (cell === "P") {
          pacman.x = x;
          pacman.y = y;
          pacman.dir = "ArrowRight";
          pacman.nextDir = "ArrowRight";
          dots.delete(cellKey);
          powerPellets.delete(cellKey);
        }

        if (cell === "G" || cell === "H") {
          ghosts.push({
            x,
            y,
            dir: "ArrowLeft",
            startX: x,
            startY: y
          });
          dots.delete(cellKey);
          powerPellets.delete(cellKey);
        }
      });
    });
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#050e1b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Muren
    walls.forEach((pos) => {
      const [x, y] = pos.split(",").map(Number);
      const px = x * TILE;
      const py = y * TILE;

      ctx.fillStyle = "#12355a";
      ctx.fillRect(px, py, TILE, TILE);

      ctx.strokeStyle = "#2da8de";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
    });

    // Dots
    dots.forEach((pos) => {
      const [x, y] = pos.split(",").map(Number);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;

      ctx.beginPath();
      ctx.fillStyle = "#f7f2a7";
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Power pellets
    powerPellets.forEach((pos) => {
      const [x, y] = pos.split(",").map(Number);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;

      ctx.beginPath();
      ctx.fillStyle = frightenedTicks > 0 ? "#8ae8ff" : "#ffe780";
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Spoken
    ghosts.forEach((ghost) => {
      const gx = ghost.x * TILE;
      const gy = ghost.y * TILE;

      ctx.fillStyle = frightenedTicks > 0 ? "#4f8fff" : "#ff6a88";
      ctx.fillRect(gx + 6, gy + 8, TILE - 12, TILE - 10);
      ctx.beginPath();
      ctx.arc(gx + 10, gy + 12, 6, Math.PI, 0);
      ctx.arc(gx + 16, gy + 12, 6, Math.PI, 0);
      ctx.arc(gx + 22, gy + 12, 6, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(gx + 12, gy + 14, 3.5, 0, Math.PI * 2);
      ctx.arc(gx + 20, gy + 14, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    drawPacman();
  }

  function drawPacman() {
    if (!imageReady) return;

    const px = pacman.x * TILE + TILE / 2;
    const py = pacman.y * TILE + TILE / 2;
    const angle = DIRS[pacman.dir].angle;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    ctx.drawImage(headImg, -TILE / 2 + 2, -TILE / 2 + 2, TILE - 4, TILE - 4);

    ctx.restore();
  }

  function playDotSound() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {
        return;
      }
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(680, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(980, audioCtx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.085);
  }

  function playPowerSound() {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(240, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.09, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  }

  function movePacman() {
    const from = { x: pacman.x, y: pacman.y };
    const wanted = DIRS[pacman.nextDir];

    if (wanted && canMove(pacman.x + wanted.x, pacman.y + wanted.y)) {
      pacman.dir = pacman.nextDir;
    }

    const active = DIRS[pacman.dir];
    const nx = pacman.x + active.x;
    const ny = pacman.y + active.y;

    if (canMove(nx, ny)) {
      pacman.x = nx;
      pacman.y = ny;
    }

    const to = { x: pacman.x, y: pacman.y };

    const dotKey = key(pacman.x, pacman.y);
    if (dots.has(dotKey)) {
      dots.delete(dotKey);
      score += 10;
      scoreEl.textContent = String(score);
      playDotSound();
    }

    if (powerPellets.has(dotKey)) {
      powerPellets.delete(dotKey);
      score += 50;
      scoreEl.textContent = String(score);
      frightenedTicks = 40;
      statusEl.textContent = "Power mode";
      playPowerSound();
    }

    if (dots.size === 0 && powerPellets.size === 0) {
      statusEl.textContent = "Gewonnen";
      gameOver = true;
    }

    return { from, to };
  }

  function moveGhosts() {
    const previous = ghosts.map((ghost) => ({ x: ghost.x, y: ghost.y }));

    ghosts.forEach((ghost) => {
      const options = Object.values(DIRS).filter((d) => canMove(ghost.x + d.x, ghost.y + d.y));
      if (options.length === 0) return;

      // Kleine voorkeur om niet meteen om te keren als er alternatieven zijn
      const reverse = { x: -DIRS[ghost.dir].x, y: -DIRS[ghost.dir].y };
      let candidates = options.filter((o) => !(o.x === reverse.x && o.y === reverse.y));
      if (candidates.length === 0) candidates = options;

      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      ghost.x += choice.x;
      ghost.y += choice.y;
      ghost.dir = Object.keys(DIRS).find((k) => DIRS[k] === choice) || ghost.dir;
    });

    return previous;
  }

  function applyGhostHit(ghost) {
    if (frightenedTicks > 0) {
      score += 200;
      scoreEl.textContent = String(score);
      ghost.x = ghost.startX;
      ghost.y = ghost.startY;
      ghost.dir = "ArrowLeft";
      return;
    }

    gameOver = true;
    statusEl.textContent = "Game over";
    document.body.classList.add("pac-game-over");
    showFinalBoard();
  }

  function checkCollision(pacFrom, pacTo, ghostFromPositions) {
    ghosts.forEach((ghost, index) => {
      const sameTile = ghost.x === pacTo.x && ghost.y === pacTo.y;

      const ghostFrom = ghostFromPositions[index] || { x: ghost.x, y: ghost.y };
      const swappedTiles =
        ghostFrom.x === pacTo.x &&
        ghostFrom.y === pacTo.y &&
        ghost.x === pacFrom.x &&
        ghost.y === pacFrom.y;

      if (!sameTile && !swappedTiles) return;

      applyGhostHit(ghost);
    });
  }

  function stepSimulation() {
    if (!imageReady) {
      return;
    }

    if (gameOver) {
      return;
    }

    const pacMove = movePacman();

    // Botsing direct na spelerbeweging (op een bestaand spook lopen).
    const ghostCurrentPositions = ghosts.map((ghost) => ({ x: ghost.x, y: ghost.y }));
    checkCollision(pacMove.from, pacMove.to, ghostCurrentPositions);

    if (gameOver) return;

    stepCount += 1;
    if (stepCount % GHOST_STEP_EVERY === 0) {
      const ghostPreviousPositions = moveGhosts();
      // Botsing na spookbeweging, inclusief kruisen van tegels.
      checkCollision(pacMove.from, pacMove.to, ghostPreviousPositions);
    }

    if (frightenedTicks > 0) {
      frightenedTicks -= 1;
      if (frightenedTicks === 0 && !gameOver) {
        statusEl.textContent = "Spelen";
      }
    }

  }

  function gameLoop(timestamp) {
    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }

    const delta = Math.min(120, timestamp - lastFrameTime);
    lastFrameTime = timestamp;
    accumulator += delta;

    while (accumulator >= STEP_MS) {
      stepSimulation();
      accumulator -= STEP_MS;
    }

    drawBoard();
    window.requestAnimationFrame(gameLoop);
  }

  function resetGame() {
    score = 0;
    gameOver = false;
    frightenedTicks = 0;
    accumulator = 0;
    stepCount = 0;
    scoreEl.textContent = "0";
    statusEl.textContent = "Spelen";
    document.body.classList.remove("pac-game-over");
    hideFinalBoard();
    parseMap();
    drawBoard();
  }

  document.addEventListener("keydown", (event) => {
    if (DIRS[event.key]) {
      event.preventDefault();
      pacman.nextDir = event.key;
    }
  });

  canvas.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  canvas.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const minSwipe = 22;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      pacman.nextDir = dx > 0 ? "ArrowRight" : "ArrowLeft";
    } else {
      pacman.nextDir = dy > 0 ? "ArrowDown" : "ArrowUp";
    }
  }, { passive: true });

  restartBtn.addEventListener("click", resetGame);

  if (restartFinalBtn) {
    restartFinalBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetGame();
    });
  }

  // Fallback: klik op de overlay (buiten de knop) start ook opnieuw.
  finalBoardEl.addEventListener("click", (event) => {
    if (!finalBoardEl.classList.contains("show")) return;
    if (event.target && event.target.id === "restartFinalBtn") return;
    resetGame();
  });

  headImg.addEventListener("load", () => {
    imageReady = true;
    statusEl.textContent = "Spelen";
    drawBoard();
  });

  headImg.addEventListener("error", () => {
    statusEl.textContent = "hoofd.png niet geladen";
    gameOver = true;
  });

  parseMap();
  statusEl.textContent = "Laden...";
  drawBoard();
  window.requestAnimationFrame(gameLoop);
})();
