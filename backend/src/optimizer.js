const area = (w, h) => w * h;

function expandPieces(pieces) {
  const expanded = [];
  let id = 1;
  for (const piece of pieces) {
    for (let i = 0; i < piece.quantity; i += 1) {
      expanded.push({ id: `P${id}`, width: piece.width, height: piece.height });
      id += 1;
    }
  }
  return expanded;
}

function getOrientations(piece, allowRotation) {
  const options = [{ width: piece.width, height: piece.height, rotated: false }];
  if (allowRotation && piece.width !== piece.height) {
    options.push({ width: piece.height, height: piece.width, rotated: true });
  }
  return options;
}

function splitFreeRect(freeRect, placed) {
  const right = {
    x: freeRect.x + placed.width,
    y: freeRect.y,
    width: freeRect.width - placed.width,
    height: placed.height,
  };

  const bottom = {
    x: freeRect.x,
    y: freeRect.y + placed.height,
    width: freeRect.width,
    height: freeRect.height - placed.height,
  };

  return [right, bottom].filter((r) => r.width > 0 && r.height > 0);
}

function orderPieces(pieces, strategy) {
  const copy = [...pieces];
  if (strategy === 'height') return copy.sort((a, b) => b.height - a.height || b.width - a.width);
  if (strategy === 'width') return copy.sort((a, b) => b.width - a.width || b.height - a.height);
  return copy.sort((a, b) => area(b.width, b.height) - area(a.width, a.height));
}

function choosePlacement(freeRects, piece, fitMethod, allowRotation) {
  let best = null;

  freeRects.forEach((rect, index) => {
    for (const orientation of getOrientations(piece, allowRotation)) {
      if (orientation.width > rect.width || orientation.height > rect.height) continue;
      const leftoverW = rect.width - orientation.width;
      const leftoverH = rect.height - orientation.height;
      const score = fitMethod === 'first-fit'
        ? index
        : (area(rect.width, rect.height) - area(orientation.width, orientation.height)) + Math.abs(leftoverW - leftoverH) / 1000;

      if (!best || score < best.score) {
        best = { index, score, ...orientation };
      }

      if (fitMethod === 'first-fit') return;
    }
  });

  return best;
}

function runPacking(sheet, pieces, strategy) {
  const freeRects = [{ x: 0, y: 0, width: sheet.width, height: sheet.height }];
  const placements = [];
  const unplaced = [];

  for (const piece of pieces) {
    const choice = choosePlacement(freeRects, piece, strategy.fitMethod, strategy.allowRotation);
    if (!choice) {
      unplaced.push(piece);
      continue;
    }

    const rect = freeRects.splice(choice.index, 1)[0];
    const placed = {
      id: piece.id,
      x: rect.x,
      y: rect.y,
      width: choice.width,
      height: choice.height,
      rotated: choice.rotated,
      area: area(choice.width, choice.height),
    };

    placements.push(placed);
    freeRects.push(...splitFreeRect(rect, placed));
    freeRects.sort((a, b) => area(a.width, a.height) - area(b.width, b.height));
  }

  const usedArea = placements.reduce((sum, p) => sum + p.area, 0);
  const totalArea = area(sheet.width, sheet.height);
  const wasteArea = totalArea - usedArea;

  return {
    strategy: strategy.name,
    fitMethod: strategy.fitMethod,
    sortBy: strategy.sortBy,
    allowRotation: strategy.allowRotation,
    placements,
    unplaced,
    usedArea,
    wasteArea,
    fillPercent: Number(((usedArea / totalArea) * 100).toFixed(2)),
    wastePercent: Number(((wasteArea / totalArea) * 100).toFixed(2)),
  };
}

export function optimizeLayouts(sheet, pieces, allowRotation = true) {
  const normalized = expandPieces(pieces);
  const strategies = [
    { name: 'Greedy Largest Area + First Fit', fitMethod: 'first-fit', sortBy: 'area', allowRotation },
    { name: 'FFD + Best Fit', fitMethod: 'best-fit', sortBy: 'area', allowRotation },
    { name: 'Height Priority + Best Fit', fitMethod: 'best-fit', sortBy: 'height', allowRotation },
    { name: 'Width Priority + Best Fit', fitMethod: 'best-fit', sortBy: 'width', allowRotation },
  ];

  const layouts = strategies.map((s) => runPacking(sheet, orderPieces(normalized, s.sortBy), s));
  layouts.sort((a, b) => a.wastePercent - b.wastePercent || a.unplaced.length - b.unplaced.length);

  return { bestLayout: layouts[0], layouts };
}
