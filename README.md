# SmartGlass Optimizer

## What is included now
- Backend API with validation and multi-strategy optimizer.
- MySQL persistence (`save job`, `list jobs`).
- React UI with dynamic piece rows, live/auto preview, saved jobs panel, and SVG export.

## Step 1 — Backend + Algorithm
### Explanation
The optimizer uses a rectangle-packing heuristic:
1. Expand each piece by quantity.
2. Sort pieces (area, height, width variants).
3. Place pieces using `first-fit` and `best-fit` strategies.
4. Split leftover area after each placement.
5. Compare layouts by waste and unplaced pieces.

### Code
- `backend/src/optimizer.js`
- `backend/src/server.js`

### How to test
```bash
cd backend
npm install
npm run dev
curl -X POST http://localhost:4000/api/optimize \
  -H "Content-Type: application/json" \
  -d '{"sheet":{"width":3000,"height":2000},"pieces":[{"width":1000,"height":1000,"quantity":2}],"allowRotation":true}'
```

### What to do next
Connect frontend inputs to this API and verify the returned `layouts` list.

## Step 2 — Database
### Explanation
Jobs are stored with dimensions, original pieces, best layout JSON, and waste percentage for easy reload.

### Code
- `backend/src/db.js`
- `db/schema.sql`

### How to test
```bash
mysql -u root -p < db/schema.sql
curl http://localhost:4000/api/jobs
```

### What to do next
Add UI actions to save and load jobs.

## Step 3 — Frontend UI
### Explanation
The UI uses React and SVG to draw placements and compare strategy quality.

### Code
- `frontend/src/App.jsx`
- `frontend/src/styles.css`

### How to test
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

### What to do next
Add PNG/PDF export and advanced constraints (kerf, grain direction, margins).
