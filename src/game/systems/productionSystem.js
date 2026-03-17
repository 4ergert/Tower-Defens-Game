import { createUnitComponents, getBuildTicks, getUnitCost } from '../content/unitBlueprints.js';

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
}
