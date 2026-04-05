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

let bird;
let pipes;
let score;
let bestScore = Number(localStorage.getItem("flappyfrans_best") || 0);
let isRunning;
let isGameOver;
let lastPipeTime;
let lastTime;

bestEl.textContent = bestScore;

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
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(hoofdImg, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
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

  if (bird.y + BIRD_SIZE / 2 >= canvas.height - GROUND_HEIGHT || bird.y - BIRD_SIZE / 2 <= 0) {
    gameOver();
  }

  for (const pipe of pipes) {
    const inXRange = bird.x + BIRD_SIZE / 2 > pipe.x && bird.x - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH;
    const hitsTop = bird.y - BIRD_SIZE / 2 < pipe.topHeight;
    const hitsBottom = bird.y + BIRD_SIZE / 2 > pipe.topHeight + PIPE_GAP;

    if (inXRange && (hitsTop || hitsBottom)) {
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
