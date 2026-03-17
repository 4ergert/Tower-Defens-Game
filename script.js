// --- Constants & Utilities ---
const COLS = 20;
const ROWS = 15;
const getCells = () => document.querySelectorAll('.grid-cell');
const getGrid = () => document.getElementById('main-grid');
const getMainContent = () => document.getElementById('main-content');
const getStartCell = () => document.querySelector('.start-cell');
const getEndCell = () => document.querySelector('.end-cell');
const TESLA_BASE_RANGE_CELLS = 3.5;
const TESLA_BASE_CHAIN_CELLS = 2.2;
const TESLA_BASE_COOLDOWN_MS = 800;
const BUILDABLE_TOWER_TYPES = ['wall', 'turret', 'cannon', 'barracks', 'tesla'];
const STRUCTURE_CELL_CLASSES = ['wall-cell', 'turret-cell', 'cannon-cell', 'barracks-cell', 'tesla-cell'];
const RANGE_TOWER_CELL_CLASSES = ['turret-cell', 'cannon-cell', 'tesla-cell'];
const BUILD_ZONE_SOURCE_CLASSES = ['turret-cell', 'cannon-cell', 'barracks-cell', 'tesla-cell'];

const BUILD_COSTS = {
  wall: 4,
  turret: 12,
  cannon: 20,
  barracks: 18,
  tesla: 24
};

const getBuildCost = (towerType) => BUILD_COSTS[towerType] || 0;

function hasAnyClass(element, classNames) {
  return classNames.some((className) => element.classList.contains(className));
}

function hasBlockingStructure(cell, allowedClasses = []) {
  return STRUCTURE_CELL_CLASSES.some(
    (className) => !allowedClasses.includes(className) && cell.classList.contains(className)
  );
}

function createDefaultBarracksUpgrades() {
  return {
    movementSpeed: 0,
    spawnSpeed: 0,
    strength: 0,
    armor: 0
  };
}

function createDefaultTeslaUpgrades() {
  return {
    range: 0,
    strength: 0,
    speed: 0
  };
}

function getBarracksUpgradeState(cellIdx) {
  if (!window.barracksUpgradesByCell) {
    window.barracksUpgradesByCell = {};
  }
  const key = String(cellIdx ?? -1);
  if (!window.barracksUpgradesByCell[key]) {
    window.barracksUpgradesByCell[key] = createDefaultBarracksUpgrades();
  }
  return window.barracksUpgradesByCell[key];
}

function getTeslaUpgradeState(cellIdx) {
  if (!window.teslaUpgradesByCell) {
    window.teslaUpgradesByCell = {};
  }
  const key = String(cellIdx ?? -1);
  if (!window.teslaUpgradesByCell[key]) {
    window.teslaUpgradesByCell[key] = createDefaultTeslaUpgrades();
  }
  return window.teslaUpgradesByCell[key];
}

function getCoinsValue() {
  const coinsElem = document.getElementById('coins-count');
  if (!coinsElem) return 0;
  return parseInt(coinsElem.textContent, 10) || 0;
}

function setCoinsValue(value) {
  const coinsElem = document.getElementById('coins-count');
  if (!coinsElem) return;
  coinsElem.textContent = String(Math.max(0, Math.floor(value)));
  window.updateTowerMenuCostLabels?.();
}

function spendCoins(amount) {
  const coins = getCoinsValue();
  if (coins < amount) return false;
  setCoinsValue(coins - amount);
  return true;
}

function getBarracksUpgradeCost(statKey, level) {
  const baseCosts = {
    movementSpeed: 10,
    spawnSpeed: 14,
    strength: 16,
    armor: 12
  };
  const base = baseCosts[statKey] || 10;
  return Math.floor(base + level * (base * 0.7 + 4));
}

function getTeslaUpgradeCost(statKey, level) {
  const baseCosts = {
    range: 15,
    strength: 20,
    speed: 17
  };
  const base = baseCosts[statKey] || 15;
  return Math.floor(base + level * (base * 0.75 + 4));
}

function getBarracksRuntimeStats(cellIdx) {
  const upgrades = getBarracksUpgradeState(cellIdx);
  return {
    movementSpeed: 130 * (1 + upgrades.movementSpeed * 0.12),
    spawnIntervalMs: Math.max(450, 2000 * (1 - upgrades.spawnSpeed * 0.1)),
    strengthDamage: 1 + upgrades.strength * 0.45,
    armorReduction: Math.min(0.75, upgrades.armor * 0.1),
    maxHp: 3 + upgrades.armor * 0.35
  };
}

function getTeslaRuntimeStats(cellIdx, baseRange = 0, baseChainRange = 0, baseCooldownMs = TESLA_BASE_COOLDOWN_MS) {
  const upgrades = getTeslaUpgradeState(cellIdx);
  return {
    range: baseRange * (1 + upgrades.range * 0.12),
    chainRange: baseChainRange * (1 + upgrades.range * 0.08),
    damage: 1 + upgrades.strength * 0.6,
    cooldownMs: Math.max(180, baseCooldownMs * (1 - upgrades.speed * 0.08))
  };
}

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

  const cellWidth = grid.offsetWidth / COLS;
  const cellHeight = grid.offsetHeight / ROWS;
  const points = path.map((idx) => ({
    x: (idx % COLS) * cellWidth + cellWidth / 2,
    y: Math.floor(idx / COLS) * cellHeight + cellHeight / 2
  }));

  let progress = 0;
  const speed = 0.015;
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
    const maxIdx = Math.floor(progress * (points.length - 1));
    for (let i = 1; i <= maxIdx && i < points.length; i++) {
      drawDot(points[i].x, points[i].y);
    }
    ctx.restore();

    progress += speed;
    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    ctx.save();
    ctx.fillStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 10;
    for (let i = 0; i < points.length; i++) {
      drawDot(points[i].x, points[i].y);
    }
    ctx.restore();
  }

  animate();
}

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
  getBarracksUpgradeState(-1);
  getTeslaUpgradeState(-1);

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

  const waveCountdown = document.createElement('div');
  waveCountdown.id = 'wave-countdown-overlay';
  waveCountdown.className = 'wave-countdown-overlay hidden';
  grid.appendChild(waveCountdown);

  // --- Tower Selection Menu ---
  const towerMenu = document.createElement('div');
  towerMenu.id = 'tower-menu';
  towerMenu.innerHTML = `
    <button class="tower-select-btn" data-tower="wall" data-label="Mauer">Mauer</button>
    <button class="tower-select-btn" data-tower="turret" data-label="Turm">Turm</button>
    <button class="tower-select-btn" data-tower="cannon" data-label="Kanone">Kanone</button>
    <button class="tower-select-btn" data-tower="barracks" data-label="Kaserne">Kaserne</button>
    <button class="tower-select-btn" data-tower="tesla" data-label="Tesla">Tesla</button>
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
      .grid-cell.build-allowed-cell:not(.start-cell):not(.end-cell):not(.wall-cell):not(.turret-cell):not(.cannon-cell):not(.barracks-cell):not(.tesla-cell) {
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
    if (!selectedCell || !hasAnyClass(selectedCell, RANGE_TOWER_CELL_CLASSES)) {
      preStartRadiusAnimating = false;
      removePreStartRadiusCanvas();
      return;
    }

    const col = selectedIdx % COLS;
    const row = Math.floor(selectedIdx / COLS);
    const cellW = grid.offsetWidth / COLS;
    const cellH = grid.offsetHeight / ROWS;
    const isTeslaSelected = selectedCell.classList.contains('tesla-cell');
    const baseRange = (isTeslaSelected ? TESLA_BASE_RANGE_CELLS : 4.5) * Math.max(cellW, cellH);
    const teslaPreviewStats = isTeslaSelected
      ? getTeslaRuntimeStats(
        selectedIdx,
        baseRange,
        baseRange * (TESLA_BASE_CHAIN_CELLS / TESLA_BASE_RANGE_CELLS),
        TESLA_BASE_COOLDOWN_MS
      )
      : null;
    const range = teslaPreviewStats ? teslaPreviewStats.range : baseRange;
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
    const showByTool = BUILDABLE_TOWER_TYPES.includes(window.selectedTowerType);
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

  function getCellByIndex(cellIdx) {
    if (cellIdx === null || cellIdx === undefined) return null;
    const cellsNow = getCells();
    return cellsNow[cellIdx] || null;
  }

  function placeUpgradePanelNearCell(menuId, panelSelector, cellIdx) {
    const menu = document.getElementById(menuId);
    if (!menu || menu.classList.contains('hidden')) return;
    const panel = menu.querySelector(panelSelector);
    const cell = getCellByIndex(cellIdx);
    if (!(panel instanceof HTMLElement) || !cell) return;

    const margin = 12;
    const minViewportPadding = 8;
    const cellRect = cell.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    let left = cellRect.right + margin;
    let top = cellRect.top + (cellRect.height - panelRect.height) / 2;

    if (left + panelRect.width > window.innerWidth - minViewportPadding) {
      left = cellRect.left - panelRect.width - margin;
    }
    if (left < minViewportPadding) {
      left = Math.max(minViewportPadding, Math.min(window.innerWidth - panelRect.width - minViewportPadding, cellRect.right + margin));
    }

    if (top + panelRect.height > window.innerHeight - minViewportPadding) {
      top = window.innerHeight - panelRect.height - minViewportPadding;
    }
    if (top < minViewportPadding) {
      top = minViewportPadding;
    }

    const towerMenu = document.getElementById('tower-menu');
    if (towerMenu) {
      const towerMenuRect = towerMenu.getBoundingClientRect();
      const overlapsTowerMenu = !(
        left + panelRect.width <= towerMenuRect.left ||
        left >= towerMenuRect.right ||
        top + panelRect.height <= towerMenuRect.top ||
        top >= towerMenuRect.bottom
      );

      if (overlapsTowerMenu) {
        const leftCandidate = cellRect.left - panelRect.width - margin;
        if (leftCandidate >= minViewportPadding) {
          left = leftCandidate;
        } else {
          const aboveCandidate = cellRect.top - panelRect.height - margin;
          const belowCandidate = cellRect.bottom + margin;
          if (aboveCandidate >= minViewportPadding) {
            top = aboveCandidate;
          } else {
            top = Math.min(
              belowCandidate,
              window.innerHeight - panelRect.height - minViewportPadding
            );
          }
        }
      }
    }

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }

  function closeUpgradeMenus() {
    ['barracks-upgrade-overlay', 'tesla-upgrade-overlay'].forEach((menuId) => {
      document.getElementById(menuId)?.classList.add('hidden');
    });
  }

  function markUpgradeMenuJustOpened() {
    window._upgradeMenuJustOpenedUntil = Date.now() + 120;
  }

  function refreshOpenUpgradeMenuPositions() {
    if (window.selectedBarracksIndex !== undefined) {
      placeUpgradePanelNearCell('barracks-upgrade-overlay', '.barracks-upgrade-panel', window.selectedBarracksIndex);
    }
    if (window.selectedTeslaIndex !== undefined) {
      placeUpgradePanelNearCell('tesla-upgrade-overlay', '.tesla-upgrade-panel', window.selectedTeslaIndex);
    }
  }

  if (!window._upgradeMenuPositionHandlersBound) {
    window._upgradeMenuPositionHandlersBound = true;
    window.addEventListener('resize', refreshOpenUpgradeMenuPositions);
    window.addEventListener('scroll', refreshOpenUpgradeMenuPositions, true);
  }

  if (!window._upgradeMenuOutsideClickBound) {
    window._upgradeMenuOutsideClickBound = true;
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      if ((window._upgradeMenuJustOpenedUntil || 0) > Date.now()) {
        return;
      }

      const barracksMenu = document.getElementById('barracks-upgrade-overlay');
      const teslaMenu = document.getElementById('tesla-upgrade-overlay');
      const barracksOpen = !!barracksMenu && !barracksMenu.classList.contains('hidden');
      const teslaOpen = !!teslaMenu && !teslaMenu.classList.contains('hidden');
      if (!barracksOpen && !teslaOpen) return;

      if (target.closest('.barracks-upgrade-panel') || target.closest('.tesla-upgrade-panel')) {
        return;
      }

      // Klick auf die Turmzelle selbst darf das frisch geoeffnete Menu nicht sofort wieder schliessen.
      if (target.closest('.barracks-cell') || target.closest('.tesla-cell')) {
        return;
      }

      closeUpgradeMenus();
    });
  }

  function ensureBarracksUpgradeMenu() {
    let menu = document.getElementById('barracks-upgrade-overlay');
    if (menu) return menu;

    menu = document.createElement('div');
    menu.id = 'barracks-upgrade-overlay';
    menu.className = 'barracks-upgrade-overlay hidden';
    menu.innerHTML = `
      <div class="barracks-upgrade-backdrop" data-close="1"></div>
      <div class="barracks-upgrade-panel" role="dialog" aria-modal="true" aria-label="Kasernen-Upgrades">
        <div class="barracks-upgrade-header">
          <h3 id="barracks-upgrade-title">Kaserne Upgrades</h3>
          <button type="button" class="barracks-upgrade-close" data-close="1">X</button>
        </div>
        <div class="barracks-upgrade-row" data-stat="movementSpeed">
          <div class="barracks-upgrade-name">Bewegungsgeschwindigkeit</div>
          <div class="barracks-upgrade-meta">
            <span class="barracks-level"></span>
            <span class="barracks-cost"></span>
          </div>
          <button type="button" class="barracks-upgrade-btn" data-upgrade="movementSpeed">Upgrade</button>
        </div>
        <div class="barracks-upgrade-row" data-stat="spawnSpeed">
          <div class="barracks-upgrade-name">Erzeugungsgeschwindigkeit</div>
          <div class="barracks-upgrade-meta">
            <span class="barracks-level"></span>
            <span class="barracks-cost"></span>
          </div>
          <button type="button" class="barracks-upgrade-btn" data-upgrade="spawnSpeed">Upgrade</button>
        </div>
        <div class="barracks-upgrade-row" data-stat="strength">
          <div class="barracks-upgrade-name">Staerke</div>
          <div class="barracks-upgrade-meta">
            <span class="barracks-level"></span>
            <span class="barracks-cost"></span>
          </div>
          <button type="button" class="barracks-upgrade-btn" data-upgrade="strength">Upgrade</button>
        </div>
        <div class="barracks-upgrade-row" data-stat="armor">
          <div class="barracks-upgrade-name">Panzerung</div>
          <div class="barracks-upgrade-meta">
            <span class="barracks-level"></span>
            <span class="barracks-cost"></span>
          </div>
          <button type="button" class="barracks-upgrade-btn" data-upgrade="armor">Upgrade</button>
        </div>
      </div>
    `;

    menu.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.close === '1') {
        menu.classList.add('hidden');
        return;
      }

      const statKey = target.dataset.upgrade;
      if (!statKey) return;

      const upgrades = getBarracksUpgradeState(window.selectedBarracksIndex);
      const currentLevel = upgrades[statKey] || 0;
      if (currentLevel >= 10) return;

      const cost = getBarracksUpgradeCost(statKey, currentLevel);
      if (!spendCoins(cost)) return;

      upgrades[statKey] = currentLevel + 1;
      renderBarracksUpgradeMenu(window.selectedBarracksIndex);
    });

    document.body.appendChild(menu);
    return menu;
  }

  function renderBarracksUpgradeMenu(cellIdx) {
    const menu = ensureBarracksUpgradeMenu();
    const upgrades = getBarracksUpgradeState(cellIdx);
    const coins = getCoinsValue();

    const title = menu.querySelector('#barracks-upgrade-title');
    if (title) title.textContent = `Kaserne #${cellIdx + 1} Upgrades`;

    const rows = menu.querySelectorAll('.barracks-upgrade-row');
    rows.forEach((row) => {
      const statKey = row.getAttribute('data-stat');
      if (!statKey) return;
      const level = upgrades[statKey] || 0;
      const levelElem = row.querySelector('.barracks-level');
      const costElem = row.querySelector('.barracks-cost');
      const btn = row.querySelector('.barracks-upgrade-btn');
      const maxed = level >= 10;
      const cost = getBarracksUpgradeCost(statKey, level);

      if (levelElem) levelElem.textContent = `Lv ${level}/10`;
      if (costElem) costElem.textContent = maxed ? 'MAX' : `${cost} Coins`;
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = maxed || coins < cost;
      }
    });
  }

  function openBarracksUpgradeMenu(cellIdx) {
    window.selectedBarracksIndex = cellIdx;
    renderBarracksUpgradeMenu(cellIdx);
    const menu = ensureBarracksUpgradeMenu();
    menu.classList.remove('hidden');
    markUpgradeMenuJustOpened();
    placeUpgradePanelNearCell('barracks-upgrade-overlay', '.barracks-upgrade-panel', cellIdx);
  }

  function ensureTeslaUpgradeMenu() {
    let menu = document.getElementById('tesla-upgrade-overlay');
    if (menu) return menu;

    menu = document.createElement('div');
    menu.id = 'tesla-upgrade-overlay';
    menu.className = 'tesla-upgrade-overlay hidden';
    menu.innerHTML = `
      <div class="tesla-upgrade-backdrop" data-close="1"></div>
      <div class="tesla-upgrade-panel" role="dialog" aria-modal="true" aria-label="Tesla-Upgrades">
        <div class="tesla-upgrade-header">
          <h3 id="tesla-upgrade-title">Tesla Upgrades</h3>
          <button type="button" class="tesla-upgrade-close" data-close="1">X</button>
        </div>
        <div class="tesla-upgrade-row" data-stat="range">
          <div class="tesla-upgrade-name">Reichweite</div>
          <div class="tesla-upgrade-meta">
            <span class="tesla-level"></span>
            <span class="tesla-cost"></span>
          </div>
          <button type="button" class="tesla-upgrade-btn" data-upgrade="range">Upgrade</button>
        </div>
        <div class="tesla-upgrade-row" data-stat="strength">
          <div class="tesla-upgrade-name">Staerke</div>
          <div class="tesla-upgrade-meta">
            <span class="tesla-level"></span>
            <span class="tesla-cost"></span>
          </div>
          <button type="button" class="tesla-upgrade-btn" data-upgrade="strength">Upgrade</button>
        </div>
        <div class="tesla-upgrade-row" data-stat="speed">
          <div class="tesla-upgrade-name">Geschwindigkeit</div>
          <div class="tesla-upgrade-meta">
            <span class="tesla-level"></span>
            <span class="tesla-cost"></span>
          </div>
          <button type="button" class="tesla-upgrade-btn" data-upgrade="speed">Upgrade</button>
        </div>
      </div>
    `;

    menu.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.close === '1') {
        menu.classList.add('hidden');
        return;
      }

      const statKey = target.dataset.upgrade;
      if (!statKey) return;

      const upgrades = getTeslaUpgradeState(window.selectedTeslaIndex);
      const currentLevel = upgrades[statKey] || 0;
      if (currentLevel >= 10) return;

      const cost = getTeslaUpgradeCost(statKey, currentLevel);
      if (!spendCoins(cost)) return;

      upgrades[statKey] = currentLevel + 1;
      renderTeslaUpgradeMenu(window.selectedTeslaIndex);
      window.selectedTurretIndex = window.selectedTeslaIndex;
      window.refreshTurretRadiusDisplay?.();
    });

    document.body.appendChild(menu);
    return menu;
  }

  function renderTeslaUpgradeMenu(cellIdx) {
    const menu = ensureTeslaUpgradeMenu();
    const upgrades = getTeslaUpgradeState(cellIdx);
    const coins = getCoinsValue();

    const title = menu.querySelector('#tesla-upgrade-title');
    if (title) title.textContent = `Tesla #${cellIdx + 1} Upgrades`;

    const rows = menu.querySelectorAll('.tesla-upgrade-row');
    rows.forEach((row) => {
      const statKey = row.getAttribute('data-stat');
      if (!statKey) return;
      const level = upgrades[statKey] || 0;
      const levelElem = row.querySelector('.tesla-level');
      const costElem = row.querySelector('.tesla-cost');
      const btn = row.querySelector('.tesla-upgrade-btn');
      const maxed = level >= 10;
      const cost = getTeslaUpgradeCost(statKey, level);

      if (levelElem) levelElem.textContent = `Lv ${level}/10`;
      if (costElem) costElem.textContent = maxed ? 'MAX' : `${cost} Coins`;
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = maxed || coins < cost;
      }
    });
  }

  function openTeslaUpgradeMenu(cellIdx) {
    window.selectedTeslaIndex = cellIdx;
    window.selectedTurretIndex = cellIdx;
    renderTeslaUpgradeMenu(cellIdx);
    const menu = ensureTeslaUpgradeMenu();
    menu.classList.remove('hidden');
    markUpgradeMenuJustOpened();
    placeUpgradePanelNearCell('tesla-upgrade-overlay', '.tesla-upgrade-panel', cellIdx);
    window.refreshTurretRadiusDisplay?.();
  }

  function updateTowerMenuCostLabels() {
    const coins = getCoinsValue();
    const buttons = towerMenu.querySelectorAll('.tower-select-btn');
    buttons.forEach((btn) => {
      const towerType = btn.getAttribute('data-tower') || '';
      const label = btn.getAttribute('data-label') || btn.textContent || '';
      const cost = getBuildCost(towerType);
      btn.textContent = `${label} (${cost})`;
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = coins < cost;
      }
    });
  }

  window.updateTowerMenuCostLabels = updateTowerMenuCostLabels;
  updateTowerMenuCostLabels();

  towerMenu.addEventListener('click', (e) => {
    if (e.target.matches('.tower-select-btn')) {
      closeUpgradeMenus();
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
      if (!hasAnyClass(c, BUILD_ZONE_SOURCE_CLASSES)) continue;
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
      if (cell.classList.contains('barracks-cell')) {
        openBarracksUpgradeMenu(cellIdx);
        refreshBuildAreaVisualization();
        return;
      }
      if (cell.classList.contains('tesla-cell')) {
        openTeslaUpgradeMenu(cellIdx);
        refreshBuildAreaVisualization();
        return;
      }
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
        if (hasBlockingStructure(cell, ['wall-cell'])) {
          window.selectedTurretIndex = window.selectedTurretIndex === cellIdx ? null : cellIdx;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        if (window.selectedTurretIndex === cellIdx) window.selectedTurretIndex = null;
        if (!spendCoins(getBuildCost('wall'))) return;
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
        if (hasBlockingStructure(cell, ['turret-cell'])) {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        if (!spendCoins(getBuildCost('turret'))) return;
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
        if (hasBlockingStructure(cell, ['cannon-cell'])) {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        if (!spendCoins(getBuildCost('cannon'))) return;
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
        if (hasBlockingStructure(cell, ['barracks-cell'])) {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        if (!spendCoins(getBuildCost('barracks'))) return;
        cell.classList.add('barracks-cell');
        cell.textContent = 'B';
        window.selectedTurretIndex = null;
        window.refreshTurretRadiusDisplay?.();
        refreshBuildAreaVisualization();
      }
      // Teslaturm
      else if (window.selectedTowerType === 'tesla') {
        if (!isBuildAllowed(cellIdx)) return;
        if (cell.classList.contains('tesla-cell')) {
          window.selectedTurretIndex = window.selectedTurretIndex === cellIdx ? null : cellIdx;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        if (hasBlockingStructure(cell, ['tesla-cell'])) {
          window.selectedTurretIndex = null;
          window.refreshTurretRadiusDisplay?.();
          refreshBuildAreaVisualization();
          return;
        }
        if (!spendCoins(getBuildCost('tesla'))) return;
        cell.classList.add('tesla-cell');
        cell.textContent = 'T';
        window.selectedTurretIndex = cellIdx;
        window.refreshTurretRadiusDisplay?.();
        refreshBuildAreaVisualization();
      } else {
        // Ohne Bau-Auswahl: Turm auswählen, um den Radius zu sehen
        if (hasAnyClass(cell, RANGE_TOWER_CELL_CLASSES)) {
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
    let activeLightningArcs = [];
    let activeStartCannonBullets = [];
    let TURRET_RANGE = 0;
    let TESLA_RANGE = 0;
    let TESLA_CHAIN_RANGE = 0;
    let START_CANNON_RANGE = 0;
    const BULLET_SPEED = 420;
    const START_CANNON_BULLET_SPEED = 560;
    const TURRET_COOLDOWN = 650; // ms
    const CANNON_COOLDOWN = 1300; // ms
    const TESLA_COOLDOWN = TESLA_BASE_COOLDOWN_MS; // ms
    const TESLA_CHAIN_MAX = 3; // max chain targets
    const START_CANNON_COOLDOWN = 430; // ms
    const CANNON_AOE_RADIUS = 0.9; // in cell widths
    const BASE_BARRACKS_SPAWN_MS = 2000;
    const SOLDIER_HIT_RADIUS = 12;
    const SOLDIER_ATTACK_COOLDOWN = 450;
    const ENEMY_MELEE_COOLDOWN = 650;
    let turretCooldowns = {};
    let barracksSpawnTimers = {};
    let startCannonCooldowns = [0, 0];

  let currentWave = 1;
  const maxWaves = 1111;
  const enemysPerWave = 5;
  window.waveState = {
    current: 0,
    next: 1,
    max: maxWaves,
    starting: false,
    countdownActive: false,
    countdownIntervalId: null,
    countdownTimeoutId: null,
    enemiesAliveInWave: false
  };
  const wavesElem = document.getElementById('waves-count');
  if (wavesElem) wavesElem.textContent = currentWave;

  function getWaveCountdownOverlay() {
    return document.getElementById('wave-countdown-overlay');
  }

  function hideWaveCountdown() {
    const overlay = getWaveCountdownOverlay();
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.textContent = '';
  }

  function clearWaveCountdownTimers() {
    const waveState = window.waveState;
    if (!waveState) return;
    if (waveState.countdownIntervalId) {
      clearInterval(waveState.countdownIntervalId);
      waveState.countdownIntervalId = null;
    }
    if (waveState.countdownTimeoutId) {
      clearTimeout(waveState.countdownTimeoutId);
      waveState.countdownTimeoutId = null;
    }
    waveState.countdownActive = false;
    hideWaveCountdown();
  }

  function scheduleNextWaveCountdown() {
    const waveState = window.waveState;
    if (!waveState || waveState.countdownActive || waveState.starting || window.noMoreWaves) return;
    if (waveState.next > waveState.max) {
      markAllWavesCompleted();
      return;
    }

    const overlay = getWaveCountdownOverlay();
    if (!overlay) return;

    clearWaveCountdownTimers();
    waveState.countdownActive = true;
    let secondsLeft = 3;
    overlay.textContent = String(secondsLeft);
    overlay.classList.remove('hidden');

    waveState.countdownIntervalId = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        return;
      }
      overlay.textContent = String(secondsLeft);
    }, 1000);

    waveState.countdownTimeoutId = setTimeout(async () => {
      clearWaveCountdownTimers();
      await window.startNextWave?.();
    }, 3000);
  }

  function markAllWavesCompleted() {
    clearWaveCountdownTimers();
    if (wavesElem) wavesElem.textContent = 'Fertig';
    window.noMoreWaves = true;

    const startCell = getStartCell();
    if (startCell) {
      startCell.classList.remove('pulse');
      startCell.style.transform = '';
      startCell.title = 'Alle Wellen abgeschlossen';
    }
  }

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
    if (window.waveState) {
      window.waveState.enemiesAliveInWave = true;
    }
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

      const barracksStats = getBarracksRuntimeStats(barracksIdx);

      activeSoldiers.push({
        positions,
        seg: 0,
        t: 0,
        lastTimestamp: null,
        speed: barracksStats.movementSpeed,
        hp: barracksStats.maxHp,
        maxHp: barracksStats.maxHp,
        damage: barracksStats.strengthDamage,
        armorReduction: barracksStats.armorReduction,
        engagedEnemy: null,
        lastAttackTimestamp: 0,
        lastReceivedHitTimestamp: 0
      });
    }

    if (window.gameStarted) {
      const cellsNow = getCells();
      const aliveBarracks = new Set();
      for (let i = 0; i < cellsNow.length; i++) {
        if (!cellsNow[i].classList.contains('barracks-cell')) continue;
        aliveBarracks.add(String(i));
        const barracksStats = getBarracksRuntimeStats(i);
        const spawnInterval = Math.max(450, Math.min(BASE_BARRACKS_SPAWN_MS, barracksStats.spawnIntervalMs));
        if (!barracksSpawnTimers[i] || timestamp - barracksSpawnTimers[i] >= spawnInterval) {
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
      const isEngagedByAnySoldier = activeSoldiers.some((soldier) => soldier.engagedEnemy === enemy && (soldier.hp || 0) > 0);
      if (isEngagedByAnySoldier) {
        const x = enemy._drawX !== undefined ? enemy._drawX : enemy.positions[enemy.seg].x;
        const y = enemy._drawY !== undefined ? enemy._drawY : enemy.positions[enemy.seg].y;
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
        enemy._drawX = x;
        enemy._drawY = y;
        stillActive.push(enemy);
        continue;
      }

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
    let stillSoldiers = [];
    for (const soldier of activeSoldiers) {
      if ((soldier.hp !== undefined ? soldier.hp : 1) <= 0) {
        continue;
      }

      if (!soldier.lastTimestamp) soldier.lastTimestamp = timestamp;
      let dt = (timestamp - soldier.lastTimestamp) / 1000;
      if (dt > 0.15) dt = 0.15;
      soldier.lastTimestamp = timestamp;

      // Bereits im Nahkampf: beide bleiben stehen und kaempfen bis einer besiegt ist.
      if (soldier.engagedEnemy) {
        const enemy = soldier.engagedEnemy;
        if (!activeEnemies.includes(enemy)) {
          soldier.engagedEnemy = null;
        } else {
          const x = soldier._drawX !== undefined ? soldier._drawX : enemy._drawX;
          const y = soldier._drawY !== undefined ? soldier._drawY : enemy._drawY;

          if (!soldier.lastAttackTimestamp) soldier.lastAttackTimestamp = timestamp;
          if (!soldier.lastReceivedHitTimestamp) soldier.lastReceivedHitTimestamp = timestamp;

          if (timestamp - soldier.lastAttackTimestamp >= SOLDIER_ATTACK_COOLDOWN) {
            enemy.hp = (enemy.hp !== undefined ? enemy.hp : 1) - (soldier.damage || 1);
            soldier.lastAttackTimestamp = timestamp;
          }

          if ((enemy.hp !== undefined ? enemy.hp : 1) > 0 && timestamp - soldier.lastReceivedHitTimestamp >= ENEMY_MELEE_COOLDOWN) {
            const reduction = Math.max(0, Math.min(0.75, soldier.armorReduction || 0));
            const incomingDamage = Math.max(0.2, 1 * (1 - reduction));
            soldier.hp = (soldier.hp !== undefined ? soldier.hp : 1) - incomingDamage;
            soldier.lastReceivedHitTimestamp = timestamp;
          }

          if ((enemy.hp !== undefined ? enemy.hp : 1) <= 0) {
            rewardCoinAtWorldPos(enemy._drawX, enemy._drawY);
            const idx = activeEnemies.indexOf(enemy);
            if (idx >= 0) activeEnemies.splice(idx, 1);
            soldier.engagedEnemy = null;
          }

          if ((soldier.hp !== undefined ? soldier.hp : 1) <= 0) {
            continue;
          }

          sharedEnemyCtx.save();
          drawStarShape(sharedEnemyCtx, x, y, 5.5, 2.6);
          sharedEnemyCtx.fillStyle = '#ffd700';
          sharedEnemyCtx.shadowColor = '#ffcc33';
          sharedEnemyCtx.shadowBlur = 8;
          sharedEnemyCtx.fill();
          sharedEnemyCtx.restore();

          soldier._drawX = x;
          soldier._drawY = y;
          stillSoldiers.push(soldier);
          continue;
        }
      }

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

      soldier._drawX = x;
      soldier._drawY = y;
      let enteredCombat = false;
      for (let k = activeEnemies.length - 1; k >= 0; k--) {
        const enemy = activeEnemies[k];
        if (enemy._drawX === undefined || enemy._drawY === undefined) continue;
        const hitDx = enemy._drawX - x;
        const hitDy = enemy._drawY - y;
        if (Math.sqrt(hitDx * hitDx + hitDy * hitDy) > SOLDIER_HIT_RADIUS) continue;

        soldier.engagedEnemy = enemy;
        soldier.lastAttackTimestamp = timestamp;
        soldier.lastReceivedHitTimestamp = timestamp;
        soldier._drawX = x;
        soldier._drawY = y;
        enteredCombat = true;
        break;
      }

      if (enteredCombat) {
        sharedEnemyCtx.save();
        drawStarShape(sharedEnemyCtx, soldier._drawX, soldier._drawY, 5.5, 2.6);
        sharedEnemyCtx.fillStyle = '#ffd700';
        sharedEnemyCtx.shadowColor = '#ffcc33';
        sharedEnemyCtx.shadowBlur = 8;
        sharedEnemyCtx.fill();
        sharedEnemyCtx.restore();
        stillSoldiers.push(soldier);
        continue;
      }

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

    // --- START CELL: DUAL GIANT CANNONS AGAINST SOLDIERS ---
    function getSoldierDrawPos(soldier) {
      if (soldier._drawX !== undefined && soldier._drawY !== undefined) {
        return { x: soldier._drawX, y: soldier._drawY };
      }
      const p = soldier.positions?.[soldier.seg] || soldier.positions?.[0];
      if (!p) return null;
      return { x: p.x, y: p.y };
    }

    function getStartCannonData() {
      const startCell = getStartCell();
      if (!startCell || !cellWidth || !cellHeight) return null;
      const cellsNow = getCells();
      const startIdx = Array.from(cellsNow).indexOf(startCell);
      if (startIdx < 0) return null;

      const sx = (startIdx % COLS) * cellWidth + cellWidth / 2;
      const sy = Math.floor(startIdx / COLS) * cellHeight + cellHeight / 2;

      let dirX = 0;
      let dirY = -1;
      if (latestEnemyAStarPath.length > 1) {
        let startPosInPath = latestEnemyAStarPath.indexOf(startIdx);
        if (startPosInPath < 0) startPosInPath = 0;
        const nextPos = Math.min(startPosInPath + 1, latestEnemyAStarPath.length - 1);
        const nextIdx = latestEnemyAStarPath[nextPos];
        if (nextIdx !== undefined && nextIdx !== startIdx) {
          const nx = (nextIdx % COLS) * cellWidth + cellWidth / 2;
          const ny = Math.floor(nextIdx / COLS) * cellHeight + cellHeight / 2;
          const dx = nx - sx;
          const dy = ny - sy;
          const len = Math.hypot(dx, dy) || 1;
          dirX = dx / len;
          dirY = dy / len;
        }
      }

      const perpX = -dirY;
      const perpY = dirX;
      const lateralOffset = Math.max(cellWidth, cellHeight) * 0.34;
      const barrelLen = Math.max(cellWidth, cellHeight) * 0.85;
      const baseRadius = Math.max(cellWidth, cellHeight) * 0.18;

      return [
        {
          baseX: sx + perpX * lateralOffset,
          baseY: sy + perpY * lateralOffset,
          muzzleX: sx + perpX * lateralOffset + dirX * barrelLen,
          muzzleY: sy + perpY * lateralOffset + dirY * barrelLen,
          radius: baseRadius
        },
        {
          baseX: sx - perpX * lateralOffset,
          baseY: sy - perpY * lateralOffset,
          muzzleX: sx - perpX * lateralOffset + dirX * barrelLen,
          muzzleY: sy - perpY * lateralOffset + dirY * barrelLen,
          radius: baseRadius
        }
      ];
    }

    function drawStartCannons(cannonData) {
      for (const cannon of cannonData) {
        sharedEnemyCtx.save();
        sharedEnemyCtx.lineCap = 'round';
        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.moveTo(cannon.baseX, cannon.baseY);
        sharedEnemyCtx.lineTo(cannon.muzzleX, cannon.muzzleY);
        sharedEnemyCtx.strokeStyle = '#6c7ea5';
        sharedEnemyCtx.shadowColor = '#c0d0ff';
        sharedEnemyCtx.shadowBlur = 12;
        sharedEnemyCtx.lineWidth = cannon.radius * 1.25;
        sharedEnemyCtx.stroke();

        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.arc(cannon.baseX, cannon.baseY, cannon.radius, 0, 2 * Math.PI);
        sharedEnemyCtx.fillStyle = '#273754';
        sharedEnemyCtx.strokeStyle = '#9bb7e6';
        sharedEnemyCtx.lineWidth = 1.5;
        sharedEnemyCtx.fill();
        sharedEnemyCtx.stroke();

        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.arc(cannon.muzzleX, cannon.muzzleY, cannon.radius * 0.35, 0, 2 * Math.PI);
        sharedEnemyCtx.fillStyle = '#e3f2ff';
        sharedEnemyCtx.shadowColor = '#e3f2ff';
        sharedEnemyCtx.shadowBlur = 8;
        sharedEnemyCtx.fill();
        sharedEnemyCtx.restore();
      }
    }

    const startCannons = getStartCannonData();
    if (startCannons) {
      drawStartCannons(startCannons);
      for (let cannonIdx = 0; cannonIdx < startCannons.length; cannonIdx++) {
        const cannon = startCannons[cannonIdx];
        if (timestamp - (startCannonCooldowns[cannonIdx] || 0) < START_CANNON_COOLDOWN) continue;

        let nearestSoldier = null;
        let minDist = START_CANNON_RANGE;
        for (const soldier of activeSoldiers) {
          if ((soldier.hp || 0) <= 0) continue;
          const sPos = getSoldierDrawPos(soldier);
          if (!sPos) continue;
          const dx = sPos.x - cannon.muzzleX;
          const dy = sPos.y - cannon.muzzleY;
          const dist = Math.hypot(dx, dy);
          if (dist < minDist) {
            minDist = dist;
            nearestSoldier = soldier;
          }
        }

        if (!nearestSoldier) continue;
        startCannonCooldowns[cannonIdx] = timestamp;
        activeStartCannonBullets.push({
          x: cannon.muzzleX,
          y: cannon.muzzleY,
          target: nearestSoldier,
          life: 0,
          maxLife: 90,
          hit: false
        });
      }
    }

    // --- TURRET SHOOTING ---
    const cells = getCells();
    const selectedTurretIndex = window.selectedTurretIndex;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const isNormalTurret = cell.classList.contains('turret-cell');
      const isCannonTurret = cell.classList.contains('cannon-cell');
      const isTeslaTurret = cell.classList.contains('tesla-cell');
      if (!isNormalTurret && !isCannonTurret && !isTeslaTurret) continue;
      // Turm-Position (Mitte der Zelle)
      const col = i % 20;
      const row = Math.floor(i / 20);
      const tx = col * cellWidth + cellWidth / 2;
      const ty = row * cellHeight + cellHeight / 2;
      const teslaStats = isTeslaTurret ? getTeslaRuntimeStats(i, TESLA_RANGE, TESLA_CHAIN_RANGE, TESLA_COOLDOWN) : null;
      const cooldownMs = isCannonTurret ? CANNON_COOLDOWN : (isTeslaTurret ? teslaStats.cooldownMs : TURRET_COOLDOWN);
      const displayRange = isTeslaTurret ? teslaStats.range : TURRET_RANGE;

      // Schussradius nur fuer den ausgewaehlten Turm sichtbar machen
      if (i === selectedTurretIndex) {
        const rangePulse = 0.5 + 0.5 * Math.sin(timestamp * 0.005 + i);
        const sweepAngle = (timestamp * 0.0015 + i * 0.35) % (Math.PI * 2);
        const sweepWidth = 0.42;
        const edgeX = tx + Math.cos(sweepAngle) * displayRange;
        const edgeY = ty + Math.sin(sweepAngle) * displayRange;
        const rangeColor = isTeslaTurret ? ['200, 100, 255', '#c864ff', '#9b20ff'] : ['0, 255, 247', '#00fff7', '#8cfffc'];
        sharedEnemyCtx.save();

        // Soft base disc so the range area is always visible
        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.arc(tx, ty, displayRange, 0, 2 * Math.PI);
        sharedEnemyCtx.fillStyle = `rgba(${rangeColor[0]}, ${0.14 + rangePulse * 0.08})`;
        sharedEnemyCtx.fill();

        // Sonar sweep cone (radar scan)
        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.moveTo(tx, ty);
        sharedEnemyCtx.arc(tx, ty, displayRange, sweepAngle - sweepWidth, sweepAngle + sweepWidth);
        sharedEnemyCtx.closePath();
        sharedEnemyCtx.fillStyle = `rgba(${rangeColor[0]}, ${0.08 + rangePulse * 0.07})`;
        sharedEnemyCtx.shadowColor = rangeColor[2];
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
        sharedEnemyCtx.arc(tx, ty, displayRange, 0, 2 * Math.PI);
        sharedEnemyCtx.strokeStyle = `rgba(${rangeColor[0]}, ${0.8 + rangePulse * 0.2})`;
        sharedEnemyCtx.lineWidth = 3;
        sharedEnemyCtx.setLineDash([10, 6]);
        sharedEnemyCtx.shadowColor = rangeColor[1];
        sharedEnemyCtx.shadowBlur = 10 + rangePulse * 12;
        sharedEnemyCtx.stroke();

        // Inner highlight ring
        sharedEnemyCtx.beginPath();
        sharedEnemyCtx.arc(tx, ty, displayRange, 0, 2 * Math.PI);
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
        let minDist = isTeslaTurret ? teslaStats.range : TURRET_RANGE;
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
          if (isTeslaTurret) {
            // Kettenblitz: bis zu TESLA_CHAIN_MAX Ziele
            const targets = [nearest];
            let src = nearest;
            for (let c = 1; c < TESLA_CHAIN_MAX; c++) {
              let nextTarget = null;
              let nextMinDist = teslaStats.chainRange;
              for (const enemy of activeEnemies) {
                if (targets.includes(enemy)) continue;
                if (enemy._drawX === undefined) continue;
                const edx = enemy._drawX - src._drawX;
                const edy = enemy._drawY - src._drawY;
                const d = Math.sqrt(edx * edx + edy * edy);
                if (d < nextMinDist) { nextMinDist = d; nextTarget = enemy; }
              }
              if (!nextTarget) break;
              targets.push(nextTarget);
              src = nextTarget;
            }
            // Blitzkette visualisieren
            const arcChain = [{x: tx, y: ty}, ...targets.map(t => ({x: t._drawX, y: t._drawY}))];
            for (let c = 0; c < arcChain.length - 1; c++) {
              activeLightningArcs.push({ x1: arcChain[c].x, y1: arcChain[c].y, x2: arcChain[c+1].x, y2: arcChain[c+1].y, life: 0, maxLife: 10 });
            }
            // Schaden auf alle Kettenziele
            for (const t of targets) {
              t.hp = (t.hp !== undefined ? t.hp : 1) - teslaStats.damage;
            }
            // Tote Gegner entfernen
            for (let k = activeEnemies.length - 1; k >= 0; k--) {
              if ((activeEnemies[k].hp ?? 1) <= 0) {
                rewardCoinAtWorldPos(activeEnemies[k]._drawX, activeEnemies[k]._drawY);
                activeEnemies.splice(k, 1);
              }
            }
          } else {
            // Bullet erzeugen
            activeBullets.push({
              x: tx,
              y: ty,
              target: nearest,
              hit: false,
              isCannon: isCannonTurret,
              splashRadius: isCannonTurret ? CANNON_AOE_RADIUS * Math.max(cellWidth, cellHeight) : 0
            });
          }
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
        setCoinsValue(getCoinsValue() + 1);
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

    // --- START CANNON BULLETS VS SOLDIERS ---
    let stillStartCannonBullets = [];
    for (const bullet of activeStartCannonBullets) {
      bullet.life++;
      if (bullet.life > bullet.maxLife) continue;

      let targetPos = null;
      if (bullet.target && (bullet.target.hp || 0) > 0) {
        targetPos = getSoldierDrawPos(bullet.target);
      }

      if (!targetPos) {
        let nearest = null;
        let minDist = START_CANNON_RANGE;
        for (const soldier of activeSoldiers) {
          if ((soldier.hp || 0) <= 0) continue;
          const sPos = getSoldierDrawPos(soldier);
          if (!sPos) continue;
          const dx = sPos.x - bullet.x;
          const dy = sPos.y - bullet.y;
          const dist = Math.hypot(dx, dy);
          if (dist < minDist) {
            minDist = dist;
            nearest = soldier;
            targetPos = sPos;
          }
        }
        bullet.target = nearest;
      }

      if (!targetPos) continue;

      const dx = targetPos.x - bullet.x;
      const dy = targetPos.y - bullet.y;
      const dist = Math.hypot(dx, dy);
      const move = Math.min(START_CANNON_BULLET_SPEED * (1 / 60), dist);

      if (dist < 10) {
        bullet.target.hp = 0;
        bullet.hit = true;
        spawnHitShards(targetPos.x, targetPos.y, true);
      } else {
        bullet.x += (dx / (dist || 1)) * move;
        bullet.y += (dy / (dist || 1)) * move;
      }

      sharedEnemyCtx.save();
      sharedEnemyCtx.beginPath();
      sharedEnemyCtx.arc(bullet.x, bullet.y, 3.2, 0, 2 * Math.PI);
      sharedEnemyCtx.fillStyle = '#a8d4ff';
      sharedEnemyCtx.shadowColor = '#d7ebff';
      sharedEnemyCtx.shadowBlur = 10;
      sharedEnemyCtx.fill();
      sharedEnemyCtx.restore();

      if (!bullet.hit) stillStartCannonBullets.push(bullet);
    }
    activeStartCannonBullets = stillStartCannonBullets;

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

    // --- TESLA LIGHTNING ARC ANIMATION ---
    function drawLightning(ctx, x1, y1, x2, y2, alpha) {
      const segments = 8;
      const points = [{x: x1, y: y1}];
      for (let s = 1; s < segments; s++) {
        const t = s / segments;
        points.push({
          x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 20,
          y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 20
        });
      }
      points.push({x: x2, y: y2});
      ctx.save();
      ctx.globalAlpha = alpha;
      // Glow layer
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let s = 1; s < points.length; s++) ctx.lineTo(points[s].x, points[s].y);
      ctx.strokeStyle = '#c864ff';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#c864ff';
      ctx.shadowBlur = 18;
      ctx.stroke();
      // Core white layer
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let s = 1; s < points.length; s++) ctx.lineTo(points[s].x, points[s].y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.restore();
    }

    let stillArcs = [];
    for (const arc of activeLightningArcs) {
      arc.life++;
      if (arc.life > arc.maxLife) continue;
      const alpha = 1 - arc.life / arc.maxLife;
      drawLightning(sharedEnemyCtx, arc.x1, arc.y1, arc.x2, arc.y2, alpha);
      stillArcs.push(arc);
    }
    activeLightningArcs = stillArcs;

    const waveState = window.waveState;
    if (
      waveState &&
      waveState.enemiesAliveInWave &&
      !waveState.starting &&
      !waveState.countdownActive &&
      activeEnemies.length === 0
    ) {
      waveState.enemiesAliveInWave = false;
      if (waveState.current >= waveState.max) {
        markAllWavesCompleted();
      } else {
        scheduleNextWaveCountdown();
      }
    }

    const keepForRadius = window.selectedTurretIndex !== null && window.selectedTurretIndex !== undefined;
    const keepForBarracks = window.gameStarted && Array.from(getCells()).some(c => c.classList.contains('barracks-cell'));
    const keepForStartCannons = window.gameStarted && activeSoldiers.length > 0;
    if (activeEnemies.length > 0 || keepForRadius || activeHitShards.length > 0 || activeHitBursts.length > 0 || activeSoldiers.length > 0 || keepForBarracks || activeLightningArcs.length > 0 || activeStartCannonBullets.length > 0 || keepForStartCannons) {
      requestAnimationFrame(enemyAnimationLoop);
    } else {
      animationRunning = false;
      removeSharedCanvas();
    }
  }

  async function startWave(waveNum) {
    if (waveNum > maxWaves) {
      markAllWavesCompleted();
      return false;
    }

    clearWaveCountdownTimers();

    if (wavesElem) wavesElem.textContent = waveNum;
    currentWave = waveNum;
    window.waveState.current = waveNum;
    window.waveState.enemiesAliveInWave = false;
    const path = await findShortestAStarPath();
    if (!path || path.length < 2) {
      console.warn('Kein gültiger Pfad für diese Welle!');
      return false;
    }
    latestEnemyAStarPath = path.slice();
    setupSharedCanvas();
    // Nach Canvas-Setup: Range korrekt setzen
    TURRET_RANGE = 4.5 * Math.max(cellWidth, cellHeight);
    TESLA_RANGE = TESLA_BASE_RANGE_CELLS * Math.max(cellWidth, cellHeight);
    TESLA_CHAIN_RANGE = TESLA_BASE_CHAIN_CELLS * Math.max(cellWidth, cellHeight);
    START_CANNON_RANGE = 7.2 * Math.max(cellWidth, cellHeight);
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

    return true;
  }

  window.startNextWave = async () => {
    const waveState = window.waveState;
    if (!waveState || waveState.starting || window.noMoreWaves) return;

    if (waveState.next > waveState.max) {
      markAllWavesCompleted();
      return;
    }

    waveState.starting = true;
    const started = await startWave(waveState.next);
    if (started) {
      waveState.next++;
    }
    waveState.starting = false;
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
          if (window._gameInitialized) return;
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
