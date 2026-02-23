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
      if (wallSet.has(neighbor)) continue; // Mauern überspringen
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
    // Klick-Handler für Mauern
    cell.addEventListener('click', function() {
      if (!cell.classList.contains('start-cell') && !cell.classList.contains('end-cell')) {
        cell.classList.toggle('wall-cell');
        if (cell.classList.contains('wall-cell')) {
          cell.textContent = 'W';
        } else {
          cell.textContent = '';
        }
      }
    });
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

  const openSet = [startIdx];
  const cameFrom = {};
  const gScore = Array(cols * rows).fill(Infinity);
  gScore[startIdx] = 0;
  const fScore = Array(cols * rows).fill(Infinity);
  fScore[startIdx] = heuristic(startIdx, endIdx);
  const closedSet = new Set();
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
      if (wallSet.has(neighbor)) continue;
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
  alert('Kein Pfad gefunden!');
  return [];
}

// Start-Button Funktionalität
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', async function() {
      // Warte bis DOM aktualisiert ist
      setTimeout(async () => {
        // Kürzesten Pfad berechnen
        const path = await findShortestAStarPath();
        if (!path || path.length === 0) return;
        // Canvas erzeugen, falls nicht vorhanden
        let canvas = document.getElementById('enemy-canvas');
        if (canvas) canvas.remove();
        canvas = document.createElement('canvas');
        canvas.id = 'enemy-canvas';
        // Canvas über das Grid legen (Größe und Position dynamisch setzen)
        const grid = document.getElementById('main-grid');
        let gridRect = grid.getBoundingClientRect();
        let contentRect = document.getElementById('main-content').getBoundingClientRect();
        canvas.width = grid.offsetWidth;
        canvas.height = grid.offsetHeight;
        canvas.style.left = (grid.offsetLeft) + 'px';
        canvas.style.top = (grid.offsetTop) + 'px';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '20';
        document.getElementById('main-content').appendChild(canvas);
        const ctx = canvas.getContext('2d');
        // Pfad in Pixelkoordinaten umwandeln (relativ zum Grid)
        const positions = path.map(idx => {
          const x = (idx % 20) * 30 + 15;
          const y = Math.floor(idx / 20) * 30 + 15;
          return { x, y };
        });
        let t = 0;
        let seg = 0;
        function animate() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Segment-Start und -Ende
          const p0 = positions[seg];
          const p1 = positions[seg + 1];
          // Interpolieren
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const duration = dist / 100 * 1000; // 100px/s
          const progress = Math.min(t / duration, 1);
          const x = p0.x + dx * progress;
          const y = p0.y + dy * progress;
          // Kreis zeichnen
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, 2 * Math.PI);
          ctx.fillStyle = '#7ec6e6';
          ctx.strokeStyle = '#3e5c2b';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          if (progress < 1) {
            t += 16;
            requestAnimationFrame(animate);
          } else if (seg < positions.length - 2) {
            seg++;
            t = 0;
            requestAnimationFrame(animate);
          }
        }
        animate();
      }, 100);
    });
  }

