# Myuton Agent Run

Browser survival game with a leaderboard.

## Local run

```bash
npm start
```

Open `http://localhost:3000`.

Without `DATABASE_URL`, scores are saved to `data/scores.json`.

## Railway

Deploy the project folder and add a PostgreSQL service. Railway should expose `DATABASE_URL`; the app will create the `scores` table automatically.

Start command:

```bash
npm start
```
