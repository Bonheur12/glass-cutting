import { useEffect, useMemo, useState } from 'react';
import { Aperture, Download, Layers3, Plus, Save, Sparkles, Trash2 } from 'lucide-react';

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#F97316', '#22C55E'];
const emptyPiece = () => ({ width: 100, height: 100, quantity: 1 });

function Header() {
  return (
    <header className="glass sticky top-4 z-30 mx-auto mb-6 flex max-w-7xl items-center justify-between rounded-2xl px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-600 p-2 text-white"><Aperture size={18} /></div>
        <div>
          <h1 className="text-lg font-semibold">SmartGlass Optimizer</h1>
          <p className="text-xs text-slate-500">Cut planning dashboard</p>
        </div>
      </div>
      <nav className="hidden gap-4 text-sm text-slate-600 md:flex">
        <span className="font-medium text-brand-600">Dashboard</span>
        <span>Saved Jobs</span>
      </nav>
    </header>
  );
}

function LayoutCanvas({ sheet, layout }) {
  const scale = useMemo(() => Math.min(780 / sheet.width, 480 / sheet.height), [sheet]);
  const w = sheet.width * scale;
  const h = sheet.height * scale;

  return (
    <div className="rounded-xl border border-slate-200 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%,transparent_50%,#f8fafc_50%,#f8fafc_75%,transparent_75%,transparent)] bg-[length:22px_22px] p-3">
      <svg id="layout-board" width={w} height={h} className="mx-auto rounded-lg border border-slate-300 bg-white">
        <rect x="0" y="0" width={w} height={h} fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
        {layout?.placements?.map((p, i) => (
          <g key={p.id}>
            <rect x={p.x * scale} y={p.y * scale} width={p.width * scale} height={p.height * scale} fill={colors[i % colors.length]} rx="4" />
            <text x={p.x * scale + 6} y={p.y * scale + 16} fontSize="11" fill="white">{p.id} ({p.width}×{p.height})</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function MetricCard({ label, value, tone = 'blue' }) {
  const toneStyles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  return (
    <div className={`rounded-xl border p-4 ${toneStyles[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updatePiece = (index, key, value) => setPieces((prev) => prev.map((p, i) => (i === index ? { ...p, [key]: Number(value) } : p)));

  const validateInputs = () => {
    if (!sheet.width || !sheet.height || sheet.width <= 0 || sheet.height <= 0) return 'Sheet dimensions must be positive.';
    if (!pieces.length) return 'Add at least one piece.';
    const invalidPiece = pieces.some((p) => p.width <= 0 || p.height <= 0 || p.quantity <= 0);
    if (invalidPiece) return 'Every piece row must have positive width, height, and quantity.';
    return '';
  };

  const runOptimizer = async () => {
    const validationMessage = validateInputs();
    if (validationMessage) return setError(validationMessage);

    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:4000/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet, pieces, allowRotation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to optimize.');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    const response = await fetch('http://localhost:4000/api/jobs');
    const data = await response.json();
    setJobs(data);
  };

  const saveJob = async () => {
    if (!result?.bestLayout) return setError('Generate a layout before saving.');
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
    const source = new XMLSerializer().serializeToString(svg);
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
    const timer = setTimeout(() => runOptimizer(), 350);
    return () => clearTimeout(timer);
  }, [sheet, pieces, allowRotation, autoPreview]);

  return (
    <div className="min-h-screen px-4 py-4 md:px-8">
      <Header />

      <main className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[390px_1fr]">
        <section className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2"><Layers3 size={16} className="text-brand-600" /><h2 className="font-semibold">Input Config</h2></div>
          <label className="text-xs text-slate-500">Job name</label>
          <input className="mb-3 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" value={jobName} onChange={(e) => setJobName(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-500">Sheet width</label><input type="number" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={sheet.width} onChange={(e) => setSheet({ ...sheet, width: Number(e.target.value) })} /></div>
            <div><label className="text-xs text-slate-500">Sheet height</label><input type="number" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={sheet.height} onChange={(e) => setSheet({ ...sheet, height: Number(e.target.value) })} /></div>
          </div>

          <div className="mt-3 flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={allowRotation} onChange={(e) => setAllowRotation(e.target.checked)} />Rotate</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={autoPreview} onChange={(e) => setAutoPreview(e.target.checked)} />Auto preview</label>
          </div>

          <h3 className="mt-5 text-sm font-semibold">Pieces</h3>
          <div className="mt-2 space-y-2">
            {pieces.map((p, i) => (
              <div className="grid grid-cols-[1fr_1fr_85px_42px] gap-2" key={i}>
                <input type="number" value={p.width} onChange={(e) => updatePiece(i, 'width', e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="Width" />
                <input type="number" value={p.height} onChange={(e) => updatePiece(i, 'height', e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="Height" />
                <input type="number" value={p.quantity} onChange={(e) => updatePiece(i, 'quantity', e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="Qty" />
                <button className="rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50" onClick={() => setPieces((prev) => prev.filter((_, idx) => idx !== i))}><Trash2 size={14} className="mx-auto" /></button>
              </div>
            ))}
          </div>

          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 py-2 text-sm text-brand-600 hover:bg-brand-50" onClick={() => setPieces((prev) => [...prev, emptyPiece()])}><Plus size={14} /> Add Piece</button>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-500" onClick={runOptimizer}>{loading ? 'Generating...' : 'Generate'}</button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" onClick={saveJob}><Save size={14} className="mr-1 inline" /> Save</button>
            <button className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" onClick={exportSvg}><Download size={14} className="mr-1 inline" /> Export SVG</button>
          </div>
          {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p> : null}
        </section>

        <section className="space-y-5">
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2"><Sparkles size={16} className="text-brand-600" /><h2 className="font-semibold">Optimization Results</h2></div>
            {result?.bestLayout ? (
              <>
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <MetricCard label="Best strategy" value={result.bestLayout.strategy} />
                  <MetricCard label="Used area" value={`${result.bestLayout.fillPercent}%`} tone="emerald" />
                  <MetricCard label="Waste" value={`${result.bestLayout.wastePercent}%`} tone="rose" />
                </div>
                <LayoutCanvas sheet={sheet} layout={result.bestLayout} />
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {result.layouts?.map((l) => (
                    <article key={l.strategy} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-medium">{l.strategy}</p>
                      <p className="text-slate-500">Waste: {l.wastePercent}% · Unplaced: {l.unplaced.length}</p>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No layout yet. Fill input details and click <b>Generate</b>.
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="mb-3 font-semibold">Saved Jobs</h2>
            {jobs.length ? (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <button key={job.id} className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-brand-300" onClick={() => restoreJob(job)}>
                    <span>{job.name}</span>
                    <span className="text-xs text-slate-500">Waste: {job.waste_percent}%</span>
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">No saved jobs yet.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
