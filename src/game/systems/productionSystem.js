import { createUnitComponents, getBuildTicks, getUnitCost, getBuildingHp } from '../content/unitBlueprints.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spawnUnitNearBuilding(state, building, unitType) {
  const bPos = building.components?.position;
  if (!bPos) return null;

  const offsets = [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: -1, y: -1 }
  ];

  let spawnX = bPos.x;
  let spawnY = bPos.y;
  for (const offset of offsets) {
    const candidateX = clamp(Math.round(bPos.x + offset.x), 0, state.map.cols - 1);
    const candidateY = clamp(Math.round(bPos.y + offset.y), 0, state.map.rows - 1);
    const blocked = state.entities.allIds.some((id) => {
      const entity = state.entities.byId[id];
      const pos = entity?.components?.position;
      if (!pos) return false;
      return Math.round(pos.x) === candidateX && Math.round(pos.y) === candidateY;
    });
    if (!blocked) {
      spawnX = candidateX;
      spawnY = candidateY;
      break;
    }
  }

  const id = state.entities.nextId;
  state.entities.nextId += 1;
  state.entities.byId[id] = {
    id,
    type: unitType,
    owner: { ...building.owner },
    components: createUnitComponents(unitType, spawnX, spawnY)
  };
  state.entities.allIds.push(id);
  state.stats.unitsCreated += 1;
  return id;
}

export function productionSystem(state) {
  const queues = state.productionState.queuesByBuildingId;
  const progress = state.productionState.progressByBuildingId;

  for (const key of Object.keys(queues)) {
    const buildingId = Number(key);
    const queue = queues[key];
    const building = state.entities.byId[buildingId];

    if (!building || !Array.isArray(queue) || queue.length === 0) {
      delete progress[key];
      continue;
    }

    if (!progress[key]) {
      const nextType = queue[0].unitType;
      progress[key] = {
        remainingTicks: getBuildTicks(nextType)
      };
    }

    progress[key].remainingTicks -= 1;
    if (progress[key].remainingTicks > 0) continue;

    // Check if team has resources to pay for unit
    const spawnedType = queue[0].unitType;
    const cost = getUnitCost(spawnedType);
    const teamResources = building.owner?.teamId === 1 ? state.players.player.resources : state.players.ai.resources;
    
    if (teamResources.mineral >= cost.mineral && teamResources.energy >= cost.energy) {
      // Deduct cost and spawn unit
      teamResources.mineral -= cost.mineral;
      teamResources.energy -= cost.energy;
      spawnUnitNearBuilding(state, building, spawnedType);
    } else {
      // Not enough resources - pause production (doesn't consume queue item)
      continue;
    }
    
    queue.shift();
    delete progress[key];

    if (queue.length === 0) {
      delete queues[key];
    }
  }

  state.productionState.lastProcessedTick = state.tick;

  // Worker construction
  for (const id of state.entities.allIds) {
    const entity = state.entities.byId[id];
    if (!entity || entity.type !== 'Worker') continue;
    const build = entity.components?.build;
    if (!build) continue;

    const pos = entity.components?.position;
    if (!pos) continue;

    // Wait until worker has arrived close enough to the build site
    const dist = Math.hypot(pos.x - build.targetX, pos.y - build.targetY);
    if (dist > 1.5) continue;

    // Stop movement once arrived
    if (entity.components.movement?.target) {
      delete entity.components.movement.target;
    }

    build.ticksRemaining -= 1;
    if (build.ticksRemaining > 0) continue;

    // Construction complete — place the building
    const builtId = state.entities.nextId;
    state.entities.nextId += 1;
    const hp = getBuildingHp(build.type);
    state.entities.byId[builtId] = {
      id: builtId,
      type: build.type,
      owner: { ...entity.owner },
      components: {
        position: { x: build.targetX, y: build.targetY },
        health: { hp, maxHp: hp }
      }
    };
    state.entities.allIds.push(builtId);

    // Initialise production queue for the new building
    if (!state.productionState.queuesByBuildingId[builtId]) {
      state.productionState.queuesByBuildingId[builtId] = [];
    }

    delete entity.components.build;
    state.stats.unitsCreated += 1;
  }
}
