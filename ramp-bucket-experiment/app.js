const {
  Body,
  Bodies,
  Composite,
  Engine,
  Events,
  Runner,
  Sleeping,
  Vector
} = Matter;

const canvas = document.querySelector("#scene");
const context = canvas.getContext("2d");
const angleInput = document.querySelector("#angle");
const angleOutput = document.querySelector("#angle-output");
const releaseButton = document.querySelector("#release");
const resetButton = document.querySelector("#reset");
const runState = document.querySelector("#run-state");
const bucketResult = document.querySelector("#bucket-result");
const speedReadout = document.querySelector("#speed");
const scoreReadout = document.querySelector("#score");

const WORLD = { width: 1100, height: 640 };
const RAMP = {
  exit: { x: 520, y: 330 },
  length: 440,
  thickness: 22
};
const BALL_RADIUS = 20;
const BUCKET = {
  width: 104,
  height: 118,
  wallThickness: 12
};
const BUCKETS = [
  { id: 0, label: "Bucket 1", x: 555, color: "#c7473f" },
  { id: 1, label: "Bucket 2", x: 650, color: "#d99b1d" },
  { id: 2, label: "Bucket 3", x: 745, color: "#19826b" }
];

const engine = Engine.create({
  positionIterations: 10,
  velocityIterations: 8,
  constraintIterations: 4
});
engine.gravity.y = 1.05;

const runner = Runner.create();
let rampAngle = Number(angleInput.value);
let ramp;
let ball;
let isReleased = false;
let landedBucket = null;
let animationFrame = null;
let releaseStartedAt = 0;
const score = [0, 0, 0];

function radians(degrees) {
  return degrees * Math.PI / 180;
}

function rampPose(angleDegrees) {
  const angle = radians(angleDegrees);
  const half = RAMP.length / 2;
  return {
    angle,
    x: RAMP.exit.x - Math.cos(angle) * half,
    y: RAMP.exit.y - Math.sin(angle) * half
  };
}

function ballStart(angleDegrees) {
  const angle = radians(angleDegrees);
  const start = rampStartPoint(angleDegrees);
  return {
    x: start.x + Math.cos(angle) * 76 + Math.sin(angle) * (BALL_RADIUS + 11),
    y: start.y + Math.sin(angle) * 76 - Math.cos(angle) * (BALL_RADIUS + 11)
  };
}

function createBucket(bucket) {
  const bottomY = 596;
  const left = Bodies.rectangle(
    bucket.x - BUCKET.width / 2,
    bottomY - BUCKET.height / 2,
    BUCKET.wallThickness,
    BUCKET.height,
    bucketWallOptions(bucket.id)
  );
  const right = Bodies.rectangle(
    bucket.x + BUCKET.width / 2,
    bottomY - BUCKET.height / 2,
    BUCKET.wallThickness,
    BUCKET.height,
    bucketWallOptions(bucket.id)
  );
  const bottom = Bodies.rectangle(
    bucket.x,
    bottomY,
    BUCKET.width + BUCKET.wallThickness,
    BUCKET.wallThickness,
    bucketWallOptions(bucket.id)
  );

  Body.setAngle(left, radians(-7));
  Body.setAngle(right, radians(7));
  return [left, right, bottom];
}

function bucketWallOptions(bucketId) {
  return {
    isStatic: true,
    friction: 0.9,
    restitution: 0.02,
    label: `bucket-${bucketId}`
  };
}

function createWorld() {
  const pose = rampPose(rampAngle);
  ramp = Bodies.rectangle(pose.x, pose.y, RAMP.length, RAMP.thickness, {
    isStatic: true,
    angle: pose.angle,
    friction: 0.08,
    restitution: 0.05,
    label: "adjustable-ramp"
  });

  const ground = Bodies.rectangle(WORLD.width / 2, WORLD.height + 28, WORLD.width + 120, 56, {
    isStatic: true,
    friction: 0.72,
    restitution: 0.08,
    label: "ground"
  });
  const leftWall = Bodies.rectangle(-30, WORLD.height / 2, 60, WORLD.height, {
    isStatic: true,
    label: "left-wall"
  });
  const rightWall = Bodies.rectangle(WORLD.width + 30, WORLD.height / 2, 60, WORLD.height, {
    isStatic: true,
    label: "right-wall"
  });

  const bucketBodies = BUCKETS.flatMap(createBucket);
  Composite.add(engine.world, [ground, leftWall, rightWall, ramp, ...bucketBodies]);
  resetBall();
}

function createBall() {
  const start = ballStart(rampAngle);
  return Bodies.circle(start.x, start.y, BALL_RADIUS, {
    density: 0.0022,
    friction: 0.05,
    frictionAir: 0.002,
    restitution: 0.22,
    slop: 0.01,
    label: "steel-ball"
  });
}

function setRampAngle(nextAngle) {
  rampAngle = nextAngle;
  angleOutput.value = String(nextAngle);
  const pose = rampPose(nextAngle);
  Body.setPosition(ramp, { x: pose.x, y: pose.y });
  Body.setAngle(ramp, pose.angle);

  if (!isReleased) {
    placeBallAtStart();
  } else {
    resetBall();
  }
}

function placeBallAtStart() {
  const start = ballStart(rampAngle);
  Body.setPosition(ball, start);
  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setAngularVelocity(ball, 0);
  Body.setAngle(ball, 0);
  Sleeping.set(ball, false);
}

function resetBall() {
  if (ball) {
    Composite.remove(engine.world, ball);
  }

  ball = createBall();
  Composite.add(engine.world, ball);
  isReleased = false;
  landedBucket = null;
  releaseStartedAt = 0;
  runState.textContent = "Ready";
  bucketResult.textContent = "No bucket yet";
  speedReadout.textContent = "0.0 m/s";
}

function releaseBall() {
  if (isReleased) {
    resetBall();
  }

  isReleased = true;
  releaseStartedAt = performance.now();
  runState.textContent = "Rolling";
  bucketResult.textContent = "Tracking...";
  const angle = radians(rampAngle);
  const releaseSpeed = 0.55 + Math.max(0, rampAngle - 8) * 0.08;
  Body.setVelocity(ball, {
    x: Math.cos(angle) * releaseSpeed,
    y: Math.sin(angle) * releaseSpeed
  });
  Body.setAngularVelocity(ball, releaseSpeed * 0.045);
}

function detectBucket() {
  if (!isReleased || landedBucket !== null) {
    return;
  }

  const isSettled = releaseStartedAt > 0
    && performance.now() - releaseStartedAt > 2800
    && Vector.magnitude(ball.velocity) < 0.55;
  if (ball.position.y < 496 || Math.abs(ball.velocity.y) > 3.2) {
    if (isSettled) {
      landedBucket = -1;
      runState.textContent = "Stopped";
      bucketResult.textContent = "Stopped outside buckets";
    }
    return;
  }

  const bucket = BUCKETS.find((candidate) => {
    const left = candidate.x - BUCKET.width / 2;
    const right = candidate.x + BUCKET.width / 2;
    return ball.position.x > left && ball.position.x < right;
  });

  if (!bucket) {
    if (ball.position.y > WORLD.height + 40 || isSettled) {
      landedBucket = -1;
      runState.textContent = "Stopped";
      bucketResult.textContent = "Stopped outside buckets";
    }
    return;
  }

  landedBucket = bucket.id;
  score[bucket.id] += 1;
  runState.textContent = "Landed";
  bucketResult.textContent = `${bucket.label} caught it`;
  scoreReadout.textContent = score.join(" / ");
}

function drawScene() {
  const { width, height, scale, offsetX, offsetY } = viewportTransform();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);

  drawBackground();
  drawTrajectoryGuide();
  drawRamp();
  drawBuckets();
  drawBall();
  drawForeground();

  context.restore();
  animationFrame = requestAnimationFrame(drawScene);
}

function viewportTransform() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.max(1, Math.round(rect.width * dpr));
  const nextHeight = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  const scale = Math.min(canvas.width / WORLD.width, canvas.height / WORLD.height);
  return {
    width: canvas.width,
    height: canvas.height,
    scale,
    offsetX: (canvas.width - WORLD.width * scale) / 2,
    offsetY: (canvas.height - WORLD.height * scale) / 2
  };
}

function drawBackground() {
  const sky = context.createLinearGradient(0, 0, 0, WORLD.height * 0.56);
  sky.addColorStop(0, "#c7dde9");
  sky.addColorStop(1, "#e8f0f1");
  context.fillStyle = sky;
  context.fillRect(0, 0, WORLD.width, WORLD.height * 0.56);

  context.fillStyle = "#e8dcc0";
  context.fillRect(0, WORLD.height * 0.56, WORLD.width, WORLD.height * 0.44);

  context.strokeStyle = "rgba(23, 32, 42, 0.09)";
  context.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += 55) {
    context.beginPath();
    context.moveTo(x, 364);
    context.lineTo(x - 88, WORLD.height);
    context.stroke();
  }

  context.fillStyle = "rgba(255, 255, 255, 0.35)";
  context.fillRect(0, 0, WORLD.width, 52);
}

function drawTrajectoryGuide() {
  if (isReleased) {
    return;
  }

  const start = ballStart(rampAngle);
  const end = rampEndPoint();
  context.setLineDash([10, 12]);
  context.lineWidth = 3;
  context.strokeStyle = "rgba(39, 111, 191, 0.42)";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.quadraticCurveTo(end.x + 95, end.y + 30, end.x + 182, end.y + 132);
  context.stroke();
  context.setLineDash([]);
}

function rampEndPoint() {
  return RAMP.exit;
}

function rampStartPoint(angleDegrees = rampAngle) {
  const angle = radians(angleDegrees);
  return {
    x: RAMP.exit.x - Math.cos(angle) * RAMP.length,
    y: RAMP.exit.y - Math.sin(angle) * RAMP.length
  };
}

function drawRamp() {
  context.save();
  context.translate(ramp.position.x, ramp.position.y);
  context.rotate(ramp.angle);

  context.fillStyle = "#51606f";
  roundedRect(-RAMP.length / 2, -RAMP.thickness / 2, RAMP.length, RAMP.thickness, 8);
  context.fill();

  context.fillStyle = "#748394";
  roundedRect(-RAMP.length / 2 + 12, -RAMP.thickness / 2 + 4, RAMP.length - 24, 5, 3);
  context.fill();

  context.restore();

  context.fillStyle = "#394653";
  context.beginPath();
  context.arc(RAMP.exit.x, RAMP.exit.y, 15, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#eef3f6";
  context.beginPath();
  context.arc(RAMP.exit.x, RAMP.exit.y, 5, 0, Math.PI * 2);
  context.fill();
}

function drawBuckets() {
  BUCKETS.forEach((bucket, index) => {
    const width = BUCKET.width;
    const height = BUCKET.height;
    const topY = 596 - height;
    const bottomY = 596;
    const leftX = bucket.x - width / 2;
    const rightX = bucket.x + width / 2;

    context.save();
    context.lineWidth = 15;
    context.lineJoin = "round";
    context.strokeStyle = bucket.color;
    context.beginPath();
    context.moveTo(leftX, topY);
    context.lineTo(leftX + 14, bottomY);
    context.lineTo(rightX - 14, bottomY);
    context.lineTo(rightX, topY);
    context.stroke();

    context.lineWidth = 3;
    context.strokeStyle = "rgba(255, 255, 255, 0.52)";
    context.beginPath();
    context.moveTo(leftX + 10, topY + 12);
    context.lineTo(rightX - 10, topY + 12);
    context.stroke();

    context.fillStyle = "rgba(23, 32, 42, 0.74)";
    context.font = "700 19px ui-sans-serif, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(String(index + 1), bucket.x, bottomY - 38);

    if (landedBucket === bucket.id) {
      context.strokeStyle = "#17202a";
      context.lineWidth = 4;
      roundedRect(leftX - 13, topY - 20, width + 26, height + 34, 8);
      context.stroke();
    }
    context.restore();
  });
}

function drawBall() {
  const speed = Vector.magnitude(ball.velocity);
  const gradient = context.createRadialGradient(
    ball.position.x - 8,
    ball.position.y - 10,
    4,
    ball.position.x,
    ball.position.y,
    BALL_RADIUS + 5
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.35, "#cbd4dc");
  gradient.addColorStop(1, "#4d5966");

  context.save();
  context.translate(ball.position.x, ball.position.y);
  context.rotate(ball.angle);
  context.fillStyle = "rgba(23, 32, 42, 0.2)";
  context.beginPath();
  context.ellipse(5, BALL_RADIUS + 8, BALL_RADIUS * 1.15, 7, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(23, 32, 42, 0.42)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-BALL_RADIUS + 5, 0);
  context.lineTo(BALL_RADIUS - 5, 0);
  context.stroke();
  context.restore();

  speedReadout.textContent = `${(speed * 0.72).toFixed(1)} m/s`;
}

function drawForeground() {
  context.fillStyle = "rgba(23, 32, 42, 0.12)";
  context.fillRect(0, 618, WORLD.width, 22);

  context.fillStyle = "rgba(23, 32, 42, 0.64)";
  context.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText(`${rampAngle}deg ramp`, RAMP.exit.x - 118, RAMP.exit.y - 24);
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function bindControls() {
  angleInput.addEventListener("input", (event) => {
    setRampAngle(Number(event.target.value));
  });
  releaseButton.addEventListener("click", releaseBall);
  resetButton.addEventListener("click", resetBall);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      releaseBall();
    }
    if (event.key.toLowerCase() === "r") {
      resetBall();
    }
  });
}

function start() {
  createWorld();
  bindControls();
  Events.on(engine, "afterUpdate", detectBucket);
  Runner.run(runner, engine);
  drawScene();
}

window.addEventListener("beforeunload", () => {
  Runner.stop(runner);
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});

start();
