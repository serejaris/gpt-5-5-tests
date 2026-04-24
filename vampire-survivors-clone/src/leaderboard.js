(() => {
  const STORAGE_KEY = "myuton-agent-run-leaderboard";
  const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
  const MODEL_KEYS = new Set(["gpt55", "opus", "kimi"]);

  const normalizeModelKey = (key) => {
    const value = String(key || "");
    return MODEL_KEYS.has(value) ? value : "";
  };

  const normalizeScore = (entry) => ({
    id: entry.id || crypto.randomUUID(),
    name: String(entry.name || "Аноним").slice(0, 24),
    score: Math.max(0, Math.floor(Number(entry.score) || 0)),
    kills: Math.max(0, Math.floor(Number(entry.kills) || 0)),
    level: Math.max(1, Math.floor(Number(entry.level) || 1)),
    wave: Math.max(1, Math.floor(Number(entry.wave) || 1)),
    survivedSeconds: Math.max(0, Math.floor(Number(entry.survivedSeconds) || 0)),
    modelKey: normalizeModelKey(entry.modelKey),
    createdAt: entry.createdAt || new Date().toISOString()
  });

  const sortScores = (scores) => scores
    .map(normalizeScore)
    .sort((a, b) => b.score - a.score || b.survivedSeconds - a.survivedSeconds || a.createdAt.localeCompare(b.createdAt))
    .slice(0, 20);

  const localScores = () => {
    try {
      return sortScores(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      return [];
    }
  };

  const saveLocalScore = (entry) => {
    const scores = sortScores([normalizeScore(entry), ...localScores()]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    return { ok: true, score: scores[0], fallback: true };
  };

  const fetchScores = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/leaderboard`, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`Leaderboard status ${response.status}`);
      const data = await response.json();
      return sortScores(data.scores || []);
    } catch (error) {
      console.warn("Leaderboard API unavailable, using local scores.", error);
      return localScores();
    }
  };

  const submitScore = async (entry) => {
    const payload = normalizeScore(entry);
    try {
      const response = await fetch(`${API_BASE}/api/leaderboard`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Leaderboard status ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.warn("Leaderboard submit failed, using local storage.", error);
      return saveLocalScore(payload);
    }
  };

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.Leaderboard = { fetchScores, submitScore };
})();
