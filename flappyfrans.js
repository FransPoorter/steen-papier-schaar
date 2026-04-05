const canvas = document.getElementById("flappyCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("flappyScore");
const bestEl = document.getElementById("flappyBest");
const hintEl = document.getElementById("flappyHint");
const restartBtn = document.getElementById("flappyRestart");

const hoofdImg = new Image();
hoofdImg.src = "hoofd.png";

const GRAVITY = 0.42;
const FLAP_FORCE = -7.8;
const PIPE_SPEED = 2.8;
const PIPE_WIDTH = 86;
const PIPE_GAP = 170;
const PIPE_INTERVAL = 1150;
const BIRD_SIZE = 58;
const GROUND_HEIGHT = 76;
const ALPHA_THRESHOLD = 18;

let bird;
let pipes;
let score;
let bestScore = Number(localStorage.getItem("flappyfrans_best") || 0);
let isRunning;
let isGameOver;
let lastPipeTime;
let lastTime;
let birdOpaquePixels = [];
let birdMaskBounds = {
  minX: 0,
  maxX: BIRD_SIZE - 1,
  minY: 0,
  maxY: BIRD_SIZE - 1
};

bestEl.textContent = bestScore;

function maakStandaardMask() {
  const radius = BIRD_SIZE * 0.34;
  const cx = BIRD_SIZE / 2;
  const cy = BIRD_SIZE / 2;

  birdOpaquePixels = [];

  for (let y = 0; y < BIRD_SIZE; y++) {
    for (let x = 0; x < BIRD_SIZE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        birdOpaquePixels.push([x, y]);
      }
    }
  }

  birdMaskBounds = {
    minX: Math.floor(cx - radius),
    maxX: Math.ceil(cx + radius),
    minY: Math.floor(cy - radius),
    maxY: Math.ceil(cy + radius)
  };
}

function bouwBirdPixelMask() {
  const offscreen = document.createElement("canvas");
  offscreen.width = BIRD_SIZE;
  offscreen.height = BIRD_SIZE;

  const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
  offCtx.clearRect(0, 0, BIRD_SIZE, BIRD_SIZE);
  offCtx.drawImage(hoofdImg, 0, 0, BIRD_SIZE, BIRD_SIZE);

  const imageData = offCtx.getImageData(0, 0, BIRD_SIZE, BIRD_SIZE).data;
  let minX = BIRD_SIZE;
  let minY = BIRD_SIZE;
  let maxX = 0;
  let maxY = 0;

  birdOpaquePixels = [];

  for (let y = 0; y < BIRD_SIZE; y++) {
    for (let x = 0; x < BIRD_SIZE; x++) {
      const i = (y * BIRD_SIZE + x) * 4;
      const alpha = imageData[i + 3];

      if (alpha >= ALPHA_THRESHOLD) {
        birdOpaquePixels.push([x, y]);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!birdOpaquePixels.length) {
    maakStandaardMask();
    return;
  }

  birdMaskBounds = { minX, maxX, minY, maxY };
}

hoofdImg.addEventListener("load", bouwBirdPixelMask);
if (hoofdImg.complete) {
  bouwBirdPixelMask();
} else {
  maakStandaardMask();
}

function resetGame() {
  bird = {
    x: canvas.width * 0.28,
    y: canvas.height * 0.45,
    vy: 0,
    rotation: 0
  };

  pipes = [];
  score = 0;
  isRunning = false;
  isGameOver = false;
  lastPipeTime = performance.now();
  lastTime = performance.now();

  scoreEl.textContent = "0";
  hintEl.textContent = "Druk op spatie of klik om te starten";
}

function flap() {
  if (isGameOver) {
    resetGame();
    return;
  }

  isRunning = true;
  bird.vy = FLAP_FORCE;
  hintEl.textContent = "";
}

function maakBuis() {
  const minTop = 70;
  const maxTop = canvas.height - GROUND_HEIGHT - PIPE_GAP - 70;
  const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

  pipes.push({
    x: canvas.width + 20,
    topHeight,
    passed: false
  });
}

function tekenAchtergrond() {
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#67c6ff");
  bg.addColorStop(1, "#d8f0ff");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#67b56a";
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

  ctx.fillStyle = "rgba(18, 76, 21, 0.22)";
  for (let x = 0; x < canvas.width; x += 20) {
    ctx.fillRect(x, canvas.height - GROUND_HEIGHT + (x % 3), 11, 7);
  }
}

function tekenStokbrood(x, y, width, height) {
  const brood = ctx.createLinearGradient(x, y, x + width, y);
  brood.addColorStop(0, "#c68642");
  brood.addColorStop(0.5, "#e8bf78");
  brood.addColorStop(1, "#bf7a35");

  ctx.fillStyle = brood;
  rondeRect(x, y, width, height, 32);
  ctx.fill();

  ctx.strokeStyle = "rgba(116, 69, 23, 0.35)";
  ctx.lineWidth = 2;
  for (let i = 8; i < height - 10; i += 22) {
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + i);
    ctx.lineTo(x + width * 0.8, y + i + 8);
    ctx.stroke();
  }
}

function rondeRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function tekenPipes() {
  pipes.forEach((pipe) => {
    const bottomY = pipe.topHeight + PIPE_GAP;
    const bottomHeight = canvas.height - GROUND_HEIGHT - bottomY;

    tekenStokbrood(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    tekenStokbrood(pipe.x, bottomY, PIPE_WIDTH, bottomHeight);
  });
}

function tekenBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  if (hoofdImg.complete) {
    ctx.drawImage(hoofdImg, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function birdTopLeft() {
  return {
    x: bird.x - BIRD_SIZE / 2,
    y: bird.y - BIRD_SIZE / 2
  };
}

function raaktWereldRandOpPixelNiveau() {
  const topLeft = birdTopLeft();
  const grondStart = canvas.height - GROUND_HEIGHT;

  for (const [px, py] of birdOpaquePixels) {
    const wy = topLeft.y + py;

    if (wy <= 0 || wy >= grondStart) {
      return true;
    }
  }

  return false;
}

function raaktPijpOpPixelNiveau(pipe) {
  const topLeft = birdTopLeft();
  const birdLeft = topLeft.x + birdMaskBounds.minX;
  const birdRight = topLeft.x + birdMaskBounds.maxX;
  const birdTop = topLeft.y + birdMaskBounds.minY;
  const birdBottom = topLeft.y + birdMaskBounds.maxY;

  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + PIPE_WIDTH;
  const gapTop = pipe.topHeight;
  const gapBottom = pipe.topHeight + PIPE_GAP;

  if (birdRight < pipeLeft || birdLeft > pipeRight) {
    return false;
  }

  if (birdTop >= gapTop && birdBottom <= gapBottom) {
    return false;
  }

  for (const [px, py] of birdOpaquePixels) {
    const wx = topLeft.x + px;
    if (wx < pipeLeft || wx > pipeRight) continue;

    const wy = topLeft.y + py;
    if (wy < gapTop || wy > gapBottom) {
      return true;
    }
  }

  return false;
}

function update(dt, now) {
  if (!isRunning || isGameOver) return;

  bird.vy += GRAVITY * dt;
  bird.y += bird.vy * dt;
  bird.rotation = Math.max(-0.45, Math.min(0.7, bird.vy / 12));

  if (now - lastPipeTime > PIPE_INTERVAL) {
    maakBuis();
    lastPipeTime = now;
  }

  pipes.forEach((pipe) => {
    pipe.x -= PIPE_SPEED * dt;

    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score += 1;
      scoreEl.textContent = String(score);
    }
  });

  pipes = pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -20);

  if (raaktWereldRandOpPixelNiveau()) {
    gameOver();
    return;
  }

  for (const pipe of pipes) {
    if (raaktPijpOpPixelNiveau(pipe)) {
      gameOver();
      break;
    }
  }
}

function gameOver() {
  isGameOver = true;
  isRunning = false;
  hintEl.textContent = "Game over. Klik, tik of druk op spatie om opnieuw te starten.";

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("flappyfrans_best", String(bestScore));
    bestEl.textContent = String(bestScore);
  }
}

function tekenOverlay() {
  if (!isGameOver) return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(0, 0, canvas.width, canvas.height - GROUND_HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 50px Manrope";
  ctx.fillText("FlappyFrans", canvas.width / 2, canvas.height / 2 - 26);
  ctx.font = "700 30px Manrope";
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 18);
}

function render() {
  tekenAchtergrond();
  tekenPipes();
  tekenBird();
  tekenOverlay();
}

function loop(now) {
  const dt = Math.min(1.8, (now - lastTime) / 16.6667);
  lastTime = now;

  update(dt, now);
  render();

  requestAnimationFrame(loop);
}

function initInput() {
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      flap();
    }
  });

  canvas.addEventListener("pointerdown", flap);
  restartBtn.addEventListener("click", resetGame);
}

resetGame();
initInput();
requestAnimationFrame(loop);
