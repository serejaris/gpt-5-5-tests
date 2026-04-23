"use strict";

const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(ROOT, "data");
const SCORES_FILE = path.join(DATA_DIR, "scores.json");
const MAX_BODY_BYTES = 16 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

let poolPromise;

const json = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
    "Cache-Control": "no-store"
  });
  res.end(data);
};

const notFound = (res) => json(res, 404, { error: "Not found" });

const normalizeScore = (entry) => {
  const rawName = String(entry.name || "").trim();
  const name = rawName
    .replace(/[^\p{L}\p{N}\s_.-]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, 24)
    .trim();

  return {
    name: name || "Аноним",
    score: clampInt(entry.score, 0, 999999999),
    kills: clampInt(entry.kills, 0, 999999),
    level: clampInt(entry.level, 1, 9999),
    wave: clampInt(entry.wave, 1, 9999),
    survivedSeconds: clampInt(entry.survivedSeconds, 0, 86400)
  };
};

const clampInt = (value, min, max) => {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
};

const sortScores = (scores) => [...scores]
  .sort((a, b) => b.score - a.score || b.survivedSeconds - a.survivedSeconds || String(a.createdAt).localeCompare(String(b.createdAt)))
  .slice(0, 100);

const getPool = async () => {
  if (!process.env.DATABASE_URL) return null;
  if (!poolPromise) {
    poolPromise = import("pg").then(async ({ Pool }) => {
      const databaseUrl = new URL(process.env.DATABASE_URL);
      const useSsl = process.env.PGSSLMODE === "disable" || databaseUrl.hostname.endsWith(".railway.internal")
        ? false
        : { rejectUnauthorized: false };
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: useSsl
      });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS scores (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          score INTEGER NOT NULL,
          kills INTEGER NOT NULL,
          level INTEGER NOT NULL,
          wave INTEGER NOT NULL,
          survived_seconds INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query("CREATE INDEX IF NOT EXISTS scores_rank_idx ON scores (score DESC, survived_seconds DESC, created_at ASC)");
      return pool;
    });
  }
  return poolPromise;
};

const listScores = async () => {
  const pool = await getPool();
  if (pool) {
    const result = await pool.query(`
      SELECT id, name, score, kills, level, wave, survived_seconds AS "survivedSeconds", created_at AS "createdAt"
      FROM scores
      ORDER BY score DESC, survived_seconds DESC, created_at ASC
      LIMIT 20
    `);
    return result.rows;
  }

  try {
    const file = await fs.readFile(SCORES_FILE, "utf8");
    return sortScores(JSON.parse(file)).slice(0, 20);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return [];
  }
};

const saveScore = async (entry) => {
  const score = normalizeScore(entry);
  const pool = await getPool();

  if (pool) {
    const result = await pool.query(`
      INSERT INTO scores (name, score, kills, level, wave, survived_seconds)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, score, kills, level, wave, survived_seconds AS "survivedSeconds", created_at AS "createdAt"
    `, [score.name, score.score, score.kills, score.level, score.wave, score.survivedSeconds]);
    return result.rows[0];
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  const current = await listScores();
  const next = sortScores([
    {
      id: Date.now().toString(36),
      ...score,
      createdAt: new Date().toISOString()
    },
    ...current
  ]);
  await fs.writeFile(SCORES_FILE, JSON.stringify(next, null, 2));
  return next[0];
};

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let size = 0;
  let body = "";

  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      reject(new Error("Request body too large"));
      req.destroy();
      return;
    }
    body += chunk;
  });

  req.on("end", () => {
    try {
      resolve(JSON.parse(body || "{}"));
    } catch {
      reject(new Error("Invalid JSON"));
    }
  });

  req.on("error", reject);
});

const serveStatic = async (req, res, pathname) => {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const filePath = path.normalize(path.join(ROOT, decodedPath));

  if (!filePath.startsWith(ROOT)) {
    notFound(res);
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": [".html", ".css", ".js"].includes(ext) ? "no-store" : "public, max-age=3600"
    });
    res.end(data);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      notFound(res);
      return;
    }
    console.error(error);
    json(res, 500, { error: "Server error" });
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/leaderboard") {
      json(res, 200, { scores: await listScores() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/leaderboard") {
      const body = await readJsonBody(req);
      const saved = await saveScore(body);
      json(res, 201, { ok: true, score: saved, scores: await listScores() });
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }

    await serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    json(res, error.message === "Invalid JSON" ? 400 : 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Myuton Agent Run listening on http://localhost:${PORT}`);
  console.log(process.env.DATABASE_URL ? "Leaderboard storage: PostgreSQL" : "Leaderboard storage: local JSON fallback");
});
