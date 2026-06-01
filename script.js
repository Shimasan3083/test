const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const messageElement = document.querySelector("#message");

const bestScoreKey = "touch-comet-chase-best";
const state = {
  width: 0,
  height: 0,
  scale: 1,
  mode: "ready",
  score: 0,
  best: Number(localStorage.getItem(bestScoreKey) || 0),
  elapsed: 0,
  lastTime: 0,
  touchX: 0,
  touchY: 0,
  player: { x: 0, y: 0, radius: 18 },
  stars: [],
  meteors: [],
  particles: [],
};

bestElement.textContent = state.best;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.scale = Math.max(1, window.devicePixelRatio || 1);
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = Math.floor(rect.width * state.scale);
  canvas.height = Math.floor(rect.height * state.scale);
  context.setTransform(state.scale, 0, 0, state.scale, 0, 0);

  if (state.player.x === 0 && state.player.y === 0) {
    state.player.x = state.width / 2;
    state.player.y = state.height * 0.75;
    state.touchX = state.player.x;
    state.touchY = state.player.y;
  }
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnStar() {
  state.stars.push({
    x: randomBetween(26, state.width - 26),
    y: -30,
    radius: randomBetween(10, 15),
    speed: randomBetween(120, 190) + state.elapsed * 4,
    spin: randomBetween(0, Math.PI * 2),
  });
}

function spawnMeteor() {
  const radius = randomBetween(16, 30);
  state.meteors.push({
    x: randomBetween(radius, state.width - radius),
    y: -radius,
    radius,
    speed: randomBetween(150, 240) + state.elapsed * 7,
    wobble: randomBetween(-80, 80),
    phase: randomBetween(0, Math.PI * 2),
  });
}

function resetGame() {
  state.mode = "playing";
  state.score = 0;
  state.elapsed = 0;
  state.stars = [];
  state.meteors = [];
  state.particles = [];
  state.player.x = state.width / 2;
  state.player.y = state.height * 0.75;
  state.touchX = state.player.x;
  state.touchY = state.player.y;
  scoreElement.textContent = state.score;
  messageElement.classList.add("hidden");
}

function finishGame() {
  state.mode = "gameover";
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(bestScoreKey, String(state.best));
    bestElement.textContent = state.best;
  }
  messageElement.innerHTML = `
    <h1>Game Over</h1>
    <p>Score: ${state.score} / Best: ${state.best}</p>
    <p>もう一度タップしてリトライ！</p>
  `;
  messageElement.classList.remove("hidden");
}

function updatePointer(event) {
  const pointer = event.touches ? event.touches[0] : event;
  const rect = canvas.getBoundingClientRect();
  state.touchX = pointer.clientX - rect.left;
  state.touchY = pointer.clientY - rect.top;
}

function handleStart(event) {
  event.preventDefault();
  updatePointer(event);
  if (state.mode !== "playing") {
    resetGame();
  }
}

function handleMove(event) {
  event.preventDefault();
  updatePointer(event);
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function burst(x, y, color, amount = 10) {
  for (let index = 0; index < amount; index += 1) {
    state.particles.push({
      x,
      y,
      vx: randomBetween(-140, 140),
      vy: randomBetween(-180, 60),
      life: randomBetween(0.35, 0.7),
      color,
    });
  }
}

function update(delta) {
  if (state.mode !== "playing") {
    return;
  }

  state.elapsed += delta;
  if (Math.random() < 0.035 + state.elapsed * 0.0008) spawnStar();
  if (Math.random() < 0.018 + state.elapsed * 0.0007) spawnMeteor();

  state.player.x += (state.touchX - state.player.x) * Math.min(1, delta * 12);
  state.player.y += (state.touchY - state.player.y) * Math.min(1, delta * 12);
  state.player.x = Math.max(state.player.radius, Math.min(state.width - state.player.radius, state.player.x));
  state.player.y = Math.max(state.player.radius, Math.min(state.height - state.player.radius, state.player.y));

  state.stars.forEach((star) => {
    star.y += star.speed * delta;
    star.spin += delta * 5;
  });

  state.meteors.forEach((meteor) => {
    meteor.y += meteor.speed * delta;
    meteor.x += Math.sin(state.elapsed * 2 + meteor.phase) * meteor.wobble * delta;
  });

  state.particles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 280 * delta;
    particle.life -= delta;
  });

  state.stars = state.stars.filter((star) => {
    if (distance(star, state.player) < star.radius + state.player.radius) {
      state.score += 10;
      scoreElement.textContent = state.score;
      burst(star.x, star.y, "#8df7ff", 12);
      return false;
    }
    return star.y < state.height + 40;
  });

  state.meteors = state.meteors.filter((meteor) => {
    if (distance(meteor, state.player) < meteor.radius + state.player.radius * 0.75) {
      burst(state.player.x, state.player.y, "#ff6b6b", 24);
      finishGame();
      return false;
    }
    return meteor.y < state.height + 60;
  });

  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function drawBackground() {
  context.fillStyle = "#061026";
  context.fillRect(0, 0, state.width, state.height);
  context.fillStyle = "rgba(255, 255, 255, 0.45)";
  for (let index = 0; index < 60; index += 1) {
    const x = (index * 97 + state.elapsed * 15) % state.width;
    const y = (index * 193 + state.elapsed * 34) % state.height;
    context.fillRect(x, y, 2, 2);
  }
}

function drawStar(star) {
  context.save();
  context.translate(star.x, star.y);
  context.rotate(star.spin);
  context.fillStyle = "#ffe66d";
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? star.radius : star.radius * 0.45;
    const angle = (point / 10) * Math.PI * 2;
    context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  context.closePath();
  context.fill();
  context.restore();
}

function drawMeteor(meteor) {
  const gradient = context.createRadialGradient(meteor.x, meteor.y, 2, meteor.x, meteor.y, meteor.radius);
  gradient.addColorStop(0, "#ffd1d1");
  gradient.addColorStop(0.5, "#ff5b5b");
  gradient.addColorStop(1, "#7a101d");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(meteor.x, meteor.y, meteor.radius, 0, Math.PI * 2);
  context.fill();
}

function drawPlayer() {
  context.save();
  context.translate(state.player.x, state.player.y);
  context.fillStyle = "#8df7ff";
  context.shadowColor = "#8df7ff";
  context.shadowBlur = 24;
  context.beginPath();
  context.moveTo(0, -state.player.radius * 1.25);
  context.lineTo(state.player.radius, state.player.radius);
  context.lineTo(0, state.player.radius * 0.55);
  context.lineTo(-state.player.radius, state.player.radius);
  context.closePath();
  context.fill();
  context.restore();
}

function drawParticles() {
  state.particles.forEach((particle) => {
    context.globalAlpha = Math.max(0, particle.life);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function draw() {
  drawBackground();
  state.stars.forEach(drawStar);
  state.meteors.forEach(drawMeteor);
  drawParticles();
  drawPlayer();
}

function loop(time) {
  const delta = Math.min(0.033, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvas);
canvas.addEventListener("touchstart", handleStart, { passive: false });
canvas.addEventListener("touchmove", handleMove, { passive: false });
canvas.addEventListener("mousedown", handleStart);
canvas.addEventListener("mousemove", (event) => {
  if (event.buttons === 1) handleMove(event);
});

resizeCanvas();
requestAnimationFrame(loop);
