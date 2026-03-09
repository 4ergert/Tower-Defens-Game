// --- Constants & Utilities ---
const COLS = 20;
const ROWS = 15;
const getCells = () => document.querySelectorAll('.grid-cell');
const getGrid = () => document.getElementById('main-grid');
const getMainContent = () => document.getElementById('main-content');
const getStartCell = () => document.querySelector('.start-cell');
const getEndCell = () => document.querySelector('.end-cell');

// A*-Algorithmus für kürzesten Pfad mit Visualisierung
async function aStarPath() {
  const cells = getCells();
  const startCell = getStartCell();
  const endCell = getEndCell();
  if (!startCell || !endCell) return;
  const startIdx = Array.from(cells).indexOf(startCell);
  const endIdx = Array.from(cells).indexOf(endCell);

  // Hilfsfunktionen
  function idxToXY(idx) {
    return [idx % COLS, Math.floor(idx / COLS)];
  }
  function xyToIdx(x, y) {
    return y * COLS + x;
  }
  function heuristic(a, b) {
    const [ax, ay] = idxToXY(a);
    const [bx, by] = idxToXY(b);
    return Math.abs(ax - bx) + Math.abs(ay - by); // Manhattan
  }

  // Mauern als Hindernisse
  const wallSet = new Set();
  cells.forEach((cell, idx) => {
    if (cell.classList.contains('wall-cell')) wallSet.add(idx);
  });

  // Visualisierung: Farben
  function colorCell(idx, cls) {
    if (idx === startIdx || idx === endIdx) return;
    cells[idx].classList.add(cls);
  }
  function clearColors() {
    for (const cell of cells) {
      cell.classList.remove('open-cell', 'closed-cell', 'path-cell');
    }
  }

  clearColors();

  for (let attempt = 0; attempt < 2; attempt++) {
    const allowThroughWalls = attempt === 1;
    const openSet = [startIdx];
    const cameFrom = {};
    const gScore = Array(COLS * ROWS).fill(Infinity);
    gScore[startIdx] = 0;
    const fScore = Array(COLS * ROWS).fill(Infinity);
    fScore[startIdx] = heuristic(startIdx, endIdx);
    const closedSet = new Set();

    while (openSet.length > 0) {
      // Knoten mit niedrigstem fScore wählen
      let current = openSet.reduce((a, b) => fScore[a] < fScore[b] ? a : b);
      if (current === endIdx) {
        // Pfad rekonstruieren
        let path = [current];
        while (cameFrom[current] !== undefined) {
          current = cameFrom[current];
          path.push(current);
        }
        path.reverse();
        // Animated line for A* path
        drawAnimatedPathLine(path);
        return;
    // Draws an animated line for the A* path
    function drawAnimatedPathLine(path) {
      const grid = document.getElementById('main-grid');
      if (!grid) return;
      let canvas = document.getElementById('astar-path-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'astar-path-canvas';
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = 25;
        grid.appendChild(canvas);
      }
      canvas.width = grid.offsetWidth;
      canvas.height = grid.offsetHeight;
      const ctx = canvas.getContext('2d');
      // Get cell centers
      const cellWidth = grid.offsetWidth / COLS;
      const cellHeight = grid.offsetHeight / ROWS;
      const points = path.map(idx => {
        const x = (idx % COLS) * cellWidth + cellWidth / 2;
        const y = Math.floor(idx / COLS) * cellHeight + cellHeight / 2;
        return { x, y };
      });
      // Animation
      let progress = 0;
      const speed = 0.015; // Adjust for faster/slower animation
      function drawDot(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, 2 * Math.PI);
        ctx.fill();
      }
      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.fillStyle = '#00fff7';
        ctx.shadowColor = '#00fff7';
        ctx.shadowBlur = 10;
        let maxIdx = Math.floor(progress * (points.length - 1));
        for (let i = 1; i <= maxIdx && i < points.length; i++) {
          drawDot(points[i].x, points[i].y);
        }
        ctx.restore();
        progress += speed;
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Keep all points visible after animation
          ctx.save();
          ctx.fillStyle = '#00fff7';
          ctx.shadowColor = '#00fff7';
          ctx.shadowBlur = 10;
          for (let i = 0; i < points.length; i++) {
            drawDot(points[i].x, points[i].y);
          }
          ctx.restore();
        }
      }
      animate();
    }
      }
      // Aus openSet entfernen, zu closedSet hinzufügen
      openSet.splice(openSet.indexOf(current), 1);
      closedSet.add(current);
      colorCell(current, 'closed-cell');
      // Nachbarn
      const [x, y] = idxToXY(current);
      const neighbors = [];
      if (x > 0) neighbors.push(xyToIdx(x - 1, y));
      if (x < COLS - 1) neighbors.push(xyToIdx(x + 1, y));
      if (y > 0) neighbors.push(xyToIdx(x, y - 1));
      if (y < ROWS - 1) neighbors.push(xyToIdx(x, y + 1));
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor)) continue;
        if (!allowThroughWalls && wallSet.has(neighbor)) continue; // Mauern überspringen
        const tentativeG = gScore[current] + 1;
        if (!openSet.includes(neighbor)) openSet.push(neighbor);
        else if (tentativeG >= gScore[neighbor]) continue;
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = gScore[neighbor] + heuristic(neighbor, endIdx);
        colorCell(neighbor, 'open-cell');
      }
      await new Promise(r => setTimeout(r, 10));
    }
  }
  // Kein Pfad gefunden
  alert('Kein Pfad gefunden!');
}
// Button für A*-Visualisierung hinzufügen (optional)
window.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('nav ul');
  if (nav) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = 'A*-Pfad suchen';
    a.href = '#';
    a.onclick = (e) => { e.preventDefault(); aStarPath(); };
    li.appendChild(a);
    nav.appendChild(li);
  }
});

function createGrid() {
  const mainContent = document.getElementById('main-content');

  // --- Grid ---
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.id = 'main-grid';
  for (let i = 0; i < 300; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.id = `cell-${i}`;
    grid.appendChild(cell);
  }

  // --- Tower Selection Menu ---
  const towerMenu = document.createElement('div');
  towerMenu.id = 'tower-menu';
  towerMenu.innerHTML = `
    <button class="tower-select-btn" data-tower="wall">Mauer</button>
    <button class="tower-select-btn" data-tower="turret">Turm</button>
    <button class="tower-select-btn" data-tower="cannon">Kanone</button>
    <button class="tower-select-btn" data-tower="barracks">Kaserne</button>
  `;

  // Set order for flex layout: grid left, menu right
  grid.style.order = '1';
  towerMenu.style.order = '2';

  mainContent.appendChild(grid);
  mainContent.appendChild(towerMenu);

  if (!document.getElementById('build-area-visual-style')) {
    const style = document.createElement('style');
    style.id = 'build-area-visual-style';
    style.textContent = `
      .grid-cell.build-allowed-cell:not(.start-cell):not(.end-cell):not(.wall-cell):not(.turret-cell):not(.cannon-cell):not(.barracks-cell) {
        background: rgba(55, 255, 20, 0.51) !important;
        border-color: rgba(55, 255, 20, 0.95);
        box-shadow: 0 0 10px rgba(55, 255, 20, 0.45) inset, 0 0 8px rgba(55, 255, 20, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  // Pre-game Radiusvorschau auf eigener Canvas
  grid.style.position = 'relative';
  let preStartRadiusCanvas = null;
  let preStartRadiusCtx = null;
  let preStartRadiusAnimating = false;

  function ensurePreStartRadiusCanvas() {
    if (preStartRadiusCanvas) return;
    preStartRadiusCanvas = document.createElement('canvas');
    preStartRadiusCanvas.id = 'prestart-radius-canvas';
    preStartRadiusCanvas.style.position = 'absolute';
    preStartRadiusCanvas.style.left = '0';
    preStartRadiusCanvas.style.top = '0';
    preStartRadiusCanvas.style.pointerEvents = 'none';
    preStartRadiusCanvas.style.zIndex = '29';
    preStartRadiusCanvas.width = grid.offsetWidth;
    preStartRadiusCanvas.height = grid.offsetHeight;
    grid.appendChild(preStartRadiusCanvas);
    preStartRadiusCtx = preStartRadiusCanvas.getContext('2d');
  }

  function removePreStartRadiusCanvas() {
    if (preStartRadiusCanvas && preStartRadiusCanvas.parentNode) {
      preStartRadiusCanvas.parentNode.removeChild(preStartRadiusCanvas);
    }
    preStartRadiusCanvas = null;
    preStartRadiusCtx = null;
  }

  function drawPreStartRadiusFrame(timestamp) {
    if (window.gameStarted) {
      preStartRadiusAnimating = false;
      removePreStartRadiusCanvas();
      return;
    }
    if (!preStartRadiusCanvas || !preStartRadiusCtx) {
      preStartRadiusAnimating = false;
      return;
    }

    preStartRadiusCanvas.width = grid.offsetWidth;
    preStartRadiusCanvas.height = grid.offsetHeight;
    preStartRadiusCtx.clearRect(0, 0, preStartRadiusCanvas.width, preStartRadiusCanvas.height);

    const selectedIdx = window.selectedTurretIndex;
    const cellsNow = getCells();
    const selectedCell = (selectedIdx === null || selectedIdx === undefined) ? null : cellsNow[selectedIdx];
    if (!selectedCell || (!selectedCell.classList.contains('turret-cell') && !selectedCell.classList.contains('cannon-cell'))) {
      preStartRadiusAnimating = false;
      removePreStartRadiusCanvas();
      return;
    }

    const col = selectedIdx % COLS;
    const row = Math.floor(selectedIdx / COLS);
    const cellW = grid.offsetWidth / COLS;
    const cellH = grid.offsetHeight / ROWS;
    const range = 4.5 * Math.max(cellW, cellH);
    const tx = col * cellW + cellW / 2;
    const ty = row * cellH + cellH / 2;
    const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.005 + selectedIdx);
    const sweepAngle = (timestamp * 0.0015 + selectedIdx * 0.35) % (Math.PI * 2);
    const sweepWidth = 0.42;
    const edgeX = tx + Math.cos(sweepAngle) * range;
    const edgeY = ty + Math.sin(sweepAngle) * range;

    preStartRadiusCtx.save();
    preStartRadiusCtx.beginPath();
    preStartRadiusCtx.arc(tx, ty, range, 0, 2 * Math.PI);
    preStartRadiusCtx.fillStyle = `rgba(0, 255, 247, ${0.14 + pulse * 0.08})`;
    preStartRadiusCtx.fill();

    preStartRadiusCtx.beginPath();
    preStartRadiusCtx.moveTo(tx, ty);
    preStartRadiusCtx.arc(tx, ty, range, sweepAngle - sweepWidth, sweepAngle + sweepWidth);
    preStartRadiusCtx.closePath();
    preStartRadiusCtx.fillStyle = `rgba(140, 255, 252, ${0.08 + pulse * 0.07})`;
    preStartRadiusCtx.shadowColor = '#8cfffc';
    preStartRadiusCtx.shadowBlur = 6 + pulse * 5;
    preStartRadiusCtx.fill();

    preStartRadiusCtx.beginPath();
    preStartRadiusCtx.moveTo(tx, ty);
    preStartRadiusCtx.lineTo(edgeX, edgeY);
    preStartRadiusCtx.strokeStyle = `rgba(220, 255, 255, ${0.35 + pulse * 0.2})`;
    preStartRadiusCtx.lineWidth = 1.2;
    preStartRadiusCtx.setLineDash([]);
    preStartRadiusCtx.stroke();

    preStartRadiusCtx.beginPath();
    preStartRadiusCtx.arc(edgeX, edgeY, 2.8, 0, 2 * Math.PI);
    preStartRadiusCtx.fillStyle = `rgba(230, 255, 255, ${0.45 + pulse * 0.2})`;
    preStartRadiusCtx.fill();

    preStartRadiusCtx.beginPath();
    preStartRadiusCtx.arc(tx, ty, range, 0, 2 * Math.PI);
    preStartRadiusCtx.strokeStyle = `rgba(0, 255, 247, ${0.8 + pulse * 0.2})`;
    preStartRadiusCtx.lineWidth = 3;
    preStartRadiusCtx.setLineDash([10, 6]);
    preStartRadiusCtx.shadowColor = '#00fff7';
    preStartRadiusCtx.shadowBlur = 10 + pulse * 12;
    preStartRadiusCtx.stroke();

    preStartRadiusCtx.beginPath();
    preStartRadiusCtx.arc(tx, ty, range, 0, 2 * Math.PI);
    preStartRadiusCtx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.25})`;
    preStartRadiusCtx.lineWidth = 1.2;
    preStartRadiusCtx.setLineDash([]);
    preStartRadiusCtx.stroke();
    preStartRadiusCtx.restore();

    requestAnimationFrame(drawPreStartRadiusFrame);
  }

  function ensurePreStartRadiusAnimationRunning() {
    if (window.gameStarted) return;
    if (window.selectedTurretIndex === null || window.selectedTurretIndex === undefined) {
      preStartRadiusAnimating = false;
      removePreStartRadiusCanvas();
      return;
    }
    ensurePreStartRadiusCanvas();
    if (!preStartRadiusAnimating) {
      preStartRadiusAnimating = true;
      requestAnimationFrame(drawPreStartRadiusFrame);
    }
  }

  window.stopPreStartRadiusPreview = () => {
    preStartRadiusAnimating = false;
    removePreStartRadiusCanvas();
  };
  window.refreshTurretRadiusDisplay = () => {
    if (window.gameStarted) {
      window.ensureRadiusAnimationRunning?.();
      return;
    }
    ensurePreStartRadiusAnimationRunning();
  };

  // --- Tower Selection Logic ---
  window.selectedTowerType = undefined;
  window.selectedTurretIndex = null;
  window._showBuildAreaHint = false;

  function clearBuildAreaVisualization() {
    const allCells = getCells();
    allCells.forEach(c => c.classList.remove('build-allowed-cell'));
  }

  function refreshBuildAreaVisualization(forceShow = false) {
    if (forceShow) window._showBuildAreaHint = true;
    const showByTool = window.selectedTowerType === 'wall' || window.selectedTowerType === 'turret' || window.selectedTowerType === 'cannon' || window.selectedTowerType === 'barracks';
    const shouldShow = showByTool || window._showBuildAreaHint;
    if (!shouldShow) {
      clearBuildAreaVisualization();
      return;
    }

    const allCells = getCells();
    allCells.forEach((cellEl, idx) => {
      if (cellEl.classList.contains('start-cell') || cellEl.classList.contains('end-cell')) {
        cellEl.classList.remove('build-allowed-cell');
        return;
      }
      if (isBuildAllowed(idx)) cellEl.classList.add('build-allowed-cell');
      else cellEl.classList.remove('build-allowed-cell');
    });
  }

  towerMenu.addEventListener('click', (e) => {
    if (e.target.matches('.tower-select-btn')) {
      document.querySelectorAll('.tower-select-btn').forEach(btn => btn.classList.remove('selected'));
      e.target.classList.add('selected');
      window.selectedTowerType = e.target.dataset.tower;
      e.target.classList.remove('animate');
      void e.target.offsetWidth;
      e.target.classList.add('animate');
      refreshBuildAreaVisualization();
    }
  });

  // --- Cell Click Handler for Towers/Walls ---
  function isWithinBuildRadiusOfEnd(cellIdx) {
    const endCell = getEndCell();
    if (!endCell) return false;
    const allCells = getCells();
    const endIdx = Array.from(allCells).indexOf(endCell);
    if (endIdx < 0) return false;

    const endX = endIdx % COLS;
    const endY = Math.floor(endIdx / COLS);
    const cellX = cellIdx % COLS;
    const cellY = Math.floor(cellIdx / COLS);
    const dx = Math.abs(cellX - endX);
    const dy = Math.abs(cellY - endY);
    // Diagonale Schritte zaehlen als 1 Feld (Chebyshev-Distanz)
    return Math.max(dx, dy) <= 2;
  }

  function isWithinOneCellOfBuiltStructure(cellIdx) {
    const allCells = getCells();
    const cellX = cellIdx % COLS;
    const cellY = Math.floor(cellIdx / COLS);
    for (let i = 0; i < allCells.length; i++) {
      const c = allCells[i];
      // Nur Turm-Bauten erweitern die Bauzone, Mauern nicht
      if (!c.classList.contains('turret-cell') && !c.classList.contains('cannon-cell') && !c.classList.contains('barracks-cell')) continue;
      const bx = i % COLS;
      const by = Math.floor(i / COLS);
      const dx = Math.abs(cellX - bx);
      const dy = Math.abs(cellY - by);
      if (Math.max(dx, dy) <= 1) return true;
    }
    return false;
  }

  function isBuildAllowed(cellIdx) {
    return isWithinBuildRadiusOfEnd(cellIdx) || isWithinOneCellOfBuiltStructure(cellIdx);
  }

  const cells = grid.querySelectorAll('.grid-cell');
  cells.forEach((cell, cellIdx) => {
    cell.addEventListener('click', function() {
      if (cell.classList.contains('end-cell')) {
        window._showBuildAreaHint = !window._showBuildAreaHint;
        refreshBuildAreaVisualization();
        return;
      }
      if (cell.classList.contains('start-cell')) return;
      if (window.selectedTowerType === 'wall') {
        if (!isBuildAllowed(cellIdx)) return;
        // Bereits vorhandene Mauer bei erneutem Klick nicht loeschen
        if (cell.classList.contains('wall-cell')) {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        // Bebaute Zellen nicht mit Mauer ueberschreiben
        if (cell.classList.contains('turret-cell') || cell.classList.contains('cannon-cell') || cell.classList.contains('barracks-cell')) {
          window.selectedTurretIndex = window.selectedTurretIndex === cellIdx ? null : cellIdx;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        if (window.selectedTurretIndex === cellIdx) window.selectedTurretIndex = null;
        cell.classList.add('wall-cell');
        cell.textContent = 'W';
        window.refreshTurretRadiusDisplay?.();
        refreshBuildAreaVisualization();
      }
      // Turm
      else if (window.selectedTowerType === 'turret') {
        if (!isBuildAllowed(cellIdx)) return;
        // Bereits vorhandenen Turm bei erneutem Klick ein-/auswaehlen
        if (cell.classList.contains('turret-cell')) {
          window.selectedTurretIndex = window.selectedTurretIndex === cellIdx ? null : cellIdx;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        // Bebaute Zellen nicht mit Turm ueberschreiben
        if (cell.classList.contains('wall-cell') || cell.classList.contains('cannon-cell') || cell.classList.contains('barracks-cell')) {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        cell.classList.add('turret-cell');
        cell.textContent = 'X';
        window.selectedTurretIndex = cellIdx;
        window.refreshTurretRadiusDisplay?.();
        refreshBuildAreaVisualization();
      }
      // Kanonenturm
      else if (window.selectedTowerType === 'cannon') {
        if (!isBuildAllowed(cellIdx)) return;
        // Bereits vorhandene Kanone bei erneutem Klick ein-/auswaehlen
        if (cell.classList.contains('cannon-cell')) {
          window.selectedTurretIndex = window.selectedTurretIndex === cellIdx ? null : cellIdx;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        // Bebaute Zellen nicht mit Kanone ueberschreiben
        if (cell.classList.contains('wall-cell') || cell.classList.contains('turret-cell') || cell.classList.contains('barracks-cell')) {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        cell.classList.add('cannon-cell');
        cell.textContent = 'C';
        window.selectedTurretIndex = cellIdx;
        window.refreshTurretRadiusDisplay?.();
        refreshBuildAreaVisualization();
      }
      // Kaserne
      else if (window.selectedTowerType === 'barracks') {
        if (!isBuildAllowed(cellIdx)) return;
        if (cell.classList.contains('barracks-cell')) {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        if (cell.classList.contains('wall-cell') || cell.classList.contains('turret-cell') || cell.classList.contains('cannon-cell')) {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        cell.classList.add('barracks-cell');
        cell.textContent = 'B';
        window.selectedTurretIndex = null;
        window.refreshTurretRadiusDisplay?.();
        refreshBuildAreaVisualization();
      } else {
        // Ohne Bau-Auswahl: Turm auswählen, um den Radius zu sehen
        if (cell.classList.contains('turret-cell') || cell.classList.contains('cannon-cell')) {
          window.selectedTurretIndex = window.selectedTurretIndex === cellIdx ? null : cellIdx;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
        } else {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
        }
      }
    });
  });

  refreshBuildAreaVisualization();
}

function getAllowedEdgeIndices(cols, rows, edgeDist) {
  const allowed = [];
  for (let r = edgeDist; r < rows - edgeDist; r++) {
    for (let c = edgeDist; c < cols - edgeDist; c++) {
      allowed.push(r * cols + c);
    }
  }
  return allowed;
}

function getAllowedEdgeIndicesNearEdge(cols, rows, edgeDist) {
  const allowed = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (
        r < edgeDist || r >= rows - edgeDist ||
        c < edgeDist || c >= cols - edgeDist
      ) {
        allowed.push(r * cols + c);
      }
    }
  }
  return allowed;
}

function markRandomStartCell() {
  const cells = document.querySelectorAll('.grid-cell');
  const cols = 20;
  const rows = 15;
  const edgeDist = 2;
  const allowed = getAllowedEdgeIndicesNearEdge(cols, rows, edgeDist);
  const randomIndex = allowed[Math.floor(Math.random() * allowed.length)];
  const startCell = cells[randomIndex];
  startCell.classList.add('start-cell');
  startCell.textContent = 'S';
}

function markRandomEndCell() {
  const cells = document.querySelectorAll('.grid-cell');
  const startCell = document.querySelector('.start-cell');
  const cols = 20;
  const rows = 15;
  const edgeDist = 2;
  const allowed = getAllowedEdgeIndicesNearEdge(cols, rows, edgeDist);
  // Index der Startzelle ermitteln
  const startIndex = Array.from(cells).indexOf(startCell);
  // Nachbarzellen berechnen
  const neighbors = [
    startIndex - cols, // oben
    startIndex + cols, // unten
    startIndex - 1,    // links
    startIndex + 1,    // rechts
    startIndex - cols - 1, // oben links
    startIndex - cols + 1, // oben rechts
    startIndex + cols - 1, // unten links
    startIndex + cols + 1  // unten rechts
  ];
  // Erlaubte Zellen: nicht Startzelle, nicht Nachbar, mindestens 11 Zellen Manhattan-Abstand
  function manhattan(a, b) {
    const cols = 20;
    return Math.abs((a % cols) - (b % cols)) + Math.abs(Math.floor(a / cols) - Math.floor(b / cols));
  }
  const allowedFiltered = allowed.filter(idx => idx !== startIndex && !neighbors.includes(idx) && manhattan(idx, startIndex) >= 11);
  if (allowedFiltered.length === 0) return;
  const randomIndex = allowedFiltered[Math.floor(Math.random() * allowedFiltered.length)];
  const endCell = cells[randomIndex];
  endCell.textContent = 'E';
  endCell.classList.add('end-cell');
}

function init() {
  window.gameStarted = false;
  window._gameInitialized = false;
  window.noMoreWaves = false;
  window.startNextWave = undefined;
  createGrid();
  markRandomStartCell();
  markRandomEndCell();
}

// Damit init im globalen Scope verfügbar ist (für onload in index.html)
window.init = init;

/**
 * Berechnet und visualisiert den kürzesten A*-Pfad.
 * Gibt den Pfad als Array von Indizes zurück.
 */
async function findShortestAStarPath() {
  const cells = document.querySelectorAll('.grid-cell');
  const cols = 20;
  const rows = 15;
  const startCell = document.querySelector('.start-cell');
  const endCell = document.querySelector('.end-cell');
  if (!startCell || !endCell) return [];
  const startIdx = Array.from(cells).indexOf(startCell);
  const endIdx = Array.from(cells).indexOf(endCell);

  function idxToXY(idx) {
    return [idx % cols, Math.floor(idx / cols)];
  }
  function xyToIdx(x, y) {
    return y * cols + x;
  }
  function heuristic(a, b) {
    const [ax, ay] = idxToXY(a);
    const [bx, by] = idxToXY(b);
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  const wallSet = new Set();
  cells.forEach((cell, idx) => {
    if (cell.classList.contains('wall-cell')) wallSet.add(idx);
  });

  function colorCell(idx, cls) {
    if (idx === startIdx || idx === endIdx) return;
    cells[idx].classList.add(cls);
  }
  function clearColors() {
    for (const cell of cells) {
      cell.classList.remove('open-cell', 'closed-cell', 'path-cell');
    }
  }

  clearColors();

  for (let attempt = 0; attempt < 2; attempt++) {
    const allowThroughWalls = attempt === 1;
    const openSet = [startIdx];
    const cameFrom = {};
    const gScore = Array(cols * rows).fill(Infinity);
    gScore[startIdx] = 0;
    const fScore = Array(cols * rows).fill(Infinity);
    fScore[startIdx] = heuristic(startIdx, endIdx);
    const closedSet = new Set();

    while (openSet.length > 0) {
      let current = openSet.reduce((a, b) => fScore[a] < fScore[b] ? a : b);
      if (current === endIdx) {
        let path = [current];
        while (cameFrom[current] !== undefined) {
          current = cameFrom[current];
          path.push(current);
        }
        path.reverse();
        for (const idx of path) {
          if (idx !== startIdx && idx !== endIdx) cells[idx].classList.add('path-cell');
          await new Promise(r => setTimeout(r, 20));
        }
        return path;
      }
      openSet.splice(openSet.indexOf(current), 1);
      closedSet.add(current);
      colorCell(current, 'closed-cell');
      const [x, y] = idxToXY(current);
      const neighbors = [];
      if (x > 0) neighbors.push(xyToIdx(x - 1, y));
      if (x < cols - 1) neighbors.push(xyToIdx(x + 1, y));
      if (y > 0) neighbors.push(xyToIdx(x, y - 1));
      if (y < rows - 1) neighbors.push(xyToIdx(x, y + 1));
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor)) continue;
        if (!allowThroughWalls && wallSet.has(neighbor)) continue;
        const tentativeG = gScore[current] + 1;
        if (!openSet.includes(neighbor)) openSet.push(neighbor);
        else if (tentativeG >= gScore[neighbor]) continue;
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = gScore[neighbor] + heuristic(neighbor, endIdx);
        colorCell(neighbor, 'open-cell');
      }
      await new Promise(r => setTimeout(r, 10));
    }
  }
  alert('Kein Pfad gefunden!');
  return [];
}

// Start-Button Funktionalität


// --- Spielstart über Klick auf Startzelle (S) ---
function startGame() {
  if (window._gameInitialized) return;
  window._gameInitialized = true;
  window.gameStarted = true;
  window.stopPreStartRadiusPreview?.();
        // A*-Algorithmus jede Sekunde neu berechnen
        if (window._astarInterval) clearInterval(window._astarInterval);
        let isAStarRunning = false;
        window._astarInterval = setInterval(() => {
          if (isAStarRunning) return;
          isAStarRunning = true;
          aStarPath().finally(() => {
            isAStarRunning = false;
          });
        }, 1000);
      // Münzen-Anzeige initialisieren (optional für spätere Logik)
      const coinsElem = document.getElementById('coins-count');
      if (coinsElem) coinsElem.textContent = '50';
    // --- Bullet System ---
    let activeBullets = [];
    let activeHitShards = [];
    let activeHitBursts = [];
    let activeSoldiers = [];
    let TURRET_RANGE = 0;
    const BULLET_SPEED = 420;
    const TURRET_COOLDOWN = 650; // ms
    const CANNON_COOLDOWN = 1300; // ms
    const CANNON_AOE_RADIUS = 0.9; // in cell widths
    const BARRACKS_SPAWN_MS = 2000;
    let turretCooldowns = {};
    let barracksSpawnTimers = {};

  let currentWave = 1;
  const maxWaves = 11;
  const enemysPerWave = 11;
  const wavesElem = document.getElementById('waves-count');
  if (wavesElem) wavesElem.textContent = currentWave;

  // --- Shared Enemy Animation System ---
  let sharedEnemyCanvas = null;
  let sharedEnemyCtx = null;
  let activeEnemies = [];
  let latestEnemyAStarPath = [];
  let animationRunning = false;

  // Cache grid and cell sizes for performance
  let gridRect = null;
  let mainContentRect = null;
  let cellWidth = null;
  let cellHeight = null;
  function setupSharedCanvas() {
    if (sharedEnemyCanvas) return;
    const grid = document.getElementById('main-grid');
    gridRect = grid.getBoundingClientRect();
    mainContentRect = document.getElementById('main-content').getBoundingClientRect();
    cellWidth = grid.offsetWidth / 20;
    cellHeight = grid.offsetHeight / 15;
    sharedEnemyCanvas = document.createElement('canvas');
    sharedEnemyCanvas.id = 'enemy-canvas-shared';
    sharedEnemyCanvas.width = gridRect.width;
    sharedEnemyCanvas.height = gridRect.height;
    sharedEnemyCanvas.style.position = 'absolute';
    sharedEnemyCanvas.style.left = `${gridRect.left - mainContentRect.left}px`;
    sharedEnemyCanvas.style.top = `${gridRect.top - mainContentRect.top}px`;
    sharedEnemyCanvas.style.pointerEvents = 'none';
    sharedEnemyCanvas.style.zIndex = 30;
    sharedEnemyCanvas.style.background = 'transparent';
    document.getElementById('main-content').appendChild(sharedEnemyCanvas);
    sharedEnemyCtx = sharedEnemyCanvas.getContext('2d');
  }

  function removeSharedCanvas() {
    if (sharedEnemyCanvas && sharedEnemyCanvas.parentNode) {
      sharedEnemyCanvas.parentNode.removeChild(sharedEnemyCanvas);
    }
    sharedEnemyCanvas = null;
    sharedEnemyCtx = null;
  }

  function addEnemyToAnimation(enemyObj) {
    // Lebenspunkte für Balken
    enemyObj.hp = 3;
    enemyObj.maxHp = 3;
    enemyObj.type = enemyObj.type || 'circle';
    activeEnemies.push(enemyObj);
    if (!animationRunning) {
      animationRunning = true;
      requestAnimationFrame(enemyAnimationLoop);
    }
  }

  function drawEnemyShape(ctx, enemy, x, y) {
    const type = enemy.type || 'circle';
    ctx.beginPath();
    if (type === 'square') {
      const size = 18;
      ctx.rect(x - size / 2, y - size / 2, size, size);
    } else if (type === 'triangle') {
      const size = 12;
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.9, y + size * 0.8);
      ctx.lineTo(x - size * 0.9, y + size * 0.8);
      ctx.closePath();
    } else {
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
    }
  }

  function getEnemyTypeStyle(enemy) {
    const type = enemy.type || 'circle';
    if (type === 'square') {
      return {
        fill: '#ff9f1c',
        stroke: '#ffbf69',
        shadow: '#ff9f1c'
      };
    }
    if (type === 'triangle') {
      return {
        fill: '#8ac926',
        stroke: '#c5f27a',
        shadow: '#8ac926'
      };
    }
    return {
      fill: '#3a86ff',
      stroke: '#7fb4ff',
      shadow: '#3a86ff'
    };
  }

  function drawStarShape(ctx, x, y, outerRadius, innerRadius) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * (Math.PI / 5);
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function ensureRadiusAnimationRunning() {
    if (window.selectedTurretIndex === null || window.selectedTurretIndex === undefined) return;
    setupSharedCanvas();
    if (!animationRunning) {
      animationRunning = true;
      requestAnimationFrame(enemyAnimationLoop);
    }
  }
  window.ensureRadiusAnimationRunning = ensureRadiusAnimationRunning;

  function enemyAnimationLoop(timestamp) {
    if (!sharedEnemyCtx) return;
    sharedEnemyCtx.clearRect(0, 0, sharedEnemyCanvas.width, sharedEnemyCanvas.height);

    // --- BARRACKS SPAWN (soldiers via A*) ---
    function findAStarPathIndices(startIdx, endIdx) {
      const cells = getCells();
      if (startIdx < 0 || endIdx < 0) return [];

      function idxToXY(idx) {
        return [idx % COLS, Math.floor(idx / COLS)];
      }
      function xyToIdx(x, y) {
        return y * COLS + x;
      }
      function heuristic(a, b) {
        const [ax, ay] = idxToXY(a);
        const [bx, by] = idxToXY(b);
        return Math.abs(ax - bx) + Math.abs(ay - by);
      }

      const wallSet = new Set();
      cells.forEach((cell, idx) => {
        if (cell.classList.contains('wall-cell')) wallSet.add(idx);
      });

      for (let attempt = 0; attempt < 2; attempt++) {
        const allowThroughWalls = attempt === 1;
        const openSet = [startIdx];
        const cameFrom = {};
        const gScore = Array(COLS * ROWS).fill(Infinity);
        const fScore = Array(COLS * ROWS).fill(Infinity);
        const closedSet = new Set();
        gScore[startIdx] = 0;
        fScore[startIdx] = heuristic(startIdx, endIdx);

        while (openSet.length > 0) {
          let current = openSet.reduce((a, b) => (fScore[a] < fScore[b] ? a : b));
          if (current === endIdx) {
            let path = [current];
            while (cameFrom[current] !== undefined) {
              current = cameFrom[current];
              path.push(current);
            }
            path.reverse();
            return path;
          }

          openSet.splice(openSet.indexOf(current), 1);
          closedSet.add(current);

          const [x, y] = idxToXY(current);
          const neighbors = [];
          if (x > 0) neighbors.push(xyToIdx(x - 1, y));
          if (x < COLS - 1) neighbors.push(xyToIdx(x + 1, y));
          if (y > 0) neighbors.push(xyToIdx(x, y - 1));
          if (y < ROWS - 1) neighbors.push(xyToIdx(x, y + 1));

          for (const neighbor of neighbors) {
            if (closedSet.has(neighbor)) continue;
            if (!allowThroughWalls && wallSet.has(neighbor)) continue;
            const tentativeG = gScore[current] + 1;
            if (!openSet.includes(neighbor)) openSet.push(neighbor);
            else if (tentativeG >= gScore[neighbor]) continue;
            cameFrom[neighbor] = current;
            gScore[neighbor] = tentativeG;
            fScore[neighbor] = gScore[neighbor] + heuristic(neighbor, endIdx);
          }
        }
      }

      return [];
    }

    function spawnSoldierFromBarracks(barracksIdx) {
      const cells = getCells();
      const startCell = getStartCell();
      if (!startCell) return;
      const startIdx = Array.from(cells).indexOf(startCell);
      // Sterne folgen dem Gegnerpfad rueckwaerts (Ende -> Start).
      const reversedEnemyPath = latestEnemyAStarPath.length >= 2 ? latestEnemyAStarPath.slice().reverse() : [];
      let path = [];

      if (reversedEnemyPath.length >= 2) {
        // Bester Einstiegspunkt auf dem Gegnerpfad: danach direkt Richtung Start laufen.
        let bestConnectorPath = null;
        let bestJoinIdx = -1;
        let bestScore = Infinity;

        for (let i = 0; i < reversedEnemyPath.length; i++) {
          const joinCellIdx = reversedEnemyPath[i];
          const connectorPath = findAStarPathIndices(barracksIdx, joinCellIdx);
          if (!connectorPath || connectorPath.length < 2) continue;
          const score = connectorPath.length + (reversedEnemyPath.length - i);
          if (score < bestScore) {
            bestScore = score;
            bestJoinIdx = i;
            bestConnectorPath = connectorPath;
          }
        }

        if (!bestConnectorPath || bestJoinIdx < 0) return;
        path = bestConnectorPath.concat(reversedEnemyPath.slice(bestJoinIdx + 1));
      } else {
        // Fallback, falls noch kein Gegnerpfad bekannt ist.
        path = findAStarPathIndices(barracksIdx, startIdx);
      }

      if (!path || path.length < 2) return;

      const positions = path.map((idx) => {
        const xGrid = idx % COLS;
        const yGrid = Math.floor(idx / COLS);
        return {
          x: xGrid * cellWidth + cellWidth / 2,
          y: yGrid * cellHeight + cellHeight / 2
        };
      });

      activeSoldiers.push({
        positions,
        seg: 0,
        t: 0,
        lastTimestamp: null,
        speed: 130
      });
    }

    if (window.gameStarted) {
      const cellsNow = getCells();
      const aliveBarracks = new Set();
      for (let i = 0; i < cellsNow.length; i++) {
        if (!cellsNow[i].classList.contains('barracks-cell')) continue;
        aliveBarracks.add(String(i));
        if (!barracksSpawnTimers[i] || timestamp - barracksSpawnTimers[i] >= BARRACKS_SPAWN_MS) {
          spawnSoldierFromBarracks(i);
          barracksSpawnTimers[i] = timestamp;
        }
      }
      Object.keys(barracksSpawnTimers).forEach((key) => {
        if (!aliveBarracks.has(String(key))) delete barracksSpawnTimers[key];
      });
    }

    let stillActive = [];
    // --- ENEMY MOVEMENT & DRAW ---
    for (let enemy of activeEnemies) {
      if (!enemy.lastTimestamp) enemy.lastTimestamp = timestamp;
      let dt = (timestamp - enemy.lastTimestamp) / 1000;
      if (dt > 0.15) dt = 0.15;
      enemy.lastTimestamp = timestamp;
      // Segment start/end
      const p0 = enemy.positions[enemy.seg];
      const p1 = enemy.positions[enemy.seg + 1];
      if (!p0 || !p1) continue;
      // Interpolate
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const duration = dist / (enemy.speed * 1.08);
      enemy.t += dt;
      let progress = Math.min(enemy.t / duration, 1);
      // Linear interpolation for flying effect (no easing)
      const x = p0.x + dx * progress;
      const y = p0.y + dy * progress;
      // Draw enemy
      const enemyStyle = getEnemyTypeStyle(enemy);
      sharedEnemyCtx.save();
      drawEnemyShape(sharedEnemyCtx, enemy, x, y);
      sharedEnemyCtx.fillStyle = enemyStyle.fill;
      sharedEnemyCtx.fill();
      sharedEnemyCtx.strokeStyle = enemyStyle.stroke;
      sharedEnemyCtx.lineWidth = 2;
      sharedEnemyCtx.shadowColor = enemyStyle.shadow;
      sharedEnemyCtx.shadowBlur = 6;
      sharedEnemyCtx.stroke();
      // Lebensbalken
      const barW = 22, barH = 4;
      const hp = enemy.hp !== undefined ? enemy.hp : 1;
      const maxHp = enemy.maxHp !== undefined ? enemy.maxHp : 1;
      const percent = Math.max(0, Math.min(1, hp / maxHp));
      sharedEnemyCtx.save();
      sharedEnemyCtx.globalAlpha = 0.85;
      sharedEnemyCtx.fillStyle = '#222';
      sharedEnemyCtx.fillRect(x - barW/2, y - 17, barW, barH);
      sharedEnemyCtx.fillStyle = percent > 0.5 ? '#4caf50' : (percent > 0.2 ? '#ffc107' : '#e74c3c');
      sharedEnemyCtx.fillRect(x - barW/2, y - 17, barW * percent, barH);
      sharedEnemyCtx.strokeStyle = '#fff';
      sharedEnemyCtx.lineWidth = 0.7;
      sharedEnemyCtx.strokeRect(x - barW/2, y - 17, barW, barH);
      sharedEnemyCtx.restore();
      sharedEnemyCtx.restore();
      // Save current position for targeting
      enemy._drawX = x;
      enemy._drawY = y;
      // Continue or next segment
      if (progress < 1) {
        stillActive.push(enemy);
      } else if (enemy.seg < enemy.positions.length - 2) {
        enemy.seg++;
        enemy.t = 0;
        enemy.lastTimestamp = null;
        stillActive.push(enemy);
      } else {
        // End: update lives
        const livesElem = document.getElementById('lives-count');
        if (livesElem) {
          let lives = parseInt(livesElem.textContent, 10);
          if (!isNaN(lives) && lives > 0) {
            lives--;
            livesElem.textContent = lives;
          }
        }
      }
    }
    activeEnemies = stillActive;

    // --- SOLDIER MOVEMENT & DRAW ---
    const SOLDIER_HIT_RADIUS = 12;
    let stillSoldiers = [];
    for (const soldier of activeSoldiers) {
      if (!soldier.lastTimestamp) soldier.lastTimestamp = timestamp;
      let dt = (timestamp - soldier.lastTimestamp) / 1000;
      if (dt > 0.15) dt = 0.15;
      soldier.lastTimestamp = timestamp;

      const p0 = soldier.positions[soldier.seg];
      const p1 = soldier.positions[soldier.seg + 1];
      if (!p0 || !p1) continue;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const duration = dist / soldier.speed;
      soldier.t += dt;
      const progress = Math.min(soldier.t / duration, 1);
      const x = p0.x + dx * progress;
      const y = p0.y + dy * progress;

      let soldierHitEnemy = false;
      for (let k = activeEnemies.length - 1; k >= 0; k--) {
        const enemy = activeEnemies[k];
        if (enemy._drawX === undefined || enemy._drawY === undefined) continue;
        const hitDx = enemy._drawX - x;
        const hitDy = enemy._drawY - y;
        if (Math.sqrt(hitDx * hitDx + hitDy * hitDy) > SOLDIER_HIT_RADIUS) continue;

        enemy.hp = (enemy.hp !== undefined ? enemy.hp : 1) - 1;
        soldierHitEnemy = true;
        if (enemy.hp <= 0) {
          rewardCoinAtWorldPos(enemy._drawX, enemy._drawY);
          activeEnemies.splice(k, 1);
        }
        break;
      }

      // Stern loest sich beim Treffer sofort auf.
      if (soldierHitEnemy) continue;

      sharedEnemyCtx.save();
      drawStarShape(sharedEnemyCtx, x, y, 5.5, 2.6);
      sharedEnemyCtx.fillStyle = '#ffd700';
      sharedEnemyCtx.shadowColor = '#ffcc33';
      sharedEnemyCtx.shadowBlur = 8;
      sharedEnemyCtx.fill();
      sharedEnemyCtx.restore();

      if (progress < 1) {
        stillSoldiers.push(soldier);
      } else if (soldier.seg < soldier.positions.length - 2) {
        soldier.seg++;
        soldier.t = 0;
        soldier.lastTimestamp = null;
        stillSoldiers.push(soldier);
      }
    }
    activeSoldiers = stillSoldiers;

    // --- TURRET SHOOTING ---
    const cells = getCells();
    const selectedTurretIndex = window.selectedTurretIndex;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const isNormalTurret = cell.classList.contains('turret-cell');
      const isCannonTurret = cell.classList.contains('cannon-cell');
      if (!isNormalTurret && !isCannonTurret) continue;
      // Turm-Position (Mitte der Zelle)
      const col = i % 20;
      const row = Math.floor(i / 20);
      const tx = col * cellWidth + cellWidth / 2;
      const ty = row * cellHeight + cellHeight / 2;
      const cooldownMs = isCannonTurret ? CANNON_COOLDOWN : TURRET_COOLDOWN;

      // Schussradius nur fuer den ausgewaehlten Turm sichtbar machen
      if (i === selectedTurretIndex) {
        const rangePulse = 0.5 + 0.5 * Math.sin(timestamp * 0.005 + i);
        const sweepAngle = (timestamp * 0.0015 + i * 0.35) % (Math.PI * 2);
        const sweepWidth = 0.42;
        const edgeX = tx + Math.cos(sweepAngle) * TURRET_RANGE;
        const edgeY = ty + Math.sin(sweepAngle) * TURRET_RANGE;
        sharedEnemyCtx.save();

        // Soft base disc so the range area is always visible
        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.arc(tx, ty, TURRET_RANGE, 0, 2 * Math.PI);
        sharedEnemyCtx.fillStyle = `rgba(0, 255, 247, ${0.14 + rangePulse * 0.08})`;
        sharedEnemyCtx.fill();

        // Sonar sweep cone (radar scan)
        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.moveTo(tx, ty);
        sharedEnemyCtx.arc(tx, ty, TURRET_RANGE, sweepAngle - sweepWidth, sweepAngle + sweepWidth);
        sharedEnemyCtx.closePath();
        sharedEnemyCtx.fillStyle = `rgba(140, 255, 252, ${0.08 + rangePulse * 0.07})`;
        sharedEnemyCtx.shadowColor = '#8cfffC';
        sharedEnemyCtx.shadowBlur = 6 + rangePulse * 5;
        sharedEnemyCtx.fill();

        // Sweep head line + bright dot for stronger radar feel
        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.moveTo(tx, ty);
        sharedEnemyCtx.lineTo(edgeX, edgeY);
        sharedEnemyCtx.strokeStyle = `rgba(220, 255, 255, ${0.35 + rangePulse * 0.2})`;
        sharedEnemyCtx.lineWidth = 1.2;
        sharedEnemyCtx.setLineDash([]);
        sharedEnemyCtx.stroke();

        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.arc(edgeX, edgeY, 2.8, 0, 2 * Math.PI);
        sharedEnemyCtx.fillStyle = `rgba(230, 255, 255, ${0.45 + rangePulse * 0.2})`;
        sharedEnemyCtx.fill();

        // Outer ring on top
        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.arc(tx, ty, TURRET_RANGE, 0, 2 * Math.PI);
        sharedEnemyCtx.strokeStyle = `rgba(0, 255, 247, ${0.8 + rangePulse * 0.2})`;
        sharedEnemyCtx.lineWidth = 3;
        sharedEnemyCtx.setLineDash([10, 6]);
        sharedEnemyCtx.shadowColor = '#00fff7';
        sharedEnemyCtx.shadowBlur = 10 + rangePulse * 12;
        sharedEnemyCtx.stroke();

        // Inner highlight ring
        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.arc(tx, ty, TURRET_RANGE, 0, 2 * Math.PI);
        sharedEnemyCtx.strokeStyle = `rgba(255, 255, 255, ${0.5 + rangePulse * 0.25})`;
        sharedEnemyCtx.lineWidth = 1.2;
        sharedEnemyCtx.setLineDash([]);
        sharedEnemyCtx.stroke();
        sharedEnemyCtx.restore();
      }

      // Cooldown prüfen
      if (!turretCooldowns[i] || timestamp - turretCooldowns[i] > cooldownMs) {
        // Nächstes Ziel im Umkreis suchen
        let nearest = null;
        let minDist = TURRET_RANGE;
        for (const enemy of activeEnemies) {
          const dx = enemy._drawX - tx;
          const dy = enemy._drawY - ty;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < minDist) {
            minDist = d;
            nearest = enemy;
          }
        }
        if (nearest) {
          // Bullet erzeugen
          activeBullets.push({
            x: tx,
            y: ty,
            target: nearest,
            hit: false,
            isCannon: isCannonTurret,
            splashRadius: isCannonTurret ? CANNON_AOE_RADIUS * Math.max(cellWidth, cellHeight) : 0
          });
          turretCooldowns[i] = timestamp;
        }
      }
    }

    // --- BULLET MOVEMENT & DRAW ---
    function spawnHitShards(x, y, isCannon) {
      const count = isCannon ? 18 : 12;
      const baseSpeed = isCannon ? 6.6 : 4.9;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = baseSpeed * (0.55 + Math.random() * 0.9);
        activeHitShards.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: isCannon ? 4.2 : 3.1,
          life: 0,
          maxLife: isCannon ? 26 : 20,
          color: isCannon ? '#ffcf8a' : '#d8f7ff',
          rot: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.35
        });
      }

      activeHitBursts.push({
        x,
        y,
        life: 0,
        maxLife: isCannon ? 16 : 12,
        maxRadius: isCannon ? 26 : 17,
        color: isCannon ? '255, 159, 28' : '216, 247, 255'
      });
    }

    function rewardCoinAtWorldPos(x, y) {
      const coinsElem = document.getElementById('coins-count');
      if (coinsElem && sharedEnemyCanvas) {
        const rect = sharedEnemyCanvas.getBoundingClientRect();
        const startX = x + rect.left;
        const startY = y + rect.top;
        const coinsRect = coinsElem.getBoundingClientRect();
        const endX = coinsRect.left + coinsRect.width / 2;
        const endY = coinsRect.top + coinsRect.height / 2;
        const coin = document.createElement('span');
        coin.textContent = '🪙';
        coin.className = 'flying-coin';
        coin.style.left = startX + 'px';
        coin.style.top = startY + 'px';
        coin.style.transform = 'translate(0,0) scale(1)';
        document.body.appendChild(coin);
        requestAnimationFrame(() => {
          const dx = endX - startX;
          const dy = endY - startY;
          coin.style.transform = `translate(${dx}px,${dy}px) scale(0.7)`;
          coin.style.opacity = '0.2';
        });
        setTimeout(() => coin.remove(), 700);
      }
      if (coinsElem) {
        let coins = parseInt(coinsElem.textContent, 10) || 0;
        coinsElem.textContent = coins + 1;
      }
    }

    let stillBullets = [];
    for (let bullet of activeBullets) {
      if (!bullet.target || bullet.target._drawX === undefined) continue;
      const dx = bullet.target._drawX - bullet.x;
      const dy = bullet.target._drawY - bullet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const move = Math.min(BULLET_SPEED * (1/60), dist);
      if (dist < 14) {
        const impactX = bullet.target._drawX;
        const impactY = bullet.target._drawY;
        spawnHitShards(impactX, impactY, bullet.isCannon);
        if (bullet.isCannon) {
          // Kanone verursacht Flaechenschaden beim Einschlag
          for (const enemy of activeEnemies) {
            const edx = enemy._drawX - impactX;
            const edy = enemy._drawY - impactY;
            const eDist = Math.sqrt(edx * edx + edy * edy);
            if (eDist <= bullet.splashRadius) {
              enemy.hp = (enemy.hp !== undefined ? enemy.hp : 1) - 1;
            }
          }
          bullet.hit = true;
        } else {
          // Normaler Turm: Einzelschaden
          if (bullet.target.hp !== undefined) {
            bullet.target.hp--;
          } else {
            bullet.target.hp = 0;
          }
          bullet.hit = true;
        }
      } else {
        bullet.x += (dx / dist) * move;
        bullet.y += (dy / dist) * move;
      }
      // Draw bullet
      sharedEnemyCtx.save();
      sharedEnemyCtx.beginPath();
      sharedEnemyCtx.arc(bullet.x, bullet.y, 2.5, 0, 2 * Math.PI);
      sharedEnemyCtx.fillStyle = bullet.isCannon ? '#ff9f1c' : '#b22222';
      sharedEnemyCtx.shadowColor = bullet.isCannon ? '#ff9f1c' : '#b22222';
      sharedEnemyCtx.shadowBlur = 6;
      sharedEnemyCtx.fill();
      sharedEnemyCtx.restore();
      if (!bullet.hit) stillBullets.push(bullet);
      else {
        // Gegner mit 0 HP entfernen (inkl. Splash-Damage Faelle)
        for (let k = activeEnemies.length - 1; k >= 0; k--) {
          const enemy = activeEnemies[k];
          if ((enemy.hp !== undefined ? enemy.hp : 1) > 0) continue;
          rewardCoinAtWorldPos(enemy._drawX, enemy._drawY);
          activeEnemies.splice(k, 1);
        }
      }
    }
    activeBullets = stillBullets;

    // --- IMPACT BURST ANIMATION ---
    let stillBursts = [];
    for (const burst of activeHitBursts) {
      burst.life++;
      if (burst.life > burst.maxLife) continue;
      const t = burst.life / burst.maxLife;
      const radius = burst.maxRadius * t;
      const alpha = 0.95 * (1 - t);

      sharedEnemyCtx.save();
      sharedEnemyCtx.beginPath();
      sharedEnemyCtx.arc(burst.x, burst.y, radius, 0, 2 * Math.PI);
      sharedEnemyCtx.strokeStyle = `rgba(${burst.color}, ${alpha})`;
      sharedEnemyCtx.lineWidth = 3 - 1.5 * t;
      sharedEnemyCtx.shadowColor = `rgba(${burst.color}, ${Math.min(1, alpha + 0.2)})`;
      sharedEnemyCtx.shadowBlur = 9;
      sharedEnemyCtx.stroke();
      sharedEnemyCtx.restore();

      stillBursts.push(burst);
    }
    activeHitBursts = stillBursts;

    // --- HIT SHARD ANIMATION ---
    let stillShards = [];
    for (const shard of activeHitShards) {
      shard.life++;
      if (shard.life > shard.maxLife) continue;
      shard.x += shard.vx;
      shard.y += shard.vy;
      shard.vx *= 0.9;
      shard.vy *= 0.9;
      shard.rot += shard.rotSpeed;
      const alpha = 1 - shard.life / shard.maxLife;

      sharedEnemyCtx.save();
      sharedEnemyCtx.translate(shard.x, shard.y);
      sharedEnemyCtx.rotate(shard.rot);
      sharedEnemyCtx.globalAlpha = alpha;
      sharedEnemyCtx.fillStyle = shard.color;
      sharedEnemyCtx.shadowColor = shard.color;
      sharedEnemyCtx.shadowBlur = 4;
      sharedEnemyCtx.fillRect(-shard.size * 0.5, -shard.size * 0.2, shard.size, shard.size * 0.4);
      sharedEnemyCtx.restore();

      stillShards.push(shard);
    }
    activeHitShards = stillShards;

    const keepForRadius = window.selectedTurretIndex !== null && window.selectedTurretIndex !== undefined;
    const keepForBarracks = window.gameStarted && Array.from(getCells()).some(c => c.classList.contains('barracks-cell'));
    if (activeEnemies.length > 0 || keepForRadius || activeHitShards.length > 0 || activeHitBursts.length > 0 || activeSoldiers.length > 0 || keepForBarracks) {
      requestAnimationFrame(enemyAnimationLoop);
    } else {
      animationRunning = false;
      removeSharedCanvas();
    }
  }

  async function startWave(waveNum) {
    if (wavesElem) wavesElem.textContent = waveNum;
    const path = await findShortestAStarPath();
    if (!path || path.length < 2) {
      console.warn('Kein gültiger Pfad für diese Welle!');
      return;
    }
    latestEnemyAStarPath = path.slice();
    setupSharedCanvas();
    // Nach Canvas-Setup: Range korrekt setzen
    TURRET_RANGE = 4.5 * Math.max(cellWidth, cellHeight);
    const enemyTypes = ['circle', 'square', 'triangle'];
    const waveEnemyType = enemyTypes[(waveNum - 1) % enemyTypes.length];
    // Use cached cellWidth/cellHeight for performance
    for (let i = 0; i < enemysPerWave; i++) {
      // Calculate positions for this enemy
      const positions = path.map((idx, idxPos) => {
        const xGrid = idx % 20;
        const yGrid = Math.floor(idx / 20);
        let x = xGrid * cellWidth + cellWidth / 2;
        let y = yGrid * cellHeight + cellHeight / 2;
        if (idxPos === 0 && enemysPerWave > 1 && path.length > 1) {
          const nextIdx = path[1];
          const nxGrid = nextIdx % 20;
          const nyGrid = Math.floor(nextIdx / 20);
          const nx = nxGrid * cellWidth + cellWidth / 2;
          const ny = nyGrid * cellHeight + cellHeight / 2;
          const dx = nx - x;
          const dy = ny - y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const offset = (i - enemysPerWave / 2) * 8;
          x += (dx / len) * offset;
          y += (dy / len) * offset;
        }
        return { x, y };
      });
      // Add enemy to shared animation
      addEnemyToAnimation({
        positions,
        seg: 0,
        t: 0,
        lastTimestamp: null,
        speed: 180,
        type: waveEnemyType
      });
      await new Promise(r => setTimeout(r, 200));
    }
  }

  let nextWaveToStart = 1;
  let waveStarting = false;
  window.startNextWave = async () => {
    if (waveStarting || window.noMoreWaves) return;
    if (nextWaveToStart > maxWaves) {
      if (wavesElem) wavesElem.textContent = 'Fertig';
      window.noMoreWaves = true;
      return;
    }
    waveStarting = true;
    await startWave(nextWaveToStart);
    nextWaveToStart++;
    waveStarting = false;
    if (nextWaveToStart > maxWaves) {
      if (wavesElem) wavesElem.textContent = 'Fertig';
      window.noMoreWaves = true;
    }
  };
}

// Startzelle (S) klickbar machen
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const cells = document.querySelectorAll('.grid-cell');
    for (const cell of cells) {
      if (cell.classList.contains('start-cell')) {
        cell.classList.add('pulse');
        const mouseEnter = () => { cell.style.transform = 'scale(1.15)'; };
        const mouseLeave = () => { cell.style.transform = ''; };
        const clickHandler = async () => {
          if (window.noMoreWaves) return;
          cell.style.transform = 'scale(1.3)';
          setTimeout(async () => {
            if (!window._gameInitialized) {
              startGame();
            }
            await window.startNextWave?.();
            cell.style.transform = '';
          }, 350);
        };
        cell.addEventListener('mouseenter', mouseEnter);
        cell.addEventListener('mouseleave', mouseLeave);
        cell.addEventListener('click', clickHandler);
      }
    }
  }, 100);
});

