import { useEffect, useMemo, useState } from 'react';

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#F97316', '#22C55E'];
const emptyPiece = () => ({ width: 100, height: 100, quantity: 1 });

function LayoutCanvas({ sheet, layout, exportTargetId = 'layout-board' }) {
  const scale = useMemo(() => Math.min(760 / sheet.width, 460 / sheet.height), [sheet]);
  const w = sheet.width * scale;
  const h = sheet.height * scale;

  return (
    <svg id={exportTargetId} width={w} height={h} className="board" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width={w} height={h} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      {layout?.placements?.map((p, i) => (
        <g key={p.id}>
          <rect x={p.x * scale} y={p.y * scale} width={p.width * scale} height={p.height * scale} fill={colors[i % colors.length]} stroke="#0f172a" strokeWidth="1" />
          <text x={p.x * scale + 6} y={p.y * scale + 16} fontSize="12" fill="white">{p.id}</text>
        </g>
      ))}
    </svg>
  );
}

export default function App() {
  const [sheet, setSheet] = useState({ width: 3000, height: 2000 });
  const [pieces, setPieces] = useState([emptyPiece()]);
  const [allowRotation, setAllowRotation] = useState(true);
  const [result, setResult] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobName, setJobName] = useState('Job 1');
  const [autoPreview, setAutoPreview] = useState(false);

  const updatePiece = (index, key, value) => {
    setPieces((prev) => prev.map((p, i) => (i === index ? { ...p, [key]: Number(value) } : p)));
  };

  const runOptimizer = async () => {
    const response = await fetch('http://localhost:4000/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet, pieces, allowRotation }),
    });
    const data = await response.json();
    setResult(data);
  };

  const loadJobs = async () => {
    const response = await fetch('http://localhost:4000/api/jobs');
    const data = await response.json();
    setJobs(data);
  };

  const saveJob = async () => {
    if (!result?.bestLayout) return;
    await fetch('http://localhost:4000/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: jobName, sheet, pieces, allowRotation, bestLayout: result.bestLayout }),
    });
    loadJobs();
  };

  const restoreJob = (job) => {
    setJobName(job.name);
    setSheet({ width: Number(job.sheet_width), height: Number(job.sheet_height) });
    setPieces(JSON.parse(job.pieces_json));
    setResult({ bestLayout: JSON.parse(job.best_layout_json), layouts: [JSON.parse(job.best_layout_json)] });
  };

  const exportSvg = () => {
    const svg = document.getElementById('layout-board');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobName.replace(/\s+/g, '_') || 'layout'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { loadJobs(); }, []);
  useEffect(() => {
    if (!autoPreview) return;
    const timer = setTimeout(() => runOptimizer(), 300);
    return () => clearTimeout(timer);
  }, [sheet, pieces, allowRotation, autoPreview]);

  return (
    <div className="page">
      <h1>SmartGlass Optimizer</h1>
      <div className="grid">
        <section className="panel">
          <h2>Inputs</h2>
          <label>Job Name</label>
          <input value={jobName} onChange={(e) => setJobName(e.target.value)} />
          <label>Sheet Width</label>
          <input type="number" value={sheet.width} onChange={(e) => setSheet({ ...sheet, width: Number(e.target.value) })} />
          <label>Sheet Height</label>
          <input type="number" value={sheet.height} onChange={(e) => setSheet({ ...sheet, height: Number(e.target.value) })} />
          <label><input type="checkbox" checked={allowRotation} onChange={(e) => setAllowRotation(e.target.checked)} /> Allow 90° rotation</label>
          <label><input type="checkbox" checked={autoPreview} onChange={(e) => setAutoPreview(e.target.checked)} /> Auto preview</label>

          <h3>Pieces</h3>
          {pieces.map((p, i) => (
            <div className="pieceRow" key={i}>
              <input type="number" value={p.width} onChange={(e) => updatePiece(i, 'width', e.target.value)} placeholder="Width" />
              <input type="number" value={p.height} onChange={(e) => updatePiece(i, 'height', e.target.value)} placeholder="Height" />
              <input type="number" value={p.quantity} onChange={(e) => updatePiece(i, 'quantity', e.target.value)} placeholder="Qty" />
              <button onClick={() => setPieces((prev) => prev.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}

          <button onClick={() => setPieces((prev) => [...prev, emptyPiece()])}>+ Add Piece</button>
          <button className="primary" onClick={runOptimizer}>Generate Layouts</button>
          <button onClick={saveJob}>Save Job</button>
          <button onClick={exportSvg}>Export SVG</button>
        </section>

        <section className="panel grow">
          <h2>Results</h2>
          {result?.bestLayout ? (
            <>
              <p><b>Best Strategy:</b> {result.bestLayout.strategy}</p>
              <p><b>Used Area:</b> {result.bestLayout.fillPercent}% &nbsp; <b>Waste:</b> {result.bestLayout.wastePercent}%</p>
              <LayoutCanvas sheet={sheet} layout={result.bestLayout} />
              <h3>Layout Options</h3>
              <ul>
                {result.layouts?.map((l) => (
                  <li key={l.strategy}>{l.strategy} — Waste: {l.wastePercent}% — Unplaced: {l.unplaced.length}</li>
                ))}
              </ul>
            </>
          ) : <p>Run optimizer to view layouts.</p>}

          <h3>Saved Jobs</h3>
          <ul>
            {jobs.map((job) => (
              <li key={job.id}>
                <button onClick={() => restoreJob(job)}>Load</button> {job.name} — Waste: {job.waste_percent}%
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
