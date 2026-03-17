function ensureLayout(root) {
  root.innerHTML = `
    <section class="rts-shell">
      <div class="rts-topbar">
        <div class="rts-resource">Mineral: <span id="res-mineral">0</span></div>
        <div class="rts-resource">Energie: <span id="res-energy">0</span></div>
        <div class="rts-resource">Daten: <span id="res-data">0</span></div>
      </div>
      <button id="rts-debug-toggle" class="rts-debug-toggle" type="button" aria-controls="rts-debug" aria-expanded="false">Debug</button>
      <canvas id="rts-canvas" width="960" height="720" aria-label="RTS Spielfeld"></canvas>
      <div class="rts-debug hidden" id="rts-debug"></div>
    </section>
  `;

  return {
    canvas: root.querySelector('#rts-canvas'),
    debug: root.querySelector('#rts-debug'),
    debugToggle: root.querySelector('#rts-debug-toggle'),
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
  return entity.type === 'LightInfantry' || entity.type === 'Ranged' || entity.type === 'HeavySoldier';
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

  ctx.fillStyle = 'rgba(10, 40, 18, 0.85)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = terrain[y * cols + x];
      if (cell && cell.blocked) {
        const px = x * cellW;
        const py = y * cellH;
        ctx.fillRect(px, py, cellW, cellH);
        
        // Add pattern to blocked cells
        ctx.strokeStyle = 'rgba(0, 120, 60, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellW, cellH);
      }
    }
  }
}

function drawFogOfWar(ctx, visibleSet, discoveredSet, cols, rows, width, height, tick = 0) {
  if (!visibleSet || !Array.isArray(visibleSet)) return;
  
  const cellW = width / cols;
  const cellH = height / rows;
  const glyphs = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*@';
  const safeTick = Number.isFinite(tick) ? tick : 0;
  
  // Convert arrays back to Sets for O(1) lookup
  const visibleMap = new Set(visibleSet);

  ctx.save();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.font = '8px monospace';

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cellKey = `${x},${y}`;
      const isVisible = visibleMap.has(cellKey);
      const px = x * cellW;
      const py = y * cellH;

      // Draw green shadow on hidden cells
      if (!isVisible) {
        ctx.fillStyle = 'rgba(0, 30, 10, 0.78)';
        ctx.fillRect(px, py, cellW, cellH);

        const rainAlpha = 0.24;
        const glyphAlpha = 0.82;

        const rainColumns = Math.max(1, Math.floor(cellW / 7));
        const colStep = cellW / rainColumns;
        for (let c = 0; c < rainColumns; c++) {
          const seed = (((x + 1) * 73856093) ^ ((y + 1) * 19349663) ^ ((c + 1) * 83492791)) >>> 0;
          const speed = 0.35 + (seed % 100) / 250;
          const streamPhase = (safeTick * speed + (seed % 97)) % (cellH + 8);
          const headY = py + streamPhase - 4;
          const headX = px + (c + 0.5) * colStep;
          const tailLen = 6 + (seed % 8);

          for (let t = 0; t < tailLen; t++) {
            const ry = headY - t * 2;
            if (ry < py || ry > py + cellH) continue;
            const alpha = rainAlpha * (1 - t / tailLen);
            ctx.fillStyle = `rgba(96, 255, 152, ${Math.max(0.01, alpha)})`;
            ctx.fillRect(headX, ry, 1.3, 1.9);
          }

          if ((safeTick + seed) % 11 === 0 && headY >= py && headY <= py + cellH) {
            const glyph = glyphs[seed % glyphs.length];
            ctx.fillStyle = `rgba(210, 255, 220, ${glyphAlpha})`;
            ctx.fillText(glyph, headX - 2, headY + 2);
          }
        }
      } else {
        // Visible cells get a subtle motherboard/circuit-board pattern.
        const seed = (((x + 1) * 73856093) ^ ((y + 1) * 19349663)) >>> 0;
        const pulse = 0.55 + 0.45 * Math.sin((safeTick + (seed % 37)) * 0.12);

        ctx.fillStyle = 'rgba(4, 46, 24, 0.2)';
        ctx.fillRect(px, py, cellW, cellH);

        const laneY = py + (0.22 + (seed % 5) * 0.12) * cellH;
        const laneX = px + (0.18 + ((seed >> 3) % 5) * 0.14) * cellW;

        ctx.strokeStyle = `rgba(56, 234, 154, ${0.14 + pulse * 0.34})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 2, laneY);
        ctx.lineTo(px + cellW - 2, laneY);
        ctx.moveTo(laneX, py + 2);
        ctx.lineTo(laneX, py + cellH - 2);
        ctx.stroke();

        // Fewer contact points: only some cells get one.
        if (seed % 3 === 0) {
          const nodeR = Math.max(1.2, Math.min(cellW, cellH) * 0.08);
          const nodeX = px + (0.35 + ((seed >> 6) % 4) * 0.15) * cellW;
          const nodeY = py + (0.3 + ((seed >> 9) % 4) * 0.15) * cellH;
          ctx.fillStyle = `rgba(135, 255, 219, ${0.2 + pulse * 0.52})`;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, nodeR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
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

  function drawPolygon(ctx, cx, cy, radius, sides, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = rotation + (i * 2 * Math.PI) / sides;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  for (const entity of snapshot.entities || []) {
    const cx = entity.x * cellW + cellW / 2;
    const cy = entity.y * cellH + cellH / 2;
    const isPlayer = entity.teamId === playerTeamId;
    const color = isPlayer ? '#2bf077' : '#ff8a40';
    const isBuilding = entity.type === 'HQ' || entity.type === 'Barracks';
    const radius = entity.type === 'HQ' ? 13 : (entity.type === 'Barracks' ? 11 : 8);

    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;

    if (isBuilding) {
      // 7-sided heptagon, flat-top rotation
      drawPolygon(ctx, cx, cy, radius, 7, -Math.PI / 2);
      ctx.fill();
      // Inner detail ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.5;
      drawPolygon(ctx, cx, cy, radius * 0.58, 7, -Math.PI / 2);
      ctx.stroke();
    } else if (entity.type === 'Worker') {
      // Ring shape: outer circle stroked, inner hole, no fill
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (entity.type === 'LightInfantry' || entity.type === 'Ranged' || entity.type === 'HeavySoldier') {
      // Green fill + purple ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#2bf077';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#bb55ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (selectedIds.has(entity.id)) {
      ctx.shadowBlur = 0;
      if (isBuilding) {
        drawPolygon(ctx, cx, cy, radius + 4, 7, -Math.PI / 2);
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
      }
      ctx.strokeStyle = '#d8f7ff';
      ctx.lineWidth = 2;
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

  // Draw construction site animations for building workers
  const now = Date.now();
  for (const entity of snapshot.entities || []) {
    if (!entity.build) continue;
    const { targetX, targetY } = entity.build;
    const cx = targetX * cellW + cellW / 2;
    const cy = targetY * cellH + cellH / 2;
    const baseRadius = 11;

    // Slow outer pulse ring
    const pulse1 = 0.5 + 0.5 * Math.sin((now / 500));
    const pulse2 = 0.5 + 0.5 * Math.sin((now / 500) + Math.PI);

    // Outer expanding heptagon ring 1
    const r1 = baseRadius + 6 + pulse1 * 8;
    const alpha1 = 0.7 * (1 - pulse1 * 0.6);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(43, 240, 119, ${alpha1})`;
    ctx.lineWidth = 1.8;
    drawPolygon(ctx, cx, cy, r1, 7, -Math.PI / 2);
    ctx.stroke();

    // Outer expanding heptagon ring 2 (offset phase)
    const r2 = baseRadius + 6 + pulse2 * 8;
    const alpha2 = 0.5 * (1 - pulse2 * 0.5);
    ctx.strokeStyle = `rgba(0, 220, 255, ${alpha2})`;
    ctx.lineWidth = 1.2;
    drawPolygon(ctx, cx, cy, r2, 7, -Math.PI / 2);
    ctx.stroke();

    // Static ghost heptagon outline at build footprint
    ctx.strokeStyle = 'rgba(43, 240, 119, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    drawPolygon(ctx, cx, cy, baseRadius, 7, -Math.PI / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Construction progress bar beneath site
    const maxTicks = entity.build.totalTicks || 180;
    const done = Math.max(0, Math.min(1, 1 - entity.build.ticksRemaining / maxTicks));
    const bw = 24;
    const bx = cx - bw / 2;
    const by = cy + baseRadius + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = '#2bf077';
    ctx.fillRect(bx, by, bw * done, 3);
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
  const panelWidth = 400;
  const panelHeight = 185;
  const panelY = canvasHeight - panelHeight - 10;
  
  // Draw background
  ctx.fillStyle = 'rgba(10, 30, 50, 0.95)';
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
  
  // Title
  ctx.fillStyle = '#2bf077';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`${building.type} (ID: ${building.id})`, panelX + 12, panelY + 26);
  
  // Get queue info
  const queue = snapshot.productionState?.queuesByBuildingId?.[selectedBuildingId] || [];
  const progress = snapshot.productionState?.progressByBuildingId?.[selectedBuildingId] || 0;
  
  // Current resources
  const playerResources = snapshot.players.player.resources;
  
  // Queue status
  ctx.fillStyle = '#aadaff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Queue: ${queue.length} | Progress: ${Math.floor(progress)}`, panelX + 12, panelY + 52);
  
  // Button definitions — differ by building type
  const btnW = 108;
  const btnH = 36;
  const btnY = panelY + 68;
  const trainableByType = {
    HQ:      ['Worker', 'Scout'],
    Barracks:['LightInfantry', 'Ranged', 'HeavySoldier']
  };
  const unitLabels = {
    Worker: 'Arbeiter', Scout: 'Späher',
    LightInfantry: 'Infanterie', Ranged: 'Schütze', HeavySoldier: 'Soldat'
  };
  const trainable = trainableByType[building.type] || [];
  const buttons = [
    ...trainable.map((unitType, i) => ({
      label: unitLabels[unitType] || unitType,
      unitType,
      x: panelX + 10 + i * (btnW + 8),
      y: btnY, width: btnW, height: btnH
    })),
    { label: 'Abbruch', unitType: null, x: panelX + 10 + trainable.length * (btnW + 8), y: btnY, width: btnW, height: btnH }
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
    ctx.font = 'bold 14px sans-serif';
    const textWidth = ctx.measureText(btn.label).width;
    ctx.fillText(btn.label, btn.x + (btn.width - textWidth) / 2, btn.y + 15);
    
    // Show cost below button if not cancel
    if (cost && !isCancel) {
      ctx.fillStyle = canAfford ? '#aadaff' : '#999999';
      ctx.font = '12px sans-serif';
      const costText = `${cost.mineral}M ${cost.energy}E`;
      const costWidth = ctx.measureText(costText).width;
      ctx.fillText(costText, btn.x + (btn.width - costWidth) / 2, btn.y + 30);
    }
  }
  
  // Queue preview
  ctx.fillStyle = '#aadaff';
  ctx.font = '14px sans-serif';
  const queueText = queue.length > 0 ? `Next: ${queue[0].unitType}` : 'Queue empty';
  ctx.fillText(queueText, panelX + 12, panelY + 162);
  
  return { buttons, panelX, panelY, panelWidth, panelHeight };
}

function drawWorkerPanel(ctx, snapshot, selectedWorkerIds, buildMode, canvasWidth, canvasHeight) {
  if (selectedWorkerIds.length === 0) return null;

  const panelX = 10;
  const panelWidth = 320;
  const panelHeight = 110;
  const panelY = canvasHeight - panelHeight - 10;

  ctx.fillStyle = 'rgba(10, 30, 50, 0.95)';
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  ctx.fillStyle = '#2bf077';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`Arbeiter (${selectedWorkerIds.length} ausgewählt)`, panelX + 12, panelY + 24);

  // Show construction progress if a worker is building
  const buildingWorker = (snapshot.entities || []).find(
    (e) => selectedWorkerIds.includes(e.id) && e.build
  );
  if (buildingWorker) {
    ctx.fillStyle = '#ffd257';
    ctx.font = '13px sans-serif';
    ctx.fillText(
      `Baut ${buildingWorker.build.type}… (${buildingWorker.build.ticksRemaining} Ticks)`,
      panelX + 12, panelY + 50
    );
    return null;
  }

  const btnX = panelX + 12;
  const btnY = panelY + 40;
  const btnW = 160;
  const btnH = 36;

  const active = buildMode === 'Barracks';
  ctx.fillStyle = active ? 'rgba(43,240,119,0.25)' : 'rgba(100,200,100,0.7)';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = active ? '#2bf077' : '#aadaff';
  ctx.lineWidth = active ? 2 : 1;
  ctx.strokeRect(btnX, btnY, btnW, btnH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  const label = active ? '▶ Platzieren…' : 'Kaserne bauen (120M 40E)';
  ctx.fillText(label, btnX + 8, btnY + 23);

  if (active) {
    ctx.fillStyle = '#ffd257';
    ctx.font = '12px sans-serif';
    ctx.fillText('Klick auf eine freie Zelle', panelX + 12, panelY + 92);
  }

  return { buildBarracksBtn: { x: btnX, y: btnY, w: btnW, h: btnH } };
}

export function createUiBridge(rootElement, options = {}) {
  const refs = ensureLayout(rootElement);
  const ctx = refs.canvas.getContext('2d');
  const selectedUnitIds = new Set();
  let isDebugOpen = false;
  let selectedBuildingId = null;
  let latestSnapshot = null;
  let dragState = null;
  let lastPanelInfo = null;
  let lastWorkerPanelInfo = null;
  let buildMode = null; // null | 'Barracks'
  let lastClickTime = 0;
  let lastClickedEntityId = null;

  if (refs.debugToggle) {
    refs.debugToggle.addEventListener('click', () => {
      isDebugOpen = !isDebugOpen;
      refs.debug.classList.toggle('hidden', !isDebugOpen);
      refs.debugToggle.textContent = isDebugOpen ? 'Debug schließen' : 'Debug anzeigen';
      refs.debugToggle.setAttribute('aria-expanded', String(isDebugOpen));
    });
  }

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
      buildMode = null;
      for (const entity of latestSnapshot.entities || []) {
        if (!isFriendlyMovable(latestSnapshot, entity)) continue;
        if (entity.x >= x1 && entity.x <= x2 && entity.y >= y1 && entity.y <= y2) {
          selectedUnitIds.add(entity.id);
        }
      }
    } else {
      // Check for worker panel build mode button first
      if (lastWorkerPanelInfo?.buildBarracksBtn) {
        const btn = lastWorkerPanelInfo.buildBarracksBtn;
        if (pos.px >= btn.x && pos.px <= btn.x + btn.w && pos.py >= btn.y && pos.py <= btn.y + btn.h) {
          buildMode = buildMode === 'Barracks' ? null : 'Barracks';
          refs.canvas.releasePointerCapture(event.pointerId);
          dragState = null;
          return;
        }
      }

      // In build mode: place building on click
      if (buildMode) {
        const workerIds = Array.from(selectedUnitIds).filter((id) => {
          const e = latestSnapshot.entities?.find((en) => en.id === id);
          return e?.type === 'Worker';
        });
        if (workerIds.length > 0 && typeof options.onCommand === 'function') {
          options.onCommand({
            type: 'PlaceBuilding',
            workerId: workerIds[0],
            buildingType: buildMode,
            x: Math.floor(pos.x),
            y: Math.floor(pos.y)
          });
        }
        buildMode = null;
        refs.canvas.releasePointerCapture(event.pointerId);
        dragState = null;
        return;
      }

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
        
        if (hit && (hit.type === 'HQ' || hit.type === 'Barracks') && hit.teamId === playerTeamId) {
          // Click on friendly building - select it for production
          selectedUnitIds.clear();
          buildMode = null;
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
      drawFogOfWar(ctx, visibleSet, discoveredSet, snapshot.map.cols, snapshot.map.rows, refs.canvas.width, refs.canvas.height, snapshot.tick);
      
      // Draw production panel (HQ selected)
      lastPanelInfo = drawProductionPanel(ctx, snapshot, selectedBuildingId, refs.canvas.width, refs.canvas.height);

      // Draw worker panel (workers selected, no building selected)
      if (!selectedBuildingId) {
        const playerTeamId2 = snapshot.players.player.teamId;
        const selectedWorkerIds = (snapshot.entities || [])
          .filter((e) => selectedUnitIds.has(e.id) && e.type === 'Worker' && e.teamId === playerTeamId2)
          .map((e) => e.id);
        lastWorkerPanelInfo = drawWorkerPanel(ctx, snapshot, selectedWorkerIds, buildMode, refs.canvas.width, refs.canvas.height);
      } else {
        lastWorkerPanelInfo = null;
        buildMode = null;
      }

      const metrics = Object.entries(snapshot.runtime.systemMetricsMs)
        .map(([name, ms]) => `${name}: ${ms}ms`)
        .join(' | ');

      const production = snapshot.productionState?.summary;
      refs.debug.textContent = `Tick: ${snapshot.tick} | Queue: ${snapshot.commandQueueLength} | Selected: ${selectedUnitIds.size} | Building: ${selectedBuildingId ?? 'none'} | ProdQueued: ${production?.totalQueued ?? 0} | ProdActive: ${production?.inProgressBuildings ?? 0} | DroppedTicks: ${snapshot.runtime.droppedTicks} | LastTick: ${snapshot.runtime.lastTickDurationMs}ms\n${metrics}`;
    }
  };
}
