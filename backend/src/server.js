import express from 'express';
import cors from 'cors';
import { optimizeLayouts } from './optimizer.js';
import { getJobs, saveJob } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function validateRequest(sheet, pieces) {
  if (!sheet || !isPositiveNumber(sheet.width) || !isPositiveNumber(sheet.height)) return 'Invalid sheet dimensions';
  if (!Array.isArray(pieces) || pieces.length === 0) return 'Pieces are required';
  for (const piece of pieces) {
    if (!isPositiveNumber(piece.width) || !isPositiveNumber(piece.height) || !Number.isInteger(piece.quantity) || piece.quantity <= 0) {
      return 'Each piece must include positive width/height and integer quantity';
    }
  }
  return null;
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/optimize', (req, res) => {
  const { sheet, pieces, allowRotation = true } = req.body;
  const validationError = validateRequest(sheet, pieces);
  if (validationError) return res.status(400).json({ error: validationError });

  const result = optimizeLayouts(sheet, pieces, allowRotation);
  return res.json(result);
});

app.post('/api/jobs', async (req, res) => {
  try {
    const { name = 'Untitled Job', sheet, pieces, allowRotation = true, bestLayout } = req.body;
    const validationError = validateRequest(sheet, pieces);
    if (validationError) return res.status(400).json({ error: validationError });
    const id = await saveJob({ name, sheet, pieces, allowRotation, bestLayout });
    return res.status(201).json({ id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save job', detail: error.message });
  }
});

app.get('/api/jobs', async (_req, res) => {
  try {
    const jobs = await getJobs();
    return res.json(jobs);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load jobs', detail: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
