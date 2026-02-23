// A*-Algorithmus für kürzesten Pfad mit Visualisierung
async function aStarPath() {
  const cells = document.querySelectorAll('.grid-cell');
  const cols = 20;
  const rows = 15;
  const startCell = document.querySelector('.start-cell');
  const endCell = document.querySelector('.end-cell');
  if (!startCell || !endCell) return;
  const startIdx = Array.from(cells).indexOf(startCell);
  const endIdx = Array.from(cells).indexOf(endCell);

  // Hilfsfunktionen
  function idxToXY(idx) {
    return [idx % cols, Math.floor(idx / cols)];
  }
  function xyToIdx(x, y) {
    return y * cols + x;
  }
  function heuristic(a, b) {
    const [ax, ay] = idxToXY(a);
    const [bx, by] = idxToXY(b);
    return Math.abs(ax - bx) + Math.abs(ay - by); // Manhattan
  }

  // A*
  const openSet = [startIdx];
  const cameFrom = {};
  const gScore = Array(cols * rows).fill(Infinity);
  gScore[startIdx] = 0;
  const fScore = Array(cols * rows).fill(Infinity);
  fScore[startIdx] = heuristic(startIdx, endIdx);
  const closedSet = new Set();

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
      for (const idx of path) {
        if (idx !== startIdx && idx !== endIdx) cells[idx].classList.add('path-cell');
        await new Promise(r => setTimeout(r, 20));
      }
      return;
    }
    // Aus openSet entfernen, zu closedSet hinzufügen
    openSet.splice(openSet.indexOf(current), 1);
    closedSet.add(current);
    colorCell(current, 'closed-cell');
    // Nachbarn
    const [x, y] = idxToXY(current);
    const neighbors = [];
    if (x > 0) neighbors.push(xyToIdx(x - 1, y));
    if (x < cols - 1) neighbors.push(xyToIdx(x + 1, y));
    if (y > 0) neighbors.push(xyToIdx(x, y - 1));
    if (y < rows - 1) neighbors.push(xyToIdx(x, y + 1));
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor)) continue;
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
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.id = 'main-grid';

  for (let i = 0; i < 300; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.id = `cell-${i}`;
    grid.appendChild(cell);
  }
  mainContent.appendChild(grid);
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
  createGrid();
  markRandomStartCell();
  markRandomEndCell();
}