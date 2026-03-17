function ensureLayout(root) {
  root.innerHTML = `
    <section class="rts-shell">
      <div class="rts-topbar">
        <div class="rts-resource">Mineral: <span id="res-mineral">0</span></div>
        <div class="rts-resource">Energie: <span id="res-energy">0</span></div>
        <div class="rts-resource">Daten: <span id="res-data">0</span></div>
      </div>
      <canvas id="rts-canvas" width="960" height="720" aria-label="RTS Spielfeld"></canvas>
      <div class="rts-debug" id="rts-debug"></div>
    </section>
  `;

  return {
    canvas: root.querySelector('#rts-canvas'),
    debug: root.querySelector('#rts-debug'),
    mineral: root.querySelector('#res-mineral'),
    energy: root.querySelector('#res-energy'),
    data: root.querySelector('#res-data')
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function asCellPosition(canvas, event, cols, rows) {
  const rect = canvas.getBoundingClientRect();
  const xPx = clamp(event.clientX - rect.left, 0, rect.width);
  const yPx = clamp(event.clientY - rect.top, 0, rect.height);
  return {
    x: (xPx / rect.width) * cols,
    y: (yPx / rect.height) * rows,
    px: xPx,
    py: yPx
  };
}

function isFriendlyMovable(snapshot, entity) {
  const playerTeamId = snapshot.players.player.teamId;
  if (entity.teamId !== playerTeamId) return false;
  return entity.type !== 'HQ';
}

function isCombatUnit(entity) {
  if (!entity) return false;
  return entity.type === 'Scout' || entity.type === 'LightInfantry' || entity.type === 'Ranged' || entity.type === 'HeavySoldier';
}

function findEntityNearCell(snapshot, cellX, cellY, maxDist = 0.5, predicate = null) {
  // Convert cell coordinates to pixel coordinates for more accurate hit-testing
  // This matches how entities are actually drawn (with centerpoint offsets)
  const cols = snapshot.map.cols;
  const rows = snapshot.map.rows;
  const canvasWidth = 960; // Standard canvas width
  const canvasHeight = 720; // Standard canvas height
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;
  
  // Convert click cell to pixel coordinates (center would be at cellX + 0.5)
  const clickPixelX = cellX * cellW;
  const clickPixelY = cellY * cellH;
  
  let best = null;
  let bestDist = Infinity;
  for (const entity of snapshot.entities || []) {
    if (typeof predicate === 'function' && !predicate(entity)) {
      continue;
    }
    
    // Entity position in pixels (they're drawn at entity.x * cellW + cellW/2)
    const entityPixelX = entity.x * cellW + cellW / 2;
    const entityPixelY = entity.y * cellH + cellH / 2;
    
    // Distance in pixel space
    const dpx = entityPixelX - clickPixelX;
    const dpy = entityPixelY - clickPixelY;
    const pixelDist = Math.hypot(dpx, dpy);
    
    // Convert maxDist from cells to pixels for comparison
    const maxDistPixels = maxDist * cellW;
    const entityRadius = entity.type === 'HQ' ? 13 : 8;
    
    // Hit if click is within entity radius + tolerance
    const hitRadius = entityRadius + 4;
    if (pixelDist <= hitRadius && pixelDist < bestDist) {
      best = entity;
      bestDist = pixelDist;
    }
  }
  return best;
}

function findResourceSpotNearCell(snapshot, cellX, cellY, maxDist = 0.5) {
  // Convert cell coordinates to pixel coordinates for accurate hit-testing
  const cols = snapshot.map.cols;
  const rows = snapshot.map.rows;
  const canvasWidth = 960;
  const canvasHeight = 720;
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;
  
  const clickPixelX = cellX * cellW;
  const clickPixelY = cellY * cellH;
  
  let best = null;
  let bestDist = Infinity;
  for (const spot of snapshot.resourceSpots || []) {
    if (!spot || spot.amount <= 0) continue;
    
    // Resource spot drawn at spot.x * cellW + cellW/2
    const spotPixelX = spot.x * cellW + cellW / 2;
    const spotPixelY = spot.y * cellH + cellH / 2;
    
    const dpx = spotPixelX - clickPixelX;
    const dpy = spotPixelY - clickPixelY;
    const pixelDist = Math.hypot(dpx, dpy);
    
    // Resource spots have visual radius of 6-7 pixels + tolerance
    const hitRadius = 10;
    if (pixelDist <= hitRadius && pixelDist < bestDist) {
      best = spot;
      bestDist = pixelDist;
    }
  }
  return best;
}

function isEnemyOfPlayer(snapshot, entity) {
  return entity.teamId !== snapshot.players.player.teamId;
}

function drawGrid(ctx, cols, rows, width, height) {
  const cellW = width / cols;
  const cellH = height / rows;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#03101d';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(0, 255, 247, 0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    const px = x * cellW;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    const py = y * cellH;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
    ctx.stroke();
  }
}

function drawTerrain(ctx, terrain, cols, rows, width, height) {
  if (!terrain || !Array.isArray(terrain)) return;
  
  const cellW = width / cols;
  const cellH = height / rows;

  ctx.fillStyle = 'rgba(100, 80, 60, 0.6)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = terrain[y * cols + x];
      if (cell && cell.blocked) {
        const px = x * cellW;
        const py = y * cellH;
        ctx.fillRect(px, py, cellW, cellH);
        
        // Add pattern to blocked cells
        ctx.strokeStyle = 'rgba(150, 100, 80, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellW, cellH);
      }
    }
  }
}

function drawFogOfWar(ctx, visibleSet, discoveredSet, cols, rows, width, height) {
  if (!visibleSet || !Array.isArray(visibleSet)) return;
  
  const cellW = width / cols;
  const cellH = height / rows;
  
  // Convert arrays back to Sets for O(1) lookup
  const visibleMap = new Set(visibleSet);
  const discoveredMap = new Set(discoveredSet || []);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cellKey = `${x},${y}`;
      const isVisible = visibleMap.has(cellKey);
      const isDiscovered = discoveredMap.has(cellKey);
      
      if (!isVisible && isDiscovered) {
        // Discovered but not currently visible = dark fog
        const px = x * cellW;
        const py = y * cellH;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(px, py, cellW, cellH);
      } else if (!isVisible && !isDiscovered) {
        // Never discovered = black shroud
        const px = x * cellW;
        const py = y * cellH;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(px, py, cellW, cellH);
      }
    }
  }
}

function drawResourceSpots(ctx, snapshot, width, height) {
  const cols = snapshot.map.cols;
  const rows = snapshot.map.rows;
  const cellW = width / cols;
  const cellH = height / rows;

  for (const spot of snapshot.resourceSpots || []) {
    if (!spot || spot.amount <= 0) continue;
    const cx = spot.x * cellW + cellW / 2;
    const cy = spot.y * cellH + cellH / 2;
    const isMineral = spot.type === 'mineral';
    const color = isMineral ? '#4ecbff' : '#ffd257';
    const radius = isMineral ? 7 : 6;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '10px sans-serif';
    const label = `${isMineral ? 'M' : 'E'}:${Math.floor(spot.amount)}`;
    ctx.fillText(label, cx - 14, cy - 10);
  }
}

function drawEntities(ctx, snapshot, width, height, selectedIds) {
  const cols = snapshot.map.cols;
  const rows = snapshot.map.rows;
  const cellW = width / cols;
  const cellH = height / rows;

  for (const [entityType, count] of Object.entries(snapshot.entitySummary)) {
    if (count <= 0) continue;
    // placeholder legend indicator
    ctx.fillStyle = '#b9d4ff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${entityType}: ${count}`, 10, 16 + Object.keys(snapshot.entitySummary).indexOf(entityType) * 14);
  }

  const playerTeamId = snapshot.players.player.teamId;
  const entityById = new Map((snapshot.entities || []).map((entity) => [entity.id, entity]));
  for (const entity of snapshot.entities || []) {
    const cx = entity.x * cellW + cellW / 2;
    const cy = entity.y * cellH + cellH / 2;
    const isPlayer = entity.teamId === playerTeamId;
    const color = isPlayer ? '#2bf077' : '#ff8a40';
    const radius = entity.type === 'HQ' ? 13 : 8;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();

    if (selectedIds.has(entity.id)) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#d8f7ff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }

    if (entity.target) {
      const tx = entity.target.x * cellW + cellW / 2;
      const ty = entity.target.y * cellH + cellH / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = 'rgba(170, 216, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (entity.attackTargetId != null) {
      const attackTarget = entityById.get(entity.attackTargetId);
      if (attackTarget) {
        const tx = attackTarget.x * cellW + cellW / 2;
        const ty = attackTarget.y * cellH + cellH / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = 'rgba(255, 98, 98, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 160, 160, 0.9)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    if (typeof entity.hp === 'number' && typeof entity.maxHp === 'number' && entity.maxHp > 0) {
      const ratio = Math.max(0, Math.min(1, entity.hp / entity.maxHp));
      const barWidth = 16;
      const barHeight = 3;
      const bx = cx - barWidth / 2;
      const by = cy - radius - 8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(bx, by, barWidth, barHeight);

      ctx.fillStyle = ratio > 0.5 ? '#49d17d' : (ratio > 0.25 ? '#f6be3b' : '#ff6b6b');
      ctx.fillRect(bx, by, barWidth * ratio, barHeight);
    }

    if (entity.type === 'Worker' && entity.carryAmount > 0) {
      const carryColor = entity.carryType === 'energy' ? '#ffd257' : '#4ecbff';
      ctx.beginPath();
      ctx.arc(cx + 8, cy - 8, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = carryColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function drawSelectionRect(ctx, dragState, canvasWidth, canvasHeight) {
  if (!dragState || !dragState.active) return;
  const x1 = clamp(Math.min(dragState.startPx.x, dragState.currentPx.x), 0, canvasWidth);
  const y1 = clamp(Math.min(dragState.startPx.y, dragState.currentPx.y), 0, canvasHeight);
  const x2 = clamp(Math.max(dragState.startPx.x, dragState.currentPx.x), 0, canvasWidth);
  const y2 = clamp(Math.max(dragState.startPx.y, dragState.currentPx.y), 0, canvasHeight);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 255, 247, 0.16)';
  ctx.strokeStyle = 'rgba(160, 255, 250, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  ctx.restore();
}

function drawProductionPanel(ctx, snapshot, selectedBuildingId, canvasWidth, canvasHeight) {
  if (!selectedBuildingId) return null;
  
  const building = (snapshot.entities || []).find(e => e.id === selectedBuildingId);
  if (!building) return null;
  
  // Unit costs (must match unitBlueprints.js)
  const unitCosts = {
    Worker: { mineral: 25, energy: 0 },
    Scout: { mineral: 40, energy: 10 },
    LightInfantry: { mineral: 60, energy: 20 },
    Ranged: { mineral: 70, energy: 40 },
    HeavySoldier: { mineral: 100, energy: 50 }
  };
  
  // Panel position (bottom-left corner)
  const panelX = 10;
  const panelY = canvasHeight - 140;
  const panelWidth = 280;
  const panelHeight = 130;
  
  // Draw background
  ctx.fillStyle = 'rgba(10, 30, 50, 0.95)';
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
  
  // Title
  ctx.fillStyle = '#2bf077';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${building.type} (ID: ${building.id})`, panelX + 10, panelY + 20);
  
  // Get queue info
  const queue = snapshot.productionState?.queuesByBuildingId?.[selectedBuildingId] || [];
  const progress = snapshot.productionState?.progressByBuildingId?.[selectedBuildingId] || 0;
  
  // Current resources
  const playerResources = snapshot.players.player.resources;
  
  // Queue status
  ctx.fillStyle = '#aadaff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Queue: ${queue.length} | Progress: ${Math.floor(progress)}`, panelX + 10, panelY + 40);
  
  // Button definitions
  const buttons = [
    { label: 'Worker', unitType: 'Worker', x: panelX + 10, y: panelY + 55, width: 80, height: 25 },
    { label: 'Scout', unitType: 'Scout', x: panelX + 100, y: panelY + 55, width: 80, height: 25 },
    { label: 'Cancel', unitType: null, x: panelX + 190, y: panelY + 55, width: 80, height: 25 }
  ];
  
  // Draw buttons
  for (const btn of buttons) {
    const isCancel = btn.unitType === null;
    const cost = isCancel ? null : unitCosts[btn.unitType];
    
    // Check if player can afford unit
    const canAfford = isCancel || (playerResources.mineral >= cost.mineral && playerResources.energy >= cost.energy);
    
    ctx.fillStyle = isCancel 
      ? 'rgba(255, 100, 100, 0.7)' 
      : (canAfford ? 'rgba(100, 200, 100, 0.7)' : 'rgba(80, 80, 80, 0.5)');
    ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
    ctx.strokeStyle = canAfford ? '#aadaff' : '#666666';
    ctx.lineWidth = 1;
    ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
    
    ctx.fillStyle = canAfford ? '#ffffff' : '#999999';
    ctx.font = 'bold 11px sans-serif';
    const textWidth = ctx.measureText(btn.label).width;
    ctx.fillText(btn.label, btn.x + (btn.width - textWidth) / 2, btn.y + 17);
    
    // Show cost below button if not cancel
    if (cost && !isCancel) {
      ctx.fillStyle = canAfford ? '#aadaff' : '#999999';
      ctx.font = '9px sans-serif';
      const costText = `${cost.mineral}M ${cost.energy}E`;
      const costWidth = ctx.measureText(costText).width;
      ctx.fillText(costText, btn.x + (btn.width - costWidth) / 2, btn.y + 38);
    }
  }
  
  // Queue preview
  ctx.fillStyle = '#aadaff';
  ctx.font = '11px sans-serif';
  const queueText = queue.length > 0 ? `Next: ${queue[0].unitType}` : 'Queue empty';
  ctx.fillText(queueText, panelX + 10, panelY + 110);
  
  return { buttons, panelX, panelY, panelWidth, panelHeight };
}

export function createUiBridge(rootElement, options = {}) {
  const refs = ensureLayout(rootElement);
  const ctx = refs.canvas.getContext('2d');
  const selectedUnitIds = new Set();
  let selectedBuildingId = null;
  let latestSnapshot = null;
  let dragState = null;
  let lastPanelInfo = null;
  let lastClickTime = 0;
  let lastClickedEntityId = null;

  function sanitizeSelection() {
    if (!latestSnapshot) return;
    const allowed = new Set(
      (latestSnapshot.entities || [])
        .filter((entity) => isFriendlyMovable(latestSnapshot, entity))
        .map((entity) => entity.id)
    );
    for (const id of Array.from(selectedUnitIds)) {
      if (!allowed.has(id)) {
        selectedUnitIds.delete(id);
      }
    }
  }

  function issueMove(cellX, cellY) {
    if (selectedUnitIds.size === 0) return;
    if (typeof options.onCommand !== 'function') return;
    options.onCommand({
      type: 'MoveUnits',
      unitIds: Array.from(selectedUnitIds),
      target: {
        x: Math.floor(cellX),
        y: Math.floor(cellY)
      }
    });
  }

  function issueGatherResource(spot) {
    if (!spot) return;
    if (!latestSnapshot) return;
    if (typeof options.onCommand !== 'function') return;

    const workerIds = (latestSnapshot.entities || [])
      .filter((entity) => selectedUnitIds.has(entity.id) && entity.type === 'Worker')
      .map((entity) => entity.id);

    if (workerIds.length === 0) return;

    options.onCommand({
      type: 'GatherResource',
      unitIds: workerIds,
      spotId: spot.id
    });
  }

  function issueAttack(targetEntityId) {
    if (selectedUnitIds.size === 0) return;
    if (typeof options.onCommand !== 'function') return;

    const selectedCombatIds = latestSnapshot
      ? (latestSnapshot.entities || [])
        .filter((entity) => selectedUnitIds.has(entity.id) && isCombatUnit(entity))
        .map((entity) => entity.id)
      : [];

    if (selectedCombatIds.length === 0) return;

    options.onCommand({
      type: 'AttackTarget',
      unitIds: selectedCombatIds,
      targetEntityId
    });
  }

  function issueQueueUnit(unitType) {
    if (!selectedBuildingId) return;
    if (typeof options.onCommand !== 'function') return;
    options.onCommand({
      type: 'QueueUnit',
      buildingId: selectedBuildingId,
      unitType
    });
  }

  function issueCancelQueue() {
    if (!selectedBuildingId) return;
    if (typeof options.onCommand !== 'function') return;
    options.onCommand({
      type: 'CancelQueue',
      buildingId: selectedBuildingId
    });
  }

  refs.canvas.addEventListener('pointerdown', (event) => {
    if (!latestSnapshot) return;
    refs.canvas.setPointerCapture(event.pointerId);
    const pos = asCellPosition(refs.canvas, event, latestSnapshot.map.cols, latestSnapshot.map.rows);
    dragState = {
      active: true,
      startPx: { x: pos.px, y: pos.py },
      currentPx: { x: pos.px, y: pos.py },
      startCell: { x: pos.x, y: pos.y }
    };
  });

  refs.canvas.addEventListener('pointermove', (event) => {
    if (!latestSnapshot || !dragState || !dragState.active) return;
    const pos = asCellPosition(refs.canvas, event, latestSnapshot.map.cols, latestSnapshot.map.rows);
    dragState.currentPx = { x: pos.px, y: pos.py };
  });

  refs.canvas.addEventListener('pointerup', (event) => {
    if (!latestSnapshot || !dragState) return;

    const pos = asCellPosition(refs.canvas, event, latestSnapshot.map.cols, latestSnapshot.map.rows);
    const dx = pos.px - dragState.startPx.x;
    const dy = pos.py - dragState.startPx.y;
    const dragDistance = Math.hypot(dx, dy);
    const dragThresholdPx = 8;

    if (dragDistance >= dragThresholdPx) {
      const x1 = Math.min(dragState.startCell.x, pos.x);
      const y1 = Math.min(dragState.startCell.y, pos.y);
      const x2 = Math.max(dragState.startCell.x, pos.x);
      const y2 = Math.max(dragState.startCell.y, pos.y);
      selectedUnitIds.clear();
      selectedBuildingId = null;
      for (const entity of latestSnapshot.entities || []) {
        if (!isFriendlyMovable(latestSnapshot, entity)) continue;
        if (entity.x >= x1 && entity.x <= x2 && entity.y >= y1 && entity.y <= y2) {
          selectedUnitIds.add(entity.id);
        }
      }
    } else {
      // Check for production panel button clicks first
      let buttonClicked = false;
      if (lastPanelInfo && lastPanelInfo.buttons) {
        for (const btn of lastPanelInfo.buttons) {
          if (pos.px >= btn.x && pos.px <= btn.x + btn.width && 
              pos.py >= btn.y && pos.py <= btn.y + btn.height) {
            if (btn.unitType === null) {
              // Cancel button
              issueCancelQueue();
            } else {
              // Queue unit button
              issueQueueUnit(btn.unitType);
            }
            buttonClicked = true;
            break;
          }
        }
      }
      
      if (!buttonClicked) {
        const resourceHit = selectedUnitIds.size > 0
          ? findResourceSpotNearCell(latestSnapshot, pos.x, pos.y)
          : null;

        if (resourceHit) {
          issueGatherResource(resourceHit);
          refs.canvas.releasePointerCapture(event.pointerId);
          dragState = null;
          return;
        }

        // If units are selected, prioritize enemy hit-testing for reliable attack commands.
        const enemyHit = selectedUnitIds.size > 0
          ? findEntityNearCell(latestSnapshot, pos.x, pos.y, 0.9, (entity) => isEnemyOfPlayer(latestSnapshot, entity))
          : null;
        const hit = enemyHit || findEntityNearCell(latestSnapshot, pos.x, pos.y);
        const playerTeamId = latestSnapshot.players.player.teamId;
        
        if (hit && hit.type === 'HQ' && hit.teamId === playerTeamId) {
          // Click on friendly HQ - select it for production
          selectedUnitIds.clear();
          selectedBuildingId = hit.id;
        } else if (hit && isFriendlyMovable(latestSnapshot, hit)) {
          selectedBuildingId = null;
          
          // Double-click detection
          const now = Date.now();
          const isDoubleClick = lastClickedEntityId === hit.id && (now - lastClickTime) < 300;
          lastClickedEntityId = hit.id;
          lastClickTime = now;
          
          const isShiftClick = event.shiftKey;

          if (isDoubleClick) {
            // Double-click: select all units of same type
            selectedUnitIds.clear();
            for (const entity of latestSnapshot.entities || []) {
              if (isFriendlyMovable(latestSnapshot, entity) && entity.type === hit.type) {
                selectedUnitIds.add(entity.id);
              }
            }
          } else if (isShiftClick) {
            // Shift+Click: Toggle unit in multi-select
            if (selectedUnitIds.has(hit.id)) {
              selectedUnitIds.delete(hit.id);
            } else {
              selectedUnitIds.add(hit.id);
            }
          } else {
            // Regular click: Select only this unit
            selectedUnitIds.clear();
            selectedUnitIds.add(hit.id);
          }
        } else if (hit && isEnemyOfPlayer(latestSnapshot, hit) && selectedUnitIds.size > 0) {
          issueAttack(hit.id);
        } else if (selectedUnitIds.size > 0) {
          issueMove(pos.x, pos.y);
        } else {
          selectedUnitIds.clear();
          selectedBuildingId = null;
        }
      }
    }

    refs.canvas.releasePointerCapture(event.pointerId);
    dragState = null;
  });

  // Right-click: Quick action (move/gather)
  refs.canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (!latestSnapshot || selectedUnitIds.size === 0) return;

    const pos = asCellPosition(refs.canvas, event, latestSnapshot.map.cols, latestSnapshot.map.rows);
    
    // Try gather first if there's a resource spot nearby and workers are selected
    const hasWorkers = Array.from(selectedUnitIds).some(
      id => (latestSnapshot.entities || []).find(e => e.id === id)?.type === 'Worker'
    );
    const resourceHit = hasWorkers ? findResourceSpotNearCell(latestSnapshot, pos.x, pos.y) : null;
    
    if (resourceHit) {
      issueGatherResource(resourceHit);
    } else {
      issueMove(pos.x, pos.y);
    }
  });

  return {
    render(snapshot) {
      latestSnapshot = snapshot;
      sanitizeSelection();

      refs.mineral.textContent = String(snapshot.players.player.resources.mineral);
      refs.energy.textContent = String(snapshot.players.player.resources.energy);
      refs.data.textContent = String(snapshot.players.player.resources.data);

      drawGrid(ctx, snapshot.map.cols, snapshot.map.rows, refs.canvas.width, refs.canvas.height);
      drawTerrain(ctx, snapshot.map.terrain, snapshot.map.cols, snapshot.map.rows, refs.canvas.width, refs.canvas.height);
      drawResourceSpots(ctx, snapshot, refs.canvas.width, refs.canvas.height);
      drawEntities(ctx, snapshot, refs.canvas.width, refs.canvas.height, selectedUnitIds);
      drawSelectionRect(ctx, dragState, refs.canvas.width, refs.canvas.height);
      
      // Draw fog of war overlay
      const playerTeamId = snapshot.players.player.teamId;
      const visibleSet = snapshot.fogState?.visibleByTeam?.[playerTeamId];
      const discoveredSet = snapshot.fogState?.discoveredByTeam?.[playerTeamId];
      drawFogOfWar(ctx, visibleSet, discoveredSet, snapshot.map.cols, snapshot.map.rows, refs.canvas.width, refs.canvas.height);
      
      // Draw production panel and store button info
      lastPanelInfo = drawProductionPanel(ctx, snapshot, selectedBuildingId, refs.canvas.width, refs.canvas.height);

      const metrics = Object.entries(snapshot.runtime.systemMetricsMs)
        .map(([name, ms]) => `${name}: ${ms}ms`)
        .join(' | ');

      const production = snapshot.productionState?.summary;
      refs.debug.textContent = `Tick: ${snapshot.tick} | Queue: ${snapshot.commandQueueLength} | Selected: ${selectedUnitIds.size} | Building: ${selectedBuildingId ?? 'none'} | ProdQueued: ${production?.totalQueued ?? 0} | ProdActive: ${production?.inProgressBuildings ?? 0} | DroppedTicks: ${snapshot.runtime.droppedTicks} | LastTick: ${snapshot.runtime.lastTickDurationMs}ms\n${metrics}`;
    }
  };
}
